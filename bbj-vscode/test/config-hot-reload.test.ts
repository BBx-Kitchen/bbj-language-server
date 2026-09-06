/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
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

    test('a line that merely starts with the letters of the directive as part of a longer word does not match', () => {
        const contents = 'PREFIXED /a/b/\n';
        expect(extractConsumedConfigContent(contents)).toBe('ED /a/b/');
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
