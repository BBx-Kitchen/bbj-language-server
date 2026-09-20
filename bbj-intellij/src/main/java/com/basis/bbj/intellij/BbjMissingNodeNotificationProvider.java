package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.NodeExecutableResolver;
import com.basis.bbj.intellij.lsp.NodePresentation;
import com.intellij.ide.BrowserUtil;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.nio.file.Path;
import java.util.function.Function;

/**
 * Shows an editor banner on BBj files when Node.js 22+ is not available. The banner reaches its
 * verdict through the same {@link NodeExecutableResolver} the language server's startup path
 * calls -- configured, then detected, then cached, with the same six-step validation and the
 * same minimum-version gate -- so the banner can no longer claim Node.js is missing on a machine
 * whose server started fine. Both the sentence and the action set come from {@link
 * NodePresentation}, and vary by the resolver's own rejection reason: the cache-inaccessible case
 * drops "Download Node.js" rather than sending a user back through a doomed retry (#588).
 */
public final class BbjMissingNodeNotificationProvider extends BbjNotificationProviderBase {

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {

        String configuredPath = BbjSettings.getInstance().getState().nodeJsPath;
        String detectedPath = BbjNodeDetector.detectNodePath();
        Path cachedPath = BbjNodeDownloader.getCachedNodePath();

        NodeExecutableResolver.Resolution resolution = NodeExecutableResolver.resolve(
                configuredPath,
                detectedPath,
                cachedPath != null ? cachedPath.toString() : null,
                BbjNodeDownloader.isNodeDataDirectoryAccessible(),
                NodeExecutableResolver.REAL_FILESYSTEM,
                BbjNodeVersionCache.SESSION::getVersion,
                BbjNodeDetector::meetsMinimumVersion);

        String bannerText = NodePresentation.bannerText(resolution);
        if (bannerText == null) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Warning, bannerText);
            for (String actionId : NodePresentation.bannerActions(resolution)) {
                if (actionId.equals(NodePresentation.ACTION_DOWNLOAD)) {
                    panel.createActionLabel("Download Node.js", () ->
                            BbjNodeDownloader.downloadNodeAsync(project, () ->
                                    EditorNotifications.getInstance(project).updateAllNotifications()));
                } else if (actionId.equals(NodePresentation.ACTION_CONFIGURE_PATH)) {
                    panel.createActionLabel("Configure Node.js Path", () ->
                            ShowSettingsUtil.getInstance()
                                    .showSettingsDialog(project, BbjSettingsConfigurable.class));
                } else if (actionId.equals(NodePresentation.ACTION_INSTALL_MANUALLY)) {
                    panel.createActionLabel("Install Node.js Manually", () ->
                            BrowserUtil.browse("https://nodejs.org/"));
                }
            }
            return panel;
        };
    }
}
