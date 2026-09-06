package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of both editor-banner branches through {@link NodeAvailability#decide},
 * exercising the configured-path branch and the detect-then-cache branch that previously required
 * a live IDE to run.
 */
class NodeAvailabilityTest {

    private static final class CountingFileProbe implements NodeAvailability.FileProbe {
        private final boolean answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingFileProbe(boolean answer) {
            this.answer = answer;
        }

        @Override
        public boolean exists(String path) {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class CountingFunction implements Function<String, String> {
        private final String answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingFunction(String answer) {
            this.answer = answer;
        }

        @Override
        public String apply(String s) {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class CountingPredicate implements Predicate<String> {
        private final boolean answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingPredicate(boolean answer) {
            this.answer = answer;
        }

        @Override
        public boolean test(String s) {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class CountingStringSupplier implements Supplier<String> {
        private final String answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingStringSupplier(String answer) {
            this.answer = answer;
        }

        @Override
        public String get() {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class CountingPathSupplier implements Supplier<Path> {
        private final Path answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingPathSupplier(Path answer) {
            this.answer = answer;
        }

        @Override
        public Path get() {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    @Test
    void aConfiguredPathThatExistsAndMeetsTheMinimumNeedsNoBanner() {
        CountingStringSupplier detector = new CountingStringSupplier(null);
        CountingPathSupplier cached = new CountingPathSupplier(null);

        NodeAvailability.Decision decision = NodeAvailability.decide(
                "/opt/bbj-test/node", new CountingFileProbe(true), new CountingFunction("v20.0.0"),
                new CountingPredicate(true), detector, cached);

        assertEquals(NodeAvailability.Decision.CONFIGURED_PATH_USABLE, decision);
        assertFalse(NodeAvailability.bannerNeeded(decision));
        assertEquals(0, detector.invocations(), "the PATH detector must not be consulted");
        assertEquals(0, cached.invocations(), "the cached download must not be consulted");
    }

    @Test
    void aConfiguredPathThatDoesNotExistNeedsTheBanner() {
        CountingFunction versionOf = new CountingFunction("v20.0.0");
        CountingStringSupplier detector = new CountingStringSupplier(null);
        CountingPathSupplier cached = new CountingPathSupplier(null);

        NodeAvailability.Decision decision = NodeAvailability.decide(
                "/opt/bbj-test/node", new CountingFileProbe(false), versionOf,
                new CountingPredicate(true), detector, cached);

        assertEquals(NodeAvailability.Decision.CONFIGURED_PATH_UNUSABLE, decision);
        assertTrue(NodeAvailability.bannerNeeded(decision));
        assertEquals(0, versionOf.invocations(), "there is no file to ask a version about");
        assertEquals(0, detector.invocations());
        assertEquals(0, cached.invocations());
    }

    @Test
    void aConfiguredPathWithATooOldVersionNeedsTheBannerAndNeverConsultsTheCachedDownload() {
        CountingPathSupplier cached = new CountingPathSupplier(Paths.get("/tmp/cached-node"));

        NodeAvailability.Decision decision = NodeAvailability.decide(
                "/opt/bbj-test/node", new CountingFileProbe(true), new CountingFunction("v16.0.0"),
                new CountingPredicate(false), new CountingStringSupplier(null), cached);

        assertEquals(NodeAvailability.Decision.CONFIGURED_PATH_UNUSABLE, decision);
        assertTrue(NodeAvailability.bannerNeeded(decision));
        assertEquals(0, cached.invocations(),
                "today's asymmetry: a configured-but-unusable path never falls through to the cache");
    }

    @Test
    void anEmptyConfiguredPathTakesTheDetectionBranchAndConsultsTheFileProbeZeroTimes() {
        CountingFileProbe files = new CountingFileProbe(true);
        CountingStringSupplier detector = new CountingStringSupplier("/usr/bin/node");

        NodeAvailability.decide("", files, new CountingFunction("v20.0.0"),
                new CountingPredicate(true), detector, new CountingPathSupplier(null));

        assertEquals(0, files.invocations(), "an empty configured path never reaches the file probe");
        assertEquals(1, detector.invocations());
    }

    @Test
    void aDetectedPathThatMeetsTheMinimumNeedsNoBanner() {
        CountingPathSupplier cached = new CountingPathSupplier(Paths.get("/tmp/cached-node"));

        NodeAvailability.Decision decision = NodeAvailability.decide(
                "", new CountingFileProbe(true), new CountingFunction("v20.0.0"),
                new CountingPredicate(true), new CountingStringSupplier("/usr/bin/node"), cached);

        assertEquals(NodeAvailability.Decision.DETECTED_PATH_USABLE, decision);
        assertFalse(NodeAvailability.bannerNeeded(decision));
        assertEquals(0, cached.invocations(), "a usable detected path must not consult the cache");
    }

    @Test
    void aDetectedPathBelowTheMinimumFallsThroughToTheCachedDownload() {
        NodeAvailability.Decision decision = NodeAvailability.decide(
                "", new CountingFileProbe(true), new CountingFunction("v16.0.0"),
                new CountingPredicate(false), new CountingStringSupplier("/usr/bin/node"),
                new CountingPathSupplier(Paths.get("/tmp/cached-node")));

        assertEquals(NodeAvailability.Decision.CACHED_DOWNLOAD_USABLE, decision);
        assertFalse(NodeAvailability.bannerNeeded(decision));
    }

    @Test
    void noDetectedPathAndNoCachedDownloadNeedsTheBanner() {
        NodeAvailability.Decision decision = NodeAvailability.decide(
                "", new CountingFileProbe(true), new CountingFunction("v16.0.0"),
                new CountingPredicate(false), new CountingStringSupplier(null),
                new CountingPathSupplier(null));

        assertEquals(NodeAvailability.Decision.NO_RUNTIME_FOUND, decision);
        assertTrue(NodeAvailability.bannerNeeded(decision));
    }

    @Test
    void aNullDetectedPathSkipsTheVersionResolverEntirely() {
        CountingFunction versionOf = new CountingFunction("v20.0.0");

        NodeAvailability.decide("", new CountingFileProbe(true), versionOf,
                new CountingPredicate(true), new CountingStringSupplier(null),
                new CountingPathSupplier(null));

        assertEquals(0, versionOf.invocations(), "a null detected path must never reach the resolver");
    }

    @Test
    void twoConsecutiveDecisionsForTheSameConfiguredPathResolveTheVersionThroughTheSameResolver() {
        CountingFunction versionOf = new CountingFunction("v20.0.0");
        CountingFileProbe files = new CountingFileProbe(true);
        CountingPredicate meetsMinimum = new CountingPredicate(true);
        CountingStringSupplier detector = new CountingStringSupplier(null);
        CountingPathSupplier cached = new CountingPathSupplier(null);

        NodeAvailability.decide("/opt/bbj-test/node", files, versionOf, meetsMinimum, detector, cached);
        NodeAvailability.decide("/opt/bbj-test/node", files, versionOf, meetsMinimum, detector, cached);

        assertEquals(2, versionOf.invocations(),
                "the seam asks the resolver it was given each time; memoisation is the cache's job");
    }

    @Test
    void bannerNeededIsTrueForExactlyTwoOfTheFiveDecisions() {
        int trueCount = 0;
        for (NodeAvailability.Decision decision : NodeAvailability.Decision.values()) {
            if (NodeAvailability.bannerNeeded(decision)) {
                trueCount++;
                assertTrue(decision == NodeAvailability.Decision.CONFIGURED_PATH_UNUSABLE
                                || decision == NodeAvailability.Decision.NO_RUNTIME_FOUND,
                        "unexpected banner-needed decision: " + decision);
            }
        }
        assertEquals(2, trueCount,
                "adding a sixth decision without deciding its banner answer must fail here");
    }
}
