import * as fs from 'fs';
import * as path from 'path';
import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { URI } from 'vscode-uri';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import {
    createComposeTriStateHandler, createDecodeInCodeHandler, SETOPTS_COMPOSE_TRISTATE_METHOD,
    SETOPTS_DECODE_IN_CODE_METHOD, type SetOptsInCodeDeps,
} from '../src/language/setopts-in-code-request.js';
import { detectSetOptsShape, setoptsHoverTarget, UNSAFE_REASON_TEXT } from '../src/language/setopts-code-scanner.js';
import { findLeafNodeAtOffset } from '../src/language/bbj-validator.js';
import { composeSetOptsBlock, type SetOptsTriStateSelection } from '../src/setopts-catalog.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * `bbj/composer/setopts/decodeInCode` and `bbj/composer/setopts/composeTriState` — the
 * document-aware SETOPTS-in-code requests both IDE clients drive (#475, DISC-06, plan 88-03).
 * Uses `parseHelper` (never `DocumentBuilder.build()`, which reaches BBjCPL/java-interop on
 * :5008 and is flaky outside a live BBj environment) and a stub `documents` object standing in
 * for `LangiumDocuments`.
 */
describe('bbj/composer/setopts/decodeInCode', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    async function parseSource(source: string): Promise<LangiumDocument> {
        const document = await parse(source, { validation: true });
        expect(document.parseResult.lexerErrors, source).toHaveLength(0);
        expect(document.parseResult.parserErrors, source).toHaveLength(0);
        return document;
    }

    /** A stub `documents` object resolving exactly one known document by URI string equality. */
    function stubDeps(document: LangiumDocument): SetOptsInCodeDeps {
        return {
            documents: {
                getDocument: (uri: URI) => uri.toString() === document.uri.toString() ? document : undefined,
            },
        };
    }

    function paramsAt(document: LangiumDocument, offset: number) {
        const position = document.textDocument.positionAt(offset);
        return { uri: document.uri.toString(), line: position.line, character: position.character };
    }

    test('an absolute SETOPTS "$hex$" statement returns found/editable/mode "absolute" with the hex literal range and digits', async () => {
        const source = 'SETOPTS "$08004020$"';
        const document = await parseSource(source);
        const offset = source.indexOf('$08004020$');
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, offset));

        expect(result.found).toBe(true);
        expect(result.editable).toBe(true);
        expect(result.mode).toBe('absolute');
        expect(result.chain).toBeUndefined();
        expect(result.initial).toBeUndefined();
        expect(result.absolute).toBeDefined();
        expect(result.absolute!.line).toBe(0);
        expect(result.absolute!.hexDigits).toBe('08004020');
        const [start, end] = result.absolute!.hexRange;
        expect(source.slice(start, end)).toBe('"$08004020$"');
        expect(result.summary).toContain('__SETOPTS $08004020$__');
    });

    test('an absolute SETOPTS $hex$ (bare HEX_STRING) statement resolves the same way', async () => {
        const source = 'SETOPTS $08004020$';
        const document = await parseSource(source);
        const offset = source.indexOf('$08004020$');
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, offset));

        expect(result.found).toBe(true);
        expect(result.editable).toBe(true);
        expect(result.mode).toBe('absolute');
        const [start, end] = result.absolute!.hexRange;
        expect(source.slice(start, end)).toBe('$08004020$');
    });

    test('a safe OPTS->IOR/AND->SETOPTS chain returns found/editable/mode "chain" with the reassignment range, indent and prefill selection', async () => {
        const source = 'A$=OPTS\n    A$=IOR(A$,"$08$")\n    A$=AND(A$,"$F7$")\nSETOPTS A$';
        const document = await parseSource(source);
        const variableOffset = source.lastIndexOf('SETOPTS A$') + 'SETOPTS '.length;
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, variableOffset));

        expect(result.found).toBe(true);
        expect(result.editable).toBe(true);
        expect(result.mode).toBe('chain');
        expect(result.reason).toBeUndefined();
        expect(result.chain).toEqual({ variableName: 'a$', startLine: 1, endLine: 3, indent: '    ' });
        expect(result.initial).toBeDefined();
        const byte1Entry = result.initial!.entries.find(e => e.byte === 1 && e.mask === 0x08)!;
        expect(byte1Entry.state).toBe('clear'); // IOR then AND on the same bit -> last write wins -> clear
        expect(result.initial!.entries.filter(e => e !== byte1Entry).every(e => e.state === 'leave')).toBe(true);
    });

    test('a chain with zero reassignments yields startLine === endLine (an empty half-open range)', async () => {
        const source = 'A$=OPTS\nSETOPTS A$';
        const document = await parseSource(source);
        const variableOffset = source.lastIndexOf('SETOPTS A$') + 'SETOPTS '.length;
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, variableOffset));

        expect(result.mode).toBe('chain');
        expect(result.editable).toBe(true);
        expect(result.chain!.startLine).toBe(result.chain!.endLine);
    });

    test('an unsafe chain returns editable: false with a reason, and carries no chain and no initial field a client could apply', async () => {
        const source = 'A$=OPTS\nA$="hello"\nSETOPTS A$';
        const document = await parseSource(source);
        const variableOffset = source.lastIndexOf('SETOPTS A$') + 'SETOPTS '.length;
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, variableOffset));

        expect(result.found).toBe(true);
        expect(result.editable).toBe(false);
        expect(result.mode).toBe('chain');
        expect(result.reason).toBe(UNSAFE_REASON_TEXT.reassigned);
        expect(result.chain).toBeUndefined();
        expect(result.initial).toBeUndefined();
    });

    test('a byte-range indexed-target chain (reported reproduction) returns editable: false with mode "chain", a non-empty reason, and no chain/initial payload', async () => {
        const source = 'a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$';
        const document = await parseSource(source);
        const variableOffset = source.lastIndexOf('SETOPTS A$') + 'SETOPTS '.length;
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, variableOffset));

        expect(result.found).toBe(true);
        expect(result.editable).toBe(false);
        expect(result.mode).toBe('chain');
        expect(result.reason).toBeTruthy();
        expect(result.chain).toBeUndefined();
        expect(result.initial).toBeUndefined();
    });

    test('a position with no SETOPTS shape nearby returns found: false, editable: false, mode: "none"', async () => {
        const source = 'PRINT "hello"';
        const document = await parseSource(source);
        const offset = source.indexOf('hello');
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, offset));

        expect(result).toEqual({ found: false, editable: false, mode: 'none' });
    });

    test('hovering a single IOR/AND call directly (mask-call shape) is not an edit-in-place target — found: false, mode: "none"', async () => {
        const source = 'A$=IOR(A$,"$08$")';
        const document = await parseSource(source);
        const offset = source.indexOf('IOR') + 1;
        const handler = createDecodeInCodeHandler(stubDeps(document));

        const result = handler(paramsAt(document, offset));

        expect(result).toEqual({ found: false, editable: false, mode: 'none' });
    });

    test('a uri the document store does not hold returns found: false without throwing', async () => {
        const document = await parseSource('SETOPTS $08004020$');
        const handler = createDecodeInCodeHandler(stubDeps(document));

        expect(() => handler({ uri: 'file:///not-open.bbj', line: 0, character: 0 })).not.toThrow();
        const result = handler({ uri: 'file:///not-open.bbj', line: 0, character: 0 });
        expect(result).toEqual({ found: false, editable: false, mode: 'none' });
    });
});

describe('bbj/composer/setopts/composeTriState', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    test('is a thin pass-through to composeSetOptsBlock, defaulting exactly as the catalog function does', () => {
        const selection: SetOptsTriStateSelection = {
            entries: [{ byte: 1, mask: 0x08, state: 'set' }, { byte: 2, mask: 0x20, state: 'clear' }],
        };
        const handler = createComposeTriStateHandler();

        expect(handler({ selection })).toEqual(composeSetOptsBlock({ selection }));
        expect(handler({ selection, variable: 'A$', indent: '  ', scope: 'reassignments' }))
            .toEqual(composeSetOptsBlock({ selection, variable: 'A$', indent: '  ', scope: 'reassignments' }));
    });

    test('a composed block, parsed as a .bbj document, is classified safe by traceOptsChain and folds to the same set/clear effect', async () => {
        const selection: SetOptsTriStateSelection = {
            entries: [{ byte: 1, mask: 0x08, state: 'set' }, { byte: 2, mask: 0x20, state: 'clear' }],
        };
        const handler = createComposeTriStateHandler();
        const { text } = handler({ selection });

        const document = await parse(text, { validation: true });
        expect(document.parseResult.lexerErrors, text).toHaveLength(0);
        expect(document.parseResult.parserErrors, text).toHaveLength(0);
        const rootNode = document.parseResult.value.$cstNode!;
        const variableOffset = text.lastIndexOf('SETOPTS ') + 'SETOPTS '.length;
        const leaf = findLeafNodeAtOffset(rootNode, variableOffset);
        const target = setoptsHoverTarget(leaf!);
        const shape = detectSetOptsShape(target!);

        expect(shape?.kind).toBe('chain');
        expect(shape).toMatchObject({ kind: 'chain', safe: true });
        if (shape?.kind === 'chain') {
            expect(shape.effect.set).toEqual([{ byte: 1, mask: 0x08 }]);
            expect(shape.effect.clear).toEqual([{ byte: 2, mask: 0x20 }]);
        }
    });
});

/**
 * Method-name naming convention — cheap always-run check independent of the wiring guards below.
 */
describe('setopts-in-code-request.ts method names', () => {
    test('SETOPTS_DECODE_IN_CODE_METHOD and SETOPTS_COMPOSE_TRISTATE_METHOD follow the existing bbj/composer/setopts/* naming convention', () => {
        expect(SETOPTS_DECODE_IN_CODE_METHOD).toBe('bbj/composer/setopts/decodeInCode');
        expect(SETOPTS_COMPOSE_TRISTATE_METHOD).toBe('bbj/composer/setopts/composeTriState');
    });
});

/**
 * `main.ts` wiring guards (Task 3, plan 88-03): `registerSetOptsInCodeRequests` must be called
 * strictly AFTER `createBBjServices(` — this family needs document-aware context that does not
 * exist until the services are created, unlike `registerComposerRequests`, which runs before
 * them and must never move. A future edit that reorders these calls, or that moves one of these
 * handlers into the pre-services `composerHandlers` registry, fails these guards.
 */
describe('setopts-in-code-request.ts wiring in main.ts', () => {
    const MAIN_TS_SOURCE_PATH = path.join(__dirname, '..', 'src', 'language', 'main.ts');

    /** Strip `//`-prefixed line comments so a comment mentioning the call can't satisfy the guard. */
    function codeOnly(source: string): string {
        return source
            .split('\n')
            .map(line => {
                const commentIndex = line.indexOf('//');
                return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
            })
            .join('\n');
    }

    test('registerSetOptsInCodeRequests(connection is called strictly AFTER createBBjServices(', () => {
        const source = codeOnly(fs.readFileSync(MAIN_TS_SOURCE_PATH, 'utf-8'));
        const registerCallIndex = source.indexOf('registerSetOptsInCodeRequests(connection');
        const createServicesIndex = source.indexOf('createBBjServices(');

        expect(registerCallIndex, 'expected a registerSetOptsInCodeRequests(connection call in main.ts').toBeGreaterThanOrEqual(0);
        expect(createServicesIndex, 'expected a createBBjServices( call in main.ts').toBeGreaterThanOrEqual(0);
        expect(registerCallIndex).toBeGreaterThan(createServicesIndex);
    });

    test('registerComposerRequests(connection) is untouched: still called BEFORE createBBjServices(', () => {
        const source = codeOnly(fs.readFileSync(MAIN_TS_SOURCE_PATH, 'utf-8'));
        const registerComposerIndex = source.indexOf('registerComposerRequests(connection)');
        const createServicesIndex = source.indexOf('createBBjServices(');

        expect(registerComposerIndex).toBeGreaterThanOrEqual(0);
        expect(createServicesIndex).toBeGreaterThanOrEqual(0);
        expect(registerComposerIndex).toBeLessThan(createServicesIndex);
    });

    test('neither new method-name literal appears inside composer-commands.ts (the pre-services registry)', () => {
        const composerCommandsSource = fs.readFileSync(
            path.join(__dirname, '..', 'src', 'language', 'composer-commands.ts'),
            'utf-8'
        );
        expect(composerCommandsSource).not.toContain(SETOPTS_DECODE_IN_CODE_METHOD);
        expect(composerCommandsSource).not.toContain(SETOPTS_COMPOSE_TRISTATE_METHOD);
    });
});
