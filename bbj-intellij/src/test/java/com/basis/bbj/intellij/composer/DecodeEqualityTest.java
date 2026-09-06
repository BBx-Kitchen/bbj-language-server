package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowInitial;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewInput;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Field-wise coverage of {@link DecodeEquality} (#567): identical decodes match, a change to any
 * single compared field breaks the match, nulls are handled on either side without throwing, and
 * array-valued ranges are compared element-wise rather than by reference identity.
 */
class DecodeEqualityTest {

    // ---- MSGBOX fixtures ---------------------------------------------------------------------

    private static MsgboxDecodeResult baseMsgbox() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        MsgboxEdit edit = new MsgboxEdit();
        edit.callStart = 5;
        edit.callEnd = 20;
        decoded.edit = edit;
        decoded.trailingArgs = new ArrayList<>(List.of("a", "b"));
        MsgboxPreviewInput initial = new MsgboxPreviewInput();
        initial.message = "\"hi\"";
        initial.title = "\"t\"";
        initial.assignTo = "x!";
        initial.buttonSet = 1;
        initial.icon = 2;
        initial.defaultButton = 3;
        initial.flags = new ArrayList<>(List.of(1L, 2L));
        initial.customButtons = new ArrayList<>(List.of("OK", "Cancel"));
        initial.trailingArgs = new ArrayList<>(List.of("c"));
        initial.editMode = true;
        initial.useConstants = false;
        decoded.initial = initial;
        return decoded;
    }

    private static MsgboxDecodeResult copyOfMsgbox(MsgboxDecodeResult src) {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = src.found;
        MsgboxEdit edit = new MsgboxEdit();
        edit.callStart = src.edit.callStart;
        edit.callEnd = src.edit.callEnd;
        decoded.edit = edit;
        decoded.trailingArgs = new ArrayList<>(src.trailingArgs);
        MsgboxPreviewInput initial = new MsgboxPreviewInput();
        initial.message = src.initial.message;
        initial.title = src.initial.title;
        initial.assignTo = src.initial.assignTo;
        initial.buttonSet = src.initial.buttonSet;
        initial.icon = src.initial.icon;
        initial.defaultButton = src.initial.defaultButton;
        initial.flags = new ArrayList<>(src.initial.flags);
        initial.customButtons = new ArrayList<>(src.initial.customButtons);
        initial.trailingArgs = new ArrayList<>(src.initial.trailingArgs);
        initial.editMode = src.initial.editMode;
        initial.useConstants = src.initial.useConstants;
        decoded.initial = initial;
        return decoded;
    }

    // ---- addWindow fixtures -------------------------------------------------------------------

    private static AddWindowDecodeResult baseAddWindow() {
        AddWindowDecodeResult decoded = new AddWindowDecodeResult();
        decoded.found = true;
        AddWindowEdit edit = new AddWindowEdit();
        edit.flagsRange = new int[] {1, 5};
        edit.flagsInsertOffset = null;
        edit.eventMaskRange = new int[] {10, 15};
        edit.eventMaskInsertOffset = null;
        edit.preservedFlagBits = 7L;
        edit.preservedEventBits = 3L;
        decoded.edit = edit;
        AddWindowInitial initial = new AddWindowInitial();
        initial.flags = new ArrayList<>(List.of(1L, 2L));
        initial.eventMaskEnabled = true;
        initial.eventMask = new ArrayList<>(List.of(4L));
        initial.title = "\"Window\"";
        decoded.initial = initial;
        return decoded;
    }

    private static AddWindowDecodeResult copyOfAddWindow(AddWindowDecodeResult src) {
        AddWindowDecodeResult decoded = new AddWindowDecodeResult();
        decoded.found = src.found;
        AddWindowEdit edit = new AddWindowEdit();
        edit.flagsRange = src.edit.flagsRange == null ? null : src.edit.flagsRange.clone();
        edit.flagsInsertOffset = src.edit.flagsInsertOffset;
        edit.eventMaskRange = src.edit.eventMaskRange == null ? null : src.edit.eventMaskRange.clone();
        edit.eventMaskInsertOffset = src.edit.eventMaskInsertOffset;
        edit.preservedFlagBits = src.edit.preservedFlagBits;
        edit.preservedEventBits = src.edit.preservedEventBits;
        decoded.edit = edit;
        AddWindowInitial initial = new AddWindowInitial();
        initial.flags = new ArrayList<>(src.initial.flags);
        initial.eventMaskEnabled = src.initial.eventMaskEnabled;
        initial.eventMask = new ArrayList<>(src.initial.eventMask);
        initial.title = src.initial.title;
        decoded.initial = initial;
        return decoded;
    }

    // ---- addChildWindow fixtures (shares the addWindow edit/initial shapes) -------------------

    private static AddChildWindowDecodeResult baseAddChildWindow() {
        AddChildWindowDecodeResult decoded = new AddChildWindowDecodeResult();
        AddWindowDecodeResult borrowed = baseAddWindow();
        decoded.found = borrowed.found;
        decoded.edit = borrowed.edit;
        decoded.initial = borrowed.initial;
        return decoded;
    }

    private static AddChildWindowDecodeResult copyOfAddChildWindow(AddChildWindowDecodeResult src) {
        AddWindowDecodeResult asAddWindow = new AddWindowDecodeResult();
        asAddWindow.found = src.found;
        asAddWindow.edit = src.edit;
        asAddWindow.initial = src.initial;
        AddWindowDecodeResult copied = copyOfAddWindow(asAddWindow);
        AddChildWindowDecodeResult decoded = new AddChildWindowDecodeResult();
        decoded.found = copied.found;
        decoded.edit = copied.edit;
        decoded.initial = copied.initial;
        return decoded;
    }

    @Test
    void twoIdenticalMsgboxDecodesMatch() {
        MsgboxDecodeResult a = baseMsgbox();
        MsgboxDecodeResult b = copyOfMsgbox(a);
        assertTrue(DecodeEquality.sameMsgbox(a, b),
                "two independently built results with identical field values must compare equal by value");
    }

    @Test
    void aMsgboxDecodeWhoseRangesAreIdenticalButWhoseInitialDiffersDoesNotMatch() {
        MsgboxDecodeResult a = baseMsgbox();

        MsgboxDecodeResult differentMessage = copyOfMsgbox(a);
        differentMessage.initial.message = "\"different\"";
        assertFalse(DecodeEquality.sameMsgbox(a, differentMessage),
                "identical callStart/callEnd but a different initial.message must not match -- the guard "
                        + "is about the call's arguments, not just its span");

        MsgboxDecodeResult differentTrailing = copyOfMsgbox(a);
        differentTrailing.trailingArgs = List.of("different");
        assertFalse(DecodeEquality.sameMsgbox(a, differentTrailing),
                "identical ranges but different trailingArgs must not match either");
    }

    @Test
    void changingAnySingleComparedMsgboxFieldBreaksTheMatch() {
        List<Consumer<MsgboxDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.edit.callStart = d.edit.callStart + 1,
                d -> d.edit.callEnd = d.edit.callEnd + 1,
                d -> d.trailingArgs = List.of("mutated"),
                d -> d.initial.message = "\"mutated\"",
                d -> d.initial.title = "\"mutated\"",
                d -> d.initial.assignTo = "mutated!",
                d -> d.initial.buttonSet = d.initial.buttonSet + 1,
                d -> d.initial.icon = d.initial.icon + 1,
                d -> d.initial.defaultButton = d.initial.defaultButton + 1,
                d -> d.initial.flags = List.of(99L),
                d -> d.initial.customButtons = List.of("mutated"),
                d -> d.initial.trailingArgs = List.of("mutated"),
                d -> d.initial.editMode = !d.initial.editMode,
                d -> d.initial.useConstants = !d.initial.useConstants);

        for (Consumer<MsgboxDecodeResult> mutator : mutators) {
            MsgboxDecodeResult a = baseMsgbox();
            MsgboxDecodeResult b = copyOfMsgbox(a);
            mutator.accept(b);
            assertFalse(DecodeEquality.sameMsgbox(a, b),
                    "mutating exactly one compared field must break the match");
        }
    }

    @Test
    void nullsOnEitherSideAreHandledWithoutThrowing() {
        assertTrue(DecodeEquality.sameMsgbox(null, null), "both null must match");
        assertFalse(DecodeEquality.sameMsgbox(baseMsgbox(), null), "one null must not match");
        assertFalse(DecodeEquality.sameMsgbox(null, baseMsgbox()), "one null must not match, either order");

        MsgboxDecodeResult a = baseMsgbox();

        MsgboxDecodeResult nullEdit = copyOfMsgbox(a);
        nullEdit.edit = null;
        assertFalse(DecodeEquality.sameMsgbox(a, nullEdit), "a null edit on one side only must not match");

        MsgboxDecodeResult nullInitial = copyOfMsgbox(a);
        nullInitial.initial = null;
        assertFalse(DecodeEquality.sameMsgbox(a, nullInitial), "a null initial on one side only must not match");

        MsgboxDecodeResult nullTrailing = copyOfMsgbox(a);
        nullTrailing.trailingArgs = null;
        assertFalse(DecodeEquality.sameMsgbox(a, nullTrailing),
                "a null trailingArgs on one side only must not match");
    }

    @Test
    void twoIdenticalAddWindowDecodesMatchAndAnyChangedFieldBreaksIt() {
        AddWindowDecodeResult a = baseAddWindow();
        AddWindowDecodeResult b = copyOfAddWindow(a);
        assertTrue(DecodeEquality.sameAddWindow(a, b),
                "identical field values across distinct instances must match");

        List<Consumer<AddWindowDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.edit.flagsRange = new int[] {1, 6},
                d -> d.edit.flagsInsertOffset = 99,
                d -> d.edit.eventMaskRange = new int[] {10, 16},
                d -> d.edit.eventMaskInsertOffset = 99,
                d -> d.edit.preservedFlagBits = 999L,
                d -> d.edit.preservedEventBits = 999L,
                d -> d.initial.flags = List.of(99L),
                d -> d.initial.eventMaskEnabled = !d.initial.eventMaskEnabled,
                d -> d.initial.eventMask = List.of(99L),
                d -> d.initial.title = "\"different\"");

        for (Consumer<AddWindowDecodeResult> mutator : mutators) {
            AddWindowDecodeResult a2 = baseAddWindow();
            AddWindowDecodeResult b2 = copyOfAddWindow(a2);
            mutator.accept(b2);
            assertFalse(DecodeEquality.sameAddWindow(a2, b2),
                    "mutating exactly one compared addWindow field must break the match");
        }
    }

    @Test
    void rangeArraysAreComparedElementWiseRatherThanByIdentity() {
        AddWindowDecodeResult a = baseAddWindow();
        AddWindowDecodeResult b = copyOfAddWindow(a);
        assertNotSame(a.edit.flagsRange, b.edit.flagsRange, "the two range arrays must be distinct instances");
        assertTrue(DecodeEquality.sameAddWindow(a, b),
                "two distinct int[] instances holding the same two values must match");

        b.edit.flagsRange[1] = b.edit.flagsRange[1] + 1;
        assertFalse(DecodeEquality.sameAddWindow(a, b), "changing one array element must break the match");
    }

    @Test
    void addChildWindowUsesTheSameComparisonAsAddWindow() {
        AddChildWindowDecodeResult a = baseAddChildWindow();
        AddChildWindowDecodeResult b = copyOfAddChildWindow(a);
        assertTrue(DecodeEquality.sameAddChildWindow(a, b),
                "identical field values across distinct instances must match, sharing addWindow's shapes");

        List<Consumer<AddChildWindowDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.edit.flagsRange = new int[] {1, 6},
                d -> d.edit.preservedFlagBits = 999L,
                d -> d.initial.eventMaskEnabled = !d.initial.eventMaskEnabled,
                d -> d.initial.title = "\"different\"");

        for (Consumer<AddChildWindowDecodeResult> mutator : mutators) {
            AddChildWindowDecodeResult a2 = baseAddChildWindow();
            AddChildWindowDecodeResult b2 = copyOfAddChildWindow(a2);
            mutator.accept(b2);
            assertFalse(DecodeEquality.sameAddChildWindow(a2, b2),
                    "mutating exactly one compared addChildWindow field must break the match");
        }
    }
}
