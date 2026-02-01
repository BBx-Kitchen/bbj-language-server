package com.basis.bbj.intellij.ui;

import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.ui.EditorNotificationProvider;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Editor banner shown when the BBj language server is in crashed state.
 * Provides actions to restart the server or view the log.
 */
public final class BbjServerCrashNotificationProvider implements EditorNotificationProvider {

    @Override
    public @Nullable Function<? super FileEditor, ? extends JComponent> collectNotificationData(
        @NotNull Project project,
        @NotNull VirtualFile file
    ) {
        // Only show on BBj files
        String extension = file.getExtension();
        if (extension == null ||
            !(extension.equals("bbj") || extension.equals("bbl") ||
              extension.equals("bbjt") || extension.equals("src"))) {
            return null;
        }

        // Check if server is crashed
        BbjServerService service = BbjServerService.getInstance(project);
        if (!service.isServerCrashed()) {
            return null;
        }

        // Create error panel
        return fileEditor -> {
            EditorNotificationPanel panel = new EditorNotificationPanel(EditorNotificationPanel.Status.Error);
            panel.setText("BBj Language Server has crashed. Language features are unavailable.");

            panel.createActionLabel("Restart Server", () -> {
                service.clearCrashState();
                service.restart();
            });

            panel.createActionLabel("Show Log", () -> {
                ToolWindow toolWindow = ToolWindowManager.getInstance(project)
                    .getToolWindow("BBj Language Server");
                if (toolWindow != null) {
                    toolWindow.show();
                }
            });

            return panel;
        };
    }
}
