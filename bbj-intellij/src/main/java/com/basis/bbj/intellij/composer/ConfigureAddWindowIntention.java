package com.basis.bbj.intellij.composer;

import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Lightbulb (Alt+Enter) intention offered when the caret is on a {@code addWindow(...)} call: opens
 * the visual composer prefilled from the current call and rewrites its flag/event_mask hex in place
 * (#430/#433).
 */
public final class ConfigureAddWindowIntention extends ComposerIntentionBase {

    @Override
    public @NotNull String getText() {
        return "Configure window flags…";
    }

    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "addwindow");
    }

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.ADDWINDOW;
    }

    @Override
    protected String previewHtml() {
        return "<p>Opens the BBj visual composer for the <code>addWindow(...)</code> call under the "
                + "caret, prefilled from its current flag and event-mask arguments.</p>";
    }
}
