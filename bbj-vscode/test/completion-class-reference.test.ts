
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import { JavaMethod, Model } from '../src/language/generated/ast.js';
import { UNKNOWN_JAVA_MEMBER_CODE } from '../src/language/validations/check-unknown-java-member.js';

const { shared, BBj: bbjServices } = createBBjTestServices(EmptyFileSystem);

beforeAll(async () => {
    await initializeWorkspace(shared);
});

let probeCounter = 0;

/**
 * Strips the `<|>` marker from `text`, parses the remainder with a unique document URI, then
 * requests completion at the marker position and returns the offered labels, sorted (label sets
 * only are ever compared in this file, never list order or position).
 */
async function labels(text: string, trigger?: '.'): Promise<string[]> {
    const offset = text.indexOf('<|>');
    const clean = text.replace('<|>', '');
    const doc = await parseHelper<Model>(bbjServices)(
        clean, { documentUri: `file:///class-reference-probe-${probeCounter++}.bbj` });
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: trigger === '.'
            ? { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
            : { triggerKind: CompletionTriggerKind.Invoked }
    };
    const list = await bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
    return (list?.items ?? []).map(i => i.label).sort();
}

// Push a static `valueOf` method onto the fake java.lang.String class once, so both the USE and
// the fully-qualified path can be proven to offer the same static method as well as the same
// static field -- guarded so re-running this file's beforeAll never duplicates the entry.
beforeAll(() => {
    const stringClass = bbjServices.java.JavaInteropService.getResolvedClass('java.lang.String')!;
    if (!stringClass.methods.some(m => m.name === 'valueOf')) {
        stringClass.methods.push({
            $type: JavaMethod.$type,
            name: 'valueOf',
            $containerProperty: 'methods',
            $container: stringClass,
            isStatic: true,
            deprecated: false,
            returnType: 'java.lang.String',
            parameters: []
        } as unknown as JavaMethod);
    }
});

// A Java method's completion label carries its call parentheses (confirmed live against this
// fixture, matching the established convention in completion-method-body.test.ts's own
// 'member after .' row) -- 'valueOf' is offered as 'valueOf()', not 'valueOf'.
const STATIC_VALUE_OF = 'valueOf()';

// `use java.lang.String` makes the bare name `String` a program-scope symbol in its own right
// (usable to start a new statement/expression), which Invoked-trigger completion also offers
// alongside the member-scope candidates at this same cursor position -- a real, pre-existing
// difference between the USE and no-USE program scopes, not a class-member leak. The dot-trigger
// list (which narrows to member-scope only) has no such artifact; only the Invoked comparison
// needs to allow for it.
const USE_ADDED_PROGRAM_SYMBOL = 'String';

describe('completion after a fully-qualified Java class reference (issue #577)', () => {
    test('offers static members only without USE', async () => {
        const invoked = await labels('java.lang.String.<|>\nprobeTail = 1\n');
        expect(invoked).toContain('CASE_INSENSITIVE_ORDER');
        expect(invoked).toContain(STATIC_VALUE_OF);
        expect(invoked).toContain('class');
        expect(invoked).not.toContain('someInstanceField');
        expect(invoked).not.toContain('charAt()');

        const dotted = await labels('java.lang.String.<|>\nprobeTail = 1\n', '.');
        expect(dotted).toContain('CASE_INSENSITIVE_ORDER');
        expect(dotted).toContain(STATIC_VALUE_OF);
        expect(dotted).toContain('class');
        expect(dotted).not.toContain('someInstanceField');
        expect(dotted).not.toContain('charAt()');
    });

    test('matches the list after USE', async () => {
        const withoutUse = 'java.lang.String.<|>\nprobeTail = 1\n';
        const withUse = 'use java.lang.String\nString.<|>\nprobeTail = 1\n';

        const invokedWithUse = (await labels(withUse)).filter(l => l !== USE_ADDED_PROGRAM_SYMBOL);
        expect(await labels(withoutUse)).toEqual(invokedWithUse);
        expect(await labels(withoutUse, '.')).toEqual(await labels(withUse, '.'));
    });
});

describe('receivers that keep today\'s member list', () => {
    test('instance access on a declared variable offers all members', async () => {
        const text = 'declare java.lang.String s!\ns!.<|>\nprobeTail = 1\n';
        const dotted = await labels(text, '.');
        expect(dotted).toContain('someInstanceField');
        expect(dotted).toContain('charAt()');
        expect(dotted).toContain('CASE_INSENSITIVE_ORDER');
    });

    test('a receiver ending in the .class pseudo-member offers java.lang.Class instance members', async () => {
        const afterUse = await labels(
            'use java.lang.String\nString.class.<|>\nprobeTail = 1\n', '.');
        expect(afterUse).toContain('getName()');

        const fullyQualified = await labels(
            'java.lang.String.class.<|>\nprobeTail = 1\n', '.');
        expect(fullyQualified).toContain('getName()');
    });

    test('a package receiver keeps offering its package members', async () => {
        const dotted = await labels('java.lang.<|>\nprobeTail = 1\n', '.');
        expect(dotted).toContain('String');
    });

    test('a fully-qualified class with no static members offers only class', async () => {
        const dotted = await labels('java.util.HashMap.<|>\nprobeTail = 1\n', '.');
        expect(dotted).toContain('class');
        expect(dotted).not.toContain('put()');
        expect(dotted).not.toContain('getClass()');
    });

    test('a case-variant fully-qualified receiver never offers an instance-only member', async () => {
        const dotted = await labels('JAVA.LANG.STRING.<|>\nprobeTail = 1\n', '.');
        expect(dotted).not.toContain('someInstanceField');
        expect(dotted).not.toContain('charAt()');
    });
});

describe('validation after a fully-qualified class reference', () => {
    async function unknownMemberDiagnostics(text: string) {
        const document = await parseHelper<Model>(bbjServices)(
            text, { documentUri: `file:///class-reference-validation-${probeCounter++}.bbj`, validation: true });
        return (document.diagnostics ?? []).filter(d => d.data?.code === UNKNOWN_JAVA_MEMBER_CODE);
    }

    test('an instance field read through a fully-qualified class reference is not an unknown-member Error', async () => {
        const diagnostics = await unknownMemberDiagnostics('x! = java.lang.String.someInstanceField\n');
        expect(diagnostics).toHaveLength(0);
    });

    test('a static field read through a fully-qualified class reference has no diagnostics', async () => {
        const document = await parseHelper<Model>(bbjServices)(
            'x! = java.lang.String.CASE_INSENSITIVE_ORDER\n',
            { documentUri: `file:///class-reference-validation-${probeCounter++}.bbj`, validation: true });
        expect(document.diagnostics ?? []).toHaveLength(0);
    });
});
