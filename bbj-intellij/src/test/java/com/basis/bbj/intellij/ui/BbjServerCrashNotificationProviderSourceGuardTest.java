package com.basis.bbj.intellij.ui;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for {@link BbjServerCrashNotificationProvider}: the editor banner appears
 * only after auto-restart has given up, never for a first, quietly auto-restarted crash. The
 * panel gate reads only the give-up flag, never the plain crashed flag, and keeps both its action
 * labels and its restart call unchanged.
 */
class BbjServerCrashNotificationProviderSourceGuardTest {

    private static final Path SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij",
            "ui", "BbjServerCrashNotificationProvider.java")
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

    @Test
    void panelGatesOnlyOnTheGiveUpFlagAndKeepsBothActionsAndTheRestartCall() {
        String stripped = stripComments(readSource(SOURCE));

        assertEquals(1, countOccurrences(stripped, "isAutoRestartAbandoned()"),
                "the panel gate must read isAutoRestartAbandoned() exactly once");
        assertEquals(0, countOccurrences(stripped, "isServerCrashed()"),
                "the panel must never read the plain crashed flag -- only the give-up flag");
        assertEquals(2, countOccurrences(stripped, "createActionLabel("),
                "the panel must keep exactly two action labels");
        assertEquals(1, countOccurrences(stripped, "requestRestart(0)"),
                "the Restart Server action must still call requestRestart(0)");
    }

    @Test
    void classJavadocSaysTheBannerAppearsOnlyAfterAutoRestartHasGivenUp() {
        String rawSource = readSource(SOURCE);
        int classIndex = rawSource.indexOf("public final class BbjServerCrashNotificationProvider");
        assertEquals(true, classIndex > 0, "expected to find the class declaration");
        String beforeClass = rawSource.substring(0, classIndex);
        int javadocStart = beforeClass.lastIndexOf("/**");
        assertEquals(true, javadocStart >= 0, "expected a javadoc comment directly above the class declaration");
        String javadoc = beforeClass.substring(javadocStart);
        assertEquals(true, javadoc.contains("gives up") || javadoc.contains("given up"),
                "the class javadoc must say, in plain English, that the banner appears only after "
                        + "auto-restart has given up");
    }

    /**
     * The banner builds its "crashed again within N seconds" text from {@code
     * BbjServerService.CRASH_WINDOW_MS}, so the wording cannot drift from the window the crash
     * policy actually uses.
     */
    @Test
    void panelTextDerivesTheCrashWindowFromCrashWindowMsAndNeverHardcodesIt() {
        String stripped = stripComments(readSource(SOURCE));

        assertEquals(1, countOccurrences(stripped, "BbjServerService.CRASH_WINDOW_MS / 1000"),
                "the panel text must derive the window in seconds from BbjServerService.CRASH_WINDOW_MS");
        assertEquals(0, countHardcodedWindowLiterals(stripped),
                "the panel text must not state the crash window as a literal number of seconds");
    }

    /** String literals that spell out a 30-second window, e.g. {@code "... within 30 seconds"}. */
    private static final Pattern HARDCODED_WINDOW_LITERAL =
            Pattern.compile("\"[^\"\\n]*\\b30\\s*(s|sec|secs|second|seconds)\\b[^\"\\n]*\"");

    private static int countHardcodedWindowLiterals(String text) {
        Matcher m = HARDCODED_WINDOW_LITERAL.matcher(text);
        int count = 0;
        while (m.find()) {
            count++;
        }
        return count;
    }
}
