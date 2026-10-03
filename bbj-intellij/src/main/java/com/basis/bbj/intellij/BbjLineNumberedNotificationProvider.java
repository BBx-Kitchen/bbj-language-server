package com.basis.bbj.intellij;

import com.basis.bbj.intellij.actions.BbjDenumberAction;
import com.basis.bbj.intellij.denum.BbjLineNumberedBannerRefresher;
import com.basis.bbj.intellij.denum.LineNumbering;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.EditorNotificationPanel;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.function.Function;

/**
 * Offers Denumber on a line-numbered BBj program. The banner has exactly one action, no dismiss
 * control and no setting behind it: it is shown for as long as the buffer's own text looks
 * line-numbered, and choosing Denumber runs the same request path as the menu action.
 *
 * <p>The verdict is recomputed from the document text every time the platform asks, with no cached
 * state, so the banner goes away once the denumbered text lands and returns after an Undo. The
 * shared base supplies the BBj-program file-type guard, so other file types never reach this
 * class. The banner only offers; the buffer changes solely when the user clicks the link.
 */
public final class BbjLineNumberedNotificationProvider extends BbjNotificationProviderBase {

    static final String BANNER_TEXT = "This is a line-numbered BBj program. Denumber it for editing.";

    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {

        // Creates the project's refresher on the first BBj file the platform shows, so its document
        // listener exists from then on and no startup activity is needed.
        BbjLineNumberedBannerRefresher.getInstance(project);

        boolean lineNumbered = ReadAction.compute(() -> {
            Document document = FileDocumentManager.getInstance().getDocument(file);
            return document != null
                    && LineNumbering.isLineNumberedSource(document.getImmutableCharSequence());
        });
        if (!lineNumbered) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(
                    fileEditor, EditorNotificationPanel.Status.Info, BANNER_TEXT);
            panel.createActionLabel("Denumber", () -> BbjDenumberAction.denumber(project, file));
            return panel;
        };
    }
}
