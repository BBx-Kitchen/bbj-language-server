package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;

/**
 * Editor action: open the visual MSGBOX composer (#426/#433). Position-aware — if the caret is
 * inside an existing {@code MSGBOX(...)} the dialog opens prefilled and reconfigures it in place;
 * otherwise it composes a new statement and inserts it at the caret.
 */
public final class BbjComposeMsgboxAction extends BbjComposeActionBase {

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.MSGBOX;
    }
}
