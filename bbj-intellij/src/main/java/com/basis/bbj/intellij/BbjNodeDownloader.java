package com.basis.bbj.intellij;

import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.PathManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.util.io.HttpRequests;
import com.intellij.util.system.CpuArch;
import com.basis.bbj.intellij.lsp.NodeArchiveVerifier;
import com.basis.bbj.intellij.lsp.NodeInstallIntegrity;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Downloads and caches Node.js binaries for the BBj language server.
 * Handles platform detection, download, extraction, and caching in plugin data directory.
 */
public final class BbjNodeDownloader {

    private static final String NODE_VERSION = "v20.18.1";
    private static final String DOWNLOAD_BASE_URL = "https://nodejs.org/dist/";

    private BbjNodeDownloader() {
    }

    /**
     * Gets the cached Node.js path if it exists, is executable, and its recorded install-time
     * digest still describes it. This method is fast and synchronous — safe to call from any
     * thread. Note: as a side effect, this creates the plugin's Node.js data directory if it
     * does not already exist. An absent or disagreeing digest record reads as not cached, so the
     * caller re-downloads and re-verifies rather than trusting an unrecorded file.
     *
     * @return Path to cached node executable, or null if not cached
     */
    public static @Nullable Path getCachedNodePath() {
        try {
            Path nodeDataDir = getNodeDataDirectory();
            Path nodePath = nodeDataDir.resolve(Platform.current().nodeExecutableName());

            if (Files.exists(nodePath) && Files.isExecutable(nodePath)
                    && NodeInstallIntegrity.SESSION.matchesRecordedDigest(nodePath, NodeArchiveVerifier.REAL_FILES)) {
                return nodePath;
            }
        } catch (IOException e) {
            // Directory creation failed, return null
        }
        return null;
    }

    /**
     * Downloads Node.js asynchronously in the background.
     * Shows progress notification and calls onComplete callback when finished.
     *
     * <p>Concurrency is guarded by {@link DownloadGuard#SESSION}, acquired before the background
     * task is even queued (D-14): only the first caller in a race starts a download, and every
     * other caller's {@code onComplete} is attached to the running download instead and still
     * runs on the EDT when it finishes (D-15), so the editor banner refresh never depends on
     * which click won.
     *
     * @param project     the current project
     * @param onComplete  optional callback to run on EDT after download completes (success or failure)
     */
    public static void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete) {
        if (!DownloadGuard.SESSION.tryAcquire(onComplete)) {
            showNotification(project, "Node.js download already in progress", NotificationType.INFORMATION);
            return;
        }

        new Task.Backgroundable(project, "Downloading Node.js " + NODE_VERSION + "...", true) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                try {
                    downloadAndExtractNode(indicator, project);
                    showDownloadSuccessNotification(project);
                } catch (Exception e) {
                    showNotification(project,
                            "Failed to download Node.js: " + e.getMessage(),
                            NotificationType.ERROR);
                } finally {
                    for (Runnable completion : DownloadGuard.SESSION.release()) {
                        ApplicationManager.getApplication().invokeLater(completion);
                    }
                }
            }
        }.queue();
    }

    /**
     * Small platform-strategy helper centralizing the SystemInfo.isWindows branching that was
     * previously repeated at each decision site in downloadAndExtractNode's steps.
     */
    private enum Platform {
        WINDOWS, UNIX;

        static Platform current() {
            return SystemInfo.isWindows ? WINDOWS : UNIX;
        }

        String archiveExtension() {
            return this == WINDOWS ? ".zip" : ".tar.gz";
        }

        String nodeExecutableName() {
            return this == WINDOWS ? "node.exe" : "node";
        }
    }

    private static void downloadAndExtractNode(@NotNull ProgressIndicator indicator, @NotNull Project project)
            throws IOException {
        Platform platform = Platform.current();
        String downloadUrl = buildDownloadUrl(platform);
        String fileName = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1,
                downloadUrl.length() - platform.archiveExtension().length());

        indicator.setText("Downloading Node.js " + NODE_VERSION + " for " + getPlatformName() + "-" + getArchitecture());
        indicator.setFraction(0.1);

        Path tempFile = Files.createTempFile("node-download-", platform.archiveExtension());
        try {
            download(tempFile, downloadUrl, indicator);

            String archiveFileName = downloadUrl.substring(downloadUrl.lastIndexOf('/') + 1);
            indicator.setFraction(0.4);
            indicator.setText("Verifying Node.js archive...");
            NodeArchiveVerifier.Result verification = NodeArchiveVerifier.verify(
                    archiveFileName, tempFile, NodeArchiveVerifier.PINNED_DIGESTS, NodeArchiveVerifier.REAL_FILES);
            if (!verification.isVerified()) {
                throw new IOException(verification.failureMessage());
            }

            indicator.setFraction(0.7);
            indicator.setText("Extracting Node.js binary...");

            Path tempExtractDir = Files.createTempDirectory("node-extract-");
            try {
                extract(platform, tempFile, tempExtractDir, fileName, indicator);

                indicator.setFraction(0.9);
                indicator.setText("Installing Node.js to plugin directory...");

                install(platform, tempExtractDir, indicator);

                indicator.setFraction(1.0);
            } finally {
                cleanup(tempExtractDir);
            }
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    private static @NotNull String buildDownloadUrl(@NotNull Platform platform) {
        String platformName = getPlatformName();
        String arch = getArchitecture();
        String fileName = "node-" + NODE_VERSION + "-" + platformName + "-" + arch;
        return DOWNLOAD_BASE_URL + NODE_VERSION + "/" + fileName + platform.archiveExtension();
    }

    private static void download(@NotNull Path tempFile, @NotNull String downloadUrl,
            @NotNull ProgressIndicator indicator) throws IOException {
        HttpRequests.request(downloadUrl)
                .productNameAsUserAgent()
                .connect(request -> {
                    request.saveToFile(tempFile.toFile(), indicator);
                    return tempFile;
                });
    }

    private static void extract(@NotNull Platform platform, @NotNull Path tempFile,
            @NotNull Path tempExtractDir, @NotNull String fileName, @NotNull ProgressIndicator indicator)
            throws IOException {
        indicator.checkCanceled();
        if (platform == Platform.WINDOWS) {
            extractZip(tempFile, tempExtractDir, fileName);
        } else {
            extractTarGz(tempFile, tempExtractDir, indicator);
        }
    }

    private static void install(@NotNull Platform platform, @NotNull Path tempExtractDir,
            @NotNull ProgressIndicator indicator) throws IOException {
        indicator.checkCanceled();
        // Find the extracted node binary
        Path extractedNode;
        if (platform == Platform.WINDOWS) {
            extractedNode = tempExtractDir.resolve("node.exe");
        } else {
            extractedNode = tempExtractDir.resolve("bin").resolve("node");
        }

        if (!Files.exists(extractedNode)) {
            throw new IOException("Node binary not found in extracted archive at: " + extractedNode);
        }

        // Copy to plugin data directory
        Path nodeDataDir = getNodeDataDirectory();
        Path targetPath = nodeDataDir.resolve(platform.nodeExecutableName());
        Files.copy(extractedNode, targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        // Set executable permission (important for Unix-like systems)
        if (platform != Platform.WINDOWS) {
            targetPath.toFile().setExecutable(true);
        }

        // Record the installed executable's digest so getCachedNodePath() can re-check it
        NodeInstallIntegrity.SESSION.record(targetPath, NodeArchiveVerifier.REAL_FILES);
    }

    private static void cleanup(@NotNull Path tempExtractDir) {
        // Clean up temp extraction directory
        deleteDirectory(tempExtractDir.toFile());
    }

    private static void extractZip(@NotNull Path zipFile, @NotNull Path destDir, @NotNull String baseName)
            throws IOException {
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile.toFile()))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                // We only want node.exe from the archive
                if (entry.getName().endsWith("node.exe")) {
                    Path targetFile = destDir.resolve("node.exe");
                    Files.createDirectories(targetFile.getParent());
                    try (OutputStream out = new FileOutputStream(targetFile.toFile())) {
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

    private static void extractTarGz(@NotNull Path tarGzFile, @NotNull Path destDir,
            @NotNull ProgressIndicator indicator) throws IOException {
        // Use tar command for extraction (available on macOS/Linux)
        ProcessBuilder pb = new ProcessBuilder(
                "tar", "xzf", tarGzFile.toAbsolutePath().toString(),
                "-C", destDir.toAbsolutePath().toString(),
                "--strip-components=1"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Read output for error reporting, checking for cancellation between lines so a Cancel
        // click during a slow extraction is honored rather than silently ignored until the tar
        // process finishes on its own.
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                try {
                    indicator.checkCanceled();
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

    private static @NotNull String getPlatformName() {
        if (SystemInfo.isMac) {
            return "darwin";
        } else if (SystemInfo.isLinux) {
            return "linux";
        } else if (SystemInfo.isWindows) {
            return "win";
        }
        throw new UnsupportedOperationException("Unsupported platform: " + SystemInfo.OS_NAME);
    }

    private static @NotNull String getArchitecture() {
        // Check ARM64 first - works on all platforms (macOS, Linux, Windows)
        if (CpuArch.isArm64()) {
            return "arm64";
        }
        // Fall through to x64 for all other 64-bit systems
        if (CpuArch.CURRENT.width != 64) {
            throw new UnsupportedOperationException("32-bit systems are not supported");
        }
        return "x64";
    }

    private static @NotNull Path getNodeDataDirectory() throws IOException {
        Path dataDir = Paths.get(PathManager.getPluginsPath(), "bbj-intellij-data", "nodejs");
        Files.createDirectories(dataDir);
        return dataDir;
    }

    private static void showDownloadSuccessNotification(@NotNull Project project) {
        Notification notification = new Notification(
                "BBj Language Server",
                "BBj Language Server",
                "Node.js " + NODE_VERSION + " downloaded successfully.",
                NotificationType.INFORMATION
        );
        notification.addAction(new NotificationAction("Restart Language Server") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                n.expire();
                BbjServerService.getInstance(project).requestRestart(0);
            }
        });
        Notifications.Bus.notify(notification, project);
    }

    private static void showNotification(@NotNull Project project, @NotNull String content,
                                        @NotNull NotificationType type) {
        Notification notification = new Notification(
                "BBj Language Server",
                "BBj Language Server",
                content,
                type
        );
        Notifications.Bus.notify(notification, project);
    }

    private static void deleteDirectory(@NotNull File directory) {
        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    deleteDirectory(file);
                } else {
                    file.delete();
                }
            }
        }
        directory.delete();
    }
}
