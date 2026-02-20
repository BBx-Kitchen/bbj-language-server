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

/** The LSP connection — set by main.ts via initNotifications(). */
let _connection: Connection | null = null;

/** Deduplication guard: only send notification when the value changes. */
let bbjcplAvailableState: boolean | undefined = undefined;

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
