package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the SETOPTS-in-code launch branch's four routing invariants (#475, DISC-06): the new
 * kind's decode is sent through {@code setoptsDecodeInCode} and never through the config.bbx-scoped
 * {@code setoptsDecodeCall}; both guarded edit paths (absolute literal, safe chain) reach
 * {@link StaleEditGuard#applyIfUnchanged} with {@code DecodeEquality::sameSetoptsInCode}; the
 * compose-new path inserts at the line start via the existing {@code insertAt(..., true)} helper;
 * and the not-editable branch constructs no edit at all -- no {@code replaceString}/
 * {@code insertString} call appears between its guard check and its return. A failure here means
 * one of those regressed: the in-code decode started reusing the config.bbx-scoped request, an
 * edit path lost its stale-edit guard or its comparator, compose-new stopped inserting at the
 * line start, or the not-editable branch started constructing a write from a decode the server
 * marked unsafe (T-88-01) -- each of those is a silent correctness or safety regression a runtime
 * test cannot otherwise pin without a live LSP4IJ harness.
 */
class SetoptsInCodeSourceGuardTest {

    private static final Path LAUNCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerLauncher.java")
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

    /**
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden or counted literal
     * (for example this class's own javadoc) can never trip a count-based assertion. Applied
     * ahead of every count-based assertion in this class without exception.
     */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void theInCodeDecodeGoesThroughDecodeInCodeAndNeverThroughTheConfigBbxDecodeCall() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(3, countOccurrences(text, "setoptsDecodeInCode("),
                "the launch decode plus both guarded re-decodes (absolute, chain) must reach "
                        + "setoptsDecodeInCode exactly three times");

        int dispatcherStart = text.indexOf("private static void openSetoptsInCode(");
        int composeNewStart = text.indexOf("private static void openSetoptsInCodeComposeNew(");
        int chainStart = text.indexOf("private static void openSetoptsInCodeChain(");
        int helperEnd = text.indexOf("private static String ensureTrailingNewline(");
        assertTrue(dispatcherStart >= 0 && composeNewStart > dispatcherStart
                        && chainStart > composeNewStart && helperEnd > chainStart,
                "the four SETOPTS-in-code helper methods must all exist in the expected order");

        String setoptsInCodeMethods = text.substring(dispatcherStart, helperEnd);
        assertFalse(setoptsInCodeMethods.contains("setoptsDecodeCall("),
                "no SETOPTS_IN_CODE helper method may call the config.bbx-scoped setoptsDecodeCall( "
                        + "-- the two request families must never be conflated");
    }

    @Test
    void bothGuardedEditPathsRouteThroughApplyIfUnchangedWithSameSetoptsInCode() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(2, countOccurrences(text, "DecodeEquality::sameSetoptsInCode"),
                "both guarded SETOPTS-in-code edit paths (absolute and chain) must reach the guard "
                        + "with sameSetoptsInCode exactly once each");

        int absoluteStart = text.indexOf("private static void openSetoptsInCodeAbsolute(");
        int chainStart = text.indexOf("private static void openSetoptsInCodeChain(");
        assertTrue(absoluteStart >= 0 && chainStart > absoluteStart,
                "openSetoptsInCodeAbsolute(...) must exist and precede openSetoptsInCodeChain(...)");

        String absoluteBody = text.substring(absoluteStart, chainStart);
        assertTrue(absoluteBody.contains("applyIfUnchanged(") && absoluteBody.contains("DecodeEquality::sameSetoptsInCode"),
                "the absolute edit path must call applyIfUnchanged( with sameSetoptsInCode as its comparator");

        String chainBody = text.substring(chainStart);
        assertTrue(chainBody.contains("applyIfUnchanged(") && chainBody.contains("DecodeEquality::sameSetoptsInCode"),
                "the chain edit path must call applyIfUnchanged( with sameSetoptsInCode as its comparator");
    }

    @Test
    void theComposeNewPathInsertsAtTheLineStart() {
        String text = readSource(LAUNCHER_SOURCE);

        int composeNewStart = text.indexOf("private static void openSetoptsInCodeComposeNew(");
        int absoluteStart = text.indexOf("private static void openSetoptsInCodeAbsolute(");
        assertTrue(composeNewStart >= 0 && absoluteStart > composeNewStart,
                "openSetoptsInCodeComposeNew(...) must exist and precede openSetoptsInCodeAbsolute(...)");

        String body = text.substring(composeNewStart, absoluteStart);
        assertTrue(body.contains("insertAt(") && body.contains(", true)"),
                "compose-new must insert via the existing insertAt(..., true) line-start helper, "
                        + "never a mid-line insert");
    }

    @Test
    void theNotEditableBranchConstructsNoEditAtAll() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        int dispatcherStart = text.indexOf("private static void openSetoptsInCode(");
        int composeNewStart = text.indexOf("private static void openSetoptsInCodeComposeNew(");
        assertTrue(dispatcherStart >= 0 && composeNewStart > dispatcherStart,
                "openSetoptsInCode(...) must exist and precede its sibling helper methods");
        String dispatcherBody = text.substring(dispatcherStart, composeNewStart);

        int notEditableCheck = dispatcherBody.indexOf("!decoded.editable");
        assertTrue(notEditableCheck >= 0, "the dispatcher must check decoded.editable");
        int notEditableReturn = dispatcherBody.indexOf("return;", notEditableCheck);
        assertTrue(notEditableReturn > notEditableCheck, "the not-editable branch must return");

        String notEditableBranch = dispatcherBody.substring(notEditableCheck, notEditableReturn);
        assertFalse(notEditableBranch.contains("replaceString(") || notEditableBranch.contains("insertString("),
                "the not-editable branch must construct no edit -- no replaceString/insertString "
                        + "call between its guard check and its return (T-88-01)");
    }

    /**
     * Two writers in the same class share one range/digits contract but must NOT share one
     * syntax -- {@code openSetoptsInCodeAbsolute} edits a BBj-program literal (bare hex is
     * invalid there), while {@code openSetopts} edits {@code config.bbx} (bare hex is the CORRECT
     * syntax there, #474). Conflating the two is exactly how the defect arose; this guard pins
     * each writer to its own file format, applied after comment stripping so this test class's
     * own javadoc can never satisfy or break it.
     */
    @Test
    void theInCodeWriterUsesBbjHexLiteralWhileTheConfigBbxWriterStaysBare() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        int absoluteStart = text.indexOf("private static void openSetoptsInCodeAbsolute(");
        int chainStart = text.indexOf("private static void openSetoptsInCodeChain(");
        assertTrue(absoluteStart >= 0 && chainStart > absoluteStart,
                "openSetoptsInCodeAbsolute(...) must exist and precede openSetoptsInCodeChain(...)");
        String absoluteBody = text.substring(absoluteStart, chainStart);
        assertTrue(absoluteBody.contains("BbjHexLiteral.of("),
                "the BBj-program in-code writer (openSetoptsInCodeAbsolute) must route its "
                        + "replacement text through BbjHexLiteral.of(...) -- a bare hex value there "
                        + "deletes the $...$ delimiters");

        int configStart = text.indexOf("private static void openSetopts(");
        int inCodeDispatcherStart = text.indexOf("private static void openSetoptsInCode(");
        assertTrue(configStart >= 0 && inCodeDispatcherStart > configStart,
                "openSetopts(...) must exist and precede openSetoptsInCode(...)");
        String configBody = text.substring(configStart, inCodeDispatcherStart);
        assertFalse(configBody.contains("BbjHexLiteral.of("),
                "the config.bbx writer (openSetopts, #474) must stay bare hex -- routing it "
                        + "through BbjHexLiteral.of(...) would corrupt config.bbx's own correct syntax");
    }
}
