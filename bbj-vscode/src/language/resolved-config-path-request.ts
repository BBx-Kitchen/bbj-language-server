/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/resolvedConfigPath` request handler: an on-demand read of the one shared config path,
 * for a host that needs the answer before (or independent of) the server's pushed notification
 * — hosts may query even before the workspace build gate.
 *
 * Mirrors `compile-command.ts`'s shape exactly: a constant method name, plain-JSON params/
 * result, a `Deps` interface for testability, a thin `createXHandler(deps)` dispatcher with no
 * resolution logic of its own, and a `registerXRequest(connection, deps)` wiring function. Kept
 * free of Langium and editor imports so tests can drive it with a stub.
 *
 * The result shape is identical to what `notifyResolvedConfigPath` pushes under the same method
 * name, so a later "changed" push and this request's answer are interchangeable for a consumer.
 */
import type { Connection } from 'vscode-languageserver';
import type { ResolvedConfigPath } from './config-path-resolver.js';

/** The LSP custom-request (and notification) method name. */
export const RESOLVED_CONFIG_PATH_METHOD = 'bbj/resolvedConfigPath';

/**
 * Result of a `bbj/resolvedConfigPath` request — a plain-JSON mirror of {@link ResolvedConfigPath}
 * with exactly the same four fields, kept as its own named type so this module has no import
 * coupling beyond the resolver's type.
 */
export type ResolvedConfigPathResult = ResolvedConfigPath;

/**
 * Structural dependency the handler needs, kept minimal and interface-based so the handler is
 * unit-testable with a plain stub and there is no circular import back to `bbj-ws-manager.ts`.
 */
export interface ResolvedConfigPathDeps {
    wsManager: {
        getResolvedConfigPath(): ResolvedConfigPathResult;
    };
}

/**
 * Build the `bbj/resolvedConfigPath` request handler. A thin dispatcher — it returns exactly
 * what `deps.wsManager.getResolvedConfigPath()` returned, with no resolution logic of its own.
 */
export function createResolvedConfigPathHandler(deps: ResolvedConfigPathDeps): () => Promise<ResolvedConfigPathResult> {
    return async (): Promise<ResolvedConfigPathResult> => {
        return deps.wsManager.getResolvedConfigPath();
    };
}

/** Register `bbj/resolvedConfigPath` on the LSP connection. Call once during server startup. */
export function registerResolvedConfigPathRequest(connection: Pick<Connection, 'onRequest'>, deps: ResolvedConfigPathDeps): void {
    connection.onRequest(RESOLVED_CONFIG_PATH_METHOD, createResolvedConfigPathHandler(deps));
}
