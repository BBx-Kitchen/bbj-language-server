package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

/**
 * Editor action: open the visual SETOPTS composer for the resolved config file (#633). PSI-free by
 * design -- {@code BbxConfigLanguage}/{@code BbjConfigFileType} (Phase 84 Plan 05) has no parser, and
 * the config language reaches the language server only under its own {@code bbx-config} language id,
 * which the server never parses, so this action's availability check scans no syntax tree at all.
 * One entry point covers both modes (D-05/D-06): the caret's line is captured inside {@link
 * ComposerLauncher#launch} and decoded server-side via {@code bbj/composer/setopts/decodeCall} --
 * an existing {@code SETOPTS <hex>} line opens the dialog in edit mode for that line, any other line
 * opens it in compose-new mode targeting the caret. This action binds no default keystroke in this
 * phase (D-04).
 */
public final class BbjComposeSetoptsAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.SETOPTS);
    }

    /**
     * Scoped to the resolved config file only (D-02): absent, not merely disabled, everywhere else.
     * Per D-03 the action is available on every line of a config file, so this never reads the
     * caret's line text -- the edit-vs-compose-new decision happens at launch, server-side.
     */
    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        VirtualFile file = editor != null ? FileDocumentManager.getInstance().getFile(editor.getDocument()) : null;
        e.getPresentation().setEnabledAndVisible(
                project != null && editor != null && BbjConfigPathService.getInstance().isConfigFile(file));
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
