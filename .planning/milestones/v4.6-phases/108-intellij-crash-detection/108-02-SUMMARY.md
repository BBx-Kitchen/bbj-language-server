---
phase: 108-intellij-crash-detection
plan: 02
subsystem: ide-lifecycle
tags: [intellij, lsp4ij, lifecycle, crash-detection, java, tdd]

requires:
  - phase: 108-intellij-crash-detection (plan 01)
    provides: the probe build (unexpected-stop hook wiring with no behaviour change) and the real
      macOS idea.log excerpt this plan's precondition and probe verdict depend on
provides:
  - the probe verdict recorded in 108-UAT-ARTIFACTS.md, confirming D-01 holds on real hardware
  - a hook-fed crash signal (BbjLanguageServer.onUnexpectedStop -> BbjServerService.reportUnexpectedExit
    -> ExpectedStopGuard.classifyExit -> applyCrashPolicy) that is the only source of a crash verdict
  - a crash-response policy where the auto-restart keeps the crash counter, so a second crash within
    30 s gives up even after a successful restart in between
  - a status feed (updateStatus) reduced to display and logging only, with no classification
affects: [108-03-status-bar-and-notification, 108-04-final-uat]

actuals:
  tokens: 13100
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "hook-fed crash entry point, consulted on the calling thread then hopped to the EDT via invokeLater with a disposed guard, matching the existing BbjServerService dispatch discipline"
    - "split restart entry points: a public user-initiated entry point that clears state before reaching a private gated-restart method, so a policy-triggered restart can reach the same gate without clearing state it needs to keep"
    - "comment-aware source guards (stripComments + bodyOf) copied per-file rather than shared, matching this project's established per-guard-private-helper convention"

key-files:
  created: []
  modified:
    - .planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java

key-decisions:
  - "The probe verdict confirms D-01 without qualification: the hook line appears after all four kills and never inside any of the seven deliberate-stop windows in the maintainer's excerpt, so the design proceeds unchanged into implementation"
  - "Task 1 kept the pre-existing status-driven classify(String, String, long) call site inside updateStatus for one commit, routing its crash branch through the new applyCrashPolicy so the existing source guards stayed green mid-refactor; Task 2 then deleted that call site and the three-argument classifier together, per the plan's own two-step sequencing"
  - "applyCrashPolicy's first-crash branch calls a new private requestGatedRestart directly rather than the public requestRestart, because requestRestart now clears crash state as part of being the user-initiated entry point -- the crash auto-restart must keep the counter it just incremented"

patterns-established:
  - "Crash detection sources from a vendor lifecycle hook rather than a derived status sequence, when the two normal-stop and crash paths produce an identical status sequence at the client (Phase 97 finding); the hook is filtered, not classified, by a plain-Java one-shot armed token"

requirements-completed: []  # LIFE-01 stays open per this plan's own instruction -- plans 03/04 still carry it; the phase verifier closes it once the status-bar/banner UI and final UAT land

coverage:
  - id: D1
    description: "Probe verdict recorded and D-01 confirmed before any source file changed"
    verification:
      - kind: manual_procedural
        ref: ".planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md#probe-verdict"
        status: pass
    human_judgment: false
  - id: D2
    description: "A process end without a stop request flows from the provider hook to BbjServerService, filtered by ExpectedStopGuard, logged as a WARN with pid and exit code, and drives the crash policy"
    verification:
      - kind: unit
        ref: "ExpectedStopGuardTest#classifyExitWithNothingArmedIsACrash"
        status: pass
      - kind: unit
        ref: "ExpectedStopGuardTest#oneArmedTokenClassifiedByEightConcurrentExitsYieldsExactlyOneExpectedVerdict"
        status: pass
      - kind: unit
        ref: "BbjLanguageServerSourceGuardTest#onUnexpectedStopChecksDisposedBeforeReportingAndReadsPidAndProcessHandlerOnceEach"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#reportUnexpectedExitConsultsTheGuardBeforeItsFirstInvokeLaterHopAndNamesTheExpectedVerdictOnce"
        status: pass
    human_judgment: false
  - id: D3
    description: "Only the hook can produce a crash verdict; the status feed drives display and logging only"
    verification:
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#updateStatusBodyNoLongerClassifiesOrTouchesTheCrashCounter"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#applyCrashPolicyIsDeclaredOnceAndCalledOnlyFromReportUnexpectedExit"
        status: pass
    human_judgment: false
  - id: D4
    description: "The crash auto-restart keeps the counter across a successful restart; user-initiated restarts clear it; every restart goes through one gate site; the plugin's own restart token is disarmed after its own stop"
    verification:
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#crashCountIsIncrementedOnlyInsideApplyCrashPolicyWhichNeverClearsCrashStateOrCallsUserRestart"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#requestRestartClearsCrashStateBeforeReachingTheGate"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#restartGateRequestIsCalledOnlyFromRequestGatedRestart"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#doRestartNeverClearsCrashStateAndDisarmsTheGuardAfterItsOwnBoundedWaitBeforeStarting"
        status: pass
    human_judgment: false
  - id: D5
    description: "Whole IntelliJ suite green with --rerun-tasks after every change"
    verification:
      - kind: other
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks --console=plain (1123 tests, 0 failures)"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-25
status: complete
---

# Phase 108 Plan 02: Crash Signal and Response Policy Summary

**The unexpected-stop hook is now the sole crash signal end to end -- BbjLanguageServer reports pid/exit code to BbjServerService.reportUnexpectedExit, ExpectedStopGuard.classifyExit filters the plugin's own restarts, and the crash auto-restart keeps its counter through a successful restart so a second crash within 30 s still gives up.**

## Performance

- **Duration:** ~17 min across 3 commits (Task 1, Task 2 RED, Task 2 GREEN)
- **Started:** 2026-09-25T12:52:00Z (approx.)
- **Completed:** 2026-09-25T13:08:52Z
- **Tasks:** 2 (1 tracer, 1 auto/tdd)
- **Files modified:** 7

## Accomplishments
- Recorded the probe verdict in `108-UAT-ARTIFACTS.md`: D-01 holds unconditionally on the
  maintainer's real macOS excerpt -- the hook line appears after every `kill -9` and never inside
  any deliberate-stop window
- `ExpectedStopGuard.classifyExit(long)` replaces the status-transition `classify(String, String,
  long)`; the guard is now a pure armed-token filter with no status-name concept, `NOT_A_STOP`, or
  imports
- `BbjLanguageServer.onUnexpectedStop` reports pid and exit code to
  `BbjServerService.reportUnexpectedExit`, guarded against a disposed project and a failing report
- `BbjServerService.reportUnexpectedExit` -> `applyCrashPolicy` is the only path that can produce a
  crash verdict; `updateStatus` no longer classifies anything and drives the status-bar/console
  feed only
- The crash auto-restart reaches the language server through a new private `requestGatedRestart`,
  bypassing `requestRestart`'s crash-state clear, so two crashes within 30 s still give up even if
  the first auto-restart reached `started` in between; `doRestart` disarms the guard's token after
  its own bounded wait, before starting again, so a genuine crash later in the window is never
  swallowed
- Comment-aware source guards pin every one of these invariants; the whole IntelliJ suite (1123
  tests) is green with `--rerun-tasks`

## Task Commits

Each task was committed atomically:

1. **Task 1: A killed server reaches BbjServerService as one crash, end to end (tracer)** -
   `698ae4c0` (feat) -- probe verdict, `classifyExit`, the hook wiring, `reportUnexpectedExit` and
   `applyCrashPolicy` wired in without changing `updateStatus`'s existing crash-branch call site
2. **Task 2: Two crashes within 30 s give up even across a successful restart (tdd)**
   - RED: `34e02742` (test) -- comment-aware source guards pinning the finished shape, failing
     against Task 1's code
   - GREEN: `9a9a63a1` (feat) -- `updateStatus` stops classifying, the restart entry points split,
     `doRestart` disarms the guard, volatile fields, `ExpectedStopGuard`'s three-argument classifier
     removed

No separate plan-metadata commit is needed beyond this SUMMARY/STATE/ROADMAP commit below.

## Files Created/Modified
- `.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md` - probe verdict paragraph
  replacing the "Pending" placeholder
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` - `project` field,
  `onUnexpectedStop` reports to `BbjServerService.reportUnexpectedExit`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` -
  `reportUnexpectedExit`, `applyCrashPolicy`, `describeExit`, `isAutoRestartAbandoned`,
  `requestGatedRestart`; `updateStatus` reduced to display/logging; `doRestart` disarms the guard;
  volatile crash-state fields
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` -
  `classifyExit(long)` is now the only classifier; the three-argument `classify`, `NOT_A_STOP` and
  status-name constants are gone
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java` - kept
  only the `classifyExit` behavioural coverage
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java` -
  new comment-aware guards for the reshaped `BbjServerService`; the `ExpectedStopGuard` source
  assertions
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` -
  the `onUnexpectedStop` disposed-guard-before-report pin

## Decisions Made

See `key-decisions` in the frontmatter: the probe verdict's unqualified confirmation of D-01; Task
1's deliberate one-commit retention of the old status-driven `classify` call site (routed through
`applyCrashPolicy`) to keep existing guards green mid-refactor before Task 2 deleted it; and
`applyCrashPolicy` calling the new private `requestGatedRestart` directly instead of the public
`requestRestart`, since the public entry point now clears crash state as part of being the
user-initiated restart path.

## Deviations from Plan

None - plan executed exactly as written. Task 1's action step 0 (the probe gate) found no
contradiction of D-01, so the plan proceeded through both tasks without alteration.

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED/GREEN cycle: `34e02742` is a `test(108-02):` commit adding
source guards that fail against Task 1's code (confirmed by running the targeted Gradle test before
writing any production change), and `9a9a63a1` is the following `feat(108-02):` commit that makes
them pass. No REFACTOR commit was needed. Gate sequence present and correctly ordered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 (status-bar and notification) can build on `isAutoRestartAbandoned()` and
`isServerCrashed()` as the two separate facts driving the widget's crashed state and the editor
banner respectively -- both already exist and are set correctly by `applyCrashPolicy`. LIFE-01
remains open in REQUIREMENTS.md, to be closed by the phase verifier once plans 03 and 04 land the
remaining UI and hand-UAT evidence.

## Self-Check: PASSED

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` -- FOUND
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` -- FOUND
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` -- FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java` -- FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java` -- FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` -- FOUND
- `.planning/phases/108-intellij-crash-detection/108-UAT-ARTIFACTS.md` -- FOUND
- Commit `698ae4c0` -- FOUND in `git log --oneline --all`
- Commit `34e02742` -- FOUND in `git log --oneline --all`
- Commit `9a9a63a1` -- FOUND in `git log --oneline --all`
- Whole IntelliJ suite: `./gradlew test --rerun-tasks` -- BUILD SUCCESSFUL, 1123 tests, 0 failures

---
*Phase: 108-intellij-crash-detection*
*Completed: 2026-09-25*
