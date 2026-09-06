package com.basis.bbj.intellij.lexer;

/**
 * Plain-Java scanning seam for BBj string literals and {@code rem} line comments (#568).
 *
 * <p>Mirrors two terminals from the language server's grammar
 * ({@code bbj-vscode/src/language/bbj.langium}) verbatim:
 *
 * <pre>
 * terminal COMMENT: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/;
 * terminal STRING_LITERAL: /"([^"]|"{2})*"/;
 * </pre>
 *
 * <p>Offsets passed to and returned from these methods are UTF-16 code units of the
 * {@link CharSequence}, matching IntelliJ's document model — a literal containing an astral
 * character (a surrogate pair) still counts as one span, and its end offset counts code units,
 * not code points.
 *
 * <p>Mnemonics ({@code '...'}) are deliberately not handled here: their bodies cannot contain
 * brackets and the parenthesis characters that follow a mnemonic are real brackets.
 */
public final class BbjStringCommentScanner {

    private BbjStringCommentScanner() {
    }

    /**
     * Scans a double-quoted string literal starting at {@code start}, where
     * {@code text.charAt(start)} is guaranteed to be a double quote. A doubled quote
     * ({@code ""}) inside the literal is an escaped quote and does not end it. Returns the
     * exclusive offset just past the closing quote, or — if the literal is unterminated — the
     * offset of the line's carriage return or line feed, or {@code end} when the line has
     * neither, so an unterminated literal never consumes the line terminator or any part of the
     * following line.
     */
    public static int scanString(CharSequence text, int start, int end) {
        int pos = start + 1;
        while (pos < end) {
            char c = text.charAt(pos);
            if (c == '\r' || c == '\n') {
                return pos;
            }
            if (c == '"') {
                if (pos + 1 < end && text.charAt(pos + 1) == '"') {
                    pos += 2;
                    continue;
                }
                return pos + 1;
            }
            pos++;
        }
        return end;
    }

    /**
     * True when the three characters at {@code start} are {@code r}, {@code e}, {@code m} in any
     * combination of case, and the character that follows — if any exists before {@code end} —
     * is not a Java letter, digit, underscore, {@code !}, {@code $}, {@code %}, or {@code @}:
     * the grammar's right-hand word-boundary guard. Each of the three letters is compared against
     * its upper- and lower-case ASCII form directly; recognition never folds case through a
     * locale-sensitive string method, so it is unaffected by the default locale.
     */
    public static boolean isCommentStart(CharSequence text, int start, int end) {
        if (start + 3 > end) {
            return false;
        }
        if (!isRChar(text.charAt(start)) || !isEChar(text.charAt(start + 1)) || !isMChar(text.charAt(start + 2))) {
            return false;
        }
        if (start + 3 >= end) {
            return true;
        }
        char next = text.charAt(start + 3);
        return !(Character.isLetterOrDigit(next) || next == '_' || next == '!' || next == '$' || next == '%'
                || next == '@');
    }

    /**
     * Scans a {@code rem} line comment starting at {@code start}, where {@code isCommentStart}
     * has already been confirmed true for this range. Returns the offset of the first carriage
     * return or line feed at or after {@code start}, or {@code end} when the line has none; the
     * line terminator itself is left for the caller's whitespace handling.
     */
    public static int scanComment(CharSequence text, int start, int end) {
        int pos = start;
        while (pos < end) {
            char c = text.charAt(pos);
            if (c == '\r' || c == '\n') {
                return pos;
            }
            pos++;
        }
        return end;
    }

    private static boolean isRChar(char c) {
        return c == 'r' || c == 'R';
    }

    private static boolean isEChar(char c) {
        return c == 'e' || c == 'E';
    }

    private static boolean isMChar(char c) {
        return c == 'm' || c == 'M';
    }
}
