/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `workspace/didChangeConfiguration` handler and its BBj settings parsing.
 *
 * Extracted from `main.ts` (#563) so this handler body runs in tests without the module-load
 * connection-factory call `main.ts` makes. This module must never import `main.ts` — a shared
 * module that imports `main.ts` re-runs that connection factory at import time, which is exactly
 * the `bbj-notifications.ts` isolation pattern this module also follows.
 */
import type { Connection, DidChangeConfigurationParams } from 'vscode-languageserver';
import { logger, LogLevel } from './logger.js';
import type { BBjWorkspaceManager } from './bbj-ws-manager.js';
import type { JavaInteropService } from './java-interop.js';
import type { ConfigWatcher } from './config-watcher.js';
import type { ResolvedConfigPathResult } from './resolved-config-path-request.js';

/**
 * Shape of the `bbj` settings section pushed (or pulled) through
 * `workspace/didChangeConfiguration`. Every field is optional — a change event can carry any
 * subset, or none at all.
 */
export interface BbjSettings {
    debug?: unknown;
    diagnostics?: {
        suppressCascading?: boolean;
        maxErrors?: number;
    };
    compiler?: Record<string, unknown> & { trigger?: unknown };
    inlayHints?: {
        parameterNames?: {
            enabled?: unknown;
        };
    };
    configPath?: string;
    formatter?: unknown;
    interop?: {
        host?: unknown;
        port?: unknown;
    };
}

/**
 * Structural dependencies {@link createConfigurationChangeHandler} needs, kept minimal so the
 * handler is unit-testable with plain stubs and there is no circular import back to
 * `bbj-ws-manager.ts`/`java-interop.ts`.
 */
export interface ConfigurationChangeDeps {
    updateConfiguration(change: DidChangeConfigurationParams): void;
    getConfiguration(section: string): Promise<unknown>;
    isWorkspaceInitialized(): boolean;
    wsManager: Pick<BBjWorkspaceManager, 'setConfigPath' | 'getResolvedConfigPath' | 'setCompilerConfig'>;
    javaInterop: Pick<JavaInteropService, 'setConnectionConfig'>;
    configWatcher: Pick<ConfigWatcher, 'updateResolvedPath'>;
    notifyResolvedConfigPath(result: ResolvedConfigPathResult): void;
    reloadJavaClassesAndRevalidate(): Promise<void>;
    refreshInlayHints(): void;
    setLogLevel(level: LogLevel): void;
    setSuppressCascading(enabled: boolean): void;
    setMaxErrors(max: number): void;
    setCompilerTrigger(trigger: 'debounced' | 'on-save' | 'off'): void;
    setParameterHintMode(mode: unknown): void;
    setFormatterSettings(raw: unknown): void;
}

/**
 * Build the `workspace/didChangeConfiguration` handler. The body is carried over verbatim from
 * `main.ts` (#563, behaviour-neutral): same order, same comments, same message texts. Every
 * direct reference the original inline body made becomes a `deps` member.
 */
export function createConfigurationChangeHandler(deps: ConfigurationChangeDeps): (change: DidChangeConfigurationParams) => Promise<void> {
    return async (change: DidChangeConfigurationParams): Promise<void> => {
        // Forward to Langium's ConfigurationProvider so its internals stay in sync
        deps.updateConfiguration(change);

        // Get BBj settings: try push model first, fall back to pull model
        let config = change.settings?.bbj as BbjSettings | undefined;
        if (!config) {
            try {
                config = await deps.getConfiguration('bbj') as BbjSettings | undefined;
            } catch {
                return;
            }
        }
        if (!config) {
            return;
        }

        // Apply debug setting to logger immediately (no startup gate)
        if (config.debug !== undefined) {
            const newLevel = config.debug === true ? LogLevel.DEBUG : LogLevel.WARN;
            deps.setLogLevel(newLevel);
        }

        // Apply diagnostic suppression settings (no startup gate — apply immediately)
        if (config.diagnostics?.suppressCascading !== undefined) {
            deps.setSuppressCascading(config.diagnostics.suppressCascading);
        }
        if (config.diagnostics?.maxErrors !== undefined) {
            deps.setMaxErrors(config.diagnostics.maxErrors);
        }

        // Apply compiler trigger setting (no startup gate — apply immediately)
        if (config.compiler?.trigger !== undefined) {
            const trigger = config.compiler.trigger;
            if (trigger === 'debounced' || trigger === 'on-save' || trigger === 'off') {
                deps.setCompilerTrigger(trigger);
            }
        }

        // Formatter settings apply immediately with no startup gate; the format service
        // normalizes them to the keys bbj-ls accepts.
        if (config.formatter !== undefined) {
            deps.setFormatterSettings(config.formatter);
        }

        // Forward VS Code's full bbj.compiler.* option set to bbj/compile's config source. Merged
        // (never replaced), so this can never erase an IntelliJ-seeded compilerOutputDirectory
        // (#571 — this branch is currently VS Code-only; IntelliJ never delivers config.compiler).
        if (config.compiler !== undefined) {
            deps.wsManager.setCompilerConfig(config.compiler);
        }

        // Apply inlay hint mode (no startup gate — apply immediately) and repaint open editors
        if (config.inlayHints?.parameterNames?.enabled !== undefined) {
            deps.setParameterHintMode(config.inlayHints.parameterNames.enabled);
            deps.refreshInlayHints();
        }

        // Skip Java class reload during initial startup — initializeWorkspace handles it
        if (!deps.isWorkspaceInitialized()) {
            // Still apply non-reload settings
            deps.wsManager.setConfigPath(config.configPath || '');
            // A host may query bbj/resolvedConfigPath even before the workspace build gate opens,
            // so the re-resolved value must be pushed here too, not only after initialization.
            deps.notifyResolvedConfigPath(deps.wsManager.getResolvedConfigPath());
            // Re-arm the watcher on the newly-resolved path. Symmetrical with the post-init site
            // below, even though the watcher has not started yet and this call is a no-op.
            deps.configWatcher.updateResolvedPath(deps.wsManager.getResolvedConfigPath());
            return;
        }

        try {
            // Update configPath in wsManager for PREFIX resolution, then re-push the resolved
            // value so hosts' warm caches self-correct without a second request (no PREFIX/USE
            // reload here — that belongs to a later reload path).
            deps.wsManager.setConfigPath(config.configPath || '');
            deps.notifyResolvedConfigPath(deps.wsManager.getResolvedConfigPath());
            // Re-arm the watcher on the newly-resolved path.
            deps.configWatcher.updateResolvedPath(deps.wsManager.getResolvedConfigPath());

            logger.info('BBj settings changed, refreshing Java classes...');
            // Validation and defaults live in setConnectionConfig itself (interop-config.ts); this
            // call site carries no default of its own.
            deps.javaInterop.setConnectionConfig(config.interop?.host, config.interop?.port);

            await deps.reloadJavaClassesAndRevalidate();
        } catch (error) {
            console.error('Failed to refresh Java classes after settings change:', error);
        }
    };
}

/** Register `workspace/didChangeConfiguration` on the LSP connection. */
export function registerConfigurationChangeHandler(connection: Pick<Connection, 'onDidChangeConfiguration'>, deps: ConfigurationChangeDeps): void {
    connection.onDidChangeConfiguration(createConfigurationChangeHandler(deps));
}
