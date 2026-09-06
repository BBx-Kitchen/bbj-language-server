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
 * Structural half of #542: the behavioural {@link TokenValidationCacheTest} proves the
 * window's arithmetic, and these guards prove the run actions actually go through it and
 * that both store mutations clear it. The ordering assertions matter most -- a refactor
 * that moved the trusted check ahead of the expiry check would silently let a malformed
 * token populate the cache, the exact interaction this plan follows 80-01 to avoid.
 *
 * <p>BbjRunBuiAction and BbjRunDwcAction now share one buildCommandLine body --
 * {@code BbjRunActionBase.buildWebRunCommandLine} -- so the token-handling flow these guards
 * pin lives there exactly once rather than duplicated per subclass; the subclass-level checks
 * below instead assert that both delegate to it.
 */
class EmTokenTrustWindowSourceGuardTest {

    private static final Path RUN_BUI_ACTION = guardedActionSource("BbjRunBuiAction.java");
    private static final Path RUN_DWC_ACTION = guardedActionSource("BbjRunDwcAction.java");
    private static final Path RUN_ACTION_BASE = guardedActionSource("BbjRunActionBase.java");
    private static final Path TOKEN_STORE = guardedActionSource("BbjEMTokenStore.java");
    private static final Path TOKEN_VALIDATION_CACHE = guardedActionSource("TokenValidationCache.java");

    private static final String REPROMPT_LITERAL = "EM token expired or invalid. Login again?";

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

    private static String sharedWebRunHelperBody() {
        return extractMethodBody(readGuardedSource(RUN_ACTION_BASE), "protected GeneralCommandLine buildWebRunCommandLine(");
    }

    private static Path guardedActionSource(String fileName) {
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
    void bothRunActionsDelegateToTheSharedWebRunHelper() {
        assertEquals(1, countOccurrences(readGuardedSource(RUN_BUI_ACTION), "buildWebRunCommandLine(file, project, \"BUI\")"),
                RUN_BUI_ACTION + " must delegate to buildWebRunCommandLine with client type \"BUI\"");
        assertEquals(1, countOccurrences(readGuardedSource(RUN_DWC_ACTION), "buildWebRunCommandLine(file, project, \"DWC\")"),
                RUN_DWC_ACTION + " must delegate to buildWebRunCommandLine with client type \"DWC\"");
    }

    @Test
    void theSharedWebRunHelperNoLongerCallsTheServerCheckDirectly() {
        String body = sharedWebRunHelperBody();
        assertEquals(0, countOccurrences(body, "validateTokenServerSide"),
                "buildWebRunCommandLine must not call validateTokenServerSide directly -- "
                        + "the trusted read-through path is the only entry point");
    }

    @Test
    void theSharedWebRunHelperCallsValidateTokenTrustedExactlyOnce() {
        String body = sharedWebRunHelperBody();
        assertEquals(1, countOccurrences(body, "validateTokenTrusted(project, token)"),
                "buildWebRunCommandLine must call validateTokenTrusted(project, token) exactly once");
    }

    @Test
    void theExpiryCheckPrecedesTheTrustedValidationInTheSharedWebRunHelper() {
        String body = sharedWebRunHelperBody();
        int expiryIndex = body.indexOf("isTokenExpired(token)");
        int trustedIndex = body.indexOf("validateTokenTrusted(project, token)");
        assertTrue(expiryIndex >= 0 && trustedIndex >= 0 && expiryIndex < trustedIndex,
                "buildWebRunCommandLine must run isTokenExpired(token) before validateTokenTrusted(project, token) -- "
                        + "the fail-closed expiry gate from 80-01 must still run first");
    }

    @Test
    void theTrustedValidationPrecedesTheRepromptInTheSharedWebRunHelper() {
        String body = sharedWebRunHelperBody();
        int trustedIndex = body.indexOf("validateTokenTrusted(project, token)");
        int repromptIndex = body.indexOf(REPROMPT_LITERAL);
        assertTrue(trustedIndex >= 0 && repromptIndex >= 0 && trustedIndex < repromptIndex,
                "buildWebRunCommandLine must run validateTokenTrusted(project, token) before the re-prompt literal");
    }

    @Test
    void theBaseClassDeclaresValidateTokenTrustedAfterValidateTokenServerSide() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        assertEquals(1, countOccurrences(text, "protected boolean validateTokenServerSide("),
                "BbjRunActionBase.java must declare validateTokenServerSide exactly once");
        assertEquals(1, countOccurrences(text, "TokenValidationCache.SESSION.validateThrough("),
                "BbjRunActionBase.java must call TokenValidationCache.SESSION.validateThrough( exactly once");
        int serverSideIndex = text.indexOf("validateTokenServerSide(");
        int trustedIndex = text.indexOf("validateTokenTrusted(");
        assertTrue(serverSideIndex >= 0 && trustedIndex >= 0 && trustedIndex > serverSideIndex,
                "validateTokenTrusted must be declared after validateTokenServerSide, so the pair reads as one unit");
    }

    @Test
    void bothStoreMutationsInvalidateTheCacheInTheRightOrder() {
        String text = readGuardedSource(TOKEN_STORE);
        assertEquals(2, countOccurrences(text, "TokenValidationCache.SESSION.invalidate()"),
                "BbjEMTokenStore.java must call TokenValidationCache.SESSION.invalidate() exactly twice");

        int storeTokenIndex = text.indexOf("public static void storeToken(");
        int getTokenIndex = text.indexOf("public static String getToken(");
        int deleteTokenIndex = text.indexOf("public static void deleteToken(");
        int firstInvalidateIndex = text.indexOf("TokenValidationCache.SESSION.invalidate()");
        int secondInvalidateIndex = text.indexOf(
                "TokenValidationCache.SESSION.invalidate()", firstInvalidateIndex + 1);

        assertTrue(storeTokenIndex >= 0 && getTokenIndex >= 0 && deleteTokenIndex >= 0,
                "storeToken, getToken and deleteToken must all be present");
        assertTrue(firstInvalidateIndex > storeTokenIndex && firstInvalidateIndex < getTokenIndex,
                "the first invalidate() call must be inside storeToken, before getToken begins");
        assertTrue(secondInvalidateIndex > deleteTokenIndex,
                "the second invalidate() call must be inside deleteToken");
    }

    @Test
    void theCacheHasNoIntellijImportAndHashesWithSha256ExactlyOnce() {
        String text = readGuardedSource(TOKEN_VALIDATION_CACHE);
        assertEquals(0, countOccurrences(text, "import com.intellij."),
                "TokenValidationCache.java must have no com.intellij import of any kind");
        assertEquals(1, countOccurrences(text, "MessageDigest.getInstance(\"SHA-256\")"),
                "TokenValidationCache.java must call MessageDigest.getInstance(\"SHA-256\") exactly once");
    }
}
