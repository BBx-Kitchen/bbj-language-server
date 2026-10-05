package com.basis.bbj.intellij.lsp;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Literal-aware scanning helpers shared by the source-guard tests.
 * <p>
 * The guards read Java sources as plain text. A regex that removes {@code //} comments also eats
 * the rest of a line after a {@code //} inside a string literal (for example a URL), and a plain
 * brace counter is thrown off by a brace inside a string or char literal. These helpers walk the
 * text once and treat string literals, char literals, text blocks and comments as opaque units, so
 * a guard can neither fail misleadingly nor pass vacuously because of such a literal.
 */
final class JavaSourceScan {

    private JavaSourceScan() {
    }

    /**
     * Returns the index just after the string, char or text-block literal that starts at
     * {@code start}, or {@code start} itself when no literal starts there. An unterminated
     * string or char literal ends at its line break.
     */
    private static int literalEnd(String text, int start) {
        int length = text.length();
        if (text.startsWith("\"\"\"", start)) {
            int i = start + 3;
            while (i < length) {
                if (text.charAt(i) == '\\') {
                    i += 2;
                } else if (text.startsWith("\"\"\"", i)) {
                    return i + 3;
                } else {
                    i++;
                }
            }
            return length;
        }
        char quote = text.charAt(start);
        if (quote != '"' && quote != '\'') {
            return start;
        }
        int i = start + 1;
        while (i < length) {
            char c = text.charAt(i);
            if (c == '\\') {
                i += 2;
            } else if (c == quote) {
                return i + 1;
            } else if (c == '\n') {
                return i;
            } else {
                i++;
            }
        }
        return length;
    }

    /**
     * Returns the index just after the comment that starts at {@code start}, or {@code start}
     * itself when no comment starts there. A line comment ends before its line break.
     */
    private static int commentEnd(String text, int start) {
        if (text.startsWith("//", start)) {
            int lineBreak = text.indexOf('\n', start);
            return lineBreak < 0 ? text.length() : lineBreak;
        }
        if (text.startsWith("/*", start)) {
            int close = text.indexOf("*/", start + 2);
            return close < 0 ? text.length() : close + 2;
        }
        return start;
    }

    /**
     * Removes block comments (including Javadoc) and line comments, keeping string, char and
     * text-block literals exactly as written, so prose can neither satisfy nor break an assertion
     * and a {@code //} inside a literal survives.
     */
    static String stripComments(String text) {
        StringBuilder out = new StringBuilder(text.length());
        int i = 0;
        while (i < text.length()) {
            int afterComment = commentEnd(text, i);
            if (afterComment > i) {
                i = afterComment;
                continue;
            }
            int afterLiteral = literalEnd(text, i);
            if (afterLiteral > i) {
                out.append(text, i, afterLiteral);
                i = afterLiteral;
                continue;
            }
            out.append(text.charAt(i));
            i++;
        }
        return out.toString();
    }

    /**
     * Returns the text from the first opening brace after {@code signature} to its matching
     * closing brace, both included. Braces inside literals and comments are not counted. Fails
     * the test when the signature or the matching brace cannot be found.
     */
    static String bodyOf(String text, String signature) {
        int at = text.indexOf(signature);
        assertTrue(at >= 0, "signature not found: " + signature);
        int open = text.indexOf('{', at);
        assertTrue(open >= 0, "no opening brace found after: " + signature);
        int depth = 0;
        int i = open;
        while (i < text.length()) {
            int skipped = Math.max(commentEnd(text, i), literalEnd(text, i));
            if (skipped > i) {
                i = skipped;
                continue;
            }
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(open, i + 1);
                }
            }
            i++;
        }
        fail("unbalanced braces after " + signature);
        throw new AssertionError("unreachable");
    }

    /** Like {@link #bodyOf}, but returns only the text between the braces. */
    static String methodBody(String text, String signature) {
        String body = bodyOf(text, signature);
        return body.substring(1, body.length() - 1);
    }
}
