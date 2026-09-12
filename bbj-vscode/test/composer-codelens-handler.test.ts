import { describe, expect, test, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import type { CodeLens, CodeLensParams } from 'vscode-languageserver';
import type { LangiumDocument } from 'langium';
import {
    COMPOSER_CODE_LENS_BUDGET_MS, createBoundedComposerCodeLensHandler, type ComposerCodeLensHandlerDeps,
} from '../src/language/composer-codelens-handler.js';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const TEST_BUDGET_MS = 30;

/** A never-settling promise, for the "budget expires before the wait does" behaviour. */
function neverSettles<T>(): Promise<T> {
    return new Promise<T>(() => { /* deliberately never resolves or rejects */ });
}

function paramsFor(uri = 'file:///bounded-code-lens.bbj'): CodeLensParams {
    return { textDocument: { uri } };
}

// An opaque stand-in document — the handler never inspects its shape, only whether it is present.
const FAKE_DOCUMENT = {} as LangiumDocument;

function depsFor(overrides: Partial<ComposerCodeLensHandlerDeps>): ComposerCodeLensHandlerDeps {
    return {
        waitForRequiredState: async () => undefined,
        getDocument: () => FAKE_DOCUMENT,
        getCodeLenses: async () => undefined,
        getLanguageId: () => 'bbj',
        getText: () => undefined,
        budgetMs: TEST_BUDGET_MS,
        ...overrides,
    };
}

describe('createBoundedComposerCodeLensHandler (#650)', () => {

    test('settled within budget: returns exactly what the provider returned', async () => {
        const lenses: CodeLens[] = [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }];
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getCodeLenses: async () => lenses,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBe(lenses);
    });

    test('settled within budget, provider returns nothing: resolves to null', async () => {
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getCodeLenses: async () => undefined,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
    });

    test('budget expires before the wait settles: resolves to null promptly, not after the wait', async () => {
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            waitForRequiredState: () => neverSettles(),
            getCodeLenses: async () => {
                throw new Error('must not be reached — the wait never settled');
            },
        }));
        const start = Date.now();
        const result = await handler(paramsFor(), CancellationToken.None);
        const elapsed = Date.now() - start;
        expect(result).toBeNull();
        expect(elapsed).toBeLessThan(TEST_BUDGET_MS + 2000);
    });

    test('a never-settling wait leaves no pending timer holding the process open', async () => {
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            waitForRequiredState: () => neverSettles(),
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    }, 2000);

    test('an eventual rejection from an abandoned wait never surfaces as an unhandled rejection', async () => {
        let rejectLate: (reason: unknown) => void = () => { /* replaced below */ };
        const lateRejecting = new Promise<unknown>((_resolve, reject) => { rejectLate = reject; });
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            waitForRequiredState: () => lateRejecting,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
        rejectLate(new Error('late rejection from an abandoned wait'));
        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    test('document not in the in-memory store: returns null without a getCodeLenses call', async () => {
        let getCodeLensesCalled = false;
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getDocument: () => undefined,
            getCodeLenses: async () => {
                getCodeLensesCalled = true;
                return [];
            },
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
        expect(getCodeLensesCalled).toBe(false);
    });

    test('the state wait rejects: returns null rather than propagating', async () => {
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            waitForRequiredState: async () => { throw new Error('cancelled'); },
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    });

    test('the provider throws: returns null rather than propagating', async () => {
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getCodeLenses: async () => { throw new Error('boom'); },
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    });

    test('the exported budget constant is a positive, non-trivial number of milliseconds', () => {
        expect(COMPOSER_CODE_LENS_BUDGET_MS).toBeGreaterThan(1000);
    });
});

describe('the bbx-config branch answers from raw text before any wait (#650)', () => {
    const CONFIG_TEXT = 'PREFIX "/x/"\nSETOPTS 00000080\nsetopts\nSETOPTS zz junk\n';

    test('a bbx-config document with recognizable SETOPTS lines returns exactly the matching cues without waiting', async () => {
        let waitCalled = false;
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getLanguageId: () => 'bbx-config',
            getText: () => CONFIG_TEXT,
            waitForRequiredState: async () => { waitCalled = true; },
        }));

        const result = await handler(paramsFor(), CancellationToken.None);

        expect(waitCalled).toBe(false);
        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        const lines = result!.map((lens) => lens.range.start.line);
        expect(lines).toEqual([1, 2]);
        for (const lens of result!) {
            expect(lens.command?.title).toBe('Compose SETOPTS');
            expect(lens.command?.arguments?.[0].kind).toBe('setopts-config');
            expect(lens.range.start.character).toBe(0);
        }
    });

    test('a bbx-config document with no text available returns null', async () => {
        let waitCalled = false;
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getLanguageId: () => 'bbx-config',
            getText: () => undefined,
            waitForRequiredState: async () => { waitCalled = true; },
        }));

        const result = await handler(paramsFor(), CancellationToken.None);

        expect(waitCalled).toBe(false);
        expect(result).toBeNull();
    });

    test('a bbj document behaves exactly as before — the wait runs and the provider is consulted', async () => {
        const lenses: CodeLens[] = [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }];
        let waitCalled = false;
        const handler = createBoundedComposerCodeLensHandler(depsFor({
            getLanguageId: () => 'bbj',
            waitForRequiredState: async () => { waitCalled = true; },
            getCodeLenses: async () => lenses,
        }));

        const result = await handler(paramsFor(), CancellationToken.None);

        expect(waitCalled).toBe(true);
        expect(result).toBe(lenses);
    });
});

/**
 * A document of at least 5000 lines — mixing addWindow, MSGBOX, addChildWindow, CVS() and a safe
 * in-code SETOPTS chain — answers 20 consecutive `provideCodeLens` calls with deep-equal lists,
 * with zero parser/DocumentBuilder.update/DocumentBuilder.build calls, proving Roadmap Success
 * Criterion 5 end-to-end through the real Langium services (not just the pure candidate collector
 * unit-tested in composer-codelens.test.ts) for every composer kind added in this plan, not just
 * the original addWindow tracer.
 */
describe('BBjComposerCodeLensProvider — no re-parse across repeated requests (#650)', () => {
    test('20 consecutive requests on a 5000+ line mixed-kind document return deep-equal lists with zero parser/update/build calls', async () => {
        const services = createBBjServices(EmptyFileSystem);
        const parse = parseHelper<Model>(services.BBj);
        // The in-code SETOPTS chain block below needs the workspace initialized so
        // `traceOptsChain` can resolve the OPTS/IOR/AND references its decode depends on
        // (mirrors composer-codelens.test.ts and setopts-in-code-request.test.ts). Combined with
        // parsing 5000+ lines and 20 provideCodeLens passes over five detector kinds, this needs
        // more than vitest's 5000ms default test timeout.
        await initializeWorkspace(services.shared);

        const lines: string[] = [];
        for (let i = 0; i < 5000; i++) {
            if (i % 500 === 0) {
                lines.push(`window${i}! = sysgui!.addWindow(1, 1, 1, 1, "W${i}", $00010003$)`);
            } else if (i % 500 === 100) {
                lines.push(`r${i} = MSGBOX("Hi${i}", 36, "T${i}")`);
            } else if (i % 500 === 200) {
                lines.push(`child${i}! = window!.addChildWindow(${i}, "Child${i}", 10, 10, 200, 150, $00000000$)`);
            } else if (i % 500 === 300) {
                lines.push(`x${i}$ = CVS(a$, 1+4)`);
            } else if (i % 7 === 0) {
                lines.push(`rem not a real call: sysgui!.addWindow(1,1,1,1)`);
            } else {
                lines.push(`let a${i} = ${i}`);
            }
        }
        // A safe OPTS -> IOR/AND -> SETOPTS chain, appended once at the end of the document.
        lines.push('C$=OPTS');
        lines.push('C$=IOR(C$,$01$)');
        lines.push('C$=AND(C$,$FE$)');
        lines.push('SETOPTS C$');

        const source = lines.join('\n') + '\n';
        const document = await parse(source);

        const parseSpy = vi.spyOn(services.BBj.parser.LangiumParser, 'parse');
        const updateSpy = vi.spyOn(services.shared.workspace.DocumentBuilder, 'update');
        const buildSpy = vi.spyOn(services.shared.workspace.DocumentBuilder, 'build');

        const provider = services.BBj.lsp.CodeLensProvider!;
        const params = { textDocument: { uri: document.uri.toString() } };

        const results: CodeLens[][] = [];
        const start = Date.now();
        for (let i = 0; i < 20; i++) {
            results.push((await provider.provideCodeLens(document, params)) as CodeLens[]);
        }
        const elapsedFirst = Date.now() - start;

        for (let i = 1; i < results.length; i++) {
            expect(results[i]).toEqual(results[0]);
        }
        expect(parseSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(buildSpy).not.toHaveBeenCalled();

        // Every mixed-in kind is actually represented — the whole point of widening this fixture.
        const kinds = new Set(results[0].map((lens) => lens.command?.arguments?.[0].kind));
        expect(kinds).toEqual(new Set(['addwindow', 'msgbox', 'addchildwindow', 'cvs', 'setopts-in-code']));

        // Generous smoke ceiling for a single call's share of the 20-request total, not a benchmark.
        expect(elapsedFirst / 20).toBeLessThan(2000);
    }, 30000);
});
