package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

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
}
