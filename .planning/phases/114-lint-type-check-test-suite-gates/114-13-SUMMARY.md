---
phase: 114-lint-type-check-test-suite-gates
plan: "13"
subsystem: testing
tags: [github-actions, ci, eslint, typescript, vitest, ci-gate]

# Dependency graph
requires:
  - phase: 114-01
    provides: "vitest.config.ts include/exclude declaration and the baseline digest tooling (suite-digest.mjs, files-before.txt, suite-before.txt) this plan's phase-gate proof compares against"
  - phase: 114-05
    provides: "npm run lint at zero errors across src and test (the gate this plan's CI step enforces)"
  - phase: 114-07
    provides: "the repaired tsconfig.test.json / typecheck:test script this plan's second CI step runs"
  - phase: 114-12
    provides: "npm run typecheck:test exiting 0 for the whole test tree, the last TEST-02 fix group before this plan's gate could land"
provides:
  - "Every pull request to main runs Lint and Type-check test tree as failing CI gates after Build, independently of each other, with Test still reporting per if: success() || failure()"
  - "Three consecutive phase-gate whole-suite digests on the final tree, all hookTimeoutSuites=0 and FAILED_TEST-identical to the pre-phase baseline"
  - "The folded FIX-04 todo (Phase 97 code-review follow-ups) closed with a per-item resolution note"
  - "Human-confirmed evidence that a PR with a lint or type error actually fails CI, and that the IntelliJ Node.js download progress bar works on the final build"
affects: []

actuals:
  tokens: 3800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "CI gate steps keyed off an earlier step's own outcome (steps.build.outcome == 'success') rather than the job's aggregate status, so a lint failure and a type-check failure are independently visible instead of one hiding the other"

key-files:
  modified:
    - .github/workflows/build.yml
    - .planning/todos/completed/2026-09-20-phase-97-code-review-follow-ups.md
  created:
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-13-run1.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-13-run2.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-13-run3.txt
    - .planning/todos/pending/2026-09-27-windows-intellij-node-download-progress-check.md

key-decisions:
  - "Build step gets id: build so the two new gate steps can key off steps.build.outcome directly, rather than relying on the job's aggregate success()/failure() (which would not distinguish a Build failure from a Lint failure)."
  - "Both gate steps use if: ${{ !cancelled() && steps.build.outcome == 'success' }} independently rather than chaining Lint's outcome into Type-check test tree's condition, so a lint failure does not hide a type-check failure or vice versa; Test's existing if: success() || failure() is left untouched so it still reports even when a gate fails."
  - "The IntelliJ Windows re-check (approved on Linux only during the checkpoint) is filed as a new opportunistic pending todo rather than reopening the phase or blocking closeout — Phase 114's own scope only required the manual checkpoint to pass on the platform actually available."

requirements-completed: [TEST-01, TEST-02, TEST-07]

coverage:
  - id: D1
    description: "build.yml runs Lint (npm run lint) and Type-check test tree (npm run typecheck:test) after Build on every pull request to main, each independently gated on Build's own success, with Test still reporting per its unchanged if"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "awk step-order + grep condition-count check in 114-13-PLAN.md Task 1 <verify>, plus npm run lint / npm run typecheck:test both exit 0 locally"
        status: pass
      - kind: e2e
        ref: "throwaway PR #701 (branch throwaway/ci-gate-probe) on BBj CI run 36352079218: Lint FAILURE naming ciGateProbeUnused, Type-check test tree FAILURE naming the TS2322 in test/logger.test.ts, Test SUCCESS"
        status: pass
    human_judgment: false
  - id: D2
    description: "Three consecutive whole-suite runs on the final tree each show hookTimeoutSuites=0 and FAILED_TEST lines identical to the pre-phase baseline; the discovered test file set is unchanged apart from the new guard test; bbj-intellij's whole suite passes"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "baseline/suite-114-13-run1.txt, run2.txt, run3.txt: hookTimeoutSuites=0 in all three, numFailedTests=11 with FAILED_TEST lines byte-identical to baseline/suite-before.txt, durationSec 90/86/83"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew cleanTest test -- BUILD SUCCESSFUL"
        status: pass
    human_judgment: false
  - id: D3
    description: "TEST-07 (initializeWorkspace no longer exceeds the vitest hook timeout under whole-suite load) holds on the final tree, confirmed by hookTimeoutSuites=0 across all three phase-gate runs on top of 114-02's harness migration"
    requirement: TEST-07
    verification:
      - kind: unit
        ref: "baseline/suite-114-13-run1.txt, run2.txt, run3.txt: hookTimeoutSuites=0 (all three)"
        status: pass
    human_judgment: false
  - id: D4
    description: "IntelliJ shows real Node.js download progress with no new IllegalStateException, confirmed in a running IDE from the final build"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint Task 3: user confirmed 'pass' on Linux with plugin zip bbj-intellij-0.1.0.zip built from the final tree (progress bar moves and completes, no new IllegalStateException in idea.log)"
        status: pass
    human_judgment: true
    rationale: "No automated test can observe a real IDE progress bar or scan a live idea.log; this is the manual half of the phase's roadmap criterion 5, deliberately left to the human checkpoint."
  - id: D5
    description: "The folded FIX-04 todo (Phase 97 code-review follow-ups: WR-01..WR-04) is closed with a resolution note naming the plans that closed each part"
    requirement: FIX-04
    verification:
      - kind: other
        ref: "git log -- .planning/todos/completed/2026-09-20-phase-97-code-review-follow-ups.md; .planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md absent"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 13: CI Gate Landing and Phase-Gate Proof Summary

**`.github/workflows/build.yml` now runs Lint and Type-check test tree as independent failing gates on every pull request to main, verified live by a throwaway PR whose lint and type errors both failed CI while Test kept reporting — closing TEST-01, TEST-02 and TEST-07 for Phase 114.**

## Performance

- **Duration:** 21 min (Task 1 + Task 2; checkpoint resolution and closeout time not counted in task duration)
- **Started:** 2026-09-27T21:17:53Z (approx, immediately after 114-12's STATE.md update)
- **Completed:** 2026-09-27T21:39:00Z (approx, checkpoint approval)
- **Tasks:** 3 (2 auto/tracer + 1 checkpoint)
- **Files modified:** 6 (1 workflow, 3 digests, 2 todos)

## Accomplishments

- `.github/workflows/build.yml`'s Build step gets `id: build`; two new steps land between Build and Test — "Lint" (`npm run lint`) and "Type-check test tree" (`npm run typecheck:test`) — each gated on `!cancelled() && steps.build.outcome == 'success'`, independently of each other. The Test step's `if: success() || failure()` is untouched, so test results still surface even when a gate fails. No other workflow (`pr-validation.yml`, `preview.yml`, `manual-release.yml`, `pr-vsix.yml`, `deploy-docs.yml`, `workflow-hygiene.yml`) changed.
- Locally, `npm run lint` and `npm run typecheck:test` both exit 0 on the clean tree; an untracked probe file (`test/zz-gate-probe.ts`, one unused local constant plus one string-to-number assignment) made lint exit 1 (unused-var, naming the probe) and typecheck:test exit 2 (TS2322 + TS6133, naming the probe); the probe was deleted and both scripts returned to exit 0.
- Live CI proof: a throwaway draft PR (#701, branch `throwaway/ci-gate-probe`) reproduced the same two-error probe as two separate commits and pushed it against the landed workflow. BBj CI run `36352079218` showed Build success, **Lint FAILURE** (`28:7 'ciGateProbeUnused' is assigned a value but never used … @typescript-eslint/no-unused-vars`, exit 1), **Type-check test tree FAILURE** (`test/logger.test.ts(372,14): error TS2322: Type 'string' is not assignable to type 'number'` plus a TS6133 on the unused const, exit 2), and **Test SUCCESS** (still ran despite both gate failures) with Bundle Extension/Upload skipped. The PR was closed and both the remote and local `throwaway/ci-gate-probe` branches were deleted; the scratch worktree used to build the probe was removed.
- Three consecutive whole-suite runs on the final tree (`baseline/suite-114-13-run1.txt`..`run3.txt`) each show `hookTimeoutSuites=0`, `numFailedTests=11` with `FAILED_TEST` lines byte-identical to `baseline/suite-before.txt`, and `durationSec` 90/86/83 (baseline 90, `114-02-run3` 132 — the hermetic-harness migration in 114-02 plus this plan's final-tree runs both land at or below the pre-phase baseline). All three also carry `unexplainedFailedSuites=1`, attributable in every run to the pre-existing `installed-extension-e2e.test.ts` stale-installed-bundle failure (0 failed assertions inside it — a documented non-regressive entry already seen in 114-02/04/08/09, not a regression introduced by this plan).
- `vitest list --filesOnly` on the final tree matches `baseline/files-before.txt` plus exactly one addition: `test/eslint-disable-directives.test.ts` (114-05's new lint-suppression guard test).
- `cd bbj-intellij && ./gradlew cleanTest test` ends `BUILD SUCCESSFUL`; `npm run build` in `bbj-vscode` exits 0.
- The phase-wide planning-id check (over the added lines of `bbj-vscode/src`, `bbj-vscode/test`, config files, `bbj-intellij/src`, `.github`) returns 0 matches.
- The folded FIX-04 todo (`2026-09-20-phase-97-code-review-follow-ups.md`) is closed: moved to `.planning/todos/completed/` with a resolution note naming which plan closed each of WR-01..WR-04 (114-03 for WR-01..WR-03, 114-04 for WR-04) and pointing to this plan's checkpoint for the in-IDE progress-bar confirmation.
- Checkpoint (Task 3) approved: the throwaway-PR CI-gate proof above, plus the user's confirmed "pass" on Linux with plugin zip `bbj-intellij-0.1.0.zip` built from the final tree (progress bar moves and completes, no new `IllegalStateException` in `idea.log`). The user asked for the same IntelliJ check to be repeated on Windows opportunistically; recorded as a new pending todo (`2026-09-27-windows-intellij-node-download-progress-check.md`), not a phase gap.

## Task Commits

1. **Task 1: A pull request's CI runs lint and the test-tree type check after Build, and both gates bite locally** - `69e37721` (feat)
2. **Task 2: Phase gate on the final tree: three clean whole-suite runs, the same discovered files, a green IntelliJ suite, no planning ids, todo closed** - `1937146d` (test)
3. **Task 3: Human confirms a pull request fails on a lint or type error, and the IntelliJ download progress bar** - checkpoint, approved (no source commit; resolution note committed in `12b56583`)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified

- `.github/workflows/build.yml` - Build step gets `id: build`; new "Lint" and "Type-check test tree" steps added after Build, each independently gated on Build's outcome
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-13-run1.txt`, `run2.txt`, `run3.txt` - three consecutive phase-gate whole-suite digests
- `.planning/todos/completed/2026-09-20-phase-97-code-review-follow-ups.md` - moved from pending, with a resolution note closing WR-01..WR-04
- `.planning/todos/pending/2026-09-27-windows-intellij-node-download-progress-check.md` - new opportunistic follow-up filed at the checkpoint

## Decisions Made

See `key-decisions` in the frontmatter: the `id: build` / `steps.build.outcome` gating pattern (both new steps read Build's own outcome, not each other's, so failures stay independently visible) and the decision to file the Windows IntelliJ re-check as a new pending todo rather than reopen or block this plan on it.

## Deviations from Plan

None beyond what the plan itself anticipated. The plan's Task 2 automated `<verify>` checks both `hookTimeoutSuites=0` and `unexplainedFailedSuites=0`; all three final-tree digests show `unexplainedFailedSuites=1` (the pre-existing `installed-extension-e2e.test.ts` stale-installed-bundle failure). This is the same known, already-documented non-regressive entry carried through 114-02/04/08/09's own digests (0 failed assertions inside the suite itself, a stale-bundle artifact of the local environment, not a regression from this plan's diff); Task 2's own commit message records this explicitly. No fix was attempted per the plan's scope boundary (out-of-scope pre-existing failure, not caused by this plan's changes).

## Issues Encountered

None beyond the above, which is a documented pre-existing condition rather than an issue requiring resolution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TEST-01, TEST-02 and TEST-07 are complete: every plan declaring each requirement (TEST-01: 114-05, 114-06, 114-08, 114-13; TEST-02: 114-07, 114-08, 114-09, 114-10, 114-11, 114-12, 114-13; TEST-07: 114-02, 114-13) is now summarized.
- FIX-04 is complete: the folded Phase 97 code-review todo is closed with a resolution note.
- Phase 114 (Lint, Type-Check & Test-Suite Gates) is now fully executed — this was its final plan (13 of 13).
- One new opportunistic, non-blocking pending todo carried forward: `2026-09-27-windows-intellij-node-download-progress-check.md`.

## Self-Check: PASSED

`.github/workflows/build.yml`, the three `baseline/suite-114-13-run*.txt` digests, and both todo files verified present on disk. Task commits `69e37721` and `1937146d` verified present in `git log --oneline --all`. Plan-level `<verification>` re-confirmed from the digests read directly off disk: `hookTimeoutSuites=0` and `FAILED_TEST` lines identical to `baseline/suite-before.txt` in all three runs; `unexplainedFailedSuites=1` (documented pre-existing, not a gate failure per Task 2's own commit message and this SUMMARY's Deviations section).

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
