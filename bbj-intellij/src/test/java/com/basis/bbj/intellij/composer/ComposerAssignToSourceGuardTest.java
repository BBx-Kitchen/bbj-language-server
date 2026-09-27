package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the assign-to verdict handling for the IntelliJ msgbox and CVS() dialogs (issue #626):
 * each dialog renders the language server's own per-field error for the assign-to target, gates
 * OK on the server's overall {@code valid} verdict, and holds no assign-to rule or message text
 * of its own.
 */
class ComposerAssignToSourceGuardTest {

    private static final Path MSGBOX_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "MsgboxComposerDialog.java")
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
    void theMsgboxDialogRendersTheServersAssignToVerdictAndHoldsNoRuleOfItsOwn() {
        String text = withoutCommentLines(readSource(MSGBOX_SOURCE));

        assertEquals(1, countOccurrences(text, "assignToError.setText(p.assignToError"),
                "MsgboxComposerDialog must read p.assignToError into its error label exactly once");
        assertEquals(1, countOccurrences(text, "labeledWithError(\"Assign result to\""),
                "MsgboxComposerDialog must build the assign-to row with labeledWithError and the label "
                        + "\"Assign result to\"");
        assertEquals(0, countOccurrences(text, "Assign result to (optional)"),
                "MsgboxComposerDialog must no longer mark the assign-to label optional");
        assertEquals(0, countOccurrences(text, "numeric or object variable"),
                "MsgboxComposerDialog must not copy the language server's assign-to message text");
        assertEquals(0, countOccurrences(text, "string or object variable"),
                "MsgboxComposerDialog must not copy the language server's assign-to message text");
        assertEquals(1, countOccurrences(text, "setOKActionEnabled(p.valid)"),
                "MsgboxComposerDialog must still gate OK on the server's valid verdict exactly once");
    }
}
