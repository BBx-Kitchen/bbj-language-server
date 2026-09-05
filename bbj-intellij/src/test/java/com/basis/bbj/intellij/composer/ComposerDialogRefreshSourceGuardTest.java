package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #538 dialog-refresh wiring across all three composer dialogs -- MSGBOX, addWindow and
 * addChildWindow: each one observes both the success and the failure side of its preview request
 * through {@link ComposerFlow#observe}, checks its sequence number on both paths before touching
 * anything, disables OK and labels the dialog on a failure, and rate-limits its balloon to one per
 * dialog session via {@link ComposerFlow#once}. A failure here means one of four things happened --
 * a dialog went back to observing only the success side of its preview request, lost the sequence
 * check on one of the two paths, lost the OK gating that stops a stale statement from being
 * accepted, or started raising a balloon per keystroke instead of one per dialog session -- and this
 * guard fails the build for it instead of letting a user discover it as a silently-accepted stale
 * statement.
 */
class ComposerDialogRefreshSourceGuardTest {

    private static final Path MSGBOX_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "MsgboxComposerDialog.java")
            .toAbsolutePath();

    private static final Path ADD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "AddWindowComposerDialog.java")
            .toAbsolutePath();

    private static final Path ADD_CHILD_WINDOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "AddChildWindowComposerDialog.java")
            .toAbsolutePath();

    private static final Path FLOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerFlow.java")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    /** One entry per composer dialog so a fourth composer added later is a one-line addition. */
    private static final List<Path> DIALOG_SOURCES = List.of(MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE);

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
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden literal can never trip
     * a "zero times" assertion. Applied ahead of every zero-count assertion in this class.
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
    void noDialogObservesOnlyTheSuccessSideOfItsPreviewRequestAnyMore() {
        for (Path source : DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "thenAccept("),
                    source.getFileName() + " must not chain a bare thenAccept( on its preview request -- "
                            + "the failure side must be observed too");
            assertEquals(0, countOccurrences(text, "thenCompose("),
                    source.getFileName() + " must not compose its own chain outside the flow seam");
        }
    }

    @Test
    void eachDialogObservesThroughTheFlowSeamWithTheRefreshTimeout() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "flow.observe("),
                    source.getFileName() + " must hand its preview request to flow.observe( exactly once");
            assertTrue(countOccurrences(text, "ComposerFlow.REFRESH_TIMEOUT_MILLIS") >= 1,
                    source.getFileName() + " must bound its refresh with ComposerFlow.REFRESH_TIMEOUT_MILLIS");
        }
    }

    @Test
    void eachDialogLabelsAFailureAndDisablesOkExactlyOnce() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "Preview unavailable — "),
                    source.getFileName() + " must show the \"Preview unavailable\" label exactly once");
            assertEquals(1, countOccurrences(text, "setOKActionEnabled(false)"),
                    source.getFileName() + " must disable OK exactly once on a failed or empty preview");
        }
    }

    @Test
    void eachDialogRateLimitsItsBalloonToOnePerDialogSession() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "ComposerFlow.once("),
                    source.getFileName() + " must wrap its notifier in exactly one ComposerFlow.once( -- "
                            + "one balloon allowance per dialog instance");
        }
    }

    @Test
    void eachDialogChecksItsSequenceOnBothTheSuccessAndTheFailurePath() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "seq.incrementAndGet()"),
                    source.getFileName() + " must take exactly one sequence number per refresh");
            assertEquals(2, countOccurrences(text, "mySeq == seq.get()"),
                    source.getFileName() + " must check the sequence on both the success path and the "
                            + "failure path -- that is what makes a superseded failure as harmless as a "
                            + "superseded success");
        }
    }

    @Test
    void eachDialogTakesItsSequenceNumberBeforeObservingTheRequest() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            int incrementIndex = text.indexOf("seq.incrementAndGet()");
            int observeIndex = text.indexOf("flow.observe(");
            assertTrue(incrementIndex >= 0 && observeIndex >= 0 && incrementIndex < observeIndex,
                    source.getFileName() + " must take the sequence number before handing the request "
                            + "to flow.observe(, not after");
        }
    }

    @Test
    void eachDialogUpdatesItsUiThroughTheDialogsExistingModality() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertTrue(countOccurrences(text, "ModalityState.any()") >= 1,
                    source.getFileName() + " must keep updating through ModalityState.any() -- the "
                            + "dialog's own modality must not change");
        }
    }

    @Test
    void theFlowSeamStillCarriesNoIntelliJImportAndTheRateLimiterIsAtomic() {
        String text = withoutCommentLines(readSource(FLOW_SOURCE));
        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "ComposerFlow must stay a plain-Java class runnable on the plain JUnit 5 classpath (C-01)");
        assertTrue(readSource(FLOW_SOURCE).contains("REFRESH_TIMEOUT_MILLIS"),
                "ComposerFlow must declare REFRESH_TIMEOUT_MILLIS");
        assertEquals(1, countOccurrences(readSource(FLOW_SOURCE), "compareAndSet(false, true)"),
                "the one-shot notifier's check-and-set must be atomic");
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));
        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build (C-01)");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for composer dialog behaviour");
    }
}
