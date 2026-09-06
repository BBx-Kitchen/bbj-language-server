package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the Settings-dialog lookup failure path (priority fix 1 of the earlier UI
 * review): both {@code BbjSettingsLookups} injectable overloads must catch, and both
 * {@code BbjSettingsComponent} apply methods must branch on the failure flag before drawing any
 * other conclusion. Every assertion here operates on a method-body window, never on whole-file
 * text, so an unrelated occurrence of a guarded literal elsewhere in the file cannot produce a
 * false positive.
 */
class BbjSettingsFailureStateSourceGuardTest {

    private static final Path LOOKUPS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsLookups.java")
            .toAbsolutePath();

    private static final Path COMPONENT_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsComponent.java")
            .toAbsolutePath();

    private static String readGuardedSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    /**
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth rather than assuming any particular body length. Fails the test with the
     * declaration text when the marker is not found, so a rename surfaces here rather than as a
     * confusing empty-window pass elsewhere.
     */
    private static String bodyOf(String source, String declarationMarker) {
        int declarationStart = source.indexOf(declarationMarker);
        if (declarationStart < 0) {
            fail("declaration not found: " + declarationMarker);
        }
        int openBrace = source.indexOf('{', declarationStart);
        assertTrue(openBrace >= 0, "no opening brace found after declaration: " + declarationMarker);
        int depth = 0;
        int i = openBrace;
        for (; i < source.length(); i++) {
            char c = source.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    break;
                }
            }
        }
        assertTrue(depth == 0, "unbalanced braces while scanning body of: " + declarationMarker);
        return source.substring(openBrace, i + 1);
    }

    @Test
    void eachInjectableOverloadBodyCatchesRuntimeExceptionExactlyOnce() {
        String text = readGuardedSource(LOOKUPS_SOURCE);
        String nodeOverloadBody = bodyOf(text,
                "static NodeLookup lookupNode(String path, Predicate<String> fileExists,");
        String homeOverloadBody = bodyOf(text,
                "static HomeLookup lookupHome(String path, Predicate<String> validHome,");

        assertEquals(1, countOccurrences(nodeOverloadBody, "catch (RuntimeException"),
                "the injectable lookupNode overload must catch exactly once");
        assertEquals(1, countOccurrences(homeOverloadBody, "catch (RuntimeException"),
                "the injectable lookupHome overload must catch exactly once");
    }

    @Test
    void applyNodeLookupsFailureBranchPrecedesTheFirstExistsRead() {
        String text = readGuardedSource(COMPONENT_SOURCE);
        String body = bodyOf(text, "private void applyNodeLookup(BbjSettingsLookups.NodeLookup lookup) {");

        int failedIndex = body.indexOf("lookup.failed()");
        int existsIndex = body.indexOf("lookup.exists()");

        assertTrue(failedIndex >= 0, "applyNodeLookup must branch on lookup.failed()");
        assertTrue(existsIndex >= 0, "applyNodeLookup must still read lookup.exists()");
        assertTrue(failedIndex < existsIndex,
                "the failure branch must be checked before the first exists() read");
    }

    @Test
    void applyHomeLookupsFailureBranchPrecedesTheFirstValidReadAndThePendingFlagIsAlreadyClearedByThen() {
        String text = readGuardedSource(COMPONENT_SOURCE);
        String body = bodyOf(text, "private void applyHomeLookup(BbjSettingsLookups.HomeLookup lookup) {");

        int pendingFalseIndex = body.indexOf("classpathLookupPending = false;");
        int failedIndex = body.indexOf("lookup.failed()");
        int validIndex = body.indexOf("lookup.valid()");

        assertTrue(pendingFalseIndex >= 0, "applyHomeLookup must clear the pending flag");
        assertTrue(failedIndex >= 0, "applyHomeLookup must branch on lookup.failed()");
        assertTrue(validIndex >= 0, "applyHomeLookup must still read lookup.valid()");
        assertTrue(pendingFalseIndex < failedIndex,
                "the pending flag must already be false by the time the failure branch is checked");
        assertTrue(failedIndex < validIndex,
                "the failure branch must be checked before the first valid() read");
    }

    @Test
    void thePlaceholderLiteralCountAccountsForEveryPreExistingSiteAndTheOneNewFailureBranch() {
        String text = readGuardedSource(COMPONENT_SOURCE);
        // Five sites total: the initial classpathCombo construction, the document listener's
        // reset, the pre-existing invalid-home branch, the getClasspathEntry() equality check,
        // and this plan's new failure branch in applyHomeLookup. No wording is introduced or
        // changed — every occurrence uses the identical literal.
        assertEquals(5, countOccurrences(text, "set BBj home first"),
                "a count other than 5 means a placeholder site was lost or a second wording appeared");
    }

    @Test
    void thePendingVersionLabelAppearsExactlyOnceAndNeverInsideApplyNodeLookup() {
        String text = readGuardedSource(COMPONENT_SOURCE);
        String applyNodeLookupBody =
                bodyOf(text, "private void applyNodeLookup(BbjSettingsLookups.NodeLookup lookup) {");

        assertEquals(1, countOccurrences(text, "Checking Node.js version…"));
        assertEquals(0, countOccurrences(applyNodeLookupBody, "Checking Node.js version…"),
                "the pending label must live only in the document listener, never in the apply sink");
    }
}
