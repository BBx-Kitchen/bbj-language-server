package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.ComposerCatalogs;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;
import java.util.function.Consumer;

/**
 * Composes one composer launch chain — server resolution, catalogs, decodeCall — behind a single
 * terminal handler (#538).
 *
 * <p>Before this seam existed, {@code ComposerLauncher.launch()} ran a nested {@code thenAccept}
 * pyramid: each inner level returned a fresh future that the outer level never observed, so an
 * inner exception was stored on a future nobody held a reference to, and the continuation simply
 * never ran — no balloon, no console line, no log entry. This class instead composes the whole
 * chain with {@code thenCompose} so every stage feeds the same outer future, terminates it with
 * exactly one {@code handle}, and reports a {@code null} stage or a thrown exception through the
 * injected notifier before the chain completes.
 */
public final class ComposerFlow {

    /** Comfortably under a minute, bounding a request that would otherwise hang forever. */
    public static final long LAUNCH_TIMEOUT_MILLIS = 30_000L;

    private final Consumer<Runnable> onEdt;
    private final Consumer<ComposerNotices.Notice> notifier;
    private final long waitMillis;

    public ComposerFlow(Consumer<Runnable> onEdt, Consumer<ComposerNotices.Notice> notifier, long waitMillis) {
        this.onEdt = onEdt;
        this.notifier = notifier;
        this.waitMillis = waitMillis;
    }

    /** Hands the decoded chain's result back to the caller once every stage resolved. */
    @FunctionalInterface
    public interface Decoded<D> {
        void accept(BbjComposerServer server, ComposerCatalogs catalogs, D decoded);
    }

    /** Raised internally when a stage completes with {@code null} rather than exceptionally. */
    private static final class NotReadySignal extends RuntimeException {
    }

    /**
     * Composes {@code serverFuture -> composerCatalogs() -> decodeCall} into one chain and hands
     * the result to {@code onDecoded} through the injected EDT executor. Every stage is bounded by
     * the configured wait, applied to a {@link CompletableFuture#copy()} so the receiver the LSP4IJ
     * proxy owns is never force-completed. The returned future always completes normally — a
     * failure is reported through the notifier from the single terminal handler, never thrown.
     */
    public <D> CompletableFuture<Void> launch(String kindLabel,
            CompletableFuture<BbjComposerServer> serverFuture,
            BiFunction<BbjComposerServer, ComposerCatalogs, CompletableFuture<D>> decodeCall,
            Decoded<D> onDecoded) {

        return bounded(serverFuture)
                .thenCompose(server -> {
                    if (server == null) {
                        throw new NotReadySignal();
                    }
                    return bounded(server.composerCatalogs())
                            .thenCompose(catalogs -> {
                                if (catalogs == null) {
                                    throw new NotReadySignal();
                                }
                                return bounded(decodeCall.apply(server, catalogs))
                                        .thenCompose(decoded -> runOnEdt(() -> onDecoded.accept(server, catalogs, decoded)));
                            });
                })
                .handle((ignoredResult, throwable) -> {
                    if (throwable != null) {
                        if (unwrap(throwable) instanceof NotReadySignal) {
                            notifier.accept(ComposerNotices.notReady(kindLabel));
                        } else {
                            notifier.accept(ComposerNotices.requestFailed(kindLabel, ComposerNotices.detailOf(throwable)));
                        }
                    }
                    return null;
                });
    }

    private <T> CompletableFuture<T> bounded(CompletableFuture<T> future) {
        // copy() because orTimeout completes its receiver exceptionally, and the receiver here
        // belongs to the LSP4IJ proxy — timing out a copy leaves the proxy's own future untouched.
        return future.copy().orTimeout(waitMillis, TimeUnit.MILLISECONDS);
    }

    private CompletableFuture<Void> runOnEdt(Runnable body) {
        CompletableFuture<Void> completion = new CompletableFuture<>();
        onEdt.accept(() -> {
            try {
                body.run();
                completion.complete(null);
            } catch (Throwable t) {
                completion.completeExceptionally(t);
            }
        });
        return completion;
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
