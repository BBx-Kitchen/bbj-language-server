package com.basis.bbj.intellij.lexer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the three wiring sites for #568 so a future refactor cannot silently disconnect the
 * {@link BbjStringCommentScanner} seam from the lexer, the parser definition, or the brace
 * matcher: {@link BbjStringCommentScannerTest} proves the seam's own behaviour; this test proves
 * the seam is actually wired in.
 */
class BbjLexerStringCommentSourceGuardTest {

    private static final Path WORD_LEXER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjWordLexer.java")
            .toAbsolutePath();

    private static final Path TOKEN_TYPES_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjTokenTypes.java")
            .toAbsolutePath();

    private static final Path PARSER_DEFINITION_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjParserDefinition.java")
            .toAbsolutePath();

    private static final Path BRACE_MATCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjPairedBraceMatcher.java")
            .toAbsolutePath();

    private static final Path SCANNER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lexer",
            "BbjStringCommentScanner.java")
            .toAbsolutePath();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    /** Strips comment/javadoc lines so a prose sentence cannot make a text assertion pass by accident. */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\\R", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void parserDefinitionReturnsTheNewStringAndCommentTokenSetsExactlyOnce() {
        String text = readSource(PARSER_DEFINITION_SOURCE);

        assertEquals(1, countOccurrences(text, "TokenSet.create(BbjTokenTypes.COMMENT)"));
        assertEquals(1, countOccurrences(text, "TokenSet.create(BbjTokenTypes.STRING)"));
    }

    @Test
    void parserDefinitionNoLongerReportsEmptyTokenSetsOutsideCommentsAndJavadoc() {
        String textWithoutComments = withoutCommentLines(readSource(PARSER_DEFINITION_SOURCE));

        assertEquals(0, countOccurrences(textWithoutComments, "TokenSet.EMPTY"),
                "the accessors must return real sets, not merely be commented over");
    }

    @Test
    void pairedBraceMatcherRefusesPairingInsideStringsAndComments() {
        String text = readSource(BRACE_MATCHER_SOURCE);

        assertTrue(text.contains("BbjTokenTypes.STRING"));
        assertTrue(text.contains("BbjTokenTypes.COMMENT"));
        assertEquals(0, countOccurrences(text, "Safe default"),
                "the stale unconditional-allow rationale must be replaced");
    }

    @Test
    void pairedBraceMatcherStillDeclaresAllThreeBracePairs() {
        String text = readSource(BRACE_MATCHER_SOURCE);

        assertEquals(3, countOccurrences(text, "new BracePair("));
    }

    @Test
    void wordLexerDispatchesToTheScannerExactlyOnceEachForStringAndComment() {
        String text = readSource(WORD_LEXER_SOURCE);

        assertEquals(1, countOccurrences(text, "BbjStringCommentScanner.scanString("));
        assertEquals(1, countOccurrences(text, "BbjStringCommentScanner.scanComment("));
    }

    @Test
    void wordLexerChecksForACommentBeforeItChecksForAWord() {
        String text = readSource(WORD_LEXER_SOURCE);

        int commentCheckIndex = text.indexOf("BbjStringCommentScanner.isCommentStart(");
        int wordCheckIndex = text.indexOf("Character.isLetterOrDigit(c)");

        assertTrue(commentCheckIndex >= 0, "BbjStringCommentScanner.isCommentStart( is not present in BbjWordLexer.java");
        assertTrue(wordCheckIndex >= 0, "Character.isLetterOrDigit(c) is not present in BbjWordLexer.java");
        assertTrue(commentCheckIndex < wordCheckIndex,
                "the comment branch must be dispatched before the word branch, or a leading rem would be swallowed as a word");
    }

    @Test
    void scannerHasNoIntellijPlatformImport() {
        String text = readSource(SCANNER_SOURCE);

        assertEquals(0, countOccurrences(text, "import com.intellij"));
    }

    @Test
    void wordLexerStillExplainsWhyTheWiringExists() {
        String text = readSource(WORD_LEXER_SOURCE);

        assertTrue(text.contains("#568"), "BbjWordLexer.java must still explain why the string/comment wiring exists (#568)");
    }

    @Test
    void tokenTypesDeclaresTheNewStringAndCommentElementTypes() {
        String text = readSource(TOKEN_TYPES_SOURCE);

        assertTrue(text.contains("BBJ_STRING"));
        assertTrue(text.contains("BBJ_COMMENT"));
    }

    @Test
    void bothFilesStillCarryAllSixBracketCases() {
        String text = readSource(WORD_LEXER_SOURCE);

        assertEquals(1, countOccurrences(text, "case '(' ->"));
        assertEquals(1, countOccurrences(text, "case ')' ->"));
        assertEquals(1, countOccurrences(text, "case '[' ->"));
        assertEquals(1, countOccurrences(text, "case ']' ->"));
        assertEquals(1, countOccurrences(text, "case '{' ->"));
        assertEquals(1, countOccurrences(text, "case '}' ->"));
    }
}
