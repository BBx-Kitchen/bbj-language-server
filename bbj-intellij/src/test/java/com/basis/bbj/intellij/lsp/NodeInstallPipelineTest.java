package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Drives the whole Node.js download/verify/extract/install/cache pipeline for real against
 * committed fixture archives — no test in this class opens a network socket or generates an
 * archive at test time. This class covers the Windows branch; the Unix branch, the six-name
 * matrix, the failure paths, cancellation, re-install and the symlink cleanup fix live alongside
 * it in later test methods.
 */
class NodeInstallPipelineTest {

    private static final Path FIXTURES_ROOT = Paths.get(
            "src", "test", "resources", "node-fixtures").toAbsolutePath();

    private static final Path WINDOWS_FIXTURE = FIXTURES_ROOT.resolve("fake-node-win.zip");

    private static final String WINDOWS_ARCHIVE_NAME = "node-v20.18.1-win-x64.zip";
    private static final String WINDOWS_DOWNLOAD_URL =
            "https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip";
    private static final String WINDOWS_MARKER_BYTES_TEXT = "fake-node-binary-windows\n";

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

    /** Copies a fixture archive into the requested target path, recording every call it saw. */
    private static final class FixtureCopyingFetcher implements NodeInstallPipeline.Fetcher {
        private final Path fixture;
        private final List<String> urls = new ArrayList<>();
        private final List<Path> targets = new ArrayList<>();

        FixtureCopyingFetcher(Path fixture) {
            this.fixture = fixture;
        }

        @Override
        public void fetch(String url, Path target) throws IOException {
            urls.add(url);
            targets.add(target);
            Files.copy(fixture, target, StandardCopyOption.REPLACE_EXISTING);
        }

        List<String> urls() {
            return urls;
        }

        int invocations() {
            return urls.size();
        }

        Path lastTarget() {
            return targets.get(targets.size() - 1);
        }
    }

    /** A {@link NodeArchiveVerifier.DigestSource} pinning exactly the names a case supplies. */
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

    /** A {@link NodeExecutableResolver.PathProbe} double, fully controlled by the test. */
    private static final class FakePathProbe implements NodeExecutableResolver.PathProbe {
        boolean exists = true;
        boolean regularFile = true;
        boolean executable = true;

        @Override
        public boolean exists(String path) {
            return exists;
        }

        @Override
        public boolean isRegularFile(String path) {
            return regularFile;
        }

        @Override
        public boolean isExecutable(String path) {
            return executable;
        }
    }

    private static NodeInstallPipeline windowsPipeline(Path dataDirectory, Path temporaryRoot,
            FixtureCopyingFetcher fetcher, FixedDigestSource digests, FakePathProbe probe,
            NodeInstallIntegrity integrity) {
        return new NodeInstallPipeline(
                new NodeInstallPipeline.Target(NodeInstallPipeline.Os.WINDOWS, NodeInstallPipeline.Arch.X64),
                dataDirectory, temporaryRoot, fetcher, digests, NodeArchiveVerifier.REAL_FILES,
                integrity, probe);
    }

    @Test
    void theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd(@TempDir Path dataDirectory,
            @TempDir Path temporaryRoot) throws IOException {
        String expectedDigest = realSha256(WINDOWS_FIXTURE);
        FixtureCopyingFetcher fetcher = new FixtureCopyingFetcher(WINDOWS_FIXTURE);
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        FakePathProbe probe = new FakePathProbe();
        NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot, fetcher, digests, probe,
                new NodeInstallIntegrity());

        Path installed = pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

        assertEquals(dataDirectory.resolve("node.exe"), installed);
        assertTrue(Files.exists(installed), "the installed executable must exist");
        assertEquals(WINDOWS_MARKER_BYTES_TEXT, Files.readString(installed, StandardCharsets.UTF_8),
                "the installed executable's bytes must equal the fixture's marker bytes");
        assertTrue(Files.exists(NodeInstallIntegrity.sidecarFor(installed)),
                "the digest sidecar must exist beside the installed executable");
        assertEquals(1, fetcher.invocations(), "the fetcher must be invoked exactly once");
        assertEquals(List.of(WINDOWS_DOWNLOAD_URL), fetcher.urls());
    }

    @Test
    void theWindowsBranchLeavesNoTemporaryArchiveOrExtractionDirectoryBehind(@TempDir Path dataDirectory,
            @TempDir Path temporaryRoot) throws IOException {
        String expectedDigest = realSha256(WINDOWS_FIXTURE);
        FixtureCopyingFetcher fetcher = new FixtureCopyingFetcher(WINDOWS_FIXTURE);
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        FakePathProbe probe = new FakePathProbe();
        NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot, fetcher, digests, probe,
                new NodeInstallIntegrity());

        pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

        assertFalse(Files.exists(fetcher.lastTarget()),
                "the temp archive file must be gone after a successful install");
        try (var entries = Files.list(temporaryRoot)) {
            assertEquals(0, entries.count(),
                    "the temporary root must hold no leftover entries after a successful install");
        }
    }

    @Test
    void theWindowsBranchNeverSetsTheExecutableBit(@TempDir Path dataDirectory, @TempDir Path temporaryRoot)
            throws IOException {
        Assumptions.assumeTrue(FileSystems.getDefault().supportedFileAttributeViews().contains("posix"),
                "this host's default filesystem has no POSIX view");

        String expectedDigest = realSha256(WINDOWS_FIXTURE);
        FixtureCopyingFetcher fetcher = new FixtureCopyingFetcher(WINDOWS_FIXTURE);
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        FakePathProbe probe = new FakePathProbe();
        NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot, fetcher, digests, probe,
                new NodeInstallIntegrity());

        Path installed = pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

        Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(installed);
        assertFalse(permissions.contains(PosixFilePermission.OWNER_EXECUTE),
                "the Windows branch must never set the executable bit");
    }

    @Test
    void theFakeFetcherProvesNoSocketIsOpened(@TempDir Path dataDirectory, @TempDir Path temporaryRoot)
            throws IOException {
        String expectedDigest = realSha256(WINDOWS_FIXTURE);
        FixtureCopyingFetcher fetcher = new FixtureCopyingFetcher(WINDOWS_FIXTURE);
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        FakePathProbe probe = new FakePathProbe();
        NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot, fetcher, digests, probe,
                new NodeInstallIntegrity());

        pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

        assertEquals(List.of(WINDOWS_DOWNLOAD_URL), fetcher.urls(),
                "a future change that reached the network instead of this fake would have to delete "
                        + "this assertion to pass");
    }

    @Test
    void aCacheHitAfterAnInstallReturnsTheInstalledPathAndSpawnsNoSecondInstall(@TempDir Path dataDirectory,
            @TempDir Path temporaryRoot) throws IOException {
        String expectedDigest = realSha256(WINDOWS_FIXTURE);
        FixtureCopyingFetcher fetcher = new FixtureCopyingFetcher(WINDOWS_FIXTURE);
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        FakePathProbe probe = new FakePathProbe();
        NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot, fetcher, digests, probe,
                new NodeInstallIntegrity());

        Path installed = pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);
        Path cached = pipeline.cachedNodePath();

        assertEquals(installed, cached, "a cache hit right after install must return the installed path");
        assertEquals(1, fetcher.invocations(), "a cache hit must not spawn a second install");
    }
}
