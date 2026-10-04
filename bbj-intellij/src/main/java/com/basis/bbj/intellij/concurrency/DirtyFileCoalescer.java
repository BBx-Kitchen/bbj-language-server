package com.basis.bbj.intellij.concurrency;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Collapses many change events into at most one refresh per distinct key per debounce window. It
 * keeps a set of dirty keys and drains it through a {@link PreviewDebouncer}, so the trailing-edge
 * rule applies: the refresh fires once the events stop for the delay, on the supplied UI thread,
 * and never calls {@link Scheduler#cancelAll()} because the production scheduler may be shared.
 *
 * <p>Used to re-evaluate editor banners after document edits without re-running every provider on
 * each keystroke. A key marked again while its refresh is running stays dirty and is refreshed in
 * the next window.
 *
 * @param <K> the kind of key being refreshed, for example a virtual file
 */
public final class DirtyFileCoalescer<K> {

    private static final Logger LOG = Logger.getLogger(DirtyFileCoalescer.class.getName());

    private final Set<K> dirty = ConcurrentHashMap.newKeySet();
    private final PreviewDebouncer debouncer;
    private final Consumer<K> refresh;

    public DirtyFileCoalescer(
            Scheduler scheduler,
            long delayMs,
            KeystrokeDebouncer.UiThread uiThread,
            Consumer<K> refresh) {
        this.refresh = refresh;
        this.debouncer = new PreviewDebouncer(scheduler, delayMs, uiThread, this::drain);
    }

    /** Records that {@code key} changed and restarts the debounce window; a null key is ignored. */
    public void mark(K key) {
        if (key == null) {
            return;
        }
        dirty.add(key);
        debouncer.trigger();
    }

    private void drain() {
        for (K key : List.copyOf(dirty)) {
            // Removing before refreshing keeps a key that is marked during the refresh dirty.
            if (dirty.remove(key)) {
                try {
                    refresh.accept(key);
                } catch (RuntimeException ex) {
                    // One failing refresh must not strand the remaining keys: they are already
                    // out of the dirty set and nothing would drain them before the next mark.
                    LOG.log(Level.WARNING, "Refreshing a dirty key failed", ex);
                }
            }
        }
    }
}
