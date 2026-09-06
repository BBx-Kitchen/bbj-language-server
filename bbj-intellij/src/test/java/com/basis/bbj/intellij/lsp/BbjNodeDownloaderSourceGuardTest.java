package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

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

    @Test
    void thePersistedInProgressFlagIsGone() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "DOWNLOAD_IN_PROGRESS_KEY"),
                "the persisted in-progress flag must be deleted, not merely unused");
        assertEquals(0, countOccurrences(text, "PropertiesComponent"),
                "PropertiesComponent must no longer be referenced by the downloader");
    }

    @Test
    void theDownloadGuardIsAcquiredOnceAndReleasedOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "DownloadGuard.SESSION.tryAcquire("),
                "the guard must be acquired exactly once");
        assertEquals(1, countOccurrences(text, "DownloadGuard.SESSION.release()"),
                "the guard must be released exactly once");
    }

    @Test
    void theGuardIsAcquiredBeforeTheBackgroundTaskIsQueued() {
        String text = readGuardedSource();
        int tryAcquireIndex = text.indexOf("DownloadGuard.SESSION.tryAcquire(");
        int backgroundableIndex = text.indexOf("new Task.Backgroundable(");
        assertTrue(tryAcquireIndex >= 0, "DownloadGuard.SESSION.tryAcquire( is not present in the downloader file");
        assertTrue(backgroundableIndex >= 0, "new Task.Backgroundable( is not present in the downloader file");
        assertTrue(tryAcquireIndex < backgroundableIndex,
                "the guard must be acquired before the Task.Backgroundable is queued, not inside it");
    }

    @Test
    void theGuardIsReleasedInTheFinallyAfterTheFailurePath() {
        String text = readGuardedSource();
        int failureLiteralIndex = text.indexOf("Failed to download Node.js: ");
        int releaseIndex = text.indexOf("DownloadGuard.SESSION.release()");
        assertTrue(failureLiteralIndex >= 0, "the failure-path literal is not present in the downloader file");
        assertTrue(releaseIndex >= 0, "DownloadGuard.SESSION.release() is not present in the downloader file");
        assertTrue(releaseIndex > failureLiteralIndex,
                "the release must sit in the finally after the catch, so it also runs on the failure path");
    }

    @Test
    void drainedCompletionsAreDispatchedToTheEdt() {
        String text = readGuardedSource();
        int releaseIndex = text.indexOf("DownloadGuard.SESSION.release()");
        assertTrue(releaseIndex >= 0, "DownloadGuard.SESSION.release() is not present in the downloader file");
        int invokeLaterIndex = text.indexOf("invokeLater(", releaseIndex);
        assertTrue(invokeLaterIndex >= 0,
                "invokeLater( must appear after the release, dispatching drained completions to the EDT");
    }

    @Test
    void theRestartRedirectSurvives() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "requestRestart(0)"),
                "the download-success notification's restart redirect must survive this rewrite");
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
