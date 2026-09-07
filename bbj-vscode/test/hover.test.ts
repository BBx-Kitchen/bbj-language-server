import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { documentationHeader, methodSignature } from '../src/language/bbj-hover.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { JavaMethod, JavaField, Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

describe('hover helpers are robust against malformed Java data', () => {
    // Java data comes from the java-interop socket / javadoc JSON and can arrive with
    // fields missing (e.g. a no-arg method serialized without a `parameters` array).
    // Hover must never throw on such payloads.

    test('methodSignature tolerates a missing parameters array', () => {
        expect(() => methodSignature({ name: 'foo', parameters: undefined as never, returnType: 'void' }))
            .not.toThrow();
        expect(methodSignature({ name: 'foo', parameters: undefined as never, returnType: 'void' }))
            .toBe('foo()');
    });

    test('methodSignature renders provided parameters', () => {
        expect(methodSignature({
            name: 'put',
            parameters: [{ name: 'k', type: 'String' }, { name: 'v', type: 'Object' }],
            returnType: 'Object'
        })).toBe('put(String k, Object v)');
    });

    test('documentationHeader tolerates a JavaMethod with no parameters array', () => {
        const method = { $type: JavaMethod.$type, name: 'size', returnType: 'int', parameters: undefined } as never;
        expect(() => documentationHeader(method)).not.toThrow();
        expect(documentationHeader(method)).toContain('size()');
    });

    test('documentationHeader tolerates a JavaField with no type', () => {
        const field = { $type: JavaField.$type, name: 'count', type: undefined } as never;
        expect(() => documentationHeader(field)).not.toThrow();
    });
});

/**
 * P61-D5-012: getHoverContent/getAstNodeHoverContent (bbj-hover.ts:55-109) had no test
 * covering hover content for a documented BBj class member, an inherited field, or the
 * error-degrade path — a regression in any of the three would pass `npm test` undetected
 * (D-13, no red state producible: all three already behave correctly).
 */
describe('Hover content: documented members, inheritance, and error resilience (P61-D5-012)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    function positionOf(document: LangiumDocument, snippet: string) {
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        return document.textDocument.positionAt(offset);
    }

    test('hovering a documented BBj class member returns its REM /** */ doc comment as markdown', async () => {
        const document = await parse(`
class public Doc
    REM /**
    REM  * The document title
    REM  */
    field public BBjString title
classend

declare Doc d!
PRINT d!.title
        `, { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        // Position inside "title" in the "d!.title" reference (not the field declaration itself).
        const position = positionOf(document, 'd!.title');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 'd!.'.length }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value).toContain('The document title');
    });

    // The inherited-field detection (bbj-hover.ts:58-73) only runs when the hovered field's
    // own CST node sits as the receiver of an outer MemberCall — i.e. a chained member
    // access (`d!.x.y`), not a direct one-hop access (`d!.x`). `x` must itself be typed as
    // a BbjClass (not a Java/primitive type) for `isBbjClass(receiverType)` to hold.
    const inheritedFieldChainSource = `
class public Helper
classend

class public Base
    field public Helper x
classend

class public Derived extends Base
classend

declare Derived d!
PRINT d!.x.y
    `;

    test('hovering an inherited field marks it as "inherited from" the declaring class', async () => {
        const document = await parse(inheritedFieldChainSource, { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'd!.x.y');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 'd!.'.length }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value).toContain('inherited from Base');
    });

    test('a hover computation error degrades to undefined instead of throwing (issue #388 pattern)', async () => {
        const document = await parse(inheritedFieldChainSource, { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'd!.x.y');

        // Baseline: without the injected failure, hover succeeds and reports inheritance
        // (proves the mock below actually changes behaviour rather than testing a no-op).
        const baseline = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 'd!.'.length }
        });
        expect(baseline).toBeDefined();

        // Force the inherited-field type-inference path to throw, simulating malformed
        // AST/interop data reaching the type inferer during hover computation.
        const typeInfererSpy = vi.spyOn((hoverProvider as unknown as { typeInferer: { getType: (n: unknown) => unknown } }).typeInferer, 'getType')
            .mockImplementation(() => {
                throw new Error('simulated hover computation failure');
            });

        let hover: unknown;
        await expect((async () => {
            hover = await hoverProvider.getHoverContent(document, {
                textDocument: { uri: document.uri.toString() },
                position: { line: position.line, character: position.character + 'd!.'.length }
            });
        })()).resolves.not.toThrow();

        expect(hover).toBeUndefined();

        typeInfererSpy.mockRestore();
    });
});

/**
 * SETOPTS-in-code decode hover, shape (a): an absolute `SETOPTS <hex>` statement (#475,
 * DISC-05, plan 88-01). Proves the hover branch is reachable through a real
 * `getHoverContent` call — the architectural risk this plan's tracer task settles: a hex
 * `StringLiteral` resolves to no declaration, so `getAstNodeHoverContent` (reached only via
 * `References.findDeclarations`) would never fire for it.
 */
describe('SETOPTS-in-code hover: absolute shape decode (88-01, DISC-05)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    function positionOf(document: LangiumDocument, snippet: string) {
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        return document.textDocument.positionAt(offset);
    }

    test('hovering the hex literal of an absolute SETOPTS statement returns a decoded markdown hover', async () => {
        const document = await parse('SETOPTS $08004020$', { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, '$08004020$');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 1 }
        });

        expect(hover).toBeDefined();
        const value = (hover!.contents as { value: string }).value;
        expect(value).toContain('SETOPTS $08004020$');
        expect(value).toContain('Console mode in public programs');
    });

    test('hovering the SETOPTS keyword returns byte-identical markdown to hovering the literal', async () => {
        const document = await parse('SETOPTS $08004020$', { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;

        const literalPos = positionOf(document, '$08004020$');
        const literalHover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: literalPos.line, character: literalPos.character + 1 }
        });

        const keywordPos = positionOf(document, 'SETOPTS');
        const keywordHover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: keywordPos.line, character: keywordPos.character + 1 }
        });

        expect(literalHover).toBeDefined();
        expect(keywordHover).toBeDefined();
        expect((keywordHover!.contents as { value: string }).value)
            .toBe((literalHover!.contents as { value: string }).value);
    });

    test('hovering an unrelated PRINT statement returns no SETOPTS markdown (falls through to existing behavior)', async () => {
        const document = await parse('PRINT "hello"\nSETOPTS $08004020$', { validation: true });
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);

        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, 'hello');
        const hover = await hoverProvider.getHoverContent(document, {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 1 }
        });

        if (hover) {
            const value = (hover.contents as { value: string }).value;
            expect(value).not.toContain('SETOPTS $08004020$');
        }
    });

    test('two consecutive hover requests at the same position return byte-identical markdown', async () => {
        const document = await parse('SETOPTS $08004020$', { validation: true });
        const hoverProvider = services.BBj.lsp.HoverProvider!;
        const position = positionOf(document, '$08004020$');
        const params = {
            textDocument: { uri: document.uri.toString() },
            position: { line: position.line, character: position.character + 1 }
        };

        const first = await hoverProvider.getHoverContent(document, params);
        const second = await hoverProvider.getHoverContent(document, params);

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect((second!.contents as { value: string }).value).toBe((first!.contents as { value: string }).value);
    });
});
