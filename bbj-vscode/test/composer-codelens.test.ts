import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import { BBjComposerCodeLensProvider } from '../src/language/composer-codelens.js';
import { COMPOSER_LENS_COMMAND } from '../src/composer-lens-contract.js';

/**
 * `BBjComposerCodeLensProvider` — the server-side `textDocument/codeLens` source for composer
 * cues (#650). Verifies the addWindow lens shape end-to-end against a parsed document: title,
 * range, command and target, comment/string exclusion, multi-call suffixing and ordering.
 */
describe('BBjComposerCodeLensProvider (#650)', () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);
    const provider = new BBjComposerCodeLensProvider();

    async function lensesFor(source: string) {
        const document = await parse(source);
        return provider.provideCodeLens(document, { textDocument: { uri: document.uri.toString() } });
    }

    test('a single addWindow call yields exactly one lens with the expected title, range, command and target', async () => {
        const source = 'window! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(1);
        const lens = lenses![0];
        expect(lens.command?.title).toBe('Compose addWindow');
        expect(lens.command?.command).toBe(COMPOSER_LENS_COMMAND);
        const callStart = source.indexOf('sysgui!.addWindow');
        const callEnd = source.indexOf(')', callStart) + 1;
        expect(lens.range).toEqual({
            start: { line: 0, character: callStart },
            end: { line: 0, character: callEnd },
        });
        expect(lens.command?.arguments).toEqual([
            { kind: 'addwindow', uri: expect.any(String), line: 0, character: callStart },
        ]);
    });

    test('an empty document yields no lenses', async () => {
        const lenses = await lensesFor('');
        expect(lenses).toEqual([]);
    });

    test('a document of plain statements with no composer call yields no lenses', async () => {
        const source = 'let a = 1\nlet b = 2\n';
        const lenses = await lensesFor(source);
        expect(lenses).toEqual([]);
    });

    test('a call inside a REM comment yields no lens', async () => {
        const source = 'rem window! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toEqual([]);
    });

    test('a call inside a string literal yields no lens', async () => {
        const source = 'a$ = "sysgui!.addWindow(1, 2, 3, 4)"\n';
        const lenses = await lensesFor(source);
        expect(lenses).toEqual([]);
    });

    test('two addWindow calls on one line get distinct characters and (1/2)/(2/2) suffixed titles in source order', async () => {
        const source = 'a! = sysgui!.addWindow(1,1,1,1) : b! = sysgui!.addWindow(2,2,2,2)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(2);
        expect(lenses![0].command?.title).toBe('Compose addWindow (1/2)');
        expect(lenses![1].command?.title).toBe('Compose addWindow (2/2)');
        const startA = lenses![0].command?.arguments?.[0].character;
        const startB = lenses![1].command?.arguments?.[0].character;
        expect(startA).not.toEqual(startB);
        expect(startA).toBeLessThan(startB);
    });

    test('addWindow calls on two adjacent lines each get one lens with no suffix', async () => {
        const source = 'a! = sysgui!.addWindow(1,1,1,1)\nb! = sysgui!.addWindow(2,2,2,2)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(2);
        expect(lenses![0].command?.title).toBe('Compose addWindow');
        expect(lenses![1].command?.title).toBe('Compose addWindow');
        expect(lenses![0].range.start.line).toBe(0);
        expect(lenses![1].range.start.line).toBe(1);
    });

    test('the returned list is ordered by line then start character, and repeated requests on an unchanged document return deep-equal lists', async () => {
        const source = 'b! = sysgui!.addWindow(2,2,2,2)\na! = sysgui!.addWindow(1,1,1,1)\n';
        const document = await parse(source);
        const params = { textDocument: { uri: document.uri.toString() } };
        const first = await provider.provideCodeLens(document, params);
        const second = await provider.provideCodeLens(document, params);
        expect(first![0].range.start.line).toBe(0);
        expect(first![1].range.start.line).toBe(1);
        expect(second).toEqual(first);
    });

    test('no lens title contains icon syntax', async () => {
        const source = 'window! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)\n';
        const lenses = await lensesFor(source);
        for (const lens of lenses!) {
            expect(lens.command?.title).not.toMatch(/\$\(/);
        }
    });
});
