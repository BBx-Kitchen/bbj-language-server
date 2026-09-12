import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import { BBjComposerCodeLensProvider } from '../src/language/composer-codelens.js';
import { COMPOSER_LENS_COMMAND } from '../src/composer-lens-contract.js';
import { initializeWorkspace } from './test-helper.js';

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
        const callStart = source.indexOf('addWindow');
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

/**
 * Composer kinds beyond addWindow (#650): MSGBOX, addChildWindow, editable CVS() and editable
 * in-code SETOPTS. Each cue's applicability comes entirely from that composer's own existing
 * detector/decoder — `findMsgboxCalls`, `findAddChildWindowCalls`, `findCvsCalls` +
 * `decodeCvsCall`, and `createDecodeInCodeHandler` (via the provider's own `decodeSetoptsInCode`).
 */
describe('BBjComposerCodeLensProvider — MSGBOX, addChildWindow, CVS and in-code SETOPTS (#650)', () => {
    const services = createBBjServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.BBj);
    const provider = new BBjComposerCodeLensProvider();

    beforeAll(async () => {
        // The in-code SETOPTS chain shape needs the workspace initialized (mirrors
        // setopts-in-code-request.test.ts) so `traceOptsChain` can resolve the OPTS/IOR/AND
        // references a safe chain's decode depends on.
        await initializeWorkspace(services.shared);
    });

    async function lensesFor(source: string) {
        const document = await parse(source);
        return provider.provideCodeLens(document, { textDocument: { uri: document.uri.toString() } });
    }

    test('MSGBOX calls with a literal expr, a variable expr, and no options argument each yield one Compose MSGBOX cue', async () => {
        const literal = await lensesFor('r = MSGBOX("Hi", 36, "T")\n');
        expect(literal).toHaveLength(1);
        expect(literal![0].command?.title).toBe('Compose MSGBOX');
        expect(literal![0].command?.arguments?.[0].kind).toBe('msgbox');

        const variable = await lensesFor('r = MSGBOX("Hi", flags%, "T")\n');
        expect(variable).toHaveLength(1);
        expect(variable![0].command?.title).toBe('Compose MSGBOX');

        const bare = await lensesFor('MSGBOX("Hi")\n');
        expect(bare).toHaveLength(1);
        expect(bare![0].command?.title).toBe('Compose MSGBOX');
    });

    test('an addChildWindow call yields one Compose addChildWindow cue; an addWindow line still yields only its addWindow cue', async () => {
        const source = 'child! = window!.addChildWindow(101, "Child", 10, 10, 200, 150, $00000000$)\n'
            + 'win! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(2);
        expect(lenses![0].command?.title).toBe('Compose addChildWindow');
        expect(lenses![0].command?.arguments?.[0].kind).toBe('addchildwindow');
        expect(lenses![1].command?.title).toBe('Compose addWindow');
        expect(lenses![1].command?.arguments?.[0].kind).toBe('addwindow');
    });

    test('a CVS() call with an integer-literal-sum mask yields one Compose CVS() cue', async () => {
        const source = 'x$ = CVS(a$, 1+4)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(1);
        expect(lenses![0].command?.title).toBe('Compose CVS()');
        expect(lenses![0].command?.arguments?.[0].kind).toBe('cvs');
    });

    test('a CVS() call with a variable mask, no mask, an unfinished call, or a longer builtin name yields no cue', async () => {
        const varMask = await lensesFor('x$ = CVS(a$, n%)\n');
        expect(varMask).toEqual([]);
        const noMask = await lensesFor('x$ = CVS(a$)\n');
        expect(noMask).toEqual([]);
        const longerName = await lensesFor('x$ = MYCVS(a$, 1)\n');
        expect(longerName).toEqual([]);

        // Half-typed CVS() calls (the #649 gap closure's `incomplete` outcome) keep `editable:
        // false`, so the existing found && editable gate already leaves them cue-free.
        expect(await lensesFor('x$ = CVS(\n')).toEqual([]);
        expect(await lensesFor('x$ = CVS()\n')).toEqual([]);
        expect(await lensesFor('x$ = CVS(a$\n')).toEqual([]);
        expect(await lensesFor('x$ = CVS(a$,\n')).toEqual([]);
    });

    test('an absolute SETOPTS statement yields one Compose SETOPTS cue at the argument\'s first character', async () => {
        const source = 'SETOPTS $04$\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(1);
        expect(lenses![0].command?.title).toBe('Compose SETOPTS');
        const character = source.indexOf('$04$');
        expect(lenses![0].command?.arguments).toEqual([
            { kind: 'setopts-in-code', uri: expect.any(String), line: 0, character },
        ]);
    });

    test('the SETOPTS line of a canonical safe chain yields one Compose SETOPTS cue', async () => {
        const source = 'B$=OPTS\nB$=IOR(B$,$01$)\nB$=AND(B$,$FE$)\nSETOPTS B$\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(1);
        expect(lenses![0].command?.title).toBe('Compose SETOPTS');
        expect(lenses![0].range.start.line).toBe(3);
        const setoptsLine = 'SETOPTS B$';
        const character = setoptsLine.indexOf('B$');
        expect(lenses![0].command?.arguments?.[0].character).toBe(character);
    });

    test('the shared-line and unsafe-chain shapes from the #475 fixture yield no SETOPTS cue; IOR(/AND( get no cue of their own', async () => {
        const sharedLine = await lensesFor('a$=OPTS; A$(1,1)=IOR(A$(1,1),$C2$); SETOPTS A$\n');
        expect(sharedLine).toEqual([]);

        const separateStatements = await lensesFor('LET A$=OPTS\nLET A$(2,1)=AND(A$(2,1),$7F$)\nSETOPTS A$\n');
        expect(separateStatements).toEqual([]);
    });

    test('rem MSGBOX(...), a "CVS(...)" string literal, and rem SETOPTS $04$ yield no cue', async () => {
        const source = 'rem MSGBOX("x", 1)\na$ = "CVS(a$, 1)"\nrem SETOPTS $04$\n';
        const lenses = await lensesFor(source);
        expect(lenses).toEqual([]);
    });

    test('a CVS() call whose string argument contains a MSGBOX() call yields two cues ordered by start character (CVS first, then MSGBOX)', async () => {
        const source = 'x$ = CVS(MSGBOX("a", 1) + a$, 4)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(2);
        expect(lenses![0].command?.arguments?.[0].kind).toBe('cvs');
        expect(lenses![1].command?.arguments?.[0].kind).toBe('msgbox');
        expect(lenses![0].range.start.character).toBeLessThan(lenses![1].range.start.character);
    });

    test('two MSGBOX calls on one line are numbered (1/2) and (2/2)', async () => {
        const source = 'a! = MSGBOX("A", 1) : b! = MSGBOX("B", 2)\n';
        const lenses = await lensesFor(source);
        expect(lenses).toHaveLength(2);
        expect(lenses![0].command?.title).toBe('Compose MSGBOX (1/2)');
        expect(lenses![1].command?.title).toBe('Compose MSGBOX (2/2)');
    });
});
