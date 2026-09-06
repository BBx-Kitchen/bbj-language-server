/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The VS Code host's warm cache for the one shared resolved config path (#485).
 *
 * The language server is the single owner of "which file is the BBj config file"
 * resolution (see `./language/config-path-resolver.ts`). This module holds the last
 * pushed `bbj/resolvedConfigPath` payload and answers every other VS Code consumer's
 * "is this document the config file" question through it — nothing here re-derives the
 * home-default fallback itself. Before the server has answered, the only fallback is the
 * explicit `bbj.configPath` setting, read verbatim; with neither, there is no answer.
 */
import * as vscode from 'vscode';
import {
    canonicalizeConfigPath,
    expandHome,
    normalizeConfigSetting,
    samePath,
} from './language/config-path-resolver.js';
import type { ResolvedConfigPathResult } from './language/resolved-config-path-request.js';

let cachedResult: ResolvedConfigPathResult | undefined;
const warnedPaths = new Set<string>();

/** Store the last pushed `bbj/resolvedConfigPath` payload. Call from the notification handler. */
export function setResolvedConfigPath(result: ResolvedConfigPathResult): void {
    cachedResult = result;
}

/** The last pushed payload, or `undefined` when the server has not answered yet. */
export function getResolvedConfigPath(): ResolvedConfigPathResult | undefined {
    return cachedResult;
}

/**
 * The active config path from the host's point of view.
 *
 * - A pushed payload with a non-null `path` wins.
 * - A pushed payload with a `null` path clears the cache back to the explicit-setting-only
 *   fallback below (the server determined there is no usable path either).
 * - With no push yet, the explicit `bbj.configPath` workspace setting is used verbatim
 *   (canonicalized) — never a derived home default.
 * - With neither, `undefined`.
 */
export function getActiveConfigPath(): string | undefined {
    if (cachedResult) {
        return cachedResult.path ?? explicitSettingPath();
    }
    return explicitSettingPath();
}

function explicitSettingPath(): string | undefined {
    const raw = vscode.workspace.getConfiguration('bbj').get<string | null>('configPath', null);
    const normalized = normalizeConfigSetting(raw);
    if (normalized === '') {
        return undefined;
    }
    return canonicalizeConfigPath(expandHome(normalized));
}

/** Whether `fsPath` (an arbitrary open document's path) is the active config file. */
export function isActiveConfigPath(fsPath: string): boolean {
    const active = getActiveConfigPath();
    if (!active) {
        return false;
    }
    return samePath(canonicalizeConfigPath(fsPath), active);
}

/** True the first time called for `key`, false on every repeat — backs a once-per-session warning. */
export function shouldWarnOnce(key: string): boolean {
    if (warnedPaths.has(key)) {
        return false;
    }
    warnedPaths.add(key);
    return true;
}

/** Reset all module state. Test-only — production code never calls this. */
export function resetConfigPathCacheForTests(): void {
    cachedResult = undefined;
    warnedPaths.clear();
}
