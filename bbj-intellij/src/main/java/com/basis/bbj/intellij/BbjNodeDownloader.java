package com.basis.bbj.intellij;

import com.intellij.ide.util.PropertiesComponent;
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
    private static final String DOWNLOAD_IN_PROGRESS_KEY = "bbj.node.download.inProgress";

    private BbjNodeDownloader() {
    }

    /**
     * Gets the cached Node.js path if it exists and is executable.
     * This method is fast and synchronous — safe to call from any thread.
     *
     * @return Path to cached node executable, or null if not cached
     */
    public static @Nullable Path getCachedNodePath() {
        try {
            Path nodeDataDir = getNodeDataDirectory();
            Path nodePath = nodeDataDir.resolve(SystemInfo.isWindows ? "node.exe" : "node");

            if (Files.exists(nodePath) && Files.isExecutable(nodePath)) {
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
     * @param project     the current project
     * @param onComplete  optional callback to run on EDT after download completes (success or failure)
     */
    public static void downloadNodeAsync(@NotNull Project project, @Nullable Runnable onComplete) {
        // Check if download is already in progress
        PropertiesComponent props = PropertiesComponent.getInstance();
        if (props.getBoolean(DOWNLOAD_IN_PROGRESS_KEY, false)) {
            showNotification(project, "Node.js download already in progress", NotificationType.INFORMATION);
            return;
        }

        new Task.Backgroundable(project, "Downloading Node.js " + NODE_VERSION + "...", true) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                props.setValue(DOWNLOAD_IN_PROGRESS_KEY, true);
                try {
                    downloadAndExtractNode(indicator, project);
                    showDownloadSuccessNotification(project);
                } catch (Exception e) {
                    showNotification(project,
                            "Failed to download Node.js: " + e.getMessage(),
                            NotificationType.ERROR);
                } finally {
                    props.setValue(DOWNLOAD_IN_PROGRESS_KEY, false);
                    if (onComplete != null) {
                        ApplicationManager.getApplication().invokeLater(onComplete);
                    }
                }
            }
        }.queue();
    }

    private static void downloadAndExtractNode(@NotNull ProgressIndicator indicator, @NotNull Project project)
            throws IOException {
        // Build download URL
        String platform = getPlatformName();
        String arch = getArchitecture();
        String fileName = "node-" + NODE_VERSION + "-" + platform + "-" + arch;
        String extension = SystemInfo.isWindows ? ".zip" : ".tar.gz";
        String downloadUrl = DOWNLOAD_BASE_URL + NODE_VERSION + "/" + fileName + extension;

        indicator.setText("Downloading Node.js " + NODE_VERSION + " for " + platform + "-" + arch);
        indicator.setFraction(0.1);

        // Download to temp file
        Path tempFile = Files.createTempFile("node-download-", extension);
        try {
            HttpRequests.request(downloadUrl)
                    .productNameAsUserAgent()
                    .connect(request -> {
                        request.saveToFile(tempFile.toFile(), indicator);
                        return tempFile;
                    });

            indicator.setFraction(0.7);
            indicator.setText("Extracting Node.js binary...");

            // Extract to temp directory
            Path tempExtractDir = Files.createTempDirectory("node-extract-");
            try {
                if (SystemInfo.isWindows) {
                    extractZip(tempFile, tempExtractDir, fileName);
                } else {
                    extractTarGz(tempFile, tempExtractDir);
                }

                indicator.setFraction(0.9);
                indicator.setText("Installing Node.js to plugin directory...");

                // Find the extracted node binary
                Path extractedNode;
                if (SystemInfo.isWindows) {
                    extractedNode = tempExtractDir.resolve("node.exe");
                } else {
                    extractedNode = tempExtractDir.resolve("bin").resolve("node");
                }

                if (!Files.exists(extractedNode)) {
                    throw new IOException("Node binary not found in extracted archive at: " + extractedNode);
                }

                // Copy to plugin data directory
                Path nodeDataDir = getNodeDataDirectory();
                Path targetPath = nodeDataDir.resolve(SystemInfo.isWindows ? "node.exe" : "node");
                Files.copy(extractedNode, targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

                // Set executable permission (important for Unix-like systems)
                if (!SystemInfo.isWindows) {
                    targetPath.toFile().setExecutable(true);
                }

                indicator.setFraction(1.0);
            } finally {
                // Clean up temp extraction directory
                deleteDirectory(tempExtractDir.toFile());
            }
        } finally {
            // Clean up temp download file
            Files.deleteIfExists(tempFile);
        }
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

    private static void extractTarGz(@NotNull Path tarGzFile, @NotNull Path destDir) throws IOException {
        // Use tar command for extraction (available on macOS/Linux)
        ProcessBuilder pb = new ProcessBuilder(
                "tar", "xzf", tarGzFile.toAbsolutePath().toString(),
                "-C", destDir.toAbsolutePath().toString(),
                "--strip-components=1"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Read output for error reporting
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
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
                BbjServerService.getInstance(project).restart();
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
