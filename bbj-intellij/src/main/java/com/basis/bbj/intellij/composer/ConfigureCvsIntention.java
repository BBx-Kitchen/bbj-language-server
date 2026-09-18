package com.basis.bbj.intellij.composer;

import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code CVS(...)} call: opens the
 * visual composer prefilled from the current call and reconfigures it in place when the server's
 * decode reports the call editable (#649).
 */
public final class ConfigureCvsIntention extends ComposerIntentionBase {

    @Override
    public @NotNull String getText() {
        return "Configure CVS() options…";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "cvs(");
    }

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.CVS;
    }

    @Override
    protected String previewHtml() {
        return "<p>Opens the BBj visual composer for the <code>CVS(...)</code> call under the "
                + "caret. It is prefilled when the mask is a sum of integer literals, or "
                + "from the string argument when the call has no mask yet -- in that case "
                + "applying replaces the unfinished call.</p>";
    }
}
