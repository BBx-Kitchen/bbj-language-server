package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.NodePresentation;
import com.intellij.ide.BrowserUtil;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.NotNull;

/**
 * The single id-to-behaviour mapping for the Node.js action ids {@link NodePresentation} defines.
 * Both the language server's start-failure notification and the editor banner run every offered
 * action through {@link #perform(Project, String)} rather than each carrying its own handler, so
 * the two surfaces can never disagree about what a given action id does. Lives in {@code
 * com.basis.bbj.intellij} rather than {@code lsp} because it must be reachable from both the
 * notification provider's package and the {@code lsp} package, and because it holds platform
 * calls that {@link NodePresentation} must stay free of.
 */
public final class NodeActions {

    private NodeActions() {
    }

    /**
     * Runs the behaviour for {@code actionId} against {@code project}. Throws {@link
     * IllegalArgumentException} for an id this method does not recognise, mirroring {@link
     * NodePresentation#actionLabel(String)} so the two halves of the mapping can never silently
     * disagree about which ids exist.
     */
    public static void perform(@NotNull Project project, @NotNull String actionId) {
        switch (actionId) {
            case NodePresentation.ACTION_DOWNLOAD -> BbjNodeDownloader.downloadNodeAsync(project, () ->
                    EditorNotifications.getInstance(project).updateAllNotifications());
            case NodePresentation.ACTION_CONFIGURE_PATH -> ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, BbjSettingsConfigurable.class);
            case NodePresentation.ACTION_INSTALL_MANUALLY -> BrowserUtil.browse("https://nodejs.org/");
            default -> throw new IllegalArgumentException("Unrecognised Node.js action id: " + actionId);
        }
    }
}
