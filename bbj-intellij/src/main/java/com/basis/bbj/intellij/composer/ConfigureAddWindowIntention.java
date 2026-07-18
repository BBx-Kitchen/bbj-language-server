package com.basis.bbj.intellij.composer;

import com.intellij.codeInsight.intention.IntentionAction;
import com.intellij.codeInsight.intention.preview.IntentionPreviewInfo;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import com.intellij.util.IncorrectOperationException;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code addWindow(...)} call: opens
 * the visual composer prefilled from the current call and rewrites its flag/event_mask hex in place
 * (#430/#433).
 */
public final class ConfigureAddWindowIntention implements IntentionAction {

    @Override
    public @NotNull String getText() {
        return "Configure window flags…";
    }

    @Override
    public @NotNull String getFamilyName() {
        return "BBj visual composer";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "addwindow");
    }

    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.ADDWINDOW);
        }
    }

    @Override
    public boolean startInWriteAction() {
        return false;
    }

    @Override
    public @NotNull IntentionPreviewInfo generatePreview(@NotNull Project project, @NotNull Editor editor, @NotNull PsiFile file) {
        return IntentionPreviewInfo.EMPTY;
    }
}
