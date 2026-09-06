package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the v4.1 CR-02 off-EDT dispatch for Run As BUI/DWC (#506) and EM login: both the pooled
 * dispatch wrapper and the runtime tripwire that now backs it up must stay in place, so a future
 * regression is caught either at compile-time-review (this test) or at runtime in a real IDE
 * (the assertion itself).
 */
class OffEdtDispatchSourceGuardTest {

    private static final Path RUN_ACTION_BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjRunActionBase.java")
            .toAbsolutePath();

    private static final Path EM_LOGIN_ACTION_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjEMLoginAction.java")
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

    @Test
    void runActionBaseAssertsOffEdtInsideThePooledLambdaAheadOfBuildCommandLine() {
        String text = readSource(RUN_ACTION_BASE_SOURCE);

        int pooledIndex = text.indexOf("executeOnPooledThread(");
        int assertIndex = text.indexOf("assertIsNonDispatchThread()");
        int buildCommandLineIndex = text.indexOf("buildCommandLine(file, project)");

        assertTrue(pooledIndex >= 0, "executeOnPooledThread( is not present in BbjRunActionBase.java");
        assertTrue(assertIndex >= 0, "assertIsNonDispatchThread() is not present in BbjRunActionBase.java");
        assertTrue(buildCommandLineIndex >= 0, "buildCommandLine(file, project) is not present in BbjRunActionBase.java");
        assertEquals(1, countOccurrences(text, "assertIsNonDispatchThread()"),
                "the assertion must appear exactly once");
        assertTrue(pooledIndex < assertIndex,
                "the assertion must be inside the pooled lambda, after executeOnPooledThread(");
        assertTrue(assertIndex < buildCommandLineIndex,
                "the assertion must run before the blocking buildCommandLine( call");
    }

    @Test
    void emLoginActionDispatchesPerformLoginToAPooledThreadExactlyOnce() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);
        assertEquals(1, countOccurrences(text, "executeOnPooledThread(() -> performLogin(project))"),
                "actionPerformed must dispatch performLogin to a pooled thread exactly once");
    }

    @Test
    void performLoginAssertsOffEdtAsTheFirstStatementSoEveryCallerIsCovered() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);

        int declarationIndex = text.indexOf("public static boolean performLogin(");
        int assertIndex = text.indexOf("assertIsNonDispatchThread()");

        assertTrue(declarationIndex >= 0, "public static boolean performLogin( is not present in BbjEMLoginAction.java");
        assertTrue(assertIndex >= 0, "assertIsNonDispatchThread() is not present in BbjEMLoginAction.java");
        assertEquals(1, countOccurrences(text, "assertIsNonDispatchThread()"),
                "the assertion must appear exactly once");
        assertTrue(declarationIndex < assertIndex,
                "the assertion must sit inside the method body, so every caller of performLogin is covered, "
                        + "not just actionPerformed");
    }

    @Test
    void bothFilesStillCarryTheCr02RationaleComment() {
        String runActionText = readSource(RUN_ACTION_BASE_SOURCE);
        String emLoginText = readSource(EM_LOGIN_ACTION_SOURCE);

        assertTrue(runActionText.contains("CR-02"),
                "BbjRunActionBase.java must still explain why the call is dispatched off the EDT (CR-02)");
        assertTrue(emLoginText.contains("CR-02"),
                "BbjEMLoginAction.java must still explain why the call is dispatched off the EDT (CR-02)");
    }

    @Test
    void theAbstractBuildCommandLineDeclarationCarriesNoAssertion() {
        String text = readSource(RUN_ACTION_BASE_SOURCE);
        int abstractDeclarationIndex = text.indexOf(
                "protected abstract GeneralCommandLine buildCommandLine(");
        assertTrue(abstractDeclarationIndex >= 0,
                "the abstract buildCommandLine declaration is not present in BbjRunActionBase.java");

        String abstractDeclarationLine = text.substring(
                text.lastIndexOf('\n', abstractDeclarationIndex) + 1,
                text.indexOf('\n', abstractDeclarationIndex));
        assertTrue(abstractDeclarationLine.trim().endsWith(";"),
                "the abstract declaration has no body, so it cannot and must not carry the assertion");
    }
}
