package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

/**
 * Tools menu action to refresh Java classes cache in the BBj language server.
 * Restarts the language server to clear all cached Java class data and reload classpath.
 */
public final class BbjRefreshJavaClassesAction extends AnAction {

    public BbjRefreshJavaClassesAction() {
        super("Refresh Java Classes", "Reload Java classpath and clear cached class information", null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        // Restart the language server to fully clear all Java class caches
        // and reload classpath from settings
        BbjServerService.getInstance(project).restart();
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        boolean enabled = false;
        if (project != null) {
            ServerStatus status = BbjServerService.getInstance(project).getCurrentStatus();
            enabled = status == ServerStatus.started;
        }
        e.getPresentation().setEnabledAndVisible(enabled);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
