package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Shared base for the six composer-launch editor actions (#616): the launch call, the
 * presence-scoped availability gate and the background update thread are identical across all six
 * and live here exactly once. Each subclass supplies only its own {@link ComposerLauncher.Kind};
 * the two SETOPTS actions additionally override {@link #isAvailableFor} with their own file-scoped
 * predicate.
 *
 * <p>This is deliberately an abstract base plus thin no-arg subclasses, NOT a single data-driven
 * registration keyed off the registered action id: an {@code AnAction} could read its own id via
 * {@code ActionManager.getId(this)} and map it to a {@link ComposerLauncher.Kind}, but that would
 * turn a renamed or mistyped action id into a silent no-op at click time instead of a compile
 * error. The kind stays a compile-time constant per subclass so that failure mode cannot happen.
 * Mirrors {@code ComposerIntentionBase}'s shape so both consolidations have one review story.
 */
public abstract class BbjComposeActionBase extends AnAction {

    @Override
    public final void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, kind());
    }

    /**
     * Default presence gate: available whenever a project and an editor are present. The two
     * SETOPTS subclasses override {@link #isAvailableFor} rather than this method, so the
     * project/editor half of the gate is written here exactly once and is never repeated by a
     * subclass.
     */
    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        VirtualFile file = editor != null ? FileDocumentManager.getInstance().getFile(editor.getDocument()) : null;
        e.getPresentation().setEnabledAndVisible(
                project != null && editor != null && isAvailableFor(project, editor, file));
    }

    /**
     * The subclass-specific half of the availability gate, consulted only once project and editor
     * are both known non-null. The four uniform actions inherit this default of {@code true}
     * unchanged; the two SETOPTS actions override it with their own file-scoped predicate.
     */
    protected boolean isAvailableFor(@NotNull Project project, @NotNull Editor editor, @Nullable VirtualFile file) {
        return true;
    }

    @Override
    public final @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }

    /**
     * The composer kind this action launches. Supplied by each subclass.
     */
    protected abstract ComposerLauncher.Kind kind();
}
