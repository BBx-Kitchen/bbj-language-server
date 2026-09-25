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
 * and status broadcast to UI components. Every user-initiated restart trigger — the manual
 * restart action, the crash balloon and editor banner Restart actions, both status-bar widgets,
 * refresh Java classes, the Node download-success notification, and the settings-apply flow —
 * reaches the server through {@link #requestRestart(long)}, which clears crash state before
 * handing off to the single guarded gate entry point {@code requestGatedRestart(long)}. The
 * crash auto-restart reaches that same gate directly, without clearing the counter it just
 * incremented, so a second crash within the window still gives up even after a successful
 * restart. Either way, {@link RestartGate} coalesces overlapping requests into one restart.
 * Crashes are detected only through {@link #reportUnexpectedExit(Long, Integer)}, fed by the
 * language server's own unexpected-stop hook -- {@link #updateStatus(com.redhat.devtools.lsp4ij.ServerStatus)}
 * drives display and logging only.
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
    static final long CRASH_WINDOW_MS = 30_000; // 30 seconds -- package-visible so the status
    // bar widget and the crash notification banner (same package) can derive their user-facing
    // "30 seconds" text from this single constant instead of duplicating the number.
    private static final String SERVER_ID = "bbjLanguageServer";
    private static final long STOP_WAIT_TIMEOUT_MS = 5000;
    private static final long STOP_WAIT_POLL_MS = 50;
    /**
     * Read from the EDT ({@link #updateStatus}, {@link #applyCrashPolicy}), the gate's pooled
     * restart thread ({@link #doRestart}) and the editor banner provider, and written from the EDT
     * -- volatile so a read from any of those threads always sees the latest value.
     */
    private volatile long lastCrashTime = 0;
    private volatile int crashCount = 0;
    private volatile boolean serverCrashed = false;

    /**
     * True once auto-restart has given up after a second crash within the window. The editor
     * banner reads this to decide whether to show itself; a successful {@code started} status or a
     * user-initiated restart (through {@link #clearCrashState()}) clears it. Distinct from {@link
     * #serverCrashed}, which is already true after the first, auto-restarted crash. Volatile for
     * the same cross-thread reasons as {@link #serverCrashed}.
     */
    private volatile boolean autoRestartAbandoned = false;

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
     * True once auto-restart has given up after a second crash within the window. Cleared by a
     * successful {@code started} status or a user-initiated restart.
     */
    public boolean isAutoRestartAbandoned() {
        return autoRestartAbandoned;
    }

    /**
     * Clear crash state (reset crash count and crashed flag). Dispatched through {@code
     * invokeLater} so every write to {@link #serverCrashed}, {@link #crashCount} and {@link
     * #autoRestartAbandoned} genuinely happens on the EDT, as those fields' own Javadoc requires --
     * this method is reachable from {@link #requestRestart(long)}, which in turn is reachable from
     * the LSP dispatch thread (see {@code BbjLanguageClient#configReloadRequired}), not only the
     * EDT.
     */
    public void clearCrashState() {
        ApplicationManager.getApplication().invokeLater(() -> {
            serverCrashed = false;
            crashCount = 0;
            autoRestartAbandoned = false;
            if (project.isDisposed()) {
                return;
            }
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
     * Update server status and notify all listeners (status bar widget). Display and logging
     * only: this method no longer classifies anything and no longer decides that something is a
     * crash -- that verdict arrives only through {@link #reportUnexpectedExit(Long, Integer)}, fed
     * by the language server's own unexpected-stop hook.
     */
    public void updateStatus(@NotNull ServerStatus status) {
        if (project.isDisposed()) {
            return;
        }

        LOG.info("BBj language server status: " + currentStatus + " -> " + status);

        // A successful start clears the crashed/give-up flags, but never the crash counter --
        // two crashes within the window still give up even if a restart reached `started` in
        // between.
        if (status == ServerStatus.started) {
            if (serverCrashed) {
                logToConsole("Language server started successfully", ConsoleViewContentType.SYSTEM_OUTPUT);
            }
            serverCrashed = false;
            autoRestartAbandoned = false;
            ApplicationManager.getApplication().invokeLater(() -> {
                if (project.isDisposed()) {
                    return;
                }
                EditorNotifications.getInstance(project).updateAllNotifications();
            });
        }

        if (ConfigReloadPresentation.clearsReason(status.name(), false)) {
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
     * Reports one unexpected process exit, fed by {@code BbjLanguageServer}'s unexpected-stop
     * hook. Callable from any thread -- the guard's verdict is taken on the calling thread so it
     * reflects the moment the process ended, then the rest of the work (an expected-restart console
     * line, or the crash policy) runs on the EDT.
     */
    public void reportUnexpectedExit(@Nullable Long pid, @Nullable Integer exitCode) {
        if (project.isDisposed()) {
            return;
        }

        ExpectedStopGuard.StopKind verdict = expectedStop.classifyExit(System.currentTimeMillis(), pid);

        if (verdict == ExpectedStopGuard.StopKind.EXPECTED_RESTART_STOP) {
            LOG.info("BBj language server process exited during a plugin restart ("
                + describeExit(pid, exitCode) + "); treated as an expected stop, not a crash");
            ApplicationManager.getApplication().invokeLater(() -> {
                if (project.isDisposed()) {
                    return;
                }
                logToConsole("Language server stopped for a restart", ConsoleViewContentType.SYSTEM_OUTPUT);
            });
            return;
        }

        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            applyCrashPolicy(pid, exitCode);
        });
    }

    /**
     * The crash counter, auto-restart-or-give-up decision, and the console/log/notification work
     * that follows it. EDT only -- reached solely from {@link #reportUnexpectedExit(Long,
     * Integer)}'s {@code invokeLater} hop, which is itself reachable only from the language
     * server's own unexpected-stop hook.
     */
    private void applyCrashPolicy(@Nullable Long pid, @Nullable Integer exitCode) {
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
            // Auto-restart on first crash -- through the gate directly, never requestRestart,
            // which would clear the counter this policy just incremented.
            LOG.warn("BBj language server process exited unexpectedly (" + describeExit(pid, exitCode)
                + "); auto-restarting (1 of 1)");
            logToConsole("Auto-restarting language server (attempt 1)...", ConsoleViewContentType.SYSTEM_OUTPUT);
            requestGatedRestart(CRASH_RESTART_DELAY_MS);
        } else {
            // Stop auto-restart after second crash
            autoRestartAbandoned = true;
            LOG.warn("BBj language server process exited unexpectedly (" + describeExit(pid, exitCode)
                + "); crash " + crashCount + " within " + (CRASH_WINDOW_MS / 1000) + " s, not auto-restarting");
            LOG.warn("BBj language server crashed " + crashCount + " times within " + (CRASH_WINDOW_MS / 1000)
                + " s; auto-restart stopped until a manual restart");
            logToConsole("Language server crashed twice. Stopping auto-restart.", ConsoleViewContentType.ERROR_OUTPUT);
            pendingRestartReason = null;
            notifyCrash();
            ApplicationManager.getApplication().invokeLater(() -> {
                if (project.isDisposed()) {
                    return;
                }
                EditorNotifications.getInstance(project).updateAllNotifications();
            });
        }

        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            project.getMessageBus()
                .syncPublisher(BbjServerStatusListener.TOPIC)
                .statusChanged(currentStatus);
        });
    }

    /** Renders {@code pid <pid>, exit code <code>}, naming an absent value as {@code unknown}. */
    private static String describeExit(@Nullable Long pid, @Nullable Integer exitCode) {
        return "pid " + (pid == null ? "unknown" : pid)
            + ", exit code " + (exitCode == null ? "unknown" : exitCode);
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
     * The entry point for every user-initiated restart: the manual restart action, both
     * status-bar widgets, the balloon and banner Restart actions, Settings Apply (via {@link
     * #scheduleRestart()}), config reload, Refresh Java Classes, and Node download success. Clears
     * crash state first -- a user asking for a restart always gets a clean slate -- then reaches
     * the language server through the same gate the crash auto-restart uses. {@link
     * #clearCrashState()} now dispatches its field writes through {@code invokeLater} to honor
     * those fields' EDT-only invariant, so the gated restart request is also dispatched through
     * {@code invokeLater} here -- queued from the same calling thread immediately afterward, it
     * runs strictly after the clear on the EDT's FIFO event queue, preserving the "cleared before
     * the restart runs" guarantee without requiring this method itself to run on the EDT.
     */
    public void requestRestart(long delayMs) {
        clearCrashState();
        ApplicationManager.getApplication().invokeLater(() -> requestGatedRestart(delayMs));
    }

    /**
     * The single guarded entry point for restarting the language server. Every restart, whether
     * user-initiated (via {@link #requestRestart(long)}) or the crash auto-restart (via {@link
     * #applyCrashPolicy(Long, Integer)}), reaches the server only through this method rather than
     * performing the stop/start pair directly — overlapping requests coalesce into exactly one
     * restart via {@link RestartGate}. Unlike {@link #requestRestart(long)}, this method never
     * clears crash state, so the crash auto-restart keeps the counter it just incremented.
     */
    private void requestGatedRestart(long delayMs) {
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
     * Restart the language server immediately. Only reachable through {@link
     * #requestGatedRestart(long)} — never call directly, and this method only ever runs on the
     * gate's pooled Alarm thread ({@link AlarmScheduler}), so the bounded wait below never blocks
     * the EDT.
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
        LanguageServerManager manager = LanguageServerManager.getInstance(project);
        ServerStatus statusBeforeStop = manager.getServerStatus(SERVER_ID);
        LOG.info("Restarting the BBj language server; status before the stop: " + statusBeforeStop);
        // Arm unconditionally, before every stop -- the token is one-shot and self-disarming, so
        // there is no cost to arming when it turns out not to be needed, but gating the arm on a
        // single, possibly-stale status read risks leaving a genuine expected stop unguarded.
        expectedStop.arm(System.currentTimeMillis());
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
            // Deliberately no unconditional disarm here. The pid that BbjLanguageServer#stop()
            // attaches to this armed token (see #noteStoppingPid and ExpectedStopGuard#notePid) is
            // what protects a later crash report from being wrongly swallowed or wrongly
            // attributed -- not this token's armed/disarmed state. A report that names that pid is
            // classified as an expected stop no matter how long the old process actually took to
            // exit; a report naming any other pid, including the freshly started server below, is
            // still reported as a genuine crash. Disarming unconditionally here would erase the
            // pid the moment the bounded wait times out, which is exactly the race that let a
            // delayed exit of the old process get misclassified as a crash of the new one.
            LOG.info("Starting the BBj language server; status before the start: "
                + manager.getServerStatus(SERVER_ID));
            manager.start(SERVER_ID);
        }
    }

    /**
     * Attaches the pid of the process actually being stopped to any currently armed expected-stop
     * token, called from {@code BbjLanguageServer#stop()} once it knows its own pid -- {@link
     * #doRestart()} itself cannot read that pid directly, since it reaches the language server
     * only through the vendor's {@link LanguageServerManager}, not the connection provider
     * instance. Forwards straight to {@link ExpectedStopGuard#notePid(Long)}, which is itself
     * synchronized and a no-op when nothing is currently armed, so a stop invoked outside a
     * {@link #doRestart()} cycle (nothing armed) leaves the guard untouched.
     */
    public void noteStoppingPid(@Nullable Long pid) {
        expectedStop.notePid(pid);
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
