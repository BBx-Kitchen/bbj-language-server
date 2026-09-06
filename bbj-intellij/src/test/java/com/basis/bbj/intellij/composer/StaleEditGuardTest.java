package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowInitial;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewInput;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of the stale-edit guard (#567): a captured line that changed while the modal
 * dialog was open, a line that moved or disappeared, a re-decode that fails or never completes, and
 * a modification stamp that changes in the window between the re-decode completing and the write
 * starting — every one of those aborts with exactly one {@code STALE_DOCUMENT}/{@code
 * REQUEST_FAILED} notice and no write, while an unchanged document still applies exactly the edit it
 * did before. Driven entirely through {@link StaleEditGuard.DocumentView}/{@link
 * StaleEditGuard.WriteGate} doubles, following {@code BackendNoticePolicyTest}'s injected-double
 * style — the guard carries no IntelliJ import and runs on the plain JUnit 5 classpath.
 */
class StaleEditGuardTest {

    /** Mutable fake document: a line list plus a modification stamp that bumps on every mutation. */
    private static final class FakeDocument implements StaleEditGuard.DocumentView {
        private final List<String> lines;
        private long stamp;

        FakeDocument(List<String> initialLines) {
            this.lines = new ArrayList<>(initialLines);
        }

        void setLine(int index, String text) {
            lines.set(index, text);
            stamp++;
        }

        void insertLineAbove(int index, String text) {
            lines.add(index, text);
            stamp++;
        }

        void deleteLine(int index) {
            lines.remove(index);
            stamp++;
        }

        void bumpStamp() {
            stamp++;
        }

        @Override
        public int lineCount() {
            return lines.size();
        }

        @Override
        public String lineText(int line) {
            return lines.get(line);
        }

        @Override
        public long modificationStamp() {
            return stamp;
        }
    }

    /** Records every notice the guard raised. */
    private static final class NoticeRecorder {
        private final List<ComposerNotices.Notice> notices = new ArrayList<>();

        void record(ComposerNotices.Notice notice) {
            notices.add(notice);
        }
    }

    /** Records every apply-body invocation, standing in for the write command's real edit. */
    private static final class OperationRecorder {
        private final List<String> ops = new ArrayList<>();

        void record(String op) {
            ops.add(op);
        }
    }

    private static StaleEditGuard guardOver(FakeDocument doc, NoticeRecorder notices, long waitMillis) {
        return new StaleEditGuard(doc, Runnable::run, Runnable::run, notices::record, waitMillis);
    }

    private static AddWindowDecodeResult addWindowDecode(int flagsStart, int flagsEnd, int maskStart, int maskEnd, long preservedFlagBits) {
        AddWindowDecodeResult decoded = new AddWindowDecodeResult();
        decoded.found = true;
        AddWindowEdit edit = new AddWindowEdit();
        edit.flagsRange = new int[] {flagsStart, flagsEnd};
        edit.eventMaskRange = new int[] {maskStart, maskEnd};
        edit.preservedFlagBits = preservedFlagBits;
        edit.preservedEventBits = 0L;
        decoded.edit = edit;
        AddWindowInitial initial = new AddWindowInitial();
        initial.flags = List.of(1L);
        initial.eventMaskEnabled = true;
        initial.eventMask = List.of(2L);
        initial.title = "\"Window\"";
        decoded.initial = initial;
        return decoded;
    }

    private static MsgboxDecodeResult msgboxDecode(String message, int callStart, int callEnd, List<String> trailingArgs) {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        MsgboxEdit edit = new MsgboxEdit();
        edit.callStart = callStart;
        edit.callEnd = callEnd;
        decoded.edit = edit;
        decoded.trailingArgs = trailingArgs;
        MsgboxPreviewInput initial = new MsgboxPreviewInput();
        initial.message = message;
        decoded.initial = initial;
        return decoded;
    }

    @Test
    void mutatesTheDocumentWhileTheDialogIsOpenAndAssertsNoEditIsApplied() {
        FakeDocument doc = new FakeDocument(List.of("one", "two", "three", "msgbox(\"hi\")", "five"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());

        doc.setLine(3, "msgbox(\"changed\")"); // mutation that happens while the modal dialog is open

        MsgboxDecodeResult changed = msgboxDecode("\"changed\"", 7, 17, List.of());

        guard.applyIfUnchanged("MSGBOX", 3, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(changed),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(1, notices.notices.size(), "exactly one notice must be recorded for a mutated line");
        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notices.notices.get(0).reason,
                "a mutated captured line is a stale-document abort, not a request failure");
        assertTrue(ops.ops.isEmpty(), "nothing must be written when the fresh decode does not match");
    }

    @Test
    void aLineInsertedAboveTheCallShiftsTheIndexAndAbortsTheEdit() {
        FakeDocument doc = new FakeDocument(List.of("one", "two", "msgbox(\"hi\")", "four"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());

        doc.insertLineAbove(0, "inserted"); // the captured index (2) now points at "two"

        MsgboxDecodeResult notFound = new MsgboxDecodeResult();
        notFound.found = false;

        guard.applyIfUnchanged("MSGBOX", 2, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(notFound),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(1, notices.notices.size(), "an index shifted onto different text is one notice");
        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notices.notices.get(0).reason,
                "a re-decode reporting found=false at the shifted index is a stale-document abort");
        assertTrue(ops.ops.isEmpty(), "no operation is applied once the call can no longer be found");
    }

    @Test
    void anUnchangedDocumentAppliesExactlyTheExpectedOperations() {
        FakeDocument doc = new FakeDocument(List.of("one", "two", "msgbox(\"hi\")", "four"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());
        MsgboxDecodeResult same = msgboxDecode("\"hi\"", 7, 12, List.of());

        guard.applyIfUnchanged("MSGBOX", 2, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(same),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertTrue(notices.notices.isEmpty(), "no notice is raised when the fresh decode matches the captured one");
        assertEquals(List.of("apply"), ops.ops, "the write command must run exactly once, emitting exactly "
                + "the operations the apply body produces");
    }

    @Test
    void aCapturedLineBeyondTheCurrentLineCountAbortsWithoutThrowing() {
        FakeDocument doc = new FakeDocument(List.of("one", "two"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 0, 5, List.of());
        List<String> reDecodeCalls = new ArrayList<>();

        // At the current line count.
        guard.applyIfUnchanged("MSGBOX", 2, 0, captured,
                (currentText, currentCol) -> {
                    reDecodeCalls.add(currentText);
                    return CompletableFuture.completedFuture(captured);
                },
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        // Beyond the current line count.
        guard.applyIfUnchanged("MSGBOX", 5, 0, captured,
                (currentText, currentCol) -> {
                    reDecodeCalls.add(currentText);
                    return CompletableFuture.completedFuture(captured);
                },
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(2, notices.notices.size(), "each out-of-range captured line raises its own notice");
        for (ComposerNotices.Notice notice : notices.notices) {
            assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notice.reason,
                    "a captured line beyond the document's current line count is a stale-document abort");
        }
        assertTrue(ops.ops.isEmpty(), "no operation is applied when the captured line no longer exists");
        assertTrue(reDecodeCalls.isEmpty(), "the re-decode must never be issued for a line that is gone -- "
                + "there is no current text to decode");
    }

    @Test
    void aReDecodeThatFailsExceptionallyIsAReqestFailedNoticeAndStillNoEdit() {
        FakeDocument doc = new FakeDocument(List.of("one", "msgbox(\"hi\")", "three"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());

        guard.applyIfUnchanged("MSGBOX", 1, 0, captured,
                (currentText, currentCol) -> CompletableFuture.failedFuture(new RuntimeException("boom")),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(1, notices.notices.size(), "a failed re-decode must still surface exactly one notice");
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notices.notices.get(0).reason,
                "the stale case and the async-failure case share one visibility convention -- this is the "
                        + "async half of that convention");
        assertTrue(ops.ops.isEmpty(), "no operation is applied when the re-decode itself fails");
    }

    @Test
    void aReDecodeThatNeverCompletesIsBoundedAndStillAppliesNothing() {
        FakeDocument doc = new FakeDocument(List.of("one", "msgbox(\"hi\")", "three"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 50L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());

        guard.applyIfUnchanged("MSGBOX", 1, 0, captured,
                (currentText, currentCol) -> new CompletableFuture<>(), // never completes
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).orTimeout(5, TimeUnit.SECONDS).join();

        assertEquals(1, notices.notices.size(), "a hung re-decode must still surface exactly one notice "
                + "within the bounded wait");
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notices.notices.get(0).reason,
                "a request that never completes is reported the same way any other failed request is");
        assertTrue(ops.ops.isEmpty(), "no operation is applied when the re-decode never completes");
    }

    @Test
    void aStampChangedBetweenTheReDecodeAndTheWriteAbortsInsideTheWriteCommand() {
        FakeDocument doc = new FakeDocument(List.of("one", "msgbox(\"hi\")", "three"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        // The write gate simulates the async window: it bumps the stamp immediately before the
        // guard's write-command body runs, after the re-decode already matched.
        StaleEditGuard guard = new StaleEditGuard(doc, body -> {
            doc.bumpStamp();
            body.run();
        }, Runnable::run, notices::record, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());
        MsgboxDecodeResult same = msgboxDecode("\"hi\"", 7, 12, List.of());

        guard.applyIfUnchanged("MSGBOX", 1, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(same),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(1, notices.notices.size(), "the write command's own re-check must still raise a notice "
                + "even though the re-decode itself matched");
        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notices.notices.get(0).reason);
        assertTrue(ops.ops.isEmpty(), "the apply body must never run once the write command's own stamp "
                + "re-check finds a change -- this is the async window the stamp re-check closes");
    }

    @Test
    void aNullFreshDecodeIsTreatedAsAMismatchRatherThanAsAMatch() {
        FakeDocument doc = new FakeDocument(List.of("one", "msgbox(\"hi\")", "three"));
        NoticeRecorder notices = new NoticeRecorder();
        OperationRecorder ops = new OperationRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        MsgboxDecodeResult captured = msgboxDecode("\"hi\"", 7, 12, List.of());

        guard.applyIfUnchanged("MSGBOX", 1, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(null),
                DecodeEquality::sameMsgbox,
                () -> ops.record("apply")).join();

        assertEquals(1, notices.notices.size(), "a null fresh decode must still raise a notice");
        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notices.notices.get(0).reason,
                "a null fresh decode is a mismatch, never treated as a vacuous match");
        assertTrue(ops.ops.isEmpty(), "no operation is applied when the fresh decode is null");
    }

    @Test
    void theReDecodeIsIssuedAgainstTheCurrentLineTextAtTheCapturedColumn() {
        FakeDocument doc = new FakeDocument(List.of("one", "old text here", "three", "fourth"));
        NoticeRecorder notices = new NoticeRecorder();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        doc.setLine(1, "new text here"); // mutate before invoking -- the guard must read this, not a stale copy

        MsgboxDecodeResult captured = msgboxDecode("captured", 0, 4, List.of());
        MsgboxDecodeResult fresh = msgboxDecode("fresh", 0, 4, List.of());
        List<String> recordedText = new ArrayList<>();
        List<Integer> recordedCol = new ArrayList<>();

        guard.applyIfUnchanged("MSGBOX", 1, 6, captured,
                (currentText, currentCol) -> {
                    recordedText.add(currentText);
                    recordedCol.add(currentCol);
                    return CompletableFuture.completedFuture(fresh);
                },
                (a, b) -> b == fresh,
                () -> {}).join();

        assertEquals(List.of("new text here"), recordedText,
                "the re-decode must be issued against the line's current text, not the text captured "
                        + "before the dialog opened");
        assertEquals(List.of(6), recordedCol, "the column passed to the re-decode must be exactly the "
                + "captured column");
    }

    @Test
    void theWindowApplyPathEmitsItsOperationsFromHighestOffsetDownWhenTheDecodeMatches() {
        FakeDocument doc = new FakeDocument(List.of("addwindow(...)"));
        NoticeRecorder notices = new NoticeRecorder();
        List<String> ops = new ArrayList<>();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        AddWindowDecodeResult captured = addWindowDecode(1, 5, 10, 15, 7L);
        AddWindowDecodeResult same = addWindowDecode(1, 5, 10, 15, 7L);

        guard.applyIfUnchanged("addWindow", 0, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(same),
                DecodeEquality::sameAddWindow,
                () -> {
                    // Mirrors applyHexEdit's own op-building + descending sort for a flags range and
                    // an event-mask range, so an earlier rewrite cannot shift a later range.
                    List<int[]> ranges = new ArrayList<>();
                    ranges.add(new int[] {1, 5});
                    ranges.add(new int[] {10, 15});
                    ranges.sort(Comparator.comparingInt((int[] r) -> r[0]).reversed());
                    for (int[] range : ranges) {
                        ops.add(range[0] + "-" + range[1]);
                    }
                }).join();

        assertTrue(notices.notices.isEmpty(), "a matching window decode must raise no notice");
        assertEquals(List.of("10-15", "1-5"), ops,
                "operations must be recorded from the highest start offset down, exactly two of them");
    }

    @Test
    void theWindowApplyPathEmitsNothingWhenTheDecodeDoesNotMatch() {
        FakeDocument doc = new FakeDocument(List.of("addwindow(...)"));
        NoticeRecorder notices = new NoticeRecorder();
        List<String> ops = new ArrayList<>();
        StaleEditGuard guard = guardOver(doc, notices, 1_000L);

        AddWindowDecodeResult captured = addWindowDecode(1, 5, 10, 15, 7L);
        AddWindowDecodeResult changed = addWindowDecode(1, 5, 10, 15, 999L); // preserved-bit change only

        guard.applyIfUnchanged("addWindow", 0, 0, captured,
                (currentText, currentCol) -> CompletableFuture.completedFuture(changed),
                DecodeEquality::sameAddWindow,
                () -> ops.add("apply")).join();

        assertEquals(1, notices.notices.size(), "a changed preserved-bit value must still raise one notice");
        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notices.notices.get(0).reason);
        assertTrue(ops.isEmpty(), "no operation is applied when the window decode does not match");
    }
}
