---
phase: 109-completion-java-class-resolution
plan: 06
subsystem: java-interop
tags: [vitest, real-interop, java-interop, regression-gate, github-issue]

requires:
  - phase: 109-completion-java-class-resolution
    provides: "109-04's JAVA_PRIMITIVE_TYPE_NAMES/isLocalJavaTypeName and 109-05's
      canonicalJavaClassName, exercised here against the real backend"
  - phase: 109-completion-java-class-resolution
    provides: "109-01's drafted #561 comment and the maintainer's comment-and-close checkpoint
      decision, carried out here"
provides:
  - "Live cold-start proof (java-class-lookups-real-interop.test.ts) that a real workspace
    init plus implicit-import load against :5008 sends no primitive/void/array/blank lookup and
    never requests one canonical class under two spellings"
  - "The phase regression gate: whole-suite numFailedTests=0, live-gated failing test names on
    HEAD are exactly the documented linking.test.ts baseline (no new name), register-clean diff"
  - "109-COMP03-MEASUREMENT.md's ## Final state section: the before/after comparison table and
    the closed regression-gate record"
  - "Issue #561 closed as completed with the maintainer's unedited drafted comment posted"
affects: []

actuals:
  tokens: 2695
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A structural cast onto a protected method (InteropPrivates.getRawClass), following the
      same BuilderPrivates pattern already used in bbj-parser-service.test.ts, lets a live test
      spy call-through instead of replacing behaviour"
    - "The phase regression gate compares live-gated test names (not counts) between HEAD and a
      scratch worktree pinned at the phase base commit, so a false 'suite still green' reading
      can never hide a name that only fails on HEAD"

key-files:
  created:
    - bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts
  modified:
    - .planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md

key-decisions:
  - "The live evidence was captured for real: :5008 was reachable, so all three cold-start tests
    ran (not skipped) and are reported with counts and JDK class names only, per JINT-01's
    confidentiality prohibition"
  - "The regression gate judged the live-gated suites by failing test name against a scratch
    worktree at the phase base, not by count -- the 11 linking.test.ts interop failures on both
    trees are the pre-existing test-harness false positive (STATE.md Blockers), confirmed by name
    match, not relabeled as noise without that comparison (JINT-02 prohibition)"
  - "#561 was posted and closed only after re-checking that the Final state section (recorded in
    this same plan, before the #561 action) still matched the drafted comment's claim that no
    position stayed out of reach -- per D-02 and this plan's own guard"

patterns-established: []

requirements-completed: [COMP-03, JINT-01, JINT-02]

coverage:
  - id: D1
    description: "A real cold start (workspace init + implicit imports) against :5008 sends no
      getClassInfo request and writes no Resolving class debug line for a primitive, void, array
      or blank name"
    requirement: JINT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts#Java class
          lookups against the real backend (real interop) > sends no request and logs no lookup
          for primitive, void, array or blank names"
        status: pass
    human_judgment: false
  - id: D2
    description: "No class is requested under two spellings in the same cold start, and
      java.util.AbstractMap.SimpleEntry requested dotted and with $ is fetched at most once and
      resolves to one object with its members"
    requirement: JINT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts#Java class
          lookups against the real backend (real interop) > never requests one class under two
          spellings"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts#Java class
          lookups against the real backend (real interop) > resolves a nested class once for both
          spellings"
        status: pass
    human_judgment: false
  - id: D3
    description: "The whole vitest suite reports numFailedTests=0, and with RUN_BBJ_TESTS=1 the
      live-gated files fail on no test name that passes on the phase base"
    requirement: [JINT-01, JINT-02]
    verification:
      - kind: command
        ref: "RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json (numFailedTests=0,
          numTotalTests=2842)"
        status: pass
      - kind: command
        ref: "name-diff of /tmp/phase-109-head-live.json vs /tmp/phase-109-base-live.json
          (base-failing=11, head-failing=11, head-only=0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "109-COMP03-MEASUREMENT.md carries a Final state table compared row by row with
      the before-fix table"
    requirement: COMP-03
    verification:
      - kind: other
        ref: ".planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md ##
          Final state (recorder re-run, byte-identical to the before-fix table)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Issue #561 is handled exactly as the maintainer chose at the 109-01 checkpoint,
      with the recorded comment text"
    requirement: COMP-03
    verification:
      - kind: other
        ref: "gh issue view 561 --json state,comments (state=CLOSED, comments=1,
          https://github.com/BBx-Kitchen/bbj-language-server/issues/561#issuecomment-5838244001)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-09-25
status: complete
---

# Phase 109 Plan 06: Real-Backend Cold-Start Proof, Regression Gate, and #561 Close-Out Summary

**A live vitest suite against the real :5008 backend proves ROADMAP criteria 4 and 5 on a real cold start (635 requests, 1106 debug lines, zero of them for a primitive/void/array/blank name, zero double-spelling requests); the phase regression gate is clean by test name against the phase base; and issue #561 is closed with the maintainer's drafted comment.**

## Performance

- **Duration:** ~24 min
- **Tasks:** 3 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Built `test/functional/java-class-lookups-real-interop.test.ts`: a live, `test.runIf(shouldRunBBjTests())`-gated suite that spies the protected `getRawClass` (structural cast, call-through) and `console.log` (DEBUG level) during a real `initializeWorkspace` + `loadImplicitImports` cold start against :5008, then resolves `java.util.AbstractMap.SimpleEntry` under both its dotted and `$` spellings
- Ran it live: :5008 was reachable, all three tests passed (not skipped) — a real cold start sent 635 `getRawClass` requests and logged 1106 `Resolving class` debug lines, none for a primitive/void/array/blank name; no canonical class requested under two spellings; the nested class resolved once and shares one object (with a `getKey` method) across both spellings
- Ran the whole vitest suite on HEAD (`RUN_BBJ_TESTS=0 --maxWorkers=2`): `numFailedTests=0` over 2842 tests
- Resolved the phase base (`0379065c25849d80b4306ba43e30f5938f5c5350`, parent of the first `(109-01)` commit), built a scratch worktree there (`node_modules` symlinked, `generated/` copied since `bbj.langium` is unchanged), and ran the four live-gated files on both trees with `RUN_BBJ_TESTS=1 --maxWorkers=1`: 11 failing names on both trees, all `linking.test.ts` interop tests (the documented test-harness false positive), zero head-only failures
- Ran the register check over the whole phase diff (`base..HEAD`, `bbj-vscode/src` + `bbj-vscode/test`): register-clean
- Re-ran the COMP-03 completion recorder for the Final state: byte-identical to the before-fix table, every position still `works`, none stayed out of reach; filled `## Final state` in `109-COMP03-MEASUREMENT.md` with the table, the before→final comparison, and the regression-gate record
- Removed the scratch worktree
- Confirmed the Final state still matched the drafted #561 comment's claim, then posted the maintainer's unedited comment and closed #561 as completed (`gh issue view 561` confirms `state=CLOSED`, `comments=1`)

## Task Commits

1. **Task 1: A real cold start against :5008 sends no primitive, array or duplicate-spelling
   lookups** - `0595f747` (test)
2. **Task 2: Phase regression gate against the base commit, register check, and the COMP-03
   final state** - `b875a500` (docs)
3. **Task 3: Carry out the maintainer's #561 choice** - `52817670` (docs)

**Plan metadata:** committed with this SUMMARY (see final commit)

## Files Created/Modified

- `bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts` - the live cold-start
  proof: `InteropPrivates` structural cast onto `getRawClass`, a `console.log` DEBUG spy, and
  three `test.runIf(run)` assertions
- `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md` - `##
  Final state` (table, before→final comparison, regression-gate record) and the `## #561
  decision` result (posted comment URL, final issue state)

## Decisions Made

- The live evidence was captured for real (backend reachable), not the "record why it could not
  run" fallback branch
- The regression gate judged by failing test name against the phase base, not by count — the 11
  `linking.test.ts` interop failures are the pre-existing baseline, confirmed by name match on
  both trees
- #561 was posted and closed only after re-confirming the Final state matched the drafted
  comment's claim (no position out of reach)

## Deviations from Plan

None - plan executed exactly as written. All three tasks completed on their first pass; no
regression was found against the phase base, so the plan's "stop and report a regression" branch
was never triggered.

## Issues Encountered

- `initializeWorkspace` logs `Workspace initialization failed: Error: ENOENT: no such file or
  directory, scandir '/test'` during the live cold-start `beforeAll` — the same harmless artifact
  of the bare test harness's synthetic `file:/test` workspace folder that
  `issue440-real-interop.test.ts` and `unknown-java-member-real-interop.test.ts` already run
  under; not a regression, and not something this plan's tests depend on succeeding.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 109 is complete: all three requirements (COMP-03, JINT-01, JINT-02) now have their
  ROADMAP-criterion evidence recorded end to end, live and unit
- `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md` is closed
  out with both a before-fix and a final state, and issue #561 is closed on GitHub
- No follow-up work was deferred to WINDOWS.md or DEBT.md by this plan

---
*Phase: 109-completion-java-class-resolution*
*Completed: 2026-09-25*

## Self-Check: PASSED

- FOUND: bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts
- FOUND: .planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md
- FOUND: .planning/phases/109-completion-java-class-resolution/109-06-SUMMARY.md
- FOUND commit 0595f747 (Task 1) in `git log --oneline --all`
- FOUND commit b875a500 (Task 2) in `git log --oneline --all`
- FOUND commit 52817670 (Task 3) in `git log --oneline --all`
- gh issue view 561: state=CLOSED, comments=1
