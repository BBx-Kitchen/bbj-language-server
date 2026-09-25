package com.basis.bbj.intellij.concurrency;

/**
 * Filters unexpected process exits reported by the language server's unexpected-stop hook: the
 * hook firing at all is what decides that the process ended without a stop request; this class
 * only says whether the plugin's own restart armed that stop. Plain Java, no {@code com.intellij}
 * import and no vendor LSP4IJ import, so plain JUnit drives every branch and the eleven-file
 * LSP4IJ import allowlist stays untouched.
 *
 * <p>The token armed by {@link #arm(long)} is deliberately one-shot: a second, unrelated
 * unexpected exit after the expected one is still classified as a crash. When the pid of the
 * process actually being stopped is known on both sides (see {@link #notePid(Long)} and {@link
 * #classifyExit(long, Long)}), pid identity is authoritative and overrides time entirely -- a
 * late report for that exact pid is still recognized as expected long after any nominal window
 * would have elapsed, and a report for any other pid is always a crash, even inside the window.
 * The plain time window from {@link #arm(long)} only decides the verdict when a pid is
 * unavailable on either side.
 */
public final class ExpectedStopGuard {

    /** Verdict returned by {@link #classifyExit(long)}. */
    public enum StopKind {
        /** An unexpected exit that a prior {@link #arm(long)} explains. */
        EXPECTED_RESTART_STOP,
        /** An unexpected exit with no armed token to explain it. */
        CRASH
    }

    /**
     * Default window, in milliseconds, an armed token remains valid when no pid is available to
     * correlate against. Deliberately kept equal to {@code BbjServerService.CRASH_WINDOW_MS} (also
     * 30 seconds) -- the two constants gate different decisions (this one bounds how long a
     * pid-less expected-stop token stays valid, that one bounds how close together two crashes
     * must land to give up on auto-restart), but the coincidence is a deliberate choice, not an
     * accident, and both should be tuned together if either is ever revisited.
     */
    public static final long DEFAULT_WINDOW_MS = 30000;

    private final long windowMs;
    private Long armedAtMs;
    private Long armedPid;

    public ExpectedStopGuard(long windowMs) {
        this.windowMs = windowMs;
    }

    /**
     * Arms the guard: the next unexpected exit classified within {@code windowMs} of {@code
     * nowMs} is {@link StopKind#EXPECTED_RESTART_STOP} instead of {@link StopKind#CRASH}. Replaces
     * any existing token. Equivalent to {@code arm(nowMs, null)} -- the pid of the process actually
     * being stopped is often unknown at the moment of arming and can be attached later through
     * {@link #notePid(Long)}.
     */
    public synchronized void arm(long nowMs) {
        arm(nowMs, null);
    }

    /**
     * Arms the guard with the pid of the process being stopped, when already known. See {@link
     * #arm(long)}.
     */
    public synchronized void arm(long nowMs, Long pid) {
        this.armedAtMs = nowMs;
        this.armedPid = pid;
    }

    /**
     * Attaches the pid of the process actually being stopped to the currently armed token, once
     * it becomes known -- callers often cannot supply it to {@link #arm(long)} itself, since
     * knowing which OS process is being stopped requires reaching the connection provider that
     * owns it, a step that happens slightly after arming. A no-op if nothing is currently armed,
     * so a stray late call can never resurrect an already-consumed or never-armed token. Only the
     * first pid noted after arming sticks: the first stop after arming is the one the token was
     * armed for, and a later stop -- such as the one LSP4IJ issues for a server that just crashed,
     * before the crash is reported -- must never re-target the token onto the crashed process.
     */
    public synchronized void notePid(Long pid) {
        if (armedAtMs != null && armedPid == null) {
            this.armedPid = pid;
        }
    }

    /** Drops any armed token without consuming it. */
    public synchronized void disarm() {
        this.armedAtMs = null;
        this.armedPid = null;
    }

    /**
     * Classifies one unexpected process exit, reported by the language server's own
     * unexpected-stop hook, with no pid to correlate against. Equivalent to {@code classifyExit(nowMs,
     * null)}.
     */
    public synchronized StopKind classifyExit(long nowMs) {
        return classifyExit(nowMs, null);
    }

    /**
     * Classifies one unexpected process exit, reported by the language server's own
     * unexpected-stop hook, optionally naming the pid of the process that exited.
     *
     * <p>When both the armed token and this report carry a pid, pid identity is authoritative and
     * overrides the time window entirely: a report bearing the same pid the token was armed for is
     * {@link StopKind#EXPECTED_RESTART_STOP} no matter how long it took to arrive (the process
     * being stopped can die well after any bounded wait gives up on it), and a report bearing any
     * other pid -- including one from a freshly started server -- is always {@link
     * StopKind#CRASH}, even if it lands inside the window. Only when a pid is unavailable on either
     * side does the {@code windowMs} time check decide the verdict, exactly as before pid
     * correlation existed. Either way the token is consumed at most once.
     */
    public synchronized StopKind classifyExit(long nowMs, Long pid) {
        if (armedAtMs != null) {
            long elapsed = nowMs - armedAtMs;
            boolean withinWindow = elapsed <= windowMs;
            Long tokenPid = armedPid;
            armedAtMs = null;
            armedPid = null;

            boolean expected = (tokenPid != null && pid != null)
                ? tokenPid.equals(pid)
                : withinWindow;
            if (expected) {
                return StopKind.EXPECTED_RESTART_STOP;
            }
        }

        return StopKind.CRASH;
    }
}
