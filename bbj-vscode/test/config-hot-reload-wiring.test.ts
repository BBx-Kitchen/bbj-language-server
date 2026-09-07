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
 * Coverage for wiring the config-change detection layer into the running server: the quiescence
 * predicate on `BBjDocumentBuilder` and the bounded quiescence wait in `config-watcher.ts` that
 * consumes it (#486). No real fs.watch, no real timers, no real disk reads, no real workspace
 * documents — every effect is injected or driven through hermetic `createBBjServices`.
 *
 * The guarantee proven throughout this file: at most one reload notification per distinct
 * consumed-content transition, never emitted while the builder reports pending work, and never
 * delayed past the 5 s bound.
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

describe('settings-change relevance and the interleaved-burst guarantee (#486)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a settings change to a different-PREFIX config emits zero notifications while pending work is held, then exactly one with reason config-path-changed once the predicate flips', () => {
        let pending = true;
        const { watchDirectory } = createFakeWatchFactory();
        const notify = vi.fn();
        const contentsByPath = new Map<string, string>([
            ['/cfg-a/config.bbx', 'PREFIX /a/\n'],
            ['/cfg-b/config.bbx', 'PREFIX /b/\n'],
        ]);
        const readFile = vi.fn((p: string): string | null => contentsByPath.get(p) ?? null);
        const watcher = createConfigWatcher({
            watchDirectory, notify, readFile, hasPendingWork: () => pending, logWarn: vi.fn(), logInfo: vi.fn(),
        });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));
        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));

        expect(notify).not.toHaveBeenCalled();
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS * 3);
        expect(notify).not.toHaveBeenCalled();

        pending = false;
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: '/cfg-b/config.bbx', reason: 'config-path-changed' } satisfies ConfigReloadNotification);
    });

    test('a settings change to an identical-content config emits zero notifications, and the fake watch factory records a watch on the new directory', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const contentsByPath = new Map<string, string>([
            ['/cfg-a/config.bbx', 'PREFIX /same/\n'],
            ['/cfg-b/config.bbx', 'PREFIX /same/\n'],
        ]);
        const readFile = vi.fn((p: string): string | null => contentsByPath.get(p) ?? null);
        const watcher = createConfigWatcher({
            watchDirectory, notify, readFile, hasPendingWork: () => false, logWarn: vi.fn(),
        });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /same/\n'));
        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));

        expect(records).toHaveLength(2);
        expect(records[1].dir).toBe('/cfg-b');
        expect(notify).not.toHaveBeenCalled();
    });

    test('three config events plus one settings change inside one held-busy window emit exactly one notification in total, and the surviving reason is the last verdict', () => {
        let pending = true;
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentAContents = 'PREFIX /a/\n';
        const contentsByPath = new Map<string, string>([['/cfg-b/config.bbx', 'PREFIX /b/\n']]);
        const readFile = vi.fn((p: string): string | null => {
            if (p === '/cfg-a/config.bbx') return currentAContents;
            return contentsByPath.get(p) ?? null;
        });
        const watcher = createConfigWatcher({
            watchDirectory, notify, readFile, hasPendingWork: () => pending, logWarn: vi.fn(), logInfo: vi.fn(),
        });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));
        expect(records).toHaveLength(1);

        // Three raw config-file events inside one debounce window: the outer debounce
        // collapses them into a single evaluate() call once it closes.
        currentAContents = 'PREFIX /changed/\n';
        records[0].onEvent('rename', 'config.bbx');
        records[0].onEvent('change', 'config.bbx');
        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        // The debounced file-event verdict (prefix-changed, held because pending work is true)
        // is now the pending quiescence wait's payload.
        expect(notify).not.toHaveBeenCalled();

        // A settings change arrives inside the same window, while that wait is still pending —
        // its own immediate evaluation supersedes the pending payload.
        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));
        expect(notify).not.toHaveBeenCalled();

        vi.advanceTimersByTime(QUIESCENCE_POLL_MS * 5);
        expect(notify).not.toHaveBeenCalled();

        pending = false;
        vi.advanceTimersByTime(QUIESCENCE_POLL_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        // The last verdict to reach the pending wait survives — the settings-change verdict
        // (config-path-changed), not the earlier debounced file-event verdict (prefix-changed).
        expect(notify).toHaveBeenCalledWith({ path: '/cfg-b/config.bbx', reason: 'config-path-changed' } satisfies ConfigReloadNotification);
    });

    test('the same burst with the predicate never flipping emits exactly one notification at the 5000ms bound, not one per event', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentAContents = 'PREFIX /a/\n';
        const contentsByPath = new Map<string, string>([['/cfg-b/config.bbx', 'PREFIX /b/\n']]);
        const readFile = vi.fn((p: string): string | null => {
            if (p === '/cfg-a/config.bbx') return currentAContents;
            return contentsByPath.get(p) ?? null;
        });
        const watcher = createConfigWatcher({
            watchDirectory, notify, readFile, hasPendingWork: () => true, logWarn: vi.fn(), logInfo: vi.fn(),
        });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));

        currentAContents = 'PREFIX /changed/\n';
        records[0].onEvent('rename', 'config.bbx');
        records[0].onEvent('change', 'config.bbx');
        records[0].onEvent('rename', 'config.bbx');
        vi.advanceTimersByTime(CONFIG_WATCH_DEBOUNCE_MS);
        expect(notify).not.toHaveBeenCalled();

        watcher.updateResolvedPath(resolvedAt('/cfg-b/config.bbx'));
        expect(notify).not.toHaveBeenCalled();

        vi.advanceTimersByTime(QUIESCENCE_TIMEOUT_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: '/cfg-b/config.bbx', reason: 'config-path-changed' } satisfies ConfigReloadNotification);

        vi.advanceTimersByTime(10_000);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    test('a settings change resolving to a null path closes the watch, emits at most one notification, and leaves nothing armed', () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        const readFile = vi.fn((p: string): string | null => (p === '/cfg-a/config.bbx' ? 'PREFIX /a/\n' : null));
        const watcher = createConfigWatcher({
            watchDirectory, notify, readFile, hasPendingWork: () => false, logWarn: vi.fn(),
        });

        watcher.start(resolvedAt('/cfg-a/config.bbx'), consumedConfigSnapshot('PREFIX /a/\n'));
        expect(records).toHaveLength(1);
        expect(records[0].closed).toBe(false);

        watcher.updateResolvedPath(resolvedAt(null));

        expect(records[0].closed).toBe(true);
        expect(records).toHaveLength(1); // no new watch armed on a null path
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: null, reason: 'config-path-changed' } satisfies ConfigReloadNotification);

        // Nothing is armed to receive a further event: canonicalPath/watchedDir are both null,
        // so onDirectoryEvent's own guard returns early even if the stale closed handle's
        // captured listener were invoked directly.
        records[0].onEvent('rename', 'config.bbx');
        expect(notify).toHaveBeenCalledTimes(1);
    });
});
