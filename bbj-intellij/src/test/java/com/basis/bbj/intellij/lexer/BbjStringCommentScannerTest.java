package com.basis.bbj.intellij.lexer;

import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for the #568 acceptance cases: bracket characters inside a BBj string
 * literal or a {@code rem} comment must never be classified as bracket tokens. Each method here
 * exercises {@link BbjStringCommentScanner} directly, with no IntelliJ platform dependency
 * — the plain scanning seam is what carries the fix; {@link BbjLexerStringCommentSourceGuardTest}
 * pins the three sites that wire it into the lexer.
 */
class BbjStringCommentScannerTest {

    @Test
    void printValueNotABracketIsOneStringTokenAndTheParenthesisIsInsideIt() {
        String text = "PRINT \"value (not a bracket)\"";
        int quoteIndex = text.indexOf('"');

        int end = BbjStringCommentScanner.scanString(text, quoteIndex, text.length());

        assertEquals(text.length(), end);
        String literal = text.substring(quoteIndex, end);
        assertTrue(literal.contains("("), "the opening parenthesis must be inside the string span");
        assertTrue(literal.contains(")"), "the closing parenthesis must be inside the string span");
    }

    @Test
    void aDoubledQuoteInsideAStringDoesNotEndTheLiteral() {
        String text = "PRINT \"say \"\"hi (x)\"\" now\"";
        int quoteIndex = text.indexOf('"');

        int end = BbjStringCommentScanner.scanString(text, quoteIndex, text.length());

        assertEquals(text.length(), end);
        String literal = text.substring(quoteIndex, end);
        assertTrue(literal.contains("\"\"hi (x)\"\""), "both doubled quotes and the text between them stay in one span");
    }

    @Test
    void remOpensACommentThatRunsToTheEndOfTheLine() {
        String text = "rem (x\ny = (1)";
        int newlineIndex = text.indexOf('\n');

        assertTrue(BbjStringCommentScanner.isCommentStart(text, 0, text.length()));
        int end = BbjStringCommentScanner.scanComment(text, 0, text.length());

        assertEquals(newlineIndex, end);
    }

    @Test
    void anUnterminatedQuoteRunsToTheEndOfItsLineOnly() {
        String text = "PRINT \"oops\ny = (1)";
        int quoteIndex = text.indexOf('"');
        int newlineIndex = text.indexOf('\n');

        int end = BbjStringCommentScanner.scanString(text, quoteIndex, text.length());

        assertEquals(newlineIndex, end);
        int parenIndexOnNextLine = text.indexOf('(', end);
        assertTrue(parenIndexOnNextLine > end, "the bracket on the following line stays reachable for normal lexing");
    }

    @Test
    void anEmptyStringLiteralIsOneTokenWithNothingInsideIt() {
        String text = "\"\"";

        int end = BbjStringCommentScanner.scanString(text, 0, text.length());

        assertEquals(2, end);
        String literal = text.substring(0, end);
        assertFalse(literal.contains("("), "an empty literal holds no opening bracket");
        assertFalse(literal.contains(")"), "an empty literal holds no closing bracket");
    }

    @Test
    void aStringAtTheVeryEndOfTheBufferWithNoClosingQuoteStopsAtTheBufferEnd() {
        String text = "\"abc";

        int end = BbjStringCommentScanner.scanString(text, 0, text.length());

        assertEquals(text.length(), end);
    }

    @Test
    void remarkIsNotACommentStart() {
        String text = "remark = 1";

        assertFalse(BbjStringCommentScanner.isCommentStart(text, 0, text.length()));
    }

    @Test
    void rem15IsNotACommentStart() {
        String text = "rem15 = 1";

        assertFalse(BbjStringCommentScanner.isCommentStart(text, 0, text.length()));
    }

    @Test
    void remDollarIsNotACommentStart() {
        String text = "rem$ = \"x\"";

        assertFalse(BbjStringCommentScanner.isCommentStart(text, 0, text.length()));
    }

    @Test
    void remFollowedByATabOrByEndOfLineIsACommentStart() {
        String tabSeparated = "rem\tx";
        assertTrue(BbjStringCommentScanner.isCommentStart(tabSeparated, 0, tabSeparated.length()));

        String bareAtBufferEnd = "rem";
        assertTrue(BbjStringCommentScanner.isCommentStart(bareAtBufferEnd, 0, bareAtBufferEnd.length()));

        String upperCase = "REM";
        assertTrue(BbjStringCommentScanner.isCommentStart(upperCase, 0, upperCase.length()));

        String mixedCase = "Rem";
        assertTrue(BbjStringCommentScanner.isCommentStart(mixedCase, 0, mixedCase.length()));
    }

    @Test
    void remRecognitionIsUnaffectedByTheDefaultLocale() {
        Locale previousLocale = Locale.getDefault();
        try {
            Locale.setDefault(new Locale("tr", "TR"));

            assertTrue(BbjStringCommentScanner.isCommentStart("REM x", 0, "REM x".length()));
            assertTrue(BbjStringCommentScanner.isCommentStart("Rem x", 0, "Rem x".length()));
        } finally {
            Locale.setDefault(previousLocale);
        }
    }

    @Test
    void aStringContainingASurrogatePairIsOneTokenAndOffsetsCountCodeUnits() {
        // U+1F600 GRINNING FACE, encoded as a UTF-16 surrogate pair.
        String text = "\"😀\"";

        int end = BbjStringCommentScanner.scanString(text, 0, text.length());

        assertEquals(text.length(), end);
        assertEquals(4, text.length(), "the literal is four UTF-16 code units: two quotes plus the surrogate pair");
        assertEquals(3, text.codePointCount(0, text.length()),
                "the same span is three code points, confirming the offset counts code units, not code points");
    }

    @Test
    void aCommentRunsToTheEndOfTheLineAndLeavesTheLineTerminator() {
        String text = "rem (x\r\ny";
        int carriageReturnIndex = text.indexOf('\r');

        int end = BbjStringCommentScanner.scanComment(text, 0, text.length());

        assertEquals(carriageReturnIndex, end);
    }
}
