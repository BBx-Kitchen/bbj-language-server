/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The single owner of "which file is the BBj config file" resolution.
 *
 * Both IDE hosts send the same two raw settings at initialize (a `configPath` string and a
 * BBj home directory). Everything downstream — the `bbj/resolvedConfigPath` request, the
 * pushed notification, and `initializeWorkspace`'s own PREFIX read — asks this module for the
 * answer instead of deriving it locally. `resolveConfigPath` is the ONLY function in the
 * repository that concatenates a BBj home with `cfg` and `config.bbx`; no host and no other
 * server module may reimplement that fallback.
 *
 * Kept free of Langium and editor imports (plain Node `fs`/`os`/`path` only) so it is
 * unit-testable with plain stubs and reusable from both the request handler and
 * `BBjWorkspaceManager`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * The EM Config sentinel value meaning "not configured". Some settings UIs emit this literal
 * two-hyphen string rather than leaving the field blank; it must be treated identically to an
 * unset value everywhere it could otherwise leak into a resolved path or a spawned argv.
 */
export const EM_CONFIG_SENTINEL = '--';

/** Where a resolved config path came from. */
export type ResolvedConfigPathSource = 'setting' | 'default' | 'none';

/** The one shared answer to "which file is the BBj config file". */
export interface ResolvedConfigPath {
    /** Absolute, symlink-resolved, OS-normalized, NFC-normalized path, or `null` if none could be determined. */
    path: string | null;
    /** Where this path came from. */
    source: ResolvedConfigPathSource;
    /** Whether the resolved path exists and is readable. Always `false` when `path` is `null`. */
    exists: boolean;
    /** A message naming the exact path when resolution failed or the file is missing/unreadable, else `null`. */
    problem: string | null;
}

/** Injectable filesystem/home probes, used by tests to avoid touching the real filesystem. */
export interface ConfigPathProbeDeps {
    /** Returns whether `path` exists and is readable. Defaults to a real `fs.accessSync` probe. */
    fileExists?: (path: string) => boolean;
    /** Resolves symlinks for an existing path. Defaults to `fs.realpathSync.native`. */
    realPath?: (path: string) => string;
    /** Returns the current user's home directory. Defaults to `os.homedir`. */
    homeDir?: () => string;
}

function defaultFileExists(candidate: string): boolean {
    try {
        fs.accessSync(candidate, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

function defaultRealPath(candidate: string): string {
    return fs.realpathSync.native(candidate);
}

/**
 * Normalize a raw configured-path setting: `null`/`undefined`, blank, whitespace-only, and the
 * EM Config sentinel all collapse to the empty string (meaning "unset"). This is the central
 * sentinel-neutralization point — host-side guards elsewhere are a second, defensive layer,
 * not the only one.
 */
export function normalizeConfigSetting(raw: string | null | undefined): string {
    if (raw === null || raw === undefined) {
        return '';
    }
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === EM_CONFIG_SENTINEL) {
        return '';
    }
    return trimmed;
}

/**
 * Expand only a LEADING tilde segment (`~` or `~/...`) against the home directory. A tilde
 * appearing anywhere else in the path is left untouched — deliberately NOT `resolveTilde` in
 * `bbj-ws-manager.ts`, which replaces every tilde in the string and would corrupt a path with a
 * tilde in the middle.
 */
export function expandHome(input: string, homeDir: () => string = os.homedir): string {
    if (input === '~') {
        return homeDir();
    }
    if (input.startsWith('~/') || input.startsWith('~\\')) {
        return path.join(homeDir(), input.slice(2));
    }
    return input;
}

/**
 * Canonicalize a path to an absolute, symlink-resolved, `path.normalize`d, NFC-normalized
 * string using OS-native separators. Resolves symlinks through `fs.realpathSync.native` when
 * the path exists; falls back to the plain absolute string when it does not exist or when the
 * probe throws (an unreachable network mount, a permissions error) — never propagates.
 */
export function canonicalizeConfigPath(input: string, deps: ConfigPathProbeDeps = {}): string {
    const fileExists = deps.fileExists ?? defaultFileExists;
    const realPath = deps.realPath ?? defaultRealPath;

    const absolute = path.resolve(input);
    let resolved = absolute;
    if (fileExists(absolute)) {
        try {
            resolved = realPath(absolute);
        } catch {
            resolved = absolute;
        }
    }
    return path.normalize(resolved).normalize('NFC');
}

/**
 * Compare two already-canonical path strings for equality. NFC-normalizes both sides first
 * (defense in depth against a non-canonical caller), then compares exactly on linux and
 * case-folded on `win32`/`darwin`, matching each platform's filesystem semantics.
 */
export function samePath(a: string, b: string): boolean {
    const na = a.normalize('NFC');
    const nb = b.normalize('NFC');
    if (process.platform === 'win32' || process.platform === 'darwin') {
        return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
}

/** Raw inputs to {@link resolveConfigPath}: the two settings both hosts already send at initialize. */
export interface ResolveConfigPathInput {
    configPathSetting: string | null | undefined;
    bbjHome: string | null | undefined;
}

function missingOrUnreadableProblem(resolvedPath: string): string {
    return `Config file not found or unreadable: ${resolvedPath}`;
}

/**
 * Resolve the one shared config path from the two raw settings both hosts already send.
 *
 * Precedence is total and deterministic: a usable explicit setting beats the home default,
 * and the home default beats `none`.
 *
 * - Non-empty setting (after sentinel/blank normalization): expand a leading tilde; if the
 *   result is still not absolute, reject with `path: null` and a `problem` naming the rejected
 *   value — never anchored to a workspace folder or `process.cwd()`. Otherwise canonicalize and
 *   return `source: 'setting'`.
 * - Empty setting, non-empty `bbjHome`: join the expanded, canonicalized home with `cfg` and
 *   `config.bbx` — the ONLY place in the repository this concatenation happens — and return
 *   `source: 'default'`.
 * - Neither: `path: null`, `source: 'none'`, `exists: false`, `problem: null`.
 *
 * `exists`/`problem` are populated from a filesystem probe in every non-`none` branch; a
 * missing or unreadable resolved path never throws, it is reported instead.
 */
export function resolveConfigPath(input: ResolveConfigPathInput, deps: ConfigPathProbeDeps = {}): ResolvedConfigPath {
    const fileExists = deps.fileExists ?? defaultFileExists;
    const homeDir = deps.homeDir ?? os.homedir;

    const normalizedSetting = normalizeConfigSetting(input.configPathSetting);
    if (normalizedSetting !== '') {
        const expanded = expandHome(normalizedSetting, homeDir);
        if (!path.isAbsolute(expanded)) {
            return {
                path: null,
                source: 'setting',
                exists: false,
                problem: `Config path must be absolute (a leading ~ is expanded, but the result must resolve to an absolute path): ${normalizedSetting}`,
            };
        }
        const canonical = canonicalizeConfigPath(expanded, deps);
        const exists = fileExists(canonical);
        return {
            path: canonical,
            source: 'setting',
            exists,
            problem: exists ? null : missingOrUnreadableProblem(canonical),
        };
    }

    const normalizedHome = normalizeConfigSetting(input.bbjHome);
    if (normalizedHome !== '') {
        const expandedHome = expandHome(normalizedHome, homeDir);
        const canonicalHome = canonicalizeConfigPath(expandedHome, deps);
        const defaultPath = canonicalizeConfigPath(path.join(canonicalHome, 'cfg', 'config.bbx'), deps);
        const exists = fileExists(defaultPath);
        return {
            path: defaultPath,
            source: 'default',
            exists,
            problem: exists ? null : missingOrUnreadableProblem(defaultPath),
        };
    }

    return { path: null, source: 'none', exists: false, problem: null };
}
