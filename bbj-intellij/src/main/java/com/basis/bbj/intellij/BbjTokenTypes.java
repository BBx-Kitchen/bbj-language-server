package com.basis.bbj.intellij;

import com.intellij.psi.tree.IElementType;

/**
 * Token types for the minimal BBj lexer.
 */
public final class BbjTokenTypes {

    public static final IElementType WORD = new IElementType("BBJ_WORD", BbjLanguage.INSTANCE);
    public static final IElementType SYMBOL = new IElementType("BBJ_SYMBOL", BbjLanguage.INSTANCE);

    private BbjTokenTypes() {
    }
}
