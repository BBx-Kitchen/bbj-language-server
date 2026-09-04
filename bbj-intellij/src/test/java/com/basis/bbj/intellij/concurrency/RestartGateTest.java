package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for {@link RestartGate}: coalescing, the adjacency edge, the ordering
 * edge, the zero-delay edge, and (extended in Task 3) the 1000 ms crash delay.
 */
class RestartGateTest {

    private static final class CountingAction implements Runnable {
        private final AtomicInteger runs = new AtomicInteger();

        @Override
        public void run() {
            runs.incrementAndGet();
        }

        int runs() {
            return runs.get();
        }
    }

    @Test
    void twoRequestsWithNoTimeAdvancedBetweenThemProduceExactlyOneRestart() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(500);
        gate.request(500);
        scheduler.advanceBy(501);

        assertEquals(1, action.runs(), "two overlapping requests must coalesce into one restart");
    }

    @Test
    void aZeroDelayRequestIsScheduledNotRunInline() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(0);

        assertEquals(0, action.runs(), "a zero-delay request must not run at the moment request() is called");

        scheduler.runPending();

        assertEquals(1, action.runs(), "the zero-delay request must run once pending work is executed");
    }

    @Test
    void aRequestAfterTheWindowClosedOpensANewWindow() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(1000);
        scheduler.advanceBy(1000);
        assertEquals(1, action.runs(), "the first window must have fired by now");

        gate.request(0);
        scheduler.runPending();

        assertEquals(2, action.runs(), "a request after the window closed must open a new window and restart again");
    }

    @Test
    void whenTwoDelaysAreRequestedTheLaterRequestsDelayWins() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(1000);
        gate.request(0);

        assertEquals(1, scheduler.pendingCount(), "the earlier request must have been cancelled, leaving one pending task");
        assertEquals(0L, scheduler.onlyPendingDelay(), "the later request's delay must win regardless of which delay was larger");

        scheduler.runPending();

        assertEquals(1, action.runs(), "exactly one restart must run despite two requests");
    }

    @Test
    void coalescingGoesThroughCancelNotABusyFlag() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(500);
        assertEquals(1, scheduler.cancelAllInvocations(), "the first request must still cancel any (empty) pending set before scheduling");

        gate.request(500);
        assertEquals(2, scheduler.cancelAllInvocations(),
                "the second request must cancel the first request's pending task before scheduling, not skip via a busy flag");
    }

    @Test
    void theCrashDelayIsAScheduledDelayNotAnOccupiedThread() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(1000);
        scheduler.advanceBy(999);
        assertEquals(0, action.runs(), "nothing has run yet 1 ms before the crash delay elapses");

        scheduler.advanceBy(1);
        assertEquals(1, action.runs(), "the restart must run exactly once once the full 1000 ms delay has elapsed");
    }

    @Test
    void aManualTriggerArrivingDuringThePendingFirstCrashDelayMergesIntoIt() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(1000);
        gate.request(0);
        scheduler.runPending();

        assertEquals(1, action.runs(),
                "a manual trigger arriving before the first-crash delay fires must merge into it, not add a second restart");
    }
}
