package com.basis.bbj.intellij.concurrency;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Behavioural coverage for {@link KeystrokeDebouncer}, driven entirely by {@link ManualScheduler}
 * (never a real timer or a sleep, D-02) and a fixed {@link ThreadProbe}.
 */
class KeystrokeDebouncerTest {

    private static final ThreadProbe NOT_EDT = () -> false;
    private static final ThreadProbe ON_EDT = () -> true;
    private static final KeystrokeDebouncer.UiThread SAME_THREAD = Runnable::run;
    private static final long DELAY_MS = 300L;

    private static KeystrokeDebouncer<String> newDebouncer(
            Scheduler scheduler,
            ThreadProbe threadProbe,
            Supplier<String> currentText,
            KeystrokeDebouncer.UiThread uiThread,
            Function<String, String> lookup,
            Consumer<String> apply) {
        return new KeystrokeDebouncer<>(scheduler, threadProbe, DELAY_MS, currentText, uiThread, lookup, apply);
    }

    @Test
    void threeRapidKeystrokesProduceZeroLookupsUntilTheSchedulerFiresThenExactlyOneWithTheLastText() {
        ManualScheduler scheduler = new ManualScheduler();
        List<String> lookedUp = new ArrayList<>();
        String[] currentTextHolder = {"c"};
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, NOT_EDT, () -> currentTextHolder[0], SAME_THREAD,
                text -> {
                    lookedUp.add(text);
                    return text;
                },
                result -> { });

        debouncer.onTextChanged("a");
        debouncer.onTextChanged("b");
        debouncer.onTextChanged("c");

        assertEquals(0, lookedUp.size(), "no lookup runs before the scheduler fires");

        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, lookedUp.size(), "exactly one lookup runs after the delay elapses");
        assertEquals("c", lookedUp.get(0), "the surviving lookup carries the text from the last keystroke");
    }

    @Test
    void coalescingGoesThroughCancelNotABusyFlag() {
        ManualScheduler scheduler = new ManualScheduler();
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, NOT_EDT, () -> "x", SAME_THREAD, text -> text, result -> { });

        debouncer.onTextChanged("a");
        debouncer.onTextChanged("b");
        debouncer.onTextChanged("c");

        assertEquals(2, scheduler.cancelInvocations(),
                "two of the three keystrokes cancel a still-pending task from the previous keystroke");
        assertEquals(0, scheduler.cancelAllInvocations(),
                "coalescing must go through cancel(pending), never cancelAll()");
    }

    @Test
    void twoDebouncersSharingOneSchedulerDoNotCancelEachOther() {
        ManualScheduler scheduler = new ManualScheduler();
        List<String> lookedUpA = new ArrayList<>();
        List<String> lookedUpB = new ArrayList<>();
        KeystrokeDebouncer<String> debouncerA = newDebouncer(
                scheduler, NOT_EDT, () -> "a-text", SAME_THREAD,
                text -> {
                    lookedUpA.add(text);
                    return text;
                },
                result -> { });
        KeystrokeDebouncer<String> debouncerB = newDebouncer(
                scheduler, NOT_EDT, () -> "b-text", SAME_THREAD,
                text -> {
                    lookedUpB.add(text);
                    return text;
                },
                result -> { });

        debouncerB.onTextChanged("b-text");
        debouncerA.onTextChanged("a-text");

        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, lookedUpA.size(), "scheduling on debouncer A must not cancel debouncer B's pending task");
        assertEquals(1, lookedUpB.size(), "scheduling on debouncer B must not cancel debouncer A's pending task");
    }

    @Test
    void aStaleResultWhenCurrentTextChangedBeforeTheLookupRanIsNotApplied() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger lookupCount = new AtomicInteger();
        AtomicInteger applyCount = new AtomicInteger();
        String[] currentTextHolder = {"original"};
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, NOT_EDT, () -> currentTextHolder[0], SAME_THREAD,
                text -> {
                    lookupCount.incrementAndGet();
                    return text;
                },
                result -> applyCount.incrementAndGet());

        debouncer.onTextChanged("original");
        currentTextHolder[0] = "changed-before-lookup-ran";
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, lookupCount.get(), "the lookup itself still runs");
        assertEquals(0, applyCount.get(), "a stale result must not be applied");
    }

    @Test
    void aFreshResultWhenCurrentTextStillMatchesIsAppliedExactlyOnce() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger applyCount = new AtomicInteger();
        List<String> applied = new ArrayList<>();
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, NOT_EDT, () -> "same", SAME_THREAD,
                text -> text + "-resolved",
                result -> {
                    applyCount.incrementAndGet();
                    applied.add(result);
                });

        debouncer.onTextChanged("same");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(1, applyCount.get());
        assertEquals("same-resolved", applied.get(0));
    }

    @Test
    void aThreadProbeAnsweringTrueThrowsAndNeverInvokesTheLookup() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger lookupCount = new AtomicInteger();
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, ON_EDT, () -> "x", SAME_THREAD,
                text -> {
                    lookupCount.incrementAndGet();
                    return text;
                },
                result -> { });

        debouncer.onTextChanged("x");

        assertThrows(IllegalStateException.class, () -> scheduler.advanceBy(DELAY_MS));
        assertEquals(0, lookupCount.get(), "the EDT refusal must happen before the lookup is invoked");
    }

    @Test
    void theApplyCallbackIsOnlyDeliveredThroughTheUiThreadHook() {
        ManualScheduler scheduler = new ManualScheduler();
        AtomicInteger applyCount = new AtomicInteger();
        KeystrokeDebouncer.UiThread droppingHook = task -> { /* drops the runnable */ };
        KeystrokeDebouncer<String> debouncer = newDebouncer(
                scheduler, NOT_EDT, () -> "x", droppingHook,
                text -> text, result -> applyCount.incrementAndGet());

        debouncer.onTextChanged("x");
        scheduler.advanceBy(DELAY_MS);

        assertEquals(0, applyCount.get(), "a hook that drops its runnable must prevent the apply callback");
    }
}
