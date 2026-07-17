package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

/**
 * Editor action: open the visual addWindow composer (#430/#433). Position-aware — if the caret is
 * inside an existing {@code addWindow(...)} the dialog opens prefilled and rewrites its flag/
 * event_mask hex in place; otherwise it composes a new statement and inserts it at the caret.
 */
public final class BbjComposeAddWindowAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.ADDWINDOW);
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabledAndVisible(e.getProject() != null && e.getData(CommonDataKeys.EDITOR) != null);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
