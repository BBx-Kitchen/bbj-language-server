/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * A `textDocument/codeAction` handler that always answers within a named budget (#475, gap
 * closure round 3).
 *
 * Two facts make this necessary, both on the IntelliJ side of the wire:
 *   - IntelliJ evaluates EVERY registered intention's availability for the caret inside ONE
 *     modal, EDT-blocking progress dialog ("Searching for Context Actions...").
 *   - LSP4IJ registers its `LSPIntentionAction0..19` with an EMPTY `<language/>`, so they run in
 *     every `.bbj` file, and their availability check waits on our `textDocument/codeAction`
 *     reply through a NO-TIMEOUT overload — if we never answer, that modal dialog never closes.
 * A language server that can hold a request open indefinitely can therefore freeze an editor's UI
 * thread through a client that is behaving reasonably — the bound has to live on our side.
 *
 * The document-state gate moves to the same one {@link https://github.com/eclipse-langium/langium
 * Langium}'s `addHoverHandler` uses (`DocumentState.Linked`, not the default `addCodeActionHandler`
 * gate of `DocumentState.Validated`): hover answered on the very workspace where code actions
 * never did, on the same build, in the same session (measured live against a shared server).
 *
 * This module follows the same shape `setopts-in-code-request.ts`/`compile-command.ts` established:
 * a named method-free budget constant, a narrow `Deps` interface (no Langium services in its
 * signature, so the unit tests need no services), a `createXHandler(deps)` factory and a
 * `registerXHandler(connection, shared, bbj)` wiring function, registered in `main.ts` AFTER
 * `startLanguageServer(shared)` — the same documented post-start override pattern `main.ts`
 * already relies on for `onDidChangeConfiguration`.
 */
import type { CancellationToken, CodeActionParams, Command, Connection } from 'vscode-languageserver';
import type { CodeAction } from 'vscode-languageserver';
import { DocumentState, type LangiumDocument } from 'langium';
import type { LangiumSharedServices } from 'langium/lsp';
import { URI } from 'vscode-uri';
import type { BBjServices } from './bbj-module.js';

/**
 * The longest an editor's modal action-search may be held by our reply. This is a bound on how
 * long a client can be blocked, not a performance target for a healthy build: 5000ms is
 * comfortably longer than a warm answer on an already-`Validated` document (measured 205ms
 * against the shared server), and far shorter than a human's tolerance for a frozen dialog (a live
 * probe measured a real 56016ms hang on an unsettled workspace, and an unsettled build can
 * otherwise wait forever).
 */
export const CODE_ACTION_BUDGET_MS = 5000;

/**
 * Structural dependencies the handler needs, kept minimal and interface-based (mirroring
 * `setopts-in-code-request.ts`'s `SetOptsInCodeDeps` convention) so the handler is unit-testable
 * with plain stubs — no LSP connection, no Langium services, no real document build.
 */
export interface CodeActionHandlerDeps {
    /** Waits for the document at `uri` to reach the handler's required document state. */
    waitForRequiredState(uri: URI, cancelToken: CancellationToken): Promise<unknown>;
    /** Resolves the document from the in-memory store only — never a filesystem load. */
    getDocument(uri: URI): LangiumDocument | undefined;
    /** Asks the language-specific provider for code actions on the resolved document. */
    getCodeActions(document: LangiumDocument, params: CodeActionParams): Promise<Array<Command | CodeAction> | undefined>;
    /** Test-only override of {@link CODE_ACTION_BUDGET_MS}. */
    budgetMs?: number;
}

/** The two ways the state wait can be known to have finished before the budget did. */
type WaitOutcome = 'settled' | 'failed';

/**
 * Build the bounded `textDocument/codeAction` handler.
 *
 * Races the state wait against the budget. On budget expiry it resolves with `null` and abandons
 * the wait — the wait's own promise is immediately reshaped into one that can never reject (a
 * settle maps to `'settled'`, any rejection maps to `'failed'`), so whichever outcome the caller
 * actually uses, the original promise can never surface as an unhandled rejection later. The
 * timer is always cleared, on every path. On settle it resolves the document from the in-memory
 * store, returns `null` if absent, and otherwise returns the provider's result or `null`. Every
 * failure path returns `null`; nothing throws out of this handler.
 */
export function createBoundedCodeActionHandler(
    deps: CodeActionHandlerDeps,
): (params: CodeActionParams, cancelToken: CancellationToken) => Promise<Array<Command | CodeAction> | null> {
    return async (params: CodeActionParams, cancelToken: CancellationToken): Promise<Array<Command | CodeAction> | null> => {
        const uri = URI.parse(params.textDocument.uri);
        const budgetMs = deps.budgetMs ?? CODE_ACTION_BUDGET_MS;

        let timer: ReturnType<typeof setTimeout> | undefined;
        const budgetExpired = new Promise<'timeout'>((resolve) => {
            timer = setTimeout(() => resolve('timeout'), budgetMs);
        });

        // Reshape the wait into a promise that never rejects, so it is safe to abandon after the
        // budget wins the race — an eventual rejection is swallowed here, not left pending.
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
            const result = await deps.getCodeActions(document, params);
            return result ?? null;
        } catch {
            return null;
        }
    };
}

/**
 * Register the bounded `textDocument/codeAction` handler on the LSP connection, overriding
 * Langium's own `addCodeActionHandler` registration. Call this AFTER `startLanguageServer(shared)`
 * — re-registering after start is the documented pattern `main.ts` already depends on for
 * `onDidChangeConfiguration`; if this ever stopped overriding Langium's default handler, that
 * existing override would be invalidated too, so a change in that behaviour must be reported as a
 * blocking finding rather than worked around.
 *
 * The state wait binds to `DocumentState.Linked` — the SAME document state Langium gates hover at
 * — deliberately widening it from the `addCodeActionHandler` default of `DocumentState.Validated`.
 */
export function registerBoundedCodeActionHandler(
    connection: Pick<Connection, 'onCodeAction'>,
    shared: LangiumSharedServices,
    bbj: BBjServices,
): void {
    const deps: CodeActionHandlerDeps = {
        waitForRequiredState: (uri, cancelToken) =>
            shared.workspace.DocumentBuilder.waitUntil(DocumentState.Linked, uri, cancelToken),
        getDocument: (uri) => shared.workspace.LangiumDocuments.getDocument(uri),
        getCodeActions: (document, params) => {
            const provider = bbj.lsp.CodeActionProvider;
            if (!provider) {
                return Promise.resolve(undefined);
            }
            return Promise.resolve(provider.getCodeActions(document, params));
        },
    };
    connection.onCodeAction(createBoundedCodeActionHandler(deps));
}
