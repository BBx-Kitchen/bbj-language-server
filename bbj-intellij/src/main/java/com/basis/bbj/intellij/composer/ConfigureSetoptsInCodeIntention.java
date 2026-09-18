package com.basis.bbj.intellij.composer;

import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
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
public final class ConfigureSetoptsInCodeIntention extends ComposerIntentionBase {

    @Override
    public @NotNull String getText() {
        return "Configure SETOPTS options in code…";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnSetoptsInCode(editor);
    }

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.SETOPTS_IN_CODE;
    }

    @Override
    protected String previewHtml() {
        return "<p>Opens the BBj tri-state SETOPTS composer for the read-modify-write block at or "
                + "near the caret -- composing a new block, or editing an existing safe chain "
                + "in place.</p>";
    }
}
