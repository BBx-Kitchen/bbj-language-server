package com.basis.bbj.intellij.denum;

import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.DirtyFileCoalescer;
import com.basis.bbj.intellij.ui.BbjFileVisibility;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.editor.event.DocumentEvent;
import com.intellij.openapi.editor.event.DocumentListener;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.NotNull;

/**
 * Re-evaluates the editor banners of a BBj program shortly after its text changes, so the
 * line-numbered banner disappears once the denumbered text lands and comes back after an Undo.
 * There is one document listener per project, filtered to BBj program files before anything is
 * scheduled, and the banner refreshes are debounced per file. Only the file that changed is
 * refreshed, never every open editor.
 *
 * <p>The service is created with the first banner evaluation of a BBj file, so no startup activity
 * is needed, and the platform disposes it, and with it the alarm and the listener, when the
 * project closes.
 */
public final class BbjLineNumberedBannerRefresher implements Disposable {

    static final long REFRESH_DELAY_MS = 300;

    private final Project project;
    private final DirtyFileCoalescer<VirtualFile> coalescer;

    public BbjLineNumberedBannerRefresher(@NotNull Project project) {
        this.project = project;
        this.coalescer = new DirtyFileCoalescer<VirtualFile>(
                new AlarmScheduler(this),
                REFRESH_DELAY_MS,
                task -> ApplicationManager.getApplication().invokeLater(task),
                this::refresh);

        DocumentListener listener = new DocumentListener() {
            @Override
            public void documentChanged(@NotNull DocumentEvent event) {
                onChange(event.getDocument());
            }

            @Override
            public void bulkUpdateFinished(@NotNull Document document) {
                onChange(document);
            }
        };
        EditorFactory.getInstance().getEventMulticaster().addDocumentListener(listener, this);
    }

    public static BbjLineNumberedBannerRefresher getInstance(@NotNull Project project) {
        return project.getService(BbjLineNumberedBannerRefresher.class);
    }

    private void onChange(@NotNull Document document) {
        VirtualFile file = FileDocumentManager.getInstance().getFile(document);
        if (file == null || !BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())) {
            return;
        }
        coalescer.mark(file);
    }

    private void refresh(@NotNull VirtualFile file) {
        if (project.isDisposed() || !file.isValid()) {
            return;
        }
        EditorNotifications.getInstance(project).updateNotifications(file);
    }

    @Override
    public void dispose() {
        // The alarm and the document listener are parented to this service and go with it.
    }
}
