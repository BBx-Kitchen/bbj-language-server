package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain-JUnit coverage of {@link TextMateBundleCache}, the platform-free seam
 * {@link BbjTextMateBundleProvider} defers to. No {@code com.intellij} type is reachable from
 * here, so this class drives every branch directly against a real temp filesystem.
 */
class TextMateBundleCacheTest {

    private static final List<String> FILES = List.of(
            "package.json",
            "syntaxes/bbj.tmLanguage.json"
    );

    /** A {@link TextMateBundleCache.ResourceOpener} that counts opens and can fail after N. */
    private static final class CountingOpener implements TextMateBundleCache.ResourceOpener {
        private int opens = 0;
        private final int failAfter;

        CountingOpener() {
            this(Integer.MAX_VALUE);
        }

        CountingOpener(int failAfter) {
            this.failAfter = failAfter;
        }

        @Override
        public InputStream open(String relativePath) throws IOException {
            opens++;
            if (opens > failAfter) {
                throw new IOException("simulated failure opening " + relativePath);
            }
            return new ByteArrayInputStream(
                    ("content of " + relativePath).getBytes(StandardCharsets.UTF_8));
        }

        int opens() {
            return opens;
        }
    }

    @Test
    void populateThenIsPopulatedForReturnsTrueAndASecondRunOpensNothing(@TempDir Path tempDir)
            throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        CountingOpener firstOpener = new CountingOpener();

        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, firstOpener);
        assertEquals(FILES.size(), firstOpener.opens());
        assertTrue(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES));

        // Mirrors the guarded call a second getBundles() invocation makes: only populate when
        // isPopulatedFor says no.
        CountingOpener secondCallOpener = new CountingOpener();
        if (!TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES)) {
            TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, secondCallOpener);
        }
        assertEquals(0, secondCallOpener.opens(),
                "a populated directory at the same version must open zero resources on the next call");
    }

    @Test
    void differentVersionIsNotPopulatedButIdenticalVersionIs(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());

        assertFalse(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.1", FILES),
                "an adjacent version must not read as a cache hit");
        assertTrue(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES),
                "the exact same version must read as a cache hit");
    }

    @Test
    void absentMarkerIsNotPopulated(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        Files.createDirectories(bundleDir);
        for (String file : FILES) {
            Path target = bundleDir.resolve(file);
            Files.createDirectories(target.getParent());
            Files.writeString(target, "x");
        }
        // No marker file written at all.
        assertFalse(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES));
    }

    @Test
    void blankMarkerIsNotPopulated(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());
        Files.writeString(bundleDir.resolve(TextMateBundleCache.MARKER_FILE_NAME), "");

        assertFalse(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES));
    }

    @Test
    void markerWithSurroundingWhitespaceStillMatches(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());
        Files.writeString(bundleDir.resolve(TextMateBundleCache.MARKER_FILE_NAME), "  1.0.0  \n");

        assertTrue(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES),
                "surrounding whitespace around an otherwise-matching marker must not cause a miss");
    }

    @Test
    void markerPresentButOneFileDeletedIsNotPopulated(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());

        Files.delete(bundleDir.resolve(FILES.get(1)));

        assertFalse(TextMateBundleCache.isPopulatedFor(bundleDir, "1.0.0", FILES),
                "a half-deleted directory must never read as a cache hit even with a matching marker");
    }

    @Test
    void populateInterruptedPartwayLeavesNoMarker(@TempDir Path tempDir) {
        Path bundleDir = tempDir.resolve("bundle");
        CountingOpener failingOpener = new CountingOpener(0);

        assertThrows(IOException.class,
                () -> TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, failingOpener));

        assertFalse(Files.exists(bundleDir.resolve(TextMateBundleCache.MARKER_FILE_NAME)),
                "the marker must never appear after a torn populate");
    }

    @Test
    void populateTwiceInARowSucceedsAndLeavesFilesPlusMarker(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");

        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());

        for (String file : FILES) {
            assertTrue(Files.exists(bundleDir.resolve(file)), file + " must exist after two populates");
        }
        assertTrue(Files.exists(bundleDir.resolve(TextMateBundleCache.MARKER_FILE_NAME)));
        assertEquals("1.0.0",
                Files.readString(bundleDir.resolve(TextMateBundleCache.MARKER_FILE_NAME)).trim());
    }

    @Test
    void nullPluginVersionIsNeverACacheHit(@TempDir Path tempDir) throws IOException {
        Path bundleDir = tempDir.resolve("bundle");
        TextMateBundleCache.populate(bundleDir, "1.0.0", FILES, new CountingOpener());

        assertFalse(TextMateBundleCache.isPopulatedFor(bundleDir, null, FILES),
                "an unresolvable plugin descriptor must degrade to re-copy, never a false hit");
    }
}
