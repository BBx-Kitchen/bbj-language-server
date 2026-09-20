---
phase: 97-release-0-16-0-milestone-close
plan: 02
subsystem: ide-intellij
tags: [intellij, lsp4ij, crash-classification, expectedstopguard, bbjserverservice]

# Dependency graph
requires:
  - phase: 97-01
    provides: LSPClientFeatures#handleServerStatusChanged now drives BbjServerService.updateStatus off the EDT, so this plan's call site is the sole crash-classification entry point.
provides:
  - "BbjServerService.updateStatus feeds ExpectedStopGuard.classify the status the server was in immediately before the current transition, not the status from two transitions ago."
  - "The idea.log transition line prints that same accurate from-state."
  - "A source guard (BbjServerServiceRestartSourceGuardTest.theClassifierIsFedTheOneBehindFromState) and two ExpectedStopGuardTest cases pin the corrected input so it cannot regress silently."
  - "A recorded maintainer decision (2026-09-20) approving the resulting classification-behavior change, per 97-CONTEXT.md D-08."
affects: [97-05, 97-06, 97-07, 97-08, 97-09, 97-10, 97-11, release-runbook, crash-auto-restart]

# Actuals (#2632)
actuals:
  tokens: 1258
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java

key-decisions:
  - "Maintainer approved (2026-09-20, verbatim: \"Proceed (Recommended)\") feeding ExpectedStopGuard.classify the one-behind from-state instead of the two-behind stale field, accepting that a lost-connection sequence (stopped -> starting -> started -> stopped) now classifies as CRASH on its final transition instead of being silently dismissed as NOT_A_STOP."
  - "ExpectedStopGuardTest's second pinned case (stoppedAfterStartedWithNothingArmedIsACrash, added by the prior task-1 executor) was found to already cover the one-behind lost-connection sequence the plan asked for; no duplicate case was added, per the plan's own skip-if-covered instruction."

patterns-established: []

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "ExpectedStopGuard.classify and the idea.log transition line both read currentStatus (the true one-behind from-state) instead of the stale previousStatus field, which is deleted."
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "ExpectedStopGuardTest#stoppedAfterStartedWithNothingArmedIsACrash"
        status: pass
      - kind: unit
        ref: "ExpectedStopGuardTest#stoppedClassifiedAgainstAStaleStoppedFromStateIsNotEvenSeenAsAStop"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#theClassifierIsFedTheOneBehindFromState"
        status: pass
      - kind: unit
        ref: "BbjServerServiceRestartSourceGuardTest#theClassificationCallPrecedesTheFirstCrashBranchAndTheCrashVerdictIsPinnedOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The maintainer explicitly approved the resulting crash-classification behavior change (a previously-dismissed lost-connection sequence now fires auto-restart / crash banner) before it landed."
    requirement: "REL-01"
    verification: []
    human_judgment: true
    rationale: "Whether the new classification behavior is acceptable for a release is a product/maintainer judgment call, not something a test can assert — captured verbatim in the Deviations section below."

duration: continuation
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 02: Feed ExpectedStopGuard the True One-Behind From-State Summary

**`BbjServerService.updateStatus` now classifies and logs against the status the server was actually in one transition ago, not two — fixing both a misleading log line and a crash classifier that was silently dismissing real lost-connection sequences.**

## Performance

- **Duration:** continuation (Task 1 executed and committed by a prior executor at 2026-09-20T14:12:19Z; this continuation resumed after the Task 2 maintainer checkpoint and completed Task 3 at 2026-09-20T14:18:50Z)
- **Tasks:** 3 (Task 1: pin — prior executor; Task 2: maintainer decision checkpoint — resolved; Task 3: fix — this continuation)
- **Files modified:** 3 total across the plan (2 test files by Task 1, 1 production file by Task 3)

## Accomplishments

- Pinned the intended one-behind classifier input executably before any production code changed (Task 1, prior executor): two new `ExpectedStopGuardTest` cases contrasting the one-behind vs. two-behind from-state for the same target status, and a new red source guard (`theClassifierIsFedTheOneBehindFromState`) in `BbjServerServiceRestartSourceGuardTest`.
- Obtained an explicit, recorded maintainer decision on the resulting classification-behavior change before it landed (Task 2), per 97-CONTEXT.md D-08.
- Corrected `BbjServerService.updateStatus` to feed `expectedStop.classify(...)` and the `idea.log` transition line `currentStatus` (the true one-behind from-state) instead of the stale `previousStatus` field, and deleted the now-unread field and its assignment (Task 3, this continuation).
- Confirmed `ExpectedStopGuard.java` remains byte-identical — the semantic change is confined entirely to what its caller passes in.

## Task Commits

1. **Task 1: Pin the intended from-state before anything changes (expected RED)** - `d16e7e57` (test) — completed by the prior executor.
2. **Task 2: Maintainer decision — the classifier's input changes** - no commit (human decision at a `checkpoint:decision gate="blocking-human"`).
3. **Task 3: Feed the classifier and the log line the true from-state** - `626b8fe3` (fix)

**Plan metadata:** committed alongside this SUMMARY (see final commit below).

## Files Created/Modified

- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuardTest.java` — two new cases pinning the one-behind and two-behind from-state verdicts for the same target status (Task 1).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java` — new source guard `theClassifierIsFedTheOneBehindFromState`, asserting `expectedStop.classify(status.name(), currentStatus.name(),` occurs once and `previousStatus` occurs zero times (Task 1).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `updateStatus`'s classify call and log line now read `currentStatus`; the stale `previousStatus` field declaration and its end-of-method assignment are deleted (Task 3).

## Decisions Made

- Maintainer approved feeding the classifier the one-behind from-state (verbatim answer and full context in "Deviations from Plan" below).
- No duplicate `ExpectedStopGuardTest` case was added for the lost-connection sequence — the prior executor found `stoppedAfterStartedWithNothingArmedIsACrash` (added in the same task) already exercised it, per the plan's own "skip if an equivalent case already exists" instruction.

## Deviations from Plan

### Surfaced deviation (per 97-CONTEXT.md D-08) — approved, not auto-fixed

**1. [D-08 surfaced deviation] Classifier's second argument changes from a two-behind to a one-behind from-state**

- **Found during:** Task 1 (writing the pin) and confirmed at Task 2 (maintainer checkpoint).
- **What the classifier received before this plan** (for the real lost-connection sequence
  `stopped -> starting -> started -> stopped`, one row per transition, from-state as the caller
  supplied it before this fix):

  | Transition (target status) | From-state the caller passed (pre-fix) | `ExpectedStopGuard.classify` verdict |
  |---|---|---|
  | `starting` | `stopped` (field's initial value) | n/a (not a stop target) |
  | `started` | `stopped` (still un-updated on the first call) | n/a (not a stop target) |
  | `stopped` | `starting` (two transitions behind — should have been `started`) | `NOT_A_STOP` |

- **What it receives after the fix** (same sequence, one-behind from-state):

  | Transition (target status) | From-state the caller passes (post-fix) | `ExpectedStopGuard.classify` verdict |
  |---|---|---|
  | `starting` | `stopped` | n/a (not a stop target) |
  | `started` | `starting` | n/a (not a stop target) |
  | `stopped` | `started` (true one-behind value) | `CRASH` |

- **The one behavioural consequence:** the final `stopped` transition in a lost-connection sequence,
  previously classified `NOT_A_STOP` and silently dropped, is now classified `CRASH` — so the user
  sees the "Auto-restarting language server (attempt 1)..." console line and an auto-restart fires
  on the first such event, and the crash banner + "stopped twice" notification on a second one within
  the crash window, where nothing fired before.
- **What is NOT changing:** `ExpectedStopGuard`'s own classification semantics — it remains a pure
  function over two status names and a timestamp; the change is confined to what `BbjServerService`
  passes as its second argument. Confirmed by `git diff --exit-code` against
  `ExpectedStopGuard.java`, which exits 0 (byte-identical).
  Evidence presented that no existing test asserted the old (stale) behavior: before this plan,
  neither `ExpectedStopGuardTest` nor `BbjServerServiceRestartSourceGuardTest` contained any case
  exercising the caller's from-state staleness — the field-staleness bug had no test coverage in
  either direction.
- **Maintainer's verbatim answer:** "Proceed (Recommended)" — recorded 2026-09-20 at the Task 2
  `checkpoint:decision gate="blocking-human"`, per the orchestrator's blocking question. The
  maintainer was shown and accepted the single behavioural consequence stated above before Task 3
  ran.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`
- **Verification:** `BbjServerServiceRestartSourceGuardTest`, `ExpectedStopGuardTest`, and
  `Lsp4ijOverrideSiteSourceGuardTest` all green in one `--rerun-tasks` Gradle run (BUILD SUCCESSFUL);
  `ExpectedStopGuard.java` confirmed byte-identical.
- **Committed in:** `626b8fe3`

---

**Total deviations:** 1 surfaced-and-approved (D-08 process deviation, not a Rule 1-3 auto-fix — this
plan exists specifically to gate this change behind an explicit maintainer decision rather than
absorb it silently).
**Impact on plan:** Exactly the change the plan and 97-CONTEXT.md D-08 anticipated; no scope creep,
no architectural surprise beyond the one already flagged in the plan's own Task 2.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The classifier-input fix is complete, pinned, and maintainer-approved; `ExpectedStopGuard.java`
  is unchanged.
- Folded todo 2 (`2026-09-20-status-transition-log-prints-a-stale-previous-status.md`) is resolved
  by this plan's fix; its own close-out (moving the todo file) is owned by plan 97-11 per the
  project rules for this execution, not this plan.
- Ready for the next plan in phase 97's wave sequence.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
