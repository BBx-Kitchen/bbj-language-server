package com.basis.bbj.intellij.commenter;

/**
 * Recognizes and toggles BBj's {@code rem} line-comment prefix, in any letter case, without
 * relying on any IntelliJ platform type — kept as a plain-Java seam so it can be driven directly
 * by JUnit; {@code BbjCommenter} owns the platform wiring and delegates every decision here.
 *
 * <p>BBj sources commonly write the comment prefix in lowercase or mixed case ({@code rem},
 * {@code Rem}), but historically {@code BbjCommenter} recognized only the literal uppercase
 * {@code "REM "} that commenting inserts, so toggling an already-commented lowercase line
 * produced a doubled prefix instead of removing it (#540). This seam mirrors the language
 * grammar's own word boundary for the {@code COMMENT} terminal:
 *
 * <pre>{@code
 * terminal COMMENT: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/;
 * }</pre>
 *
 * <p>Recognition here requires the character following {@code rem} (in any case) to be a space,
 * a tab, or end of line, so {@code remark}, {@code rem15} and {@code rem$} are never treated as
 * comments. Only recognition is case-insensitive: {@link #comment(String)} always inserts the
 * uppercase {@link #COMMENT_PREFIX}.
 */
public final class RemToggleSeam {

    /** The prefix commenting inserts: uppercase with one trailing space. */
    public static final String COMMENT_PREFIX = "REM ";

    private RemToggleSeam() {
    }

    /**
     * True when {@code line} is already commented: optional leading whitespace, then {@code rem}
     * in any combination of upper- and lower-case, then a space, a tab, or end of line.
     */
    public static boolean isCommented(String line) {
        int i = leadingWhitespaceLength(line);
        if (i + 3 > line.length()) {
            return false;
        }
        if (!isR(line.charAt(i)) || !isE(line.charAt(i + 1)) || !isM(line.charAt(i + 2))) {
            return false;
        }
        int after = i + 3;
        if (after == line.length()) {
            return true;
        }
        char next = line.charAt(after);
        return next == ' ' || next == '\t';
    }

    /** Inserts {@link #COMMENT_PREFIX} at position zero; the line's own text follows unchanged. */
    public static String comment(String line) {
        return COMMENT_PREFIX + line;
    }

    /**
     * Strips the {@code rem} prefix plus at most one following space or tab, preserving leading
     * whitespace. Returns {@code line} unchanged when {@link #isCommented(String)} is false.
     */
    public static String uncomment(String line) {
        if (!isCommented(line)) {
            return line;
        }
        int i = leadingWhitespaceLength(line);
        int after = i + 3;
        int removeEnd = after;
        if (after < line.length()) {
            char next = line.charAt(after);
            if (next == ' ' || next == '\t') {
                removeEnd = after + 1;
            }
        }
        return line.substring(0, i) + line.substring(removeEnd);
    }

    private static int leadingWhitespaceLength(String line) {
        int i = 0;
        while (i < line.length() && (line.charAt(i) == ' ' || line.charAt(i) == '\t')) {
            i++;
        }
        return i;
    }

    // Each of the three letters is compared against its explicit upper- and lower-case ASCII
    // form directly, never through a locale-sensitive case-folding method, because this
    // recognition rule is not locale-sensitive.
    private static boolean isR(char c) {
        return c == 'r' || c == 'R';
    }

    private static boolean isE(char c) {
        return c == 'e' || c == 'E';
    }

    private static boolean isM(char c) {
        return c == 'm' || c == 'M';
    }
}
