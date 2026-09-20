package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.interop.InteropStatusPresentation;
import com.intellij.openapi.project.Project;
import com.intellij.util.messages.MessageBusConnection;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

/**
 * Status bar widget displaying BBj java-interop connection state.
 * Shows colored icon + text label, opens popup menu on click.
 */
public final class BbjJavaInteropStatusBarWidget extends BbjStatusBarWidgetBase<BbjJavaInteropService.InteropStatus> {

    private static final String ID = "BbjJavaInteropStatus";

    public BbjJavaInteropStatusBarWidget(@NotNull Project project) {
        super(project);
    }

    @Override
    protected String widgetId() {
        return ID;
    }

    @Override
    protected void subscribeToStatusTopic(@NotNull MessageBusConnection messageBusConnection) {
        messageBusConnection.subscribe(BbjJavaInteropService.BbjJavaInteropStatusListener.TOPIC, this::updateStatus);
    }

    @Override
    protected BbjJavaInteropService.InteropStatus currentStatus() {
        return BbjJavaInteropService.getInstance(project).getCurrentStatus();
    }

    @Override
    protected Icon iconFor(BbjJavaInteropService.InteropStatus status) {
        switch (status) {
            case CONNECTED:
                return BbjIcons.INTEROP_CONNECTED;
            case DISCONNECTED:
            case CHECKING:
            case WRONG_PEER:
            default:
                return BbjIcons.INTEROP_DISCONNECTED;
        }
    }

    @Override
    protected String textFor(BbjJavaInteropService.InteropStatus status) {
        // Delegate the whole switch to the shared presentation seam, matching what tooltipFor()
        // already does below -- CONNECTED/DISCONNECTED/CHECKING used to duplicate
        // InteropStatusPresentation.statusText()'s own labels independently, which let the two
        // copies drift silently.
        return InteropStatusPresentation.statusText(status.name());
    }

    @Override
    protected String tooltipFor(BbjJavaInteropService.InteropStatus status, String text) {
        // Gives the Java widget a tooltip it has never had -- intended, declared at UAT.
        return InteropStatusPresentation.tooltip(status.name());
    }

    @Override
    protected void addPopupItems(JPopupMenu popup) {
        // Reconnect action (restarts language server)
        JMenuItem reconnectItem = new JMenuItem("Reconnect");
        reconnectItem.addActionListener(event -> BbjServerService.getInstance(project).requestRestart(0));
        popup.add(reconnectItem);

        // Open Settings action
        addOpenSettingsItem(popup);
    }
}
