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
 * Source-guard regression coverage for #517 (BUILD-03): {@code build.gradle.kts}
 * must fail {@code buildPlugin} fast, with a directed message, when the shared
 * language-server bundle is missing or empty, instead of silently shipping a
 * plugin with no language server. This test asserts the guard's shape directly
 * on the build script's text so that removing the check task or either of its
 * two {@code dependsOn} edges turns this test red rather than regressing
 * silently.
 */
class BbjLanguageServerBundleSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get("build.gradle.kts").toAbsolutePath();

    private static String readGuardedSource() {
        Path resolved = GUARDED_SOURCE;
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
    void verifyLanguageServerBundleTaskIsRegistered() {
        String text = readGuardedSource();
        assertTrue(text.contains("verifyLanguageServerBundle"),
                "verifyLanguageServerBundle task is not referenced in build.gradle.kts");
    }

    @Test
    void bothConsumersDependOnTheSingleCheckTask() {
        String text = readGuardedSource();
        assertEquals(2, countOccurrences(text, "dependsOn(verifyLanguageServerBundle)"),
                "dependsOn(verifyLanguageServerBundle) must appear exactly twice "
                        + "(copyLanguageServer and prepareSandbox) — a duplicated or removed "
                        + "guard edge changes this count");
    }

    @Test
    void checkFailsViaGradleExceptionRatherThanARawStackTrace() {
        String text = readGuardedSource();
        assertTrue(text.contains("GradleException"),
                "GradleException is not referenced in build.gradle.kts — the failure would no "
                        + "longer surface as a directed \"What went wrong\" message");
    }

    @Test
    void failureMessageNamesTheRemediationCommand() {
        String text = readGuardedSource();
        assertTrue(text.contains("npm run build"),
                "npm run build is not present in build.gradle.kts — the failure message no "
                        + "longer tells a developer how to fix a missing bundle");
    }

    @Test
    void packagingConditionCoversBuildAndAssembleAsWellAsBuildPlugin() {
        String text = readGuardedSource();
        // #517 CR-01: `jar` is on the standard assemble/build lifecycle and
        // packages main.cjs unconditionally, so the guard must also fire for
        // `:assemble`/`:build` — not just `:buildPlugin`/`:prepareSandbox`/
        // `:runIde` — or `./gradlew build` (CLAUDE.md's documented command)
        // silently ships a plugin jar with no language server.
        assertTrue(text.contains("gradle.taskGraph.hasTask(\":assemble\")"),
                "packagingRequested no longer checks :assemble — ./gradlew assemble "
                        + "could silently ship a plugin jar without the language server");
        assertTrue(text.contains("gradle.taskGraph.hasTask(\":build\")"),
                "packagingRequested no longer checks :build — ./gradlew build (CLAUDE.md's "
                        + "documented command) could silently ship a plugin jar without the "
                        + "language server");
    }

    @Test
    void checkRunsAtExecutionTimeNotConfigurationTime() {
        String text = readGuardedSource();
        int checkTaskIndex = text.indexOf("verifyLanguageServerBundle by tasks.registering");
        int doLastIndex = text.indexOf("doLast");
        assertTrue(checkTaskIndex >= 0,
                "verifyLanguageServerBundle task registration not found in build.gradle.kts");
        assertTrue(doLastIndex >= 0,
                "doLast is not present in build.gradle.kts — the check must run at execution time");
        assertTrue(checkTaskIndex < doLastIndex,
                "doLast must appear after the verifyLanguageServerBundle registration — "
                        + "a configuration-time check would break a clean clone's wrapper/toolchain bootstrap");
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
