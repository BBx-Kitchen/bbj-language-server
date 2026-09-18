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

    private static final Path SETOPTS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "SetoptsComposerDialog.java")
            .toAbsolutePath();

    private static final Path SETOPTS_TRISTATE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "SetoptsTriStateComposerDialog.java")
            .toAbsolutePath();

    /** The four dialogs pinned by this class as gating OK on a server verdict of their own. */
    private static final java.util.List<Path> FOUR_GATED_DIALOG_SOURCES = java.util.List.of(
            ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, SETOPTS_TRISTATE_SOURCE);

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

    /**
     * Widens the server-owns-validation convention to the SETOPTS dialog (#607): the raw-tail
     * hex rule that used to live here in Java was deleted, and OK now gates on the server's own
     * verdict field exactly the way the addWindow-family dialogs already do.
     */
    @Test
    void theSetoptsDialogGatesOkOnTheServerVerdictAndHoldsNoValidationRuleOfItsOwn() {
        String text = withoutCommentLines(readSource(SETOPTS_SOURCE));

        assertEquals(1, countOccurrences(text, "setOKActionEnabled(p.valid)"),
                "SetoptsComposerDialog must gate OK on the server's valid verdict exactly once");
        assertEquals(0, countOccurrences(text, "setOKActionEnabled(true)"),
                "SetoptsComposerDialog must never enable OK unconditionally");

        for (String fragment : new String[]{"Not a number", "Not a string", "Unterminated", "Unbalanced"}) {
            assertEquals(0, countOccurrences(text, fragment),
                    "SetoptsComposerDialog must hold no validation message of its own (\"" + fragment + "\")");
        }
    }

    /**
     * Widens the server-owns-validation convention to the tri-state SETOPTS-in-code dialog (#607):
     * it never had a selection-level rejection rule of its own, but OK must still gate on the
     * composeTriState response's own fail-closed verdict field rather than enabling unconditionally.
     */
    @Test
    void theSetoptsTriStateDialogGatesOkOnTheServerVerdictAndHoldsNoValidationRuleOfItsOwn() {
        String text = withoutCommentLines(readSource(SETOPTS_TRISTATE_SOURCE));

        assertEquals(1, countOccurrences(text, "setOKActionEnabled(result.valid)"),
                "SetoptsTriStateComposerDialog must gate OK on the response's valid verdict exactly once");
        assertEquals(0, countOccurrences(text, "setOKActionEnabled(true)"),
                "SetoptsTriStateComposerDialog must never enable OK unconditionally");

        for (String fragment : new String[]{"Not a number", "Not a string", "Unterminated", "Unbalanced"}) {
            assertEquals(0, countOccurrences(text, fragment),
                    "SetoptsTriStateComposerDialog must hold no validation message of its own (\"" + fragment + "\")");
        }
    }

    /**
     * A negative sweep across all four dialogs this class pins: neither a hand-written
     * character-class regex (the shape a client-side hex/digit rule would use) nor a bare
     * {@code .matches(} call may appear anywhere in any of them. This is the rule that just moved
     * server-side for SETOPTS (#607) and it must never creep back into any of the four -- not
     * just the one it was deleted from.
     */
    @Test
    void noneOfTheFourGatedDialogsReintroducesAClientSideCharacterClassValidationRule() {
        for (Path source : FOUR_GATED_DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, ".matches("),
                    source.getFileName() + " must never call .matches( -- validation is the server's job");
            assertEquals(0, countOccurrences(text, "\"[0-9"),
                    source.getFileName() + " must never hold a hand-written character-class regex literal");
        }
    }
}
