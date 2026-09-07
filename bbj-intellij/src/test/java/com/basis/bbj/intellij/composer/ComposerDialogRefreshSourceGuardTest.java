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
 * Pins the #538 dialog-refresh wiring across all four composer dialogs -- MSGBOX, addWindow,
 * addChildWindow and SETOPTS: each one observes both the success and the failure side of its
 * preview request through {@link ComposerFlow#observe}, checks its sequence number on both paths
 * before touching anything, disables OK and labels the dialog on a failure, and rate-limits its
 * balloon to one per dialog session via {@link ComposerFlow#once}. A failure here means one of four
 * things happened -- a dialog went back to observing only the success side of its preview request,
 * lost the sequence check on one of the two paths, lost the OK gating that stops a stale statement
 * from being accepted, or started raising a balloon per keystroke instead of one per dialog session
 * -- and this guard fails the build for it instead of letting a user discover it as a
 * silently-accepted stale statement.
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

    private static final Path SETOPTS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "SetoptsComposerDialog.java")
            .toAbsolutePath();

    private static final Path TRISTATE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "SetoptsTriStateComposerDialog.java")
            .toAbsolutePath();

    private static final Path FLOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerFlow.java")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    /** One entry per composer dialog so a sixth composer added later is a one-line addition. */
    private static final List<Path> DIALOG_SOURCES =
            List.of(MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, TRISTATE_SOURCE);

    /**
     * Dialogs whose live preview is coalesced through the {@code PreviewDebouncer}'s fixed 300ms
     * trailing-edge delay (CR-01) disable OK a third time -- synchronously, the instant a new
     * preview is scheduled -- rather than only on the constructor's initial disable and a later
     * failed preview. {@code SetoptsTriStateComposerDialog} reuses the exact same debounce seam
     * and CR-01 rule {@code SetoptsComposerDialog} established, so both carry the third disable.
     */
    private static final List<Path> DEBOUNCED_DIALOG_SOURCES = List.of(SETOPTS_SOURCE, TRISTATE_SOURCE);

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
    void eachDialogLabelsAFailureOnAFailedPreviewExactlyOnce() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "Preview unavailable — "),
                    source.getFileName() + " must show the \"Preview unavailable\" label exactly once");
        }
    }

    /**
     * A premature OK click landing before the constructor's own first preview round-trip
     * resolves must never be acceptable -- otherwise the field defaults (empty flagsHex / null
     * eventHex) get written into the document. Each dialog constructor must call
     * {@code setOKActionEnabled(false)} before its own initial {@code refresh()} call, in addition
     * to the existing failure-path disable (on a later failed or empty preview), so this asserts
     * both occurrences exist and that the first one is positioned ahead of the first literal
     * {@code refresh();} call site in the file (the constructor's own initial refresh -- later
     * {@code refresh();} call sites belong to input listeners).
     * <p>
     * SETOPTS and the tri-state SETOPTS-in-code dialog carry a third occurrence (CR-01): unlike
     * the other dialogs, their live-preview refresh is coalesced through {@code PreviewDebouncer}'s
     * fixed 300ms trailing-edge delay, so a click landing inside that window would otherwise still
     * see the previous, now-superseded preview's OK-enabled state. Both disable OK synchronously
     * the instant a new preview is scheduled (not only on eventual success/failure), so every
     * dialog's minimum expected count of 2 still holds and {@link #DEBOUNCED_DIALOG_SOURCES} alone
     * are allowed a third.
     */
    @Test
    void eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            boolean debounced = DEBOUNCED_DIALOG_SOURCES.contains(source);
            int expected = debounced ? 3 : 2;
            assertEquals(expected, countOccurrences(text, "setOKActionEnabled(false)"),
                    debounced
                            ? source.getFileName() + " must disable OK three times: once up front before "
                                    + "the constructor's first preview round-trip, once the instant a new "
                                    + "preview is scheduled (CR-01), once on a later failed preview"
                            : source.getFileName() + " must disable OK twice: once up front before the "
                                    + "constructor's first preview round-trip, once on a later failed preview");

            int firstDisable = text.indexOf("setOKActionEnabled(false)");
            int firstRefreshCall = text.indexOf("refresh();");
            assertTrue(firstDisable >= 0 && firstRefreshCall >= 0 && firstDisable < firstRefreshCall,
                    source.getFileName() + " must disable OK before the constructor's own first "
                            + "refresh() call -- otherwise OK is clickable during the async window "
                            + "before any preview has ever resolved");
        }
    }

    /**
     * CR-01: every checkbox/field listener in SETOPTS must route through a single helper
     * ({@code scheduleRefresh()}) that disables OK before scheduling the debounced preview, rather
     * than calling {@code previewDebouncer.trigger()} directly from a listener body -- a listener
     * that bypassed the helper would reopen the exact stale-apply window this guard exists to close.
     * {@code previewDebouncer.trigger()} itself must still appear exactly once (inside the helper).
     */
    @Test
    void setoptsRoutesEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly() {
        String text = withoutCommentLines(readSource(SETOPTS_SOURCE));
        assertTrue(text.contains("private void scheduleRefresh()"),
                "SetoptsComposerDialog must declare a scheduleRefresh() helper that disables OK and "
                        + "triggers the debouncer");
        assertEquals(1, countOccurrences(text, "previewDebouncer.trigger()"),
                "previewDebouncer.trigger() must be called from exactly one place -- inside "
                        + "scheduleRefresh() -- never inline from a listener body");
        assertEquals(0, countOccurrences(text, "previewDebouncer::trigger"),
                "no listener may pass previewDebouncer::trigger as a method reference -- every trigger "
                        + "must go through scheduleRefresh() so OK is disabled first");
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
                "ComposerFlow must stay a plain-Java class runnable on the plain JUnit 5 classpath");
        assertTrue(readSource(FLOW_SOURCE).contains("REFRESH_TIMEOUT_MILLIS"),
                "ComposerFlow must declare REFRESH_TIMEOUT_MILLIS");
        assertEquals(1, countOccurrences(readSource(FLOW_SOURCE), "compareAndSet(false, true)"),
                "the one-shot notifier's check-and-set must be atomic");
    }

    /**
     * Every dialog constructor wires {@code project} straight into
     * {@link ComposerNoticeRenderer#render}'s {@code @NotNull Project} parameter (via
     * {@code balloonOnce}), so the constructor's own {@code project} parameter must carry a matching
     * {@code @NotNull}, never {@code @Nullable} -- a mismatched {@code @Nullable} would let a future
     * null-project construction throw inside the notifier instead of failing at the call site.
     */
    @Test
    void eachDialogConstructorRequiresANonNullProjectMatchingTheRendererContract() {
        for (Path source : DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(0, countOccurrences(text, "@Nullable Project project"),
                    source.getFileName() + " must never declare its project parameter @Nullable -- "
                            + "every constructor wires it straight into ComposerNoticeRenderer.render's "
                            + "@NotNull Project parameter");
            assertTrue(countOccurrences(text, "@NotNull Project project") >= 1,
                    source.getFileName() + " must declare its project parameter @NotNull, matching "
                            + "ComposerNoticeRenderer.render's contract");
        }
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));
        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for composer dialog behaviour");
    }
}
