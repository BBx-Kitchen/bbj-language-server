package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Structural guards on the two DENUM notification handlers and the console helpers behind them.
 * What they protect: the diagnostics block is written even when the tool window was never opened
 * (the console is made to exist before the first line is printed), UI work runs on the EDT behind
 * disposal checks, only the reveal shows the window and it never takes focus, the reveal never
 * reads its payload, and nothing on this path can turn a payload field into a hyperlink or a file
 * to open. Every assertion runs inside a located method body, except the forbidden-API scan, which
 * covers the whole client with comments removed.
 */
class BbjLanguageClientDenumSourceGuardTest {

    private static final Path CLIENT_SOURCE = mainSource("lsp", "BbjLanguageClient.java");
    private static final Path SERVER_SERVICE_SOURCE = mainSource("ui", "BbjServerService.java");

    private static Path mainSource(String pkg, String fileName) {
        return Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij", pkg, fileName)
            .toAbsolutePath();
    }

    private static String readGuardedSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read " + path, e);
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
     * Locates a method by a declaration substring, then returns the text from its opening brace
     * to its matching closing brace via brace counting.
     */
    private static String bodyOf(String text, String declarationSubstring) {
        int declIndex = text.indexOf(declarationSubstring);
        assertTrue(declIndex >= 0, "declaration not found: " + declarationSubstring);
        int openBrace = text.indexOf('{', declIndex);
        assertTrue(openBrace >= 0, "no opening brace found after declaration: " + declarationSubstring);
        int depth = 0;
        for (int i = openBrace; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(openBrace, i + 1);
                }
            }
        }
        fail("no matching closing brace found for declaration: " + declarationSubstring);
        throw new AssertionError("unreachable");
    }

    /** Removes line and block comments while leaving string and character literals intact. */
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

    @Test
    void theDiagnosticsHandlerRendersOnTheCallingThreadThenPrintsOnTheEdtAfterMakingTheConsoleExist() {
        String body = bodyOf(readGuardedSource(CLIENT_SOURCE), "public void denumDiagnostics(");

        assertEquals(1, countOccurrences(body, "DenumDiagnosticsPresenter.present("),
            "the payload must be rendered by the presenter exactly once");
        assertEquals(1, countOccurrences(body, "invokeLater("),
            "the console work must be dispatched through invokeLater( exactly once");
        assertEquals(2, countOccurrences(body, "isDisposed("),
            "the project must be checked before dispatching and again inside the dispatched block");
        assertEquals(1, countOccurrences(body, "ensureLogConsole(project)"),
            "the console must be made to exist exactly once");
        int ensure = body.indexOf("ensureLogConsole(project)");
        int print = body.indexOf("logToConsole(");
        assertTrue(print >= 0, "the handler must print through logToConsole(");
        assertTrue(ensure < print,
            "the console must exist before the first line is printed, or the text is silently dropped");
        assertTrue(body.contains("ERROR_OUTPUT"), "error entries must be printed as error output");
    }

    @Test
    void theDiagnosticsHandlerNeverShowsOrActivatesTheWindow() {
        String body = bodyOf(readGuardedSource(CLIENT_SOURCE), "public void denumDiagnostics(");

        assertFalse(body.contains("show("), "the diagnostics notification must never show the tool window");
        assertFalse(body.contains("activate("), "the diagnostics notification must never activate the tool window");
    }

    @Test
    void theRevealHandlerShowsTheWindowWithoutFocusAndScrollsToTheEnd() {
        String text = readGuardedSource(CLIENT_SOURCE);
        String body = bodyOf(text, "public void showDenumDiagnostics(");

        assertEquals(1, countOccurrences(body, "invokeLater("),
            "the reveal must be dispatched through invokeLater( exactly once");
        assertEquals(2, countOccurrences(body, "isDisposed("),
            "the project must be checked before dispatching and again inside the dispatched block");
        assertEquals(1, countOccurrences(body, "ensureLogConsole(project)"),
            "the reveal must take the window from the console helper exactly once");
        assertEquals(1, countOccurrences(body, ".show()"),
            "the reveal must show the window exactly once, without a focus-taking variant");
        assertEquals(1, countOccurrences(body, "scrollConsoleToEnd()"),
            "the reveal must leave the console at its last line");
        assertFalse(body.contains("activate("), "the reveal must not take keyboard focus from the editor");
        assertTrue(body.indexOf(".show()") < body.indexOf("scrollConsoleToEnd()"),
            "scrolling happens after the window is shown");
    }

    @Test
    void theRevealPayloadIsNeverRead() {
        String text = readGuardedSource(CLIENT_SOURCE);

        assertEquals(1, countOccurrences(text, "ignoredPayload"),
            "the reveal's parameter must appear only in its declaration, so it is never read");
    }

    @Test
    void theConsoleHelperCreatesTheConsoleWithoutShowingTheWindow() {
        String body = bodyOf(readGuardedSource(CLIENT_SOURCE),
            "private static @Nullable ToolWindow ensureLogConsole(");

        assertEquals(1, countOccurrences(body, "getToolWindow(\"BBj Language Server\")"),
            "the helper must look up the BBj Language Server tool window exactly once");
        assertEquals(1, countOccurrences(body, "getContentManager()"),
            "asking for the content manager is what creates the console");
        assertFalse(body.contains("show("), "making the console exist must not show the window");
    }

    @Test
    void nothingInTheClientCanTurnAPayloadFieldIntoALinkOrAFileToOpen() {
        String code = stripComments(readGuardedSource(CLIENT_SOURCE));

        for (String forbidden : new String[] {
            "printHyperlink", "HyperlinkInfo", "addMessageFilter", "OpenFileDescriptor",
            "openFile(", "BrowserUtil", "LocalFileSystem"}) {
            assertFalse(code.contains(forbidden),
                "BbjLanguageClient must not use " + forbidden + ": diagnostics are plain text only");
        }
    }

    @Test
    void theBbjcplAvailabilityHandlerIsStillANoOp() {
        String body = bodyOf(readGuardedSource(CLIENT_SOURCE), "public void bbjcplAvailability(");

        assertEquals("{}", body.replaceAll("\\s+", ""));
    }

    @Test
    void theServerServiceScrollsTheConsoleBehindANullCheck() {
        String text = readGuardedSource(SERVER_SERVICE_SOURCE);

        assertEquals(1, countOccurrences(text, "public void scrollConsoleToEnd()"),
            "BbjServerService must declare scrollConsoleToEnd() exactly once");
        String body = bodyOf(text, "public void scrollConsoleToEnd()");
        assertEquals(1, countOccurrences(body, "requestScrollingToEnd()"),
            "the method must ask the console to scroll to its end exactly once");
        assertTrue(body.contains("consoleView != null"),
            "the method must do nothing before the console exists");
    }
}
