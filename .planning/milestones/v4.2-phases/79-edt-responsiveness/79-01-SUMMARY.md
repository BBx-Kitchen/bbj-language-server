---
phase: 79-edt-responsiveness
plan: 01
subsystem: infra
tags: [intellij, gradle, alarm, concurrency, junit5, edt]

# Dependency graph
requires:
  - phase: 78-build-test-foundation
    provides: JDK 17 toolchain, checksum-pinned Gradle wrapper, fail-fast LS-bundle check — every `./gradlew test` invocation in this plan depends on it
provides:
  - Plain-Java `Scheduler`/`RestartGate` seam under `com.basis.bbj.intellij.concurrency`
  - Production `AlarmScheduler` adapter over `com.intellij.util.Alarm` (POOLED_THREAD)
  - `BbjServerService.requestRestart(long)` as the single guarded restart entry point
  - All eight language-server restart triggers funneled through the gate
  - First-crash restart delay scheduled off the EDT (no `Thread.sleep` remains)
affects: [79-02-edt-responsiveness, 79-03-edt-responsiveness, 83-regression-test-hardening]

# Actuals (#2632)
actuals:
  tokens: 9700
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scheduler seam (plain interface, no platform imports) fronting an AlarmScheduler production adapter — reused by 79-02's KeystrokeDebouncer"
    - "Coalescing gate: cancelAll() then schedule() collapses overlapping triggers into one action"
    - "Whole-file-text source-guard JUnit tests asserting call-site counts (requestRestart(0) present, .restart()/Thread.sleep absent) as a regression fence against a raw restart path reappearing"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/Scheduler.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/AlarmScheduler.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjRestartServerAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java

key-decisions:
  - "Redirected all six external call sites in Task 1's commit instead of only BbjRestartServerAction: Gradle compiles the whole module before any test runs, and making doRestart() private broke the other five callers, so Rule 3 (blocking-issue auto-fix) required moving them together. Task 2's own acceptance criteria and source-guard coverage for those five sites were completed as originally scoped."
  - "The in-file eighth restart site (the crash-balloon Restart NotificationAction inside notifyCrash()) was also redirected through requestRestart(0), per the plan's flagged assumption #2 — leaving it would keep a raw, un-coalesced stop+start path alive and contradict #539's 'all triggers'. This is a superset of D-06, not a deviation."

patterns-established:
  - "Time-scheduling seam (Scheduler interface, ManualScheduler test double, AlarmScheduler production adapter) as the standard way to make Alarm-based debounce/coalescing logic unit-testable without IntelliJ platform test fixtures"

requirements-completed: [EDT-04, EDT-05]

coverage:
  - id: D1
    description: "requestRestart(long) is the single guarded entry point; every one of the eight restart triggers (restart action, crash notification, both status-bar widgets, refresh Java classes, Node download-success notification, in-file crash-balloon action, first-crash auto-restart) reaches the language server only through it"
    requirement: "EDT-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "Two overlapping restart requests within one pending window produce exactly one stop+start; the adjacency, ordering, and zero-delay edges all coalesce correctly through RestartGate"
    requirement: "EDT-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java"
        status: pass
    human_judgment: false
  - id: D3
    description: "The first-crash auto-restart delay (1000 ms) is scheduled on the restart gate's pooled-thread Alarm instead of blocking the EDT inside Thread.sleep; no EDT sleep remains anywhere in BbjServerService"
    requirement: "EDT-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java (Tests 6-7)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java (Thread.sleep count == 0)"
        status: pass
    human_judgment: false

duration: ~25min (task execution) + close-out
completed: 2026-09-04
status: complete
---

# Phase 79 Plan 01: Guarded Restart Funnel Summary

**Every IntelliJ language-server restart trigger now funnels through `BbjServerService.requestRestart(long)`, a coalescing `RestartGate` over a plain-Java `Scheduler` seam, and the first-crash recovery delay is scheduled on that gate's pooled-thread `Alarm` instead of blocking the EDT with `Thread.sleep`.**

## Performance

- **Tasks:** 3 completed
- **Files modified:** 13 (6 created, 7 modified)
- **Commits:** 3 task commits + this close-out metadata commit

## Accomplishments

- New `com.basis.bbj.intellij.concurrency` package: `Scheduler` (plain interface, no platform imports), `AlarmScheduler` (production adapter over `com.intellij.util.Alarm`, `POOLED_THREAD`), and `RestartGate` (`cancelAll()` then `schedule()` coalescing).
- `BbjServerService.requestRestart(long)` is the single public guarded restart entry point; the former public no-arg restart method is now `private doRestart()`.
- All eight restart triggers — the restart action, the crash notification provider, both status-bar widgets, refresh Java classes, the Node download-success notification, the in-file crash-balloon Restart action, and the first-crash auto-restart — call `requestRestart(0)` or `requestRestart(CRASH_RESTART_DELAY_MS)`. Zero raw `.restart()` call sites remain outside `BbjServerService`.
- The first-crash recovery's `Thread.sleep(1000)`-inside-`invokeLater` block is gone; a single `requestRestart(CRASH_RESTART_DELAY_MS)` (1000 ms) call replaces it, scheduled on the pooled-thread Alarm behind the gate. `clearCrashState()` and its `invokeLater` around `EditorNotifications` are unchanged (D-08).
- `RestartGateTest` (7 tests) proves coalescing, the adjacency edge, the ordering edge, the zero-delay edge, and the 1000 ms crash-delay behavior including a manual trigger merging into a pending first-crash delay.
- `BbjServerServiceRestartSourceGuardTest` (8 assertions) is a whole-file-text regression fence: every external site contains `requestRestart(0)` and zero `.restart()`; `BbjServerService.java` contains `doRestart()` exactly once, `public void restart()` zero times, `new Alarm(` zero times, and `Thread.sleep` zero times.
- Whole-suite `./gradlew test` green (previous executor's session ended at 117 tests / 0 failures; this close-out re-ran the two targeted test classes and confirmed `BUILD SUCCESSFUL`).

## Task Commits

Each task was committed atomically by the prior executor session:

1. **Task 1: End-to-end guarded restart via coalescing gate** - `d0b4b56` (feat)
2. **Task 2: Redirect every remaining restart trigger and close the raw-restart door** - `27c7059` (test)
3. **Task 3: Schedule the first-crash delay instead of sleeping on the EDT** - `852516b` (fix)

**Plan metadata:** (this commit, created by the close-out continuation)

_Note: this is a tracer+tdd plan; each task's commit bundles its RED test additions and GREEN implementation together rather than splitting them into separate `test`/`feat` commits per task, consistent with how the prior sessions on this plan committed._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/Scheduler.java` - plain-Java scheduling seam interface
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/AlarmScheduler.java` - production adapter over `com.intellij.util.Alarm`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java` - coalescing restart gate
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` - `requestRestart(long)`, private `doRestart()`, `CRASH_RESTART_DELAY_MS`, scheduled crash-delay
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjRestartServerAction.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - redirected to `requestRestart(0)`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java` - deterministic Scheduler test double
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java` - behavioral coverage (7 tests)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java` - source-guard coverage (8 assertions)

## Decisions Made

- Task 1's commit redirected all six external call sites, not only `BbjRestartServerAction` as the plan's task boundary suggested — a Rule 3 blocking-issue auto-fix, since Gradle compiles the whole module before any test runs and making `doRestart()` private broke the other five callers immediately. Task 2's acceptance criteria (its own source-guard test) were still delivered as scoped.
- The in-file eighth restart site (the crash-balloon `NotificationAction("Restart")` inside `notifyCrash()`) was redirected through `requestRestart(0)` in Task 2, per the plan's flagged assumption — a superset of D-06, matching #539's "all triggers" literally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Redirected five additional call sites one task early**
- **Found during:** Task 1 (End-to-end guarded restart)
- **Issue:** Making the former public no-arg restart method `private doRestart()` in `BbjServerService` broke compilation for the five other call sites the plan scoped to Task 2, since Gradle compiles the whole module before running any test.
- **Fix:** Redirected all six external sites to `requestRestart(0)` in Task 1's commit; Task 2 still delivered its own scoped acceptance criteria (the source-guard test) against the already-redirected sites.
- **Files modified:** `BbjNodeDownloader.java`, `BbjRefreshJavaClassesAction.java`, `BbjJavaInteropStatusBarWidget.java`, `BbjServerCrashNotificationProvider.java`, `BbjStatusBarWidget.java` (plus the originally-scoped `BbjRestartServerAction.java`)
- **Verification:** `./gradlew test` green after Task 1; Task 2's `BbjServerServiceRestartSourceGuardTest` subsequently confirmed all six sites and closed the raw-restart door.
- **Committed in:** d0b4b56 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the module to compile; no scope creep — the redirected sites' full acceptance criteria and dedicated test coverage still landed in Task 2 as planned.

## Issues Encountered

None during task execution. This close-out continuation found the three task commits already complete and verified (target test run: `BUILD SUCCESSFUL`, no `FAILED` lines) but the prior executor session had stalled before writing `79-01-SUMMARY.md` and updating STATE.md/ROADMAP.md — this SUMMARY and the associated metadata commit finish that close-out.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared `Scheduler` interface and `AlarmScheduler` adapter are ready for plan 79-02's `KeystrokeDebouncer` to build on (D-16).
- `BbjServerService.requestRestart(long)` is the stable signature plan 83's EDT regression coverage (BUILD-04) will test against.
- EDT-04 and EDT-05 are satisfied; phase 79's remaining requirements (EDT-01, EDT-02, EDT-03, EDT-06) are owned by plans 79-02 and 79-03.

## Self-Check: PASSED

- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/Scheduler.java
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/AlarmScheduler.java
- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
- FOUND commit d0b4b56 (feat(79-01): guarded restart entry point via coalescing RestartGate)
- FOUND commit 27c7059 (test(79-01): close the raw-restart door with a source guard)
- FOUND commit 852516b (fix(79-01): schedule first-crash restart instead of sleeping on the EDT)
- CONFIRMED: `./gradlew test --tests 'com.basis.bbj.intellij.concurrency.RestartGateTest' --tests 'com.basis.bbj.intellij.lsp.BbjServerServiceRestartSourceGuardTest'` → BUILD SUCCESSFUL

---
*Phase: 79-edt-responsiveness*
*Completed: 2026-09-04*
