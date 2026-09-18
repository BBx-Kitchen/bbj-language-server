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

    private static final Path MSGBOX_SCHEMATIC_PANEL = composerSource("MsgboxSchematicPanel.java");
    private static final Path WINDOW_SCHEMATIC_PANEL = composerSource("WindowSchematicPanel.java");
    private static final Path CHILD_WINDOW_SCHEMATIC_PANEL = composerSource("ChildWindowSchematicPanel.java");

    /** One entry per schematic panel, for sweeps that must cover panels as well as dialogs. */
    private static final List<Path> SCHEMATIC_PANEL_SOURCES = List.of(
            MSGBOX_SCHEMATIC_PANEL, WINDOW_SCHEMATIC_PANEL, CHILD_WINDOW_SCHEMATIC_PANEL);

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    /** The pre-consolidation hardcoded error-red color construction every errorLabel() copy carried. */
    private static final String HARDCODED_ERROR_RED = "new Color(0xC0392B)";

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
    void errorForegroundErrorLabelLabeledWithErrorAndSetEnabledRecursiveAreDeclaredExactlyOnceInTheSharedHome() {
        String text = withoutCommentLines(readSource(SWING_HELPERS_SOURCE));
        assertEquals(1, countOccurrences(text, "Color errorForeground("),
                "ComposerSwingHelpers.java must declare errorForeground( exactly once");
        assertEquals(1, countOccurrences(text, "JBLabel errorLabel("),
                "ComposerSwingHelpers.java must declare errorLabel( exactly once");
        assertEquals(1, countOccurrences(text, "JPanel labeledWithError("),
                "ComposerSwingHelpers.java must declare labeledWithError( exactly once");
        assertEquals(1, countOccurrences(text, "void setEnabledRecursive("),
                "ComposerSwingHelpers.java must declare setEnabledRecursive( exactly once");
    }

    @Test
    void noDialogDeclaresItsOwnPrivateErrorLabelLabeledWithErrorOrSetEnabledRecursive() {
        for (Path source : DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "private static JBLabel errorLabel("),
                    source.getFileName() + " must not declare its own private errorLabel(");
            assertEquals(0, countOccurrences(text, "private static JPanel labeledWithError("),
                    source.getFileName() + " must not declare its own private labeledWithError(");
            assertEquals(0, countOccurrences(text, "private static void setEnabledRecursive("),
                    source.getFileName() + " must not declare its own private setEnabledRecursive(");
        }
    }

    @Test
    void everyErrorLabelDialogCallsTheSharedErrorLabelHelper() {
        for (Path source : List.of(MSGBOX_DIALOG, ADD_WINDOW_DIALOG, ADD_CHILD_WINDOW_DIALOG, SETOPTS_DIALOG, CVS_DIALOG)) {
            String text = readSource(source);
            assertTrue(countOccurrences(text, "ComposerSwingHelpers.errorLabel(") >= 1,
                    source.getFileName() + " must call ComposerSwingHelpers.errorLabel( at least once");
        }
    }

    @Test
    void bothAddWindowFamilyDialogsCallTheSharedLabeledWithErrorAndSetEnabledRecursiveHelpers() {
        for (Path source : List.of(ADD_WINDOW_DIALOG, ADD_CHILD_WINDOW_DIALOG)) {
            String text = readSource(source);
            assertTrue(countOccurrences(text, "ComposerSwingHelpers.labeledWithError(") >= 1,
                    source.getFileName() + " must call ComposerSwingHelpers.labeledWithError( at least once");
            assertEquals(1, countOccurrences(text, "ComposerSwingHelpers.setEnabledRecursive("),
                    source.getFileName() + " must call ComposerSwingHelpers.setEnabledRecursive( exactly once");
        }
    }

    @Test
    void errorForegroundCallsTheThemeAwareColorLookupExactlyOnce() {
        String body = extractMethodBody(withoutCommentLines(readSource(SWING_HELPERS_SOURCE)), "Color errorForeground(");
        assertEquals(1, countOccurrences(body, "NamedColorUtil.getErrorForeground()"),
                "errorForeground() must call the theme-aware color lookup exactly once");
    }

    @Test
    void noDialogOrPanelStillConstructsTheOldHardcodedErrorRed() {
        for (Path source : DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, HARDCODED_ERROR_RED),
                    source.getFileName() + " must no longer construct the old hardcoded error-red color -- "
                            + "the shared errorForeground() lookup replaces it");
        }
        for (Path source : SCHEMATIC_PANEL_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, HARDCODED_ERROR_RED),
                    source.getFileName() + " must never have constructed the old hardcoded error-red color");
        }
    }

    @Test
    void theSharedHomeNeverUsesTheFullyQualifiedUiUtilComponentStyleForm() {
        String text = withoutCommentLines(readSource(SWING_HELPERS_SOURCE));
        assertEquals(0, countOccurrences(text, "com.intellij.util.ui.UIUtil.ComponentStyle"),
                "ComposerSwingHelpers.java must use the imported UIUtil form, not the fully-qualified one");
    }

    @Test
    void clipIsDeclaredExactlyOnceInTheSharedHomeAndZeroTimesInAnyPanel() {
        String helpersText = withoutCommentLines(readSource(SWING_HELPERS_SOURCE));
        assertEquals(1, countOccurrences(helpersText, "String clip("),
                "ComposerSwingHelpers.java must declare clip( exactly once");
        assertEquals(1, countOccurrences(helpersText, "FontMetrics fm"),
                "ComposerSwingHelpers.java's clip( must cache FontMetrics into a local variable exactly once");

        for (Path source : SCHEMATIC_PANEL_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "private static String clip("),
                    source.getFileName() + " must not declare its own private clip( -- "
                            + "it must reach the shared ComposerSwingHelpers.clip( instead");
            assertTrue(countOccurrences(text, "ComposerSwingHelpers.clip(") >= 1,
                    source.getFileName() + " must call ComposerSwingHelpers.clip( at least once");
        }
    }

    @Test
    void previewUnavailableIsDeclaredExactlyOnceForEachOfTheTwoTargetTypes() {
        String text = withoutCommentLines(readSource(SWING_HELPERS_SOURCE));
        assertEquals(1, countOccurrences(text, "void previewUnavailable(JBLabel target, String reason)"),
                "ComposerSwingHelpers.java must declare the JBLabel previewUnavailable overload exactly once");
        assertEquals(1, countOccurrences(text, "void previewUnavailable(JBTextArea target, String reason)"),
                "ComposerSwingHelpers.java must declare the JBTextArea previewUnavailable overload exactly once");
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
