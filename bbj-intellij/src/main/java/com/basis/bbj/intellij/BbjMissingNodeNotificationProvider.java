package com.basis.bbj.intellij;

import com.intellij.ide.BrowserUtil;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.ui.EditorNotificationProvider;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.io.File;
import java.util.function.Function;

/**
 * Shows an editor banner on BBj files when Node.js 18+ is not available.
 * The banner provides links to configure the Node.js path in settings
 * or to download Node.js from nodejs.org.
 */
public final class BbjMissingNodeNotificationProvider
        implements EditorNotificationProvider, DumbAware {

    @Override
    public @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {

        if (file.getFileType() != BbjFileType.INSTANCE) {
            return null;
        }

        String nodeJsPath = BbjSettings.getInstance().getState().nodeJsPath;

        // Check explicitly configured path
        if (!nodeJsPath.isEmpty()) {
            if (new File(nodeJsPath).exists()
                    && BbjNodeDetector.meetsMinimumVersion(
                            BbjNodeDetector.getNodeVersion(nodeJsPath))) {
                return null;
            }
        } else {
            // Try auto-detection from PATH
            String detected = BbjNodeDetector.detectNodePath();
            if (detected != null
                    && BbjNodeDetector.meetsMinimumVersion(
                            BbjNodeDetector.getNodeVersion(detected))) {
                return null;
            }
        }

        return fileEditor -> {
            EditorNotificationPanel panel = new EditorNotificationPanel(
                    fileEditor, EditorNotificationPanel.Status.Warning);
            panel.setText("Node.js 18+ is required to run the BBj language server");
            panel.createActionLabel("Configure Node.js Path", () ->
                    ShowSettingsUtil.getInstance()
                            .showSettingsDialog(project, BbjSettingsConfigurable.class));
            panel.createActionLabel("Install Node.js", () ->
                    BrowserUtil.browse("https://nodejs.org/"));
            return panel;
        };
    }
}
