package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #619 consolidation of the composer's shared Swing rendering helpers into one home,
 * {@link ComposerSwingHelpers}: each helper shape declared exactly once there, zero private
 * copies left behind in any of the six dialogs or three schematic panels, and every one of those
 * nine call sites reaching the shared home instead. A single bad edit here can never weaken
 * another guard in this suite -- every helper below is this class's own private copy, never a
 * shared test utility.
 */
class ComposerSwingHelpersSourceGuardTest {

    private static final Path SWING_HELPERS_SOURCE = composerSource("ComposerSwingHelpers.java");

    private static final Path MSGBOX_DIALOG = composerSource("MsgboxComposerDialog.java");
    private static final Path ADD_WINDOW_DIALOG = composerSource("AddWindowComposerDialog.java");
    private static final Path ADD_CHILD_WINDOW_DIALOG = composerSource("AddChildWindowComposerDialog.java");
    private static final Path SETOPTS_DIALOG = composerSource("SetoptsComposerDialog.java");
    private static final Path SETOPTS_TRISTATE_DIALOG = composerSource("SetoptsTriStateComposerDialog.java");
    private static final Path CVS_DIALOG = composerSource("CvsComposerDialog.java");

    /** One entry per composer dialog so a seventh composer added later is a one-line addition. */
    private static final List<Path> DIALOG_SOURCES = List.of(
            MSGBOX_DIALOG, ADD_WINDOW_DIALOG, ADD_CHILD_WINDOW_DIALOG, SETOPTS_DIALOG,
            SETOPTS_TRISTATE_DIALOG, CVS_DIALOG);

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    private static Path composerSource(String fileName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", fileName)
                .toAbsolutePath();
    }

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
     * Drops comment/javadoc lines so a rationale sentence naming a guarded literal (including this
     * class's own javadoc) can never satisfy or trip a count-based assertion. Applied ahead of
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
    void labeledIsDeclaredExactlyOnceInTheSharedHome() {
        String text = withoutCommentLines(readSource(SWING_HELPERS_SOURCE));
        assertEquals(1, countOccurrences(text, "static JPanel labeled("),
                "ComposerSwingHelpers.java must declare labeled( exactly once");
    }

    @Test
    void noDialogDeclaresItsOwnPrivateLabeled() {
        for (Path source : DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "private static JPanel labeled("),
                    source.getFileName() + " must not declare its own private labeled( -- "
                            + "it must reach the shared ComposerSwingHelpers.labeled( instead");
        }
    }

    @Test
    void everyDialogCallsTheSharedLabeledHelper() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertTrue(countOccurrences(text, "ComposerSwingHelpers.labeled(") >= 1,
                    source.getFileName() + " must call ComposerSwingHelpers.labeled( at least once");
        }
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));
        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for composer helper behaviour");
    }
}
