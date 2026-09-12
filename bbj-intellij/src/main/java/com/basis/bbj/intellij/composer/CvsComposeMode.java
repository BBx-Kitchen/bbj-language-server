package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.CvsDecodeResult;

/**
 * Plain-Java routing seam (#649) deciding what {@code ComposerLauncher.openCvs} does with a CVS()
 * decode: compose a brand new call, edit an existing literal-sum call in place, complete a call
 * the user is still typing, or refuse to open a dialog at all.
 *
 * <p>The {@link #of} check deliberately tests {@code incomplete} before {@code editable}: the
 * server never sends both true at once, but if it ever did, opening the dialog with a read-only
 * verbatim string field (the {@code editable} branch's behaviour) would be wrong for a call that
 * has nothing to preserve yet. Routing incomplete first keeps that impossible regardless.</p>
 */
public enum CvsComposeMode {
    COMPOSE_NEW,
    EDIT_IN_PLACE,
    COMPLETE_CALL,
    NOT_EDITABLE;

    public static CvsComposeMode of(CvsDecodeResult decoded) {
        if (decoded == null || !decoded.found) {
            return COMPOSE_NEW;
        }
        if (decoded.incomplete) {
            return COMPLETE_CALL;
        }
        if (decoded.editable) {
            return EDIT_IN_PLACE;
        }
        return NOT_EDITABLE;
    }
}
