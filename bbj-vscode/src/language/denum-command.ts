/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/denum` request handler: denumbers the open buffer of a BBj document for both IDEs through
 * the shared language server, so neither IDE carries denumbering logic of its own.
 *
 * The server runs DENUM through bbj-ls, applies the edit itself through a versioned
 * `workspace/applyEdit` and shows the outcome itself. A client therefore only sends the request
 * and reads the result for information; it words nothing and applies nothing. The document is
 * looked up in the open-document store only, never read from disk, and the file on disk is never
 * written: the buffer is left dirty and the editor's own undo restores it.
 *
 * This module is a thin dispatcher in the shape of `compile-command.ts`: plain JSON params and
 * results, one `connection.onRequest` call. The orchestration lives in `bbj-denum-service.ts`.
 */
import type { CancellationToken, Connection, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import type { DenumDiagnosticDto } from './denum-notifications.js';
import { logger } from './logger.js';

/** The LSP custom-request method name for denumbering the open buffer of a document. */
export const DENUM_REQUEST_METHOD = 'bbj/denum';

/** Params for {@link DENUM_REQUEST_METHOD}: the open document to denumber, identified by URI. */
export interface DenumParams {
    uri: string;
}

/**
 * How a `bbj/denum` run ended: the buffer was denumbered, it had no line numbers (nothing to do),
 * or the run failed and the buffer is as it was.
 */
export type DenumStatus = 'denumbered' | 'not-line-numbered' | 'failed';

/**
 * Machine-readable reason for a `failed` {@link DenumResult}. This vocabulary is a client-facing
 * contract: the IntelliJ plugin matches on these strings, so a client never has to string-match
 * prose. Adding a value later is safe; renaming one is not.
 */
export const DENUM_FAILURE_REASONS = [
    'invalid-params',
    'not-open',
    'tokenized',
    'protected-program',
    'mixed-numbering',
    'too-large',
    'timeout',
    'denum-failed',
    'service-unavailable',
    'requires-bbj-26-03',
    'not-reachable',
    'stale',
    'not-applied',
    'in-progress',
    'cancelled',
    'invalid-settings'
] as const;

/** One value of {@link DENUM_FAILURE_REASONS}. */
export type DenumFailureReason = typeof DENUM_FAILURE_REASONS[number];

/**
 * Result of a `bbj/denum` request. Plain JSON. `message` is the text the server already showed
 * the user; a client shows nothing of its own.
 */
export interface DenumResult {
    status: DenumStatus;
    /** Present when `status` is `failed`. */
    reason?: DenumFailureReason;
    /** The message the server showed for this run, when it showed one. */
    message?: string;
    /** Mixed numbering only: the zero-based line, like an LSP position. */
    line?: number;
    /** The document version the text was read at and the edit was computed for. */
    version?: number;
    /** The edit the server applied: one minimal whole-line replacement. */
    edits?: TextEdit[];
    /** DENUM's diagnostics for a successful run, in the order bbj-ls reported them. */
    diagnostics?: DenumDiagnosticDto[];
    /** Whether the client applied the edit. */
    applied?: boolean;
}

/** One `bbj/denum` run: the open document looked up when the run starts, and again when it needs to be checked. */
export interface BBjDenumRequest {
    /** The uri the client named; `undefined` when the params carried none. */
    readonly uri: string | undefined;
    /** The live open buffer for the uri; `undefined` when it is not open. */
    current(): TextDocument | undefined;
}

/**
 * Structural dependencies the handler needs, kept minimal and interface-based so the handler is
 * unit-testable with plain stubs and there is no circular import back to `bbj-module.ts`.
 */
export interface DenumRequestDeps {
    /** The open document at `uri`, from the open-document store only. */
    getTextDocument(uri: URI): TextDocument | undefined;
    /** Runs DENUM for the request; resolves to the result and never rejects. */
    denum: { run(request: BBjDenumRequest, token: CancellationToken): Promise<DenumResult> };
}

/** The uri of a well-formed `bbj/denum` params value, or `undefined` for anything else. */
function uriOf(params: unknown): string | undefined {
    if (typeof params !== 'object' || params === null) {
        return undefined;
    }
    const uri = (params as { uri?: unknown }).uri;
    return typeof uri === 'string' ? uri : undefined;
}

/**
 * Build the `bbj/denum` request handler. It accepts any params value and never throws: a missing,
 * null or malformed value reaches the service as a request without a uri, and an unexpected
 * rejection of the service resolves as a failed run.
 */
export function createDenumHandler(deps: DenumRequestDeps): (params: unknown, token: CancellationToken) => Promise<DenumResult> {
    return async (params: unknown, token: CancellationToken): Promise<DenumResult> => {
        try {
            const uriText = uriOf(params);
            const request: BBjDenumRequest = {
                uri: uriText,
                current: () => {
                    if (uriText === undefined) {
                        return undefined;
                    }
                    try {
                        return deps.getTextDocument(URI.parse(uriText));
                    } catch {
                        return undefined;
                    }
                }
            };
            return await deps.denum.run(request, token);
        } catch (error) {
            logger.debug(`Denumber request failed in the handler (${error instanceof Error ? error.name : 'unknown'})`);
            return { status: 'failed', reason: 'denum-failed' };
        }
    };
}

/** Register `bbj/denum` on the LSP connection. Call once during server startup. */
export function registerDenumRequest(connection: Pick<Connection, 'onRequest'>, deps: DenumRequestDeps): void {
    connection.onRequest(DENUM_REQUEST_METHOD, createDenumHandler(deps));
}
