package com.basis.bbj.intellij.refresh;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Plain-JUnit coverage of {@link RefreshInFlightGuard}'s per-key single-flight behavior (#632). */
class RefreshInFlightGuardTest {

    @Test
    void firstAcquireForAKeyWinsASecondForTheSameKeyLoses() {
        RefreshInFlightGuard guard = new RefreshInFlightGuard();

        assertTrue(guard.tryAcquire("project-a"));
        assertFalse(guard.tryAcquire("project-a"));
    }

    @Test
    void acquireForADifferentKeyWhileTheFirstIsHeldSucceeds() {
        RefreshInFlightGuard guard = new RefreshInFlightGuard();

        assertTrue(guard.tryAcquire("project-a"));
        assertTrue(guard.tryAcquire("project-b"));
    }

    @Test
    void afterReleaseTheSameKeyCanBeAcquiredAgain() {
        RefreshInFlightGuard guard = new RefreshInFlightGuard();

        assertTrue(guard.tryAcquire("project-a"));
        guard.release("project-a");
        assertTrue(guard.tryAcquire("project-a"));
    }

    @Test
    void releasingAKeyThatWasNeverAcquiredLeavesTheGuardUnchangedAndDoesNotThrow() {
        RefreshInFlightGuard guard = new RefreshInFlightGuard();

        guard.release("never-acquired");

        assertFalse(guard.isHeld("never-acquired"));
        assertTrue(guard.tryAcquire("never-acquired"));
    }

    @Test
    void exactlyOneOfEightConcurrentAcquireCallsForTheSameKeyWins() throws InterruptedException {
        RefreshInFlightGuard guard = new RefreshInFlightGuard();
        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        AtomicInteger winners = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                        if (guard.tryAcquire("shared-key")) {
                            winners.incrementAndGet();
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
        assertEquals(1, winners.get());
    }
}
