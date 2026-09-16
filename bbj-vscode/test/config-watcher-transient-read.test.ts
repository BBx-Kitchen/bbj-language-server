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
    type ConfigWatcherDeps,
    type WatchHandle,
} from '../src/language/config-watcher.js';

/**
 * Why does the language server restart when nobody edited the config file?
 *
 * `defaultReadFile` (config-watcher.ts:91-97) swallows every read error and returns `null`,
 * and `evaluate()` maps `null` through `consumedConfigSnapshot(null)` to the empty string —
 * indistinguishable from "the PREFIX line was deleted". So a single *transient* unreadable
 * moment — a file lock, an antivirus scan, a OneDrive/redirected-folder sync, all routine on
 * Windows and all invisible on Linux — produces:
 *
 *   1. one `config-missing` reload when the read fails, then
 *   2. one `prefix-changed` reload when the very same bytes become readable again.
 *
 * Two language-server restarts for zero content change. Each restart disposes the captured
 * OutputChannel (see stale-output-channel-repro.test.ts), which is what turns this from a
 * performance annoyance into the user-visible "Channel has been closed".
 *
 * This test pins that behaviour down; it asserts the CURRENT behaviour, not the desired one.
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

const CONFIG_CONTENTS = 'PREFIX "/opt/bbx/utils/" "/opt/bbx/plugins/"\nSETOPTS 08004020000000\n';

describe('a transient unreadable config file restarts the server twice with no content change', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('one read failure followed by the identical bytes yields config-missing then prefix-changed', async () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentContents: string | null = CONFIG_CONTENTS;
        const readFile = vi.fn((_p: string): string | null => currentContents);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        const configPath = path.join('/opt/bbx/cfg', 'config.bbx');
        watcher.start(resolvedAt(configPath), consumedConfigSnapshot(CONFIG_CONTENTS));

        // start()'s own arm-time check read the file and found it matching: no notification.
        expect(notify).not.toHaveBeenCalled();
        const fire = records[0].onEvent;

        // 1. The file momentarily cannot be read. Nobody edited anything.
        currentContents = null;
        fire('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        // 2. The read succeeds again, returning byte-identical content.
        currentContents = CONFIG_CONTENTS;
        fire('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        const reasons = notify.mock.calls.map(c => (c[0] as ConfigReloadNotification).reason);
        expect(reasons).toEqual(['config-missing', 'prefix-changed']);

        // The bytes the server consumes are exactly what they were before the flap.
        expect(currentContents).toBe(CONFIG_CONTENTS);
    });

    test('a read failure that never recovers still costs one restart', async () => {
        const { watchDirectory, records } = createFakeWatchFactory();
        const notify = vi.fn();
        let currentContents: string | null = CONFIG_CONTENTS;
        const readFile = vi.fn((_p: string): string | null => currentContents);

        const watcher = createConfigWatcher({
            watchDirectory,
            notify,
            readFile,
            logWarn: vi.fn(),
            logInfo: vi.fn(),
        });

        watcher.start(resolvedAt(path.join('/opt/bbx/cfg', 'config.bbx')), consumedConfigSnapshot(CONFIG_CONTENTS));
        currentContents = null;
        records[0].onEvent('change', 'config.bbx');
        await vi.advanceTimersByTimeAsync(CONFIG_WATCH_DEBOUNCE_MS);

        expect(notify).toHaveBeenCalledTimes(1);
        expect((notify.mock.calls[0][0] as ConfigReloadNotification).reason).toBe('config-missing');
    });
});
