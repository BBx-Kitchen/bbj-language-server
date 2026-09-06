package com.basis.bbj.intellij.concurrency;

import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Per-field debounced background lookup with staleness discard, built over the {@link Scheduler}
 * seam (D-12). A keystroke schedules a lookup after {@code delayMs} of quiet; a keystroke arriving
 * before that elapses cancels only this instance's own pending task — never every pending task on
 * the shared scheduler at once — so a sibling field sharing the same scheduler is unaffected. The
 * lookup itself runs off the EDT (refusing to run on it at all, via {@link ThreadProbe}); its
 * result is discarded, rather than applied, when the field's live text has changed since the
 * lookup was scheduled.
 *
 * @param <T> the lookup result type
 */
public final class KeystrokeDebouncer<T> {

    /** Delivers a runnable to the UI thread. Production: {@code Application::invokeLater}. */
    @FunctionalInterface
    public interface UiThread {
        void run(Runnable task);
    }

    private final Scheduler scheduler;
    private final ThreadProbe threadProbe;
    private final long delayMs;
    private final Supplier<String> currentText;
    private final UiThread uiThread;
    private final Function<String, T> lookup;
    private final Consumer<T> apply;

    private volatile Runnable pending;

    public KeystrokeDebouncer(
            Scheduler scheduler,
            ThreadProbe threadProbe,
            long delayMs,
            Supplier<String> currentText,
            UiThread uiThread,
            Function<String, T> lookup,
            Consumer<T> apply) {
        this.scheduler = scheduler;
        this.threadProbe = threadProbe;
        this.delayMs = delayMs;
        this.currentText = currentText;
        this.uiThread = uiThread;
        this.lookup = lookup;
        this.apply = apply;
    }

    /**
     * Called on every keystroke with the field's current text. Cancels this instance's own
     * previously scheduled lookup (if any) and schedules a new one for {@code text}, due after
     * {@code delayMs}.
     */
    public void onTextChanged(String text) {
        Runnable previous = pending;
        if (previous != null) {
            scheduler.cancel(previous);
        }

        Runnable task = () -> {
            if (threadProbe.isDispatchThread()) {
                throw new IllegalStateException(
                        "KeystrokeDebouncer background lookup must not run on the EDT");
            }
            T result = lookup.apply(text);
            uiThread.run(() -> {
                if (text.equals(currentText.get())) {
                    apply.accept(result);
                }
            });
        };
        pending = task;
        scheduler.schedule(task, delayMs);
    }
}
