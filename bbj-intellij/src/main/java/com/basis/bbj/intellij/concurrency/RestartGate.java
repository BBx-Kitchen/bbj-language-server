package com.basis.bbj.intellij.concurrency;

/**
 * Coalescing restart gate with an in-flight rejection: every {@link #request(long)} either
 * cancels whatever is pending and schedules a fresh delayed restart, or -- if a restart scheduled
 * by this gate is currently executing -- is dropped outright.
 *
 * <p>Requests that arrive while nothing is executing still coalesce through cancellation, not a
 * busy flag: two triggers inside the same pending window collapse into exactly one restart
 * (EDT-05, #539), and a trigger that arrives after the window already fired opens a new window and
 * produces a second restart. That part of the contract is unchanged.
 *
 * <p>What changes is a request that arrives once a scheduled restart has started running: it is
 * <em>dropped</em>, not queued. Queueing was considered and rejected -- a queued follow-up would
 * turn any future regression in stop classification (see {@link ExpectedStopGuard}) into an
 * unbounded restart loop, since each spurious restart would queue another one behind it. A dropped
 * request can at worst cost the caller one restart, which is always safe to repeat by triggering
 * again. {@link #request(long)} reports the drop to the caller via its boolean return so the
 * caller can surface it (see {@code BbjServerService#requestRestart(long)}'s console line) instead
 * of silently swallowing it.
 */
public final class RestartGate {

    private final Scheduler scheduler;
    private final Runnable restartAction;

    /**
     * The single stable wrapper scheduled in place of {@link #restartAction}, so the in-flight
     * flag covers the whole execution regardless of how many times a restart is scheduled.
     */
    private final Runnable guardedRestartAction;

    private boolean restartInFlight;

    public RestartGate(Scheduler scheduler, Runnable restartAction) {
        this.scheduler = scheduler;
        this.restartAction = restartAction;
        this.guardedRestartAction = this::runGuarded;
    }

    /**
     * Request a restart in {@code delayMs} milliseconds.
     *
     * <p>When a restart scheduled by this gate is currently executing, the request is dropped:
     * nothing is cancelled, nothing is scheduled, and this method returns {@code false}
     * immediately. Otherwise any previously pending request (from this gate) is cancelled before
     * the new one is scheduled, so overlapping requests coalesce into one restart and the most
     * recently requested delay always wins; this method returns {@code true}.
     *
     * <p>Synchronized so that the in-flight check and the cancel-then-schedule pair are atomic:
     * without this, two threads calling {@code request()} at nearly the same time could interleave
     * past the in-flight check, or as cancel/cancel/schedule/schedule, leaving two independently
     * scheduled restarts instead of one.
     *
     * @return {@code true} when a restart was scheduled, {@code false} when the request was
     *     dropped because a restart is already in flight
     */
    public synchronized boolean request(long delayMs) {
        if (restartInFlight) {
            return false;
        }
        scheduler.cancelAll();
        scheduler.schedule(guardedRestartAction, delayMs);
        return true;
    }

    /** Whether a restart scheduled by this gate is currently executing. */
    public synchronized boolean isRestartInFlight() {
        return restartInFlight;
    }

    /**
     * Runs {@link #restartAction}, holding the in-flight flag for the whole execution. The flag is
     * set and cleared inside the gate's monitor, but the delegate itself runs outside it --
     * {@link #request(long)} is {@code synchronized}, so holding the lock across the restart would
     * block every caller, including the EDT, for the whole restart.
     */
    private void runGuarded() {
        synchronized (this) {
            restartInFlight = true;
        }
        try {
            restartAction.run();
        } finally {
            synchronized (this) {
                restartInFlight = false;
            }
        }
    }
}
