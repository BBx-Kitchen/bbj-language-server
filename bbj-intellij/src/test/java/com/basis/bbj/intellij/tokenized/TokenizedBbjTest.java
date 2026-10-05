package com.basis.bbj.intellij.tokenized;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Detection of tokenized BBj programs: the header test and every kind {@code probe} can report. */
class TokenizedBbjTest {

    private static final byte[] TOKENIZED_BYTES = withPayload(TokenizedBbj.MAGIC, (byte) 0x84, (byte) 0, (byte) 1);

    @TempDir
    Path temp;

    private static byte[] withPayload(byte[] head, byte... payload) {
        byte[] all = Arrays.copyOf(head, head.length + payload.length);
        System.arraycopy(payload, 0, all, head.length, payload.length);
        return all;
    }

    private static boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }

    @Test
    void theMagicWithAPayloadIsATokenizedHeader() {
        assertTrue(TokenizedBbj.isTokenizedHeader(TOKENIZED_BYTES));
        assertTrue(TokenizedBbj.isTokenizedHeader(TokenizedBbj.MAGIC.clone()));
    }

    @Test
    void sixBytesPlainTextAndNothingAreNotATokenizedHeader() {
        assertFalse(TokenizedBbj.isTokenizedHeader(Arrays.copyOf(TokenizedBbj.MAGIC, 6)));
        assertFalse(TokenizedBbj.isTokenizedHeader("print \"hello\"\n".getBytes(StandardCharsets.UTF_8)));
        assertFalse(TokenizedBbj.isTokenizedHeader(new byte[0]));
    }

    @Test
    void aTokenizedRegularFileProbesAsTokenizedWithItsRealPath() throws IOException {
        Path file = Files.write(temp.resolve("prog.bbj"), TOKENIZED_BYTES);

        TokenizedBbj.Probe probe = TokenizedBbj.probe(file);

        assertEquals(TokenizedBbj.Kind.TOKENIZED, probe.kind());
        assertEquals(file.toRealPath(), probe.resolvedPath());
    }

    @Test
    void aSymlinkToATokenizedFileProbesAsTokenizedWithTheTargetsRealPath() throws IOException {
        Path target = Files.write(temp.resolve("real.bbj"), TOKENIZED_BYTES);
        Path link = linkOrSkip(temp.resolve("link.bbj"), target);

        TokenizedBbj.Probe probe = TokenizedBbj.probe(link);

        assertEquals(TokenizedBbj.Kind.TOKENIZED, probe.kind());
        assertEquals(target.toRealPath(), probe.resolvedPath());
    }

    @Test
    void plainTextProbesAsNotTokenized() throws IOException {
        Path file = Files.writeString(temp.resolve("prog.bbj"), "print \"hello\"\n");

        assertEquals(TokenizedBbj.Kind.NOT_TOKENIZED, TokenizedBbj.probe(file).kind());
    }

    @Test
    void aDirectoryProbesAsNotAFile() throws IOException {
        Path directory = Files.createDirectories(temp.resolve("dir.bbj"));

        assertEquals(TokenizedBbj.Kind.NOT_A_FILE, TokenizedBbj.probe(directory).kind());
    }

    @Test
    void aMissingPathProbesAsMissing() {
        assertEquals(TokenizedBbj.Kind.MISSING, TokenizedBbj.probe(temp.resolve("gone.bbj")).kind());
    }

    @Test
    void aDanglingSymlinkProbesAsMissing() throws IOException {
        Path link = linkOrSkip(temp.resolve("dangling.bbj"), temp.resolve("nowhere.bbj"));

        assertEquals(TokenizedBbj.Kind.MISSING, TokenizedBbj.probe(link).kind());
    }

    @Test
    void aFifoProbesAsNotAFileWithoutBlocking() throws Exception {
        Assumptions.assumeFalse(isWindows(), "no FIFOs on Windows");
        Path fifo = temp.resolve("pipe.bbj");
        Process mkfifo;
        try {
            mkfifo = new ProcessBuilder("mkfifo", fifo.toString()).start();
        } catch (IOException e) {
            Assumptions.abort("mkfifo is not available");
            return;
        }
        Assumptions.assumeTrue(mkfifo.waitFor() == 0, "mkfifo failed");

        TokenizedBbj.Probe probe = assertTimeoutPreemptively(Duration.ofSeconds(2), () -> TokenizedBbj.probe(fifo));

        assertEquals(TokenizedBbj.Kind.NOT_A_FILE, probe.kind());
    }

    @Test
    void aFileWithNoReadPermissionProbesAsUnreadableWithACause() throws IOException {
        Assumptions.assumeFalse(isWindows(), "read permission is POSIX only");
        Assumptions.assumeFalse("root".equals(System.getProperty("user.name")), "root reads everything");
        Path file = Files.write(temp.resolve("locked.bbj"), TOKENIZED_BYTES);
        assertTrue(file.toFile().setReadable(false), "could not remove the read permission");

        TokenizedBbj.Probe probe = TokenizedBbj.probe(file);

        assertEquals(TokenizedBbj.Kind.UNREADABLE, probe.kind());
        assertNotNull(probe.detail());
        assertFalse(probe.detail().isEmpty());
    }

    @Test
    void everyKindOtherThanTokenizedHasARefusalNamingTheFile() {
        assertNull(TokenizedBbj.refusal(new TokenizedBbj.Probe(TokenizedBbj.Kind.TOKENIZED, temp, null), "a.bbj"));
        assertEquals("\"a.bbj\" is not a tokenized BBj program, so there is nothing to decompile.",
                TokenizedBbj.refusal(new TokenizedBbj.Probe(TokenizedBbj.Kind.NOT_TOKENIZED, temp, null), "a.bbj"));
        assertEquals("\"a.bbj\" was not found, so there is nothing to decompile.",
                TokenizedBbj.refusal(new TokenizedBbj.Probe(TokenizedBbj.Kind.MISSING, null, null), "a.bbj"));
        assertEquals("\"a.bbj\" is not a regular file, so there is nothing to decompile.",
                TokenizedBbj.refusal(new TokenizedBbj.Probe(TokenizedBbj.Kind.NOT_A_FILE, null, null), "a.bbj"));
        assertEquals("Could not read \"a.bbj\": permission denied",
                TokenizedBbj.refusal(
                        new TokenizedBbj.Probe(TokenizedBbj.Kind.UNREADABLE, null, "permission denied"), "a.bbj"));
    }

    private static Path linkOrSkip(Path link, Path target) throws IOException {
        try {
            return Files.createSymbolicLink(link, target);
        } catch (UnsupportedOperationException | IOException e) {
            Assumptions.abort("symbolic links are not available here");
            return link;
        }
    }
}
