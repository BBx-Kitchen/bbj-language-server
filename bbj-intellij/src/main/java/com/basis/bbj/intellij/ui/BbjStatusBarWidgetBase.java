package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjSettingsConfigurable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerEvent;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
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
 * Shared base for the two BBj status-bar widgets. Holds every member that is identical between
 * {@link BbjStatusBarWidget} and {@link BbjJavaInteropStatusBarWidget} -- the panel, both labels,
 * the mouse-click-to-popup wiring, the {@code messageBusConnection} lifecycle, the {@code
 * FILE_EDITOR_MANAGER} subscription and {@code updateVisibility()}, and {@code dispose()} -- so a
 * change to the widget shape is written once. Parameterised on the subclass's status type {@code
 * S} rather than a single concrete class taking a mapping function: the two status enums ({@code
 * com.redhat.devtools.lsp4ij.ServerStatus} and {@link BbjJavaInteropService.InteropStatus}) are
 * unrelated types, so a generic base keeps every difference compile-time checked instead of a
 * runtime no-op on a wiring mistake. This base deliberately names neither vendor status type --
 * that is what keeps the LSP4IJ {@code ServerStatus} symbol inside {@link BbjStatusBarWidget} and
 * out of this file.
 */
public abstract class BbjStatusBarWidgetBase<S> implements CustomStatusBarWidget {

    protected final Project project;
    protected final JBLabel iconLabel;
    protected final JBLabel textLabel;
    private final JPanel panel;
    private MessageBusConnection messageBusConnection;

    protected BbjStatusBarWidgetBase(@NotNull Project project) {
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

        // Subscribe to this widget's own status topic
        this.messageBusConnection = project.getMessageBus().connect();
        subscribeToStatusTopic(messageBusConnection);

        // Follow editor-tab switches so the widget shows/hides immediately, not only on the
        // next status change (#610)
        this.messageBusConnection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, new FileEditorManagerListener() {
            @Override
            public void selectionChanged(@NotNull FileEditorManagerEvent event) {
                updateVisibility();
            }
        });

        // Initialize with current status
        updateStatus(currentStatus());
    }

    /** Backs {@link #ID()}. */
    protected abstract String widgetId();

    /**
     * The subclass's single subscription to its own status topic on the shared {@code
     * messageBusConnection}, wired to {@link #updateStatus(Object)}. Keeps the per-subclass
     * subscription count at exactly one.
     */
    protected abstract void subscribeToStatusTopic(@NotNull MessageBusConnection messageBusConnection);

    /** The status to render immediately on construction, before any topic event arrives. */
    protected abstract S currentStatus();

    protected abstract Icon iconFor(S status);

    protected abstract String textFor(S status);

    /** Every subclass renders a tooltip through this hook, ending the prior asymmetry. */
    protected abstract String tooltipFor(S status, String text);

    protected abstract void addPopupItems(JPopupMenu popup);

    /**
     * The shared render sequence both widgets run on every status change: icon, text, tooltip,
     * then visibility. Subclasses reference this as {@code this::updateStatus} inside their
     * {@link #subscribeToStatusTopic(MessageBusConnection)} implementation.
     */
    protected final void updateStatus(S status) {
        ApplicationManager.getApplication().invokeLater(() -> {
            String text = textFor(status);
            iconLabel.setIcon(iconFor(status));
            textLabel.setText(text);
            panel.setToolTipText(tooltipFor(status, text));

            // Update visibility based on whether a BBj file is selected
            updateVisibility();
        });
    }

    private void updateVisibility() {
        panel.setVisible(BbjFileVisibility.showsForSelection(FileEditorManager.getInstance(project).getSelectedFiles()));
    }

    private void showPopupMenu(MouseEvent e) {
        JPopupMenu popup = new JPopupMenu();
        addPopupItems(popup);
        popup.show(panel, e.getX(), e.getY());
    }

    /**
     * The shared "Open Settings" popup item, unified on the exact-class form so it cannot break
     * if the configurable's display name changes. Subclasses call this from within their
     * {@link #addPopupItems(JPopupMenu)} implementation at the position the item belongs.
     */
    protected final void addOpenSettingsItem(JPopupMenu popup) {
        JMenuItem settingsItem = new JMenuItem("Open Settings");
        settingsItem.addActionListener(event ->
                ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class));
        popup.add(settingsItem);
    }

    @Override
    public @NonNls @NotNull String ID() {
        return widgetId();
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
