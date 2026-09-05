package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerNotices.Notice;
import com.basis.bbj.intellij.composer.ComposerNotices.Severity;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Renders a {@link ComposerNotices.Notice} as a balloon in the existing BBj Language Server
 * notification group (#538) — information for {@code NOT_READY}, warning for
 * {@code STALE_DOCUMENT}, error for {@code REQUEST_FAILED} — and mirrors an error-severity notice
 * to the language-server console. The only IntelliJ-coupled file this plan adds: every decision
 * about what the balloon says lives in {@link ComposerNotices} instead.
 */
public final class ComposerNoticeRenderer {

    private ComposerNoticeRenderer() {}

    /**
     * Renders {@code notice} on the dispatch thread. When the notice carries the
     * {@link ComposerNotices#REOPEN_COMPOSER} remedy and {@code reopen} is non-null, attaches a
     * "Reopen composer" action that relaunches the composer against the current document.
     */
    public static void render(@NotNull Project project, Notice notice, @Nullable Runnable reopen) {
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            NotificationType type = switch (notice.severity) {
                case INFORMATION -> NotificationType.INFORMATION;
                case WARNING -> NotificationType.WARNING;
                case ERROR -> NotificationType.ERROR;
            };
            Notification notification = NotificationGroupManager.getInstance()
                    .getNotificationGroup("BBj Language Server")
                    .createNotification(notice.title, notice.body, type);
            if (ComposerNotices.REOPEN_COMPOSER.equals(notice.remedyActionId) && reopen != null) {
                notification.addAction(new NotificationAction("Reopen composer") {
                    @Override
                    public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                        reopen.run();
                        n.expire();
                    }
                });
            }
            notification.notify(project);

            if (notice.severity == Severity.ERROR) {
                String consoleLine = notice.body.isEmpty() ? notice.title : notice.title + ": " + notice.body;
                BbjServerService.getInstance(project).logToConsole(consoleLine, ConsoleViewContentType.ERROR_OUTPUT);
            }
        });
    }
}
