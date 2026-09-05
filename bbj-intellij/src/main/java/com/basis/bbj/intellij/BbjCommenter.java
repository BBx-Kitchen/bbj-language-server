package com.basis.bbj.intellij;

import com.basis.bbj.intellij.commenter.RemToggleSeam;
import com.intellij.codeInsight.generation.CommenterDataHolder;
import com.intellij.codeInsight.generation.SelfManagingCommenter;
import com.intellij.lang.Commenter;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.util.TextRange;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.Nullable;

/**
 * Line-comment toggle for BBj (#540). The platform's generic (non-self-managing) toggle would
 * compare {@link #getLineCommentPrefix()}'s literal {@code "REM "} case-sensitively, so a line
 * already prefixed {@code rem foo} or {@code Rem foo} was not recognized as commented and Ctrl+/
 * produced a doubled prefix instead of removing the existing one. Implementing
 * {@link SelfManagingCommenter} lets this class decide "is this line commented?" and how to
 * strip the prefix itself, delegating every such decision to {@link RemToggleSeam} — a plain-Java
 * seam with no platform dependency, so recognition and stripping are covered by plain JUnit.
 *
 * <p>{@link SelfManagingCommenter} does not extend {@link Commenter} at the bytecode level, so
 * both interfaces are declared here: {@link #getLineCommentPrefix()} and the other {@link
 * Commenter} methods are kept because other framework call sites still read them.
 *
 * <p>A self-managing commenter bypasses the {@code LINE_COMMENT_AT_FIRST_COLUMN} code-style
 * setting that {@link BbjLanguageCodeStyleSettingsProvider} sets — the platform no longer
 * consults it once this interface is implemented — so {@link #commentLine} computes its
 * replacement from the line's start offset, putting the inserted prefix at column 0 unconditionally.
 */
public class BbjCommenter implements Commenter, SelfManagingCommenter<CommenterDataHolder> {

    @Nullable
    @Override
    public String getLineCommentPrefix() {
        return "REM ";
    }

    @Nullable
    @Override
    public String getBlockCommentPrefix() {
        return null;
    }

    @Nullable
    @Override
    public String getBlockCommentSuffix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentPrefix() {
        return null;
    }

    @Nullable
    @Override
    public String getCommentedBlockCommentSuffix() {
        return null;
    }

    @Override
    public CommenterDataHolder createLineCommentingState(int line, int offset, Document document, PsiFile file) {
        return SelfManagingCommenter.EMPTY_STATE;
    }

    @Override
    public CommenterDataHolder createBlockCommentingState(int startLine, int endLine, Document document, PsiFile file) {
        return SelfManagingCommenter.EMPTY_STATE;
    }

    @Override
    public void commentLine(int line, int offset, Document document, CommenterDataHolder state) {
        int lineStart = document.getLineStartOffset(line);
        int lineEnd = document.getLineEndOffset(line);
        String text = document.getCharsSequence().subSequence(lineStart, lineEnd).toString();
        document.replaceString(lineStart, lineEnd, RemToggleSeam.comment(text));
    }

    @Override
    public void uncommentLine(int line, int offset, Document document, CommenterDataHolder state) {
        int lineStart = document.getLineStartOffset(line);
        int lineEnd = document.getLineEndOffset(line);
        String text = document.getCharsSequence().subSequence(lineStart, lineEnd).toString();
        document.replaceString(lineStart, lineEnd, RemToggleSeam.uncomment(text));
    }

    @Override
    public boolean isLineCommented(int line, int offset, Document document, CommenterDataHolder state) {
        int lineStart = document.getLineStartOffset(line);
        int lineEnd = document.getLineEndOffset(line);
        String text = document.getCharsSequence().subSequence(lineStart, lineEnd).toString();
        return RemToggleSeam.isCommented(text);
    }

    @Override
    public String getCommentPrefix(int line, Document document, CommenterDataHolder state) {
        return RemToggleSeam.COMMENT_PREFIX;
    }

    // BBj has no block comment form. getBlockCommentPrefix(int, Document, CommenterDataHolder)
    // and getBlockCommentSuffix(int, Document, CommenterDataHolder) below are overloads of the
    // no-argument Commenter methods above, not overrides: SelfManagingCommenter declares methods
    // of the same name with a different signature. All five block methods below are no-ops.

    @Override
    public TextRange getBlockCommentRange(int selectionStart, int selectionEnd, Document document, CommenterDataHolder state) {
        return null;
    }

    @Override
    public String getBlockCommentPrefix(int selectionStart, Document document, CommenterDataHolder state) {
        return null;
    }

    @Override
    public String getBlockCommentSuffix(int selectionEnd, Document document, CommenterDataHolder state) {
        return null;
    }

    @Override
    public void uncommentBlockComment(int startOffset, int endOffset, Document document, CommenterDataHolder state) {
        // no-op: BBj has no block comment form
    }

    @Override
    public TextRange insertBlockComment(int startOffset, int endOffset, Document document, CommenterDataHolder state) {
        return null;
    }
}
