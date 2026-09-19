package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link EmTokenValidator}, driven through a counting fake
 * {@link EmTokenValidator.ValidationRunner} standing in for the subprocess spawn -- no real BBj
 * install, EM server, or filesystem write is touched. The trusted path reads the shared
 * production {@link TokenValidationCache#SESSION}, so it is invalidated before and after every
 * test to keep cases from polluting one another.
 */
class EmTokenValidatorTest {

    private static final String BBJ_PATH = "/opt/bbx/bin/bbj";
    private static final String SCRIPT_PATH = "/opt/plugin/lib/tools/em-validate-token.bbj";
    private static final String TOKEN = "token-under-test";

    @BeforeEach
    void invalidateSharedCacheBefore() {
        TokenValidationCache.SESSION.invalidate();
    }

    @AfterEach
    void invalidateSharedCacheAfter() {
        TokenValidationCache.SESSION.invalidate();
    }

    /** A counting fake standing in for the BBj subprocess spawn. */
    private static final class CountingRunner implements EmTokenValidator.ValidationRunner {
        private final AtomicInteger calls = new AtomicInteger();
        private final String result;
        private final RuntimeException toThrow;

        private CountingRunner(String result, RuntimeException toThrow) {
            this.result = result;
            this.toThrow = toThrow;
        }

        static CountingRunner returning(String result) {
            return new CountingRunner(result, null);
        }

        static CountingRunner throwing(RuntimeException toThrow) {
            return new CountingRunner(null, toThrow);
        }

        @Override
        public String run(String bbjPath, String scriptPath, String token) throws Exception {
            calls.incrementAndGet();
            if (toThrow != null) {
                throw toThrow;
            }
            return result;
        }

        int callCount() {
            return calls.get();
        }
    }

    @Test
    void aSecondCallInsideTheTrustWindowInvokesTheRunnerZeroAdditionalTimes() {
        CountingRunner runner = CountingRunner.returning("VALID");
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean first = validator.validateTokenTrusted(BBJ_PATH, SCRIPT_PATH, TOKEN);
        boolean second = validator.validateTokenTrusted(BBJ_PATH, SCRIPT_PATH, TOKEN);

        assertTrue(first);
        assertTrue(second);
        assertEquals(1, runner.callCount());
    }

    @Test
    void aCacheMissWithAValidSentinelReturnsTrueAndInvokesTheRunnerExactlyOnce() {
        CountingRunner runner = CountingRunner.returning("VALID");
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean result = validator.validateTokenServerSide(BBJ_PATH, SCRIPT_PATH, TOKEN);

        assertTrue(result);
        assertEquals(1, runner.callCount());
    }

    @Test
    void aCacheMissWithANonValidSentinelReturnsFalseAndTheNextCallInvokesTheRunnerAgain() {
        CountingRunner runner = CountingRunner.returning("EXPIRED");
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean first = validator.validateTokenTrusted(BBJ_PATH, SCRIPT_PATH, TOKEN);
        boolean second = validator.validateTokenTrusted(BBJ_PATH, SCRIPT_PATH, TOKEN);

        assertFalse(first);
        assertFalse(second);
        assertEquals(2, runner.callCount());
    }

    @Test
    void aNullBbjPathReturnsFalseAndTheRunnerIsNeverInvoked() {
        CountingRunner runner = CountingRunner.returning("VALID");
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean result = validator.validateTokenServerSide(null, SCRIPT_PATH, TOKEN);

        assertFalse(result);
        assertEquals(0, runner.callCount());
    }

    @Test
    void aNullScriptPathReturnsFalseAndTheRunnerIsNeverInvoked() {
        CountingRunner runner = CountingRunner.returning("VALID");
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean result = validator.validateTokenServerSide(BBJ_PATH, null, TOKEN);

        assertFalse(result);
        assertEquals(0, runner.callCount());
    }

    @Test
    void aThrowingRunnerReturnsFalseRatherThanPropagating() {
        CountingRunner runner = CountingRunner.throwing(new RuntimeException("boom"));
        EmTokenValidator validator = new EmTokenValidator(runner);

        boolean result = validator.validateTokenServerSide(BBJ_PATH, SCRIPT_PATH, TOKEN);

        assertFalse(result);
        assertEquals(1, runner.callCount());
    }
}
