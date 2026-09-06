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
