package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjNodeDetector;
import com.basis.bbj.intellij.BbjNodeDownloader;
import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.basis.bbj.intellij.lsp.NodeExecutableResolver;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.ide.plugins.IdeaPluginDescriptor;
import com.intellij.ide.plugins.PluginManager;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.extensions.PluginId;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider;
import org.jetbrains.annotations.NotNull;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.logging.Logger;

/**
 * Starts the BBj language server process using Node.js.
 * Resolves the bundled main.cjs from plugin resources and launches:
 * {@code node main.cjs --stdio}
 */
public final class BbjLanguageServer extends OSProcessStreamConnectionProvider {

    private static final Logger LOG = Logger.getLogger(BbjLanguageServer.class.getName());

    public BbjLanguageServer(@NotNull Project project) {
        // Resolve Node.js path
        String nodePath = resolveNodePath(project);

        // Resolve language server main.cjs path
        String serverPath = resolveServerPath();

        // Build command line: node main.cjs --stdio
        GeneralCommandLine cmd = new GeneralCommandLine(nodePath, serverPath, "--stdio");
        cmd.setCharset(StandardCharsets.UTF_8);
        cmd.setWorkDirectory(new File(project.getBasePath()));

        super.setCommandLine(cmd);
    }

    private String resolveNodePath(@NotNull Project project) {
        String configuredPath = BbjSettings.getInstance().getState().nodeJsPath;
        String detectedPath = BbjNodeDetector.detectNodePath();
        Path cachedPath = BbjNodeDownloader.getCachedNodePath();

        NodeExecutableResolver.Resolution resolution = NodeExecutableResolver.resolve(
                configuredPath, detectedPath, cachedPath != null ? cachedPath.toString() : null,
                NodeExecutableResolver.REAL_FILESYSTEM);

        if (resolution.isResolved()) {
            for (NodeExecutableResolver.Rejected rejected : resolution.rejections()) {
                LOG.warning(rejected.toString());
            }
            return resolution.path();
        }

        for (NodeExecutableResolver.Rejected rejected : resolution.rejections()) {
            LOG.warning(rejected.toString());
        }
        notifyUnresolvedNodePath(project, resolution.failureMessage());
        throw new RuntimeException(resolution.failureMessage());
    }

    private static void notifyUnresolvedNodePath(@NotNull Project project, @NotNull String message) {
        Notification notification = new Notification(
                "BBj Language Server",
                "BBj Language Server",
                message,
                NotificationType.ERROR
        );
        notification.addAction(new NotificationAction("Configure Node.js Path") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                n.expire();
                ShowSettingsUtil.getInstance()
                        .showSettingsDialog(project, BbjSettingsConfigurable.class);
            }
        });
        Notifications.Bus.notify(notification, project);
    }

    private String resolveServerPath() {
        // Try plugin installation path first
        PluginId pluginId = PluginId.getId("com.basis.bbj");
        IdeaPluginDescriptor plugin = PluginManager.getInstance().findEnabledPlugin(pluginId);
        if (plugin != null) {
            Path serverPath = plugin.getPluginPath().resolve("lib").resolve("language-server").resolve("main.cjs");
            if (Files.exists(serverPath)) {
                return serverPath.toAbsolutePath().toString();
            }
        }

        // Fallback: extract from classloader resource (development mode)
        try {
            URL resource = getClass().getClassLoader().getResource("language-server/main.cjs");
            if (resource != null) {
                // Extract to temp file since Node.js needs filesystem path
                Path tempFile = Files.createTempFile("bbj-language-server-", ".cjs");
                tempFile.toFile().deleteOnExit();
                try (InputStream in = resource.openStream()) {
                    Files.copy(in, tempFile, StandardCopyOption.REPLACE_EXISTING);
                }
                return tempFile.toAbsolutePath().toString();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract language server bundle", e);
        }

        throw new RuntimeException("BBj language server bundle (main.cjs) not found");
    }
}
