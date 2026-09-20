package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.NodeInstallPipeline;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Platform-free cache decision for the TextMate bundle: whether a stable directory is already
 * populated for the running plugin version, and how to populate it when it is not. Imports no
 * IntelliJ Platform SDK type, so plain JUnit drives every branch directly -- the gap this class
 * closes, since the bundle provider previously carried platform imports throughout and could not
 * be tested at all.
 */
public final class TextMateBundleCache {

    private static final Logger LOG = Logger.getLogger(TextMateBundleCache.class.getName());

    private TextMateBundleCache() {
    }

    /**
     * The marker file's name, resolved directly beneath the bundle directory. Its content is the
     * plugin version string that was current the last time the bundle directory was (re)populated.
     */
    public static final String MARKER_FILE_NAME = ".plugin-version";

    /**
     * Opens a bundle resource by its path relative to the bundle root, so production can supply
     * the real classloader lookup and a test can supply bytes without one.
     */
    public interface ResourceOpener {
        InputStream open(String relativePath) throws IOException;
    }

    /**
     * Whether {@code bundleDir} already holds a complete copy of {@code files} for
     * {@code pluginVersion}: the marker file exists, its trimmed content equals
     * {@code pluginVersion} exactly, and every one of {@code files} exists beneath
     * {@code bundleDir}. Declares no checked exception and never throws: any {@link IOException}
     * or {@link RuntimeException} encountered while reading resolves to {@code false} -- "not
     * cached", never "fail" and never "trust anyway". A {@code null} or blank
     * {@code pluginVersion} also returns {@code false}, so an unresolvable plugin descriptor
     * degrades to a fresh copy rather than a false cache hit. Checking the files as well as the
     * marker is what makes a half-deleted directory read as a miss.
     */
    public static boolean isPopulatedFor(Path bundleDir, String pluginVersion, List<String> files) {
        if (pluginVersion == null || pluginVersion.isBlank()) {
            return false;
        }
        try {
            Path marker = bundleDir.resolve(MARKER_FILE_NAME);
            String recorded = Files.readString(marker).trim();
            if (!recorded.equals(pluginVersion)) {
                return false;
            }
            for (String file : files) {
                if (!Files.exists(bundleDir.resolve(file))) {
                    return false;
                }
            }
            return true;
        } catch (IOException | RuntimeException e) {
            return false;
        }
    }

    /**
     * Creates {@code bundleDir} if needed, copies every entry in {@code files} into it via
     * {@code opener} (creating parent directories, since some entries carry a subdirectory
     * segment) using {@link StandardCopyOption#REPLACE_EXISTING} so a re-copy over a partial
     * directory succeeds, and writes the version marker LAST, only after every copy has returned.
     * Write ordering is the entire concurrency-safety mechanism: a reader that observes the
     * marker is guaranteed to observe every file complete, and a reader that does not re-copies
     * identical bytes from the same immutable packaged resource, which is harmless. A null
     * {@code pluginVersion} (an unresolvable plugin descriptor) copies the files but deliberately
     * skips writing the marker, so the directory is never mistaken for a cache hit later.
     */
    public static void populate(Path bundleDir, String pluginVersion, List<String> files,
                                 ResourceOpener opener) throws IOException {
        Files.createDirectories(bundleDir);
        for (String file : files) {
            Path target = bundleDir.resolve(file);
            Files.createDirectories(target.getParent());
            try (InputStream stream = opener.open(file)) {
                Files.copy(stream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        }
        if (pluginVersion != null) {
            Path marker = bundleDir.resolve(MARKER_FILE_NAME);
            Files.writeString(marker, pluginVersion);
        }
    }

    /**
     * Removes directories that earlier launches abandoned directly beneath {@code tempRoot},
     * scoped tightly: only DIRECT children of {@code tempRoot} are considered (never a recursive
     * search for matches), only entries that ARE directories are eligible, and only those whose
     * file name starts with {@code namePrefix}. A blank or {@code null} {@code namePrefix} matches
     * nothing and returns {@code 0} without listing {@code tempRoot} at all -- an empty prefix
     * would otherwise match every entry in the directory, which is exactly the blast radius this
     * method exists to bound. A missing or unreadable {@code tempRoot} also returns {@code 0}
     * without throwing. Each qualifying directory is removed via the already symlink-safe
     * {@link NodeInstallPipeline#deleteRecursively(Path)} -- a link inside it is deleted as a link,
     * never followed to whatever it points at. A delete failure on one entry is logged and the
     * sweep continues to the next entry; a sweep failure never propagates to the caller.
     *
     * @return the number of directories successfully removed
     */
    public static int sweepAbandoned(Path tempRoot, String namePrefix) {
        if (namePrefix == null || namePrefix.isBlank()) {
            return 0;
        }
        int removed = 0;
        try (DirectoryStream<Path> children = Files.newDirectoryStream(tempRoot)) {
            for (Path entry : children) {
                if (!Files.isDirectory(entry)) {
                    continue;
                }
                if (!entry.getFileName().toString().startsWith(namePrefix)) {
                    continue;
                }
                try {
                    NodeInstallPipeline.deleteRecursively(entry);
                    removed++;
                } catch (IOException | RuntimeException e) {
                    LOG.log(Level.WARNING,
                            "Failed to delete abandoned TextMate bundle directory: " + entry, e);
                }
            }
        } catch (IOException | RuntimeException e) {
            // A missing or unreadable tempRoot: nothing was swept, never throw.
            return removed;
        }
        return removed;
    }
}
