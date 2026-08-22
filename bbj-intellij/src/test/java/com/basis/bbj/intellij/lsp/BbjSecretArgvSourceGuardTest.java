package com.basis.bbj.intellij.lsp;

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
 * GHSA-33x9-cpwv-xcv2 / GHSA-xxp5-vv2w-42q8: this guard is what keeps the environment-
 * channel fix from silently regressing back to a secret-bearing {@code addParameter}
 * call. Covers all four secret-bearing call sites: {@code BbjRunActionBase.java} (the
 * JWT validate path, highest-frequency exposure — plan 01), and {@code
 * BbjEMLoginAction.java}, {@code BbjRunBuiAction.java} and {@code BbjRunDwcAction.java}
 * (EM login, BUI run and DWC run — plan 02).
 */
class BbjSecretArgvSourceGuardTest {

    private static final Path RUN_ACTION_BASE = guardedSource("BbjRunActionBase.java");
    private static final Path EM_LOGIN_ACTION = guardedSource("BbjEMLoginAction.java");
    private static final Path RUN_BUI_ACTION = guardedSource("BbjRunBuiAction.java");
    private static final Path RUN_DWC_ACTION = guardedSource("BbjRunDwcAction.java");

    /** The four secret-bearing call sites, guarded identically. */
    private static final List<Path> ALL_GUARDED_ACTION_FILES =
            List.of(RUN_ACTION_BASE, EM_LOGIN_ACTION, RUN_BUI_ACTION, RUN_DWC_ACTION);

    /** {@code createOwnerOnlyFile} must precede process-handler construction in these two. */
    private static final List<Path> OWNER_ONLY_FILE_CALLERS = List.of(EM_LOGIN_ACTION, RUN_ACTION_BASE);

    private static Path guardedSource(String fileName) {
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

    @Test
    void theTokenBearingAddParameterCallIsAbsent() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        assertEquals(0, countOccurrences(text, "addParameter(token)"),
                "BbjRunActionBase.java must not call addParameter(token) — "
                        + "the token must travel on the environment, not argv");
    }

    @Test
    void theFileCallsWithEnvironmentAtLeastOnce() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        assertTrue(countOccurrences(text, "withEnvironment(") >= 1,
                "withEnvironment( is not present in BbjRunActionBase.java");
    }

    @Test
    void theFileReferencesBbjProcessSecretEnvAtLeastOnce() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        assertTrue(countOccurrences(text, "BbjProcessSecretEnv") >= 1,
                "BbjProcessSecretEnv is not referenced in BbjRunActionBase.java");
    }

    @Test
    void theBbjProcessSecretEnvReferencePrecedesTheWithEnvironmentCall() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        int secretEnvIndex = text.indexOf("BbjProcessSecretEnv");
        int withEnvironmentIndex = text.indexOf("withEnvironment(");
        assertTrue(secretEnvIndex >= 0, "BbjProcessSecretEnv is not present in BbjRunActionBase.java");
        assertTrue(withEnvironmentIndex >= 0, "withEnvironment( is not present in BbjRunActionBase.java");
        assertTrue(secretEnvIndex < withEnvironmentIndex,
                "BbjProcessSecretEnv must be referenced before the withEnvironment( call");
    }

    @Test
    void allFourGuardedActionFilesArePresent() {
        for (Path source : ALL_GUARDED_ACTION_FILES) {
            if (!Files.exists(source)) {
                fail("Guarded source file not found at " + source);
            }
        }
    }

    @Test
    void noneOfTheFourFilesRetainsASecretBearingParameterCall() {
        assertAll("secret-bearing addParameter calls",
                ALL_GUARDED_ACTION_FILES.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    assertEquals(0, countOccurrences(text, "addParameter(username)"),
                            source + " must not call addParameter(username) — "
                                    + "the username must travel on the environment, not argv");
                    assertEquals(0, countOccurrences(text, "addParameter(password)"),
                            source + " must not call addParameter(password) — "
                                    + "the password must travel on the environment, not argv");
                    assertEquals(0, countOccurrences(text, "addParameter(token)"),
                            source + " must not call addParameter(token) — "
                                    + "the token must travel on the environment, not argv");
                }));
    }

    @Test
    void allFourFilesCallWithEnvironmentAndReferenceBbjProcessSecretEnv() {
        assertAll("withEnvironment/BbjProcessSecretEnv presence",
                ALL_GUARDED_ACTION_FILES.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    assertTrue(countOccurrences(text, "withEnvironment(") >= 1,
                            "withEnvironment( is not present in " + source);
                    assertTrue(countOccurrences(text, "BbjProcessSecretEnv") >= 1,
                            "BbjProcessSecretEnv is not referenced in " + source);
                }));
    }

    @Test
    void allFourFilesReferenceBbjProcessSecretEnvBeforeCallingWithEnvironment() {
        assertAll("BbjProcessSecretEnv precedes withEnvironment(",
                ALL_GUARDED_ACTION_FILES.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    int secretEnvIndex = text.indexOf("BbjProcessSecretEnv");
                    int withEnvironmentIndex = text.indexOf("withEnvironment(");
                    assertTrue(secretEnvIndex >= 0, "BbjProcessSecretEnv is not present in " + source);
                    assertTrue(withEnvironmentIndex >= 0, "withEnvironment( is not present in " + source);
                    assertTrue(secretEnvIndex < withEnvironmentIndex,
                            "BbjProcessSecretEnv must be referenced before the withEnvironment( call in " + source);
                }));
    }

    @Test
    void buiAndDwcActionsRetainNoEmptyStringCredentialPlaceholders() {
        assertAll("no empty-string credential placeholders",
                List.of(RUN_BUI_ACTION, RUN_DWC_ACTION).stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    assertEquals(0, countOccurrences(text, "// username placeholder"),
                            source + " must not retain the username placeholder comment — "
                                    + "the placeholder positions no longer exist");
                    assertEquals(0, countOccurrences(text, "// password placeholder"),
                            source + " must not retain the password placeholder comment — "
                                    + "the placeholder positions no longer exist");
                }));
    }

    @Test
    void emLoginAndRunActionBaseObtainTheirOutputFileThroughCreateOwnerOnlyFile() {
        assertAll("createOwnerOnlyFile referenced",
                OWNER_ONLY_FILE_CALLERS.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    assertTrue(countOccurrences(text, "createOwnerOnlyFile") >= 1,
                            "createOwnerOnlyFile is not referenced in " + source);
                }));
    }

    @Test
    void theCreateOwnerOnlyFileReferencePrecedesTheProcessHandlerConstructionInEachCaller() {
        assertAll("createOwnerOnlyFile precedes process-handler construction",
                OWNER_ONLY_FILE_CALLERS.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    int createOwnerOnlyIndex = text.indexOf("createOwnerOnlyFile");
                    int processHandlerIndex = firstIndexOfAny(text, "CapturingProcessHandler(", "OSProcessHandler(");
                    assertTrue(createOwnerOnlyIndex >= 0, "createOwnerOnlyFile is not present in " + source);
                    assertTrue(processHandlerIndex >= 0, "no process-handler construction is present in " + source);
                    assertTrue(createOwnerOnlyIndex < processHandlerIndex,
                            "createOwnerOnlyFile must precede the process-handler construction in " + source);
                }));
    }

    private static int firstIndexOfAny(String text, String... literals) {
        int best = -1;
        for (String literal : literals) {
            int index = text.indexOf(literal);
            if (index >= 0 && (best < 0 || index < best)) {
                best = index;
            }
        }
        return best;
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
