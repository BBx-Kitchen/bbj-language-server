import { AstUtils, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import {
    Assignment,
    isAssignment,
    isJavaClass,
    isMemberCall,
    isMethodCall,
    isMethodDecl,
    isSymbolRef,
    MethodCall,
    MethodDecl,
    Model
} from '../src/language/generated/ast.js';

// A call to an overloaded BBj or Java method should get the return type of the overload its
// arguments match, whichever order the overloads are declared or returned in (issue #556).
// Uses the test module's fake java.lang.String/java.util.HashMap classes so declared/returned
// types actually resolve. See bbj-test-module.ts.
const { shared, BBj } = createBBjTestServices(EmptyFileSystem);

beforeAll(async () => {
    await initializeWorkspace(shared);
});

let probeCounter = 0;

/**
 * Parses `code`, finds the Assignment whose variable text is `probe!`, and returns the type
 * inferer's result for its value rendered as a fully-qualified name for a JavaClass or a bare
 * name otherwise. `undefined` means the call's type was not inferred at all.
 */
async function inferredProbeType(code: string): Promise<string | undefined> {
    const document = await parseHelper<Model>(BBj)(
        code, { documentUri: `file:///overload-return-type-probe-${probeCounter++}.bbj` });
    const assignment = AstUtils.streamAllContents(document.parseResult.value)
        .find((n): n is Assignment => isAssignment(n) && isSymbolRef(n.variable) && n.variable.symbol.$refText === 'probe!');
    if (!assignment) {
        throw new Error('no probe! assignment found in fixture');
    }
    const type = BBj.types.Inferer.getType(assignment.value);
    if (!type) {
        return undefined;
    }
    // resolveClass() cuts a JavaClass's own `name` down to its simple name once resolved
    // (packageName carries the rest) — reconstruct the FQN the same way
    // method-return-java-type.test.ts's own fqn-reconstruction helper does.
    return isJavaClass(type) && type.packageName ? `${type.packageName}.${type.name}` : type.name;
}

/** Completion driver mirroring test/completion-class-reference.test.ts's own `labels()`. */
async function labels(text: string, trigger?: '.'): Promise<string[]> {
    const offset = text.indexOf('<|>');
    const clean = text.replace('<|>', '');
    const doc = await parseHelper<Model>(BBj)(
        clean, { documentUri: `file:///overload-return-type-completion-${probeCounter++}.bbj` });
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: trigger === '.'
            ? { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '.' }
            : { triggerKind: CompletionTriggerKind.Invoked }
    };
    const list = await BBj.lsp.CompletionProvider!.getCompletion(doc, params);
    return (list?.items ?? []).map(i => i.label).sort();
}

/** Diagnostics matching the #437 return-type check's own message text. */
async function incompatibleReturnDiagnostics(code: string): Promise<string[]> {
    const document = await parseHelper<Model>(BBj)(
        code, { documentUri: `file:///overload-return-type-methodret-${probeCounter++}.bbj`, validation: true });
    return (document.diagnostics ?? [])
        .filter(d => d.message.includes('returns a value of incompatible type'))
        .map(d => d.message);
}

describe('overloaded BBj method calls (issue #556)', () => {
    const stringFirst = `
class public Probe
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
classend
declare Probe f!
declare java.util.HashMap h!
`;

    const hashMapFirst = `
class public Probe
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
classend
declare Probe f!
declare java.util.HashMap h!
`;

    test('a HashMap argument infers HashMap when the String overload is declared first', async () => {
        expect(await inferredProbeType(`${stringFirst}\nprobe! = f!.m1(h!)\n`)).toBe('java.util.HashMap');
    });

    test('a String argument infers String when the String overload is declared first', async () => {
        expect(await inferredProbeType(`${stringFirst}\nprobe! = f!.m1("a")\n`)).toBe('java.lang.String');
    });

    test('a HashMap argument infers HashMap when the HashMap overload is declared first', async () => {
        expect(await inferredProbeType(`${hashMapFirst}\nprobe! = f!.m1(h!)\n`)).toBe('java.util.HashMap');
    });

    test('a String argument infers String when the HashMap overload is declared first', async () => {
        expect(await inferredProbeType(`${hashMapFirst}\nprobe! = f!.m1("a")\n`)).toBe('java.lang.String');
    });

    test('completion on the matched overload result offers the HashMap members, not the String ones', async () => {
        const items = await labels(`${stringFirst}\nx! = f!.m1(h!).<|>\nprobeTail = 1\n`, '.');
        expect(items).toContain('put()');
        expect(items).not.toContain('charAt()');
    });

    test('a call through the matching overload draws no incompatible-return-type diagnostic', async () => {
        const code = `
class public Probe
  method public java.lang.String m1(java.lang.String s!)
    methodret ""
  methodend
  method public java.util.HashMap m1(java.util.HashMap h!)
    methodret new java.util.HashMap()
  methodend
  method public java.util.HashMap wrap(java.util.HashMap h!)
    methodret #m1(h!)
  methodend
classend
`;
        // Before the fix, the linker's first-declared m1 (String) was used for the return-type
        // check, so wrap()'s own declared java.util.HashMap return type conflicted with it.
        expect(await incompatibleReturnDiagnostics(code)).toEqual([]);
    });

    test('the member reference still links to the first-declared overload though the inferred type is the second', async () => {
        const document = await parseHelper<Model>(BBj)(
            `${stringFirst}\nprobe! = f!.m1(h!)\n`,
            { documentUri: `file:///overload-return-type-link-${probeCounter++}.bbj` });
        const methodDecls = AstUtils.streamAllContents(document.parseResult.value)
            .filter((n): n is MethodDecl => isMethodDecl(n) && n.name.toLowerCase() === 'm1')
            .toArray();
        expect(methodDecls).toHaveLength(2);
        const call = AstUtils.streamAllContents(document.parseResult.value)
            .find((n): n is MethodCall => isMethodCall(n) && isMemberCall(n.method) && n.method.member?.$refText.toLowerCase() === 'm1');
        expect(call).toBeDefined();
        const method = call!.method;
        const member = isMemberCall(method) ? method.member : undefined;
        expect(member?.ref).toBe(methodDecls[0]);
    });
});
