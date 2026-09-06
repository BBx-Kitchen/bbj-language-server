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
 * Source-guard fence: {@code BbjMissingNodeNotificationProvider} must delegate its banner decision
 * to {@link NodeAvailability#decide} rather than branching inline, and must resolve both version
 * branches through {@code BbjNodeVersionCache} rather than the stateless detector's version method
 * (#543).
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

    /**
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth.
     */
    private static String bodyOf(String source, String declarationMarker) {
        int declarationStart = source.indexOf(declarationMarker);
        if (declarationStart < 0) {
            fail("declaration not found: " + declarationMarker);
        }
        int openBrace = source.indexOf('{', declarationStart);
        assertTrue(openBrace >= 0, "no opening brace found after declaration: " + declarationMarker);
        int depth = 0;
        int i = openBrace;
        for (; i < source.length(); i++) {
            char c = source.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    break;
                }
            }
        }
        assertTrue(depth == 0, "unbalanced braces while scanning body of: " + declarationMarker);
        return source.substring(openBrace, i + 1);
    }

    private static String collectNotificationDataBody(String text) {
        return bodyOf(text, "collectNotificationData(@NotNull Project project, @NotNull VirtualFile file)");
    }

    @Test
    void bothVersionBranchesResolveThroughTheCache() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "BbjNodeVersionCache.SESSION::getVersion"),
                "the version resolver passed to the availability seam must be the shared cache; "
                        + "the seam itself reuses it for both the configured and detected branches");
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
        assertEquals(1, countOccurrences(text, "BbjNodeDetector::detectNodePath"),
                "the PATH scan (no subprocess) must be passed to the seam exactly once");
        assertEquals(1, countOccurrences(text, "BbjNodeDetector::meetsMinimumVersion"),
                "the minimum-version check must be passed to the seam exactly once; the seam itself "
                        + "reuses it for both the configured and detected branches");
    }

    @Test
    void theExistenceGuardAndTheCachedDownloadFallbackBranchAreUnchanged() {
        String text = readGuardedSource();
        assertTrue(text.contains("NodeAvailability.REAL_FILES"),
                "the explicit-path existence guard must still be passed to the seam");
        assertTrue(text.contains("BbjNodeDownloader::getCachedNodePath"),
                "the cached-download fallback branch must still be passed to the seam");
    }

    @Test
    void collectNotificationDataDelegatesToTheAvailabilitySeamExactlyOnceWithTheArgumentsInOrder() {
        String text = readGuardedSource();
        String body = collectNotificationDataBody(text);

        assertEquals(1, countOccurrences(body, "NodeAvailability.decide("),
                "collectNotificationData must delegate to the seam exactly once");

        int decideIndex = body.indexOf("NodeAvailability.decide(");
        int nodeJsPathIndex = body.indexOf("nodeJsPath,", decideIndex);
        int realFilesIndex = body.indexOf("NodeAvailability.REAL_FILES,", nodeJsPathIndex);
        int versionCacheIndex = body.indexOf("BbjNodeVersionCache.SESSION::getVersion,", realFilesIndex);
        int meetsMinimumIndex = body.indexOf("BbjNodeDetector::meetsMinimumVersion,", versionCacheIndex);
        int detectNodePathIndex = body.indexOf("BbjNodeDetector::detectNodePath,", meetsMinimumIndex);
        int cachedNodePathIndex = body.indexOf("BbjNodeDownloader::getCachedNodePath)", detectNodePathIndex);

        assertTrue(nodeJsPathIndex >= 0 && realFilesIndex >= 0 && versionCacheIndex >= 0
                        && meetsMinimumIndex >= 0 && detectNodePathIndex >= 0 && cachedNodePathIndex >= 0,
                "the six arguments to NodeAvailability.decide( must appear in the documented order: "
                        + "nodeJsPath, REAL_FILES, the version cache, the minimum-version check, "
                        + "the PATH detector, then the cached-download supplier");
    }

    @Test
    void bannerNeededGatesTheEarlyReturnExactlyOnce() {
        String text = readGuardedSource();
        String body = collectNotificationDataBody(text);

        assertEquals(1, countOccurrences(body, "NodeAvailability.bannerNeeded("),
                "the seam's banner decision must gate the early return exactly once");
        int bannerNeededIndex = body.indexOf("NodeAvailability.bannerNeeded(");
        int returnNullIndex = body.indexOf("return null;", bannerNeededIndex);
        int returnFileEditorIndex = body.indexOf("return fileEditor ->", bannerNeededIndex);
        assertTrue(bannerNeededIndex >= 0 && returnNullIndex >= 0,
                "a return null; guarded by bannerNeeded( must be present");
        assertTrue(returnNullIndex < returnFileEditorIndex,
                "the early return must fire before the panel-building fallthrough, so no other "
                        + "statement of consequence sits between the check and its return");
    }
}
