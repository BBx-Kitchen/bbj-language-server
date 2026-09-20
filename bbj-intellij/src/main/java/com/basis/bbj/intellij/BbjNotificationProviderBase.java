package com.basis.bbj.intellij;

import com.basis.bbj.intellij.ui.BbjFileVisibility;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import com.intellij.ui.EditorNotificationProvider;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Shared base for the four registered editor notification providers (#622). Owns the one
 * resolved-file-type visibility guard -- {@link BbjFileVisibility#isBbjProgramFileTypeName} --
 * and the {@code fileEditor}-arg panel construction, so "is this a BBj program file" has exactly
 * one definition in the tree and every banner is built the same way. This class is placed in
 * {@code com.basis.bbj.intellij} rather than {@code ui}, deliberately: it is a cross-package
 * caller of {@link BbjFileVisibility}, and three of the four subclasses already live in this
 * package, so no provider has to move.
 *
 * <p>{@link #collectNotificationData} is the base's one {@code final} sequencing point, mirroring
 * {@code BbjStatusBarWidgetBase}'s single {@code updateStatus} delegation: it runs the shared
 * guard and, once it passes, delegates to {@link #buildPanel}. {@code Status} is deliberately
 * NOT a field on this base -- each subclass supplies it at its own panel-construction call site,
 * so the crash banner keeps {@code Error} while the other three keep {@code Warning}. Action
 * labels are likewise per-provider and never hoisted here.
 *
 * <p>Every provider becomes {@link DumbAware} through this base, so banners now render during
 * indexing -- an intended, declared behaviour change (D-10).
 */
public abstract class BbjNotificationProviderBase implements EditorNotificationProvider, DumbAware {

    @Override
    public final @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {
        if (!BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())) {
            return null;
        }
        return buildPanel(project, file);
    }

    /**
     * Builds this provider's banner, or returns {@code null} for "no banner". Called only after
     * the shared file-type guard has already passed -- implementations must not re-derive
     * visibility themselves.
     */
    protected abstract @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file);

    /** Shared panel factory every subclass calls with its own {@code Status} and banner text. */
    protected static EditorNotificationPanel newPanel(
            @NotNull FileEditor fileEditor, EditorNotificationPanel.Status status, String text) {
        EditorNotificationPanel panel = new EditorNotificationPanel(fileEditor, status);
        panel.setText(text);
        return panel;
    }
}
