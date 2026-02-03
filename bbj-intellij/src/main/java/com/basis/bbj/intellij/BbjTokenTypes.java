package com.basis.bbj.intellij;

import com.intellij.psi.tree.IElementType;

/**
 * Token types for the minimal BBj lexer.
 */
public final class BbjTokenTypes {

    public static final IElementType WORD = new IElementType("BBJ_WORD", BbjLanguage.INSTANCE);
    public static final IElementType SYMBOL = new IElementType("BBJ_SYMBOL", BbjLanguage.INSTANCE);

    // Bracket token types for PairedBraceMatcher
    public static final IElementType LPAREN = new IElementType("BBJ_LPAREN", BbjLanguage.INSTANCE);
    public static final IElementType RPAREN = new IElementType("BBJ_RPAREN", BbjLanguage.INSTANCE);
    public static final IElementType LBRACKET = new IElementType("BBJ_LBRACKET", BbjLanguage.INSTANCE);
    public static final IElementType RBRACKET = new IElementType("BBJ_RBRACKET", BbjLanguage.INSTANCE);
    public static final IElementType LBRACE = new IElementType("BBJ_LBRACE", BbjLanguage.INSTANCE);
    public static final IElementType RBRACE = new IElementType("BBJ_RBRACE", BbjLanguage.INSTANCE);

    private BbjTokenTypes() {
    }
}
