package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.basis.bbj.intellij.composer.ComposerLensKinds;
import com.basis.bbj.intellij.composer.ComposerModels.ComposerLensTarget;
import com.basis.bbj.intellij.composer.ComposerNoticeRenderer;
import com.basis.bbj.intellij.composer.ComposerNotices;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.commands.CommandExecutor;
import com.redhat.devtools.lsp4ij.commands.LSPCommand;
import com.redhat.devtools.lsp4ij.commands.LSPCommandAction;
import org.jetbrains.annotations.NotNull;

/**
 * LSP4IJ dispatches a click on the language server's composer cue (a {@code textDocument/codeLens}
 * entry) to the IntelliJ action whose id equals the cue's command string — LSP4IJ's own
 * {@code CommandExecutor} resolves {@code ActionManager.getAction(commandId)} and invokes it, with
 * the {@link LSPCommand} available under {@link CommandExecutor#LSP_COMMAND} in the action's data
 * context (#650). This action's id, {@link ComposerLensKinds#OPEN_COMPOSER_AT_COMMAND}, must equal
 * the server's own command literal in {@code bbj-vscode/src/composer-lens-contract.ts} — pinned by
 * {@code ComposerLensCommandContractTest}.
 *
 * <p>This action only routes the server-computed {@link ComposerLensTarget} to
 * {@link ComposerLauncher#launchAt}; it makes no applicability decision of its own (D-07's
 * anti-feature guard).</p>
 */
public final class BbjOpenComposerAtAction extends LSPCommandAction {

    @Override
    protected void commandPerformed(@NotNull LSPCommand command, @NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLensTarget target = command.getArgumentAt(0, ComposerLensTarget.class);
        if (target == null) {
            return;
        }
        ComposerLensKinds.launcherKindOf(target.kind).ifPresentOrElse(
                kind -> ComposerLauncher.launchAt(project, editor, kind, target.line, target.character, true),
                () -> ComposerNoticeRenderer.render(project,
                        ComposerNotices.requestFailed("composer", "unsupported composer cue: " + target.kind),
                        null));
    }

    /**
     * LSP4IJ's default {@link #getCommandPerformedThread()} is {@code ActionUpdateThread.BGT}
     * (a background thread), but {@link ComposerLauncher#launchAt} reads the document and opens
     * modal dialogs, both of which require the EDT (T-89-11).
     */
    @Override
    protected @NotNull ActionUpdateThread getCommandPerformedThread() {
        return ActionUpdateThread.EDT;
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabledAndVisible(e.getData(CommandExecutor.LSP_COMMAND) != null);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
