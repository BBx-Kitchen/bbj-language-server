package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.OSProcessHandler;
import com.intellij.execution.process.ProcessAdapter;
import com.intellij.execution.process.ProcessEvent;
import com.intellij.execution.process.ProcessOutputTypes;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Key;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Abstract base class for BBj run actions (GUI, BUI, DWC).
 * Provides shared functionality: settings access, auto-save, error handling, file validation.
 */
public abstract class BbjRunActionBase extends AnAction {

    protected BbjRunActionBase(String text, String description, Icon icon) {
        super(text, description, icon);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        if (project == null || file == null) {
            return;
        }

        // Auto-save if enabled
        autoSaveIfNeeded();

        // Validate before running
        if (!validateBeforeRun(project)) {
            return;
        }

        // Build command line (subclass responsibility)
        GeneralCommandLine cmd = buildCommandLine(file, project);
        if (cmd == null) {
            // Error already shown by subclass
            return;
        }

        // Execute the command off EDT to avoid UI freezing
        ApplicationManager.getApplication().executeOnPooledThread(() -> {
            try {
                OSProcessHandler handler = new OSProcessHandler(cmd);

                // Attach ProcessAdapter BEFORE startNotify() to capture all output
                handler.addProcessListener(new ProcessAdapter() {
                    @Override
                    public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
                        if (outputType == ProcessOutputTypes.STDERR) {
                            String text = event.getText();
                            if (text != null && !text.isBlank()) {
                                BbjServerService service = BbjServerService.getInstance(project);
                                service.logToConsole("[" + getRunMode() + "] " + text.stripTrailing(), ConsoleViewContentType.ERROR_OUTPUT);

                                // Auto-show log window on stderr
                                ApplicationManager.getApplication().invokeLater(() -> {
                                    ToolWindow tw = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
                                    if (tw != null && !tw.isVisible()) {
                                        tw.show();
                                    }
                                });
                            }
                        }
                    }

                    @Override
                    public void processTerminated(@NotNull ProcessEvent event) {
                        int exitCode = event.getExitCode();
                        if (exitCode != 0) {
                            BbjServerService service = BbjServerService.getInstance(project);
                            service.logToConsole("[" + getRunMode() + "] Process exited with code " + exitCode, ConsoleViewContentType.ERROR_OUTPUT);
                        }
                    }
                });

                handler.startNotify();
                logInfo(project, "[" + getRunMode() + "] Launched " + file.getName());
            } catch (ExecutionException ex) {
                logError(project, "Failed to launch: " + ex.getMessage());
            }
        });
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        boolean isBbjFile = false;
        if (file != null) {
            String ext = file.getExtension();
            isBbjFile = ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src") || ext.equals("bbx"));
        }

        // Only enable run actions when language server is connected
        boolean serverReady = false;
        if (project != null && isBbjFile) {
            BbjServerService service = BbjServerService.getInstance(project);
            com.redhat.devtools.lsp4ij.ServerStatus status = service.getCurrentStatus();
            serverReady = status == com.redhat.devtools.lsp4ij.ServerStatus.started;
        }

        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile && serverReady);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }

    /**
     * Validates BBj environment before running: checks that BBj Home is configured,
     * directory exists, and executable is found. Logs errors to LS log window if validation fails.
     *
     * @param project the current project
     * @return true if validation passes, false otherwise
     */
    protected boolean validateBeforeRun(@NotNull Project project) {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String bbjHomePath = state.bbjHomePath;

        // Check BBj Home is configured
        if (bbjHomePath == null || bbjHomePath.isEmpty()) {
            logError(project, "BBj Home is not configured. Set it in Settings > Languages & Frameworks > BBj.");
            return false;
        }

        // Check BBj Home directory exists
        Path bbjHomeDir = Paths.get(bbjHomePath);
        if (!Files.isDirectory(bbjHomeDir)) {
            logError(project, "BBj Home directory does not exist: " + bbjHomePath);
            return false;
        }

        // Check BBj executable exists
        String executablePath = getBbjExecutablePath();
        if (executablePath == null) {
            logError(project, "BBj executable not found in " + bbjHomePath + "/bin/. Verify your BBj installation.");
            return false;
        }

        return true;
    }

    /**
     * Returns the BBj executable path from settings.
     * Uses java.nio.file.Files API to handle symbolic links correctly.
     *
     * @return absolute path to bbj executable, or null if not found
     */
    @Nullable
    protected String getBbjExecutablePath() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String bbjHome = state.bbjHomePath;

        if (bbjHome == null || bbjHome.isEmpty()) {
            return null;
        }

        // Try bin/bbj (unix) or bin/bbj.exe (windows)
        String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
        Path executablePath = Paths.get(bbjHome, "bin", exeName);

        if (Files.exists(executablePath) && Files.isRegularFile(executablePath) && Files.isExecutable(executablePath)) {
            return executablePath.toAbsolutePath().toString();
        }

        // Try direct path without bin/ prefix (some installations differ)
        executablePath = Paths.get(bbjHome, exeName);
        if (Files.exists(executablePath) && Files.isRegularFile(executablePath) && Files.isExecutable(executablePath)) {
            return executablePath.toAbsolutePath().toString();
        }

        return null;
    }

    /**
     * Returns the classpath argument from settings, formatted for BBj command line.
     *
     * @return "-CP<entry>" if classpath is configured, or null if empty
     */
    @Nullable
    protected String getClasspathArg() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String entry = state.classpathEntry;

        if (entry == null || entry.isEmpty()) {
            return null;
        }

        return "-CP" + entry;
    }

    /**
     * Returns the path to the bundled web.bbj runner script.
     * This file is bundled at lib/tools/web.bbj relative to the plugin installation.
     *
     * @return absolute path to web.bbj, or null if not found
     */
    @Nullable
    protected String getWebBbjPath() {
        try {
            com.intellij.ide.plugins.PluginManagerCore pluginManagerCore = com.intellij.ide.plugins.PluginManagerCore.INSTANCE;
            com.intellij.ide.plugins.IdeaPluginDescriptor plugin = pluginManagerCore.getPlugin(
                com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj")
            );
            if (plugin == null) {
                return null;
            }
            java.nio.file.Path webBbjPath = plugin.getPluginPath().resolve("lib/tools/web.bbj");
            if (!java.nio.file.Files.exists(webBbjPath)) {
                return null;
            }
            return webBbjPath.toString();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Returns the path to the bundled em-validate-token.bbj script.
     * This file is bundled at lib/tools/em-validate-token.bbj relative to the plugin installation.
     *
     * @return absolute path to em-validate-token.bbj, or null if not found
     */
    @Nullable
    private String getEmValidateBbjPath() {
        try {
            com.intellij.openapi.extensions.PluginId pluginId = com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj");
            if (pluginId == null) {
                return null;
            }
            com.intellij.ide.plugins.IdeaPluginDescriptor plugin = com.intellij.ide.plugins.PluginManagerCore.getPlugin(pluginId);
            if (plugin == null) {
                return null;
            }
            java.nio.file.Path emValidatePath = plugin.getPluginPath().resolve("lib/tools/em-validate-token.bbj");
            return java.nio.file.Files.exists(emValidatePath) ? emValidatePath.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Validate a token server-side against EM by running em-validate-token.bbj.
     * Returns true if token is valid, false otherwise.
     *
     * @param project the current project
     * @param token the JWT token to validate
     * @return true if valid, false otherwise
     */
    protected boolean validateTokenServerSide(@NotNull Project project, @NotNull String token) {
        try {
            String bbjPath = getBbjExecutablePath();
            if (bbjPath == null) {
                return false;
            }

            String emValidatePath = getEmValidateBbjPath();
            if (emValidatePath == null) {
                return false;
            }

            // Create temp file for BBj output
            Path tmpFile = Files.createTempFile("bbj-em-validate-", ".tmp");
            try {
                // Build command: bbj -q em-validate-token.bbj - <token> <tmpFile>
                GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
                cmd.addParameter("-q");
                cmd.addParameter(emValidatePath);
                cmd.addParameter("-");
                cmd.addParameter(token);
                cmd.addParameter(tmpFile.toString());

                // Execute with 10s timeout
                com.intellij.execution.process.CapturingProcessHandler handler =
                    new com.intellij.execution.process.CapturingProcessHandler(cmd);
                com.intellij.execution.process.ProcessOutput output = handler.runProcess(10000);

                // Read result from temp file
                String result = Files.readString(tmpFile).trim();

                // Return true only if output is "VALID"
                return "VALID".equals(result);
            } finally {
                try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            // On any error, consider token invalid
            return false;
        }
    }

    /**
     * Returns the config.bbx path argument from settings, formatted for BBj command line.
     *
     * @return "-c<path>" if configPath is configured, or null if empty
     */
    @Nullable
    protected String getConfigPathArg() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String configPath = state.configPath;

        if (configPath == null || configPath.isEmpty()) {
            return null;
        }

        return "-c" + configPath;
    }

    /**
     * Returns the config.bbx path from settings.
     *
     * @return config path string, or empty string if not configured
     */
    @NotNull
    protected String getConfigPath() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String configPath = state.configPath;
        return (configPath != null) ? configPath : "";
    }

    /**
     * Auto-saves all open documents if the setting is enabled.
     */
    protected void autoSaveIfNeeded() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        if (state.autoSaveBeforeRun) {
            FileDocumentManager.getInstance().saveAllDocuments();
        }
    }

    /**
     * Logs an error message to the LS log window and auto-shows the window.
     *
     * @param project the current project
     * @param message the error message to display
     */
    protected void logError(@NotNull Project project, @NotNull String message) {
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole(message, ConsoleViewContentType.ERROR_OUTPUT);

        // Auto-show log window on error
        ApplicationManager.getApplication().invokeLater(() -> {
            ToolWindow tw = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
            if (tw != null && !tw.isVisible()) {
                tw.show();
            }
        });
    }

    /**
     * Logs an info message to the LS log window.
     *
     * @param project the current project
     * @param message the info message to display
     */
    protected void logInfo(@NotNull Project project, @NotNull String message) {
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole(message, ConsoleViewContentType.SYSTEM_OUTPUT);
    }

    /**
     * Builds the command line for launching the BBj program.
     * Subclasses implement this to provide mode-specific command line arguments.
     *
     * @param file the BBj file to execute
     * @param project the current project
     * @return the command line to execute, or null if it cannot be built (error should be shown)
     */
    @Nullable
    protected abstract GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project);

    /**
     * Returns the run mode name for success messages (e.g., "GUI", "BUI", "DWC").
     *
     * @return the run mode name
     */
    @NotNull
    protected abstract String getRunMode();
}
