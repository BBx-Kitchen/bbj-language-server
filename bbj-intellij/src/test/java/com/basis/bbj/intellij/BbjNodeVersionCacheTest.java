package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Behavioural coverage for {@link BbjNodeVersionCache}, driven entirely through the injectable
 * {@link BbjNodeVersionCache.VersionSpawner}/{@link BbjNodeVersionCache.FileStat} seams — no real
 * {@code node} binary or filesystem is touched.
 */
class BbjNodeVersionCacheTest {

    /** A scripted stat function: returns whatever stamp was last recorded for a path, or null. */
    private static final class ScriptedStat implements BbjNodeVersionCache.FileStat {
        private final Map<String, String> stamps = new HashMap<>();

        ScriptedStat with(String path, String stamp) {
            stamps.put(path, stamp);
            return this;
        }

        @Override
        public String stampOf(String nodePath) {
            return stamps.get(nodePath);
        }
    }

    /** A scripted spawner that also counts invocations per path. */
    private static final class RecordingSpawner implements BbjNodeVersionCache.VersionSpawner {
        private final Map<String, String> versions = new HashMap<>();
        private final Map<String, AtomicInteger> invocations = new HashMap<>();

        RecordingSpawner with(String path, String version) {
            versions.put(path, version);
            return this;
        }

        @Override
        public String versionOf(String nodePath) {
            invocations.computeIfAbsent(nodePath, p -> new AtomicInteger()).incrementAndGet();
            return versions.get(nodePath);
        }

        int invocationsFor(String path) {
            AtomicInteger counter = invocations.get(path);
            return counter == null ? 0 : counter.get();
        }
    }

    @Test
    void twoConsecutiveCallsWithAnUnchangedStatSpawnOnceAndReturnTheSameVersion() {
        String path = "/usr/bin/node";
        ScriptedStat stat = new ScriptedStat().with(path, "100:1000");
        RecordingSpawner spawner = new RecordingSpawner().with(path, "v22.23.2");
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        String first = cache.getVersion(path);
        String second = cache.getVersion(path);

        assertEquals("v22.23.2", first);
        assertEquals("v22.23.2", second);
        assertEquals(1, spawner.invocationsFor(path));
    }

    @Test
    void aStatChangeBetweenTheTwoCallsRespawnsAndReturnsTheNewVersion() {
        String path = "/usr/bin/node";
        ScriptedStat stat = new ScriptedStat().with(path, "100:1000");
        RecordingSpawner spawner = new RecordingSpawner().with(path, "v22.23.2");
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        String first = cache.getVersion(path);
        stat.with(path, "200:2000");
        spawner.with(path, "v22.1.0");
        String second = cache.getVersion(path);

        assertEquals("v22.23.2", first);
        assertEquals("v22.1.0", second);
        assertEquals(2, spawner.invocationsFor(path));
    }

    @Test
    void twoDifferentPathsEachSpawnExactlyOnce() {
        String pathA = "/usr/bin/node";
        String pathB = "/opt/node/bin/node";
        ScriptedStat stat = new ScriptedStat().with(pathA, "100:1000").with(pathB, "300:3000");
        RecordingSpawner spawner = new RecordingSpawner()
                .with(pathA, "v22.23.2")
                .with(pathB, "v18.20.4");
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        cache.getVersion(pathA);
        cache.getVersion(pathA);
        cache.getVersion(pathB);
        cache.getVersion(pathB);

        assertEquals(1, spawner.invocationsFor(pathA));
        assertEquals(1, spawner.invocationsFor(pathB));
    }

    @Test
    void aNullStatMeansNoFileAtThatPathAndTheCallReturnsNullWithoutSpawning() {
        String path = "/does/not/exist/node";
        ScriptedStat stat = new ScriptedStat();
        RecordingSpawner spawner = new RecordingSpawner();
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        String result = cache.getVersion(path);

        assertNull(result);
        assertEquals(0, spawner.invocationsFor(path));
    }

    /**
     * A null probe result must never become a permanent verdict: the stat key it would be cached
     * against never changes again once a binary is installed, so memoizing a null here would turn
     * one transient failure (e.g. a freshly-installed binary briefly locked by antivirus) into a
     * cache entry no later successful probe could ever displace. This deliberately inverts the
     * prior assertion in this test, which pinned that exact defect (a real Windows failure mode)
     * as desired behaviour by asserting the spawner was called only once.
     */
    @Test
    void aNullSpawnerResultIsNeverCachedAndIsReSpawnedOnTheNextCallEvenWithAnUnchangedStat() {
        String path = "/usr/bin/node";
        ScriptedStat stat = new ScriptedStat().with(path, "100:1000");
        RecordingSpawner spawner = new RecordingSpawner(); // no version registered -> null

        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        String first = cache.getVersion(path);
        String second = cache.getVersion(path);

        assertNull(first);
        assertNull(second);
        assertEquals(2, spawner.invocationsFor(path));
    }

    @Test
    void afterClearTheNextCallReSpawnsEvenWithAnUnchangedStat() {
        String path = "/usr/bin/node";
        ScriptedStat stat = new ScriptedStat().with(path, "100:1000");
        RecordingSpawner spawner = new RecordingSpawner().with(path, "v22.23.2");
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        cache.getVersion(path);
        cache.clear();
        cache.getVersion(path);

        assertEquals(2, spawner.invocationsFor(path));
    }

    @Test
    void tenStatChangesForTheSamePathLeaveSizeAtOne() {
        String path = "/usr/bin/node";
        ScriptedStat stat = new ScriptedStat().with(path, "0:0");
        RecordingSpawner spawner = new RecordingSpawner().with(path, "v22.23.2");
        BbjNodeVersionCache cache = new BbjNodeVersionCache(spawner, stat);

        for (int i = 1; i <= 10; i++) {
            stat.with(path, i + ":" + i);
            cache.getVersion(path);
        }

        assertEquals(1, cache.size());
    }
}
