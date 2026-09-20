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

    /**
     * The stop call site, matched without its closing parenthesis so the guards below stay pinned
     * to the call's position while its options argument remains visible to the dedicated test that
     * asserts what those options are.
     */
    private static final String MANAGER_STOP_CALL = "manager.stop(SERVER_ID,";

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

    @Test
    void doRestartArmsTheGuardBeforeRequestingTheStop() {
        String text = readGuardedSource(SERVER_SERVICE);
        int armIndex = text.indexOf("expectedStop.arm(");
        int stopIndex = text.indexOf(MANAGER_STOP_CALL);
        assertTrue(armIndex >= 0, "expectedStop.arm( is not present in BbjServerService.java");
        assertTrue(stopIndex >= 0, MANAGER_STOP_CALL + " is not present in BbjServerService.java");
        assertTrue(armIndex < stopIndex, "the guard must be armed before the stop is requested");
    }

    @Test
    void doRestartRequestsTheStopBeforeTheBoundedWait() {
        String text = readGuardedSource(SERVER_SERVICE);
        int stopIndex = text.indexOf(MANAGER_STOP_CALL);
        int waitIndex = text.indexOf("BoundedWait.until(");
        assertTrue(stopIndex >= 0, MANAGER_STOP_CALL + " is not present in BbjServerService.java");
        assertTrue(waitIndex >= 0, "BoundedWait.until( is not present in BbjServerService.java");
        assertTrue(stopIndex < waitIndex, "the stop must be requested before the bounded wait");
    }

    /**
     * The stop must never be requested through the one-argument {@code stop(String)} convenience.
     * That overload passes {@code StopOptions.DEFAULT}, which carries {@code willDisable=true} and
     * therefore disables the server definition as well as stopping it — and the matching start only
     * re-enables it as a side effect of restarting an already-registered wrapper. A restart that
     * loses that race leaves the definition disabled, every later start silently filtered out, and
     * no cure short of an IDE restart, because the enabled flag is a plain in-memory field.
     */
    @Test
    void theStopIsRequestedWithoutDisablingTheServerDefinition() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(0, countOccurrences(text, "manager.stop(SERVER_ID)"),
                "the one-argument stop also disables the server definition and must not be used");
        assertEquals(1, countOccurrences(text, "setWillDisable(false)"),
                "the stop must explicitly opt out of disabling the server definition, exactly once");
    }

    /**
     * The start must be unconditional. A stop that throws (or a bounded wait that is interrupted)
     * must not be able to end a restart with the server left down and no further trigger.
     */
    @Test
    void theStartRunsEvenWhenTheStopFails() {
        String text = readGuardedSource(SERVER_SERVICE);
        int finallyIndex = text.indexOf("} finally {", text.indexOf(MANAGER_STOP_CALL));
        int startIndex = text.indexOf("manager.start(SERVER_ID)");
        assertTrue(finallyIndex >= 0, "the stop in doRestart must be wrapped in a try/finally");
        assertTrue(startIndex > finallyIndex, "the start must sit inside that finally block");
    }

    @Test
    void doRestartWaitsBeforeStartingAgain() {
        String text = readGuardedSource(SERVER_SERVICE);
        int waitIndex = text.indexOf("BoundedWait.until(");
        int startIndex = text.indexOf("manager.start(SERVER_ID)");
        assertTrue(waitIndex >= 0, "BoundedWait.until( is not present in BbjServerService.java");
        assertTrue(startIndex >= 0, "manager.start(SERVER_ID) is not present in BbjServerService.java");
        assertTrue(waitIndex < startIndex, "the bounded wait must happen before the start");
    }

    @Test
    void theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce() {
        String text = readGuardedSource(SERVER_SERVICE);
        int classifyIndex = text.indexOf("expectedStop.classify(");
        int firstCrashBranchIndex = text.indexOf("crashCount == 1");
        assertTrue(classifyIndex >= 0, "expectedStop.classify( is not present in BbjServerService.java");
        assertTrue(firstCrashBranchIndex >= 0, "crashCount == 1 is not present in BbjServerService.java");
        assertTrue(classifyIndex < firstCrashBranchIndex,
                "the classification call must appear before the first-crash branch");
        assertEquals(1, countOccurrences(text, "StopKind.CRASH"),
                "the classifier's CRASH verdict constant must appear exactly once so the crash branch "
                        + "cannot be silently deleted");
    }

    /**
     * The classifier must receive the state the server was in immediately before this transition,
     * not a value staler than that. {@code currentStatus} is still the true one-behind value at
     * the point {@code classify(...)} is called, because it is only overwritten near the end of
     * {@code updateStatus}. This guard is expected to FAIL until the call site is corrected to
     * read {@code currentStatus} instead of the (removed) stale field -- it pins the fix, it does
     * not yet describe the source it runs against.
     */
    @Test
    void theClassifierIsFedTheOneBehindFromState() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(1, countOccurrences(text, "expectedStop.classify(status.name(), currentStatus.name(),"),
                "the classifier must receive the state the server was in immediately before this transition");
        assertEquals(0, countOccurrences(text, "previousStatus"),
                "the stale from-state field must be gone so no future edit can reach for it again");
    }

    @Test
    void boundedWaitUntilIsCalledExactlyOnce() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(1, countOccurrences(text, "BoundedWait.until("),
                "BoundedWait.until( must appear exactly once so a future edit cannot add a second unbounded wait");
    }
}
