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
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code CVS(...)} call: opens the
 * visual composer prefilled from the current call and reconfigures it in place when the server's
 * decode reports the call editable (#649).
 */
public final class ConfigureCvsIntention implements IntentionAction {

    @Override
    public @NotNull String getText() {
        return "Configure CVS() options…";
    }

    @Override
    public @NotNull String getFamilyName() {
        return "BBj visual composer";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "cvs(");
    }

    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS);
        }
    }

    @Override
    public boolean startInWriteAction() {
        return false; // opens a modal dialog, then applies its own write command
    }

    @Override
    public @NotNull IntentionPreviewInfo generatePreview(@NotNull Project project, @NotNull Editor editor, @NotNull PsiFile file) {
        // the popup renders this summary itself, so it never falls back to the description resource
        return new IntentionPreviewInfo.Html(
                "<p>Opens the BBj visual composer for the <code>CVS(...)</code> call under the "
                        + "caret. It is prefilled when the mask is a sum of integer literals, or "
                        + "from the string argument when the call has no mask yet -- in that case "
                        + "applying replaces the unfinished call.</p>");
    }
}
