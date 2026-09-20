package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.NodeAvailability;
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
import java.util.function.Function;

/**
 * Shows an editor banner on BBj files when Node.js 18+ is not available.
 * The banner provides links to configure the Node.js path in settings
 * or to download Node.js from nodejs.org.
 */
public final class BbjMissingNodeNotificationProvider extends BbjNotificationProviderBase {

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {

        String nodeJsPath = BbjSettings.getInstance().getState().nodeJsPath;

        NodeAvailability.Decision decision = NodeAvailability.decide(
                nodeJsPath,
                NodeAvailability.REAL_FILES,
                BbjNodeVersionCache.SESSION::getVersion,
                BbjNodeDetector::meetsMinimumVersion,
                BbjNodeDetector::detectNodePath,
                BbjNodeDownloader::getCachedNodePath);
        if (!NodeAvailability.bannerNeeded(decision)) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Warning,
                    "Node.js 18+ is required to run the BBj language server");
            panel.createActionLabel("Download Node.js", () ->
                    BbjNodeDownloader.downloadNodeAsync(project, () ->
                            EditorNotifications.getInstance(project).updateAllNotifications()));
            panel.createActionLabel("Configure Node.js Path", () ->
                    ShowSettingsUtil.getInstance()
                            .showSettingsDialog(project, BbjSettingsConfigurable.class));
            panel.createActionLabel("Install Node.js Manually", () ->
                    BrowserUtil.browse("https://nodejs.org/"));
            return panel;
        };
    }
}
