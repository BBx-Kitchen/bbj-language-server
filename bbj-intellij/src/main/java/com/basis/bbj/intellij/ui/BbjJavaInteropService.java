package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.interop.InteropPollPolicy;
import com.basis.bbj.intellij.interop.InteropProbeClient;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerEvent;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.project.Project;
import com.intellij.ui.EditorNotifications;
import com.intellij.util.Alarm;
import com.intellij.util.messages.MessageBusConnection;
import com.intellij.util.messages.Topic;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

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
 * <p>
 * The poll only re-arms while a BBj file is selected (#593): {@link #bbjFileSelected} and {@link
 * #gateWasOpen} are written only from the EDT (the {@code FILE_EDITOR_MANAGER} selection callback
 * and the constructor's startup {@code invokeLater} lambda) and read only from the pooled-thread
 * poll callback ({@link #checkConnection()}), published through a {@code volatile} field --
 * mirroring {@code BbjServerService.pendingRestartReason}'s EDT-write / background-read split.
 * Every re-arm, pause, and immediate-check decision routes through {@link InteropPollPolicy#decide}
 * and is applied in the single {@link #applyDecision} method, so no path can cancel the alarm
 * without a matching path that can re-arm it.
 */
public final class BbjJavaInteropService implements Disposable {

    /**
     * Java-interop connection states.
     */
    public enum InteropStatus {
        CONNECTED,    // TCP connection successful and getTopLevelPackages confirmed the peer
        DISCONNECTED, // TCP connection failed (after grace period)
        CHECKING,     // Currently checking connection
        WRONG_PEER    // Something is listening on the configured port, but it is not java-interop
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
    private static final int RESPONSE_TIMEOUT_MS = 2000; // 2s JSON-RPC response timeout; 1s+2s stays inside CHECK_INTERVAL_MS

    /** Whether a BBj file is currently selected. EDT-write, pooled-thread-read (#593). */
    private volatile boolean bbjFileSelected;
    /** {@link #bbjFileSelected} as of the previous selection event. EDT-write, pooled-thread-read. */
    private volatile boolean gateWasOpen;

    public BbjJavaInteropService(@NotNull Project project) {
        this.project = project;
        this.checkAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);

        MessageBusConnection connection = project.getMessageBus().connect(this);

        // Subscribe to language server status changes
        connection.subscribe(
            BbjServerService.BbjServerStatusListener.TOPIC,
            status -> {
                if (status == ServerStatus.started) {
                    handleServerStarted();
                } else if (status == ServerStatus.stopped || status == ServerStatus.stopping) {
                    stopChecking();
                    updateStatus(InteropStatus.DISCONNECTED);
                }
            }
        );

        // Follow editor-tab switches so the poll gate opens/closes immediately (#593)
        connection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, new FileEditorManagerListener() {
            @Override
            public void selectionChanged(@NotNull FileEditorManagerEvent event) {
                refreshSelectionGate();
            }
        });

        // Seed the gate once at startup, so a project opened with a BBj file already selected
        // starts with an open gate rather than waiting for the first tab switch.
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            refreshSelectionGate();
        });

        // If language server is already running, start health checks immediately
        if (BbjServerService.getInstance(project).getCurrentStatus() == ServerStatus.started) {
            handleServerStarted();
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
     * The language server just reached {@code started}: ask the poll-gate policy whether to fire
     * an immediate check (#593). The sole call site for the {@code SERVER_STARTED} trigger --
     * both the status-change subscription and the constructor's already-running check route
     * through here, so {@link InteropPollPolicy#decide} is called exactly once for this trigger.
     * {@code serverStarted} is {@code true} by construction: this method only runs because the
     * server just reached {@code started}.
     */
    private void handleServerStarted() {
        applyDecision(InteropPollPolicy.decide(InteropPollPolicy.Trigger.SERVER_STARTED,
                bbjFileSelected, gateWasOpen, true));
    }

    /**
     * Reads the editor's current selection and updates the poll gate (#593). Must run on the EDT
     * -- {@code FileEditorManager.getSelectedFiles()} is EDT-affine -- so the only two callers are
     * the {@code FILE_EDITOR_MANAGER} selection callback and the constructor's startup {@code
     * invokeLater} lambda; the pooled-thread poll path never calls this. The server-started flag
     * is read live from {@code BbjServerService} rather than cached, since this method already
     * runs only on the EDT.
     */
    private void refreshSelectionGate() {
        boolean nowOpen = BbjFileVisibility.showsForSelection(
                FileEditorManager.getInstance(project).getSelectedFiles());
        gateWasOpen = bbjFileSelected;
        bbjFileSelected = nowOpen;
        boolean serverStarted =
                BbjServerService.getInstance(project).getCurrentStatus() == ServerStatus.started;
        applyDecision(InteropPollPolicy.decide(InteropPollPolicy.Trigger.SELECTION_CHANGED,
                bbjFileSelected, gateWasOpen, serverStarted));
    }

    /**
     * The single place that acts on an {@link InteropPollPolicy.Decision}. CHECK_NOW fires an
     * immediate check and resumes the cadence (since {@link #checkConnection()} ends by re-arming);
     * REARM schedules the next check at the normal interval; PAUSE cancels pending work and
     * changes no state -- it must not touch {@link #currentStatus} or broadcast, since pausing is
     * not a status change; NO_CHANGE does nothing.
     */
    private void applyDecision(InteropPollPolicy.Decision decision) {
        switch (decision) {
            case CHECK_NOW -> {
                checkAlarm.cancelAllRequests();
                checkAlarm.addRequest(this::checkConnection, 0);
            }
            case REARM -> scheduleNextCheck();
            case PAUSE -> checkAlarm.cancelAllRequests();
            case NO_CHANGE -> {
                // Leave the running cadence exactly as it is.
            }
        }
    }

    /**
     * Confirm the java-interop peer at host:port via a real getTopLevelPackages JSON-RPC round
     * trip (#587) -- a bare TCP handshake alone no longer earns CONNECTED. Implements grace
     * period to avoid flashing UI on transient disconnects.
     */
    private void checkConnection() {
        if (project.isDisposed()) {
            return;
        }

        // Captured before CHECKING is assigned below -- the grace-period branches below need the
        // status as of the *previous* tick, and currentStatus itself becomes CHECKING for the
        // duration of this probe.
        InteropStatus previousStatus = currentStatus;
        updateStatus(InteropStatus.CHECKING);

        // Read host and port from settings at check time (not cached - user may change them);
        // reading the effective-port accessor on each tick is what lets a BBj.properties change
        // show up on the next tick without a file watcher.
        BbjSettings.State state = BbjSettings.getInstance().getState();
        int port = BbjSettings.getInstance().getEffectiveJavaInteropPort();
        String host = state.javaInteropHost;
        if (host == null || host.isEmpty()) {
            host = "localhost";
        }

        InteropProbeClient.Verdict verdict =
                InteropProbeClient.probe(host, port, TCP_TIMEOUT_MS, RESPONSE_TIMEOUT_MS);

        InteropStatus newStatus = switch (verdict) {
            case CONFIRMED -> {
                // Confirmed peer
                disconnectedSince = 0;  // Clear grace period
                yield InteropStatus.CONNECTED;
            }
            case WRONG_PEER -> {
                // The peer answered the socket but not the protocol -- not a transient connect
                // failure, so the grace period does not apply to it.
                disconnectedSince = 0;
                yield InteropStatus.WRONG_PEER;
            }
            case UNREACHABLE -> {
                // Connection failed
                long now = System.currentTimeMillis();

                if (disconnectedSince == 0) {
                    // First failure - enter grace period
                    disconnectedSince = now;
                    yield previousStatus; // Keep previous status during grace
                } else if (now - disconnectedSince > GRACE_PERIOD_MS) {
                    // Grace period expired - mark as disconnected
                    yield InteropStatus.DISCONNECTED;
                } else {
                    // Still in grace period - keep previous status
                    yield previousStatus;
                }
            }
        };

        // Mark first check as completed
        firstCheckCompleted = true;

        // Update status and broadcast if changed
        updateStatus(newStatus);

        // Re-arm, pause, or leave the cadence alone depending on the poll gate (#593). serverStarted
        // is true by construction here: this tick only runs because a REARM or CHECK_NOW decision
        // scheduled it, and both are gated on the server being started -- stopChecking() cancels
        // every pending request the instant the server stops or stops stopping.
        applyDecision(InteropPollPolicy.decide(InteropPollPolicy.Trigger.TICK_COMPLETED,
                bbjFileSelected, gateWasOpen, true));
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
            if (project.isDisposed()) {
                return;
            }

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
