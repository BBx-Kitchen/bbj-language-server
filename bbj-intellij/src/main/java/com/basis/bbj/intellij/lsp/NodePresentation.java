package com.basis.bbj.intellij.lsp;

import java.util.Collections;
import java.util.List;

/**
 * Platform-free presentation logic for the missing/unusable-Node.js editor banner: the sentence
 * and the action set both vary by the resolver's own rejection reason. This class holds no
 * IntelliJ platform import, so plain JUnit drives every branch -- the same seam convention as
 * {@code com.basis.bbj.intellij.interop.InteropStatusPresentation} and {@code
 * com.basis.bbj.intellij.config.ConfigReloadPresentation}. Lives beside {@link
 * NodeExecutableResolver} and switches on its {@code Resolution}/{@code Source}/{@code Reason}
 * types directly rather than introducing a second vocabulary -- those are a plain class and two
 * plain enums, so the seam stays platform-free.
 */
public final class NodePresentation {

    private NodePresentation() {
    }

    /** Action id for downloading Node.js via the plugin's own pipeline. */
    public static final String ACTION_DOWNLOAD = "download-nodejs";

    /** Action id for opening the Settings field where the Node.js path is configured. */
    public static final String ACTION_CONFIGURE_PATH = "configure-nodejs-path";

    /** Action id for pointing the user at a manual install from nodejs.org. */
    public static final String ACTION_INSTALL_MANUALLY = "install-nodejs-manually";

    private static final List<String> ALL_ACTIONS =
            List.of(ACTION_DOWNLOAD, ACTION_CONFIGURE_PATH, ACTION_INSTALL_MANUALLY);

    private static final List<String> ACTIONS_WITHOUT_DOWNLOAD =
            List.of(ACTION_CONFIGURE_PATH, ACTION_INSTALL_MANUALLY);

    /**
     * The editor-banner sentence for {@code resolution}, or {@code null} when no banner should
     * show. A resolved resolution returns {@code null} -- the provider treats {@code null} as "no
     * banner". Otherwise the most informative rejection is reported rather than the first one
     * recorded: an inaccessible cache directory is named as such; a configured path rejected for
     * being below the minimum version says so, since "Node.js is required" would be actively
     * wrong when a Node.js is present; a configured path rejected for any other reason names that
     * reason; and with nothing configured and nothing found, the wording stays equivalent to the
     * banner's original sentence, so the common case reads as it always has.
     */
    public static String bannerText(NodeExecutableResolver.Resolution resolution) {
        if (resolution.isResolved()) {
            return null;
        }
        if (findByReason(resolution, NodeExecutableResolver.Reason.CACHE_UNAVAILABLE) != null) {
            return "The plugin's Node.js cache directory could not be accessed.";
        }
        NodeExecutableResolver.Rejected settingsRejection =
                findBySource(resolution, NodeExecutableResolver.Source.SETTINGS);
        if (settingsRejection != null) {
            if (settingsRejection.reason() == NodeExecutableResolver.Reason.BELOW_MINIMUM_VERSION) {
                return "The configured Node.js is older than the minimum supported version -- "
                        + "Node.js 22+ is required.";
            }
            return "The configured Node.js path " + describeForBanner(settingsRejection.reason()) + ".";
        }
        return "Node.js 22+ is required to run the BBj language server";
    }

    /**
     * The ordered action ids to offer for {@code resolution}, as an unmodifiable list. A resolved
     * resolution offers none. The inaccessible-cache case never includes {@link #ACTION_DOWNLOAD}
     * -- offering it would send a user back through a doomed retry loop that fails at the same
     * directory-creation step (#588). Every other unresolved case offers all three ids in the
     * banner's original order, so button order never shuffles between reasons.
     */
    public static List<String> bannerActions(NodeExecutableResolver.Resolution resolution) {
        if (resolution.isResolved()) {
            return Collections.emptyList();
        }
        if (findByReason(resolution, NodeExecutableResolver.Reason.CACHE_UNAVAILABLE) != null) {
            return ACTIONS_WITHOUT_DOWNLOAD;
        }
        return ALL_ACTIONS;
    }

    private static NodeExecutableResolver.Rejected findByReason(
            NodeExecutableResolver.Resolution resolution, NodeExecutableResolver.Reason reason) {
        for (NodeExecutableResolver.Rejected rejected : resolution.rejections()) {
            if (rejected.reason() == reason) {
                return rejected;
            }
        }
        return null;
    }

    private static NodeExecutableResolver.Rejected findBySource(
            NodeExecutableResolver.Resolution resolution, NodeExecutableResolver.Source source) {
        for (NodeExecutableResolver.Rejected rejected : resolution.rejections()) {
            if (rejected.source() == source) {
                return rejected;
            }
        }
        return null;
    }

    /**
     * Phrases the generic, structural rejection reasons for the banner. {@link
     * NodeExecutableResolver.Reason#BELOW_MINIMUM_VERSION} and {@link
     * NodeExecutableResolver.Reason#CACHE_UNAVAILABLE} are always handled by {@link
     * #bannerText(NodeExecutableResolver.Resolution)} before reaching here. {@link
     * NodeExecutableResolver.Reason#VERSION_UNKNOWN} is handled here, not there, precisely because
     * it needs no special casing: it says only that the version could not be determined -- never
     * that Node is missing or too old, since neither is known to be true.
     */
    private static String describeForBanner(NodeExecutableResolver.Reason reason) {
        return switch (reason) {
            case MALFORMED -> "could not be parsed as a path";
            case NOT_ABSOLUTE -> "is not an absolute path";
            case MISSING -> "does not exist";
            case NOT_A_FILE -> "is not a regular file";
            case NOT_EXECUTABLE -> "is not executable";
            case VERSION_UNKNOWN -> "reported a version that could not be determined";
            case BELOW_MINIMUM_VERSION, CACHE_UNAVAILABLE ->
                    throw new IllegalStateException("handled before reaching the generic description");
        };
    }
}
