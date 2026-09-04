package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Proves, as a source property, that the internal {@code PasswordSafeSettings}/{@code ProviderType}
 * API (#552) is touched in exactly one place in the whole plugin -- {@code
 * BbjEMTokenStore.resolveBackend()} -- and nowhere else. The behavioural rule (once per distinct
 * non-keychain backend) is proven by {@link BackendNoticePolicyTest}, which deliberately cannot see
 * the platform API at all; this guard is the isolation half research Pitfall 7 asks for.
 */
class EmTokenBackendNoticeSourceGuardTest {

    private static final Path MAIN_SOURCE_ROOT = Paths.get("src", "main", "java").toAbsolutePath();

    private static final Path TOKEN_STORE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjEMTokenStore.java")
            .toAbsolutePath();

    private static final Path BACKEND_NOTICE_POLICY = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BackendNoticePolicy.java")
            .toAbsolutePath();

    private static final Path TOKEN_BACKEND = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "TokenBackend.java")
            .toAbsolutePath();

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

    /**
     * Walks {@code src/main/java} only -- never the repository root -- collecting every {@code
     * .java} file whose contents contain {@code literal} at least once.
     */
    private static List<Path> mainSourceFilesContaining(String literal) {
        try (Stream<Path> paths = Files.walk(MAIN_SOURCE_ROOT)) {
            return paths
                    .filter(p -> p.getFileName().toString().endsWith(".java"))
                    .filter(p -> {
                        try {
                            return Files.readString(p).contains(literal);
                        } catch (IOException e) {
                            throw new UncheckedIOException(e);
                        }
                    })
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Test
    void passwordSafeSettingsAppearsInExactlyOneMainSourceFile() {
        List<Path> hits = mainSourceFilesContaining("PasswordSafeSettings");
        assertEquals(1, hits.size(),
                "PasswordSafeSettings must be referenced in exactly one file under src/main/java "
                        + "-- found in: " + hits);
        assertTrue(hits.get(0).toString().replace('\\', '/').endsWith("actions/BbjEMTokenStore.java"),
                "the sole reference to PasswordSafeSettings must be in actions/BbjEMTokenStore.java, "
                        + "found in: " + hits.get(0));
    }

    @Test
    void providerTypeAppearsInExactlyOneMainSourceFile() {
        List<Path> hits = mainSourceFilesContaining("ProviderType");
        assertEquals(1, hits.size(),
                "ProviderType must be referenced in exactly one file under src/main/java "
                        + "-- found in: " + hits);
        assertTrue(hits.get(0).toString().replace('\\', '/').endsWith("actions/BbjEMTokenStore.java"),
                "the sole reference to ProviderType must be in actions/BbjEMTokenStore.java, "
                        + "found in: " + hits.get(0));
    }

    @Test
    void internalApiOccursOnlyAfterTheResolveBackendDeclaration() {
        String text = readGuardedSource(TOKEN_STORE);
        int lastImportEnd = lastImportLineEnd(text);
        int resolveBackendDeclaration = text.indexOf("static TokenBackend resolveBackend()");
        assertTrue(resolveBackendDeclaration >= 0,
                "resolveBackend() declaration not found in " + TOKEN_STORE);

        assertAll("PasswordSafeSettings/ProviderType occur only inside resolveBackend()",
                () -> assertNoOccurrenceBetween(text, "PasswordSafeSettings", lastImportEnd, resolveBackendDeclaration),
                () -> assertNoOccurrenceBetween(text, "ProviderType", lastImportEnd, resolveBackendDeclaration));
    }

    private static void assertNoOccurrenceBetween(String text, String literal, int from, int declarationIndex) {
        int index = from;
        while ((index = text.indexOf(literal, index)) != -1) {
            assertTrue(index > declarationIndex,
                    literal + " occurs at index " + index + ", before the resolveBackend() declaration "
                            + "at index " + declarationIndex + " -- every post-import occurrence must sit "
                            + "inside that method, and nowhere else in the class");
            index += literal.length();
        }
    }

    private static int lastImportLineEnd(String text) {
        int lastImport = -1;
        int index = 0;
        while ((index = text.indexOf("import ", index)) != -1) {
            lastImport = index;
            index += "import ".length();
        }
        assertTrue(lastImport >= 0, "no import line found");
        int lineEnd = text.indexOf('\n', lastImport);
        return lineEnd >= 0 ? lineEnd : lastImport;
    }

    @Test
    void evaluateResolveBackendIsCalledExactlyTwice() {
        String text = readGuardedSource(TOKEN_STORE);
        assertEquals(2, countOccurrences(text, "evaluate(resolveBackend())"),
                "evaluate(resolveBackend()) must appear exactly twice -- once in storeToken, once in "
                        + "getToken -- so a user who changes the IDE setting after logging in is still "
                        + "caught on the next Run");
    }

    @Test
    void thePolicyIsEvaluatedBeforePasswordSafeIsTouchedInBothEntryPoints() {
        String text = readGuardedSource(TOKEN_STORE);

        String storeTokenBody = extractMethodBody(text, "public static void storeToken(");
        assertTrue(storeTokenBody != null, "storeToken( body not found in " + TOKEN_STORE);
        int storeEvaluate = storeTokenBody.indexOf("evaluate(resolveBackend())");
        int storeSet = storeTokenBody.indexOf("PasswordSafe.getInstance().set(");
        assertTrue(storeEvaluate >= 0, "evaluate(resolveBackend()) not found inside storeToken");
        assertTrue(storeSet >= 0, "PasswordSafe.getInstance().set( not found inside storeToken");
        assertTrue(storeEvaluate < storeSet,
                "storeToken must evaluate the backend notice before touching PasswordSafe");

        String getTokenBody = extractMethodBody(text, "public static String getToken(");
        assertTrue(getTokenBody != null, "getToken( body not found in " + TOKEN_STORE);
        int getEvaluate = getTokenBody.indexOf("evaluate(resolveBackend())");
        int getGet = getTokenBody.indexOf("PasswordSafe.getInstance().get(");
        assertTrue(getEvaluate >= 0, "evaluate(resolveBackend()) not found inside getToken");
        assertTrue(getGet >= 0, "PasswordSafe.getInstance().get( not found inside getToken");
        assertTrue(getEvaluate < getGet,
                "getToken must evaluate the backend notice before touching PasswordSafe");
    }

    @Test
    void backendNoticePolicyAndTokenBackendCarryNoIntellijPlatformImport() {
        assertAll("no com.intellij import in the plain-Java seam classes",
                () -> assertEquals(0, countOccurrences(readGuardedSource(BACKEND_NOTICE_POLICY), "import com.intellij."),
                        "BackendNoticePolicy.java must carry no com.intellij import -- it is a plain-Java "
                                + "seam exercised on the plain JUnit 5 test classpath"),
                () -> assertEquals(0, countOccurrences(readGuardedSource(TOKEN_BACKEND), "import com.intellij."),
                        "TokenBackend.java must carry no com.intellij import -- it is the plain "
                                + "classification enum the rest of the plugin speaks in"));
    }

    @Test
    void noListenerSubscriptionAndTheResolveBackendWiringIsPresent() {
        String text = readGuardedSource(TOKEN_STORE);
        assertAll("no deferred-listener approach, and resolveBackend is fully wired",
                () -> assertEquals(0, countOccurrences(text, "PasswordSafeSettingsListener"),
                        "BbjEMTokenStore.java must not subscribe to PasswordSafeSettingsListener -- "
                                + "evaluate-on-store-and-get already covers the requirement"),
                () -> assertTrue(countOccurrences(text, "resolveBackend") >= 3,
                        "resolveBackend must appear at least three times: the declaration plus the two "
                                + "call sites in storeToken and getToken"),
                () -> assertEquals(1, countOccurrences(text, "getProviderType()"),
                        "getProviderType() must be read exactly once, inside resolveBackend()"));
    }

    /**
     * Returns the body of the method whose declaration starts with {@code declarationPrefix}, from
     * its opening brace to the matching close brace, by a balanced-brace scan.
     */
    private static String extractMethodBody(String text, String declarationPrefix) {
        int declaration = text.indexOf(declarationPrefix);
        if (declaration < 0) {
            return null;
        }
        int open = text.indexOf('{', declaration);
        if (open < 0) {
            return null;
        }
        int depth = 1;
        int i = open + 1;
        while (i < text.length() && depth > 0) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
            }
            if (depth > 0) {
                i++;
            }
        }
        if (depth != 0) {
            return null;
        }
        return text.substring(open + 1, i);
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
}
