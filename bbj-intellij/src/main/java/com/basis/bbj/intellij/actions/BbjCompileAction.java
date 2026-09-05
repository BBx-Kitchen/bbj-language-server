package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.basis.bbj.intellij.compile.CompileModels.CompileParams;
import com.basis.bbj.intellij.compile.CompileModels.CompileResult;
import com.basis.bbj.intellij.compile.CompileResultPresenter;
import com.basis.bbj.intellij.compile.CompileResultPresenter.Presentation;
import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

import java.util.Collections;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Action to compile the current BBj file (#571, PARITY-01). Saves the document, sends {@code
 * bbj/compile} to the shared language server from a background task, and shows the result the
 * way VS Code shows its own compile result. No bbjcpl invocation, argument list or option read
 * lives on this side of the request — the language server owns all of that.
 * Only visible when a BBj source file (.bbj, .bbx, .src) is open and the language server is
 * ready. Excludes .bbl files (library files, not user source code per Phase 41 requirements).
 */
public final class BbjCompileAction extends AnAction {

    /**
     * Comfortably above the server's own 30s compile timeout, so a lost response cannot leave
     * the progress indicator up forever.
     */
    private static final long COMPILE_TIMEOUT_SECONDS = 45;

    public BbjCompileAction() {
        super("Compile BBj File", "Compile the current BBj file", BbjIcons.COMPILE);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        if (project == null || file == null) {
            return;
        }

        // Save unconditionally, independent of autoSaveBeforeRun: bbjcpl compiles the file on
        // disk (D-04). This runs on the dispatch thread, where the platform requires a document
        // save to happen -- the only step here that does.
        Document document = FileDocumentManager.getInstance().getDocument(file);
        if (document != null) {
            FileDocumentManager.getInstance().saveDocument(document);
        }

        String fileName = file.getName();

        new Task.Backgroundable(project, "Compiling " + fileName + "…", false) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                ApplicationManager.getApplication().assertIsNonDispatchThread();

                String uri;
                try {
                    uri = file.toNioPath().toUri().toString();
                } catch (UnsupportedOperationException ex) {
                    uri = file.getUrl();
                }

                BbjComposerServer server;
                try {
                    server = BbjComposerService.server(project).get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                } catch (InterruptedException | ExecutionException | TimeoutException ex) {
                    render(project, fileName, CompileResultPresenter.requestFailed(fileName, messageOf(ex)));
                    return;
                }

                if (server == null) {
                    render(project, fileName, CompileResultPresenter.serverUnavailable(fileName));
                    return;
                }

                CompileResult result;
                try {
                    result = server.compile(new CompileParams(uri)).get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                } catch (InterruptedException | ExecutionException | TimeoutException ex) {
                    render(project, fileName, CompileResultPresenter.requestFailed(fileName, messageOf(ex)));
                    return;
                }

                render(project, fileName, CompileResultPresenter.present(
                    fileName, result.success, result.reason, result.message,
                    result.diagnostics != null ? result.diagnostics : Collections.emptyList()));
            }
        }.queue();
    }

    private static String messageOf(Exception ex) {
        String message = ex.getMessage();
        return message != null ? message : ex.getClass().getSimpleName();
    }

    /**
     * Renders a {@link Presentation} on the dispatch thread: a balloon in the "BBj Language
     * Server" notification group, plus -- on failure -- the same text written to the
     * language-server console (D-07). Diagnostics are never turned into editor markers (D-08).
     */
    private static void render(@NotNull Project project, String fileName, Presentation presentation) {
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            Notification notification = NotificationGroupManager.getInstance()
                .getNotificationGroup("BBj Language Server")
                .createNotification(
                    presentation.title,
                    presentation.body,
                    presentation.error ? NotificationType.ERROR : NotificationType.INFORMATION);
            if (presentation.offerSettings) {
                notification.addAction(new NotificationAction("Open Settings") {
                    @Override
                    public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                        ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
                        n.expire();
                    }
                });
            }
            notification.notify(project);

            if (presentation.error) {
                String consoleLine = presentation.body.isEmpty()
                    ? presentation.title
                    : presentation.title + ": " + presentation.body;
                BbjServerService.getInstance(project).logToConsole(consoleLine, ConsoleViewContentType.ERROR_OUTPUT);
            }
        });
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        // Check if current file is a BBj source file
        boolean isBbjFile = false;
        if (file != null) {
            String ext = file.getExtension();
            // Exclude .bbl (library files) per Phase 41 requirements
            // Only include .bbj, .bbx, .src (user source files)
            isBbjFile = ext != null && (ext.equals("bbj") || ext.equals("bbx") || ext.equals("src"));
        }

        // Check if language server is ready
        boolean serverReady = false;
        if (project != null && isBbjFile) {
            BbjServerService service = BbjServerService.getInstance(project);
            com.redhat.devtools.lsp4ij.ServerStatus status = service.getCurrentStatus();
            serverReady = status == com.redhat.devtools.lsp4ij.ServerStatus.started;
        }

        // Only show action when project exists, file is a BBj source file, and server is ready
        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile && serverReady);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
