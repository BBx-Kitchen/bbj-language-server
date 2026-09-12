/**
 * A `textDocument/hover` override that answers instantly for a `bbx-config` document (#650),
 * instead of leaving Langium's own default handler to hold the request open.
 *
 * A `bbx-config` document is filtered out of `BBjDocumentBuilder.update` before Langium's build
 * (`bbj-document-builder.ts`) -- it never becomes a `LangiumDocument`. Langium's default
 * `addHoverHandler` reaches that fact through `createRequestHandler`'s `waitUntilPhase`, which
 * FIRST awaits `WorkspaceManager.ready` before even checking document state -- so a hover on a
 * config document does not fail fast, it waits for the whole workspace's initial build (loading
 * the bundled BBj library documents, connecting to java-interop, etc.) before finally rejecting
 * with "No document found for URI". On a cold server spawn that wait alone measured over 6
 * seconds live, well past the budget the composer cue's own bounded handlers already hold
 * themselves to (`COMPOSER_CODE_LENS_BUDGET_MS`, `CODE_ACTION_BUDGET_MS`) -- the same class of
 * DoS-shaped hang `bbj-code-action-handler.ts` already closed for `textDocument/codeAction`.
 *
 * This module adds no hover logic of its own: a config document gets an immediate `null` (it has
 * no BBj hover content to offer -- the composer cue is its only affordance), and every other
 * document is delegated, completely unchanged, to Langium's own `createRequestHandler` with the
 * exact same default `DocumentState.Linked` gate `addHoverHandler` uses.
 */
import type { Connection, Hover, HoverParams } from 'vscode-languageserver';
import { DocumentState } from 'langium';
import { createRequestHandler, type LangiumSharedServices } from 'langium/lsp';
import { URI } from 'vscode-uri';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from '../composer-lens-contract.js';

/**
 * Register the config-aware `textDocument/hover` handler, overriding Langium's own
 * `addHoverHandler` registration. Call this AFTER `startLanguageServer(shared)` -- the same
 * documented post-start override pattern `main.ts` already relies on for `onCodeAction`/
 * `onCodeLens`.
 */
export function registerConfigAwareHoverHandler(
    connection: Pick<Connection, 'onHover'>,
    shared: LangiumSharedServices,
): void {
    const defaultHandler = createRequestHandler<HoverParams, Hover>(
        (services, document, params, cancelToken) => services.lsp?.HoverProvider?.getHoverContent(document, params, cancelToken),
        shared,
        DocumentState.Linked,
    );
    connection.onHover(async (params, cancelToken) => {
        const uri = URI.parse(params.textDocument.uri);
        if (shared.workspace.TextDocuments?.get(uri)?.languageId === CONFIG_DOCUMENT_LANGUAGE_ID) {
            return null;
        }
        return defaultHandler(params, cancelToken);
    });
}
