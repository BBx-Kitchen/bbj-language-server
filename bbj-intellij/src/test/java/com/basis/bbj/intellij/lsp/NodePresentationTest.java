package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Drives {@link NodePresentation} across every {@link NodeExecutableResolver.Reason} the resolver
 * can produce, plus a resolved resolution. Every {@link NodeExecutableResolver.Resolution} input
 * is built by calling the real resolver with stub collaborators rather than fabricated directly,
 * so this test exercises the same objects the notification provider will receive.
 */
class NodePresentationTest {

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

    private static final Predicate<String> AT_LEAST_V22 = version ->
            version != null && "v22.0.0".equals(version);

    private static final Function<String, String> NO_VERSION = path -> null;
    private static final Predicate<String> ANY_VERSION = version -> true;

    private static NodeExecutableResolver.Resolution nothingConfiguredNothingFound() {
        return NodeExecutableResolver.resolve(
                null, null, null, true, new RecordingProbe(), NO_VERSION, ANY_VERSION);
    }

    private static NodeExecutableResolver.Resolution cacheUnavailable() {
        return NodeExecutableResolver.resolve(
                null, null, null, false, new RecordingProbe(), NO_VERSION, ANY_VERSION);
    }

    private static NodeExecutableResolver.Resolution configuredBelowMinimumVersion() {
        String configured = "/opt/bbj-test/presentation/too-old-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        Function<String, String> versionOf = path -> "v16.0.0";
        return NodeExecutableResolver.resolve(configured, null, null, true, probe, versionOf, AT_LEAST_V22);
    }

    @Test
    void aResolvedResolutionYieldsANullSentenceAndAnEmptyActionList() {
        String configured = "/opt/bbj-test/presentation/settings-node";
        RecordingProbe probe = RecordingProbe.validAt(configured);
        Function<String, String> versionOf = path -> "v22.0.0";

        NodeExecutableResolver.Resolution resolution =
                NodeExecutableResolver.resolve(configured, null, null, true, probe, versionOf, AT_LEAST_V22);

        assertTrue(resolution.isResolved());
        assertNull(NodePresentation.bannerText(resolution));
        assertTrue(NodePresentation.bannerActions(resolution).isEmpty());
    }

    @Test
    void theInaccessibleCacheCaseYieldsANonEmptyActionListExcludingDownload() {
        NodeExecutableResolver.Resolution resolution = cacheUnavailable();

        List<String> actions = NodePresentation.bannerActions(resolution);

        assertFalse(actions.isEmpty());
        assertFalse(actions.contains(NodePresentation.ACTION_DOWNLOAD),
                "a doomed download action must not be offered when the cache directory is inaccessible");
        assertTrue(actions.contains(NodePresentation.ACTION_CONFIGURE_PATH));
        assertTrue(actions.contains(NodePresentation.ACTION_INSTALL_MANUALLY));
    }

    @Test
    void theNothingConfiguredNothingFoundCaseStillOffersAllThreeIds() {
        NodeExecutableResolver.Resolution resolution = nothingConfiguredNothingFound();

        List<String> actions = NodePresentation.bannerActions(resolution);

        assertTrue(actions.contains(NodePresentation.ACTION_DOWNLOAD));
        assertTrue(actions.contains(NodePresentation.ACTION_CONFIGURE_PATH));
        assertTrue(actions.contains(NodePresentation.ACTION_INSTALL_MANUALLY));
    }

    @Test
    void noTwoDistinctReasonsCollapseToTheSameSentence() {
        String cacheUnavailableText = NodePresentation.bannerText(cacheUnavailable());
        String nothingFoundText = NodePresentation.bannerText(nothingConfiguredNothingFound());
        String belowMinimumText = NodePresentation.bannerText(configuredBelowMinimumVersion());

        assertNotEquals(cacheUnavailableText, nothingFoundText,
                "the inaccessible-cache sentence must differ from the nothing-found sentence");
        assertNotEquals(belowMinimumText, nothingFoundText,
                "the below-minimum-version sentence must differ from the nothing-found sentence");
        assertNotEquals(belowMinimumText, cacheUnavailableText,
                "the below-minimum-version sentence must differ from the inaccessible-cache sentence");
    }
}
