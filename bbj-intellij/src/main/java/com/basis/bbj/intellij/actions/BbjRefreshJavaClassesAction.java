package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshFlow;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ui.ConsoleViewContentType;
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
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            if (result.outcome() == JavaClassesRefreshFlow.Outcome.REFRESHED) {
                BbjServerService.getInstance(project)
                    .logToConsole("Java classes refreshed", ConsoleViewContentType.SYSTEM_OUTPUT);
            } else {
                BbjServerService.getInstance(project)
                    .logToConsole("Java class refresh outcome: " + result.outcome(), ConsoleViewContentType.ERROR_OUTPUT);
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
