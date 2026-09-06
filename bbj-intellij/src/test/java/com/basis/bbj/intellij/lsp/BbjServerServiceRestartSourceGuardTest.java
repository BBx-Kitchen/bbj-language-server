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
 * Source guard: every restart trigger reaches the language server only through
 * {@code BbjServerService.requestRestart(long)}. No file outside {@code BbjServerService} may
 * regain a raw {@code .restart()} call, and the service itself must route through the
 * {@code RestartGate}/{@code AlarmScheduler} seam rather than a raw {@code Alarm} (EDT-05, #539).
 */
class BbjServerServiceRestartSourceGuardTest {

    private static final Path[] EXTERNAL_RESTART_SITES = {
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "ui", "BbjRestartServerAction.java").toAbsolutePath(),
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "ui", "BbjServerCrashNotificationProvider.java").toAbsolutePath(),
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "ui", "BbjStatusBarWidget.java").toAbsolutePath(),
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "ui", "BbjJavaInteropStatusBarWidget.java").toAbsolutePath(),
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "actions", "BbjRefreshJavaClassesAction.java").toAbsolutePath(),
            Paths.get("src", "main", "java", "com", "basis", "bbj", "intellij",
                    "BbjNodeDownloader.java").toAbsolutePath(),
    };

    /**
     * The settings-apply flow (see {@code BbjServerService}'s class Javadoc) legitimately uses
     * the debounced {@code scheduleRestart()} rather than a zero-delay {@code requestRestart(0)}
     * call, so it is fenced by its own test below rather than folded into
     * {@link #EXTERNAL_RESTART_SITES}, which asserts the zero-delay literal specifically.
     */
    private static final Path SETTINGS_CONFIGURABLE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij",
            "BbjSettingsConfigurable.java").toAbsolutePath();

    private static final Path SERVER_SERVICE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui", "BbjServerService.java")
            .toAbsolutePath();

    private static final Path ALARM_SCHEDULER = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij",
            "concurrency", "AlarmScheduler.java")
            .toAbsolutePath();

    private static String readGuardedSource(Path resolved) {
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

    @Test
    void everyExternalRestartSiteCallsRequestRestartAndNeverTheRawRestartMethod() {
        for (Path site : EXTERNAL_RESTART_SITES) {
            String text = readGuardedSource(site);
            assertTrue(countOccurrences(text, "requestRestart(0)") >= 1,
                    site + " must call requestRestart(0) at least once");
            assertEquals(0, countOccurrences(text, ".restart()"),
                    site + " must contain zero raw .restart() call sites");
        }
    }

    @Test
    void theSettingsApplyFlowCallsScheduleRestartAndNeverTheRawRestartMethod() {
        String text = readGuardedSource(SETTINGS_CONFIGURABLE);
        assertTrue(countOccurrences(text, "scheduleRestart()") >= 1
                        || countOccurrences(text, "requestRestart(") >= 1,
                SETTINGS_CONFIGURABLE + " must call scheduleRestart() or requestRestart( at least once");
        assertEquals(0, countOccurrences(text, ".restart()"),
                SETTINGS_CONFIGURABLE + " must contain zero raw .restart() call sites");
    }

    @Test
    void serverServiceExposesExactlyOnePrivateDoRestartAndNoPublicRestart() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(1, countOccurrences(text, "private void doRestart()"));
        assertEquals(0, countOccurrences(text, "public void restart()"));
    }

    @Test
    void serverServiceCallsRequestRestartFromAtLeastTwoSites() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertTrue(countOccurrences(text, "requestRestart(") >= 2,
                "requestRestart( must be called from at least the crash balloon and scheduleRestart()");
    }

    @Test
    void serverServiceBuildsTheSchedulerThroughTheAlarmSchedulerAdapterOnly() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(1, countOccurrences(text, "new AlarmScheduler(this)"));
        assertEquals(0, countOccurrences(text, "new Alarm("),
                "the raw Alarm construction must live only in AlarmScheduler, not BbjServerService");
    }

    @Test
    void alarmSchedulerUsesThePooledThreadExactlyOnce() {
        String text = readGuardedSource(ALARM_SCHEDULER);
        assertEquals(1, countOccurrences(text, "Alarm.ThreadToUse.POOLED_THREAD"));
    }

    @Test
    void serverServiceNeverSleepsTheCallingThread() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(0, countOccurrences(text, "Thread.sleep"),
                "no code path in BbjServerService may sleep the calling thread, including comments");
    }

    @Test
    void crashRestartDelayConstantIsDeclaredOnceUsedOnceAndIsOneThousandMillis() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(2, countOccurrences(text, "CRASH_RESTART_DELAY_MS"),
                "CRASH_RESTART_DELAY_MS must appear exactly twice: its declaration and its single use");
        assertTrue(text.contains("CRASH_RESTART_DELAY_MS = 1000"),
                "CRASH_RESTART_DELAY_MS must be declared with value 1000");
    }

    @Test
    void theScheduledCrashRestartIsInsideTheFirstCrashBranch() {
        String text = readGuardedSource(SERVER_SERVICE);
        int firstCrashBranchIndex = text.indexOf("crashCount == 1");
        int scheduledRestartIndex = text.indexOf("requestRestart(CRASH_RESTART_DELAY_MS)");
        assertTrue(firstCrashBranchIndex >= 0, "crashCount == 1 is not present in BbjServerService.java");
        assertTrue(scheduledRestartIndex >= 0,
                "requestRestart(CRASH_RESTART_DELAY_MS) is not present in BbjServerService.java");
        assertTrue(firstCrashBranchIndex < scheduledRestartIndex,
                "the scheduled crash restart must be inside the first-crash branch");
    }
}
