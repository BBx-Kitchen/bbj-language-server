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

/** The subset of `vscode.WorkspaceConfiguration` these helpers need. */
export interface TrustAwareWorkspaceConfiguration {
    get<T>(key: string, defaultValue: T): T;
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
