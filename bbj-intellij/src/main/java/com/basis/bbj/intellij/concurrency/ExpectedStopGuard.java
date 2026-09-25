package com.basis.bbj.intellij.concurrency;

/**
 * Filters unexpected process exits reported by the language server's unexpected-stop hook: the
 * hook firing at all is what decides that the process ended without a stop request; this class
 * only says whether the plugin's own restart armed that stop. Plain Java, no {@code com.intellij}
 * import and no vendor LSP4IJ import, so plain JUnit drives every branch and the eleven-file
 * LSP4IJ import allowlist stays untouched.
 *
 * <p>The token armed by {@link #arm(long)} is deliberately one-shot and time-boxed: one-shot so a
 * second, unrelated unexpected exit after the expected one is still classified as a crash, and
 * time-boxed so a restart whose own stop never completes (or completes far later than expected)
 * cannot silently swallow the next genuine crash. The plugin disarms the token itself once its own
 * stop has completed, rather than relying solely on the window to expire it.
 */
public final class ExpectedStopGuard {

    /** Verdict returned by {@link #classifyExit(long)}. */
    public enum StopKind {
        /** An unexpected exit that a prior {@link #arm(long)} explains. */
        EXPECTED_RESTART_STOP,
        /** An unexpected exit with no armed token to explain it. */
        CRASH
    }

    /** Default window, in milliseconds, an armed token remains valid. */
    public static final long DEFAULT_WINDOW_MS = 30000;

    private final long windowMs;
    private Long armedAtMs;

    public ExpectedStopGuard(long windowMs) {
        this.windowMs = windowMs;
    }

    /**
     * Arms the guard: the next unexpected exit classified within {@code windowMs} of {@code
     * nowMs} is {@link StopKind#EXPECTED_RESTART_STOP} instead of {@link StopKind#CRASH}. Replaces
     * any existing token.
     */
    public synchronized void arm(long nowMs) {
        this.armedAtMs = nowMs;
    }

    /** Drops any armed token without consuming it. */
    public synchronized void disarm() {
        this.armedAtMs = null;
    }

    /**
     * Classifies one unexpected process exit, reported by the language server's own
     * unexpected-stop hook. A token armed within {@code windowMs} (inclusive) of {@code nowMs} is
     * consumed and the verdict is {@link StopKind#EXPECTED_RESTART_STOP}; otherwise any stale
     * token is discarded and the verdict is {@link StopKind#CRASH}.
     */
    public synchronized StopKind classifyExit(long nowMs) {
        if (armedAtMs != null) {
            long elapsed = nowMs - armedAtMs;
            boolean withinWindow = elapsed <= windowMs;
            armedAtMs = null;
            if (withinWindow) {
                return StopKind.EXPECTED_RESTART_STOP;
            }
        }

        return StopKind.CRASH;
    }
}
