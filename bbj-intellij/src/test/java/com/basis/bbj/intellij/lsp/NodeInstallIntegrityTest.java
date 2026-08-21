package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Offline, deterministic coverage of {@link NodeInstallIntegrity}'s cache-hit contract: the
 * matching, absent, disagreeing, malformed, missing-file, directory-in-place-of-file and memo
 * cases. Every fixture is a small file under {@link TempDir}; none of these tests attempt to
 * reproduce a real Node.js binary's size.
 */
class NodeInstallIntegrityTest {

    @TempDir
    Path tempDir;

    private static Path writeExecutable(Path dir, String name, byte[] bytes) throws IOException {
        Path executable = dir.resolve(name);
        Files.write(executable, bytes);
        return executable;
    }

    @Test
    void afterRecordingAFreshInstanceMatchesTheRecordedDigestAndTheSidecarHoldsALowerCase64CharacterHexLine()
            throws IOException {
        Path executable = writeExecutable(tempDir, "node", "some node binary bytes".getBytes(StandardCharsets.UTF_8));

        new NodeInstallIntegrity().record(executable, NodeArchiveVerifier.REAL_FILES);

        boolean matches = new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES);
        assertTrue(matches, "a freshly recorded digest must match on a fresh instance");

        Path sidecar = NodeInstallIntegrity.sidecarFor(executable);
        assertTrue(Files.exists(sidecar), "record() must create the sidecar file");
        String line = Files.readString(sidecar).trim();
        assertEquals(64, line.length(), "the sidecar must hold exactly 64 hex characters");
        assertTrue(line.matches("[0-9a-f]{64}"), "the sidecar must be lower-case hexadecimal, was: " + line);
    }

    @Test
    void withNoSidecarPresentMatchesRecordedDigestReturnsFalseAndThrowsNothing() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "no sidecar for this one".getBytes(StandardCharsets.UTF_8));

        boolean matches = assertDoesNotThrow(
                () -> new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                "an absent sidecar must not throw");
        assertFalse(matches, "an absent sidecar must read as not cached");
    }

    @Test
    void withASidecarRecordingTheDigestOfDifferentBytesMatchesRecordedDigestReturnsFalse() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "the real installed bytes".getBytes(StandardCharsets.UTF_8));
        Path other = writeExecutable(tempDir, "other", "entirely different bytes".getBytes(StandardCharsets.UTF_8));
        new NodeInstallIntegrity().record(other, NodeArchiveVerifier.REAL_FILES);
        // Move the "other" digest onto the executable's sidecar so it records the wrong digest.
        Files.copy(NodeInstallIntegrity.sidecarFor(other), NodeInstallIntegrity.sidecarFor(executable));

        boolean matches = new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES);
        assertFalse(matches, "a sidecar recording a different file's digest must not match");
    }

    @Test
    void malformedSidecarsAllDegradeToNotCachedWithoutThrowing() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "bytes for the malformed-sidecar cases".getBytes(StandardCharsets.UTF_8));
        Path sidecar = NodeInstallIntegrity.sidecarFor(executable);

        String[] malformedContents = {
                "",
                "   \n\t  ",
                "a".repeat(63),
                "a".repeat(65),
                "g".repeat(64), // not hex
        };
        for (String content : malformedContents) {
            Files.writeString(sidecar, content);
            boolean matches = assertDoesNotThrow(
                    () -> new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                    "a malformed sidecar (\"" + content + "\") must not throw");
            assertFalse(matches, "a malformed sidecar (\"" + content + "\") must read as not cached");
        }
    }

    @Test
    void whenTheExecutableItselfDoesNotExistMatchesRecordedDigestReturnsFalseAndThrowsNothing() throws IOException {
        Path executable = tempDir.resolve("node");
        Path sidecar = NodeInstallIntegrity.sidecarFor(executable);
        Files.writeString(sidecar, "a".repeat(64));

        boolean matches = assertDoesNotThrow(
                () -> new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                "a missing executable must not throw");
        assertFalse(matches, "a missing executable must read as not cached");
    }

    @Test
    void whenTheSidecarPathIsADirectoryMatchesRecordedDigestReturnsFalseAndThrowsNothing() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "bytes".getBytes(StandardCharsets.UTF_8));
        Path sidecar = NodeInstallIntegrity.sidecarFor(executable);
        Files.createDirectory(sidecar);

        boolean matches = assertDoesNotThrow(
                () -> new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                "a sidecar that is a directory must not throw");
        assertFalse(matches, "a sidecar that is a directory must read as not cached");
    }

    @Test
    void afterTheFilesBytesChangeAFreshInstanceNoLongerMatchesEvenWithAValidSidecarPresent() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "original bytes".getBytes(StandardCharsets.UTF_8));
        new NodeInstallIntegrity().record(executable, NodeArchiveVerifier.REAL_FILES);

        Files.write(executable, "rewritten bytes, different digest".getBytes(StandardCharsets.UTF_8));

        boolean matches = new NodeInstallIntegrity().matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES);
        assertFalse(matches, "a fresh instance must recompute and detect the changed content");
    }

    @Test
    void aSecondCallOnTheSameInstanceWithTheFileUnchangedReturnsTrueAgainViaTheMemo() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "stable bytes".getBytes(StandardCharsets.UTF_8));
        NodeInstallIntegrity integrity = new NodeInstallIntegrity();
        integrity.record(executable, NodeArchiveVerifier.REAL_FILES);

        assertTrue(integrity.matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                "first call must match");
        assertTrue(integrity.matchesRecordedDigest(executable, NodeArchiveVerifier.REAL_FILES),
                "second call on the same instance with the file unchanged must also match");
    }

    @Test
    void sidecarForPlacesTheRecordBesideTheExecutableAndDerivesItsNameFromTheExecutablesFileName() {
        Path node = tempDir.resolve("node");
        Path nodeExe = tempDir.resolve("node.exe");

        Path nodeSidecar = NodeInstallIntegrity.sidecarFor(node);
        Path nodeExeSidecar = NodeInstallIntegrity.sidecarFor(nodeExe);

        assertEquals(tempDir.resolve("node.sha256"), nodeSidecar, "node's sidecar must be node.sha256");
        assertEquals(tempDir.resolve("node.exe.sha256"), nodeExeSidecar, "node.exe's sidecar must be node.exe.sha256");
        assertTrue(nodeSidecar.getParent().equals(node.getParent()), "the sidecar must live beside the executable");
    }

    @Test
    void recordOverwritesAnExistingSidecarRatherThanAppendingToIt() throws IOException {
        Path executable = writeExecutable(tempDir, "node", "first version of the bytes".getBytes(StandardCharsets.UTF_8));
        NodeInstallIntegrity integrity = new NodeInstallIntegrity();
        integrity.record(executable, NodeArchiveVerifier.REAL_FILES);
        String firstDigest = Files.readString(NodeInstallIntegrity.sidecarFor(executable)).trim();

        Files.write(executable, "second, different version of the bytes".getBytes(StandardCharsets.UTF_8));
        integrity.record(executable, NodeArchiveVerifier.REAL_FILES);
        String secondContent = Files.readString(NodeInstallIntegrity.sidecarFor(executable)).trim();

        assertEquals(64, secondContent.length(), "the sidecar must hold exactly one 64-character digest, not an appended pair");
        assertTrue(!secondContent.equals(firstDigest), "the recorded digest must reflect the new bytes");
    }
}
