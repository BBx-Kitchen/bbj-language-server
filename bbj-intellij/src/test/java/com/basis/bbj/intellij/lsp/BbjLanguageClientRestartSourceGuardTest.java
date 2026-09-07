package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for {@link BbjLanguageClient}'s {@code bbj/configReloadRequired} handler
 * (#486): a live IDE session cannot prove that a restart trigger funnels through {@code
 * BbjServerService#requestRestart(long)} rather than touching LSP4IJ's server-manager type
 * directly, or that a successful reload raises no notification balloon -- both are structural
 * properties of the source, not observable runtime behavior a single manual click would catch.
 * This test pins them as a text check on the source, mirroring {@code
 * BbjConfigPathServiceSourceGuardTest}'s whole-file-string-assertion convention.
 */
class BbjLanguageClientRestartSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
        .toAbsolutePath();

    /**
     * The LSP4IJ server-manager type {@code BbjServerService}'s private restart routine ({@code
     * doRestart()}) uses directly. Declared once here, rather than hard-coded in prose, so this
     * guard's intent is machine-checkable: {@code BbjLanguageClient} must never touch it -- all
     * restart traffic must funnel through {@code BbjServerService#requestRestart(long)}, the
     * same discipline every other IntelliJ restart trigger follows (EDT-05).
     */
    private static final String LSP4IJ_SERVER_MANAGER_TYPE = "LanguageServerManager";

    /** The handler this guard fences, identified by its {@code @JsonNotification} annotation. */
    private static final String HANDLER_ANNOTATION = "@JsonNotification(\"bbj/configReloadRequired\")";

    private static String readGuardedSource() {
        if (!Files.exists(GUARDED_SOURCE)) {
            fail("Guarded source file not found at " + GUARDED_SOURCE);
        }
        try {
            return Files.readString(GUARDED_SOURCE);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(IOException cause) {
            super("Failed to read " + GUARDED_SOURCE, cause);
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

    /**
     * The {@code configReloadRequired} handler's own body: from its {@code @JsonNotification}
     * annotation up to the next annotated class member (or, since it is currently the class's
     * last member, up to the class's closing brace). Scoping to this substring keeps the {@code
     * createNotification(}/{@code logToConsole(} assertions below from counting the pre-existing
     * {@code resolvedConfigPath} handler's own missing-config balloon.
     */
    private static String handlerBody(String strippedText) {
        int start = strippedText.indexOf(HANDLER_ANNOTATION);
        if (start < 0) {
            fail("Handler annotation not found: " + HANDLER_ANNOTATION);
        }
        int searchFrom = start + HANDLER_ANNOTATION.length();
        int nextMember = strippedText.indexOf("\n    @", searchFrom);
        int classEnd = strippedText.lastIndexOf("\n}");
        int end = nextMember >= 0 ? nextMember : (classEnd >= 0 ? classEnd : strippedText.length());
        return strippedText.substring(start, end);
    }

    @Test
    void theHandlerRequestsRestartExactlyOnceThroughTheServiceWithTheSharedDebounceConstant() {
        String text = stripComments(readGuardedSource());

        assertEquals(1, countOccurrences(text, "requestRestart("),
            "BbjLanguageClient must call requestRestart( exactly once -- every restart trigger "
                + "funnels through the service's single coalescing entry point");
        assertEquals(1, countOccurrences(text, "requestRestart(BbjServerService.RESTART_DEBOUNCE_MS)"),
            "the call must pass BbjServerService.RESTART_DEBOUNCE_MS, the same constant "
                + "scheduleRestart() already uses, so a settings-apply restart and a config "
                + "reload collapse into one restart");
        assertEquals(0, countOccurrences(text, "requestRestart(500"),
            "the debounce delay must be the shared named constant, never a duplicated numeric literal");
    }

    @Test
    void theHandlerNeverTouchesTheLsp4ijServerManagerDirectly() {
        String text = stripComments(readGuardedSource());

        assertEquals(0, countOccurrences(text, LSP4IJ_SERVER_MANAGER_TYPE),
            "BbjLanguageClient must never reference " + LSP4IJ_SERVER_MANAGER_TYPE + " directly "
                + "-- that type is reserved for BbjServerService's private restart routine, "
                + "reached only through requestRestart(long)");
    }

    @Test
    void theConfigReloadHandlerRaisesNoNotificationBalloon() {
        String body = handlerBody(stripComments(readGuardedSource()));

        assertEquals(0, countOccurrences(body, "createNotification("),
            "a successful config reload must raise no balloon -- the status widget tooltip and "
                + "the console are the only surfaces");
    }

    @Test
    void theConfigReloadHandlerLogsExactlyOneConsoleLine() {
        String body = handlerBody(stripComments(readGuardedSource()));

        assertEquals(1, countOccurrences(body, "logToConsole("),
            "the handler must write exactly one console line naming the config path and the reason");
    }
}
