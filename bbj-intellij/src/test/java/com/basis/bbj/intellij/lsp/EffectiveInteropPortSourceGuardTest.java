package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

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
}
