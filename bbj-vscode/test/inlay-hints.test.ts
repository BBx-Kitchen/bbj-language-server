import { AstUtils, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { InlayHint, Range } from 'vscode-languageserver';
import { isLiteralArgument, isSelfDescribing, matchesParameterName, setParameterHintMode } from '../src/language/bbj-inlay-hint-provider.js';
import { Model, isParameterCall } from '../src/language/generated/ast.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjTestServices(EmptyFileSystem);
const parse = (content: string) => parseHelper<Model>(services.BBj)(content);

describe('Inlay hints', () => {

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    afterEach(() => {
        setParameterHintMode('literals');
    });

    async function getHints(content: string): Promise<{ document: LangiumDocument, hints: InlayHint[] }> {
        const document = await parse(content);
        expect(document.parseResult.lexerErrors).toHaveLength(0);
        expect(document.parseResult.parserErrors).toHaveLength(0);
        const provider = services.BBj.lsp.InlayHintProvider!;
        const hints = await provider.getInlayHints(document, {
            textDocument: { uri: document.uri.toString() },
            range: Range.create(0, 0, document.textDocument.lineCount, 0)
        }) ?? [];
        return { document, hints };
    }

    function positionOf(document: LangiumDocument, snippet: string) {
        const offset = document.textDocument.getText().indexOf(snippet);
        expect(offset, `expected to find "${snippet}" in the test source`).toBeGreaterThanOrEqual(0);
        return document.textDocument.positionAt(offset);
    }

    test('BBj class method call shows parameter name hints for literal arguments', async () => {
        const { document, hints } = await getHints(`
            class public Person
                method public resize(BBjNumber width, BBjNumber height)
                methodend
            classend

            declare Person p!
            p!.resize(100, 200)
        `);
        expect(hints.map(h => h.label)).toEqual(['width:', 'height:']);
        expect(hints[0].kind).toBe(2); // InlayHintKind.Parameter
        expect(hints[0].position).toEqual(positionOf(document, '100'));
        expect(hints[1].position).toEqual(positionOf(document, '200'));
    });

    test('DEF FN call shows parameter name hints', async () => {
        const { document, hints } = await getHints(`
            DEF FNAREA(W,H)=W*H
            X = FNAREA(3,4)
        `);
        expect(hints.map(h => h.label)).toEqual(['W:', 'H:']);
        expect(hints[0].position).toEqual(positionOf(document, '3,4)'));
    });

    test('builtin library function call shows parameter name hints', async () => {
        const { hints } = await getHints(`
            A$ = CHR(65)
        `);
        expect(hints.map(h => h.label)).toEqual(['num:']);
    });

    test('literals mode skips non-literal arguments', async () => {
        const { hints } = await getHints(`
            DEF FNAREA(W,H)=W*H
            SIZE = 3
            X = FNAREA(SIZE,4)
        `);
        expect(hints.map(h => h.label)).toEqual(['H:']);
    });

    test('negative and positive number literals still count as literals', async () => {
        const { hints } = await getHints(`
            DEF FNAREA(W,H)=W*H
            X = FNAREA(-3,+4)
        `);
        expect(hints.map(h => h.label)).toEqual(['W:', 'H:']);
    });

    test('mode "all" hints variable arguments but not those spelling the parameter name', async () => {
        setParameterHintMode('all');
        const { hints } = await getHints(`
            DEF FNAREA(W,H)=W*H
            w = 3
            SIZE = 4
            X = FNAREA(w,SIZE)
        `);
        // w matches parameter W (case-insensitive), SIZE does not match H
        expect(hints.map(h => h.label)).toEqual(['H:']);
    });

    test('mode "none" disables all hints', async () => {
        setParameterHintMode('none');
        const { hints } = await getHints(`
            DEF FNAREA(W,H)=W*H
            X = FNAREA(3,4)
        `);
        expect(hints).toHaveLength(0);
    });

    test('setter-like methods whose name contains the parameter name get no hint', async () => {
        const { hints } = await getHints(`
            class public Person
                method public setAge(BBjNumber age)
                methodend
            classend

            declare Person p!
            p!.setAge(30)
        `);
        expect(hints).toHaveLength(0);
    });

    test('synthetic parameter names (arg0, arg1) are suppressed', async () => {
        const { hints } = await getHints(`
            class public Legacy
                method public compute(BBjNumber arg0, BBjNumber arg1)
                methodend
            classend

            declare Legacy l!
            l!.compute(1, 2)
        `);
        expect(hints).toHaveLength(0);
    });

    test('overloaded Java method: hints come from the overload matching the argument count (#478)', async () => {
        // The linker resolves `addWindow` to the first overload (p_context, p_id, p_title);
        // the one-argument call must be hinted from the single-parameter overload.
        const { hints } = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.addWindow("Title")
        `);
        expect(hints.map(h => h.label)).toEqual(['p_title:']);
    });

    test('overloaded Java method: call matching the linked overload is unaffected', async () => {
        const { hints } = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.addWindow(100, 200, "Title")
        `);
        expect(hints.map(h => h.label)).toEqual(['p_context:', 'p_id:', 'p_title:']);
    });

    test('hex string literal argument counts as a string: addWindow("test", $00000082$)', async () => {
        // (p_context, p_title) and (p_title, p_flags) both take two arguments;
        // "test" and the hex string $00000082$ are both strings, so the
        // (title, flags) overload must win over the numeric-first one.
        const { hints } = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            w! = sg!.addWindow("test", $00000082$)
        `);
        expect(hints.map(h => h.label)).toEqual(['p_title:', 'p_flags:']);
    });

    test('same-arity Java overloads are told apart by the argument types (#478)', async () => {
        // Both setValue overloads take two arguments; only the types in order decide.
        const { hints } = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            sg!.setValue("abc", 5)
        `);
        expect(hints.map(h => h.label)).toEqual(['p_text:', 'p_flags:']);
    });

    test('same-arity Java overloads: reversed argument types pick the other overload', async () => {
        const { hints } = await getHints(`
            use com.test.SysGui
            declare SysGui sg!
            sg!.setValue(1, "abc")
        `);
        expect(hints.map(h => h.label)).toEqual(['p_index:', 'p_text:']);
    });

    test('same-arity BBj method overloads are told apart by the argument types', async () => {
        const { hints } = await getHints(`
            class public Gui
                method public draw(BBjNumber x, BBjString caption)
                methodend
                method public draw(BBjString caption, BBjNumber size)
                methodend
            classend

            declare Gui g!
            g!.draw("Hi", 3)
        `);
        expect(hints.map(h => h.label)).toEqual(['caption:', 'size:']);
    });

    test('overloaded BBj method: hints come from the overload matching the argument count', async () => {
        const { hints } = await getHints(`
            class public Gui
                method public makeWindow(BBjNumber context, BBjNumber id, BBjString caption)
                methodend
                method public makeWindow(BBjString caption)
                methodend
            classend

            declare Gui g!
            g!.makeWindow("Title")
        `);
        expect(hints.map(h => h.label)).toEqual(['caption:']);
    });

    test('extra arguments beyond the declared parameters get no hint', async () => {
        const { hints } = await getHints(`
            DEF FNTWICE(N)=N*2
            X = FNTWICE(3,4)
        `);
        expect(hints.map(h => h.label)).toEqual(['N:']);
    });
});

describe('Inlay hint heuristics', () => {

    test('matchesParameterName is case-insensitive and ignores BBj suffixes', () => {
        expect(matchesParameterName('count', 'count')).toBe(true);
        expect(matchesParameterName('COUNT', 'count')).toBe(true);
        expect(matchesParameterName('count!', 'count')).toBe(true);
        expect(matchesParameterName('name$', 'NAME$')).toBe(true);
        expect(matchesParameterName('#count', 'count')).toBe(true);
        expect(matchesParameterName('total', 'count')).toBe(false);
        expect(matchesParameterName('getCount()', 'count')).toBe(false);
    });

    test('isSelfDescribing detects setter-like callee names', () => {
        expect(isSelfDescribing('setage', 'age')).toBe(true);
        expect(isSelfDescribing('settitle', 'title$')).toBe(true);
        expect(isSelfDescribing('resize', 'width')).toBe(false);
        // short names never trigger the substring rule
        expect(isSelfDescribing('sin', 'n')).toBe(false);
    });

    test('isLiteralArgument accepts literals and signed literals only', async () => {
        const document = await parse(`
            DEF FNID(N)=N
            A = FNID(1)
            B = FNID(-1)
            C = FNID("s")
            D = FNID(A)
            E = FNID(1+2)
        `);
        const args = AstUtils.streamAllContents(document.parseResult.value)
            .filter(isParameterCall)
            .map(p => p.expression)
            .toArray();
        expect(args).toHaveLength(5);
        const [literal, signed, str, variable, binary] = args;
        expect(isLiteralArgument(literal)).toBe(true);
        expect(isLiteralArgument(signed)).toBe(true);
        expect(isLiteralArgument(str)).toBe(true);
        expect(isLiteralArgument(variable)).toBe(false);
        expect(isLiteralArgument(binary)).toBe(false);
    });
});
