package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NodeExecutableResolverTest {

    private static final NodeExecutableResolver.PathProbe NOTHING_ON_DISK =
            new NodeExecutableResolver.PathProbe() {
                @Override
                public boolean exists(String path) {
                    return false;
                }

                @Override
                public boolean isRegularFile(String path) {
                    return false;
                }

                @Override
                public boolean isExecutable(String path) {
                    return false;
                }
            };

    /**
     * A {@link NodeExecutableResolver.PathProbe} stub configured from three explicit sets of
     * paths — those that exist, those that are regular files, those that are executable — so a
     * case states exactly which property it is denying rather than inferring one property from
     * another. Also counts invocations, so a case can assert the probe was never consulted.
     */
    private static final class RecordingProbe implements NodeExecutableResolver.PathProbe {
        private final Set<String> existing = new HashSet<>();
        private final Set<String> regularFiles = new HashSet<>();
        private final Set<String> executables = new HashSet<>();
        private final AtomicInteger invocationCount = new AtomicInteger();

        RecordingProbe withExisting(String... paths) {
            existing.addAll(List.of(paths));
            return this;
        }

        RecordingProbe withRegularFile(String... paths) {
            regularFiles.addAll(List.of(paths));
            return this;
        }

        RecordingProbe withExecutable(String... paths) {
            executables.addAll(List.of(paths));
            return this;
        }

        int invocations() {
            return invocationCount.get();
        }

        @Override
        public boolean exists(String path) {
            invocationCount.incrementAndGet();
            return existing.contains(path);
        }

        @Override
        public boolean isRegularFile(String path) {
            invocationCount.incrementAndGet();
            return regularFiles.contains(path);
        }

        @Override
        public boolean isExecutable(String path) {
            invocationCount.incrementAndGet();
            return executables.contains(path);
        }
    }

    private static NodeExecutableResolver.Rejected onlyRejection(NodeExecutableResolver.Resolution result) {
        assertEquals(1, result.rejections().size());
        return result.rejections().get(0);
    }

    private static long countOccurrences(String text, String literal) {
        long count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    @Test
    void withNoCandidateAvailableTheResolverYieldsAnUnresolvedResultCarryingAnActionableMessage() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, "", null, NOTHING_ON_DISK);

        assertFalse(result.isResolved());
        assertTrue(result.rejections().isEmpty());
        assertTrue(result.failureMessage().contains("Settings | Languages & Frameworks | BBj"));
    }

    // ---- Configured branch, one case per validation step ----

    @Test
    void configuredValueWithAnIllegalPathCharacterIsRejectedAsMalformed() {
        String illegal = "/opt/bbj\u0000node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(illegal, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MALFORMED, rejected.reason());
        assertEquals(illegal, rejected.candidate());
        assertEquals(0, probe.invocations(), "an unparseable candidate must not reach the filesystem probe");
    }

    @Test
    void configuredValueThatIsRelativeIsRejectedWithoutConsultingTheFilesystem() {
        String relative = "node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(relative, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.NOT_ABSOLUTE, rejected.reason());
        assertEquals(relative, rejected.candidate());
        assertEquals(0, probe.invocations(), "a relative candidate must not consult the filesystem probe");
    }

    @Test
    void configuredValueThatDoesNotExistIsRejectedAsMissing() {
        String absent = "/opt/bbj-test/settings-branch/node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(absent, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(absent, rejected.candidate());
    }

    @Test
    void configuredValueThatExistsButIsNotARegularFileIsRejected() {
        String directory = "/opt/bbj-test/settings-branch/node-dir";
        RecordingProbe probe = new RecordingProbe().withExisting(directory);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(directory, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.NOT_A_FILE, rejected.reason());
        assertEquals(directory, rejected.candidate());
    }

    @Test
    void configuredValueThatIsARegularFileButNotExecutableIsRejected() {
        String file = "/opt/bbj-test/settings-branch/node";
        RecordingProbe probe = new RecordingProbe().withExisting(file).withRegularFile(file);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(file, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.NOT_EXECUTABLE, rejected.reason());
        assertEquals(file, rejected.candidate());
    }

    // ---- Detected and cached branches ----

    @Test
    void detectedValueThatDoesNotExistIsRejectedAsMissing() {
        String absent = "/opt/bbj-test/detected-branch/node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, absent, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.DETECTED, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(absent, rejected.candidate());
    }

    @Test
    void cachedValueThatDoesNotExistIsRejectedAsMissing() {
        String absent = "/opt/bbj-test/cached-branch/node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, null, absent, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.CACHED, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(absent, rejected.candidate());
    }

    // ---- Absence is not rejection ----

    @Test
    void emptyStringCandidateRecordsNothing() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve("", null, null, NOTHING_ON_DISK);

        assertTrue(result.rejections().isEmpty());
    }

    @Test
    void whitespaceOnlyCandidateRecordsNothing() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve("   ", null, null, NOTHING_ON_DISK);

        assertTrue(result.rejections().isEmpty());
    }

    @Test
    void withAllThreeCandidatesAbsentRejectionsIsEmpty() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, null, null, NOTHING_ON_DISK);

        assertFalse(result.isResolved());
        assertTrue(result.rejections().isEmpty());
    }

    // ---- No silent repair ----

    @Test
    void configuredValueWithALeadingSpaceIsRejectedWithoutTrimming() {
        String withLeadingSpace = " /opt/bbj-test/settings-branch/node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(withLeadingSpace, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(withLeadingSpace, rejected.candidate());
        assertEquals(0, probe.invocations(),
                "a candidate is judged as typed, never trimmed then re-judged");
    }

    @Test
    void configuredValueShapedLikeAWindowsInstallPathWithoutThePlatformSuffixIsRejectedAsMissing() {
        String suffixLess = "/Program Files/nodejs/node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(suffixLess, null, null, probe);

        assertFalse(result.isResolved());
        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(suffixLess, rejected.candidate());
        assertFalse(rejected.candidate().endsWith(".exe"), "no suffix is appended on the caller's behalf");
    }

    // ---- Precedence ----

    @Test
    void withAllThreeCandidatesValidResolutionUsesTheConfiguredValue() {
        String configured = "/opt/bbj-test/precedence/settings-node";
        String detected = "/opt/bbj-test/precedence/detected-node";
        String cached = "/opt/bbj-test/precedence/cached-node";
        RecordingProbe probe = new RecordingProbe()
                .withExisting(configured, detected, cached)
                .withRegularFile(configured, detected, cached)
                .withExecutable(configured, detected, cached);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(configured, detected, cached, probe);

        assertTrue(result.isResolved());
        assertEquals(configured, result.path());
        assertEquals(NodeExecutableResolver.Source.SETTINGS, result.source());
    }

    @Test
    void withConfiguredAbsentAndTheOtherTwoValidResolutionUsesTheDetectedValue() {
        String detected = "/opt/bbj-test/precedence/detected-node";
        String cached = "/opt/bbj-test/precedence/cached-node";
        RecordingProbe probe = new RecordingProbe()
                .withExisting(detected, cached)
                .withRegularFile(detected, cached)
                .withExecutable(detected, cached);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, detected, cached, probe);

        assertTrue(result.isResolved());
        assertEquals(detected, result.path());
        assertEquals(NodeExecutableResolver.Source.DETECTED, result.source());
    }

    @Test
    void withOnlyTheCachedValueValidResolutionUsesIt() {
        String cached = "/opt/bbj-test/precedence/cached-node";
        RecordingProbe probe = new RecordingProbe()
                .withExisting(cached)
                .withRegularFile(cached)
                .withExecutable(cached);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, null, cached, probe);

        assertTrue(result.isResolved());
        assertEquals(cached, result.path());
        assertEquals(NodeExecutableResolver.Source.CACHED, result.source());
    }

    // ---- Fall-through ----

    @Test
    void aRejectedConfiguredValueFallsThroughToAValidCachedValue() {
        String configuredMissing = "/opt/bbj-test/fall-through/settings-node";
        String cached = "/opt/bbj-test/fall-through/cached-node";
        RecordingProbe probe = new RecordingProbe()
                .withExisting(cached)
                .withRegularFile(cached)
                .withExecutable(cached);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(configuredMissing, null, cached, probe);

        assertTrue(result.isResolved());
        assertEquals(cached, result.path());
        assertEquals(NodeExecutableResolver.Source.CACHED, result.source());

        NodeExecutableResolver.Rejected rejected = onlyRejection(result);
        assertEquals(NodeExecutableResolver.Source.SETTINGS, rejected.source());
        assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        assertEquals(configuredMissing, rejected.candidate());
    }

    // ---- All three rejected ----

    @Test
    void withAllThreeRejectedTheOrderIsPreservedAndOnlyTheConfiguredLineCarriesTheSettingsInstruction() {
        String configured = "/opt/bbj-test/all-rejected/settings-node";
        String detected = "/opt/bbj-test/all-rejected/detected-node";
        String cached = "/opt/bbj-test/all-rejected/cached-node";
        RecordingProbe probe = new RecordingProbe();

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(configured, detected, cached, probe);

        assertFalse(result.isResolved());
        assertEquals(3, result.rejections().size());
        assertEquals(NodeExecutableResolver.Source.SETTINGS, result.rejections().get(0).source());
        assertEquals(NodeExecutableResolver.Source.DETECTED, result.rejections().get(1).source());
        assertEquals(NodeExecutableResolver.Source.CACHED, result.rejections().get(2).source());

        String message = result.failureMessage();
        String settingsInstruction = "Configure a valid path at Settings | Languages & Frameworks | BBj.";
        assertEquals(1, countOccurrences(message, settingsInstruction));

        String[] lines = message.split(System.lineSeparator());
        assertTrue(lines[1].contains(settingsInstruction),
                "the configured-candidate line must carry the Settings instruction");
        assertFalse(lines[2].contains(settingsInstruction),
                "the detected-candidate line must carry no Settings instruction");
        assertFalse(lines[3].contains(settingsInstruction),
                "the cached-candidate line must carry no Settings instruction");
    }

    // ---- Rendering ----

    @Test
    void aCandidateContainingAControlCharacterDoesNotIncreaseTheRenderedLineCount() {
        String withNewline = "/opt/bbj-test/rendering/set\ntings-node";
        String withoutNewline = "/opt/bbj-test/rendering/settings-node";
        RecordingProbe probe = new RecordingProbe();

        String messageWithNewline =
                NodeExecutableResolver.resolve(withNewline, null, null, probe).failureMessage();
        String messageWithoutNewline =
                NodeExecutableResolver.resolve(withoutNewline, null, null, probe).failureMessage();

        long lineCountWithNewline = countOccurrences(messageWithNewline, System.lineSeparator());
        long lineCountWithoutNewline = countOccurrences(messageWithoutNewline, System.lineSeparator());

        assertEquals(lineCountWithoutNewline, lineCountWithNewline);
        assertFalse(messageWithNewline.contains("\n\n"), "a control character must be rendered inline, not as a line break");
    }

    // ---- Misuse fails loudly ----

    @Test
    void callingPathOnAnUnresolvedResultThrows() {
        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(null, null, null, NOTHING_ON_DISK);

        assertThrows(IllegalStateException.class, result::path);
    }

    @Test
    void callingFailureMessageOnAResolvedResultThrows() {
        String configured = "/opt/bbj-test/misuse/settings-node";
        RecordingProbe probe = new RecordingProbe()
                .withExisting(configured).withRegularFile(configured).withExecutable(configured);

        NodeExecutableResolver.Resolution result =
                NodeExecutableResolver.resolve(configured, null, null, probe);

        assertThrows(IllegalStateException.class, result::failureMessage);
    }

    // ---- Real filesystem ----

    @Nested
    class RealFilesystemBehavior {

        @TempDir
        Path tempDir;

        @Test
        void resolvesAnExecutableFileCreatedInATemporaryDirectory() throws IOException {
            Path executable = tempDir.resolve("node");
            Files.createFile(executable);
            Assumptions.assumeTrue(executable.toFile().setExecutable(true),
                    "the platform must support setting the execute bit");

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    executable.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertTrue(result.isResolved());
            assertEquals(executable.toAbsolutePath().toString(), result.path());
        }

        @Test
        void rejectsAFileWithoutTheExecuteBitAsNotExecutable() throws IOException {
            Path nonExecutable = tempDir.resolve("node");
            Files.createFile(nonExecutable);
            Assumptions.assumeTrue(nonExecutable.toFile().setExecutable(false),
                    "the platform must support clearing the execute bit");
            Assumptions.assumeFalse(nonExecutable.toFile().canExecute(),
                    "the platform must distinguish an execute bit");

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    nonExecutable.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertFalse(result.isResolved());
            NodeExecutableResolver.Rejected rejected = onlyRejection(result);
            assertEquals(NodeExecutableResolver.Reason.NOT_EXECUTABLE, rejected.reason());
        }

        @Test
        void rejectsADirectoryAsNotAFile() {
            Path directory = tempDir.resolve("node-dir");
            assertTrue(directory.toFile().mkdir());

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    directory.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertFalse(result.isResolved());
            NodeExecutableResolver.Rejected rejected = onlyRejection(result);
            assertEquals(NodeExecutableResolver.Reason.NOT_A_FILE, rejected.reason());
        }

        @Test
        void rejectsASymlinkWhoseTargetWasDeletedAsMissing() throws IOException {
            Path target = tempDir.resolve("real-node");
            Files.createFile(target);
            Path link = tempDir.resolve("node-link");
            Assumptions.assumeTrue(trySymlink(link, target), "the platform must support symbolic links");
            Files.delete(target);

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    link.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertFalse(result.isResolved());
            NodeExecutableResolver.Rejected rejected = onlyRejection(result);
            assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        }

        @Test
        void resolvesASymlinkWhoseTargetIsExecutable() throws IOException {
            Path target = tempDir.resolve("real-node");
            Files.createFile(target);
            Assumptions.assumeTrue(target.toFile().setExecutable(true),
                    "the platform must support setting the execute bit");
            Path link = tempDir.resolve("node-link");
            Assumptions.assumeTrue(trySymlink(link, target), "the platform must support symbolic links");

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    link.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertTrue(result.isResolved());
            assertEquals(link.toAbsolutePath().toString(), result.path());
        }

        @Test
        void recordsARejectionRatherThanThrowingForAPathWhoseParentDirectoryDoesNotExist() {
            Path missingParent = tempDir.resolve("does-not-exist").resolve("node");

            NodeExecutableResolver.Resolution result = NodeExecutableResolver.resolve(
                    missingParent.toAbsolutePath().toString(), null, null,
                    NodeExecutableResolver.REAL_FILESYSTEM);

            assertFalse(result.isResolved());
            NodeExecutableResolver.Rejected rejected = onlyRejection(result);
            assertEquals(NodeExecutableResolver.Reason.MISSING, rejected.reason());
        }

        private boolean trySymlink(Path link, Path target) throws IOException {
            try {
                Files.createSymbolicLink(link, target);
                return true;
            } catch (UnsupportedOperationException | IOException e) {
                return false;
            }
        }
    }
}
