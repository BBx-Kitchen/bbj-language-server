package com.basis.bbj.intellij.composer;

import java.io.IOException;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Behavioural coverage for {@link ComposerHandleCache} (#612): the per-project memo of the
 * resolved server proxy and its catalogs that lets a second composer open in the same IntelliJ
 * session skip both the server-resolution and the catalogs round trip.
 */
class ComposerHandleCacheTest {

    private static final Path SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerHandleCache.java")
            .toAbsolutePath();

    /** Builds a {@link BbjComposerServer} double whose {@code composerCatalogs()} call is counted. */
    private static BbjComposerServer fakeServer(
            AtomicInteger catalogsRequests,
            Supplier<CompletableFuture<ComposerModels.ComposerCatalogs>> catalogsSupplier) {
        InvocationHandler handler = (proxy, method, args) -> {
            switch (method.getName()) {
                case "composerCatalogs":
                    catalogsRequests.incrementAndGet();
                    return catalogsSupplier.get();
                case "equals":
                    return proxy == args[0];
                case "hashCode":
                    return System.identityHashCode(proxy);
                case "toString":
                    return "FakeComposerServer@" + System.identityHashCode(proxy);
                default:
                    throw new UnsupportedOperationException(method.getName());
            }
        };
        return (BbjComposerServer) Proxy.newProxyInstance(
                ComposerHandleCacheTest.class.getClassLoader(),
                new Class<?>[] {BbjComposerServer.class},
                handler);
    }

    private static Supplier<CompletableFuture<BbjComposerServer>> countingResolver(
            AtomicInteger resolverRuns, Supplier<CompletableFuture<BbjComposerServer>> delegate) {
        return () -> {
            resolverRuns.incrementAndGet();
            return delegate.get();
        };
    }

    @Test
    void twoServerCallsInvokeTheResolverOnceAndReturnTheSameFutureInstance() {
        AtomicInteger resolverRuns = new AtomicInteger();
        CompletableFuture<BbjComposerServer> resolved =
                CompletableFuture.completedFuture(fakeServer(new AtomicInteger(), CompletableFuture::new));
        ComposerHandleCache cache = new ComposerHandleCache(countingResolver(resolverRuns, () -> resolved));

        CompletableFuture<BbjComposerServer> first = cache.server();
        CompletableFuture<BbjComposerServer> second = cache.server();

        assertEquals(1, resolverRuns.get());
        assertSame(first, second);
    }

    @Test
    void twoCatalogsCallsForTheResolvedProxyPerformOneRequestAndReturnTheSameFuture() {
        AtomicInteger catalogsRequests = new AtomicInteger();
        BbjComposerServer server = fakeServer(
                catalogsRequests, () -> CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        ComposerHandleCache cache = new ComposerHandleCache(() -> CompletableFuture.completedFuture(server));

        cache.server();
        CompletableFuture<ComposerModels.ComposerCatalogs> first = cache.catalogs(server);
        CompletableFuture<ComposerModels.ComposerCatalogs> second = cache.catalogs(server);

        assertEquals(1, catalogsRequests.get());
        assertSame(first, second);
    }

    @Test
    void invalidateAfterAFilledCacheMakesTheNextServerAndCatalogsResolveAgain() {
        AtomicInteger resolverRuns = new AtomicInteger();
        AtomicInteger catalogsRequests = new AtomicInteger();
        BbjComposerServer serverA = fakeServer(
                catalogsRequests, () -> CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        BbjComposerServer serverB = fakeServer(
                catalogsRequests, () -> CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        AtomicInteger callCount = new AtomicInteger();
        Supplier<CompletableFuture<BbjComposerServer>> resolver = countingResolver(
                resolverRuns,
                () -> CompletableFuture.completedFuture(callCount.getAndIncrement() == 0 ? serverA : serverB));
        ComposerHandleCache cache = new ComposerHandleCache(resolver);

        BbjComposerServer first = cache.server().join();
        cache.catalogs(first);
        assertEquals(1, resolverRuns.get());
        assertEquals(1, catalogsRequests.get());

        cache.invalidate();

        BbjComposerServer second = cache.server().join();
        cache.catalogs(second);

        assertEquals(2, resolverRuns.get());
        assertEquals(2, catalogsRequests.get());
        assertNotSame(first, second);
    }

    @Test
    void aResolverFutureCompletingWithNullIsNotKeptSoTheNextServerResolvesAgain() {
        AtomicInteger resolverRuns = new AtomicInteger();
        Supplier<CompletableFuture<BbjComposerServer>> resolver =
                countingResolver(resolverRuns, () -> CompletableFuture.completedFuture(null));
        ComposerHandleCache cache = new ComposerHandleCache(resolver);

        assertNull(cache.server().join());
        assertNull(cache.server().join());

        assertEquals(2, resolverRuns.get());
    }

    @Test
    void aResolverFutureCompletingExceptionallyIsNotKeptSoTheNextServerResolvesAgain() {
        AtomicInteger resolverRuns = new AtomicInteger();
        Supplier<CompletableFuture<BbjComposerServer>> resolver = countingResolver(
                resolverRuns, () -> CompletableFuture.failedFuture(new IllegalStateException("boom")));
        ComposerHandleCache cache = new ComposerHandleCache(resolver);

        CompletableFuture<BbjComposerServer> first = cache.server();
        assertTrue(first.isCompletedExceptionally());
        CompletableFuture<BbjComposerServer> second = cache.server();
        assertTrue(second.isCompletedExceptionally());

        assertEquals(2, resolverRuns.get());
    }

    @Test
    void aResolverThatThrowsMakesServerReturnAnExceptionallyCompletedFutureThatIsNotKept() {
        AtomicInteger resolverRuns = new AtomicInteger();
        Supplier<CompletableFuture<BbjComposerServer>> resolver = countingResolver(resolverRuns, () -> {
            throw new RuntimeException("resolve failed");
        });
        ComposerHandleCache cache = new ComposerHandleCache(resolver);

        CompletableFuture<BbjComposerServer> first = cache.server();
        assertTrue(first.isCompletedExceptionally());

        CompletableFuture<BbjComposerServer> second = cache.server();
        assertTrue(second.isCompletedExceptionally());
        assertNotSame(first, second);
        assertEquals(2, resolverRuns.get());
    }

    @Test
    void invalidateWhilePendingMeansTheStaleCompletionIsNeverServedAndTheNextServerResolvesAgain() {
        AtomicInteger resolverRuns = new AtomicInteger();
        CompletableFuture<BbjComposerServer> pending = new CompletableFuture<>();
        BbjComposerServer resolved = fakeServer(new AtomicInteger(), CompletableFuture::new);
        BbjComposerServer replacement = fakeServer(new AtomicInteger(), CompletableFuture::new);
        AtomicInteger callCount = new AtomicInteger();
        Supplier<CompletableFuture<BbjComposerServer>> resolver = countingResolver(
                resolverRuns,
                () -> callCount.getAndIncrement() == 0 ? pending : CompletableFuture.completedFuture(replacement));
        ComposerHandleCache cache = new ComposerHandleCache(resolver);

        CompletableFuture<BbjComposerServer> first = cache.server();
        cache.invalidate();
        pending.complete(resolved);

        CompletableFuture<BbjComposerServer> second = cache.server();

        assertEquals(2, resolverRuns.get());
        assertNotSame(first, second);
        assertSame(replacement, second.join());
    }

    @Test
    void aCatalogsFutureCompletingWithNullOrExceptionallyIsNotKept() {
        AtomicInteger catalogsRequests = new AtomicInteger();
        AtomicInteger callCount = new AtomicInteger();
        BbjComposerServer server = fakeServer(
                catalogsRequests,
                () -> callCount.getAndIncrement() == 0
                        ? CompletableFuture.completedFuture(null)
                        : CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        ComposerHandleCache cache = new ComposerHandleCache(() -> CompletableFuture.completedFuture(server));

        cache.server();
        assertNull(cache.catalogs(server).join());
        assertEquals(1, catalogsRequests.get());

        CompletableFuture<ComposerModels.ComposerCatalogs> second = cache.catalogs(server);
        assertEquals(2, catalogsRequests.get());
        assertTrue(second.join() != null);
    }

    @Test
    void catalogsForAProxyOtherThanTheResolvedOneIsRequestedEveryCallAndNeverMemoized() {
        AtomicInteger catalogsRequests = new AtomicInteger();
        BbjComposerServer resolvedServer = fakeServer(
                catalogsRequests, () -> CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        BbjComposerServer otherServer = fakeServer(
                catalogsRequests, () -> CompletableFuture.completedFuture(new ComposerModels.ComposerCatalogs()));
        ComposerHandleCache cache = new ComposerHandleCache(() -> CompletableFuture.completedFuture(resolvedServer));

        cache.server();
        cache.catalogs(otherServer);
        cache.catalogs(otherServer);

        assertEquals(2, catalogsRequests.get());
    }

    @Test
    void sourceCarriesNoIntelliJPlatformImportAndNoTimeBasedExpiry() {
        String text = readSource(SOURCE);
        assertFalse(text.contains("import com.intellij"),
                "ComposerHandleCache must stay a plain-Java seam runnable on the plain JUnit 5 classpath");
        assertFalse(text.contains("currentTimeMillis"),
                "ComposerHandleCache must not use a wall-clock time source -- invalidation is event-driven only");
        assertFalse(text.contains("nanoTime"),
                "ComposerHandleCache must not use a monotonic time source -- invalidation is event-driven only");
        assertFalse(text.contains("java.time"),
                "ComposerHandleCache must not import java.time -- invalidation is event-driven only");
    }

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
}
