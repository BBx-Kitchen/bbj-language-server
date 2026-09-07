/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import {
    CONFIG_WATCH_DEBOUNCE_MS,
    QUIESCENCE_POLL_MS,
    QUIESCENCE_TIMEOUT_MS,
    createConfigWatcher,
    type ConfigWatcherDeps,
    type WatchHandle,
} from '../src/language/config-watcher.js';
import { consumedConfigSnapshot, type ResolvedConfigPath } from '../src/language/config-path-resolver.js';
import type { ConfigReloadNotification } from '../src/language/config-reload-notification.js';

/**
 * Coverage for wiring the detection layer from 85-01 into the running server: the quiescence
 * predicate on `BBjDocumentBuilder` and the bounded quiescence wait in `config-watcher.ts` that
 * consumes it (#486). No real fs.watch, no real timers, no real disk reads, no real workspace
 * documents — every effect is injected or driven through hermetic `createBBjServices`.
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

/** The members under test are private/protected by design; reach them explicitly. */
interface BuilderInternals {
    cplDebounceTimers: Map<string, ReturnType<typeof setTimeout>>;
}

describe('BBjDocumentBuilder.hasPendingWork / hasPendingCompile — the quiescence predicate', () => {
    test('a fresh builder (currentState still Changed) reports hasPendingWork() true', () => {
        const services = createBBjServices(EmptyFileSystem);
        const builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
        expect(builder.hasPendingWork()).toBe(true);
    });

    test('after await builder.build([], {}) resolves (currentState Validated), hasPendingWork() reports false', async () => {
        const services = createBBjServices(EmptyFileSystem);
        const builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
        await builder.build([], {});
        expect(builder.hasPendingWork()).toBe(false);
    });

    test('a pending BBjCPL debounce timer keeps hasPendingWork() true even once the build state is Validated', async () => {
        const services = createBBjServices(EmptyFileSystem);
        const builder = services.shared.workspace.DocumentBuilder as BBjDocumentBuilder;
        await builder.build([], {});
        expect(builder.hasPendingWork()).toBe(false);

        const timer = setTimeout(() => { /* never fires in this test */ }, 100_000);
        const internals = builder as unknown as BuilderInternals;
        internals.cplDebounceTimers.set('fake-key', timer);
        try {
            expect(builder.hasPendingCompile()).toBe(true);
            expect(builder.hasPendingWork()).toBe(true);
        } finally {
            clearTimeout(timer);
            internals.cplDebounceTimers.delete('fake-key');
        }
    });
});

describe('config-watcher quiescence wait: a reload is never pushed while the builder is busy', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function setup(initialContents: string, hasPendingWork: () => boolean) {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const logInfo = vi.fn();
        const logWarn = vi.fn();
        let currentContents: string | null = initialContents;
        const readFile = vi.fn((_p: string): string | null => currentContents);
        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readFile,
            hasPendingWork,
            logInfo,
            logWarn,
        });
        const configPath = path.join('/cfg', 'config.bbx');
        watcher.start(resolvedAt(configPath), consumedConfigSnapshot(initialContents));
        return {
            watcher,
            records,
            notify,
            readFile,
            logInfo,
            logWarn,
            configPath,
            setContents: (c: string | null) => { currentContents = c; },
        };
    }

    test('with the predicate held true, advancing past the debounce and several polls emits zero notifications', () => {
        let pending = true;
        const { records, notify, setContents } = setup('PREFIX /a/b/\n', () => pending);
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        expect(notify).not.toHaveBeenCalled();

        vi.advanceTimersByTime(QUIESCENCE_POLL_MS * 3);
        expect(notify).not.toHaveBeenCalled();
    });

    test('flipping the predicate false and advancing one poll interval emits exactly one notification', () => {
        let pending = true;
        const { records, notify, setContents } = setup('PREFIX /a/b/\n', () => pending);
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS * 2);
        expect(notify).not.toHaveBeenCalled();

        pending = false;
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: path.join('/cfg', 'config.bbx'), reason: 'prefix-changed' } satisfies ConfigReloadNotification);
    });

    test('with the predicate held true forever, advancing past the 5000ms bound emits exactly one notification, and no second one follows', () => {
        const { records, notify, setContents } = setup('PREFIX /a/b/\n', () => true);
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        vi.advanceTimersByTime(QUIESCENCE_TIMEOUT_MS);

        expect(notify).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(10_000);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    test('a second file event arriving while a quiescence wait is pending does not start a second wait or double-notify the same transition', () => {
        let pending = true;
        const { records, notify, readFile, setContents } = setup('PREFIX /a/b/\n', () => pending);
        setContents('PREFIX /c/d/\n');

        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        expect(readFile).toHaveBeenCalledTimes(1);

        // A second event for the same (already-observed) content while the quiescence wait is
        // still pending: the outer debounce re-fires evaluate(), but content is unchanged so no
        // second wait starts.
        records[0].onEvent('change', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);

        pending = false;
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS);

        expect(notify).toHaveBeenCalledTimes(1);
    });
});

describe('main.ts wires the config watcher: armed once, re-armed at exactly two sites', () => {
    function stripLineComments(text: string): string {
        return text
            .split('\n')
            .map(line => {
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n');
    }

    function mainSource(): string {
        return stripLineComments(
            fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'main.ts'), 'utf-8')
        );
    }

    test('exactly one createConfigWatcher( call', () => {
        const source = mainSource();
        expect(source.match(/createConfigWatcher\(/g) ?? []).toHaveLength(1);
    });

    test('exactly one configWatcher.start( call', () => {
        const source = mainSource();
        expect(source.match(/configWatcher\.start\(/g) ?? []).toHaveLength(1);
    });

    test('exactly two configWatcher.updateResolvedPath( calls, one per setConfigPath site', () => {
        const source = mainSource();
        expect(source.match(/configWatcher\.updateResolvedPath\(/g) ?? []).toHaveLength(2);
    });

    test('configWatcher.start( appears after the workspaceInitialized = true; assignment and the notifyResolvedConfigPath( call that precedes it', () => {
        const source = mainSource();
        const trueIdx = source.indexOf('workspaceInitialized = true;');
        const notifyIdx = source.indexOf('notifyResolvedConfigPath(wsManager.getResolvedConfigPath());');
        const startIdx = source.indexOf('configWatcher.start(');
        expect(trueIdx).toBeGreaterThan(-1);
        expect(notifyIdx).toBeGreaterThan(-1);
        expect(startIdx).toBeGreaterThan(-1);
        expect(trueIdx).toBeLessThan(notifyIdx);
        expect(notifyIdx).toBeLessThan(startIdx);
    });

    test('main.ts injects hasPendingWork from the shared DocumentBuilder cast to BBjDocumentBuilder, and notify from notifyConfigReloadRequired', () => {
        const source = mainSource();
        expect(source).toMatch(/hasPendingWork:\s*\(\)\s*=>\s*\(shared\.workspace\.DocumentBuilder as BBjDocumentBuilder\)\.hasPendingWork\(\)/);
        expect(source).toMatch(/notify:\s*notifyConfigReloadRequired/);
    });
});
