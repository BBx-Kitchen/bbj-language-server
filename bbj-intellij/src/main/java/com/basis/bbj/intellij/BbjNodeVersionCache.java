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
 *
 * <p>A {@code null} version is never memoized. {@link BbjNodeDetector#getNodeVersion} folds every
 * failure mode — a transient spawn error, a binary briefly locked by antivirus right after an
 * install, a genuinely unreadable binary — into the same {@code null}, and the stat key never
 * changes again once a binary is installed. Caching that {@code null} against a stamp that is
 * permanent turns one bad probe into a verdict that can never self-correct for the lifetime of
 * the JVM-scoped {@link #SESSION} singleton, with no retry path short of restarting the IDE. A
 * transient failure must stay retryable, so only a successful (non-null) probe is stored; a
 * {@code null} result is returned to the caller as-is but leaves the cache untouched (or clears a
 * now-stale entry), guaranteeing the very next call re-spawns.
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

    /**
     * One cached entry: the stamp last observed for a path, paired with the version at that
     * stamp. Only ever constructed with a non-null version — a failed probe is never memoized,
     * so every {@code Entry} that makes it into the cache represents a successful spawn.
     */
    private record Entry(String stamp, @NotNull String version) {
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
     * spawns and returns the freshly probed version. A non-null result is cached — replacing any
     * prior entry for this path, never appending. A null result (the probe failed, for any
     * reason) is returned to the caller but is never memoized: any stale entry for this path is
     * dropped rather than replaced with a null-version entry, so the very next call for this path
     * re-spawns rather than trusting a stamp that will never change again.
     *
     * <p>The read-or-spawn-and-store step runs inside {@link ConcurrentHashMap#compute}, which
     * holds the map's per-bin lock for the whole read-check-spawn-store sequence for a given path.
     * Without this, two threads racing a cache miss for the same path (a real scenario: the
     * settings lookup and the missing-node notification provider can both resolve the same
     * configured path concurrently on different background threads) could each observe a miss and
     * both spawn {@code node --version}. This single-flight guarantee only applies to the
     * successful-probe path — a failing probe is deliberately not memoized, so it does not
     * benefit from single-flight suppression across separate {@link #getVersion} calls the way a
     * successful one does.
     */
    public @Nullable String getVersion(@NotNull String nodePath) {
        String currentStamp = stat.stampOf(nodePath);
        if (currentStamp == null) {
            return null;
        }
        Entry entry = cache.compute(nodePath, (path, existing) -> {
            if (existing != null && existing.stamp().equals(currentStamp)) {
                return existing;
            }
            String version = spawner.versionOf(path);
            return version != null ? new Entry(currentStamp, version) : null;
        });
        return entry == null ? null : entry.version();
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
