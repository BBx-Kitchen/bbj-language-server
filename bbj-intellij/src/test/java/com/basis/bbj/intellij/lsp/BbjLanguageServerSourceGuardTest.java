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
 * Source-guard fence for {@code BbjLanguageServer.java}: the resolver is named before the
 * command-line construction, the command line and its working-directory line are each built
 * exactly once, and -- since the start-failure notification was rewired onto the shared
 * presentation seam -- {@code notifyUnresolvedNodePath} takes a {@link
 * NodeExecutableResolver.Resolution} rather than a message {@code String}, derives its action set
 * and labels from {@link NodePresentation} exactly once each, runs every action through {@link
 * com.basis.bbj.intellij.NodeActions#perform}, and never reintroduces a literal-labelled action.
 */
class BbjLanguageServerSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageServer.java")
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

    @Test
    void launchFileContainsNoQuotedUnqualifiedExecutableNameLiteral() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "\"node\""));
    }

    @Test
    void resolverNamePrecedesTheCommandLineConstruction() {
        String text = readGuardedSource();
        int resolverIndex = text.indexOf("NodeExecutableResolver");
        int commandLineIndex = text.indexOf("new GeneralCommandLine(");
        assertTrue(resolverIndex >= 0, "NodeExecutableResolver is not referenced in the launch file");
        assertTrue(commandLineIndex >= 0, "new GeneralCommandLine( is not present in the launch file");
        assertTrue(resolverIndex < commandLineIndex,
                "NodeExecutableResolver must be named before the command-line construction");
    }

    @Test
    void commandLineIsConstructedExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "new GeneralCommandLine("));
    }

    @Test
    void workingDirectoryLineIsPresentExactlyOnceInItsOriginalForm() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "cmd.setWorkDirectory(new File(project.getBasePath()))"));
    }

    @Test
    void notifyUnresolvedNodePathTakesTheResolutionType() {
        String text = readGuardedSource();
        int declStart = text.indexOf("private static void notifyUnresolvedNodePath(");
        assertTrue(declStart >= 0, "notifyUnresolvedNodePath declaration not found");
        int declEnd = text.indexOf(") {", declStart);
        assertTrue(declEnd >= 0, "notifyUnresolvedNodePath declaration has no closing parameter list");
        String declaration = text.substring(declStart, declEnd);
        assertTrue(declaration.contains("NodeExecutableResolver.Resolution resolution"),
                "the declaration must take the resolution, not a message String");
    }

    @Test
    void notifyUnresolvedNodePathHasExactlyOneCallSitePassingTheResolution() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "notifyUnresolvedNodePath(project, resolution)"),
                "resolveNodePath's call site must pass the resolution, not the failure message, "
                        + "exactly once");
    }

    @Test
    void notifyUnresolvedNodePathBodyDerivesActionsFromTheSharedPresentationSeamExactlyOnceEach() {
        String text = readGuardedSource();
        String body = notifyUnresolvedNodePathBody(text);
        assertEquals(1, countOccurrences(body, "NodePresentation.bannerActions("),
                "the offered action set must come from NodePresentation exactly once");
        assertEquals(1, countOccurrences(body, "NodePresentation.actionLabel("),
                "every action label must come from NodePresentation exactly once");
    }

    @Test
    void theIdIteratingForHeaderPrecedesTheSingleAddAction() {
        String text = readGuardedSource();
        String body = notifyUnresolvedNodePathBody(text);
        assertEquals(1, countOccurrences(body, "notification.addAction("),
                "exactly one action must be added per notification build");
        int forIndex = body.indexOf("for (String actionId : NodePresentation.bannerActions(");
        int addActionIndex = body.indexOf("notification.addAction(");
        assertTrue(forIndex >= 0, "the id-iterating for header over the seam's actions was not found");
        assertTrue(forIndex < addActionIndex,
                "an action added outside the loop is an action the seam did not decide");
    }

    @Test
    void notifyUnresolvedNodePathBodyRunsExactlyOneActionThroughTheSharedBehaviourMapping() {
        String text = readGuardedSource();
        String body = notifyUnresolvedNodePathBody(text);
        assertEquals(1, countOccurrences(body, "NodeActions.perform("),
                "every offered action must run through the shared behaviour mapping exactly once");
    }

    @Test
    void noActionLabelLiteralSurvivesInTheCommentStrippedWholeFile() {
        String text = readGuardedSource();
        String stripped = stripComments(text);
        for (String actionId : List.of(
                NodePresentation.ACTION_DOWNLOAD,
                NodePresentation.ACTION_CONFIGURE_PATH,
                NodePresentation.ACTION_INSTALL_MANUALLY)) {
            String quotedLabel = "\"" + NodePresentation.actionLabel(actionId) + "\"";
            assertEquals(0, countOccurrences(stripped, quotedLabel),
                    "a literal-labelled action must not reappear: " + quotedLabel);
        }
    }

    /**
     * LSP4IJ's own handler must be forwarded to {@code super} unchanged and first; this plugin's
     * own handler is registered beside it exactly once, guarded by the registration flag so a
     * second call to this method on the same instance never adds a duplicate.
     */
    @Test
    void addUnexpectedServerStopHandlerForwardsToSuperOnceThenRegistersOwnHandlerOnceGuardedByTheFlag() {
        String stripped = stripComments(readGuardedSource());
        String body = bodyOf(stripped, "public void addUnexpectedServerStopHandler(");

        assertEquals(2, countOccurrences(body, "super.addUnexpectedServerStopHandler("),
                "the vendor's own handler and this plugin's own handler must both go through super");
        assertEquals(1, countOccurrences(body, "super.addUnexpectedServerStopHandler(handler)"),
                "LSP4IJ's own handler must be forwarded exactly once, unchanged");
        assertEquals(1, countOccurrences(body, "super.addUnexpectedServerStopHandler(this::onUnexpectedStop)"),
                "this plugin's own handler must be registered exactly once");

        int forwardIndex = body.indexOf("super.addUnexpectedServerStopHandler(handler)");
        int ownIndex = body.indexOf("super.addUnexpectedServerStopHandler(this::onUnexpectedStop)");
        assertTrue(forwardIndex < ownIndex,
                "LSP4IJ's own handler must be forwarded before this plugin's own handler is registered");

        int flagIndex = body.indexOf("ownStopHandlerRegistered");
        assertTrue(flagIndex >= 0 && flagIndex < ownIndex,
                "the registration guard flag must be checked before the own handler is registered");
    }

    /**
     * {@code stop()} must log before delegating to the vendor superclass, and delegate exactly
     * once -- the excerpt this line feeds shows whether a stop() came before or after the process
     * ended.
     */
    @Test
    void stopLogsBeforeDelegatingToSuperExactlyOnce() {
        String stripped = stripComments(readGuardedSource());
        String body = bodyOf(stripped, "public void stop()");

        assertEquals(1, countOccurrences(body, "super.stop()"),
                "stop() must delegate to the vendor superclass exactly once");
        int logIndex = body.indexOf("LOG.info(");
        int superIndex = body.indexOf("super.stop()");
        assertTrue(logIndex >= 0 && logIndex < superIndex, "stop() must log before calling super.stop()");
    }

    /**
     * The whole file reaches no vendor internals through reflection: no {@code setAccessible(},
     * no {@code getDeclaredField(}, no {@code getDeclaredMethod(} and no attempt to call the
     * package-private {@code isStopped(} directly.
     */
    @Test
    void theWholeFileReachesNoVendorInternalsThroughReflection() {
        String stripped = stripComments(readGuardedSource());
        assertEquals(0, countOccurrences(stripped, "setAccessible("));
        assertEquals(0, countOccurrences(stripped, "getDeclaredField("));
        assertEquals(0, countOccurrences(stripped, "getDeclaredMethod("));
        assertEquals(0, countOccurrences(stripped, "isStopped("));
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

    private static String notifyUnresolvedNodePathBody(String text) {
        return bodyOf(text, "private static void notifyUnresolvedNodePath(");
    }

    /**
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth. String literals, char literals, line comments, and block comments are skipped
     * while counting, so a brace character written inside any of those never perturbs the depth
     * count -- only braces that are actual Java syntax are counted. Copied from {@code
     * BbjMissingNodeNotificationSourceGuardTest} per this project's per-guard-private-helper
     * convention rather than shared, so each guard's scanner stays independently verifiable.
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
     * intact, using the same literal-aware state machine as {@link #bodyOf(String, String)}. This
     * is what lets {@link #noActionLabelLiteralSurvivesInTheCommentStrippedWholeFile()} assert
     * against quoted text without a javadoc sentence mentioning a label ever failing a structural
     * assertion, and without a scanner that is not literal-aware passing for the wrong reason --
     * this project has shipped that mistake before.
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
                        + "    void notifyUnresolvedNodePath() {\n"
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

        String body = bodyOf(source, "void notifyUnresolvedNodePath()");

        assertTrue(body.startsWith("{"), "body must start with the opening brace");
        assertTrue(body.endsWith("}"), "body must end with the matching closing brace");
        assertTrue(body.contains("System.out.println(message);"),
                "body must include statements that follow the brace-bearing literals");
        assertFalse(body.contains("trailingMethodNotPartOfBody"),
                "a brace-unaware scanner mis-locates the closing brace on unbalanced literal "
                        + "content and swallows the next method -- this must not happen");
    }

    @Test
    void stripCommentsRemovesCommentsButPreservesCommentLookingStringContent() {
        String source =
                "class Sample {\n"
                        + "    // a line comment with // nested slashes\n"
                        + "    void method() {\n"
                        + "        String looksLikeAComment ="
                        + " \"not a // comment and not a /* block */ either\";\n"
                        + "        /* a real block comment\n"
                        + "           spanning multiple lines */\n"
                        + "        System.out.println(looksLikeAComment);\n"
                        + "    }\n"
                        + "}\n";

        String stripped = stripComments(source);

        assertFalse(stripped.contains("nested slashes"), "the line comment must be removed");
        assertFalse(stripped.contains("a real block comment"), "the block comment must be removed");
        assertTrue(stripped.contains("not a // comment and not a /* block */ either"),
                "comment-looking text inside a string literal must survive stripping");
        assertTrue(stripped.contains("System.out.println(looksLikeAComment);"),
                "code following the stripped comments must survive");
    }
}
