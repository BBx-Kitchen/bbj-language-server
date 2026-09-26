package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjNotificationProviderBase;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.EditorNotificationPanel;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Editor banner shown only after auto-restart has given up on the BBj language server -- a
 * quiet, auto-restarted first crash never shows this banner. Provides actions to restart the
 * server or view the log.
 */
public final class BbjServerCrashNotificationProvider extends BbjNotificationProviderBase {

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent> buildPanel(
        @NotNull Project project,
        @NotNull VirtualFile file
    ) {
        // Only show once auto-restart has given up -- never for a quiet, auto-restarted first crash
        BbjServerService service = BbjServerService.getInstance(project);
        if (!service.isAutoRestartAbandoned()) {
            return null;
        }

        // Create error panel
        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Error,
                    "BBj Language Server crashed again within " + (BbjServerService.CRASH_WINDOW_MS / 1000)
                            + " seconds and was not restarted. Language features are unavailable.");

            panel.createActionLabel("Restart Server", () -> {
                service.requestRestart(0);
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
