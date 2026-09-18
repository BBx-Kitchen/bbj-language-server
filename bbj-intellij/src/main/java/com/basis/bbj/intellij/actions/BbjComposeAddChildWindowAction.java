package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;

/**
 * Editor action: open the visual addChildWindow composer (#473). Position-aware — if the caret is
 * inside an existing {@code addChildWindow(...)} the dialog opens prefilled and rewrites its flag/
 * event_mask hex in place; otherwise it composes a new statement and inserts it at the caret.
 */
public final class BbjComposeAddChildWindowAction extends BbjComposeActionBase {

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.ADDCHILDWINDOW;
    }
}
