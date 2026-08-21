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
