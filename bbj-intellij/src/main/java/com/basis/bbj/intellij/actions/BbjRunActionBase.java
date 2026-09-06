package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.basis.bbj.intellij.config.ConfigPaths;
import com.basis.bbj.intellij.lsp.BbjProcessSecretEnv;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.OSProcessHandler;
import com.intellij.execution.process.ProcessListener;
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
import com.intellij.openapi.ui.Messages;
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

        // Build the command line and launch it off EDT to avoid UI freezing.
        // buildCommandLine() (subclass responsibility) may perform blocking EM token
        // server-side validation (validateTokenServerSide, up to 10s) and/or EM login
        // (BbjEMLoginAction.performLogin, up to 15s) -- both are synchronous network I/O
        // and must not run on the EDT (CR-02). validateBeforeRun() also performs
        // blocking filesystem existence/executable checks, so it is run here too rather
        // than synchronously on the EDT ahead of this dispatch.
        ApplicationManager.getApplication().executeOnPooledThread(() -> {
            ApplicationManager.getApplication().assertIsNonDispatchThread();
            if (!validateBeforeRun(project)) {
                // Error already shown by validateBeforeRun (via logError, which
                // dispatches its own invokeLater back to the EDT).
                return;
            }
            GeneralCommandLine cmd = buildCommandLine(file, project);
            if (cmd == null) {
                // Error already shown by subclass
                return;
            }
            try {
                OSProcessHandler handler = new OSProcessHandler(cmd);

                // Attach ProcessListener BEFORE startNotify() to capture all output
                handler.addProcessListener(new ProcessListener() {
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

        // "--" is the EM Config sentinel meaning "not configured" — treat as no classpath
        if ("--".equals(entry)) {
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
            com.intellij.ide.plugins.IdeaPluginDescriptor plugin = com.intellij.ide.plugins.PluginManager.getInstance().findEnabledPlugin(
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
            com.intellij.ide.plugins.IdeaPluginDescriptor plugin = com.intellij.ide.plugins.PluginManager.getInstance().findEnabledPlugin(pluginId);
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

            // Create temp file for BBj output, owner-only for its whole life
            Path tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-validate-", ".tmp");
            try {
                // Build command: bbj -q em-validate-token.bbj - <tmpFile>; the token
                // travels on the environment (BbjProcessSecretEnv), never as a parameter.
                BbjProcessSecretEnv.Invocation invocation =
                        BbjProcessSecretEnv.emValidateToken(emValidatePath, token, tmpFile.toString());
                GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
                cmd.addParameters(invocation.parameters());
                cmd.withEnvironment(invocation.environment());

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
     * Validate a token against EM, consulting the trust-window cache first (#542). Within
     * {@link TokenValidationCache#TRUST_WINDOW_MS} of a prior successful validation for the
     * same token, this returns true without spawning the server-side subprocess at all;
     * otherwise it delegates to {@link #validateTokenServerSide} and records success into the
     * cache. Callers must still run the client-side expiry check first -- this method makes no
     * expiry decision of its own.
     *
     * @param project the current project
     * @param token   the JWT token to validate
     * @return true if trusted or freshly validated, false otherwise
     */
    protected boolean validateTokenTrusted(@NotNull Project project, @NotNull String token) {
        return TokenValidationCache.SESSION.validateThrough(token, () -> validateTokenServerSide(project, token));
    }

    /**
     * Returns the resolved config path argument, formatted for the BBj command line.
     *
     * The value comes from {@link BbjConfigPathService#activeConfigPath()} rather than the raw
     * setting, and {@link ConfigPaths#configPathArg(String)} refuses the EM Config sentinel the
     * same way {@link #getClasspathArg()} refuses it for the classpath -- the plain GUI run has
     * no downstream script to absorb a sentinel that reaches the command line.
     *
     * @return "-c<path>" when a real path is resolved, or null otherwise
     */
    @Nullable
    protected String getConfigPathArg() {
        return ConfigPaths.configPathArg(BbjConfigPathService.getInstance().activeConfigPath());
    }

    /**
     * Returns the resolved config path.
     *
     * The web.bbj registration stub writes this into the EM app's config file, so it must be a
     * real path: leaving it empty makes BBj report the "--" sentinel, which registers an unusable
     * config (issue #382). This reads the one cached resolved answer rather than deriving a
     * BBj-home-based default itself -- that derivation belongs to the language server alone.
     *
     * @return the resolved config path, or empty string when none is available
     */
    @NotNull
    protected String getConfigPath() {
        return BbjConfigPathService.getInstance().activeConfigPath();
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
     * Shared body for the BUI and DWC web-run actions: resolves the BBj executable and bundled
     * web.bbj runner, derives the file's name/programme/working directory, acquires and validates
     * an EM login token (prompting/re-prompting as needed), resolves the classpath and config
     * path, and assembles the command line that spawns {@code bbj -q -WD<webRunnerDir>
     * <webBbjPath> - <clientType> <name> <programme> <workingDir> <classpath> [<configPath>]}
     * with the token traveling on the environment ({@link BbjProcessSecretEnv}), never as a
     * parameter. Only the ARGV client-type value and its login/expiry dialog copy differ between
     * the BUI and DWC actions, both supplied by the caller, so this body stays identical between
     * them rather than hand-duplicated in each subclass.
     *
     * @param file the BBj file to execute
     * @param project the current project
     * @param clientType the ARGV client-type value {@code BbjProcessSecretEnv.webRun} sends --
     *     {@code "BUI"} or {@code "DWC"}; also substituted into the login/expiry dialog copy
     * @return the assembled command line, or null if it cannot be built (error already shown)
     */
    @Nullable
    protected GeneralCommandLine buildWebRunCommandLine(@NotNull VirtualFile file, @NotNull Project project, @NotNull String clientType) {
        // Get BBj executable path (validation already done in actionPerformed)
        String bbjPath = getBbjExecutablePath();

        // Get web.bbj path
        String webBbjPath = getWebBbjPath();
        if (webBbjPath == null) {
            logError(project, "web.bbj runner not found in plugin bundle");
            return null;
        }

        // Get web.bbj directory (working directory for the runner)
        java.io.File webBbjFile = new java.io.File(webBbjPath);
        String webRunnerDir = webBbjFile.getParent();

        // Derive name (filename without extension)
        String fileName = file.getName();
        String name = fileName.contains(".")
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;

        // Programme is the filename only (basename)
        String programme = fileName;

        // Working directory is the file's parent directory
        String workingDir = file.getParent().getPath();

        // Get token from PasswordSafe, auto-prompt login if not stored
        String token = BbjEMTokenStore.getToken();
        if (token == null || token.isEmpty()) {
            int result = showYesNoOnEdt(
                project,
                "EM login required for " + clientType + ". Login now?",
                "Enterprise Manager Login Required"
            );
            if (result == Messages.YES) {
                boolean loginOk = BbjEMLoginAction.performLogin(project);
                if (loginOk) {
                    token = BbjEMTokenStore.getToken();
                }
            }
            if (token == null || token.isEmpty()) {
                logError(project, "EM login required for " + clientType + " run. Use Tools > Login to Enterprise Manager.");
                return null;
            }
        }

        // Client-side JWT expiry check (fast path)
        if (BbjEMTokenStore.isTokenExpired(token)) {
            BbjEMTokenStore.deleteToken();
            token = null;
        }

        // Server-side validation now runs only outside the trust window (#542); a call inside
        // the window is a hit and skips the subprocess entirely.
        if (token != null && !validateTokenTrusted(project, token)) {
            BbjEMTokenStore.deleteToken();
            token = null;
        }

        // If token was invalidated, re-prompt login
        if (token == null) {
            int result = showYesNoOnEdt(
                project,
                "EM token expired or invalid. Login again?",
                "Enterprise Manager Token Invalid"
            );
            if (result == Messages.YES) {
                boolean loginOk = BbjEMLoginAction.performLogin(project);
                if (loginOk) {
                    token = BbjEMTokenStore.getToken();
                }
            }
            if (token == null || token.isEmpty()) {
                logError(project, "EM login required for " + clientType + " run.");
                return null;
            }
        }

        // Get classpath from settings
        // "--" is the EM Config sentinel meaning "not configured" — treat as empty
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String classpath = (state.classpathEntry != null && !"--".equals(state.classpathEntry)) ? state.classpathEntry : "";

        // Get config path - only add if configured (web.bbj handles absent ARGV(6) gracefully)
        String configPath = getConfigPath();
        if (configPath.isBlank()) {
            logError(project, "No BBj config file is configured. Set it in Settings > Languages & Frameworks > BBj.");
            return null;
        }

        // Build command line: bbj -q -WD<webRunnerDir> <webBbjPath> - <clientType> <name>
        // <programme> <workingDir> <classpath> [<configPath>]; the token travels on the
        // environment (BbjProcessSecretEnv), never as a parameter.
        BbjProcessSecretEnv.Invocation invocation = BbjProcessSecretEnv.webRun(
                webRunnerDir, webBbjPath, clientType, name, programme, workingDir, classpath, token, configPath);
        GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
        cmd.addParameters(invocation.parameters());
        cmd.withEnvironment(invocation.environment());

        cmd.setWorkDirectory(webRunnerDir);

        return cmd;
    }

    /**
     * Routes a blocking yes/no prompt to the EDT and returns the result to the calling thread.
     * {@link #buildWebRunCommandLine} runs off the EDT (CR-02, see {@link #actionPerformed}
     * above), so this dialog -- like every other {@code Messages.*} call reachable from it --
     * must be explicitly dispatched back to the EDT rather than shown directly from a pooled
     * thread.
     */
    protected static int showYesNoOnEdt(@Nullable Project project, String message, String title) {
        int[] holder = new int[1];
        ApplicationManager.getApplication().invokeAndWait(() ->
                holder[0] = Messages.showYesNoDialog(project, message, title, Messages.getQuestionIcon()));
        return holder[0];
    }

    /**
     * Returns the run mode name for success messages (e.g., "GUI", "BUI", "DWC").
     *
     * @return the run mode name
     */
    @NotNull
    protected abstract String getRunMode();
}
