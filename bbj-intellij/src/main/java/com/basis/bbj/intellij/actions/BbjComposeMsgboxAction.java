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
 * Editor action: open the visual MSGBOX composer (#426/#433). Position-aware — if the caret is
 * inside an existing {@code MSGBOX(...)} the dialog opens prefilled and reconfigures it in place;
 * otherwise it composes a new statement and inserts it at the caret.
 */
public final class BbjComposeMsgboxAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX);
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
