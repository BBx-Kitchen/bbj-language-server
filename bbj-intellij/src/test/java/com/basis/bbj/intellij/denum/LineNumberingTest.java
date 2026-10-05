package com.basis.bbj.intellij.denum;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The Java detection rule must give the same verdict as {@code isLineNumberedSource} in
 * {@code bbj-vscode/src/line-numbering.ts}. The first nine tests copy the inputs of
 * {@code bbj-vscode/test/line-numbering.test.ts}; the rest pin the rule's edges.
 */
class LineNumberingTest {

    private static String numberedLines(int count) {
        StringBuilder text = new StringBuilder();
        for (int i = 1; i <= count; i++) {
            text.append(String.format("%04d PRINT %d\n", i * 10, i));
        }
        return text.toString();
    }

    @Test
    void detectsAClassicLineNumberedProgram() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "0020 PRINT A\n" +
            "0030 END\n"));
    }

    @Test
    void ignoresBlankLinesBetweenNumberedStatements() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "\n" +
            "0010 LET A=5\n" +
            "\n" +
            "0020 PRINT A\n" +
            "0030 GOTO 0010\n"));
    }

    @Test
    void acceptsNumberedRemLines() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "00010 REM my program\n" +
            "00020 PRINT \"hi\"\n" +
            "00030 STOP\n"));
    }

    @Test
    void rejectsModernUnnumberedSource() {
        assertFalse(LineNumbering.isLineNumberedSource(
            "class public MyApp\n" +
            "    method public void run()\n" +
            "        print \"hi\"\n" +
            "    methodend\n" +
            "classend\n"));
    }

    @Test
    void rejectsAMixBecauseOneUnnumberedStatementDisqualifies() {
        assertFalse(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "PRINT A\n" +
            "0030 END\n"));
    }

    @Test
    void doesNotTreatNumericLabelsAsLineNumbers() {
        assertFalse(LineNumbering.isLineNumberedSource(
            "0010:\n" +
            "    print \"hi\"\n" +
            "    goto 0010\n"));
    }

    @Test
    void tooFewLinesToDecideIsFalse() {
        assertFalse(LineNumbering.isLineNumberedSource("0010 PRINT \"hi\"\n"));
    }

    @Test
    void handlesCrlfLineEndings() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\r\n" +
            "0020 PRINT A\r\n" +
            "0030 END\r\n"));
    }

    @Test
    void emptyInputIsFalse() {
        assertFalse(LineNumbering.isLineNumberedSource(""));
    }

    @Test
    void exactlyThreeNumberedLinesIsTrue() {
        assertTrue(LineNumbering.isLineNumberedSource(numberedLines(3)));
    }

    @Test
    void twoNumberedLinesIsFalse() {
        assertFalse(LineNumbering.isLineNumberedSource(numberedLines(2)));
    }

    @Test
    void scanningStopsAfterTheTwentiethNumberedLine() {
        assertTrue(LineNumbering.isLineNumberedSource(numberedLines(20) + "PRINT unnumbered\n"));
    }

    @Test
    void anUnnumberedTwentiethLineStillDisqualifies() {
        assertFalse(LineNumbering.isLineNumberedSource(numberedLines(19) + "PRINT unnumbered\n"));
    }

    @Test
    void aTabSeparatorAndAnIndentedNumberCountAsNumbered() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "0010\tLET A=5\n" +
            "  20 PRINT A\n" +
            "\t30\tEND\n"));
    }

    @Test
    void aLineOfSpacesAndTabsBetweenNumberedLinesIsSkipped() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "  \t \n" +
            "0020 PRINT A\n" +
            "\n" +
            "0030 END\n"));
    }

    @Test
    void aNoBreakSpaceAloneAfterTheDigitsIsNotASeparator() {
        assertFalse(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "0020 PRINT A\n" +
            "0030 END\n"));
    }

    @Test
    void aLineMadeOnlyOfNoBreakSpacesCountsAsBlank() {
        assertTrue(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "  \n" +
            "0020 PRINT A\n" +
            "0030 END\n"));
    }

    @Test
    void aNumberFollowedOnlyByWhitespaceIsNotNumbered() {
        assertFalse(LineNumbering.isLineNumberedSource(
            "0010 LET A=5\n" +
            "0020 \n" +
            "0030 END\n" +
            "0040 STOP\n"));
    }

    @Test
    void aStringBuilderGivesTheSameVerdictAsTheEqualString() {
        String numbered = numberedLines(5);
        String modern = "class public A\nclassend\nprint 1\n";
        assertEquals(LineNumbering.isLineNumberedSource(numbered),
            LineNumbering.isLineNumberedSource(new StringBuilder(numbered)));
        assertEquals(LineNumbering.isLineNumberedSource(modern),
            LineNumbering.isLineNumberedSource(new StringBuilder(modern)));
        assertTrue(LineNumbering.isLineNumberedSource(new StringBuilder(numbered)));
    }
}
