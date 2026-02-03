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
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.EditorNotifications;
import com.intellij.util.Alarm;
import com.intellij.util.messages.MessageBusConnection;
import com.intellij.util.messages.Topic;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Project-level service managing BBj language server lifecycle.
 * Centralizes server start/stop/restart operations, debounced restart scheduling,
 * crash recovery with auto-restart logic, and status broadcast to UI components.
 */
public final class BbjServerService implements Disposable {

    private final Project project;
    private ServerStatus currentStatus = ServerStatus.stopped;
    private ServerStatus previousStatus = ServerStatus.stopped;
    private final Alarm restartAlarm;
    private static final int RESTART_DEBOUNCE_MS = 500;
    private static final long CRASH_WINDOW_MS = 30_000; // 30 seconds
    private static final int GRACE_PERIOD_SECONDS = 30;
    private long lastCrashTime = 0;
    private int crashCount = 0;
    private boolean serverCrashed = false;
    private ConsoleView consoleView;
    private final ScheduledExecutorService gracePeriodScheduler;
    private ScheduledFuture<?> gracePeriodTask;
    private boolean inGracePeriod = false;

    public BbjServerService(@NotNull Project project) {
        this.project = project;
        this.restartAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
        this.gracePeriodScheduler = Executors.newSingleThreadScheduledExecutor();

        // Register disposal to force-stop server on project close
        Disposer.register(project, this);

        // Subscribe to file editor events to track BBj file open/close
        MessageBusConnection connection = project.getMessageBus().connect(this);
        connection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER,
            new FileEditorManagerListener() {
                @Override
                public void fileOpened(@NotNull FileEditorManager source, @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        cancelGracePeriod();
                    }
                }

                @Override
                public void fileClosed(@NotNull FileEditorManager source, @NotNull VirtualFile file) {
                    if (isBbjFile(file)) {
                        checkAndStartGracePeriod();
                    }
                }
            });
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
     * Update server status and notify all listeners (status bar widget).
     * Implements crash detection and auto-restart logic.
     */
    public void updateStatus(@NotNull ServerStatus status) {
        // Detect unexpected stop (crash)
        if (status == ServerStatus.stopped &&
            (previousStatus == ServerStatus.started || previousStatus == ServerStatus.starting)) {

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
                ApplicationManager.getApplication().invokeLater(() -> {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    restart();
                });
            } else if (crashCount >= 2) {
                // Stop auto-restart after second crash
                logToConsole("Language server crashed twice. Stopping auto-restart.", ConsoleViewContentType.ERROR_OUTPUT);
                notifyCrash();
                ApplicationManager.getApplication().invokeLater(() -> {
                    EditorNotifications.getInstance(project).updateAllNotifications();
                });
            }
        }

        // Clear crash state when server successfully starts
        if (status == ServerStatus.started) {
            if (serverCrashed) {
                logToConsole("Language server started successfully", ConsoleViewContentType.SYSTEM_OUTPUT);
            }
            serverCrashed = false;
            crashCount = 0;
            ApplicationManager.getApplication().invokeLater(() -> {
                EditorNotifications.getInstance(project).updateAllNotifications();
            });
        }

        previousStatus = currentStatus;
        this.currentStatus = status;

        ApplicationManager.getApplication().invokeLater(() -> {
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
                    clearCrashState();
                    restart();
                    n.expire();
                }
            })
            .notify(project);
    }

    /**
     * Restart the language server immediately.
     */
    public void restart() {
        LanguageServerManager manager = LanguageServerManager.getInstance(project);
        manager.stop("bbjLanguageServer");
        manager.start("bbjLanguageServer");
    }

    /**
     * Schedule a debounced restart. Multiple calls within RESTART_DEBOUNCE_MS
     * will result in a single restart.
     */
    public void scheduleRestart() {
        restartAlarm.cancelAllRequests();
        restartAlarm.addRequest(this::restart, RESTART_DEBOUNCE_MS);
    }

    public ServerStatus getCurrentStatus() {
        return currentStatus;
    }

    /**
     * Check if a file is a BBj file (.bbj, .bbl, .bbjt, .src).
     */
    private boolean isBbjFile(@NotNull VirtualFile file) {
        String ext = file.getExtension();
        return ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src"));
    }

    /**
     * Check if any BBj files are currently open. If none are open and server is running,
     * start the grace period shutdown timer.
     */
    private void checkAndStartGracePeriod() {
        FileEditorManager editorManager = FileEditorManager.getInstance(project);
        VirtualFile[] openFiles = editorManager.getOpenFiles();

        boolean hasBbjFileOpen = false;
        for (VirtualFile file : openFiles) {
            if (isBbjFile(file)) {
                hasBbjFileOpen = true;
                break;
            }
        }

        if (!hasBbjFileOpen && currentStatus == ServerStatus.started) {
            startGracePeriod();
        }
    }

    /**
     * Start the 30-second grace period shutdown timer.
     */
    private void startGracePeriod() {
        if (inGracePeriod) {
            return; // Already in grace period
        }

        inGracePeriod = true;
        logToConsole("No BBj files open. Starting " + GRACE_PERIOD_SECONDS + "-second grace period...", ConsoleViewContentType.SYSTEM_OUTPUT);

        // Notify status bar to show idle state
        ApplicationManager.getApplication().invokeLater(() -> {
            project.getMessageBus()
                .syncPublisher(BbjServerStatusListener.TOPIC)
                .statusChanged(currentStatus);
        });

        gracePeriodTask = gracePeriodScheduler.schedule(() -> {
            logToConsole("Grace period expired. Stopping language server.", ConsoleViewContentType.SYSTEM_OUTPUT);
            inGracePeriod = false;
            ApplicationManager.getApplication().invokeLater(() -> {
                LanguageServerManager.getInstance(project).stop("bbjLanguageServer");
            });
        }, GRACE_PERIOD_SECONDS, TimeUnit.SECONDS);
    }

    /**
     * Cancel the grace period shutdown timer if a BBj file is opened.
     */
    private void cancelGracePeriod() {
        if (!inGracePeriod) {
            return;
        }

        if (gracePeriodTask != null && !gracePeriodTask.isDone()) {
            gracePeriodTask.cancel(false);
            gracePeriodTask = null;
            inGracePeriod = false;
            logToConsole("BBj file opened. Cancelling grace period shutdown.", ConsoleViewContentType.SYSTEM_OUTPUT);

            // Notify status bar to remove idle state
            ApplicationManager.getApplication().invokeLater(() -> {
                project.getMessageBus()
                    .syncPublisher(BbjServerStatusListener.TOPIC)
                    .statusChanged(currentStatus);
            });
        }
    }

    /**
     * Check if the server is currently in grace period (idle state).
     */
    public boolean isInGracePeriod() {
        return inGracePeriod;
    }

    @Override
    public void dispose() {
        // Stop language server cleanly on project close
        logToConsole("Project closing, stopping language server", ConsoleViewContentType.SYSTEM_OUTPUT);
        gracePeriodScheduler.shutdownNow();
        LanguageServerManager.getInstance(project).stop("bbjLanguageServer");
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
