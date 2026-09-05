package com.basis.bbj.intellij.composer;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;
import java.util.function.BiPredicate;
import java.util.function.Consumer;

/**
 * Sits in front of every composer edit-in-place apply path (#567): applying the offsets captured
 * before a modal dialog opened, after the dialog closes, either throws when the document changed
 * underneath it -- or, worse and silently, rewrites whatever text now occupies that range. This
 * class closes both: after {@code dialog.showAndGet()} returns true, it re-reads the captured line
 * from the live document, re-runs the same {@code <kind>DecodeCall} request the launch used against
 * that current text at the captured column, compares the whole fresh decode against the pre-dialog
 * one, and writes only on a match -- with the document's modification stamp re-checked as the first
 * statement inside the write command, so the async gap between the re-decode completing and the
 * write starting cannot be exploited either. The create flow ({@code insertAtCaret}) is deliberately
 * outside this guard: it has no captured range to go stale.
 *
 * <p>A plain Java class with no IntelliJ import, driven entirely by injected collaborators so it is
 * exercised by behavioural JUnit 5 tests over a fake document double (C-01).
 */
public final class StaleEditGuard {

    /** Comfortably under a minute, bounding a re-decode request that would otherwise hang forever. */
    public static final long REDECODE_TIMEOUT_MILLIS = 10_000L;

    /** The live document, read fresh at guard time rather than from values captured before the dialog. */
    public interface DocumentView {
        int lineCount();
        String lineText(int line);
        long modificationStamp();
    }

    /** Runs a write command's body, mirroring {@code WriteCommandAction.runWriteCommandAction}. */
    public interface WriteGate {
        void runWriteCommand(Runnable body);
    }

    private final DocumentView view;
    private final WriteGate write;
    private final Consumer<Runnable> onEdt;
    private final Consumer<ComposerNotices.Notice> notifier;
    private final long waitMillis;

    public StaleEditGuard(DocumentView view, WriteGate write, Consumer<Runnable> onEdt,
                           Consumer<ComposerNotices.Notice> notifier, long waitMillis) {
        this.view = view;
        this.write = write;
        this.onEdt = onEdt;
        this.notifier = notifier;
        this.waitMillis = waitMillis;
    }

    /**
     * Re-decodes the captured line's current text at the captured column, compares the whole fresh
     * decode against {@code capturedDecode} with {@code sameDecode}, and runs {@code applyEdit}
     * inside a guarded write command only on a match.
     *
     * <p>Body, in order and no other. First, on the calling thread -- always the dispatch thread,
     * because every caller has just returned from a modal dialog -- a null {@code capturedDecode}, a
     * negative captured line, or a captured line at or beyond {@link DocumentView#lineCount()} is a
     * stale document: notify and return an already-completed future, issuing no request. Otherwise
     * read the current line text and the current modification stamp; this snapshot is what
     * everything else is judged against. Second, re-decode the current text at the captured column,
     * bounded the same way {@link ComposerFlow} bounds each of its stages -- a {@link
     * CompletableFuture#copy()} so the receiver the LSP4IJ proxy owns is never force-completed --
     * and terminate with exactly one handler: a throwable becomes {@code REQUEST_FAILED}; a null
     * fresh decode, or one for which {@code sameDecode} reports false, becomes {@code
     * STALE_DOCUMENT}; a match dispatches the write through the injected EDT executor. Third, the
     * write: its first statement re-checks the modification stamp against the one snapshotted in
     * step one and aborts with {@code STALE_DOCUMENT} when it changed, only then running {@code
     * applyEdit} -- closing the window between the re-decode completing and the write starting.
     */
    public <D> CompletableFuture<Void> applyIfUnchanged(String kindLabel, int capturedLine, int capturedCol,
            D capturedDecode, BiFunction<String, Integer, CompletableFuture<D>> reDecode,
            BiPredicate<D, D> sameDecode, Runnable applyEdit) {

        if (capturedDecode == null || capturedLine < 0 || capturedLine >= view.lineCount()) {
            notifier.accept(ComposerNotices.staleDocument(kindLabel));
            return CompletableFuture.completedFuture(null);
        }

        String currentLineText = view.lineText(capturedLine);
        long snapshotStamp = view.modificationStamp();

        return reDecode.apply(currentLineText, capturedCol)
                .copy()
                .orTimeout(waitMillis, TimeUnit.MILLISECONDS)
                .<Void>handle((fresh, throwable) -> {
                    if (throwable != null) {
                        onEdt.accept(() -> notifier.accept(
                                ComposerNotices.requestFailed(kindLabel, ComposerNotices.detailOf(throwable))));
                    } else if (fresh == null || !sameDecode.test(capturedDecode, fresh)) {
                        onEdt.accept(() -> notifier.accept(ComposerNotices.staleDocument(kindLabel)));
                    } else {
                        onEdt.accept(() -> write.runWriteCommand(() -> {
                            if (view.modificationStamp() != snapshotStamp) {
                                notifier.accept(ComposerNotices.staleDocument(kindLabel));
                                return;
                            }
                            applyEdit.run();
                        }));
                    }
                    return null;
                });
    }
}
