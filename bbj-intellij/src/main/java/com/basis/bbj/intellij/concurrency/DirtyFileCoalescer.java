package com.basis.bbj.intellij.concurrency;

import java.util.function.Consumer;

/** Placeholder so the behaviour tests compile and fail on behaviour. */
public final class DirtyFileCoalescer<K> {

    public DirtyFileCoalescer(
            Scheduler scheduler,
            long delayMs,
            KeystrokeDebouncer.UiThread uiThread,
            Consumer<K> refresh) {
    }

    public void mark(K key) {
    }
}
