package com.basis.bbj.intellij.interop;

/**
 * Platform-free presentation logic for java-interop status rendering: the status-bar label, its
 * tooltip, and the editor-banner sentence (#587). This class holds no IntelliJ platform import,
 * so plain JUnit drives every branch -- the same seam convention as {@code
 * com.basis.bbj.intellij.config.ConfigReloadPresentation}. Takes the status as a plain
 * status-name String rather than {@code BbjJavaInteropService.InteropStatus}, so this class stays
 * free of the {@code ui} package.
 */
public final class InteropStatusPresentation {

    private InteropStatusPresentation() {
    }

    private static final String STATUS_CONNECTED = "CONNECTED";
    private static final String STATUS_DISCONNECTED = "DISCONNECTED";
    private static final String STATUS_CHECKING = "CHECKING";
    private static final String STATUS_WRONG_PEER = "WRONG_PEER";

    /**
     * The status-bar label for {@code statusName}. The three pre-existing labels are
     * byte-identical to what the widget rendered before this seam existed; an unrecognized name
     * (including {@code null}) returns the widget's existing default label.
     */
    public static String statusText(String statusName) {
        if (STATUS_CONNECTED.equals(statusName)) {
            return "Java: Connected";
        }
        if (STATUS_DISCONNECTED.equals(statusName)) {
            return "Java: Disconnected";
        }
        if (STATUS_CHECKING.equals(statusName)) {
            return "Java: Checking...";
        }
        if (STATUS_WRONG_PEER.equals(statusName)) {
            return "Java: Wrong peer";
        }
        return "Java: Unknown";
    }

    /**
     * The status-bar hover text for {@code statusName}. The wrong-peer state names the actual
     * situation -- something is holding the configured port without speaking the interop
     * protocol -- rather than reusing the generic disconnected wording. Every other state's
     * tooltip is its status text.
     */
    public static String tooltip(String statusName) {
        if (STATUS_WRONG_PEER.equals(statusName)) {
            return "A process is listening on the configured java-interop port, but it is not "
                    + "answering the java-interop protocol -- Java completions are unavailable.";
        }
        return statusText(statusName);
    }

    /**
     * The editor-banner sentence for {@code statusName}, or {@code null} when no banner should
     * show. {@code CONNECTED} and {@code CHECKING} return {@code null} -- the provider treats
     * {@code null} as "no banner". {@code DISCONNECTED} keeps the existing wording, since
     * BBjServices really is the thing not running. {@code WRONG_PEER} gets its own sentence,
     * because BBjServices is running in that case -- it is the thing squatting on the port, so
     * telling the user to start it would be actively wrong.
     */
    public static String bannerText(String statusName) {
        if (STATUS_DISCONNECTED.equals(statusName)) {
            return "Start BBjServices for Java completions";
        }
        if (STATUS_WRONG_PEER.equals(statusName)) {
            return "The configured java-interop port is held by a process that is not "
                    + "java-interop -- check the port in Settings";
        }
        return null;
    }
}
