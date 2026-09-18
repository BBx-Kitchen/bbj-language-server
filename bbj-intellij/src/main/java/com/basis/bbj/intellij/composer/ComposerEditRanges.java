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
}
