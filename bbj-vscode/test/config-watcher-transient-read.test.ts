import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as path from 'path';
import {
    consumedConfigSnapshot,
    type ResolvedConfigPath,
} from '../src/language/config-path-resolver.js';
import type { ConfigReloadNotification } from '../src/language/config-reload-notification.js';
import {
    CONFIG_WATCH_DEBOUNCE_MS,
    createConfigWatcher,
    isAbsentReadError,
    type ConfigReadResult,
    type ConfigWatcherDeps,
    type WatchHandle,
} from '../src/language/config-watcher.js';

/**
 * Why did the language server used to restart when nobody edited the config file?
 *
 * `defaultReadFile` used to swallow every read error and return `null`, and `evaluate()` mapped
 * `null` through `consumedConfigSnapshot(null)` to the empty string — indistinguishable from
 * "the PREFIX line was deleted". So a single *transient* unreadable moment — a file lock, an
 * antivirus scan, a OneDrive/redirected-folder sync, all routine on Windows and all invisible on
 * Linux — used to produce:
 *
 *   1. one `config-missing` reload when the read failed, then
 *   2. one `prefix-changed` reload when the very same bytes became readable again.
 *
 * Two language-server restarts for zero content change. Each restart used to dispose the
 * captured OutputChannel (see stale-output-channel-repro.test.ts), which is what turned this
 * from a performance annoyance into the user-visible "Channel has been closed".
 *
 * The fix (#672) is a three-way read classification: content / absent / unreadable. Only
 * `absent` (a genuinely deleted file) still moves the snapshot and notifies. `unreadable`
 * returns before the snapshot moves and before any notification is sent, so it can never be
 * mistaken for a deleted PREFIX line — no matter how many times it flaps.
 */

interface WatchRecord {
    dir: string;
    onEvent: (eventType: string, filename: string | null) => void;
    onError: (err: unknown) => void;
}

function createFakeWatchFactory(): {
    watchDirectory: NonNullable<ConfigWatcherDeps['watchDirectory']>;
    records: WatchRecord[];
} {
    const records: WatchRecord[] = [];
    const watchDirectory: NonNullable<ConfigWatcherDeps['watchDirectory']> = (dir, onEvent, onError) => {
        records.push({ dir, onEvent, onError });
        const handle: WatchHandle = { close: () => { /* no-op */ } };
        return handle;
    };
    return { watchDirectory, records };
}

function resolvedAt(filePath: string | null): ResolvedConfigPath {
    return { path: filePath, source: 'setting', exists: true, problem: null };
}

/** A Node-style errno error, as `fs.readFileSync` throws it. */
function errnoError(code: string): NodeJS.ErrnoException {
    const err = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
    err.code = code;
    return err;
}

const CONFIG_CONTENTS = 'PREFIX "/opt/bbx/utils/" "/opt/bbx/plugins/"\nSETOPTS 08004020000000\n';

describe('a transient unreadable config read produces zero restarts (#672)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('one read failure followed by the identical bytes yields zero notifications', async () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentResult: ConfigReadResult = { kind: 'content', contents: CONFIG_CONTENTS };
        const readConfigFile = vi.fn((_p: string): ConfigReadResult => currentResult);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readConfigFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        const configPath = path.join('/opt/bbx/cfg', 'config.bbx');
        watcher.start(resolvedAt(configPath), consumedConfigSnapshot(CONFIG_CONTENTS));

        // start()'s own arm-time check read the file and found it matching: no notification.
        expect(notify).not.toHaveBeenCalled();
        const fire = records[0].onEvent;

        // 1. The file momentarily cannot be read. Nobody edited anything.
        currentResult = { kind: 'unreadable', error: errnoError('EBUSY') };
        fire('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        // 2. The read succeeds again, returning byte-identical content.
        currentResult = { kind: 'content', contents: CONFIG_CONTENTS };
        fire('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        // The snapshot never moved, so neither event produced a notification.
        expect(notify).not.toHaveBeenCalled();
    });

    test('a read failure that never recovers still emits zero notifications, and a later genuine change still emits exactly one prefix-changed', async () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentResult: ConfigReadResult = { kind: 'content', contents: CONFIG_CONTENTS };
        const readConfigFile = vi.fn((_p: string): ConfigReadResult => currentResult);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readConfigFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        watcher.start(resolvedAt(path.join('/opt/bbx/cfg', 'config.bbx')), consumedConfigSnapshot(CONFIG_CONTENTS));
        currentResult = { kind: 'unreadable', error: errnoError('EBUSY') };
        records[0].onEvent('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).not.toHaveBeenCalled();

        // The snapshot was preserved through the failure rather than corrupted by it -- a
        // genuine content change is still detected correctly afterwards.
        currentResult = { kind: 'content', contents: 'PREFIX "/opt/bbx/other/"\n' };
        records[0].onEvent('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect((notify.mock.calls[0][0] as ConfigReloadNotification).reason).toBe('prefix-changed');
    });

    test('a genuinely absent config file still emits exactly one config-missing when the snapshot was non-empty', async () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentResult: ConfigReadResult = { kind: 'content', contents: CONFIG_CONTENTS };
        const readConfigFile = vi.fn((_p: string): ConfigReadResult => currentResult);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readConfigFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        const configPath = path.join('/opt/bbx/cfg', 'config.bbx');
        watcher.start(resolvedAt(configPath), consumedConfigSnapshot(CONFIG_CONTENTS));

        currentResult = { kind: 'absent' };
        records[0].onEvent('rename', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith({ path: configPath, reason: 'config-missing' } satisfies ConfigReloadNotification);
    });

    test('an unreadable read on the settings-change (updateResolvedPath) path emits nothing and leaves the snapshot untouched', () => {
        const { watchDirectory } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentResult: ConfigReadResult = { kind: 'content', contents: CONFIG_CONTENTS };
        const readConfigFile = vi.fn((_p: string): ConfigReadResult => currentResult);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readConfigFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        watcher.start(resolvedAt(path.join('/opt/bbx/cfg', 'config.bbx')), consumedConfigSnapshot(CONFIG_CONTENTS));

        currentResult = { kind: 'unreadable', error: errnoError('EACCES') };
        watcher.updateResolvedPath(resolvedAt(path.join('/opt/bbx/other-cfg', 'config.bbx')));

        expect(notify).not.toHaveBeenCalled();

        // The snapshot was left untouched by the unreadable settings-change read: the very
        // next evaluation against the identical original content still reports no change.
        currentResult = { kind: 'content', contents: CONFIG_CONTENTS };
        watcher.updateResolvedPath(resolvedAt(path.join('/opt/bbx/other-cfg', 'config.bbx')));
        expect(notify).not.toHaveBeenCalled();
    });
});

describe('isAbsentReadError: ENOENT/ENOTDIR are absent, everything else is unreadable', () => {
    test.each([
        ['ENOENT', true],
        ['ENOTDIR', true],
        ['EBUSY', false],
        ['EACCES', false],
        ['EPERM', false],
        ['EMFILE', false],
        ['EIO', false],
    ] as const)('code %s -> isAbsentReadError() is %s', (code, expected) => {
        expect(isAbsentReadError(errnoError(code))).toBe(expected);
    });

    test('an error object with no code is unreadable, not absent', () => {
        expect(isAbsentReadError(new Error('no code here'))).toBe(false);
    });

    test('a non-Error thrown value is unreadable, not absent', () => {
        expect(isAbsentReadError('a plain string')).toBe(false);
        expect(isAbsentReadError(undefined)).toBe(false);
        expect(isAbsentReadError(null)).toBe(false);
    });
});
