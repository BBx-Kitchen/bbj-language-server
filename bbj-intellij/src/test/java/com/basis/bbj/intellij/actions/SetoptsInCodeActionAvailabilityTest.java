package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain JUnit table over {@link SetoptsInCodeActionAvailability}'s pure decision (#475): every
 * BBj source extension is available, the resolved config file is never available
 * regardless of extension, an unknown extension is not, and a null extension is not.
 */
class SetoptsInCodeActionAvailabilityTest {

    @Test
    void eachBbjSourceExtensionIsAvailableWhenNotTheConfigFile() {
        assertTrue(SetoptsInCodeActionAvailability.isAvailable("bbj", false));
        assertTrue(SetoptsInCodeActionAvailability.isAvailable("bbjt", false));
        assertTrue(SetoptsInCodeActionAvailability.isAvailable("src", false));
        assertTrue(SetoptsInCodeActionAvailability.isAvailable("bbx", false));
    }

    @Test
    void theResolvedConfigFileIsNeverAvailableRegardlessOfExtension() {
        assertFalse(SetoptsInCodeActionAvailability.isAvailable("bbx", true),
                "config.bbx already has its own SETOPTS composer entry");
        assertFalse(SetoptsInCodeActionAvailability.isAvailable("bbj", true),
                "a config file recognized under a non-bbx extension must still be excluded");
    }

    @Test
    void anUnknownExtensionIsNotAvailable() {
        assertFalse(SetoptsInCodeActionAvailability.isAvailable("txt", false));
        assertFalse(SetoptsInCodeActionAvailability.isAvailable("java", false));
    }

    @Test
    void aNullExtensionIsNotAvailable() {
        assertFalse(SetoptsInCodeActionAvailability.isAvailable(null, false));
        assertFalse(SetoptsInCodeActionAvailability.isAvailable(null, true));
    }
}
