package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowInitial;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelection;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelectionBit;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Field-wise equality for the {@code decodeCall} results the stale-edit guard compares (#567): the
 * pre-dialog decode against a fresh re-decode of the captured line's current text. Comparing only
 * the edit ranges would be wrong -- the dialog's result was computed from the pre-dialog call's
 * arguments, so if {@code initial} or {@code trailingArgs} changed underneath it the composed
 * statement no longer reflects what the user was looking at, and the safe answer is to treat that as
 * a mismatch even when the ranges happen to line up. Every comparator here uses
 * {@link Objects#equals(Object, Object)} so a null on either side is handled without a branch per
 * field, rather than by reference identity.
 *
 * <p>A field added to a decode result, its edit payload, or its initial payload must be added to
 * the matching comparator here too -- this class is the equality contract, not the DTO. This
 * applies to {@link SetoptsDecodeResult} (#633) as well as the MSGBOX/addWindow/addChildWindow
 * results above.
 */
public final class DecodeEquality {

    private DecodeEquality() {}

    /**
     * True when both are null, false when exactly one is null, and otherwise a field-wise
     * comparison of {@code found}, the {@code edit} payload ({@code callStart}/{@code callEnd}), the
     * top-level {@code trailingArgs}, and the whole {@code initial} payload ({@code message},
     * {@code title}, {@code assignTo}, {@code buttonSet}, {@code icon}, {@code defaultButton},
     * {@code flags}, {@code customButtons}, {@code trailingArgs}, {@code editMode} and
     * {@code useConstants}).
     */
    public static boolean sameMsgbox(MsgboxDecodeResult a, MsgboxDecodeResult b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.found == b.found
                && sameMsgboxEdit(a.edit, b.edit)
                && Objects.equals(a.trailingArgs, b.trailingArgs)
                && sameMsgboxInitial(a.initial, b.initial);
    }

    private static boolean sameMsgboxEdit(MsgboxEdit a, MsgboxEdit b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.callStart == b.callStart && a.callEnd == b.callEnd;
    }

    private static boolean sameMsgboxInitial(MsgboxPreviewInput a, MsgboxPreviewInput b) {
        if (a == null || b == null) {
            return a == b;
        }
        return Objects.equals(a.message, b.message)
                && Objects.equals(a.title, b.title)
                && Objects.equals(a.assignTo, b.assignTo)
                && a.buttonSet == b.buttonSet
                && a.icon == b.icon
                && a.defaultButton == b.defaultButton
                && Objects.equals(a.flags, b.flags)
                && Objects.equals(a.customButtons, b.customButtons)
                && Objects.equals(a.trailingArgs, b.trailingArgs)
                && Objects.equals(a.editMode, b.editMode)
                && Objects.equals(a.useConstants, b.useConstants);
    }

    /**
     * True when both are null, false when exactly one is null, and otherwise a field-wise
     * comparison of {@code found}, the {@code edit} payload and the {@code initial} payload,
     * delegating to the private helpers shared with {@link #sameAddChildWindow}, since both decode
     * results carry the same edit and initial shapes.
     */
    public static boolean sameAddWindow(AddWindowDecodeResult a, AddWindowDecodeResult b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.found == b.found && sameWindowEdit(a.edit, b.edit) && sameWindowInitial(a.initial, b.initial);
    }

    /**
     * True when both are null, false when exactly one is null, and otherwise the same field-wise
     * comparison {@link #sameAddWindow} performs -- {@code AddChildWindowDecodeResult} reuses
     * {@link AddWindowEdit} and {@link AddWindowInitial} for its {@code edit}/{@code initial} shapes.
     */
    public static boolean sameAddChildWindow(AddChildWindowDecodeResult a, AddChildWindowDecodeResult b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.found == b.found && sameWindowEdit(a.edit, b.edit) && sameWindowInitial(a.initial, b.initial);
    }

    private static boolean sameWindowEdit(AddWindowEdit a, AddWindowEdit b) {
        if (a == null || b == null) {
            return a == b;
        }
        // int[] ranges are compared element-wise with Arrays.equals -- reference equality would be
        // wrong, since a fresh decode never returns the same array instance as the captured one.
        return Arrays.equals(a.flagsRange, b.flagsRange)
                && Objects.equals(a.flagsInsertOffset, b.flagsInsertOffset)
                && Arrays.equals(a.eventMaskRange, b.eventMaskRange)
                && Objects.equals(a.eventMaskInsertOffset, b.eventMaskInsertOffset)
                && a.preservedFlagBits == b.preservedFlagBits
                && a.preservedEventBits == b.preservedEventBits;
    }

    private static boolean sameWindowInitial(AddWindowInitial a, AddWindowInitial b) {
        if (a == null || b == null) {
            return a == b;
        }
        return Objects.equals(a.flags, b.flags)
                && a.eventMaskEnabled == b.eventMaskEnabled
                && Objects.equals(a.eventMask, b.eventMask)
                && Objects.equals(a.title, b.title);
    }

    /**
     * True when both are null, false when exactly one is null, and otherwise a field-wise
     * comparison of {@code found}, the {@code edit} payload ({@code hexRange}/{@code insertOffset}/
     * {@code hexDigits}) and the {@code initial} selection ({@code bits}/{@code maskComma}/
     * {@code maskDot}/{@code rawTail}) (#633).
     */
    public static boolean sameSetopts(SetoptsDecodeResult a, SetoptsDecodeResult b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.found == b.found
                && sameSetoptsEdit(a.edit, b.edit)
                && sameSetoptsSelection(a.initial, b.initial);
    }

    private static boolean sameSetoptsEdit(SetoptsEdit a, SetoptsEdit b) {
        if (a == null || b == null) {
            return a == b;
        }
        // hexRange is an int[]: compared element-wise with Arrays.equals -- a fresh re-decode never
        // returns the same array instance as the captured one, so reference equality would report
        // every re-decode as a mismatch and turn the stale-edit guard into a permanent refusal.
        return Arrays.equals(a.hexRange, b.hexRange)
                && Objects.equals(a.insertOffset, b.insertOffset)
                && Objects.equals(a.hexDigits, b.hexDigits);
    }

    private static boolean sameSetoptsSelection(SetoptsSelection a, SetoptsSelection b) {
        if (a == null || b == null) {
            return a == b;
        }
        return Objects.equals(a.maskComma, b.maskComma)
                && Objects.equals(a.maskDot, b.maskDot)
                && Objects.equals(a.rawTail, b.rawTail)
                && sameSetoptsBits(a.bits, b.bits);
    }

    /**
     * The DTO's {@code bits} field has no {@code equals} override, so comparing the lists directly
     * would compare by reference and always report a mismatch -- an explicit element-wise loop over
     * {@code byteNo}/{@code mask} is required instead.
     */
    private static boolean sameSetoptsBits(List<SetoptsSelectionBit> a, List<SetoptsSelectionBit> b) {
        if (a == null || b == null) {
            return a == b;
        }
        if (a.size() != b.size()) {
            return false;
        }
        for (int i = 0; i < a.size(); i++) {
            SetoptsSelectionBit x = a.get(i);
            SetoptsSelectionBit y = b.get(i);
            if (x.byteNo != y.byteNo || x.mask != y.mask) {
                return false;
            }
        }
        return true;
    }
}
