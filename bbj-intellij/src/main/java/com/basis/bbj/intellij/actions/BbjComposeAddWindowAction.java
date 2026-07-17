package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.AddWindowComposerDialog;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.NotNull;

/**
 * Editor action: open the visual addWindow composer (#430/#433) and insert the composed
 * {@code addWindow(...)} statement at the caret. The flag/hex arithmetic runs in the language
 * server via {@code bbj/composer/*}.
 */
public final class BbjComposeAddWindowAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        BbjComposerService.server(project).thenAccept(server -> {
            if (server == null) {
                notifyNotReady(project);
                return;
            }
            server.composerCatalogs().thenAccept(catalogs ->
                    ApplicationManager.getApplication().invokeLater(() -> {
                        if (catalogs == null || catalogs.addwindow == null) {
                            notifyNotReady(project);
                            return;
                        }
                        AddWindowComposerDialog dialog = new AddWindowComposerDialog(project, server, catalogs.addwindow);
                        if (dialog.showAndGet()) {
                            insertAtCaret(project, editor, dialog.getStatement());
                        }
                    }, ModalityState.defaultModalityState()));
        });
    }

    private static void insertAtCaret(Project project, Editor editor, String text) {
        if (text == null || text.isEmpty()) {
            return;
        }
        WriteCommandAction.runWriteCommandAction(project, "Compose addWindow", null, () -> {
            int offset = editor.getCaretModel().getOffset();
            editor.getDocument().insertString(offset, text);
            editor.getCaretModel().moveToOffset(offset + text.length());
        });
    }

    private static void notifyNotReady(Project project) {
        ApplicationManager.getApplication().invokeLater(() ->
                Messages.showInfoMessage(project,
                        "The BBj language server is not ready yet. Open a BBj file and try again.",
                        "Compose addWindow"),
                ModalityState.defaultModalityState());
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
