package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence: {@code BbjMissingNodeNotificationProvider} must delegate its banner decision
 * to {@link NodeExecutableResolver#resolve} -- the same engine and the same seven-argument
 * configured/detected/cached fallback the language server's startup path uses -- rather than
 * branching inline or calling any second decision seam, and its sentence and action set must both
 * come from {@link NodePresentation}. This guard replaces the one that pinned the previous,
 * now-retired call shape, invalidated when the banner was switched onto the single engine.
 */
class BbjMissingNodeNotificationSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjMissingNodeNotificationProvider.java")
            .toAbsolutePath();

    private static String readGuardedSource() {
        Path resolved = GUARDED_SOURCE;
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

    /**
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth. String literals, char literals, line comments, and block comments are skipped
     * while counting, so a brace character written inside any of those never perturbs the depth
     * count -- only braces that are actual Java syntax are counted.
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

    private static String buildPanelBody(String text) {
        return bodyOf(text, "buildPanel(@NotNull Project project, @NotNull VirtualFile file)");
    }

    @Test
    void theVersionResolverPassedToTheEngineIsTheSharedCache() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "BbjNodeVersionCache.SESSION::getVersion"),
                "the version resolver passed to the resolver engine must be the shared cache");
    }

    @Test
    void theDetectorsVersionMethodIsNeverCalledDirectly() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "BbjNodeDetector.getNodeVersion("),
                "the stateless detector's version method must never be called directly -- routing "
                        + "through the shared cache is what keeps the banner and startup path to one "
                        + "spawn per unchanged path between them");
    }

    @Test
    void noSecondDecisionEngineSurvivesInTheProviderSource() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "NodeAvailability"),
                "the retired availability seam must not be referenced anywhere in the provider's "
                        + "source -- a revival is a test failure, not a silent second engine");
    }

    @Test
    void collectNotificationDataDelegatesToTheAvailabilitySeamExactlyOnceWithTheArgumentsInOrder() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "NodeExecutableResolver.resolve("),
                "buildPanel must delegate to the resolver engine exactly once");

        int resolveIndex = body.indexOf("NodeExecutableResolver.resolve(");
        int configuredPathIndex = body.indexOf("configuredPath,", resolveIndex);
        int detectedPathIndex = body.indexOf("detectedPath,", configuredPathIndex);
        int cachedPathIndex = body.indexOf("cachedPath", detectedPathIndex);
        int accessibilityIndex = body.indexOf(
                "BbjNodeDownloader.isNodeDataDirectoryAccessible(),", cachedPathIndex);
        int probeIndex = body.indexOf("NodeExecutableResolver.REAL_FILESYSTEM,", accessibilityIndex);
        int versionCacheIndex = body.indexOf(
                "BbjNodeVersionCache.SESSION::getVersion,", probeIndex);
        int meetsMinimumIndex = body.indexOf(
                "BbjNodeDetector::meetsMinimumVersion)", versionCacheIndex);

        assertTrue(configuredPathIndex >= 0 && detectedPathIndex >= 0 && cachedPathIndex >= 0
                        && accessibilityIndex >= 0 && probeIndex >= 0 && versionCacheIndex >= 0
                        && meetsMinimumIndex >= 0,
                "the seven arguments to NodeExecutableResolver.resolve( must appear in the "
                        + "documented order: configured path, detected path, cached path, the "
                        + "cache-accessibility fact, the probe, the version cache, then the "
                        + "minimum-version check");
    }

    @Test
    void theBannerTextAndActionSetBothComeFromTheSharedPresentationSeam() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "NodePresentation.bannerText("),
                "the banner sentence must come from NodePresentation exactly once");
        assertEquals(1, countOccurrences(body, "NodePresentation.bannerActions("),
                "the offered action set must come from NodePresentation exactly once");

        int bannerTextIndex = body.indexOf("NodePresentation.bannerText(");
        int returnNullIndex = body.indexOf("return null;", bannerTextIndex);
        int returnFileEditorIndex = body.indexOf("return fileEditor ->", bannerTextIndex);
        int bannerActionsIndex = body.indexOf("NodePresentation.bannerActions(", bannerTextIndex);

        assertTrue(bannerTextIndex >= 0 && returnNullIndex >= 0,
                "a return null; guarded by NodePresentation.bannerText( yielding null must be present");
        assertTrue(returnNullIndex < returnFileEditorIndex,
                "the no-banner early return must fire before the panel-building fallthrough, so no "
                        + "other statement of consequence sits between the check and its return");
        assertTrue(bannerActionsIndex > returnFileEditorIndex,
                "the action set must be derived inside the panel-building closure, after the "
                        + "no-banner early return has already been decided");
    }

    @Test
    void createActionLabelIsCalledExactlyOnceInsideTheBannerActionsLoop() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "panel.createActionLabel("),
                "exactly one action label must be created per banner build");

        int forIndex = body.indexOf("for (String actionId : NodePresentation.bannerActions(");
        int createActionLabelIndex = body.indexOf("panel.createActionLabel(");
        assertTrue(forIndex >= 0, "the id-iterating for header over the seam's actions was not found");
        assertTrue(forIndex < createActionLabelIndex,
                "an action label created outside the loop is an action the seam did not decide");
    }

    @Test
    void bannerLoopDerivesLabelAndBehaviourFromTheSharedSeamExactlyOnceEach() {
        String text = readGuardedSource();
        String body = buildPanelBody(text);

        assertEquals(1, countOccurrences(body, "NodePresentation.actionLabel("),
                "every action label must come from NodePresentation exactly once");
        assertEquals(1, countOccurrences(body, "NodeActions.perform("),
                "every offered action must run through the shared behaviour mapping exactly once");
    }

    @Test
    void noActionLabelLiteralOrInlineBehaviourSurvivesInTheCommentStrippedWholeFile() {
        String stripped = stripComments(readGuardedSource());
        for (String actionId : List.of(NodePresentation.ACTION_DOWNLOAD,
                NodePresentation.ACTION_CONFIGURE_PATH, NodePresentation.ACTION_INSTALL_MANUALLY)) {
            String quotedLabel = "\"" + NodePresentation.actionLabel(actionId) + "\"";
            assertEquals(0, countOccurrences(stripped, quotedLabel),
                    "a literal-labelled action must not reappear: " + quotedLabel);
        }
        assertEquals(0, countOccurrences(stripped, "downloadNodeAsync("),
                "the download behaviour must run through NodeActions, not be inlined here");
        assertEquals(0, countOccurrences(stripped, "showSettingsDialog("),
                "the settings-navigation behaviour must run through NodeActions, not be inlined here");
        assertEquals(0, countOccurrences(stripped, "BrowserUtil.browse("),
                "the manual-install behaviour must run through NodeActions, not be inlined here");
    }

    /**
     * Removes line and block comments from {@code source} while leaving string and char literals
     * intact, using the same literal-aware state machine as {@link #bodyOf(String, String)}. Copied
     * from {@code BbjLanguageServerSourceGuardTest} per this project's per-guard-private-helper
     * convention, so each guard's scanner stays independently verifiable.
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

    @Test
    void bodyOfIgnoresBracesInsideStringAndCharLiterals() {
        String source =
                "class Sample {\n"
                        + "    void buildPanel(@NotNull Project project, @NotNull VirtualFile file) {\n"
                        + "        String message = \"resolved as {0}\";\n"
                        + "        char brace = '{';\n"
                        + "        String another = \"unbalanced } and { characters\";\n"
                        + "        System.out.println(message);\n"
                        + "    }\n"
                        + "\n"
                        + "    void trailingMethodNotPartOfBody() {\n"
                        + "        System.out.println(\"must not be included\");\n"
                        + "    }\n"
                        + "}\n";

        String body = buildPanelBody(source);

        assertTrue(body.startsWith("{"), "body must start with the opening brace");
        assertTrue(body.endsWith("}"), "body must end with the matching closing brace");
        assertTrue(body.contains("System.out.println(message);"),
                "body must include statements that follow the brace-bearing literals");
        assertFalse(body.contains("trailingMethodNotPartOfBody"),
                "a brace-unaware scanner mis-locates the closing brace on unbalanced literal "
                        + "content and swallows the next method -- this must not happen");
    }
}
