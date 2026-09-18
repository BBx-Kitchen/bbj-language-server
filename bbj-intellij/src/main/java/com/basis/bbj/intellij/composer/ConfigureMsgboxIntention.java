package com.basis.bbj.intellij.composer;

import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code MSGBOX(...)} call: opens the
 * visual composer prefilled from the current call and reconfigures it in place (#426/#433).
 */
public final class ConfigureMsgboxIntention extends ComposerIntentionBase {

    @Override
    public @NotNull String getText() {
        return "Configure MSGBOX options…";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "msgbox");
    }

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.MSGBOX;
    }

    @Override
    protected String previewHtml() {
        return "<p>Opens the BBj visual composer for the <code>MSGBOX(...)</code> call under the "
                + "caret, prefilled from its current arguments. On a call still being typed, "
                + "it completes that call in place instead.</p>";
    }
}
