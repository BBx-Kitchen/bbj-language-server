package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;

/**
 * Editor action: open the visual CVS() composer (#649). Position-aware — if the caret is inside
 * an existing, server-editable {@code CVS(...)} call the dialog opens prefilled and reconfigures
 * it in place; otherwise it composes a new statement and inserts it at the caret. The decode
 * (editable vs. not) is always the language server's own decision, never a Java-side parse here.
 */
public final class BbjComposeCvsAction extends BbjComposeActionBase {

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.CVS;
    }
}
