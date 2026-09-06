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
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.util.io.HttpRequests;
import com.intellij.util.system.CpuArch;
import com.basis.bbj.intellij.lsp.DownloadCompletions;
import com.basis.bbj.intellij.lsp.NodeArchiveVerifier;
import com.basis.bbj.intellij.lsp.NodeExecutableResolver;
import com.basis.bbj.intellij.lsp.NodeInstallIntegrity;
import com.basis.bbj.intellij.lsp.NodeInstallPipeline;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Downloads and caches Node.js binaries for the BBj language server.
 * Handles platform detection, download, extraction, and caching in plugin data directory.
 */
public final class BbjNodeDownloader {

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
            return productionPipeline().cachedNodePath();
        } catch (IOException e) {
            // Directory creation failed, return null
            return null;
        }
    }

    /**
     * Downloads Node.js asynchronously in the background.
     * Shows progress notification and calls onComplete callback when finished.
     *
     * <p>Concurrency is guarded by {@link DownloadGuard#SESSION}, acquired before the background
     * task is even queued: only the first caller in a race starts a download, and every
     * other caller's {@code onComplete} is attached to the running download instead and still
     * runs on the EDT when it finishes, so the editor banner refresh never depends on
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

        new Task.Backgroundable(project, "Downloading Node.js " + NodeInstallPipeline.NODE_VERSION + "...", true) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                try {
                    NodeInstallPipeline pipeline = productionPipeline();
                    pipeline.install(
                            (text, fraction) -> {
                                indicator.setText(text);
                                indicator.setFraction(fraction);
                            },
                            indicator::checkCanceled);
                    showDownloadSuccessNotification(project);
                } catch (Exception e) {
                    showNotification(project,
                            "Failed to download Node.js: " + e.getMessage(),
                            NotificationType.ERROR);
                } finally {
                    DownloadCompletions.dispatch(DownloadGuard.SESSION.release(),
                            ApplicationManager.getApplication()::invokeLater);
                }
            }
        }.queue();
    }

    /**
     * Builds a {@link NodeInstallPipeline} wired to the production collaborators: the target
     * derived from the running host, the plugin's Node.js data directory, the JVM default
     * temporary directory, a fetcher backed by the platform HTTP client, the source-pinned
     * digest table, the real filesystem byte reader, the shared digest-integrity session, and
     * the real filesystem path probe.
     */
    private static NodeInstallPipeline productionPipeline() throws IOException {
        NodeInstallPipeline.Target target = currentTarget();
        Path dataDirectory = getNodeDataDirectory();
        Path temporaryRoot = Paths.get(System.getProperty("java.io.tmpdir"));

        NodeInstallPipeline.Fetcher fetcher = (url, targetPath) -> HttpRequests.request(url)
                .productNameAsUserAgent()
                .connect(request -> {
                    request.saveToFile(targetPath.toFile(), ProgressManager.getInstance().getProgressIndicator());
                    return targetPath;
                });

        return new NodeInstallPipeline(target, dataDirectory, temporaryRoot, fetcher,
                NodeArchiveVerifier.PINNED_DIGESTS, NodeArchiveVerifier.REAL_FILES,
                NodeInstallIntegrity.SESSION, NodeExecutableResolver.REAL_FILESYSTEM);
    }

    private static NodeInstallPipeline.Target currentTarget() {
        NodeInstallPipeline.Os os;
        if (SystemInfo.isMac) {
            os = NodeInstallPipeline.Os.MACOS;
        } else if (SystemInfo.isLinux) {
            os = NodeInstallPipeline.Os.LINUX;
        } else if (SystemInfo.isWindows) {
            os = NodeInstallPipeline.Os.WINDOWS;
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + SystemInfo.OS_NAME);
        }

        NodeInstallPipeline.Arch arch;
        if (CpuArch.isArm64()) {
            arch = NodeInstallPipeline.Arch.ARM64;
        } else if (CpuArch.CURRENT.width != 64) {
            throw new UnsupportedOperationException("32-bit systems are not supported");
        } else {
            arch = NodeInstallPipeline.Arch.X64;
        }

        return new NodeInstallPipeline.Target(os, arch);
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
                "Node.js " + NodeInstallPipeline.NODE_VERSION + " downloaded successfully.",
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
}
