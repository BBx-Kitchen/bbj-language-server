package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.config.ConfigReloadPresentation;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.util.messages.MessageBusConnection;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

/**
 * Status bar widget displaying BBj language server state.
 * Shows colored icon + text label, opens popup menu on click.
 */
public final class BbjStatusBarWidget extends BbjStatusBarWidgetBase<ServerStatus> {

    private static final String ID = "BbjLanguageServerStatus";

    public BbjStatusBarWidget(@NotNull Project project) {
        super(project);
    }

    @Override
    protected String widgetId() {
        return ID;
    }

    @Override
    protected void subscribeToStatusTopic(@NotNull MessageBusConnection connection) {
        connection.subscribe(BbjServerService.BbjServerStatusListener.TOPIC, this::updateStatus);
    }

    @Override
    protected ServerStatus currentStatus() {
        return BbjServerService.getInstance(project).getCurrentStatus();
    }

    @Override
    protected Icon iconFor(ServerStatus status) {
        switch (status) {
            case started:
                return BbjIcons.STATUS_READY;
            case starting:
                return BbjIcons.STATUS_STARTING;
            case stopping:
                return BbjIcons.STATUS_STARTING;
            case stopped:
                return BbjIcons.STATUS_ERROR;
            default:
                return BbjIcons.STATUS_ERROR;
        }
    }

    @Override
    protected String textFor(ServerStatus status) {
        switch (status) {
            case started:
                return "BBj: Ready";
            case starting:
                return "BBj: Starting";
            case stopping:
                return "BBj: Stopping";
            case stopped:
                return "BBj: Stopped";
            default:
                return "BBj: Error";
        }
    }

    @Override
    protected String tooltipFor(ServerStatus status, String text) {
        return ConfigReloadPresentation.widgetTooltip(
                text, ConfigReloadPresentation.reasonLabel(
                        BbjServerService.getInstance(project).getRestartReason()));
    }

    @Override
    protected void addPopupItems(JPopupMenu popup) {
        // Restart Server action
        JMenuItem restartItem = new JMenuItem("Restart Server");
        restartItem.addActionListener(event -> BbjServerService.getInstance(project).requestRestart(0));
        popup.add(restartItem);

        // Open Settings action
        addOpenSettingsItem(popup);

        // Show Server Log action
        JMenuItem logItem = new JMenuItem("Show Server Log");
        logItem.addActionListener(event -> {
            var toolWindow = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
            if (toolWindow != null) {
                toolWindow.show();
            }
        });
        popup.add(logItem);
    }
}
