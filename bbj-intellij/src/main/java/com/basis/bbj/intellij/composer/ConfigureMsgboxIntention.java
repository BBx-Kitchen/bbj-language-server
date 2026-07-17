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
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code MSGBOX(...)} call: opens the
 * visual composer prefilled from the current call and reconfigures it in place (#426/#433).
 */
public final class ConfigureMsgboxIntention implements IntentionAction {

    @Override
    public @NotNull String getText() {
        return "Configure MSGBOX options…";
    }

    @Override
    public @NotNull String getFamilyName() {
        return "BBj visual composer";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "msgbox");
    }

    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX);
        }
    }

    @Override
    public boolean startInWriteAction() {
        return false; // opens a modal dialog, then applies its own write command
    }

    @Override
    public @NotNull IntentionPreviewInfo generatePreview(@NotNull Project project, @NotNull Editor editor, @NotNull PsiFile file) {
        return IntentionPreviewInfo.EMPTY; // interactive dialog — no inline preview
    }
}
