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
 * Pins the #618 composer-intention consolidation: {@code ComposerIntentionBase} carries the family
 * name, write-action policy, launch call and preview construction exactly once, each of the five
 * {@code Configure*Intention} subclasses delegates to it rather than re-declaring any of those
 * members, and the base is never itself registered as a lightbulb entry in {@code plugin.xml}.
 * Follows the base-aware guard pattern in {@code EmTokenTrustWindowSourceGuardTest} and the
 * abstract-declaration edge case in {@code OffEdtDispatchSourceGuardTest}: every private helper
 * below is this guard's own copy, never a shared test utility.
 */
class ComposerIntentionBaseSourceGuardTest {

    private static final Path INTENTION_BASE_SOURCE = guardedComposerSource("ComposerIntentionBase.java");
    private static final Path MSGBOX_SOURCE = guardedComposerSource("ConfigureMsgboxIntention.java");
    private static final Path ADD_WINDOW_SOURCE = guardedComposerSource("ConfigureAddWindowIntention.java");
    private static final Path ADD_CHILD_WINDOW_SOURCE = guardedComposerSource("ConfigureAddChildWindowIntention.java");
    private static final Path SETOPTS_IN_CODE_SOURCE = guardedComposerSource("ConfigureSetoptsInCodeIntention.java");
    private static final Path CVS_SOURCE = guardedComposerSource("ConfigureCvsIntention.java");

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    private static Path guardedComposerSource(String fileName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", fileName)
                .toAbsolutePath();
    }

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
    void baseIsAnAbstractClassImplementingIntentionActionExactlyOnce() {
        String text = withoutCommentLines(readSource(INTENTION_BASE_SOURCE));
        assertEquals(1, countOccurrences(text, "implements IntentionAction"),
                "ComposerIntentionBase.java must implement IntentionAction exactly once");
        assertTrue(text.contains("public abstract class ComposerIntentionBase"),
                "ComposerIntentionBase.java must be declared public abstract class ComposerIntentionBase");
    }

    @Test
    void generatePreviewBodyConstructsExactlyOneHtmlPreviewFromPreviewHtml() {
        String body = withoutCommentLines(
                extractMethodBody(readSource(INTENTION_BASE_SOURCE), "generatePreview("));
        assertEquals(1, countOccurrences(body, "new IntentionPreviewInfo.Html("),
                "the base's generatePreview body must construct exactly one IntentionPreviewInfo.Html");
        assertEquals(1, countOccurrences(body, "previewHtml()"),
                "the base's generatePreview body must call previewHtml() exactly once");
    }

    @Test
    void invokeBodyDelegatesToLaunchWithKindExactlyOnceBehindANullEditorGuard() {
        String body = withoutCommentLines(
                extractMethodBody(readSource(INTENTION_BASE_SOURCE), "invoke("));
        assertEquals(1, countOccurrences(body, "ComposerLauncher.launch(project, editor, kind())"),
                "the base's invoke body must call ComposerLauncher.launch(project, editor, kind()) exactly once");
        assertEquals(1, countOccurrences(body, "editor != null"),
                "the base's invoke body must guard on editor != null exactly once, preserving the "
                        + "null-editor no-op every intention had before consolidation");
    }

    @Test
    void getFamilyNameBodyReturnsTheSharedLiteralExactlyOnce() {
        String body = withoutCommentLines(
                extractMethodBody(readSource(INTENTION_BASE_SOURCE), "getFamilyName("));
        assertEquals(1, countOccurrences(body, "\"BBj visual composer\""),
                "the base's getFamilyName body must return \"BBj visual composer\" exactly once");
    }

    @Test
    void theAbstractHookDeclarationsCarryNoBody() {
        String text = readSource(INTENTION_BASE_SOURCE);

        int kindIndex = text.indexOf("protected abstract ComposerLauncher.Kind kind(");
        assertTrue(kindIndex >= 0, "protected abstract ComposerLauncher.Kind kind( is not present");
        String kindLine = text.substring(text.lastIndexOf('\n', kindIndex) + 1, text.indexOf('\n', kindIndex));
        assertTrue(kindLine.trim().endsWith(";"),
                "the abstract kind() declaration has no body, so it cannot and must not carry an assertion");

        int previewHtmlIndex = text.indexOf("protected abstract String previewHtml(");
        assertTrue(previewHtmlIndex >= 0, "protected abstract String previewHtml( is not present");
        String previewHtmlLine = text.substring(
                text.lastIndexOf('\n', previewHtmlIndex) + 1, text.indexOf('\n', previewHtmlIndex));
        assertTrue(previewHtmlLine.trim().endsWith(";"),
                "the abstract previewHtml() declaration has no body, so it cannot and must not carry an assertion");
    }

    @Test
    void pluginXmlNeverRegistersTheBaseDirectly() {
        String text = readSource(PLUGIN_XML);
        assertEquals(0, countOccurrences(text, "ComposerIntentionBase"),
                "plugin.xml must never name ComposerIntentionBase -- the platform instantiates "
                        + "registered intentions via a no-arg constructor, and the base has no "
                        + "getText()/isAvailable() of its own to offer a user");
    }

    @Test
    void everySubclassDelegatesToTheBaseExactlyOnce() {
        assertSubclassDelegation(MSGBOX_SOURCE, "ComposerLauncher.Kind.MSGBOX");
        assertSubclassDelegation(ADD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDWINDOW");
        assertSubclassDelegation(ADD_CHILD_WINDOW_SOURCE, "ComposerLauncher.Kind.ADDCHILDWINDOW");
        assertSubclassDelegation(SETOPTS_IN_CODE_SOURCE, "ComposerLauncher.Kind.SETOPTS_IN_CODE");
        assertSubclassDelegation(CVS_SOURCE, "ComposerLauncher.Kind.CVS");
    }

    private static void assertSubclassDelegation(Path source, String ownKindConstant) {
        String text = withoutCommentLines(readSource(source));
        assertEquals(1, countOccurrences(text, "extends ComposerIntentionBase"),
                source + " must extend ComposerIntentionBase exactly once");
        assertEquals(1, countOccurrences(text, ownKindConstant),
                source + " must reference its own " + ownKindConstant + " exactly once");
        assertEquals(1, countOccurrences(text, "protected String previewHtml()"),
                source + " must declare its own previewHtml() exactly once");
    }

    @Test
    void buildScriptStillRequiresNoPlatformTestFramework() {
        String text = readSource(BUILD_GRADLE_KTS);
        assertEquals(0, countOccurrences(text, "TestFrameworkType"),
                "build.gradle.kts must not require a platform TestFrameworkType for these plain JUnit 5 guards");
        assertEquals(0, countOccurrences(text, "BasePlatformTestCase"),
                "build.gradle.kts must not reference BasePlatformTestCase for these plain JUnit 5 guards");
    }
}
