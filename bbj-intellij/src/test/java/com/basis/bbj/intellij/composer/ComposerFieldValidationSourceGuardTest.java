package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #623 field-validation gate for the IntelliJ addWindow and addChildWindow dialogs: each
 * dialog gates OK on the language server's own {@code valid} verdict rather than an unconditional
 * enable, renders every one of the server's per-field error strings exactly once, and holds no
 * validation rule or message text of its own. A failure here means one of those regressed -- an
 * unconditional enable crept back in, a field's error string stopped being rendered, or a
 * client-side copy of a server-owned validation message was added -- and each of those lets
 * IntelliJ insert text VS Code would have refused.
 */
class ComposerFieldValidationSourceGuardTest {

    private static final Path ADD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "AddWindowComposerDialog.java")
            .toAbsolutePath();

    private static final Path ADD_CHILD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "AddChildWindowComposerDialog.java")
            .toAbsolutePath();

    private static final Path ADD_WINDOW_FAMILY_BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "AddWindowFamilyComposerDialogBase.java")
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
    void theAddWindowDialogGatesOkOnTheServerVerdictAndRendersEveryFieldError() {
        String text = withoutCommentLines(readSource(ADD_WINDOW_SOURCE));

        assertEquals(1, countOccurrences(text, "setOKActionEnabled(p.valid)"),
                "AddWindowComposerDialog must gate OK on the server's valid verdict exactly once");
        assertEquals(0, countOccurrences(text, "setOKActionEnabled(true)"),
                "AddWindowComposerDialog must never enable OK unconditionally");

        for (String field : new String[]{
                "p.receiverError", "p.sysguiError", "p.titleError", "p.xError", "p.yError", "p.widthError",
                "p.heightError"}) {
            assertEquals(1, countOccurrences(text, field),
                    "AddWindowComposerDialog must read " + field + " exactly once");
        }

        for (String fragment : new String[]{"Not a number", "Not a string", "Unterminated", "Unbalanced"}) {
            assertEquals(0, countOccurrences(text, fragment),
                    "AddWindowComposerDialog must hold no validation message of its own (\"" + fragment + "\")");
        }
    }

    @Test
    void theAddChildWindowDialogGatesOkOnTheServerVerdictAndRendersEveryFieldError() {
        String text = withoutCommentLines(readSource(ADD_CHILD_WINDOW_SOURCE));

        assertEquals(1, countOccurrences(text, "setOKActionEnabled(p.valid)"),
                "AddChildWindowComposerDialog must gate OK on the server's valid verdict exactly once");
        assertEquals(0, countOccurrences(text, "setOKActionEnabled(true)"),
                "AddChildWindowComposerDialog must never enable OK unconditionally");

        for (String field : new String[]{
                "p.receiverError", "p.windowError", "p.idError", "p.contextError", "p.titleError", "p.xError",
                "p.yError", "p.widthError", "p.heightError"}) {
            assertEquals(1, countOccurrences(text, field),
                    "AddChildWindowComposerDialog must read " + field + " exactly once");
        }

        for (String fragment : new String[]{"Not a number", "Not a string", "Unterminated", "Unbalanced"}) {
            assertEquals(0, countOccurrences(text, fragment),
                    "AddChildWindowComposerDialog must hold no validation message of its own (\"" + fragment + "\")");
        }
    }

    /**
     * The addWindow-family shared base (#630) carries no {@code apply(...)} of its own -- the
     * server-verdict gate and every per-field error read stay in each subclass -- but a
     * client-authored validation message could still hide on the base's shared methods
     * ({@code prefill}, {@code addGroupedChecks}, ...), so the same forbidden-fragment sweep
     * applies there too.
     */
    @Test
    void theSharedAddWindowFamilyBaseHoldsNoValidationMessageOfItsOwn() {
        String text = withoutCommentLines(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE));
        for (String fragment : new String[]{"Not a number", "Not a string", "Unterminated", "Unbalanced"}) {
            assertEquals(0, countOccurrences(text, fragment),
                    "AddWindowFamilyComposerDialogBase must hold no validation message of its own (\"" + fragment + "\")");
        }
    }
}
