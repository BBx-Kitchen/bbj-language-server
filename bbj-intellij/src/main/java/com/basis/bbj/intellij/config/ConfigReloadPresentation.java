package com.basis.bbj.intellij.config;

/**
 * Platform-free presentation logic for the {@code bbj/configReloadRequired} reason surfaced by
 * {@code BbjStatusBarWidget}'s tooltip and {@code BbjLanguageClient}'s console line. No {@code
 * com.intellij} and no LSP4IJ import, so plain JUnit exercises every branch -- the same seam
 * convention as {@link ConfigPaths}.
 */
public final class ConfigReloadPresentation {

    private ConfigReloadPresentation() {}

    private static final String REASON_PREFIX_CHANGED = "prefix-changed";
    private static final String REASON_CONFIG_MISSING = "config-missing";
    private static final String REASON_CONFIG_PATH_CHANGED = "config-path-changed";

    private static final String STATUS_STARTED = "started";

    /**
     * Maps a {@code bbj/configReloadRequired} reason token to a short human label. Returns
     * {@code null} for {@code null} or an unrecognized token so an unknown reason from a newer
     * server degrades to no label instead of leaking a raw token into the UI.
     */
    public static String reasonLabel(String reason) {
        if (reason == null) {
            return null;
        }
        switch (reason) {
            case REASON_PREFIX_CHANGED:
                return "config file changed";
            case REASON_CONFIG_MISSING:
                return "config file missing";
            case REASON_CONFIG_PATH_CHANGED:
                return "config path changed";
            default:
                return null;
        }
    }

    /**
     * Joins a status-bar status text with a reload-reason label. Returns {@code statusText}
     * unchanged when {@code reasonLabel} is {@code null} or blank, otherwise the two joined by a
     * single em-dash separator.
     */
    public static String widgetTooltip(String statusText, String reasonLabel) {
        if (reasonLabel == null || reasonLabel.isBlank()) {
            return statusText;
        }
        return statusText + " — " + reasonLabel;
    }

    /** One console line naming that a config change was detected and the server is restarting. */
    public static String consoleLine(String path, String reason) {
        return "Config changed (" + reason + "), restarting language server: " + path;
    }

    /**
     * Whether a status transition should clear the pending restart reason. True once the server
     * reaches the started state (the reload succeeded), or once auto-restart has been abandoned
     * (a second crash within the crash window). False otherwise -- in particular, the stopped
     * state alone does not clear: a restart legitimately passes through stopped on its way back
     * to started, and clearing there would blank the tooltip mid-reload.
     */
    public static boolean clearsReason(String statusName, boolean autoRestartAbandoned) {
        if (STATUS_STARTED.equals(statusName)) {
            return true;
        }
        return autoRestartAbandoned;
    }
}
