package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for {@link PreviewDebouncer}, driven entirely by {@link ManualScheduler}
 * (never a real timer or a sleep) — mirrors {@link KeystrokeDebouncerTest}'s style. Lives in this
 * package to see the package-private {@link ManualScheduler}.
 */
class PreviewDebouncerTest {

    private static final long DELAY_MS = 300L;

    @Test
    void oneTriggerFollowedByAdvanceRunsTheActionExactlyOnce() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger runCount = new AtomicInteger();
        PreviewDebouncer debouncer = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, runCount::incrementAndGet);

        debouncer.trigger();
        assertEquals(0, runCount.get(), "no run before the scheduler fires");

        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, runCount.get(), "exactly one run once the delay elapses");
    }

    @Test
    void threeTriggersInsideTheWindowCollapseToOneRunAndCancelOnlyThisInstancesOwnPending() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger runCount = new AtomicInteger();
        PreviewDebouncer debouncer = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, runCount::incrementAndGet);

        debouncer.trigger();
        debouncer.trigger();
        debouncer.trigger();

        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, runCount.get(), "a burst of triggers collapses into one dispatched action");
        assertEquals(2, scheduler.cancelInvocations(),
                "two of the three triggers cancel a still-pending task from the previous trigger");
    }

    @Test
    void cancelAllIsNeverCalledAndASiblingDebouncerSharingTheSchedulerStillRunsItsOwnAction() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger runCountA = new AtomicInteger();
        AtomicInteger runCountB = new AtomicInteger();
        PreviewDebouncer debouncerA = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, runCountA::incrementAndGet);
        PreviewDebouncer debouncerB = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, runCountB::incrementAndGet);

        debouncerA.trigger();
        debouncerA.trigger();
        debouncerB.trigger();

        scheduler.advanceBy(DELAY_MS);

        assertEquals(0, scheduler.cancelAllInvocations(), "coalescing must go through cancel(pending), never cancelAll()");
        assertEquals(1, runCountA.get(), "debouncer A still runs its own coalesced action");
        assertEquals(1, runCountB.get(), "scheduling on debouncer A must not cancel debouncer B's pending task");
    }

    @Test
    void theActionIsNeverInvokedDirectlyByTheSchedulerItArrivesThroughTheInjectedUiThreadDispatcher() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger dispatchCount = new AtomicInteger();
        AtomicInteger runCount = new AtomicInteger();
        KeystrokeDebouncer.UiThread recordingDispatcher = task -> {
            dispatchCount.incrementAndGet();
            task.run();
        };
        PreviewDebouncer debouncer = new PreviewDebouncer(scheduler, DELAY_MS, recordingDispatcher, runCount::incrementAndGet);

        debouncer.trigger();
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, dispatchCount.get(), "the action is handed to the ui-thread dispatcher, not run inline");
        assertEquals(1, runCount.get());
    }

    @Test
    void triggerAfterTheActionAlreadyRanSchedulesAFreshTaskRatherThanReusingTheCompletedOne() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger runCount = new AtomicInteger();
        PreviewDebouncer debouncer = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, runCount::incrementAndGet);

        debouncer.trigger();
        scheduler.advanceBy(DELAY_MS);
        assertEquals(1, runCount.get());

        debouncer.trigger();
        scheduler.advanceBy(DELAY_MS);

        assertEquals(2, runCount.get(), "a trigger after the action already ran schedules and runs a fresh task");
    }

    @Test
    void theRecordedPendingDelayEqualsTheConfiguredDelayMs() {
        ManualScheduler scheduler = new ManualScheduler();
        PreviewDebouncer debouncer = new PreviewDebouncer(scheduler, DELAY_MS, Runnable::run, () -> { });

        debouncer.trigger();

        assertEquals(DELAY_MS, scheduler.onlyPendingDelay());
    }
}
