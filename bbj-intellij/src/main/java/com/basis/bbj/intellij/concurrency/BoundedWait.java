package com.basis.bbj.intellij.concurrency;

import java.util.function.BooleanSupplier;
import java.util.function.LongSupplier;

/**
 * Bounded poll-until-true helper over an injectable clock and pause seam. Plain Java, no {@code
 * com.intellij} import and no vendor LSP4IJ import, so plain JUnit drives every branch on a fake
 * clock with no real delay.
 */
public final class BoundedWait {

    /** Pauses the caller for approximately {@code millis} milliseconds. */
    @FunctionalInterface
    public interface Pause {
        /**
         * @param millis how long to pause, in milliseconds
         * @return {@code true} if the pause completed normally, {@code false} if it was
         *     interrupted
         */
        boolean pause(long millis);
    }

    /**
     * The production {@link Pause}: sleeps for the requested duration, restoring the thread's
     * interrupt flag and returning {@code false} when interrupted. This is the one place in this
     * codebase allowed to call {@code Thread.sleep} -- the negative grep guarding {@code
     * BbjServerService.java} targets that file only, which is exactly why the pause lives here
     * instead of there.
     */
    public static final Pause SLEEPING = millis -> {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    };

    private BoundedWait() {
    }

    /**
     * Polls {@code condition} until it is {@code true} or {@code timeoutMs} milliseconds have
     * elapsed (per {@code clockMs}). Evaluates {@code condition} once before pausing at all; if it
     * is already {@code true}, returns {@code true} immediately with no pause. Otherwise pauses for
     * the smaller of {@code pollMs} and the remaining budget, re-evaluating after each pause, until
     * the condition holds ({@code true}), the pause reports an interrupt ({@code false}, at once),
     * or the timeout elapses ({@code false}). Never throws and never propagates an interrupt as an
     * exception.
     */
    public static boolean until(BooleanSupplier condition, long timeoutMs, long pollMs,
            LongSupplier clockMs, Pause pause) {
        long start = clockMs.getAsLong();

        if (condition.getAsBoolean()) {
            return true;
        }

        while (clockMs.getAsLong() - start < timeoutMs) {
            long elapsed = clockMs.getAsLong() - start;
            long remaining = timeoutMs - elapsed;
            long thisPoll = Math.min(pollMs, remaining);

            boolean pausedNormally = pause.pause(thisPoll);
            if (!pausedNormally) {
                return false;
            }

            if (condition.getAsBoolean()) {
                return true;
            }
        }

        return false;
    }
}
