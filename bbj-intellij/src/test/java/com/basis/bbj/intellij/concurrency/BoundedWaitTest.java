package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BoundedWait#until}, entirely on a fake clock the fake pause
 * advances -- never a real timer, never a real sleep.
 */
class BoundedWaitTest {

    /** A mutable clock a fake {@link BoundedWait.Pause} advances by its own argument. */
    private static final class FakeClock {
        private long nowMs;

        long now() {
            return nowMs;
        }

        void advance(long millis) {
            nowMs += millis;
        }
    }

    /** Records every pause argument and advances {@code clock} by it before returning. */
    private static final class RecordingPause implements BoundedWait.Pause {
        private final FakeClock clock;
        private final List<Long> recorded = new ArrayList<>();
        private boolean interruptOnNextPause;

        RecordingPause(FakeClock clock) {
            this.clock = clock;
        }

        @Override
        public boolean pause(long millis) {
            recorded.add(millis);
            if (interruptOnNextPause) {
                return false;
            }
            clock.advance(millis);
            return true;
        }

        void interruptOnNextPause() {
            this.interruptOnNextPause = true;
        }

        List<Long> recorded() {
            return recorded;
        }
    }

    @Test
    void aConditionAlreadyTrueReturnsTrueWithZeroPauseInvocations() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);

        boolean result = BoundedWait.until(() -> true, 1000, 100, clock::now, pause);

        assertTrue(result);
        assertEquals(0, pause.recorded().size(), "an already-true condition must not pause at all");
    }

    @Test
    void aConditionThatBecomesTrueOnTheThirdPollReturnsTrueAfterExactlyThreePauses() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);
        int[] calls = {0};
        // First evaluation (before any pause) is false; the condition becomes true on the 4th
        // evaluation, i.e. after the 3rd poll.
        boolean result = BoundedWait.until(() -> {
            calls[0]++;
            return calls[0] >= 4;
        }, 1000, 100, clock::now, pause);

        assertTrue(result);
        assertEquals(3, pause.recorded().size(),
                "the condition became true on the third poll, so exactly three pauses must be recorded");
    }

    @Test
    void aConditionThatNeverHoldsReturnsFalseAndPauseArgumentsSumToNoMoreThanTheTimeout() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);

        boolean result = BoundedWait.until(() -> false, 1000, 300, clock::now, pause);

        assertFalse(result);
        long sum = pause.recorded().stream().mapToLong(Long::longValue).sum();
        assertTrue(sum <= 1000, "recorded pause arguments must sum to no more than the timeout, got " + sum);
    }

    @Test
    void aPauseReportingAnInterruptReturnsFalseImmediatelyAfterExactlyOnePauseWithoutReevaluating() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);
        pause.interruptOnNextPause();
        int[] calls = {0};

        boolean result = BoundedWait.until(() -> {
            calls[0]++;
            return false;
        }, 1000, 100, clock::now, pause);

        assertFalse(result);
        assertEquals(1, pause.recorded().size(), "exactly one pause must have been attempted");
        assertEquals(1, calls[0], "the condition must not be evaluated again after the interrupted pause");
    }

    @Test
    void aPollIntervalLargerThanTheRemainingBudgetIsClampedToTheRemainingBudget() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);

        boolean result = BoundedWait.until(() -> false, 250, 100, clock::now, pause);

        assertFalse(result);
        List<Long> recorded = pause.recorded();
        assertTrue(recorded.size() >= 1, "at least one pause must have been recorded");
        long lastPause = recorded.get(recorded.size() - 1);
        assertEquals(50L, lastPause, "the last pause must be clamped to the remaining budget, never more");
    }

    @Test
    void aTimeoutOfZeroEvaluatesTheConditionExactlyOnceWithZeroPauses() {
        FakeClock clock = new FakeClock();
        RecordingPause pause = new RecordingPause(clock);
        int[] calls = {0};

        boolean result = BoundedWait.until(() -> {
            calls[0]++;
            return false;
        }, 0, 100, clock::now, pause);

        assertFalse(result);
        assertEquals(1, calls[0], "the condition must be evaluated exactly once");
        assertEquals(0, pause.recorded().size(), "a zero timeout must never pause");
    }
}
