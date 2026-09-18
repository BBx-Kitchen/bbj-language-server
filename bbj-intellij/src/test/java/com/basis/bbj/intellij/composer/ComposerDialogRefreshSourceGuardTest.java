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
 * Pins the #538 dialog-refresh wiring across every composer dialog: each one observes both the
 * success and the failure side of its preview request through {@link ComposerFlow#observe},
 * checks its sequence number on both paths before touching anything, disables OK and labels the
 * dialog on a failure, and rate-limits its balloon to one per dialog session via
 * {@link ComposerFlow#once}. A failure here means one of four things happened -- a dialog went
 * back to observing only the success side of its preview request, lost the sequence check on one
 * of the two paths, lost the OK gating that stops a stale statement from being accepted, or
 * started raising a balloon per keystroke instead of one per dialog session -- and this guard
 * fails the build for it instead of letting a user discover it as a silently-accepted stale
 * statement.
 *
 * <p>{@code AddWindowComposerDialog} and {@code AddChildWindowComposerDialog} now share the
 * preview seam, the debounce wiring and the sequence-counter discipline through
 * {@code AddWindowFamilyComposerDialogBase} (#630) rather than each carrying its own copy, so the
 * literals this class pins for those two dialogs are split across the base (checked once, for
 * both dialogs together) and each subclass file, instead of appearing once per subclass file as
 * they still do for the other four dialogs.
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

    private static final Path ADD_WINDOW_FAMILY_BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "AddWindowFamilyComposerDialogBase.java")
            .toAbsolutePath();

    private static final Path SETOPTS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "SetoptsComposerDialog.java")
            .toAbsolutePath();

    private static final Path TRISTATE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer",
            "SetoptsTriStateComposerDialog.java")
            .toAbsolutePath();

    private static final Path CVS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "CvsComposerDialog.java")
            .toAbsolutePath();

    private static final Path FLOW_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerFlow.java")
            .toAbsolutePath();

    private static final Path SWING_HELPERS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerSwingHelpers.java")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

    /** One entry per composer dialog so a seventh composer added later is a one-line addition. */
    private static final List<Path> DIALOG_SOURCES = List.of(
            MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, TRISTATE_SOURCE, CVS_SOURCE);

    /** Every dialog source plus the shared addWindow-family base, for sweeps that must cover both. */
    private static final List<Path> ALL_SOURCES_INCLUDING_BASE = List.of(
            MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, TRISTATE_SOURCE, CVS_SOURCE,
            ADD_WINDOW_FAMILY_BASE_SOURCE);

    /** The two addWindow-family dialogs whose shared seam now lives on {@link #ADD_WINDOW_FAMILY_BASE_SOURCE}. */
    private static final List<Path> ADD_WINDOW_FAMILY_SOURCES = List.of(ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE);

    /**
     * The four dialogs that still own their debounce seam directly in their own file --
     * {@code AddWindowComposerDialog} and {@code AddChildWindowComposerDialog} moved theirs onto
     * {@link #ADD_WINDOW_FAMILY_BASE_SOURCE} (#630) and are asserted separately below.
     */
    private static final List<Path> OTHER_DEBOUNCED_DIALOG_SOURCES = List.of(
            MSGBOX_SOURCE, SETOPTS_SOURCE, TRISTATE_SOURCE, CVS_SOURCE);

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
        for (Path source : ALL_SOURCES_INCLUDING_BASE) {
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
        String helpersBody = extractMethodBody(
                withoutCommentLines(readSource(SWING_HELPERS_SOURCE)), "previewUnavailableText(");
        assertEquals(1, countOccurrences(helpersBody, "Preview unavailable — "),
                "the shared previewUnavailableText( body must carry the \"Preview unavailable\" prefix exactly once");

        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "Preview unavailable — "),
                    source.getFileName() + " must no longer carry the \"Preview unavailable\" prefix "
                            + "literal itself -- it lives in the shared home now");
            assertEquals(1, countOccurrences(text, "ComposerSwingHelpers.previewUnavailable("),
                    source.getFileName() + " must delegate to ComposerSwingHelpers.previewUnavailable( exactly once");
        }

        // AddWindow-family: the previewUnavailable(String) wrapper that delegates to
        // ComposerSwingHelpers.previewUnavailable( moved onto the shared base (#630), so each
        // subclass now carries zero occurrences and the base carries exactly one.
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "Preview unavailable — "),
                    source.getFileName() + " must never carry the \"Preview unavailable\" prefix literal itself");
            assertEquals(0, countOccurrences(text, "ComposerSwingHelpers.previewUnavailable("),
                    source.getFileName() + " must delegate through the inherited previewUnavailable(String) "
                            + "wrapper on the base, not call ComposerSwingHelpers directly");
        }
        String baseText = withoutCommentLines(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE));
        assertEquals(0, countOccurrences(baseText, "Preview unavailable — "),
                "AddWindowFamilyComposerDialogBase.java must never carry the \"Preview unavailable\" prefix literal itself");
        assertEquals(1, countOccurrences(baseText, "ComposerSwingHelpers.previewUnavailable("),
                "AddWindowFamilyComposerDialogBase.java must delegate to ComposerSwingHelpers.previewUnavailable( exactly once");
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
     * see the previous, now-superseded preview's OK-enabled state. Every debounced dialog disables
     * OK synchronously the instant a new preview is scheduled (not only on eventual
     * success/failure), so every dialog's minimum expected count of 2 still holds and every
     * debounced dialog is allowed a third.
     * <p>
     * For the addWindow-family two, the three disables split across two files: the base's
     * {@code scheduleRefresh()} and {@code previewUnavailable(String)} each carry one, and the
     * subclass's own constructor carries the up-front one -- so the total across the subclass file
     * plus the base must equal three, rather than three appearing in one file.
     */
    @Test
    void eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(3, countOccurrences(text, "setOKActionEnabled(false)"),
                    source.getFileName() + " must disable OK three times: once up front before "
                            + "the constructor's first preview round-trip, once the instant a new "
                            + "preview is scheduled (CR-01), once on a later failed preview");

            int firstDisable = text.indexOf("setOKActionEnabled(false)");
            int firstRefreshCall = text.indexOf("refresh();");
            assertTrue(firstDisable >= 0 && firstRefreshCall >= 0 && firstDisable < firstRefreshCall,
                    source.getFileName() + " must disable OK before the constructor's own first "
                            + "refresh() call -- otherwise OK is clickable during the async window "
                            + "before any preview has ever resolved");
        }

        int baseDisables = countOccurrences(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE), "setOKActionEnabled(false)");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = readSource(source);
            int subclassDisables = countOccurrences(text, "setOKActionEnabled(false)");
            assertEquals(3, subclassDisables + baseDisables,
                    source.getFileName() + " plus AddWindowFamilyComposerDialogBase.java together must disable "
                            + "OK three times: once up front in the subclass constructor, once (on the base) the "
                            + "instant a new preview is scheduled, once (on the base) on a later failed preview");

            int firstDisable = text.indexOf("setOKActionEnabled(false)");
            int firstRefreshCall = text.indexOf("refresh();");
            assertTrue(firstDisable >= 0 && firstRefreshCall >= 0 && firstDisable < firstRefreshCall,
                    source.getFileName() + " must disable OK before the constructor's own first "
                            + "refresh() call -- otherwise OK is clickable during the async window "
                            + "before any preview has ever resolved");
        }
    }

    /**
     * Every checkbox/field listener in a debounced dialog must route through a single helper
     * ({@code scheduleRefresh()}) that disables OK before scheduling the debounced preview, rather
     * than calling {@code previewDebouncer.trigger()} directly from a listener body -- a listener
     * that bypassed the helper would reopen the exact stale-apply window this guard exists to close.
     * {@code previewDebouncer.trigger()} itself must still appear exactly once (inside the helper).
     * {@code CvsComposerDialog} reuses the exact same debounce seam {@code SetoptsComposerDialog}
     * established, so it carries the same helper (#649).
     * <p>
     * For the addWindow-family two, {@code scheduleRefresh()} is declared on the shared base, not
     * per subclass, so {@code previewDebouncer.trigger()} lives there once and each subclass file
     * carries zero occurrences.
     */
    @Test
    void debouncedDialogsRouteEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertTrue(text.contains("private void scheduleRefresh()"),
                    source.getFileName() + " must declare a scheduleRefresh() helper that disables OK "
                            + "and triggers the debouncer");
            assertEquals(1, countOccurrences(text, "previewDebouncer.trigger()"),
                    source.getFileName() + " previewDebouncer.trigger() must be called from exactly one "
                            + "place -- inside scheduleRefresh() -- never inline from a listener body");
            assertEquals(0, countOccurrences(text, "previewDebouncer::trigger"),
                    source.getFileName() + " no listener may pass previewDebouncer::trigger as a method "
                            + "reference -- every trigger must go through scheduleRefresh() so OK is "
                            + "disabled first");
        }

        String baseText = withoutCommentLines(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE));
        assertTrue(baseText.contains("protected void scheduleRefresh()"),
                "AddWindowFamilyComposerDialogBase.java must declare the shared scheduleRefresh() helper "
                        + "that disables OK and triggers the debouncer");
        assertEquals(1, countOccurrences(baseText, "previewDebouncer.trigger()"),
                "AddWindowFamilyComposerDialogBase.java previewDebouncer.trigger() must be called from "
                        + "exactly one place -- inside scheduleRefresh()");
        assertEquals(0, countOccurrences(baseText, "previewDebouncer::trigger"),
                "AddWindowFamilyComposerDialogBase.java must never pass previewDebouncer::trigger as a "
                        + "method reference");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "private void scheduleRefresh()"),
                    source.getFileName() + " must not re-declare scheduleRefresh() -- it is inherited from the base");
            assertEquals(0, countOccurrences(text, "previewDebouncer.trigger()"),
                    source.getFileName() + " must never call previewDebouncer.trigger() directly -- "
                            + "it is reached only through the inherited scheduleRefresh()");
        }
    }

    /**
     * Every debounced dialog wires the shared debounce seam identically: one delay constant, one
     * scheduler instance, one debouncer instance, and no bespoke {@code Alarm} of its own. A dialog
     * that drifted from this shape (a different delay, a second scheduler, or a raw {@code Alarm})
     * would defeat the purpose of sharing one seam across all six dialogs.
     * <p>
     * For the addWindow-family two, this seam construction now lives entirely on the shared base
     * (#630), so each subclass file must carry zero occurrences of every seam-construction literal
     * and the base must carry exactly one of each. {@code new Alarm(} stays forbidden everywhere,
     * including the base.
     */
    @Test
    void everyDebouncedDialogSharesTheOneDebounceSeamWithTheSameDelay() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(1, countOccurrences(text, "PREVIEW_DEBOUNCE_MS = 300L"),
                    source.getFileName() + " must declare exactly one PREVIEW_DEBOUNCE_MS = 300L");
            assertEquals(1, countOccurrences(text, "new AlarmScheduler(getDisposable())"),
                    source.getFileName() + " must build exactly one AlarmScheduler over its own disposable");
            assertEquals(1, countOccurrences(text, "new PreviewDebouncer("),
                    source.getFileName() + " must build exactly one PreviewDebouncer");
            assertEquals(0, countOccurrences(text, "new Alarm("),
                    source.getFileName() + " must not create a bespoke Alarm of its own -- "
                            + "AlarmScheduler is the only Alarm owner");
        }

        String baseText = withoutCommentLines(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE));
        assertEquals(1, countOccurrences(baseText, "PREVIEW_DEBOUNCE_MS = 300L"),
                "AddWindowFamilyComposerDialogBase.java must declare exactly one PREVIEW_DEBOUNCE_MS = 300L");
        assertEquals(1, countOccurrences(baseText, "new AlarmScheduler(getDisposable())"),
                "AddWindowFamilyComposerDialogBase.java must build exactly one AlarmScheduler over its own disposable");
        assertEquals(1, countOccurrences(baseText, "new PreviewDebouncer("),
                "AddWindowFamilyComposerDialogBase.java must build exactly one PreviewDebouncer");
        assertEquals(0, countOccurrences(baseText, "new Alarm("),
                "AddWindowFamilyComposerDialogBase.java must not create a bespoke Alarm of its own");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "PREVIEW_DEBOUNCE_MS"),
                    source.getFileName() + " must not re-declare PREVIEW_DEBOUNCE_MS -- it is inherited from the base");
            assertEquals(0, countOccurrences(text, "new AlarmScheduler("),
                    source.getFileName() + " must not build its own AlarmScheduler -- it is inherited from the base");
            assertEquals(0, countOccurrences(text, "new PreviewDebouncer("),
                    source.getFileName() + " must not build its own PreviewDebouncer -- it is inherited from the base");
            assertEquals(0, countOccurrences(text, "new Alarm("),
                    source.getFileName() + " must not create a bespoke Alarm of its own");
        }
    }

    /**
     * A debounced dialog listener that called {@code refresh()} directly would bypass the OK-disable
     * that {@code scheduleRefresh()} exists to guarantee, reopening the stale-apply window this guard
     * closes elsewhere. Only the debouncer's own action reference may name {@code refresh}.
     * <p>
     * For the addWindow-family two, {@code this::refresh} is now referenced on the shared base
     * (inside its {@code PreviewDebouncer} construction), so each subclass file carries zero
     * occurrences; {@code -> refresh()} stays forbidden everywhere, including the base.
     */
    @Test
    void noDebouncedDialogListenerRefreshesDirectly() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(1, countOccurrences(text, "this::refresh"),
                    source.getFileName() + " must reference refresh() exactly once -- as the "
                            + "PreviewDebouncer's own action");
            assertEquals(0, countOccurrences(text, "-> refresh()"),
                    source.getFileName() + " no listener may call refresh() directly -- every "
                            + "listener must route through scheduleRefresh()");
        }

        String baseText = withoutCommentLines(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE));
        assertEquals(1, countOccurrences(baseText, "this::refresh"),
                "AddWindowFamilyComposerDialogBase.java must reference refresh() exactly once -- as the "
                        + "PreviewDebouncer's own action");
        assertEquals(0, countOccurrences(baseText, "-> refresh()"),
                "AddWindowFamilyComposerDialogBase.java must never call refresh() directly from a listener");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(0, countOccurrences(text, "this::refresh"),
                    source.getFileName() + " must not reference refresh() directly -- the "
                            + "PreviewDebouncer holding it is built on the base");
            assertEquals(0, countOccurrences(text, "-> refresh()"),
                    source.getFileName() + " no listener may call refresh() directly");
        }
    }

    @Test
    void eachDialogRateLimitsItsBalloonToOnePerDialogSession() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "ComposerFlow.once("),
                    source.getFileName() + " must wrap its notifier in exactly one ComposerFlow.once( -- "
                            + "one balloon allowance per dialog instance");
        }

        assertEquals(1, countOccurrences(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE), "ComposerFlow.once("),
                "AddWindowFamilyComposerDialogBase.java must wrap its notifier in exactly one ComposerFlow.once(");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            assertEquals(0, countOccurrences(readSource(source), "ComposerFlow.once("),
                    source.getFileName() + " must not build its own balloon allowance -- it is inherited from the base");
        }
    }

    @Test
    void eachDialogChecksItsSequenceOnBothTheSuccessAndTheFailurePath() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = readSource(source);
            assertEquals(2, countOccurrences(text, "seq.incrementAndGet()"),
                    source.getFileName() + " must take a sequence number twice: once in "
                            + "scheduleRefresh() to invalidate any response already in flight "
                            + "before the latest keystroke, once in refresh() for its own request");
            assertEquals(2, countOccurrences(text, "mySeq == seq.get()"),
                    source.getFileName() + " must check the sequence on both the success path and the "
                            + "failure path -- that is what makes a superseded failure as harmless as a "
                            + "superseded success");
        }

        // AddWindow-family: scheduleRefresh()'s increment lives on the shared base; refresh()'s own
        // increment and both mySeq == seq.get() checks stay in the subclass.
        assertEquals(1, countOccurrences(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE), "seq.incrementAndGet()"),
                "AddWindowFamilyComposerDialogBase.java must take exactly one sequence number, in scheduleRefresh()");
        for (Path source : ADD_WINDOW_FAMILY_SOURCES) {
            String text = readSource(source);
            assertEquals(1, countOccurrences(text, "seq.incrementAndGet()"),
                    source.getFileName() + " must take exactly one sequence number, in its own refresh()");
            assertEquals(2, countOccurrences(text, "mySeq == seq.get()"),
                    source.getFileName() + " must check the sequence on both the success path and the failure path");
        }
    }

    /**
     * {@code scheduleRefresh()} runs synchronously on every keystroke, long before the debounced
     * {@code refresh()} actually fires -- so if it does not also advance {@code seq}, a response
     * already in flight from before this keystroke can still match {@code refresh()}'s own
     * {@code seq.incrementAndGet()} value and get applied, re-enabling OK from stale field values.
     * Extracts each debounced dialog's {@code scheduleRefresh()} method body (up to its first closing
     * brace -- the body is a flat, three-statement method with no nested blocks in any of the six
     * dialogs) and asserts it advances the sequence number itself, not just {@code refresh()}.
     */
    @Test
    void eachDebouncedDialogsScheduleRefreshAdvancesTheSequenceNumberBeforeTriggeringTheDebouncer() {
        String marker = "private void scheduleRefresh() {";
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = readSource(source);
            int start = text.indexOf(marker);
            assertTrue(start >= 0, source.getFileName() + " must declare a scheduleRefresh() method");
            int end = text.indexOf('}', start);
            assertTrue(end > start, source.getFileName() + " scheduleRefresh() must be closed");
            String body = text.substring(start, end);
            assertTrue(body.contains("seq.incrementAndGet()"),
                    source.getFileName() + " scheduleRefresh() must call seq.incrementAndGet() so any "
                            + "response already in flight before this keystroke can never be mistaken "
                            + "for current once the debounced refresh() actually fires");
        }

        String baseMarker = "protected void scheduleRefresh() {";
        String baseText = readSource(ADD_WINDOW_FAMILY_BASE_SOURCE);
        int start = baseText.indexOf(baseMarker);
        assertTrue(start >= 0, "AddWindowFamilyComposerDialogBase.java must declare a scheduleRefresh() method");
        int end = baseText.indexOf('}', start);
        assertTrue(end > start, "AddWindowFamilyComposerDialogBase.java scheduleRefresh() must be closed");
        String body = baseText.substring(start, end);
        assertTrue(body.contains("seq.incrementAndGet()"),
                "AddWindowFamilyComposerDialogBase.java scheduleRefresh() must call seq.incrementAndGet()");
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

    /**
     * For the four dialogs that still own their seam directly, {@code ModalityState.any()} keeps
     * appearing in their own file. For the addWindow-family two, the seam -- and every
     * {@code ModalityState.any()} reference in it -- now lives entirely on the shared base.
     */
    @Test
    void eachDialogUpdatesItsUiThroughTheDialogsExistingModality() {
        for (Path source : OTHER_DEBOUNCED_DIALOG_SOURCES) {
            String text = readSource(source);
            assertTrue(countOccurrences(text, "ModalityState.any()") >= 1,
                    source.getFileName() + " must keep updating through ModalityState.any() -- the "
                            + "dialog's own modality must not change");
        }
        assertTrue(countOccurrences(readSource(ADD_WINDOW_FAMILY_BASE_SOURCE), "ModalityState.any()") >= 1,
                "AddWindowFamilyComposerDialogBase.java must keep updating through ModalityState.any()");
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
     * null-project construction throw inside the notifier instead of failing at the call site. The
     * addWindow-family two wire {@code project} on the shared base's constructor rather than their
     * own; both their own constructors and the base's constructor are swept below.
     */
    @Test
    void eachDialogConstructorRequiresANonNullProjectMatchingTheRendererContract() {
        for (Path source : ALL_SOURCES_INCLUDING_BASE) {
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
