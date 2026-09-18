package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.CvsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;

/**
 * Decides whether a language-server-supplied {@code bbj/composer/catalogs} per-kind payload is
 * usable before a composer dialog is constructed (#609). From this plugin's perspective a catalogs
 * payload is untrusted input: every dialog constructor iterates one or more of its sub-lists
 * immediately, on the EDT, so a payload whose per-kind object is present but whose sub-list is
 * {@code null} throws a {@code NullPointerException} out of the constructor rather than degrading
 * gracefully. A sub-list that is present but empty is a different case entirely and is deliberately
 * treated as usable: a catalog that legitimately ships zero entries renders an empty section, which
 * is correct behaviour, not a reason to refuse to open. A plain-Java class with no
 * {@code com.intellij} import, so plain JUnit 5 can exercise it without a platform test fixture.
 */
public final class ComposerCatalogsCheck {

    private ComposerCatalogsCheck() {}

    /**
     * @param catalogs the MSGBOX catalogs object from a {@code bbj/composer/catalogs} response, or
     *     {@code null}
     * @return {@code true} only when {@code catalogs} is non-null and its {@code icons},
     *     {@code buttonSets}, {@code defaultButtons} and {@code flags} lists are all non-null.
     *     {@code MsgboxComposerDialog}'s constructor iterates all four (three through
     *     {@code fillCombo}, one directly), so all four are required.
     */
    public static boolean isUsable(MsgboxCatalogs catalogs) {
        return catalogs != null
                && catalogs.icons != null
                && catalogs.buttonSets != null
                && catalogs.defaultButtons != null
                && catalogs.flags != null;
    }

    /**
     * @param catalogs the addWindow/addChildWindow catalogs object from a
     *     {@code bbj/composer/catalogs} response, or {@code null} -- this one DTO serves both kinds,
     *     which share the same {@code {flags, eventBits}} shape
     * @return {@code true} only when {@code catalogs} is non-null and its {@code flags} and
     *     {@code eventBits} lists are both non-null.
     */
    public static boolean isUsable(AddWindowCatalogs catalogs) {
        return catalogs != null && catalogs.flags != null && catalogs.eventBits != null;
    }

    /**
     * @param catalogs the SETOPTS catalogs object from a {@code bbj/composer/catalogs} response, or
     *     {@code null} -- this one DTO serves both SETOPTS and SETOPTS-in-code
     * @return {@code true} only when {@code catalogs} is non-null and its {@code bits} and
     *     {@code byteGroups} lists are both non-null.
     */
    public static boolean isUsable(SetoptsCatalogs catalogs) {
        return catalogs != null && catalogs.bits != null && catalogs.byteGroups != null;
    }

    /**
     * @param catalogs the CVS() catalogs object from a {@code bbj/composer/catalogs} response, or
     *     {@code null}
     * @return {@code true} only when {@code catalogs} is non-null and its {@code bits} list is
     *     non-null. {@code charsTooltip} is deliberately NOT required: it is a {@code String} passed
     *     to {@code setToolTipText}, which accepts {@code null} without failing, so its nullity is a
     *     tolerated case, not a gap in this check.
     */
    public static boolean isUsable(CvsCatalogs catalogs) {
        return catalogs != null && catalogs.bits != null;
    }
}
