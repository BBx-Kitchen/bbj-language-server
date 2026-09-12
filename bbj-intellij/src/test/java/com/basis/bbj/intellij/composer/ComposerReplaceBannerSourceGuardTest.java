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
 * Pins the MSGBOX compose-and-replace banner wiring (#648): when the language server could not
 * decode an existing options expression, {@code MsgboxComposerDialog} must show the server's own
 * banner text and the original expression read-only, with no IntelliJ-side hard-coded banner prose
 * and no extra confirmation dialog. A failure here means one of those regressed -- the dialog stopped
 * accepting a {@code MsgboxReplace} argument, started hard-coding its own banner sentence instead of
 * rendering the server's, made the original-expression field editable, or introduced a
 * {@code Messages.} confirmation the plan explicitly forbids -- each of which would either hide what
 * is about to be discarded or add a redundant extra click the plan's own truths rule out.
 */
class ComposerReplaceBannerSourceGuardTest {

    private static final Path DIALOG_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "MsgboxComposerDialog.java")
            .toAbsolutePath();

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
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden literal (for example
     * this class's own javadoc mentioning {@code Messages.}) can never trip a "zero times"
     * assertion. Applied ahead of every zero-count assertion in this class without exception.
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
    void theDialogConstructorDeclaresAMsgboxReplaceParameter() {
        String text = readSource(DIALOG_SOURCE);
        assertTrue(text.contains("MsgboxReplace replace"),
                "MsgboxComposerDialog must declare a MsgboxReplace replace constructor parameter");
    }

    @Test
    void theBannerLabelsTextComesFromReplaceBannerAndNothingIsHardCoded() {
        String text = withoutCommentLines(readSource(DIALOG_SOURCE));
        assertTrue(text.contains("replace.banner"),
                "the banner label must render replace.banner verbatim -- the server's own wording");
        // No IntelliJ-side copy of a banner-style sentence: the dialog must never construct its own
        // wording for this notice, only pass the server's string straight to the label.
        assertEquals(0, countOccurrences(text, "\"This call could not be decoded"),
                "MsgboxComposerDialog must not hard-code a copy of the compose-and-replace banner "
                        + "sentence -- the wording comes from the server's replace.banner field only");
    }

    @Test
    void theOriginalExpressionFieldIsNonEditable() {
        String text = readSource(DIALOG_SOURCE);
        assertTrue(text.contains("originalOptionsField.setEditable(false)"),
                "the original options expression field must be read-only");
        assertTrue(text.contains("replace.originalOptions"),
                "the original options expression field must be populated from replace.originalOptions");
    }

    @Test
    void noMessagesCallAppearsInTheDialog() {
        String text = withoutCommentLines(readSource(DIALOG_SOURCE));
        assertEquals(0, countOccurrences(text, "Messages."),
                "no confirmation dialog may be added for compose-and-replace mode");
    }

    @Test
    void neitherComponentIsCreatedWhenReplaceIsNull() {
        String text = readSource(DIALOG_SOURCE);
        int replaceNullCheckIndex = text.indexOf("if (replace != null)");
        assertTrue(replaceNullCheckIndex >= 0,
                "the banner and original-expression components must be gated behind a null check on replace");

        int bannerIndex = text.indexOf("replace.banner");
        int originalOptionsIndex = text.indexOf("replace.originalOptions");
        assertTrue(bannerIndex > replaceNullCheckIndex,
                "the banner must be constructed inside the replace != null branch, not unconditionally");
        assertTrue(originalOptionsIndex > replaceNullCheckIndex,
                "the original-expression field must be constructed inside the replace != null branch, "
                        + "not unconditionally");
    }

    @Test
    void openMsgboxPassesDecodedReplaceExactlyOnce() {
        String text = readSource(LAUNCHER_SOURCE);
        assertEquals(1, countOccurrences(text, "decoded.replace"),
                "openMsgbox must pass decoded.replace to the edit-mode MsgboxComposerDialog "
                        + "constructor exactly once, and null to the compose-new one");
    }
}
