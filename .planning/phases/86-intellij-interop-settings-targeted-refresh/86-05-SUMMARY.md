---
phase: 86-intellij-interop-settings-targeted-refresh
plan: 05
subsystem: intellij-lsp-lifecycle
tags: [intellij, lsp4ij, restart, concurrency]
requires:
  - phase: 86-intellij-interop-settings-targeted-refresh
    provides: "prior 86-0x work on targeted refresh / settings"
provides:
  - "ExpectedStopGuard: one-shot, time-boxed classification (NOT_A_STOP / EXPECTED_RESTART_STOP / CRASH) that lets BbjServerService distinguish a deliberate restart's stop from a genuine crash"
  - "RestartGate in-flight rejection: a restart request landing while one is already executing is dropped and reported, never silently queued"
  - "BoundedWait: a bounded poll-until-true helper doRestart uses to observe the server actually down before starting it again, so one restart's stop and start phases cannot overlap"
affects: []
actuals:
  tokens: 10300
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Platform-free seam classes (no com.intellij, no vendor LSP4IJ import) driven by plain JUnit 5, matching the existing ConfigReloadPresentation/RefreshInFlightGuard convention"
    - "Status transitions passed as String status names rather than the vendor ServerStatus enum, so the classification seam has zero coupling to the vendor type"
key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/BoundedWait.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/BoundedWaitTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
key-decisions:
  - "LanguageServerManager.stop(String) returns void in the pinned LSP4IJ 0.21.0 (confirmed by javap against the shipped jar and against the 0.21.0 sources), so the diagnosed 'await stop's future' fix is not implementable as written. Replaced with a bounded status barrier: doRestart() polls manager.getServerStatus(SERVER_ID) via BoundedWait.until (5s budget, 50ms poll) until it reports the server down (null/stopped/none, all treated alike), then starts; a timeout logs one console line and starts anyway rather than blocking indefinitely."
  - "A restart request that lands while a restart scheduled by RestartGate is already executing is dropped, not queued. Queueing was considered and rejected: a queued follow-up would turn any future regression in stop classification into an unbounded restart loop, since each spurious restart would queue another behind it. A dropped request can at worst cost the caller one restart, always safe to repeat; request(long) now returns a boolean so the caller (BbjServerService.requestRestart) can surface the drop as a console line instead of silently swallowing it."
  - "The expected-stop token (ExpectedStopGuard.arm/classify) is one-shot (consumed by the first live-to-stopped transition it explains), time-boxed to a 30s default window, and armed only when doRestart observes the server was actually live (started/starting/stopping) before requesting the stop -- arming when already down would leave a token nobody consumes. All three limits are independently covered by ExpectedStopGuardTest."
patterns-established:
  - "BoundedWait.SLEEPING is the sole Thread.sleep call site in bbj-intellij; production polling waits are expressed as BoundedWait.until(condition, timeoutMs, pollMs, clockMs, pause) so every future bounded wait can reuse the same platform-free, fake-clock-testable shape."
requirements-completed: [CFG-04]
coverage:
  - id: D1
    description: "A deliberate restart (Settings Apply, manual restart, config-reload, Node download-success, the refresh action's D-14 fallback) is no longer misread as a crash: the stop is classified as expected, no redundant second requestRestart fires, and the console records a restart stop instead of an unexpected one."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java#stoppedAfterStartedWhileArmedIsAnExpectedRestartStop"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java#doRestartArmsTheGuardBeforeRequestingTheStop"
        status: pass
    human_judgment: true
    human_judgment_rationale: "Automated coverage proves the classification and wiring; the actual UAT property (no JsonRpcException/Stream closed noise in the live IDE log) can only be re-checked by hand against a real BBjServices install, per the plan's own <verification> block."
  - id: D2
    description: "A genuine unexpected stop is still classified as a crash and still auto-restarts once, then abandons auto-restart and raises the crash balloon on the second crash inside the crash window -- unchanged for every non-deliberate transition."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java#stoppedAfterStartedWithNothingArmedIsACrash"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java#theScheduledCrashRestartIsInsideTheFirstCrashBranch"
        status: pass
    human_judgment: false
  - id: D3
    description: "A restart request arriving while a restart is already executing is dropped instead of starting a second, overlapping stop/start cycle; the drop is reported by the gate and written to the console, never silently swallowed."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java#aRequestFromAnotherThreadWhileTheActionIsBlockedMidRestartIsDroppedAndTheActionRunsOnce"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java#aRequestIssuedFromInsideTheRestartActionItselfIsDropped"
        status: pass
    human_judgment: false
  - id: D4
    description: "doRestart does not call start until the stop it just requested has been observed to finish, bounded at five seconds, so the stop and start phases of one restart cannot overlap; on timeout it starts anyway and says so."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/BoundedWaitTest.java#aConditionThatNeverHoldsReturnsFalseAndPauseArgumentsSumToNoMoreThanTheTimeout"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java#doRestartWaitsBeforeStartingAgain"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every one of those decisions lives in a platform-free seam exercised by plain JUnit 5 -- the classification, the in-flight rejection and the bounded wait each have real behavioural tests, not a source guard alone."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/BoundedWaitTest.java"
        status: pass
    human_judgment: false
  - id: D6
    description: "The plugin's LSP4IJ coupling surface is unchanged: the new seams import no vendor type and the eleven-file allowlist still passes without an edit."
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java#theCouplingSurfaceIsExactlyTheElevenFilesInTheAllowlist"
        status: pass
      - kind: command
        ref: "grep -c com.redhat.devtools.lsp4ij ExpectedStopGuard.java BoundedWait.java -> 0, 0"
        status: pass
    human_judgment: false
duration: 40min
completed: 2026-09-07
status: complete
---

# Phase 86 Plan 05: Deliberate LSP4IJ restarts no longer misfire a crash-triggered second restart Summary

Closed UAT gap G-86-1: the `JsonRpcException: java.io.IOException: Stream closed` noise on
`Refresh Java Classes` traced back to two pre-existing `BbjServerService` defects that together
guaranteed overlapping stop/start cycles on every deliberate restart. This plan adds a one-shot,
time-boxed `ExpectedStopGuard` so a deliberate stop is classified separately from a genuine crash,
extends `RestartGate` to reject a restart request that lands while one is already executing, and
adds a bounded `BoundedWait` barrier so `doRestart` observes the server actually stopped before
starting it again.

## Performance

- Duration: ~40 minutes
- Tasks: 3/3 complete
- Files: 8 (4 created, 4 modified)
- Commits: 3

## Accomplishments

- `ExpectedStopGuard` (new): plain-Java, one-shot, 30s-windowed classifier
  (`NOT_A_STOP` / `EXPECTED_RESTART_STOP` / `CRASH`) wired into `BbjServerService.updateStatus`
  and armed by `doRestart` before `manager.stop(...)` whenever the server was observed live.
- `RestartGate` extended with an in-flight rejection: `request(long)` now returns `boolean`, a
  stable wrapper `Runnable` holds the flag for the whole restart execution (set/cleared inside the
  monitor, delegate run outside it), and a request that lands mid-restart is dropped and reported
  to the console via `BbjServerService.requestRestart`.
- `BoundedWait` (new): a plain-Java, fake-clock-testable poll-until-true helper; `doRestart` now
  waits (5s budget, 50ms poll) for `manager.getServerStatus(SERVER_ID)` to report the server down
  before calling `manager.start(...)`, with `BoundedWait.SLEEPING` as the sole production
  `Thread.sleep` call site in the module.
- Extended `BbjServerServiceRestartSourceGuardTest` with five new ordering guards (arm before stop,
  stop before wait, wait before start, classify before the first-crash branch, single call sites
  for `BoundedWait.until(` and the `CRASH` verdict constant) -- all fourteen guards in that file
  pass, and the eleven-file LSP4IJ import allowlist passes unedited.
- Whole IntelliJ JUnit suite: 700 tests, 0 failures, 0 errors (`./gradlew test --offline`, forced
  re-run). `./gradlew build --offline` succeeds.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Classify a deliberate stop as expected | `53df67e3` | ExpectedStopGuard.java, ExpectedStopGuardTest.java, BbjServerService.java |
| 2 | Reject a restart request landing mid-restart | `e24012ab` | RestartGate.java, RestartGateTest.java, BbjServerService.java |
| 3 | Finish the stop before starting again, fence the ordering | `9c01b27d` | BoundedWait.java, BoundedWaitTest.java, BbjServerService.java, BbjServerServiceRestartSourceGuardTest.java, ExpectedStopGuard.java (javadoc fix) |

## Files Created

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/BoundedWait.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/BoundedWaitTest.java`

## Files Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java`

## Decisions Made

1. `LanguageServerManager.stop(String)` returns `void` in the pinned LSP4IJ 0.21.0 (confirmed by
   `javap` against the shipped jar and against the 0.21.0 sources), so the debug session's
   suggested "await stop's future" fix was replaced by a bounded status barrier:
   `BoundedWait.until` polling `manager.getServerStatus(SERVER_ID)` (5s budget, 50ms poll) until it
   reports down (`null`/`stopped`/`none`, treated alike), with a logged timeout fallback that
   starts anyway.
2. A restart request landing during an in-flight restart is dropped, not queued -- queueing was
   considered and rejected because a queued follow-up could turn a future stop-classification
   regression into an unbounded restart loop. A drop costs at most one restart, always safe to
   repeat, and is now surfaced to the console instead of silently discarded.
3. The expected-stop token is one-shot (consumed by the first live-to-stopped transition it
   explains), time-boxed to 30 seconds by default, and armed only when the server was observed
   live immediately before the stop -- three independent limits, each covered by a dedicated test
   in `ExpectedStopGuardTest`.

## Deviations from Plan

**1. [Rule 1 - Bug] Reworded ExpectedStopGuard's and BoundedWait's class javadoc to avoid the
literal vendor FQN**
- **Found during:** Task 3's verification step (`grep -c "com.redhat.devtools.lsp4ij" ...` expected
  `0` for both new files).
- **Issue:** Both classes' javadoc documented "no `com.redhat.devtools.lsp4ij` import" as a
  fully-qualified literal, which the plan's own zero-references grep counts regardless of comment
  vs. code context (unlike the `Lsp4ijImportAllowlistTest` scanner, which strips comments first).
- **Fix:** Reworded both javadoc comments to "no vendor LSP4IJ import" -- same meaning, no literal
  FQN string.
- **Files modified:** `ExpectedStopGuard.java`, `BoundedWait.java`.
- **Commit:** `9c01b27d`

No other deviations -- the plan executed as written otherwise.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

G-86-1's automated-evidence portion is closed: the classification, in-flight rejection and bounded
wait are each proven by real behavioural JUnit 5 tests over platform-free seams, source guards fence
the wiring, the whole IntelliJ suite is green (700/700), the build succeeds, and the LSP4IJ coupling
surface is unchanged (eleven-file allowlist, zero new vendor references in the two new files).

Per the plan's own `<verification>` block, the gap's UAT property itself (no
`JsonRpcException`/`Stream closed` noise in the live IDE log) cannot be verified by any automated
test in this repo -- it requires a hand re-check of `QA/FULL-TEST-CHECKLIST.md` row 16 (Refresh
Java Classes) run in the same session as row 17 (Settings Apply) against a real BBjServices
install, with the IDE log inspected afterward. That re-check is the remaining acceptance step for
Phase 86 to close.

## Self-Check: PASSED
