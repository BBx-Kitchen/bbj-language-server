---
phase: 86-intellij-interop-settings-targeted-refresh
plan: 01
subsystem: intellij-plugin
tags: [lsp4ij, jsonrpc, intellij-actions, tdd]

requires:
  - phase: 81-intellij-parity-features
    provides: "BbjCompileAction's Task.Backgroundable + bounded-future + BbjComposerServer proxy shape, the direct template for the rewritten refresh action"
provides:
  - "bbj/refreshJavaClasses on BbjComposerServer, routed from a background task instead of a full server restart"
  - "Reason-keyed outcome classification, presentation and single-flight guard for the refresh action, each a plain-Java seam"
  - "Closure of research Pitfall 14 (LSP4IJ custom-request go/no-go) for the milestone, inherited by Phase 87's SETOPTS command layer"
affects: [87-setopts-command-layer]

actuals:
  tokens: 11000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "New com.basis.bbj.intellij.refresh package: JavaClassesRefreshFlow / JavaClassesRefreshPresenter / RefreshInFlightGuard, all plain-Java seams with no com.intellij or LSP4IJ import"
    - "Machine-readable Outcome enum dispatch (never message prose) for reason-keyed balloon presentation, following the Phase 82 ComposerNotices / Phase 81 CompileResultPresenter convention"
    - "Whole-file source-guard text assertions (comment-stripped, occurrence-counted) as the regression fence for a structural 'no automatic restart path' property no live-IDE click can prove"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlow.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenter.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuard.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlowTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenterTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/BbjRefreshJavaClassesActionSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java

key-decisions:
  - "The go/no-go on LSP4IJ issuing a targeted custom request without a restart is answered GO: bbj/refreshJavaClasses joins bbj/compile and bbj/resolvedConfigPath on the single BbjComposerServer interface (D-11)."
  - "Success is console-only (no balloon); failure/timeout/declined/null-proxy each render exactly one reason-keyed WARNING balloon with a user-clicked 'Restart language server' fallback that is the only remaining path to requestRestart in the file (D-13, D-14)."
  - "A per-project ConcurrentHashMap-backed single-flight guard drops a second invocation while one refresh is running, bounded at 60s (D-15)."

patterns-established:
  - "Outcome/Presentation split: a flow class classifies (never renders), a presenter class renders (never classifies) — the Phase 81/82 dispatch-on-enum convention extended to a third request family"

requirements-completed: [CFG-04]

coverage:
  - id: D1
    description: "Refresh Java Classes sends bbj/refreshJavaClasses instead of restarting the language server"
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "JavaClassesRefreshFlowTest#trueYieldsRefreshedWithNullDetail"
        status: pass
      - kind: integration
        ref: "ComposerRequestContractTest (all four tests, ten declared requests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every non-success outcome (declined, server-unavailable, request-failed, timed-out) produces one reason-keyed warning balloon with a user-clicked restart fallback, and the fallback is the only automatic-restart-free path in the file"
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "JavaClassesRefreshPresenterTest (8 tests, incl. presentNeverDispatchesOnTheDetailText)"
        status: pass
      - kind: unit
        ref: "BbjRefreshJavaClassesActionSourceGuardTest (7 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A second invocation while a refresh is running is dropped by a per-project single-flight guard, released on every exit path"
    requirement: "CFG-04"
    verification:
      - kind: unit
        ref: "RefreshInFlightGuardTest (5 tests, incl. the 8-thread race case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Diagnostics, completion, hover and Structure View stay answering while a refresh runs (live-IDE property; see flagged_assumptions)"
    requirement: "CFG-04"
    verification: []
    human_judgment: true
    rationale: "No IntelliJ platform test harness and no live-IDE test exist in this repo; this plan's automated evidence is structural (targeted request, no restart path, off-EDT classification). The live property itself is confirmed only by the recorded UAT hand check plan 86-04 writes into QA/FULL-TEST-CHECKLIST.md."
---

# Phase 86 Plan 1: IntelliJ Targeted Java-Class Refresh Summary

**IntelliJ's Refresh Java Classes now sends the language server's existing `bbj/refreshJavaClasses` request from a background task instead of restarting the whole server, with outcome classification, reason-keyed presentation and a single-flight guard each covered by plain JUnit.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-07T14:26:29Z
- **Completed:** 2026-09-07T14:37:31Z
- **Tasks:** 3
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments
- `bbj/refreshJavaClasses` added to `BbjComposerServer` alongside `bbj/compile` and `bbj/resolvedConfigPath`, pinned cross-language by `ComposerRequestContractTest` against `bbj-vscode/src/language/main.ts` (ten declared requests, up from nine)
- `JavaClassesRefreshFlow` classifies every outcome (`REFRESHED`/`DECLINED`/`SERVER_UNAVAILABLE`/`REQUEST_FAILED`/`TIMED_OUT`) for one bounded 60s call, with no IntelliJ or LSP4IJ import
- `BbjRefreshJavaClassesAction` sends the targeted request from a non-cancellable `Task.Backgroundable`; a success writes exactly one console line and raises no balloon
- `JavaClassesRefreshPresenter` renders every non-success outcome as one reason-keyed WARNING balloon with a "Restart language server" fallback — the only remaining automatic-restart-free path in the action
- `RefreshInFlightGuard` drops a second invocation while one refresh is running, released in a `finally` on every exit path
- `BbjRefreshJavaClassesActionSourceGuardTest` structurally pins: exactly one immediate-restart reference located inside the balloon action, zero debounced-restart/`LanguageServerManager` references, one gated notification, two console writes, one off-dispatch-thread assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "Refresh Java Classes sends one targeted request" (tracer)** - `2d08937d` (feat)
2. **Task 2: The failure surface — reason-keyed balloon with restart fallback** - `b3eec204` (feat)
3. **Task 3: Single-flight guard and source fence — RED** - `b6c354f2` (test)
4. **Task 3: Single-flight guard and source fence — GREEN** - `658533b8` (feat)

**Plan metadata:** commit to follow (docs)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - new `refreshJavaClasses()` `@JsonRequest` method
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlow.java` - outcome classification, `REFRESH_TIMEOUT_SECONDS`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenter.java` - reason-keyed presentation
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuard.java` - per-project single-flight guard
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java` - rewritten `actionPerformed`/`render`, guard wiring
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` - fourth path constant, tenth request name, camel-case exception
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` - `FakeComposerServer.refreshJavaClasses()` override
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshFlowTest.java` - flow classification cases
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/JavaClassesRefreshPresenterTest.java` - presentation cases incl. prose-independence
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/RefreshInFlightGuardTest.java` - guard cases incl. an 8-thread race
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/refresh/BbjRefreshJavaClassesActionSourceGuardTest.java` - structural no-automatic-restart fence

## Decisions Made
- D-11: closed the roadmap's go/no-go GO — LSP4IJ's dynamic proxy over `BbjComposerServer` already carries `bbj/compile` and `bbj/resolvedConfigPath` with no restart, so a third request family needed no spike.
- D-13/D-14: success is console-only; every failure path renders exactly one reason-keyed balloon with a user-clicked restart fallback, never an automatic one.
- D-15: a per-project `ConcurrentHashMap`-backed guard bounds concurrency; the request itself is bounded at 60s (D-15's stated rationale: longer than Compile's 45s since a large classpath reload takes longer).
- D-16: the language server's own handler (`main.ts`) and VS Code's `bbj.refreshJavaClasses` command are untouched — confirmed by an empty `git diff --numstat` against both files.

## Deviations from Plan

### Auto-fixed Issues

None — the tasks' `<action>` and `<acceptance_criteria>` were followed as written; no Rule 1-3 bugs, missing-critical gaps or blocking issues were found beyond what the plan itself specified.

### Process Deviation (documented, not a Rule 1-4 case)

**Task 2 (`tdd="true"`) was implemented as a single `feat` commit rather than a RED-then-GREEN sequence.** The presenter class and its test were authored together and verified green before committing, so no failing-test commit precedes the implementation commit for Task 2. Task 3 (also `tdd="true"`) followed the full cycle: `b6c354f2` (`test(86-01)`, an intentionally wrong `RefreshInFlightGuard` stub with all 5 test cases failing) then `658533b8` (`feat(86-01)`, the real `ConcurrentHashMap`-backed implementation, all cases green). This is a process gap in Task 2's execution, not a functional gap — `JavaClassesRefreshPresenterTest`'s 8 cases are green and cover every behavior in the task's `<behavior>` list.

---

**Total deviations:** 0 auto-fixed; 1 process deviation (Task 2's TDD gate sequence).
**Impact on plan:** No functional impact — all acceptance criteria and verification commands pass. Task 2's presenter is fully covered by its test suite regardless of commit ordering.

## TDD Gate Compliance

- Task 2 (`tdd="true"`): **RED gate missing.** No `test(86-01): ...` commit precedes `b3eec204` (`feat(86-01): reason-keyed failure balloon...`), which contains both `JavaClassesRefreshPresenter.java` and `JavaClassesRefreshPresenterTest.java`. GREEN is present (the same commit, tests green). No REFACTOR commit (none needed).
- Task 3 (`tdd="true"`): **Full RED-GREEN cycle present.** `b6c354f2` (`test(86-01): add failing test for per-project refresh single-flight guard`) shipped `RefreshInFlightGuard` as an intentionally wrong stub with all 5 `RefreshInFlightGuardTest` cases failing (`5 tests completed, 5 failed`, confirmed via `./gradlew test`), then `658533b8` (`feat(86-01): wire single-flight guard...`) implemented the real guard, all cases green. No REFACTOR commit (none needed).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `bbj/refreshJavaClasses` is live on `BbjComposerServer`; the `refresh` package (flow/presenter/guard) is a reusable pattern for any future targeted request that needs the same shape.
- The live-IDE property (features stay answering during a refresh) is not yet hand-verified — that recorded UAT check belongs to plan 86-04 per the phase's `<flagged_assumptions>`.
- CFG-04 (#632) is closed by this plan's automated evidence plus the pending 86-04 hand check; CFG-05 (#608, the interop port auto-detection half of this phase) is a separate, independent plan.

---
*Phase: 86-intellij-interop-settings-targeted-refresh*
*Completed: 2026-09-07*
