package com.basis.bbj.intellij.refresh;

import com.basis.bbj.intellij.refresh.JavaClassesRefreshFlow.Outcome;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshFlow.Result;
import org.junit.jupiter.api.Test;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Plain-JUnit coverage of {@link JavaClassesRefreshFlow}'s outcome classification (#632). */
class JavaClassesRefreshFlowTest {

    private static final long BUDGET = 60;

    @Test
    void timeoutConstantIsSixty() {
        assertEquals(60, JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS);
    }

    @Test
    void trueYieldsRefreshedWithNullDetail() {
        AtomicLong observedBudget = new AtomicLong();
        Result result = JavaClassesRefreshFlow.run(seconds -> {
            observedBudget.set(seconds);
            return Boolean.TRUE;
        }, BUDGET);

        assertEquals(Outcome.REFRESHED, result.outcome());
        assertNull(result.detail());
        assertEquals(BUDGET, observedBudget.get());
    }

    @Test
    void falseYieldsDeclined() {
        Result result = JavaClassesRefreshFlow.run(seconds -> Boolean.FALSE, BUDGET);

        assertEquals(Outcome.DECLINED, result.outcome());
    }

    @Test
    void nullYieldsServerUnavailableWithNullDetail() {
        Result result = JavaClassesRefreshFlow.run(seconds -> null, BUDGET);

        assertEquals(Outcome.SERVER_UNAVAILABLE, result.outcome());
        assertNull(result.detail());
    }

    @Test
    void timeoutExceptionYieldsTimedOut() {
        Result result = JavaClassesRefreshFlow.run(seconds -> {
            throw new TimeoutException("no response in time");
        }, BUDGET);

        assertEquals(Outcome.TIMED_OUT, result.outcome());
        assertNotNull(result.detail());
        assertTrue(result.detail().contains("no response in time"));
    }

    @Test
    void executionExceptionYieldsRequestFailedWithWrappedMessage() {
        Result result = JavaClassesRefreshFlow.run(seconds -> {
            throw new ExecutionException(new RuntimeException("boom"));
        }, BUDGET);

        assertEquals(Outcome.REQUEST_FAILED, result.outcome());
        assertNotNull(result.detail());
        assertTrue(result.detail().contains("boom"));
    }

    @Test
    void interruptedExceptionYieldsRequestFailedAndResetsInterruptFlag() {
        try {
            Result result = JavaClassesRefreshFlow.run(seconds -> {
                throw new InterruptedException("interrupted while waiting");
            }, BUDGET);

            assertEquals(Outcome.REQUEST_FAILED, result.outcome());
            assertNotNull(result.detail());
            assertTrue(result.detail().contains("interrupted while waiting"));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            // Clear the interrupt flag so it cannot leak into a sibling test.
            Thread.interrupted();
        }
    }

    @Test
    void budgetPassedToRunIsTheValueTheLambdaObserves() {
        AtomicLong observedBudget = new AtomicLong();
        JavaClassesRefreshFlow.run(seconds -> {
            observedBudget.set(seconds);
            return Boolean.TRUE;
        }, 42);

        assertEquals(42, observedBudget.get());
    }
}
