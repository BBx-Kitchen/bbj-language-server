package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for {@link com.basis.bbj.intellij.actions.BbjComposeSetoptsAction} (#633),
 * re-pointed for the base-plus-subclass shape (#616): the presence gate, background update thread
 * and no-PSI/no-parsing/no-restart invariants now cover {@link BbjComposeActionBase} as well as
 * this subclass, since the launch call and default gate now live on the base. The subclass keeps
 * only its own {@code isAvailableFor(...)} override reaching {@code BbjConfigPathService}, and a
 * delegation pin proves it actually extends the base and supplies {@code Kind.SETOPTS}. Modelled
 * on the base-aware guard pattern in {@code EmTokenTrustWindowSourceGuardTest}.
 */
class BbjComposeSetoptsActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeSetoptsAction.java")
            .toAbsolutePath();

    private static final Path BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeActionBase.java")
            .toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
            .toAbsolutePath();

    private static String readSource(Path path) {
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

    /**
     * Strips line comments and block comments (including javadoc) from {@code text} before any
     * assertion counts occurrences, so a rationale sentence naming a pinned/forbidden token can
     * never satisfy nor break a count-based assertion.
     */
    private static String stripComments(String text) {
        String noBlockComments = text.replaceAll("(?s)/\\*.*?\\*/", "");
        return noBlockComments.replaceAll("//[^\n]*", "");
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

    @Test
    void theAvailabilityPredicateReachesConfigPathServiceWithNoArgument() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertTrue(countOccurrences(text, "BbjConfigPathService.getInstance()") >= 1,
                "the action must resolve BbjConfigPathService via the no-argument getInstance()");
        assertTrue(countOccurrences(text, ".isConfigFile(") >= 1,
                "the action must gate availability through isConfigFile(...)");
    }

    @Test
    void theBaseIsScopedByPresenceNotByADisabledButVisibleState() {
        String text = stripComments(readSource(BASE_SOURCE));

        assertEquals(1, countOccurrences(text, "setEnabledAndVisible("),
                "the base must call setEnabledAndVisible( exactly once -- D-02 requires the entry "
                        + "to be absent entirely outside a config file, not merely disabled");
        assertEquals(0, countOccurrences(text, "setEnabled("),
                "the disabled-but-visible presentation call must never be used -- an unavailable "
                        + "action must vanish from the Editor Popup Menu, not grey out");
    }

    @Test
    void theActionAndBaseTouchNoPsiType() {
        String subclassText = stripComments(readSource(GUARDED_SOURCE));
        String baseText = stripComments(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(subclassText, "com.intellij.psi"),
                "the action must stay PSI-free (D-01) -- config.bbx has no parser to consult");
        assertEquals(0, countOccurrences(subclassText, "Psi"),
                "no PSI-named type may appear anywhere in the action source (D-01)");
        assertEquals(0, countOccurrences(baseText, "com.intellij.psi"),
                "the base must stay PSI-free too");
        assertEquals(0, countOccurrences(baseText, "Psi"),
                "no PSI-named type may appear anywhere in the base source either");
    }

    @Test
    void theActionAndBaseDoNoJavaSideSetoptsParsing() {
        String subclassText = stripComments(readSource(GUARDED_SOURCE));
        String baseText = stripComments(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(subclassText, "\"SETOPTS\""),
                "the SETOPTS keyword literal must never be matched in Java -- the line decision "
                        + "belongs to the server's decodeCall request");
        assertEquals(0, countOccurrences(subclassText, "parseSetOptsLine("),
                "the action must never call the domain module's line parser directly");
        assertEquals(0, countOccurrences(subclassText, "Integer.parseInt("),
                "the action must perform no hex-parsing of its own");
        assertEquals(0, countOccurrences(baseText, "\"SETOPTS\""),
                "the base must never match the SETOPTS keyword literal either");
        assertEquals(0, countOccurrences(baseText, "parseSetOptsLine("),
                "the base must never call the domain module's line parser directly");
        assertEquals(0, countOccurrences(baseText, "Integer.parseInt("),
                "the base must perform no hex-parsing of its own");
    }

    @Test
    void theActionDelegatesToTheBaseWithItsOwnKindAndAvailability() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjComposeSetoptsAction.java must extend BbjComposeActionBase exactly once");
        assertEquals(1, countOccurrences(text, "ComposerLauncher.Kind.SETOPTS"),
                "the action must reference exactly one Kind.SETOPTS -- launched exactly once");
        assertEquals(1, countOccurrences(text, "isAvailableFor("),
                "the action must declare its own isAvailableFor(...) override exactly once");
    }

    @Test
    void theActionAndBaseReachNoRestartEntryPoint() {
        String subclassText = stripComments(readSource(GUARDED_SOURCE));
        String baseText = stripComments(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(subclassText, "requestRestart("),
                "the action must never trigger a restart -- editing config.bbx through the composer "
                        + "must not be indistinguishable from a manual restart request");
        assertEquals(0, countOccurrences(subclassText, "scheduleRestart("),
                "the action must never schedule a coalesced restart either");
        assertEquals(0, countOccurrences(subclassText, "LanguageServerManager"),
                "the action must never reach LSP4IJ's server manager directly");
        assertEquals(0, countOccurrences(baseText, "requestRestart("),
                "the base must never trigger a restart either");
        assertEquals(0, countOccurrences(baseText, "scheduleRestart("),
                "the base must never schedule a coalesced restart either");
        assertEquals(0, countOccurrences(baseText, "LanguageServerManager"),
                "the base must never reach LSP4IJ's server manager directly");
    }

    @Test
    void pluginXmlRegistersTheActionWithNoDefaultKeystroke() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("id=\"bbj.composeSetopts\""),
                "plugin.xml must declare the bbj.composeSetopts action id");
        assertTrue(text.contains("class=\"com.basis.bbj.intellij.actions.BbjComposeSetoptsAction\""),
                "plugin.xml must point the action id at BbjComposeSetoptsAction");
        assertTrue(text.contains("group-id=\"EditorPopupMenu\""),
                "the action must be registered in the Editor Popup Menu");

        int idIndex = text.indexOf("id=\"bbj.composeSetopts\"");
        assertTrue(idIndex >= 0, "action declaration not found -- guard would pass vacuously on a mis-resolved file");
        int actionOpenTagStart = text.lastIndexOf("<action", idIndex);
        assertTrue(actionOpenTagStart >= 0, "opening <action tag not found before the declared id");
        int actionCloseTag = text.indexOf("</action>", idIndex);
        assertTrue(actionCloseTag > idIndex, "closing </action> tag not found after the declared id");

        // Scoped strictly to this action's own element -- a whole-descriptor scan would trip on the
        // sibling compile action's legitimate keyboard-shortcut declaration (D-04 permits keystrokes
        // elsewhere; it only forbids one on this action).
        String ownElement = text.substring(actionOpenTagStart, actionCloseTag);
        assertEquals(0, countOccurrences(ownElement, "keyboard-shortcut"),
                "bbj.composeSetopts must bind no default keystroke in this phase (D-04)");
    }
}
