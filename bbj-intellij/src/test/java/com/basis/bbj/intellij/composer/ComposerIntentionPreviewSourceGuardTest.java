package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #433 preview-wiring fix: all three composer intentions return a real
 * {@code IntentionPreviewInfo.Html} preview instead of {@code IntentionPreviewInfo.EMPTY}, so the
 * platform's fallback description lookup is never entered from the lightbulb popup, and the other
 * intention members that must not move -- {@code invoke}, {@code isAvailable},
 * {@code startInWriteAction} -- stay wired exactly as before. A failure here means one of the three
 * intentions went back to an empty preview, so the IDE resumes resolving the per-intention
 * description resource on every popup and raises the reported error if that resource is ever
 * missing again.
 */
class ComposerIntentionPreviewSourceGuardTest {

    private static final Path MSGBOX_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureMsgboxIntention.java").toAbsolutePath();

    private static final Path ADD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureAddWindowIntention.java").toAbsolutePath();

    private static final Path ADD_CHILD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureAddChildWindowIntention.java").toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

    private static final Path[] INTENTION_SOURCES = {
            MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE
    };

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
     * Drops comment/javadoc lines so a rationale sentence naming a counted literal cannot skew a
     * number. Applied ahead of every count-based assertion in this class without exception.
     */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void noIntentionReturnsAnEmptyPreviewAnymore() {
        for (Path source : INTENTION_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "IntentionPreviewInfo.EMPTY"),
                    source + " must never reference IntentionPreviewInfo.EMPTY -- an empty preview "
                            + "makes the platform fall back to the per-intention description resource "
                            + "lookup, which throws if that resource is ever missing");
        }
    }

    @Test
    void everyIntentionReturnsExactlyOneHtmlPreview() {
        for (Path source : INTENTION_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(1, countOccurrences(text, "new IntentionPreviewInfo.Html("),
                    source + " must construct exactly one IntentionPreviewInfo.Html so the fallback "
                            + "description lookup is unreachable from the popup");
        }
    }

    @Test
    void startInWriteActionStillReturnsFalseOnEveryIntention() {
        for (Path source : INTENTION_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "startInWriteAction"),
                    source + " must declare startInWriteAction exactly once");
            assertTrue(text.contains("return false;"),
                    source + " must still return false from startInWriteAction -- the action opens a "
                            + "modal dialog outside a write action");
        }
    }

    @Test
    void invokeAndIsAvailableAreUndisturbedOnEveryIntention() {
        for (Path source : INTENTION_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "ComposerLauncher.launch(project, editor, ComposerLauncher.Kind."),
                    source + " must delegate to ComposerLauncher.launch exactly once from invoke()");
            assertEquals(1, countOccurrences(text, "ComposerLauncher.isCaretOnCall(editor,"),
                    source + " must call ComposerLauncher.isCaretOnCall exactly once from isAvailable()");
        }
    }

    @Test
    void pluginXmlStillRegistersAllThreeIntentionsUntouched() {
        String text = readSource(PLUGIN_XML);

        assertEquals(3, countOccurrences(text, "<intentionAction>"),
                "plugin.xml must still register exactly three <intentionAction> extensions -- the "
                        + "descriptor is not touched by this fix");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureMsgboxIntention"),
                "the MSGBOX registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureAddWindowIntention"),
                "the addWindow registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureAddChildWindowIntention"),
                "the addChildWindow registration's fully-qualified class name must appear exactly once");
    }
}
