package com.basis.bbj.intellij.refresh;

/**
 * Decides what the user sees for every {@code bbj/refreshJavaClasses} outcome (#632): a plain
 * Java presenter seam with no {@code com.intellij} or LSP4IJ import. All three booleans
 * ({@code balloon}, {@code error}, {@code offerRestart}) are decided by the outcome constant
 * alone, never by the detail text — the restart offer is the only place the plugin's full-restart
 * behaviour is still reachable from this action.
 */
public final class JavaClassesRefreshPresenter {

    private JavaClassesRefreshPresenter() {}

    /**
     * Immutable rendering of one refresh outcome: what the console line (and, when
     * {@code balloon} is set, the notification) should show. {@code consoleLine} is written on
     * every outcome while {@code balloon} gates the notification, which is what makes success
     * console-only.
     */
    public static final class Presentation {
        public final String title;
        public final String body;
        public final String consoleLine;
        public final boolean balloon;
        public final boolean error;
        public final boolean offerRestart;

        Presentation(String title, String body, String consoleLine, boolean balloon, boolean error,
                boolean offerRestart) {
            this.title = title;
            this.body = body;
            this.consoleLine = consoleLine;
            this.balloon = balloon;
            this.error = error;
            this.offerRestart = offerRestart;
        }
    }

    /**
     * Renders one refresh outcome. Dispatches on {@code outcome} alone — {@code detail} is used
     * only to fill in a failure body's text, never to decide the balloon/error/restart-offer
     * triple.
     */
    public static Presentation present(JavaClassesRefreshFlow.Outcome outcome, String detail) {
        switch (outcome) {
            case REFRESHED:
                return new Presentation("", "", "Java classes refreshed", false, false, false);
            case DECLINED: {
                String title = "Java classes were not refreshed";
                String body = "The language server reported that the Java class cache could not be reloaded.";
                return new Presentation(title, body, consoleLineOf(title, body), true, true, true);
            }
            case SERVER_UNAVAILABLE: {
                String title = "BBj language server unavailable";
                String body = "Java classes were not refreshed because the language server is not running.";
                return new Presentation(title, body, consoleLineOf(title, body), true, true, true);
            }
            case REQUEST_FAILED: {
                String title = "Java class refresh failed";
                String body = "The refresh request failed: " + (detail != null ? detail : "unknown reason");
                return new Presentation(title, body, consoleLineOf(title, body), true, true, true);
            }
            case TIMED_OUT: {
                String title = "Java class refresh timed out";
                String body = "The refresh request did not complete within "
                    + JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS + " seconds.";
                return new Presentation(title, body, consoleLineOf(title, body), true, true, true);
            }
        }
        // Unreachable: the switch above is exhaustive over every Outcome constant, and this
        // method deliberately carries no default arm so a future constant fails to compile here
        // instead of silently falling through.
        throw new AssertionError("Unhandled outcome: " + outcome);
    }

    /** The console-only note written when a second refresh is dropped while one is running. */
    public static String alreadyRunningConsoleLine() {
        return "A Java class refresh is already running for this project.";
    }

    private static String consoleLineOf(String title, String body) {
        return title + ": " + body;
    }
}
