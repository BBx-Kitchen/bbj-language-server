package com.basis.bbj.intellij.composer;

/**
 * Decides whether a language-server-supplied {@code int[]} range is usable for a document offset
 * write (#591). From this plugin's perspective every range the language server sends is untrusted
 * input: the only shape a write path can safely index as {@code [start, end)} is exactly two
 * elements, so a {@code null} array, an empty array, a single-element array and an array of three
 * or more elements are all rejected — not merely "shorter than two". A plain-Java predicate with
 * no {@code com.intellij} import, so plain JUnit 5 can exercise it without a platform test fixture.
 */
public final class ComposerEditRanges {

    private ComposerEditRanges() {}

    /**
     * @param range a language-server-supplied range array, or {@code null}
     * @return {@code true} only when {@code range} is non-null and carries exactly two elements.
     *     Element ordering (whether {@code range[0] <= range[1]}) is deliberately not checked
     *     here — that is the document's problem, not this predicate's.
     */
    public static boolean isUsable(int[] range) {
        return range != null && range.length == 2;
    }

    /**
     * Decides whether a language-server-supplied line number is a real line in the live document
     * (#591). {@code [0, lineCount)} is exactly the band {@code Document.getLineStartOffset(int)}
     * accepts, so a zero-line document ({@code lineCount == 0}) accepts no line at all.
     *
     * @param line a language-server-supplied line number
     * @param lineCount the live document's current line count
     * @return {@code true} only when {@code line} is within {@code [0, lineCount)}
     */
    public static boolean isUsableLine(int line, int lineCount) {
        return line >= 0 && line < lineCount;
    }

    /**
     * Decides whether a language-server-supplied {@code [startLine, endLine)} region is usable
     * against the live document (#591). An equal-line region ({@code startLine == endLine}) is
     * deliberately accepted -- it is the documented insertion case a replace-in-place write relies
     * on. {@code endLine} is itself passed to {@code Document.getLineStartOffset(int)}, so it must
     * be a real line index rather than a one-past-the-end sentinel, and therefore must also satisfy
     * {@link #isUsableLine(int, int)}.
     *
     * @param startLine the region's first line, inclusive
     * @param endLine the region's last line, exclusive of any text past its start offset, but
     *     itself still a real line index
     * @param lineCount the live document's current line count
     * @return {@code true} only when both {@code startLine} and {@code endLine} are usable lines
     *     and {@code endLine} is not less than {@code startLine}
     */
    public static boolean isUsableLineRegion(int startLine, int endLine, int lineCount) {
        return isUsableLine(startLine, lineCount) && isUsableLine(endLine, lineCount) && endLine >= startLine;
    }
}
