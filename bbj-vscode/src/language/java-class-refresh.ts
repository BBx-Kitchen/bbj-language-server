/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/refreshJavaClasses` request handler, plus the shared reload-and-revalidate sequence and
 * the inlay-hint refresh helper it (and the configuration-change handler) use.
 *
 * Extracted from `main.ts` (#563) so this handler body runs in tests without the module-load
 * connection-factory call `main.ts` makes. This module must never import `main.ts` — a shared
 * module that imports `main.ts` re-runs that connection factory at import time, which is exactly
 * the `bbj-notifications.ts` isolation pattern this module also follows.
 */
import type { Connection } from 'vscode-languageserver';
import type { JavaInteropService } from './java-interop.js';
import { reloadClasspathAndRecheckDocuments, type JavaClassReloadServices } from './java-class-reload.js';

/** The LSP custom-request method name. */
export const REFRESH_JAVA_CLASSES_METHOD = 'bbj/refreshJavaClasses';

/**
 * Build the inlay-hint refresh function: asks the client to re-request inlay hints, e.g. after
 * Java classes (and the Javadoc-based parameter names they carry) arrived asynchronously. Clients
 * without refresh support just ignore us.
 */
export function createInlayHintRefresher(connection: Pick<Connection, 'languages'>): () => void {
    return () => {
        connection.languages.inlayHint.refresh().catch(() => { /* client does not support refresh */ });
    };
}

/** Structural dependencies {@link createReloadJavaClassesAndRevalidate} needs. */
export interface ReloadJavaClassesDeps {
    javaInterop: Pick<JavaInteropService, 'clearCache'>;
    reloadServices: JavaClassReloadServices;
    refreshInlayHints(): void;
    window: Pick<Connection['window'], 'showInformationMessage'>;
}

/**
 * Build the shared reload-and-revalidate sequence: clears the Java classpath cache, reloads it
 * from the current workspace settings, reloads implicit imports, re-validates every open document
 * by resetting its build state, and notifies the client. Used by both the explicit
 * `bbj/refreshJavaClasses` request handler below and an `onDidChangeConfiguration` settings
 * change that affects the classpath.
 */
export function createReloadJavaClassesAndRevalidate(deps: ReloadJavaClassesDeps): () => Promise<void> {
    return async (): Promise<void> => {
        // Step 1: Clear all cached Java class data (includes disconnecting)
        deps.javaInterop.clearCache();

        // Steps 2-4: reload classpath, reload implicit imports, re-check open documents once.
        await reloadClasspathAndRecheckDocuments(deps.reloadServices);
        deps.refreshInlayHints();

        // Step 5: Send notification
        // A message is a request the client may cancel (LSP4IJ does when the balloon is closed);
        // an unhandled rejection would terminate the server.
        void Promise.resolve(deps.window.showInformationMessage('Java classes refreshed')).catch(() => { /* harmless */ });
    };
}

/** Structural dependencies {@link createRefreshJavaClassesHandler} needs. */
export interface RefreshJavaClassesDeps {
    reloadJavaClassesAndRevalidate(): Promise<void>;
}

/** Build the `bbj/refreshJavaClasses` request handler. */
export function createRefreshJavaClassesHandler(
    connection: Pick<Connection, 'window'>,
    deps: RefreshJavaClassesDeps
): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        try {
            await deps.reloadJavaClassesAndRevalidate();
            return true;
        } catch (error) {
            console.error('Failed to refresh Java classes:', error);
            void Promise.resolve(connection.window.showErrorMessage(`Failed to refresh Java classes: ${error}`)).catch(() => { /* harmless */ });
            return false;
        }
    };
}

/** Register `bbj/refreshJavaClasses` on the LSP connection. Call once during server startup. */
export function registerRefreshJavaClassesRequest(
    connection: Pick<Connection, 'onRequest' | 'window'>,
    deps: RefreshJavaClassesDeps
): void {
    connection.onRequest(REFRESH_JAVA_CLASSES_METHOD, createRefreshJavaClassesHandler(connection, deps));
}
