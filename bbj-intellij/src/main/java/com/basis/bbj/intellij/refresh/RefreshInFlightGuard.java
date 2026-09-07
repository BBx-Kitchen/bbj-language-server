package com.basis.bbj.intellij.refresh;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-key single-flight guard for the Refresh Java Classes action (#632). The key is the project
 * a refresh belongs to, so two projects can refresh at the same time while a second invocation
 * inside one project is dropped; the guard deliberately does not queue the dropped invocation.
 *
 * <p>Production always goes through {@link #SESSION}; tests build their own instance through
 * the package-private constructor so no case leaks guard state into another.
 */
public final class RefreshInFlightGuard {

    public static final RefreshInFlightGuard SESSION = new RefreshInFlightGuard();

    private final ConcurrentHashMap<Object, Boolean> held = new ConcurrentHashMap<>();

    RefreshInFlightGuard() {
    }

    /**
     * Attempts to acquire the guard for {@code key}. One atomic set-add, so two threads racing
     * the same key cannot both win.
     *
     * @return true exactly when this call added the key
     */
    public boolean tryAcquire(Object key) {
        return held.putIfAbsent(key, Boolean.TRUE) == null;
    }

    /** Releases {@code key}, safe to call for a key that is not held. */
    public void release(Object key) {
        held.remove(key);
    }

    /** Package-private for tests: whether the key is currently held. */
    boolean isHeld(Object key) {
        return held.containsKey(key);
    }
}
