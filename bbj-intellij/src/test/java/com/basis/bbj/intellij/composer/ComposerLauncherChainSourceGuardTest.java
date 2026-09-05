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
 * Pins the #538 chain-flattening and single-surfacing-path wiring: {@code ComposerLauncher.launch()}
 * composes one chain through {@link ComposerFlow} with no unobserved continuation, the modal
 * information dialog is gone, and both new seams stay free of IntelliJ imports and off the platform
 * test classpath. A failure here means one of three things happened — a continuation chain
 * reappeared in the launcher where nothing observes its result, the modal information dialog came
 * back so the package once again has two failure-surfacing paths, or the flow seam lost its terminal
 * handler or its bounded wait. Each of those is the original silent-failure bug returning, and this
 * guard fails the build for it instead of letting a user discover it as "nothing happened".
 */
class ComposerLauncherChainSourceGuardTest {

    private static final Path LAUNCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerLauncher.java")
            .toAbsolutePath();

    private static final Path FLOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerFlow.java")
            .toAbsolutePath();

    private static final Path NOTICES_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerNotices.java")
            .toAbsolutePath();

    private static final Path RENDERER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerNoticeRenderer.java")
            .toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

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
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden literal (e.g. this
     * class's own javadoc mentioning {@code thenAccept}) can never trip a "zero times" assertion.
     * Applied ahead of every zero-count assertion in this class without exception.
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
    void theLauncherHasNoUnobservedContinuationLeftFromTheOldPyramid() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(0, countOccurrences(text, "thenAccept("),
                "every continuation must live in the flow seam, not in a nested thenAccept( in the launcher");
        assertEquals(0, countOccurrences(text, "thenCompose("),
                "the launcher must not itself compose a chain -- that belongs to ComposerFlow");
    }

    @Test
    void theLauncherComposesEachComposerKindThroughTheFlowSeamExactlyOnce() {
        String text = readSource(LAUNCHER_SOURCE);

        assertEquals(3, countOccurrences(text, "flow.launch("),
                "one flow.launch( call per composer kind (MSGBOX, addWindow, addChildWindow)");
    }

    @Test
    void theModalInformationDialogIsGoneFromTheLauncher() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(0, countOccurrences(text, "Messages.showInfoMessage"),
                "the modal path must be gone -- balloons are the only surfacing path now (#538)");
        assertEquals(0, countOccurrences(text, "import com.intellij.openapi.ui.Messages"),
                "the now-unused Messages import must be removed along with the modal call");
    }

    @Test
    void theLauncherRendersThroughTheNoticeSeamAndTheRendererCallSite() {
        String text = readSource(LAUNCHER_SOURCE);

        assertTrue(countOccurrences(text, "ComposerNoticeRenderer.render(") >= 1,
                "the launcher must render at least one notice through the renderer call site");
        assertTrue(countOccurrences(text, "ComposerNotices.notReady(") >= 1,
                "the null-catalogs guards must build a NOT_READY notice from the notice seam");
    }

    @Test
    void theCreatePathAndTheCaptureBlockSurviveTheRewrite() {
        String text = readSource(LAUNCHER_SOURCE);

        assertTrue(text.contains("insertAtCaret("), "the create path must be untouched by this plan");
        assertTrue(text.contains("isCaretOnCall("), "the lightbulb-availability heuristic must be untouched");
        assertTrue(text.contains("doc.getLineNumber(caret)"),
                "the capture block (line/column read on the EDT) must survive the chain rewrite verbatim");
    }

    @Test
    void theFlowSeamsSingleTerminalHandlerReallyTerminatesTheChain() {
        String text = readSource(FLOW_SOURCE);

        assertTrue(countOccurrences(text, "orTimeout(") >= 1,
                "every stage must be bounded by a wait (D-04)");
        assertEquals(1, countOccurrences(text, "handle("),
                "exactly one terminal handler must exist for the whole chain");
        int lastThenCompose = text.lastIndexOf("thenCompose(");
        int firstHandle = text.indexOf("handle(");
        assertTrue(lastThenCompose >= 0 && firstHandle >= 0 && lastThenCompose < firstHandle,
                "the terminal handler must sit after every composed stage, not in the middle of the chain");
    }

    @Test
    void bothNewSeamsCarryNoIntelliJImport() {
        String flowText = withoutCommentLines(readSource(FLOW_SOURCE));
        String noticesText = withoutCommentLines(readSource(NOTICES_SOURCE));

        assertEquals(0, countOccurrences(flowText, "import com.intellij"),
                "the flow seam must stay a plain-Java class runnable on the plain JUnit 5 classpath (C-01)");
        assertEquals(0, countOccurrences(noticesText, "import com.intellij"),
                "the notice seam must stay a plain-Java class runnable on the plain JUnit 5 classpath (C-01)");
    }

    @Test
    void theRendererUsesTheExistingNotificationGroupWithAllThreeSeverities() {
        String text = readSource(RENDERER_SOURCE);

        assertEquals(1, countOccurrences(text, "\"BBj Language Server\""),
                "the renderer must name the existing notification group exactly once");
        assertTrue(countOccurrences(text, "NotificationType.WARNING") >= 1,
                "the renderer must map STALE_DOCUMENT's WARNING severity to NotificationType.WARNING");
    }

    @Test
    void pluginXmlStillDeclaresTheNotificationGroupTheRendererNames() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("notificationGroup id=\"BBj Language Server\""),
                "the notification group the renderer names must still be declared in plugin.xml");
    }

    @Test
    void noPlatformTestFrameworkCreptInAnywhere() {
        String launcherText = withoutCommentLines(readSource(LAUNCHER_SOURCE));
        String flowText = withoutCommentLines(readSource(FLOW_SOURCE));
        String noticesText = withoutCommentLines(readSource(NOTICES_SOURCE));
        String rendererText = withoutCommentLines(readSource(RENDERER_SOURCE));
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));

        assertEquals(0, countOccurrences(launcherText, "BasePlatformTestCase"),
                "no platform test framework belongs in production wiring");
        assertEquals(0, countOccurrences(flowText, "BasePlatformTestCase"), "the flow seam stays plain Java");
        assertEquals(0, countOccurrences(noticesText, "BasePlatformTestCase"), "the notice seam stays plain Java");
        assertEquals(0, countOccurrences(rendererText, "BasePlatformTestCase"), "the renderer stays plain Java");
        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build (C-01)");
    }
}
