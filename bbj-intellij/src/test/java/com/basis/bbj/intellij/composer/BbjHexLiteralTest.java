package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Behavioural coverage for {@link BbjHexLiteral#of(String)}, the Java twin of
 * {@code bbj-vscode/src/setopts-catalog.ts}'s {@code bbjHexLiteral} (G-88-3). A pure value test --
 * no IntelliJ fixture, no {@code Application} -- since the class has no platform dependency.
 */
class BbjHexLiteralTest {

    @Test
    void digitsRoundTripWithADollarSignDelimiterOnEachSide() {
        assertEquals("$08$", BbjHexLiteral.of("08"));
        assertEquals("$00C20240000000000000000000000000$",
                BbjHexLiteral.of("00C20240000000000000000000000000"));
    }

    @Test
    void anEmptyDigitStringYieldsTheEmptyLiteralForm() {
        assertEquals("$$", BbjHexLiteral.of(""));
    }

    @Test
    void theReturnedStringContainsNoQuoteCharacter() {
        assertFalse(BbjHexLiteral.of("DEADBEEF").contains("\""));
        assertFalse(BbjHexLiteral.of("").contains("\""));
    }

    @Test
    void digitsAreCarriedVerbatimBetweenTheDelimiters() {
        String digits = "FFDFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
        String literal = BbjHexLiteral.of(digits);
        assertEquals(digits, literal.substring(1, literal.length() - 1));
    }
}
