package com.basis.bbj.intellij.concurrency;

/**
 * Coalescing restart gate: every {@link #request(long)} cancels whatever is pending and schedules
 * a fresh delayed restart. Two triggers inside the same window collapse into exactly one restart
 * (EDT-05, #539); a trigger that arrives after the window already fired opens a new window and
 * produces a second restart. No in-flight flag and no second state machine — coalescing is the
 * cancel-then-schedule shape already proven by {@code BbjServerService.scheduleRestart()}.
 */
public final class RestartGate {

    private final Scheduler scheduler;
    private final Runnable restartAction;

    public RestartGate(Scheduler scheduler, Runnable restartAction) {
        this.scheduler = scheduler;
        this.restartAction = restartAction;
    }

    /**
     * Request a restart in {@code delayMs} milliseconds. Cancels any previously pending request
     * (from this gate) before scheduling the new one, so overlapping requests coalesce into one
     * restart and the most recently requested delay always wins.
     *
     * <p>Synchronized so that the cancel-then-schedule pair is atomic: without this, two threads
     * calling {@code request()} at nearly the same time could interleave as cancel/cancel/
     * schedule/schedule, leaving two independently-scheduled restarts instead of one.
     */
    public synchronized void request(long delayMs) {
        scheduler.cancelAll();
        scheduler.schedule(restartAction, delayMs);
    }
}
