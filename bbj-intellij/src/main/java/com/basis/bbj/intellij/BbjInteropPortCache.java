package com.basis.bbj.intellij;

import org.jetbrains.annotations.Nullable;

import java.io.File;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Read-through memo in front of {@link BbjInteropPortDetector#readFrom(java.nio.file.Path)}, keyed
 * on the properties file's path plus a cheap stat (last-modified time and length) — the same shape
 * {@link BbjNodeVersionCache} established. Not an IntelliJ service — a plain static memo with no
 * lifecycle to register in {@code plugin.xml}. Two consecutive lookups for the same unchanged home
 * perform the properties read at most once; a re-read happens exactly when the stat changes, never
 * on a plain hash — the stat alone is the invalidation key.
 */
public final class BbjInteropPortCache {

    /** Resolves a {@link BbjInteropPortDetector.PortLookup} for a properties file path. */
    @FunctionalInterface
    interface PortReader {
        BbjInteropPortDetector.PortLookup readFrom(java.nio.file.Path propertiesFile);
    }

    /** Produces a cheap stat stamp for the file at a path, or {@code null} when there is none. */
    @FunctionalInterface
    interface FileStat {
        @Nullable String stampOf(java.nio.file.Path propertiesFile);
    }

    /**
     * The single production instance, resolving over the real collaborators: a last-modified+length
     * stat as the stamp function, and the detector's stateless {@code readFrom} as the reader — a
     * stat, never a subprocess, and never a hash.
     */
    public static final BbjInteropPortCache SESSION =
            new BbjInteropPortCache(BbjInteropPortCache::defaultStamp, BbjInteropPortDetector::readFrom);

    private static @Nullable String defaultStamp(java.nio.file.Path propertiesFile) {
        File file = propertiesFile.toFile();
        if (!file.isFile()) {
            return null;
        }
        return file.lastModified() + ":" + file.length();
    }

    /** One cached entry: the stamp last observed for a path, paired with the lookup it produced. */
    private record Entry(String stamp, BbjInteropPortDetector.PortLookup lookup) {
    }

    private final FileStat stat;
    private final PortReader reader;
    private final ConcurrentHashMap<String, Entry> cache = new ConcurrentHashMap<>();

    /** Package-private so tests can inject a fake stat and a counting reader. */
    BbjInteropPortCache(FileStat stat, PortReader reader) {
        this.stat = stat;
        this.reader = reader;
    }

    /**
     * Returns the java-interop port lookup for the BBj installation at {@code bbjHomePath},
     * consulting the cache first. A null, empty, or blank home returns
     * {@link BbjInteropPortDetector#NOT_DETECTED} without consulting either collaborator. A home
     * whose properties file has no stat (no regular file there) returns
     * {@link BbjInteropPortDetector#NOT_DETECTED} without calling the reader. Otherwise the stored
     * lookup is returned when its stamp still matches the current one; a stamp change (or no prior
     * entry) reads afresh, caches — replacing rather than appending the entry for this path — and
     * returns.
     *
     * <p>The read-check-load-store step runs inside {@link ConcurrentHashMap#compute}, which holds
     * the map's per-bin lock for the whole sequence for a given path. Without this, two threads
     * racing a cache miss for the same home — a real scenario: the periodic java-interop health
     * probe and the Settings dialog can both resolve the same configured home concurrently on
     * different background threads — could each observe a miss and both read the properties file.
     */
    public BbjInteropPortDetector.PortLookup lookup(@Nullable String bbjHomePath) {
        if (bbjHomePath == null || bbjHomePath.isBlank()) {
            return BbjInteropPortDetector.NOT_DETECTED;
        }
        java.nio.file.Path propertiesFile = BbjInteropPortDetector.propertiesPathFor(bbjHomePath);
        String currentStamp = stat.stampOf(propertiesFile);
        if (currentStamp == null) {
            return BbjInteropPortDetector.NOT_DETECTED;
        }
        String key = propertiesFile.toAbsolutePath().toString();
        return cache.compute(key, (path, existing) ->
                existing != null && existing.stamp().equals(currentStamp)
                        ? existing
                        : new Entry(currentStamp, reader.readFrom(propertiesFile))
        ).lookup();
    }

    /** Test-only: drop every cached entry. */
    void clear() {
        cache.clear();
    }

    /** Test-only: number of distinct paths currently cached. */
    int size() {
        return cache.size();
    }
}
