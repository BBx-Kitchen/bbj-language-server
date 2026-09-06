package com.basis.bbj.intellij.commenter;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

    @Test
    void remarkEqualsOneIsNotCommented() {
        assertFalse(RemToggleSeam.isCommented("remark = 1"));
        assertEquals("remark = 1", RemToggleSeam.uncomment("remark = 1"));

        assertFalse(RemToggleSeam.isCommented("rem15 = 1"));
        assertEquals("rem15 = 1", RemToggleSeam.uncomment("rem15 = 1"));

        assertFalse(RemToggleSeam.isCommented("rem$ = \"x\""));
        assertEquals("rem$ = \"x\"", RemToggleSeam.uncomment("rem$ = \"x\""));
    }

    @Test
    void indentationIsPreservedWhenUncommenting() {
        assertEquals("   foo", RemToggleSeam.uncomment("   rem foo"));
        assertEquals("\tfoo", RemToggleSeam.uncomment("\trem foo"));
    }

    @Test
    void aBareRemLineUncommentsToAnEmptyLine() {
        assertTrue(RemToggleSeam.isCommented("rem"));
        assertEquals("", RemToggleSeam.uncomment("rem"));

        assertTrue(RemToggleSeam.isCommented("   REM"));
        assertEquals("   ", RemToggleSeam.uncomment("   REM"));
    }

    @Test
    void aTabAfterThePrefixIsTheOneCharacterRemoved() {
        assertEquals("foo", RemToggleSeam.uncomment("Rem\tfoo"));
        assertEquals(" foo", RemToggleSeam.uncomment("REM  foo"));
    }

    @Test
    void commentInsertsTheUppercasePrefixAtColumnZeroForAnIndentedLine() {
        assertEquals("REM     x = 1", RemToggleSeam.comment("    x = 1"));
    }

    @Test
    void recognitionIsUnaffectedByTheDefaultLocale() {
        Locale previousLocale = Locale.getDefault();
        try {
            Locale.setDefault(new Locale("tr", "TR"));

            assertTrue(RemToggleSeam.isCommented("REM x"));
            assertTrue(RemToggleSeam.isCommented("Rem x"));
        } finally {
            Locale.setDefault(previousLocale);
        }
    }

    @Test
    void anEmptyLineAndABlankLineAreNotCommented() {
        assertFalse(RemToggleSeam.isCommented(""));
        assertEquals("", RemToggleSeam.uncomment(""));

        assertFalse(RemToggleSeam.isCommented("   "));
        assertEquals("   ", RemToggleSeam.uncomment("   "));
    }

    @Test
    void parallelTogglesReturnTheSameResultsAsSequentialOnes() throws Exception {
        String[] lines = {
                "rem foo", "Rem foo", "REM foo", "remark = 1", "rem15 = 1", "rem$ = \"x\"",
                "   rem foo", "\trem foo", "rem", "   REM", "Rem\tfoo", "REM  foo",
                "    x = 1", "", "   ", "foo", "   indented", "x = \"a (b)\""
        };
        List<String> sequential = seamResults(lines);

        int threadCount = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            List<Future<List<String>>> futures = new ArrayList<>();
            for (int i = 0; i < threadCount; i++) {
                futures.add(pool.submit(() -> seamResults(lines)));
            }
            for (Future<List<String>> future : futures) {
                assertEquals(sequential, future.get(10, TimeUnit.SECONDS),
                        "a parallel run must classify and rewrite identically to the sequential run");
            }
        } finally {
            pool.shutdownNow();
        }
    }

    private static List<String> seamResults(String[] lines) {
        List<String> results = new ArrayList<>();
        for (String line : lines) {
            results.add(Boolean.toString(RemToggleSeam.isCommented(line)));
            results.add(RemToggleSeam.comment(line));
            results.add(RemToggleSeam.uncomment(line));
        }
        return results;
    }
}
