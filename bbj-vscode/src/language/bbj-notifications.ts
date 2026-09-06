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

import type { Connection } from 'vscode-languageserver';
import { RESOLVED_CONFIG_PATH_METHOD, type ResolvedConfigPathResult } from './resolved-config-path-request.js';
import { CONFIG_RELOAD_METHOD, type ConfigReloadNotification } from './config-reload-notification.js';

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
 * Send a window/showMessage Error notification for Java connection failure.
 * Non-blocking but prominent — helps users understand they need to check
 * the Java service / BBjServices.
 */
export function notifyJavaConnectionError(errorDetail: string): void {
    _connection?.window.showErrorMessage(
        `Failed to connect to the Java interop service. ` +
        `Check that BBj Services is running and the interop host/port settings are correct. ` +
        `(${errorDetail})`
    );
}
