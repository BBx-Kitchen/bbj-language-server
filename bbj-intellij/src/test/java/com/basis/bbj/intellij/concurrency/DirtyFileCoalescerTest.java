package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for {@link DirtyFileCoalescer}, driven entirely by {@link ManualScheduler}
 * (never a real timer or a sleep). Lives in this package to see the package-private scheduler
 * double.
 */
class DirtyFileCoalescerTest {

    private static final long DELAY_MS = 300L;

    private final ManualScheduler scheduler = new ManualScheduler();
    private final List<String> refreshed = new ArrayList<>();

    private DirtyFileCoalescer<String> coalescer() {
        return new DirtyFileCoalescer<>(scheduler, DELAY_MS, Runnable::run, refreshed::add);
    }

    @Test
    void oneMarkRefreshesTheKeyOnceAfterTheDelayAndNotOneMillisecondEarlier() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS - 1);
        assertEquals(List.of(), refreshed, "nothing is refreshed one millisecond before the delay");

        scheduler.advanceBy(1);
        assertEquals(List.of("a"), refreshed, "the key is refreshed exactly once at the delay");
    }

    @Test
    void threeMarksOfTheSameKeyInsideOneWindowGiveOneRefresh() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark("a");
        coalescer.mark("a");
        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(List.of("a"), refreshed, "a burst on one key collapses into one refresh");
    }

    @Test
    void differentKeysInOneWindowAreEachRefreshedOnce() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark("a");
        coalescer.mark("b");
        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(2, refreshed.size(), "two distinct keys give two refreshes");
        assertEquals(1, refreshed.stream().filter("a"::equals).count(), "a is refreshed once");
        assertEquals(1, refreshed.stream().filter("b"::equals).count(), "b is refreshed once");
    }

    @Test
    void aMarkAfterADrainRefreshesTheKeyAgainAfterAnotherFullDelay() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);
        assertEquals(List.of("a"), refreshed);

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS - 1);
        assertEquals(List.of("a"), refreshed, "the second window is a full delay long");

        scheduler.advanceBy(1);
        assertEquals(List.of("a", "a"), refreshed, "the key is refreshed again after a later edit");
    }

    @Test
    void everyMarkThatFindsAPendingTaskCancelsItAndCancelAllIsNeverCalled() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark("a");
        coalescer.mark("a");
        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(2, scheduler.cancelInvocations(),
                "the second and third mark each cancel the task the previous mark scheduled");
        assertEquals(0, scheduler.cancelAllInvocations(),
                "a scheduler shared with other work must never be cleared wholesale");
    }

    @Test
    void aNullKeySchedulesNothingAndRefreshesNothing() {
        DirtyFileCoalescer<String> coalescer = coalescer();

        coalescer.mark(null);
        scheduler.advanceBy(DELAY_MS);

        assertEquals(0, scheduler.pendingCount(), "no task is scheduled for a null key");
        assertEquals(0, scheduler.runCount(), "nothing ran");
        assertEquals(List.of(), refreshed, "nothing is refreshed");
    }

    @Test
    void aKeyMarkedFromInsideTheRefreshIsRefreshedInTheNextWindowNotLost() {
        List<String> seen = new ArrayList<>();
        DirtyFileCoalescer<String>[] holder = newHolder();
        holder[0] = new DirtyFileCoalescer<>(scheduler, DELAY_MS, Runnable::run, key -> {
            seen.add(key);
            if (seen.size() == 1) {
                holder[0].mark(key);
            }
        });

        holder[0].mark("a");
        scheduler.advanceBy(DELAY_MS);
        assertEquals(List.of("a"), seen, "the first window refreshes the key once");

        scheduler.advanceBy(DELAY_MS);
        assertEquals(List.of("a", "a"), seen, "the key marked during the refresh is refreshed next window");
    }

    @Test
    void theRefreshRunsThroughTheSuppliedUiThreadAndNotBeforeItRunsTheTask() {
        List<Runnable> recorded = new ArrayList<>();
        DirtyFileCoalescer<String> coalescer = new DirtyFileCoalescer<>(
                scheduler, DELAY_MS, recorded::add, refreshed::add);

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, recorded.size(), "the drain is handed to the ui-thread dispatcher");
        assertEquals(List.of(), refreshed, "nothing is refreshed until the dispatcher runs the task");

        recorded.get(0).run();
        assertEquals(List.of("a"), refreshed, "running the dispatched task performs the refresh");
    }

    @Test
    void aRefreshThatThrowsDoesNotStopTheRemainingKeysFromBeingRefreshed() {
        List<String> attempted = new ArrayList<>();
        DirtyFileCoalescer<String> coalescer = new DirtyFileCoalescer<>(
                scheduler, DELAY_MS, Runnable::run, key -> {
                    attempted.add(key);
                    if (attempted.size() == 1) {
                        throw new IllegalStateException("refresh failed for " + key);
                    }
                    refreshed.add(key);
                });

        coalescer.mark("a");
        coalescer.mark("b");
        coalescer.mark("c");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(3, attempted.size(), "every dirty key is attempted although the first refresh threw");
        assertEquals(2, refreshed.size(), "the two keys after the failing one are still refreshed");
        assertEquals(0, scheduler.pendingCount(), "nothing is left waiting for a drain that will not come");
    }

    @Test
    void aKeyWhoseRefreshThrewIsRefreshedAgainWhenItIsMarkedAgain() {
        int[] calls = {0};
        DirtyFileCoalescer<String> coalescer = new DirtyFileCoalescer<>(
                scheduler, DELAY_MS, Runnable::run, key -> {
                    calls[0]++;
                    if (calls[0] == 1) {
                        throw new IllegalStateException("refresh failed");
                    }
                    refreshed.add(key);
                });

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);
        assertEquals(List.of(), refreshed, "the first refresh threw");

        coalescer.mark("a");
        scheduler.advanceBy(DELAY_MS);
        assertEquals(List.of("a"), refreshed, "a later mark still refreshes the key");
    }

    @SuppressWarnings("unchecked")
    private static DirtyFileCoalescer<String>[] newHolder() {
        return new DirtyFileCoalescer[1];
    }
}
