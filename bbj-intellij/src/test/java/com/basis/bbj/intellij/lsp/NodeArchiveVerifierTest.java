package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NodeArchiveVerifierTest {

    private static final String KNOWN_NAME = "node-v20.18.1-linux-x64.tar.gz";
    private static final String UNKNOWN_NAME = "node-v20.18.1-solaris-sparc64.tar.gz";
    private static final Pattern LOWER_HEX_64 = Pattern.compile("^[0-9a-f]{64}$");

    /**
     * A {@link NodeArchiveVerifier.ByteSource} that delegates to {@code Files.newInputStream}
     * but counts invocations, so a case can assert the file was never opened.
     */
    private static final class RecordingByteSource implements NodeArchiveVerifier.ByteSource {
        private final AtomicInteger invocationCount = new AtomicInteger();

        int invocations() {
            return invocationCount.get();
        }

        @Override
        public InputStream open(Path file) throws IOException {
            invocationCount.incrementAndGet();
            return Files.newInputStream(file);
        }
    }

    /**
     * A {@link NodeArchiveVerifier.DigestSource} backed by a fixed map supplied by the test,
     * returning {@code null} for anything else — each case pins exactly what it means to pin.
     */
    private static final class FixedDigestSource implements NodeArchiveVerifier.DigestSource {
        private final Map<String, String> pins;

        FixedDigestSource(Map<String, String> pins) {
            this.pins = pins;
        }

        @Override
        public String expectedSha256(String archiveFileName) {
            return pins.get(archiveFileName);
        }
    }

    private static String realSha256(Path file) throws IOException {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        try (InputStream in = Files.newInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    @Test
    void aFileWhoseRealDigestIsPinnedForItsNameVerifies(@TempDir Path tempDir) throws IOException {
        Path archive = tempDir.resolve(KNOWN_NAME);
        Files.write(archive, "known good archive bytes".getBytes(StandardCharsets.UTF_8));
        String expected = realSha256(archive);
        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, expected));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, archive, digests, NodeArchiveVerifier.REAL_FILES);

        assertTrue(result.isVerified(), "a matching digest must verify");
        assertEquals(expected, result.actualDigest(), "actualDigest() must equal the computed digest");
    }

    @Test
    void aFileWithOneByteAlteredIsRefusedWithDigestMismatch(@TempDir Path tempDir) throws IOException {
        Path goodArchive = tempDir.resolve("good.tar.gz");
        Files.write(goodArchive, "known good archive bytes".getBytes(StandardCharsets.UTF_8));
        String expected = realSha256(goodArchive);

        Path alteredArchive = tempDir.resolve(KNOWN_NAME);
        byte[] bytes = Files.readAllBytes(goodArchive);
        bytes[0] = (byte) (bytes[0] ^ 0xFF);
        Files.write(alteredArchive, bytes);

        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, expected));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, alteredArchive, digests, NodeArchiveVerifier.REAL_FILES);

        assertFalse(result.isVerified(), "an altered archive must not verify");
        assertEquals(NodeArchiveVerifier.Reason.DIGEST_MISMATCH, result.reason());
        assertNotEquals(result.expectedDigest(), result.actualDigest(),
                "expectedDigest() and actualDigest() must differ on a mismatch");
        // actualDigest() remains legal to read on the refused branch.
        assertEquals(64, result.actualDigest().length());
    }

    @Test
    void aZeroByteFileIsRefusedAgainstAKnownPin(@TempDir Path tempDir) throws IOException {
        Path archive = tempDir.resolve(KNOWN_NAME);
        Files.write(archive, new byte[0]);
        FixedDigestSource digests = new FixedDigestSource(
                Map.of(KNOWN_NAME, "9999999999999999999999999999999999999999999999999999999999999999"));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, archive, digests, NodeArchiveVerifier.REAL_FILES);

        assertFalse(result.isVerified(), "a zero-byte archive must not verify against an unrelated pin");
        assertEquals(NodeArchiveVerifier.Reason.DIGEST_MISMATCH, result.reason());
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", result.actualDigest(),
                "the empty-input SHA-256 digest is well known and must match the computed digest exactly");
    }

    @Test
    void anUnrecognisedArchiveNameIsRefusedWithoutConsultingTheReader(@TempDir Path tempDir) throws IOException {
        Path archive = tempDir.resolve(UNKNOWN_NAME);
        Files.write(archive, "irrelevant".getBytes(StandardCharsets.UTF_8));
        RecordingByteSource reader = new RecordingByteSource();
        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, "irrelevant-pin"));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                UNKNOWN_NAME, archive, digests, reader);

        assertFalse(result.isVerified(), "an unrecognised archive name must not verify");
        assertEquals(NodeArchiveVerifier.Reason.UNKNOWN_DISTRIBUTION, result.reason());
        assertEquals(0, reader.invocations(),
                "the reader must never be consulted when there is no pinned entry for the name");
    }

    @Test
    void aPinSuppliedInUpperCaseWithSurroundingWhitespaceStillMatches(@TempDir Path tempDir) throws IOException {
        Path archive = tempDir.resolve(KNOWN_NAME);
        Files.write(archive, "known good archive bytes".getBytes(StandardCharsets.UTF_8));
        String expected = realSha256(archive);
        String differentlyFormatted = "  " + expected.toUpperCase(java.util.Locale.ROOT) + "  \n";
        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, differentlyFormatted));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, archive, digests, NodeArchiveVerifier.REAL_FILES);

        assertTrue(result.isVerified(),
                "a pin transcribed in upper case with surrounding whitespace must still match the same bytes");
    }

    @Test
    void expectedDigestOnAVerifiedResultThrows(@TempDir Path tempDir) throws IOException {
        Path archive = tempDir.resolve(KNOWN_NAME);
        Files.write(archive, "known good archive bytes".getBytes(StandardCharsets.UTF_8));
        String expected = realSha256(archive);
        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, expected));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, archive, digests, NodeArchiveVerifier.REAL_FILES);

        assertTrue(result.isVerified());
        assertThrows(IllegalStateException.class, result::expectedDigest,
                "expectedDigest() is only meaningful when refused");
        assertThrows(IllegalStateException.class, result::reason,
                "reason() is only meaningful when refused");
        assertThrows(IllegalStateException.class, result::failureMessage,
                "failureMessage() is only meaningful when refused");
    }

    @Test
    void failureMessageNamesTheArchiveFileNameTheExpectedValueAndTheComputedValue(@TempDir Path tempDir)
            throws IOException {
        Path goodArchive = tempDir.resolve("good.tar.gz");
        Files.write(goodArchive, "known good archive bytes".getBytes(StandardCharsets.UTF_8));
        String expected = realSha256(goodArchive);

        Path alteredArchive = tempDir.resolve(KNOWN_NAME);
        byte[] bytes = Files.readAllBytes(goodArchive);
        bytes[0] = (byte) (bytes[0] ^ 0xFF);
        Files.write(alteredArchive, bytes);
        String actual = realSha256(alteredArchive);

        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, expected));

        NodeArchiveVerifier.Result result = NodeArchiveVerifier.verify(
                KNOWN_NAME, alteredArchive, digests, NodeArchiveVerifier.REAL_FILES);

        String message = result.failureMessage();
        assertTrue(message.contains(KNOWN_NAME), "failureMessage() must name the archive file name");
        assertTrue(message.contains(expected), "failureMessage() must name the expected digest");
        assertTrue(message.contains(actual), "failureMessage() must name the computed digest");
    }

    @Test
    void anIoFailureOpeningTheArchivePropagatesAsIoException(@TempDir Path tempDir) {
        Path missing = tempDir.resolve(KNOWN_NAME);
        // Deliberately not created — Files.newInputStream on a missing file throws IOException.
        FixedDigestSource digests = new FixedDigestSource(Map.of(KNOWN_NAME, "irrelevant-pin"));

        assertThrows(IOException.class, () -> NodeArchiveVerifier.verify(
                KNOWN_NAME, missing, digests, NodeArchiveVerifier.REAL_FILES),
                "an I/O failure opening the archive must propagate rather than being converted "
                        + "into a verified result");
    }

    @Nested
    class ProductionConstants {

        @Test
        void pinnedArchiveNamesHasExactlySixEntries() {
            assertEquals(6, NodeArchiveVerifier.pinnedArchiveNames().size());
        }

        @Test
        void pinnedArchiveNamesContainsEachOfTheSixDeclaredFileNames() {
            Set<String> names = NodeArchiveVerifier.pinnedArchiveNames();
            assertTrue(names.contains("node-v20.18.1-darwin-arm64.tar.gz"));
            assertTrue(names.contains("node-v20.18.1-darwin-x64.tar.gz"));
            assertTrue(names.contains("node-v20.18.1-linux-arm64.tar.gz"));
            assertTrue(names.contains("node-v20.18.1-linux-x64.tar.gz"));
            assertTrue(names.contains("node-v20.18.1-win-arm64.zip"));
            assertTrue(names.contains("node-v20.18.1-win-x64.zip"));
        }

        @Test
        void pinnedArchiveNamesReturnsAnUnmodifiableSet() {
            Set<String> names = NodeArchiveVerifier.pinnedArchiveNames();
            assertThrows(UnsupportedOperationException.class, () -> names.add("node-v99.99.99-linux-x64.tar.gz"));
        }

        @Test
        void pinnedDigestsReturnsNullForAnUnknownName() {
            assertNull(NodeArchiveVerifier.PINNED_DIGESTS.expectedSha256(UNKNOWN_NAME));
        }

        @Test
        void everyPinnedValueIs64LowerCaseHexCharacters() {
            for (String name : NodeArchiveVerifier.pinnedArchiveNames()) {
                String value = NodeArchiveVerifier.PINNED_DIGESTS.expectedSha256(name);
                assertTrue(LOWER_HEX_64.matcher(value).matches(),
                        "pinned value for " + name + " must be 64 lower-case hex characters, was: " + value);
            }
        }
    }
}
