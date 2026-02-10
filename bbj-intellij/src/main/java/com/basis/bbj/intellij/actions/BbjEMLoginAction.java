package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.CapturingProcessHandler;
import com.intellij.execution.process.ProcessOutput;
import com.intellij.ide.plugins.PluginManagerCore;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
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
        performLogin(e.getProject());
    }

    /**
     * Performs the EM login flow programmatically.
     * Shows credential dialog, launches em-login.bbj, stores token.
     * @param project current project (can be null)
     * @return true if login succeeded and token was stored, false if cancelled or failed
     */
    public static boolean performLogin(@Nullable Project project) {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String bbjHome = state.bbjHomePath;
        if (bbjHome == null || bbjHome.isEmpty()) {
            Messages.showErrorDialog(
                "Please configure BBj Home in Settings > Languages & Frameworks > BBj",
                "BBj Home Not Set"
            );
            return false;
        }

        // Prompt for credentials
        String username = Messages.showInputDialog(
            "Enter EM username:",
            "Enterprise Manager Login",
            null,
            "admin",
            null
        );
        if (username == null || username.isEmpty()) return false;

        String password = Messages.showPasswordDialog(
            "Enter EM password:",
            "Enterprise Manager Login"
        );
        if (password == null) return false;

        // Find em-login.bbj in plugin bundle
        String emLoginPath = getEMLoginBbjPath();
        if (emLoginPath == null) {
            Messages.showErrorDialog(
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
            Messages.showErrorDialog("BBj executable not found: " + bbjBin, "Login Failed");
            return false;
        }

        // Launch em-login.bbj
        try {
            // Create temp file for BBj output
            Path tmpFile = Files.createTempFile("bbj-em-login-", ".tmp");

            GeneralCommandLine cmd = new GeneralCommandLine(bbjPath.toString());
            cmd.addParameter("-q");
            cmd.addParameter(emLoginPath);
            cmd.addParameter("-");
            cmd.addParameter(username);
            cmd.addParameter(password);
            cmd.addParameter(tmpFile.toString());

            // Client info for EM token payload
            String platform;
            if (os.contains("win")) platform = "Windows";
            else if (os.contains("mac")) platform = "MacOS";
            else platform = "Linux";
            cmd.addParameter(platform + " IntelliJ IDE");

            CapturingProcessHandler handler = new CapturingProcessHandler(cmd);
            ProcessOutput output = handler.runProcess(15000); // 15s timeout

            // Read result from temp file
            String stdout = "";
            try {
                stdout = Files.readString(tmpFile).trim();
            } finally {
                Files.deleteIfExists(tmpFile);
            }

            if (stdout.startsWith("ERROR:")) {
                Messages.showErrorDialog(stdout.substring(6), "EM Login Failed");
                return false;
            }

            if (stdout.isEmpty()) {
                Messages.showErrorDialog(
                    "No token received from EM login",
                    "EM Login Failed"
                );
                return false;
            }

            // Store JWT securely
            BbjEMTokenStore.storeToken(stdout);
            Messages.showInfoMessage(
                "Successfully logged in to Enterprise Manager",
                "EM Login"
            );
            return true;
        } catch (Exception ex) {
            Messages.showErrorDialog(
                "Login failed: " + ex.getMessage(),
                "EM Login Failed"
            );
            return false;
        }
    }

    /**
     * Gets the path to em-login.bbj from the plugin bundle.
     * Uses the same pattern as BbjRunActionBase.getWebBbjPath().
     */
    private static String getEMLoginBbjPath() {
        try {
            var pluginId = PluginId.getId("com.basis.bbj");
            var plugin = PluginManagerCore.getPlugin(pluginId);
            if (plugin == null) return null;
            Path emLogin = plugin.getPluginPath().resolve("lib/tools/em-login.bbj");
            return Files.exists(emLogin) ? emLogin.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
