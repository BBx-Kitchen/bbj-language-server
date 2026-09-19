package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the java-interop effective-port accessor (#608). These are structural
 * properties no live IDE session can demonstrate: that every reader shares one answer, that the
 * raw {@code javaInteropPort} field is storage for the explicit variant only, and that the
 * Settings dialog performs one cached stat rather than a read per keystroke. The accessor itself
 * cannot be unit-tested because it resolves an application service, so its wiring is pinned here
 * instead.
 */
class EffectiveInteropPortSourceGuardTest {

    private static final Path BBJ_SETTINGS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettings.java")
            .toAbsolutePath();

    private static final Path BBJ_SETTINGS_CONFIGURABLE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsConfigurable.java")
            .toAbsolutePath();

    private static final Path BBJ_LANGUAGE_SERVER_FACTORY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp",
            "BbjLanguageServerFactory.java")
            .toAbsolutePath();

    private static final Path BBJ_JAVA_INTEROP_SERVICE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui",
            "BbjJavaInteropService.java")
            .toAbsolutePath();

    private static final Path BBJ_INTEROP_PORT_DETECTOR_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjInteropPortDetector.java")
            .toAbsolutePath();

    /** The whole {@code src/main/java} tree, scanned by {@link #exactlyOnePortLiteralSurvivesTreeWide()}. */
    private static final Path MAIN_SOURCE_ROOT = Paths.get("src", "main", "java").toAbsolutePath();

    /** The default java-interop port (#594) -- must survive exactly once, comment-stripped, tree-wide. */
    private static final String PORT_LITERAL = "5008";

    /** The detector's now-deleted substring-matching entry point; must appear nowhere. */
    private static final String REMOVED_DETECTOR_METHOD = "detectJavaInteropPort";

    private static final String ACCESSOR_CALL = "getEffectiveJavaInteropPort()";

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    /**
     * Strips line comments and block comments (including javadoc) from {@code text} before any
     * assertion counts occurrences, so a prose comment mentioning a guarded token can neither
     * satisfy nor break an assertion.
     */
    private static String stripComments(String text) {
        String noBlockComments = text.replaceAll("(?s)/\\*.*?\\*/", "");
        return noBlockComments.replaceAll("//[^\n]*", "");
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    @Test
    void theLanguageServerFactoryReadsOnlyTheAccessor() {
        String text = stripComments(readSource(BBJ_LANGUAGE_SERVER_FACTORY_SOURCE));
        assertEquals(1, countOccurrences(text, ACCESSOR_CALL),
                "BbjLanguageServerFactory must call getEffectiveJavaInteropPort() exactly once");
        assertEquals(0, countOccurrences(text, "state.javaInteropPort"),
                "BbjLanguageServerFactory must not read the raw javaInteropPort field for the "
                        + "effective value");
    }

    @Test
    void theJavaInteropServiceReadsTheAccessorAndStillReadsTheHostManually() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        assertEquals(1, countOccurrences(text, ACCESSOR_CALL),
                "BbjJavaInteropService.checkConnection must call getEffectiveJavaInteropPort() "
                        + "exactly once");
        assertEquals(0, countOccurrences(text, "state.javaInteropPort"),
                "BbjJavaInteropService must not read the raw javaInteropPort field for the "
                        + "effective value");
        assertEquals(1, countOccurrences(text, "state.javaInteropHost"),
                "the host must still be read from the state exactly once -- only the port is "
                        + "detected, the host stays a manually edited field");
    }

    @Test
    void bbjSettingsRoutesThroughEachDecisionFunctionExactlyOnce() {
        String text = stripComments(readSource(BBJ_SETTINGS_SOURCE));
        assertEquals(1, countOccurrences(text, "InteropPortSettings.effectivePort("),
                "BbjSettings must call InteropPortSettings.effectivePort( exactly once");
        assertEquals(1, countOccurrences(text, "InteropPortSettings.migratedAutoDetect("),
                "BbjSettings.loadState must call InteropPortSettings.migratedAutoDetect( exactly "
                        + "once");
        assertEquals(1, countOccurrences(text, "BbjInteropPortCache.SESSION.lookup("),
                "BbjSettings must consult the stat-keyed cache exactly once");
        assertTrue(text.contains("public boolean javaInteropPortAutoDetect"),
                "BbjSettings.State must declare the javaInteropPortAutoDetect flag");
        assertEquals(0, countOccurrences(text, REMOVED_DETECTOR_METHOD),
                "the removed substring-matching detector must not reappear in BbjSettings");
    }

    @Test
    void bbjSettingsConfigurableRoutesThroughEachHelperExactlyOnceAndTheEqualityGateIsGone() {
        String text = stripComments(readSource(BBJ_SETTINGS_CONFIGURABLE_SOURCE));
        assertEquals(1, countOccurrences(text, "BbjInteropPortCache.SESSION.lookup("),
                "BbjSettingsConfigurable.reset() must perform exactly one cached stat per dialog "
                        + "open");
        assertEquals(1, countOccurrences(text, "InteropPortSettings.portToPersist("),
                "apply() must call InteropPortSettings.portToPersist( exactly once");
        assertEquals(1, countOccurrences(text, "InteropPortSettings.portSettingModified("),
                "isModified() must call InteropPortSettings.portSettingModified( exactly once");
        assertEquals(1, countOccurrences(text, ACCESSOR_CALL),
                "reset() must call getEffectiveJavaInteropPort() exactly once");
        assertEquals(0, countOccurrences(text, REMOVED_DETECTOR_METHOD),
                "the removed substring-matching detector must not reappear in "
                        + "BbjSettingsConfigurable");
        assertEquals(0, countOccurrences(text, "javaInteropPort == "),
                "no numeric equality gate on the port may return");
    }

    @Test
    void theGuardReadTheRightFile() {
        String text = stripComments(readSource(BBJ_SETTINGS_SOURCE));
        int classIndex = text.indexOf("class BbjSettings");
        int accessorIndex = text.indexOf("public int " + ACCESSOR_CALL.replace("()", "("));
        assertTrue(classIndex >= 0, "class BbjSettings must be present");
        assertTrue(accessorIndex >= 0, "public int getEffectiveJavaInteropPort( must be present");
        assertTrue(classIndex < accessorIndex,
                "sanity anchor: the class declaration must precede the accessor's declaration");
    }

    /**
     * Pins the single-occurrence invariant tree-wide (#594): after comment-stripping, the raw port
     * literal {@code 5008} must appear exactly once across all of {@code src/main/java}, and that
     * one occurrence must live in {@link com.basis.bbj.intellij.BbjInteropPortDetector}'s {@code
     * DEFAULT_PORT} declaration -- nowhere else. A later hand-edit reintroducing the literal into
     * any other file (re-drifting the UI placeholder, the persisted default, or the
     * changed-from-default check away from the shared constant) fails this test.
     *
     * <p>Includes an anti-vacuity control: {@code BbjInteropPortDetector.java}'s own stripped
     * source must independently contain exactly one occurrence. Without this, a comment-stripping
     * regex that over-matches and swallows the detector's own {@code DEFAULT_PORT = 5008;} line
     * would make the tree-wide assertion below pass vacuously at a total of zero rather than one.
     */
    @Test
    void exactlyOnePortLiteralSurvivesTreeWide() {
        Map<String, Integer> perFileCounts = new LinkedHashMap<>();
        try (Stream<Path> walk = Files.walk(MAIN_SOURCE_ROOT)) {
            List<Path> javaFiles = walk
                    .filter(p -> p.toString().endsWith(".java"))
                    .collect(Collectors.toList());
            for (Path file : javaFiles) {
                String stripped = stripComments(readSource(file));
                int count = countOccurrences(stripped, PORT_LITERAL);
                if (count > 0) {
                    perFileCounts.put(MAIN_SOURCE_ROOT.relativize(file).toString().replace('\\', '/'), count);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(MAIN_SOURCE_ROOT, e);
        }

        int total = perFileCounts.values().stream().mapToInt(Integer::intValue).sum();
        assertEquals(1, total,
                "exactly one raw port literal (\"" + PORT_LITERAL + "\") must survive comment-stripping "
                        + "across src/main/java -- per-file counts: " + perFileCounts);
        assertEquals(1, perFileCounts.size(),
                "exactly one file may carry the surviving literal -- per-file counts: " + perFileCounts);
        String survivingFile = perFileCounts.keySet().iterator().next();
        assertTrue(survivingFile.endsWith("BbjInteropPortDetector.java"),
                "the sole surviving raw port literal must live in BbjInteropPortDetector.java, not "
                        + survivingFile + " -- per-file counts: " + perFileCounts);

        // Anti-vacuity control: guard against an over-matching stripComments() regex.
        String detectorStripped = stripComments(readSource(BBJ_INTEROP_PORT_DETECTOR_SOURCE));
        assertEquals(1, countOccurrences(detectorStripped, PORT_LITERAL),
                "BbjInteropPortDetector.java's own comment-stripped source must contain exactly one "
                        + "occurrence of \"" + PORT_LITERAL + "\" -- a count other than 1 here means the "
                        + "comment-stripping regex is over- or under-matching, so the tree-wide "
                        + "assertion above cannot be trusted");
    }
}
