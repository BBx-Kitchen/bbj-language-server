package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins that {@code BbjEMLoginAction.performLogin}'s temp-file cleanup covers the entire launch --
 * handler construction and the subprocess run included -- not merely the result read (#590).
 *
 * <p>A guard that only asserted a {@code finally} block exists would pass unchanged on the exact
 * regression this pins: a {@code try} re-narrowed around the result read only, which leaks the
 * temp file on disk whenever handler construction or the launch itself throws before that read is
 * reached. So this guard pins ordering instead of presence -- the owner-only creation must precede
 * the launch's opening {@code try}, the subprocess run must sit inside that {@code try}, and the
 * deletion must sit in the {@code finally} that encloses it.
 */
class EmLoginTempFileCleanupSourceGuardTest {

    private static final Path EM_LOGIN_ACTION_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjEMLoginAction.java")
            .toAbsolutePath();

    private static final String PERFORM_LOGIN_SIGNATURE =
            "public static boolean performLogin(@Nullable Project project)";
    private static final String CREATION_LITERAL =
            "BbjProcessSecretEnv.createOwnerOnlyFile(\"bbj-em-login-\", \".tmp\")";
    private static final String RUN_PROCESS_LITERAL = "runProcess(15000)";
    private static final String FINALLY_LITERAL = "} finally {";
    private static final String DELETION_LITERAL = "Files.deleteIfExists(tmpFile)";

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

    private static String performLoginBody() {
        return extractMethodBody(readSource(EM_LOGIN_ACTION_SOURCE), PERFORM_LOGIN_SIGNATURE);
    }

    @Test
    void theOwnerOnlyCreationAppearsExactlyOnce() {
        String body = performLoginBody();
        assertEquals(1, countOccurrences(body, CREATION_LITERAL),
                "performLogin must create the owner-only temp file exactly once");
    }

    @Test
    void theDeletionAppearsExactlyOnce() {
        String body = performLoginBody();
        assertEquals(1, countOccurrences(body, DELETION_LITERAL),
                "performLogin must delete the temp file exactly once");
    }

    @Test
    void theCreationPrecedesTheLaunchTry() {
        String body = performLoginBody();
        int creationIndex = body.indexOf(CREATION_LITERAL);
        int runProcessIndex = body.indexOf(RUN_PROCESS_LITERAL);

        // Located independently of creationIndex: the nearest `try {` at or before the
        // subprocess run is the launch's own opening brace. Chaining this search off
        // creationIndex instead (as an earlier version of this test did) made the final
        // assertion incapable of failing -- indexOf(str, fromIndex) can only return an index
        // >= fromIndex, so any `try {` anywhere after the creation call would satisfy it,
        // including one belonging to a merged block that swallowed the creation call itself.
        // Anchoring to the subprocess run instead means a regression that moves the creation
        // call inside the launch's existing `try` (collapsing the two blocks) pushes
        // creationIndex past this launchTryIndex, and the ordering assertion below genuinely
        // fails.
        int launchTryIndex = body.lastIndexOf("try {", runProcessIndex);

        assertTrue(creationIndex >= 0, CREATION_LITERAL + " is not present in performLogin's body");
        assertTrue(runProcessIndex >= 0, RUN_PROCESS_LITERAL + " is not present in performLogin's body");
        assertTrue(launchTryIndex >= 0, "no `try {` precedes the subprocess run in performLogin's body");
        assertTrue(creationIndex < launchTryIndex,
                "the owner-only creation must precede the launch's opening `try`");
    }

    @Test
    void theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally() {
        String body = performLoginBody();
        int creationIndex = body.indexOf(CREATION_LITERAL);
        int launchTryIndex = body.indexOf("try {", creationIndex);
        int runProcessIndex = body.indexOf(RUN_PROCESS_LITERAL);
        int finallyIndex = body.indexOf(FINALLY_LITERAL, launchTryIndex);

        assertTrue(runProcessIndex >= 0, RUN_PROCESS_LITERAL + " is not present in performLogin's body");
        assertTrue(finallyIndex >= 0, "no `} finally {` follows the launch `try` in performLogin's body");
        assertTrue(launchTryIndex < runProcessIndex,
                "the 15s-timeout subprocess run must occur after the launch's opening `try`");
        assertTrue(runProcessIndex < finallyIndex,
                "the 15s-timeout subprocess run must occur before the enclosing `finally`");
    }

    @Test
    void theDeletionOccursAfterTheFinally() {
        String body = performLoginBody();
        int creationIndex = body.indexOf(CREATION_LITERAL);
        int launchTryIndex = body.indexOf("try {", creationIndex);
        int finallyIndex = body.indexOf(FINALLY_LITERAL, launchTryIndex);
        int deletionIndex = body.indexOf(DELETION_LITERAL, finallyIndex);

        assertTrue(finallyIndex >= 0, "no `} finally {` present in performLogin's body");
        assertTrue(deletionIndex >= 0, "the deletion must occur inside the `finally` that encloses the launch");
        assertTrue(finallyIndex < deletionIndex,
                "the deletion must occur after the `finally` block opens");
    }
}
