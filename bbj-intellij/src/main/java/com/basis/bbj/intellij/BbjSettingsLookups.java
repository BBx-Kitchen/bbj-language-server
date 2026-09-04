package com.basis.bbj.intellij;

import java.io.File;
import java.util.List;

/**
 * Every filesystem and subprocess call the Settings dialog needs, in one place, so
 * {@link BbjSettingsComponent} itself performs none of it directly. Both methods are called only
 * from the debounced background task (D-12) — never from a {@code DocumentAdapter} or a
 * {@code ComponentValidator} — so none of this work ever runs on the EDT.
 */
final class BbjSettingsLookups {

    private BbjSettingsLookups() {
    }

    /**
     * Result of resolving the configured Node.js path: whether a file exists there, its detected
     * version (through {@link BbjNodeVersionCache}), and whether that version meets the minimum.
     */
    record NodeLookup(String path, boolean exists, String version, boolean meetsMinimum) {
    }

    /**
     * Result of resolving the configured BBj home path: whether it is a valid BBj installation,
     * and its enumerated classpath entries (empty when invalid).
     */
    record HomeLookup(String path, boolean valid, List<String> entries) {
    }

    /**
     * Resolves {@code path} to a {@link NodeLookup}. An empty path or one with no file there is a
     * not-exists result with no version — both short-circuits that used to run on the EDT now run
     * here, off it (D-13). Otherwise the version is resolved through the shared cache and checked
     * against the minimum.
     */
    static NodeLookup lookupNode(String path) {
        if (path.isEmpty() || !new File(path).exists()) {
            return new NodeLookup(path, false, null, false);
        }
        String version = BbjNodeVersionCache.SESSION.getVersion(path);
        boolean meetsMinimum = BbjNodeDetector.meetsMinimumVersion(version);
        return new NodeLookup(path, true, version, meetsMinimum);
    }

    /**
     * Resolves {@code path} to a {@link HomeLookup}. An empty or invalid BBj home is an invalid
     * result with an empty entry list; otherwise the classpath entries are enumerated.
     */
    static HomeLookup lookupHome(String path) {
        if (path.isEmpty() || !BbjHomeDetector.isValidBbjHome(path)) {
            return new HomeLookup(path, false, List.of());
        }
        List<String> entries = BbjSettings.getBBjClasspathEntries(path);
        return new HomeLookup(path, true, entries);
    }
}
