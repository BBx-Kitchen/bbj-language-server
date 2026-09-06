package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CancellationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    private static final Path UNIX_FIXTURE = FIXTURES_ROOT.resolve("fake-node-unix.tar.gz");
    private static final Path WINDOWS_NO_BINARY_FIXTURE = FIXTURES_ROOT.resolve("fake-node-win-no-binary.zip");
    private static final Path UNIX_NO_BINARY_FIXTURE = FIXTURES_ROOT.resolve("fake-node-unix-no-binary.tar.gz");

    private static final String UNIX_ARCHIVE_NAME = "node-v20.18.1-linux-x64.tar.gz";
    private static final String UNIX_MARKER_BYTES_TEXT = "fake-node-binary-unix\n";

    // Pinned literals, transcribed from the fixtures README rather than computed from the same
    // bytes the verifier reads — computing a pin from the archive it verifies would make the
    // verify step vacuous, since a corrupted fixture and its "pin" would always agree.
    private static final String WINDOWS_FIXTURE_DIGEST =
            "3debcb508f3ec25a01dba16ab0dde84217a48c74c621f8a69d6d1e3debc76df7";
    private static final String UNIX_FIXTURE_DIGEST =
            "4917712360d519aeca16db0811b9ed99b076992d91b1d978d3beac8dd2d0951d";
    private static final String WINDOWS_NO_BINARY_FIXTURE_DIGEST =
            "b550d1ac01b4d700749cd110df57578ea9176d80d1e4c36a62e29b313c7f398c";
    private static final String UNIX_NO_BINARY_FIXTURE_DIGEST =
            "b9c180afeb6ca2746f6ddb17681649b21e3b35680733c739dddc9705e3a1c75b";

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

    /** A pipeline built for any target, reusing the real-files byte reader every case shares. */
    private static NodeInstallPipeline pipeline(NodeInstallPipeline.Target target, Path dataDirectory,
            Path temporaryRoot, NodeInstallPipeline.Fetcher fetcher, NodeArchiveVerifier.DigestSource digests,
            NodeExecutableResolver.PathProbe probe, NodeInstallIntegrity integrity) {
        return new NodeInstallPipeline(target, dataDirectory, temporaryRoot, fetcher, digests,
                NodeArchiveVerifier.REAL_FILES, integrity, probe);
    }

    /** Whether an executable file named {@code tar} is on the {@code PATH} — checked without spawning a process. */
    private static boolean tarIsOnPath() {
        String path = System.getenv("PATH");
        if (path == null) {
            return false;
        }
        for (String dir : path.split(File.pathSeparator)) {
            File candidate = new File(dir, "tar");
            if (candidate.isFile() && candidate.canExecute()) {
                return true;
            }
        }
        return false;
    }

    /** A {@link NodeInstallPipeline.CancelProbe} that cancels on its Nth invocation, never before. */
    private static final class CountingCancelProbe implements NodeInstallPipeline.CancelProbe {
        private final int cancelOnInvocation;
        private int count;

        CountingCancelProbe(int cancelOnInvocation) {
            this.cancelOnInvocation = cancelOnInvocation;
        }

        @Override
        public void checkCanceled() {
            count++;
            if (count == cancelOnInvocation) {
                throw new CancellationException("cancelled for test at invocation " + count);
            }
        }
    }

    @Test
    void theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd(@TempDir Path dataDirectory,
            @TempDir Path temporaryRoot) throws IOException {
        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
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
        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
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

        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
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
        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
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
        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
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

    /**
     * A {@link NodeArchiveVerifier.ByteSource} that, the first time it is opened, records how
     * many entries the given temporary root already holds. Verification reads the archive
     * through this source; if the temporary root already holds more than the archive file alone
     * at that moment, extraction ran before verification did.
     */
    private static final class OrderRecordingByteSource implements NodeArchiveVerifier.ByteSource {
        private final Path temporaryRoot;
        private int entryCountAtFirstOpen = -1;

        OrderRecordingByteSource(Path temporaryRoot) {
            this.temporaryRoot = temporaryRoot;
        }

        @Override
        public InputStream open(Path file) throws IOException {
            if (entryCountAtFirstOpen < 0) {
                try (var entries = Files.list(temporaryRoot)) {
                    entryCountAtFirstOpen = (int) entries.count();
                }
            }
            return Files.newInputStream(file);
        }

        int entryCountAtFirstOpen() {
            return entryCountAtFirstOpen;
        }
    }

    @Test
    void verificationReadsTheArchiveBeforeAnyExtractionDirectoryExistsUnderTheTemporaryRoot(
            @TempDir Path dataDirectory, @TempDir Path temporaryRoot) throws IOException {
        String expectedDigest = WINDOWS_FIXTURE_DIGEST;
        FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
        OrderRecordingByteSource bytes = new OrderRecordingByteSource(temporaryRoot);
        NodeInstallPipeline pipeline = new NodeInstallPipeline(
                new NodeInstallPipeline.Target(NodeInstallPipeline.Os.WINDOWS, NodeInstallPipeline.Arch.X64),
                dataDirectory, temporaryRoot, new FixtureCopyingFetcher(WINDOWS_FIXTURE), digests, bytes,
                new NodeInstallIntegrity(), new FakePathProbe());

        pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

        assertEquals(1, bytes.entryCountAtFirstOpen(),
                "verification must read the archive while the temporary root holds only the archive "
                        + "file itself — a second entry means an extraction directory was already "
                        + "created, so extraction ran before verification");
    }

    /** The Unix branch and the whole six-name archive matrix. */
    @Nested
    class PlatformAxis {

        @Test
        @DisabledOnOs(OS.WINDOWS)
        void theUnixBranchExtractsBinNodeThroughTheRealTarAndSetsTheExecutableBit(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            Assumptions.assumeTrue(tarIsOnPath(), "tar is not on PATH");

            String expectedDigest = UNIX_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(UNIX_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline pipeline = pipeline(
                    new NodeInstallPipeline.Target(NodeInstallPipeline.Os.LINUX, NodeInstallPipeline.Arch.X64),
                    dataDirectory, temporaryRoot, new FixtureCopyingFetcher(UNIX_FIXTURE), digests,
                    new FakePathProbe(), new NodeInstallIntegrity());

            Path installed = pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

            assertEquals(dataDirectory.resolve("node"), installed);
            assertTrue(Files.exists(installed), "the installed executable must exist");
            assertEquals(UNIX_MARKER_BYTES_TEXT, Files.readString(installed, StandardCharsets.UTF_8),
                    "the installed executable's bytes must equal the fixture's marker bytes");
            assertTrue(Files.isExecutable(installed), "the Unix branch must set the executable bit");
        }

        @Test
        void everyPlatformAndArchitecturePairAssemblesAnArchiveNameThatHasAPinnedDigest() throws IOException {
            Map<NodeInstallPipeline.Target, String> expectedNames = new LinkedHashMap<>();
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.WINDOWS, NodeInstallPipeline.Arch.X64),
                    "node-v20.18.1-win-x64.zip");
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.WINDOWS, NodeInstallPipeline.Arch.ARM64),
                    "node-v20.18.1-win-arm64.zip");
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.MACOS, NodeInstallPipeline.Arch.X64),
                    "node-v20.18.1-darwin-x64.tar.gz");
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.MACOS, NodeInstallPipeline.Arch.ARM64),
                    "node-v20.18.1-darwin-arm64.tar.gz");
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.LINUX, NodeInstallPipeline.Arch.X64),
                    "node-v20.18.1-linux-x64.tar.gz");
            expectedNames.put(new NodeInstallPipeline.Target(NodeInstallPipeline.Os.LINUX, NodeInstallPipeline.Arch.ARM64),
                    "node-v20.18.1-linux-arm64.tar.gz");
            assertEquals(6, expectedNames.size());

            for (Map.Entry<NodeInstallPipeline.Target, String> entry : expectedNames.entrySet()) {
                NodeInstallPipeline pipeline = pipeline(entry.getKey(), Paths.get("."), Paths.get("."),
                        (url, target) -> { }, NodeArchiveVerifier.PINNED_DIGESTS, new FakePathProbe(),
                        new NodeInstallIntegrity());

                assertEquals(entry.getValue(), pipeline.archiveFileName());
                assertTrue(NodeArchiveVerifier.pinnedArchiveNames().contains(pipeline.archiveFileName()),
                        "no pinned digest for " + pipeline.archiveFileName());
                assertEquals("https://nodejs.org/dist/v20.18.1/" + entry.getValue(), pipeline.downloadUrl());
            }
        }
    }

    /** Verify failure, missing-binary failure, cancellation, re-install and the symlink cleanup fix. */
    @Nested
    class FailureAxis {

        @Test
        void aDigestMismatchStopsThePipelineBeforeExtraction(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            String wrongDigest = "0".repeat(64);
            String actualDigest = WINDOWS_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, wrongDigest));
            NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(WINDOWS_FIXTURE), digests, new FakePathProbe(),
                    new NodeInstallIntegrity());

            IOException thrown = assertThrows(IOException.class,
                    () -> pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED));

            assertTrue(thrown.getMessage().contains(wrongDigest), "message must name the expected digest");
            assertTrue(thrown.getMessage().contains(actualDigest), "message must name the computed digest");
            try (var entries = Files.list(dataDirectory)) {
                assertEquals(0, entries.count(), "nothing must be written to the data directory");
            }
            try (var entries = Files.list(temporaryRoot)) {
                assertEquals(0, entries.count(),
                        "the temporary root must be empty — the extraction directory was never created "
                                + "and the temp archive file is gone");
            }
        }

        @Test
        void anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnWindows(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            String expectedDigest = WINDOWS_NO_BINARY_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(WINDOWS_NO_BINARY_FIXTURE), digests, new FakePathProbe(),
                    new NodeInstallIntegrity());

            IOException thrown = assertThrows(IOException.class,
                    () -> pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED));

            assertTrue(thrown.getMessage().contains("node.exe"), "message must name the expected binary path");
            try (var entries = Files.list(dataDirectory)) {
                assertEquals(0, entries.count(), "no file must be installed");
            }
            try (var entries = Files.list(temporaryRoot)) {
                assertEquals(0, entries.count(), "the temporary root must be empty afterwards");
            }
        }

        @Test
        @DisabledOnOs(OS.WINDOWS)
        void anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnUnix(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            Assumptions.assumeTrue(tarIsOnPath(), "tar is not on PATH");
            String expectedDigest = UNIX_NO_BINARY_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(UNIX_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline pipeline = pipeline(
                    new NodeInstallPipeline.Target(NodeInstallPipeline.Os.LINUX, NodeInstallPipeline.Arch.X64),
                    dataDirectory, temporaryRoot, new FixtureCopyingFetcher(UNIX_NO_BINARY_FIXTURE), digests,
                    new FakePathProbe(), new NodeInstallIntegrity());

            IOException thrown = assertThrows(IOException.class,
                    () -> pipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED));

            assertTrue(thrown.getMessage().contains("bin"), "message must name the expected binary path");
            assertTrue(thrown.getMessage().contains("node"), "message must name the expected binary path");
            try (var entries = Files.list(dataDirectory)) {
                assertEquals(0, entries.count(), "no file must be installed");
            }
            try (var entries = Files.list(temporaryRoot)) {
                assertEquals(0, entries.count(), "the temporary root must be empty afterwards");
            }
        }

        @Test
        void aCancelSignalledBeforeExtractionStopsThePipelineAndCleansUp(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            String expectedDigest = WINDOWS_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(WINDOWS_FIXTURE), digests, new FakePathProbe(),
                    new NodeInstallIntegrity());
            CountingCancelProbe cancel = new CountingCancelProbe(1);

            assertThrows(CancellationException.class,
                    () -> pipeline.install(NodeInstallPipeline.SILENT, cancel));

            try (var entries = Files.list(dataDirectory)) {
                assertEquals(0, entries.count(), "no file must be installed");
            }
            try (var entries = Files.list(temporaryRoot)) {
                assertEquals(0, entries.count(), "the temporary root must be empty after a cancel");
            }
        }

        @Test
        void aCancelSignalledBeforeInstallationStopsThePipelineAndCleansUp(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            String expectedDigest = WINDOWS_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline pipeline = windowsPipeline(dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(WINDOWS_FIXTURE), digests, new FakePathProbe(),
                    new NodeInstallIntegrity());
            CountingCancelProbe cancel = new CountingCancelProbe(2);

            assertThrows(CancellationException.class,
                    () -> pipeline.install(NodeInstallPipeline.SILENT, cancel));

            try (var entries = Files.list(dataDirectory)) {
                assertEquals(0, entries.count(), "no file must be installed");
            }
            try (var entries = Files.list(temporaryRoot)) {
                assertEquals(0, entries.count(), "the temporary root must be empty after a cancel");
            }
        }

        @Test
        @DisabledOnOs(OS.WINDOWS)
        void aReinstallOverAnExistingBinaryReplacesItAndRerecordsTheDigest(@TempDir Path dataDirectory,
                @TempDir Path temporaryRoot) throws IOException {
            Assumptions.assumeTrue(tarIsOnPath(), "tar is not on PATH");
            String expectedDigest = UNIX_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(UNIX_ARCHIVE_NAME, expectedDigest));
            NodeInstallIntegrity integrity = new NodeInstallIntegrity();
            NodeInstallPipeline.Target target =
                    new NodeInstallPipeline.Target(NodeInstallPipeline.Os.LINUX, NodeInstallPipeline.Arch.X64);

            NodeInstallPipeline firstPipeline = pipeline(target, dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(UNIX_FIXTURE), digests, new FakePathProbe(), integrity);
            Path installed = firstPipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

            // Corrupt the installed file's bytes directly, simulating drift since the last install.
            Files.writeString(installed, "corrupted\n", StandardCharsets.UTF_8);

            NodeInstallPipeline secondPipeline = pipeline(target, dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(UNIX_FIXTURE), digests, new FakePathProbe(), integrity);
            Path reinstalled = secondPipeline.install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);

            assertEquals(installed, reinstalled);
            try (var entries = Files.list(dataDirectory)) {
                long executableNamedFiles = entries
                        .filter(p -> !p.getFileName().toString().endsWith(NodeInstallIntegrity.SIDECAR_SUFFIX))
                        .count();
                assertEquals(1, executableNamedFiles,
                        "exactly one file with the executable's name must exist in the data directory");
            }
            assertEquals(UNIX_MARKER_BYTES_TEXT, Files.readString(reinstalled, StandardCharsets.UTF_8),
                    "the reinstalled file's bytes must be the fixture's again");
            assertEquals(reinstalled, secondPipeline.cachedNodePath());
        }

        @Test
        void theCacheHitDecisionNeedsAllThreeConditions(@TempDir Path dataDirectory, @TempDir Path temporaryRoot)
                throws IOException {
            String expectedDigest = WINDOWS_FIXTURE_DIGEST;
            FixedDigestSource digests = new FixedDigestSource(Map.of(WINDOWS_ARCHIVE_NAME, expectedDigest));
            NodeInstallPipeline.Target target =
                    new NodeInstallPipeline.Target(NodeInstallPipeline.Os.WINDOWS, NodeInstallPipeline.Arch.X64);

            // Arrange: install once, through its own fresh integrity instance, to produce the
            // installed file and its digest sidecar.
            Path installed = pipeline(target, dataDirectory, temporaryRoot,
                    new FixtureCopyingFetcher(WINDOWS_FIXTURE), digests, new FakePathProbe(),
                    new NodeInstallIntegrity())
                    .install(NodeInstallPipeline.SILENT, NodeInstallPipeline.NEVER_CANCELLED);
            Path sidecar = NodeInstallIntegrity.sidecarFor(installed);
            String originalSidecarContents = Files.readString(sidecar);

            // Every check below uses a *fresh* NodeInstallIntegrity so its memo cannot carry a
            // stale answer from a previous check into this one (NodeInstallIntegrity's own
            // javadoc documents this as the reason its constructor is package-private).

            FakePathProbe notExists = new FakePathProbe();
            notExists.exists = false;
            assertNull(pipeline(target, dataDirectory, temporaryRoot, new FixtureCopyingFetcher(WINDOWS_FIXTURE),
                    digests, notExists, new NodeInstallIntegrity()).cachedNodePath(),
                    "a probe reporting not-exists must yield no cached path");

            FakePathProbe notExecutable = new FakePathProbe();
            notExecutable.executable = false;
            assertNull(pipeline(target, dataDirectory, temporaryRoot, new FixtureCopyingFetcher(WINDOWS_FIXTURE),
                    digests, notExecutable, new NodeInstallIntegrity()).cachedNodePath(),
                    "a probe reporting not-executable must yield no cached path");

            Files.writeString(sidecar, "0".repeat(64));
            assertNull(pipeline(target, dataDirectory, temporaryRoot, new FixtureCopyingFetcher(WINDOWS_FIXTURE),
                    digests, new FakePathProbe(), new NodeInstallIntegrity()).cachedNodePath(),
                    "a corrupted digest sidecar must yield no cached path");
            Files.writeString(sidecar, originalSidecarContents);

            assertEquals(installed,
                    pipeline(target, dataDirectory, temporaryRoot, new FixtureCopyingFetcher(WINDOWS_FIXTURE),
                            digests, new FakePathProbe(), new NodeInstallIntegrity()).cachedNodePath(),
                    "with everything intact the installed path must be returned");
        }

        @Test
        @DisabledOnOs(OS.WINDOWS)
        void cleanupDeletesASymbolicLinkAndNeverTheFileItPointsAt(@TempDir Path outsideRoot,
                @TempDir Path extractionParent) throws IOException {
            Path outsideDir = Files.createDirectories(outsideRoot.resolve("outside"));
            Path outsideFile = outsideDir.resolve("do-not-delete.txt");
            Files.writeString(outsideFile, "do not delete me\n");

            Path extractionDir = Files.createDirectories(extractionParent.resolve("extract"));
            Path link = extractionDir.resolve("link-to-outside");
            Files.createSymbolicLink(link, outsideDir);

            NodeInstallPipeline.deleteRecursively(extractionDir);

            assertFalse(Files.exists(extractionDir), "the extraction directory itself must be gone");
            assertTrue(Files.exists(outsideDir), "the link's target directory must survive");
            assertTrue(Files.exists(outsideFile), "the file inside the link's target must survive");
            assertEquals("do not delete me\n", Files.readString(outsideFile));
        }
    }
}
