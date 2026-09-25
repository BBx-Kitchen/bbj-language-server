package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static com.basis.bbj.intellij.concurrency.ExpectedStopGuard.StopKind.CRASH;
import static com.basis.bbj.intellij.concurrency.ExpectedStopGuard.StopKind.EXPECTED_RESTART_STOP;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link ExpectedStopGuard#classifyExit(long)}: the unarmed crash
 * default, arming, one-shot consumption, expiry, the inclusive boundary, disarm, and concurrent
 * classification of one armed token.
 */
class ExpectedStopGuardTest {

    private static final long WINDOW_MS = 30_000;

    /**
     * Behavioural coverage for {@code classifyExit(long)}: an unexpected process exit is a crash
     * unless a prior {@link ExpectedStopGuard#arm(long)} explains it within the window.
     */
    @Test
    void classifyExitWithNothingArmedIsACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        assertEquals(CRASH, guard.classifyExit(100));
    }

    @Test
    void classifyExitWhileArmedIsAnExpectedRestartStop() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(100));
    }

    @Test
    void classifyExitConsumesTheArmedTokenOnce() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(100));
        assertEquals(CRASH, guard.classifyExit(200),
            "a second unexpected exit must not re-consume the already-spent token");
    }

    @Test
    void classifyExitPastTheWindowExpiresTheTokenAndReturnsCrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(CRASH, guard.classifyExit(WINDOW_MS + 1),
            "an exit classified past the window must expire the token into a crash verdict");

        guard.arm(WINDOW_MS + 1);
        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(WINDOW_MS + 1 + 100),
            "the stale token must have been discarded so a later armed classification still works");
    }

    @Test
    void classifyExitAtExactlyTheWindowBoundaryIsStillExpected() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);

        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(WINDOW_MS));
    }

    @Test
    void classifyExitAfterDisarmIsACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);
        guard.disarm();

        assertEquals(CRASH, guard.classifyExit(100));
    }

    @Test
    void oneArmedTokenClassifiedByEightConcurrentExitsYieldsExactlyOneExpectedVerdict()
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
                        ExpectedStopGuard.StopKind verdict = guard.classifyExit(100);
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
