package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins every language-server-supplied edit range and line number in {@code ComposerLauncher.java}
 * to their one shared {@link ComposerEditRanges} predicates (#591): each of the four range-array
 * call sites (the addWindow-family flags range, its event-mask range, SETOPTS's hex range, and the
 * SETOPTS-in-code absolute-literal hex range) checks through {@code isUsable(int[])}, and the two
 * SETOPTS-in-code line-bound call sites check through {@code isUsableLine}/{@code
 * isUsableLineRegion}; every check runs before the write command is entered, and no call site
 * re-derives its rule inline. A failure here means one of those regressed -- a check was removed,
 * moved after the write command starts, or a bound was written by hand instead of routed through
 * the shared definition -- each of which reopens the crash these predicates exist to close.
 *
 * <p>Carries its own private copies of every helper, deliberately never a shared test utility, so a
 * single bad edit can never weaken every source guard in this package at once.</p>
 */
class ComposerLauncherRangeGuardSourceGuardTest {

    private static final Path LAUNCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerLauncher.java")
            .toAbsolutePath();

    private static final Path EDIT_RANGES_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerEditRanges.java")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

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
     * (for example this class's own javadoc) can never trip a count-based assertion. Applied ahead
     * of every count-based assertion in this class without exception.
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

    /** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
    private static String extractMethodBody(String text, String signatureFragment) {
        int sigIndex = text.indexOf(signatureFragment);
        assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
        int braceStart = text.indexOf('{', sigIndex);
        assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
        int depth = 0;
        for (int i = braceStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(braceStart, i + 1);
                }
            }
        }
        fail("unbalanced braces for: " + signatureFragment);
        return "";
    }

    @Test
    void everyRangeSiteInTheWholeFileReachesTheSharedPredicateAndTheSharedNotice() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(4, countOccurrences(text, "ComposerEditRanges.isUsable("),
                "exactly four language-server-supplied range arrays are checked: the addWindow-family "
                        + "flags range, its event-mask range, SETOPTS's hex range, and the SETOPTS-in-code "
                        + "absolute-literal hex range");
        assertEquals(6, countOccurrences(text, "ComposerNotices.malformedEdit("),
                "six abort sites now render this notice: the four range-array sites above, plus the "
                        + "two SETOPTS-in-code line-bound sites (the absolute edit's line, and the chain "
                        + "edit's start/end line region)");
    }

    @Test
    void theApplyHexEditBodyChecksBothTheFlagsRangeAndTheEventMaskRange() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static <D> void applyHexEdit(");

        assertEquals(2, countOccurrences(body, "ComposerEditRanges.isUsable("),
                "applyHexEdit must check exactly two range arrays: flagsRange and eventMaskRange");
        assertEquals(1, countOccurrences(body, "ComposerEditRanges.isUsable(ed.flagsRange)"),
                "the flags range must be named explicitly in its own check");
        assertEquals(1, countOccurrences(body, "ComposerEditRanges.isUsable(ed.eventMaskRange)"),
                "the event-mask range must be named explicitly in its own check");
    }

    @Test
    void theOpenSetoptsBodyChecksTheHexRangeExactlyOnce() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openSetopts(");

        assertEquals(1, countOccurrences(body, "ComposerEditRanges.isUsable(ed.hexRange)"),
                "openSetopts must check its hexRange exactly once, before it falls through to the "
                        + "insertOffset branch");
    }

    @Test
    void theOpenSetoptsInCodeAbsoluteBodyChecksTheHexRangeExactlyOnce() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openSetoptsInCodeAbsolute(");

        assertEquals(1, countOccurrences(body, "ComposerEditRanges.isUsable(ed.hexRange)"),
                "openSetoptsInCodeAbsolute must check its hexRange exactly once -- this path has no "
                        + "insert-offset fallback, so the write below is unconditional without the check");
    }

    @Test
    void theRangeCheckPrecedesTheWriteCommandInEveryGuardedMethod() {
        String text = readSource(LAUNCHER_SOURCE);

        assertOrderedBeforeWriteCommand(
                extractMethodBody(text, "private static <D> void applyHexEdit("), "applyHexEdit");
        assertOrderedBeforeWriteCommand(
                extractMethodBody(text, "private static void openSetopts("), "openSetopts");
        assertOrderedBeforeWriteCommand(
                extractMethodBody(text, "private static void openSetoptsInCodeAbsolute("), "openSetoptsInCodeAbsolute");
    }

    private static void assertOrderedBeforeWriteCommand(String methodBody, String methodName) {
        int firstCheck = methodBody.indexOf("ComposerEditRanges.isUsable(");
        int firstGuardConstruction = methodBody.indexOf("new StaleEditGuard(");
        assertTrue(firstCheck >= 0 && firstGuardConstruction >= 0 && firstCheck < firstGuardConstruction,
                methodName + " must check its range(s) before constructing the StaleEditGuard that "
                        + "enters the write command -- the abort must happen outside the write, so nothing "
                        + "is written and no partial edit is left behind");
    }

    @Test
    void noRangeSiteRederivesTheLengthRuleInline() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        // The length rule has exactly one definition, in ComposerEditRanges -- a call site must
        // never re-derive it by reading a range array's own length field directly.
        assertEquals(0, countOccurrences(text, ".flagsRange.length"),
                "the flags range's length must never be read directly outside ComposerEditRanges");
        assertEquals(0, countOccurrences(text, ".eventMaskRange.length"),
                "the event-mask range's length must never be read directly outside ComposerEditRanges");
        assertEquals(0, countOccurrences(text, ".hexRange.length"),
                "the hex range's length must never be read directly outside ComposerEditRanges");
    }

    @Test
    void theSharedPredicateCarriesNoIntelliJImport() {
        String text = withoutCommentLines(readSource(EDIT_RANGES_SOURCE));

        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "ComposerEditRanges must stay a plain-Java class runnable on the plain JUnit 5 classpath");
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));

        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for the range predicate");
    }
}
