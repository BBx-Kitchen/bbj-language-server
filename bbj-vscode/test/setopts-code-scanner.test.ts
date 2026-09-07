import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { findLeafNodeAtOffset } from '../src/language/bbj-validator.js';
import { Model, SetOptsStatement, isSetOptsStatement } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import {
    detectSetOptsShape, foldChainEffect, setoptsHoverMarkdown, setoptsHoverTarget, traceOptsChain,
    type SetOptsUnsafeReason,
} from '../src/language/setopts-code-scanner.js';
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
 * `traceOptsChain` / `foldChainEffect` — the backward `OPTS`→`IOR`/`AND`→`SETOPTS` chain walk
 * and its conservative safe/unsafe boundary (#475, DISC-05 shape b / DISC-06, plan 88-02).
 * This is the safe/unsafe oracle plan 88-03's edit gating depends on, so every named unsafe
 * case gets its own executing test — an ambiguity must never resolve to a false "safe".
 */
describe('setopts-code-scanner: OPTS→IOR/AND chain walk (88-02, DISC-05/DISC-06)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    /**
     * Parse `source`, assert zero lexer/parser errors, and return the `SetOptsStatement` whose
     * `opts` sits right after the LAST `SETOPTS`/`setopts` keyword in the source — the final
     * statement of every chain fixture below, distinguishing it from earlier reassignment lines
     * that also mention the tracked variable's name.
     */
    async function parseAndFindSetOptsTarget(source: string): Promise<SetOptsStatement> {
        const document = await parse(source, { validation: true });
        expect(document.parseResult.lexerErrors, source).toHaveLength(0);
        expect(document.parseResult.parserErrors, source).toHaveLength(0);
        const rootNode = document.parseResult.value.$cstNode!;
        const text = document.textDocument.getText();
        const re = /SETOPTS\s+/gi;
        let match: RegExpExecArray | null;
        let variableOffset = -1;
        while ((match = re.exec(text))) {
            variableOffset = match.index + match[0].length;
        }
        expect(variableOffset, `expected to find a "SETOPTS <var>" statement in the test source`).toBeGreaterThanOrEqual(0);
        const leaf = findLeafNodeAtOffset(rootNode, variableOffset);
        expect(leaf, 'expected a leaf CST node at the SETOPTS variable').toBeDefined();
        const target = setoptsHoverTarget(leaf!);
        expect(target, 'expected the leaf to resolve to a SetOptsStatement').toBeDefined();
        expect(isSetOptsStatement(target)).toBe(true);
        return target as SetOptsStatement;
    }

    test('OPTS -> IOR -> SETOPTS: safe chain, one link folded into effect.set', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$08$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.unsafeReason).toBeUndefined();
        expect(shape.links).toHaveLength(1);
        expect(shape.links[0]).toMatchObject({ fnName: 'IOR', maskHex: '08' });
        expect(shape.effect.set).toEqual([{ byte: 1, mask: 0x08 }]);
        expect(shape.effect.clear).toEqual([]);
    });

    test('zero-reassignment chain (OPTS immediately followed by SETOPTS) is safe with no links', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.links).toEqual([]);
        expect(shape.effect).toEqual({ set: [], clear: [] });
    });

    test('a comma-chained unrelated assignment on the OPTS origin line does not break detection', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS,OTHER$="x"\nA$=IOR(A$,"$08$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.links).toHaveLength(1);
    });

    test('last write wins per bit: an IOR then an AND on the same bit leaves it in effect.clear, not effect.set', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$08$")\nA$=AND(A$,"$F7$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.links).toHaveLength(2);
        expect(shape.effect.set).toEqual([]);
        expect(shape.effect.clear).toEqual([{ byte: 1, mask: 0x08 }]);
    });

    const controlFlowMarkers: Array<[string, string]> = [
        ['IfStatement', 'IF X=1'],
        ['ElseStatement', 'ELSE'],
        ['IfEndStatement', 'FI'],
        ['WhileStatement', 'WHILE X=1'],
        ['WhileEndStatement', 'WEND'],
        ['ForStatement', 'FOR I=1 TO 10'],
        ['GotoStatement', 'GOTO LBL'],
    ];

    test.each(controlFlowMarkers)('a %s between origin and target stops the walk with unsafeReason "control-flow"', async (_name, marker) => {
        const target = await parseAndFindSetOptsTarget(`A$=OPTS\n${marker}\nSETOPTS A$`);
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('control-flow');
    });

    test('a non-IOR/AND reassignment of the tracked variable stops the walk with unsafeReason "reassigned"', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$="hello"\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('reassigned');
    });

    test('an IOR/AND call whose first argument is a different variable stops the walk with unsafeReason "alias"', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nOTHER$="x"\nA$=IOR(OTHER$,"$08$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('alias');
    });

    test('an IOR/AND call whose mask is a variable (not a hex literal) stops the walk with unsafeReason "unparseable-mask"', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nX$="$08$"\nA$=IOR(A$,X$)\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('unparseable-mask');
    });

    test('an IOR/AND call whose mask literal is not valid hex stops the walk with unsafeReason "unparseable-mask"', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$ZZ$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('unparseable-mask');
    });

    test('no OPTS assignment anywhere in the enclosing statement array stops the walk with unsafeReason "no-origin"', async () => {
        const target = await parseAndFindSetOptsTarget('PRINT "hi"\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('no-origin');
    });

    test('an OPTS origin in an outer scope (Program level) is not reachable from a nested MethodDecl body — unsafeReason "no-origin"', async () => {
        const source = `A$=OPTS
class public C
    method public void m()
        A$=IOR(A$,"$08$")
        SETOPTS A$
    methodend
classend`;
        const target = await parseAndFindSetOptsTarget(source);
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(false);
        expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('no-origin');
    });

    test('a CompoundStatement sibling is transparent: an IOR link inside a semicolon-joined line is found as though it were a direct element', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$08$") ; OTHER$="ignored"\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.links).toHaveLength(1);
        expect(shape.links[0]).toMatchObject({ fnName: 'IOR', maskHex: '08' });
    });

    test('variable names and the IOR/AND/OPTS names compare case-insensitively', async () => {
        const target = await parseAndFindSetOptsTarget('a$=OPTS\na$=Ior(A$,"$08$")\nsetopts A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        expect(shape.links).toHaveLength(1);
    });

    test('foldChainEffect emits set/clear in SETOPTS_BITS catalog order regardless of statement order', async () => {
        // byte 2 IOR before byte 1 IOR in source order; effect arrays must still read byte-1-then-byte-2.
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$0010$")\nSETOPTS A$');
        const shape = traceOptsChain(target)!;
        expect(shape.safe).toBe(true);
        // $0010$ = byte 1 $00$ (nothing), byte 2 $10$ (NUM() strips embedded spaces) -- single link,
        // catalog-order assertion is meaningful once combined with the multi-link "last write wins"
        // test above; this test pins that a multi-byte single mask attributes bits to the right byte.
        expect(shape.effect.set).toEqual([{ byte: 2, mask: 0x10 }]);
    });

    test('foldChainEffect returns empty set/clear for an empty link list', () => {
        expect(foldChainEffect([])).toEqual({ set: [], clear: [] });
    });

    test('detectSetOptsShape routes a SetOptsStatement whose opts is a SymbolRef through traceOptsChain', async () => {
        const target = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$08$")\nSETOPTS A$');
        const shape = detectSetOptsShape(target);
        expect(shape).toMatchObject({ kind: 'chain', safe: true, variableName: 'a$' });
    });

    /**
     * Bounded-walk regression (T-88-04): the walk cost is bounded by the enclosing statement
     * array's length, not by document size, and never hangs. Two arrangements:
     *  (1) a large preamble entirely BEFORE the safe chain -- the walk never even reaches it
     *      (stops at the chain's own OPTS origin), so results must be byte-identical with and
     *      without the preamble.
     *  (2) the OPTS origin pulled out to an outer (Program-level) scope, with the large preamble
     *      sitting inside the nested MethodDecl body between the IOR link and SETOPTS -- the walk
     *      must still terminate promptly and correctly report "no-origin" (the origin's scope is
     *      never crossed), not "reassigned" -- there is no reassignment of A$ inside the method
     *      body other than the valid IOR link itself, so "no-origin" is where this boundary lands.
     */
    describe('bounded-walk regression (large preamble)', () => {
        const preamble = Array.from({ length: 300 }, (_, i) => `PRINT "line ${i}"`).join('\n');

        test('a large preamble entirely before the safe chain does not change the result', async () => {
            const withoutPreamble = await parseAndFindSetOptsTarget('A$=OPTS\nA$=IOR(A$,"$08$")\nSETOPTS A$');
            const withPreamble = await parseAndFindSetOptsTarget(`${preamble}\nA$=OPTS\nA$=IOR(A$,"$08$")\nSETOPTS A$`);
            const baseline = traceOptsChain(withoutPreamble)!;
            const withPreambleResult = traceOptsChain(withPreamble)!;
            expect(withPreambleResult.safe).toBe(baseline.safe);
            expect(withPreambleResult.links).toEqual(baseline.links);
            expect(withPreambleResult.effect).toEqual(baseline.effect);
        });

        test('a large preamble between the link and target, with the OPTS origin pulled into an outer scope, terminates and reports "no-origin"', async () => {
            const source = `A$=OPTS
class public C
    method public void m()
${preamble.split('\n').map(l => `        ${l}`).join('\n')}
        A$=IOR(A$,"$08$")
        SETOPTS A$
    methodend
classend`;
            const target = await parseAndFindSetOptsTarget(source);
            const shape = traceOptsChain(target)!;
            expect(shape.safe).toBe(false);
            expect(shape.unsafeReason).toBe<SetOptsUnsafeReason>('no-origin');
        });
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
