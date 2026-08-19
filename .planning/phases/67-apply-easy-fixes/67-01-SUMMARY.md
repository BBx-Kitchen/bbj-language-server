---
phase: 67-apply-easy-fixes
plan: 01
subsystem: language-server
tags: [langium, type-inference, vitest, java-interop, testing-infra]

# Dependency graph
requires:
  - phase: 66-known-debt-re-triage
    provides: P66-D2-001 (DEBT-03 re-triage), the six closed COVERAGE files this plan derives from
provides:
  - 67-BASELINE.md — the phase-start measured test/build baseline (D-07/D-08) plus this plan's delta
  - 67-APPLY-SET.md — the 77-row derived ledger (D-01), 3 rows closed, 2 excluded, 1 deferred, 71 pending
  - derive-apply-set.mjs — the reproducible mechanical derivation script
  - the red-then-green commit convention (D-12), proven end-to-end on the D-04 merged pair
affects: [67-02, 67-03, 67-04, 67-05, 67-06, 67-07, 67-08, 67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 21910
  tasks: 3
  commits: 7

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Red-then-green commit pairing: test(<FINDING-ID>): ... immediately followed by fix(<FINDING-ID>): ..., both commits citing the same finding ID(s)"
    - "D-04 merge: two finding records naming the identical location/edit get two separate ledger rows, applied and committed once, both rows closed against the same commit pair"
    - "Mechanical ledger derivation: a committed Node ESM script (no framework) parses fenced-block finding records from COVERAGE.md files and re-derives the apply set deterministically"

key-files:
  created:
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/derive-apply-set.mjs
  modified:
    - bbj-vscode/src/language/bbj-type-inferer.ts
    - bbj-vscode/test/method-return-java-type.test.ts

key-decisions:
  - "D-04 merge realized as TWO ledger rows (one per finding ID), not one combined row — both closed against the same red+green commit pair, per this plan's own acceptance criteria"
  - "FIX-01..04 NOT marked complete in REQUIREMENTS.md despite appearing in this plan's frontmatter requirements field — their own wording ('after all fixes', 'each easy fix') describes phase-end state; only 3 of 77 rows are applied after this plan, so marking complete now would misrepresent progress. Left Pending for 67-12 (phase close) to mark, following D-07's stated-not-restated-wording philosophy."
  - "P61-D8-005/P61-D4-010's off-scale effort=1 carried through unrounded per plan instruction — noted in the ledger that the source COVERAGE records carry no additional inline 'rounded down' annotation beyond the raw value, since none was found in the two records' text"

patterns-established:
  - "Ledger row shape (16 fields) proven on 2 real closed rows before Task 2's 77-row mechanical derivation ran"
  - "Per-commit verification: npm run build + npx vitest run <touched files only>; per-plan verification: one full npm test + npm run lint baseline-delta run comparing failing-test NAMES against 67-BASELINE.md's gate set"

requirements-completed: []

coverage:
  - id: D1
    description: "67-BASELINE.md captures the phase-start npm test/npm run lint/gradlew build state with the 11 deterministic linking.test.ts failures individually named, distinguished from load-dependent beforeAll-hookTimeout flakiness"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-BASELINE.md — captured 2026-08-19, two npm test runs cross-checked"
        status: pass
    human_judgment: false
  - id: D2
    description: "67-APPLY-SET.md holds all 77 easy-fix rows, mechanically re-derivable via derive-apply-set.mjs, with 2 excluded (INVENTORY immutable), 1 deferred (no JDK 17), and 3 applied rows fully closed"
    verification:
      - kind: other
        ref: "node .planning/phases/67-apply-easy-fixes/derive-apply-set.mjs — total=77, split 61=44 62=14 63=10 64=8 65=0 66=1, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "P61-D2-011/P66-D2-001 (D-04 merge): bbj-type-inferer.ts falls back to getResolvedClass(member.returnType) when resolvedReturnType is unset, landed red-then-green"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/method-return-java-type.test.ts#a JavaMethod whose resolvedReturnType was never populated still produces the incompatible-type diagnostic"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/linking.test.ts — 11 pre-existing deterministic failures unchanged (unrelated interop-peer gate set)"
        status: pass
    human_judgment: false
  - id: D4
    description: "P61-D5-009: committed regression test asserting the inferred type of a static Java method call (String.valueOf(2) -> java.lang.String), test-is-the-fix per D-13"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/method-return-java-type.test.ts#String.valueOf(2) infers to the java.lang.String class"
        status: pass
    human_judgment: false

duration: ~14min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 01: Apparatus Stand-up Summary

**Stood up Phase 67's ledger/baseline apparatus and proved the red-then-green fix convention end-to-end on the D-04 merged pair (`bbj-type-inferer.ts`'s unresolved-`JavaMethod`-return-type fallback), then mechanically derived all 77 easy-fix ledger rows.**

## Performance

- **Duration:** ~14 min (commit span 09:59:02Z → 10:09:33Z)
- **Started:** 2026-08-19T09:56:00Z (approx, session start)
- **Completed:** 2026-08-19T10:09:51Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Captured `67-BASELINE.md`: the phase-start `npm test` (11 deterministic `linking.test.ts` interop failures vs. 5 load-dependent `beforeAll`-hookTimeout flaky suites, matching INVENTORY exactly), `npm run lint` (2 pre-existing warnings, exit 0), and `./gradlew build` (JDK 17 vs. installed 25.0.3 version-check failure) states.
- Landed the D-04 merged fix (`P61-D2-011` + `P66-D2-001`) red-then-green: `bbj-type-inferer.ts`'s `getTypeInternal` now falls back to `this.javaInterop.getResolvedClass(member.returnType)` when a `JavaMethod`'s `resolvedReturnType` was never populated (the async `resolveClass()` Phase 2 hadn't completed, or the method was constructed outside it entirely) — closing DEBT-03's `String.valueOf(2)` type-inference gap.
- Wrote `derive-apply-set.mjs`, a committed Node ESM script that mechanically re-derives the 77-row easy-fix apply set from the six closed `COVERAGE.md` files (exits non-zero unless total=77 and the per-phase split is exactly `61=44 62=14 63=10 64=8 65=0 66=1`), and merged its output into `67-APPLY-SET.md` alongside the 3 rows this plan closed.
- Closed `P61-D5-009`'s ledger row with a self-contained regression test asserting the *inferred type* of `String.valueOf(2)` directly via the type inferer service (distinct assertion mechanism from the D-04 pair's diagnostic-message test) — test-is-the-fix per D-13, no red state required.
- Ran the plan-level baseline delta (D-09): `npm test`'s failing-test NAME set is set-equal to the phase-start gate set (same 11 names); `npm run lint` unchanged. Verdict: **identical**.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end slice — baseline captured, ledger opened, D-04 pair landed red-then-green**
   - `2d1033c` — `docs(67): capture phase-start test and build baseline`
   - `382a068` — `test(P61-D2-011,P66-D2-001): add failing test for unresolved JavaMethod return type` (RED)
   - `32faeff` — `fix(P61-D2-011,P66-D2-001): fall back to getResolvedClass for unresolved JavaMethod return` (GREEN)
   - `e7f8239` — `docs(P61-D2-011,P66-D2-001): close apply-set rows`
2. **Task 2: Derive all 77 ledger rows mechanically**
   - `279b658` — `docs(67): derive 77-row apply set from the six COVERAGE files`
3. **Task 3: P61-D5-009 and the plan's baseline delta**
   - `2b121ee` — `test(P61-D5-009): assert inferred type of a static Java method call`
   - `ded5bbe` — `docs(67-01): record plan baseline delta`

_Note: Task 1 is a `type="tracer"` task — real implementation, real `<verify>`, atomic commits per step; no separate feedback-gate checkpoint was needed since it ran autonomously and its own `<verify>` passed before Task 2 began._

## Files Created/Modified

- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — phase-start baseline + this plan's delta subsection
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — the 77-row ledger (3 applied, 2 excluded, 1 deferred, 71 pending)
- `.planning/phases/67-apply-easy-fixes/derive-apply-set.mjs` — mechanical derivation script
- `bbj-vscode/src/language/bbj-type-inferer.ts` — `getTypeInternal`'s `isJavaMethod` branch, one-line fallback + comment
- `bbj-vscode/test/method-return-java-type.test.ts` — 2 new `describe` blocks (D-04 pair's diagnostic test, P61-D5-009's inferred-type test)

## Decisions Made

- D-04 merge realized as **two** ledger rows (one per finding ID: `P61-D2-011` row 10, `P66-D2-001` row 77 in the final phase+ID sort order), not a single combined row — matches this plan's own acceptance criteria ("a fenced row block for `P61-D2-011` and one for `P66-D2-001`"), both closed against the identical red+green commit pair.
- `derive-apply-set.mjs` renumbers all 77 rows by strict phase-then-finding-ID sort order; the two rows Task 1 closed were re-numbered from their provisional (1, 2) to their sorted position (10, 77) during the Task 2 merge, with their content (commit shas, `fail_before`, `fix_applied`, `verification`, `notes`) carried through unchanged.
- **FIX-01..04 left `Pending` in `REQUIREMENTS.md`**, despite being named in this plan's frontmatter `requirements` field. Their own wording describes phase-end state ("after all fixes...", "each easy fix..."), and only 3 of 77 rows are applied after this single plan (11 plans remain). Marking them complete now would misrepresent progress; per D-07's "say what is true, don't restate the requirement's wording as if it had been met" philosophy, they are left for plan 67-12 (phase close) to mark once genuinely discharged.
- `P61-D8-005`/`P61-D4-010`'s off-scale `effort: 1` carried through unrounded, with the ledger noting that neither source record actually carries an inline "rounded down" annotation string beyond the raw value (the plan's own text asserted one exists; it does not, verbatim, in either record — carried forward as a discrepancy note rather than fabricating a quote).

## Deviations from Plan

None — plan executed exactly as written. Two implementation choices needed judgment beyond the plan's literal text (both documented above under Decisions Made): the D-04 merge's row-count realization, and the off-scale-effort annotation discrepancy. Neither is a Rule 1-4 auto-fix; both are documentation-fidelity judgment calls within the plan's own stated intent.

## Issues Encountered

- The plan's off-scale-effort instruction ("already annotated in-record as rounded down for ISSUE-03") does not match the actual text of `P61-D8-005`/`P61-D4-010` — neither record contains that annotation. Resolved by carrying the raw `effort: 1` value through unrounded (as instructed) and noting the discrepancy in the ledger's `notes:` field rather than inventing a quote.
- `BBjTypeInferer`'s `getResolvedClass` returns a `JavaClass` whose `.name` field is cut down to the simple name post-resolution (packageName carries the rest) — the P61-D5-009 test's first assertion attempt (`inferred.name === 'java.lang.String'`) failed for this reason; fixed by reconstructing the FQN from `packageName` + `name`, matching `check-classes.ts`'s own `classDisplayName()` convention.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The apparatus (`67-BASELINE.md`, `67-APPLY-SET.md`, `derive-apply-set.mjs`) is in place and proven; plans 67-02 through 67-11 apply the remaining 71 pending rows (grouped by file, per `67-PATTERNS.md`'s serialization groups), and 67-12 closes the phase with the phase-close baseline delta and final `REQUIREMENTS.md` updates.
- No blockers. The 11-name deterministic gate set and the 2 lint warnings are known, stable, and unaffected by this plan's fix — future plans should re-run the same `npm test`/`npm run lint` comparison per-plan (D-09) and expect the same baseline unless `P61-D4-010` (clears both lint warnings) is the plan in question.

## Self-Check: PASSED

All 6 created/modified files confirmed present on disk; all 7 commit hashes confirmed present in `git log --oneline --all`.
