/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * VS Code's restart choke point (#486): a direct TypeScript port of IntelliJ's
 * `RestartGate` (`bbj-intellij/.../concurrency/RestartGate.java`) cancel-then-schedule
 * coalescing contract. Every {@link RestartGate.request} cancels whatever restart is
 * pending and schedules a fresh one; two requests inside the same window collapse into
 * exactly one restart, and a request that arrives after the window already fired opens a
 * new window and produces a second restart.
 *
 * Deliberately free of any `vscode` import so this module stays unit-testable with a plain
 * fake target and fake timers — no editor host required. The real `LanguageClient` instance
 * satisfies {@link RestartTarget} structurally, no adapter needed.
 *
 * This gate reuses the *existing* client instance (stop then start) rather than
 * constructing a second `LanguageClient`: `vscode-languageclient` re-registers every stored
 * notification handler on each `start()` call, so a second instance would silently drop
 * every handler `activate()` registered on the first one. Callers must never construct a
 * new `LanguageClient` for a restart — this module, and only this module, calls
 * `stop()`/`start()` on the target.
 */

/** The structural slice of `LanguageClient` the gate needs. */
export interface RestartTarget {
    needsStop(): boolean;
    stop(): Promise<void>;
    start(): Promise<void>;
}

/** The three phases a restart passes through, reported to the gate's `onPhase` callback. */
export type RestartPhase = 'restarting' | 'restarted' | 'failed';

/** Injectable timer probes, defaulting to the real `setTimeout`/`clearTimeout`. */
export interface RestartGateDeps {
    setTimer?: (fn: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}

/**
 * The coalescing window, in milliseconds. Deliberately the same 500 ms delay IntelliJ's
 * settings-apply flow uses (`BbjServerService.RESTART_DEBOUNCE_MS`), so the two hosts
 * coalesce identically.
 */
export const CONFIG_RELOAD_RESTART_DELAY_MS = 500;

export interface RestartGate {
    /** Request a restart in `delayMs` milliseconds, cancelling any request already pending. */
    request(delayMs: number): void;
    /** Cancel a pending restart request. A no-op if nothing is pending. */
    cancel(): void;
}

/**
 * Create a restart gate over `target`. `onPhase` is invoked once per restart attempt for
 * each phase reached: `'restarting'` before the stop/start pair begins, `'restarted'` once
 * `start()` resolves, or `'failed'` (with the error) if `stop()`/`start()` rejects. A
 * rejection is always caught here — it is reported through `onPhase`, never allowed to
 * escape as an unhandled rejection from the scheduled timer callback.
 */
export function createRestartGate(
    target: RestartTarget,
    onPhase: (phase: RestartPhase, error?: unknown) => void,
    deps: RestartGateDeps = {}
): RestartGate {
    const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
    const clearTimer = deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

    let pendingHandle: unknown;
    /**
     * Set by `cancel()` so an already-fired `runRestart()` that is mid-`await` on
     * `target.stop()` notices, once that await resolves, that it must not go on to call
     * `target.start()` against a client that is being (or has been) shut down. `cancel()` only
     * clearing `pendingHandle` covers a *scheduled* restart (the timer has not fired yet); this
     * flag covers the narrower window where the timer already fired and `runRestart()` is
     * actively executing.
     */
    let cancelled = false;

    function clearPending(): void {
        if (pendingHandle !== undefined) {
            clearTimer(pendingHandle);
            pendingHandle = undefined;
        }
    }

    async function runRestart(): Promise<void> {
        onPhase('restarting');
        try {
            if (target.needsStop()) {
                await target.stop();
            }
            if (cancelled) {
                // cancel() ran while stop() was in flight -- the caller is shutting the
                // client down, so starting it back up here would race that shutdown.
                return;
            }
            await target.start();
            onPhase('restarted');
        } catch (error) {
            onPhase('failed', error);
        }
    }

    function request(delayMs: number): void {
        clearPending();
        cancelled = false;
        pendingHandle = setTimer(() => {
            pendingHandle = undefined;
            void runRestart();
        }, delayMs);
    }

    function cancel(): void {
        clearPending();
        cancelled = true;
    }

    return { request, cancel };
}
