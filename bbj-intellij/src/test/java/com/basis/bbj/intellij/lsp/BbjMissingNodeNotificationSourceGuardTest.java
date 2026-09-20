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
 * to {@link NodeExecutableResolver#resolve} -- the same engine and the same seven-argument
 * configured/detected/cached fallback the language server's startup path uses -- rather than
 * branching inline or calling any second decision seam, and its sentence and action set must both
 * come from {@link NodePresentation}. This guard replaces the one that pinned the previous,
 * now-retired call shape, invalidated when the banner was switched onto the single engine.
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

    private static String buildPanelBody(String text) {
        return bodyOf(text, "buildPanel(@NotNull Project project, @NotNull VirtualFile file)");
    }

    @Test
    void theVersionResolverPassedToTheEngineIsTheSharedCache() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "BbjNodeVersionCache.SESSION::getVersion"),
                "the version resolver passed to the resolver engine must be the shared cache");
    }

    @Test
    void theDetectorsVersionMethodIsNeverCalledDirectly() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "BbjNodeDetector.getNodeVersion("),
                "the stateless detector's version method must never be called directly -- routing "
                        + "through the shared cache is what keeps the banner and startup path to one "
                        + "spawn per unchanged path between them");
    }

    @Test
    void noSecondDecisionEngineSurvivesInTheProviderSource() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "NodeAvailability"),
                "the retired availability seam must not be referenced anywhere in the provider's "
                        + "source -- a revival is a test failure, not a silent second engine");
    }

    @Test
    void collectNotificationDataDelegatesToTheAvailabilitySeamExactlyOnceWithTheArgumentsInOrder() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "NodeExecutableResolver.resolve("),
                "buildPanel must delegate to the resolver engine exactly once");

        int resolveIndex = body.indexOf("NodeExecutableResolver.resolve(");
        int configuredPathIndex = body.indexOf("configuredPath,", resolveIndex);
        int detectedPathIndex = body.indexOf("detectedPath,", configuredPathIndex);
        int cachedPathIndex = body.indexOf("cachedPath", detectedPathIndex);
        int accessibilityIndex = body.indexOf(
                "BbjNodeDownloader.isNodeDataDirectoryAccessible(),", cachedPathIndex);
        int probeIndex = body.indexOf("NodeExecutableResolver.REAL_FILESYSTEM,", accessibilityIndex);
        int versionCacheIndex = body.indexOf(
                "BbjNodeVersionCache.SESSION::getVersion,", probeIndex);
        int meetsMinimumIndex = body.indexOf(
                "BbjNodeDetector::meetsMinimumVersion)", versionCacheIndex);

        assertTrue(configuredPathIndex >= 0 && detectedPathIndex >= 0 && cachedPathIndex >= 0
                        && accessibilityIndex >= 0 && probeIndex >= 0 && versionCacheIndex >= 0
                        && meetsMinimumIndex >= 0,
                "the seven arguments to NodeExecutableResolver.resolve( must appear in the "
                        + "documented order: configured path, detected path, cached path, the "
                        + "cache-accessibility fact, the probe, the version cache, then the "
                        + "minimum-version check");
    }

    @Test
    void theBannerTextAndActionSetBothComeFromTheSharedPresentationSeam() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "NodePresentation.bannerText("),
                "the banner sentence must come from NodePresentation exactly once");
        assertEquals(1, countOccurrences(body, "NodePresentation.bannerActions("),
                "the offered action set must come from NodePresentation exactly once");

        int bannerTextIndex = body.indexOf("NodePresentation.bannerText(");
        int returnNullIndex = body.indexOf("return null;", bannerTextIndex);
        int returnFileEditorIndex = body.indexOf("return fileEditor ->", bannerTextIndex);
        int bannerActionsIndex = body.indexOf("NodePresentation.bannerActions(", bannerTextIndex);

        assertTrue(bannerTextIndex >= 0 && returnNullIndex >= 0,
                "a return null; guarded by NodePresentation.bannerText( yielding null must be present");
        assertTrue(returnNullIndex < returnFileEditorIndex,
                "the no-banner early return must fire before the panel-building fallthrough, so no "
                        + "other statement of consequence sits between the check and its return");
        assertTrue(bannerActionsIndex > returnFileEditorIndex,
                "the action set must be derived inside the panel-building closure, after the "
                        + "no-banner early return has already been decided");
    }
}
