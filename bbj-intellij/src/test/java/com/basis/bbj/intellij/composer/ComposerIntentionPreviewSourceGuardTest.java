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
 * Pins the #433 preview-wiring fix -- every composer intention's lightbulb popup renders a real
 * {@code IntentionPreviewInfo.Html} preview instead of {@code IntentionPreviewInfo.EMPTY}, so the
 * platform's fallback description lookup is never entered -- together with the #618 consolidation:
 * the single {@code IntentionPreviewInfo.Html} construction, the single {@code startInWriteAction}
 * declaration and the single launch call now live once on {@link ComposerIntentionBase}, and each
 * of the five {@code Configure*Intention} subclasses delegates rather than re-declaring any of
 * them. A failure here means either an intention lost its preview wiring, or the consolidation
 * regressed and a member got re-duplicated onto a subclass.
 */
class ComposerIntentionPreviewSourceGuardTest {

    private static final Path INTENTION_BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ComposerIntentionBase.java").toAbsolutePath();

    private static final Path MSGBOX_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureMsgboxIntention.java").toAbsolutePath();

    private static final Path ADD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureAddWindowIntention.java").toAbsolutePath();

    private static final Path ADD_CHILD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureAddChildWindowIntention.java").toAbsolutePath();

    private static final Path SETOPTS_IN_CODE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureSetoptsInCodeIntention.java").toAbsolutePath();

    private static final Path CVS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "ConfigureCvsIntention.java").toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

    private static final Path[] INTENTION_SOURCES = {
            MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_IN_CODE_SOURCE, CVS_SOURCE
    };

    private static final Path[] ALL_GUARDED_SOURCES = {
            INTENTION_BASE_SOURCE, MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE,
            SETOPTS_IN_CODE_SOURCE, CVS_SOURCE
    };

    private static final java.util.Map<Path, String> OWN_KIND_CONSTANT = java.util.Map.of(
            MSGBOX_SOURCE, "ComposerLauncher.Kind.MSGBOX",
            ADD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDWINDOW",
            ADD_CHILD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDCHILDWINDOW",
            SETOPTS_IN_CODE_SOURCE, "ComposerLauncher.Kind.SETOPTS_IN_CODE",
            CVS_SOURCE, "ComposerLauncher.Kind.CVS");

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

    /** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
    private static String extractMethodBody(String text, String signatureFragment) {
        int sigIndex = text.indexOf(signatureFragment);
        assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
        int braceStart = text.indexOf('{', sigIndex);
        assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
        int depth = 0;
        for (int i = braceStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(braceStart, i + 1);
                }
            }
        }
        fail("unbalanced braces for: " + signatureFragment);
        return "";
    }

    @Test
    void noIntentionReturnsAnEmptyPreviewAnymore() {
        for (Path source : ALL_GUARDED_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "IntentionPreviewInfo.EMPTY"),
                    source + " must never reference IntentionPreviewInfo.EMPTY -- an empty preview "
                            + "makes the platform fall back to the per-intention description resource "
                            + "lookup, which throws if that resource is ever missing");
        }
    }

    @Test
    void everyIntentionReturnsExactlyOneHtmlPreview() {
        String baseGeneratePreviewBody = withoutCommentLines(
                extractMethodBody(readSource(INTENTION_BASE_SOURCE), "generatePreview("));
        assertEquals(1, countOccurrences(baseGeneratePreviewBody, "new IntentionPreviewInfo.Html("),
                "ComposerIntentionBase's generatePreview body must construct exactly one "
                        + "IntentionPreviewInfo.Html so the fallback description lookup is unreachable "
                        + "from the popup");

        for (Path source : INTENTION_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(1, countOccurrences(text, "previewHtml()"),
                    source + " must declare previewHtml() exactly once");
            assertEquals(0, countOccurrences(text, "new IntentionPreviewInfo.Html("),
                    source + " must not construct its own IntentionPreviewInfo.Html -- that "
                            + "construction now lives exactly once on the base");
        }
    }

    @Test
    void startInWriteActionStillReturnsFalseOnEveryIntention() {
        String text = readSource(INTENTION_BASE_SOURCE);
        assertEquals(1, countOccurrences(text, "startInWriteAction"),
                "ComposerIntentionBase must declare startInWriteAction exactly once");
        String baseBody = extractMethodBody(text, "startInWriteAction(");
        assertTrue(baseBody.contains("return false;"),
                "ComposerIntentionBase's startInWriteAction must still return false -- every "
                        + "intention opens a modal dialog outside a write action");

        for (Path source : INTENTION_SOURCES) {
            String subclassText = readSource(source);
            assertEquals(0, countOccurrences(subclassText, "startInWriteAction"),
                    source + " must not declare startInWriteAction of its own -- it is inherited "
                            + "from ComposerIntentionBase");
        }
    }

    /**
     * SETOPTS-in-code gates on three keywords ({@code SETOPTS}, {@code IOR(}, {@code AND(})
     * rather than one, so it calls the dedicated {@code isCaretOnSetoptsInCode(Editor)} helper
     * instead of the single-keyword {@code isCaretOnCall(editor, keyword)} every other composer
     * intention uses -- this one assertion is genuinely inapplicable to it (a wider gate needs a
     * wider check), so it is scoped out here rather than deleted, per the "run and fix the
     * intention, not the assertion, unless genuinely inapplicable" instruction.
     */
    @Test
    void invokeAndIsAvailableAreUndisturbedOnEveryIntention() {
        String baseInvokeBody = withoutCommentLines(
                extractMethodBody(readSource(INTENTION_BASE_SOURCE), "invoke("));
        assertEquals(1, countOccurrences(baseInvokeBody, "ComposerLauncher.launch(project, editor, kind())"),
                "ComposerIntentionBase's invoke body must delegate to ComposerLauncher.launch exactly once");

        for (Path source : INTENTION_SOURCES) {
            String text = readSource(source);
            String ownKindConstant = OWN_KIND_CONSTANT.get(source);
            assertEquals(1, countOccurrences(text, ownKindConstant),
                    source + " must reference its own " + ownKindConstant + " exactly once, supplied "
                            + "to the base's invoke() via kind()");
            if (source.equals(SETOPTS_IN_CODE_SOURCE)) {
                assertEquals(1, countOccurrences(text, "ComposerLauncher.isCaretOnSetoptsInCode(editor)"),
                        source + " must call ComposerLauncher.isCaretOnSetoptsInCode exactly once from isAvailable()");
            } else {
                assertEquals(1, countOccurrences(text, "ComposerLauncher.isCaretOnCall(editor,"),
                        source + " must call ComposerLauncher.isCaretOnCall exactly once from isAvailable()");
            }
        }
    }

    @Test
    void pluginXmlRegistersAllFiveIntentionsExactlyOnce() {
        String text = readSource(PLUGIN_XML);

        assertEquals(5, countOccurrences(text, "<intentionAction>"),
                "plugin.xml must register exactly five <intentionAction> extensions -- MSGBOX, "
                        + "addWindow, addChildWindow, SETOPTS-in-code (#475) and CVS (#649)");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureMsgboxIntention"),
                "the MSGBOX registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureAddWindowIntention"),
                "the addWindow registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureAddChildWindowIntention"),
                "the addChildWindow registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureSetoptsInCodeIntention"),
                "the SETOPTS-in-code registration's fully-qualified class name must appear exactly once");
        assertEquals(1, countOccurrences(text, "com.basis.bbj.intellij.composer.ConfigureCvsIntention"),
                "the CVS registration's fully-qualified class name must appear exactly once");
    }
}
