package com.basis.bbj.intellij;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * JVM-wide guard serializing Node.js downloads: at most one download runs at a time, and every
 * caller that arrives while one is running still gets its completion callback run when that
 * download finishes. Plain Java, no IntelliJ platform imports, so it is fully covered by plain
 * JUnit 5 tests without a platform test harness.
 *
 * <p>The resource this guards -- the plugin's shared Node.js data directory -- is JVM-wide, not
 * project-scoped, so {@link #SESSION} is a JVM-wide static singleton rather than a per-project
 * service (research PITFALLS.md Pitfall 3).
 */
public final class DownloadGuard {

    /**
     * The single production instance. Production code always calls through this instance; tests
     * construct their own via the package-private constructor so no case can leak guard state
     * into another.
     */
    public static final DownloadGuard SESSION = new DownloadGuard();

    private final AtomicBoolean held = new AtomicBoolean(false);
    private final List<Runnable> pending = new ArrayList<>();

    DownloadGuard() {
    }

    /**
     * Attempts to acquire the guard for a download. The compare-and-set and the completion
     * attachment happen under the same lock (D-14), so a caller that loses the race can never
     * attach after the winner has already drained via {@link #release()} (D-15).
     *
     * @param onComplete callback to attach to the eventual {@link #release()}, run regardless of
     *                    whether this call won or lost; may be null
     * @return true if this call acquired the guard and must start the download; false if a
     *         download is already in progress
     */
    public synchronized boolean tryAcquire(Runnable onComplete) {
        boolean acquired = held.compareAndSet(false, true);
        if (onComplete != null) {
            pending.add(onComplete);
        }
        return acquired;
    }

    /**
     * Releases the guard and returns every completion callback attached since the guard was last
     * acquired, in attachment order (FIFO). Called on a guard that was never acquired, this
     * returns an empty list and leaves the guard unchanged -- it is already free.
     *
     * @return the attached completions, in attachment order
     */
    public synchronized List<Runnable> release() {
        List<Runnable> drained = new ArrayList<>(pending);
        pending.clear();
        held.set(false);
        return drained;
    }

    /** Package-private for tests: whether the guard is currently held. */
    boolean isHeld() {
        return held.get();
    }
}
