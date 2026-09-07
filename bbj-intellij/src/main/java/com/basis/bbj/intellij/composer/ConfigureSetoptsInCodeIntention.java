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
 * Lightbulb (Alt+Enter) intention offered on a BBj-code line naming {@code SETOPTS}, {@code IOR(}
 * or {@code AND(} (#475, DISC-06): opens the tri-state Set/Clear/Leave composer for a safe chain
 * or compose-new, the existing two-state composer for an absolute literal, or shows the server's
 * own reason when the shape at the caret cannot be safely edited in place. The authoritative
 * safe/unsafe decision is always server-side ({@code decodeInCode}) -- this class's own
 * {@code isAvailable} is a cheap, synchronous line-text gate only, matching every other composer
 * intention's split between a cheap client trigger and an authoritative server decode.
 */
public final class ConfigureSetoptsInCodeIntention implements IntentionAction {

    @Override
    public @NotNull String getText() {
        return "Configure SETOPTS options in code…";
    }

    @Override
    public @NotNull String getFamilyName() {
        return "BBj visual composer";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnSetoptsInCode(editor);
    }

    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.SETOPTS_IN_CODE);
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
                "<p>Opens the BBj tri-state SETOPTS composer for the read-modify-write block at or "
                        + "near the caret -- composing a new block, or editing an existing safe chain "
                        + "in place.</p>");
    }
}
