package com.basis.bbj.intellij;

import com.intellij.lang.BracePair;
import com.intellij.lang.PairedBraceMatcher;
import com.intellij.psi.PsiFile;
import com.intellij.psi.tree.IElementType;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Defines bracket pairs for BBj: (), [], {}
 * Enables bracket matching highlight and Ctrl+Shift+M navigation.
 */
public class BbjPairedBraceMatcher implements PairedBraceMatcher {

    private static final BracePair[] PAIRS = new BracePair[]{
        new BracePair(BbjTokenTypes.LPAREN, BbjTokenTypes.RPAREN, false),
        new BracePair(BbjTokenTypes.LBRACKET, BbjTokenTypes.RBRACKET, false),
        new BracePair(BbjTokenTypes.LBRACE, BbjTokenTypes.RBRACE, true) // structural
    };

    @Override
    public BracePair @NotNull [] getPairs() {
        return PAIRS;
    }

    @Override
    public boolean isPairedBracesAllowedBeforeType(@NotNull IElementType lbraceType,
                                                   @Nullable IElementType contextType) {
        // Safe default: allow auto-closing brackets
        return true;
    }

    @Override
    public int getCodeConstructStart(PsiFile file, int openingBraceOffset) {
        // Simple implementation: return opening brace position
        return openingBraceOffset;
    }
}
