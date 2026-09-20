---
phase: 95-java-interop-status-accuracy-widget-consolidation
plan: 02
subsystem: intellij-plugin
tags: [intellij, status-bar, java-interop, poll-gating, threading, alarm]

# Dependency graph
requires:
  - phase: 95-01
    provides: "InteropProbeClient / InteropStatusPresentation / WRONG_PEER status / the two disposal guards this plan's poll gate is wired alongside"
provides:
  - "InteropPollPolicy -- a plain-Java, com.intellij-free decision seam answering CHECK_NOW/REARM/PAUSE/NO_CHANGE for the java-interop poll cadence"
  - "BbjJavaInteropService poll gated on editor selection: stops re-arming with no BBj file selected, fires an immediate check on gate-open or server-start, freezes and broadcasts nothing while paused"
  - "InteropStatus.CHECKING now assigned for the probe's real in-flight duration, with the grace-period ladder reading a captured previousStatus instead of the live (now-CHECKING) field"
  - "BbjFileVisibility.showsForFileTypeNames widened to public so a cross-package plain-JUnit test can drive the empty-selection edge case"
affects: [95-03, 95-04, 96-plat-03-editor-notification-provider-base]

# Actuals (#2632)
actuals:
  tokens: 7831
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Poll-gate decision extracted into a NodeAvailability-shaped plain-Java seam (private constructor, exhaustive enum, exhaustive no-default switch, static pure decide function)"
    - "EDT-write / pooled-thread-read volatile field pair for a gate flag, mirroring BbjServerService.pendingRestartReason"
    - "Single applyDecision(Decision) chokepoint so every alarm re-arm/pause/immediate-check path is auditable in one place"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropPollPolicyTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropPollGateSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java

key-decisions:
  - "No third volatile field for server-started state. checkConnection() (the pooled-thread poll callback) only ever runs while a REARM/CHECK_NOW-scheduled request is pending, and both decisions are already gated on the server being started -- stopChecking() cancels every pending request the instant the server stops -- so checkConnection() passes a literal true for InteropPollPolicy.decide's serverStarted parameter. refreshSelectionGate() (EDT-only) reads BbjServerService.getCurrentStatus() live instead of caching it. This keeps the field count at exactly two (bbjFileSelected, gateWasOpen) as required."
  - "BbjFileVisibility and showsForFileTypeNames widened from package-private to public so InteropPollPolicyTest (interop package) can feed the empty-selection edge case through the real predicate rather than a hand-rolled boolean. showsForSelection stays package-private -- it is only ever called from within ui."
  - "BbjJavaInteropServiceDisposalSourceGuardTest's pinned isDisposed() count widened from two to three, with a new placement assertion for the third site. Task 2 explicitly requires a project.isDisposed() guard on the constructor's startup invokeLater lambda (it reads FileEditorManager on a project that may already be disposed by the time the lambda runs); this necessarily changes the count the 95-01 guard pins. The plan's own <verification> section claim that this test 'still passes... unmodified' does not survive contact with Task 2's own instructions -- the guard is a real, necessary safety property, so widening its pinned count (not skipping the guard) is the correct resolution."

requirements-completed: [IOP-02]

coverage:
  - id: D1
    description: "The poll stops re-arming with no BBj file selected and resumes on the next BBj selection or server start, via a pure InteropPollPolicy.decide seam routed through a single applyDecision chokepoint -- ROADMAP criterion 2"
    requirement: "IOP-02"
    verification:
      - kind: unit
        ref: "InteropPollPolicyTest (12 test methods, all 24 trigger/gate/previous-gate/server combinations plus the empty-selection edge case)"
        status: pass
      - kind: unit
        ref: "BbjJavaInteropPollGateSourceGuardTest#everyDecisionRoutesThroughThePolicyExactlyThreeTimes"
        status: pass
      - kind: unit
        ref: "BbjJavaInteropPollGateSourceGuardTest#pooledThreadPollPathNeverReadsTheEditor"
        status: pass
    human_judgment: true
    rationale: "The decision logic is fully proven by plain JUnit and the structural guard, but 'the poll actually stops/resumes in a running IDE across real tab switches and server restarts' needs a live IDE session -- carried in this task's <verify><human-check> block for end-of-phase UAT.md consolidation per workflow.human_verify_mode=end-of-phase, matching 95-01's precedent."
  - id: D2
    description: "While paused the service freezes the last known status and broadcasts nothing -- no listener fires, no banner is raised purely by switching to a non-BBj tab"
    requirement: "IOP-02"
    verification:
      - kind: unit
        ref: "BbjJavaInteropPollGateSourceGuardTest#pauseBranchTouchesNoStatusAndBroadcastsNothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "InteropStatus.CHECKING is assigned for the probe's real in-flight duration; the grace-period ladder reads a captured previousStatus so it never latches on CHECKING instead of the true prior status"
    requirement: "IOP-02"
    verification:
      - kind: unit
        ref: "whole-suite regression (./gradlew test --rerun-tasks, 1035 tests, 0 failures) confirms the rewritten checkConnection() compiles and every existing behavioral assertion (EffectiveInteropPortSourceGuardTest, BbjJavaInteropServiceDisposalSourceGuardTest) still holds"
        status: pass
    human_judgment: true
    rationale: "No test in this codebase drives BbjJavaInteropService's live grace-period sequence end-to-end (D-10: the service has zero behavioral test coverage by design, only source guards and hand UAT, consistent with the project's established IntelliJ-service verification convention). Measured against this dev environment's live java-interop peer on :5008 via a throwaway (uncommitted) probe: CONFIRMED in 51ms -- comfortably inside the 5s poll interval, so CHECKING should read as a brief, likely-imperceptible flash here. Whether it reads as flicker in an actual running IDE, and whether the grace period behaves correctly on a real disconnect, needs the live-IDE human-check this task's <verify> block already calls for, consolidated at end-of-phase UAT."

duration: 12min
completed: 2026-09-19
status: complete
---

# Phase 95 Plan 02: java-interop Poll Gating & Live CHECKING Summary

**The java-interop status poll now stops re-arming with no BBj file selected, fires an immediate check on gate-open or server-start instead of waiting out a blind 5s window, and reports a genuinely live CHECKING state whose grace-period ladder no longer latches on itself -- all decided by a new `com.intellij`-free `InteropPollPolicy` seam under full plain-JUnit coverage.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-19T17:11:30Z (approx., following immediately after 95-01)
- **Completed:** 2026-09-19T17:23:37Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `InteropPollPolicy.decide(Trigger, gateOpen, gateWasOpen, serverStarted)` is a pure, `com.intellij`-free function returning `CHECK_NOW`/`REARM`/`PAUSE`/`NO_CHANGE`, following `NodeAvailability`'s private-constructor / exhaustive-enum / no-default-switch shape exactly; `InteropPollPolicyTest` enumerates all 24 trigger/gate/previous-gate/server combinations plus the empty-selection edge case (12 test methods)
- `BbjJavaInteropService` now gates the poll on `BbjFileVisibility.showsForSelection(...)`: a `FileEditorManagerListener.FILE_EDITOR_MANAGER` subscription and a one-time startup `invokeLater` seed both route through a single `refreshSelectionGate()` method, so a project opened with a BBj file already selected starts with an open gate rather than waiting for the first tab switch
- Every re-arm/pause/immediate-check decision (`TICK_COMPLETED`, `SELECTION_CHANGED`, `SERVER_STARTED`) routes through `InteropPollPolicy.decide` and is applied in one `applyDecision(Decision)` chokepoint -- `CHECK_NOW` fires the check with a zero-delay `Alarm` request (closing the old "first check always 5s late" blind window), `PAUSE` cancels pending work and touches no status
- `checkConnection()` now assigns `InteropStatus.CHECKING` immediately before the probe, having first captured `previousStatus` so the grace-period ladder reads the pre-CHECKING status instead of latching `CHECKING` forever
- `BbjJavaInteropPollGateSourceGuardTest` structurally pins the threading contract: both gate fields stay `volatile`, the wiring calls occur exactly once/three-times as designed, the pooled-thread poll path never reads the editor, and the pause branch never touches status or broadcasts
- Whole IntelliJ JUnit suite green under `./gradlew test --rerun-tasks`: 1035 tests, 0 failures, 0 errors, 0 skipped -- test task actually executed, not reported `UP-TO-DATE`

## Task Commits

Each task was committed atomically (Task 1 is TDD -- RED then GREEN):

1. **Task 1: The poll-gate decision as a pure, exhaustively-tested seam**
   - `8b65d2a7` (test) -- RED: `InteropPollPolicyTest` written first, fails to compile (no `InteropPollPolicy` yet)
   - `0e5bf73f` (feat) -- GREEN: `InteropPollPolicy` implemented, all 12 test methods pass
2. **Task 2: Gate the service on editor selection and make CHECKING mean something** - `a0f4de8f` (feat)
3. **Task 3: Pin the EDT-write / pooled-read split and run the phase regression gate** - `48402ccc` (test)

**Plan metadata:** committed together with this SUMMARY, STATE.md and ROADMAP.md updates, per the sequential-executor `task_commit_protocol`.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/interop/InteropPollPolicy.java` - the pure poll-gate decision seam (`Trigger`, `Decision`, `decide`)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/interop/InteropPollPolicyTest.java` - exhaustive coverage of all 24 combinations plus the empty-selection case
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` - poll gated on selection via `refreshSelectionGate()`/`handleServerStarted()`/`applyDecision()`; `checkConnection()` now assigns and correctly un-latches `CHECKING`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` - class and `showsForFileTypeNames` widened to `public`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropPollGateSourceGuardTest.java` - structural pin for the new threading contract
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java` - pinned `isDisposed()` count widened 2 -> 3, with a new placement assertion for the constructor's startup `invokeLater` guard

## Decisions Made

- **No third volatile field for server-started state** (see key-decisions in frontmatter for full reasoning): `checkConnection()` passes a literal `true`; `refreshSelectionGate()` reads `BbjServerService.getCurrentStatus()` live on the EDT. Keeps the field count at exactly two, as the plan's own acceptance criteria require.
- **`BbjFileVisibility`/`showsForFileTypeNames` widened to `public`** so the cross-package `InteropPollPolicyTest` can exercise the real empty-selection predicate instead of a hand-rolled boolean, per the plan's explicit instruction to use `showsForFileTypeNames(List.of())`.
- **`BbjJavaInteropServiceDisposalSourceGuardTest`'s pinned count widened from two to three disposal guards.** Necessary consequence of Task 2's own instruction to guard the new startup `invokeLater` lambda identically to the two guards plan 95-01 added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened `BbjFileVisibility` visibility from package-private to public**
- **Found during:** Task 1
- **Issue:** The plan requires `InteropPollPolicyTest` (package `com.basis.bbj.intellij.interop`) to call `BbjFileVisibility.showsForFileTypeNames(List.of())`, but `BbjFileVisibility` and that method were package-private in `com.basis.bbj.intellij.ui` -- a cross-package call that would not compile.
- **Fix:** Made the class and `showsForFileTypeNames` `public`; `showsForSelection` stays package-private since it is only ever called from within `ui`.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java`
- **Verification:** `InteropPollPolicyTest#emptySelectionClosesTheGateWithoutThrowing` compiles and passes; `BbjStatusBarWidgetSourceGuardTest` (which reads this file) still passes unmodified.
- **Committed in:** `8b65d2a7` (Task 1's RED commit)

**2. [Rule 3 - Blocking] Dropped the implied third volatile field in favor of a live EDT read / literal `true`**
- **Found during:** Task 2
- **Issue:** Task 2's action text reads naturally as tracking server-started state in a field, but the acceptance criteria explicitly require "exactly two volatile boolean fields." A third field would have contradicted that criterion.
- **Fix:** `checkConnection()` (pooled-thread poll path) passes a literal `true` for `serverStarted`, justified by the invariant that it only runs while a server-started-gated request is pending. `refreshSelectionGate()` (EDT-only) reads `BbjServerService.getCurrentStatus()` live instead.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java`
- **Verification:** `BbjJavaInteropPollGateSourceGuardTest#gateFlagsStayVolatile` asserts exactly two volatile boolean fields; whole-suite green.
- **Committed in:** `a0f4de8f`

**3. [Rule 3 - Blocking] Widened `BbjJavaInteropServiceDisposalSourceGuardTest`'s pinned `isDisposed()` count from two to three**
- **Found during:** Task 2
- **Issue:** Task 2 explicitly requires guarding the constructor's new startup `invokeLater` lambda with `if (project.isDisposed()) { return; }`, "matching the two guards plan 95-01 added" -- but adding a third occurrence of that guard breaks 95-01's `isDisposedGuardOccursExactlyTwice` test, which the plan's own `<verification>` section separately claims "still passes... unmodified." These two statements in the plan conflict; the guard itself is a genuine, necessary safety property (the lambda reads `FileEditorManager` on a project that may be disposed by the time it runs), so the correct resolution is to widen the pinned count, not omit the guard.
- **Fix:** Renamed the test to `isDisposedGuardOccursExactlyThreeTimes`, updated the assertion to `3`, and added `constructorStartupSeedGuardsInsideTheInvokeLaterLambdaNotOutsideIt` pinning the new guard's placement the same way the other two are pinned.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjJavaInteropServiceDisposalSourceGuardTest.java`
- **Verification:** Both tests in this file pass; whole-suite green under `--rerun-tasks`.
- **Committed in:** `a0f4de8f`

---

**Total deviations:** 3 auto-fixed (all Rule 3 -- blocking compile/test-conflict fixes)
**Impact on plan:** All three were required to make the plan's own written instructions and acceptance criteria mutually satisfiable; each is narrowly scoped to the file already in scope for the task that surfaced it. No scope creep.

## Issues Encountered

None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **CHECKING transition timing, measured in this dev environment:** a throwaway (uncommitted) probe against `InteropProbeClient.probe("localhost", 5008, 1000, 2000)` against whatever is actually listening on `:5008` here returned `CONFIRMED` in **51ms**. That is well inside the 5s poll interval, so in this environment the `CHECKING` state should be a brief, likely-imperceptible flash rather than a visible strobe. This is automated evidence only, not the D-09-required UAT judgment.
- **Human-check outstanding for end-of-phase UAT** (per `workflow.human_verify_mode=end-of-phase`, matching 95-01's precedent): in a running IDE with java-interop up, confirm across several poll ticks that the `CHECKING` state is legible but does not read as flicker; stop the service and watch again; switch to a non-BBj tab and back and confirm the status updates immediately on return rather than after a five-second wait; confirm the poll actually stops (no console/log evidence of re-arming) with no BBj file selected.
- `95-03`, `95-04` can proceed. Neither depends on this plan explicitly, but any plan touching `BbjJavaInteropService.java` must account for the poll-gate wiring and the widened disposal-guard count this plan introduced.
- #593 is closable as implemented; the deliberately-deferred window-focus/idle-gating half (recorded in 95-CONTEXT.md's Deferred Ideas) stays out of scope.

## Self-Check: PASSED

All 3 created files (`InteropPollPolicy.java`, `InteropPollPolicyTest.java`,
`BbjJavaInteropPollGateSourceGuardTest.java`) and this SUMMARY.md verified present on disk via
`[ -f ]`; all 4 commit hashes (`8b65d2a7`, `0e5bf73f`, `a0f4de8f`, `48402ccc`) verified present via
`git log --oneline --all`. `git log --oneline --grep="^test(95-02)"` finds both `8b65d2a7` and
`48402ccc`; `git log --oneline --grep="^feat(95-02)"` finds both `0e5bf73f` and `a0f4de8f`, with
the RED test commit (`8b65d2a7`) preceding its matching GREEN commit (`0e5bf73f`) by timestamp,
confirming Task 1's TDD gate sequence.

---
*Phase: 95-java-interop-status-accuracy-widget-consolidation*
*Completed: 2026-09-19*
