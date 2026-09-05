package com.basis.bbj.intellij.commenter;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link RemToggleSeam}, covering #540's acceptance wording: a lowercase
 * {@code rem} line and a mixed-case {@code Rem} line must both be recognised as already commented
 * and must uncomment back to their original text instead of stacking a second prefix.
 */
class RemToggleSeamTest {

    @Test
    void aLowercaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText() {
        assertTrue(RemToggleSeam.isCommented("rem foo"));
        assertEquals("foo", RemToggleSeam.uncomment("rem foo"));
    }

    @Test
    void aMixedCaseRemLineIsAlreadyCommentedAndUncommentsToTheOriginalText() {
        assertTrue(RemToggleSeam.isCommented("Rem foo"));
        assertEquals("foo", RemToggleSeam.uncomment("Rem foo"));

        assertTrue(RemToggleSeam.isCommented("REM foo"));
        assertEquals("foo", RemToggleSeam.uncomment("REM foo"));
    }

    @Test
    void commentThenUncommentReturnsTheOriginalLine() {
        String[] lines = {"foo", "   indented", "", "x = \"a (b)\""};
        for (String line : lines) {
            assertEquals(line, RemToggleSeam.uncomment(RemToggleSeam.comment(line)),
                    "round trip must return the original line for: [" + line + "]");
        }
    }
}
