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
 * #535: the behavioural {@link JwtValidityTest} cannot reach {@code performLogin} -- it is
 * platform-coupled -- so the fail-closed structure is pinned here as a source property
 * instead. Asserts the decode left {@link BbjEMTokenStore} (not duplicated), the fail-open
 * rationale comments are gone (not merely unreachable), and the login gate in
 * {@link BbjEMLoginAction} classifies the returned token before it can reach PasswordSafe.
 */
class EmTokenFailClosedSourceGuardTest {

    private static final Path TOKEN_STORE = actionsSource("BbjEMTokenStore.java");
    private static final Path LOGIN_ACTION = actionsSource("BbjEMLoginAction.java");
    private static final Path JWT_VALIDITY = actionsSource("JwtValidity.java");

    private static Path actionsSource(String fileName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", fileName)
                .toAbsolutePath();
    }

    private static String readGuardedSource(Path resolved) {
        if (!Files.exists(resolved)) {
            fail("Guarded source file not found at " + resolved);
        }
        try {
            return Files.readString(resolved);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(resolved, e);
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
    void theDecodeLeftBbjEMTokenStoreRatherThanBeingDuplicated() {
        String text = readGuardedSource(TOKEN_STORE);
        assertEquals(0, countOccurrences(text, "Base64"),
                "BbjEMTokenStore.java must not reference Base64 -- the decode lives in JwtValidity");
        assertEquals(0, countOccurrences(text, "Pattern"),
                "BbjEMTokenStore.java must not reference Pattern -- the regex lives in JwtValidity");
        assertEquals(0, countOccurrences(text, "Matcher"),
                "BbjEMTokenStore.java must not reference Matcher -- the regex lives in JwtValidity");
    }

    @Test
    void theFailOpenRationaleCommentsAreGoneNotMerelyUnreachable() {
        String text = readGuardedSource(TOKEN_STORE);
        assertEquals(0, countOccurrences(text, "let server decide"),
                "BbjEMTokenStore.java must not retain the \"let server decide\" fail-open rationale comment");
        assertEquals(0, countOccurrences(text, "can't determine"),
                "BbjEMTokenStore.java must not retain the \"can't determine\" fail-open rationale comment");
    }

    @Test
    void bbjEMTokenStoreDelegatesToJwtValidityCheckExactlyOnce() {
        String text = readGuardedSource(TOKEN_STORE);
        assertEquals(1, countOccurrences(text, "JwtValidity.check("),
                "BbjEMTokenStore.java must call JwtValidity.check( exactly once");
    }

    @Test
    void jwtValidityHasNoIntelliJPlatformImport() {
        String text = readGuardedSource(JWT_VALIDITY);
        assertEquals(0, countOccurrences(text, "import com.intellij."),
                "JwtValidity.java must have no com.intellij import -- it is plain Java, off the platform classpath");
    }

    @Test
    void loginActionCallsJwtValidityCheckAndStoreTokenExactlyOnceEach() {
        String text = readGuardedSource(LOGIN_ACTION);
        assertEquals(1, countOccurrences(text, "JwtValidity.check("),
                "BbjEMLoginAction.java must call JwtValidity.check( exactly once");
        assertEquals(1, countOccurrences(text, "BbjEMTokenStore.storeToken("),
                "BbjEMLoginAction.java must call BbjEMTokenStore.storeToken( exactly once");
    }

    @Test
    void loginActionClassifiesBeforeStoringSoNoUnusableTokenReachesPasswordSafe() {
        String text = readGuardedSource(LOGIN_ACTION);
        int checkIndex = text.indexOf("JwtValidity.check(");
        int storeIndex = text.indexOf("BbjEMTokenStore.storeToken(");
        assertTrue(checkIndex >= 0, "JwtValidity.check( is not present in BbjEMLoginAction.java");
        assertTrue(storeIndex >= 0, "BbjEMTokenStore.storeToken( is not present in BbjEMLoginAction.java");
        assertTrue(checkIndex < storeIndex,
                "JwtValidity.check( must precede BbjEMTokenStore.storeToken( in BbjEMLoginAction.java "
                        + "so an unusable token can never reach PasswordSafe");
    }

    @Test
    void loginActionsEmptyOutputCheckPrecedesTheClassificationGate() {
        String text = readGuardedSource(LOGIN_ACTION);
        int emptyOutputIndex = text.indexOf("No token received from EM login");
        int checkIndex = text.indexOf("JwtValidity.check(");
        assertTrue(emptyOutputIndex >= 0,
                "\"No token received from EM login\" is not present in BbjEMLoginAction.java");
        assertTrue(checkIndex >= 0, "JwtValidity.check( is not present in BbjEMLoginAction.java");
        assertTrue(emptyOutputIndex < checkIndex,
                "the existing empty-output check must precede the new classification gate "
                        + "so an empty result still gets its own message");
    }
}
