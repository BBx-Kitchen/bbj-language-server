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
    void verificationCallPrecedesTheExtractionCall() {
        String text = readGuardedSource();
        int verifyIndex = text.indexOf("NodeArchiveVerifier.verify(");
        int extractIndex = text.indexOf("extract(platform");
        assertTrue(verifyIndex >= 0, "NodeArchiveVerifier.verify( is not present in the downloader file");
        assertTrue(extractIndex >= 0, "extract(platform is not present in the downloader file");
        assertTrue(verifyIndex < extractIndex,
                "NodeArchiveVerifier.verify( must precede the extraction call");
    }

    @Test
    void theExtractionCallSiteAppearsExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "extract(platform"));
    }

    @Test
    void verificationCallPrecedesTheInstallCall() {
        String text = readGuardedSource();
        int verifyIndex = text.indexOf("NodeArchiveVerifier.verify(");
        int installIndex = text.indexOf("install(platform");
        assertTrue(verifyIndex >= 0, "NodeArchiveVerifier.verify( is not present in the downloader file");
        assertTrue(installIndex >= 0, "install(platform is not present in the downloader file");
        assertTrue(verifyIndex < installIndex,
                "NodeArchiveVerifier.verify( must precede the install call");
    }

    @Test
    void everyPlatformAndArchitectureTheFileCanProduceHasAPinnedDigest() {
        String text = readGuardedSource();
        String marker = "NODE_VERSION = \"";
        int versionStart = text.indexOf(marker);
        assertTrue(versionStart >= 0, "NODE_VERSION = \" is not present in the downloader file");
        versionStart += marker.length();
        int versionEnd = text.indexOf('"', versionStart);
        assertTrue(versionEnd >= 0, "NODE_VERSION declaration is not properly quoted");
        String version = text.substring(versionStart, versionEnd);

        String[] platforms = {"darwin", "linux", "win"};
        String[] archs = {"arm64", "x64"};
        for (String platform : platforms) {
            for (String arch : archs) {
                String extension = platform.equals("win") ? ".zip" : ".tar.gz";
                String archiveFileName = "node-" + version + "-" + platform + "-" + arch + extension;
                assertTrue(NodeArchiveVerifier.pinnedArchiveNames().contains(archiveFileName),
                        "No pinned digest for " + archiveFileName
                                + " — bumping NODE_VERSION requires adding pins for every combination");
            }
        }
    }

    @Test
    void theFileNamesExactlyTheThreePlatformLiteralsAndTwoArchitectureLiterals() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "return \"darwin\";"));
        assertEquals(1, countOccurrences(text, "return \"linux\";"));
        assertEquals(1, countOccurrences(text, "return \"win\";"));
        assertEquals(1, countOccurrences(text, "return \"arm64\";"));
        assertEquals(1, countOccurrences(text, "return \"x64\";"));
    }

    @Test
    void theCacheHitPathConsultsTheRecordedDigestBeforeReturning() {
        String text = readGuardedSource();
        int executableIndex = text.indexOf("Files.isExecutable(nodePath)");
        int matchesIndex = text.indexOf("matchesRecordedDigest(");
        int returnIndex = text.indexOf("return nodePath;");
        assertTrue(executableIndex >= 0, "Files.isExecutable(nodePath) is not present in the downloader file");
        assertTrue(matchesIndex >= 0, "matchesRecordedDigest( is not present in the downloader file");
        assertTrue(returnIndex >= 0, "return nodePath; is not present in the downloader file");
        assertTrue(executableIndex < matchesIndex,
                "Files.isExecutable(nodePath) must precede matchesRecordedDigest(");
        assertTrue(matchesIndex < returnIndex,
                "matchesRecordedDigest( must precede the cached-path return");
        assertEquals(1, countOccurrences(text, "return nodePath;"),
                "there must be exactly one, guarded return of the cached path");
    }

    @Test
    void theInstalledDigestIsRecordedAfterTheCopy() {
        String text = readGuardedSource();
        int copyIndex = text.indexOf("Files.copy(");
        int recordIndex = text.indexOf("SESSION.record(");
        assertTrue(copyIndex >= 0, "Files.copy( is not present in the downloader file");
        assertTrue(recordIndex >= 0, "SESSION.record( is not present in the downloader file");
        assertTrue(copyIndex < recordIndex,
                "SESSION.record( must come after Files.copy( so it describes the installed file");
        assertEquals(1, countOccurrences(text, "SESSION.record("),
                "the sidecar must be written exactly once, for the installed file");
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
    void theRestartRedirectFromPlan01Survives() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "requestRestart(0)"),
                "plan 79-01's redirect of the download-success notification must survive this plan's edits");
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
