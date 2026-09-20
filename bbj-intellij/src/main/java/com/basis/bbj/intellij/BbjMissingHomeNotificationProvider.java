package com.basis.bbj.intellij;

import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.openapi.options.ShowSettingsUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Shows an editor banner on BBj files when the BBj home directory is
 * not configured or points to an invalid location. The banner provides
 * a quick link to open the BBj settings page.
 */
public final class BbjMissingHomeNotificationProvider extends BbjNotificationProviderBase {

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {

        String bbjHomePath = BbjSettings.getInstance().getState().bbjHomePath;
        if (!bbjHomePath.isEmpty() && BbjHomeDetector.isValidBbjHome(bbjHomePath)) {
            return null;
        }

        // Try auto-detection when no path is configured
        if (bbjHomePath.isEmpty()) {
            String detected = BbjHomeDetector.detectBbjHome();
            if (detected != null) {
                return null;
            }
        }

        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Warning,
                    "BBj home directory is not configured");
            panel.createActionLabel("Configure BBj Home", () ->
                    ShowSettingsUtil.getInstance()
                            .showSettingsDialog(project, BbjSettingsConfigurable.class));
            return panel;
        };
    }
}
