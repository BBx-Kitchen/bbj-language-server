package com.basis.bbj.intellij.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the platform-bound wiring inside {@link BbjConfigPathService} that
 * plain JUnit cannot exercise directly: {@code activeConfigPath()} needs a live IntelliJ
 * {@code Application} to resolve {@code BbjSettings.getInstance()}, and
 * {@code isConfigFile(VirtualFile)}/{@code isActiveConfigFile(VirtualFile)} need a real
 * {@code VirtualFile}. {@code ConfigPathsTest} already asserts the pure decisions these methods
 * delegate to; this test pins that the delegation itself -- and the no-home-derivation rule --
 * stays in place as a text check on the source.
 */
class BbjConfigPathServiceSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "BbjConfigPathService.java")
        .toAbsolutePath();

    private static String readGuardedSource() {
        if (!Files.exists(GUARDED_SOURCE)) {
            fail("Guarded source file not found at " + GUARDED_SOURCE);
        }
        try {
            return Files.readString(GUARDED_SOURCE);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(IOException cause) {
            super("Failed to read " + GUARDED_SOURCE, cause);
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
    void theCachedResultFieldIsVolatile() {
        String text = readGuardedSource();
        assertTrue(text.contains("private volatile ConfigModels.ResolvedConfigPathResult"),
            "the cached result field must be volatile so an indexing-thread read always observes the last write");
    }

    @Test
    void activeConfigPathDelegatesToTheStaticHelperRatherThanDerivingTheHomeDefaultItself() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "return resolveActivePath("),
            "activeConfigPath() must delegate to the pure resolveActivePath helper");
        assertEquals(0, countOccurrences(text, "\"cfg\""),
            "no BBj-home-derived path construction may be reintroduced here -- that belongs to the language server alone");
    }

    @Test
    void isConfigFileDelegatesToTheStaticHelper() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "return isConfigFileName("),
            "isConfigFile(VirtualFile) must delegate to the pure isConfigFileName helper");
    }

    @Test
    void shouldWarnOnceIsBackedByTheWarnedPathsSet() {
        String text = readGuardedSource();
        assertTrue(text.contains("warnedPaths.add(path)"),
            "shouldWarnOnce must key off the session-scoped warnedPaths set");
    }

    @Test
    void getInstanceReadsTheServiceFromTheApplication() {
        String text = readGuardedSource();
        assertTrue(text.contains("ApplicationManager.getApplication().getService(BbjConfigPathService.class)"),
            "getInstance() must read the application-level service through ApplicationManager");
    }
}
