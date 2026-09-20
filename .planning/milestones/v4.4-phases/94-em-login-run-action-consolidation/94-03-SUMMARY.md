---
phase: 94-em-login-run-action-consolidation
plan: 03
subsystem: intellij
tags: [intellij, em-login, action-presentation, source-guard, java, junit5]

requires:
  - phase: 94-em-login-run-action-consolidation
    provides: "plan 01's BbjToolScriptResolver (em-login.bbj path resolution, already wired into BbjEMLoginAction) and plan 02's EmTokenValidator relocation, both left undisturbed by this plan"
provides:
  - "BbjEMLoginAction.update()/getActionUpdateThread() overrides gating the Tools-menu item on project presence alone (#589)"
  - "A source guard pinning the enablement gate's shape and the two gates it must not have"
  - "A source guard pinning that the EM login temp-file cleanup finally covers the whole launch, not merely the result read (#590)"
affects: []

actuals:
  tokens: 3753
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "BbjEMLoginAction's update()/getActionUpdateThread() follow BbjRefreshJavaClassesAction's sibling shape exactly, minus the ServerStatus gate -- a project-only presence check under ActionUpdateThread.BGT"
    - "Both new source guards use the established per-guard-private-helper convention (own copies of readSource/countOccurrences/extractMethodBody, brace-balanced body extraction, no shared test utility)"
    - "The temp-file cleanup guard pins ordering via indexOf comparisons scoped to the extracted performLogin body, not mere presence of a finally block -- the idiom this plan's D-08-equivalent precedent established in prior phases"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java

key-decisions:
  - "The enablement gate reads e.getProject() != null and nothing else -- no ServerStatus, no BBj Home -- because EM login authenticates through the BBj interpreter directly and never talks to the language server, and hiding the item on missing BBj Home would swallow the one dialog that names the missing setting."
  - "setEnabledAndVisible (hide) is used, never setEnabled (grey), matching all six sibling actions that declare an update() override."
  - "EM-01's temp-file cleanup required no production change -- commit 06eb1a7c already gave the launch the correct try/finally shape. This plan adds only the missing pin: an ordering guard (four indexOf-based assertions over the extracted method body) that demonstrably fails on a deliberately narrowed scope and passes again once restored."
  - "The falsification check moved the subprocess run out from inside the try/catch/finally to before it, routing the checked-exception-throwing CapturingProcessHandler constructor through a throwaway private helper method so the file kept compiling; the helper's own try/catch lives outside performLogin's extracted body and does not interfere with the guard's brace-balanced extraction. The file was restored via `cp` from a pre-edit backup and verified byte-identical to HEAD with `git diff --quiet` before re-running the guard."

requirements-completed: [EM-02, EM-01]

coverage:
  - id: D1
    description: "BbjEMLoginAction declares an update() override (background-thread-safe, gated on project presence alone) and a getActionUpdateThread() override returning ActionUpdateThread.BGT, closing #589's actual finding -- the missing pair of overrides"
    requirement: "EM-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java#updateAndGetActionUpdateThreadAreEachDeclaredExactlyOnce"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java#theHideNotGreySetterIsUsedAndThePlainSetterNeverAppears"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java#theUpdateBodyGatesOnProjectAloneReadingNeitherServerStatusNorBbjHome"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java#theExistingOffEdtDispatchGuardsAreUndisturbed"
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --tests \"*.EmLoginEnablementSourceGuardTest\" --tests \"*.OffEdtDispatchSourceGuardTest\" --tests \"*.Lsp4ijImportAllowlistTest\""
        status: pass
    human_judgment: true
    rationale: "The one observable, user-visible behavior change in this phase -- the Tools-menu item disappearing rather than staying visible with no project open -- is UI presentation and requires a human to confirm inside a running IDE; automated source guards prove the code shape but not what the Tools menu actually renders."
  - id: D2
    description: "EmLoginTempFileCleanupSourceGuardTest pins that the EM login temp-file cleanup finally covers handler construction and the subprocess run, not merely the result read (#590); demonstrated to fail on a deliberately narrowed scope and to pass once restored"
    requirement: "EM-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java#theOwnerOnlyCreationAppearsExactlyOnce"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java#theDeletionAppearsExactlyOnce"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java#theCreationPrecedesTheLaunchTry"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java#theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java#theDeletionOccursAfterTheFinally"
        status: pass
      - kind: manual_procedural
        ref: "hand-run falsification check: relocated the subprocess run above the launch try, confirmed theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally FAILED, restored the file, re-ran and confirmed pass"
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test (whole suite, 1004 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whole bbj-intellij JUnit suite green after both tasks, and the guards this plan's move-adjacent siblings depend on (OffEdtDispatchSourceGuardTest, Lsp4ijImportAllowlistTest, BbjSecretArgvSourceGuardTest) pass unmodified against the edited login action"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test"
        status: pass
    human_judgment: false

duration: ~20min (estimated; start time not explicitly captured at plan launch)
completed: 2026-09-19
status: complete
---

# Phase 94 Plan 03: EM Login Enablement Gate and Temp-File Cleanup Pin Summary

**BbjEMLoginAction gains the `update()`/`getActionUpdateThread()` overrides it never had (project-only gate, hide-not-grey, background thread), and a new ordering guard pins that its temp-file cleanup already covers the entire login launch — both closed with a guard that is proven to fail on the exact regression it protects against.**

## Performance

- **Duration:** ~20 min (estimated)
- **Tasks:** 2 completed
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- `BbjEMLoginAction` now declares `update(@NotNull AnActionEvent e)` and `getActionUpdateThread()`, gating the "Login to Enterprise Manager" Tools-menu item on `e.getProject() != null` alone, evaluated on `ActionUpdateThread.BGT` — closing #589's real finding (the missing override pair), not a specific readiness gate.
- The gate deliberately reads neither `ServerStatus` nor `bbjHomePath`: EM login authenticates through the BBj interpreter directly, so a server-readiness gate would remove login precisely when the language server is down, and a BBj-Home gate would silently swallow the one dialog that tells a new user what to configure.
- `setEnabledAndVisible` is used (hide), never `setEnabled` (grey) — matching all six sibling actions that declare this override.
- `EmLoginEnablementSourceGuardTest` pins the override's exact-once declarations, the hide-not-grey setter, the absence of the two forbidden gates inside the extracted `update()` body, and that the pre-existing off-EDT dispatch assertions were not disturbed.
- `EmLoginTempFileCleanupSourceGuardTest` pins #590 for the first time: four ordered `indexOf` assertions over `performLogin`'s brace-balanced-extracted body prove the owner-only temp-file creation precedes the launch `try`, the 15-second-timeout subprocess run sits inside that `try` (before its `finally`), and the deletion happens inside the `finally`, exactly once. No production code changed for this task — commit `06eb1a7c` already gave the launch this shape; this guard is what stops it regressing a second time.
- Falsification performed by hand exactly as the plan required: temporarily relocated the subprocess run to before the launch `try` (routing the checked-exception `CapturingProcessHandler` constructor through a throwaway private helper so the file still compiled), confirmed `theSubprocessRunSitsBetweenTheLaunchTryAndTheFinally` failed with a clear assertion message, then restored `BbjEMLoginAction.java` from a pre-edit backup and verified it was byte-identical to the committed state via `git diff --quiet` before re-running the guard to confirm it passed again.
- Whole `bbj-intellij` JUnit suite green: 1004 tests, 0 failures, 0 errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: The enablement gate, wired end-to-end from override to guard** - `0598668b` (feat, tracer)
2. **Task 2: Pin that the login cleanup covers the whole launch** - `22c30eec` (test)

_Task 1 was `type="tracer"`: after committing, its `<verify>` was re-run end-to-end (auto mode active per `workflow.auto_advance`), passed, and Task 2 proceeded to expansion — no checkpoint needed._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` - added `update()`/`getActionUpdateThread()` overrides and the `ActionUpdateThread` import; no other change
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java` - pins the enablement gate's shape and the two gates it must not have
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java` - pins the temp-file cleanup ordering for the first time

## Decisions Made

- Followed the plan's `<interfaces>` block verbatim: `BbjRefreshJavaClassesAction`'s override shape, minus the `ServerStatus` gate, per the phase's D-01/D-02.
- Kept both new guards' helpers private and unshared, per the established per-guard-isolation convention already used across this phase's source guards.
- Chose the throwaway-private-helper technique for the falsification check specifically so the deliberately narrowed file would still compile (the `CapturingProcessHandler(GeneralCommandLine)` constructor throws a checked `ExecutionException`, confirmed via `javap` against the platform jar) — this produced a genuine JUnit assertion failure rather than a build-time compile error, which is a stronger demonstration that the guard's assertions (not merely the build) catch the regression.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The falsification check required one iteration to design correctly: an initial sketch (wrapping the relocated construction/run block in its own intermediate `try`/`catch`) would have introduced a second `try {` into the extracted body, which the guard's "first try after creation" anchor would then treat as the launch try — silently defeating the very ordering check it was meant to exercise. Resolved before making any edit to the actual file, by routing the checked-exception-throwing constructor through a helper method living outside `performLogin`'s extracted body instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both requirements this plan covers (EM-01, EM-02) are closed: EM-02 with code, EM-01 with a guard against a regression already fixed in commit `06eb1a7c`. `BbjEMLoginAction`'s own separate BBj-executable resolution (distinct from `BbjRunActionBase.getBbjExecutablePath()`) remains deliberately unfolded per the phase's Deferred note. No guard needed re-pointing in this plan, and none of plan 01's `BbjToolScriptResolver` or plan 02's `EmTokenValidator` surfaces were touched.

---
*Phase: 94-em-login-run-action-consolidation*
*Completed: 2026-09-19*

## Self-Check: PASSED

- `[ -f bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginEnablementSourceGuardTest.java ]` → FOUND
- `[ -f bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmLoginTempFileCleanupSourceGuardTest.java ]` → FOUND
- `git log --oneline --all --grep="94-03"` → 2 commits found (`0598668b`, `22c30eec`)
- Task 1 acceptance criteria: all 6 PASS (`update(` and `getActionUpdateThread` each declared exactly once; `setEnabledAndVisible(` present, `setEnabled(` absent; `ActionUpdateThread.BGT` present; extracted `update` body contains zero `ServerStatus`/`bbjHomePath`; exactly one `assertIsNonDispatchThread()` and one `executeOnPooledThread(() -> performLogin(project))`; guard defines its own private helpers)
- Task 2 acceptance criteria: all 6 PASS (four ordered index relationships asserted, not mere presence; assertions scoped to the extracted `performLogin` body; owner-only creation and deletion each asserted exactly once; `BbjEMLoginAction.java` unchanged by this task — confirmed via `git diff --quiet` both before staging and after the falsification restore; guard defines its own private helpers; falsification demonstrated to fail then pass again)
- Plan-level `<verification>`: whole suite green (1004 tests, 0 failures, 0 errors); `OffEdtDispatchSourceGuardTest` and `Lsp4ijImportAllowlistTest` pass unmodified
- Register check: `git diff HEAD~2 HEAD -- '*.java'` scanned for `EM-0[0-9]`, `D-0[0-9]`, `C-[0-9]+`, `CR-[0-9]+` — no matches (the only matches were `94-03`/`#589`/`#590` in commit subject lines, which is expected and permitted)
