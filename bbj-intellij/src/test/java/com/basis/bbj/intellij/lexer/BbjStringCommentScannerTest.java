package com.basis.bbj.intellij.lexer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for the #568 acceptance cases: bracket characters inside a BBj string
 * literal or a {@code rem} comment must never be classified as bracket tokens. Each method here
 * exercises {@link BbjStringCommentScanner} directly, with no IntelliJ platform dependency
 * (C-01) — the plain scanning seam is what carries the fix; {@link BbjLexerStringCommentSourceGuardTest}
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
}
