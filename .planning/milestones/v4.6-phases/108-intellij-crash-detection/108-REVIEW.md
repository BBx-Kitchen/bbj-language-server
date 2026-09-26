---
phase: 108-intellij-crash-detection
reviewed: 2026-09-25T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjStatusFeedSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProviderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java
  - documentation/docs/intellij/features.md
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 108: Code Review Report

**Reviewed:** 2026-09-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the crash-detection rework that makes LSP4IJ's unexpected-stop hook the sole crash
signal (`BbjLanguageServer.onUnexpectedStop` → `BbjServerService.reportUnexpectedExit` →
`applyCrashPolicy`), the `ExpectedStopGuard` restart-vs-crash filter, the status-feed split
(`BbjLanguageServerFactory` for display state, `BbjLanguageClient` for console-only logging), and
the UI surfaces that read the resulting flags (`BbjStatusBarWidget`,
`BbjServerCrashNotificationProvider`). I diffed every production file against its pre-phase-108
version to scope the review to what this phase actually changed, and traced every call site of
`requestRestart`/`clearCrashState` across the plugin.

The single-shot, time-boxed `ExpectedStopGuard` design and the `crashCount`/`autoRestartAbandoned`
state machine are sound in the common case and are backed by solid unit and source-guard tests.
However, two real concurrency/race defects survive in `BbjServerService`, both introduced by this
phase's diff (confirmed against the pre-phase-108 version): a documented-but-violated EDT-only
write invariant on the crash counters, and an unconditional disarm-on-timeout in `doRestart()`
that can mislabel a freshly, successfully restarted server as "crashed". Both directly undermine
the accuracy of the crash signal this phase exists to build. Two further quality issues
(a speculative but real stale-status arming gap, and undocumented duplication of the 30-second
window as freestanding string literals) are also noted.

## Critical Issues

### CR-01: Crash-state fields are written off the EDT, racing the EDT-only crash counter

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:65-81, 141-151, 252-299, 345-348`
**Issue:**

The class's own Javadoc, added in this phase's diff, states the invariant explicitly:

```java
/**
 * Read from the EDT ({@link #updateStatus}, {@link #applyCrashPolicy}), the gate's pooled
 * restart thread ({@link #doRestart}) and the editor banner provider, and written from the EDT
 * -- volatile so a read from any of those threads always sees the latest value.
 */
private volatile long lastCrashTime = 0;
private volatile int crashCount = 0;
private volatile boolean serverCrashed = false;
```

`applyCrashPolicy` (lines 252-299) honors this: it is reached only through
`reportUnexpectedExit`'s `invokeLater` hop, so its `crashCount++` and the compound
`now - lastCrashTime > CRASH_WINDOW_MS` check-then-reset both run serialized on the EDT.

But `clearCrashState()` (lines 141-151) does **not** honor it — it writes `serverCrashed`,
`crashCount`, and `autoRestartAbandoned` directly on the calling thread, with only the
`EditorNotifications` refresh deferred behind `invokeLater`:

```java
public void clearCrashState() {
    serverCrashed = false;
    crashCount = 0;
    autoRestartAbandoned = false;
    ApplicationManager.getApplication().invokeLater(() -> { ... });
}
```

`clearCrashState()` is called synchronously and unconditionally at the top of `requestRestart(long)`
(lines 345-348), *before* any EDT hop:

```java
public void requestRestart(long delayMs) {
    clearCrashState();
    requestGatedRestart(delayMs);
}
```

`requestRestart` is reachable from a non-EDT thread: `BbjLanguageClient.configReloadRequired`
(`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java:108-123`) calls
`service.requestRestart(BbjServerService.RESTART_DEBOUNCE_MS)` directly, with no `invokeLater`
wrapper, from whatever thread LSP4J delivers the `bbj/configReloadRequired` JSON-RPC notification
on (the LSP dispatch thread, not the EDT — confirmed by that class's own Javadoc: "Written from
the LSP dispatch thread ... and read from the EDT"). I confirmed by grepping every other call site
of `requestRestart`/`scheduleRestart` in `bbj-intellij/src/main/java` that this is the only
non-EDT call site; every other caller is a Swing `ActionListener`, a `NotificationAction`, or
`BbjSettingsConfigurable` (all EDT).

Concretely: if a config-reload notification arrives at roughly the same moment a crash is being
processed, `clearCrashState()` (LSP dispatch thread) can interleave with `applyCrashPolicy()`'s
non-atomic `crashCount++` (EDT) with no synchronization between them. `crashCount++` is a
read-modify-write; if `clearCrashState()`'s `crashCount = 0` lands between the EDT's read and
write, the increment is lost, corrupting the very counter the whole "second crash within 30s"
policy depends on. This was **not** a pre-existing property of the file: before this phase, these
fields were plain (non-`volatile`) and `clearCrashState()` ran from inside `doRestart()` on the
gate's pooled restart thread, not synchronously on whatever thread called `requestRestart`. This
phase moved the call and added the EDT-only invariant claim without actually enforcing it.

**Fix:** Dispatch the field mutations in `clearCrashState()` through the same
`ApplicationManager.getApplication().invokeLater(...)` hop already used for the notification
refresh, so all writes to `serverCrashed`/`crashCount`/`autoRestartAbandoned` genuinely happen only
on the EDT as documented:

```java
public void clearCrashState() {
    ApplicationManager.getApplication().invokeLater(() -> {
        serverCrashed = false;
        crashCount = 0;
        autoRestartAbandoned = false;
        if (project.isDisposed()) {
            return;
        }
        EditorNotifications.getInstance(project).updateAllNotifications();
    });
}
```
(Note this changes `requestRestart`'s ordering guarantee versus `requestGatedRestart`, since the
clear becomes asynchronous — that ordering needs to be re-established, e.g. by moving the
`requestGatedRestart` call inside the same `invokeLater` after the clear, so a caller's "restart
after clearing" contract still holds.)

---

### CR-02: `doRestart()` disarms the guard on the bounded-wait timeout even though the old process may not have died yet, mislabeling the newly-started server as crashed

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:397-429`
**Issue:**

```java
private void doRestart() {
    LanguageServerManager manager = LanguageServerManager.getInstance(project);
    ServerStatus statusBeforeStop = manager.getServerStatus(SERVER_ID);
    ...
    if (statusBeforeStop == ServerStatus.started
            || statusBeforeStop == ServerStatus.starting
            || statusBeforeStop == ServerStatus.stopping) {
        expectedStop.arm(System.currentTimeMillis());
    }
    try {
        manager.stop(SERVER_ID, new LanguageServerManager.StopOptions().setWillDisable(false));
        boolean stoppedInTime = BoundedWait.until(
            () -> isServerObservedDown(manager.getServerStatus(SERVER_ID)),
            STOP_WAIT_TIMEOUT_MS, STOP_WAIT_POLL_MS, System::currentTimeMillis, BoundedWait.SLEEPING);
        if (!stoppedInTime) {
            logToConsole("Timed out waiting for the language server to stop; starting anyway", ...);
            LOG.warn("Timed out after " + STOP_WAIT_TIMEOUT_MS + " ms waiting ...");
        }
    } finally {
        // The token only covers this restart's own stop -- disarm it here, once the stop has
        // completed or timed out, so a genuine crash later in the window is never swallowed.
        expectedStop.disarm();
        LOG.info("Starting the BBj language server; status before the start: " ...);
        manager.start(SERVER_ID);
    }
}
```

`BoundedWait.until` polls the reported *status*, not actual OS process death, with a 5-second
timeout (`STOP_WAIT_TIMEOUT_MS`). The `!stoppedInTime` branch, plus its own log messages,
acknowledge that the old process can still be alive when this method proceeds. Yet the very next
statement in the `finally` block unconditionally disarms `expectedStop` and starts a brand-new
server (a fresh `BbjLanguageServer` instance, per its own Javadoc: "LSP4IJ constructs a fresh
provider for every `start()`").

If the old OS process later actually terminates (the delayed death this timeout branch itself
anticipates), LSP4IJ's process listener fires the *old* provider's registered
`onUnexpectedStop()` (`BbjLanguageServer.java:108-123`), which calls
`BbjServerService.reportUnexpectedExit(pid, exitCode)` on the **same singleton** service instance
— there is no correlation between the reported pid/exit and which server generation it belongs to.
Because the guard was already disarmed, `expectedStop.classifyExit(...)` returns `CRASH`, and
`applyCrashPolicy` runs: it sets `serverCrashed = true` (and, depending on `crashCount`, may set
`autoRestartAbandoned = true` and abandon auto-restart) for what is, from the user's perspective, a
perfectly healthy, freshly started server. The status bar would show "BBj: Crashed" (or the
give-up banner) against a server that is running fine, and — if `crashCount` was already 1 from the
restart that triggered this — the plugin could abandon auto-restart entirely on the strength of a
stale, late report from the process it just intentionally replaced.

This is a real gap in exactly the mechanism this phase exists to make trustworthy ("the sole crash
signal"), and it is reachable whenever the language server process takes longer than 5 seconds to
actually exit after `stop()` is requested (slow shutdown under load, antivirus scanning, contended
I/O, etc.) — plausible in the field, not merely theoretical.

**Fix:** Either (a) extend the armed window to cover the actual worst-case shutdown latency rather
than disarming immediately after a timeout that the code already knows may not reflect reality, or
(b) tag `reportUnexpectedExit` reports with a generation/epoch identifier set at `doRestart()`
start time and incremented on every restart, so a report belonging to a superseded generation is
discarded regardless of the guard's armed/disarmed state:

```java
// sketch: only disarm/report for the still-current generation
private final AtomicLong restartGeneration = new AtomicLong();
...
long myGeneration = restartGeneration.incrementAndGet();
// BbjLanguageServer's onUnexpectedStop passes its own captured generation through to
// reportUnexpectedExit; applyCrashPolicy ignores reports whose generation < restartGeneration.get()
```

## Warnings

### WR-01: Arming the guard is gated on a possibly-stale `getServerStatus()` read rather than being unconditional before every stop

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:399-405`
**Issue:** `doRestart()` only calls `expectedStop.arm(...)` when
`manager.getServerStatus(SERVER_ID)` is `started`/`starting`/`stopping` at the moment it is read.
Arming when it turns out to be unnecessary is harmless (the token is one-shot and gets disarmed
unconsumed), but *not* arming when it was actually needed is not: if the reported status is stale
relative to the real process state (e.g. it still reads `stopped`/`none` while a wrapper/process
genuinely is about to be torn down by the `manager.stop()` call that follows), the resulting
unexpected-stop report from that very `stop()` call would have no armed token to match and would
be classified as a crash. The risk is asymmetric — a missed arm is far more damaging than a
spurious one — so gating the arm on a single status read is a needlessly fragile way to decide
whether to protect against it.
**Fix:** Arm unconditionally before every `manager.stop(...)` call in `doRestart()` (the token is
already one-shot and self-disarming, so there is no real cost to arming when it turns out not to
be needed), removing the `statusBeforeStop` conditional entirely.

### WR-02: The 30-second crash window is duplicated as independent, un-linked literals across four files

**File:**
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:61` (`CRASH_WINDOW_MS = 30_000`),
`bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java:27` (`DEFAULT_WINDOW_MS = 30000`),
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java:38`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java:82`,
`documentation/docs/intellij/features.md:203,223`
**Issue:** The "crashed twice within 30 seconds" behavior is described by two independently
declared numeric constants (`BbjServerService.CRASH_WINDOW_MS` and
`ExpectedStopGuard.DEFAULT_WINDOW_MS`, which happen to share the value `30000` today but represent
conceptually different windows — one gates crash counting, the other gates restart-stop
classification) plus three free-standing "30 seconds" string literals in user-facing text (the
banner, the status-bar tooltip, and the documentation page). Nothing ties any of these to
`CRASH_WINDOW_MS`. Changing the crash window in one place (e.g. tuning it based on field feedback)
silently leaves the other four in a stale, inconsistent state, and nothing in the test suite
guards against that drift.
**Fix:** Derive the user-facing strings from `BbjServerService.CRASH_WINDOW_MS` (e.g.
`(CRASH_WINDOW_MS / 1000) + " seconds"`, the way `applyCrashPolicy`'s own log lines already do at
lines 277-279) instead of hardcoding "30 seconds", and add a comment on
`ExpectedStopGuard.DEFAULT_WINDOW_MS` cross-referencing `CRASH_WINDOW_MS` to make the coincidence
explicit rather than accidental.

---

_Reviewed: 2026-09-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
