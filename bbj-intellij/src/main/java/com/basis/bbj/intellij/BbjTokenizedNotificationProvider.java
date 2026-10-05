package com.basis.bbj.intellij;

import com.basis.bbj.intellij.tokenized.BbjTokenizedDecompiler;
import com.basis.bbj.intellij.tokenized.TokenizedBbj;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Offers to decompile a tokenized (binary) BBj program. The banner has two actions, no dismiss
 * control and no setting behind it: Decompile &amp; Replace rewrites the program as source and
 * Open Read-only shows a source copy beside it.
 *
 * <p>The verdict comes from the first bytes of the file itself, never from the editor's
 * document, which is garbled text for a binary program, and it is recomputed every time the
 * platform asks, so the banner goes away as soon as the file holds source. The shared base
 * supplies the BBj-program file-type guard. The banner only offers; the file changes solely when
 * the user clicks a link.
 */
public final class BbjTokenizedNotificationProvider extends BbjNotificationProviderBase {

    static final String BANNER_TEXT =
            "This is a tokenized (binary) BBj program. Decompile it to editable source, or open a read-only copy.";

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {
        if (!TokenizedBbj.readsTokenized(file)) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Info, BANNER_TEXT);
            panel.createActionLabel("Decompile & Replace",
                    () -> BbjTokenizedDecompiler.decompileReplace(project, file));
            panel.createActionLabel("Open Read-only",
                    () -> BbjTokenizedDecompiler.openReadOnly(project, file));
            return panel;
        };
    }
}
