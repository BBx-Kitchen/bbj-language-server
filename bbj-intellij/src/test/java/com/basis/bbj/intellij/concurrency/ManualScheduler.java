package com.basis.bbj.intellij.concurrency;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Deterministic {@link Scheduler} test double. Time never advances on its own — a test moves the
 * clock explicitly via {@link #advanceBy(long)} or fires whatever is already due via
 * {@link #runPending()}. Never a real timer, never a sleep (D-02). Records every scheduled
 * (task, delayMs) pair in insertion order and counts {@code cancel}/{@code cancelAll} invocations
 * so a test can assert coalescing goes through cancellation, not a busy flag.
 */
final class ManualScheduler implements Scheduler {

    /** One scheduled task with the absolute time (on this scheduler's own clock) it is due. */
    private static final class Pending {
        final Runnable task;
        final long delayMs;
        final long dueAt;

        Pending(Runnable task, long delayMs, long dueAt) {
            this.task = task;
            this.delayMs = delayMs;
            this.dueAt = dueAt;
        }
    }

    private final List<Pending> pending = new ArrayList<>();
    private long currentTime = 0;
    private final AtomicInteger cancelInvocations = new AtomicInteger();
    private final AtomicInteger cancelAllInvocations = new AtomicInteger();
    private int runCount = 0;

    @Override
    public void schedule(Runnable task, long delayMs) {
        pending.add(new Pending(task, delayMs, currentTime + delayMs));
    }

    @Override
    public void cancel(Runnable task) {
        cancelInvocations.incrementAndGet();
        pending.removeIf(p -> p.task == task);
    }

    @Override
    public void cancelAll() {
        cancelAllInvocations.incrementAndGet();
        pending.clear();
    }

    /** Advance the clock by {@code deltaMs}, then run every task now due, in insertion order. */
    void advanceBy(long deltaMs) {
        currentTime += deltaMs;
        runDue();
    }

    /** Run every task already due without advancing the clock. */
    void runPending() {
        runDue();
    }

    private void runDue() {
        List<Pending> due = new ArrayList<>();
        for (Pending p : pending) {
            if (p.dueAt <= currentTime) {
                due.add(p);
            }
        }
        pending.removeAll(due);
        for (Pending p : due) {
            runCount++;
            p.task.run();
        }
    }

    int cancelInvocations() {
        return cancelInvocations.get();
    }

    int cancelAllInvocations() {
        return cancelAllInvocations.get();
    }

    int runCount() {
        return runCount;
    }

    int pendingCount() {
        return pending.size();
    }

    /** The delay recorded for the sole pending task. Fails fast if there isn't exactly one. */
    long onlyPendingDelay() {
        if (pending.size() != 1) {
            throw new IllegalStateException("Expected exactly one pending task, found " + pending.size());
        }
        return pending.get(0).delayMs;
    }
}
