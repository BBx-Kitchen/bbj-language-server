package com.basis.bbj.intellij.ui;

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
 * Source-guard fence for the two status-bar widgets: both must subscribe {@code
 * FileEditorManagerListener.FILE_EDITOR_MANAGER} on their existing {@code messageBusConnection},
 * route {@code selectionChanged} to {@code updateVisibility()}, and decide visibility exclusively
 * through the shared {@link BbjFileVisibility} predicate -- never by re-deriving an extension
 * list (#610).
 */
class BbjStatusBarWidgetSourceGuardTest {

    private static final Path BBJ_STATUS_BAR_WIDGET_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjStatusBarWidget.java")
            .toAbsolutePath();
    private static final Path BBJ_JAVA_INTEROP_STATUS_BAR_WIDGET_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjJavaInteropStatusBarWidget.java")
            .toAbsolutePath();
    private static final Path BBJ_FILE_VISIBILITY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjFileVisibility.java")
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

    @ParameterizedTest
    @ValueSource(strings = {"BbjStatusBarWidget", "BbjJavaInteropStatusBarWidget"})
    void widgetSubscribesFileEditorManagerExactlyOnceOnMessageBusConnection(String simpleName) {
        String text = readSource(sourceFor(simpleName));
        assertEquals(1, countOccurrences(text, "FileEditorManagerListener.FILE_EDITOR_MANAGER"),
                simpleName + " must subscribe FILE_EDITOR_MANAGER exactly once");
        assertEquals(2, countOccurrences(text, "messageBusConnection.subscribe("),
                simpleName + " must carry exactly two subscriptions on the shared messageBusConnection "
                        + "(server/interop status plus FILE_EDITOR_MANAGER)");
        assertEquals(1, countOccurrences(text, "selectionChanged("),
                simpleName + " must implement selectionChanged exactly once");
        assertEquals(1, countOccurrences(text, "BbjFileVisibility.showsForSelection("),
                simpleName + " must delegate visibility to the shared decision exactly once");
        assertEquals(0, countOccurrences(text, "getExtension("),
                simpleName + " must not re-derive visibility by file extension");
        assertEquals(0, countOccurrences(text, "\"bbl\""),
                simpleName + " must not hard-code the bbl extension");
        assertEquals(1, countOccurrences(text, "messageBusConnection.disconnect()"),
                simpleName + "'s dispose() must disconnect the single shared connection exactly once");
    }

    @ParameterizedTest
    @ValueSource(strings = {"BbjStatusBarWidget", "BbjJavaInteropStatusBarWidget"})
    void selectionChangedCallsUpdateVisibilityBeforeItsClosingBrace(String simpleName) {
        String text = readSource(sourceFor(simpleName));
        int selectionChangedIndex = text.indexOf("selectionChanged(");
        assertTrue(selectionChangedIndex >= 0, simpleName + " must implement selectionChanged");
        int closingBrace = text.indexOf("}", selectionChangedIndex);
        assertTrue(closingBrace >= 0, simpleName + "'s selectionChanged must have a closing brace");
        String body = text.substring(selectionChangedIndex, closingBrace);
        assertTrue(body.contains("updateVisibility()"),
                simpleName + "'s selectionChanged must call updateVisibility()");
    }

    @Test
    void sharedPredicateReadsFileTypeExactlyOnceAndNeverExtension() {
        String text = readSource(BBJ_FILE_VISIBILITY_SOURCE);
        assertEquals(1, countOccurrences(text, "getFileType()"),
                "BbjFileVisibility must read the resolved file type exactly once");
        assertEquals(0, countOccurrences(text, "getExtension("),
                "BbjFileVisibility must never derive visibility from a file extension");
    }

    private static Path sourceFor(String simpleName) {
        return "BbjJavaInteropStatusBarWidget".equals(simpleName)
                ? BBJ_JAVA_INTEROP_STATUS_BAR_WIDGET_SOURCE
                : BBJ_STATUS_BAR_WIDGET_SOURCE;
    }
}
