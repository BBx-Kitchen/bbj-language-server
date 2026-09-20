package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Coverage for the version-aware {@link NodeExecutableResolver#resolve(String, String, String,
 * boolean, NodeExecutableResolver.PathProbe, Function, Predicate)} overload: the sixth (version)
 * validation step, the version-based fall-through it enables, and the distinction between "the
 * cache directory has nothing in it" and "the cache directory could not be accessed". This is a
 * NEW test class -- {@link NodeExecutableResolverTest}'s 24 cases pin the legacy four-argument
 * overload and are never edited by this plan.
 */
class NodeExecutableResolverVersionGatingTest {

    /**
     * A {@link NodeExecutableResolver.PathProbe} stub configured from explicit sets, mirroring
     * {@code NodeExecutableResolverTest}'s RecordingProbe. Kept as a private copy in this file per
     * this project's per-guard-owns-its-own-helpers convention.
     */
    private static final class RecordingProbe implements NodeExecutableResolver.PathProbe {
        private final Set<String> existing = new HashSet<>();
        private final Set<String> regularFiles = new HashSet<>();
        private final Set<String> executables = new HashSet<>();

        static RecordingProbe validAt(String... paths) {
            RecordingProbe probe = new RecordingProbe();
            probe.existing.addAll(List.of(paths));
            probe.regularFiles.addAll(List.of(paths));
            probe.executables.addAll(List.of(paths));
            return probe;
        }

        @Override
        public boolean exists(String path) {
            return existing.contains(path);
        }

        @Override
        public boolean isRegularFile(String path) {
            return regularFiles.contains(path);
        }

        @Override
        public boolean isExecutable(String path) {
            return executables.contains(path);
        }
    }

    /**
     * A version resolver stub that records how many times, and for which candidates, it was
     * consulted -- so a case can assert the sixth step really runs sixth (never for a candidate
     * that already failed an earlier step) and at most once per distinct candidate per resolve
     * call.
     */
    private static final class CountingVersionResolver implements Function<String, String> {
        private final Map<String, String> versions = new HashMap<>();
        private final Map<String, Integer> callCounts = new HashMap<>();

        CountingVersionResolver withVersion(String path, String version) {
            versions.put(path, version);
            return this;
        }

        @Override
        public String apply(String path) {
            callCounts.merge(path, 1, Integer::sum);
            return versions.get(path);
        }

        int callsFor(String path) {
            return callCounts.getOrDefault(path, 0);
        }

        int totalCalls() {
            return callCounts.values().stream().mapToInt(Integer::intValue).sum();
        }
    }

    private static final Predicate<String> AT_LEAST_V22 = version ->
            version != null && "v22.0.0".equals(version);

    private static NodeExecutableResolver.Rejected onlyRejection(NodeExecutableResolver.Resolution result) {
        assertEquals(1, result.rejections().size());
        return result.rejections().get(0);
    }

    // ---- The sixth step ----

    @Test
    void aConfiguredCandidatePassingTheFirstFiveStepsButFailingTheVersionCheckIsRejected() {
        String configured = "/opt/bbj-test/version-gate/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        CountingVersionResolver versionOf = new CountingVersionResolver().withVersion(configured, "v16.0.0");

        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                configured, null, null, true, probe, versionOf, AT_LEAST_V22);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.BELOW_MINIMUM_VERSION, rejected.reason());
        assertEquals(configured, rejected.candidate());
    }

    @Test
    void aConfiguredCandidateMeetingTheMinimumVersionStillResolvesFromSettings() {
        String configured = "/opt/bbj-test/version-gate/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        CountingVersionResolver versionOf = new CountingVersionResolver().withVersion(configured, "v22.0.0");

        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                configured, null, null, true, probe, versionOf, AT_LEAST_V22);

        assertTrue(result.isResolved());
        assertEquals(configured, result.path());
        assertEquals(NodeExecutableResolver.Source.SETTINGS, result.source());
        assertTrue(result.rejections().isEmpty());
    }

    // ---- Version-based fall-through ----

    @Test
    void aConfiguredCandidateBelowTheMinimumVersionFallsThroughToAValidCachedCandidate() {
        String configuredTooOld = "/opt/bbj-test/version-gate/settings-node";
        String cached = "/opt/bbj-test/version-gate/cached-node";
        RecordingProbe probe = RecordingProbe.validAt(configuredTooOld, cached);
        CountingVersionResolver versionOf = new CountingVersionResolver()
                .withVersion(configuredTooOld, "v16.0.0")
                .withVersion(cached, "v22.0.0");

        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                configuredTooOld, null, cached, true, probe, versionOf, AT_LEAST_V22);

        assertTrue(result.isResolved());
        assertEquals(cached, result.path());
        assertEquals(NodeExecutableResolver.Source.CACHED, result.source());

        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.BELOW_MINIMUM_VERSION, rejected.reason());
        assertEquals(configuredTooOld, rejected.candidate());
    }

    // ---- Step ordering ----

    @Test
    void theVersionResolverIsNeverConsultedForACandidateThatAlreadyFailedAnEarlierStep() {
        String configuredMissing = "/opt/bbj-test/version-gate/missing-node";
        RecordingProbe probe = new RecordingProbe();
        CountingVersionResolver versionOf = new CountingVersionResolver();

        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                configuredMissing, null, null, true, probe, versionOf, AT_LEAST_V22);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(0, versionOf.totalCalls(),
                "a candidate that already failed the missing-file step must never reach the version step");
    }

    @Test
    void theVersionResolverIsConsultedAtMostOnceForADistinctCandidateWithinOneResolveCall() {
        String configured = "/opt/bbj-test/version-gate/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        CountingVersionResolver versionOf = new CountingVersionResolver().withVersion(configured, "v22.0.0");

        NodeExecutableResolver.resolve(configured, null, null, true, probe, versionOf, AT_LEAST_V22);

        assertEquals(1, versionOf.callsFor(configured));
    }

    // ---- Cache-directory accessibility (nothing cached vs. cache unreachable) ----

    @Test
    void anInaccessibleCacheWithNoOtherCandidateUsableRecordsExactlyOneCachedRejection() {
        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                null, null, null, false, new RecordingProbe(), path -> null, version -> true);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.CACHED, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.CACHE_UNAVAILABLE, rejected.reason());
        assertTrue(result.failureMessage().contains("could not be accessed"),
                "failureMessage() must name the inaccessible-cache rejection");
    }

    @Test
    void anAccessibleButEmptyCacheRecordsNoCachedRejectionAtAll() {
        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                null, null, null, true, new RecordingProbe(), path -> null, version -> true);

        assertFalse(result.isResolved());
        assertTrue(result.rejections().isEmpty(),
                "an accessible but empty cache is absent, not rejected -- no CACHED entry is recorded");
    }

    @Test
    void anInaccessibleCacheDoesNotPreventAValidConfiguredCandidateFromResolving() {
        String configured = "/opt/bbj-test/version-gate/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        CountingVersionResolver versionOf = new CountingVersionResolver().withVersion(configured, "v22.0.0");

        NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                configured, null, null, false, probe, versionOf, AT_LEAST_V22);

        assertTrue(result.isResolved());
        assertEquals(configured, result.path());
        assertEquals(NodeExecutableResolver.Source.SETTINGS, result.source());
        assertTrue(result.rejections().isEmpty());
    }

    // ---- The legacy overload performs no version gating ----

    @Test
    void theLegacyFourArgumentOverloadNeverRejectsOnVersionEvenForAVersionThatWouldFail() {
        String configured = "/opt/bbj-test/version-gate/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(configured, null, null, probe);

        assertTrue(result.isResolved(),
                "the legacy overload has no version collaborator, so it can never fail a version it never checks");
        assertEquals(configured, result.path());
        assertEquals(NodeExecutableResolver.Source.SETTINGS, result.source());
        assertTrue(result.rejections().isEmpty());
    }
}
