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
 * Source-guard fence for {@link BbjComposeCvsAction} (#649), modelled on
 * {@link BbjComposeSetoptsInCodeActionSourceGuardTest}'s structural-pin convention. Pins: the
 * action launches {@code Kind.CVS} through {@code ComposerLauncher.launch} exactly once;
 * presence-scoping uses the enabled-and-visible call and never the enabled-only one; the action
 * uses the background update thread; the action does no Java-side CVS mask parsing of its own
 * (the decode is the server's job); and {@code plugin.xml} registers the id, points it at this
 * class, puts it in the editor popup menu and binds no keystroke.
 */
class BbjComposeCvsActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjComposeCvsAction.java")
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
    void theActionLaunchesTheCvsKindExactlyOnceThroughComposerLauncher() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(1, countOccurrences(text, "ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS)"),
                "the action must launch ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS) exactly once");
    }

    @Test
    void theActionIsScopedByPresenceNotByADisabledButVisibleState() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(1, countOccurrences(text, "setEnabledAndVisible("),
                "exactly one setEnabledAndVisible( call -- the entry must be absent entirely "
                        + "outside a BBj source file, not merely disabled");
        assertEquals(0, countOccurrences(text, "setEnabled("),
                "the disabled-but-visible presentation call must never be used -- an unavailable "
                        + "action must vanish from the Editor Popup Menu, not grey out");
    }

    @Test
    void theActionDoesNoJavaSideCvsMaskParsing() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(0, countOccurrences(text, "Pattern.compile("),
                "the action must never parse a CVS() mask in Java -- the decode decision belongs "
                        + "to the server's cvsDecodeCall request");
        assertEquals(0, countOccurrences(text, "Integer.parseInt("),
                "the action must perform no mask-parsing of its own");
    }

    @Test
    void theActionUsesTheActionUpdateThreadBackgroundConstant() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertTrue(text.contains("ActionUpdateThread.BGT"),
                "the action must declare the background update thread, matching every other "
                        + "composer entry point");
    }

    @Test
    void pluginXmlRegistersTheActionWithMatchingIdAndNoDefaultKeystroke() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("id=\"bbj.composeCvs\""),
                "plugin.xml must declare the bbj.composeCvs action id -- the same identifier the "
                        + "VS Code command already uses, so both hosts name the feature identically");
        assertTrue(text.contains("class=\"com.basis.bbj.intellij.actions.BbjComposeCvsAction\""),
                "plugin.xml must point the action id at BbjComposeCvsAction");

        int idIndex = text.indexOf("id=\"bbj.composeCvs\"");
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
                "bbj.composeCvs must bind no default keystroke");
    }
}
