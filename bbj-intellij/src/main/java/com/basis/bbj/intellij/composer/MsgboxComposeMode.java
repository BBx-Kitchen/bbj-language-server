package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;

/**
 * Plain-Java routing seam deciding what {@code ComposerLauncher.openMsgbox} does with a MSGBOX
 * decode: compose a brand new call, edit an existing call in place, open compose-and-replace for
 * an undecodable options expression, or complete a call the user is still typing.
 *
 * <p>Unlike {@link CvsComposeMode}, the MSGBOX decode outcomes carry no not-editable verdict, so
 * this enum has no equivalent to {@code NOT_EDITABLE}. The {@link #of} check deliberately tests
 * {@code incomplete} before {@code replace}: the server never sends both true at once, but if it
 * ever did, completing the unfinished call is the right outcome, not opening a compose-and-replace
 * banner for a call that has nothing yet to preserve.</p>
 */
public enum MsgboxComposeMode {
    COMPOSE_NEW,
    EDIT_IN_PLACE,
    REPLACE_OPTIONS,
    COMPLETE_CALL;

    public static MsgboxComposeMode of(MsgboxDecodeResult decoded) {
        if (decoded == null || !decoded.found) {
            return COMPOSE_NEW;
        }
        if (decoded.incomplete) {
            return COMPLETE_CALL;
        }
        if (decoded.replace != null) {
            return REPLACE_OPTIONS;
        }
        return EDIT_IN_PLACE;
    }
}
