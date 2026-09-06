package com.basis.bbj.intellij.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain JUnit 5 coverage for {@link ConfigPaths}, the platform-free helpers mirroring the
 * language server's {@code config-path-resolver.ts} for the same inputs.
 */
class ConfigPathsTest {

    @Test
    void normalizeSettingCollapsesNullBlankWhitespaceAndSentinelToEmptyString() {
        assertEquals("", ConfigPaths.normalizeSetting(null));
        assertEquals("", ConfigPaths.normalizeSetting(""));
        assertEquals("", ConfigPaths.normalizeSetting("   "));
        assertEquals("", ConfigPaths.normalizeSetting(ConfigPaths.EM_CONFIG_SENTINEL));
        assertEquals("/home/user/config.bbx", ConfigPaths.normalizeSetting("  /home/user/config.bbx  "));
    }

    @Test
    void samePathIsTrueForIdenticalStringsAndFalseForDifferentOnes() {
        assertTrue(ConfigPaths.samePath("/home/user/config.bbx", "/home/user/config.bbx", "Linux"));
        assertFalse(ConfigPaths.samePath("/home/user/config.bbx", "/home/user/other.bbx", "Linux"));
    }

    @Test
    void samePathFoldsCaseOnWindowsAndDarwinButNotElsewhere() {
        assertTrue(ConfigPaths.samePath("/Home/User/Config.bbx", "/home/user/config.bbx", "Windows 11"));
        assertTrue(ConfigPaths.samePath("/Home/User/Config.bbx", "/home/user/config.bbx", "Mac OS X"));
        assertFalse(ConfigPaths.samePath("/Home/User/Config.bbx", "/home/user/config.bbx", "Linux"));
    }

    @Test
    void samePathIsFalseWhenEitherSideIsNullOrEmpty() {
        assertFalse(ConfigPaths.samePath(null, "/home/user/config.bbx", "Linux"));
        assertFalse(ConfigPaths.samePath("/home/user/config.bbx", null, "Linux"));
        assertFalse(ConfigPaths.samePath("", "/home/user/config.bbx", "Linux"));
        assertFalse(ConfigPaths.samePath("/home/user/config.bbx", "", "Linux"));
    }

    @Test
    void configPathArgReturnsNullForNullEmptyAndSentinelInput() {
        assertNull(ConfigPaths.configPathArg(null));
        assertNull(ConfigPaths.configPathArg(""));
        assertNull(ConfigPaths.configPathArg("   "));
        assertNull(ConfigPaths.configPathArg(ConfigPaths.EM_CONFIG_SENTINEL));
    }

    @Test
    void configPathArgReturnsTheDashCFlagConcatenatedWithThePathOtherwise() {
        assertEquals("-c/home/user/config.bbx", ConfigPaths.configPathArg("/home/user/config.bbx"));
    }
}
