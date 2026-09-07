package com.basis.bbj.intellij.refresh;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for {@link com.basis.bbj.intellij.actions.BbjRefreshJavaClassesAction}
 * (#632): a live IDE session cannot prove "no automatic restart path remains" -- it is a
 * structural property of the source, not observable runtime behavior a single manual click
 * would catch. This test pins that property as a text check on the source, mirroring {@code
 * BbjLanguageClientRestartSourceGuardTest}'s whole-file-string-assertion convention. This fence
 * is what keeps the full-restart behaviour a user-chosen fallback rather than an automatic path.
 */
class BbjRefreshJavaClassesActionSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjRefreshJavaClassesAction.java")
        .toAbsolutePath();

    /** The only restart call this action may reach, from inside the balloon's fallback action. */
    private static final String IMMEDIATE_RESTART_CALL = "requestRestart(0)";

    /** The coalescing entry point other restart triggers use; this action must never schedule one. */
    private static final String DEBOUNCED_RESTART_ENTRY_POINT = "scheduleRestart(";

    /** LSP4IJ's server-manager type; this action must reach the server only through the composer service. */
    private static final String LSP4IJ_SERVER_MANAGER_TYPE = "LanguageServerManager";

    private static final String NOTIFICATION_CONSTRUCTION = "createNotification(";
    private static final String BALLOON_FLAG_REFERENCE = "presentation.balloon";
    private static final String CONSOLE_WRITE_CALL = "logToConsole(";
    private static final String OFF_DISPATCH_ASSERTION = "assertIsNonDispatchThread()";
    private static final String GUARD_ACQUIRE = "tryAcquire(";
    private static final String GUARD_RELEASE = "RefreshInFlightGuard.SESSION.release(";
    private static final String CLASS_DECLARATION = "public final class BbjRefreshJavaClassesAction";

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

    @Test
    void theImmediateRestartCallAppearsExactlyOnceReachableOnlyFromTheBalloonAction() {
        String text = stripComments(readGuardedSource());

        assertEquals(1, countOccurrences(text, IMMEDIATE_RESTART_CALL),
            "BbjRefreshJavaClassesAction must call " + IMMEDIATE_RESTART_CALL + " exactly once -- "
                + "the only place the plugin's full-restart behaviour is still reachable from this action");

        int restartIndex = text.indexOf(IMMEDIATE_RESTART_CALL);
        int notificationActionIndex = text.indexOf("new NotificationAction(");
        assertTrue(notificationActionIndex >= 0, "notification-action construction not found");
        assertTrue(restartIndex > notificationActionIndex,
            "the restart call must sit inside the notification action's body, after its construction");
    }

    @Test
    void noDebouncedRestartEntryPointAndNoDirectLsp4ijServerManagerReference() {
        String text = stripComments(readGuardedSource());

        assertEquals(0, countOccurrences(text, DEBOUNCED_RESTART_ENTRY_POINT),
            "BbjRefreshJavaClassesAction must never schedule a coalesced restart");
        assertEquals(0, countOccurrences(text, LSP4IJ_SERVER_MANAGER_TYPE),
            "BbjRefreshJavaClassesAction must reach the server only through BbjComposerService, "
                + "never " + LSP4IJ_SERVER_MANAGER_TYPE + " directly");
    }

    @Test
    void exactlyOneNotificationIsBuiltBehindTheBalloonGate() {
        String text = stripComments(readGuardedSource());

        assertEquals(1, countOccurrences(text, NOTIFICATION_CONSTRUCTION),
            "exactly one notification must be built");

        int notificationIndex = text.indexOf(NOTIFICATION_CONSTRUCTION);
        int balloonFlagIndex = text.indexOf(BALLOON_FLAG_REFERENCE);
        assertTrue(balloonFlagIndex >= 0, "presentation.balloon reference not found");
        assertTrue(notificationIndex > balloonFlagIndex,
            "the notification must be built only after the balloon flag has gated it");
    }

    @Test
    void exactlyTwoConsoleWritesMatchingTheRenderPathAndTheAlreadyRunningPath() {
        String text = stripComments(readGuardedSource());

        assertEquals(2, countOccurrences(text, CONSOLE_WRITE_CALL),
            "expected exactly two console writes: the render path's outcome line and the "
                + "already-running path's note");
    }

    @Test
    void theOffDispatchThreadAssertionAppearsExactlyOnce() {
        String text = stripComments(readGuardedSource());

        assertEquals(1, countOccurrences(text, OFF_DISPATCH_ASSERTION),
            "the background task's first statement must assert it is off the dispatch thread");
    }

    @Test
    void theGuardsAcquireAndReleaseEachAppearExactlyOnce() {
        String text = stripComments(readGuardedSource());

        assertEquals(1, countOccurrences(text, GUARD_ACQUIRE),
            "the in-flight guard must be acquired exactly once");
        assertEquals(1, countOccurrences(text, GUARD_RELEASE),
            "the in-flight guard must be released exactly once, inside a finally block");
    }

    @Test
    void sanityAnchorTheClassDeclarationPrecedesTheNotificationActionConstruction() {
        String text = stripComments(readGuardedSource());

        int classIndex = text.indexOf(CLASS_DECLARATION);
        int notificationActionIndex = text.indexOf("new NotificationAction(");
        assertTrue(classIndex >= 0, "class declaration not found -- guard would pass vacuously on a mis-resolved file");
        assertTrue(notificationActionIndex >= 0, "notification-action construction not found");
        assertTrue(classIndex < notificationActionIndex,
            "class declaration must precede the notification-action construction");
    }
}
