---
phase: 86-intellij-interop-settings-targeted-refresh
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/BoundedWait.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/BoundedWaitTest.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 86: Code Review Report (Plan 86-05)

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Plan 86-05 closes UAT gap G-86-1 (a redundant restart cycle producing `JsonRpcException: Stream closed` spam) with three new/extended pieces: `ExpectedStopGuard` (classifies a live→stopped transition as not-a-stop / expected-restart-stop / crash), `BoundedWait` (a poll-until-true helper), and an in-flight rejection added to `RestartGate`. All three are small, dependency-free, and unit-tested with genuinely adversarial test cases (one-shot consumption, inclusive window boundary, concurrent classification, reentrant/cross-thread in-flight drop, exception-in-action cleanup). I traced `ExpectedStopGuard.classify`, `BoundedWait.until`, and `RestartGate.request`/`runGuarded` by hand against their test suites and found the implementations match their documented contracts and the observed test assertions; no defect in those three units.

The remaining risk is concentrated at the integration point in `BbjServerService`: the way `doRestart()` and `updateStatus()` feed state into the new guard, and one un-guarded exception path in the new bounded-wait sequence. Neither risk is proven to reproduce in production (both depend on LSP4IJ status-broadcast behavior this review can't observe), so both are filed as warnings rather than blockers. Two further quality/maintainability notes (info) round out the findings.

## Warnings

### WR-01: `updateStatus()` feeds `ExpectedStopGuard.classify()` a status field that is stale by one generation, creating a duplicate-broadcast misclassification risk

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:138-139, 195-196`

**Issue:** `classify(statusName, previousStatusName, nowMs)` is documented (and tested in `ExpectedStopGuardTest`) to receive the status that was live *immediately before* `statusName`. But `updateStatus()` passes `previousStatus.name()`, and the field-update order at the bottom of the method,

```java
previousStatus = currentStatus;
this.currentStatus = status;
```

means `previousStatus` is always set to what `currentStatus` held *two calls ago*, not one. In the common transition sequence (`started` → `stopping` → `stopped`), this off-by-one happens to self-correct: it "skips over" the transitional `stopping` broadcast and lands back on `started`/`starting`, which is presumably why the pre-existing direct comparison (`previousStatus == ServerStatus.started || previousStatus == ServerStatus.starting`, which this plan wrapped into `classify()` without changing which field is passed) has worked well enough in practice.

That self-correction only holds for exactly-one-hop sequences. Two consecutive `stopped` broadcasts with no real state change in between (a duplicate/echoed status event — plausible with multiple LSP4IJ listeners or a project re-sync, though not something this review can confirm from the files in scope) will still see `previousStatus` pointing at the *old* live state from before the first `stopped` event, so the second, spurious `stopped` broadcast gets classified as a fresh live→stopped transition (CRASH or EXPECTED_RESTART_STOP) instead of `NOT_A_STOP`. That can inflate `crashCount` on a no-op event, or spend/misreport an armed token that a real subsequent crash needed.

This is inherited behavior (the field and its update order predate this plan), but this plan is precisely the one that extracted and unit-tested the classification contract that this call site now violates by construction.

**Fix:** Pass the field that actually holds the true immediate predecessor. Track it explicitly, e.g. capture it before mutating state:

```java
String previousStatusName = currentStatus.name();
ExpectedStopGuard.StopKind stopKind =
    expectedStop.classify(status.name(), previousStatusName, System.currentTimeMillis());
```

and, since `ExpectedStopGuard.classify()` only checks `started`/`starting`, verify that the "skip over `stopping`" behavior this codebase currently relies on is still desired — if so, encode it explicitly (e.g. have `ExpectedStopGuard` accept a `stopping` predecessor by treating it as pass-through) rather than depending on an incidental field-update lag.

### WR-02: `doRestart()` has no exception handling around the bounded wait; a thrown exception silently strands the server stopped

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:263-284`

**Issue:** `doRestart()` calls `manager.stop(SERVER_ID)`, then `BoundedWait.until(() -> isServerObservedDown(manager.getServerStatus(SERVER_ID)), ...)`, then unconditionally `manager.start(SERVER_ID)`. If `manager.getServerStatus(SERVER_ID)` throws (e.g. an internal LSP4IJ error, or the server definition being removed mid-restart by a concurrent settings change), the exception propagates out of the `BooleanSupplier` passed to `BoundedWait.until`, out of `doRestart()`, and out of `RestartGate.runGuarded()`. `RestartGate`'s `finally` block correctly clears `restartInFlight` (verified by `RestartGateTest.whenTheRestartActionThrowsTheInFlightFlagIsClearedAnyway`), so the gate itself is not stuck — but `manager.start(SERVER_ID)` is never reached, and there is no `logToConsole` call on this path, so the user sees no explanation for why the server stayed down after a restart was requested.

**Fix:** Wrap the wait/start sequence so a failure is visible and, ideally, still attempts the start:

```java
try {
    boolean stoppedInTime = BoundedWait.until(
        () -> isServerObservedDown(manager.getServerStatus(SERVER_ID)),
        STOP_WAIT_TIMEOUT_MS, STOP_WAIT_POLL_MS, System::currentTimeMillis, BoundedWait.SLEEPING);
    if (!stoppedInTime) {
        logToConsole("Timed out waiting for the language server to stop; starting anyway",
            ConsoleViewContentType.SYSTEM_OUTPUT);
    }
} catch (RuntimeException e) {
    logToConsole("Error while waiting for the language server to stop; starting anyway: " + e.getMessage(),
        ConsoleViewContentType.ERROR_OUTPUT);
}
manager.start(SERVER_ID);
```

## Info

### IN-01: `BbjServerServiceRestartSourceGuardTest` enforces architecture via brittle substring counting

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java:83-209`

**Issue:** These tests read source files as raw text and assert on exact literal occurrence counts (e.g. `countOccurrences(text, "requestRestart(0)")`, `countOccurrences(text, "CRASH_RESTART_DELAY_MS")`, index-ordering of `"crashCount == 1"` vs `"requestRestart(CRASH_RESTART_DELAY_MS)"`). This style is already established elsewhere in the suite, so it's consistent with the codebase's conventions, but it is inherently fragile: any harmless reformatting (wrapping an argument list across lines, renaming a local variable that happens to contain the substring, adding a second legitimate reference to a constant) will fail the test without any behavioral regression, and conversely a semantically-equivalent but textually different violation (e.g. an alias method that calls `doRestart()` directly) would not be caught. Several of these assertions (e.g. `theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce`) are trying to pin down control flow that would be far more reliably captured by a behavioral test against `BbjServerService` (with a fake `LanguageServerManager`) than by text-position comparison.

**Fix:** Where feasible, prefer behavioral tests over textual ones for control-flow invariants (e.g. assert via a fake manager that `expectedStop.arm()` really is called before `stop()`, rather than comparing string indices). Keep the textual guards only for the "this exact call site/literal must exist" checks where no behavioral seam is practical.

### IN-02: `RestartGate.isRestartInFlight()` is public but only ever called from tests

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java:68-70`

**Issue:** `isRestartInFlight()` has no caller in `bbj-intellij/src/main/java`; it is exercised only by `RestartGateTest`. That's a reasonable way to assert internal state from tests, but leaving it as public production API without a doc note that it exists for test observability (or without an actual production consumer) grows the class's public surface without a corresponding use, and invites drift (a future caller might read it expecting a stronger guarantee than "true only for the duration of one specific `Runnable`'s execution").

**Fix:** Either wire a real production consumer (e.g. a status-bar tooltip showing "restart in progress"), or note in the Javadoc that the method is exposed for test observability, so a future reader doesn't need to grep for callers to understand why it exists.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
