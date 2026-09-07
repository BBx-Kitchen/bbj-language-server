package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static com.basis.bbj.intellij.concurrency.ExpectedStopGuard.StopKind.CRASH;
import static com.basis.bbj.intellij.concurrency.ExpectedStopGuard.StopKind.EXPECTED_RESTART_STOP;
import static com.basis.bbj.intellij.concurrency.ExpectedStopGuard.StopKind.NOT_A_STOP;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link ExpectedStopGuard}: the not-a-stop heuristic, the unarmed crash
 * default, arming, one-shot consumption, expiry, the inclusive boundary, disarm, non-consuming
 * NOT_A_STOP transitions, and concurrent classification of one armed token.
 */
class ExpectedStopGuardTest {

    private static final long WINDOW_MS = 30_000;

    @Test
    void transitionsThatAreNotLiveToStoppedAreNotAStop() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        assertEquals(NOT_A_STOP, guard.classify("stopped", "stopping", 0));
        assertEquals(NOT_A_STOP, guard.classify("started", "stopped", 0));
        assertEquals(NOT_A_STOP, guard.classify(null, "started", 0));
        assertEquals(NOT_A_STOP, guard.classify("stopped", null, 0));
        assertEquals(NOT_A_STOP, guard.classify("unknown", "started", 0));
        assertEquals(NOT_A_STOP, guard.classify("stopped", "unknown", 0));
    }

    @Test
    void stoppedAfterStartedWithNothingArmedIsACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        assertEquals(CRASH, guard.classify("stopped", "started", 0));
    }

    @Test
    void stoppedAfterStartingWithNothingArmedIsACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        assertEquals(CRASH, guard.classify("stopped", "starting", 0));
    }

    @Test
    void stoppedAfterStartedWhileArmedIsAnExpectedRestartStop() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", 100));
    }

    @Test
    void anExpectedRestartStopIsOneShot() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", 100));
        assertEquals(CRASH, guard.classify("stopped", "started", 200),
            "a second identical transition must not re-consume the already-spent token");
    }

    @Test
    void anArmedTokenPastTheWindowExpiresAndIsDiscarded() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(CRASH, guard.classify("stopped", "started", WINDOW_MS + 1),
            "a token classified past the window must expire into a crash verdict");

        guard.arm(WINDOW_MS + 1);
        assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", WINDOW_MS + 1 + 100),
            "the stale token must have been discarded so a later armed classification still works");
    }

    @Test
    void anArmedTokenAtExactlyTheWindowBoundaryIsStillExpected() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", WINDOW_MS));
    }

    @Test
    void disarmDropsTheTokenSoTheNextTransitionIsACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);
        guard.disarm();

        assertEquals(CRASH, guard.classify("stopped", "started", 100));
    }

    @Test
    void aNotAStopTransitionClassifiedWhileArmedDoesNotConsumeTheToken() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(NOT_A_STOP, guard.classify("starting", "stopped", 50));
        assertEquals(EXPECTED_RESTART_STOP, guard.classify("stopped", "started", 100),
            "a following live-to-stopped transition must still find the token armed");
    }

    @Test
    void oneArmedTokenClassifiedByEightConcurrentThreadsYieldsExactlyOneExpectedVerdict()
            throws InterruptedException {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);
        guard.arm(0);

        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        AtomicInteger expectedCount = new AtomicInteger();
        AtomicInteger crashCount = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                        ExpectedStopGuard.StopKind verdict = guard.classify("stopped", "started", 100);
                        if (verdict == EXPECTED_RESTART_STOP) {
                            expectedCount.incrementAndGet();
                        } else if (verdict == CRASH) {
                            crashCount.incrementAndGet();
                        }
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

        assertEquals(1, expectedCount.get(), "exactly one thread must observe the armed token");
        assertEquals(threadCount - 1, crashCount.get(), "every other thread must observe a crash");
    }
}
