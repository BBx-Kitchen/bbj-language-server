---
phase: 61-language-core-review
plan: 04
subsystem: testing
tags: [langium, scope, linking, type-inference, code-review, security-audit, performance]

# Dependency graph
requires:
  - phase: 61-language-core-review (plan 61-03)
    provides: 61-COVERAGE.md with RU-61-06, RU-61-01, RU-61-03 swept and RU-61-02's stub section
provides:
  - RU-61-02 (scope, linking & type inference, 8 files / 1,601 LOC) fully swept across all 6 live dimensions in 61-COVERAGE.md
  - 8 new finding records (P61-D2-011, P61-D2-012, P61-D3-003, P61-D4-008, P61-D4-009, P61-D5-007, P61-D5-008, P61-D5-009)
  - #232/DEBT-01 (CPU stability in multi-project workspaces) re-triaged against current code with file:line evidence
  - DEBT-03's "String.valueOf(2) assigns no type" symptom root-caused and reproduced (bbj-type-inferer.ts's missing resolvedReturnType fallback)
  - Phase-wide ledger advanced from 18 to 24 recorded / 26 pending / 38 n/a / 88 total
affects: [61-05, 61-06, 61-07, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes, 68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 9848
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reproductions built as throwaway vitest test files under bbj-vscode/test/, run once via `npx vitest run`, then deleted before committing — never committed to the tree (same pattern as wave 3)."
    - "Indirect type-inference reproduction technique: mutate a fake JavaClass's methods array in a test double to simulate an unresolved-`resolvedReturnType` race, then observe the #437 return-type-mismatch validator's silence as proof getType() returned undefined."

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "P61-D2-011 (bbj-type-inferer.ts's JavaMethod branch reads only `resolvedReturnType?.ref` with no fallback to the always-present raw `returnType: string`) was identified as the concrete root cause of DEBT-03's 'String.valueOf(2) assigns no type' symptom and reproduced with a throwaway vitest test — the first repro-tier evidence this debt item has had beyond its prose record."
  - "P61-D2-012 (bbj-overload-selector.ts's findBestOverload has exactly one real consumer, bbj-inlay-hint-provider.ts) was classified `major` despite `medium` severity because a real fix necessarily touches bbj-linker.ts or bbj-type-inferer.ts in addition to bbj-overload-selector.ts, failing D-13 test (1) — its D8 angle (the module's own doc comment overstating its integration scope) was folded in as `secondary: [D4, D8]` rather than filed as a separate D8 record, mirroring wave 3's P61-D2-010 precedent."
  - "P61-D3-003 re-triages #232/DEBT-01 against two concrete, currently-unmitigated mechanisms (bbj-scope.ts's uncached full-index scan in getBBjClassesFromFile, and bbj-scope-local.ts's unpruned full-AST walk in collectLocalSymbols, contrasted with bbj-linker.ts's existing external-document pruning) — and separately confirms bbj-index-manager.ts's isAffected() override IS a present, partial mitigation at the rebuild-skip layer, so DEBT-01's 'documented but not implemented' framing is now precise: partially implemented at one layer, absent at two others."
  - "Two D1-adjacent and D2/D3-adjacent candidate claims (prefix-path URI traversal; index-manager ordering instability) were dispositioned as not-reproducible rather than filed as findings, since confirming either requires evidence outside this unit's files (bbj-ws-manager.ts's document-loading boundary, or empirical cross-platform ordering behavior) — referred to RU-61-05 and left as context respectively, per RVW-06's drop-vs-disposition rule."

requirements-completed: []  # RVW-01 spans all 7 units; only 4 of 7 are swept after this plan — not marked complete (per plan's explicit prohibition)

coverage:
  - id: D1
    description: "RU-61-02's 3 repro-tier dimensions (D1 Security, D2 Correctness, D3 Performance) recorded in 61-COVERAGE.md with pass/fail verdicts and written check lines"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-04-PLAN.md Task 1 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-02's 3 trace-tier dimensions (D4 Maintainability, D5 Test coverage, D8 Doc accuracy) recorded in 61-COVERAGE.md, completing the unit under the stopping rule"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-04-PLAN.md Task 2 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "P61-D2-011 (bbj-type-inferer.ts's DEBT-03 root cause) reproduced with a runnable, throwaway vitest test, not merely traced"
    verification:
      - kind: unit
        ref: "throwaway test/__tmp_d2_repro.test.ts, run via npx vitest run, deleted before commit — not present in the tree"
        status: pass
    human_judgment: true
    rationale: "The reproduction itself is not committed (by plan design — findings are recorded, not fixed); a human reviewing the finding record should confirm the described repro methodology (mutating a fake JavaClass's methods array to simulate an unresolved resolvedReturnType) is sound before Phase 67 relies on it to scope a fix."

# Metrics
duration: 20min
completed: 2026-08-17
status: complete
---

# Phase 61 Plan 04: Scope, Linking & Type Inference Review Summary

**Swept RU-61-02 (8 files / 1,601 LOC) across all 6 live dimensions, root-causing and reproducing DEBT-03's static-method type-inference gap and re-triaging #232/DEBT-01's multi-project CPU cost against two concrete unmitigated code paths — 8 findings recorded in 61-COVERAGE.md, no source files modified.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-17T21:57:41Z (approx, from prior plan's commit)
- **Completed:** 2026-08-17T22:10:14Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- Recorded all 6 live dimensions (D1, D2, D3, D4, D5, D8) for `RU-61-02 — Scope, linking & type inference`, with D6/D7 remaining the pre-existing carried-forward `n/a` cells.
- **Root-caused and reproduced DEBT-03** (`P61-D2-011`): `bbj-type-inferer.ts`'s `isJavaMethod` branch reads only `member.resolvedReturnType?.ref` — populated exclusively by `java-interop.ts`'s async Phase 2 — with no fallback to the JavaMethod's always-present raw `returnType: string`. Reproduced with a throwaway, uncommitted vitest test: a `JavaMethod` with `resolvedReturnType` left unset (simulating any path that bypasses Phase 2) causes `String.valueOf(2)`'s inferred type to silently be `undefined`, confirmed via the #437 return-type-mismatch validator's silence where a real type mismatch should have been flagged.
- **Re-triaged #232/DEBT-01** (`P61-D3-003`) against the current code with two concrete mechanisms: `getBBjClassesFromFile` (bbj-scope.ts) performs an uncached full linear scan of the entire cross-project `BbjClass` index on every `::file::Class` reference, and `collectLocalSymbols` (bbj-scope-local.ts) walks the full, unpruned AST of every document — unlike `bbj-linker.ts`'s `link()`, which already prunes external-document private members. Separately confirmed `bbj-index-manager.ts`'s `isAffected()` override IS a present, partial mitigation at the rebuild-skip layer.
- Found a design gap where `bbj-overload-selector.ts`'s `findBestOverload` has exactly one real consumer (`bbj-inlay-hint-provider.ts`) — neither the linker nor the type inferer re-selects the correct overload by call shape, so an overload-sensitive call site's inferred type can come from the wrong sibling declaration (`P61-D2-012`, secondary D4/D8).
- Found a maintainability duplication (`P61-D4-008`: `bbj-linker.ts`'s near-identical `getSourceLocation`/`getSourceLocationForNode`) and confirmed `assertions.ts`'s sole export is genuinely dead code with zero consumers anywhere in the tree (`P61-D4-009`).
- Found three test-coverage gaps (`P61-D5-007` overload exact-tie, `P61-D5-008` scope-shadowing precedence, `P61-D5-009` DEBT-03 regression test) and confirmed cross-file BBj-to-BBj linking already has java-interop-independent coverage (`imports.test.ts`), so that specific edge probe is not a gap.
- Verified CLAUDE.md's Scope/Linking, Type-inference and AST-constant claims all match the code — D8 passes with zero new D8-primary findings (the one overstated doc comment found was folded into `P61-D2-012` as secondary).
- Stated (not re-recorded) `RU-61-06`'s ownership of the 11 `test/linking.test.ts` interop failures and the SEC-06/boundary edge probe, per the plan's explicit prohibition.
- Advanced the phase-wide ledger from 18 to 24 recorded / 26 pending / 38 `n/a` / 88 total, matching the plan's exact required delta.

## Task Commits

1. **Task 1: Sweep RU-61-02 at evidence tier `repro` — D1, D2, D3** - `5443bbf` (docs)
2. **Task 2: Complete RU-61-02 at evidence tier `trace` — D4, D5, D8** - `61ec30c` (docs)

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Filled the `## RU-61-02 — Scope, linking & type inference` section: 6 recorded cells, 8 new finding records, 2 not-reproducible dispositions, 2 cross-unit referrals.

## Decisions Made

- Classified `P61-D2-011` (DEBT-03 root cause) `easy` — the fix (a fallback to `member.returnType` when `resolvedReturnType` is unset) touches only `bbj-type-inferer.ts` and is regression-testable with the reproduction technique already built.
- Classified `P61-D2-012` (overload-selector not wired into type-inferer/linker) `major` despite `medium` severity — D-13 test (1) fails because a real fix spans `bbj-overload-selector.ts` plus `bbj-linker.ts` or `bbj-type-inferer.ts`; folded its D8 angle (the module's doc comment overstating "call sites re-select..." when only one consumer does) into the same record as `secondary: [D4, D8]` rather than a separate D8 finding, mirroring wave 3's `P61-D2-010` precedent.
- Classified `P61-D3-003` (`#232`/DEBT-01 re-triage) `major` on severity alone (`high`, matching this unit's own pre-registered threat `T-61-P04-S1`) — D-13's safety gate forces `major` regardless of the other five tests.
- Dispositioned two candidate claims as not-reproducible rather than filing them: a prefix-path URI-traversal concern in `getBBjClassesFromFile` (this unit's code only compares URIs against an already-populated index — the actual file-loading boundary lives in `bbj-ws-manager.ts`, referred to `RU-61-05`), and an index-ordering-instability claim (`bbj-index-manager.ts` inherits filesystem-enumeration-order iteration — confirming an actual differing resolution needs empirical cross-platform comparison outside this sweep's scope).

## Deviations from Plan

None — plan executed exactly as written. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `INVENTORY.md` was not touched; no GitHub issue was filed or commented on; only the `## RU-61-02` section of `61-COVERAGE.md` was written.

## Issues Encountered

None. One throwaway vitest test file (`test/__tmp_d2_repro.test.ts`) was created in `bbj-vscode/test/` to build a runnable reproduction for `P61-D2-011` (mutating a fake `java.lang.String` JavaClass's `methods` array in the test double to simulate an unresolved `resolvedReturnType`, then observing the #437 return-type validator's silence), run once via `npx vitest run`, and deleted immediately after confirming the result — `git status --porcelain bbj-vscode` is clean at every commit point.

## Known Stubs

None — this phase produces a documentation artifact only; no application code or UI was stubbed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-61-02` is complete under the stopping rule: all 6 live cells carry a verdict plus a written check line, all 8 unit files (including the 4-line `assertions.ts`) are named inside the section, CLAUDE.md's Scope/Linking, Type-inference and AST-constant claims were checked against the tree, and every candidate claim that didn't clear its evidence tier is visible under `### Not-reproducible dispositions`.
- Phase-wide ledger stands at 24 recorded / 26 pending / 38 `n/a` / 88 total, matching the plan's target exactly. `RVW-01` remains `Pending` (4 of 7 units swept: `RU-61-06`, `RU-61-01`, `RU-61-03`, `RU-61-02`) — not marked complete, per this plan's explicit prohibition.
- `P61-D2-011` gives Phase 67's easy-fix path a concrete, reproduced root cause for DEBT-03 (rather than only a prose symptom record); `P61-D3-003` gives Phase 66 file:line evidence for DEBT-01's re-triage, including confirmation that `bbj-index-manager.ts`'s `isAffected()` mitigation is already partially present.
- Plan `61-05` (wave 5, `RU-61-04` — LSP feature providers) is next per the wave dependency chain; its `must_haves` should be checked for any reference to this plan's findings before it starts — none of `RU-61-02`'s findings are located in `RU-61-04`'s files and no cross-unit referral was issued to it, though `bbj-overload-selector.ts`'s sole real consumer is `bbj-inlay-hint-provider.ts` (an `RU-61-04` file), so `RU-61-04`'s own sweep should be aware of `P61-D2-012`'s upstream context when it reviews that provider.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `5443bbf` (Task 1 commit)
- FOUND: `61ec30c` (Task 2 commit)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-17*
