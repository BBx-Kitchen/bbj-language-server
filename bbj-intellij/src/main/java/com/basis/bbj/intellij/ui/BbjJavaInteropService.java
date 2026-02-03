package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.ui.EditorNotifications;
import com.intellij.util.Alarm;
import com.intellij.util.messages.Topic;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Project-level service that monitors BBjServices java-interop availability via TCP health checks.
 * <p>
 * Design rationale: The language server connects to java-interop internally (java-interop.ts
 * createSocket()) but does NOT expose connection status via LSP protocol - no custom notifications,
 * no status fields. The LS just silently fails java completions if java-interop is unreachable.
 * Modifying the language server is out of scope (see REQUIREMENTS.md). Therefore the plugin
 * independently probes the TCP port as the only way to show connection status without LS changes.
 * <p>
 * This is for UI STATUS DISPLAY only - the plugin does not manage the LS-to-java-interop connection.
 * The plugin passes config via initializationOptions and the server connects on its own.
 */
public final class BbjJavaInteropService implements Disposable {

    /**
     * Java-interop connection states.
     */
    public enum InteropStatus {
        CONNECTED,    // TCP connection successful
        DISCONNECTED, // TCP connection failed (after grace period)
        CHECKING      // Currently checking connection
    }

    /**
     * Listener interface for java-interop status changes.
     * Subscribers can react to connection state changes for UI updates.
     */
    public interface BbjJavaInteropStatusListener {
        Topic<BbjJavaInteropStatusListener> TOPIC = Topic.create(
            "BBj Java Interop Status",
            BbjJavaInteropStatusListener.class
        );

        void statusChanged(@NotNull InteropStatus status);
    }

    private final Project project;
    private final Alarm checkAlarm;
    private InteropStatus currentStatus = InteropStatus.DISCONNECTED;
    private long disconnectedSince = 0;  // timestamp for grace period
    private boolean firstCheckCompleted = false; // suppress banner until first check runs
    private static final int CHECK_INTERVAL_MS = 5000;  // check every 5s
    private static final long GRACE_PERIOD_MS = 2000;   // 2s grace before broadcasting disconnect
    private static final int TCP_TIMEOUT_MS = 1000;     // 1s TCP connect timeout

    public BbjJavaInteropService(@NotNull Project project) {
        this.project = project;
        this.checkAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);

        // Subscribe to language server status changes
        project.getMessageBus().connect(this).subscribe(
            BbjServerService.BbjServerStatusListener.TOPIC,
            status -> {
                if (status == ServerStatus.started) {
                    startChecking();
                } else if (status == ServerStatus.stopped || status == ServerStatus.stopping) {
                    stopChecking();
                    updateStatus(InteropStatus.DISCONNECTED);
                }
            }
        );

        // If language server is already running, start health checks immediately
        if (BbjServerService.getInstance(project).getCurrentStatus() == ServerStatus.started) {
            startChecking();
        }
    }

    public static BbjJavaInteropService getInstance(@NotNull Project project) {
        return project.getService(BbjJavaInteropService.class);
    }

    /**
     * Start periodic TCP health checks.
     * Called when language server status changes to "started".
     */
    public void startChecking() {
        checkAlarm.cancelAllRequests();
        scheduleNextCheck();
    }

    /**
     * Stop periodic TCP health checks.
     * Called when language server stops.
     */
    public void stopChecking() {
        checkAlarm.cancelAllRequests();
    }

    /**
     * Schedule the next health check.
     */
    private void scheduleNextCheck() {
        checkAlarm.addRequest(this::checkConnection, CHECK_INTERVAL_MS);
    }

    /**
     * Check TCP connection to java-interop on localhost:port.
     * Implements grace period to avoid flashing UI on transient disconnects.
     */
    private void checkConnection() {
        // Read port from settings at check time (not cached - user may change it)
        int port = BbjSettings.getInstance().getState().javaInteropPort;

        InteropStatus newStatus;
        try {
            // Attempt TCP connection with timeout
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress("127.0.0.1", port), TCP_TIMEOUT_MS);
                // Connection successful
                newStatus = InteropStatus.CONNECTED;
                disconnectedSince = 0;  // Clear grace period
            }
        } catch (IOException e) {
            // Connection failed
            long now = System.currentTimeMillis();

            if (disconnectedSince == 0) {
                // First failure - enter grace period
                disconnectedSince = now;
                newStatus = currentStatus; // Keep previous status during grace
            } else if (now - disconnectedSince > GRACE_PERIOD_MS) {
                // Grace period expired - mark as disconnected
                newStatus = InteropStatus.DISCONNECTED;
            } else {
                // Still in grace period - keep previous status
                newStatus = currentStatus;
            }
        }

        // Mark first check as completed
        firstCheckCompleted = true;

        // Update status and broadcast if changed
        updateStatus(newStatus);

        // Schedule next check
        scheduleNextCheck();
    }

    /**
     * Update current status and broadcast if changed.
     */
    private void updateStatus(@NotNull InteropStatus newStatus) {
        if (newStatus != currentStatus) {
            currentStatus = newStatus;
            broadcastStatus(newStatus);
        }
    }

    /**
     * Broadcast status change via message bus and trigger editor notifications update.
     */
    private void broadcastStatus(@NotNull InteropStatus status) {
        ApplicationManager.getApplication().invokeLater(() -> {
            project.getMessageBus()
                .syncPublisher(BbjJavaInteropStatusListener.TOPIC)
                .statusChanged(status);

            // Trigger editor notifications to update (for future editor banner in 05-02)
            EditorNotifications.getInstance(project).updateAllNotifications();
        });
    }

    /**
     * Get current java-interop connection status.
     */
    public InteropStatus getCurrentStatus() {
        return currentStatus;
    }

    /**
     * Whether the first health check has completed.
     * Used to suppress the "disconnected" banner during startup before
     * the service has had a chance to check the connection.
     */
    public boolean isFirstCheckCompleted() {
        return firstCheckCompleted;
    }

    @Override
    public void dispose() {
        checkAlarm.cancelAllRequests();
    }
}
