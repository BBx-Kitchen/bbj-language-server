/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Server-owned detection half of config hot-reload (#486): watches the *directory* containing
 * the resolved BBj config file with a non-recursive `fs.watch`, filters raw events to the
 * config file's own basename via `samePath` (never a fresh comparison), debounces the events,
 * and emits a `bbj/configReloadRequired` notification only when the config content the server
 * actually consumes (`extractConsumedConfigContent`/`consumedConfigSnapshot` in
 * `config-path-resolver.ts`) has changed since the last-seen snapshot.
 *
 * Plain Node `fs`/`path` only — no Langium and no editor imports — and every effectful
 * operation is injectable through {@link ConfigWatcherDeps}, so this module is unit-testable
 * with fake timers and a fake watch factory: no real `fs.watch` handle, no real timers, no real
 * disk reads in tests.
 */
import * as fs from 'fs';
import * as path from 'path';
import { samePath, consumedConfigSnapshot, type ResolvedConfigPath } from './config-path-resolver.js';
import { notifyConfigReloadRequired } from './bbj-notifications.js';
import type { ConfigReloadNotification, ConfigReloadReason } from './config-reload-notification.js';
import { logger } from './logger.js';

/**
 * Trailing-edge debounce interval for raw directory events (ms). Deliberately at least double
 * `SAVE_DEBOUNCE_MS = 500` in `bbj-document-builder.ts` (the BBjCPL debounce), so an atomic
 * save's delete+create pair and a burst of saves collapse into one relevance evaluation, and
 * the two debounce clocks can never interleave.
 */
export const CONFIG_WATCH_DEBOUNCE_MS = 1000;

/**
 * Poll interval for the bounded quiescence wait (ms). After the debounce closes and the gate
 * says "changed", the watcher does not push the reload notification until the injected
 * `hasPendingWork` predicate reads false (no in-flight Langium build, no pending BBjCPL
 * debounce timer) — it re-checks the predicate at this interval rather than sleeping.
 */
export const QUIESCENCE_POLL_MS = 100;

/**
 * Upper bound on the quiescence wait (ms). A busy workspace cannot starve the reload forever:
 * once the accumulated wait reaches this bound, the notification is pushed anyway (research
 * Pitfall 4's mid-validation guard is best-effort, not absolute).
 */
export const QUIESCENCE_TIMEOUT_MS = 5000;

/** A handle to an open directory watch. */
export interface WatchHandle {
    close(): void;
}

/** Injectable effects, defaulting to real Node/process behavior. */
export interface ConfigWatcherDeps {
    /** Opens a non-recursive watch on `dir`. Defaults to `fs.watch(dir, { persistent: false }, ...)`. */
    watchDirectory?(
        dir: string,
        onEvent: (eventType: string, filename: string | null) => void,
        onError: (err: unknown) => void
    ): WatchHandle;
    /** Reads a file's contents, or `null` for a missing/unreadable file. Never throws. */
    readFile?(path: string): string | null;
    setTimer?(fn: () => void, ms: number): unknown;
    clearTimer?(handle: unknown): void;
    /** Sends the reload notification. Defaults to `notifyConfigReloadRequired`. */
    notify?(params: ConfigReloadNotification): void;
    /**
     * The quiescence predicate: true while the workspace is busy (an in-flight/never-completed
     * Langium build, or a pending BBjCPL debounce timer). Defaults to `() => false` — a caller
     * that never injects this gets the pre-quiescence behavior of notifying immediately.
     */
    hasPendingWork?(): boolean;
    logInfo?(msg: string): void;
    logWarn?(msg: string): void;
}

function defaultWatchDirectory(
    dir: string,
    onEvent: (eventType: string, filename: string | null) => void,
    onError: (err: unknown) => void
): WatchHandle {
    const watcher = fs.watch(dir, { persistent: false }, (eventType, filename) => {
        onEvent(eventType, filename ? filename.toString() : null);
    });
    watcher.on('error', onError);
    return { close: () => watcher.close() };
}

function defaultReadFile(p: string): string | null {
    try {
        return fs.readFileSync(p, 'utf-8');
    } catch {
        return null;
    }
}

/** The watcher's public surface. */
export interface ConfigWatcher {
    /** Arm the watch on `resolved`'s directory, recording `snapshot` as the running baseline. */
    start(resolved: ResolvedConfigPath, snapshot: string): void;
    /**
     * Re-arm on a new resolved path (a settings change). Full relevance-gate behavior (an
     * immediate, non-debounced comparison against the running snapshot) is completed in a
     * later task; this task's body re-arms the watch on the new canonical path.
     */
    updateResolvedPath(resolved: ResolvedConfigPath): void;
    /** Close any open handle and clear any pending timer. */
    dispose(): void;
}

/**
 * Build a config directory watcher. `deps` defaults to real Node/process behavior; tests
 * inject fakes for every effect so no real filesystem watch, timer, or disk read is ever
 * touched.
 */
export function createConfigWatcher(deps: ConfigWatcherDeps = {}): ConfigWatcher {
    const watchDirectory = deps.watchDirectory ?? defaultWatchDirectory;
    const readFile = deps.readFile ?? defaultReadFile;
    const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
    const clearTimer = deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
    const notify = deps.notify ?? notifyConfigReloadRequired;
    const hasPendingWork = deps.hasPendingWork ?? (() => false);
    const logInfo = deps.logInfo ?? ((msg: string) => logger.info(msg));
    const logWarn = deps.logWarn ?? ((msg: string) => logger.warn(msg));

    let started = false;
    let canonicalPath: string | null = null;
    let watchedDir: string | null = null;
    let handle: WatchHandle | null = null;
    let snapshot = '';
    let pendingTimer: unknown = null;
    /** The one outstanding quiescence wait's timer handle, or `null` if none is pending. */
    let pendingQuiescenceTimer: unknown = null;
    /**
     * The payload of the one outstanding quiescence wait. A new "changed" verdict arriving
     * while a wait is pending replaces this rather than starting a second wait, so a burst can
     * never produce two notifications for one consumed-content transition.
     */
    let pendingQuiescencePayload: ConfigReloadNotification | null = null;
    let quiescenceElapsedMs = 0;
    /** Canonical paths that already produced an arm-failure or watch-error warning, so a
     * repeated failure on the SAME path stays silent while a failure on a DIFFERENT path is
     * always eligible to warn again. */
    const warnedPaths = new Set<string>();

    function closeHandle(): void {
        if (handle) {
            try {
                handle.close();
            } catch {
                // best-effort close — nothing further to do if the underlying handle is
                // already gone
            }
            handle = null;
        }
    }

    function clearPendingTimer(): void {
        if (pendingTimer !== null) {
            clearTimer(pendingTimer);
            pendingTimer = null;
        }
    }

    function clearPendingQuiescenceTimer(): void {
        if (pendingQuiescenceTimer !== null) {
            clearTimer(pendingQuiescenceTimer);
            pendingQuiescenceTimer = null;
        }
    }

    /**
     * Push `params` once the builder reports quiescent, or once the bound elapses — whichever
     * comes first. Exactly one wait may be outstanding: calling this while a previous wait is
     * still pending cancels it and replaces its payload (cancel-then-schedule on the single
     * `pendingQuiescenceTimer` handle) rather than starting a second, independent wait.
     */
    function waitForQuiescenceThenNotify(params: ConfigReloadNotification): void {
        clearPendingQuiescenceTimer();
        pendingQuiescencePayload = params;
        quiescenceElapsedMs = 0;
        pollQuiescence();
    }

    function pollQuiescence(): void {
        try {
            const payload = pendingQuiescencePayload;
            if (!payload) {
                return;
            }
            if (!hasPendingWork()) {
                pendingQuiescencePayload = null;
                pendingQuiescenceTimer = null;
                notify(payload);
                return;
            }
            quiescenceElapsedMs += QUIESCENCE_POLL_MS;
            if (quiescenceElapsedMs >= QUIESCENCE_TIMEOUT_MS) {
                pendingQuiescencePayload = null;
                pendingQuiescenceTimer = null;
                logInfo(`Config reload quiescence wait exceeded the ${QUIESCENCE_TIMEOUT_MS}ms bound; pushing the reload notification anyway`);
                notify(payload);
                return;
            }
            pendingQuiescenceTimer = setTimer(pollQuiescence, QUIESCENCE_POLL_MS);
        } catch (err) {
            pendingQuiescencePayload = null;
            pendingQuiescenceTimer = null;
            logWarn(`Config watcher quiescence wait failed: ${err}`);
        }
    }

    function warnOnce(key: string, msg: string): void {
        if (warnedPaths.has(key)) {
            return;
        }
        warnedPaths.add(key);
        logWarn(msg);
    }

    function onWatchError(err: unknown): void {
        try {
            const key = canonicalPath ?? watchedDir ?? 'unknown config path';
            closeHandle();
            watchedDir = null;
            warnOnce(key, `Config watch on ${key} failed: ${err}`);
        } catch (e) {
            logWarn(`Config watcher error handler failed: ${e}`);
        }
    }

    function onDirectoryEvent(_eventType: string, filename: string | null): void {
        try {
            if (!watchedDir || !canonicalPath) {
                return;
            }
            const admitted = filename === null || samePath(path.join(watchedDir, filename), canonicalPath);
            if (!admitted) {
                return;
            }
            clearPendingTimer();
            pendingTimer = setTimer(() => {
                pendingTimer = null;
                evaluate();
            }, CONFIG_WATCH_DEBOUNCE_MS);
        } catch (err) {
            logWarn(`Config watcher event handling failed: ${err}`);
        }
    }

    function evaluate(): void {
        try {
            if (!canonicalPath) {
                return;
            }
            const contents = readFile(canonicalPath);
            const next = consumedConfigSnapshot(contents);
            if (next === snapshot) {
                return;
            }
            const wasEmpty = snapshot === '';
            snapshot = next;
            const reason: ConfigReloadReason = (next === '' && !wasEmpty) ? 'config-missing' : 'prefix-changed';
            waitForQuiescenceThenNotify({ path: canonicalPath, reason });
        } catch (err) {
            logWarn(`Config watcher relevance evaluation failed: ${err}`);
        }
    }

    function armWatch(dir: string): void {
        closeHandle();
        watchedDir = dir;
        const key = canonicalPath ?? dir;
        try {
            handle = watchDirectory(dir, onDirectoryEvent, onWatchError);
            // A successful arm means a FUTURE failure on this exact path is a new problem,
            // worth warning about again.
            warnedPaths.delete(key);
        } catch (err) {
            handle = null;
            watchedDir = null;
            warnOnce(key, `Failed to watch config directory ${dir}: ${err}`);
        }
    }

    return {
        start(resolved: ResolvedConfigPath, initialSnapshot: string): void {
            started = true;
            snapshot = initialSnapshot;
            canonicalPath = resolved.path;
            clearPendingTimer();
            closeHandle();
            if (resolved.path) {
                armWatch(path.dirname(resolved.path));
                // The baseline snapshot was captured synchronously at workspace-open time,
                // before the watch above was armed -- fs.watch only reports events that occur
                // AFTER arming, so a config edit landing in that window would otherwise stay
                // invisible for the rest of the session. Run the same immediate relevance
                // check `updateResolvedPath()` already performs on a settings change, reusing
                // evaluate()'s exact read-compare-classify logic (canonicalPath and snapshot
                // above are already primed for it).
                evaluate();
            } else {
                watchedDir = null;
            }
        },
        updateResolvedPath(resolved: ResolvedConfigPath): void {
            if (!started) {
                return;
            }
            clearPendingTimer();
            closeHandle();
            canonicalPath = resolved.path;
            if (resolved.path) {
                armWatch(path.dirname(resolved.path));
                // A settings change is a discrete user action, not a file-event burst — run
                // the relevance gate immediately, no debounce.
                try {
                    const contents = readFile(resolved.path);
                    const next = consumedConfigSnapshot(contents);
                    if (next !== snapshot) {
                        snapshot = next;
                        waitForQuiescenceThenNotify({ path: resolved.path, reason: 'config-path-changed' });
                    }
                } catch (err) {
                    logWarn(`Config watcher relevance evaluation failed for ${resolved.path}: ${err}`);
                }
            } else {
                watchedDir = null;
                const next = consumedConfigSnapshot(null);
                if (next !== snapshot) {
                    snapshot = next;
                    waitForQuiescenceThenNotify({ path: null, reason: 'config-path-changed' });
                }
            }
        },
        dispose(): void {
            clearPendingTimer();
            clearPendingQuiescenceTimer();
            pendingQuiescencePayload = null;
            closeHandle();
        },
    };
}
