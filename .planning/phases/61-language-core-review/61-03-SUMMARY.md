---
phase: 61-language-core-review
plan: 03
subsystem: testing
tags: [langium, validation, bbjcpl, code-review, security-audit, dead-code]

# Dependency graph
requires:
  - phase: 61-language-core-review (plan 61-02)
    provides: 61-COVERAGE.md skeleton with RU-61-01 sweep complete and RU-61-03's stub section
provides:
  - RU-61-03 (validation & BBjCPL diagnostics, 8 files / 2,542 LOC) fully swept across all 6 live dimensions in 61-COVERAGE.md
  - 9 new finding records (P61-D1-003, P61-D2-009, P61-D2-010, P61-D4-006, P61-D4-007, P61-D5-005, P61-D5-006, P61-D8-003, P61-D8-004)
  - Phase-wide ledger advanced from 12 to 18 recorded / 32 pending / 38 n/a / 88 total
affects: [61-04, 61-05, 61-06, 61-07, 65-cross-cutting-security-audit, 67-easy-fixes, 68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 11283
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reproductions built as throwaway vitest test files under bbj-vscode/test/, run once via `npx vitest run`, then deleted before committing — never committed to the tree."
    - "Langium's AstUtils.streamAllContents returns a TreeStreamImpl whose descent into a node's children is only stopped by the iterator's own prune() method; a bare `continue` inside a `for...of` loop does not prune and silently re-visits excluded subtrees."

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "P61-D1-003 (bbjcpl spawn path validation gap) rated severity `high` to match the plan's own pre-registered threat T-61-P03-S1, forcing classification `major` per D-13's safety gate; evidence follows D-12's two-tier disclosure (repro built and run, but the reproduction script itself is not published in the record)."
  - "P61-D2-010's redundant-AST-walk consequence (Program-scope validation re-visiting every nested MethodDecl body due to the same un-pruning bug) was folded into P61-D2-010 as secondary D3 rather than filed as a second D3 record, since it shares one root cause and the redundancy is bounded (~2x, not quadratic)."
  - "P61-D5-005/P61-D5-006 (test coverage gaps) were classified `easy` rather than `major`, unlike RU-61-06's precedent, because closing each gap needs no new test infrastructure — both reuse patterns already present in the existing test files (createMockServices, plain vitest cases)."

requirements-completed: []  # RVW-01 spans all 7 units; only 3 of 7 are swept after this plan — not marked complete (per plan's explicit prohibition)

coverage:
  - id: D1
    description: "RU-61-03's 3 repro-tier dimensions (D1 Security, D2 Correctness, D3 Performance) recorded in 61-COVERAGE.md with pass/fail verdicts and written check lines"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-03-PLAN.md Task 1 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-03's 3 trace-tier dimensions (D4 Maintainability, D5 Test coverage, D8 Doc accuracy) recorded in 61-COVERAGE.md, completing the unit under the stopping rule"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-03-PLAN.md Task 2 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "P61-D1-003 (bbjcpl arbitrary-execution path validation gap) and P61-D2-010 (variable-scoping false-positive) reproduced with runnable, throwaway vitest tests, not merely traced"
    verification:
      - kind: unit
        ref: "throwaway test/__tmp_d1_repro.test.ts and test/__tmp_prune_repro.test.ts, run via npx vitest run, deleted before commit — not present in the tree"
        status: pass
    human_judgment: true
    rationale: "The reproductions themselves are not committed (by plan design — findings are recorded, not fixed); a human reviewing the finding records should confirm the described repro methodology is sound before Phase 67 relies on it to scope a fix."

# Metrics
duration: 20min
completed: 2026-08-17
status: complete
---

# Phase 61 Plan 03: Validation & BBjCPL Diagnostics Review Summary

**Swept RU-61-03 (8 files / 2,542 LOC) across all 6 live dimensions, finding a reproduced arbitrary-code-execution gap in the BBjCPL compiler spawn path and a reproduced false-positive bug in variable-scoping's use-before-assignment check — 9 findings recorded in 61-COVERAGE.md, no source files modified.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-17T21:39:30Z (approx, from prior plan's commit)
- **Completed:** 2026-08-17T21:56:05Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- Recorded all 6 live dimensions (D1, D2, D3, D4, D5, D8) for `RU-61-03 — Validation & BBjCPL diagnostics`, with D6/D7 remaining the pre-existing carried-forward `n/a` cells.
- Found and **reproduced** (throwaway, uncommitted vitest tests) two concrete bugs rather than merely asserting them:
  - `P61-D1-003`: `bbj-cpl-service.ts` spawns whatever binary sits at `<bbj.home>/bin/bbjcpl` with no validation that `bbj.home` (a `window`-scoped, workspace-overridable VS Code setting) points at a legitimate BBj installation — proved arbitrary code execution by substituting a controlled directory and confirming it ran. Rated `high` severity to match the plan's own threat register (T-61-P03-S1), cross-referenced to SEC-05.
  - `P61-D2-010`: `check-variable-scoping.ts`'s use-before-assignment Pass 2 traversal claims to exclude nested `MethodDecl`/`BbjClass`/`DefFunction` bodies via a bare `continue`, but Langium's `TreeStreamImpl` only prunes on an explicit `.prune()` call — reproduced a false-positive "used before assignment" hint on a method-local variable that merely shares a name with a later Program-scope variable.
- Found a smaller correctness gap (`P61-D2-009`: negative LSP line numbers from `bbj-cpl-parser.ts` on a malformed physical-line-0 compiler report), a dead-code duplication (`P61-D4-006`: an entire unreachable `checkClassReference`/`isSubFolderOf` pair in `bbj-validator.ts`), a god-class maintainability finding (`P61-D4-007`: `check-classes.ts`'s `ClassValidator`), two test-coverage gaps (`P61-D5-005`, `P61-D5-006`), and two stale-comment doc-accuracy findings (`P61-D8-003`: CLAUDE.md omits `check-function-calls.ts`; `P61-D8-004`: `bbj-cpl-service.ts`'s "Phase 53 will wire this" comments describe work already done or never done).
- Confirmed the `a7e1b53` cyclic-inheritance fix is present and unmodified in both `bbj-validator.ts:230-244` and `check-classes.ts:523-547` — not re-reported.
- Advanced the phase-wide ledger from 12 to 18 recorded / 32 pending / 38 `n/a` / 88 total, matching the plan's exact required delta.

## Task Commits

1. **Task 1: Sweep RU-61-03 at evidence tier `repro` — D1, D2, D3** - `c5593dc` (docs)
2. **Task 2: Complete RU-61-03 at evidence tier `trace` — D4, D5, D8** - `c67e850` (docs)

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Filled the `## RU-61-03 — Validation & BBjCPL diagnostics` section: 6 recorded cells, 9 new finding records, 2 not-reproducible dispositions, 1 cross-unit referral.

## Decisions Made

- Rated `P61-D1-003` severity `high` (not `medium`, unlike the analogous `interopHost`/`interopPort` finding `P61-D1-001` in `RU-61-06`) to match the plan's own pre-registered threat `T-61-P03-S1`, which explicitly rates this class of gap `high` — this forces `classification: major` per D-13's safety gate (test 6 fails on severity alone) and triggers D-12's two-tier disclosure (the reproduction was built and run, but its script is not published in the committed record).
- Folded `P61-D2-010`'s redundant-AST-traversal consequence into that same finding as `secondary: [D3]` rather than filing a second D3 record, since both effects (the false positive and the redundant walk) share one root cause (the un-pruned `TreeStreamImpl` descent) and D3's own written check line references it rather than duplicating evidence.
- Classified the two D5 test-coverage-gap findings (`P61-D5-005`, `P61-D5-006`) as `easy` rather than `major` — unlike `RU-61-06`'s precedent (`P61-D5-002`, `major`, because closing it needed a controllable fake socket peer) — because closing each of these gaps needs no new test infrastructure; both reuse patterns already present in `test/cpl-service.test.ts` (`createMockServices`) and `test/validation.test.ts` (plain `validate()` calls).

## Deviations from Plan

None — plan executed exactly as written. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `INVENTORY.md` was not touched; no GitHub issue was filed or commented on; only the `## RU-61-03` section of `61-COVERAGE.md` was written.

## Issues Encountered

None. Two throwaway vitest test files were created in `bbj-vscode/test/` to build runnable reproductions for `P61-D1-003` and `P61-D2-010` (per the plan's explicit guidance to use standalone reproductions rather than committed test files), run once each via `npx vitest run`, and deleted immediately after confirming the result — `git status --porcelain bbj-vscode` is clean at every commit point.

## Known Stubs

None — this phase produces a documentation artifact only; no application code or UI was stubbed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-61-03` is complete under the stopping rule: all 6 live cells carry a verdict plus a written check line, all 8 unit files are named inside the section, CLAUDE.md's Validation claims were checked against the tree, and every candidate claim that didn't clear its evidence tier is visible under `### Not-reproducible dispositions`.
- Phase-wide ledger stands at 18 recorded / 32 pending / 38 `n/a` / 88 total, matching the plan's target exactly. `RVW-01` remains `Pending` (3 of 7 units swept: `RU-61-06`, `RU-61-01`, `RU-61-03`) — not marked complete, per this plan's explicit prohibition.
- Plan `61-04` (wave 4, `RU-61-02` — scope, linking & type inference) is next per `depends_on: [61-03]`; its `must_haves` should be checked for any reference to `P61-D1-003`, `P61-D2-009`, or `P61-D2-010` before it starts, since none of the 61-03 findings are located in `RU-61-02`'s files and no cross-unit referral was issued to it.
- `P61-D1-003` (high severity, cross-referenced to SEC-05) is now available for Phase 65's cross-cutting security audit to pick up without re-deriving the process-boundary analysis, and for Phase 67's easy-fix/major-refactor split.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `c5593dc` (Task 1 commit)
- FOUND: `c67e850` (Task 2 commit)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-17*
