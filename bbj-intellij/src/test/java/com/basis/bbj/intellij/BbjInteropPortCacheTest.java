package com.basis.bbj.intellij;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BbjInteropPortCache}: an unchanged stat performs no re-read, a
 * changed stat performs exactly one more, a null stat never invokes the reader, distinct homes are
 * cached independently, and concurrent lookups racing the same cache miss invoke the reader exactly
 * once — the same race-safety property {@link BbjNodeVersionCache} pins.
 */
class BbjInteropPortCacheTest {

    @AfterEach
    void clearSession() {
        BbjInteropPortCache.SESSION.clear();
    }

    private static BbjInteropPortCache cacheWith(BbjInteropPortCache.FileStat stat, AtomicInteger reads,
            BbjInteropPortDetector.PortLookup result) {
        return new BbjInteropPortCache(stat, propertiesFile -> {
            reads.incrementAndGet();
            return result;
        });
    }

    @Test
    void anUnchangedStatInvokesTheReaderExactlyOnceAcrossTwoLookups() {
        AtomicInteger reads = new AtomicInteger();
        BbjInteropPortDetector.PortLookup detected = new BbjInteropPortDetector.PortLookup(6000, true, false);
        BbjInteropPortCache cache = cacheWith(path -> "stamp-1", reads, detected);

        BbjInteropPortDetector.PortLookup first = cache.lookup("/opt/bbx");
        BbjInteropPortDetector.PortLookup second = cache.lookup("/opt/bbx");

        assertEquals(1, reads.get());
        assertSame(first, second);
    }

    @Test
    void aChangedStatInvokesTheReaderASecondTimeAndReturnsTheNewerLookup() {
        AtomicInteger reads = new AtomicInteger();
        AtomicInteger stampCounter = new AtomicInteger();
        BbjInteropPortDetector.PortLookup firstResult = new BbjInteropPortDetector.PortLookup(5008, true, false);
        BbjInteropPortDetector.PortLookup secondResult = new BbjInteropPortDetector.PortLookup(6000, true, false);
        BbjInteropPortDetector.PortLookup[] results = {firstResult, secondResult};
        BbjInteropPortCache cache = new BbjInteropPortCache(
                path -> "stamp-" + stampCounter.get(),
                path -> results[reads.getAndIncrement()]);

        BbjInteropPortDetector.PortLookup first = cache.lookup("/opt/bbx");
        stampCounter.incrementAndGet();
        BbjInteropPortDetector.PortLookup second = cache.lookup("/opt/bbx");

        assertEquals(2, reads.get());
        assertEquals(5008, first.port());
        assertEquals(6000, second.port());
    }

    @Test
    void aNullStatNeverInvokesTheReaderAndReturnsNotDetected() {
        AtomicInteger reads = new AtomicInteger();
        BbjInteropPortCache cache = cacheWith(path -> null, reads, BbjInteropPortDetector.NOT_DETECTED);

        BbjInteropPortDetector.PortLookup result = cache.lookup("/opt/bbx");

        assertEquals(0, reads.get());
        assertFalse(result.detected());
    }

    @Test
    void anEmptyHomeConsultsNeitherCollaborator() {
        BbjInteropPortCache cache = new BbjInteropPortCache(
                path -> {
                    throw new AssertionError("an empty home must not consult the stat collaborator");
                },
                path -> {
                    throw new AssertionError("an empty home must not consult the reader collaborator");
                });

        BbjInteropPortDetector.PortLookup result = cache.lookup("");

        assertFalse(result.detected());
    }

    @Test
    void twoDifferentHomesAreCachedIndependentlyAndTheMapSizeReflectsBoth() {
        AtomicInteger reads = new AtomicInteger();
        BbjInteropPortDetector.PortLookup detected = new BbjInteropPortDetector.PortLookup(6000, true, false);
        BbjInteropPortCache cache = cacheWith(path -> "stamp", reads, detected);

        cache.lookup("/opt/bbx-a");
        cache.lookup("/opt/bbx-b");

        assertEquals(2, reads.get());
        assertEquals(2, cache.size());
    }

    @Test
    void twoThreadsRacingTheFirstLookupForOneHomeInvokeTheReaderExactlyOnce() throws InterruptedException {
        AtomicInteger reads = new AtomicInteger();
        BbjInteropPortDetector.PortLookup detected = new BbjInteropPortDetector.PortLookup(6000, true, false);
        BbjInteropPortCache cache = new BbjInteropPortCache(path -> "stamp", path -> {
            reads.incrementAndGet();
            return detected;
        });

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
                    cache.lookup("/opt/bbx-race");
                });
            }
            ready.await();
            release.countDown();
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }

        assertEquals(1, reads.get());
    }

    @Test
    void sessionAgainstARealFileRereadsOnlyAfterAnExplicitlyAdvancedTimestamp(@TempDir Path home) throws IOException {
        Path cfgDir = home.resolve("cfg");
        Files.createDirectories(cfgDir);
        Path propertiesFile = cfgDir.resolve("BBj.properties");
        Files.writeString(propertiesFile, "com.basis.languageServer.addr=localhost\\:5008\\:true\n",
                StandardCharsets.UTF_8);

        BbjInteropPortDetector.PortLookup first = BbjInteropPortCache.SESSION.lookup(home.toString());
        assertEquals(5008, first.port());

        // The rewritten line has the same length as the original ("5008" -> "6000"), so a same-tick
        // rewrite would leave the mtime+length stat stamp unchanged — the accepted limitation of a
        // stat-keyed memo (inherited from BbjNodeVersionCache), not a defect. The timestamp is
        // advanced explicitly so this test proves the re-read path rather than racing the clock.
        Files.writeString(propertiesFile, "com.basis.languageServer.addr=localhost\\:6000\\:true\n",
                StandardCharsets.UTF_8);
        Files.setLastModifiedTime(propertiesFile, FileTime.fromMillis(Files.getLastModifiedTime(propertiesFile)
                .toMillis() + 5000));

        BbjInteropPortDetector.PortLookup second = BbjInteropPortCache.SESSION.lookup(home.toString());
        assertEquals(6000, second.port());
    }
}
