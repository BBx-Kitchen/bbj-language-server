package com.basis.bbj.intellij.tokenized;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.CapturingProcessHandler;
import com.intellij.execution.process.ProcessOutput;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.SystemInfo;
import com.intellij.openapi.util.text.StringUtil;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * The two choices the tokenized-program banner offers, run as background tasks with the
 * {@code bbjlst} of the configured BBj Home: Decompile &amp; Replace rewrites the program in place
 * as source, Open Read-only shows a non-writable source copy and leaves the program alone. Every
 * failure is one "Decompile failed" notification that names the cause.
 */
public final class BbjTokenizedDecompiler {

    private static final long BBJLST_TIMEOUT_MILLIS = 60_000;

    /** Runs bbjlst as an argument list, never through a shell. */
    private static final BbjLstCommand.Runner PROCESS_RUNNER = (argv, timeoutMillis) -> {
        try {
            CapturingProcessHandler handler = new CapturingProcessHandler(new GeneralCommandLine(argv));
            ProcessOutput output = handler.runProcess((int) timeoutMillis);
            return new BbjLstCommand.Output(
                    output.getExitCode(), output.getStdout(), output.getStderr(), output.isTimeout());
        } catch (ExecutionException e) {
            throw new IOException(e.getMessage() == null ? e.toString() : e.getMessage(), e);
        }
    };

    private BbjTokenizedDecompiler() {
    }

    /** What the shared first steps hand to both choices. */
    private record Prepared(@NotNull Path executable, @NotNull Path resolvedInput) {
    }

    /** Decompiles the tokenized program and replaces it in place with the source. */
    public static void decompileReplace(@NotNull Project project, @NotNull VirtualFile file) {
        new Task.Backgroundable(project, "Decompiling " + file.getName() + "…", false) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                ApplicationManager.getApplication().assertIsNonDispatchThread();
                replace(project, file);
            }
        }.queue();
    }

    /** Decompiles the tokenized program into a read-only source copy and opens that copy. */
    public static void openReadOnly(@NotNull Project project, @NotNull VirtualFile file) {
        new Task.Backgroundable(project, "Decompiling " + file.getName() + "…", false) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                ApplicationManager.getApplication().assertIsNonDispatchThread();
                readOnly(project, file);
            }
        }.queue();
    }

    private static void replace(@NotNull Project project, @NotNull VirtualFile file) {
        Prepared prepared = prepare(project, file);
        if (prepared == null) {
            return;
        }
        boolean modified = ReadAction.compute(() -> FileDocumentManager.getInstance().isFileModified(file));
        if (modified) {
            failed(project, "\"" + file.getName() + "\" has unsaved changes in the editor. Save or revert them first.");
            return;
        }

        Path dir = null;
        try {
            dir = BbjLstCommand.decompileToPrivateDir(
                    prepared.executable(), prepared.resolvedInput(), PROCESS_RUNNER, BBJLST_TIMEOUT_MILLIS, null);
            BbjLstCommand.replaceInPlace(
                    prepared.resolvedInput(), BbjLstCommand.listingFor(dir, prepared.resolvedInput()));
        } catch (BbjLstCommand.DecompileException e) {
            failed(project, e.getMessage());
            return;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            failed(project, "interrupted");
            return;
        } catch (IOException e) {
            failed(project, "Could not replace \"" + file.getName() + "\": " + TokenizedBbj.describe(e));
            return;
        } finally {
            BbjLstCommand.deleteRecursively(dir);
        }

        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed() || !file.isValid()) {
                return;
            }
            VfsUtil.markDirtyAndRefresh(false, false, false, file);
            FileDocumentManager.getInstance().reloadFiles(file);
            // Closing and reopening gives the language client a fresh document with the source.
            FileEditorManager editors = FileEditorManager.getInstance(project);
            if (editors.isFileOpen(file)) {
                editors.closeFile(file);
                editors.openFile(file, true);
            }
            EditorNotifications.getInstance(project).updateNotifications(file);
        });
    }

    private static void readOnly(@NotNull Project project, @NotNull VirtualFile file) {
        Prepared prepared = prepare(project, file);
        if (prepared == null) {
            return;
        }

        Path dir = null;
        boolean opened = false;
        try {
            dir = BbjLstCommand.decompileToPrivateDir(
                    prepared.executable(), prepared.resolvedInput(), PROCESS_RUNNER, BBJLST_TIMEOUT_MILLIS, null);
            Path listing = BbjLstCommand.listingFor(dir, prepared.resolvedInput());
            Path copy = dir.resolve(BbjLstCommand.readOnlyName(file.getName()));
            if (!copy.equals(listing)) {
                Files.move(listing, copy);
            }
            if (!copy.toFile().setWritable(false)) {
                failed(project, "Could not make the decompiled copy of \"" + file.getName() + "\" read-only.");
                return;
            }
            VirtualFile copyFile = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(copy);
            if (copyFile == null) {
                failed(project, "Could not open the decompiled copy of \"" + file.getName() + "\".");
                return;
            }
            ApplicationManager.getApplication().invokeLater(() -> {
                if (!project.isDisposed() && copyFile.isValid()) {
                    FileEditorManager.getInstance(project).openFile(copyFile, true);
                }
            });
            opened = true;
        } catch (BbjLstCommand.DecompileException e) {
            failed(project, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            failed(project, "interrupted");
        } catch (IOException e) {
            failed(project, "Could not prepare a read-only copy of \"" + file.getName() + "\": "
                    + TokenizedBbj.describe(e));
        } finally {
            // The directory is the home of the opened copy; it only goes away when nothing was shown.
            if (!opened) {
                BbjLstCommand.deleteRecursively(dir);
            }
        }
    }

    /** The steps both choices share, or {@code null} after the cause has been shown. */
    private static @Nullable Prepared prepare(@NotNull Project project, @NotNull VirtualFile file) {
        String home = BbjSettings.getInstance().getState().bbjHomePath;
        if (home == null || home.isBlank()) {
            failed(project, "BBj Home is not configured. Set it in Settings > Languages & Frameworks > BBj.");
            return null;
        }
        Path executable = BbjLstCommand.resolveExecutable(home, SystemInfo.isWindows);
        if (executable == null) {
            failed(project, "bbjlst was not found in " + home + "/bin.");
            return null;
        }

        Path nioPath;
        try {
            nioPath = file.toNioPath();
        } catch (UnsupportedOperationException e) {
            failed(project, "\"" + file.getName() + "\" is not a regular file, so there is nothing to decompile.");
            return null;
        }
        TokenizedBbj.Probe probe = TokenizedBbj.probe(nioPath);
        String refusal = TokenizedBbj.refusal(probe, file.getName());
        if (refusal != null || probe.resolvedPath() == null) {
            failed(project, refusal == null ? "Could not resolve \"" + file.getName() + "\"." : refusal);
            return null;
        }
        return new Prepared(executable, probe.resolvedPath());
    }

    private static void failed(@NotNull Project project, @Nullable String detail) {
        ApplicationManager.getApplication().invokeLater(() -> {
            if (project.isDisposed()) {
                return;
            }
            NotificationGroupManager.getInstance()
                    .getNotificationGroup("BBj Language Server")
                    .createNotification(
                            "Decompile failed",
                            StringUtil.escapeXmlEntities(detail == null ? "" : detail),
                            NotificationType.ERROR)
                    .notify(project);
        });
    }
}
