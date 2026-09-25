package com.basis.bbj.intellij.ui;

import com.intellij.execution.ui.ConsoleView;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.EditorNotifications;
import com.intellij.util.messages.Topic;
import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.BoundedWait;
import com.basis.bbj.intellij.concurrency.ExpectedStopGuard;
import com.basis.bbj.intellij.concurrency.RestartGate;
import com.basis.bbj.intellij.concurrency.Scheduler;
import com.basis.bbj.intellij.config.ConfigReloadPresentation;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Project-level service managing BBj language server lifecycle.
 * Centralizes server start/stop/restart operations, crash recovery with auto-restart logic,
 * and status broadcast to UI components. Every restart trigger — the manual restart action, the
 * crash notification, both status-bar widgets, refresh Java classes, the Node download-success
 * notification, and the settings-apply flow — reaches the server only through the single guarded
 * entry point {@link #requestRestart(long)}, which coalesces overlapping requests into one
 * restart via a {@link RestartGate}.
 */
public final class BbjServerService implements Disposable {

    /**
     * The platform logger, so the server's lifecycle is readable in {@code idea.log} on a user's
     * machine. The lifecycle of this server is otherwise invisible from outside: a start that never
     * happens looks exactly like a start that happened and failed.
     */
    private static final Logger LOG = Logger.getInstance(BbjServerService.class);

    private final Project project;
    private ServerStatus currentStatus = ServerStatus.stopped;
    private final Scheduler restartScheduler;
    private final RestartGate restartGate;
    private final ExpectedStopGuard expectedStop;
    public static final int RESTART_DEBOUNCE_MS = 500;
    private static final long CRASH_RESTART_DELAY_MS = 1000;
    private static final long CRASH_WINDOW_MS = 30_000; // 30 seconds
    private static final String SERVER_ID = "bbjLanguageServer";
    private static final long STOP_WAIT_TIMEOUT_MS = 5000;
    private static final long STOP_WAIT_POLL_MS = 50;
    private long lastCrashTime = 0;
    private int crashCount = 0;
    private boolean serverCrashed = false;
    private ConsoleView consoleView;

    /**
     * The reason for the most recently requested config-driven restart, or {@code null} when no
     * such restart is pending/in progress. Written from the LSP dispatch thread (see
     * {@code BbjLanguageClient#configReloadRequired}) and read from the EDT (see
     * {@code BbjStatusBarWidget#updateStatus}), hence volatile.
     */
    private volatile String pendingRestartReason;

    public BbjServerService(@NotNull Project project) {
        this.project = project;
        this.restartScheduler = new AlarmScheduler(this);
        this.restartGate = new RestartGate(restartScheduler, this::doRestart);
        this.expectedStop = new ExpectedStopGuard(ExpectedStopGuard.DEFAULT_WINDOW_MS);

        // Register disposal
        Disposer.register(project, this);
    }

    public static BbjServerService getInstance(@NotNull Project project) {
        return project.getService(BbjServerService.class);
    }

    /**
     * Set the console view for log output.
     */
    public void setConsoleView(@Nullable ConsoleView console) {
        this.consoleView = console;
    }

    /**
     * Write a message to the tool window console.
     */
    public void logToConsole(@NotNull String message, @NotNull ConsoleViewContentType type) {
        if (consoleView != null) {
            consoleView.print(message + "\n", type);
        }
    }

    /**
     * Check if the server is in crashed state.
     */
    public boolean isServerCrashed() {
        return serverCrashed;
    }

    /**
     * Clear crash state (reset crash count and crashed flag).
     */
    public void clearCrashState() {
        serverCrashed = false;
        crashCount = 0;
        ApplicationManager.getApplication().invokeLater(() -> {
            EditorNotifications.getInstance(project).updateAllNotifications();
        });
    }

    /**
     * Records why the next (or current) restart is happening, for {@link
     * ConfigReloadPresentation#widgetTooltip} and the status-bar widget's tooltip. Pass {@code
     * null} to clear it directly.
     */
    public void setRestartReason(@Nullable String reason) {
        this.pendingRestartReason = reason;
    }

    /** The reason recorded by {@link #setRestartReason(String)}, or {@code null} if none. */
    public @Nullable String getRestartReason() {
        return pendingRestartReason;
    }

    /**
     * Update server status and notify all listeners (status bar widget).
     * Implements crash detection and auto-restart logic.
     */
    public void updateStatus(@NotNull ServerStatus status) {
        if (project.isDisposed()) {
            return;
        }

        boolean autoRestartAbandoned = false;

        ExpectedStopGuard.StopKind stopKind =
            expectedStop.classify(status.name(), currentStatus.name(), System.currentTimeMillis());

        LOG.info("BBj language server status: " + currentStatus + " -> " + status
            + " (classified as " + stopKind + ")");

        if (stopKind == ExpectedStopGuard.StopKind.CRASH) {
            // This is a crash
            serverCrashed = true;
            logToConsole("Language server stopped unexpectedly", ConsoleViewContentType.ERROR_OUTPUT);

            long now = System.currentTimeMillis();

            // Reset crash count if outside crash window
            if (now - lastCrashTime > CRASH_WINDOW_MS) {
                crashCount = 0;
            }

            crashCount++;
            lastCrashTime = now;

            if (crashCount == 1) {
                // Auto-restart on first crash
                logToConsole("Auto-restarting language server (attempt 1)...", ConsoleViewContentType.SYSTEM_OUTPUT);
                requestRestart(CRASH_RESTART_DELAY_MS);
            } else if (crashCount >= 2) {
                // Stop auto-restart after second crash
                autoRestartAbandoned = true;
                logToConsole("Language server crashed twice. Stopping auto-restart.", ConsoleViewContentType.ERROR_OUTPUT);
                notifyCrash();
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (project.isDisposed()) {
                        return;
                    }
                    EditorNotifications.getInstance(project).updateAllNotifications();
                });
            }
        } else if (stopKind == ExpectedStopGuard.StopKind.EXPECTED_RESTART_STOP) {
            logToConsole("Language server stopped for a restart", ConsoleViewContentType.SYSTEM_OUTPUT);
        }

        // Clear crash state when server successfully starts
        if (status == ServerStatus.started) {
            if (serverCrashed) {
                logToConsole("Language server started successfully", ConsoleViewContentType.SYSTEM_OUTPUT);
            }
            serverCrashed = false;
            crashCount = 0;
            ApplicationManager.getApplication().invokeLater(() -> {
                if (project.isDisposed()) {
                    return;
                }
                EditorNotifications.getInstance(project).updateAllNotifications();
            });
        }

        if (ConfigReloadPresentation.clearsReason(status.name(), autoRestartAbandoned)) {
            pendingRestartReason = null;
        }

        this.currentStatus = status;

        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            project.getMessageBus()
                .syncPublisher(BbjServerStatusListener.TOPIC)
                .statusChanged(status);
        });
    }

    /**
     * Show balloon notification for crash with actions.
     */
    private void notifyCrash() {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("BBj Language Server")
            .createNotification(
                "BBj Language Server crashed unexpectedly",
                "The server crashed twice and has been stopped. Check the log for details.",
                NotificationType.ERROR)
            .addAction(new NotificationAction("Show Log") {
                @Override
                public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                    ToolWindow tw = ToolWindowManager.getInstance(project)
                        .getToolWindow("BBj Language Server");
                    if (tw != null) {
                        tw.show();
                    }
                    n.expire();
                }
            })
            .addAction(new NotificationAction("Restart") {
                @Override
                public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                    requestRestart(0);
                    n.expire();
                }
            })
            .notify(project);
    }

    /**
     * The single guarded entry point for restarting the language server. Every restart trigger
     * must call this method rather than performing the stop/start pair directly — overlapping
     * requests coalesce into exactly one restart via {@link RestartGate}.
     */
    public void requestRestart(long delayMs) {
        boolean scheduled = restartGate.request(delayMs);
        if (!scheduled) {
            logToConsole("A language server restart is already in progress; ignoring the additional request",
                ConsoleViewContentType.SYSTEM_OUTPUT);
            LOG.info("A BBj language server restart is already in flight; dropped the additional request");
        } else {
            LOG.info("Scheduled a BBj language server restart in " + delayMs + " ms");
        }
    }

    /**
     * Restart the language server immediately. Clears crash state first so a restart always
     * works. Only reachable through {@link #requestRestart(long)} — never call directly, and
     * this method only ever runs on the gate's pooled Alarm thread ({@link AlarmScheduler}), so
     * the bounded wait below never blocks the EDT.
     *
     * <p>{@code LanguageServerManager.stop(String)} returns {@code void}, so the manager's
     * reported status is the only completion signal available: after requesting the stop, this
     * method waits (bounded) for that status to report the server down before requesting the
     * start, so the two phases of one restart cannot overlap.
     *
     * <p>The stop is requested with {@code willDisable(false)} rather than through the
     * one-argument {@code stop(String)} convenience. That convenience passes {@code
     * StopOptions.DEFAULT}, whose {@code willDisable} flag is {@code true}: it does not merely stop
     * the server, it <em>disables the server definition</em> — either by calling {@code
     * stopAndDisable()} on a running wrapper, or, when no wrapper is currently registered, by
     * calling {@code setEnabled(false)} on the definition outright. The subsequent start only ever
     * re-enables the definition as a side effect of restarting an already-registered wrapper, so on
     * any path where no wrapper is registered — or where anything throws between the stop and the
     * start — the definition would stay disabled. A disabled definition is filtered out of every
     * later start attempt, so no process is ever spawned again, nothing is logged, and the only
     * cure is restarting the IDE, because the enabled flag is a plain in-memory field. A restart
     * must never revoke the capability it is about to exercise, so this asks for a plain stop.
     *
     * <p>For the same reason the start is requested from a {@code finally}: a restart that cannot
     * complete its stop must still attempt its start rather than leaving the server down with no
     * further trigger.
     */
    private void doRestart() {
        clearCrashState();
        LanguageServerManager manager = LanguageServerManager.getInstance(project);
        ServerStatus statusBeforeStop = manager.getServerStatus(SERVER_ID);
        LOG.info("Restarting the BBj language server; status before the stop: " + statusBeforeStop);
        if (statusBeforeStop == ServerStatus.started
                || statusBeforeStop == ServerStatus.starting
                || statusBeforeStop == ServerStatus.stopping) {
            expectedStop.arm(System.currentTimeMillis());
        }
        try {
            manager.stop(SERVER_ID, new LanguageServerManager.StopOptions().setWillDisable(false));
            boolean stoppedInTime = BoundedWait.until(
                () -> isServerObservedDown(manager.getServerStatus(SERVER_ID)),
                STOP_WAIT_TIMEOUT_MS,
                STOP_WAIT_POLL_MS,
                System::currentTimeMillis,
                BoundedWait.SLEEPING);
            if (!stoppedInTime) {
                logToConsole("Timed out waiting for the language server to stop; starting anyway",
                    ConsoleViewContentType.SYSTEM_OUTPUT);
                LOG.warn("Timed out after " + STOP_WAIT_TIMEOUT_MS + " ms waiting for the BBj language"
                    + " server to stop; starting anyway. Last reported status: "
                    + manager.getServerStatus(SERVER_ID));
            }
        } finally {
            LOG.info("Starting the BBj language server; status before the start: "
                + manager.getServerStatus(SERVER_ID));
            manager.start(SERVER_ID);
        }
    }

    /**
     * Whether {@code status} indicates the server is down: {@code null} (server definition
     * unknown), {@link ServerStatus#stopped} or {@link ServerStatus#none} (no started server
     * matches) are all treated alike.
     */
    private static boolean isServerObservedDown(@Nullable ServerStatus status) {
        return status == null || status == ServerStatus.stopped || status == ServerStatus.none;
    }

    /**
     * Schedule a debounced restart. Multiple calls within RESTART_DEBOUNCE_MS
     * will result in a single restart.
     */
    public void scheduleRestart() {
        requestRestart(RESTART_DEBOUNCE_MS);
    }

    public ServerStatus getCurrentStatus() {
        return currentStatus;
    }

    @Override
    public void dispose() {
        // LSP4IJ handles server cleanup automatically when project is disposed
        logToConsole("Project closing", ConsoleViewContentType.SYSTEM_OUTPUT);
        // Alarm is auto-disposed via parent chain
    }

    /**
     * Listener interface for server status changes.
     */
    public interface BbjServerStatusListener {
        Topic<BbjServerStatusListener> TOPIC = Topic.create(
            "BBj Server Status",
            BbjServerStatusListener.class
        );

        void statusChanged(@NotNull ServerStatus status);
    }
}
