package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link RestartGate}: coalescing, the adjacency edge, the ordering
 * edge, the zero-delay edge, the 1000 ms crash delay, and the in-flight rejection (#632).
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

    @Test
    void concurrentRequestsFromMultipleThreadsCoalesceIntoExactlyOneScheduledRestart() throws InterruptedException {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                        gate.request(500);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }
            ready.await();
            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "all threads must finish within the timeout");
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, scheduler.pendingCount(),
                "concurrent request() calls must coalesce into exactly one pending task, not one per racing caller");

        scheduler.advanceBy(500);

        assertEquals(1, action.runs(), "the coalesced restart must run exactly once");
    }

    @Test
    void requestReturnsTrueWhenItSchedulesAndTheRestartRunsOnce() {
        ManualScheduler scheduler = new ManualScheduler();
        CountingAction action = new CountingAction();
        RestartGate gate = new RestartGate(scheduler, action);

        boolean scheduled = gate.request(0);
        assertTrue(scheduled, "a request with nothing in flight must schedule and return true");

        scheduler.runPending();

        assertEquals(1, action.runs(), "the scheduled restart must still run once");
    }

    @Test
    void aRequestIssuedFromInsideTheRestartActionItselfIsDropped() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger runs = new AtomicInteger();
        AtomicReference<Boolean> reentrantResult = new AtomicReference<>();
        RestartGate[] gateHolder = new RestartGate[1];
        Runnable action = () -> {
            runs.incrementAndGet();
            reentrantResult.set(gateHolder[0].request(500));
        };
        RestartGate gate = new RestartGate(scheduler, action);
        gateHolder[0] = gate;

        gate.request(0);
        scheduler.runPending();

        assertEquals(Boolean.FALSE, reentrantResult.get(),
                "a request issued from inside the executing restart action must be dropped");
        assertEquals(0, scheduler.pendingCount(), "the dropped request must not schedule anything");
        assertEquals(1, runs.get(), "the total run count must remain one");
    }

    @Test
    void aRequestFromAnotherThreadWhileTheActionIsBlockedMidRestartIsDroppedAndTheActionRunsOnce()
            throws InterruptedException {
        ManualScheduler scheduler = new ManualScheduler();
        CountDownLatch actionStarted = new CountDownLatch(1);
        CountDownLatch releaseAction = new CountDownLatch(1);
        AtomicInteger runs = new AtomicInteger();
        Runnable action = () -> {
            runs.incrementAndGet();
            actionStarted.countDown();
            try {
                releaseAction.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(0);
        Thread runner = new Thread(scheduler::runPending);
        runner.start();

        assertTrue(actionStarted.await(5, TimeUnit.SECONDS), "the action must have started");

        AtomicReference<Boolean> otherThreadResult = new AtomicReference<>();
        Thread requester = new Thread(() -> otherThreadResult.set(gate.request(500)));
        requester.start();
        requester.join(5000);

        assertEquals(Boolean.FALSE, otherThreadResult.get(),
                "a request arriving while the action is mid-restart must be dropped");

        releaseAction.countDown();
        runner.join(5000);

        assertEquals(1, runs.get(), "the action must have run exactly once");
    }

    @Test
    void whenTheRestartActionThrowsTheInFlightFlagIsClearedAnyway() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger attempts = new AtomicInteger();
        Runnable action = () -> {
            int attempt = attempts.incrementAndGet();
            if (attempt == 1) {
                throw new RuntimeException("simulated restart failure");
            }
        };
        RestartGate gate = new RestartGate(scheduler, action);

        gate.request(0);
        assertThrows(RuntimeException.class, scheduler::runPending);

        assertFalse(gate.isRestartInFlight(), "the flag must be cleared even though the action threw");

        boolean secondRequestScheduled = gate.request(0);
        assertTrue(secondRequestScheduled, "the next request must schedule since the flag was cleared");

        scheduler.runPending();

        assertEquals(2, attempts.get(), "the second restart must actually run");
    }

    @Test
    void isRestartInFlightReflectsExecutionState() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicReference<Boolean> observedDuringRun = new AtomicReference<>();
        RestartGate[] gateHolder = new RestartGate[1];
        Runnable action = () -> observedDuringRun.set(gateHolder[0].isRestartInFlight());
        RestartGate gate = new RestartGate(scheduler, action);
        gateHolder[0] = gate;

        assertFalse(gate.isRestartInFlight(), "must be false before the first run");

        gate.request(0);
        scheduler.runPending();

        assertEquals(Boolean.TRUE, observedDuringRun.get(), "must be true while the action executes");
        assertFalse(gate.isRestartInFlight(), "must be false again after the action returns");
    }
}
