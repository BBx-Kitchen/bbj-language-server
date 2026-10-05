package com.basis.bbj.intellij.actions;

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
 * Pins the shape of the Denumber action: it enables itself only from the editor's own text and file
 * type, it keeps the request and both future waits off the dispatch thread, it never saves the
 * file, it words no outcome of its own, and it is registered next to Compile in both menus with no
 * default keystroke. A regression in any of these fails the build instead of failing in the IDE.
 */
class BbjDenumberActionSourceGuardTest {

    private static final Path ACTION_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjDenumberAction.java")
            .toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
            .toAbsolutePath();

    private static String readSource(Path path) {
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

    /** Drops comment/javadoc lines so a rationale sentence can't trip a "zero times" assertion. */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    /** The {@code update} method body: from its declaration to the next {@code @Override}. */
    private static String updateMethod(String text) {
        int start = text.indexOf("public void update(");
        assertTrue(start >= 0, "update( is not declared in BbjDenumberAction.java");
        int end = text.indexOf("@Override", start);
        assertTrue(end > start, "no @Override follows update( in BbjDenumberAction.java");
        return text.substring(start, end);
    }

    /** This action's own {@code <action ...>} element in plugin.xml. */
    private static String ownPluginElement(String text) {
        int idIndex = text.indexOf("id=\"bbj.denumber\"");
        assertTrue(idIndex >= 0, "action declaration not found -- guard would pass vacuously on a mis-resolved file");
        int open = text.lastIndexOf("<action", idIndex);
        assertTrue(open >= 0, "opening <action tag not found before the declared id");
        int close = text.indexOf("</action>", idIndex);
        assertTrue(close > idIndex, "closing </action> tag not found after the declared id");
        return text.substring(open, close);
    }

    @Test
    void updateRunsOnTheBackgroundThread() {
        String text = readSource(ACTION_SOURCE);

        assertEquals(1, countOccurrences(text, "ActionUpdateThread.BGT"),
                "the action must declare the background update thread exactly once");
    }

    @Test
    void updateGatesOnTheResolvedFileTypeNotTheExtension() {
        String update = withoutCommentLines(updateMethod(readSource(ACTION_SOURCE)));

        assertTrue(update.contains("BbjFileVisibility.isBbjProgramFileTypeName("),
                "update must gate on the resolved BBj file type");
        assertEquals(0, countOccurrences(update, "getExtension"),
                "update must never look at a file extension: config.bbx would count as a program");
    }

    @Test
    void updateReadsTheEditorTextWithoutCopyingIt() {
        String text = withoutCommentLines(readSource(ACTION_SOURCE));
        String update = updateMethod(text);

        assertEquals(1, countOccurrences(update, "LineNumbering.isLineNumberedSource("),
                "update must ask the line-number detector exactly once");
        assertTrue(update.contains("getImmutableCharSequence()"),
                "update must hand the detector the document's immutable char sequence");
        assertEquals(0, countOccurrences(text, "getText()"),
                "the action must never copy the document text");
    }

    @Test
    void aBbjFileIsVisibleAndEnabledByTheDetectorAndEverythingElseIsHidden() {
        String update = withoutCommentLines(updateMethod(readSource(ACTION_SOURCE)));

        assertTrue(update.contains("setVisible(true)"),
                "an unnumbered BBj file must still show the item");
        assertTrue(update.contains("setEnabled(LineNumbering.isLineNumberedSource("),
                "the enabled state of a BBj file must come from the line-number detector");
        assertEquals(1, countOccurrences(update, "setEnabledAndVisible(false)"),
                "no editor, no project, a non-BBj file or the config file must hide the item exactly once");
    }

    @Test
    void theRequestRunsInsideTheBackgroundBodyAfterTheOffDispatchAssertion() {
        String text = readSource(ACTION_SOURCE);

        int taskIndex = text.indexOf("Task.Backgroundable");
        int assertIndex = text.indexOf("assertIsNonDispatchThread()");
        int serverIndex = text.indexOf("BbjComposerService.server(");
        int requestIndex = text.indexOf("server.denum(new DenumParams(");

        assertTrue(taskIndex >= 0, "Task.Backgroundable is not present in BbjDenumberAction.java");
        assertTrue(assertIndex >= 0, "assertIsNonDispatchThread() is not present in BbjDenumberAction.java");
        assertTrue(serverIndex >= 0, "BbjComposerService.server( is not present in BbjDenumberAction.java");
        assertTrue(requestIndex >= 0, "server.denum(new DenumParams( is not present in BbjDenumberAction.java");
        assertEquals(1, countOccurrences(text, "assertIsNonDispatchThread()"),
                "the assertion must appear exactly once");
        assertEquals(1, countOccurrences(text, "server.denum(new DenumParams("),
                "exactly one denumber request may be sent per click");
        assertTrue(taskIndex < assertIndex, "the assertion must be inside the background body");
        assertTrue(assertIndex < serverIndex, "the assertion must run before the first blocking call");
        assertTrue(serverIndex < requestIndex, "the server is resolved before the request is sent");
    }

    @Test
    void oneDeadlineCoversServerResolutionAndTheRequestAndATimeoutCancelsTheRequest() {
        String text = withoutCommentLines(readSource(ACTION_SOURCE));

        assertEquals(1, countOccurrences(text, "System.nanoTime() + TimeUnit.SECONDS.toNanos(DENUM_TIMEOUT_SECONDS)"),
                "the deadline must be computed once, from the single timeout constant");
        assertEquals(2, countOccurrences(text, ".get(remainingNanos(deadline), TimeUnit.NANOSECONDS)"),
                "both the server lookup and the request must wait only for the remaining time");
        assertEquals(0, countOccurrences(text, ".get(DENUM_TIMEOUT_SECONDS"),
                "no wait may restart the full timeout");
        assertTrue(text.contains("request.cancel(true)"),
                "a timed-out request must be cancelled");
    }

    @Test
    void aCancelledRequestIsReportedAsATransportFailureNotLeftToEscape() {
        String text = withoutCommentLines(readSource(ACTION_SOURCE));

        assertEquals(1, countOccurrences(text, "catch (CancellationException ex)"),
                "a request cancelled by a server stop or restart must be caught");
        assertTrue(text.indexOf("catch (CancellationException ex)") > text.indexOf("Task.Backgroundable"),
                "the catch must sit inside the background task");
        assertTrue(text.contains("import java.util.concurrent.CancellationException;"),
                "the unchecked exception must be the java.util.concurrent one");
    }

    @Test
    void theClientNeverSavesTheFileOrReadsTheResult() {
        String text = withoutCommentLines(readSource(ACTION_SOURCE));

        assertEquals(0, countOccurrences(text, "saveDocument("), "the action must never save a document");
        assertEquals(0, countOccurrences(text, "saveAllDocuments("), "the action must never save documents");
        assertEquals(0, countOccurrences(text, "DenumResult"),
                "the action must never read or word the server's answer");
    }

    @Test
    void onlyATransportFailureShowsANotification() {
        String text = withoutCommentLines(readSource(ACTION_SOURCE));

        assertEquals(1, countOccurrences(text, "NotificationType.ERROR"),
                "the one balloon must be an error");
        assertEquals(0, countOccurrences(text, "NotificationType.INFORMATION"),
                "the client must not announce success");
        assertEquals(0, countOccurrences(text, "NotificationType.WARNING"),
                "the client must not word a warning of its own");
        assertEquals(1, countOccurrences(text, "createNotification("),
                "exactly one notification may be created");
        assertTrue(text.contains("StringUtil.escapeXmlEntities("),
                "the failure detail is rendered as HTML and must be escaped");
    }

    @Test
    void pluginXmlPlacesTheActionAfterCompileInBothMenusWithoutAKeystrokeOrProjectViewEntry() {
        String text = readSource(PLUGIN_XML);
        String element = ownPluginElement(text);

        assertTrue(text.indexOf("id=\"bbj.denumber\"") > text.indexOf("id=\"bbj.compile\""),
                "the action must be declared after the compile action it is placed relative to");
        assertTrue(element.contains("class=\"com.basis.bbj.intellij.actions.BbjDenumberAction\""),
                "plugin.xml must point the action id at BbjDenumberAction");
        assertTrue(element.contains("group-id=\"EditorPopupMenu\" anchor=\"after\" relative-to-action=\"bbj.compile\""),
                "the editor context menu entry must follow Compile");
        assertTrue(element.contains("group-id=\"ToolsMenu\" anchor=\"after\" relative-to-action=\"bbj.compile\""),
                "the Tools menu entry must follow Compile");
        assertEquals(0, countOccurrences(element, "keyboard-shortcut"),
                "the action must bind no default keystroke");
        assertFalse(element.contains("ProjectViewPopupMenu"),
                "the action must not appear in the Project View");
    }
}
