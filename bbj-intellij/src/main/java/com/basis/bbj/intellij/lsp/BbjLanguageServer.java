package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjNodeDetector;
import com.basis.bbj.intellij.BbjNodeDownloader;
import com.basis.bbj.intellij.BbjNodeVersionCache;
import com.basis.bbj.intellij.BbjPluginDescriptor;
import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.NodeActions;
import com.basis.bbj.intellij.lsp.NodeExecutableResolver;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.extensions.PluginDescriptor;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider;
import org.jetbrains.annotations.NotNull;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Starts the BBj language server process using Node.js.
 * Resolves the bundled main.cjs from plugin resources and launches:
 * {@code node main.cjs --stdio}
 */
public final class BbjLanguageServer extends OSProcessStreamConnectionProvider {

    /**
     * The platform logger, so this decision is readable in {@code idea.log} on a user's machine.
     * Every step below is logged, not only the rejections: a resolution that succeeds and one that
     * never had a candidate to consider both used to leave the log completely silent, which is why
     * a Node.js resolution failure in the field could not be diagnosed from a log at all.
     */
    private static final Logger LOG = Logger.getInstance(BbjLanguageServer.class);

    /**
     * Set the first time this provider's own unexpected-stop handler is registered, so a second
     * registration on the same instance never adds a duplicate. LSP4IJ constructs a fresh provider
     * for every {@code start()}, so this field never carries state across restarts.
     */
    private boolean ownStopHandlerRegistered;

    /**
     * The owning project, kept so {@link #onUnexpectedStop()} can reach {@link BbjServerService}
     * without a vendor-provided project reference -- the hook it registers with runs off any
     * request context.
     */
    private final Project project;

    public BbjLanguageServer(@NotNull Project project) {
        this.project = project;

        // Resolve Node.js path
        String nodePath = resolveNodePath(project);

        // Resolve language server main.cjs path
        String serverPath = resolveServerPath();

        // Build command line: node main.cjs --stdio
        GeneralCommandLine cmd = new GeneralCommandLine(nodePath, serverPath, "--stdio");
        cmd.setCharset(StandardCharsets.UTF_8);
        cmd.setWorkDirectory(new File(project.getBasePath()));

        LOG.info("Launching the BBj language server: " + cmd.getCommandLineString()
                + " (working directory: " + cmd.getWorkDirectory() + ")");

        super.setCommandLine(cmd);
    }

    /**
     * Forwards LSP4IJ's own handler to {@code super} first, unchanged, so its own recovery (its
     * own error notification and stop handling) runs before anything of ours. Then, only the first
     * time this instance is asked, registers this provider's own handler beside it -- never
     * wrapping, replacing or dropping LSP4IJ's handler. This method itself adds no behaviour beyond
     * logging: what happens when the process ends without a stop request is entirely inside
     * {@link #onUnexpectedStop()}.
     */
    @Override
    public void addUnexpectedServerStopHandler(Runnable handler) {
        super.addUnexpectedServerStopHandler(handler);
        if (!ownStopHandlerRegistered) {
            ownStopHandlerRegistered = true;
            super.addUnexpectedServerStopHandler(this::onUnexpectedStop);
            LOG.info("BBj language server unexpected-stop handler registered beside LSP4IJ's own");
        }
    }

    /**
     * Runs only when the OS process ended without this provider's {@link #stop()} having been
     * called first (LSP4IJ's own gate on its {@code isStopped()} flag). Reads the pid and the exit
     * code, then hands both to {@link BbjServerService#reportUnexpectedExit(Long, Integer)} --
     * nothing here classifies the event, restarts anything or touches UI state; it runs on the
     * platform's process-wait thread, not the EDT, so the report is a plain synchronous call
     * guarded against the project already being disposed.
     */
    private void onUnexpectedStop() {
        if (project.isDisposed()) {
            return;
        }
        Long pid = getPid();
        Integer exitCode = null;
        var processHandler = getProcessHandler();
        if (processHandler != null) {
            exitCode = processHandler.getExitCode();
        }
        try {
            BbjServerService.getInstance(project).reportUnexpectedExit(pid, exitCode);
        } catch (RuntimeException e) {
            LOG.warn("BBj language server unexpected-stop report failed", e);
        }
    }

    /**
     * Logs the pid and whether the process is still alive at the moment a stop was requested, then
     * delegates to the vendor superclass's stop handling exactly once. LSP4IJ calls this for every
     * deliberate stop, and again after its own unexpected-stop handling runs -- so whether this
     * line appears before or after the process actually ended is what tells a deliberate stop apart
     * from a crash in the log. Also hands this instance's own pid to {@link
     * BbjServerService#noteStoppingPid(Long)}, so a restart in progress can correlate a later
     * {@link #onUnexpectedStop()} report against the exact process this stop targets, rather than
     * against a disarm-on-timeout race.
     */
    @Override
    public void stop() {
        Long pid = getPid();
        LOG.info("BBj language server connection stop requested (pid "
                + (pid == null ? "unknown" : pid)
                + ", process alive: " + isAlive() + ")");
        if (!project.isDisposed()) {
            BbjServerService.getInstance(project).noteStoppingPid(pid);
        }
        super.stop();
    }

    private String resolveNodePath(@NotNull Project project) {
        String configuredPath = BbjSettings.getInstance().getState().nodeJsPath;
        String detectedPath = BbjNodeDetector.detectNodePath();
        boolean cacheDirectoryAccessible = BbjNodeDownloader.isNodeDataDirectoryAccessible();
        Path cachedPath = BbjNodeDownloader.getCachedNodePath();

        LOG.info("Resolving a Node.js executable for the BBj language server."
                + " Configured: " + describeCandidate(configuredPath)
                + "; detected on PATH: " + describeCandidate(detectedPath)
                + "; downloaded: " + describeCandidate(cachedPath == null ? null : cachedPath.toString())
                + "; download directory accessible: " + cacheDirectoryAccessible);

        NodeExecutableResolver.Resolution resolution = NodeExecutableResolver.resolve(
                configuredPath, detectedPath, cachedPath != null ? cachedPath.toString() : null,
                cacheDirectoryAccessible, NodeExecutableResolver.REAL_FILESYSTEM,
                BbjNodeVersionCache.SESSION::getVersion, BbjNodeDetector::meetsMinimumVersion);

        for (NodeExecutableResolver.Rejected rejected : resolution.rejections()) {
            LOG.warn(rejected.toString());
        }

        if (resolution.isResolved()) {
            LOG.info("Using the " + resolution.source() + " Node.js executable: " + resolution.path());
            return resolution.path();
        }

        String failureMessage = resolution.failureMessage();
        LOG.warn("No usable Node.js executable; the BBj language server cannot start. " + failureMessage);
        notifyUnresolvedNodePath(project, resolution);
        throw new RuntimeException(failureMessage);
    }

    /**
     * Renders one candidate for the log, naming an absent candidate explicitly. A blank candidate
     * is skipped silently by the resolver and records no rejection, so without this the log could
     * not distinguish "nothing was configured" from "what was configured was rejected".
     */
    private static String describeCandidate(String candidate) {
        return (candidate == null || candidate.isBlank()) ? "<none>" : "\"" + candidate + "\"";
    }

    private static void notifyUnresolvedNodePath(
            @NotNull Project project, @NotNull NodeExecutableResolver.Resolution resolution) {
        Notification notification = new Notification(
                "BBj Language Server",
                "BBj Language Server",
                resolution.failureMessage(),
                NotificationType.ERROR
        );
        for (String actionId : NodePresentation.bannerActions(resolution)) {
            notification.addAction(new NotificationAction(NodePresentation.actionLabel(actionId)) {
                @Override
                public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                    n.expire();
                    NodeActions.perform(project, actionId);
                }
            });
        }
        Notifications.Bus.notify(notification, project);
    }

    private String resolveServerPath() {
        // Try plugin installation path first
        PluginDescriptor plugin = BbjPluginDescriptor.get();
        if (plugin != null) {
            Path serverPath = plugin.getPluginPath().resolve("lib").resolve("language-server").resolve("main.cjs");
            if (Files.exists(serverPath)) {
                return serverPath.toAbsolutePath().toString();
            }
        }

        // Fallback: extract from classloader resource (development mode)
        try {
            URL resource = getClass().getClassLoader().getResource("language-server/main.cjs");
            if (resource != null) {
                // Extract to temp file since Node.js needs filesystem path
                Path tempFile = Files.createTempFile("bbj-language-server-", ".cjs");
                tempFile.toFile().deleteOnExit();
                try (InputStream in = resource.openStream()) {
                    Files.copy(in, tempFile, StandardCopyOption.REPLACE_EXISTING);
                }
                return tempFile.toAbsolutePath().toString();
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to extract language server bundle", e);
        }

        throw new RuntimeException("BBj language server bundle (main.cjs) not found");
    }
}
