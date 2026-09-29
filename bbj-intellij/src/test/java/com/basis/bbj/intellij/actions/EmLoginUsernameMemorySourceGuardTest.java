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
 * Pins the IntelliJ wiring for the last-successful-EM-username memory (issue #546 follow-up):
 * {@code promptUsername} pre-fills from {@link EmUsernameMemory#initialUsername()} rather than
 * a hard-coded literal, the remembered username is written only after the token is stored, and
 * only the username -- never a password or token -- ever reaches {@code remember}.
 */
class EmLoginUsernameMemorySourceGuardTest {

    private static final Path LOGIN_ACTION = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjEMLoginAction.java")
            .toAbsolutePath();

    private static final String PROMPT_USERNAME_SIGNATURE = "private static String promptUsername()";
    private static final String PERFORM_LOGIN_SIGNATURE =
            "public static boolean performLogin(@Nullable Project project)";
    private static final String REMEMBER_CALL = "USERNAME_MEMORY.remember(username)";
    private static final String STORE_TOKEN_CALL = "BbjEMTokenStore.storeToken(stdout)";
    private static final String SUCCESS_MESSAGE = "Successfully logged in to Enterprise Manager";
    private static final String LAST_USERNAME_KEY_LITERAL = "com.basis.bbj.intellij.emLastUsername";

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

    private static String promptUsernameBody() {
        return extractMethodBody(readSource(LOGIN_ACTION), PROMPT_USERNAME_SIGNATURE);
    }

    private static String performLoginBody() {
        return extractMethodBody(readSource(LOGIN_ACTION), PERFORM_LOGIN_SIGNATURE);
    }

    @Test
    void promptUsernameCallsInitialUsername() {
        String body = promptUsernameBody();
        assertTrue(body.contains("USERNAME_MEMORY.initialUsername()"),
                "promptUsername must pre-fill via EmUsernameMemory.initialUsername()");
    }

    @Test
    void promptUsernameContainsNoAdminLiteral() {
        String body = promptUsernameBody();
        assertEquals(0, countOccurrences(body, "\"admin\""),
                "promptUsername must not hard-code the \"admin\" username literal");
    }

    @Test
    void rememberIsCalledExactlyOnceInPerformLogin() {
        String body = performLoginBody();
        assertEquals(1, countOccurrences(body, REMEMBER_CALL),
                "performLogin must call " + REMEMBER_CALL + " exactly once");
    }

    @Test
    void rememberIsCalledAfterStoreTokenAndBeforeTheSuccessMessage() {
        String body = performLoginBody();
        int storeIndex = body.indexOf(STORE_TOKEN_CALL);
        int rememberIndex = body.indexOf(REMEMBER_CALL);
        int successIndex = body.indexOf(SUCCESS_MESSAGE);

        assertTrue(storeIndex >= 0, STORE_TOKEN_CALL + " is not present in performLogin's body");
        assertTrue(rememberIndex >= 0, REMEMBER_CALL + " is not present in performLogin's body");
        assertTrue(successIndex >= 0, "the success message is not present in performLogin's body");
        assertTrue(storeIndex < rememberIndex,
                REMEMBER_CALL + " must occur after " + STORE_TOKEN_CALL
                        + " so a failed token store never remembers the username");
        assertTrue(rememberIndex < successIndex,
                REMEMBER_CALL + " must occur before the success message");
    }

    @Test
    void rememberIsNeverCalledWithAPasswordOrTheStdoutToken() {
        String text = readSource(LOGIN_ACTION);
        assertEquals(0, countOccurrences(text, "remember(password"),
                "BbjEMLoginAction.java must never call remember( with a password");
        assertEquals(0, countOccurrences(text, "remember(stdout"),
                "BbjEMLoginAction.java must never call remember( with the returned token");
    }

    @Test
    void lastUsernameKeyLiteralAppearsExactlyOnce() {
        String text = readSource(LOGIN_ACTION);
        assertEquals(1, countOccurrences(text, "\"" + LAST_USERNAME_KEY_LITERAL + "\""),
                "the " + LAST_USERNAME_KEY_LITERAL + " key literal must appear exactly once");
    }

    @Test
    void lastUsernameKeyIsReadAndWrittenThroughPropertiesComponent() {
        String text = readSource(LOGIN_ACTION);
        assertEquals(1, countOccurrences(text, "PropertiesComponent.getInstance().getValue(LAST_USERNAME_KEY"),
                "LAST_USERNAME_KEY must be read through PropertiesComponent.getInstance().getValue(");
        assertEquals(1, countOccurrences(text, "PropertiesComponent.getInstance().setValue(LAST_USERNAME_KEY"),
                "LAST_USERNAME_KEY must be written through PropertiesComponent.getInstance().setValue(");
    }
}
