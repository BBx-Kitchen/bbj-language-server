package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage that a failure-marked result travels {@link KeystrokeDebouncer}'s delivery
 * machinery exactly like a success result: staleness-checked, delivered exactly once through the
 * UI-thread hook, and never through any second route. Lives in this package (not {@code lsp} or
 * the root package) because {@link ManualScheduler} is package-private here. Generic over a small
 * local result type carrying a boolean failure flag, so it exercises the delivery machinery
 * without importing the Settings lookups — that package-private class is unreachable from here,
 * and the contract under test belongs to the debouncer, not to the lookups.
 */
class DebouncedLookupFailureDeliveryTest {

    private static final ThreadProbe NOT_EDT = () -> false;
    private static final KeystrokeDebouncer.UiThread SAME_THREAD = Runnable::run;
    private static final long DELAY_MS = 300L;

    /** A minimal local result carrying a failure flag and a payload, mirroring the shape of the
     * production {@code NodeLookup}/{@code HomeLookup} records without depending on either. */
    private record Result(boolean failed, String payload) {
    }

    @Test
    void aFailureMarkedResultIsDeliveredThroughTheUiHookExactlyOnce() {
        ManualScheduler scheduler = new ManualScheduler();
        List<Result> applied = new ArrayList<>();
        KeystrokeDebouncer<Result> debouncer = new KeystrokeDebouncer<>(
                scheduler, NOT_EDT, DELAY_MS, () -> "x", SAME_THREAD,
                text -> new Result(true, text), applied::add);

        debouncer.onTextChanged("x");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, applied.size(), "the apply sink must receive exactly one result");
        assertTrue(applied.get(0).failed(), "the delivered result must be the failed one");
    }

    @Test
    void aFailureMarkedResultIsDiscardedWhenTheFieldTextChangedBeforeTheLookupRan() {
        ManualScheduler scheduler = new ManualScheduler();
        List<Result> applied = new ArrayList<>();
        int[] lookupCount = {0};
        String[] currentTextHolder = {"original"};
        KeystrokeDebouncer<Result> debouncer = new KeystrokeDebouncer<>(
                scheduler, NOT_EDT, DELAY_MS, () -> currentTextHolder[0], SAME_THREAD,
                text -> {
                    lookupCount[0]++;
                    return new Result(true, text);
                },
                applied::add);

        debouncer.onTextChanged("original");
        currentTextHolder[0] = "changed-before-lookup-ran";
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, lookupCount[0], "the lookup itself still runs");
        assertEquals(0, applied.size(),
                "a stale failure result must be discarded exactly like a stale success result");
    }

    @Test
    void aUiHookThatDropsItsRunnablePreventsTheFailureFromBeingApplied() {
        ManualScheduler scheduler = new ManualScheduler();
        List<Result> applied = new ArrayList<>();
        KeystrokeDebouncer.UiThread droppingHook = task -> { /* drops the runnable */ };
        KeystrokeDebouncer<Result> debouncer = new KeystrokeDebouncer<>(
                scheduler, NOT_EDT, DELAY_MS, () -> "x", droppingHook,
                text -> new Result(true, text), applied::add);

        debouncer.onTextChanged("x");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(0, applied.size(),
                "a hook that drops its runnable must prevent the failure from being applied — "
                        + "there is no second delivery route");
    }

    @Test
    void threeRapidKeystrokesEndingInAFailingLookupProduceExactlyOneApply() {
        ManualScheduler scheduler = new ManualScheduler();
        List<Result> applied = new ArrayList<>();
        int[] lookupCount = {0};
        String[] currentTextHolder = {"c"};
        KeystrokeDebouncer<Result> debouncer = new KeystrokeDebouncer<>(
                scheduler, NOT_EDT, DELAY_MS, () -> currentTextHolder[0], SAME_THREAD,
                text -> {
                    lookupCount[0]++;
                    return new Result(true, text);
                },
                applied::add);

        debouncer.onTextChanged("a");
        debouncer.onTextChanged("b");
        debouncer.onTextChanged("c");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, lookupCount[0], "coalescing must still leave exactly one lookup");
        assertEquals(1, applied.size(), "exactly one apply for the surviving, failing lookup");
        assertTrue(applied.get(0).failed());
    }

    @Test
    void aLookupThatThrowsStillEscapesTheScheduledTask() {
        ManualScheduler scheduler = new ManualScheduler();
        KeystrokeDebouncer<Result> debouncer = new KeystrokeDebouncer<>(
                scheduler, NOT_EDT, DELAY_MS, () -> "x", SAME_THREAD,
                text -> {
                    throw new IllegalStateException("a lookup function that still throws");
                },
                result -> { });

        debouncer.onTextChanged("x");

        assertThrows(IllegalStateException.class, () -> scheduler.advanceBy(DELAY_MS),
                "a lookup function that throws escapes the scheduled task — this is the executable "
                        + "reason the Settings lookups themselves must never throw");
    }
}
