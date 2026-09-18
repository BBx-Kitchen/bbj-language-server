package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.CatalogItem;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
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
}
