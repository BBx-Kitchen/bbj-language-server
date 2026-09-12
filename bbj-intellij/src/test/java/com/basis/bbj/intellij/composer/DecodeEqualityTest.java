package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowInitial;
import com.basis.bbj.intellij.composer.ComposerModels.CvsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.CvsEdit;
import com.basis.bbj.intellij.composer.ComposerModels.CvsInitial;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxReplace;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelection;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelectionBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeAbsoluteEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeChainEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateEntry;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateSelection;

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
        MsgboxReplace replace = new MsgboxReplace();
        replace.originalOptions = "flags%";
        replace.banner = "Could not decode this options expression — composing will replace it.";
        decoded.replace = replace;
        decoded.hasOptions = true;
        decoded.incomplete = false;
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
        if (src.replace != null) {
            MsgboxReplace replace = new MsgboxReplace();
            replace.originalOptions = src.replace.originalOptions;
            replace.banner = src.replace.banner;
            decoded.replace = replace;
        }
        decoded.hasOptions = src.hasOptions;
        decoded.incomplete = src.incomplete;
        return decoded;
    }

    /** An incomplete decode of an unfinished call -- no message/title typed yet beyond {@code message}. */
    private static MsgboxDecodeResult baseIncompleteMsgbox(int callEnd, String message) {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = true;
        MsgboxEdit edit = new MsgboxEdit();
        edit.callStart = 4;
        edit.callEnd = callEnd;
        decoded.edit = edit;
        decoded.trailingArgs = new ArrayList<>();
        MsgboxPreviewInput initial = new MsgboxPreviewInput();
        initial.message = message;
        initial.title = "";
        initial.buttonSet = 0;
        initial.icon = 0;
        initial.defaultButton = 0;
        initial.flags = new ArrayList<>();
        initial.customButtons = new ArrayList<>();
        initial.trailingArgs = new ArrayList<>();
        decoded.initial = initial;
        decoded.replace = null;
        decoded.hasOptions = false;
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

    // ---- SETOPTS fixtures (#633) ---------------------------------------------------------------

    private static SetoptsDecodeResult baseSetopts() {
        SetoptsDecodeResult decoded = new SetoptsDecodeResult();
        decoded.found = true;
        SetoptsEdit edit = new SetoptsEdit();
        edit.hexRange = new int[] {8, 22};
        edit.insertOffset = null;
        edit.hexDigits = "08004020000000";
        decoded.edit = edit;
        SetoptsSelection initial = new SetoptsSelection();
        initial.bits = new ArrayList<>(List.of(new SetoptsSelectionBit(1, 0x08), new SetoptsSelectionBit(3, 0x40)));
        initial.maskComma = ",";
        initial.maskDot = ".";
        initial.rawTail = "1122";
        decoded.initial = initial;
        return decoded;
    }

    private static SetoptsDecodeResult copyOfSetopts(SetoptsDecodeResult src) {
        SetoptsDecodeResult decoded = new SetoptsDecodeResult();
        decoded.found = src.found;
        SetoptsEdit edit = new SetoptsEdit();
        edit.hexRange = src.edit.hexRange == null ? null : src.edit.hexRange.clone();
        edit.insertOffset = src.edit.insertOffset;
        edit.hexDigits = src.edit.hexDigits;
        decoded.edit = edit;
        SetoptsSelection initial = new SetoptsSelection();
        initial.bits = new ArrayList<>();
        for (SetoptsSelectionBit b : src.initial.bits) {
            initial.bits.add(new SetoptsSelectionBit(b.byteNo, b.mask));
        }
        initial.maskComma = src.initial.maskComma;
        initial.maskDot = src.initial.maskDot;
        initial.rawTail = src.initial.rawTail;
        decoded.initial = initial;
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
                d -> d.initial.useConstants = !d.initial.useConstants,
                d -> d.replace.originalOptions = "mutated%",
                d -> d.replace.banner = "mutated banner",
                d -> d.hasOptions = !d.hasOptions,
                d -> d.incomplete = !d.incomplete);

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

        MsgboxDecodeResult nullReplace = copyOfMsgbox(a);
        nullReplace.replace = null;
        assertFalse(DecodeEquality.sameMsgbox(a, nullReplace), "a null replace on one side only must not match");
    }

    @Test
    void twoIdenticalMsgboxDecodesWithANullReplaceOnBothSidesMatch() {
        MsgboxDecodeResult a = baseMsgbox();
        a.replace = null;
        MsgboxDecodeResult b = copyOfMsgbox(a);
        b.replace = null;
        assertTrue(DecodeEquality.sameMsgbox(a, b), "a null replace on both sides must compare equal");
    }

    @Test
    void twoMsgboxDecodesDifferingOnlyInReplaceOriginalOptionsDoNotMatch() {
        MsgboxDecodeResult a = baseMsgbox();
        MsgboxDecodeResult b = copyOfMsgbox(a);
        b.replace.originalOptions = "different%";
        assertFalse(DecodeEquality.sameMsgbox(a, b),
                "a different replace.originalOptions must not match, even with everything else identical");
    }

    @Test
    void twoIncompleteMsgboxDecodesOfTheSameUnfinishedCallMatch() {
        MsgboxDecodeResult a = baseIncompleteMsgbox(11, "");
        MsgboxDecodeResult b = baseIncompleteMsgbox(11, "");
        assertTrue(DecodeEquality.sameMsgbox(a, b),
                "two independently built incomplete decodes of the same unfinished call must match");
    }

    @Test
    void anIncompleteMsgboxDecodeWhoseCallGrewDoesNotMatch() {
        MsgboxDecodeResult before = baseIncompleteMsgbox(11, "");
        MsgboxDecodeResult after = baseIncompleteMsgbox(16, "\"Hi\"");
        assertFalse(DecodeEquality.sameMsgbox(before, after),
                "an incomplete call whose span or message grew must not match the earlier decode");
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

    // ---- SETOPTS tests (#633) ------------------------------------------------------------------

    @Test
    void twoIdenticalSetoptsDecodesMatch() {
        SetoptsDecodeResult a = baseSetopts();
        SetoptsDecodeResult b = copyOfSetopts(a);
        assertTrue(DecodeEquality.sameSetopts(a, b),
                "two independently built results with identical field values must compare equal by value");
    }

    @Test
    void changingAnySingleComparedSetoptsFieldBreaksTheMatch() {
        List<Consumer<SetoptsDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.edit.hexRange = new int[] {8, 23},
                d -> d.edit.insertOffset = 99,
                d -> d.edit.hexDigits = "FFFFFFFFFFFFFF",
                d -> d.initial.bits = List.of(new SetoptsSelectionBit(9, 0x01)),
                d -> d.initial.maskComma = "!",
                d -> d.initial.maskDot = "!",
                d -> d.initial.rawTail = "FFFF");

        for (Consumer<SetoptsDecodeResult> mutator : mutators) {
            SetoptsDecodeResult a = baseSetopts();
            SetoptsDecodeResult b = copyOfSetopts(a);
            mutator.accept(b);
            assertFalse(DecodeEquality.sameSetopts(a, b),
                    "mutating exactly one compared setopts field must break the match");
        }
    }

    @Test
    void setoptsNullsOnEitherSideAreHandledWithoutThrowing() {
        assertTrue(DecodeEquality.sameSetopts(null, null), "both null must match");
        assertFalse(DecodeEquality.sameSetopts(baseSetopts(), null), "one null must not match");
        assertFalse(DecodeEquality.sameSetopts(null, baseSetopts()), "one null must not match, either order");

        SetoptsDecodeResult a = baseSetopts();

        SetoptsDecodeResult nullEdit = copyOfSetopts(a);
        nullEdit.edit = null;
        assertFalse(DecodeEquality.sameSetopts(a, nullEdit), "a null edit on one side only must not match");

        SetoptsDecodeResult nullInitial = copyOfSetopts(a);
        nullInitial.initial = null;
        assertFalse(DecodeEquality.sameSetopts(a, nullInitial), "a null initial on one side only must not match");
    }

    @Test
    void setoptsHexRangeIsComparedElementWiseRatherThanByIdentity() {
        SetoptsDecodeResult a = baseSetopts();
        SetoptsDecodeResult b = copyOfSetopts(a);
        assertNotSame(a.edit.hexRange, b.edit.hexRange, "the two range arrays must be distinct instances");
        assertTrue(DecodeEquality.sameSetopts(a, b),
                "two distinct int[] instances holding the same two values must match");

        b.edit.hexRange[1] = b.edit.hexRange[1] + 1;
        assertFalse(DecodeEquality.sameSetopts(a, b), "changing one array element must break the match");
    }

    // ---- SETOPTS-in-code fixtures (#475, DISC-06) -----------------------------------------------

    private static SetoptsInCodeDecodeResult baseSetoptsInCode() {
        SetoptsInCodeDecodeResult decoded = new SetoptsInCodeDecodeResult();
        decoded.found = true;
        decoded.editable = true;
        decoded.mode = "chain";
        decoded.reason = "unsafe reassignment";
        decoded.summary = "Byte 1: Console mode";
        SetoptsInCodeAbsoluteEdit absolute = new SetoptsInCodeAbsoluteEdit();
        absolute.line = 4;
        absolute.hexRange = new int[] {8, 22};
        absolute.hexDigits = "08004020000000";
        decoded.absolute = absolute;
        SetoptsInCodeChainEdit chain = new SetoptsInCodeChainEdit();
        chain.variableName = "opts$";
        chain.startLine = 5;
        chain.endLine = 8;
        chain.indent = "    ";
        decoded.chain = chain;
        SetoptsTriStateSelection initial = new SetoptsTriStateSelection();
        initial.entries = new ArrayList<>(List.of(
                new SetoptsTriStateEntry(1, 0x08, "set"),
                new SetoptsTriStateEntry(3, 0x40, "clear")));
        decoded.initial = initial;
        return decoded;
    }

    private static SetoptsInCodeDecodeResult copyOfSetoptsInCode(SetoptsInCodeDecodeResult src) {
        SetoptsInCodeDecodeResult decoded = new SetoptsInCodeDecodeResult();
        decoded.found = src.found;
        decoded.editable = src.editable;
        decoded.mode = src.mode;
        decoded.reason = src.reason;
        decoded.summary = src.summary;
        if (src.absolute != null) {
            SetoptsInCodeAbsoluteEdit absolute = new SetoptsInCodeAbsoluteEdit();
            absolute.line = src.absolute.line;
            absolute.hexRange = src.absolute.hexRange == null ? null : src.absolute.hexRange.clone();
            absolute.hexDigits = src.absolute.hexDigits;
            decoded.absolute = absolute;
        }
        if (src.chain != null) {
            SetoptsInCodeChainEdit chain = new SetoptsInCodeChainEdit();
            chain.variableName = src.chain.variableName;
            chain.startLine = src.chain.startLine;
            chain.endLine = src.chain.endLine;
            chain.indent = src.chain.indent;
            decoded.chain = chain;
        }
        if (src.initial != null) {
            SetoptsTriStateSelection initial = new SetoptsTriStateSelection();
            initial.entries = new ArrayList<>();
            for (SetoptsTriStateEntry e : src.initial.entries) {
                initial.entries.add(new SetoptsTriStateEntry(e.byteNo, e.mask, e.state));
            }
            decoded.initial = initial;
        }
        return decoded;
    }

    @Test
    void setoptsInCodeNullsOnEitherSideAreHandledWithoutThrowing() {
        assertTrue(DecodeEquality.sameSetoptsInCode(null, null), "both null must match");
        assertFalse(DecodeEquality.sameSetoptsInCode(baseSetoptsInCode(), null), "one null must not match");
        assertFalse(DecodeEquality.sameSetoptsInCode(null, baseSetoptsInCode()), "one null must not match, either order");
    }

    @Test
    void twoIdenticalSetoptsInCodeDecodesMatch() {
        SetoptsInCodeDecodeResult a = baseSetoptsInCode();
        SetoptsInCodeDecodeResult b = copyOfSetoptsInCode(a);
        assertNotSame(a.absolute.hexRange, b.absolute.hexRange, "the two range arrays must be distinct instances");
        assertTrue(DecodeEquality.sameSetoptsInCode(a, b),
                "two independently built results with identical field values must compare equal by value");
    }

    @Test
    void changingAnySingleComparedSetoptsInCodeFieldBreaksTheMatch() {
        List<Consumer<SetoptsInCodeDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.editable = !d.editable,
                d -> d.mode = "absolute",
                d -> d.reason = "different reason",
                d -> d.summary = "different summary",
                d -> d.absolute.line = d.absolute.line + 1,
                d -> d.absolute.hexRange = new int[] {8, 23},
                d -> d.absolute.hexDigits = "FFFFFFFFFFFFFF",
                d -> d.chain.variableName = "other$",
                d -> d.chain.startLine = d.chain.startLine + 1,
                d -> d.chain.endLine = d.chain.endLine + 1,
                d -> d.chain.indent = "\t",
                d -> d.initial.entries.get(0).byteNo = 9,
                d -> d.initial.entries.get(0).mask = 0x01,
                d -> d.initial.entries.get(0).state = "leave");

        for (Consumer<SetoptsInCodeDecodeResult> mutator : mutators) {
            SetoptsInCodeDecodeResult a = baseSetoptsInCode();
            SetoptsInCodeDecodeResult b = copyOfSetoptsInCode(a);
            mutator.accept(b);
            assertFalse(DecodeEquality.sameSetoptsInCode(a, b),
                    "mutating exactly one compared setopts-in-code field must break the match");
        }
    }

    @Test
    void reorderedTriStateEntriesAreNotEqualEvenThoughTheSetOfOptionsIsTheSame() {
        SetoptsInCodeDecodeResult a = baseSetoptsInCode();
        SetoptsInCodeDecodeResult b = copyOfSetoptsInCode(a);
        List<SetoptsTriStateEntry> reversed = new ArrayList<>(b.initial.entries);
        java.util.Collections.reverse(reversed);
        b.initial.entries = reversed;

        assertFalse(DecodeEquality.sameSetoptsInCode(a, b),
                "the same entries in a different order must NOT compare equal -- the guard fails closed");
    }

    @Test
    void setoptsInCodeAbsoluteHexRangeIsComparedElementWiseRatherThanByIdentity() {
        SetoptsInCodeDecodeResult a = baseSetoptsInCode();
        SetoptsInCodeDecodeResult b = copyOfSetoptsInCode(a);
        assertTrue(DecodeEquality.sameSetoptsInCode(a, b),
                "two distinct int[] instances holding the same two values must match");

        b.absolute.hexRange[1] = b.absolute.hexRange[1] + 1;
        assertFalse(DecodeEquality.sameSetoptsInCode(a, b), "changing one array element must break the match");
    }

    @Test
    void setoptsInCodeNullInitialOnBothSidesAndEmptyEntriesOnBothSidesCompareEqual() {
        SetoptsInCodeDecodeResult a = baseSetoptsInCode();
        a.initial = null;
        SetoptsInCodeDecodeResult b = copyOfSetoptsInCode(a);
        b.initial = null;
        assertTrue(DecodeEquality.sameSetoptsInCode(a, b), "both null initial must compare equal");

        SetoptsInCodeDecodeResult c = baseSetoptsInCode();
        c.initial = new SetoptsTriStateSelection();
        c.initial.entries = new ArrayList<>();
        SetoptsInCodeDecodeResult d = copyOfSetoptsInCode(c);
        assertTrue(DecodeEquality.sameSetoptsInCode(c, d), "both empty entries lists must compare equal");
    }

    @Test
    void setoptsInCodeNullEditPayloadsOnOneSideOnlyDoNotMatch() {
        SetoptsInCodeDecodeResult a = baseSetoptsInCode();

        SetoptsInCodeDecodeResult nullAbsolute = copyOfSetoptsInCode(a);
        nullAbsolute.absolute = null;
        assertFalse(DecodeEquality.sameSetoptsInCode(a, nullAbsolute),
                "a null absolute on one side only must not match");

        SetoptsInCodeDecodeResult nullChain = copyOfSetoptsInCode(a);
        nullChain.chain = null;
        assertFalse(DecodeEquality.sameSetoptsInCode(a, nullChain),
                "a null chain on one side only must not match");

        SetoptsInCodeDecodeResult nullInitial = copyOfSetoptsInCode(a);
        nullInitial.initial = null;
        assertFalse(DecodeEquality.sameSetoptsInCode(a, nullInitial),
                "a null initial on one side only must not match");
    }

    // ---- CVS() fixtures (#649) ------------------------------------------------------------------

    private static CvsDecodeResult baseCvs() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = true;
        decoded.editable = true;
        decoded.incomplete = false;
        decoded.reason = null;
        CvsEdit edit = new CvsEdit();
        edit.callStart = 5;
        edit.callEnd = 20;
        decoded.edit = edit;
        CvsInitial initial = new CvsInitial();
        initial.str = "a$";
        initial.bits = new ArrayList<>(List.of(1L, 4L));
        initial.chars = "\"*\"";
        decoded.initial = initial;
        decoded.trailingArgs = new ArrayList<>(List.of("ERR=100"));
        return decoded;
    }

    private static CvsDecodeResult copyOfCvs(CvsDecodeResult src) {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = src.found;
        decoded.editable = src.editable;
        decoded.incomplete = src.incomplete;
        decoded.reason = src.reason;
        if (src.edit != null) {
            CvsEdit edit = new CvsEdit();
            edit.callStart = src.edit.callStart;
            edit.callEnd = src.edit.callEnd;
            decoded.edit = edit;
        }
        if (src.initial != null) {
            CvsInitial initial = new CvsInitial();
            initial.str = src.initial.str;
            initial.bits = src.initial.bits == null ? null : new ArrayList<>(src.initial.bits);
            initial.chars = src.initial.chars;
            decoded.initial = initial;
        }
        decoded.trailingArgs = src.trailingArgs == null ? null : new ArrayList<>(src.trailingArgs);
        return decoded;
    }

    @Test
    void twoIdenticalCvsDecodesMatch() {
        CvsDecodeResult a = baseCvs();
        CvsDecodeResult b = copyOfCvs(a);
        assertTrue(DecodeEquality.sameCvs(a, b),
                "two independently built results with identical field values must compare equal by value");
    }

    @Test
    void changingAnySingleComparedCvsFieldBreaksTheMatch() {
        List<Consumer<CvsDecodeResult>> mutators = List.of(
                d -> d.found = !d.found,
                d -> d.editable = !d.editable,
                d -> d.incomplete = !d.incomplete,
                d -> d.reason = "The mask argument is not a sum of integer literals, so it cannot be safely decoded.",
                d -> d.edit.callStart = d.edit.callStart + 1,
                d -> d.edit.callEnd = d.edit.callEnd + 1,
                d -> d.initial.str = "b$",
                d -> d.initial.bits = List.of(2L, 1L), // same values, different order
                d -> d.initial.chars = "\"#\"",
                d -> d.trailingArgs = List.of("mutated"));

        for (Consumer<CvsDecodeResult> mutator : mutators) {
            CvsDecodeResult a = baseCvs();
            CvsDecodeResult b = copyOfCvs(a);
            mutator.accept(b);
            assertFalse(DecodeEquality.sameCvs(a, b), "mutating exactly one compared CVS field must break the match");
        }
    }

    @Test
    void cvsNullsOnEitherSideAreHandledWithoutThrowing() {
        assertTrue(DecodeEquality.sameCvs(null, null), "both null must match");
        assertFalse(DecodeEquality.sameCvs(baseCvs(), null), "one null must not match");
        assertFalse(DecodeEquality.sameCvs(null, baseCvs()), "one null must not match, either order");

        CvsDecodeResult a = baseCvs();

        CvsDecodeResult nullEdit = copyOfCvs(a);
        nullEdit.edit = null;
        assertFalse(DecodeEquality.sameCvs(a, nullEdit), "a null edit on one side only must not match");

        CvsDecodeResult nullInitial = copyOfCvs(a);
        nullInitial.initial = null;
        assertFalse(DecodeEquality.sameCvs(a, nullInitial), "a null initial on one side only must not match");
    }

    @Test
    void notEditableCvsDecodesWithNoInitialOnBothSidesCompareEqual() {
        CvsDecodeResult a = new CvsDecodeResult();
        a.found = true;
        a.editable = false;
        a.reason = "The mask argument is not a sum of integer literals, so it cannot be safely decoded.";
        CvsEdit edit = new CvsEdit();
        edit.callStart = 5;
        edit.callEnd = 12;
        a.edit = edit;

        CvsDecodeResult b = copyOfCvs(a);
        assertTrue(DecodeEquality.sameCvs(a, b), "a null initial and trailingArgs on both sides must compare equal");
    }

    @Test
    void twoIncompleteCvsDecodesOfTheSameUnfinishedCallMatch() {
        CvsDecodeResult a = new CvsDecodeResult();
        a.found = true;
        a.editable = false;
        a.incomplete = true;
        CvsEdit editA = new CvsEdit();
        editA.callStart = 5;
        editA.callEnd = 9;
        a.edit = editA;
        CvsInitial initialA = new CvsInitial();
        initialA.str = "";
        initialA.bits = new ArrayList<>();
        initialA.chars = "";
        a.initial = initialA;
        a.trailingArgs = new ArrayList<>();

        CvsDecodeResult b = new CvsDecodeResult();
        b.found = true;
        b.editable = false;
        b.incomplete = true;
        CvsEdit editB = new CvsEdit();
        editB.callStart = 5;
        editB.callEnd = 9;
        b.edit = editB;
        CvsInitial initialB = new CvsInitial();
        initialB.str = "";
        initialB.bits = new ArrayList<>();
        initialB.chars = "";
        b.initial = initialB;
        b.trailingArgs = new ArrayList<>();

        assertTrue(DecodeEquality.sameCvs(a, b),
                "two independently built incomplete decodes of the same unfinished call must match");
    }

    @Test
    void anIncompleteCvsDecodeWhoseCallGrewDoesNotMatch() {
        CvsDecodeResult before = new CvsDecodeResult();
        before.found = true;
        before.editable = false;
        before.incomplete = true;
        CvsEdit editBefore = new CvsEdit();
        editBefore.callStart = 5;
        editBefore.callEnd = 9;
        before.edit = editBefore;
        CvsInitial initialBefore = new CvsInitial();
        initialBefore.str = "";
        initialBefore.bits = new ArrayList<>();
        initialBefore.chars = "";
        before.initial = initialBefore;
        before.trailingArgs = new ArrayList<>();

        CvsDecodeResult after = new CvsDecodeResult();
        after.found = true;
        after.editable = false;
        after.incomplete = true;
        CvsEdit editAfter = new CvsEdit();
        editAfter.callStart = 5;
        editAfter.callEnd = 14;
        after.edit = editAfter;
        CvsInitial initialAfter = new CvsInitial();
        initialAfter.str = "name$";
        initialAfter.bits = new ArrayList<>();
        initialAfter.chars = "";
        after.initial = initialAfter;
        after.trailingArgs = new ArrayList<>();

        assertFalse(DecodeEquality.sameCvs(before, after),
                "an incomplete call whose span or string grew must not match the earlier decode");
    }
}
