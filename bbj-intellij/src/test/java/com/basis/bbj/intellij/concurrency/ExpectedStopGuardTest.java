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

    /**
     * Pid identity is authoritative and overrides the time window entirely: a report bearing the
     * pid the token was armed for is expected however long it takes to arrive, well past the
     * nominal window -- this is what lets a delayed exit of the process a restart actually stopped
     * still be told apart from a crash, without relying on a disarm-on-timeout race.
     */
    @Test
    void classifyExitWithAMatchingPidPastTheWindowIsStillAnExpectedRestartStop() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0, 4242L);

        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(WINDOW_MS * 10, 4242L),
            "a report bearing the armed pid must be expected no matter how far past the window "
                + "it arrives");
    }

    /**
     * The mirror image: a report bearing a pid other than the one the token was armed for is
     * always a crash, even inside the window -- this is what lets a genuine crash of a freshly
     * started server be reported as a crash even while a restart's token for the previous process
     * is still technically armed.
     */
    @Test
    void classifyExitWithAMismatchedPidInsideTheWindowIsStillACrash() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0, 4242L);

        assertEquals(CRASH, guard.classifyExit(100, 9999L),
            "a report bearing a different pid than the armed token must be a crash, even inside "
                + "the window");
    }

    /**
     * When either side's pid is unavailable, classification falls back to the plain time window,
     * exactly as it did before pid correlation existed.
     */
    @Test
    void classifyExitFallsBackToTheWindowWhenEitherPidIsUnknown() {
        ExpectedStopGuard armedWithoutPid = new ExpectedStopGuard(WINDOW_MS);
        armedWithoutPid.arm(0);
        assertEquals(EXPECTED_RESTART_STOP, armedWithoutPid.classifyExit(100, 4242L),
            "a report with a pid must still be expected when the token itself carries no pid");

        ExpectedStopGuard armedWithPid = new ExpectedStopGuard(WINDOW_MS);
        armedWithPid.arm(0, 4242L);
        assertEquals(EXPECTED_RESTART_STOP, armedWithPid.classifyExit(100, null),
            "a report with no pid must still be expected, within the window, when the token "
                + "carries a pid");
        assertEquals(CRASH, armedWithPid.classifyExit(WINDOW_MS + 1, null),
            "a report with no pid past the window must still be a crash even when the token "
                + "carries a pid");
    }

    /**
     * {@link ExpectedStopGuard#notePid(Long)} attaches a pid to an already-armed token, and is a
     * no-op when nothing is armed -- it never resurrects an already-consumed or never-armed token.
     */
    @Test
    void notePidAttachesToAnArmedTokenAndIsANoOpWhenNothingIsArmed() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.notePid(4242L);
        assertEquals(CRASH, guard.classifyExit(100, 4242L),
            "notePid must not arm a token by itself");

        guard.arm(0);
        guard.notePid(4242L);
        assertEquals(EXPECTED_RESTART_STOP, guard.classifyExit(WINDOW_MS * 10, 4242L),
            "notePid must attach the pid to the token armed just before it");
    }

    /**
     * Only the first pid noted after arming sticks. LSP4IJ stops a crashed server before the
     * crash is reported, so a stale token must not be re-targeted onto the crashed process.
     */
    @Test
    void notePidKeepsTheFirstNotedPidSoALaterStopCannotRetargetTheToken() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0);
        guard.notePid(1111L);
        guard.notePid(2222L);

        assertEquals(CRASH, guard.classifyExit(WINDOW_MS * 10, 2222L),
            "a crash of a different process must stay a crash after its own stop noted its pid");
    }

    /** {@code disarm()} must drop the armed pid along with the timestamp. */
    @Test
    void disarmDropsTheArmedPidToo() {
        ExpectedStopGuard guard = new ExpectedStopGuard(WINDOW_MS);

        guard.arm(0, 4242L);
        guard.disarm();

        assertEquals(CRASH, guard.classifyExit(100, 4242L),
            "disarm must drop the armed pid, not only the timestamp");
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
