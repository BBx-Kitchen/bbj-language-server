package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DownloadGuardTest {

    @Test
    void twoSequentialAcquireCallsWithNoReleaseBetweenThemOnlyTheFirstWins() {
        DownloadGuard guard = new DownloadGuard();

        assertTrue(guard.tryAcquire(null));
        assertFalse(guard.tryAcquire(null));
    }

    @Test
    void exactlyOneOfEightConcurrentAcquireCallsWins() throws InterruptedException {
        DownloadGuard guard = new DownloadGuard();
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
                        if (guard.tryAcquire(null)) {
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

    @Test
    void releaseReturnsAttachedCompletionsInAttachmentOrder() {
        DownloadGuard guard = new DownloadGuard();
        Runnable c1 = () -> { };
        Runnable c2 = () -> { };
        Runnable c3 = () -> { };

        assertTrue(guard.tryAcquire(c1));
        assertFalse(guard.tryAcquire(c2));
        assertFalse(guard.tryAcquire(c3));

        List<Runnable> completions = guard.release();
        assertEquals(List.of(c1, c2, c3), completions);
    }

    @Test
    void releaseOnAFreshGuardReturnsAnEmptyListAndLeavesTheGuardAcquirable() {
        DownloadGuard guard = new DownloadGuard();

        assertTrue(guard.release().isEmpty());
        assertFalse(guard.isHeld());
        assertTrue(guard.tryAcquire(null));
    }

    @Test
    void acquireWithANullCallbackIsAcceptedAndAttachesNothing() {
        DownloadGuard guard = new DownloadGuard();

        assertTrue(guard.tryAcquire(null));
        assertTrue(guard.release().isEmpty());
    }

    @Test
    void afterAReleaseANewAcquireWinsAndTheSecondReleaseDoesNotRepeatDrainedCompletions() {
        DownloadGuard guard = new DownloadGuard();
        Runnable first = () -> { };

        assertTrue(guard.tryAcquire(first));
        List<Runnable> firstDrain = guard.release();
        assertEquals(List.of(first), firstDrain);

        assertTrue(guard.tryAcquire(null));
        List<Runnable> secondDrain = guard.release();
        assertTrue(secondDrain.isEmpty());
    }

    @Test
    void aLosersCallbackIsPresentInTheWinnersReleaseResultEvenThoughTheLoserNeverAcquired() {
        DownloadGuard guard = new DownloadGuard();
        Runnable winnerCallback = () -> { };
        Runnable loserCallback = () -> { };

        assertTrue(guard.tryAcquire(winnerCallback));
        assertFalse(guard.tryAcquire(loserCallback));

        assertTrue(guard.release().contains(loserCallback));
    }
}
