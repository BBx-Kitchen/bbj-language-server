package com.basis.bbj.intellij.ui;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.util.Alarm;
import com.intellij.util.messages.Topic;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

/**
 * Project-level service managing BBj language server lifecycle.
 * Centralizes server start/stop/restart operations, debounced restart scheduling,
 * and status broadcast to UI components (status bar widget).
 */
public final class BbjServerService implements Disposable {

    private final Project project;
    private ServerStatus currentStatus = ServerStatus.stopped;
    private final Alarm restartAlarm;
    private static final int RESTART_DEBOUNCE_MS = 500;
    private long lastCrashTime = 0;
    private int crashCount = 0;

    public BbjServerService(@NotNull Project project) {
        this.project = project;
        this.restartAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
    }

    public static BbjServerService getInstance(@NotNull Project project) {
        return project.getService(BbjServerService.class);
    }

    /**
     * Update server status and notify all listeners (status bar widget).
     */
    public void updateStatus(@NotNull ServerStatus status) {
        this.currentStatus = status;
        ApplicationManager.getApplication().invokeLater(() -> {
            project.getMessageBus()
                .syncPublisher(BbjServerStatusListener.TOPIC)
                .statusChanged(status);
        });
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

    @Override
    public void dispose() {
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
