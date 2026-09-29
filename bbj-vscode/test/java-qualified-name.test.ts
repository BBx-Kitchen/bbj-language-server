import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test, vi } from 'vitest';
import { CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { isJavaQualifiedName, MAX_JAVA_IDENTIFIER_LENGTH } from '../src/language/java-peer-guard.js';
import { Model } from '../src/language/generated/ast.js';
import { createBBjTestServices } from './bbj-test-module.js';

// Class names supplied by the interop peer are inserted into a user's source only when they are
// Java qualified names (issue #525). The `$` (nested-class) case is exercised on the predicate
// directly, not through a candidate-producing call site: today's candidate producers in
// java-interop.ts explicitly skip any simple name containing `$`, so it never reaches a live
// auto-import suggestion, but a user can still type `use java.util.Map$Entry` by hand.
describe('isJavaQualifiedName', () => {
    const longIdentifier = 'a'.repeat(MAX_JAVA_IDENTIFIER_LENGTH);
    const tooLongIdentifier = 'a'.repeat(MAX_JAVA_IDENTIFIER_LENGTH + 1);

    test.each([
        ['java.util.HashMap'],
        ['java.util.Map$Entry'],
        ['java.util.Map.Entry'],
        ['com.basis.bbj.proxies.BBjAPI'],
        ['$Proxy12'],
        ['a.b_c.D9'],
        ['com.exämple.Klasse'],
        ['HashMap'],
        [longIdentifier]
    ])('accepts %s', (fqn) => {
        expect(isJavaQualifiedName(fqn)).toBe(true);
    });

    test.each([
        ['', 'an empty string'],
        [undefined, 'undefined'],
        [null, 'null'],
        [42, 'a number'],
        ['java.util;HashMap', 'a semicolon'],
        ['java.util.Hash Map', 'an embedded space'],
        [' java.util.HashMap', 'a leading space'],
        ['java.util.HashMap\n', 'a trailing line feed'],
        ['java.util.HashMap\r', 'a trailing carriage return'],
        ['Foo\nRUN "x.bbj"', 'a line feed followed by a BBj statement'],
        ['.Foo', 'a leading dot'],
        ['Foo.', 'a trailing dot'],
        ['a..b', 'an empty segment'],
        ['1abc.Foo', 'a segment starting with a digit'],
        ['java.util.Map<String>', 'angle brackets'],
        ['java-util.Map', 'a hyphen'],
        ['java.util.Map‮', 'a trailing right-to-left override'],
        ['java.util.Map​', 'a trailing zero-width space'],
        [tooLongIdentifier, 'one character over the length limit']
    ])('rejects %s (%s)', (fqn, _description) => {
        expect(isJavaQualifiedName(fqn)).toBe(false);
    });

    test('is pure: calling it twice on the same input gives the same answer', () => {
        expect(isJavaQualifiedName('java.util.HashMap')).toBe(isJavaQualifiedName('java.util.HashMap'));
        expect(isJavaQualifiedName('java.util.Hash Map')).toBe(isJavaQualifiedName('java.util.Hash Map'));
    });
});

// Auto-import completion drops a candidate that is not a Java qualified name before it ever
// consumes a simple name, so a valid candidate sharing that simple name is still offered
// (issue #525). Each test builds a fresh createBBjTestServices instance so the provider's
// per-prefix cache starts empty.
describe('auto-import completion candidates that are not Java qualified names (#525)', () => {
    let docCounter = 0;

    async function autoImportCompletion(text: string, candidates: string[]) {
        const services = createBBjTestServices(EmptyFileSystem).BBj;
        const spy = vi.spyOn(services.java.JavaInteropService, 'findClassCandidatesByPrefix')
            .mockResolvedValue(candidates);
        try {
            const doc = await parseHelper<Model>(services)(text, { documentUri: `file:///jqn-${docCounter++}.bbj` });
            const params: CompletionParams = {
                textDocument: { uri: doc.textDocument.uri },
                position: doc.textDocument.positionAt(text.length),
                context: { triggerKind: CompletionTriggerKind.Invoked }
            };
            const list = await services.lsp.CompletionProvider!.getCompletion(doc, params);
            return list?.items ?? [];
        } finally {
            spy.mockRestore();
        }
    }

    test("offers only 'use java.util.TreeMap' even though an invalid candidate with the same simple name came first", async () => {
        const items = await autoImportCompletion('x! = new TreeM', [
            'java.u til.TreeMap',
            'java.util;TreeMap',
            'java.util.TreeMap\nRUN "x.bbj"',
            'Foo\nRUN "x.bbj"',
            'java.util.TreeMap'
        ]);
        const edits = items
            .filter(i => i.additionalTextEdits && i.additionalTextEdits.length > 0)
            .map(i => i.additionalTextEdits![0].newText);
        expect(edits).toEqual(['use java.util.TreeMap\n']);
    });

    test('offers no auto-import edit when every candidate is invalid', async () => {
        const items = await autoImportCompletion('x! = new TreeM', ['java.util;TreeMap', 'java.u til.TreeMap']);
        const edits = items.filter(i => i.additionalTextEdits && i.additionalTextEdits.length > 0);
        expect(edits).toHaveLength(0);
    });
});
