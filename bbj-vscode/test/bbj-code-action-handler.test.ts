import { describe, expect, test } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import type { CodeAction, CodeActionParams } from 'vscode-languageserver';
import type { LangiumDocument } from 'langium';
import {
    CODE_ACTION_BUDGET_MS, createBoundedCodeActionHandler, type CodeActionHandlerDeps,
} from '../src/language/bbj-code-action-handler.js';

const TEST_BUDGET_MS = 30;

/** A never-settling promise, for the "budget expires before the wait does" behaviour. */
function neverSettles<T>(): Promise<T> {
    return new Promise<T>(() => { /* deliberately never resolves or rejects */ });
}

function paramsFor(uri = 'file:///bounded-code-action.bbj'): CodeActionParams {
    return {
        textDocument: { uri },
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        context: { diagnostics: [] },
    };
}

// An opaque stand-in document — the handler never inspects its shape, only whether it is present.
const FAKE_DOCUMENT = {} as LangiumDocument;

function depsFor(overrides: Partial<CodeActionHandlerDeps>): CodeActionHandlerDeps {
    return {
        waitForRequiredState: async () => undefined,
        getDocument: () => FAKE_DOCUMENT,
        getCodeActions: async () => undefined,
        budgetMs: TEST_BUDGET_MS,
        ...overrides,
    };
}

describe('createBoundedCodeActionHandler (#475, gap closure round 3)', () => {

    test('settled within budget: returns exactly what the provider returned', async () => {
        const actions: CodeAction[] = [{ title: 'Add \'use java.util.HashMap\'', kind: 'quickfix' }];
        const handler = createBoundedCodeActionHandler(depsFor({
            getCodeActions: async () => actions,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBe(actions);
    });

    test('settled within budget, provider returns nothing: resolves to null', async () => {
        const handler = createBoundedCodeActionHandler(depsFor({
            getCodeActions: async () => undefined,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
    });

    test('budget expires before the wait settles: resolves to null promptly, not after the wait', async () => {
        const handler = createBoundedCodeActionHandler(depsFor({
            waitForRequiredState: () => neverSettles(),
            // If the handler ever awaited the abandoned wait instead of the budget, this would
            // throw and fail the assertion below (getCodeActions must never be called).
            getCodeActions: async () => {
                throw new Error('must not be reached — the wait never settled');
            },
        }));
        const start = Date.now();
        const result = await handler(paramsFor(), CancellationToken.None);
        const elapsed = Date.now() - start;
        expect(result).toBeNull();
        // Promptly, in about the budget's own duration — generous upper bound so this stays
        // deterministic on a loaded CI machine while still proving it did not wait indefinitely.
        expect(elapsed).toBeLessThan(TEST_BUDGET_MS + 2000);
    });

    test('a never-settling wait leaves no pending timer holding the process open', async () => {
        // vitest's own process exit is the proof here: if the budget's setTimeout were never
        // cleared, or the abandoned wait were re-awaited, this test (and the whole file) would
        // hang instead of completing. A dedicated per-test timeout makes that failure visible
        // rather than silently stalling the whole run.
        const handler = createBoundedCodeActionHandler(depsFor({
            waitForRequiredState: () => neverSettles(),
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    }, 2000);

    test('an eventual rejection from an abandoned wait never surfaces as an unhandled rejection', async () => {
        let rejectLate: (reason: unknown) => void = () => { /* replaced below */ };
        const lateRejecting = new Promise<unknown>((_resolve, reject) => { rejectLate = reject; });
        const handler = createBoundedCodeActionHandler(depsFor({
            waitForRequiredState: () => lateRejecting,
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
        // The wait was abandoned at the budget; reject it now, well after the handler already
        // returned. If the handler had awaited it a second time, or left it without a catch, this
        // would produce an unhandled rejection (vitest fails the run on one by default).
        rejectLate(new Error('late rejection from an abandoned wait'));
        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    test('document not in the in-memory store: returns null without a getCodeActions call', async () => {
        let getCodeActionsCalled = false;
        const handler = createBoundedCodeActionHandler(depsFor({
            getDocument: () => undefined,
            getCodeActions: async () => {
                getCodeActionsCalled = true;
                return [];
            },
        }));
        const result = await handler(paramsFor(), CancellationToken.None);
        expect(result).toBeNull();
        expect(getCodeActionsCalled).toBe(false);
    });

    test('the state wait rejects: returns null rather than propagating', async () => {
        const handler = createBoundedCodeActionHandler(depsFor({
            waitForRequiredState: async () => { throw new Error('cancelled'); },
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    });

    test('the provider throws: returns null rather than propagating', async () => {
        const handler = createBoundedCodeActionHandler(depsFor({
            getCodeActions: async () => { throw new Error('boom'); },
        }));
        await expect(handler(paramsFor(), CancellationToken.None)).resolves.toBeNull();
    });

    test('the exported budget constant is a positive, non-trivial number of milliseconds', () => {
        expect(CODE_ACTION_BUDGET_MS).toBeGreaterThan(1000);
    });
});
