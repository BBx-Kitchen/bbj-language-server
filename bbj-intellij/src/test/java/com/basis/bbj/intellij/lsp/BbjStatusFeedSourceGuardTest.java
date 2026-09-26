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
 * Source-guard fence pinning two invariants the status feed depends on: there is exactly one
 * status-feed site (the client-features hook in {@code BbjLanguageServerFactory}, not the language
 * client in {@code BbjLanguageClient}), and the log line in {@code BbjServerService.updateStatus}
 * names the real previous status rather than a stale field. Every assertion runs on comment-stripped
 * text, using the same string- and comment-aware scanner as {@link BbjLanguageServerSourceGuardTest}
 * (copied here per this project's per-guard-private-helper convention rather than shared, so each
 * guard's scanner stays independently verifiable).
 */
class BbjStatusFeedSourceGuardTest {

    private static final Path FACTORY_SOURCE = mainSource("BbjLanguageServerFactory.java");
    private static final Path CLIENT_SOURCE = mainSource("BbjLanguageClient.java");
    private static final Path SERVICE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjServerService.java")
            .toAbsolutePath();

    private static Path mainSource(String fileName) {
        return Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", fileName)
                .toAbsolutePath();
    }

    private static String readGuardedSource(Path path) {
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

    @Test
    void factoryStatusFeedOverrideCallsSuperThenUpdatesStatusInsideInvokeLaterBehindTwoDisposedGuards() {
        String stripped = stripComments(readGuardedSource(FACTORY_SOURCE));
        String body = bodyOf(stripped, "public void handleServerStatusChanged(@NotNull ServerStatus status)");

        assertEquals(1, countOccurrences(body, "super.handleServerStatusChanged("),
                "the status-feed override must call super.handleServerStatusChanged( exactly once");
        assertEquals(1, countOccurrences(body, "invokeLater("),
                "the status-feed override must dispatch through invokeLater( exactly once");
        assertEquals(2, countOccurrences(body, "isDisposed()"),
                "the status-feed override must guard on isDisposed() twice -- once before scheduling, "
                        + "once inside the invokeLater lambda");
        assertEquals(1, countOccurrences(body, ".updateStatus(status)"),
                "the status-feed override must call updateStatus(status) exactly once");

        int invokeLaterIndex = body.indexOf("invokeLater(");
        int updateStatusIndex = body.indexOf(".updateStatus(status)");
        assertTrue(invokeLaterIndex >= 0 && updateStatusIndex >= 0 && invokeLaterIndex < updateStatusIndex,
                "updateStatus(status) must be called from inside the invokeLater lambda");
    }

    @Test
    void createClientFeaturesStillOverridesInitializeParamsExactlyOnceBesideTheStatusFeed() {
        String stripped = stripComments(readGuardedSource(FACTORY_SOURCE));
        String body = bodyOf(stripped, "public @NotNull LSPClientFeatures createClientFeatures()");

        assertEquals(1, countOccurrences(body, "public void initializeParams("),
                "createClientFeatures() must still override initializeParams(...) exactly once -- "
                        + "the status feed must be added beside it, not in its place");
        assertEquals(1, countOccurrences(body, "public void handleServerStatusChanged(@NotNull ServerStatus status)"),
                "createClientFeatures() must override handleServerStatusChanged(...) exactly once");
    }

    @Test
    void clientStatusHandlerLogsToConsoleOnlyAndNeverCallsUpdateStatus() {
        String stripped = stripComments(readGuardedSource(CLIENT_SOURCE));
        String body = bodyOf(stripped, "public void handleServerStatusChanged(ServerStatus serverStatus)");

        assertEquals(0, countOccurrences(body, "updateStatus("),
                "BbjLanguageClient must no longer feed BbjServerService.updateStatus -- the "
                        + "client-features hook in BbjLanguageServerFactory is the status-feed site now");
        assertEquals(1, countOccurrences(body, "logToConsole("),
                "BbjLanguageClient must still log the status change to the console exactly once");
    }

    @Test
    void serviceLogLineNamesTheRealPreviousStatusAndTheStaleFieldIsGone() {
        String stripped = stripComments(readGuardedSource(SERVICE_SOURCE));
        String body = bodyOf(stripped, "public void updateStatus(@NotNull ServerStatus status)");

        assertEquals(1, countOccurrences(body, "\"BBj language server status: \" + currentStatus + \" -> \" + status"),
                "the transition log line must read currentStatus, the value still held before it "
                        + "advances, exactly once");

        int logLineIndex = body.indexOf("\"BBj language server status: \" + currentStatus + \" -> \" + status");
        int advanceIndex = body.indexOf("this.currentStatus = status;");
        assertTrue(logLineIndex >= 0 && advanceIndex >= 0 && logLineIndex < advanceIndex,
                "the log line must read currentStatus before it is reassigned to the new status");

        assertEquals(0, countOccurrences(stripped, "previousStatus"),
                "the stale two-behind previousStatus field and its assignment must be gone entirely");
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
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth. String literals, char literals, line comments, and block comments are skipped
     * while counting, so a brace character written inside any of those never perturbs the depth
     * count -- only braces that are actual Java syntax are counted. Copied from {@link
     * BbjLanguageServerSourceGuardTest} per this project's per-guard-private-helper convention
     * rather than shared, so each guard's scanner stays independently verifiable.
     */
    private static String bodyOf(String source, String declarationMarker) {
        int declarationStart = source.indexOf(declarationMarker);
        if (declarationStart < 0) {
            fail("declaration not found: " + declarationMarker);
        }
        int openBrace = source.indexOf('{', declarationStart);
        assertTrue(openBrace >= 0, "no opening brace found after declaration: " + declarationMarker);
        int depth = 0;
        int i = openBrace;
        boolean inString = false;
        boolean inChar = false;
        boolean inLineComment = false;
        boolean inBlockComment = false;
        for (; i < source.length(); i++) {
            char c = source.charAt(i);
            char next = i + 1 < source.length() ? source.charAt(i + 1) : '\0';

            if (inLineComment) {
                if (c == '\n') {
                    inLineComment = false;
                }
                continue;
            }
            if (inBlockComment) {
                if (c == '*' && next == '/') {
                    inBlockComment = false;
                    i++;
                }
                continue;
            }
            if (inString) {
                if (c == '\\') {
                    i++;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (inChar) {
                if (c == '\\') {
                    i++;
                } else if (c == '\'') {
                    inChar = false;
                }
                continue;
            }

            if (c == '/' && next == '/') {
                inLineComment = true;
                i++;
                continue;
            }
            if (c == '/' && next == '*') {
                inBlockComment = true;
                i++;
                continue;
            }
            if (c == '"') {
                inString = true;
                continue;
            }
            if (c == '\'') {
                inChar = true;
                continue;
            }

            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    break;
                }
            }
        }
        assertTrue(depth == 0, "unbalanced braces while scanning body of: " + declarationMarker);
        return source.substring(openBrace, i + 1);
    }

    /**
     * Removes line and block comments from {@code source} while leaving string and char literals
     * intact. Copied from {@link BbjLanguageServerSourceGuardTest} per this project's
     * per-guard-private-helper convention.
     */
    private static String stripComments(String source) {
        StringBuilder result = new StringBuilder(source.length());
        boolean inString = false;
        boolean inChar = false;
        boolean inLineComment = false;
        boolean inBlockComment = false;
        for (int i = 0; i < source.length(); i++) {
            char c = source.charAt(i);
            char next = i + 1 < source.length() ? source.charAt(i + 1) : '\0';

            if (inLineComment) {
                if (c == '\n') {
                    inLineComment = false;
                    result.append(c);
                }
                continue;
            }
            if (inBlockComment) {
                if (c == '*' && next == '/') {
                    inBlockComment = false;
                    i++;
                }
                continue;
            }
            if (inString) {
                result.append(c);
                if (c == '\\' && i + 1 < source.length()) {
                    i++;
                    result.append(source.charAt(i));
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (inChar) {
                result.append(c);
                if (c == '\\' && i + 1 < source.length()) {
                    i++;
                    result.append(source.charAt(i));
                } else if (c == '\'') {
                    inChar = false;
                }
                continue;
            }

            if (c == '/' && next == '/') {
                inLineComment = true;
                i++;
                continue;
            }
            if (c == '/' && next == '*') {
                inBlockComment = true;
                i++;
                continue;
            }
            if (c == '"') {
                inString = true;
                result.append(c);
                continue;
            }
            if (c == '\'') {
                inChar = true;
                result.append(c);
                continue;
            }

            result.append(c);
        }
        return result.toString();
    }
}
