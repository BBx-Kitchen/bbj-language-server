package com.basis.bbj.intellij;

import com.basis.bbj.intellij.ui.BbjJavaInteropService;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.ui.EditorNotificationProvider;
import com.intellij.openapi.options.ShowSettingsUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Shows an editor banner on BBj files when the java-interop service is
 * disconnected. The banner provides a quick link to open the BBj settings page.
 * Banner is non-dismissible and disappears when java-interop becomes available.
 */
public final class BbjJavaInteropNotificationProvider
        implements EditorNotificationProvider, DumbAware {

    @Override
    public @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {

        if (file.getFileType() != BbjFileType.INSTANCE) {
            return null;
        }

        BbjJavaInteropService service = BbjJavaInteropService.getInstance(project);
        BbjJavaInteropService.InteropStatus currentStatus = service.getCurrentStatus();

        // Suppress banner until first health check completes (avoids flash on startup)
        if (!service.isFirstCheckCompleted()) {
            return null;
        }

        // Only show banner when disconnected (not when CONNECTED or CHECKING)
        if (currentStatus == BbjJavaInteropService.InteropStatus.CONNECTED ||
            currentStatus == BbjJavaInteropService.InteropStatus.CHECKING) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = new EditorNotificationPanel(
                    fileEditor, EditorNotificationPanel.Status.Warning);
            panel.setText("Start BBjServices for Java completions");
            panel.createActionLabel("Open Settings", () ->
                    ShowSettingsUtil.getInstance()
                            .showSettingsDialog(project, BbjSettingsConfigurable.class));
            return panel;
        };
    }
}
