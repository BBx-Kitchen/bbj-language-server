package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.basis.bbj.intellij.denum.DenumModels.DenumParams;
import com.basis.bbj.intellij.denum.LineNumbering;
import com.basis.bbj.intellij.ui.BbjFileVisibility;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.text.StringUtil;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Sends the language server's denumber request for the file in the editor. The server applies
 * the edit as one undoable change and shows every outcome itself, so this class shows nothing
 * but a transport failure, and it never writes the file to disk, which stays modified for the
 * user to review.
 *
 * <p>The action is enabled only when the editor's BBj program looks line-numbered; a mismatch is
 * harmless because the server answers with its own message.
 */
public final class BbjDenumberAction extends AnAction implements DumbAware {

    /**
     * Above the server's 15-second peer deadline plus its 30-second wait for the editor to apply
     * the edit, since the answer arrives after the edit.
     */
    static final long DENUM_TIMEOUT_SECONDS = 60;

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        VirtualFile file = editor == null ? null : FileDocumentManager.getInstance().getFile(editor.getDocument());

        if (project == null || editor == null || file == null
            || !BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())) {
            e.getPresentation().setEnabledAndVisible(false);
            return;
        }
        e.getPresentation().setVisible(true);
        e.getPresentation().setEnabled(LineNumbering.isLineNumberedSource(
            editor.getDocument().getImmutableCharSequence()));
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        VirtualFile file = editor == null ? null : FileDocumentManager.getInstance().getFile(editor.getDocument());
        if (project == null || editor == null || file == null) {
            return;
        }
        denumber(project, file);
    }

    /**
     * The single path the action and the line-numbered banner share: sends {@code bbj/denum} for
     * the file from a background task and shows nothing unless the request itself fails.
     */
    public static void denumber(@NotNull Project project, @NotNull VirtualFile file) {
        new Task.Backgroundable(project, "Denumbering " + file.getName() + "…", false) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                ApplicationManager.getApplication().assertIsNonDispatchThread();

                String uri;
                try {
                    uri = file.toNioPath().toUri().toString();
                } catch (UnsupportedOperationException ex) {
                    uri = file.getUrl();
                }

                // One deadline covers resolving the server and the request together, so the
                // message below stays true however the time is split between the two.
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(DENUM_TIMEOUT_SECONDS);
                CompletableFuture<?> request = null;
                try {
                    BbjComposerServer server = BbjComposerService.server(project)
                        .get(remainingNanos(deadline), TimeUnit.NANOSECONDS);
                    if (server == null) {
                        failed(project, "the BBj language server is not running");
                        return;
                    }
                    // The server has already applied the edit and shown its own outcome by the
                    // time it answers, so the value is deliberately discarded.
                    request = server.denum(new DenumParams(uri));
                    request.get(remainingNanos(deadline), TimeUnit.NANOSECONDS);
                } catch (TimeoutException ex) {
                    if (request != null) {
                        request.cancel(true);
                    }
                    failed(project, "no answer from the BBj language server within "
                        + DENUM_TIMEOUT_SECONDS + " seconds");
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    failed(project, "interrupted");
                } catch (ExecutionException ex) {
                    failed(project, detailOf(ex));
                } catch (CancellationException ex) {
                    // LSP4IJ cancels its pending requests when the server stops or restarts.
                    failed(project, "the BBj language server was stopped or restarted");
                }
            }
        }.queue();
    }

    private static long remainingNanos(long deadline) {
        return Math.max(0L, deadline - System.nanoTime());
    }

    private static String detailOf(@NotNull ExecutionException ex) {
        Throwable cause = ex.getCause();
        if (cause == null) {
            return ex.getClass().getSimpleName();
        }
        String message = cause.getMessage();
        return message != null ? message : cause.getClass().getSimpleName();
    }

    private static void failed(@NotNull Project project, @Nullable String detail) {
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            NotificationGroupManager.getInstance()
                .getNotificationGroup("BBj Language Server")
                .createNotification(
                    "Denumber failed",
                    StringUtil.escapeXmlEntities(detail == null ? "" : detail),
                    NotificationType.ERROR)
                .notify(project);
        });
    }
}
