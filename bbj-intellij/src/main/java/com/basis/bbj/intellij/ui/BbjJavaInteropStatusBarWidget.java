package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.CustomStatusBarWidget;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.ui.components.JBLabel;
import com.intellij.util.messages.MessageBusConnection;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

/**
 * Status bar widget displaying BBj java-interop connection state.
 * Shows colored icon + text label, opens popup menu on click.
 */
public final class BbjJavaInteropStatusBarWidget implements CustomStatusBarWidget {

    private static final String ID = "BbjJavaInteropStatus";
    private final Project project;
    private final JPanel panel;
    private final JBLabel iconLabel;
    private final JBLabel textLabel;
    private MessageBusConnection messageBusConnection;

    public BbjJavaInteropStatusBarWidget(@NotNull Project project) {
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

        // Subscribe to java-interop status changes
        messageBusConnection = project.getMessageBus().connect();
        messageBusConnection.subscribe(
            BbjJavaInteropService.BbjJavaInteropStatusListener.TOPIC,
            this::updateStatus
        );

        // Initialize with current status
        updateStatus(BbjJavaInteropService.getInstance(project).getCurrentStatus());
    }

    private void updateStatus(@NotNull BbjJavaInteropService.InteropStatus status) {
        ApplicationManager.getApplication().invokeLater(() -> {
            Icon icon;
            String text;

            switch (status) {
                case CONNECTED:
                    icon = BbjIcons.INTEROP_CONNECTED;
                    text = "Java: Connected";
                    break;
                case DISCONNECTED:
                    icon = BbjIcons.INTEROP_DISCONNECTED;
                    text = "Java: Disconnected";
                    break;
                case CHECKING:
                    icon = BbjIcons.INTEROP_DISCONNECTED;
                    text = "Java: Checking...";
                    break;
                default:
                    icon = BbjIcons.INTEROP_DISCONNECTED;
                    text = "Java: Unknown";
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

        // Reconnect action (restarts language server)
        JMenuItem reconnectItem = new JMenuItem("Reconnect");
        reconnectItem.addActionListener(event -> {
            BbjServerService.getInstance(project).restart();
        });
        popup.add(reconnectItem);

        // Open Settings action
        JMenuItem settingsItem = new JMenuItem("Open Settings");
        settingsItem.addActionListener(event -> {
            ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
        });
        popup.add(settingsItem);

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
