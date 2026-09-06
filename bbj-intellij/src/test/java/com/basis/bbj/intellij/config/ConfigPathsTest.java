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
    void samePathNormalizesBackslashesSoAWindowsNativePathMatchesAVirtualFilePath() {
        // VirtualFile.getPath() always returns forward slashes on every platform, while the
        // language server's resolved path uses backslashes on win32 -- samePath must treat the
        // two conventions as equivalent, not just fold case.
        assertTrue(ConfigPaths.samePath("C:\\bbj\\cfg\\config.bbx", "C:/bbj/cfg/config.bbx", "Windows 11"));
        assertTrue(ConfigPaths.samePath("C:\\bbj\\cfg\\Config.bbx", "C:/bbj/cfg/config.bbx", "Windows 11"));
        assertFalse(ConfigPaths.samePath("C:\\bbj\\cfg\\config.bbx", "C:/bbj/cfg/other.bbx", "Windows 11"));
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

    // ---- BbjConfigPathService's static helpers -----------------------------------------------
    // BbjConfigPathService.getInstance()/activeConfigPath() need a live IntelliJ Application
    // (BbjSettings.getInstance()), so the pure decisions it delegates to are asserted here
    // directly against the package-visible static helpers instead -- the service itself is a
    // thin platform-bound wrapper over them.

    @Test
    void resolveActivePathPrefersTheCachedPushedPathOverTheExplicitSetting() {
        assertEquals("/pushed/config.bbx",
            BbjConfigPathService.resolveActivePath("/pushed/config.bbx", "/explicit/config.bbx"));
    }

    @Test
    void resolveActivePathFallsBackToTheExplicitSettingNormalizedVerbatimWhenNothingWasPushed() {
        assertEquals("/explicit/config.bbx",
            BbjConfigPathService.resolveActivePath(null, "  /explicit/config.bbx  "));
        // The sentinel and blank/whitespace collapse identically to unset -- no BBj-home
        // derivation happens here.
        assertEquals("", BbjConfigPathService.resolveActivePath(null, ConfigPaths.EM_CONFIG_SENTINEL));
    }

    @Test
    void resolveActivePathIsEmptyWithNoPushAndNoExplicitSetting() {
        assertEquals("", BbjConfigPathService.resolveActivePath(null, null));
        assertEquals("", BbjConfigPathService.resolveActivePath("", ""));
    }

    @Test
    void resolveActivePathClearsBackToTheExplicitSettingWhenAPushedPathIsNull() {
        // A second push whose path is null (e.g. the server lost track of the config path)
        // clears back to the explicit-setting-only behavior instead of retaining a stale path.
        assertEquals("/explicit/config.bbx",
            BbjConfigPathService.resolveActivePath(null, "/explicit/config.bbx"));
    }

    @Test
    void isConfigFileNameMatchesTheActiveConfigFile() {
        assertTrue(BbjConfigPathService.isConfigFileName(
            "/active/custom.bbj", "/active/custom.bbj", "custom.bbj"));
        assertFalse(BbjConfigPathService.isConfigFileName(
            "/active/custom.bbj", "/other/custom.bbj", "custom.bbj"));
    }

    @Test
    void isConfigFileNameMatchesDefaultFilenamesInAnyLetterCaseEvenWhenNotActive() {
        assertTrue(BbjConfigPathService.isConfigFileName("", "/anywhere/config.bbx", "config.bbx"));
        assertTrue(BbjConfigPathService.isConfigFileName("", "/anywhere/Config.BBX", "Config.BBX"));
        assertTrue(BbjConfigPathService.isConfigFileName("", "/anywhere/CONFIG.MIN", "CONFIG.MIN"));
    }

    @Test
    void isConfigFileNameIsFalseForAnUnrelatedBbjFile() {
        assertFalse(BbjConfigPathService.isConfigFileName("/active/config.bbx", "/other/program.bbj", "program.bbj"));
    }

    @Test
    void isDefaultConfigFilenameIsCaseInsensitive() {
        assertTrue(BbjConfigPathService.isDefaultConfigFilename("config.bbx"));
        assertTrue(BbjConfigPathService.isDefaultConfigFilename("CONFIG.BBX"));
        assertTrue(BbjConfigPathService.isDefaultConfigFilename("config.min"));
        assertFalse(BbjConfigPathService.isDefaultConfigFilename("program.bbj"));
        assertFalse(BbjConfigPathService.isDefaultConfigFilename(null));
    }

    @Test
    void lastPushWinsWhenTheCacheIsUpdatedTwice() {
        BbjConfigPathService service = new BbjConfigPathService();
        ConfigModels.ResolvedConfigPathResult first = new ConfigModels.ResolvedConfigPathResult();
        first.path = "/first/config.bbx";
        ConfigModels.ResolvedConfigPathResult second = new ConfigModels.ResolvedConfigPathResult();
        second.path = "/second/config.bbx";

        service.update(first);
        assertEquals("/first/config.bbx", service.getResolvedConfigPath().path);

        service.update(second);
        assertEquals("/second/config.bbx", service.getResolvedConfigPath().path,
            "the last push must win over the first");
    }

    @Test
    void shouldWarnOnceReturnsTrueOncePerDistinctPathAndFalseForRepeats() {
        BbjConfigPathService service = new BbjConfigPathService();
        assertTrue(service.shouldWarnOnce("/missing/config.bbx"));
        assertFalse(service.shouldWarnOnce("/missing/config.bbx"));
        assertTrue(service.shouldWarnOnce("/other/config.bbx"));
        assertFalse(service.shouldWarnOnce("/other/config.bbx"));
    }
}
