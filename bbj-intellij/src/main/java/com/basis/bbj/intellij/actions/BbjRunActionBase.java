package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.OSProcessHandler;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.io.File;

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

        // Build command line (subclass responsibility)
        GeneralCommandLine cmd = buildCommandLine(file, project);
        if (cmd == null) {
            // Error already shown by subclass
            return;
        }

        // Execute the command
        try {
            OSProcessHandler handler = new OSProcessHandler(cmd);
            handler.startNotify();
            showSuccess(project, file.getName(), getRunMode());
        } catch (ExecutionException ex) {
            showError(project, "Failed to launch: " + ex.getMessage());
        }
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

        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }

    /**
     * Returns the BBj executable path from settings.
     * Checks both that bbjHomePath is configured and that the executable exists.
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

        String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
        File executable = new File(bbjHome, "bin/" + exeName);

        if (!executable.exists() || !executable.isFile()) {
            return null;
        }

        return executable.getAbsolutePath();
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
                com.intellij.openapi.extensions.PluginId.getId("com.basis.bbj.intellij")
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
     * Auto-saves all open documents if the setting is enabled.
     */
    protected void autoSaveIfNeeded() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        if (state.autoSaveBeforeRun) {
            FileDocumentManager.getInstance().saveAllDocuments();
        }
    }

    /**
     * Shows an error notification balloon.
     *
     * @param project the current project
     * @param message the error message to display
     */
    protected void showError(@NotNull Project project, @NotNull String message) {
        NotificationGroupManager.getInstance()
                .getNotificationGroup("BBj Language Server")
                .createNotification(message, NotificationType.ERROR)
                .notify(project);
    }

    /**
     * Shows a brief success notification.
     *
     * @param project the current project
     * @param fileName the name of the file being launched
     * @param mode the run mode (GUI, BUI, DWC)
     */
    protected void showSuccess(@NotNull Project project, @NotNull String fileName, @NotNull String mode) {
        NotificationGroupManager.getInstance()
                .getNotificationGroup("BBj Language Server")
                .createNotification("Launched " + fileName + " (" + mode + ")", NotificationType.INFORMATION)
                .notify(project);
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
