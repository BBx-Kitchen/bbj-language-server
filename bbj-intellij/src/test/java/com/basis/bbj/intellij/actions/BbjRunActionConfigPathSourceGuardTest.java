package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence over the four run-action sources: the base class must reach the resolved
 * config path through exactly one accessor call per method and never derive a BBj-home-based
 * default itself; the BUI and DWC actions must guard the blank case before launching; the GUI
 * action must keep its existing null guard around the argument helper.
 */
class BbjRunActionConfigPathSourceGuardTest {

    private static final String[] ACTION_SOURCES = {
            "BbjRunActionBase", "BbjRunGuiAction", "BbjRunBuiAction", "BbjRunDwcAction"
    };

    private static final String BBJ_HOME_CONFIG_JOIN = "Paths.get(bbjHome, \"cfg\"";

    private static Path sourcePath(String simpleName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", simpleName + ".java")
                .toAbsolutePath();
    }

    private static String readSource(String simpleName) {
        Path resolved = sourcePath(simpleName);
        if (!Files.exists(resolved)) {
            fail("Guarded source file not found at " + resolved);
        }
        try {
            return Files.readString(resolved);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(resolved, e);
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

    /** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
    private static String extractMethodBody(String text, String signatureFragment) {
        int sigIndex = text.indexOf(signatureFragment);
        assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
        int braceStart = text.indexOf('{', sigIndex);
        assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
        int depth = 0;
        for (int i = braceStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(braceStart, i + 1);
                }
            }
        }
        fail("unbalanced braces for: " + signatureFragment);
        return "";
    }

    @Test
    void noActionSourceJoinsABbjHomeConfigPathDefault() {
        for (String simpleName : ACTION_SOURCES) {
            String text = readSource(simpleName);
            assertEquals(0, countOccurrences(text, BBJ_HOME_CONFIG_JOIN),
                    simpleName + " must not derive a BBj-home config default itself");
        }
    }

    @Test
    void baseClassAccessorsEachCallActiveConfigPathExactlyOnce() {
        String text = readSource("BbjRunActionBase");

        String argBody = extractMethodBody(text, "protected String getConfigPathArg()");
        assertEquals(1, countOccurrences(argBody, "activeConfigPath()"),
                "getConfigPathArg() must reach the resolved path through exactly one activeConfigPath() call");

        String pathBody = extractMethodBody(text, "protected String getConfigPath()");
        assertEquals(1, countOccurrences(pathBody, "activeConfigPath()"),
                "getConfigPath() must reach the resolved path through exactly one activeConfigPath() call");
    }

    @Test
    void sharedWebRunHelperGuardsTheBlankConfigPathBeforeLaunching() {
        // BbjRunBuiAction and BbjRunDwcAction share one buildCommandLine body -- the
        // buildWebRunCommandLine() helper on BbjRunActionBase -- so the blank-config-path guard
        // lives there exactly once rather than duplicated per subclass. Scoped to the helper's
        // own body (not the whole file) because the file also contains the one-line
        // getConfigPath() method declaration itself, which would otherwise double-count.
        String text = extractMethodBody(readSource("BbjRunActionBase"), "protected GeneralCommandLine buildWebRunCommandLine(");
        assertEquals(1, countOccurrences(text, "getConfigPath()"),
                "buildWebRunCommandLine must call getConfigPath() exactly once");
        int callIndex = text.indexOf("getConfigPath()");
        int guardIndex = text.indexOf("configPath.isBlank()", callIndex);
        assertTrue(guardIndex > callIndex,
                "buildWebRunCommandLine must guard against a blank config path immediately after the call");
        int returnAfterGuard = text.indexOf("return null;", guardIndex);
        assertTrue(returnAfterGuard > guardIndex,
                "buildWebRunCommandLine must return without launching when no config path is available");
    }

    @Test
    void buiAndDwcActionsEachDelegateToTheSharedWebRunHelperWithTheirOwnClientType() {
        assertEquals(1, countOccurrences(readSource("BbjRunBuiAction"), "buildWebRunCommandLine(file, project, \"BUI\")"),
                "BbjRunBuiAction must delegate to the shared web-run helper with client type \"BUI\"");
        assertEquals(1, countOccurrences(readSource("BbjRunDwcAction"), "buildWebRunCommandLine(file, project, \"DWC\")"),
                "BbjRunDwcAction must delegate to the shared web-run helper with client type \"DWC\"");
    }

    @Test
    void guiActionCallsTheArgumentHelperExactlyOnceInsideANullGuard() {
        String text = readSource("BbjRunGuiAction");
        assertEquals(1, countOccurrences(text, "getConfigPathArg()"),
                "BbjRunGuiAction must call getConfigPathArg() exactly once");
        int callIndex = text.indexOf("getConfigPathArg()");
        int guardIndex = text.indexOf("configPath != null", callIndex);
        assertTrue(guardIndex > callIndex,
                "BbjRunGuiAction must guard the returned argument against null before adding it");
    }
}
