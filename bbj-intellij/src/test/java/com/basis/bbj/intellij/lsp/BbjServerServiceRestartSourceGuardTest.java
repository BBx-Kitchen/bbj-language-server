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

    private static final Path EXPECTED_STOP_GUARD = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij",
            "concurrency", "ExpectedStopGuard.java")
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
        int scheduledRestartIndex = text.indexOf("requestGatedRestart(CRASH_RESTART_DELAY_MS)");
        assertTrue(firstCrashBranchIndex >= 0, "crashCount == 1 is not present in BbjServerService.java");
        assertTrue(scheduledRestartIndex >= 0,
                "requestGatedRestart(CRASH_RESTART_DELAY_MS) is not present in BbjServerService.java");
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
    void reportUnexpectedExitConsultsTheGuardBeforeItsFirstInvokeLaterHopAndNamesTheExpectedVerdictOnce() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "public void reportUnexpectedExit(");

        int classifyIndex = body.indexOf("expectedStop.classifyExit(");
        int firstInvokeLaterIndex = body.indexOf("invokeLater(");
        assertTrue(classifyIndex >= 0, "expectedStop.classifyExit( is not present in reportUnexpectedExit");
        assertTrue(firstInvokeLaterIndex >= 0, "invokeLater( is not present in reportUnexpectedExit");
        assertTrue(classifyIndex < firstInvokeLaterIndex,
                "the guard's verdict must be taken before the first invokeLater hop");
        assertEquals(2, countOccurrences(body, "invokeLater("),
                "reportUnexpectedExit must hop to the EDT exactly twice: the expected-stop console "
                        + "line and the crash hop");
        assertEquals(1, countOccurrences(body, "StopKind.EXPECTED_RESTART_STOP"),
                "the expected-restart verdict constant must appear exactly once");
    }

    @Test
    void boundedWaitUntilIsCalledExactlyOnce() {
        String text = readGuardedSource(SERVER_SERVICE);
        assertEquals(1, countOccurrences(text, "BoundedWait.until("),
                "BoundedWait.until( must appear exactly once so a future edit cannot add a second unbounded wait");
    }

    @Test
    void updateStatusBodyNoLongerClassifiesOrTouchesTheCrashCounter() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "public void updateStatus(@NotNull ServerStatus status)");

        assertEquals(0, countOccurrences(body, "classify"),
                "updateStatus must no longer classify anything -- the hook decides crashes now");
        assertEquals(0, countOccurrences(body, "StopKind"),
                "updateStatus must not reference StopKind");
        assertEquals(0, countOccurrences(body, "crashCount"),
                "updateStatus must not touch the crash counter");
        assertEquals(0, countOccurrences(body, "applyCrashPolicy("),
                "updateStatus must not call applyCrashPolicy");
    }

    @Test
    void applyCrashPolicyIsDeclaredOnceAndCalledOnlyFromReportUnexpectedExit() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        assertEquals(2, countOccurrences(stripped, "applyCrashPolicy("),
                "applyCrashPolicy( must appear exactly twice: its declaration and its single call site");

        String body = bodyOf(stripped, "public void reportUnexpectedExit(");
        assertEquals(1, countOccurrences(body, "applyCrashPolicy("),
                "the one call to applyCrashPolicy must sit inside reportUnexpectedExit");
    }

    @Test
    void crashCountIsIncrementedOnlyInsideApplyCrashPolicyWhichNeverClearsCrashStateOrCallsUserRestart() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        assertEquals(1, countOccurrences(stripped, "crashCount++"),
                "crashCount++ must appear exactly once in the whole file");

        String body = bodyOf(stripped, "private void applyCrashPolicy(");
        assertEquals(1, countOccurrences(body, "crashCount++"),
                "applyCrashPolicy must be the sole place incrementing the crash counter");
        assertEquals(1, countOccurrences(body, "requestGatedRestart(CRASH_RESTART_DELAY_MS)"),
                "applyCrashPolicy's first-crash branch must call requestGatedRestart, not requestRestart");
        assertEquals(0, countOccurrences(body, "requestRestart("),
                "applyCrashPolicy must never call the user-restart entry point, or it would clear crash state");
        assertEquals(0, countOccurrences(body, "clearCrashState("),
                "applyCrashPolicy must never clear crash state -- only a user-initiated restart may");
    }

    @Test
    void restartGateRequestIsCalledOnlyFromRequestGatedRestart() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        assertEquals(1, countOccurrences(stripped, "restartGate.request("),
                "restartGate.request( must appear exactly once in the whole file");

        String body = bodyOf(stripped, "private void requestGatedRestart(long delayMs)");
        assertEquals(1, countOccurrences(body, "restartGate.request("),
                "the single restartGate.request( call must sit inside requestGatedRestart");
    }

    @Test
    void requestRestartClearsCrashStateBeforeReachingTheGate() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "public void requestRestart(long delayMs)");

        assertEquals(1, countOccurrences(body, "clearCrashState()"),
                "requestRestart must clear crash state exactly once");
        int clearIndex = body.indexOf("clearCrashState()");
        int gateIndex = body.indexOf("requestGatedRestart(delayMs)");
        assertTrue(gateIndex >= 0, "requestRestart must call requestGatedRestart(delayMs)");
        assertTrue(clearIndex < gateIndex, "crash state must be cleared before the gated restart is requested");
    }

    /**
     * {@code doRestart} must never clear crash state, and must disarm the guard only when its own
     * stop completed in time: a token left armed after a clean restart would later absorb a
     * genuine crash, while a timed-out stop keeps the token (and its noted pid) so a late exit of
     * the old process is still told apart from a crash of the new one.
     */
    @Test
    void doRestartNeverClearsCrashStateAndDisarmsOnlyAfterAStopThatCompletedInTime() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "private void doRestart()");

        assertEquals(0, countOccurrences(body, "clearCrashState("),
                "doRestart must never clear crash state -- a crash-triggered restart must keep the counter");
        assertEquals(1, countOccurrences(body, "expectedStop.disarm()"),
                "doRestart must disarm the guard exactly once");
        assertEquals(1, countOccurrences(body, "if (stoppedInTime) {"),
                "doRestart's disarm must be gated on the stop having completed in time");
        assertTrue(body.indexOf("if (stoppedInTime) {") < body.indexOf("expectedStop.disarm()"),
                "the disarm must sit inside the stoppedInTime branch");

        int armIndex = body.indexOf("expectedStop.arm(");
        int stopIndex = body.indexOf(MANAGER_STOP_CALL);
        assertTrue(armIndex >= 0 && stopIndex >= 0, "expectedStop.arm( and " + MANAGER_STOP_CALL
                + " must both be present");
        assertTrue(armIndex < stopIndex, "the guard must be armed before every stop, unconditionally");
    }

    /**
     * The pid correlation this restart depends on is supplied from {@code BbjLanguageServer#stop()}
     * via {@code noteStoppingPid}, not read directly by {@code doRestart} -- {@code
     * LanguageServerManager} exposes no pid, only the connection provider instance does.
     */
    @Test
    void noteStoppingPidForwardsStraightToTheGuardAndIsNeverCalledFromDoRestart() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));

        String noteBody = bodyOf(stripped, "public void noteStoppingPid(@Nullable Long pid)");
        assertEquals(1, countOccurrences(noteBody, "expectedStop.notePid(pid)"),
                "noteStoppingPid must forward the pid straight to the guard");

        String doRestartBody = bodyOf(stripped, "private void doRestart()");
        assertEquals(0, countOccurrences(doRestartBody, "noteStoppingPid("),
                "doRestart must never call noteStoppingPid itself -- only BbjLanguageServer#stop() does");
    }

    @Test
    void expectedStopGuardKeepsOnlyTheExitClassifierAndNoImports() {
        String stripped = stripComments(readGuardedSource(EXPECTED_STOP_GUARD));
        assertTrue(countOccurrences(stripped, "classifyExit(") >= 1,
                "ExpectedStopGuard must still expose classifyExit(");
        assertEquals(0, countOccurrences(stripped, "classify(String"),
                "the three-argument status-name classifier must be gone");
        assertEquals(0, countOccurrences(stripped, "NOT_A_STOP"),
                "NOT_A_STOP must be gone -- the guard only answers armed-or-not now");
        assertEquals(0, countOccurrences(stripped, "import "),
                "ExpectedStopGuard must stay plain Java with no imports");
    }

    /**
     * Locates {@code declarationMarker} in {@code source}, then returns the substring from that
     * declaration's opening brace through its matching closing brace (inclusive), by counting
     * brace depth. String literals, char literals, line comments, and block comments are skipped
     * while counting. Copied from {@code BbjLanguageServerSourceGuardTest} per this project's
     * per-guard-private-helper convention rather than shared, so each guard's scanner stays
     * independently verifiable.
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
     * intact, using the same literal-aware state machine as {@link #bodyOf(String, String)}.
     * Copied from {@code BbjLanguageServerSourceGuardTest} per this project's
     * per-guard-private-helper convention.
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

    /**
     * {@code clearCrashState()} writes its three crash-state fields only inside the
     * {@code invokeLater(...)} argument, so they change on the EDT like the crash counter's other
     * writes; no write may sit in the method body outside that hop.
     */
    @Test
    void clearCrashStateWritesAllFieldsOnlyInsideTheInvokeLaterLambda() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "public void clearCrashState()");

        int[] span = invokeLaterArgumentSpan(body);
        String inside = body.substring(span[0], span[1]);
        String outside = body.substring(0, span[0]) + body.substring(span[1]);

        for (String field : new String[] {"serverCrashed", "crashCount", "autoRestartAbandoned"}) {
            assertEquals(1, countOccurrences(inside, field + " ="),
                    field + " must be written exactly once, inside the invokeLater argument");
            assertEquals(0, countOccurrences(outside, field + " ="),
                    field + " must not be written outside the invokeLater argument");
        }
    }

    /**
     * {@code requestRestart(long)} clears crash state, then queues the gated restart through
     * {@code invokeLater}, so the restart runs after the clear on the EDT; a direct call would
     * race the clear it now depends on.
     */
    @Test
    void requestRestartDispatchesRequestGatedRestartThroughInvokeLater() {
        String stripped = stripComments(readGuardedSource(SERVER_SERVICE));
        String body = bodyOf(stripped, "public void requestRestart(long delayMs)");

        int[] span = invokeLaterArgumentSpan(body);
        String inside = body.substring(span[0], span[1]);
        String before = body.substring(0, span[0]);
        String after = body.substring(span[1]);

        assertEquals(1, countOccurrences(inside, "requestGatedRestart(delayMs)"),
                "requestGatedRestart(delayMs) must be called inside the invokeLater argument");
        assertEquals(0, countOccurrences(before + after, "requestGatedRestart("),
                "requestGatedRestart must not be called directly from requestRestart");
        assertEquals(1, countOccurrences(before, "clearCrashState()"),
                "clearCrashState() must be called once, before the gated restart is queued");
    }

    /**
     * Returns {@code [start, end)} of the argument list of the first {@code invokeLater(} in
     * {@code body}, excluding the parentheses themselves. String and char literals are skipped so
     * a bracket inside one cannot end the span early.
     */
    private static int[] invokeLaterArgumentSpan(String body) {
        int call = body.indexOf("invokeLater(");
        assertTrue(call >= 0, "the method must dispatch through invokeLater");
        int open = call + "invokeLater".length();
        int depth = 0;
        for (int i = open; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '"' || c == '\'') {
                i = endOfLiteral(body, i, c);
            } else if (c == '(') {
                depth++;
            } else if (c == ')' && --depth == 0) {
                return new int[] {open + 1, i};
            }
        }
        fail("unbalanced invokeLater( argument list");
        return null;
    }

    private static int endOfLiteral(String text, int quoteIndex, char quote) {
        for (int i = quoteIndex + 1; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\\') {
                i++;
            } else if (c == quote) {
                return i;
            }
        }
        return text.length();
    }
}
