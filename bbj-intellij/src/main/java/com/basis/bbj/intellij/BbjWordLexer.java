package com.basis.bbj.intellij;

import com.intellij.lexer.LexerBase;
import com.intellij.psi.TokenType;
import com.intellij.psi.tree.IElementType;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Minimal lexer that splits BBj source into word and whitespace tokens.
 *
 * This does not attempt full BBj lexing — syntax highlighting is handled by
 * the TextMate engine. The sole purpose is to produce word-sized tokens so
 * that {@code PsiFile.findElementAt()} returns correctly-bounded elements
 * for LSP4IJ navigation features (Cmd/Ctrl+hover, go-to-definition).
 */
public final class BbjWordLexer extends LexerBase {

    private CharSequence buffer;
    private int bufferEnd;
    private int tokenStart;
    private int tokenEnd;
    private IElementType tokenType;

    @Override
    public void start(@NotNull CharSequence buffer, int startOffset, int endOffset, int initialState) {
        this.buffer = buffer;
        this.bufferEnd = endOffset;
        this.tokenStart = startOffset;
        this.tokenEnd = startOffset;
        this.tokenType = null;
        advance();
    }

    @Override
    public int getState() {
        return 0;
    }

    @Override
    public @Nullable IElementType getTokenType() {
        return tokenType;
    }

    @Override
    public int getTokenStart() {
        return tokenStart;
    }

    @Override
    public int getTokenEnd() {
        return tokenEnd;
    }

    @Override
    public void advance() {
        tokenStart = tokenEnd;
        if (tokenStart >= bufferEnd) {
            tokenType = null;
            return;
        }

        char c = buffer.charAt(tokenStart);
        if (Character.isWhitespace(c)) {
            tokenEnd = tokenStart + 1;
            while (tokenEnd < bufferEnd && Character.isWhitespace(buffer.charAt(tokenEnd))) {
                tokenEnd++;
            }
            tokenType = TokenType.WHITE_SPACE;
        } else if (Character.isLetterOrDigit(c) || c == '_') {
            tokenEnd = tokenStart + 1;
            while (tokenEnd < bufferEnd) {
                char next = buffer.charAt(tokenEnd);
                if (Character.isLetterOrDigit(next) || next == '_') {
                    tokenEnd++;
                } else {
                    break;
                }
            }
            tokenType = BbjTokenTypes.WORD;
        } else {
            // Punctuation / operators — single character each
            tokenEnd = tokenStart + 1;
            tokenType = switch (c) {
                case '(' -> BbjTokenTypes.LPAREN;
                case ')' -> BbjTokenTypes.RPAREN;
                case '[' -> BbjTokenTypes.LBRACKET;
                case ']' -> BbjTokenTypes.RBRACKET;
                case '{' -> BbjTokenTypes.LBRACE;
                case '}' -> BbjTokenTypes.RBRACE;
                default -> BbjTokenTypes.SYMBOL;
            };
        }
    }

    @Override
    public @NotNull CharSequence getBufferSequence() {
        return buffer;
    }

    @Override
    public int getBufferEnd() {
        return bufferEnd;
    }
}
