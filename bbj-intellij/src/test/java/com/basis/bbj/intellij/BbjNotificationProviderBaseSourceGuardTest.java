package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the consolidated editor notification providers (#622). The shared
 * resolved-file-type guard now lives in {@link BbjNotificationProviderBase} and is pinned there,
 * inside its extracted {@code collectNotificationData} method body rather than merely somewhere
 * in the file. Each of the four subclasses keeps a delegation pin -- exactly one {@code extends
 * BbjNotificationProviderBase} and zero declarations of {@code collectNotificationData} -- and the
 * negative assertion against re-deriving visibility from a file extension sweeps the base and all
 * four subclasses at full breadth. This is the guard that makes the fixed crash-banner guard
 * permanent.
 */
class BbjNotificationProviderBaseSourceGuardTest {

    private static final Path BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjNotificationProviderBase.java")
            .toAbsolutePath();
    private static final Path MISSING_HOME_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjMissingHomeNotificationProvider.java")
            .toAbsolutePath();
    private static final Path MISSING_NODE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjMissingNodeNotificationProvider.java")
            .toAbsolutePath();
    private static final Path JAVA_INTEROP_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjJavaInteropNotificationProvider.java")
            .toAbsolutePath();
    private static final Path SERVER_CRASH_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui",
            "BbjServerCrashNotificationProvider.java")
            .toAbsolutePath();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source not found at " + path);
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

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    /**
     * The substring of {@code text} bounded by {@code startMarker} (inclusive) and the next
     * occurrence of {@code endMarker} after it (exclusive) -- the index-slice technique used to
     * assert a token lives inside a specific extracted method body rather than merely somewhere
     * in the file.
     */
    private static String sliceBetween(String text, String startMarker, String endMarker) {
        int start = text.indexOf(startMarker);
        assertTrue(start >= 0, "expected to find \"" + startMarker + "\"");
        int end = text.indexOf(endMarker, start + startMarker.length());
        assertTrue(end >= 0, "expected to find \"" + endMarker + "\" after \"" + startMarker + "\"");
        return text.substring(start, end);
    }

    private static Path sourceFor(String simpleName) {
        switch (simpleName) {
            case "BbjMissingHomeNotificationProvider":
                return MISSING_HOME_SOURCE;
            case "BbjMissingNodeNotificationProvider":
                return MISSING_NODE_SOURCE;
            case "BbjJavaInteropNotificationProvider":
                return JAVA_INTEROP_SOURCE;
            case "BbjServerCrashNotificationProvider":
                return SERVER_CRASH_SOURCE;
            case "BbjNotificationProviderBase":
                return BASE_SOURCE;
            default:
                throw new IllegalArgumentException("unknown simple name: " + simpleName);
        }
    }

    @Test
    void baseCollectNotificationDataDelegatesToTheSharedPredicateExactlyOnce() {
        String text = readSource(BASE_SOURCE);
        String collectNotificationDataRegion = sliceBetween(text,
                "public final @Nullable Function", "protected abstract @Nullable Function");
        assertEquals(1, countOccurrences(collectNotificationDataRegion,
                        "BbjFileVisibility.isBbjProgramFileTypeName("),
                "the base's collectNotificationData must delegate to the shared predicate exactly once");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "BbjMissingHomeNotificationProvider",
            "BbjMissingNodeNotificationProvider",
            "BbjJavaInteropNotificationProvider",
            "BbjServerCrashNotificationProvider"
    })
    void subclassCarriesADelegationPinAndDeclaresNoOwnCollectNotificationData(String simpleName) {
        String text = readSource(sourceFor(simpleName));
        assertEquals(1, countOccurrences(text, "extends BbjNotificationProviderBase"),
                simpleName + " must extend the shared base exactly once");
        assertEquals(0, countOccurrences(text, "collectNotificationData"),
                simpleName + " must not declare its own collectNotificationData");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "BbjNotificationProviderBase",
            "BbjMissingHomeNotificationProvider",
            "BbjMissingNodeNotificationProvider",
            "BbjJavaInteropNotificationProvider",
            "BbjServerCrashNotificationProvider"
    })
    void providerSourceNeverReDerivesVisibilityByExtension(String simpleName) {
        String text = readSource(sourceFor(simpleName));
        assertEquals(0, countOccurrences(text, "getExtension("),
                simpleName + " must not re-derive visibility by file extension");
        assertEquals(0, countOccurrences(text, "\"bbl\""),
                simpleName + " must not hard-code the bbl extension");
    }

    @Test
    void crashSubclassUsesErrorStatusAndTheOtherThreeUseWarning() {
        String crashText = readSource(SERVER_CRASH_SOURCE);
        assertEquals(1, countOccurrences(crashText, "EditorNotificationPanel.Status.Error"),
                "the crash provider must use Status.Error");
        assertEquals(0, countOccurrences(crashText, "EditorNotificationPanel.Status.Warning"),
                "the crash provider must not use Status.Warning");

        for (String warningProvider : new String[] {
                "BbjMissingHomeNotificationProvider",
                "BbjMissingNodeNotificationProvider",
                "BbjJavaInteropNotificationProvider"
        }) {
            String text = readSource(sourceFor(warningProvider));
            assertEquals(1, countOccurrences(text, "EditorNotificationPanel.Status.Warning"),
                    warningProvider + " must use Status.Warning");
            assertEquals(0, countOccurrences(text, "EditorNotificationPanel.Status.Error"),
                    warningProvider + " must not use Status.Error");
        }
    }
}
