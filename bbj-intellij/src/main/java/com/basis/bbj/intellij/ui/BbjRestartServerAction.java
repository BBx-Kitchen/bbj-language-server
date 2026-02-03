package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjIcons;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

/**
 * Tools menu action to restart the BBj language server.
 * Visible and enabled only when a BBj file is focused in the editor.
 */
public final class BbjRestartServerAction extends AnAction {

    public BbjRestartServerAction() {
        super("Restart BBj Language Server", "Restart the BBj language server", BbjIcons.FILE);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }
        BbjServerService.getInstance(project).restart();
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        boolean isBbjFile = false;
        if (file != null) {
            String ext = file.getExtension();
            isBbjFile = ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src"));
        }

        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile);
    }
}
