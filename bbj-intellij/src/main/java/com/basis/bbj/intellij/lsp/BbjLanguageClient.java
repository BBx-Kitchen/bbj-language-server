package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.basis.bbj.intellij.config.ConfigModels.ConfigReloadNotification;
import com.basis.bbj.intellij.config.ConfigModels.ResolvedConfigPathResult;
import com.basis.bbj.intellij.config.ConfigReloadPresentation;
import com.basis.bbj.intellij.denum.DenumDiagnosticsPresenter;
import com.basis.bbj.intellij.denum.DenumModels;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.google.gson.JsonObject;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.redhat.devtools.lsp4ij.ServerStatus;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * BBj language client implementation.
 * Provides initialization options (BBj home, classpath) to the language server, and logs status
 * changes to the console. The status feed that drives {@code BbjServerService} runs from the
 * client-features hook in {@link BbjLanguageServerFactory}, not from this class -- LSP4IJ nulls
 * the language client before publishing a stopped status on certain disconnects, while it always
 * calls the client features.
 */
public final class BbjLanguageClient extends LanguageClientImpl {

    /** Set while an open-settings request is queued or its dialog is showing. */
    private final AtomicBoolean openFormatterSettingsPending = new AtomicBoolean(false);

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
     * Receives the pushed DENUM diagnostics list (see
     * {@code bbj-vscode/src/language/denum-notifications.ts}) and prints it as one block into the
     * "BBj Language Server" console. LSP4IJ hands this client instance to LSP4J's launcher as the
     * local service, and LSP4J reflects over the concrete class to find supported methods, so
     * declaring the method directly on this class is what makes the notification reachable -- no
     * extra registration exists or is needed. The block is plain text: no line is a link and no
     * payload field is ever read as a command or a path to open. The notification never shows,
     * activates or focuses the tool window; revealing it is the user's choice, made through the
     * server's Show button (see {@link #showDenumDiagnostics}).
     */
    @JsonNotification("bbj/denumDiagnostics")
    public void denumDiagnostics(DenumModels.DenumDiagnosticsParams params) {
        List<DenumDiagnosticsPresenter.Line> lines = DenumDiagnosticsPresenter.present(params);
        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            ensureLogConsole(project);
            BbjServerService service = BbjServerService.getInstance(project);
            for (DenumDiagnosticsPresenter.Line line : lines) {
                service.logToConsole(line.text(),
                    line.error() ? ConsoleViewContentType.ERROR_OUTPUT : ConsoleViewContentType.NORMAL_OUTPUT);
            }
        });
    }

    /**
     * Receives the pushed request to reveal the DENUM diagnostics list (see
     * {@code bbj-vscode/src/language/denum-notifications.ts}). LSP4IJ hands this client instance to
     * LSP4J's launcher as the local service, and LSP4J reflects over the concrete class to find
     * supported methods, so declaring the method directly on this class is what makes the
     * notification reachable -- no extra registration exists or is needed. It reveals the list the
     * previous {@code bbj/denumDiagnostics} notification printed; the server sends that list before
     * it shows the Show button. The server sends no params, so the argument is null and is never
     * read. The window is shown without taking keyboard focus, so the editor keeps it.
     */
    @JsonNotification("bbj/showDenumDiagnostics")
    public void showDenumDiagnostics(Object ignoredPayload) {
        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            ToolWindow toolWindow = ensureLogConsole(project);
            if (toolWindow == null) {
                return;
            }
            toolWindow.show();
            BbjServerService.getInstance(project).scrollConsoleToEnd();
        });
    }

    /**
     * Receives the server's request to open the formatter settings (see
     * {@code bbj-vscode/src/language/format-settings-notification.ts}). The server sends it when the
     * user picks Open Settings on an invalid-settings warning. Declaring the method on this class is
     * what makes it reachable, as for the notifications above. The payload carries setting names
     * only and is deliberately ignored, so no name the server sends can become a path, a command or
     * a link: the handler opens the fixed BBj settings page, where the Formatter section sits near
     * the top.
     */
    @JsonNotification("bbj/openFormatterSettings")
    public void openFormatterSettings(Object ignoredKeys) {
        Project project = getProject();
        if (project.isDisposed()) {
            return;
        }
        // Coalesce repeated requests: the dialog is modal, so every further click on Open Settings
        // would otherwise queue another dialog behind it that opens as soon as this one closes.
        if (!openFormatterSettingsPending.compareAndSet(false, true)) {
            return;
        }
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                if (project.isDisposed()) {
                    return;
                }
                ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
            } finally {
                openFormatterSettingsPending.set(false);
            }
        });
    }

    /**
     * Makes sure the "BBj Language Server" console exists and returns its tool window, or null
     * when the window is not registered. The console is created lazily, the first time the tool
     * window's content is asked for, and {@link BbjServerService#logToConsole} drops text until it
     * exists; asking for the content manager creates the console without showing the window. Call
     * on the EDT.
     */
    private static @Nullable ToolWindow ensureLogConsole(@NotNull Project project) {
        ToolWindow toolWindow = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
        if (toolWindow != null) {
            toolWindow.getContentManager();
        }
        return toolWindow;
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
