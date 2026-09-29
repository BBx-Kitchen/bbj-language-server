---
phase: 118-small-dedup-drift-guards
plan: "02"
subsystem: testing
tags: [vitest, compiler-options, drift-guard, package.json, refactor]

# Dependency graph
requires:
  - phase: 114-lint-typecheck-test-suite-gates
    provides: whole-suite numFailedTests:0 gate, lint --max-warnings 0, typecheck:test
provides:
  - A two-directional vitest drift guard between package.json's bbj.compiler.* Settings-UI
    contributions and the COMPILER_OPTIONS table that drives the compile QuickPick and the
    bbjcpl arguments
  - A named allow-list (NOT_BBJCPL_FLAGS) for the one setting that is not a bbjcpl flag
    (bbj.compiler.trigger), self-checked against both sides
  - The phase's one-line COVERAGE.md declaration
affects: []

actuals:
  tokens: 1182
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two-directional drift guard: test.each over the source-of-truth table for the forward
       direction (every table entry has a matching, type/default-correct setting), plus
       test.each over the mirror's own keys (filtered by a named allow-list) for the reverse
       direction — failure messages name the full settings key and the side that drifted"

key-files:
  created:
    - bbj-vscode/test/compiler-options-package-json-drift.test.ts
    - .planning/phases/118-small-dedup-drift-guards/COVERAGE.md
  modified: []

key-decisions:
  - "Split the file across two commits matching the plan's two tasks: Task 1 landed only the
     forward-direction test (every COMPILER_OPTIONS entry has a matching, type/default-correct
     package.json setting); Task 2 added NOT_BBJCPL_FLAGS, the reverse-direction test and the
     allow-list self-check, plus COVERAGE.md"
  - "package.json's contributes.configuration is read generically as one object or an array of
     sections (merging each section's properties) even though today it is a single object, so a
     later Settings-UI section split does not silently break the guard"
  - "settingType() treats a package.json type array with exactly one non-null entry as that
     entry's type; anything else (no array, more than one non-null entry) falls through to
     JSON.stringify of the raw value so a real mismatch shows up in the assertion output instead
     of silently passing"

patterns-established:
  - "Named allow-list with a required one-line reason string for a data-drift guard's one
     legitimate exception, itself checked against both sides (present in the mirror, absent from
     the source of truth) so the allow-list cannot go stale without a test noticing"

requirements-completed: [REF-06]

coverage:
  - id: D1
    description: "Every COMPILER_OPTIONS entry (20) has a matching bbj.compiler.<configKey> setting in package.json with the same type and default; a default change, a type change and a removed setting on the package.json side each fail with the key named"
    requirement: "REF-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/compiler-options-package-json-drift.test.ts#$configKey: package.json has the same setting, type and default (20 cases)"
        status: pass
      - kind: other
        ref: "Task 1 probe: default+type+removal mutation in package.json, caught with all three named messages (see Probe Results)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every bbj.compiler.* setting in package.json (21) has a COMPILER_OPTIONS entry, except bbj.compiler.trigger which is named in NOT_BBJCPL_FLAGS with a one-line reason; a table entry added, removed or renamed fails in both directions with the key named"
    requirement: "REF-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/compiler-options-package-json-drift.test.ts#%s has a COMPILER_OPTIONS entry (20 cases) and #allow-listed %s exists in package.json and has no table entry (1 case)"
        status: pass
      - kind: other
        ref: "Task 2 probes: untabled setting + stale allow-list entry, and a renamed table entry (both directions), each caught with the key named (see Probe Results)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Descriptions and labels are not compared (19 of 20 differ on purpose); neither package.json nor compiler-options.ts changed in this plan"
    verification:
      - kind: other
        ref: "grep -c -E '\\.(description|label)\\b' on the new test file returns 0; git diff --stat bb9eccf5 for package.json and compiler-options.ts is empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "lint and typecheck:test are clean; the whole suite reports numFailedTests 0 modulo two already-documented pre-existing environment flakes, each independently confirmed to also fail (intermittently or identically) on the phase base commit bb9eccf5"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 --reporter=json (whole suite)"
        status: pass
      - kind: other
        ref: "npm run lint / npm run typecheck:test"
        status: pass
    human_judgment: true
    rationale: "The whole-suite run is not a clean numFailedTests:0 on every attempt — two pre-existing, environment-caused failures surface intermittently (see Deviations/Issues Encountered). Both were independently reproduced against the untouched phase base commit in a scratch worktree, confirming they are not caused by this plan's changes, but a human should see that reasoning rather than have it auto-pass silently."

duration: 21min
completed: 2026-09-28
status: complete
---

# Phase 118 Plan 02: Compiler-Option package.json Drift Guard Summary

**A new two-directional vitest test (`compiler-options-package-json-drift.test.ts`) fails the moment `package.json`'s `bbj.compiler.*` Settings-UI contributions and the `COMPILER_OPTIONS` table that drives the compile QuickPick and bbjcpl arguments drift apart, in either direction, with the one non-bbjcpl setting (`bbj.compiler.trigger`) named in a self-checked allow-list.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-28T20:41:00Z
- **Completed:** 2026-09-28T21:02:16Z
- **Tasks:** 2
- **Files modified:** 2 (1 new test file, 1 new COVERAGE.md)

## Accomplishments
- `test/compiler-options-package-json-drift.test.ts`: for every one of the 20 `COMPILER_OPTIONS` entries, asserts the matching `bbj.compiler.<configKey>` setting exists in `package.json` with the same type (a `["T","null"]` type array counts as `T`) and the same default value
- The reverse direction: every `bbj.compiler.*` key in `package.json` (21 total) has a `COMPILER_OPTIONS` entry, except `bbj.compiler.trigger` — named in `NOT_BBJCPL_FLAGS` with a one-line reason (it selects when the compile-on-save check runs; it is read by the client and the language server, never passed to bbjcpl as an argument)
- The allow-list is itself checked: `bbj.compiler.trigger` must exist in `package.json` and must NOT have a `COMPILER_OPTIONS` entry — a stale allow-list entry (removed from `package.json`, or later given a real table entry) now fails too
- Labels and descriptions are never read or compared (confirmed by a zero-hit grep on the test file) — 19 of 20 differ on purpose between the Settings-UI text and the QuickPick text
- Neither `package.json` nor `compiler-options.ts` was edited — the test passed against today's data with zero changes needed on either side
- `.planning/phases/118-small-dedup-drift-guards/COVERAGE.md`: the phase's one-line "no external API integration" declaration

## Task Commits

Each task was committed atomically:

1. **Task 1: A changed, retyped or missing compiler setting in package.json fails a test that reads the real table and the real package.json** - `a6940c1a` (test)
2. **Task 2: A compiler setting that exists only in package.json, or a table entry that is renamed, fails the test, with bbj.compiler.trigger allow-listed by name and reason** - `7090a56d` (test)

**Plan metadata:** committed separately after this SUMMARY.

## Files Created/Modified
- `bbj-vscode/test/compiler-options-package-json-drift.test.ts` - new two-directional drift guard: forward per-entry test, reverse per-key test, allow-list self-check
- `.planning/phases/118-small-dedup-drift-guards/COVERAGE.md` - one-line "no external API integration" declaration

## Decisions Made
- Split the new test file's content exactly along the plan's two tasks (forward-only in Task 1's commit, reverse + allow-list + COVERAGE.md in Task 2's commit) rather than writing the whole file in one commit, so each task's commit matches its own `<verify>` scope
- `contributes.configuration` is read as either a single object or an array of sections (merging every section's `properties`), even though it is a single object today, so a later Settings-UI section split does not throw instead of failing informatively
- `settingType()` falls through to `JSON.stringify` of the raw value for anything that is not a bare string or a single-non-null-entry array, so a genuinely malformed type shows up in the assertion diff rather than silently coercing to `"undefined"`

## Deviations from Plan

None - plan executed exactly as written. The two items below are investigation, not deviation: both are pre-existing environment flakes unrelated to this plan's files, confirmed against the untouched phase base commit before being accepted per the plan's own acceptance-criteria clause ("a non-zero numFailedTests is acceptable only if each failing test also fails alone and the same test name fails on bb9eccf5, recorded in the SUMMARY").

### Probe Results

**Task 1:**
- package.json probe (default change on `lineNumbering.renumber`, type change on `lineNumbering.startLine`, removal of `output.directory`): vitest exited 1, all three named failure messages present, `package.json` restored clean — `package.json probe OK`
- Table default probe (`typeChecking.enabled` default flipped in `compiler-options.ts`): vitest exited 1 with the named default-mismatch message, `compiler-options.ts` restored clean — `table default probe OK`

**Task 2:**
- Reverse package.json probe (added untabled `bbj.compiler.probeOnly`, deleted `bbj.compiler.trigger`): vitest exited 1 with both the untabled-key message and the stale-allow-list message, `package.json` restored clean — `reverse package.json probe OK`
- Table rename probe (`output.validateOnly` renamed to `output.validateOnlyProbe` in `compiler-options.ts`): vitest exited 1 with both the new-key-missing-from-package.json message and the old-key-now-untabled message, `compiler-options.ts` restored clean — `table rename probe OK`
- `lint` and `typecheck:test` both exited 0 — `gates OK`

### Whole-suite run and the two pre-existing environment flakes

The plan-level whole-suite gate (`npx vitest run --maxWorkers=2 --reporter=json`) does not report a clean `numFailedTests:0` on every attempt in this environment. Across several runs, two distinct, unrelated tests surfaced as flaky failures — never the new drift test or any file this plan touches:

1. **`test/parser-keyword-statements.test.ts` > `RECORD verbs LEN= channel option > a verifier option whose value is absent is still a parser error`** — a `5000ms` test-timeout, intermittent (observed passing once and failing twice across three consecutive standalone runs on `HEAD`). Reproduced against the untouched phase base commit `bb9eccf5` in a scratch worktree (symlinked `node_modules` and `src/language/generated`, no source changes): the identical test also passed once and failed once across two consecutive standalone runs there. This is timing/contention flakiness in the existing test, not a regression from this plan.
2. **`test/functional/installed-extension-e2e.test.ts`** — `installed extension e2e: SETOPTS-in-code (#475)` fails with `Error: No document found for URI: file://.../examples/issue475-setopts-in-code.bbj`, which cascades into the later `every composer kind carries its cue` describe block's assertions in the same file. This is the pre-existing, already-tracked "stale installed bundle" issue (see `STATE.md` Tech Debt and Deferred Items: `2026-09-24-...` / 114-REVIEW.md `installed-extension-e2e`). Reproduced identically against `bb9eccf5` in the same scratch worktree — byte-identical error message and failure shape.

Neither failure touches `package.json`, `compiler-options.ts`, or the new test file; both were independently confirmed present on the phase base commit before this plan's changes existed. The final recorded run: `numFailedTests=1 numTotalTests=3635` (only the `parser-keyword-statements.test.ts` flake that run; `installed-extension-e2e.test.ts` did not always surface in the same run because of its own internal intermittency).

### Closing-note draft (not posted from here)

**#606:** A new two-directional vitest test (`compiler-options-package-json-drift.test.ts`) is now the sync mechanism between `package.json`'s `bbj.compiler.*` Settings-UI contributions and the `COMPILER_OPTIONS` table that drives the compile QuickPick and the bbjcpl arguments. It checks keys, types and defaults in both directions and fails, naming the exact key, the moment either side adds, removes or re-defaults a setting without the matching change on the other side. `package.json` stays a static, hand-edited file rather than being generated — the two copies still exist, but they can no longer drift unnoticed, which departs from this issue's original "no longer maintain independent copies" wording (a deliberate choice, not an oversight). Descriptions and labels are intentionally different between the two files and are not compared: the Settings-UI text names the bbjcpl flag and its caveats, the QuickPick text stays short. The one setting that is not a bbjcpl flag, `bbj.compiler.trigger` (it picks when the compile-on-save check runs), is named in an allow-list with its reason, and the allow-list is itself checked so it cannot go stale unnoticed.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. Plan executed exactly as written; the two flaky/pre-existing whole-suite items above were investigated and confirmed unrelated per the plan's own acceptance criteria.

## Issues Encountered
See "Whole-suite run and the two pre-existing environment flakes" above — both investigated, both confirmed pre-existing against the phase base commit, neither caused by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-06 marked complete in `REQUIREMENTS.md`
- The `bbj.compiler.*` Settings-UI vs `COMPILER_OPTIONS` drift guard is in place and proven to catch all measured drift directions
- Ready for 118-03 (`getFunctionReference` dedup, REF-01), independent of this plan's files

## Self-Check: PASSED

- `bbj-vscode/test/compiler-options-package-json-drift.test.ts` exists on disk: FOUND
- `.planning/phases/118-small-dedup-drift-guards/COVERAGE.md` exists on disk: FOUND
- Commit `a6940c1a` found in `git log --oneline --all`: FOUND
- Commit `7090a56d` found in `git log --oneline --all`: FOUND
- All plan-level `<verification>` items re-confirmed above (new test + existing compiler-option suites pass; four probes catch all measured drift directions with the key named and restore their files; lint/typecheck:test clean; whole-suite numFailedTests accounted for with both non-zero cases confirmed pre-existing against the phase base commit)

---
*Phase: 118-small-dedup-drift-guards*
*Completed: 2026-09-28*
