package com.basis.bbj.intellij;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.File;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Read-through memo in front of {@link BbjNodeDetector#getNodeVersion(String)}, keyed on the
 * configured path plus a cheap stat (last-modified time and length) of the binary at that path.
 * Not an IntelliJ service — a plain static memo with no lifecycle to register in {@code plugin.xml}
 * (D-09). Two consecutive resolutions of the same unchanged path spawn {@code node --version} at
 * most once (EDT-03, #543); a re-spawn happens exactly when the stat changes (D-10), e.g. an
 * in-place Node upgrade, never on a plain hash — the stat alone is the invalidation key.
 */
public final class BbjNodeVersionCache {

    /** Resolves the Node.js version for a path, mirroring {@link BbjNodeDetector#getNodeVersion}. */
    @FunctionalInterface
    interface VersionSpawner {
        @Nullable String versionOf(String nodePath);
    }

    /** Produces a cheap stat stamp for the file at a path, or {@code null} when there is none. */
    @FunctionalInterface
    interface FileStat {
        @Nullable String stampOf(String nodePath);
    }

    /**
     * The single production instance, resolving over the real collaborators: the detector's
     * stateless version method as the spawner, and a last-modified+length stat as the stamp
     * function — a stat, never a subprocess, and never a hash (D-10).
     */
    public static final BbjNodeVersionCache SESSION =
            new BbjNodeVersionCache(BbjNodeDetector::getNodeVersion, BbjNodeVersionCache::defaultStamp);

    private static @Nullable String defaultStamp(String nodePath) {
        File file = new File(nodePath);
        if (!file.isFile()) {
            return null;
        }
        return file.lastModified() + ":" + file.length();
    }

    /** One cached entry: the stamp last observed for a path, paired with the version at that stamp. */
    private record Entry(String stamp, @Nullable String version) {
    }

    private final VersionSpawner spawner;
    private final FileStat stat;
    private final ConcurrentHashMap<String, Entry> cache = new ConcurrentHashMap<>();

    /** Package-private so tests can inject fake collaborators and count spawns without a real node. */
    BbjNodeVersionCache(VersionSpawner spawner, FileStat stat) {
        this.spawner = spawner;
        this.stat = stat;
    }

    /**
     * Returns the Node.js version at {@code nodePath}, consulting the cache first. A path with no
     * regular file (null stamp) returns null without spawning. Otherwise the stored version is
     * returned when its stamp still matches the current one; a stamp change (or no prior entry)
     * spawns, caches — replacing any prior entry for this path, never appending — and returns.
     * A null version (unreadable binary) is cached exactly like a non-null one, so a broken binary
     * is not re-spawned on every refresh pass while its stat is unchanged.
     */
    public @Nullable String getVersion(@NotNull String nodePath) {
        String currentStamp = stat.stampOf(nodePath);
        if (currentStamp == null) {
            return null;
        }
        Entry cached = cache.get(nodePath);
        if (cached != null && cached.stamp().equals(currentStamp)) {
            return cached.version();
        }
        String version = spawner.versionOf(nodePath);
        cache.put(nodePath, new Entry(currentStamp, version));
        return version;
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
