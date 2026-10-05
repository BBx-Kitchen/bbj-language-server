/**
 * BBj LSP notification helpers.
 *
 * This module holds a lightweight notification sender that can be imported
 * by any language server file (including bbj-document-builder.ts) without
 * pulling in the full main.ts entry point (which calls createConnection()
 * at module load time and would break test environments).
 *
 * main.ts calls initNotifications(connection) once at startup to wire the
 * connection. Before that call, notifyBbjcplAvailability() is a no-op.
 */

import type { Connection, TextEdit } from 'vscode-languageserver';
import { RESOLVED_CONFIG_PATH_METHOD, type ResolvedConfigPathResult } from './resolved-config-path-request.js';
import { CONFIG_RELOAD_METHOD, type ConfigReloadNotification } from './config-reload-notification.js';
import { OPEN_FORMATTER_SETTINGS_METHOD, type OpenFormatterSettingsParams } from './format-settings-notification.js';
import {
    DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD, type DenumDiagnosticsParams
} from './denum-notifications.js';

/** The LSP connection — set by main.ts via initNotifications(). */
let _connection: Connection | null = null;

/** Deduplication guard: only send notification when the value changes. */
let bbjcplAvailableState: boolean | undefined = undefined;

/** Deduplication guard: only send the resolved-config-path notification when the value changes. */
let resolvedConfigPathState: string | undefined = undefined;

/**
 * Initialize the notification module with the LSP connection.
 * Must be called once by main.ts before any notifications are sent.
 */
export function initNotifications(connection: Connection): void {
    _connection = connection;
}

/**
 * Send a bbj/bbjcplAvailability notification to the client.
 * Deduplicates — only sends when the available state changes.
 * No-op if the connection has not been initialized yet.
 */
export function notifyBbjcplAvailability(available: boolean): void {
    if (bbjcplAvailableState !== available) {
        bbjcplAvailableState = available;
        _connection?.sendNotification('bbj/bbjcplAvailability', { available });
    }
}

/**
 * Send a `bbj/resolvedConfigPath` notification to the client — the same method name and
 * payload shape as the `bbj/resolvedConfigPath` request's result, so a host can hook one
 * message for both the initial answer and every later change. Deduplicates by comparing the
 * serialized payload — only sends when the resolved value actually changes. No-op if the
 * connection has not been initialized yet.
 */
export function notifyResolvedConfigPath(result: ResolvedConfigPathResult): void {
    const serialized = JSON.stringify(result);
    if (resolvedConfigPathState !== serialized) {
        resolvedConfigPathState = serialized;
        _connection?.sendNotification(RESOLVED_CONFIG_PATH_METHOD, result);
    }
}

/**
 * Send a `bbj/configReloadRequired` notification to the client. Deliberately NOT deduplicated,
 * unlike `notifyResolvedConfigPath` — every call is a discrete reload event (the config content
 * the server consumes actually changed since the last-seen snapshot), not an idempotent state
 * push, so the caller (the relevance gate in `config-watcher.ts`) is the one place that decides
 * whether to call this at all. No-op if the connection has not been initialized yet.
 */
export function notifyConfigReloadRequired(params: ConfigReloadNotification): void {
    _connection?.sendNotification(CONFIG_RELOAD_METHOD, params);
}

/**
 * Mark a `window/showMessageRequest` promise as handled. Every `window.show*Message` call is a
 * request, even without action buttons, and a client may answer it with an error: LSP4IJ cancels
 * the request when the user closes the balloon. Left unhandled, that rejection terminates the
 * language server process.
 */
function ignoreMessageRejection(pending: unknown): void {
    void Promise.resolve(pending).catch(() => { /* a dismissed or cancelled message is harmless */ });
}

/**
 * Show a plain Warning message for a formatting problem. Fire and forget: nothing waits for the
 * user. No-op if the connection has not been initialized yet.
 */
export function showFormatterWarning(text: string): void {
    try {
        ignoreMessageRejection(_connection?.window.showWarningMessage(text));
    } catch {
        // A notification that cannot be sent must never break a format request.
    }
}

/**
 * Show a plain Information message. Fire and forget: nothing waits for the user. No-op if the
 * connection has not been initialized yet.
 */
export function showInformation(text: string): void {
    try {
        ignoreMessageRejection(_connection?.window.showInformationMessage(text));
    } catch {
        // A notification that cannot be sent must never break a request.
    }
}

/** How long a client gets to answer a `workspace/applyEdit` request before the edit counts as not applied. */
export const APPLY_EDIT_TIMEOUT_MS = 30_000;

/**
 * Resolves to `promise`'s value, or to `false` once `ms` have passed or `promise` rejects. Never
 * rejects, and leaves no timer behind once `promise` has settled.
 */
function withDeadline(promise: Promise<boolean>, ms: number): Promise<boolean> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), ms);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            () => { clearTimeout(timer); resolve(false); }
        );
    });
}

/**
 * Ask the client to apply `edits` to the open document `uri` as one undoable change, and resolve to
 * whether it did. The edit names the document `version` it was computed for in `documentChanges`,
 * which is where a client checks it: a client that sees another version refuses it. Resolves to
 * `false` when the connection is not initialized, the client refuses, the request fails, or the
 * client does not answer within {@link APPLY_EDIT_TIMEOUT_MS}. Never rejects.
 */
export function applyDocumentEdit(
    params: { uri: string; version: number; edits: TextEdit[]; label: string }
): Promise<boolean> {
    const connection = _connection;
    if (!connection) {
        return Promise.resolve(false);
    }
    const apply = async (): Promise<boolean> => {
        try {
            const response = await connection.workspace.applyEdit({
                label: params.label,
                edit: {
                    documentChanges: [{
                        textDocument: { uri: params.uri, version: params.version },
                        edits: params.edits
                    }]
                }
            });
            return response?.applied === true;
        } catch {
            return false;
        }
    };
    return withDeadline(apply(), APPLY_EDIT_TIMEOUT_MS);
}

/**
 * Show a Warning message with one action button and resolve to the title of the picked action, or
 * `undefined` when the user dismissed it, the connection is not initialized or the prompt failed.
 * Never rejects. Callers start it without awaiting it inside a request, so a format response never
 * waits for a click.
 */
export function showFormatterWarningWithAction(text: string, actionTitle: string): Promise<string | undefined> {
    const connection = _connection;
    if (!connection) {
        return Promise.resolve(undefined);
    }
    const prompt = async (): Promise<string | undefined> => {
        try {
            const picked = await connection.window.showWarningMessage(text, { title: actionTitle });
            return picked?.title;
        } catch {
            return undefined;
        }
    };
    return prompt();
}

/**
 * Show a Warning message with one button per entry of `actionTitles` and resolve to the title of the
 * picked action, or `undefined` when the user dismissed it, the connection is not initialized or the
 * prompt failed. Never rejects. Callers start it without awaiting it inside a request, so a format
 * response never waits for a click.
 */
export function showWarningWithActions(text: string, actionTitles: readonly string[]): Promise<string | undefined> {
    const connection = _connection;
    if (!connection) {
        return Promise.resolve(undefined);
    }
    const prompt = async (): Promise<string | undefined> => {
        try {
            const picked = await connection.window.showWarningMessage(text, ...actionTitles.map(title => ({ title })));
            return picked?.title;
        } catch {
            return undefined;
        }
    };
    return prompt();
}

/**
 * Show an Information message with one action button and resolve to the title of the picked action,
 * or `undefined` when the user dismissed it, the connection is not initialized or the prompt failed.
 * Never rejects. Callers start it without awaiting it, so a request never waits for a click.
 */
export function showInformationWithAction(text: string, actionTitle: string): Promise<string | undefined> {
    const connection = _connection;
    if (!connection) {
        return Promise.resolve(undefined);
    }
    const prompt = async (): Promise<string | undefined> => {
        try {
            const picked = await connection.window.showInformationMessage(text, { title: actionTitle });
            return picked?.title;
        } catch {
            return undefined;
        }
    };
    return prompt();
}

/**
 * Ask the client to show `uri` with the cursor at the start of the zero-based `line`. The caller
 * passes a document it already owns and a line inside it; nothing here validates either. Fire and
 * forget: a failed request is ignored. No-op if the connection has not been initialized yet.
 */
export function showFormatterDocument(uri: string, line: number): void {
    try {
        const position = { line, character: 0 };
        const pending = _connection?.window.showDocument({
            uri,
            takeFocus: true,
            selection: { start: position, end: position }
        });
        void Promise.resolve(pending).catch(() => { /* a refused or failed jump is harmless */ });
    } catch {
        // A request that cannot be sent must never break anything.
    }
}

/**
 * Send a `bbj/openFormatterSettings` notification to the client, asking it to open its formatter
 * settings. The payload holds setting names only. No-op if the connection has not been initialized.
 */
export function notifyOpenFormatterSettings(params: OpenFormatterSettingsParams): void {
    try {
        const pending = _connection?.sendNotification(OPEN_FORMATTER_SETTINGS_METHOD, params);
        void Promise.resolve(pending).catch(() => { /* the client may not handle it */ });
    } catch {
        // A notification that cannot be sent must never break anything.
    }
}

/**
 * Send a `bbj/denumDiagnostics` notification: the list of diagnostics a successful DENUM run
 * reported for one document. Not deduplicated: every call is one finished run. No-op if the
 * connection has not been initialized yet.
 */
export function notifyDenumDiagnostics(params: DenumDiagnosticsParams): void {
    try {
        const pending = _connection?.sendNotification(DENUM_DIAGNOSTICS_METHOD, params);
        void Promise.resolve(pending).catch(() => { /* the client may not handle it */ });
    } catch {
        // A notification that cannot be sent must never break a DENUM run.
    }
}

/**
 * Send a `bbj/showDenumDiagnostics` notification, asking the client to reveal the list it already
 * holds. It carries no payload. No-op if the connection has not been initialized yet.
 */
export function notifyShowDenumDiagnostics(): void {
    try {
        const pending = _connection?.sendNotification(SHOW_DENUM_DIAGNOSTICS_METHOD);
        void Promise.resolve(pending).catch(() => { /* the client may not handle it */ });
    } catch {
        // A notification that cannot be sent must never break anything.
    }
}

/**
 * Send a window/showMessage Error notification for Java connection failure.
 * Non-blocking but prominent — helps users understand they need to check
 * the Java service / BBjServices.
 */
export function notifyJavaConnectionError(errorDetail: string): void {
    ignoreMessageRejection(_connection?.window.showErrorMessage(
        `Failed to connect to the Java interop service. ` +
        `Check that BBj Services is running and the interop host/port settings are correct. ` +
        `(${errorDetail})`
    ));
}
