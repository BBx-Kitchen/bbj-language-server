package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjNodeDetector;
import com.basis.bbj.intellij.BbjNodeDownloader;
import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.ide.plugins.IdeaPluginDescriptor;
import com.intellij.ide.plugins.PluginManagerCore;
import com.intellij.openapi.extensions.PluginId;
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

/**
 * Starts the BBj language server process using Node.js.
 * Resolves the bundled main.cjs from plugin resources and launches:
 * {@code node main.cjs --stdio}
 */
public final class BbjLanguageServer extends OSProcessStreamConnectionProvider {

    public BbjLanguageServer(@NotNull Project project) {
        // Resolve Node.js path
        String nodePath = resolveNodePath();

        // Resolve language server main.cjs path
        String serverPath = resolveServerPath();

        // Build command line: node main.cjs --stdio
        GeneralCommandLine cmd = new GeneralCommandLine(nodePath, serverPath, "--stdio");
        cmd.setCharset(StandardCharsets.UTF_8);
        cmd.setWorkDirectory(new File(project.getBasePath()));

        super.setCommandLine(cmd);
    }

    private String resolveNodePath() {
        // Use settings if configured
        String nodePath = BbjSettings.getInstance().getState().nodeJsPath;
        if (nodePath != null && !nodePath.isEmpty()) {
            return nodePath;
        }

        // Try auto-detection
        nodePath = BbjNodeDetector.detectNodePath();
        if (nodePath != null) {
            return nodePath;
        }

        // Check for cached downloaded Node.js
        Path cachedNode = BbjNodeDownloader.getCachedNodePath();
        if (cachedNode != null) {
            return cachedNode.toString();
        }

        // Fallback to system PATH
        return "node";
    }

    private String resolveServerPath() {
        // Try plugin installation path first
        PluginId pluginId = PluginId.getId("com.basis.bbj.intellij");
        IdeaPluginDescriptor plugin = PluginManagerCore.getPlugin(pluginId);
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
