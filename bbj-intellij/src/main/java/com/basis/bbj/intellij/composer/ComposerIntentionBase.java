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
 * Shared base for the five composer lightbulb intentions (#618): family name, write-action
 * policy, launch call and preview construction are identical across all five and live here
 * exactly once. Each subclass supplies only its own {@code getText()}, {@code isAvailable(...)}
 * predicate, {@link ComposerLauncher.Kind} and preview sentence.
 *
 * <p>This is deliberately an abstract base plus thin no-arg subclasses, NOT a single
 * data-driven registration: IntelliJ's {@code <intentionAction>} extension point accepts only
 * {@code <className>}, instantiates via a no-arg constructor, and gives the instance no way to
 * learn which registration produced it, so one class registered five times could not vary its
 * text, Kind or keyword.
 *
 * <p>{@code getText()} and {@code isAvailable(...)} are deliberately NOT declared here: every
 * subclass supplies its own, so a new intention that forgets one fails to compile rather than
 * silently inheriting the wrong behavior.
 */
public abstract class ComposerIntentionBase implements IntentionAction {

    @Override
    public final @NotNull String getFamilyName() {
        return "BBj visual composer";
    }

    @Override
    public final boolean startInWriteAction() {
        return false; // opens a modal dialog, then applies its own write command
    }

    @Override
    public final void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) throws IncorrectOperationException {
        if (editor != null) {
            ComposerLauncher.launch(project, editor, kind());
        }
    }

    @Override
    public final @NotNull IntentionPreviewInfo generatePreview(@NotNull Project project, @NotNull Editor editor, @NotNull PsiFile file) {
        // the popup renders this summary itself, so it never falls back to the description resource
        return new IntentionPreviewInfo.Html(previewHtml());
    }

    /**
     * The composer kind this intention launches. Supplied by each subclass.
     */
    protected abstract ComposerLauncher.Kind kind();

    /**
     * The full {@code <p>...</p>} HTML preview sentence this intention shows in the lightbulb
     * popup. Supplied by each subclass.
     */
    protected abstract String previewHtml();
}
