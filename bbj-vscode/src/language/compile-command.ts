/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `bbj/compile` request handler (#571, PARITY-01): a real, options-aware bbjcpl compile
 * that BOTH IDEs can reach through the shared language server, with no bbjcpl invocation
 * logic duplicated on the IntelliJ side.
 *
 * The domain logic — argv construction, the "explicit output location required" guard,
 * option validation, and the bbjcpl process itself — lives in `compiler-options.ts` and
 * `bbj-cpl-service.ts`. This module is a thin dispatcher that translates the request/
 * response shape, mirroring `composer-commands.ts`'s `bbj/composer/*` registration
 * pattern (one `connection.onRequest` call per method, plain JSON params/results).
 *
 * `bbj/compile` returns its diagnostics to the caller only — it never publishes them via
 * `textDocument/publishDiagnostics`. Editor squiggles stay with the existing background
 * validate-only path (`BBjCPLService.compile`, wired into `bbj-document-builder.ts`); this
 * request must not become a second source of the same diagnostics (D-08).
 */
import type { Connection, Diagnostic } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import type { CompileRun } from './bbj-cpl-service.js';
import {
    buildCompileOptionsFrom,
    lacksExplicitOutputLocation,
    readerFromCompilerConfig,
    validateOptionsFrom,
} from './compiler-options.js';

/** The LSP custom-request method name for an explicit, options-aware compile. */
export const COMPILE_REQUEST_METHOD = 'bbj/compile';

/** Params for {@link COMPILE_REQUEST_METHOD}: the file to compile, identified by URI. */
export interface CompileParams {
    uri: string;
}

/**
 * Machine-readable reason for a non-success {@link CompileResult}. This vocabulary is a
 * client-facing contract (CONTEXT.md D-01/Flagged assumption 1): the IntelliJ plugin (81-05)
 * matches on these strings to pick its balloon text and its "Open Settings" action, so a
 * client never has to string-match prose. Adding a value later is safe; renaming one is not.
 */
export type CompileFailureReason =
    | 'output-directory-required'
    | 'invalid-file-uri'
    | 'invalid-options'
    | 'bbj-home-not-configured'
    | 'bbjcpl-not-found'
    | 'compile-timeout'
    | 'spawn-failed'
    | 'compile-errors'
    | 'bbjcpl-error';

/** Result of a `bbj/compile` request. */
export interface CompileResult {
    success: boolean;
    diagnostics: Diagnostic[];
    reason?: CompileFailureReason;
    message?: string;
    file?: string;
}

/**
 * Structural dependencies the handler needs, kept minimal and interface-based (rather than
 * importing `BBjCPLService`/`BBjWorkspaceManager` concretely) so the handler is unit-testable
 * with plain stubs and there is no circular import back to `bbj-module.ts`.
 */
export interface CompileRequestDeps {
    cplService: {
        compileWithOptions(filePath: string, compilerArgs: string[]): Promise<CompileRun>;
    };
    wsManager: {
        getCompilerConfig(): unknown;
    };
}

/**
 * Build the `bbj/compile` request handler.
 *
 * Order of checks, each refusing before any bbjcpl spawn: the URI must resolve to a `file`
 * scheme (`invalid-file-uri`); the effective compiler options must name either an output
 * directory or validate-only (`output-directory-required`, D-05); the effective options must
 * not conflict (`invalid-options`). Only once all three pass does it call
 * {@link CompileRequestDeps.cplService.compileWithOptions}.
 */
export function createCompileHandler(deps: CompileRequestDeps): (params: CompileParams) => Promise<CompileResult> {
    return async (params: CompileParams): Promise<CompileResult> => {
        const uri = URI.parse(params.uri);
        if (uri.scheme !== 'file') {
            return {
                success: false,
                diagnostics: [],
                reason: 'invalid-file-uri',
                message: `Expected a file:// URI, got: ${params.uri}`,
            };
        }
        const filePath = uri.fsPath;

        const read = readerFromCompilerConfig(deps.wsManager.getCompilerConfig());

        if (lacksExplicitOutputLocation(read)) {
            return {
                success: false,
                diagnostics: [],
                reason: 'output-directory-required',
                message: 'Set the "bbj.compiler.output.directory" setting (or enable validate-only) before compiling.',
                file: filePath,
            };
        }

        const validation = validateOptionsFrom(read);
        if (!validation.isValid) {
            return {
                success: false,
                diagnostics: [],
                reason: 'invalid-options',
                message: validation.errors.join('; '),
                file: filePath,
            };
        }

        const compilerArgs = buildCompileOptionsFrom(read);
        const run = await deps.cplService.compileWithOptions(filePath, compilerArgs);

        if (run.failure) {
            return { success: false, diagnostics: [], reason: run.failure, file: filePath };
        }
        if (run.success) {
            return { success: true, diagnostics: [], file: filePath };
        }
        if (run.diagnostics.length > 0) {
            return { success: false, diagnostics: run.diagnostics, reason: 'compile-errors', file: filePath };
        }
        // Non-empty stderr that parseBbjcplOutput could not turn into diagnostics (an overwrite
        // refusal, an invalid output directory) — a failure carrying the raw text (D-07, D-10).
        return { success: false, diagnostics: [], reason: 'bbjcpl-error', message: run.stderr, file: filePath };
    };
}

/** Register `bbj/compile` on the LSP connection. Call once during server startup. */
export function registerCompileRequest(connection: Pick<Connection, 'onRequest'>, deps: CompileRequestDeps): void {
    connection.onRequest(COMPILE_REQUEST_METHOD, createCompileHandler(deps));
}
