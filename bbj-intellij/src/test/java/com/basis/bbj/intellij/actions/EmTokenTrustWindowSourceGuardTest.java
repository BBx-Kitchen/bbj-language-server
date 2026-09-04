package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Structural half of #542: the behavioural {@link TokenValidationCacheTest} proves the
 * window's arithmetic, and these guards prove the run actions actually go through it and
 * that both store mutations clear it. The ordering assertions matter most -- a refactor
 * that moved the trusted check ahead of the expiry check would silently let a malformed
 * token populate the cache, the exact interaction this plan follows 80-01 to avoid.
 */
class EmTokenTrustWindowSourceGuardTest {

    private static final Path RUN_BUI_ACTION = guardedActionSource("BbjRunBuiAction.java");
    private static final Path RUN_DWC_ACTION = guardedActionSource("BbjRunDwcAction.java");
    private static final Path RUN_ACTION_BASE = guardedActionSource("BbjRunActionBase.java");
    private static final Path TOKEN_STORE = guardedActionSource("BbjEMTokenStore.java");
    private static final Path TOKEN_VALIDATION_CACHE = guardedActionSource("TokenValidationCache.java");

    private static final List<Path> RUN_ACTIONS = List.of(RUN_BUI_ACTION, RUN_DWC_ACTION);

    private static final String REPROMPT_LITERAL = "EM token expired or invalid. Login again?";

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
    void theRunActionsNoLongerCallTheServerCheckDirectly() {
        assertAll(RUN_ACTIONS.stream().map(path -> () -> {
            String text = readGuardedSource(path);
            assertEquals(0, countOccurrences(text, "validateTokenServerSide"),
                    path + " must not call validateTokenServerSide directly any more -- "
                            + "the trusted read-through path is the only entry point");
        }));
    }

    @Test
    void theRunActionsCallValidateTokenTrustedExactlyOnce() {
        assertAll(RUN_ACTIONS.stream().map(path -> () -> {
            String text = readGuardedSource(path);
            assertEquals(1, countOccurrences(text, "validateTokenTrusted(project, token)"),
                    path + " must call validateTokenTrusted(project, token) exactly once");
        }));
    }

    @Test
    void theExpiryCheckPrecedesTheTrustedValidationInBothRunActions() {
        assertAll(RUN_ACTIONS.stream().map(path -> () -> {
            String text = readGuardedSource(path);
            int expiryIndex = text.indexOf("isTokenExpired(token)");
            int trustedIndex = text.indexOf("validateTokenTrusted(project, token)");
            assertTrue(expiryIndex >= 0 && trustedIndex >= 0 && expiryIndex < trustedIndex,
                    path + " must run isTokenExpired(token) before validateTokenTrusted(project, token) -- "
                            + "the fail-closed expiry gate from 80-01 must still run first");
        }));
    }

    @Test
    void theTrustedValidationPrecedesTheRepromptInBothRunActions() {
        assertAll(RUN_ACTIONS.stream().map(path -> () -> {
            String text = readGuardedSource(path);
            int trustedIndex = text.indexOf("validateTokenTrusted(project, token)");
            int repromptIndex = text.indexOf(REPROMPT_LITERAL);
            assertTrue(trustedIndex >= 0 && repromptIndex >= 0 && trustedIndex < repromptIndex,
                    path + " must run validateTokenTrusted(project, token) before the re-prompt literal");
        }));
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
