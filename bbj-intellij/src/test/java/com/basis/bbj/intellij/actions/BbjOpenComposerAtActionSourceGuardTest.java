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
 * Source-guard fence for {@link BbjOpenComposerAtAction} (#650), modelled on
 * {@code BbjComposeSetoptsInCodeActionSourceGuardTest}'s structural-pin convention. Pins: the
 * class extends {@code LSPCommandAction}, its command-thread override pins {@code EDT}, it routes
 * to the explicit-position launcher exactly once with {@code fromCue = true}, it never calls the
 * caret-driven launcher, it does no document mutation of its own, and {@code plugin.xml} registers
 * the id with no menu placement and no default keystroke -- this action is reached only by
 * LSP4IJ's own command dispatch, never a menu click or a keyboard shortcut.
 */
class BbjOpenComposerAtActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjOpenComposerAtAction.java")
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
    void theActionExtendsLspCommandAction() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertTrue(text.contains("extends LSPCommandAction"),
                "the cue action must extend LSP4IJ's LSPCommandAction");
    }

    @Test
    void theCommandPerformedThreadIsPinnedToEdt() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertTrue(text.contains("getCommandPerformedThread"),
                "the action must override getCommandPerformedThread");
        assertTrue(text.contains("ActionUpdateThread.EDT"),
                "the command-thread override must return EDT -- LSP4IJ's default is BGT, and the "
                        + "launcher reads the document and opens modal dialogs");
    }

    @Test
    void theActionRoutesToTheExplicitPositionLauncherExactlyOnceMarkedAsFromCue() {
        String text = readSource(GUARDED_SOURCE);

        assertEquals(1, countOccurrences(text, "ComposerLauncher.launchAt("),
                "exactly one launchAt( call site -- the cue action routes a server-computed target, "
                        + "it does not decide applicability itself");
        assertEquals(1,
                countOccurrences(text, "ComposerLauncher.launchAt(project, editor, kind, target.line, target.character, true)"),
                "the launchAt( call must pass the cue's own line/character and fromCue = true");
    }

    @Test
    void theActionNeverCallsTheCaretDrivenLauncher() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        // "launchAt(" is not a superstring match for "launch(" -- the character immediately after
        // "launch" in "launchAt(" is "A", not "(" -- so this count is not accidentally inflated by
        // the launchAt( call site above.
        assertEquals(0, countOccurrences(text, "ComposerLauncher.launch("),
                "the cue action must never fall back to the caret-driven launch( entry point -- a "
                        + "cue always carries its own explicit position");
    }

    @Test
    void theActionDoesNoDocumentMutationOfItsOwn() {
        String text = stripComments(readSource(GUARDED_SOURCE));

        assertEquals(0, countOccurrences(text, "replaceString("),
                "the cue action must perform no text replacement of its own -- that belongs to "
                        + "ComposerLauncher's guarded apply bodies");
        assertEquals(0, countOccurrences(text, "insertString("),
                "the cue action must perform no text insertion of its own -- that belongs to "
                        + "ComposerLauncher's create path");
    }

    @Test
    void pluginXmlRegistersTheActionWithMatchingIdAndNoMenuPlacementOrKeystroke() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("id=\"bbj.openComposerAt\""),
                "plugin.xml must declare the bbj.openComposerAt action id -- the identifier LSP4IJ's "
                        + "CommandExecutor resolves via ActionManager.getAction");
        assertTrue(text.contains("class=\"com.basis.bbj.intellij.actions.BbjOpenComposerAtAction\""),
                "plugin.xml must point the action id at BbjOpenComposerAtAction");

        int idIndex = text.indexOf("id=\"bbj.openComposerAt\"");
        assertTrue(idIndex >= 0, "action declaration not found -- guard would pass vacuously on a mis-resolved file");
        int actionOpenTagStart = text.lastIndexOf("<action", idIndex);
        assertTrue(actionOpenTagStart >= 0, "opening <action tag not found before the declared id");

        // The element may be self-closing ("/>") or have a separate closing tag ("</action>") --
        // this action is registered self-closing (no add-to-group child), so both forms are
        // handled rather than assuming one.
        int selfCloseIndex = text.indexOf("/>", idIndex);
        int closingTagIndex = text.indexOf("</action>", idIndex);
        int elementEnd;
        if (selfCloseIndex >= 0 && (closingTagIndex < 0 || selfCloseIndex < closingTagIndex)) {
            elementEnd = selfCloseIndex + "/>".length();
        } else {
            assertTrue(closingTagIndex > idIndex, "neither a self-closing tag nor </action> was found after the declared id");
            elementEnd = closingTagIndex + "</action>".length();
        }

        String ownElement = text.substring(actionOpenTagStart, elementEnd);
        assertEquals(0, countOccurrences(ownElement, "add-to-group"),
                "bbj.openComposerAt must never be placed in a menu -- it is reached only by LSP4IJ's "
                        + "command dispatch");
        assertEquals(0, countOccurrences(ownElement, "keyboard-shortcut"),
                "bbj.openComposerAt must bind no default keystroke");
    }
}
