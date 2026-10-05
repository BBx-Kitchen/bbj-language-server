/******************************************************************************
 * Copyright 2026 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Loads the real `Commands.cjs` (issue #565) under Vitest, through `node:module`'s
 * `registerHooks` resolve/load hooks.
 *
 * `Commands.cjs` is resolved by Node's native loader, so `vi.mock('vscode')` never
 * reaches its `require` calls (see the doc comments in
 * `no-shell-command-construction.test.ts` and `config-path-consumers.test.ts` for the
 * same, now-superseded, constraint). This harness registers one resolve/load pair
 * that shims the `vscode` specifier everywhere, and `Commands.cjs`'s own
 * `./process-runner` require specifically, and widens Node's default extensionless
 * and `.js`-suffixed relative-specifier resolution to fall back to `.ts` — letting
 * `Commands.cjs`'s real body, and its own `.ts` dependencies, load and run for real.
 *
 * The fakes here are `vi.fn()` observable stand-ins only; nothing in them
 * reimplements `Commands.cjs`'s own control flow. `../src/config-path-cache.ts` is
 * required through the same native `require` `Commands.cjs` uses, so a test that
 * calls `setResolvedConfigPath` on the returned `configPathCache` changes exactly
 * what `Commands.cjs` reads.
 */

import { createRequire, registerHooks, type ResolveHookSync, type LoadHookSync } from 'module';
import * as path from 'path';
import { pathToFileURL } from 'url';
import type { ExecFileOptions } from 'child_process';
import { vi, type Mock } from 'vitest';
import { formatArgvForLog as realFormatArgvForLog, type ProcessError } from '../src/Commands/process-runner.js';
import type { Argv } from '../src/Commands/process-args.js';

const VSCODE_SHIM_URL = 'bbj-test-shim:vscode';
const PROCESS_RUNNER_SHIM_URL = 'bbj-test-shim:process-runner';

/** Per-section fake `vscode.workspace.getConfiguration(section)` values. */
type FakeSettings = Record<string, Record<string, unknown>>;

const DEFAULT_SETTINGS: FakeSettings = {
    bbj: { home: '', classpath: '' },
    'bbj.web': { apps: {}, AutoSaveUponRun: false },
};

let settings: FakeSettings = cloneSettings(DEFAULT_SETTINGS);

function cloneSettings(value: FakeSettings): FakeSettings {
    return JSON.parse(JSON.stringify(value)) as FakeSettings;
}

/** Walks a dot-separated key over a plain object, mirroring vscode's own `.get('a.b.c')`. */
function getPath(source: unknown, dottedKey: string): unknown {
    let current: unknown = source;
    for (const segment of dottedKey.split('.')) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

function fakeDocument(target: unknown): { uri: unknown; fileName: string } {
    if (typeof target === 'string') {
        return { uri: { fsPath: target }, fileName: target };
    }
    const fsPath = (target as { fsPath?: string } | undefined)?.fsPath ?? String(target);
    return { uri: target, fileName: fsPath };
}

/**
 * `workspace.getConfiguration(section)`: a fresh object each call, spreading the
 * current settings for `section` (so direct property reads like `.home` or
 * `.apps` work, exactly as `Commands.cjs` uses them) plus `get(key, def)` and
 * `inspect(key)` walking the same values by dotted key.
 */
function getConfiguration(section?: string) {
    const values = (section ? settings[section] : undefined) ?? {};
    return {
        ...values,
        get: (key: string, def?: unknown) => {
            const value = getPath(values, key);
            return value === undefined ? def : value;
        },
        inspect: (key: string) => ({ key, globalValue: getPath(values, key) }),
    };
}

export const fakeVscode = {
    workspace: {
        isTrusted: true,
        getConfiguration,
        openTextDocument: vi.fn(async (target: unknown) => fakeDocument(target)),
    },
    window: {
        showErrorMessage: vi.fn(async (_message: string, ..._items: string[]) => undefined as string | undefined),
        showWarningMessage: vi.fn(async (_message: string, ..._items: string[]) => undefined as string | undefined),
        showInformationMessage: vi.fn(async (_message: string, ..._items: string[]) => undefined as string | undefined),
        withProgress: vi.fn((_options: unknown, task: (progress?: unknown, token?: unknown) => unknown) =>
            task(undefined, undefined)
        ),
        showTextDocument: vi.fn(async (..._args: unknown[]) => undefined),
        activeTextEditor: undefined as unknown,
        tabGroups: {
            all: [] as unknown[],
            close: vi.fn(async (_tabs: unknown, _preserveFocus?: boolean) => true),
        },
    },
    commands: {
        executeCommand: vi.fn(async (_command: string, ..._args: unknown[]) => undefined),
    },
    ProgressLocation: { Notification: 15 },
    Uri: {
        file: (fsPath: string) => ({ fsPath }),
        parse: (uri: string) => ({ toString: () => uri }),
    },
};

export const fakeProcessRunner = {
    runProcess: vi.fn(async (_argv: Argv, _options: ExecFileOptions = {}) => ({ stdout: '', stderr: '' })),
    runProcessCallback: vi.fn(
        (_argv: Argv, _options: ExecFileOptions, _callback: (err: ProcessError | null, stdout: string, stderr: string) => void) => {
            // Bare spy: real behaviour is scripted per-test via mockImplementation, or the
            // callback is invoked directly off `.mock.calls` — this default body does nothing.
        }
    ),
    formatArgvForLog: vi.fn((argv: Argv, secrets: string[] = []) => realFormatArgvForLog(argv, secrets)),
};

(globalThis as Record<string, unknown>).__bbjTestFakeVscode = fakeVscode;
(globalThis as Record<string, unknown>).__bbjTestFakeProcessRunner = fakeProcessRunner;

/** Replaces the per-section fake settings wholesale (no merge with the previous value). */
export function setFakeSettings(next: FakeSettings): void {
    settings = cloneSettings(next);
}

/** The `{ fsPath }`-shaped target every run/compile/decompile command accepts. */
interface RunTargetParams {
    fsPath?: string;
}

/** The credentials shape `runBUI`/`runDWC` forward to the web-run EM login check. */
interface WebCredentials {
    username: string;
    password: string;
}

interface CommandsModule {
    setOutputChannel: (channel: unknown) => void;
    openConfigFile: () => void | Promise<void>;
    openPropertiesFile: () => void | Promise<void>;
    openEnterpriseManager: () => void;
    run: (params: RunTargetParams) => void;
    runBUI: (params: RunTargetParams, credentials?: WebCredentials) => void;
    runDWC: (params: RunTargetParams, credentials?: WebCredentials) => void;
    compile: (params: RunTargetParams) => void;
    decompileReplace: (params: RunTargetParams) => void;
    decompileReadonly: (params: RunTargetParams) => void;
    [key: string]: unknown;
}

interface ConfigPathCacheModule {
    resetConfigPathCacheForTests: () => void;
    /**
     * The real `setResolvedConfigPath` (`config-path-cache.ts`) requires the full
     * `ResolvedConfigPathResult` shape (`source`, `problem` included); every test here only
     * ever supplies `{ path, exists }`, which the real implementation accepts fine at runtime
     * (the extra fields are simply left `undefined`) — this narrower type describes exactly
     * what these tests pass, not the full production contract.
     */
    setResolvedConfigPath: (result: { path: string; exists: boolean }) => void;
    [key: string]: unknown;
}

let cached: { Commands: CommandsModule; configPathCache: ConfigPathCacheModule } | undefined;
let hooksRegistered = false;

/**
 * Module URLs known to be reachable from `Commands.cjs`'s own require tree.
 * Seeded with `Commands.cjs`'s own file URL by `loadCommands()` before
 * any resolution happens; every URL the `.ts`/extensionless fallback below
 * successfully resolves to -- and every URL Node's own default resolution
 * succeeds on when the requester is already in this set -- is added too, so the
 * fallback follows `Commands.cjs`'s actual dependency graph (however many
 * `.ts` files deep) without ever firing for an unrelated relative import
 * elsewhere in the same worker process, which would otherwise risk silently
 * redirecting an unrelated extensionless/`.js`-suffixed specifier to a
 * coincidentally-named `.ts` file for the rest of the worker's life.
 */
const commandsTreeUrls = new Set<string>();

const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
    if (specifier === 'vscode') {
        return { url: VSCODE_SHIM_URL, shortCircuit: true };
    }
    if (specifier === './process-runner' && context.parentURL?.endsWith('/Commands/Commands.cjs')) {
        return { url: PROCESS_RUNNER_SHIM_URL, shortCircuit: true };
    }
    const parentInTree = context.parentURL !== undefined && commandsTreeUrls.has(context.parentURL);
    try {
        const result = nextResolve(specifier, context);
        if (parentInTree) {
            commandsTreeUrls.add(result.url);
        }
        return result;
    } catch (err) {
        const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
        if (isRelative && parentInTree) {
            if (!/\.[a-zA-Z0-9]+$/.test(specifier)) {
                try {
                    const result = nextResolve(`${specifier}.ts`, context);
                    commandsTreeUrls.add(result.url);
                    return result;
                } catch {
                    // fall through to rethrow below
                }
            } else if (specifier.endsWith('.js')) {
                try {
                    const result = nextResolve(`${specifier.slice(0, -3)}.ts`, context);
                    commandsTreeUrls.add(result.url);
                    return result;
                } catch {
                    // fall through to rethrow below
                }
            }
        }
        throw err;
    }
};

/**
 * `config-path-trust.ts` reaches `vscode` via `import * as vscode from 'vscode';`, not a bare
 * CJS `require`. Node's CJS-to-ESM interop synthesizes named exports for a dynamically-loaded
 * CommonJS module by statically scanning its source for `module.exports.NAME = ...` (or
 * `exports.NAME = ...`) assignments (cjs-module-lexer) — a single `module.exports = <object>`
 * line alone yields only a `default` export, leaving `vscode.workspace` (and friends) undefined
 * for that import style. The self-referential assignments below give the lexer a literal target
 * name to detect for each property `Commands.cjs`'s dependency tree actually reads.
 */
const VSCODE_SHIM_SOURCE = `
module.exports = globalThis.__bbjTestFakeVscode;
module.exports.workspace = module.exports.workspace;
module.exports.window = module.exports.window;
module.exports.commands = module.exports.commands;
module.exports.ProgressLocation = module.exports.ProgressLocation;
module.exports.Uri = module.exports.Uri;
`;

const load: LoadHookSync = (url, context, nextLoad) => {
    if (url === VSCODE_SHIM_URL) {
        return {
            format: 'commonjs',
            source: VSCODE_SHIM_SOURCE,
            shortCircuit: true,
        };
    }
    if (url === PROCESS_RUNNER_SHIM_URL) {
        return {
            format: 'commonjs',
            source: 'module.exports = globalThis.__bbjTestFakeProcessRunner;',
            shortCircuit: true,
        };
    }
    return nextLoad(url, context);
};

/**
 * Loads the real `Commands.cjs` (and the `config-path-cache.ts` instance it shares
 * with these tests) through the `registerHooks` shim above. Idempotent: the hooks
 * are registered once per worker, and the same `{ Commands, configPathCache }` pair
 * is returned on every call.
 *
 * IMPORTANT: `node:module`'s `registerHooks` has no matching unregister call
 * anywhere in Node's API, so once this runs, the `resolve`/`load` pair above
 * intercepts **every** subsequent `require()`/native ESM resolution in this worker
 * process for the rest of its life -- not just calls made while loading
 * `Commands.cjs`, and not just for the duration of this test file. Under the
 * project's own `--maxWorkers=2` whole-suite run, other unrelated test files
 * execute in the same worker process after this one and are silently subject to
 * these hooks too. The `vscode` and `./process-runner` shims are intentionally
 * global matches (any native `require('vscode')` in the worker should see the
 * fake); the `.ts`/extensionless fallback branch is scoped to `commandsTreeUrls`
 * specifically to shrink this permanent, process-wide blast radius.
 */
export function loadCommands(): { Commands: CommandsModule; configPathCache: ConfigPathCacheModule } {
    if (cached) {
        return cached;
    }
    if (typeof registerHooks !== 'function') {
        throw new Error('module.registerHooks is unavailable; loading Commands.cjs under vitest needs Node 22.15 or later');
    }
    // Seed the tree with Commands.cjs's own URL before any resolution happens, so its
    // top-level `require(...)` calls -- and everything reachable from them -- qualify
    // for the `.ts`/extensionless fallback in `resolve` above.
    commandsTreeUrls.add(pathToFileURL(path.resolve(__dirname, '../src/Commands/Commands.cjs')).href);
    if (!hooksRegistered) {
        registerHooks({ resolve, load });
        hooksRegistered = true;
    }
    const req = createRequire(import.meta.url);
    const Commands = req(path.resolve(__dirname, '../src/Commands/Commands.cjs')) as CommandsModule;
    const configPathCache = req(path.resolve(__dirname, '../src/config-path-cache.ts')) as ConfigPathCacheModule;
    cached = { Commands, configPathCache };
    return cached;
}

/**
 * Resets every fake to its default behaviour, restores the default settings, clears
 * `activeTextEditor`, and — once `Commands.cjs` has been loaded at least once — resets
 * the config-path cache and `Commands.cjs`'s own module-level `outputChannel` state
 * (which otherwise persists between tests, since the module is only required once).
 */
export function resetCommandsHarness(): void {
    settings = cloneSettings(DEFAULT_SETTINGS);
    fakeVscode.window.activeTextEditor = undefined;

    (fakeVscode.window.showErrorMessage as Mock).mockReset().mockImplementation(async () => undefined);
    (fakeVscode.window.showWarningMessage as Mock).mockReset().mockImplementation(async () => undefined);
    (fakeVscode.window.showInformationMessage as Mock).mockReset().mockImplementation(async () => undefined);
    (fakeVscode.window.withProgress as Mock)
        .mockReset()
        .mockImplementation((_options: unknown, task: (progress?: unknown, token?: unknown) => unknown) =>
            task(undefined, undefined)
        );
    (fakeVscode.window.showTextDocument as Mock).mockReset().mockImplementation(async () => undefined);
    fakeVscode.window.tabGroups.all = [];
    (fakeVscode.window.tabGroups.close as Mock).mockReset().mockImplementation(async () => true);
    (fakeVscode.workspace.openTextDocument as Mock)
        .mockReset()
        .mockImplementation(async (target: unknown) => fakeDocument(target));
    (fakeVscode.commands.executeCommand as Mock).mockReset().mockImplementation(async () => undefined);

    (fakeProcessRunner.runProcess as Mock).mockReset().mockImplementation(async () => ({ stdout: '', stderr: '' }));
    (fakeProcessRunner.runProcessCallback as Mock).mockReset();
    (fakeProcessRunner.formatArgvForLog as Mock)
        .mockReset()
        .mockImplementation((argv: Argv, secrets: string[] = []) => realFormatArgvForLog(argv, secrets));

    if (cached) {
        cached.configPathCache.resetConfigPathCacheForTests();
        cached.Commands.setOutputChannel(null);
    }
}
