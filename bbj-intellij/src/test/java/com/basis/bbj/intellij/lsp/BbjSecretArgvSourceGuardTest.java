package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final Path RUN_ACTION_BASE = guardedActionSource("BbjRunActionBase.java");
    private static final Path EM_LOGIN_ACTION = guardedActionSource("BbjEMLoginAction.java");
    private static final Path RUN_BUI_ACTION = guardedActionSource("BbjRunBuiAction.java");
    private static final Path RUN_DWC_ACTION = guardedActionSource("BbjRunDwcAction.java");

    private static final Path BBJ_PROCESS_SECRET_ENV = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjProcessSecretEnv.java")
            .toAbsolutePath();

    /** The four secret-bearing call sites, guarded identically. */
    private static final List<Path> ALL_GUARDED_ACTION_FILES =
            List.of(RUN_ACTION_BASE, EM_LOGIN_ACTION, RUN_BUI_ACTION, RUN_DWC_ACTION);

    /** {@code createOwnerOnlyFile} must precede process-handler construction in these two. */
    private static final List<Path> OWNER_ONLY_FILE_CALLERS = List.of(EM_LOGIN_ACTION, RUN_ACTION_BASE);

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

    /**
     * CR-01 / phase-75 gap fix: a source-ordering check ({@code indexOf("BbjProcessSecretEnv")
     * < indexOf("withEnvironment(")}) is vacuous by construction, because
     * {@code import ...BbjProcessSecretEnv;} is necessarily the first occurrence of that
     * literal in any valid Java file — the check would pass for a regression where
     * {@code withEnvironment(...)} receives an unrelated, independently-built map sitting
     * anywhere after that import. This asserts the actual data-flow connection instead:
     * the argument passed to {@code withEnvironment(...)} must be the specific
     * {@code Invocation}'s own {@code .environment()} map, not merely textually present
     * somewhere after an unrelated import.
     */
    @Test
    void theWithEnvironmentCallArgumentIsTheInvocationsEnvironmentMap() {
        String text = readGuardedSource(RUN_ACTION_BASE);
        assertWithEnvironmentArgumentIsInvocationEnvironment(text, RUN_ACTION_BASE.toString());
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

    /** Same CR-01 fix as {@link #theWithEnvironmentCallArgumentIsTheInvocationsEnvironmentMap()}, across all four call sites. */
    @Test
    void allFourFilesPassTheInvocationsEnvironmentMapToWithEnvironment() {
        assertAll("withEnvironment( argument is the Invocation's own environment() map",
                ALL_GUARDED_ACTION_FILES.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    assertWithEnvironmentArgumentIsInvocationEnvironment(text, source.toString());
                }));
    }

    /**
     * Extracts the exact argument text passed to {@code withEnvironment(...)} (balanced-
     * parenthesis scan, so a nested call like {@code invocation.environment()} is captured
     * whole) and asserts it is exactly {@code "<var>.environment()"} where {@code <var>} is
     * the local variable the file itself declared via
     * {@code BbjProcessSecretEnv.Invocation <var> = BbjProcessSecretEnv.xxx(...)}. This is a
     * genuine data-flow assertion, not a token-ordering one: a regression where
     * {@code withEnvironment(...)} receives an independently-built map (e.g.
     * {@code withEnvironment(Map.of())}) — even sitting textually after the
     * {@code BbjProcessSecretEnv} import and reachable via a bare {@code withEnvironment(}
     * substring search — fails this assertion because the extracted argument no longer
     * equals {@code invocation.environment()}.
     */
    private static void assertWithEnvironmentArgumentIsInvocationEnvironment(String text, String sourceLabel) {
        String invocationVar = extractInvocationVariableName(text);
        assertTrue(invocationVar != null,
                "No \"BbjProcessSecretEnv.Invocation <var> = ...\" declaration found in " + sourceLabel);
        String argument = extractBalancedCallArgument(text, "withEnvironment(");
        assertTrue(argument != null, "No withEnvironment( call found in " + sourceLabel);
        assertEquals(invocationVar + ".environment()", argument,
                "withEnvironment( must be called with the Invocation's own environment() map ("
                        + invocationVar + ".environment()) -- not an independently constructed value -- in "
                        + sourceLabel + "; found: withEnvironment(" + argument + ")");
    }

    private static String extractInvocationVariableName(String text) {
        Matcher m = Pattern.compile("BbjProcessSecretEnv\\.Invocation\\s+(\\w+)\\s*=").matcher(text);
        return m.find() ? m.group(1) : null;
    }

    /** Scans forward from the end of {@code callPrefix} (which must end in "(") to the matching close paren. */
    private static String extractBalancedCallArgument(String text, String callPrefix) {
        int start = text.indexOf(callPrefix);
        if (start < 0) {
            return null;
        }
        int argsStart = start + callPrefix.length();
        int depth = 1;
        int i = argsStart;
        while (i < text.length() && depth > 0) {
            char c = text.charAt(i);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            }
            if (depth > 0) {
                i++;
            }
        }
        if (depth != 0) {
            return null;
        }
        return text.substring(argsStart, i).trim();
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

    // --- Task 3: the token file is owner-only for its whole life ---

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
        // Both callers build their command through CapturingProcessHandler at the
        // relevant call site (BbjRunActionBase also constructs an unrelated
        // OSProcessHandler elsewhere in actionPerformed(), for the main run flow —
        // deliberately excluded here so that unrelated earlier construction cannot
        // make this precedence check pass or fail for the wrong reason).
        assertAll("createOwnerOnlyFile precedes process-handler construction",
                OWNER_ONLY_FILE_CALLERS.stream().map(source -> () -> {
                    String text = readGuardedSource(source);
                    int createOwnerOnlyIndex = text.indexOf("createOwnerOnlyFile");
                    int processHandlerIndex = text.indexOf("CapturingProcessHandler(");
                    assertTrue(createOwnerOnlyIndex >= 0, "createOwnerOnlyFile is not present in " + source);
                    assertTrue(processHandlerIndex >= 0,
                            "no CapturingProcessHandler construction is present in " + source);
                    assertTrue(createOwnerOnlyIndex < processHandlerIndex,
                            "createOwnerOnlyFile must precede the CapturingProcessHandler construction in " + source);
                }));
    }

    /**
     * {@code java.nio.file.Files.createTempFile} already defaults to an owner-only
     * mode on this JDK's POSIX provider, independent of the process umask — so a
     * behavioural assertion against the returned permission set alone cannot
     * distinguish the hardened implementation from the pre-fix skeleton (both pass).
     * This guard makes the hardening an explicit, verifiable source property instead
     * of an accidental default: {@code createOwnerOnlyFile} must set the permission
     * at creation time via {@code PosixFilePermissions.asFileAttribute}, not rely on
     * the JDK's undocumented implementation default.
     */
    @Test
    void createOwnerOnlyFileSetsPosixPermissionsExplicitlyAtCreationTime() {
        String text = readGuardedSource(BBJ_PROCESS_SECRET_ENV);
        assertTrue(countOccurrences(text, "PosixFilePermissions.asFileAttribute") >= 1,
                "createOwnerOnlyFile must set its permissions explicitly at creation time via "
                        + "PosixFilePermissions.asFileAttribute, not rely on the JDK's implementation default");
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
