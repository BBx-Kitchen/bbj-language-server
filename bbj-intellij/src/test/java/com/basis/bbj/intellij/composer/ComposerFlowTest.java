package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.compile.CompileModels.CompileParams;
import com.basis.bbj.intellij.compile.CompileModels.CompileResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.ComposerCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.DecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreview;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewParams;

import org.eclipse.lsp4j.InitializeParams;
import org.eclipse.lsp4j.InitializeResult;
import org.eclipse.lsp4j.services.TextDocumentService;
import org.eclipse.lsp4j.services.WorkspaceService;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Behavioural coverage of the composer launch chain (#538) with a stubbed {@link BbjComposerServer}:
 * a failing stage, a null server, null catalogs, a hung request, and the happy path. This is the
 * literal #538 acceptance criterion — a failure anywhere in the chain must produce exactly one
 * notification rather than a silent no-op.
 */
class ComposerFlowTest {

    /** Records every notice a production balloon would have rendered. */
    private static final class RecordingNotifier implements java.util.function.Consumer<ComposerNotices.Notice> {
        private final List<ComposerNotices.Notice> notices = new ArrayList<>();

        @Override
        public void accept(ComposerNotices.Notice notice) {
            notices.add(notice);
        }
    }

    /** Runs the body inline but counts invocations, standing in for {@code invokeLater}. */
    private static final class RecordingEdt implements java.util.function.Consumer<Runnable> {
        private int invocations;

        @Override
        public void accept(Runnable runnable) {
            invocations++;
            runnable.run();
        }
    }

    /**
     * A {@link BbjComposerServer} double. The five {@link org.eclipse.lsp4j.services.LanguageServer}
     * methods the flow seam must never call are stubbed to throw: the flow seam only ever calls the
     * {@code bbj/composer/*} requests declared on this interface, so a call reaching one of these
     * five is itself a defect, and a future lsp4j generation adding an abstract method here will
     * break this double's compilation loudly rather than silently changing behaviour.
     */
    private static class FakeComposerServer implements BbjComposerServer {
        CompletableFuture<ComposerCatalogs> catalogs = CompletableFuture.completedFuture(new ComposerCatalogs());
        CompletableFuture<MsgboxDecodeResult> msgboxDecode = CompletableFuture.completedFuture(new MsgboxDecodeResult());

        /** Non-zero only for the timeout-stacking regression test: delays the stage's own future
         * starting from the moment the stage is actually invoked (lazily), not from test setup, so
         * sequential per-stage delays genuinely stack in real elapsed time the way slow (not hung)
         * server round-trips would. */
        long catalogsDelayMillis;
        long msgboxDecodeDelayMillis;

        @Override
        public CompletableFuture<ComposerCatalogs> composerCatalogs() {
            return catalogsDelayMillis > 0 ? delayedCopy(catalogs, catalogsDelayMillis) : catalogs;
        }

        @Override
        public CompletableFuture<MsgboxPreview> msgboxPreview(MsgboxPreviewParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<AddWindowPreview> addWindowPreview(AddWindowPreviewParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<MsgboxDecodeResult> msgboxDecodeCall(DecodeCallParams params) {
            return msgboxDecodeDelayMillis > 0 ? delayedCopy(msgboxDecode, msgboxDecodeDelayMillis) : msgboxDecode;
        }

        @Override
        public CompletableFuture<AddWindowDecodeResult> addWindowDecodeCall(DecodeCallParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<AddChildWindowPreview> addChildWindowPreview(AddChildWindowPreviewParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<AddChildWindowDecodeResult> addChildWindowDecodeCall(DecodeCallParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<CompileResult> compile(CompileParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<InitializeResult> initialize(InitializeParams params) {
            throw new UnsupportedOperationException();
        }

        @Override
        public CompletableFuture<Object> shutdown() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void exit() {
            throw new UnsupportedOperationException();
        }

        @Override
        public TextDocumentService getTextDocumentService() {
            throw new UnsupportedOperationException();
        }

        @Override
        public WorkspaceService getWorkspaceService() {
            throw new UnsupportedOperationException();
        }
    }

    /** Completes with {@code value} on a background thread after {@code delayMillis}, starting the
     * timer the moment this method is called -- used to simulate a stage that is merely slow, not
     * hung, and whose delay begins only once the stage is actually reached. */
    private static <T> CompletableFuture<T> delayed(T value, long delayMillis) {
        CompletableFuture<T> future = new CompletableFuture<>();
        Thread thread = new Thread(() -> {
            try {
                Thread.sleep(delayMillis);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            future.complete(value);
        });
        thread.setDaemon(true);
        thread.start();
        return future;
    }

    /** Like {@link #delayed(Object, long)} but relays {@code source}'s eventual outcome (value or
     * exception) instead of a fixed value -- {@code source} is already completed in every caller,
     * so this only delays when the caller of this method observes that outcome. */
    private static <T> CompletableFuture<T> delayedCopy(CompletableFuture<T> source, long delayMillis) {
        CompletableFuture<T> future = new CompletableFuture<>();
        Thread thread = new Thread(() -> {
            try {
                Thread.sleep(delayMillis);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            source.whenComplete((value, throwable) -> {
                if (throwable != null) {
                    future.completeExceptionally(throwable);
                } else {
                    future.complete(value);
                }
            });
        });
        thread.setDaemon(true);
        thread.start();
        return future;
    }

    private static CompletableFuture<Void> driveMsgboxLaunch(ComposerFlow flow, CompletableFuture<BbjComposerServer> serverFuture,
            AtomicBoolean decodeCalled, AtomicBoolean successRan) {
        return flow.launch("MSGBOX", serverFuture,
                (server, catalogs) -> {
                    decodeCalled.set(true);
                    return server.msgboxDecodeCall(new DecodeCallParams("msgbox", 0));
                },
                (server, catalogs, decoded) -> successRan.set(true));
    }

    @Test
    void aFailedCatalogsRequestForcesOneChainToCompleteExceptionallyAndAssertsANotification() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        server.catalogs = CompletableFuture.failedFuture(new RuntimeException("connection closed"));

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(server), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(),
                "a chain that completes exceptionally at the outermost stage must still produce exactly "
                        + "one notification instead of leaving the exception on an unobserved future (#538)");
        ComposerNotices.Notice notice = notifier.notices.get(0);
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notice.reason,
                "a thrown exception, not a null stage, is REQUEST_FAILED");
        assertEquals(ComposerNotices.Severity.ERROR, notice.severity, "a request failure renders as an error balloon");
        assertTrue(notice.body.contains("connection closed"),
                "the balloon body must name the actual failure, not a generic message");
        assertFalse(decodeCalled.get(), "the decode step must never be reached once catalogs has already failed");
        assertFalse(successRan.get(), "the success continuation must never run after a failure upstream");
    }

    @Test
    void aFailedDecodeRequestIsAlsoOneRequestFailedNotice() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        server.msgboxDecode = CompletableFuture.failedFuture(new RuntimeException("decode boom"));

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(server), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(),
                "the innermost decodeCall failing is exactly the exception an outer stage of the old nested "
                        + "pyramid could never observe -- it must still produce one notification");
        ComposerNotices.Notice notice = notifier.notices.get(0);
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notice.reason);
        assertTrue(notice.body.contains("decode boom"), "the balloon must name the decode failure's own message");
        assertTrue(decodeCalled.get(), "the decode step was in fact reached and is what failed");
        assertFalse(successRan.get(), "no success continuation may run after the decode request fails");
    }

    @Test
    void aNullServerProxyIsNotReadyRatherThanRequestFailed() throws Exception {
        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(null), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(), "a null server proxy must produce exactly one notice");
        ComposerNotices.Notice notice = notifier.notices.get(0);
        assertEquals(ComposerNotices.Reason.NOT_READY, notice.reason,
                "a null stage (server not running) is NOT_READY, never REQUEST_FAILED");
        assertEquals(ComposerNotices.Severity.INFORMATION, notice.severity);
        assertEquals("The BBj language server is not ready yet. Open a BBj file and try again.", notice.body,
                "the existing wording must be preserved character for character");
        assertFalse(decodeCalled.get(), "no request may be issued once the server itself is unavailable");
        assertFalse(successRan.get());
    }

    @Test
    void nullCatalogsAreAlsoNotReady() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        server.catalogs = CompletableFuture.completedFuture(null);

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(server), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(), "a null catalogs payload must produce exactly one notice");
        assertEquals(ComposerNotices.Reason.NOT_READY, notifier.notices.get(0).reason,
                "a null catalogs payload is NOT_READY, matching the server-not-running case");
        assertFalse(decodeCalled.get(), "no decodeCall may be issued once catalogs itself is null");
        assertFalse(successRan.get());
    }

    @Test
    void aRequestThatNeverCompletesIsReportedAsRequestFailedWithinTheBoundedWait() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        server.msgboxDecode = new CompletableFuture<>(); // never completed

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, 50L);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(server), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(),
                "a hung request must eventually surface through the bounded wait, not hang the chain forever");
        ComposerNotices.Notice notice = notifier.notices.get(0);
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notice.reason);
        assertTrue(notice.body.toLowerCase(java.util.Locale.ROOT).contains("timed out"),
                "the balloon body must say the request timed out, not show a raw exception class name");
        assertFalse(successRan.get());
    }

    @Test
    void threeMerelySlowStagesShareOneDeadlineRatherThanEachGettingTheFullWait() throws Exception {
        // Each stage's delay starts only once the stage is actually invoked, so a 40ms delay
        // on the server future, then a 40ms delay on composerCatalogs(), then a 40ms delay on
        // msgboxDecodeCall(), stack in real elapsed time to roughly 120ms -- comfortably past a
        // single 60ms bound. Before this fix, each stage got its own full 60ms timeout, so none of
        // these individually-fast-enough (40ms < 60ms) stages would ever fire a timeout and the
        // chain would eventually succeed at ~120ms, well past the documented "one deadline" bound.
        FakeComposerServer server = new FakeComposerServer();
        server.catalogsDelayMillis = 40L;
        server.msgboxDecodeDelayMillis = 40L;
        CompletableFuture<BbjComposerServer> serverFuture = delayed(server, 40L);

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, 60L);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        long startNanos = System.nanoTime();
        driveMsgboxLaunch(flow, serverFuture, decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);
        long elapsedMillis = (System.nanoTime() - startNanos) / 1_000_000L;

        assertEquals(1, notifier.notices.size(),
                "three stages that are each individually under the 60ms bound (40ms each) but sum to "
                        + "~120ms of real elapsed time must still surface exactly one notice -- one "
                        + "deadline for the whole chain, not 60ms renewed at every stage");
        assertEquals(ComposerNotices.Reason.REQUEST_FAILED, notifier.notices.get(0).reason,
                "the whole-chain deadline elapsing is reported the same way a hung request is");
        assertTrue(elapsedMillis < 100,
                "the chain must fail close to the single 60ms deadline for the whole chain, not wait "
                        + "for all three 40ms stages to run to completion (~120ms) before timing out -- "
                        + "elapsed=" + elapsedMillis + "ms");
        assertFalse(successRan.get(), "the success continuation must never run once the chain has timed out");
    }

    @Test
    void theHappyPathHandsTheDecodedResultToTheSuccessContinuationAndRaisesNoNotice() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        ComposerCatalogs catalogs = new ComposerCatalogs();
        server.catalogs = CompletableFuture.completedFuture(catalogs);
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        server.msgboxDecode = CompletableFuture.completedFuture(decoded);

        RecordingNotifier notifier = new RecordingNotifier();
        RecordingEdt edt = new RecordingEdt();
        ComposerFlow flow = new ComposerFlow(edt, notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);

        AtomicReference<BbjComposerServer> receivedServer = new AtomicReference<>();
        AtomicReference<ComposerCatalogs> receivedCatalogs = new AtomicReference<>();
        AtomicReference<MsgboxDecodeResult> receivedDecoded = new AtomicReference<>();

        flow.launch("MSGBOX", CompletableFuture.completedFuture(server),
                (s, c) -> s.msgboxDecodeCall(new DecodeCallParams("msgbox", 0)),
                (s, c, d) -> {
                    receivedServer.set(s);
                    receivedCatalogs.set(c);
                    receivedDecoded.set(d);
                }).get(5, TimeUnit.SECONDS);

        assertSame(server, receivedServer.get(), "the success continuation must receive the exact server instance the chain resolved");
        assertSame(catalogs, receivedCatalogs.get(), "the success continuation must receive the exact catalogs instance the chain resolved");
        assertSame(decoded, receivedDecoded.get(), "the success continuation must receive the exact decode instance the chain resolved");
        assertEquals(1, edt.invocations,
                "the success continuation must run through the injected EDT executor rather than the "
                        + "calling thread's own continuation");
        assertTrue(notifier.notices.isEmpty(), "the happy path must raise no notice at all");
    }

    @Test
    void exactlyOneNoticeIsRaisedEvenWhenTheFailureIsWrappedByTheFutureMachinery() throws Exception {
        FakeComposerServer server = new FakeComposerServer();
        server.msgboxDecode = CompletableFuture.failedFuture(
                new CompletionException(new IllegalStateException("server gone")));

        RecordingNotifier notifier = new RecordingNotifier();
        ComposerFlow flow = new ComposerFlow(new RecordingEdt(), notifier, ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        AtomicBoolean decodeCalled = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        driveMsgboxLaunch(flow, CompletableFuture.completedFuture(server), decodeCalled, successRan)
                .get(5, TimeUnit.SECONDS);

        assertEquals(1, notifier.notices.size(), "a wrapped failure must still produce exactly one notice");
        ComposerNotices.Notice notice = notifier.notices.get(0);
        assertTrue(notice.body.contains("server gone"),
                "the recorded body must name the original cause's message");
        assertFalse(notice.body.contains("CompletionException"),
                "the recorded body must never show the future machinery's wrapper class name");
    }

    // -- observe()/once(): the dialog refresh() seam (#538 dialog half) -------------------------

    @Test
    void aFailedPreviewRequestReachesTheFailureCallbackWithTheCauseAndNeverTheSuccessCallback() throws Exception {
        RecordingNotifier notifier = new RecordingNotifier();
        RecordingEdt edt = new RecordingEdt();
        ComposerFlow flow = new ComposerFlow(edt, notifier, ComposerFlow.REFRESH_TIMEOUT_MILLIS);

        CompletableFuture<MsgboxPreview> request = CompletableFuture.failedFuture(new RuntimeException("preview boom"));
        AtomicReference<Throwable> failure = new AtomicReference<>();
        AtomicBoolean successRan = new AtomicBoolean(false);

        flow.observe(request, ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                        value -> successRan.set(true),
                        failure::set)
                .get(5, TimeUnit.SECONDS);

        assertNotNull(failure.get(), "the failure callback must run for an exceptionally-completed request");
        assertEquals("preview boom", ComposerNotices.detailOf(failure.get()),
                "the unwrapped message must be the original one");
        assertFalse(successRan.get(), "the success callback must never run after a failure");
        assertEquals(1, edt.invocations, "the failure callback must run through the injected EDT executor");
    }

    @Test
    void aPreviewThatCompletesWithNullReachesTheFailureSideRatherThanBeingIgnored() throws Exception {
        RecordingNotifier notifier = new RecordingNotifier();
        RecordingEdt edt = new RecordingEdt();
        ComposerFlow flow = new ComposerFlow(edt, notifier, ComposerFlow.REFRESH_TIMEOUT_MILLIS);

        CompletableFuture<MsgboxPreview> request = CompletableFuture.completedFuture(null);
        AtomicBoolean failureRan = new AtomicBoolean(false);
        AtomicBoolean successRan = new AtomicBoolean(false);

        flow.observe(request, ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                        value -> successRan.set(true),
                        throwable -> failureRan.set(true))
                .get(5, TimeUnit.SECONDS);

        assertTrue(failureRan.get(), "a null preview must reach the failure side, not be silently ignored -- "
                + "leaving OK enabled after a null preview is the silent no-op this work removes");
        assertFalse(successRan.get(), "the success callback must never run for a null result");
    }

    @Test
    void aPreviewThatNeverCompletesIsBoundedByTheRefreshWait() throws Exception {
        RecordingNotifier notifier = new RecordingNotifier();
        RecordingEdt edt = new RecordingEdt();
        ComposerFlow flow = new ComposerFlow(edt, notifier, ComposerFlow.REFRESH_TIMEOUT_MILLIS);

        CompletableFuture<MsgboxPreview> request = new CompletableFuture<>(); // never completes
        AtomicReference<Throwable> failure = new AtomicReference<>();

        flow.observe(request, 50L, value -> fail("success must not run for a hung request"), failure::set)
                .get(5, TimeUnit.SECONDS);

        assertNotNull(failure.get(), "a hung preview request must eventually surface through the bounded wait");
        assertTrue(ComposerNotices.detailOf(failure.get()).toLowerCase(java.util.Locale.ROOT).contains("timed out"),
                "detailOf must render the bounded wait as a timed-out message, not a raw exception class name");
    }

    @Test
    void aSupersededSequenceDiscardsAFailureExactlyAsItDiscardsASuccess() throws Exception {
        // Run twice: once where the superseded (first) observation eventually fails, once where it
        // eventually succeeds. In both runs the second (current) observation has already moved the
        // shared sequence counter on before the first settles, so neither outcome may change state.
        for (boolean firstEventuallyFails : new boolean[] { true, false }) {
            RecordingNotifier notifier = new RecordingNotifier();
            RecordingEdt edt = new RecordingEdt();
            ComposerFlow flow = new ComposerFlow(edt, notifier, ComposerFlow.REFRESH_TIMEOUT_MILLIS);
            AtomicInteger seq = new AtomicInteger();
            AtomicReference<String> state = new AtomicReference<>("initial");

            int firstSeq = seq.incrementAndGet();
            CompletableFuture<MsgboxPreview> firstRequest = new CompletableFuture<>();

            int secondSeq = seq.incrementAndGet();
            flow.observe(CompletableFuture.completedFuture(new MsgboxPreview()), ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                            value -> {
                                if (secondSeq == seq.get()) {
                                    state.set("second-applied");
                                }
                            },
                            throwable -> {
                                if (secondSeq == seq.get()) {
                                    state.set("second-failed");
                                }
                            })
                    .get(5, TimeUnit.SECONDS);

            assertEquals("second-applied", state.get(), "precondition: the second (current) observation applied");

            if (firstEventuallyFails) {
                firstRequest.completeExceptionally(new RuntimeException("stale failure"));
            } else {
                firstRequest.complete(new MsgboxPreview());
            }

            flow.observe(firstRequest, ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                            value -> {
                                if (firstSeq == seq.get()) {
                                    state.set("first-applied");
                                }
                            },
                            throwable -> {
                                if (firstSeq == seq.get()) {
                                    state.set("first-failed");
                                }
                            })
                    .get(5, TimeUnit.SECONDS);

            assertEquals("second-applied", state.get(),
                    "a superseded outcome, success or failure, must change nothing -- the state must still "
                            + "be whatever the current (second) observation left it as (firstEventuallyFails="
                            + firstEventuallyFails + ")");
        }
    }

    @Test
    void theOneShotNotifierForwardsExactlyOneNoticeHoweverManyArrive() throws InterruptedException {
        List<ComposerNotices.Notice> sequential = Collections.synchronizedList(new ArrayList<>());
        Consumer<ComposerNotices.Notice> sequentialOnce = ComposerFlow.once(sequential::add);
        for (int i = 0; i < 5; i++) {
            sequentialOnce.accept(ComposerNotices.requestFailed("MSGBOX", "boom " + i));
        }
        assertEquals(1, sequential.size(), "sequential notices: only the first must be forwarded");

        List<ComposerNotices.Notice> concurrent = Collections.synchronizedList(new ArrayList<>());
        Consumer<ComposerNotices.Notice> concurrentOnce = ComposerFlow.once(concurrent::add);
        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch release = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        release.await();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    concurrentOnce.accept(ComposerNotices.requestFailed("MSGBOX", "concurrent"));
                });
            }
            ready.await();
            release.countDown();
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "all accept() calls must finish");
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, concurrent.size(),
                "eight near-simultaneous notices must still forward exactly one, proving the compareAndSet "
                        + "check-and-set is atomic");
    }

    @Test
    void theOneShotNotifierIsPerInstanceSoASecondDialogSessionCanStillWarn() {
        List<ComposerNotices.Notice> received = new ArrayList<>();
        Consumer<ComposerNotices.Notice> firstSession = ComposerFlow.once(received::add);
        Consumer<ComposerNotices.Notice> secondSession = ComposerFlow.once(received::add);

        firstSession.accept(ComposerNotices.requestFailed("MSGBOX", "first"));
        firstSession.accept(ComposerNotices.requestFailed("MSGBOX", "first again"));
        secondSession.accept(ComposerNotices.requestFailed("MSGBOX", "second"));
        secondSession.accept(ComposerNotices.requestFailed("MSGBOX", "second again"));

        assertEquals(2, received.size(),
                "each dialog session gets its own once() instance, so a second session can still warn "
                        + "even though the first session's allowance is already spent");
    }
}
