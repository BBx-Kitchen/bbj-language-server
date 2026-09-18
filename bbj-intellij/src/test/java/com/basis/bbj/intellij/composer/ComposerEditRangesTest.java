package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of {@link ComposerEditRanges#isUsable(int[])} (#591): the only usable shape
 * is exactly two elements, and a {@code null} array is rejected alongside every wrong-length array
 * rather than treated as a distinct case. A plain JUnit 5 test with no {@code com.intellij} import,
 * exercising the plain-Java predicate directly.
 */
class ComposerEditRangesTest {

    @Test
    void aNullRangeIsNotUsable() {
        assertFalse(ComposerEditRanges.isUsable(null));
    }

    @Test
    void anEmptyRangeIsNotUsable() {
        assertFalse(ComposerEditRanges.isUsable(new int[0]));
    }

    @Test
    void aSingleElementRangeIsNotUsable() {
        assertFalse(ComposerEditRanges.isUsable(new int[]{5}));
    }

    @Test
    void aTwoElementRangeIsUsable() {
        assertTrue(ComposerEditRanges.isUsable(new int[]{0, 4}));
    }

    @Test
    void aThreeElementRangeIsNotUsable() {
        assertFalse(ComposerEditRanges.isUsable(new int[]{0, 4, 9}));
    }

    @Test
    void aDescendingTwoElementRangeIsStillUsableBecauseOrderingIsTheDocumentsProblemNotThisPredicates() {
        assertTrue(ComposerEditRanges.isUsable(new int[]{9, 4}));
    }
}
