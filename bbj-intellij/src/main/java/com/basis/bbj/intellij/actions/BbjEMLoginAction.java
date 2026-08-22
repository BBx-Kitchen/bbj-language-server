package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.lsp.BbjProcessSecretEnv;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.CapturingProcessHandler;
import com.intellij.execution.process.ProcessOutput;
import com.intellij.ide.plugins.PluginManager;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ApplicationNamesInfo;
import com.intellij.openapi.extensions.PluginId;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Action to authenticate with BBj Enterprise Manager and store JWT token.
 * Prompts for credentials, launches em-login.bbj, stores token in PasswordSafe.
 */
public final class BbjEMLoginAction extends AnAction {

    public BbjEMLoginAction() {
        super("Login to Enterprise Manager",
              "Authenticate with BBj Enterprise Manager and store JWT token",
              null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        // Off EDT: performLogin() performs a blocking EM login network call (up to 15s,
        // CapturingProcessHandler.runProcess) and must not run on the EDT (CR-02). Its own
        // credential/result dialogs are individually routed back to the EDT (see
        // showErrorOnEdt/showInfoOnEdt/promptUsername/promptPassword below).
        ApplicationManager.getApplication().executeOnPooledThread(() -> performLogin(project));
    }

    /**
     * Performs the EM login flow programmatically.
     * Shows credential dialog, launches em-login.bbj, stores token.
     *
     * <p>Must be called off the EDT (see {@link #actionPerformed} and the BUI/DWC run
     * actions' {@code buildCommandLine()} callers, both of which now dispatch to a pooled
     * thread) -- the blocking network call this method makes (up to 15s) would otherwise
     * freeze the IDE (CR-02). Each dialog this method shows is individually routed back to
     * the EDT via {@code invokeAndWait}.
     *
     * @param project current project (can be null)
     * @return true if login succeeded and token was stored, false if cancelled or failed
     */
    public static boolean performLogin(@Nullable Project project) {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String bbjHome = state.bbjHomePath;
        if (bbjHome == null || bbjHome.isEmpty()) {
            showErrorOnEdt(
                "Please configure BBj Home in Settings > Languages & Frameworks > BBj",
                "BBj Home Not Set"
            );
            return false;
        }

        // Prompt for credentials
        String username = promptUsername();
        if (username == null || username.isEmpty()) return false;

        String password = promptPassword();
        if (password == null) return false;

        // Find em-login.bbj in plugin bundle
        String emLoginPath = getEMLoginBbjPath();
        if (emLoginPath == null) {
            showErrorOnEdt(
                "em-login.bbj not found in plugin bundle",
                "Login Failed"
            );
            return false;
        }

        // Build BBj executable path
        String os = System.getProperty("os.name", "").toLowerCase();
        String bbjBin = bbjHome + File.separator + "bin" + File.separator +
                        "bbj" + (os.contains("win") ? ".exe" : "");
        Path bbjPath = Path.of(bbjBin);
        try { bbjPath = bbjPath.toRealPath(); } catch (Exception ignored) {}

        if (!Files.isExecutable(bbjPath)) {
            showErrorOnEdt("BBj executable not found: " + bbjBin, "Login Failed");
            return false;
        }

        // Launch em-login.bbj. The temp file is created owner-only before the try block so
        // its cleanup in `finally` covers the entire launch -- process-handler construction
        // and runProcess() included -- matching validateTokenServerSide's shape (WR-02: a
        // finally scoped only around the file read left the file leaked on disk whenever
        // construction/launch itself threw).
        Path tmpFile;
        try {
            // Create temp file for BBj output, owner-only for its whole life: em-login.bbj
            // truncates and writes in place, which preserves the mode set here.
            tmpFile = BbjProcessSecretEnv.createOwnerOnlyFile("bbj-em-login-", ".tmp");
        } catch (Exception ex) {
            showErrorOnEdt("Login failed: " + ex.getMessage(), "EM Login Failed");
            return false;
        }
        try {
            // Client info for EM token payload
            String platform;
            if (os.contains("win")) platform = "Windows";
            else if (os.contains("mac")) platform = "MacOS";
            else platform = "Linux";
            String productName = ApplicationNamesInfo.getInstance().getFullProductName();
            String infoString = productName + " on " + platform + " as " + System.getProperty("user.name");

            // Build the invocation: the username and password travel on the environment
            // (BbjProcessSecretEnv), never as a parameter.
            BbjProcessSecretEnv.Invocation invocation =
                    BbjProcessSecretEnv.emLogin(emLoginPath, username, password, tmpFile.toString(), infoString);
            GeneralCommandLine cmd = new GeneralCommandLine(bbjPath.toString());
            cmd.addParameters(invocation.parameters());
            cmd.withEnvironment(invocation.environment());

            CapturingProcessHandler handler = new CapturingProcessHandler(cmd);
            ProcessOutput output = handler.runProcess(15000); // 15s timeout

            // Read result from temp file
            String stdout = Files.readString(tmpFile).trim();

            if (stdout.startsWith("ERROR:")) {
                showErrorOnEdt(stdout.substring(6), "EM Login Failed");
                return false;
            }

            if (stdout.isEmpty()) {
                showErrorOnEdt(
                    "No token received from EM login",
                    "EM Login Failed"
                );
                return false;
            }

            // Store JWT securely
            BbjEMTokenStore.storeToken(stdout);
            showInfoOnEdt(
                "Successfully logged in to Enterprise Manager",
                "EM Login"
            );
            return true;
        } catch (Exception ex) {
            showErrorOnEdt(
                "Login failed: " + ex.getMessage(),
                "EM Login Failed"
            );
            return false;
        } finally {
            try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
        }
    }

    /** Routes a blocking username prompt to the EDT and returns the result to the calling thread. */
    @Nullable
    private static String promptUsername() {
        String[] holder = new String[1];
        ApplicationManager.getApplication().invokeAndWait(() ->
                holder[0] = Messages.showInputDialog(
                        "Enter EM username:",
                        "Enterprise Manager Login",
                        null,
                        "admin",
                        null
                ));
        return holder[0];
    }

    /** Routes a blocking password prompt to the EDT and returns the result to the calling thread. */
    @Nullable
    private static String promptPassword() {
        String[] holder = new String[1];
        ApplicationManager.getApplication().invokeAndWait(() ->
                holder[0] = Messages.showPasswordDialog(
                        "Enter EM password:",
                        "Enterprise Manager Login"
                ));
        return holder[0];
    }

    /** Shows a modal error dialog on the EDT, blocking the calling (pooled) thread until dismissed. */
    private static void showErrorOnEdt(String message, String title) {
        ApplicationManager.getApplication().invokeAndWait(() -> Messages.showErrorDialog(message, title));
    }

    /** Shows a modal info dialog on the EDT, blocking the calling (pooled) thread until dismissed. */
    private static void showInfoOnEdt(String message, String title) {
        ApplicationManager.getApplication().invokeAndWait(() -> Messages.showInfoMessage(message, title));
    }

    /**
     * Gets the path to em-login.bbj from the plugin bundle.
     * Uses the same pattern as BbjRunActionBase.getWebBbjPath().
     */
    private static String getEMLoginBbjPath() {
        try {
            var pluginId = PluginId.getId("com.basis.bbj");
            var plugin = PluginManager.getInstance().findEnabledPlugin(pluginId);
            if (plugin == null) return null;
            Path emLogin = plugin.getPluginPath().resolve("lib/tools/em-login.bbj");
            return Files.exists(emLogin) ? emLogin.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
