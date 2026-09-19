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
 * Pins #589: {@code BbjEMLoginAction} must declare an {@code update()} override running on the
 * background update thread, gated on the presence of a project alone. The gate must not widen to
 * language-server readiness or to BBj Home -- both would remove the one thing EM login exists to
 * provide (the ability to authenticate, and the dialog naming a missing BBj Home) at precisely the
 * moment a user would need it.
 */
class EmLoginEnablementSourceGuardTest {

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
    void updateAndGetActionUpdateThreadAreEachDeclaredExactlyOnce() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);
        assertEquals(1, countOccurrences(text, "public void update(@NotNull AnActionEvent e)"),
                "BbjEMLoginAction.java must declare update( exactly once");
        assertEquals(1, countOccurrences(text, "getActionUpdateThread"),
                "BbjEMLoginAction.java must declare getActionUpdateThread exactly once");
        assertTrue(text.contains("ActionUpdateThread.BGT"),
                "BbjEMLoginAction.java must return ActionUpdateThread.BGT");
    }

    @Test
    void theHideNotGreySetterIsUsedAndThePlainSetterNeverAppears() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);
        assertTrue(countOccurrences(text, "setEnabledAndVisible(") >= 1,
                "BbjEMLoginAction.java must call setEnabledAndVisible( at least once");
        assertEquals(0, countOccurrences(text, "setEnabled("),
                "BbjEMLoginAction.java must not call the plain setEnabled( -- siblings hide, they do not grey");
    }

    @Test
    void theUpdateBodyGatesOnProjectAloneReadingNeitherServerStatusNorBbjHome() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);
        String updateBody = extractMethodBody(text, "public void update(@NotNull AnActionEvent e)");

        assertEquals(0, countOccurrences(updateBody, "ServerStatus"),
                "the update() body must not read ServerStatus -- EM login never talks to the language server");
        assertEquals(0, countOccurrences(updateBody, "bbjHomePath"),
                "the update() body must not read bbjHomePath -- greying out here would swallow the "
                        + "one dialog that tells a new user what to configure");
    }

    @Test
    void theExistingOffEdtDispatchGuardsAreUndisturbed() {
        String text = readSource(EM_LOGIN_ACTION_SOURCE);
        assertEquals(1, countOccurrences(text, "assertIsNonDispatchThread()"),
                "the new overrides must not add a second off-EDT assertion");
        assertEquals(1, countOccurrences(text, "executeOnPooledThread(() -> performLogin(project))"),
                "the new overrides must not add a second pooled dispatch of performLogin");
    }
}
