/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import type { FileSystemNode, FileSystemProvider } from 'langium';
import { URI } from 'langium';
import type { WorkspaceFolder } from 'vscode-languageserver';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    extractConsumedConfigContent,
    consumedConfigSnapshot,
    type ResolvedConfigPath,
} from '../src/language/config-path-resolver.js';
import {
    CONFIG_RELOAD_METHOD,
    CONFIG_RELOAD_REASONS,
    type ConfigReloadNotification,
} from '../src/language/config-reload-notification.js';
import {
    CONFIG_WATCH_DEBOUNCE_MS,
    createConfigWatcher,
    type ConfigWatcherDeps,
    type WatchHandle,
} from '../src/language/config-watcher.js';
import { createBBjTestServices } from './bbj-test-module.js';
import type { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';

/**
 * Hermetic coverage for the detection half of config hot-reload (#486): the shared
 * consumed-content extraction, the config-reload notification shape, and the directory
 * watcher's debounce + relevance gate. No real fs.watch, no real timers, no real disk reads —
 * every effect is injected.
 */

interface WatchRecord {
    dir: string;
    onEvent: (eventType: string, filename: string | null) => void;
    onError: (err: unknown) => void;
    closed: boolean;
}

function createFakeWatchFactory(): {
    watchDirectory: NonNullable<ConfigWatcherDeps['watchDirectory']>;
    records: WatchRecord[];
} {
    const records: WatchRecord[] = [];
    const watchDirectory: NonNullable<ConfigWatcherDeps['watchDirectory']> = (dir, onEvent, onError) => {
        const record: WatchRecord = { dir, onEvent, onError, closed: false };
        records.push(record);
        const handle: WatchHandle = { close: () => { record.closed = true; } };
        return handle;
    };
    return { watchDirectory, records };
}

function resolvedAt(filePath: string | null): ResolvedConfigPath {
    return { path: filePath, source: 'setting', exists: true, problem: null };
}

describe('extractConsumedConfigContent matches the pre-extraction expression byte-for-byte', () => {
    test('a normal PREFIX line', () => {
        const contents = 'PREFIX /a/b/\nSETOPTS foo\n';
        expect(extractConsumedConfigContent(contents)).toBe(
            contents.split('\n').find(line => line.startsWith('PREFIX'))?.substring(7) || ''
        );
        expect(extractConsumedConfigContent(contents)).toBe('/a/b/');
    });

    test('no PREFIX line falls back to the empty string', () => {
        const contents = 'SETOPTS foo\n';
        expect(extractConsumedConfigContent(contents)).toBe('');
    });

    test('a PREFIX line with trailing carriage return (CRLF file)', () => {
        const contents = 'PREFIX /a/b/\r\nSETOPTS foo\r\n';
        expect(extractConsumedConfigContent(contents)).toBe('/a/b/\r');
    });

    test('a line that merely starts with the letters of the directive as part of a longer word is still matched by startsWith, substring(7) taken verbatim', () => {
        const contents = 'PREFIXED /a/b/\n';
        expect(extractConsumedConfigContent(contents)).toBe(
            contents.split('\n').find(line => line.startsWith('PREFIX'))?.substring(7) || ''
        );
        expect(extractConsumedConfigContent(contents)).toBe('D /a/b/');
    });

    test('a PREFIX line with trailing spaces', () => {
        const contents = 'PREFIX /a/b/   \n';
        expect(extractConsumedConfigContent(contents)).toBe('/a/b/   ');
    });
});

describe('consumedConfigSnapshot', () => {
    test('null (absent/unreadable file) maps to the empty string', () => {
        expect(consumedConfigSnapshot(null)).toBe('');
    });

    test('strips a trailing carriage return and trailing whitespace, preserves value case', () => {
        expect(consumedConfigSnapshot('PREFIX /Mixed/Case/  \r\n')).toBe('/Mixed/Case/');
    });

    test('a file with no PREFIX line normalizes to the empty string', () => {
        expect(consumedConfigSnapshot('SETOPTS foo\n')).toBe('');
    });
});

describe('config-reload-notification module shape', () => {
    test('the method name constant and reason enumeration are exported as documented', () => {
        expect(CONFIG_RELOAD_METHOD).toBe('bbj/configReloadRequired');
        expect(CONFIG_RELOAD_REASONS).toEqual(['prefix-changed', 'config-missing', 'config-path-changed']);
    });

    test('a notification payload shape type-checks with path and reason fields', () => {
        const payload: ConfigReloadNotification = { path: '/cfg/config.bbx', reason: 'prefix-changed' };
        expect(payload.reason).toBe('prefix-changed');
    });
});

describe('createConfigWatcher: debounce + relevance gate (end-to-end tracer)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function setup(initialContents: string) {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentContents: string | null = initialContents;
        const readFile = vi.fn((_p: string): string | null => currentContents);
        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });
        const configPath = path.join('/cfg', 'config.bbx');
        watcher.start(resolvedAt(configPath), consumedConfigSnapshot(initialContents));
        // start()'s own arm-time relevance check (WR-03) already read the file once and found
        // it matching the baseline (no divergence, no notify) -- clear that call so the counts
        // asserted below reflect only each test's own subsequent events.
        readFile.mockClear();
        return {
            watcher,
            records,
            notify,
            readFile,
            configPath,
            setContents: (c: string | null) => { currentContents = c; },
        };
    }

    test('a PREFIX edit produces exactly one notification with reason prefix-changed', () => {
        const { records, notify, setContents, configPath } = setup('PREFIX /a/b/\n');
        expect(records).toHaveLength(1);
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: configPath, reason: 'prefix-changed' } satisfies ConfigReloadNotification);
    });

    test('a SETOPTS-only edit produces zero notifications', () => {
        const { records, notify, setContents } = setup('PREFIX /a/b/\nSETOPTS foo\n');
        setContents('PREFIX /a/b/\nSETOPTS bar\n');

        records[0].onEvent('change', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).not.toHaveBeenCalled();
    });

    test('three events inside one debounce window produce at most one relevance evaluation and one notification', () => {
        const { records, notify, readFile, setContents } = setup('PREFIX /a/b/\n');
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        records[0].onEvent('rename', 'config.bbx');
        records[0].onEvent('change', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(readFile).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    test('an event naming a different basename in the same directory produces zero relevance evaluations', () => {
        const { records, readFile } = setup('PREFIX /a/b/\n');

        records[0].onEvent('rename', 'other-file.txt');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(readFile).not.toHaveBeenCalled();
    });

    test('an event whose filename is null is treated as possibly the target and the gate runs', () => {
        const { records, readFile, setContents } = setup('PREFIX /a/b/\n');
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', null);
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(readFile).toHaveBeenCalledTimes(1);
    });

    test('config-watcher.ts imports samePath from config-path-resolver rather than reimplementing the comparison', () => {
        const source = fs.readFileSync(
            path.join(__dirname, '..', 'src', 'language', 'config-watcher.ts'),
            'utf-8'
        );
        expect(source).toContain("from './config-path-resolver.js'");
        expect(source).toMatch(/samePath/);
    });

    test('a missing-file evaluation when the snapshot was non-empty emits exactly one notification with reason config-missing', () => {
        const { records, notify, setContents, configPath } = setup('PREFIX /a/\n');
        setContents(null);

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: configPath, reason: 'config-missing' } satisfies ConfigReloadNotification);
    });

    test('a missing-file evaluation when the snapshot was already empty emits zero notifications', () => {
        const { records, notify, setContents } = setup('');
        setContents(null);

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).not.toHaveBeenCalled();
    });

    test('an atomic save modelled as delete-then-create inside one debounce window emits exactly one prefix-changed notification', () => {
        const { records, notify, readFile, setContents, configPath } = setup('PREFIX /a/b/\n');

        // The delete half of the atomic save: the file briefly reads as absent.
        setContents(null);
        records[0].onEvent('rename', 'config.bbx');
        // The create half, recreating the file with new content, inside the same window.
        setContents('PREFIX /c/d/\n');
        records[0].onEvent('rename', 'config.bbx');

        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        // The transient absence is never observed: only the post-rename contents are read.
        expect(readFile).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: configPath, reason: 'prefix-changed' } satisfies ConfigReloadNotification);
    });
});

describe('updateResolvedPath: settings-change re-arm and immediate relevance check', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a different canonical path with different consumed content re-arms and emits exactly one config-path-changed notification', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const contentsByPath = new Map<string, string>([
            ['/cfg-a/config.bbx', 'PREFIX /a/\n'],
            ['/cfg-b/config.bbx', 'PREFIX /b/\n'],
        ]);
        const readFile = vi.fn((p: string): string | null => contentsByPath.get(p) ?? null);
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));
        expect(records).toHaveLength(1);

        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));

        expect(records).toHaveLength(2);
        expect(records[1].dir).toBe('/cfg-b');
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: '/cfg-b/config.bbx', reason: 'config-path-changed' } satisfies ConfigReloadNotification);
    });

    test('a different canonical path pointing at an identical copy re-arms but emits zero notifications', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const contentsByPath = new Map<string, string>([
            ['/cfg-a/config.bbx', 'PREFIX /same/\n'],
            ['/cfg-b/config.bbx', 'PREFIX /same/\n'],
        ]);
        const readFile = vi.fn((p: string): string | null => contentsByPath.get(p) ?? null);
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /same/\n'));
        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));

        expect(records).toHaveLength(2);
        expect(notify).not.toHaveBeenCalled();
    });

    test('updateResolvedPath called before start is a no-op: no watch armed, no notification', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile: vi.fn((): string | null => null), logWarn: vi.fn() });

        watcher.updateResolvedPath(resolvedAt('/cfg-a/config.bbx'));

        expect(records).toHaveLength(0);
        expect(notify).not.toHaveBeenCalled();
    });
});

describe('arm failure handling and dispose', () => {
    test('a throwing watch factory produces no thrown error, one warning per distinct path, and retries on a different path', () => {
        const calls: string[] = [];
        const watchDirectory: NonNullable<ConfigWatcherDeps['watchDirectory']> = (dir) => {
            calls.push(dir);
            throw new Error(`ENOENT: ${dir}`);
        };
        const logWarn = vi.fn();
        const watcher = createConfigWatcher({
            watchDirectory,
            logWarn,
            notify: vi.fn(),
            readFile: vi.fn((): string | null => null),
        });

        expect(() => watcher.start(resolvedAt('/broken/config.bbx'), '')).not.toThrow();
        expect(logWarn).toHaveBeenCalledTimes(1);

        // A repeated re-arm on the SAME broken path retries arming but does not warn again.
        expect(() => watcher.updateResolvedPath(resolvedAt('/broken/config.bbx'))).not.toThrow();
        expect(logWarn).toHaveBeenCalledTimes(1);

        // A re-arm on a DIFFERENT path always retries and is eligible to warn again.
        expect(() => watcher.updateResolvedPath(resolvedAt('/other/config.bbx'))).not.toThrow();
        expect(logWarn).toHaveBeenCalledTimes(2);

        expect(calls).toEqual(['/broken', '/broken', '/other']);
    });

    test('dispose() closes the open handle and clears a pending debounce timer', () => {
        vi.useFakeTimers();
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        // Matches the baseline passed to start() below, so the arm-time relevance check
        // (WR-03) sees no divergence and start() itself notifies nothing -- this test is
        // about dispose() cancelling a LATER pending debounce timer, not the arm-time check.
        let currentContents = 'PREFIX /original/\n';
        const readFile = vi.fn((): string | null => currentContents);
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg/config.bbx'), consumedConfigSnapshot('PREFIX /original/\n'));
        currentContents = 'PREFIX /changed/\n';
        records[0].onEvent('rename', 'config.bbx');

        watcher.dispose();
        expect(records[0].closed).toBe(true);

        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        expect(notify).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});

describe('start(): arm-time relevance check (WR-03)', () => {
    test('a config file that diverged between the baseline snapshot capture and start() is detected immediately, with reason prefix-changed', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        // The baseline was captured earlier (e.g. at initializeWorkspace() time) as the
        // snapshot of 'PREFIX /a/\n' -- but by the time start() arms the watch, the file on
        // disk already reads as 'PREFIX /b/\n' (an edit landed in the window between the two).
        const readFile = vi.fn((): string | null => 'PREFIX /b/\n');
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));

        expect(records).toHaveLength(1);
        expect(readFile).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: '/cfg/config.bbx', reason: 'prefix-changed' } satisfies ConfigReloadNotification);
    });

    test('a config file that reads as missing at arm time, diverging from a non-empty baseline, is detected with reason config-missing', () => {
        const { watchDirectory } = createFakeWatchFactory();
        const notify = vi.fn();
        const readFile = vi.fn((): string | null => null);
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: '/cfg/config.bbx', reason: 'config-missing' } satisfies ConfigReloadNotification);
    });

    test('a config file whose content still matches the baseline at start() emits zero notifications', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const readFile = vi.fn((): string | null => 'PREFIX /a/\n');
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt('/cfg/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));

        expect(records).toHaveLength(1);
        expect(readFile).toHaveBeenCalledTimes(1);
        expect(notify).not.toHaveBeenCalled();
    });

    test('start() with no resolved path performs no read and emits no notification', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const readFile = vi.fn((): string | null => 'PREFIX /a/\n');
        const watcher = createConfigWatcher({ watchDirectory, notify, readFile, logWarn: vi.fn() });

        watcher.start(resolvedAt(null), '');

        expect(records).toHaveLength(0);
        expect(readFile).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });
});

/**
 * Minimal in-memory FileSystemProvider driving a single config file path, following the
 * stub-FileSystemProvider convention from `test/ws-manager.test.ts`. `readDirectory` always
 * returns empty (no `project.properties` in any folder), isolating the read on the resolved
 * config path from everything else `initializeWorkspace` touches.
 */
class ConfigOnlyFileSystemProvider implements FileSystemProvider {
    constructor(
        private readonly configPath: string,
        private readonly readConfig: () => string,
    ) { }

    private node(uri: URI, isFile: boolean): FileSystemNode {
        return { isFile, isDirectory: !isFile, uri };
    }
    async stat(uri: URI): Promise<FileSystemNode> { return this.statSync(uri); }
    statSync(uri: URI): FileSystemNode { return this.node(uri, uri.fsPath === this.configPath); }
    async exists(uri: URI): Promise<boolean> { return uri.fsPath === this.configPath; }
    existsSync(uri: URI): boolean { return uri.fsPath === this.configPath; }
    async readBinary(): Promise<Uint8Array> { throw new Error('not implemented'); }
    readBinarySync(): Uint8Array { throw new Error('not implemented'); }
    async readFile(uri: URI): Promise<string> { return this.readFileSync(uri); }
    readFileSync(uri: URI): string {
        if (uri.fsPath !== this.configPath) {
            throw new Error(`ENOENT: ${uri.fsPath}`);
        }
        return this.readConfig();
    }
    async readDirectory(): Promise<FileSystemNode[]> { return []; }
    readDirectorySync(): FileSystemNode[] { return []; }
}

describe('initializeWorkspace and the relevance gate share one extraction function', () => {
    function singleFolder(root: string): WorkspaceFolder[] {
        return [{ uri: URI.file(root).toString(), name: 'root' }];
    }

    test('a successful config read leaves getConsumedConfigSnapshot() equal to consumedConfigSnapshot of the same bytes', async () => {
        const configPath = path.join(path.sep, 'opt', 'bbj-test-config-hot-reload', 'cfg', 'config.bbx');
        const contents = 'PREFIX /a/ /b/\n';
        const services = createBBjTestServices({
            fileSystemProvider: () => new ConfigOnlyFileSystemProvider(configPath, () => contents),
        });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(configPath);

        await wsManager.initializeWorkspace(singleFolder(path.join(path.sep, 'root')));

        expect(wsManager.getConsumedConfigSnapshot()).toBe(consumedConfigSnapshot(contents));
    });

    test('a read that throws leaves getConsumedConfigSnapshot() equal to the empty string', async () => {
        const configPath = path.join(path.sep, 'opt', 'bbj-test-config-hot-reload', 'cfg', 'config.bbx');
        const services = createBBjTestServices({
            fileSystemProvider: () => new ConfigOnlyFileSystemProvider(configPath, () => {
                throw new Error('simulated read failure');
            }),
        });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(configPath);

        await wsManager.initializeWorkspace(singleFolder(path.join(path.sep, 'root')));

        expect(wsManager.getConsumedConfigSnapshot()).toBe('');
    });

    test('no resolved path at all leaves getConsumedConfigSnapshot() equal to the empty string', async () => {
        const services = createBBjTestServices({
            fileSystemProvider: () => new ConfigOnlyFileSystemProvider('/never-read', () => ''),
        });
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        // No setConfigPath call, no BBj home set: resolveConfigPath yields source 'none'.

        await wsManager.initializeWorkspace(singleFolder(path.join(path.sep, 'root')));

        expect(wsManager.getConsumedConfigSnapshot()).toBe('');
    });
});

describe('the config-directive line-scan expression lives in exactly one module', () => {
    function stripLineComments(text: string): string {
        return text
            .split('\n')
            .map(line => {
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n');
    }

    function countLineScanOccurrences(dir: string): number {
        const pattern = /\.startsWith\(\s*['"]PREFIX['"]\s*\)/g;
        let count = 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'generated') continue;
                count += countLineScanOccurrences(full);
            } else if (entry.name.endsWith('.ts')) {
                const text = stripLineComments(fs.readFileSync(full, 'utf-8'));
                const matches = text.match(pattern);
                count += matches ? matches.length : 0;
            }
        }
        return count;
    }

    test('appears exactly once, in config-path-resolver.ts', () => {
        const languageDir = path.join(__dirname, '..', 'src', 'language');
        expect(countLineScanOccurrences(languageDir)).toBe(1);

        const resolverSource = stripLineComments(
            fs.readFileSync(path.join(languageDir, 'config-path-resolver.ts'), 'utf-8')
        );
        expect(resolverSource.match(/\.startsWith\(\s*['"]PREFIX['"]\s*\)/g)).toHaveLength(1);
    });
});
