package com.basis.bbj.intellij.denum;

import org.jetbrains.annotations.NotNull;

/**
 * Java port of {@code isLineNumberedSource} in {@code bbj-vscode/src/line-numbering.ts}, same rule:
 * the first 20 non-blank lines must each be digits after optional leading whitespace, then spaces or
 * tabs, then a non-whitespace character, and at least 3 such lines must be seen. It is written as a
 * character loop so JavaScript's whitespace set and ASCII-only digits are matched exactly; it reads
 * at most 20 non-blank lines and copies nothing.
 */
public final class LineNumbering {

    static final int MAX_LINES_TO_INSPECT = 20;
    static final int MIN_LINES_TO_DECIDE = 3;

    private LineNumbering() {}

    public static boolean isLineNumberedSource(@NotNull CharSequence text) {
        int length = text.length();
        int inspected = 0;
        int lineStart = 0;
        while (lineStart <= length) {
            int lineEnd = lineStart;
            while (lineEnd < length && text.charAt(lineEnd) != '\n') {
                lineEnd++;
            }
            if (!isBlank(text, lineStart, lineEnd)) {
                if (!isNumbered(text, lineStart, lineEnd)) {
                    return false;
                }
                if (++inspected >= MAX_LINES_TO_INSPECT) {
                    break;
                }
            }
            lineStart = lineEnd + 1;
        }
        return inspected >= MIN_LINES_TO_DECIDE;
    }

    private static boolean isBlank(CharSequence text, int start, int end) {
        for (int i = start; i < end; i++) {
            if (!isJsWhitespace(text.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    private static boolean isNumbered(CharSequence text, int start, int end) {
        int i = start;
        while (i < end && isJsWhitespace(text.charAt(i))) {
            i++;
        }
        int digitsStart = i;
        while (i < end && text.charAt(i) >= '0' && text.charAt(i) <= '9') {
            i++;
        }
        if (i == digitsStart) {
            return false;
        }
        int separatorStart = i;
        while (i < end && (text.charAt(i) == ' ' || text.charAt(i) == '\t')) {
            i++;
        }
        if (i == separatorStart) {
            return false;
        }
        return i < end && !isJsWhitespace(text.charAt(i));
    }

    private static boolean isJsWhitespace(char c) {
        switch (c) {
            case '\t':
            case 0x0B:
            case '\f':
            case ' ':
            case '\n':
            case '\r':
            case 0x00A0:
            case 0xFEFF:
            case 0x2028:
            case 0x2029:
                return true;
            default:
                return Character.getType(c) == Character.SPACE_SEPARATOR;
        }
    }
}
