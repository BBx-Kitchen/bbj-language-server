package com.basis.bbj.intellij;

import java.io.File;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

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
     * A {@code failed} result means the lookup itself could not be completed — one of its
     * collaborators threw — so every other field carries no information and the caller must clear
     * its pending state without drawing any conclusion from it.
     */
    record NodeLookup(String path, boolean exists, String version, boolean meetsMinimum, boolean failed) {
    }

    /**
     * Result of resolving the configured BBj home path: whether it is a valid BBj installation,
     * and its enumerated classpath entries (empty when invalid). A {@code failed} result means the
     * lookup itself could not be completed — one of its collaborators threw — so {@code valid} and
     * {@code entries} carry no information and the caller must clear its pending state without
     * drawing any conclusion from them.
     */
    record HomeLookup(String path, boolean valid, List<String> entries, boolean failed) {
    }

    /**
     * Resolves {@code path} to a {@link NodeLookup} using the production collaborators: a
     * file-exists probe backed by {@link File#exists()}, the shared version cache, and the
     * detector's minimum-version check.
     */
    static NodeLookup lookupNode(String path) {
        return lookupNode(path,
                p -> new File(p).exists(),
                BbjNodeVersionCache.SESSION::getVersion,
                BbjNodeDetector::meetsMinimumVersion);
    }

    /**
     * Resolves {@code path} to a {@link NodeLookup} against injected collaborators, so a test can
     * drive a throwing collaborator without a real filesystem or subprocess. An empty path is a
     * not-exists result with no version, consulting no collaborator — that short circuit used to
     * run on the EDT and now runs here, off it. Otherwise the version is resolved and checked
     * against the minimum. Neither this method nor {@link #lookupNode(String)} declares a checked
     * exception; an unchecked exception from any collaborator is caught here and turned into a
     * failed result rather than propagating out of the debounced background task.
     */
    static NodeLookup lookupNode(String path, Predicate<String> fileExists,
            Function<String, String> versionOf, Predicate<String> meetsMinimum) {
        try {
            if (path.isEmpty() || !fileExists.test(path)) {
                return new NodeLookup(path, false, null, false, false);
            }
            String version = versionOf.apply(path);
            boolean meets = meetsMinimum.test(version);
            return new NodeLookup(path, true, version, meets, false);
        } catch (RuntimeException e) {
            return new NodeLookup(path, false, null, false, true);
        }
    }

    /**
     * Resolves {@code path} to a {@link HomeLookup} using the production collaborators: the home
     * detector's validity check and the classpath-entry enumerator.
     */
    static HomeLookup lookupHome(String path) {
        return lookupHome(path, BbjHomeDetector::isValidBbjHome, BbjSettings::getBBjClasspathEntries);
    }

    /**
     * Resolves {@code path} to a {@link HomeLookup} against injected collaborators, so a test can
     * drive a throwing collaborator without a real filesystem. An empty path is an invalid result
     * with an empty entry list, consulting no collaborator. Otherwise the classpath entries are
     * enumerated. Neither this method nor {@link #lookupHome(String)} declares a checked
     * exception; an unchecked exception from either collaborator is caught here and turned into a
     * failed result rather than propagating out of the debounced background task.
     */
    static HomeLookup lookupHome(String path, Predicate<String> validHome,
            Function<String, List<String>> entriesOf) {
        try {
            if (path.isEmpty() || !validHome.test(path)) {
                return new HomeLookup(path, false, List.of(), false);
            }
            List<String> entries = entriesOf.apply(path);
            return new HomeLookup(path, true, entries, false);
        } catch (RuntimeException e) {
            return new HomeLookup(path, false, List.of(), true);
        }
    }
}
