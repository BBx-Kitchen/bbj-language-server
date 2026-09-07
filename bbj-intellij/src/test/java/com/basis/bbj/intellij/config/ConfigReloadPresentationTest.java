package com.basis.bbj.intellij.config;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain-JUnit coverage for {@link ConfigReloadPresentation}'s presentation decisions -- no
 * IntelliJ platform type anywhere in this file, matching the {@code ConfigPaths}/{@code
 * ConfigPathsTest} platform-free seam convention.
 */
class ConfigReloadPresentationTest {

    @Test
    void reasonLabelReturnsADistinctLabelForEachKnownReason() {
        String prefixChanged = ConfigReloadPresentation.reasonLabel("prefix-changed");
        String configMissing = ConfigReloadPresentation.reasonLabel("config-missing");
        String configPathChanged = ConfigReloadPresentation.reasonLabel("config-path-changed");

        assertNotNull(prefixChanged, "prefix-changed must have a label");
        assertNotNull(configMissing, "config-missing must have a label");
        assertNotNull(configPathChanged, "config-path-changed must have a label");
        assertEquals(3, new HashSet<>(List.of(prefixChanged, configMissing, configPathChanged)).size(),
            "each of the three known reasons must map to its own distinct label");
    }

    @Test
    void reasonLabelReturnsNullForNullAndForAnUnknownToken() {
        assertNull(ConfigReloadPresentation.reasonLabel(null),
            "a null reason must degrade to no label");
        assertNull(ConfigReloadPresentation.reasonLabel("something-new"),
            "an unrecognized reason token from a newer server must degrade to no label, "
                + "never leak the raw token into the tooltip");
    }

    @Test
    void widgetTooltipReturnsTheStatusTextAloneWhenTheLabelIsNullOrBlank() {
        assertEquals("BBj: Starting", ConfigReloadPresentation.widgetTooltip("BBj: Starting", null));
        assertEquals("BBj: Starting", ConfigReloadPresentation.widgetTooltip("BBj: Starting", ""));
        assertEquals("BBj: Starting", ConfigReloadPresentation.widgetTooltip("BBj: Starting", "   "));
    }

    @Test
    void widgetTooltipJoinsTheStatusTextAndTheLabelWhenPresent() {
        String tooltip = ConfigReloadPresentation.widgetTooltip("BBj: Starting", "config file changed");
        assertTrue(tooltip.contains("BBj: Starting"), "tooltip must still name the status");
        assertTrue(tooltip.contains("config file changed"), "tooltip must carry the label");
        assertFalse(tooltip.equals("BBj: Starting"), "tooltip must not equal the bare status text");
    }

    @Test
    void consoleLineContainsThePathAndTheReasonVerbatim() {
        String line = ConfigReloadPresentation.consoleLine("/home/user/bbj/cfg/config.bbx", "prefix-changed");
        assertTrue(line.contains("/home/user/bbj/cfg/config.bbx"), "console line must name the path verbatim");
        assertTrue(line.contains("prefix-changed"), "console line must carry the reason token verbatim");
    }

    @Test
    void clearsReasonIsTrueOnlyForTheStartedStateOrAnAbandonedAutoRestart() {
        assertTrue(ConfigReloadPresentation.clearsReason("started", false),
            "reaching started must clear the reason");
        assertFalse(ConfigReloadPresentation.clearsReason("starting", false),
            "starting must not clear the reason");
        assertFalse(ConfigReloadPresentation.clearsReason("stopping", false),
            "stopping must not clear the reason");
        assertFalse(ConfigReloadPresentation.clearsReason("stopped", false),
            "a restart legitimately passes through stopped -- clearing there would blank the "
                + "tooltip mid-reload");
        assertTrue(ConfigReloadPresentation.clearsReason("stopped", true),
            "an abandoned auto-restart (crashed twice) must clear the reason rather than sticking");
    }
}
