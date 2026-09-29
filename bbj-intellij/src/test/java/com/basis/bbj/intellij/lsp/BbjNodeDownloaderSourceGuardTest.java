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
 * Structural guards over what remains of {@code BbjNodeDownloader} once the pipeline logic moved
 * into {@link NodeInstallPipeline}: the download guard, the background task, the notifications,
 * and the wiring of the production collaborators. Each method-scoped assertion first locates the
 * body of the method it describes and asserts inside that window.
 */
class BbjNodeDownloaderSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjNodeDownloader.java")
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
     * Locates {@code declarationMarker} in {@code text}, then returns the substring from that
     * declaration's opening brace to its matching closing brace, counted by simple depth.
     */
    private static String bodyOf(String text, String declarationMarker) {
        int markerIndex = text.indexOf(declarationMarker);
        assertTrue(markerIndex >= 0, declarationMarker + " is not present in the downloader file");
        int openBrace = text.indexOf('{', markerIndex);
        assertTrue(openBrace >= 0, "no opening brace found after " + declarationMarker);
        int depth = 0;
        for (int i = openBrace; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(openBrace, i + 1);
                }
            }
        }
        fail("no matching closing brace found for " + declarationMarker);
        throw new IllegalStateException("unreachable");
    }

    @Test
    void thePersistedInProgressFlagIsGone() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "DOWNLOAD_IN_PROGRESS_KEY"),
                "the persisted in-progress flag must be deleted, not merely unused");
        assertEquals(0, countOccurrences(text, "PropertiesComponent"),
                "PropertiesComponent must no longer be referenced by the downloader");
    }

    @Test
    void theDownloadGuardIsAcquiredOnceAndReleasedOnceInsideDownloadNodeAsync() {
        String downloadNodeAsync = bodyOf(readGuardedSource(),
                "void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete)");
        assertEquals(1, countOccurrences(downloadNodeAsync, "DownloadGuard.SESSION.tryAcquire("),
                "the guard must be acquired exactly once");
        assertEquals(1, countOccurrences(downloadNodeAsync, "DownloadGuard.SESSION.release()"),
                "the guard must be released exactly once");
    }

    @Test
    void theGuardIsAcquiredBeforeTheBackgroundTaskIsQueued() {
        String downloadNodeAsync = bodyOf(readGuardedSource(),
                "void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete)");
        int tryAcquireIndex = downloadNodeAsync.indexOf("DownloadGuard.SESSION.tryAcquire(");
        int backgroundableIndex = downloadNodeAsync.indexOf("new Task.Backgroundable(");
        assertTrue(tryAcquireIndex >= 0, "DownloadGuard.SESSION.tryAcquire( is not present inside downloadNodeAsync(...)");
        assertTrue(backgroundableIndex >= 0, "new Task.Backgroundable( is not present inside downloadNodeAsync(...)");
        assertTrue(tryAcquireIndex < backgroundableIndex,
                "the guard must be acquired before the Task.Backgroundable is queued, not inside it");
    }

    @Test
    void theGuardIsReleasedInTheFinallyAfterTheFailurePath() {
        String downloadNodeAsync = bodyOf(readGuardedSource(),
                "void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete)");
        int failureLiteralIndex = downloadNodeAsync.indexOf("Failed to download Node.js: ");
        int releaseIndex = downloadNodeAsync.indexOf("DownloadGuard.SESSION.release()");
        assertTrue(failureLiteralIndex >= 0, "the failure-path literal is not present inside downloadNodeAsync(...)");
        assertTrue(releaseIndex >= 0, "DownloadGuard.SESSION.release() is not present inside downloadNodeAsync(...)");
        assertTrue(releaseIndex > failureLiteralIndex,
                "the release must sit in the finally after the catch, so it also runs on the failure path");
    }

    @Test
    void drainedCompletionsAreDispatchedThroughDownloadCompletionsExactlyOnce() {
        String downloadNodeAsync = bodyOf(readGuardedSource(),
                "void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete)");
        assertEquals(1, countOccurrences(downloadNodeAsync, "DownloadCompletions.dispatch("),
                "drained completions must be dispatched through DownloadCompletions.dispatch( exactly once");
        int dispatchIndex = downloadNodeAsync.indexOf("DownloadCompletions.dispatch(");
        int invokeLaterIndex = downloadNodeAsync.indexOf("invokeLater", dispatchIndex);
        assertTrue(invokeLaterIndex >= 0,
                "the dispatch call must name the platform's invokeLater as the executor");
    }

    @Test
    void theRestartRedirectSurvives() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "requestRestart(0)"),
                "the download-success notification's restart redirect must survive this rewrite");
    }

    @Test
    void productionPipelineWiresEachProductionCollaboratorExactlyOnce() {
        String productionPipeline = bodyOf(readGuardedSource(),
                "private static NodeInstallPipeline productionPipeline()");
        assertEquals(1, countOccurrences(productionPipeline, "NodeArchiveVerifier.PINNED_DIGESTS"));
        assertEquals(1, countOccurrences(productionPipeline, "NodeArchiveVerifier.REAL_FILES"));
        assertEquals(1, countOccurrences(productionPipeline, "NodeInstallIntegrity.SESSION"));
        assertEquals(1, countOccurrences(productionPipeline, "NodeExecutableResolver.REAL_FILESYSTEM"));
        assertEquals(1, countOccurrences(productionPipeline, "new NodeInstallPipeline("),
                "the seam must be constructed exactly once, in the production factory");
    }

    @Test
    void theFetcherBuildsThePlatformHttpRequestWithTheProductUserAgentAndSavesToFile() {
        String productionPipeline = bodyOf(readGuardedSource(),
                "private static NodeInstallPipeline productionPipeline()");
        assertEquals(1, countOccurrences(productionPipeline, "productNameAsUserAgent()"),
                "the platform HTTP request must still be built with the product user agent");
        assertEquals(1, countOccurrences(productionPipeline, "saveToFile("),
                "the fetcher must still save the response body to the requested target file");
    }
}
