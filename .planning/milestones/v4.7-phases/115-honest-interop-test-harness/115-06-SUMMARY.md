---
phase: 115-honest-interop-test-harness
plan: "06"
subsystem: testing
tags: [interop-harness, eslint, tsconfig, ci-gates, live-verification]

# Dependency graph
requires:
  - phase: 115-05
    provides: "report.ts/report-template.ts module split, thinned run-tests.ts CLI, and test/interop-harness-report.test.ts — the lint-clean, type-checked harness this plan puts under permanent CI scope"
provides:
  - "package.json lint script scoped to `eslint src test tools/interop-test-harness --max-warnings 0` — the harness is held to src strictness (no-explicit-any stays an error)"
  - "New tsconfig.harness.json — extends tsconfig.json, type-checks only the harness directory at src strictness (noImplicitAny on); typecheck:test now runs it after tsconfig.test.json"
  - "tsconfig.test.json's include gains tools/interop-test-harness/**/*.ts"
  - "test/eslint-disable-directives.test.ts's SCAN_ROOTS gains the harness directory"
  - "A live before/after diff of the phase-base (d6d03647) and phase-end harness runs against local BBjServices on :5008 — all 17 cases identical, no differences to explain"
  - "Whole-suite regression proof at RUN_BBJ_TESTS=0: numFailedTests 0 (3466 passed, 71 pending, 3537 total)"
  - "Human sign-off on the coloured report, the header comment and the before/after table"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6300
  tasks: 3
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A dedicated tsconfig.harness.json (extends the src tsconfig, includes only the harness directory) type-checks a tools/ directory at src strictness independent of the test tree's relaxed noImplicitAny — chained onto typecheck:test rather than folded into tsconfig.test.json's own compilerOptions"
    - "Live before/after comparisons of a harness against a real peer are captured as gitignored evidence files under coverage/phase-<N>/ (live-base.txt, live-end.txt, report-base.html, report-end.html, suite-end.json) and summarized in the plan's SUMMARY rather than committed"

key-files:
  created:
    - bbj-vscode/tsconfig.harness.json
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/tsconfig.test.json
    - bbj-vscode/test/eslint-disable-directives.test.ts

key-decisions:
  - "Per D-13/D-21, the harness's lint and type-check scope was turned on last, after the harness was already lint-clean and typed by 115-02 through 115-05 — this plan is a scope switch, not a fix pass"
  - "The phase-base and phase-end harness versions were run back to back against the same live BBjServices peer rather than on different days, eliminating peer-state drift from the comparison per D-20"
  - "No per-case difference required explanation: every one of the 17 cases reported the identical ✓ status and near-identical timing in both runs, so the D-01 through D-07 tightenings this phase made did not change any live outcome against this peer"

requirements-completed: [HARN-01, HARN-02, HARN-03, HARN-04, HARN-05, HARN-06]

coverage:
  - id: D1
    description: "npm run lint and npm run typecheck:test cover the harness at src strictness (noImplicitAny on, no-explicit-any as error), proven by two negative probes that made each gate fail before the probe file was deleted"
    requirement: HARN-02
    verification:
      - kind: other
        ref: "npm run lint (exit 0 clean) and npm run typecheck:test (exit 0 clean), both re-run after the probe file was deleted; negative-probe runs recorded non-zero exits with no-explicit-any and TS7006 respectively"
        status: pass
    human_judgment: false
  - id: D2
    description: "The reasoned-disable guard (test/eslint-disable-directives.test.ts) scans tools/interop-test-harness alongside src and test"
    requirement: HARN-02
    verification:
      - kind: unit
        ref: "npm test -- test/eslint-disable-directives.test.ts (part of Task 1's verify command, pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phase-base harness (d6d03647) and the phase-end harness ran back to back against local BBjServices on :5008; every case reported the same status in both runs, with the full 17-row table recorded below"
    requirement: HARN-01
    verification:
      - kind: e2e
        ref: "bbj-vscode/coverage/phase-115/live-base.txt and live-end.txt — both 'Results: 17 passed, 0 failed, 0 errors', exit=0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The whole test suite stays green with RUN_BBJ_TESTS=0 (numFailedTests 0) after the scope widening"
    requirement: HARN-02
    verification:
      - kind: other
        ref: "bbj-vscode/coverage/phase-115/suite-end.json — numFailedTests:0, numPassedTests:3466, numTotalTests:3537"
        status: pass
    human_judgment: false
  - id: D5
    description: "A human confirmed the coloured report (JSON keys/strings/booleans/null spans), the header comment naming CRITICAL_FIELDS and documenting --timeout, and the before/after table"
    requirement: HARN-03
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint:human-verify — human answered 'pass' (approved)"
        status: pass
    human_judgment: true
    rationale: "Visual/textual sign-off on a rendered HTML report and a header comment's wording is a human-judgment call the plan deliberately routed to a blocking-human checkpoint; it is not something a script can assert on."

# Metrics
duration: 22min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 06: Turn On Lint/Type-Check Scope for the Harness and Prove It Live Summary

**The harness's lint and type-check scope switched on last (D-13/D-14/D-21), proven by two negative probes that made each gate fail and then pass again clean; the phase-base and phase-end harness ran back to back against local BBjServices with all 17 cases identical in both runs; whole suite green at 0 failed tests; human approved the coloured report, header and before/after table.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-28T08:20:00Z
- **Completed:** 2026-09-28T08:42:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `package.json`'s `lint` script now names `tools/interop-test-harness` alongside `src test`, holding the harness to the same `no-explicit-any`-as-error rule set as `src` — only `test/**` turns that rule off, and the harness was never in that carve-out.
- New `tsconfig.harness.json` extends `tsconfig.json` (so `noImplicitAny` stays on) and includes only the harness directory; `typecheck:test` now chains `tsc -p tsconfig.test.json --noEmit && tsc -p tsconfig.harness.json --noEmit`, so the harness is checked at src strictness independent of the test tree's relaxed `noImplicitAny: false`.
- `tsconfig.test.json`'s `include` gained `tools/interop-test-harness/**/*.ts` and its comment now explains the harness is included there and separately checked at src strictness by `tsconfig.harness.json`.
- `test/eslint-disable-directives.test.ts`'s `SCAN_ROOTS` gained `'tools/interop-test-harness'`, so the reasoned-disable guard now covers the harness the same way it covers `src` and `test`.
- Two negative probes (an untracked file with an explicit `any` and an untracked file with an unannotated parameter) proved both gates bite: `npm run lint` failed on `no-explicit-any`, and `npm run typecheck:test` failed with `TS7006`. Both probe files were deleted afterward; `npm run lint`, `npm run typecheck:test` and the targeted vitest run (`eslint-disable-directives.test.ts`, `interop-harness.test.ts`, `interop-harness-report.test.ts`, 45 tests) all pass clean, and `npm run build` exits 0.
- The phase-base harness (`d6d03647`'s `run-tests.ts`, run via the local `tsx` binary) and the phase-end harness (`npm run interop-harness`) each ran once against the same live BBjServices on `127.0.0.1:5008`, one right after the other. Both printed all 17 case lines as ✓, both reported `Results: 17 passed, 0 failed, 0 errors`, and both exited 0.
- The whole suite ran with `RUN_BBJ_TESTS=0 --maxWorkers=2`: `numFailedTests: 0` (3466 passed, 71 pending, 3537 total). `installed-extension-e2e` reported as a failed suite with 0 failed assertions (pre-existing stale-bundle condition, unrelated to this phase); `linking.test.ts`'s interop-dependent tests were skipped as expected with `RUN_BBJ_TESTS=0`.
- A human reviewed `report-end.html` (confirming 608 `json-key`, 609 `json-string`, 23 `json-bool` and 1 `json-null` spans render), `run-tests.ts`'s header comment (lines 1-27, naming `CRITICAL_FIELDS`'s eight fields and documenting `--host`/`--port`/`--output`/`--timeout` with defaults and exit codes), and the before/after table, then answered **"pass" (approved)**.
- Register check over the phase's full code diff against `d6d03647` (`tools`, `test`, `package.json`, `tsconfig.test.json`, `tsconfig.harness.json`, `CLAUDE.md`): 0 occurrences of any planning identifier.

## Task Commits

Each task was committed atomically:

1. **Task 1: npm run lint and npm run typecheck:test cover the harness at src strictness, proven by negative probes** - `aa5d3b0b` (feat)
2. **Task 2: The phase-base and phase-end harnesses run back to back against local BBjServices, and every per-case difference is explained** - (no commit; no tracked files changed — evidence captured under the gitignored `bbj-vscode/coverage/phase-115/` directory: `live-base.txt`, `live-end.txt`, `report-base.html`, `report-end.html`, `suite-end.json`, `suite-end-console.log`)
3. **Task 3: A human confirms the coloured report, the header and the before/after table** - checkpoint, no commit (human answered "approved")

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified

- `bbj-vscode/package.json` — `lint` script now names `tools/interop-test-harness`
- `bbj-vscode/tsconfig.harness.json` — new; type-checks the harness at src strictness
- `bbj-vscode/tsconfig.test.json` — `include` gains the harness directory; comment updated
- `bbj-vscode/test/eslint-disable-directives.test.ts` — `SCAN_ROOTS` gains the harness directory

## Live Before/After Table (D-20, Task 2)

Phase-base harness (`d6d03647`) vs. phase-end harness, both run against the same local BBjServices on `127.0.0.1:5008`, one right after the other.

| # | Case | Base status | End status | Explanation |
|---|------|-------------|------------|--------------|
| 1 | java.lang.String — static methods, constructors | ✓ pass | ✓ pass | Identical — no rule applies |
| 2 | java.util.HashMap — constructors with varying arity | ✓ pass | ✓ pass | Identical — no rule applies |
| 3 | java.util.Date — deprecated methods | ✓ pass | ✓ pass | Identical — no rule applies |
| 4 | java.lang.Math — static methods/fields, private constructor | ✓ pass | ✓ pass | Identical — no rule applies |
| 5 | java.lang.Boolean — static fields (TRUE, FALSE) | ✓ pass | ✓ pass | Identical — no rule applies |
| 6 | java.sql.Connection — interface, no constructors | ✓ pass | ✓ pass | Identical — no rule applies |
| 7 | java.lang.System — static fields (out, err, in) | ✓ pass | ✓ pass | Identical — no rule applies |
| 8 | java.util.Map$Entry — nested/inner class | ✓ pass | ✓ pass | Identical — no rule applies |
| 9 | Primitive type — int | ✓ pass | ✓ pass | Identical — D-01 tightened case 9's disjunction assertion, but the real peer response already satisfied it in both versions |
| 10 | Non-existent class — error handling | ✓ pass | ✓ pass | Identical — D-02's error-signal requirement (case 10 opts into `acceptsPeerError`) was already satisfied by the peer's real error reply in both versions |
| 11 | java.lang.Deprecated — annotation type | ✓ pass | ✓ pass | Identical — no rule applies |
| 12 | getClassInfos — java.lang | ✓ pass | ✓ pass | Identical — D-04/D-06's field-check counting toward status was already satisfied by this peer's real field data in both versions |
| 13 | getClassInfos — java.util | ✓ pass | ✓ pass | Identical — D-01 tightened case 13's disjunction assertion, already satisfied by the real peer response |
| 14 | getClassInfos — com.basis.startup.type | ✓ pass | ✓ pass | Identical — D-01 tightened case 14's disjunction assertion, already satisfied by the real peer response |
| 15 | getTopLevelPackages | ✓ pass | ✓ pass | Identical — no rule applies |
| 16 | loadClasspath — empty | ✓ pass | ✓ pass | Identical — no rule applies |
| 17 | loadClasspath — file: prefix | ✓ pass | ✓ pass | Identical — D-03's boolean-or-peer-error requirement was already satisfied by the real peer response in both versions |

**Base:** `Results: 17 passed, 0 failed, 0 errors`, `exit=0`
**End:** `Results: 17 passed, 0 failed, 0 errors`, `exit=0`

No case's status differed between the two runs. The tightened assertions (D-01 through D-07) changed what each case *checks*, not what it *finds*, against this real peer — the peer's actual responses already satisfied every tightened condition, so nothing surfaced as a new pass/fail/error transition. This is itself the honest-harness proof the phase set out to deliver: the old, looser assertions and the new, stricter ones agree on a real peer, and the strictness is not manufacturing false failures.

**Whole-suite regression (RUN_BBJ_TESTS=0 --maxWorkers=2):** `numFailedTests: 0` (3466 passed, 71 pending, 3537 total). `pgrep -af vitest` confirmed no leftover workers after the run.

**Register check:** `git diff d6d03647 -- bbj-vscode/tools bbj-vscode/test bbj-vscode/package.json bbj-vscode/tsconfig.test.json bbj-vscode/tsconfig.harness.json CLAUDE.md | grep '^+[^+]' | grep -cE '...'` → **0**.

## Decisions Made

- Per D-13/D-14/D-21, the lint and type-check scope was switched on only after the harness was already clean (115-02 through 115-05 did the fix work) — this plan changed only script strings, one include line and one new tsconfig, with `eslint.config.js` and `.github/workflows` untouched (`git diff d6d03647` on those paths is empty).
- Per D-20, the base and end harness versions ran against the same live peer back to back rather than on different days, so peer-state drift could not be mistaken for a rule-driven status change.
- No differences needed explanation: all 17 cases matched between base and end. The SUMMARY records each case's would-be explanation (which D-0x rule *could* have changed it) alongside the observation that the real peer already satisfied every tightened condition, per the plan's own instruction to attribute every row rather than leave changed/unchanged status unexplained.

## Deviations from Plan

None - plan executed exactly as written.

The gitignored scratch file `bbj-vscode/coverage/phase-115/tsconfig.harness-probe.json` (122 bytes, written during Task 1's negative-probe work as a throwaway type-check config) was left in place under the gitignored `coverage/phase-115/` directory — it is untracked, harmless, and out of the plan's tracked-file scope; no action was needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Regression Check

Whole-suite run (`RUN_BBJ_TESTS=0 npm test -- --maxWorkers=2`): `numFailedTests: 0` (3466 passed, 71 pending, 3537 total). `npm run lint`, `npm run typecheck:test` and the targeted vitest run (`eslint-disable-directives.test.ts`, `interop-harness.test.ts`, `interop-harness-report.test.ts`) all pass clean. `npm run build` exits 0. `git status --porcelain -- bbj-vscode/tools bbj-vscode/test` printed nothing after Task 2 — the live runs changed no tracked file.

## Next Phase Readiness

- Phase 115 (Honest Interop Test Harness) is now fully executed: all 6 plans complete, all 6 HARN requirements (HARN-01 through HARN-06) and DEP-03 (completed in an earlier plan) done.
- CI's existing Lint, Type-check test tree and Test steps in `build.yml` now gate the harness on every pull request with no workflow-file change (D-18) — the next push with an open PR is the live confirmation point noted in the checkpoint's optional step 4.
- No blockers. Next: `/gsd-verify-work 115` or advance to Phase 116 (Java-Interop Test Coverage).

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tsconfig.harness.json` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/coverage/phase-115/live-base.txt` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/coverage/phase-115/live-end.txt` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/coverage/phase-115/report-end.html` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/coverage/phase-115/suite-end.json` — FOUND
- `git log --oneline --all | grep -q aa5d3b0b` — FOUND
- Task 1 acceptance criteria re-verified: `npm run lint` and `npm run typecheck:test` exit 0; package.json script strings match exactly; `tsconfig.test.json`/`tsconfig.harness.json` include lines present; `tsconfig.harness.json` has no `noImplicitAny: false`; `SCAN_ROOTS` contains the harness path; probe file absent; `eslint.config.js`/`.github/workflows` unchanged since `d6d03647`; `npm run build` exits 0 — ALL PASS
- Task 2 acceptance criteria re-verified: both logs hold 17 case lines each with `numFailedTests: 0` in `suite-end.json`; before/after table complete with an explanation per row; both exit codes and Results lines recorded; register-check count is 0; `git status --porcelain -- bbj-vscode/tools bbj-vscode/test` is empty — ALL PASS
- Task 3: human answered "approved" — PASS
- Plan-level `<verification>` re-run: lint/typecheck/targeted-test command exits 0; whole suite `numFailedTests: 0`; live table complete and explained; checkpoint approved — ALL PASS

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
