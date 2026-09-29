---
phase: 114-lint-type-check-test-suite-gates
plan: "01"
subsystem: testing
tags: [vitest, test-discovery, language-configuration, baseline]

# Dependency graph
requires: []
provides:
  - "Phase baseline digests (base-sha.txt, files-before.txt, suite-before.txt) that every later 114-xx plan compares its D-07/D-10/D-11 behaviour-neutrality claims against"
  - "A dependency-free vitest-JSON-report digest script (suite-digest.mjs) reused by later plans and the phase gate"
  - "Explicit vitest test.include/test.exclude in vitest.config.ts (TEST-03)"
  - "bbx-language-configuration.json JSON-validity and editor-behaviour test coverage (TEST-11)"
affects: [114-02, 114-05, 114-06, 114-07, 114-08, 114-09, 114-10, 114-11, 114-12, 114-13]

actuals:
  tokens: 4040
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Baseline capture before any phase edit: prove the tree equals the phase base commit, then snapshot vitest's discovered file set and a whole-suite JSON digest, before touching any config"
    - "Digest script pattern: a dependency-free .mjs reads a vitest JSON reporter file and prints stable, greppable key=value lines plus sorted FAILED_TEST/FAILED_SUITE lines for byte-for-byte diffing"

key-files:
  created:
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-digest.mjs
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/base-sha.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/files-before.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-before.txt
  modified:
    - bbj-vscode/vitest.config.ts
    - bbj-vscode/test/language-configuration.test.ts

key-decisions:
  - "vitest.config.ts uses include: ['test/**/*.test.ts'] and exclude: ['out/**', 'node_modules/**'] (D-11) — verified byte-identical to the 159-file default-discovered set both before and after the edit"
  - "The bbx-language-configuration.json describe block mirrors the bbj block's structure exactly (four tests: strict-parse, entry counts, editor behaviour, package.json wiring) rather than inventing a different shape, per D-16"

requirements-completed: [TEST-03, TEST-11]

coverage:
  - id: D1
    description: "Phase baseline (base-sha.txt, files-before.txt, suite-before.txt) captured from the untouched phase-base tree, plus a reusable suite-digest.mjs script"
    verification:
      - kind: other
        ref: "git diff --quiet e8941d48 -- bbj-vscode bbj-intellij .github (tree-equals-base check run before capture)"
        status: pass
      - kind: unit
        ref: "node baseline/suite-digest.mjs /nonexistent.json exits non-zero"
        status: pass
    human_judgment: false
  - id: D2
    description: "vitest.config.ts declares explicit test.include/test.exclude resolving the identical pre-change 159-file set (TEST-03)"
    requirement: "TEST-03"
    verification:
      - kind: other
        ref: "npx vitest list --filesOnly | grep -E '^test/.*\\.test\\.ts$' | LC_ALL=C sort | diff - baseline/files-before.txt"
        status: pass
    human_judgment: false
  - id: D3
    description: "bbx-language-configuration.json covered for strict JSON validity and editor-behaviour entries, mirroring the bbj file (TEST-11)"
    requirement: "TEST-11"
    verification:
      - kind: unit
        ref: "test/language-configuration.test.ts#bbx-language-configuration.json (#629)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 01: Baseline Capture, Explicit Vitest Discovery, bbx Config Coverage Summary

**Committed a reusable vitest-JSON digest script plus the phase's before-state baseline, then made vitest's test discovery explicit and gave `bbx-language-configuration.json` the same JSON-validity and editor-behaviour tests the bbj file already has.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-27T16:30:53Z
- **Completed:** 2026-09-27T16:43:44Z
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- `baseline/suite-digest.mjs` prints a dependency-free digest of any vitest JSON report (interop5008 probe, test/suite counts, hook-timeout and unexplained-suite counts, duration, sorted FAILED_TEST/FAILED_SUITE lines) that every later 114-xx plan and the phase gate reuse for comparison.
- `baseline/base-sha.txt`, `files-before.txt` (159 discovered test files) and `suite-before.txt` (`numFailedTests=11`, all in `test/linking.test.ts`, `interop5008=open`) captured from the tree proven equal to the phase base commit (`e8941d48`), before any other phase edit landed.
- `bbj-vscode/vitest.config.ts` now declares `test.include: ['test/**/*.test.ts']` and `test.exclude: ['out/**', 'node_modules/**']`; `npx vitest list --filesOnly` resolves the byte-identical 159-file set both before and after.
- `bbj-vscode/test/language-configuration.test.ts` gained a `bbx-language-configuration.json (#629)` describe block with four tests (strict-parse, entry counts, editor-behaviour entries, package.json wiring), mirroring the existing bbj block.

## Task Commits

1. **Task 1: Baseline digests on the base commit, then an explicit discovery boundary proven identical to them** - `e79e5438` (feat)
2. **Task 2: The bbx language configuration is tested for strict JSON and its editor-behaviour entries, like the bbj file** - `ebc3ccfc` (test)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-digest.mjs` - dependency-free vitest JSON report digest
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/base-sha.txt` - phase base commit SHA
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/files-before.txt` - pre-change 159-file discovered test set
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-before.txt` - pre-change whole-suite digest
- `bbj-vscode/vitest.config.ts` - explicit `test.include`/`test.exclude`
- `bbj-vscode/test/language-configuration.test.ts` - new `bbx-language-configuration.json (#629)` describe block

## Decisions Made
- Used the exact D-11 globs (`include: ['test/**/*.test.ts']`, `exclude: ['out/**', 'node_modules/**']`) — verified byte-identical to the pre-change file set, satisfying the TEST-03 scope prohibition against silently dropping or sweeping in files.
- Mirrored the bbj describe block's structure (readFileSync + JSON.parse, same test names/shapes) for the bbx block rather than a novel structure, per D-16 and the plan's `<interfaces>` facts (comments=1, brackets=4, autoClosingPairs=6, surroundingPairs=6, no onEnterRules).

## Deviations from Plan

None - plan executed exactly as written.

## Mutation Probe (Task 2)

Added a trailing comma after the last `surroundingPairs` entry in `bbj-vscode/bbx-language-configuration.json`, re-ran `npx vitest run test/language-configuration.test.ts`: 3 of 8 tests failed, with **`bbx-language-configuration.json (#629) > parses as strict JSON`** failing first (`SyntaxError: Unexpected token ']'`), confirming the test goes red on a broken file. Restored the file with `git checkout -- bbj-vscode/bbx-language-configuration.json`; `git status --porcelain` on the file printed nothing afterward, and a follow-up test run confirmed all 8 tests green again.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The baseline digests and `suite-digest.mjs` are in place for every later 114-xx plan (TEST-02, TEST-01, TEST-07, FIX-04) to prove behaviour-neutrality against.
- Whole-suite verification after both tasks: `numFailedTests=11` (unchanged from baseline), `interop5008=open` (unchanged), and the sorted `FAILED_TEST` line set diffs clean against `baseline/suite-before.txt`. `failedSuites`/`unexplainedFailedSuites` moved from 9/7 to 12/11 between the two runs with `numFailedTests` unchanged in both — consistent with the project's documented parallel-worker contention pattern (hook-timeout-shaped suite failures with 0 failed assertions), not a regression; Plan 02 (TEST-07) addresses the underlying hook-timeout hot spot.
- Ready for `114-02` (hook-timeout fix) and the other wave plans.

## Self-Check: PASSED

All 6 created/modified files verified present on disk; both task commits (`e79e5438`, `ebc3ccfc`) verified present in git log; plan-level `<verification>` (language-configuration test, discovery diff, whole-suite FAILED_TEST diff) re-confirmed above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
