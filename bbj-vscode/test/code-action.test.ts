import { DocumentValidator, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { CodeAction, CodeActionParams, Diagnostic } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module';
import { Model } from '../src/language/generated/ast.js';

const services = createBBjTestServices(EmptyFileSystem);
const bbj = services.BBj;
const parse = parseHelper<Model>(bbj);

function linkingDiagnostics(doc: LangiumDocument): Diagnostic[] {
    return (doc.diagnostics ?? []).filter(d => (d.data as { code?: string } | undefined)?.code === DocumentValidator.LinkingError);
}

async function codeActionsFor(text: string): Promise<{ doc: LangiumDocument, actions: CodeAction[], linking: Diagnostic[] }> {
    const doc = await parse(text, { documentUri: `file:///ca-${Math.round(Math.random() * 1e9)}.bbj`, validation: true });
    const linking = linkingDiagnostics(doc);
    const params: CodeActionParams = {
        textDocument: { uri: doc.textDocument.uri },
        range: linking[0]?.range ?? { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        context: { diagnostics: linking }
    };
    const result = await bbj.lsp.CodeActionProvider!.getCodeActions(doc, params);
    return { doc, actions: (result ?? []) as CodeAction[], linking };
}

describe('BBj code actions — missing use statements (#447)', () => {

    test('index resolves a simple name to its FQN', () => {
        expect(bbj.java.JavaInteropService.findClassCandidatesBySimpleName('HashMap')).toEqual(['java.util.HashMap']);
        // case-insensitive match on the simple name
        expect(bbj.java.JavaInteropService.findClassCandidatesBySimpleName('hashmap')).toEqual(['java.util.HashMap']);
        // nothing for an unknown class
        expect(bbj.java.JavaInteropService.findClassCandidatesBySimpleName('Nope')).toEqual([]);
    });

    test("offers 'use java.util.HashMap' for an unresolved HashMap reference", async () => {
        const { actions, linking } = await codeActionsFor('hm! = new HashMap()\n');
        expect(linking.length).toBe(1);
        const titles = actions.map(a => a.title);
        expect(titles).toContain("Add 'use java.util.HashMap'");
        const action = actions.find(a => a.title === "Add 'use java.util.HashMap'")!;
        expect(action.kind).toBe('quickfix');
        expect(action.diagnostics).toEqual(linking);
        // inserts the use statement at the top of an import-less file
        const edit = action.edit!.changes![Object.keys(action.edit!.changes!)[0]][0];
        expect(edit.newText).toBe('use java.util.HashMap\n');
        expect(edit.range.start).toEqual({ line: 0, character: 0 });
    });

    test('inserts new use after existing use statements', async () => {
        const { actions } = await codeActionsFor('use java.lang.String\nhm! = new HashMap()\n');
        const action = actions.find(a => a.title === "Add 'use java.util.HashMap'")!;
        expect(action).toBeDefined();
        const edit = action.edit!.changes![Object.keys(action.edit!.changes!)[0]][0];
        // after the existing `use` on line 0
        expect(edit.range.start.line).toBe(1);
    });

    test('offers nothing for an unresolved class with no known FQN', async () => {
        const { actions, linking } = await codeActionsFor('x! = new Foobar()\n');
        expect(linking.length).toBeGreaterThanOrEqual(1);
        expect(actions).toHaveLength(0);
    });

    test('uses the complete index (augmented server) to suggest a class not otherwise loaded', async () => {
        // Simulate an augmented bbj-ls that provides the full class list; TreeMap is not in the
        // fake classpath, so this only works via the seeded complete index.
        const interop = bbj.java.JavaInteropService as unknown as {
            seedCompleteClassIndex(f: string[]): void; resetCompleteClassIndex(): void;
        };
        interop.seedCompleteClassIndex(['java.util.TreeMap', 'java.util.HashMap']);
        try {
            expect(await bbj.java.JavaInteropService.resolveClassCandidatesBySimpleName('TreeMap'))
                .toEqual(['java.util.TreeMap']);
            const { actions } = await codeActionsFor('tm! = new TreeMap()\n');
            expect(actions.map(a => a.title)).toContain("Add 'use java.util.TreeMap'");
        } finally {
            interop.resetCompleteClassIndex(); // restore default (old-server) behaviour for later tests
        }
    });

    test('offers nothing when there are no linking diagnostics', async () => {
        const doc = await parse('use java.util.HashMap\nhm! = new HashMap()\n', { documentUri: 'file:///ca-clean.bbj', validation: true });
        const params: CodeActionParams = {
            textDocument: { uri: doc.textDocument.uri },
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
            context: { diagnostics: [] }
        };
        const result = await bbj.lsp.CodeActionProvider!.getCodeActions(doc, params);
        expect(result ?? []).toHaveLength(0);
    });
});
