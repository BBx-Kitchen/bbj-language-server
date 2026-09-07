import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
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

    /**
     * Fail-closed edge cases (88-01 Task 2): every unparseable, empty and out-of-range
     * value yields no hover rather than a partial decode. The rule is one-directional — any
     * ambiguity resolves to "no hover", never to a best-effort summary.
     */
    test('setoptsHoverTarget returns undefined for a bare SETOPTS with no opts expression', async () => {
        // `SetOptsStatement` requires `opts=Expression`; with nothing following, the parser
        // falls back to matching `SETOPTS` as a bare identifier expression (the same ID/keyword
        // dual-category mechanism that lets `AND`/`IOR` be both operators and function names) —
        // there is no SetOptsStatement node here at all, so no target is found and no hover
        // fires. Confirmed empirically: zero lexer/parser errors, an ExpressionStatement whose
        // SymbolRef targets the unresolvable name "SETOPTS".
        const { leaf } = await parseAndFindLeaf('SETOPTS', 'SETOPTS');
        expect(setoptsHoverTarget(leaf)).toBeUndefined();
    });

    test('detectSetOptsShape returns undefined for non-hex characters (quoted-string form, valid parse)', async () => {
        // The bare HEX_STRING terminal (`\$[0-9a-fA-F]*\$`) cannot even lex "ZZ" between the
        // delimiters; a quoted STRING_LITERAL accepts any content and reaches the scanner as
        // a well-formed StringLiteral, exercising parseVector's own hex-format rejection.
        const { leaf } = await parseAndFindLeaf('SETOPTS "$ZZ$"', '$ZZ$');
        const target = setoptsHoverTarget(leaf)!;
        expect(detectSetOptsShape(target)).toBeUndefined();
    });

    test('detectSetOptsShape returns undefined for a hex literal longer than MAX_BYTES * 2 digits', async () => {
        const overlong = '0800402000000000000000000000000000';
        const { leaf } = await parseAndFindLeaf(`SETOPTS $${overlong}$`, `$${overlong}$`);
        const target = setoptsHoverTarget(leaf)!;
        expect(detectSetOptsShape(target)).toBeUndefined();
    });

    test('detectSetOptsShape returns undefined for a numeric literal (not a hex string)', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS 42', '42');
        const target = setoptsHoverTarget(leaf)!;
        expect(detectSetOptsShape(target)).toBeUndefined();
    });

    test('setoptsHoverTarget returns undefined for a leaf inside a PRINT statement', async () => {
        const { leaf } = await parseAndFindLeaf('PRINT "hello"\nSETOPTS $08004020$', 'hello');
        expect(setoptsHoverTarget(leaf)).toBeUndefined();
    });

    test('setoptsHoverTarget returns undefined for a leaf inside an unrelated assignment', async () => {
        const { leaf } = await parseAndFindLeaf('A$="x"\nSETOPTS $08004020$', 'A$');
        expect(setoptsHoverTarget(leaf)).toBeUndefined();
    });

    test('two consecutive detectSetOptsShape/setoptsHoverMarkdown calls at the same position are byte-identical', async () => {
        const { leaf } = await parseAndFindLeaf('SETOPTS $08004020$', '$08004020$');
        const target = setoptsHoverTarget(leaf)!;
        const first = setoptsHoverMarkdown(detectSetOptsShape(target)!);
        const second = setoptsHoverMarkdown(detectSetOptsShape(target)!);
        expect(second).toBe(first);
    });
});

/**
 * D-07 source guard: hover decode must never grow a document-change listener or a
 * build-phase subscription — the SETOPTS branch runs only inside the existing per-request
 * `getHoverContent` path. Forbidden identifiers are named here (not inlined into the
 * assertion) so a reviewer can see the exact regression this guards against at a glance.
 */
describe('D-07 guard: bbj-hover.ts registers no document-change or build-phase listener', () => {
    const HOVER_PROVIDER_SOURCE_PATH = path.join(__dirname, '..', 'src', 'language', 'bbj-hover.ts');

    const FORBIDDEN_HOVER_LISTENER_IDENTIFIERS = [
        'onBuildPhase',
        'onDidChangeTextDocument',
        'onDidChangeContent',
        'onDocumentChange',
        'DocumentBuilder.onUpdate',
    ];

    test('no forbidden listener identifier appears in bbj-hover.ts', () => {
        const source = fs.readFileSync(HOVER_PROVIDER_SOURCE_PATH, 'utf-8');
        for (const identifier of FORBIDDEN_HOVER_LISTENER_IDENTIFIERS) {
            expect(
                source,
                `bbj-hover.ts must not reference "${identifier}" — hover decode stays a per-request computation (D-07)`
            ).not.toContain(identifier);
        }
    });
});

/**
 * Single-source-of-truth guard (88-01 Task 3): `resolveLibFunction` must be defined exactly
 * once in the codebase — exported from `check-function-calls.ts` and imported (never
 * re-implemented) by `setopts-code-scanner.ts`. Counts `function resolveLibFunction`
 * definitions (with or without a leading `export`) across both files, stripping `//`-prefixed
 * line comments first so a comment mentioning the name can't satisfy or break the count.
 */
describe('resolveLibFunction single-source-of-truth guard', () => {
    function countFunctionDefinitions(source: string, name: string): number {
        const codeOnly = source
            .split('\n')
            .map(line => {
                const commentIndex = line.indexOf('//');
                return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
            })
            .join('\n');
        const pattern = new RegExp(`\\bfunction\\s+${name}\\b`, 'g');
        return (codeOnly.match(pattern) ?? []).length;
    }

    test('resolveLibFunction is defined exactly once across check-function-calls.ts and setopts-code-scanner.ts', () => {
        const checkFunctionCallsSource = fs.readFileSync(
            path.join(__dirname, '..', 'src', 'language', 'validations', 'check-function-calls.ts'),
            'utf-8'
        );
        const scannerSource = fs.readFileSync(
            path.join(__dirname, '..', 'src', 'language', 'setopts-code-scanner.ts'),
            'utf-8'
        );
        const total = countFunctionDefinitions(checkFunctionCallsSource, 'resolveLibFunction')
            + countFunctionDefinitions(scannerSource, 'resolveLibFunction');
        expect(total).toBe(1);
    });
});
