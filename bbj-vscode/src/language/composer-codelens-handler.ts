/**
 * A `textDocument/codeLens` handler that always answers within a named budget, gated at
 * `DocumentState.Parsed` instead of Langium's default `addCodeLensHandler` gate (#650).
 *
 * Two reasons this override exists, mirroring `bbj-code-action-handler.ts`'s pattern:
 *   - The composer cue needs only text and CST, so waiting on linking — Langium's default
 *     `IndexedReferences` gate — would delay cues by the cold linking time a live probe measured
 *     in tens of seconds, when the provider itself never touches anything beyond `Parsed`.
 *   - Langium's default handler resolves documents via `getOrCreateDocument`, which loads a
 *     client-supplied uri from disk. This handler resolves in-memory only, via
 *     `LangiumDocuments.getDocument`.
 *
 * This module follows the same shape `bbj-code-action-handler.ts` established: a named
 * budget constant, a narrow `Deps` interface with no Langium types beyond what is strictly
 * needed, a `createX(deps)` factory and a `registerX(connection, shared, bbj)` wiring function,
 * registered in `main.ts` AFTER `startLanguageServer(shared)` to override Langium's default
 * registration.
 */
import type { CancellationToken, CodeLens, CodeLensParams, Connection } from 'vscode-languageserver';
import { DocumentState, type LangiumDocument } from 'langium';
import type { LangiumSharedServices } from 'langium/lsp';
import { URI } from 'vscode-uri';
import type { BBjServices } from './bbj-module.js';

/**
 * The longest a client's `textDocument/codeLens` request can be held by our reply. This is a
 * bound on how long a client can be blocked, not a performance target for a healthy build.
 */
export const COMPOSER_CODE_LENS_BUDGET_MS = 5000;

/**
 * Structural dependencies the handler needs, kept minimal and interface-based so the handler is
 * unit-testable with plain stubs — no LSP connection, no Langium services, no real document build.
 */
export interface ComposerCodeLensHandlerDeps {
    /** Waits for the document at `uri` to reach the handler's required document state. */
    waitForRequiredState(uri: URI, cancelToken: CancellationToken): Promise<unknown>;
    /** Resolves the document from the in-memory store only — never a filesystem load. */
    getDocument(uri: URI): LangiumDocument | undefined;
    /** Asks the language-specific provider for cues on the resolved document. */
    getCodeLenses(document: LangiumDocument, params: CodeLensParams, cancelToken: CancellationToken): Promise<CodeLens[] | undefined>;
    /** Test-only override of {@link COMPOSER_CODE_LENS_BUDGET_MS}. */
    budgetMs?: number;
}

/** The two ways the state wait can be known to have finished before the budget did. */
type WaitOutcome = 'settled' | 'failed';

/**
 * Build the bounded `textDocument/codeLens` handler.
 *
 * Races the state wait against the budget. On budget expiry it resolves with `null` and abandons
 * the wait — the wait's own promise is immediately reshaped into one that can never reject (a
 * settle maps to `'settled'`, any rejection maps to `'failed'`), so an eventual rejection from the
 * abandoned wait never surfaces later as an unhandled rejection. The timer is always cleared, on
 * every path. On settle it resolves the document from the in-memory store, returns `null` if
 * absent, and otherwise returns the provider's result or `null`. Every failure path returns
 * `null`; nothing throws out of this handler.
 */
export function createBoundedComposerCodeLensHandler(
    deps: ComposerCodeLensHandlerDeps,
): (params: CodeLensParams, cancelToken: CancellationToken) => Promise<CodeLens[] | null> {
    return async (params: CodeLensParams, cancelToken: CancellationToken): Promise<CodeLens[] | null> => {
        const uri = URI.parse(params.textDocument.uri);
        const budgetMs = deps.budgetMs ?? COMPOSER_CODE_LENS_BUDGET_MS;

        let timer: ReturnType<typeof setTimeout> | undefined;
        const budgetExpired = new Promise<'timeout'>((resolve) => {
            timer = setTimeout(() => resolve('timeout'), budgetMs);
        });

        const waitOutcome: Promise<WaitOutcome> = deps.waitForRequiredState(uri, cancelToken)
            .then((): WaitOutcome => 'settled')
            .catch((): WaitOutcome => 'failed');

        const outcome = await Promise.race([waitOutcome, budgetExpired]);
        if (timer !== undefined) {
            clearTimeout(timer);
        }

        if (outcome !== 'settled') {
            return null;
        }

        const document = deps.getDocument(uri);
        if (!document) {
            return null;
        }

        try {
            const result = await deps.getCodeLenses(document, params, cancelToken);
            return result ?? null;
        } catch {
            return null;
        }
    };
}

/**
 * Register the bounded `textDocument/codeLens` handler on the LSP connection, overriding
 * Langium's own `addCodeLensHandler` registration. Call this AFTER `startLanguageServer(shared)`
 * — re-registering after start is the documented pattern `main.ts` already depends on for
 * `onCodeAction`/`onDidChangeConfiguration`.
 *
 * The state wait binds to `DocumentState.Parsed` — the cue only needs text and CST, not linking
 * or validation — deliberately narrowing it from the `addCodeLensHandler` default of
 * `DocumentState.IndexedReferences`.
 */
export function registerComposerCodeLensHandler(
    connection: Pick<Connection, 'onCodeLens'>,
    shared: LangiumSharedServices,
    bbj: BBjServices,
): void {
    const deps: ComposerCodeLensHandlerDeps = {
        waitForRequiredState: (uri, cancelToken) =>
            shared.workspace.DocumentBuilder.waitUntil(DocumentState.Parsed, uri, cancelToken),
        getDocument: (uri) => shared.workspace.LangiumDocuments.getDocument(uri),
        getCodeLenses: (document, params, cancelToken) => {
            const provider = bbj.lsp.CodeLensProvider;
            if (!provider) {
                return Promise.resolve(undefined);
            }
            return Promise.resolve(provider.provideCodeLens(document, params, cancelToken));
        },
    };
    connection.onCodeLens(createBoundedComposerCodeLensHandler(deps));
}
