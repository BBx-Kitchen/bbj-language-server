package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #567 stale-edit guard wiring: every composer write reaches {@link StaleEditGuard} first,
 * each of the three edit flows carries its own {@link DecodeEquality} comparator, the re-decode
 * reuses the exact {@code <kind>DecodeCall} request the launch already issued, the create path stays
 * outside the guard, the window operation order is unchanged, and the modification-stamp re-check
 * still lives inside the write command. A failure here means one of those regressed -- a write
 * escaped the guard, an edit flow lost its comparator, the re-decode stopped reusing the launch's own
 * request, or the stamp re-check moved outside the write command -- and each of those restores the
 * original silent-rewrite bug (#567), silent precisely because it throws nothing. A source guard,
 * rather than a runtime assertion, is the right instrument for a wiring property no single unit test
 * can otherwise pin.
 */
class ComposerApplyGuardSourceGuardTest {

    private static final Path LAUNCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerLauncher.java")
            .toAbsolutePath();

    private static final Path GUARD_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "StaleEditGuard.java")
            .toAbsolutePath();

    private static final Path DECODE_EQUALITY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "DecodeEquality.java")
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

    private static List<Integer> allIndicesOf(String text, String literal) {
        List<Integer> indices = new ArrayList<>();
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            indices.add(index);
            index += literal.length();
        }
        return indices;
    }

    /**
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden or counted literal (for
     * example this class's own javadoc) can never trip a count-based assertion. Applied ahead of
     * every count-based assertion in this class without exception.
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
    void everyWriteInTheLauncherLiesInsideAGuardedApplyBody() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        List<Integer> applyIfUnchanged = allIndicesOf(text, "applyIfUnchanged(");
        List<Integer> replaceString = allIndicesOf(text, "replaceString(");

        assertEquals(2, applyIfUnchanged.size(),
                "exactly two applyIfUnchanged( call sites: the MSGBOX replacement and the shared "
                        + "hex-edit path used by both window composers");
        assertEquals(2, replaceString.size(),
                "exactly two replaceString( writes: one per guarded apply body");

        for (int applyIndex : applyIfUnchanged) {
            boolean hasFollowingReplace = replaceString.stream().anyMatch(r -> r > applyIndex);
            assertTrue(hasFollowingReplace,
                    "each applyIfUnchanged( call must be followed by the replaceString( write it guards");
        }
    }

    @Test
    void allThreeEditFlowsReachTheGuardWithTheirOwnComparator() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(1, countOccurrences(text, "DecodeEquality::sameMsgbox"),
                "the MSGBOX edit flow must reach the guard with sameMsgbox exactly once");
        assertEquals(1, countOccurrences(text, "DecodeEquality::sameAddWindow"),
                "the addWindow edit flow must reach the guard with sameAddWindow exactly once");
        assertEquals(1, countOccurrences(text, "DecodeEquality::sameAddChildWindow"),
                "the addChildWindow edit flow must reach the guard with sameAddChildWindow exactly once");
    }

    @Test
    void theReDecodeReusesTheSameRequestTheLaunchAlreadyIssued() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(2, countOccurrences(text, "msgboxDecodeCall("),
                "msgboxDecodeCall( must appear exactly twice: once on the launch path, once on the "
                        + "re-decode path -- the guard must reuse the existing request, not add a new one");
        assertEquals(2, countOccurrences(text, "addWindowDecodeCall("),
                "addWindowDecodeCall( must appear exactly twice for the same reason");
        assertEquals(2, countOccurrences(text, "addChildWindowDecodeCall("),
                "addChildWindowDecodeCall( must appear exactly twice for the same reason");
    }

    @Test
    void theCreatePathStaysOutsideTheGuard() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(1, countOccurrences(text, "insertString("),
                "insertString( must appear exactly once -- the create path has one write site");

        int insertStringIndex = text.indexOf("insertString(");
        List<Integer> applyIfUnchanged = allIndicesOf(text, "applyIfUnchanged(");
        List<Integer> replaceString = allIndicesOf(text, "replaceString(");

        for (int applyIndex : applyIfUnchanged) {
            int followingReplace = replaceString.stream().filter(r -> r > applyIndex)
                    .min(Integer::compareTo).orElse(Integer.MAX_VALUE);
            boolean insertStringInsideGuardedBody = insertStringIndex > applyIndex && insertStringIndex < followingReplace;
            assertFalse(insertStringInsideGuardedBody,
                    "insertString( must never fall between a guarded applyIfUnchanged( call and its "
                            + "replaceString( write -- the create path has no captured range to go stale "
                            + "and must never acquire a guard");
        }
    }

    @Test
    void theWindowOperationOrderIsUnchanged() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(1, countOccurrences(text, "Comparator.comparingInt((Op o) -> o.start).reversed()"),
                "the right-to-left operation order must be unchanged -- an earlier rewrite must never "
                        + "shift a later range");
    }

    @Test
    void theModificationStampReCheckHappensInsideTheWriteCommand() {
        String text = readSource(GUARD_SOURCE);

        assertTrue(countOccurrences(text, "runWriteCommand(") >= 1,
                "the guard must dispatch its write through the injected write gate");

        // The FIRST occurrence of "runWriteCommand(" is the WriteGate interface's own method
        // declaration near the top of the file (`void runWriteCommand(Runnable body);`), not the
        // actual call site further down (`write.runWriteCommand(() -> {...})`). Anchoring on the
        // interface declaration made this assertion nearly vacuous -- almost any placement of the
        // stamp re-check later in the file, including one moved outside the write-command body
        // entirely, would still satisfy "after the interface declaration". The LAST occurrence is
        // the real call site, so anchoring there actually proves the check sits inside the guarded
        // write body.
        int runWriteCommandCallSiteIndex = text.lastIndexOf("runWriteCommand(");
        int lastModificationStampIndex = text.lastIndexOf("modificationStamp()");
        assertTrue(runWriteCommandCallSiteIndex >= 0 && lastModificationStampIndex > runWriteCommandCallSiteIndex,
                "the modification-stamp re-check must sit inside the write command, not before it -- "
                        + "that is what closes the async window between the re-decode completing and the "
                        + "write starting");

        // Prove the check is inside the guarded body, not merely after the call site's opening
        // parenthesis: it must also precede applyEdit.run(), the guarded body's terminal call.
        int applyEditRunIndex = text.indexOf("applyEdit.run()");
        assertTrue(applyEditRunIndex > 0 && lastModificationStampIndex < applyEditRunIndex,
                "the modification-stamp re-check must run before applyEdit.run() inside the same "
                        + "write-command body -- proving the check is genuinely inside the guarded write, "
                        + "not just textually below the interface declaration");
    }

    @Test
    void bothNewSeamsCarryNoIntelliJImport() {
        String guardText = withoutCommentLines(readSource(GUARD_SOURCE));
        String decodeEqualityText = withoutCommentLines(readSource(DECODE_EQUALITY_SOURCE));

        assertEquals(0, countOccurrences(guardText, "import com.intellij"),
                "the stale-edit guard must stay a plain-Java class runnable on the plain JUnit 5 "
                        + "classpath");
        assertEquals(0, countOccurrences(decodeEqualityText, "import com.intellij"),
                "the decode-equality comparator must stay a plain-Java class runnable on the plain "
                        + "JUnit 5 classpath");
    }

    @Test
    void everyAbortPathInTheGuardNotifies() {
        String text = readSource(GUARD_SOURCE);

        assertTrue(countOccurrences(text, "ComposerNotices.staleDocument(") >= 3,
                "the missing-line case, the mismatch case and the stamp-changed case must each report "
                        + "through the notice seam -- none of them may return silently");
    }

    @Test
    void rangeArraysAreNeverComparedByIdentity() {
        String text = readSource(DECODE_EQUALITY_SOURCE);

        assertTrue(countOccurrences(text, "Arrays.equals(") >= 2,
                "both int[] ranges (flagsRange and eventMaskRange) must be compared element-wise");
        assertEquals(0, countOccurrences(text, "flagsRange =="),
                "flagsRange must never be compared by array reference identity");
        assertEquals(0, countOccurrences(text, "eventMaskRange =="),
                "eventMaskRange must never be compared by array reference identity");
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));

        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for the stale-edit guard");
    }
}
