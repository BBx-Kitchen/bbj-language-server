package com.basis.bbj.intellij.composer;

import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

/**
 * Per-project memo of the resolved {@link BbjComposerServer} proxy and the {@link
 * ComposerModels.ComposerCatalogs} fetched from it (#612). One instance lives per project, owned
 * by {@link BbjComposerService}; it is cleared by any language-server status change and by any
 * launch failure. There is no time-based expiry, so no clock precision or TTL rounding applies --
 * invalidation is entirely event-driven. Identity checks on the in-flight future guarantee a
 * resolution that started before a clear is never served to a caller after that clear: its late
 * completion lands on a future this cache no longer holds a reference to and is dropped.
 */
final class ComposerHandleCache {

    private final Supplier<CompletableFuture<BbjComposerServer>> resolver;

    private CompletableFuture<BbjComposerServer> serverFuture;
    private CompletableFuture<ComposerModels.ComposerCatalogs> catalogsFuture;
    private BbjComposerServer catalogsServer;

    ComposerHandleCache(Supplier<CompletableFuture<BbjComposerServer>> resolver) {
        this.resolver = resolver;
    }

    /**
     * Returns the cached server-resolution future, resolving it via the constructor's resolver
     * when the cache is empty. A resolver that throws yields a failed future that is not stored.
     * Once the stored future completes with a {@code null} proxy or exceptionally, the entry
     * clears itself so the next call resolves again.
     */
    synchronized CompletableFuture<BbjComposerServer> server() {
        if (serverFuture != null) {
            return serverFuture;
        }
        CompletableFuture<BbjComposerServer> future;
        try {
            future = resolver.get();
        } catch (RuntimeException e) {
            return CompletableFuture.failedFuture(e);
        }
        serverFuture = future;
        future.whenComplete((server, throwable) -> {
            if (server != null && throwable == null) {
                return;
            }
            synchronized (ComposerHandleCache.this) {
                if (serverFuture == future) {
                    clear();
                }
            }
        });
        return future;
    }

    /**
     * Returns the cached catalogs future for {@code server}, requesting it via {@link
     * BbjComposerServer#composerCatalogs()} when the cache holds no entry for this exact proxy.
     * The result is stored only when {@code server} is the proxy the current {@link #server()}
     * entry already resolved to -- a proxy passed in from outside that resolution (a stale or
     * unrelated instance) is never memoized. A stored result that completes with {@code null} or
     * exceptionally clears itself so the next call for the same proxy requests again.
     */
    synchronized CompletableFuture<ComposerModels.ComposerCatalogs> catalogs(BbjComposerServer server) {
        if (catalogsFuture != null && catalogsServer == server) {
            return catalogsFuture;
        }
        CompletableFuture<ComposerModels.ComposerCatalogs> future = server.composerCatalogs();
        boolean isCurrentServer = serverFuture != null
                && serverFuture.isDone()
                && !serverFuture.isCompletedExceptionally()
                && serverFuture.getNow(null) == server;
        if (isCurrentServer) {
            catalogsFuture = future;
            catalogsServer = server;
            future.whenComplete((catalogs, throwable) -> {
                if (catalogs != null && throwable == null) {
                    return;
                }
                synchronized (ComposerHandleCache.this) {
                    if (catalogsFuture == future) {
                        catalogsFuture = null;
                        catalogsServer = null;
                    }
                }
            });
        }
        return future;
    }

    /** Clears every cached entry so the next {@link #server()}/{@link #catalogs} call resolves fresh. */
    synchronized void invalidate() {
        clear();
    }

    private void clear() {
        serverFuture = null;
        catalogsFuture = null;
        catalogsServer = null;
    }
}
