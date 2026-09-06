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
 * Scoped structural guards over {@link NodeInstallPipeline}, moved here from the downloader guard
 * file plus one new guard on the tar argv. Each assertion first locates the body of the method it
 * describes and asserts inside that window, so a coincidental match elsewhere in the file can
 * never satisfy it.
 */
class NodeInstallPipelineSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "NodeInstallPipeline.java")
            .toAbsolutePath();

    private static String readGuardedSource() {
        if (!Files.exists(GUARDED_SOURCE)) {
            fail("Guarded source file not found at " + GUARDED_SOURCE);
        }
        try {
            return Files.readString(GUARDED_SOURCE);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(GUARDED_SOURCE, e);
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
     * declaration's opening brace to its matching closing brace, counted by simple depth —
     * sufficient here since the guarded file contains no string literal holding an unbalanced
     * brace. Every assertion below runs against this window, never the whole file.
     */
    private static String bodyOf(String text, String declarationMarker) {
        int markerIndex = text.indexOf(declarationMarker);
        assertTrue(markerIndex >= 0, declarationMarker + " is not present in the guarded source");
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
    void verificationPrecedesTheExtractionCallInsideInstall() {
        String install = bodyOf(readGuardedSource(), "Path install(Progress");
        int verifyIndex = install.indexOf("NodeArchiveVerifier.verify(");
        int extractIndex = install.indexOf("extractArchive(");
        assertTrue(verifyIndex >= 0, "NodeArchiveVerifier.verify( is not present inside install(...)");
        assertTrue(extractIndex >= 0, "extractArchive( is not present inside install(...)");
        assertTrue(verifyIndex < extractIndex, "verification must precede the extraction call");
    }

    @Test
    void theExtractionDispatchAppearsExactlyOnceInsideInstall() {
        String install = bodyOf(readGuardedSource(), "Path install(Progress");
        assertEquals(1, countOccurrences(install, "extractArchive("));
    }

    @Test
    void verificationPrecedesTheInstallCallInsideInstall() {
        String install = bodyOf(readGuardedSource(), "Path install(Progress");
        int verifyIndex = install.indexOf("NodeArchiveVerifier.verify(");
        int installStepIndex = install.indexOf("installExtracted(");
        assertTrue(verifyIndex >= 0, "NodeArchiveVerifier.verify( is not present inside install(...)");
        assertTrue(installStepIndex >= 0, "installExtracted( is not present inside install(...)");
        assertTrue(verifyIndex < installStepIndex, "verification must precede the install step");
    }

    @Test
    void everyPlatformAndArchitectureTheFileCanProduceHasAPinnedDigest() {
        String classBody = bodyOf(readGuardedSource(), "public final class NodeInstallPipeline");
        String marker = "NODE_VERSION = \"";
        int versionStart = classBody.indexOf(marker);
        assertTrue(versionStart >= 0, marker + " is not present inside the class body");
        versionStart += marker.length();
        int versionEnd = classBody.indexOf('"', versionStart);
        assertTrue(versionEnd >= 0, "NODE_VERSION declaration is not properly quoted");
        String version = classBody.substring(versionStart, versionEnd);

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
    void theTargetRecordNamesExactlyTheThreePlatformLiteralsAndTwoArchitectureLiteralsOnceEach() {
        String targetBody = bodyOf(readGuardedSource(), "public record Target(Os os, Arch arch)");
        assertEquals(1, countOccurrences(targetBody, "return \"win\";"));
        assertEquals(1, countOccurrences(targetBody, "return \"darwin\";"));
        assertEquals(1, countOccurrences(targetBody, "return \"linux\";"));
        assertEquals(1, countOccurrences(targetBody, "return \"arm64\";"));
        assertEquals(1, countOccurrences(targetBody, "return \"x64\";"));
    }

    @Test
    void theCacheHitPathConsultsTheRecordedDigestBeforeReturningInsideCachedNodePath() {
        String cachedNodePath = bodyOf(readGuardedSource(), "public Path cachedNodePath()");
        int existsIndex = cachedNodePath.indexOf("paths.exists(");
        int executableIndex = cachedNodePath.indexOf("paths.isExecutable(");
        int matchesIndex = cachedNodePath.indexOf("matchesRecordedDigest(");
        int returnIndex = cachedNodePath.indexOf("return path;");
        assertTrue(existsIndex >= 0, "paths.exists( is not present inside cachedNodePath()");
        assertTrue(executableIndex >= 0, "paths.isExecutable( is not present inside cachedNodePath()");
        assertTrue(matchesIndex >= 0, "matchesRecordedDigest( is not present inside cachedNodePath()");
        assertTrue(returnIndex >= 0, "return path; is not present inside cachedNodePath()");
        assertTrue(existsIndex < returnIndex && executableIndex < returnIndex && matchesIndex < returnIndex,
                "every cache-hit condition must be consulted before the cached-path return");
        assertEquals(1, countOccurrences(cachedNodePath, "return path;"),
                "there must be exactly one, guarded return of the cached path");
    }

    @Test
    void theInstalledDigestIsRecordedAfterTheCopyInsideTheInstallStep() {
        String installExtracted = bodyOf(readGuardedSource(), "private Path installExtracted(Path tempExtractDir)");
        int copyIndex = installExtracted.indexOf("Files.copy(");
        int recordIndex = installExtracted.indexOf("integrity.record(");
        assertTrue(copyIndex >= 0, "Files.copy( is not present inside installExtracted(...)");
        assertTrue(recordIndex >= 0, "integrity.record( is not present inside installExtracted(...)");
        assertTrue(copyIndex < recordIndex,
                "integrity.record( must come after Files.copy( so it describes the installed file");
        assertEquals(1, countOccurrences(installExtracted, "integrity.record("),
                "the sidecar must be written exactly once, for the installed file");
    }

    @Test
    void theTarArgvIsExactlyTarXzfArchivePathDashCDestinationPathStripComponentsOne() {
        String extractTarGz = bodyOf(readGuardedSource(),
                "private void extractTarGz(Path tarGzFile, Path destDir, CancelProbe cancel)");
        int tarIndex = extractTarGz.indexOf("\"tar\"");
        int xzfIndex = extractTarGz.indexOf("\"xzf\"");
        int archivePathIndex = extractTarGz.indexOf("tarGzFile.toAbsolutePath()");
        int dashCIndex = extractTarGz.indexOf("\"-C\"");
        int destPathIndex = extractTarGz.indexOf("destDir.toAbsolutePath()");
        int stripComponentsIndex = extractTarGz.indexOf("\"--strip-components=1\"");
        assertTrue(tarIndex >= 0, "\"tar\" is not present inside extractTarGz(...)");
        assertTrue(xzfIndex >= 0, "\"xzf\" is not present inside extractTarGz(...)");
        assertTrue(archivePathIndex >= 0, "the archive path is not present inside extractTarGz(...)");
        assertTrue(dashCIndex >= 0, "\"-C\" is not present inside extractTarGz(...)");
        assertTrue(destPathIndex >= 0, "the destination path is not present inside extractTarGz(...)");
        assertTrue(stripComponentsIndex >= 0, "\"--strip-components=1\" is not present inside extractTarGz(...)");
        assertTrue(tarIndex < xzfIndex && xzfIndex < archivePathIndex && archivePathIndex < dashCIndex
                        && dashCIndex < destPathIndex && destPathIndex < stripComponentsIndex,
                "the tar argv literals must appear in ascending order: tar, xzf, archive path, -C, "
                        + "destination path, --strip-components=1");
    }

    @Test
    void theRecursiveDeletePassesNoFileVisitOptionInsideDeleteRecursively() {
        String deleteRecursively = bodyOf(readGuardedSource(), "public static void deleteRecursively(Path root)");
        assertEquals(1, countOccurrences(deleteRecursively, "Files.walkFileTree("),
                "the walk call must appear exactly once");
        assertEquals(0, countOccurrences(deleteRecursively, "FOLLOW_LINKS"),
                "no follow-links option may be passed to the walk — a link must be deleted as a link");
    }
}
