package com.basis.bbj.intellij.concurrency;

/**
 * Time-scheduling seam decoupling delay-based coalescing (restart gate, keystroke debounce)
 * from any concrete timer implementation. Plain Java, no IntelliJ platform imports, so it can be
 * exercised by a deterministic test double that advances time explicitly (D-01, D-02).
 * <p>
 * The production adapter is {@link AlarmScheduler}, wrapping {@code com.intellij.util.Alarm}.
 */
public interface Scheduler {

    /**
     * Schedule {@code task} to run after {@code delayMs} milliseconds.
     */
    void schedule(Runnable task, long delayMs);

    /**
     * Cancel a previously scheduled {@code task}, if still pending. A no-op if the task is not
     * pending (already run or never scheduled).
     */
    void cancel(Runnable task);

    /**
     * Cancel every pending scheduled task.
     */
    void cancelAll();
}
