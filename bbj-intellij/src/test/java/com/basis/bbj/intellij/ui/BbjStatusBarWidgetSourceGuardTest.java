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
 * Source-guard fence for the consolidated status-bar widgets. The shared members --
 * the {@code FILE_EDITOR_MANAGER} subscription, {@code selectionChanged}, {@code
 * updateVisibility()}'s delegation to {@link BbjFileVisibility}, and {@code
 * messageBusConnection.disconnect()} -- now live in {@link BbjStatusBarWidgetBase} and are pinned
 * there, inside their extracted method bodies rather than merely somewhere in the file. Each
 * subclass keeps a delegation pin -- exactly one {@code messageBusConnection.subscribe(} for its
 * own status topic -- and the negative assertions against re-deriving visibility from a file
 * extension sweep both subclasses and the base at full breadth (#610).
 */
class BbjStatusBarWidgetSourceGuardTest {

    private static final Path BBJ_STATUS_BAR_WIDGET_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjStatusBarWidget.java")
            .toAbsolutePath();
    private static final Path BBJ_JAVA_INTEROP_STATUS_BAR_WIDGET_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjJavaInteropStatusBarWidget.java")
            .toAbsolutePath();
    private static final Path BBJ_STATUS_BAR_WIDGET_BASE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjStatusBarWidgetBase.java")
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

    /**
     * The substring of {@code text} bounded by {@code startMarker} (inclusive) and the next
     * occurrence of {@code endMarker} after it (exclusive) -- the index-slice technique this
     * phase's other guards use to assert a token lives inside a specific extracted method body
     * rather than merely somewhere in the file.
     */
    private static String sliceBetween(String text, String startMarker, String endMarker) {
        int start = text.indexOf(startMarker);
        assertTrue(start >= 0, "expected to find \"" + startMarker + "\"");
        int end = text.indexOf(endMarker, start + startMarker.length());
        assertTrue(end >= 0, "expected to find \"" + endMarker + "\" after \"" + startMarker + "\"");
        return text.substring(start, end);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BbjStatusBarWidget", "BbjJavaInteropStatusBarWidget"})
    void subclassCarriesExactlyOneOwnTopicSubscriptionAndExtendsTheBase(String simpleName) {
        String text = readSource(sourceFor(simpleName));
        assertEquals(1, countOccurrences(text, "messageBusConnection.subscribe("),
                simpleName + " must carry exactly one subscription -- its own status topic, made "
                        + "through subscribeToStatusTopic; the FILE_EDITOR_MANAGER subscription "
                        + "moved to the base");
        assertTrue(text.contains("extends BbjStatusBarWidgetBase"),
                simpleName + " must extend the shared base");
    }

    @ParameterizedTest
    @ValueSource(strings = {"BbjStatusBarWidget", "BbjJavaInteropStatusBarWidget", "BbjStatusBarWidgetBase"})
    void widgetSourceNeverReDerivesVisibilityByExtension(String simpleName) {
        String text = readSource(sourceForOrBase(simpleName));
        assertEquals(0, countOccurrences(text, "getExtension("),
                simpleName + " must not re-derive visibility by file extension");
        assertEquals(0, countOccurrences(text, "\"bbl\""),
                simpleName + " must not hard-code the bbl extension");
    }

    @Test
    void baseConstructorSubscribesFileEditorManagerExactlyOnceAndRoutesSelectionChangedToUpdateVisibility() {
        String text = readSource(BBJ_STATUS_BAR_WIDGET_BASE_SOURCE);
        String constructorRegion = sliceBetween(text,
                "protected BbjStatusBarWidgetBase(", "protected abstract String widgetId();");
        assertEquals(1, countOccurrences(constructorRegion, "FileEditorManagerListener.FILE_EDITOR_MANAGER"),
                "the base constructor must subscribe FILE_EDITOR_MANAGER exactly once");
        assertEquals(1, countOccurrences(constructorRegion, "selectionChanged("),
                "the base constructor must implement selectionChanged exactly once");

        int selectionChangedIndex = constructorRegion.indexOf("selectionChanged(");
        assertTrue(selectionChangedIndex >= 0, "the base must implement selectionChanged");
        int closingBrace = constructorRegion.indexOf("}", selectionChangedIndex);
        assertTrue(closingBrace >= 0, "the base's selectionChanged must have a closing brace");
        String body = constructorRegion.substring(selectionChangedIndex, closingBrace);
        assertTrue(body.contains("updateVisibility()"),
                "the base's selectionChanged must call updateVisibility()");
    }

    @Test
    void baseUpdateVisibilityDelegatesToSharedPredicateExactlyOnce() {
        String text = readSource(BBJ_STATUS_BAR_WIDGET_BASE_SOURCE);
        String updateVisibilityRegion = sliceBetween(text,
                "private void updateVisibility()", "private void showPopupMenu(");
        assertEquals(1, countOccurrences(updateVisibilityRegion, "BbjFileVisibility.showsForSelection("),
                "the base's updateVisibility() must delegate to the shared decision exactly once");
    }

    @Test
    void baseDisposeDisconnectsTheSharedConnectionExactlyOnce() {
        String text = readSource(BBJ_STATUS_BAR_WIDGET_BASE_SOURCE);
        int disposeIndex = text.indexOf("public void dispose() {");
        assertTrue(disposeIndex >= 0, "the base must implement dispose()");
        String disposeRegion = text.substring(disposeIndex);
        assertEquals(1, countOccurrences(disposeRegion, "messageBusConnection.disconnect()"),
                "the base's dispose() must disconnect the single shared connection exactly once");
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

    private static Path sourceForOrBase(String simpleName) {
        if ("BbjStatusBarWidgetBase".equals(simpleName)) {
            return BBJ_STATUS_BAR_WIDGET_BASE_SOURCE;
        }
        return sourceFor(simpleName);
    }

    /**
     * Copied from {@code lsp.Lsp4ijImportAllowlistTest.stripComments} -- that method is
     * package-private in another package, so this guard keeps its own copy rather than reach
     * across packages.
     */
    private static String stripComments(String source) {
        StringBuilder result = new StringBuilder(source.length());
        int i = 0;
        int n = source.length();
        while (i < n) {
            char c = source.charAt(i);
            if (c == '/' && i + 1 < n && source.charAt(i + 1) == '/') {
                int end = source.indexOf('\n', i);
                if (end == -1) {
                    break;
                }
                i = end;
                continue;
            }
            if (c == '/' && i + 1 < n && source.charAt(i + 1) == '*') {
                int end = source.indexOf("*/", i + 2);
                i = (end == -1) ? n : end + 2;
                continue;
            }
            if (c == '"' || c == '\'') {
                char quote = c;
                result.append(c);
                i++;
                while (i < n) {
                    char sc = source.charAt(i);
                    result.append(sc);
                    i++;
                    if (sc == '\\' && i < n) {
                        result.append(source.charAt(i));
                        i++;
                        continue;
                    }
                    if (sc == quote) {
                        break;
                    }
                }
                continue;
            }
            result.append(c);
            i++;
        }
        return result.toString();
    }

    /**
     * Pins the crashed-state rendering: each render hook reads the crashed flag first, the
     * crashed text literal appears exactly once, and only the tooltip hook also reads the
     * give-up flag.
     */
    @Test
    void crashedStateIsReadBeforeTheStatusSwitchInEachRenderHookAndRendersOnlyOnce() {
        String stripped = stripComments(readSource(BBJ_STATUS_BAR_WIDGET_SOURCE));

        String iconForBody = sliceBetween(stripped,
                "protected Icon iconFor(ServerStatus status) {",
                "protected String textFor(ServerStatus status) {");
        assertEquals(1, countOccurrences(iconForBody, "isServerCrashed()"),
                "iconFor must read isServerCrashed() exactly once");
        assertTrue(iconForBody.indexOf("isServerCrashed()") < iconForBody.indexOf("switch (status)"),
                "iconFor must read isServerCrashed() before its switch");
        assertEquals(0, countOccurrences(iconForBody, "isAutoRestartAbandoned()"),
                "iconFor must not read isAutoRestartAbandoned()");

        String textForBody = sliceBetween(stripped,
                "protected String textFor(ServerStatus status) {",
                "protected String tooltipFor(ServerStatus status, String text) {");
        assertEquals(1, countOccurrences(textForBody, "isServerCrashed()"),
                "textFor must read isServerCrashed() exactly once");
        assertTrue(textForBody.indexOf("isServerCrashed()") < textForBody.indexOf("switch (status)"),
                "textFor must read isServerCrashed() before its switch");
        assertEquals(0, countOccurrences(textForBody, "isAutoRestartAbandoned()"),
                "textFor must not read isAutoRestartAbandoned()");

        String tooltipForBody = sliceBetween(stripped,
                "protected String tooltipFor(ServerStatus status, String text) {",
                "protected void addPopupItems(JPopupMenu popup) {");
        assertEquals(1, countOccurrences(tooltipForBody, "isServerCrashed()"),
                "tooltipFor must read isServerCrashed() exactly once");
        assertTrue(tooltipForBody.indexOf("isServerCrashed()")
                        < tooltipForBody.indexOf("ConfigReloadPresentation.widgetTooltip("),
                "tooltipFor must read isServerCrashed() before ConfigReloadPresentation.widgetTooltip(");
        assertEquals(1, countOccurrences(tooltipForBody, "isAutoRestartAbandoned()"),
                "tooltipFor must read isAutoRestartAbandoned() exactly once");

        assertEquals(1, countOccurrences(stripped, "\"BBj: Crashed\""),
                "the stripped file must contain the literal \"BBj: Crashed\" exactly once");
    }
}
