package com.basis.bbj.intellij.concurrency;

/**
 * Classifies a language-server status transition as a deliberate restart's stop, a genuine
 * crash, or not a stop at all. Plain Java, no {@code com.intellij} import and no vendor LSP4IJ
 * import, so plain JUnit drives every branch and the eleven-file LSP4IJ import allowlist stays
 * untouched. Status transitions are supplied as status-name {@code String}s, the same convention
 * {@code ConfigReloadPresentation} uses for the same reason.
 *
 * <p>The token armed by {@link #arm(long)} is deliberately one-shot and time-boxed: one-shot so a
 * second, unrelated live-to-stopped transition after the expected one is still classified as a
 * crash, and time-boxed so a restart whose stop transition never arrives (or arrives far later
 * than expected) cannot silently swallow the next genuine crash.
 */
public final class ExpectedStopGuard {

    /** Verdict returned by {@link #classify(String, String, long)}. */
    public enum StopKind {
        /** The transition is not a live-to-stopped transition at all. */
        NOT_A_STOP,
        /** A live-to-stopped transition that a prior {@link #arm(long)} explains. */
        EXPECTED_RESTART_STOP,
        /** A live-to-stopped transition with no armed token to explain it. */
        CRASH
    }

    /** Default window, in milliseconds, an armed token remains valid. */
    public static final long DEFAULT_WINDOW_MS = 30000;

    private static final String STATUS_STOPPED = "stopped";
    private static final String STATUS_STARTED = "started";
    private static final String STATUS_STARTING = "starting";

    private final long windowMs;
    private Long armedAtMs;

    public ExpectedStopGuard(long windowMs) {
        this.windowMs = windowMs;
    }

    /**
     * Arms the guard: the next live-to-stopped transition classified within {@code windowMs} of
     * {@code nowMs} is {@link StopKind#EXPECTED_RESTART_STOP} instead of {@link StopKind#CRASH}.
     * Replaces any existing token.
     */
    public synchronized void arm(long nowMs) {
        this.armedAtMs = nowMs;
    }

    /** Drops any armed token without consuming it. */
    public synchronized void disarm() {
        this.armedAtMs = null;
    }

    /**
     * Classifies one status transition. Returns {@link StopKind#NOT_A_STOP} unless {@code
     * statusName} is {@code "stopped"} and {@code previousStatusName} is either {@code "started"}
     * or {@code "starting"} -- {@code null} names are tolerated and answer {@code NOT_A_STOP}. For
     * a live-to-stopped transition: a token armed within {@code windowMs} (inclusive) of {@code
     * nowMs} is consumed and the verdict is {@link StopKind#EXPECTED_RESTART_STOP}; otherwise any
     * stale token is discarded and the verdict is {@link StopKind#CRASH}.
     */
    public synchronized StopKind classify(String statusName, String previousStatusName, long nowMs) {
        boolean isLiveToStoppedTransition = STATUS_STOPPED.equals(statusName)
            && (STATUS_STARTED.equals(previousStatusName) || STATUS_STARTING.equals(previousStatusName));

        if (!isLiveToStoppedTransition) {
            return StopKind.NOT_A_STOP;
        }

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

    /**
     * Classifies one unexpected process exit, reported by the language server's own
     * unexpected-stop hook -- the hook firing at all is what decides that the process ended
     * without a stop request; this method only says whether the plugin's own restart armed that
     * stop. A token armed within {@code windowMs} (inclusive) of {@code nowMs} is consumed and the
     * verdict is {@link StopKind#EXPECTED_RESTART_STOP}; otherwise any stale token is discarded and
     * the verdict is {@link StopKind#CRASH}.
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
