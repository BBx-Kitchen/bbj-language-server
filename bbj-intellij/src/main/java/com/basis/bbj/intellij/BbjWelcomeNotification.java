package com.basis.bbj.intellij;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.StartupActivity;
import org.jetbrains.annotations.NotNull;

/**
 * Shows a welcome notification balloon on first launch after plugin installation.
 * Provides quick access to settings configuration.
 */
public final class BbjWelcomeNotification implements StartupActivity, DumbAware {

    private static final String WELCOME_SHOWN_KEY = "com.basis.bbj.intellij.welcomeShown";

    @Override
    public void runActivity(@NotNull Project project) {
        PropertiesComponent properties = PropertiesComponent.getInstance();

        // Check if welcome notification has already been shown
        if (properties.getBoolean(WELCOME_SHOWN_KEY, false)) {
            return;
        }

        // Create welcome notification
        Notification notification = new Notification(
                "BBj Language Server",
                "BBj Language Support Installed",
                "Configure your BBj Home path and Node.js to enable all language features.",
                NotificationType.INFORMATION
        );

        // Add "Open Settings" action
        notification.addAction(new NotificationAction("Open Settings") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
                ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
                notification.expire();
            }
        });

        // Add "Dismiss" action
        notification.addAction(new NotificationAction("Dismiss") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
                notification.expire();
            }
        });

        // Show notification
        Notifications.Bus.notify(notification, project);

        // Mark as shown
        properties.setValue(WELCOME_SHOWN_KEY, true);
    }
}
