package com.basis.bbj.intellij.ui;

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
 * Structural pin for the poll-gate threading contract added to {@code BbjJavaInteropService}
 * (#593). A data race here shows up as an occasionally-stale gate in manual testing, never as a
 * red test -- this guard pins the contract structurally instead: the gate flags stay {@code
 * volatile}, every re-arm/pause/immediate-check decision routes through {@link
 * com.basis.bbj.intellij.interop.InteropPollPolicy#decide}, the pooled-thread poll path never
 * reads the editor, and the pause branch never touches status or broadcasts.
 */
class BbjJavaInteropPollGateSourceGuardTest {

    private static final Path BBJ_JAVA_INTEROP_SERVICE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui",
            "BbjJavaInteropService.java")
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

    /**
     * Strips line comments and block comments (including javadoc) from {@code text} before any
     * assertion counts occurrences, so a prose comment mentioning a guarded token can neither
     * satisfy nor break an assertion. Each guard keeps its own private copy of this helper.
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

    @Test
    void gateFlagsStayVolatile() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        assertEquals(2, countOccurrences(text, "private volatile boolean"),
                "BbjJavaInteropService must declare exactly two volatile boolean fields -- "
                        + "bbjFileSelected and gateWasOpen -- so the EDT-write/pooled-thread-read "
                        + "split cannot silently lose its volatile keyword");
    }

    @Test
    void selectionAndFileEditorManagerWiringOccurExactlyOnce() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        assertEquals(1, countOccurrences(text, "BbjFileVisibility.showsForSelection("),
                "BbjFileVisibility.showsForSelection( must be called exactly once");
        assertEquals(1, countOccurrences(text, "FileEditorManagerListener.FILE_EDITOR_MANAGER"),
                "FileEditorManagerListener.FILE_EDITOR_MANAGER must be subscribed exactly once");
    }

    @Test
    void everyDecisionRoutesThroughThePolicyExactlyThreeTimes() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        assertEquals(3, countOccurrences(text, "InteropPollPolicy.decide("),
                "InteropPollPolicy.decide( must be called exactly three times -- once for "
                        + "TICK_COMPLETED, once for SELECTION_CHANGED, once for SERVER_STARTED -- "
                        + "so no path can cancel the alarm without a matching path that re-arms it");
    }

    @Test
    void pooledThreadPollPathNeverReadsTheEditor() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        int methodIndex = text.indexOf("private void checkConnection(");
        assertTrue(methodIndex >= 0, "checkConnection() must be present");
        int tailIndex = text.indexOf("private void updateStatus(", methodIndex);
        assertTrue(tailIndex >= 0, "updateStatus() must follow checkConnection()");

        String body = text.substring(methodIndex, tailIndex);
        assertFalse(body.contains("getSelectedFiles("),
                "checkConnection() runs on the pooled-thread Alarm and must never call "
                        + "getSelectedFiles() -- found it in the pooled-thread poll path");
        assertFalse(body.contains("FileEditorManager.getInstance("),
                "checkConnection() runs on the pooled-thread Alarm and must never read "
                        + "FileEditorManager -- found it in the pooled-thread poll path");
    }

    @Test
    void pauseBranchTouchesNoStatusAndBroadcastsNothing() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        int applyDecisionIndex = text.indexOf("private void applyDecision(");
        assertTrue(applyDecisionIndex >= 0, "applyDecision() must be present");
        int pauseIndex = text.indexOf("case PAUSE ->", applyDecisionIndex);
        assertTrue(pauseIndex >= 0, "applyDecision() must have a PAUSE branch");
        int nextCaseIndex = text.indexOf("case NO_CHANGE ->", pauseIndex);
        assertTrue(nextCaseIndex >= 0, "applyDecision() must have a NO_CHANGE branch after PAUSE");

        String pauseBranch = text.substring(pauseIndex, nextCaseIndex);
        assertFalse(pauseBranch.contains("updateStatus("),
                "the PAUSE branch must not call updateStatus() -- pausing changes no state");
        assertFalse(pauseBranch.contains("broadcastStatus("),
                "the PAUSE branch must not call broadcastStatus() -- pausing broadcasts nothing");
    }
}
