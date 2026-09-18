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
 * Source-guard fence for {@link BbjComposeSetoptsInCodeAction} (#475), re-pointed for the
 * base-plus-subclass shape (#616): the presence gate and background update thread now live on
 * {@link BbjComposeActionBase}, so this guard asserts them there. The subclass keeps only its own
 * {@code isAvailableFor(...)} override and its {@code Kind.SETOPTS_IN_CODE}, plus a delegation pin
 * proving it actually extends the base. Modelled on
 * {@link BbjComposeSetoptsActionSourceGuardTest}'s structural-pin convention.
 */
class BbjComposeSetoptsInCodeActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeSetoptsInCodeAction.java")
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
    void theActionLaunchesTheInCodeKindExactlyOnceAndNeverTheConfigKind() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        int inCodeCount = countOccurrences(text, "Kind.SETOPTS_IN_CODE");
        assertEquals(1, inCodeCount, "the action must reference Kind.SETOPTS_IN_CODE exactly once");

        // Kind.SETOPTS is a literal prefix of Kind.SETOPTS_IN_CODE -- every raw occurrence of the
        // shorter literal must belong to a longer Kind.SETOPTS_IN_CODE occurrence, i.e. the counts
        // must match exactly. A mismatch would mean the bare config.bbx kind was launched too.
        int totalSetoptsPrefixCount = countOccurrences(text, "Kind.SETOPTS");
        assertEquals(inCodeCount, totalSetoptsPrefixCount,
                "the action must never reference the bare config.bbx Kind.SETOPTS");
    }

    @Test
    void theBaseIsScopedByPresenceNotByADisabledButVisibleState() {
        String text = stripComments(readSource(BASE_SOURCE));

        assertEquals(1, countOccurrences(text, "setEnabledAndVisible("),
                "the base must call setEnabledAndVisible( exactly once -- the entry must be absent "
                        + "entirely outside a BBj source file, not merely disabled");
        assertEquals(0, countOccurrences(text, "setEnabled("),
                "the disabled-but-visible presentation call must never be used -- an unavailable "
                        + "action must vanish from the Editor Popup Menu, not grey out");
    }

    @Test
    void theActionAndBaseDoNoJavaSideSetoptsParsingOrHexHandling() {
        String subclassText = stripComments(readSource(GUARDED_SOURCE));
        String baseText = stripComments(readSource(BASE_SOURCE));

        assertEquals(0, countOccurrences(subclassText, "\"SETOPTS\""),
                "the SETOPTS keyword literal must never be matched in Java -- the line decision "
                        + "belongs to the server's decodeInCode request");
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
    void theBaseUsesTheActionUpdateThreadBackgroundConstant() {
        String text = stripComments(readSource(BASE_SOURCE));

        assertTrue(text.contains("ActionUpdateThread.BGT"),
                "the base must declare the background update thread, matching every other "
                        + "composer entry point");
    }

    @Test
    void theActionDelegatesToTheBaseWithItsOwnKindAndAvailability() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(1, countOccurrences(text, "extends BbjComposeActionBase"),
                "BbjComposeSetoptsInCodeAction.java must extend BbjComposeActionBase exactly once");
        assertEquals(1, countOccurrences(text, "isAvailableFor("),
                "the action must declare its own isAvailableFor(...) override exactly once");
    }

    @Test
    void pluginXmlRegistersTheActionWithMatchingIdAndNoDefaultKeystroke() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("id=\"bbj.composeSetoptsInCode\""),
                "plugin.xml must declare the bbj.composeSetoptsInCode action id -- the same "
                        + "identifier the VS Code command already uses, so both hosts name the "
                        + "feature identically");
        assertTrue(text.contains("class=\"com.basis.bbj.intellij.actions.BbjComposeSetoptsInCodeAction\""),
                "plugin.xml must point the action id at BbjComposeSetoptsInCodeAction");

        int idIndex = text.indexOf("id=\"bbj.composeSetoptsInCode\"");
        assertTrue(idIndex >= 0, "action declaration not found -- guard would pass vacuously on a mis-resolved file");
        int actionOpenTagStart = text.lastIndexOf("<action", idIndex);
        assertTrue(actionOpenTagStart >= 0, "opening <action tag not found before the declared id");
        int actionCloseTag = text.indexOf("</action>", idIndex);
        assertTrue(actionCloseTag > idIndex, "closing </action> tag not found after the declared id");

        // Scoped strictly to this action's own element -- a whole-descriptor scan would trip on a
        // sibling action's legitimate keyboard-shortcut declaration.
        String ownElement = text.substring(actionOpenTagStart, actionCloseTag);
        assertTrue(ownElement.contains("group-id=\"EditorPopupMenu\""),
                "the action must be registered in the Editor Popup Menu");
        assertEquals(0, countOccurrences(ownElement, "keyboard-shortcut"),
                "bbj.composeSetoptsInCode must bind no default keystroke");
    }
}
