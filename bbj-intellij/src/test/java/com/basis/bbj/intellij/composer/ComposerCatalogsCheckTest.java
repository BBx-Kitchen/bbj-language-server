package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.CatalogItem;
import com.basis.bbj.intellij.composer.ComposerModels.CvsBit;
import com.basis.bbj.intellij.composer.ComposerModels.CvsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsByteGroup;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of {@link ComposerCatalogsCheck} (#609): a catalogs payload is usable only
 * when its per-kind object is non-null AND every sub-list its dialog iterates is non-null. An
 * empty-but-non-null sub-list is usable -- a catalog that legitimately ships zero entries renders
 * an empty section, not a refusal. A plain JUnit 5 test with no {@code com.intellij} import,
 * exercising the plain-Java predicate directly.
 */
class ComposerCatalogsCheckTest {

    // ---- MSGBOX -------------------------------------------------------------------------------

    private static MsgboxCatalogs populatedMsgbox() {
        MsgboxCatalogs c = new MsgboxCatalogs();
        c.icons = List.of(new CatalogItem());
        c.buttonSets = List.of(new CatalogItem());
        c.defaultButtons = List.of(new CatalogItem());
        c.flags = List.of(new CatalogItem());
        return c;
    }

    @Test
    void aFullyPopulatedMsgboxCatalogsIsUsable() {
        assertTrue(ComposerCatalogsCheck.isUsable(populatedMsgbox()));
    }

    @Test
    void aNullMsgboxCatalogsIsNotUsable() {
        assertFalse(ComposerCatalogsCheck.isUsable((MsgboxCatalogs) null));
    }

    @Test
    void msgboxIsNotUsableWhenIconsIsNull() {
        MsgboxCatalogs c = populatedMsgbox();
        c.icons = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void msgboxIsNotUsableWhenButtonSetsIsNull() {
        MsgboxCatalogs c = populatedMsgbox();
        c.buttonSets = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void msgboxIsNotUsableWhenDefaultButtonsIsNull() {
        MsgboxCatalogs c = populatedMsgbox();
        c.defaultButtons = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void msgboxIsNotUsableWhenFlagsIsNull() {
        MsgboxCatalogs c = populatedMsgbox();
        c.flags = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void msgboxWithAllFourListsPresentButEmptyIsUsable() {
        MsgboxCatalogs c = new MsgboxCatalogs();
        c.icons = Collections.emptyList();
        c.buttonSets = Collections.emptyList();
        c.defaultButtons = Collections.emptyList();
        c.flags = Collections.emptyList();
        assertTrue(ComposerCatalogsCheck.isUsable(c));
    }

    // ---- addWindow / addChildWindow ------------------------------------------------------------

    private static AddWindowCatalogs populatedAddWindow() {
        AddWindowCatalogs c = new AddWindowCatalogs();
        c.flags = List.of(new CatalogItem());
        c.eventBits = List.of(new CatalogItem());
        return c;
    }

    @Test
    void aFullyPopulatedAddWindowCatalogsIsUsable() {
        assertTrue(ComposerCatalogsCheck.isUsable(populatedAddWindow()));
    }

    @Test
    void aNullAddWindowCatalogsIsNotUsable() {
        assertFalse(ComposerCatalogsCheck.isUsable((AddWindowCatalogs) null));
    }

    @Test
    void addWindowIsNotUsableWhenFlagsIsNull() {
        AddWindowCatalogs c = populatedAddWindow();
        c.flags = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void addWindowIsNotUsableWhenEventBitsIsNull() {
        AddWindowCatalogs c = populatedAddWindow();
        c.eventBits = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void addWindowWithBothListsPresentButEmptyIsUsable() {
        AddWindowCatalogs c = new AddWindowCatalogs();
        c.flags = Collections.emptyList();
        c.eventBits = Collections.emptyList();
        assertTrue(ComposerCatalogsCheck.isUsable(c));
    }

    // ---- SETOPTS / SETOPTS-in-code -----------------------------------------------------------

    private static SetoptsCatalogs populatedSetopts() {
        SetoptsCatalogs c = new SetoptsCatalogs();
        c.bits = List.of(new SetoptsBit());
        c.byteGroups = List.of(new SetoptsByteGroup());
        return c;
    }

    @Test
    void aFullyPopulatedSetoptsCatalogsIsUsable() {
        assertTrue(ComposerCatalogsCheck.isUsable(populatedSetopts()));
    }

    @Test
    void aNullSetoptsCatalogsIsNotUsable() {
        assertFalse(ComposerCatalogsCheck.isUsable((SetoptsCatalogs) null));
    }

    @Test
    void setoptsIsNotUsableWhenBitsIsNull() {
        SetoptsCatalogs c = populatedSetopts();
        c.bits = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void setoptsIsNotUsableWhenByteGroupsIsNull() {
        SetoptsCatalogs c = populatedSetopts();
        c.byteGroups = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void setoptsWithBothListsPresentButEmptyIsUsable() {
        SetoptsCatalogs c = new SetoptsCatalogs();
        c.bits = Collections.emptyList();
        c.byteGroups = Collections.emptyList();
        assertTrue(ComposerCatalogsCheck.isUsable(c));
    }

    // ---- CVS() ----------------------------------------------------------------------------------

    private static CvsCatalogs populatedCvs() {
        CvsCatalogs c = new CvsCatalogs();
        c.bits = List.of(new CvsBit());
        c.charsTooltip = "tooltip text";
        return c;
    }

    @Test
    void aFullyPopulatedCvsCatalogsIsUsable() {
        assertTrue(ComposerCatalogsCheck.isUsable(populatedCvs()));
    }

    @Test
    void aNullCvsCatalogsIsNotUsable() {
        assertFalse(ComposerCatalogsCheck.isUsable((CvsCatalogs) null));
    }

    @Test
    void cvsIsNotUsableWhenBitsIsNull() {
        CvsCatalogs c = populatedCvs();
        c.bits = null;
        assertFalse(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void cvsWithBitsPopulatedAndCharsTooltipNullIsStillUsableBecauseTheTooltipsNullityIsTolerated() {
        CvsCatalogs c = new CvsCatalogs();
        c.bits = List.of(new CvsBit());
        c.charsTooltip = null;
        assertTrue(ComposerCatalogsCheck.isUsable(c));
    }

    @Test
    void cvsWithBitsPresentButEmptyIsUsable() {
        CvsCatalogs c = new CvsCatalogs();
        c.bits = Collections.emptyList();
        assertTrue(ComposerCatalogsCheck.isUsable(c));
    }
}
