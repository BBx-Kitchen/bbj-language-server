package com.basis.bbj.intellij.composer;

import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;

/**
 * Decides what the user sees for every composer failure class (#538): a chain that completed
 * exceptionally ({@code REQUEST_FAILED}), a stage that completed with {@code null} rather than
 * exceptionally ({@code NOT_READY}), and a stale-offset mismatch a later plan introduces
 * ({@code STALE_DOCUMENT}). A plain Java presenter seam with no IntelliJ import: every notice's
 * title, body, severity and remedy come from here, keyed on the machine-readable {@code reason} —
 * never chosen by reading a throwable's message prose.
 */
public final class ComposerNotices {

    private ComposerNotices() {}

    /** The three failure classes this and later composer plans surface. */
    public enum Reason { NOT_READY, REQUEST_FAILED, STALE_DOCUMENT }

    /** Balloon severity, mapped 1:1 to {@code NotificationType} by the renderer. */
    public enum Severity { INFORMATION, WARNING, ERROR }

    /** Action id offered on a {@code STALE_DOCUMENT} notice: relaunch the composer. */
    public static final String REOPEN_COMPOSER = "reopen-composer";

    /** Immutable rendering of one composer notice: what the balloon (and console line) should show. */
    public static final class Notice {
        public final Reason reason;
        public final String title;
        public final String body;
        public final Severity severity;
        public final String remedyActionId;

        private Notice(Reason reason, String title, String body, Severity severity, String remedyActionId) {
            this.reason = reason;
            this.title = title;
            this.body = body;
            this.severity = severity;
            this.remedyActionId = remedyActionId;
        }
    }

    /** The server proxy resolved to null, or a catalogs/preview payload resolved to null. */
    public static Notice notReady(String kindLabel) {
        return new Notice(Reason.NOT_READY, "Compose " + kindLabel,
                "The BBj language server is not ready yet. Open a BBj file and try again.",
                Severity.INFORMATION, null);
    }

    /** A chain completed exceptionally, including a bounded wait that elapsed. */
    public static Notice requestFailed(String kindLabel, String detail) {
        return new Notice(Reason.REQUEST_FAILED, "Compose " + kindLabel + " failed",
                detail, Severity.ERROR, null);
    }

    /** The captured line changed underneath an open composer dialog; the edit was aborted. */
    public static Notice staleDocument(String kindLabel) {
        return new Notice(Reason.STALE_DOCUMENT, kindLabel + " not updated",
                "The line changed while the composer was open. Nothing was changed.",
                Severity.WARNING, REOPEN_COMPOSER);
    }

    /**
     * Unwraps a {@link CompletionException} or {@link ExecutionException} to its cause, maps a
     * {@link TimeoutException} to a fixed "timed out" sentence, and otherwise returns the cause's
     * message — or its class simple name when the message is null, so a balloon body is never
     * empty. Driven entirely by the throwable's type, never by searching its message text.
     */
    public static String detailOf(Throwable throwable) {
        Throwable cause = unwrap(throwable);
        if (cause instanceof TimeoutException) {
            return "The request timed out.";
        }
        String message = cause.getMessage();
        return message != null ? message : cause.getClass().getSimpleName();
    }

    /**
     * {@link #detailOf(Throwable)}, collapsed to a single line and trimmed to at most 80
     * characters, for use in an in-dialog label rather than a balloon body.
     */
    public static String shortReason(Throwable throwable) {
        String singleLine = detailOf(throwable).replaceAll("\\s+", " ").trim();
        return singleLine.length() > 80 ? singleLine.substring(0, 80) : singleLine;
    }

    private static Throwable unwrap(Throwable throwable) {
        Throwable current = throwable;
        while ((current instanceof CompletionException || current instanceof ExecutionException)
                && current.getCause() != null) {
            current = current.getCause();
        }
        return current;
    }
}
