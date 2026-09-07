import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { findLeafNodeAtOffset } from '../src/language/bbj-validator.js';
import { Model, isSetOptsStatement } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { detectSetOptsShape, setoptsHoverMarkdown, setoptsHoverTarget } from '../src/language/setopts-code-scanner.js';
import { describeVector, parseVector } from '../src/setopts-catalog.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * Pure AST detection for SETOPTS-in-code shape (a) — an absolute `SETOPTS <hex>` statement
 * (#475, DISC-05, plan 88-01). Uses `parseHelper` (never `DocumentBuilder.build()`, which
 * reaches BBjCPL/java-interop on :5008 and is flaky outside a live BBj environment).
 */
describe('setopts-code-scanner: absolute SETOPTS shape detection (88-01)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    /** Parse `source`, assert zero lexer/parser errors, and return the leaf CST node whose
     * offset range covers the middle of `snippet`. */
    async function parseAndFindLeaf(source: string, snippet: string) {
        const document = await parse(source, { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
        const rootNode = document.parseResult.value.$cstNode!;
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        const leaf = findLeafNodeAtOffset(rootNode, offset + Math.floor(snippet.length / 2));
        expect(leaf, `expected a leaf CST node at "${snippet}"`).toBeDefined();
        return { document, leaf: leaf! };
    }

    test('setoptsHoverTarget resolves the enclosing SetOptsStatement from the hex literal', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS $08004020$', '$08004020$');
        const target = setoptsHoverTarget(leaf);
        expect(target).toBeDefined();
        expect(isSetOptsStatement(target)).toBe(true);
    });

    test('setoptsHoverTarget resolves the enclosing SetOptsStatement from the SETOPTS keyword', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS $08004020$', 'SETOPTS');
        const target = setoptsHoverTarget(leaf);
        expect(target).toBeDefined();
        expect(isSetOptsStatement(target)).toBe(true);
    });

    test('setoptsHoverTarget returns undefined for a leaf outside any SetOptsStatement', async () => {
        const { leaf } = await parseAndFindLeaf('PRINT "hello"\nSETOPTS $08004020$', '"hello"');
        expect(setoptsHoverTarget(leaf)).toBeUndefined();
    });

    test('detectSetOptsShape decodes an absolute hex literal (bare HEX_STRING form)', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS $08004020$', '$08004020$');
        const target = setoptsHoverTarget(leaf)!;
        const shape = detectSetOptsShape(target);
        expect(shape).toEqual({
            kind: 'absolute',
            hexDigits: '08004020',
            vector: { bytes: [0x08, 0x00, 0x40, 0x20], digitCount: 8 },
        });
    });

    test('detectSetOptsShape decodes an absolute hex literal (quoted-string form)', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS "$08004020$"', '$08004020$');
        const target = setoptsHoverTarget(leaf)!;
        const shape = detectSetOptsShape(target);
        expect(shape).toEqual({
            kind: 'absolute',
            hexDigits: '08004020',
            vector: { bytes: [0x08, 0x00, 0x40, 0x20], digitCount: 8 },
        });
    });

    test('setoptsHoverMarkdown renders the SETOPTS header, uppercase hex digits, and describeVector output', () => {
        const vector = parseVector('08004020')!;
        const markdown = setoptsHoverMarkdown({ kind: 'absolute', hexDigits: '08004020', vector });
        expect(markdown).toContain('__SETOPTS $08004020$__');
        expect(markdown).toContain(describeVector(vector));
    });
});
