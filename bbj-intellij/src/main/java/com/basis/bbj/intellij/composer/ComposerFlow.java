package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.ComposerCatalogs;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
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

    /** An order of magnitude below {@link #LAUNCH_TIMEOUT_MILLIS} -- a preview is a pure local computation on the server. */
    public static final long REFRESH_TIMEOUT_MILLIS = 10_000L;

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
     * the result to {@code onDecoded} through the injected EDT executor. The whole composed chain
     * shares a single bounded wait (the configured {@code waitMillis}), not one per stage: each
     * {@code thenCompose} produces a brand-new dependent future owned by this chain, never the
     * proxy's own future, so {@code orTimeout} can be applied directly to the composed result
     * without a defensive {@link CompletableFuture#copy()} — timing out the chain never
     * force-completes {@code serverFuture}, {@code composerCatalogs()}, or {@code decodeCall}'s own
     * receiver. A per-stage timeout here would let three merely-slow (not hung) stages each burn
     * close to the full wait, stacking up to roughly 3x the documented bound before anything
     * surfaces; one deadline for the entire chain keeps the total wait within {@code waitMillis}
     * regardless of how the time is distributed across stages. The returned future always completes
     * normally — a failure is reported through the notifier from the single terminal handler, never
     * thrown.
     */
    public <D> CompletableFuture<Void> launch(String kindLabel,
            CompletableFuture<BbjComposerServer> serverFuture,
            BiFunction<BbjComposerServer, ComposerCatalogs, CompletableFuture<D>> decodeCall,
            Decoded<D> onDecoded) {

        CompletableFuture<Void> chain = serverFuture
                .thenCompose(server -> {
                    if (server == null) {
                        throw new NotReadySignal();
                    }
                    return server.composerCatalogs()
                            .thenCompose(catalogs -> {
                                if (catalogs == null) {
                                    throw new NotReadySignal();
                                }
                                return decodeCall.apply(server, catalogs)
                                        .thenCompose(decoded -> runOnEdt(() -> onDecoded.accept(server, catalogs, decoded)));
                            });
                });

        return chain.orTimeout(waitMillis, TimeUnit.MILLISECONDS)
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

    /** Raised internally when a request completes normally with {@code null} rather than exceptionally. */
    private static final class EmptyPreviewException extends RuntimeException {
        EmptyPreviewException() {
            super("The preview request completed with no result.");
        }
    }

    /**
     * Observes a single request without notifying: the caller decides whether the outcome is still
     * current, because only the caller's sequence number can say whether a superseded failure should
     * be allowed to consume the session's single balloon. Bound the same way {@link #launch} bounds
     * each stage, on a {@link CompletableFuture#copy()} of {@code request} so the receiver the
     * LSP4IJ proxy owns is never force-completed. A throwable and a normal completion with
     * {@code null} both reach {@code onFailure} — a null preview left unobserved is exactly the
     * silent no-op this seam exists to remove. A non-null result reaches {@code onSuccess}. Both
     * callbacks run through the injected EDT executor. The returned future always completes
     * normally, so nothing calling this method is left unobserved.
     */
    public <T> CompletableFuture<Void> observe(CompletableFuture<T> request, long timeoutMillis,
            Consumer<T> onSuccess, Consumer<Throwable> onFailure) {
        return bounded(request, timeoutMillis).handle((value, throwable) -> {
            if (throwable != null) {
                onEdt.accept(() -> onFailure.accept(throwable));
            } else if (value == null) {
                onEdt.accept(() -> onFailure.accept(new EmptyPreviewException()));
            } else {
                onEdt.accept(() -> onSuccess.accept(value));
            }
            return null;
        });
    }

    /**
     * Returns a consumer that forwards at most one notice to {@code delegate} and drops the rest,
     * using an {@link AtomicBoolean#compareAndSet(boolean, boolean)} so two near-simultaneous
     * failures cannot both pass — the same atomicity discipline {@code BackendNoticePolicy} uses for
     * its check-then-set. State lives in the returned instance, so a fresh {@code once(...)} for a
     * new dialog session gets a fresh allowance.
     */
    public static Consumer<ComposerNotices.Notice> once(Consumer<ComposerNotices.Notice> delegate) {
        AtomicBoolean sent = new AtomicBoolean(false);
        return notice -> {
            if (sent.compareAndSet(false, true)) {
                delegate.accept(notice);
            }
        };
    }

    private <T> CompletableFuture<T> bounded(CompletableFuture<T> future, long timeoutMillis) {
        // copy() because orTimeout completes its receiver exceptionally, and the receiver here
        // belongs to the LSP4IJ proxy — timing out a copy leaves the proxy's own future untouched.
        return future.copy().orTimeout(timeoutMillis, TimeUnit.MILLISECONDS);
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
