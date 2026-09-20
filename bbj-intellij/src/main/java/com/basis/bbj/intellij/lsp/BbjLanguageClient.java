package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.basis.bbj.intellij.config.ConfigModels.ConfigReloadNotification;
import com.basis.bbj.intellij.config.ConfigModels.ResolvedConfigPathResult;
import com.basis.bbj.intellij.config.ConfigReloadPresentation;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.google.gson.JsonObject;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.ServerStatus;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * BBj language client implementation.
 * Provides initialization options (BBj home, classpath) to the language server
 * and handles server status changes.
 */
public final class BbjLanguageClient extends LanguageClientImpl {

    public BbjLanguageClient(@NotNull Project project) {
        super(project);
    }

    @Override
    public @Nullable Object createSettings() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        JsonObject settings = new JsonObject();
        settings.addProperty("home", state.bbjHomePath);
        settings.addProperty("classpath", state.classpathEntry);
        settings.addProperty("logLevel", state.logLevel);
        return settings;
    }

    @Override
    public void handleServerStatusChanged(ServerStatus serverStatus) {
        super.handleServerStatusChanged(serverStatus);
        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            BbjServerService service = BbjServerService.getInstance(project);
            service.logToConsole("Server status: " + serverStatus, com.intellij.execution.ui.ConsoleViewContentType.SYSTEM_OUTPUT);
            service.updateStatus(serverStatus);
        });
    }

    /**
     * Receives the pushed resolved config path (see
     * {@code bbj-vscode/src/language/bbj-notifications.ts}). LSP4IJ hands this client instance to
     * LSP4J's launcher as the local service, and LSP4J reflects over the concrete class to find
     * supported methods, so declaring the method directly on this class is what makes the
     * notification reachable -- no extra registration exists or is needed. The cache write is
     * synchronous and outside any {@code invokeLater} block: it is cheap and must be visible to
     * indexing threads immediately. Only the balloon warning is deferred behind the
     * project-disposed guard, mirroring {@link #handleServerStatusChanged}.
     */
    @JsonNotification("bbj/resolvedConfigPath")
    public void resolvedConfigPath(ResolvedConfigPathResult result) {
        BbjConfigPathService.getInstance().update(result);

        if (result == null || result.path == null || result.exists) {
            return;
        }
        if (!BbjConfigPathService.getInstance().shouldWarnOnce(result.path)) {
            return;
        }

        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            NotificationGroupManager.getInstance()
                .getNotificationGroup("BBj Language Server")
                .createNotification(
                    "BBj config file not found",
                    "No prefixes were loaded from: " + result.path,
                    NotificationType.WARNING)
                .notify(project);
        });
    }

    /**
     * Receives the pushed config-reload notification (see
     * {@code bbj-vscode/src/language/config-reload-notification.ts}). LSP4IJ hands this client
     * instance to LSP4J's launcher as the local service, and LSP4J reflects over the concrete
     * class to find supported methods, so declaring the method directly on this class is what
     * makes the notification reachable -- no extra registration exists or is needed. Passing
     * {@link BbjServerService#RESTART_DEBOUNCE_MS} here is what makes a settings-apply restart
     * and a config reload collapse into a single restart through the same coalescing gate.
     */
    @JsonNotification("bbj/configReloadRequired")
    public void configReloadRequired(ConfigReloadNotification result) {
        if (result == null) {
            return;
        }
        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        BbjServerService service = BbjServerService.getInstance(project);
        service.setRestartReason(result.reason);
        service.logToConsole(
            ConfigReloadPresentation.consoleLine(result.path, result.reason),
            com.intellij.execution.ui.ConsoleViewContentType.SYSTEM_OUTPUT);
        service.requestRestart(BbjServerService.RESTART_DEBOUNCE_MS);
    }

    /**
     * Receives the pushed BBjCPL-availability notification (see
     * {@code bbj-vscode/src/language/bbj-notifications.ts}), sent once per session. LSP4IJ hands
     * this client instance to LSP4J's launcher as the local service, and LSP4J reflects over the
     * concrete class to find supported methods, so declaring the method directly on this class is
     * what makes the notification reachable -- no extra registration exists or is needed. IntelliJ
     * deliberately surfaces nothing for this notification: the method exists only so the vendor
     * stops logging an unsupported-notification warning on every server start.
     */
    @JsonNotification("bbj/bbjcplAvailability")
    public void bbjcplAvailability(Object result) {
    }
}
