package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjIcons;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.CustomStatusBarWidget;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.components.JBLabel;
import com.intellij.util.messages.MessageBusConnection;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

/**
 * Status bar widget displaying BBj language server state.
 * Shows colored icon + text label, opens popup menu on click.
 */
public final class BbjStatusBarWidget implements CustomStatusBarWidget {

    private static final String ID = "BbjLanguageServerStatus";
    private final Project project;
    private final JPanel panel;
    private final JBLabel iconLabel;
    private final JBLabel textLabel;
    private MessageBusConnection messageBusConnection;

    public BbjStatusBarWidget(@NotNull Project project) {
        this.project = project;
        this.iconLabel = new JBLabel();
        this.textLabel = new JBLabel();

        // Create panel with horizontal layout
        this.panel = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 0));
        this.panel.setOpaque(false);
        this.panel.add(iconLabel);
        this.panel.add(textLabel);

        // Add mouse listener to open popup menu
        this.panel.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                showPopupMenu(e);
            }
        });

        // Subscribe to server status changes
        messageBusConnection = project.getMessageBus().connect();
        messageBusConnection.subscribe(
            BbjServerService.BbjServerStatusListener.TOPIC,
            this::updateStatus
        );

        // Initialize with current status
        updateStatus(BbjServerService.getInstance(project).getCurrentStatus());
    }

    private void updateStatus(@NotNull ServerStatus status) {
        ApplicationManager.getApplication().invokeLater(() -> {
            Icon icon;
            String text;

            // Check if server is in grace period (idle state)
            BbjServerService serverService = BbjServerService.getInstance(project);
            boolean isIdle = serverService.isInGracePeriod();

            switch (status) {
                case started:
                    if (isIdle) {
                        icon = BbjIcons.STATUS_STARTING;
                        text = "BBj: Idle";
                    } else {
                        icon = BbjIcons.STATUS_READY;
                        text = "BBj: Ready";
                    }
                    break;
                case starting:
                    icon = BbjIcons.STATUS_STARTING;
                    text = "BBj: Starting";
                    break;
                case stopping:
                    icon = BbjIcons.STATUS_STARTING;
                    text = "BBj: Stopping";
                    break;
                case stopped:
                    icon = BbjIcons.STATUS_ERROR;
                    text = "BBj: Stopped";
                    break;
                default:
                    icon = BbjIcons.STATUS_ERROR;
                    text = "BBj: Error";
                    break;
            }

            iconLabel.setIcon(icon);
            textLabel.setText(text);

            // Update visibility based on whether BBj file is open
            updateVisibility();
        });
    }

    private void updateVisibility() {
        VirtualFile[] files = FileEditorManager.getInstance(project).getSelectedFiles();
        boolean hasBbjFile = false;
        for (VirtualFile file : files) {
            String ext = file.getExtension();
            if (ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src"))) {
                hasBbjFile = true;
                break;
            }
        }
        panel.setVisible(hasBbjFile);
    }

    private void showPopupMenu(MouseEvent e) {
        JPopupMenu popup = new JPopupMenu();

        // Restart Server action
        JMenuItem restartItem = new JMenuItem("Restart Server");
        restartItem.addActionListener(event -> {
            BbjServerService.getInstance(project).restart();
        });
        popup.add(restartItem);

        // Open Settings action
        JMenuItem settingsItem = new JMenuItem("Open Settings");
        settingsItem.addActionListener(event -> {
            ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj");
        });
        popup.add(settingsItem);

        // Show Server Log action
        JMenuItem logItem = new JMenuItem("Show Server Log");
        logItem.addActionListener(event -> {
            var toolWindow = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
            if (toolWindow != null) {
                toolWindow.show();
            }
        });
        popup.add(logItem);

        popup.show(panel, e.getX(), e.getY());
    }

    @Override
    public @NonNls @NotNull String ID() {
        return ID;
    }

    @Override
    public @NotNull JComponent getComponent() {
        return panel;
    }

    @Override
    public void install(@NotNull StatusBar statusBar) {
        // Widget installed
    }

    @Override
    public void dispose() {
        if (messageBusConnection != null) {
            messageBusConnection.disconnect();
        }
    }
}
