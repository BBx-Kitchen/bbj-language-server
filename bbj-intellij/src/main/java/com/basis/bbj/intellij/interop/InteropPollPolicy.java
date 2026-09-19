package com.basis.bbj.intellij.interop;

/**
 * Plain-Java decision seam behind {@code BbjJavaInteropService}'s poll cadence (#593). This class
 * holds no IntelliJ platform import, so plain JUnit can drive every branch directly -- the same
 * shape {@link com.basis.bbj.intellij.lsp.NodeAvailability} already establishes: a private
 * constructor, an exhaustive enum of outcomes, and a static pure function taking every dependency
 * as a parameter.
 *
 * <p>{@link #decide} answers one question -- "given what just happened, should the poll check
 * now, re-arm at the normal interval, pause, or leave the running cadence alone?" -- without ever
 * touching a socket, a timer, or the editor. The service applies the returned {@link Decision};
 * this class only decides.
 */
public final class InteropPollPolicy {

    private InteropPollPolicy() {
    }

    /** What just happened, driving a poll-gate decision. */
    public enum Trigger {
        /** A scheduled poll tick just finished running. */
        TICK_COMPLETED,
        /** The editor's selected file(s) changed. */
        SELECTION_CHANGED,
        /** The language server just reached {@code started}. */
        SERVER_STARTED
    }

    /** What the service must do in response to a {@link Trigger}. */
    public enum Decision {
        /** Run a check immediately, then resume the normal cadence. */
        CHECK_NOW,
        /** Schedule the next check at the normal interval. */
        REARM,
        /** Cancel any pending work and stop re-arming. */
        PAUSE,
        /** Leave the running cadence exactly as it is. */
        NO_CHANGE
    }

    /**
     * Decides what the poll should do next.
     *
     * @param trigger what just happened
     * @param gateOpen whether a BBj file is currently selected
     * @param gateWasOpen that same fact as of the previous selection event
     * @param serverStarted whether the language server is currently started
     */
    public static Decision decide(Trigger trigger, boolean gateOpen, boolean gateWasOpen,
            boolean serverStarted) {
        if (!serverStarted) {
            return Decision.PAUSE;
        }
        return switch (trigger) {
            case TICK_COMPLETED -> gateOpen ? Decision.REARM : Decision.PAUSE;
            case SELECTION_CHANGED -> {
                if (gateOpen == gateWasOpen) {
                    // Two triggers that just touch -- e.g. switching between two BBj tabs -- must
                    // not fire a second immediate check or restart the timer (mirrors RestartGate's
                    // "many rapid triggers still produce close to one action" guarantee).
                    yield Decision.NO_CHANGE;
                }
                yield gateOpen ? Decision.CHECK_NOW : Decision.PAUSE;
            }
            case SERVER_STARTED -> gateOpen ? Decision.CHECK_NOW : Decision.PAUSE;
        };
    }
}
