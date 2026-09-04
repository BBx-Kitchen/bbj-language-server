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
 * Source-guard fence: {@code BbjMissingNodeNotificationProvider} must resolve both version
 * branches through {@code BbjNodeVersionCache} and never call the stateless detector's version
 * method directly (D-11, EDT-03, #543).
 */
class BbjMissingNodeNotificationSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjMissingNodeNotificationProvider.java")
            .toAbsolutePath();

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
    void bothVersionBranchesResolveThroughTheCache() {
        String text = readGuardedSource();
        assertEquals(2, countOccurrences(text, "BbjNodeVersionCache.SESSION.getVersion("),
                "both the configured-path branch and the PATH-detected branch must call the cache");
    }

    @Test
    void theDetectorsVersionMethodIsNoLongerCalledAtAll() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "BbjNodeDetector.getNodeVersion("),
                "the stateless detector's version method must no longer be called directly");
    }

    @Test
    void detectNodePathAndMeetsMinimumVersionAreUnchanged() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "BbjNodeDetector.detectNodePath()"),
                "the PATH scan (no subprocess, D-11) must remain exactly once");
        assertEquals(2, countOccurrences(text, "BbjNodeDetector.meetsMinimumVersion("),
                "both branches must still check the minimum version");
    }

    @Test
    void theExistenceGuardAndTheCachedDownloadFallbackBranchAreUnchanged() {
        String text = readGuardedSource();
        assertTrue(text.contains("new File(nodeJsPath).exists()"),
                "the explicit-path existence guard must remain");
        assertTrue(text.contains("BbjNodeDownloader.getCachedNodePath()"),
                "the cached-download fallback branch must remain");
    }
}
