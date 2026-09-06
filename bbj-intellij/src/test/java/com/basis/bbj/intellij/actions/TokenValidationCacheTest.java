package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BooleanSupplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link TokenValidationCache}, driven entirely through an injected
 * mutable clock and a counting {@link BooleanSupplier} standing in for the server-side
 * validation subprocess -- no real EM server, wall clock, or {@code bbj} process is touched
 * (#542).
 */
class TokenValidationCacheTest {

    private static final String TOKEN_A = "token-a";
    private static final String TOKEN_B = "token-b";

    /** A counting double for the server-side validation subprocess. */
    private static final class CountingSupplier implements BooleanSupplier {
        private final AtomicInteger calls = new AtomicInteger();
        private final boolean result;

        CountingSupplier(boolean result) {
            this.result = result;
        }

        @Override
        public boolean getAsBoolean() {
            calls.incrementAndGet();
            return result;
        }

        int callCount() {
            return calls.get();
        }
    }

    private static TokenValidationCache newCache(long[] clock) {
        return new TokenValidationCache(() -> clock[0]);
    }

    @Test
    void twoRunInvocationsInQuickSuccessionWithTheSameTokenValidateAtMostOnce() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        boolean first = cache.validateThrough(TOKEN_A, counting);
        boolean second = cache.validateThrough(TOKEN_A, counting);

        assertTrue(first);
        assertTrue(second);
        assertEquals(1, counting.callCount());
    }

    @Test
    void theWindowExpiresAndTheNextRunValidatesAgain() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        cache.validateThrough(TOKEN_A, counting);
        cache.validateThrough(TOKEN_A, counting);
        clock[0] += TokenValidationCache.TRUST_WINDOW_MS + 1;
        boolean third = cache.validateThrough(TOKEN_A, counting);

        assertTrue(third);
        assertEquals(2, counting.callCount());
    }

    @Test
    void invalidateForcesTheNextRunToValidate() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        cache.validateThrough(TOKEN_A, counting); // miss: validates, counter=1
        cache.validateThrough(TOKEN_A, counting); // hit: no call, counter stays 1
        cache.invalidate();
        cache.validateThrough(TOKEN_A, counting); // miss again after invalidate: counter=2
        cache.validateThrough(TOKEN_A, counting); // hit again on the fresh record: counter stays 2

        assertEquals(2, counting.callCount());
    }

    @Test
    void aDifferentTokenValueIsAMiss() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        cache.validateThrough(TOKEN_A, counting);
        cache.validateThrough(TOKEN_B, counting);

        assertEquals(2, counting.callCount());
        assertFalse(cache.isTrusted(TOKEN_A));
    }

    @Test
    void aFailedServerValidationIsNeverRecorded() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier failing = new CountingSupplier(false);

        boolean first = cache.validateThrough(TOKEN_A, failing);
        boolean second = cache.validateThrough(TOKEN_A, failing);

        assertFalse(first);
        assertFalse(second);
        assertFalse(cache.hasEntry());
        assertEquals(2, failing.callCount());
    }

    @Test
    void aSecondCallInsideTheWindowDoesNotExtendIt() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        cache.validateThrough(TOKEN_A, counting); // t=0, miss: counter=1
        clock[0] = TokenValidationCache.TRUST_WINDOW_MS / 2;
        cache.validateThrough(TOKEN_A, counting); // still within window from t=0: hit, no slide

        clock[0] = TokenValidationCache.TRUST_WINDOW_MS + 1; // past the ORIGINAL window
        boolean third = cache.validateThrough(TOKEN_A, counting);

        assertTrue(third);
        assertEquals(2, counting.callCount());
    }

    @Test
    void aCallExactlyAtTheWindowBoundaryIsStillTrusted() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);

        cache.validateThrough(TOKEN_A, counting); // t=0, miss: counter=1

        clock[0] = TokenValidationCache.TRUST_WINDOW_MS; // exactly at the boundary
        assertTrue(cache.isTrusted(TOKEN_A));

        clock[0] = TokenValidationCache.TRUST_WINDOW_MS + 1; // one millisecond later
        assertFalse(cache.isTrusted(TOKEN_A));
    }

    @Test
    void aNullOrEmptyTokenIsNeverTrustedAndIsNeverRecorded() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier alwaysTrue = new CountingSupplier(true);

        assertFalse(cache.isTrusted(null));
        assertFalse(cache.isTrusted(""));

        boolean result = cache.validateThrough(null, alwaysTrue);

        assertTrue(result);
        assertFalse(cache.hasEntry());
    }

    @Test
    void aMalformedTokenNeverReachesTheTrustedPathAndNeverEntersTheCache() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);
        String malformedToken = "not-a-jwt";

        // Reproduces the run actions' two-step gate: the fail-closed expiry check runs first,
        // and a MALFORMED classification never lets execution reach validateThrough at all.
        JwtValidity.Result classification = JwtValidity.check(malformedToken, 0L);
        if (classification == JwtValidity.Result.VALID) {
            cache.validateThrough(malformedToken, counting);
        }

        assertEquals(JwtValidity.Result.MALFORMED, classification);
        assertEquals(0, counting.callCount());
        assertFalse(cache.hasEntry());
    }

    @Test
    void eightConcurrentColdCacheCallsPerformAtMostTwoValidationsAndLeaveOneCoherentEntry() throws InterruptedException {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);
        CountingSupplier counting = new CountingSupplier(true);
        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    boolean result = cache.validateThrough(TOKEN_A, counting);
                    assertTrue(result);
                });
            }
            ready.await();
            start.countDown();
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }

        assertTrue(cache.hasEntry());
        assertTrue(cache.isTrusted(TOKEN_A));
        int calls = counting.callCount();
        assertTrue(calls >= 1 && calls <= threadCount,
                "expected a coherent entry from a cold-cache race, got " + calls + " calls");

        // A subsequent call inside the window adds nothing to the counter.
        cache.validateThrough(TOKEN_A, counting);
        assertEquals(calls, counting.callCount());
    }

    @Test
    void recordingASecondTokenReplacesTheFirstRatherThanAccumulating() {
        long[] clock = {0L};
        TokenValidationCache cache = newCache(clock);

        cache.recordValidated(TOKEN_A);
        cache.recordValidated(TOKEN_B);

        assertFalse(cache.isTrusted(TOKEN_A));
        assertTrue(cache.isTrusted(TOKEN_B));
    }
}
