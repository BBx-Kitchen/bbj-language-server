package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of the three {@link ComposerNotices} factories: wording, severity, remedy
 * action id, and the throwable-to-detail conversion (#538). Every case is chosen by a throwable's
 * type or a machine-readable reason, never by reading its message text — the discipline
 * {@link #noNoticeIsChosenByReadingMessageProse()} pins directly.
 */
class ComposerNoticesTest {

    @Test
    void theNotReadyNoticeKeepsTheExistingWordingAsAnInformationBalloon() {
        for (String label : List.of("MSGBOX", "addWindow", "addChildWindow")) {
            ComposerNotices.Notice notice = ComposerNotices.notReady(label);

            assertEquals(ComposerNotices.Reason.NOT_READY, notice.reason, label + " must be NOT_READY");
            assertEquals(ComposerNotices.Severity.INFORMATION, notice.severity,
                    label + " not-ready must render as an information balloon, not an error");
            assertNull(notice.remedyActionId, label + " not-ready offers no remedy action");
            assertEquals("Compose " + label, notice.title);
            assertEquals("The BBj language server is not ready yet. Open a BBj file and try again.", notice.body,
                    "the wording must be preserved character for character from the launcher's old modal");
        }
    }

    @Test
    void theRequestFailedNoticeIsAnErrorCarryingTheDetail() {
        ComposerNotices.Notice notice = ComposerNotices.requestFailed("MSGBOX", "boom");

        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notice.reason);
        assertEquals(ComposerNotices.Severity.ERROR, notice.severity);
        assertNull(notice.remedyActionId, "a request failure offers no remedy action");
        assertEquals("boom", notice.body);
    }

    @Test
    void theStaleDocumentNoticeIsAWarningThatSaysNothingWasChangedAndOffersReopen() {
        ComposerNotices.Notice notice = ComposerNotices.staleDocument("MSGBOX");

        assertEquals(ComposerNotices.Reason.STALE_DOCUMENT, notice.reason);
        assertEquals(ComposerNotices.Severity.WARNING, notice.severity);
        assertEquals("MSGBOX not updated", notice.title);
        assertTrue(notice.body.contains("Nothing was changed."),
                "the user must be told plainly that nothing was changed");
        assertEquals(ComposerNotices.REOPEN_COMPOSER, notice.remedyActionId,
                "a stale document must offer the Reopen composer remedy");
    }

    @Test
    void everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy() {
        ComposerNotices.Notice notReady = ComposerNotices.notReady("MSGBOX");
        ComposerNotices.Notice requestFailed = ComposerNotices.requestFailed("MSGBOX", "detail");
        ComposerNotices.Notice staleDocument = ComposerNotices.staleDocument("MSGBOX");

        EnumSet<ComposerNotices.Severity> severities = EnumSet.of(
                notReady.severity, requestFailed.severity, staleDocument.severity);
        assertEquals(3, severities.size(), "no two of the three reasons may share a severity");

        long remedyCount = List.of(notReady, requestFailed, staleDocument).stream()
                .filter(n -> n.remedyActionId != null)
                .count();
        assertEquals(1, remedyCount, "exactly one notice (STALE_DOCUMENT) may carry a remedy action");
    }

    @Test
    void aWrappedFailureIsUnwrappedToItsCauseMessage() {
        Throwable wrapped = new CompletionException(new IllegalStateException("server gone"));

        String detail = ComposerNotices.detailOf(wrapped);

        assertTrue(detail.contains("server gone"), "the cause's own message must be visible");
        assertFalse(detail.contains("CompletionException"),
                "the wrapper's class name must never be shown in place of the real cause");
    }

    @Test
    void aTimeoutIsDescribedAsATimeoutRatherThanAsAClassName() {
        String bare = ComposerNotices.detailOf(new TimeoutException());
        String wrapped = ComposerNotices.detailOf(new CompletionException(new TimeoutException()));

        assertEquals("The request timed out.", bare);
        assertEquals("The request timed out.", wrapped);
    }

    @Test
    void aThrowableWithNoMessageStillProducesVisibleText() {
        Throwable noMessage = new IllegalStateException();

        String detail = ComposerNotices.detailOf(noMessage);

        assertFalse(detail.isEmpty(), "a balloon body must never render empty");
        assertTrue(detail.contains("IllegalStateException"),
                "with no message, the class simple name is the only thing left to show");
    }

    @Test
    void theShortReasonIsASingleLineNoLongerThanEightyCharacters() {
        String longMultilineMessage = "line one\n".repeat(30) + "x".repeat(20);
        Throwable throwable = new RuntimeException(longMultilineMessage);

        String shortReason = ComposerNotices.shortReason(throwable);

        assertFalse(shortReason.contains("\n"), "an in-dialog label must never contain a line break");
        assertTrue(shortReason.length() <= 80, "an in-dialog label must be at most 80 characters, was "
                + shortReason.length());
    }

    @Test
    void noNoticeIsChosenByReadingMessageProse() {
        Throwable first = new RuntimeException("connection reset by peer");
        Throwable second = new RuntimeException("socket closed unexpectedly");

        ComposerNotices.Notice firstNotice = ComposerNotices.requestFailed("MSGBOX", ComposerNotices.detailOf(first));
        ComposerNotices.Notice secondNotice = ComposerNotices.requestFailed("MSGBOX", ComposerNotices.detailOf(second));

        assertEquals(firstNotice.reason, secondNotice.reason,
                "two throwables of the same type with different prose must classify identically");
        assertEquals(firstNotice.severity, secondNotice.severity);
        assertNotEquals(firstNotice.body, secondNotice.body,
                "only the body, never the classification, may differ between the two");
    }
}
