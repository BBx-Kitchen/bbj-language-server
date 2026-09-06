package com.basis.bbj.intellij.lsp;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * The whole Node.js download / verify / extract / install / cache pipeline, extracted into a
 * plain-Java seam with every platform touch point injected as a collaborator. This class holds
 * no import from the platform SDK, so a plain JUnit test can drive every step of the pipeline
 * directly, against a real fetcher double and real fixture archives, without a platform test
 * harness.
 *
 * <p>The branch this pipeline takes is chosen from the {@link Target} it is constructed with,
 * never from the host it runs on — that is what makes both platform branches testable from a
 * single machine.
 */
public final class NodeInstallPipeline {

    public static final String NODE_VERSION = "v20.18.1";
    public static final String DOWNLOAD_BASE_URL = "https://nodejs.org/dist/";

    /** The three Node.js distribution platforms this pipeline can target. */
    public enum Os {
        WINDOWS, MACOS, LINUX
    }

    /** The two Node.js distribution architectures this pipeline can target. */
    public enum Arch {
        X64, ARM64
    }

    /**
     * Which archive to fetch and how to lay it out once extracted. Supplied by the caller —
     * production derives it from the running host, a test supplies any combination directly.
     */
    public record Target(Os os, Arch arch) {

        /** The platform segment of the archive file name. */
        public String platformName() {
            if (os == Os.WINDOWS) {
                return "win";
            }
            if (os == Os.MACOS) {
                return "darwin";
            }
            return "linux";
        }

        /** The architecture segment of the archive file name. */
        public String archName() {
            if (arch == Arch.ARM64) {
                return "arm64";
            }
            return "x64";
        }

        /** The archive's file extension: {@code .zip} on Windows, {@code .tar.gz} elsewhere. */
        public String archiveExtension() {
            return os == Os.WINDOWS ? ".zip" : ".tar.gz";
        }

        /** The installed executable's file name: {@code node.exe} on Windows, {@code node} elsewhere. */
        public String nodeExecutableName() {
            return os == Os.WINDOWS ? "node.exe" : "node";
        }
    }

    /**
     * Fetches the archive at {@code url} into {@code target}, replacing whatever is already
     * there. Production fetches over HTTP; a test copies a committed fixture into place, so no
     * test in this pipeline ever opens a network socket.
     */
    public interface Fetcher {
        void fetch(String url, Path target) throws IOException;
    }

    /** A textual, fractional progress callback, replacing the platform's progress indicator. */
    public interface Progress {
        void step(String text, double fraction);
    }

    /** A {@link Progress} that reports nothing, for a caller that does not care. */
    public static final Progress SILENT = (text, fraction) -> {
    };

    /** A cooperative cancellation check, replacing the platform's cancellation check. */
    public interface CancelProbe {
        void checkCanceled();
    }

    /** A {@link CancelProbe} that never cancels. */
    public static final CancelProbe NEVER_CANCELLED = () -> {
    };

    private final Target target;
    private final Path dataDirectory;
    private final Path temporaryRoot;
    private final Fetcher fetcher;
    private final NodeArchiveVerifier.DigestSource digests;
    private final NodeArchiveVerifier.ByteSource bytes;
    private final NodeInstallIntegrity integrity;
    private final NodeExecutableResolver.PathProbe paths;

    /**
     * @param target        which platform/architecture archive to fetch and install
     * @param dataDirectory where the installed executable is placed; assumed to already exist
     * @param temporaryRoot the directory under which the temporary archive file and the
     *                      temporary extraction directory are created — a test points this at
     *                      its own temporary directory so both can be asserted gone afterwards
     * @param fetcher       fetches the archive; production fetches over HTTP, a test copies a
     *                      fixture
     * @param digests       the trust anchor an archive's digest is checked against
     * @param bytes         the reader used to compute digests
     * @param integrity     records and re-checks the installed executable's digest
     * @param paths         the filesystem probe used to decide a cache hit
     */
    public NodeInstallPipeline(Target target, Path dataDirectory, Path temporaryRoot, Fetcher fetcher,
            NodeArchiveVerifier.DigestSource digests, NodeArchiveVerifier.ByteSource bytes,
            NodeInstallIntegrity integrity, NodeExecutableResolver.PathProbe paths) {
        this.target = target;
        this.dataDirectory = dataDirectory;
        this.temporaryRoot = temporaryRoot;
        this.fetcher = fetcher;
        this.digests = digests;
        this.bytes = bytes;
        this.integrity = integrity;
        this.paths = paths;
    }

    /** The archive file name this target assembles to, e.g. {@code node-v20.18.1-win-x64.zip}. */
    public String archiveFileName() {
        return "node-" + NODE_VERSION + "-" + target.platformName() + "-" + target.archName()
                + target.archiveExtension();
    }

    /** The full download URL for {@link #archiveFileName()}. */
    public String downloadUrl() {
        return DOWNLOAD_BASE_URL + NODE_VERSION + "/" + archiveFileName();
    }

    /** Where the installed executable lives, or would live, inside {@code dataDirectory}. */
    public Path installedPath() {
        return dataDirectory.resolve(target.nodeExecutableName());
    }

    /**
     * Returns {@link #installedPath()} when it exists, is executable, and its recorded
     * install-time digest still describes it; otherwise {@code null}. Never throws — every
     * collaborator this method consults is documented not to.
     */
    public Path cachedNodePath() {
        Path path = installedPath();
        String pathText = path.toString();
        if (paths.exists(pathText) && paths.isExecutable(pathText)
                && integrity.matchesRecordedDigest(path, bytes)) {
            return path;
        }
        return null;
    }

    /**
     * Runs the whole pipeline: fetch, verify, extract, install, record. Cleans up the temporary
     * archive file and the temporary extraction directory on every path, success or failure.
     *
     * @throws IOException if the fetch, the verification, the extraction or the install step
     *                      fails; a failed verification carries {@link NodeArchiveVerifier.Result#failureMessage()}
     */
    public Path install(Progress progress, CancelProbe cancel) throws IOException {
        progress.step("Downloading Node.js " + NODE_VERSION + " for " + target.platformName()
                + "-" + target.archName(), 0.1);
        Path tempFile = Files.createTempFile(temporaryRoot, "node-download-", target.archiveExtension());
        try {
            fetcher.fetch(downloadUrl(), tempFile);

            progress.step("Verifying Node.js archive...", 0.4);
            NodeArchiveVerifier.Result verification = NodeArchiveVerifier.verify(
                    archiveFileName(), tempFile, digests, bytes);
            if (!verification.isVerified()) {
                throw new IOException(verification.failureMessage());
            }

            progress.step("Extracting Node.js binary...", 0.7);
            Path tempExtractDir = Files.createTempDirectory(temporaryRoot, "node-extract-");
            try {
                cancel.checkCanceled();
                extractArchive(tempFile, tempExtractDir, cancel);

                progress.step("Installing Node.js to plugin directory...", 0.9);
                cancel.checkCanceled();
                Path installed = installExtracted(tempExtractDir);

                progress.step("Installing Node.js to plugin directory...", 1.0);
                return installed;
            } finally {
                deleteRecursivelyQuietly(tempExtractDir);
            }
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    private void extractArchive(Path archiveFile, Path destDir, CancelProbe cancel) throws IOException {
        if (target.os() == Os.WINDOWS) {
            extractZip(archiveFile, destDir);
        } else {
            extractTarGz(archiveFile, destDir, cancel);
        }
    }

    private void extractZip(Path zipFile, Path destDir) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zipFile))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                // We only want node.exe from the archive.
                if (entry.getName().endsWith("node.exe")) {
                    Path targetFile = destDir.resolve("node.exe");
                    Files.createDirectories(targetFile.getParent());
                    try (OutputStream out = Files.newOutputStream(targetFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            out.write(buffer, 0, len);
                        }
                    }
                    break;
                }
                zis.closeEntry();
            }
        }
    }

    private void extractTarGz(Path tarGzFile, Path destDir, CancelProbe cancel) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(
                "tar", "xzf", tarGzFile.toAbsolutePath().toString(),
                "-C", destDir.toAbsolutePath().toString(),
                "--strip-components=1"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Read output for error reporting, checking for cancellation between lines so a cancel
        // request during a slow extraction is honored rather than silently ignored until the
        // tar process finishes on its own.
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                try {
                    cancel.checkCanceled();
                } catch (RuntimeException cancelled) {
                    process.destroyForcibly();
                    throw cancelled;
                }
            }
        }

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("tar extraction failed with exit code " + exitCode + ": " + output);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("tar extraction interrupted", e);
        }
    }

    private Path installExtracted(Path tempExtractDir) throws IOException {
        Path extractedNode = target.os() == Os.WINDOWS
                ? tempExtractDir.resolve("node.exe")
                : tempExtractDir.resolve("bin").resolve("node");

        if (!Files.exists(extractedNode)) {
            throw new IOException("Node binary not found in extracted archive at: " + extractedNode);
        }

        Path targetPath = installedPath();
        Files.copy(extractedNode, targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Set executable permission (important for Unix-like systems).
        if (target.os() != Os.WINDOWS) {
            targetPath.toFile().setExecutable(true);
        }

        // Record the installed executable's digest so cachedNodePath() can re-check it.
        integrity.record(targetPath, bytes);
        return targetPath;
    }

    private static void deleteRecursivelyQuietly(Path root) {
        try {
            deleteRecursively(root);
        } catch (IOException e) {
            // Best-effort cleanup: a failure here must never mask an earlier exception.
        }
    }

    /**
     * Deletes {@code root} and everything under it. Passes no file-visit option to the walk, so
     * a symbolic link found inside {@code root} is deleted as a link and its target is never
     * touched, no matter where that target lives.
     */
    public static void deleteRecursively(Path root) throws IOException {
        if (!Files.exists(root)) {
            return;
        }
        Files.walkFileTree(root, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }
}
