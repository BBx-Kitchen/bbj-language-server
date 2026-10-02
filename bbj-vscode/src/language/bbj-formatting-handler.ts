/**
 * `textDocument/formatting` and `textDocument/rangeFormatting` handlers that answer from the open
 * buffer only.
 *
 * Langium's default formatting handler holds every request until the whole workspace has loaded and
 * resolves the document through a lookup that can read a client-supplied uri from disk. A format
 * request, which often arrives on save, must not wait for either. These handlers look the document
 * up in the open-document store, answer `[]` for anything that is not an open BBj document, and hand
 * the rest to the format service.
 *
 * The shape follows `composer-codelens-handler.ts`: a narrow deps interface, a `createX(deps)`
 * factory and a `registerX(connection, shared, bbj)` wiring function that `main.ts` calls AFTER
 * `startLanguageServer(shared)`, so it replaces Langium's own registration.
 */
import type {
    CancellationToken, Connection, DocumentFormattingParams, DocumentRangeFormattingParams, Range, TextEdit
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { LangiumSharedServices } from 'langium/lsp';
import { URI } from 'vscode-uri';
import type { BBjServices } from './bbj-module.js';
import type { BBjFormatRequest } from './bbj-format-service.js';
import { BBjLanguageMetaData } from './generated/module.js';
import { logger } from './logger.js';

/**
 * Structural dependencies of the handlers, so they can be tested with plain stubs: no connection,
 * no Langium services, no document build.
 */
export interface FormattingHandlerDeps {
    /** The open document at `uri`, from the open-document store only. */
    getTextDocument(uri: URI): TextDocument | undefined;
    /** Formats the request; resolves to the edits to apply. */
    format(request: BBjFormatRequest, token: CancellationToken): Promise<TextEdit[]>;
}

/**
 * Answers a format request for the document at `uriText`. A document that is not open, or whose
 * language is not BBj, gives `[]` before the format service is reached, so the text of a config
 * document or of any other language never leaves the server. The language check is a positive
 * allow-list: a language added later is excluded until it is deliberately allowed.
 */
async function formatOpenDocument(
    deps: FormattingHandlerDeps,
    uriText: string,
    range: Range | undefined,
    token: CancellationToken
): Promise<TextEdit[]> {
    try {
        const uri = URI.parse(uriText);
        const document = deps.getTextDocument(uri);
        if (document === undefined || document.languageId !== BBjLanguageMetaData.languageId) {
            return [];
        }
        const request: BBjFormatRequest = {
            document,
            ...(range === undefined ? {} : { range }),
            current: () => deps.getTextDocument(uri)
        };
        return await deps.format(request, token);
    } catch (error) {
        logger.debug(`Format request failed in the handler (${error instanceof Error ? error.name : 'unknown'})`);
        return [];
    }
}

/** The bounded `textDocument/formatting` handler. Nothing thrown inside it escapes. */
export function createBoundedDocumentFormattingHandler(
    deps: FormattingHandlerDeps
): (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]> {
    return (params, token) => formatOpenDocument(deps, params.textDocument.uri, undefined, token);
}

/**
 * The bounded `textDocument/rangeFormatting` handler, with the same gates as the whole-document
 * one. The selection travels with the request; which statements it snaps to is decided by bbj-ls.
 */
export function createBoundedRangeFormattingHandler(
    deps: FormattingHandlerDeps
): (params: DocumentRangeFormattingParams, token: CancellationToken) => Promise<TextEdit[]> {
    return (params, token) => formatOpenDocument(deps, params.textDocument.uri, params.range, token);
}

/**
 * Registers the bounded formatting handlers on the connection, overriding Langium's own
 * registrations. Call this AFTER `startLanguageServer(shared)`.
 */
export function registerBoundedFormattingHandler(
    connection: Pick<Connection, 'onDocumentFormatting' | 'onDocumentRangeFormatting'>,
    shared: LangiumSharedServices,
    bbj: BBjServices
): void {
    const deps: FormattingHandlerDeps = {
        getTextDocument: (uri) => shared.workspace.TextDocuments?.get(uri),
        format: (request, token) => bbj.compiler.BBjFormatService.format(request, token)
    };
    connection.onDocumentFormatting(createBoundedDocumentFormattingHandler(deps));
    connection.onDocumentRangeFormatting(createBoundedRangeFormattingHandler(deps));
}
