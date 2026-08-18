---
phase: 61-language-core-review
plan: 07
subsystem: builtin-catalogs
tags: [langium, builtin-library, code-review, security-audit, test-coverage, phase-close-out]

# Dependency graph
requires:
  - phase: 61-language-core-review (plan 61-06)
    provides: 61-COVERAGE.md with RU-61-06, RU-61-01, RU-61-03, RU-61-02, RU-61-04, RU-61-05 all swept (36 recorded / 14 pending / 38 n/a / 88 total)
provides:
  - RU-61-07 (builtin catalogs, 8 files / 3,752 LOC — largest unit by LOC in the inventory) fully swept across all 6 live dimensions in 61-COVERAGE.md, plus all 8 .bbl file-exception applies cells (D2, D4)
  - 5 new finding records (P61-D2-019, P61-D4-015, P61-D4-016, P61-D5-017, P61-D8-007)
  - Phase-wide ledger closed at 50 recorded / 0 pending / 38 n/a / 88 total, 73 findings total
  - D-17 cell-total gate re-derived from INVENTORY at phase close: prints `50 38 88`, agrees with the coverage file's own totals — no disagreement to surface
  - 53-file tree enumeration confirming every hand-written bbj-vscode/src/language/ file is named in 61-COVERAGE.md
  - `## Phase 61 Close-Out` section: finding counts by dimension/disposition, not-reproducible/referral accounting, evidence locations for all 4 ROADMAP success criteria
  - RVW-01 marked complete (all 7 review units swept)
affects: [65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes, 68-doc-assembly, 69-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 6500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-08 mechanical sweep for the phase's lowest-behavioral-risk/highest-LOC unit: a stated 20-entry-per-catalog sampling protocol (first 5 + last 5 + 10 evenly-spaced by floor(i*N/11)) adjudicated against a source precedence (VERBs.md -> .bbl sibling -> bbj.langium), plus a programmatic .ts-vs-.bbl diff (sed-stripped wrapper) run and its line-count output recorded verbatim, rather than a line-by-line read of 3,752 lines."
    - "Entry counts (N) for the sampling protocol measured mechanically via 'declaration line immediately following its entry's closing @/ DOCU delimiter' rather than a naive top-of-line regex, which over-counts (functions.ts: 147 naive vs 124 actual, since some DOCU synopses repeat the signature verbatim)."
    - "Cross-checked VERBs.md's actual coverage against the catalog namespace before using it as the D2/D8 primary source: VERBs.md catalogs BBj *verbs* (statement-form constructs), a namespace disjoint from these catalogs' functions/events/labels/variables (only 3 incidental dual-usage overlaps: CHANOPT, FIELD, FILEOPT) — recorded as an honest non-finding rather than forcing a comparison that doesn't exist."

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "Traced the duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT eventtype declarations in events.ts through Langium's actual scope-resolution code (StreamScope.getElement / StreamScopeWithPredicate.getElement, both Stream.find()-based first-match) rather than asserting from the grammar alone, confirming the second declaration's distinct DOCU text is permanently unreachable by linking while completion shows both duplicates unlabeled — P61-D2-019."
  - "Confirmed via consumer grep (fs-provider.ts, bbj-ws-manager.ts) that the physical lib/*.bbl files on disk are never read by any runtime code path or by any test — both consumers exclusively import the .ts-exported string constants and construct the synthetic bbjlib:///*.bbl documents from that .ts content — grounding P61-D4-015 (duplication), P61-D5-017 (coverage gap), and P61-D8-007 (misleading test comment) in the same underlying fact, matching the P61-D2-004/P61-D8-001 and P61-D2-016/P61-D8-006 pairing pattern RU-61-06/RU-61-05 established."
  - "Ran the plan's specified 4 .ts-vs-.bbl diff commands verbatim (wrapper-stripped sed + diff), finding one real content divergence beyond wrapper-shape artifacts: CVS's DOCU markdown synopsis reads differently in functions.ts vs functions.bbl, while the executable declaration itself is identical in both — recorded as drift, not just duplication, per the plan's explicit framing."
  - "Classified P61-D4-015 and P61-D4-016 both `major` despite `low` severity: eliminating either the physical-duplication risk or the wrapper-shape inconsistency necessarily touches more than 1 file, failing D-13 test (1) regardless of the other five tests passing — matching the precedent RU-61-06/RU-61-05 established for similarly multi-file-touching low-severity findings."
  - "Re-derived the D-17 gate independently at phase close rather than trusting the plan 61-01-recorded totals: INVENTORY re-derivation prints `50 38 88`, the coverage file's own current counts are `50`/`38`/`88` with `0` pending — explicit AGREE verdict, no disagreement to surface."
  - "Enumerated the 53 review-target files from the filesystem tree (ls over the four glob patterns) rather than reusing any typed list, per the plan's explicit instruction — confirmed all 53 basenames are named somewhere in 61-COVERAGE.md, none missing."

requirements-completed: [RVW-01]

coverage:
  - id: D1
    description: "RU-61-07's 3 repro-tier dimensions (D1 Security, D2 Correctness, D3 Performance) recorded in 61-COVERAGE.md with pass/fail verdicts and written check lines, plus the 4 .bbl D2 file-exception cells"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-07-PLAN.md Task 1 (grep/awk assertions against 61-COVERAGE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-07's 3 trace-tier dimensions (D4 Maintainability, D5 Test coverage, D8 Doc accuracy) recorded in 61-COVERAGE.md, plus the 4 .bbl D4 file-exception cells, completing the unit; D-17 cell-total gate re-derived and closed; 53-file tree enumeration confirmed; Phase 61 Close-Out section appended"
    requirement: RVW-01
    verification:
      - kind: manual_procedural
        ref: "bash acceptance-criteria checks in 61-07-PLAN.md Task 2 (grep/awk assertions against 61-COVERAGE.md and INVENTORY.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The P61-D2-019 duplicate-eventtype-name claim is confirmed by tracing Langium's actual scope-resolution source (node_modules/langium/src/references/scope.ts and bbj-scope.ts), not merely asserted from the grammar; the 4 .ts-vs-.bbl diff counts (2/6/9/2) are reproducible by re-running the exact commands recorded in the D4 cell"
    verification:
      - kind: unit
        ref: "diff <(sed -e '1d' -e '$d' bbj-vscode/src/language/lib/{events,functions,labels,variables}.ts) bbj-vscode/src/language/lib/{...}.bbl | wc -l, re-run against the tree and matched against the recorded 2/6/9/2 counts"
        status: pass
    human_judgment: true
    rationale: "P61-D4-015/P61-D4-016 are classified major on the D-13 multi-file-touch gate despite low severity — a human scoping Phase 67's fix priority should confirm whether the .bbl physical files should be generated at build time or deleted outright before scheduling the remediation, since that is a design decision this review sweep deliberately did not make."

# Metrics
duration: ~90min
completed: 2026-08-18
status: complete
---

# Phase 61 Plan 07: Builtin Catalogs Review & Phase Close-Out Summary

**Swept RU-61-07 (8 files / 3,752 LOC — largest unit by LOC in the inventory) mechanically per D-08, finding duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT event declarations traced through Langium's actual first-match scope resolution, confirming the physical `.bbl` catalog files are never read by any runtime consumer or test, and closing Phase 61 with the D-17 gate re-derived (`50 38 88`, agreeing with the stated totals) and all 53 hand-written files confirmed named in the coverage file — 5 new findings, 73 total across the phase, no source files modified.**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-08-18T05:09:08Z (approx, from prior plan's commit)
- **Completed:** 2026-08-18T05:26:27Z (approx)
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- Recorded all 6 live dimensions (D1, D2, D3, D4, D5, D8) for `RU-61-07 — Builtin catalogs`, plus all 8 `.bbl` file-exception `applies` cells (D2 and D4 on each of the 4 `.bbl` file-exception rows) — 14 cells total, the last 14 of the phase's 50.
- **D1 (pass):** mechanical grep confirmed no unescaped backtick/`${` interpolation sequence inside any of the four catalogs' template-literal content, no embedded exec/spawn/path patterns, and content entirely repository-controlled end to end.
- **D2 (fail, 1 finding):** ran the D-08-licensed 20-entry-per-catalog sampling protocol (80 samples total) against the source precedence VERBs.md -> `.bbl` sibling -> `bbj.langium`, finding VERBs.md catalogs a disjoint namespace (BBj *verbs*, not functions/events/labels/variables) so the `.bbl` sibling was the effective adjudicator for every sample, with no mismatch found. Beyond the sample, a whole-catalog duplicate-name scan found `events.ts` declares `ON_MOUSE_ENTER` and `ON_MOUSE_EXIT` twice each with different doc text — traced through `bbj-scope.ts`'s actual `Stream.find()`-based first-match scope resolution to confirm the second declaration is permanently unreachable by linking while completion shows both duplicates unlabeled (`P61-D2-019`).
- **D3 (pass):** traced both consumers (`fs-provider.ts`, `bbj-ws-manager.ts`) to confirm each catalog is parsed exactly once at workspace startup and served from the index thereafter — no per-keystroke or per-call re-parsing.
- **D4 (fail, 2 findings):** ran the plan's specified programmatic `.ts`-vs-`.bbl` diff for all 4 pairs (2/6/9/2 differing diff-output lines), finding one real content divergence beyond wrapper-shape artifacts — CVS's DOCU synopsis text drifted between `functions.ts`/`functions.bbl` while the executable declaration stayed identical (`P61-D4-015`, paired with the discovery that neither physical `.bbl` file is read by any runtime consumer). Also found the four `.ts` catalogs use 3 different, inconsistent wrapper/export shapes, one containing a dead `.trimLeft()` no-op given `bbj.langium`'s `hidden` `WS` terminal (`P61-D4-016`).
- **D5 (fail, 1 finding):** found only `functions.ts` has any test coverage (`test/builtin-functions-library.test.ts`) — `labels.ts`, `variables.ts` and `events.ts` have zero test coverage of any kind, and no test anywhere asserts `.ts`-vs-`.bbl` equivalence, so the CVS drift `P61-D4-015` found has no regression guard (`P61-D5-017`).
- **D8 (fail, 1 finding):** confirmed VERBs.md's disjoint namespace makes no D8 finding possible against it (not a gap, no comparison surface exists); found `test/builtin-functions-library.test.ts`'s own header comment misrepresents what it verifies — it claims to guard both `lib/functions.bbl` and its `.ts` mirror, but only ever parses the `.ts`-derived virtual document, never the physical file (`P61-D8-007`, same underlying fact as `P61-D4-015`/`P61-D5-017` viewed from the comment-accuracy angle).
- **Phase close-out:** re-ran the D-17 cell-total gate's INVENTORY re-derivation (`50 38 88`), counted the coverage file's own current totals (50 recorded / 38 n/a / 88 total, 0 pending), and recorded an explicit AGREE verdict. Enumerated the 53 hand-written review-target files from the filesystem tree (`ls` over 4 glob patterns) and confirmed every basename is named somewhere in `61-COVERAGE.md`. Appended `## Phase 61 Close-Out` recording the phase-wide finding count by dimension (73 total: D1=9, D2=19, D3=5, D4=16, D5=17, D8=7) and by disposition (44 easy-fix, 29 major-refactor), the not-reproducible-disposition count (11 across the phase, 0 in this unit) and cross-unit-referral accounting (12 referrals across the phase, all confirmed resolved by their owning unit, none left dangling), and evidence locations for all 4 ROADMAP Phase 61 success criteria.
- Advanced the phase-wide ledger from 36 to 50 recorded / 0 pending / 38 `n/a` / 88 total (33/17 after Task 1, then 50/0 after Task 2), closing the D-17 gate exactly as required.

## Task Commits

1. **Task 1: Sweep RU-61-07 at evidence tier `repro` — D1, D2, D3 plus the four `.bbl` D2 cells** - `8513f3f` (docs)
2. **Task 2: Complete RU-61-07 at tier `trace` (D4, D5, D8 plus the four `.bbl` D4 cells) and close the phase** - `5e4fce7` (docs)

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Filled the `## RU-61-07 — Builtin catalogs` section (6 unit-row cells, 8 file-exception cells, 5 new finding records), appended the closing `## D-17 Cell-Total Gate` re-derivation sub-block, and appended the final `## Phase 61 Close-Out` section.

## Decisions Made

See `key-decisions` in frontmatter for the full list. Highlights: traced the duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` finding through Langium's actual `Stream.find()`-based scope-resolution source rather than asserting the consequence from the grammar alone; confirmed the physical `.bbl` files' zero-runtime-consumption fact once and grounded three separate findings (D4/D5/D8) in it, matching the established cross-dimension pairing pattern; classified both D4 findings `major` per the D-13 multi-file-touch gate despite `low` severity, consistent with prior-plan precedent.

## Deviations from Plan

None — plan executed exactly as written. No source file under `bbj-vscode/`, `bbj-intellij/`, or `java-interop/` was modified; `INVENTORY.md` was not touched; no GitHub issue was filed or commented on; only the `## RU-61-07` section plus the two close-out appends (`## D-17 Cell-Total Gate` sub-block, `## Phase 61 Close-Out`) were written.

One self-correction during Task 2: the closing D-17 gate text initially included the literal substring `— pending` inside a description of the verification command itself, which created a false positive against the plan's own "0 pending" acceptance check. Reworded the sentence to avoid the literal substring while preserving the same meaning; re-ran the full verify block afterward to confirm the fix (not a deviation from the plan's intent, a self-caught wording bug in this plan's own prose).

## Issues Encountered

None beyond the self-correction noted above. `git status --porcelain bbj-vscode bbj-intellij java-interop .planning/reviews/INVENTORY.md` returned empty at both commit points, confirming no source file or INVENTORY.md was touched.

## Known Stubs

None — this phase produces a documentation artifact only; no application code or UI was stubbed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-61-07` is complete under the stopping rule: all 6 live cells carry a verdict plus a written check line, all 8 unit files (including their `.bbl` siblings) are named inside the section, the D2 sampling protocol's size/indices/sources are recorded per catalog, the four `.ts`-vs-`.bbl` diff counts are recorded and reproducible, and no candidate claim went unrecorded (0 not-reproducible dispositions in this unit — every candidate claim raised cleared its evidence tier).
- **Phase 61 is closed.** `61-COVERAGE.md` contains exactly 50 recorded verdicts, 38 verbatim `n/a` carry-forwards, 88 cell lines and 0 placeholders. The D-17 gate's closing re-derivation from INVENTORY agrees with the stated totals (`50 38 88`). All 53 hand-written files under `bbj-vscode/src/language/` are named in the coverage file, enumerated from the tree. `RVW-01` is marked complete.
- 73 findings across the phase (44 easy-fix, 29 major-refactor) are ready for Phase 67's apply path (easy-fix) and `MAJOR-REFACTORS.md` assembly (major-refactor) without re-triage, per DOC-04. `P61-D2-019`/`P61-D4-015`/`P61-D4-016`/`P61-D5-017`/`P61-D8-007` give Phase 67 five concrete, evidenced findings on the builtin-catalog surface — none blocking, all `low`/`medium` severity.
- Phase 68's DOC-03 concatenation can consume `61-COVERAGE.md` as a complete, closed artifact against INVENTORY's grid with no further Phase 61 writes expected.
- SEC-06 was already marked complete by plan 61-01; RVW-01 is now also complete, closing out both of Phase 61's requirements.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `8513f3f` (Task 1 commit)
- FOUND: `5e4fce7` (Task 2 commit)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-18*
