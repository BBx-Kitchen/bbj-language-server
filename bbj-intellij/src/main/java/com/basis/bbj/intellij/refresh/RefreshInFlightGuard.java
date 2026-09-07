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

    /** Stub for the RED phase of TDD -- intentionally wrong pending the GREEN implementation. */
    public boolean tryAcquire(Object key) {
        return false;
    }

    /** Stub for the RED phase of TDD -- intentionally wrong pending the GREEN implementation. */
    public void release(Object key) {
    }

    /** Package-private for tests: whether the key is currently held. */
    boolean isHeld(Object key) {
        return held.containsKey(key);
    }
}
