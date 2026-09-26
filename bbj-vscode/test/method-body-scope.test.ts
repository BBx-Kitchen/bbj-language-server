import { AstUtils, DocumentValidator, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { CompletionParams, CompletionTriggerKind, DiagnosticSeverity } from 'vscode-languageserver';
import { describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { isMethodDecl, isSymbolRef, Model, SymbolRef } from '../src/language/generated/ast.js';

// A class METHOD ... METHODEND body is its own BBj variable scope
// (https://documentation.basis.cloud/BASISHelp/WebHelp/commands/method_verb.htm): "The only
// variables that are visible within that scope are the parameters specified in the method
// parameter list and the fields defined in the class." This file pins that boundary for
// completion, linking and go-to-definition together, since all three read the same scope.

const bbjServices = createBBjTestServices(EmptyFileSystem).BBj;

let probeCounter = 0;

/** Parses `text` under a unique document URI, optionally with validation turned on. */
async function parseDoc(text: string, options: { validation?: boolean } = {}) {
    return parseHelper<Model>(bbjServices)(text, {
        documentUri: `file:///method-body-scope-${probeCounter++}.bbj`,
        validation: options.validation ?? false
    });
}

/**
 * Strips the `<|>` marker from `text`, parses the remainder, then requests Invoked completion
 * at the marker position and returns the offered labels as a set.
 */
async function labelsAt(text: string): Promise<Set<string>> {
    const offset = text.indexOf('<|>');
    const doc = await parseDoc(text.replace('<|>', ''));
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: { triggerKind: CompletionTriggerKind.Invoked }
    };
    const list = await bbjServices.lsp.CompletionProvider!.getCompletion(doc, params);
    return new Set((list?.items ?? []).map(i => i.label));
}

/**
 * All SymbolRefs in `root` whose reference text lowercases to `name`, split by whether each
 * one sits inside a MethodDecl.
 */
function symbolRefsNamed(root: Model, name: string): { inMethod: SymbolRef[]; atProgram: SymbolRef[] } {
    const lower = name.toLowerCase();
    const all = AstUtils.streamAllContents(root)
        .filter(isSymbolRef)
        .filter(ref => ref.symbol.$refText.toLowerCase() === lower)
        .toArray();
    return {
        inMethod: all.filter(ref => !!AstUtils.getContainerOfType(ref, isMethodDecl)),
        atProgram: all.filter(ref => !AstUtils.getContainerOfType(ref, isMethodDecl))
    };
}

/** The linking-error diagnostics (Langium's `DocumentValidator.LinkingError` code) on a validated document. */
function linkingErrors(doc: Awaited<ReturnType<typeof parseDoc>>) {
    return (doc.diagnostics ?? []).filter(d => d.data?.code === DocumentValidator.LinkingError);
}

// The exact program from the bug report: a$/X! at program scope, class Test with method t()
// assigning b$. The marker sits on the first blank line after b$="KJK", indented 8 spaces.
const USER_PROGRAM = [
    'a$="TEST"',
    'X!="BLA"',
    '',
    'class public Test',
    '    method public void t()',
    '',
    '        b$="KJK"',
    '        <|>',
    '',
    '    methodend',
    'classend',
    ''
].join('\n');

// Same program-scope names, marker and control statement at program scope instead, followed by
// the class (without its own marker line).
const PROGRAM_SCOPE_CONTROL = [
    'a$="TEST"',
    'X!="BLA"',
    '<|>',
    'probeTail = 1',
    'class public Test',
    '    method public void t()',
    '',
    '        b$="KJK"',
    '',
    '    methodend',
    'classend',
    ''
].join('\n');

// The same two program-level reads, once at program scope and once inside the method.
const LINKING_FIXTURE = [
    'a$="TEST"',
    'X!="BLA"',
    'PRINT a$, x!',
    '',
    'class public Test',
    '    method public void t()',
    '',
    '        b$="KJK"',
    '        PRINT a$, x!',
    '',
    '    methodend',
    'classend',
    ''
].join('\n');

// One representative of every program-variable kind BbjScopeComputation records on the Program
// node: implicit assignment, DIM array, program-level DECLARE, READ target and FOR variable.
const KINDS_FIXTURE = [
    'a$="TEST"',
    'X!="BLA"',
    'DIM arr$[2]',
    'declare java.lang.String decl!',
    'READ(1)readVar$',
    'FOR i = 1 TO 2',
    'NEXT i',
    'PRINT a$, x!, arr$[0], decl!, readVar$, i',
    'class public Test',
    '    method public void t()',
    '        b$="KJK"',
    '        PRINT a$, x!, arr$[0], decl!, readVar$, i, b$',
    '    methodend',
    'classend',
    ''
].join('\n');

const DEFINITION_FIXTURE = [
    'a$="TEST"',
    'PRINT a$',
    'class public Test',
    '    method public void t()',
    '        PRINT a$',
    '    methodend',
    'classend',
    ''
].join('\n');

// Everything a method must keep seeing: its own parameters and locals, a `#`-addressed field,
// this!, a USE'd Java class (both simple-name and fully-qualified), and a program-level DEF FN.
// The fields tutorial requires `#` for direct field access from a method, so this fixture pins
// `#name$`, not a bare `name$`.
const PRESENCE_FIXTURE = [
    'use java.lang.String',
    'DEF FNTWICE(X)=X*2',
    'class public Holder',
    '    field public BBjString name$',
    '    method public void run(BBjString param$)',
    '        local$ = param$',
    '        #name$ = local$',
    '        self! = this!',
    '        cls! = String.CASE_INSENSITIVE_ORDER',
    '        fq! = java.lang.String.CASE_INSENSITIVE_ORDER',
    '        twice = FNTWICE(2)',
    '        PRINT local$, param$, #name$, self!, cls!, fq!, twice',
    '        <|>',
    '    methodend',
    'classend',
    ''
].join('\n');

describe('program variables stay out of class method bodies', () => {
    test('program variables beside the class are not offered inside a method', async () => {
        const labels = await labelsAt(USER_PROGRAM);
        const lower = new Set([...labels].map(l => l.toLowerCase()));
        expect(lower.has('a$')).toBe(false);
        expect(lower.has('x!')).toBe(false);
        expect(labels.has('b$')).toBe(true);
        expect(labels.has('this!')).toBe(true);
    });

    test('program variables are still offered at program scope', async () => {
        const labels = await labelsAt(PROGRAM_SCOPE_CONTROL);
        expect(labels.has('a$')).toBe(true);
        expect(labels.has('X!')).toBe(true);
        expect(labels.has('probeTail')).toBe(true);
        expect(labels.has('b$')).toBe(false);
        expect(labels.has('this!')).toBe(false);
    });

    test('a program variable read inside a method does not link', async () => {
        const doc = await parseDoc(LINKING_FIXTURE, { validation: true });
        for (const name of ['a$', 'x!']) {
            const refs = symbolRefsNamed(doc.parseResult.value, name);
            expect(refs.inMethod.length, name).toBeGreaterThan(0);
            for (const ref of refs.inMethod) {
                expect(ref.symbol.ref, name).toBeUndefined();
            }
            expect(refs.atProgram.length, name).toBeGreaterThan(0);
            for (const ref of refs.atProgram) {
                expect(ref.symbol.ref, name).toBeDefined();
            }
        }

        const warnings = linkingErrors(doc).filter(d => d.severity === DiagnosticSeverity.Warning);
        expect(warnings.some(w => w.message.includes("named 'a$'"))).toBe(true);
        expect(warnings.some(w => w.message.includes("named 'x!'"))).toBe(true);
    });

    test('no program-level variable kind is visible inside a method', async () => {
        const doc = await parseDoc(KINDS_FIXTURE, { validation: true });
        const names = ['a$', 'x!', 'arr$', 'decl!', 'readVar$', 'i'];
        for (const name of names) {
            const refs = symbolRefsNamed(doc.parseResult.value, name);
            expect(refs.inMethod.length, name).toBeGreaterThan(0);
            for (const ref of refs.inMethod) {
                expect(ref.symbol.ref, name).toBeUndefined();
            }
            expect(refs.atProgram.length, name).toBeGreaterThan(0);
            for (const ref of refs.atProgram) {
                expect(ref.symbol.ref, name).toBeDefined();
            }
        }

        // b$ is method-local: both the assignment and the read inside t() must still resolve.
        const bRefs = symbolRefsNamed(doc.parseResult.value, 'b$');
        expect(bRefs.inMethod.length).toBeGreaterThan(0);
        for (const ref of bRefs.inMethod) {
            expect(ref.symbol.ref).toBeDefined();
        }

        const warnings = linkingErrors(doc).filter(d => d.severity === DiagnosticSeverity.Warning);
        expect(warnings).toHaveLength(6);
        for (const name of names) {
            expect(warnings.some(w => w.message.includes(`named '${name}'`))).toBe(true);
        }
    });

    test('go-to-definition inside a method does not jump to a program variable', async () => {
        const doc = await parseDoc(DEFINITION_FIXTURE, { validation: true });
        const definitionProvider = bbjServices.lsp.DefinitionProvider!;
        const text = doc.textDocument.getText();
        const programOffset = text.indexOf('PRINT a$') + 'PRINT '.length;
        const methodOffset = text.lastIndexOf('PRINT a$') + 'PRINT '.length;

        const methodResult = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(methodOffset)
        });
        expect(!methodResult || methodResult.length === 0).toBe(true);

        const programResult = await definitionProvider.getDefinition(doc, {
            textDocument: { uri: doc.textDocument.uri },
            position: doc.textDocument.positionAt(programOffset)
        });
        expect(programResult).toBeDefined();
        expect(programResult!.length).toBeGreaterThan(0);
        expect(programResult![0].targetSelectionRange.start.line).toBe(0);
    });

    test('parameters, locals, fields, this!, USE imports and DEF FN stay visible inside a method', async () => {
        const doc = await parseDoc(PRESENCE_FIXTURE.replace('<|>', ''), { validation: true });
        const inMethodRefs = AstUtils.streamAllContents(doc.parseResult.value)
            .filter(isSymbolRef)
            .filter(ref => !!AstUtils.getContainerOfType(ref, isMethodDecl))
            .toArray();
        expect(inMethodRefs).toHaveLength(19);
        for (const ref of inMethodRefs) {
            expect(ref.symbol.ref, ref.symbol.$refText).toBeDefined();
        }

        const labels = await labelsAt(PRESENCE_FIXTURE);
        for (const label of ['param$', 'local$', 'this!', 'String', 'FNTWICE(X)']) {
            expect(labels.has(label)).toBe(true);
        }

        // The test double has no BBjString class, so the field and parameter type both produce
        // an expected, un-suppressed "Could not resolve reference to Class named 'BBjString'"
        // Warning. Do not assert zero linking diagnostics for this fixture.
        const bbjStringWarnings = linkingErrors(doc).filter(d =>
            d.severity === DiagnosticSeverity.Warning && d.message.includes("Class named 'BBjString'"));
        expect(bbjStringWarnings).toHaveLength(2);
    });
});
