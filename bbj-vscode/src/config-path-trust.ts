/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The one place the VS Code client decides which `bbj.configPath` it hands the language
 * server (issue #511).
 *
 * `configPath` itself stays un-anchored: a system-wide config file keeps working from a
 * user-level setting (see `language/config-path-resolver.ts`). Only a *workspace-scoped*
 * value is gated here — while the workspace is untrusted, a value set by a cloned
 * repository's `.vscode/settings.json` is ignored, and the client falls back to the
 * user-level value (or the default, `null`). The extension declares no untrusted-workspace
 * support today (no `capabilities` block in `package.json`), so this gate covers the
 * trust-granted transition and any future declaration.
 */
import * as vscode from 'vscode';
import type {
    ConfigurationMiddleware,
    DidChangeConfigurationMiddleware,
} from 'vscode-languageclient/node';

/** The subset of `vscode.WorkspaceConfiguration` these helpers need. */
export interface TrustAwareWorkspaceConfiguration {
    get<T>(key: string, defaultValue?: T): T;
    inspect<T>(key: string): {
        key: string;
        defaultValue?: T;
        globalValue?: T;
        workspaceValue?: T;
        workspaceFolderValue?: T;
    } | undefined;
}

/** The subset of `vscode.workspace` these helpers need, satisfied by `vscode.workspace` itself. */
export interface TrustAwareWorkspace {
    readonly isTrusted: boolean;
    getConfiguration(section?: string): TrustAwareWorkspaceConfiguration;
    onDidGrantWorkspaceTrust(listener: () => unknown): vscode.Disposable;
}

function defaultWorkspace(): TrustAwareWorkspace {
    return vscode.workspace as unknown as TrustAwareWorkspace;
}

/**
 * The effective `bbj.configPath` value the client hands to the server.
 *
 * While `workspace.isTrusted` is not exactly `true` — including a host that reports no trust
 * state at all, which is treated as untrusted (fail closed) — only the user-level
 * (`globalValue`) is used; `workspaceValue` and `workspaceFolderValue` are never read. Once
 * the workspace is trusted, this is `get('configPath', null)`, exactly as before Workspace
 * Trust gating existed.
 */
export function effectiveConfigPath(workspace: TrustAwareWorkspace = defaultWorkspace()): string | null {
    if (workspace.isTrusted !== true) {
        const inspected = workspace.getConfiguration('bbj').inspect<string | null>('configPath');
        return inspected?.globalValue ?? null;
    }
    return workspace.getConfiguration('bbj').get<string | null>('configPath', null);
}

/**
 * A plain JSON copy mirroring vscode-languageclient's own (unexported) `toJSONObject`: own
 * enumerable keys, arrays mapped element-wise, primitives returned as-is. Used so a caller can
 * freely mutate a gated settings payload without ever touching the live VS Code configuration
 * object it was read from.
 *
 * The accumulator for an object value is created with `Object.create(null)` and an own
 * `"__proto__"` key on the source is skipped, not copied by bracket assignment — the input is a
 * workspace-controlled settings section, and a plain object literal's bracket assignment would
 * let a `"__proto__"` key silently redirect the copy's own prototype instead of becoming a
 * literal property. The result stays a plain, JSON-serialisable object either way.
 */
function toPlainJSON(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(toPlainJSON);
    }
    if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = Object.create(null);
        for (const key of Object.keys(value as Record<string, unknown>)) {
            if (key === '__proto__') {
                continue;
            }
            result[key] = toPlainJSON((value as Record<string, unknown>)[key]);
        }
        return result;
    }
    return value;
}

/** Sends a `bbj`-namespaced settings payload to the language server (a `DidChangeConfigurationNotification`). */
export type SendBbjSettings = (settings: Record<string, unknown>) => Promise<void>;

/**
 * A plain JSON copy of the whole `bbj` settings section, with `configPath` replaced by
 * {@link effectiveConfigPath}. This is what every trust-gated handoff of the `bbj` section
 * sends instead of the raw, ungated section VS Code itself would hand over.
 */
export function gatedBbjSettings(workspace: TrustAwareWorkspace = defaultWorkspace()): Record<string, unknown> {
    const section = workspace.getConfiguration().get<Record<string, unknown>>('bbj');
    const copy = toPlainJSON(section ?? {}) as Record<string, unknown>;
    copy.configPath = effectiveConfigPath(workspace);
    return copy;
}

/** The middleware object this module installs at `clientOptions.middleware.workspace`. */
export interface ConfigPathTrustMiddleware {
    didChangeConfiguration: NonNullable<DidChangeConfigurationMiddleware['didChangeConfiguration']>;
    configuration: NonNullable<ConfigurationMiddleware['configuration']>;
}

/**
 * Builds the `middleware.workspace` object that keeps both the `synchronize.configurationSection`
 * push and the `workspace/configuration` pull trust-gated.
 *
 * `didChangeConfiguration` never calls `next()` for an actual section list: vscode-languageclient's
 * own `next` re-reads `vscode.workspace.getConfiguration()` directly and cannot be handed a
 * substituted value, so this middleware builds the payload itself (the gated copy for `bbj`, a
 * plain copy of the live value for any other requested section) and sends it through `send`. A
 * `sections === undefined` call (the library's own "settings: null" case) is passed through to
 * `next` unchanged — there is nothing to gate.
 *
 * `configuration` awaits the real answer from `next` and substitutes `configPath` into any `bbj`
 * item, any `bbj.configPath` item, and any whole-configuration item that itself carries a `bbj`
 * object; a non-array result (an error response) is returned unchanged.
 */
export function createConfigPathTrustMiddleware(
    send: SendBbjSettings,
    workspace: TrustAwareWorkspace = defaultWorkspace()
): ConfigPathTrustMiddleware {
    return {
        didChangeConfiguration: async (sections, next) => {
            if (sections === undefined) {
                await next(sections);
                return;
            }
            const payload: Record<string, unknown> = {};
            for (const name of sections) {
                payload[name] = name === 'bbj'
                    ? gatedBbjSettings(workspace)
                    : toPlainJSON(workspace.getConfiguration().get(name));
            }
            await send(payload);
        },
        configuration: async (params, token, next) => {
            const result = await next(params, token);
            if (!Array.isArray(result)) {
                return result;
            }
            const path = effectiveConfigPath(workspace);
            return result.map((value: unknown, index: number) => {
                const section = params.items[index]?.section;
                if (section === 'bbj' && value !== null && typeof value === 'object') {
                    return { ...(value as Record<string, unknown>), configPath: path };
                }
                if (section === 'bbj.configPath') {
                    return path;
                }
                if (!section && value !== null && typeof value === 'object' && 'bbj' in (value as Record<string, unknown>)) {
                    const whole = value as Record<string, unknown>;
                    const bbj = whole.bbj;
                    if (bbj !== null && typeof bbj === 'object') {
                        return { ...whole, bbj: { ...(bbj as Record<string, unknown>), configPath: path } };
                    }
                }
                return value;
            });
        },
    };
}

/**
 * Subscribes to `workspace.onDidGrantWorkspaceTrust` and, when trust is granted, re-sends the
 * gated `bbj` settings through the same {@link SendBbjSettings} builder the push path uses —
 * so the workspace-scoped `configPath` takes effect without a reload. The server's existing
 * `onDidChangeConfiguration` path re-resolves the config path and re-arms the watcher on its
 * own; this function only has to get the corrected settings there. A rejected `send` is routed
 * to `onError` rather than left as an unhandled rejection inside the event listener.
 */
export function registerTrustGrantRepush(
    send: SendBbjSettings,
    onError: (error: unknown) => void,
    workspace: TrustAwareWorkspace = defaultWorkspace()
): vscode.Disposable {
    return workspace.onDidGrantWorkspaceTrust(() => {
        send({ bbj: gatedBbjSettings(workspace) }).catch(onError);
    });
}
