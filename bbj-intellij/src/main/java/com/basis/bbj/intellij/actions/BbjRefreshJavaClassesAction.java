package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshFlow;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshPresenter;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshPresenter.Presentation;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.TimeUnit;

/**
 * Tools menu action to refresh Java classes cache in the BBj language server. Sends the
 * language server's existing targeted {@code bbj/refreshJavaClasses} request from a background
 * task instead of restarting the whole server, so diagnostics, completion, hover and the
 * Structure View stay online while the Java class cache reloads (#632).
 */
public final class BbjRefreshJavaClassesAction extends AnAction {

    public BbjRefreshJavaClassesAction() {
        super("Refresh Java Classes", "Reload Java classpath and clear cached class information", null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        new Task.Backgroundable(project, "Refreshing Java classes…", false) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                ApplicationManager.getApplication().assertIsNonDispatchThread();

                JavaClassesRefreshFlow.Result result = JavaClassesRefreshFlow.run(seconds -> {
                    BbjComposerServer server = BbjComposerService.server(project).get(seconds, TimeUnit.SECONDS);
                    if (server == null) {
                        return null;
                    }
                    return server.refreshJavaClasses().get(seconds, TimeUnit.SECONDS);
                }, JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS);

                render(project, result);
            }
        }.queue();
    }

    private static void render(@NotNull Project project, JavaClassesRefreshFlow.Result result) {
        Presentation presentation = JavaClassesRefreshPresenter.present(result.outcome(), result.detail());

        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }

            BbjServerService.getInstance(project).logToConsole(presentation.consoleLine,
                presentation.error ? ConsoleViewContentType.ERROR_OUTPUT : ConsoleViewContentType.SYSTEM_OUTPUT);

            if (presentation.balloon) {
                // A failed refresh leaves the previous class cache in place, so this is a
                // warning rather than an error.
                Notification notification = NotificationGroupManager.getInstance()
                    .getNotificationGroup("BBj Language Server")
                    .createNotification(presentation.title, presentation.body, NotificationType.WARNING);
                if (presentation.offerRestart) {
                    notification.addAction(new NotificationAction("Restart language server") {
                        @Override
                        public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                            BbjServerService.getInstance(project).requestRestart(0);
                            n.expire();
                        }
                    });
                }
                notification.notify(project);
            }
        });
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        boolean enabled = false;
        if (project != null) {
            ServerStatus status = BbjServerService.getInstance(project).getCurrentStatus();
            enabled = status == ServerStatus.started;
        }
        e.getPresentation().setEnabledAndVisible(enabled);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
