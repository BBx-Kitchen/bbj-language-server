package com.basis.bbj.intellij.concurrency;

/**
 * Trailing-edge coalescer over the {@link Scheduler} seam for a UI-thread refresh action, built for
 * the SETOPTS composer dialog's live preview (D-09). {@code trigger()} cancels this instance's own
 * pending task (never {@link Scheduler#cancelAll()} — the production scheduler is shared, so
 * cancelling every pending task would silently kill an unrelated coalescer, the same rule
 * {@link KeystrokeDebouncer} documents) and schedules a fresh one, so a burst of checkbox clicks or
 * keystrokes inside the debounce window collapses into a single dispatched action.
 * <p>
 * This differs from {@link KeystrokeDebouncer} in shape and intent: {@code KeystrokeDebouncer}
 * debounces a text-keyed background <em>lookup</em> whose result is applied only when the field's
 * text is unchanged (its own staleness check, keyed on text). {@code PreviewDebouncer} debounces a
 * UI-thread <em>action</em> whose own staleness is handled downstream by the caller's sequence
 * number (see {@code ComposerFlow.observe}), so it carries no text key and performs no staleness
 * check of its own — it only decides when to run {@code action} next.
 */
public final class PreviewDebouncer {

    private final Scheduler scheduler;
    private final long delayMs;
    private final KeystrokeDebouncer.UiThread uiThread;
    private final Runnable action;

    private volatile Runnable pending;

    public PreviewDebouncer(
            Scheduler scheduler,
            long delayMs,
            KeystrokeDebouncer.UiThread uiThread,
            Runnable action) {
        this.scheduler = scheduler;
        this.delayMs = delayMs;
        this.uiThread = uiThread;
        this.action = action;
    }

    /**
     * Called on every settle-point input event. Cancels this instance's own previously scheduled
     * task (if any) and schedules a new one, due after {@code delayMs}, that dispatches
     * {@code action} through {@code uiThread} rather than running it inline — the production
     * {@link Scheduler} is an {@code Alarm} on a pooled thread while the action reads Swing state.
     */
    public void trigger() {
        Runnable previous = pending;
        if (previous != null) {
            scheduler.cancel(previous);
        }

        Runnable task = () -> uiThread.run(action);
        pending = task;
        scheduler.schedule(task, delayMs);
    }
}
