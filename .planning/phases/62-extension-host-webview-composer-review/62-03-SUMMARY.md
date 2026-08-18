---
phase: 62-extension-host-webview-composer-review
plan: 03
subsystem: review
tags: [code-review, injection-hardening, test-coverage, cross-ide-parity, duplication]

# Dependency graph
requires:
  - phase: 60-baseline-resync-review-standards
    provides: INVENTORY.md (immutable review contract), Finding Standard, Applicability Grid
  - phase: 62-extension-host-webview-composer-review
    plan: 01
    provides: 62-COVERAGE.md skeleton, RU-62-04 fully swept (webview generators), D-09 disclosure tier approved and frozen, P62-D4-001 generator-layer duplication finding
  - phase: 62-extension-host-webview-composer-review
    plan: 02
    provides: RU-62-01 fully swept (wave-3 predecessor per depends_on)
provides:
  - "RU-62-03 (composer logic & UI layer, 8 files / 2,027 LOC — the largest unit by LOC in Phase 62) fully swept across all 7 live dimensions, 4 findings recorded"
  - "P62-D1-005: addwindow/addchildwindow composers embed x/y/width/height/title/sysgui/receiver/window/id/context verbatim with zero validation (contrasted against msgbox's own validateStringField precedent, and msgbox's own unvalidated assignTo field)"
  - "P62-D2-005: msgbox-composer-ui.ts's bare runComposer command applies a document edit at a position captured before an unbounded multi-step QuickPick wizard, with no re-validation"
  - "P62-D4-004: logic/UI-layer duplication via mechanical structural diff, cross-referencing RU-62-04's P62-D4-001 generator-layer finding by ID (D-12 satisfied at both layers)"
  - "P62-D5-003: all four -ui.ts files (429 combined lines) have zero test coverage, including both P62-D1-005's and P62-D2-005's code paths"
  - "RVW-03 fully satisfied — both plans declaring it (62-01's RU-62-04, this plan's RU-62-03) now cover the complete 12-file webview-composer surface"
affects: [62-05-plan, 63-04-plan, 65-cross-cutting-security-audit, 67-fix-phase, 69-issue-drafting]

actuals:
  tokens: 9700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "62-COVERAGE.md recording shape and D-09 disclosure tier inherited unchanged from plan 62-01 (D-03)"
    - "setopts-catalog.ts's D2 value-correctness check performed as a stated two-pass sampling protocol (exhaustive structural pass over all 50 bit entries + deterministic stratified 14-entry value sample, first/last per byte group) verified live against the BASIS SETOPTS documentation URLs the file's own header cites"
    - "D4 duplication allocated once per layer per D-12: RU-62-04 owns the generator-layer (*-composer-webview.ts) half, this unit owns the logic/UI-layer (*-composer.ts / *-ui.ts) half, cross-referenced by finding ID rather than restated"
    - "D7 parity assessed by reading bbj-intellij/composer/ as comparison-only reference material (D-05); this unit's D7 cross-unit referral to RU-63-04 independently corroborates RU-62-04's own referral about the same SETOPTS/IntelliJ absence"

key-files:
  created: []
  modified:
    - .planning/reviews/62-COVERAGE.md

key-decisions:
  - "P62-D1-005 rated low (not critical/high) — every affected field is text the developer types into the composer's own webview form, matching RU-62-04's established fact that no editor/document/config/workspace value reaches these composers today; this is a self-inflicted statement-corruption gap, not an attacker-controlled injection, so it falls under D-09's full-concrete-detail branch rather than the redacted tier"
  - "P62-D2-005 (msgbox-composer-ui.ts's stale edit-position hazard) classified major on D-13 test (4) alone — no existing test harness mocks vscode.window/vscode.commands for any -ui.ts file in this unit, so a regression test needs new infrastructure, consistent with RU-62-04's own precedent for the webview layer"
  - "The setopts-catalog.ts bbjDetail-presence pattern (4 of 12 'ignored' entries carry it) was investigated as a candidate D2 completeness gap and confirmed, by fetching the live BASIS bbj-commands SETOPTS doc, to be a faithful mirror of source-doc richness rather than a defect — recorded as a verified-clean check, not a finding"
  - "P62-D4-004 explicitly does not restate RU-62-04's P62-D4-001 — cross-referenced by ID per D-12, applying the same 3-file (not 4) -composer.ts baseline asymmetry"

patterns-established:
  - "Live-fetching an external documentation source (BASIS's own SETOPTS docs, HTTP 200 confirmed) to run a stated sampling protocol is a legitimate D2 evidence-gathering technique when the plan requires the sample size, selection rule, and source consulted to be recorded in the cell"

requirements-completed: [RVW-03]  # Both plans declaring RVW-03 (62-01's RU-62-04 and this plan's RU-62-03) are now complete, covering the full 12-file webview-composer surface (4 *-composer-webview.ts + 3 *-composer.ts + 4 *-composer-ui.ts + setopts-catalog.ts). RVW-02 remains open (62-04/62-05 pending).

coverage:
  - id: D1
    description: "RU-62-03 (msgbox/addwindow/addchildwindow-composer.ts, 4 -composer-ui.ts, setopts-catalog.ts — 8 files, 2,027 LOC) swept across all 7 live dimensions with 4 findings recorded (P62-D1-005, P62-D2-005, P62-D4-004, P62-D5-003), 1 not-reproducible disposition, 1 cross-unit referral to RU-63-04"
    requirement: "RVW-03"
    verification:
      - kind: other
        ref: "plan's own automated <verify> blocks for Task 1 (repro tier: D1/D2/D3/D7) and Task 2 (trace tier: D4/D5/D8) — both re-run clean; phase-wide gate 21 verdicts / 14 pending / 5 n/a / 40 total, matching plan-declared targets"
        status: pass
    human_judgment: false
  - id: D2
    description: "setopts-catalog.ts's D2 value-correctness check performed under a stated two-pass sampling protocol (sample size 14, first/last-per-byte-group selection rule, BASIS SETOPTS docs as source) rather than asserted"
    requirement: "RVW-03"
    verification:
      - kind: other
        ref: "acceptance grep confirming the D2 cell text/adjacent block names setopts-catalog.ts and contains the string 'sample'"
        status: pass
    human_judgment: false
  - id: D3
    description: "D4 logic/UI-layer duplication recorded via a programmatic structural diff (method + literal output in the cell) that cross-references RU-62-04's P62-D4-001 by ID rather than restating it, applying the 3-file -composer.ts baseline"
    requirement: "RVW-03"
    verification:
      - kind: other
        ref: "acceptance grep confirming the D4 cell contains 'diff'/'numstat', 'RU-62-04', and a P62-D4-NNN token"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every recorded finding carries all 13 required fields with a non-blank dedup checking #475/#385 explicitly by number, and no location resolves inside bbj-intellij/"
    requirement: "RVW-07"
    verification:
      - kind: other
        ref: "field-count parity check (18 findings phase-wide x 12 required fields, all equal counts = 18); grep -c for #475/#385 across the section; grep -c for bbj-intellij/ locations -> 0"
        status: pass
    human_judgment: false

duration: ~70min
completed: 2026-08-18
status: complete
---

# Phase 62 Plan 03: RU-62-03 (Composer Logic & UI Layer) Summary

**Swept `msgbox`/`addwindow`/`addchildwindow`-composer.ts, all four `-composer-ui.ts` files, and `setopts-catalog.ts` (2,027 LOC, the largest Phase 62 unit) across all 7 live dimensions — finding that addwindow/addchildwindow's free-text composer fields have zero input validation (unlike msgbox's own precedent), that msgbox's bare QuickPick command applies edits at a position that can go stale mid-wizard, and that the entire `-ui.ts` command-wiring layer (429 lines) is completely untested — plus a mechanical D4 duplication finding cross-referenced against `RU-62-04`'s generator-layer half, and a D2 sampling protocol that verified `setopts-catalog.ts`'s 50-entry SETOPTS bitmask catalog against the live BASIS documentation with zero mismatches.**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-08-18T07:20:00Z
- **Completed:** 2026-08-18T07:35:27Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/62-COVERAGE.md`)

## Accomplishments

- Swept `RU-62-03` at evidence tier `repro`/repro-equivalent across D1, D2, D3, D7, then at tier `trace` across D4, D5, D8 — all 7 live cells filled with a verdict and a written check line naming the concrete checks applied; the D6 cell's verbatim `n/a` carry-forward was left untouched.
- **D1 (fail, low):** traced the value-origin direction opposite to `RU-62-04`'s — for msgbox-composer.ts, `message`/`title` ARE validated via `validateStringField` before `composeStatement`, gating the webview's Insert button, but `assignTo` is not. For addwindow-composer.ts/addchildwindow-composer.ts, `composeAddWindow`/`composeAddChildWindow` embed `x`/`y`/`width`/`height`/`title`/`sysgui`/`receiver`/`window`/`id`/`context` verbatim with zero validation anywhere in either file, and neither `AddWindowPreview` nor `AddChildWindowPreview` carries a `valid`/error field at all. Confirmed by reading `ComposerModels.java`/`AddWindowComposerDialog.java` that this gap is symmetric across both IDEs (they consume the exact same unvalidated preview functions over LSP), not VS Code-only. Every affected field is developer-typed webview input, not document/config/workspace data, so rated `low` under D-09's full-detail branch. Recorded as `P62-D1-005`.
- **D2 (fail, medium):** ran `setopts-catalog.ts`'s D2 sampling protocol — a structural pass over all 50 `SETOPTS_BITS` entries (byte/mask/label/`bbjDetail` well-formedness) plus a stratified 14-entry value sample (first/last declared per byte group) — against the live BASIS SETOPTS documentation (both cited URLs fetched, HTTP 200), finding zero value mismatches; also confirmed the `bbjDetail`-presence-in-exactly-4-of-12-'ignored'-entries pattern faithfully mirrors which entries BASIS's own doc elaborates on, not a completeness gap. Separately traced `msgbox-composer-ui.ts`'s bare `runComposer` command (the legacy non-visual `bbj.composeMsgbox` path) and found it applies `editor.edit(...)` using line/character coordinates captured by the Code Action before an unbounded 4-step `await`ed QuickPick wizard runs, with no re-validation that the captured position still corresponds to the same content. Recorded as `P62-D2-005`.
- **D3 (pass):** checked catalog construction cost (all module-level `const`, never rebuilt), the four `*Preview` functions' per-keystroke recompute cost (bounded catalogs, no quadratic nesting), `setopts-catalog.ts`'s hex/vector conversion cost, and whether any of the 8 files retains an editor/document/panel reference beyond a single call — no defect found.
- **D4 (fail, medium):** ran a mechanical structural diff — `findMsgboxCallAt`/`findAddWindowCallAt`/`findAddChildWindowCallAt` hash byte-identically after normalizing the type name (md5 match across all three), msgbox-composer.ts's private `scanArgs` duplicates addwindow-composer.ts's exported (and addchildwindow-reused) `scanArgs` algorithm, and `addwindow-composer-ui.ts`/`addchildwindow-composer-ui.ts` diff by only 26/22 lines (of 68/72) with an identical `titleArg()` helper shape. Applied the D-15-confirmed 3-file `-composer.ts` baseline (SETOPTS has no `-composer.ts`, so `setopts-catalog.ts` is compared as its logic-layer counterpart, not a 4th row) and cross-referenced `RU-62-04`'s `P62-D4-001` by ID rather than restating its generator-layer evidence. Recorded as `P62-D4-004`.
- **D5 (fail, low):** confirmed by enumeration that all four `-composer-ui.ts` files (429 combined lines: the Code-Action providers, CodeLens provider, and command registrations) have zero test coverage, while the pure-logic layer they wrap is well tested (100/100 existing tests pass). Both `P62-D1-005` and `P62-D2-005` live entirely inside this untested quartet. Recorded as `P62-D5-003`.
- **D7 (pass):** confirmed msgbox/addwindow/addchildwindow have no divergent IntelliJ-side codegen — `ComposerModels.java`/`AddWindowComposerDialog.java`/`AddChildWindowComposerDialog.java`/`MsgboxComposerDialog.java` all consume this unit's exact preview functions over LSP4IJ, a shared single source of truth. Independently confirmed (via `ls`/`grep` against `bbj-intellij/composer/` and `ComposerLauncher.java`) the same SETOPTS/IntelliJ absence `RU-62-04` already found, from this unit's own logic/UI-layer perspective — routed as a corroborating cross-unit referral to `RU-63-04` rather than a new `P62-D7-*` finding.
- **D8 (pass):** verified all four of `setopts-catalog.ts`'s header claims (absolute/stateless config.bbx string, bytes 5-6/10-16 semantics, no `vscode` dependency, IntelliJ/#475 reusability) against the code and Task 1's evidence — all accurate. Checked every JSDoc block across the other seven files for an over-claimed safety property against Task 1's D1 trace — none found; `CLAUDE.md` makes no positive claim about any of this unit's 8 files.
- Recorded 1 not-reproducible disposition (a candidate two-concurrent-`runComposer`-invocations race, deferred pending a concurrency harness) and 1 cross-unit referral to `RU-63-04`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-62-03 at evidence tier `repro` — D1, D2, D3, D7** - `9c8673b` (docs)
2. **Task 2: Complete RU-62-03 at evidence tier `trace` — D4, D5, D8** - `12b1d42` (docs)

**Plan metadata:** commit created by this SUMMARY step (docs: complete plan)

## Files Created/Modified

- `.planning/reviews/62-COVERAGE.md` - `## RU-62-03 — Composer logic & UI layer` section only: all 7 live cells verdicted, 4 finding records, 1 not-reproducible disposition, 1 cross-unit referral. Header, grid, D-14 gate, stopping rule, exclusion-reason block, `RU-62-04`/`RU-62-01`, the two remaining stubbed unit sections, and `## Phase 62 Close-Out` were not touched.

## Decisions Made

- `P62-D1-005` rated `low` (not `critical`/`high`) since every affected field is developer-typed composer-form input, not document/config/workspace data — falls under D-09's full-concrete-detail branch, no redaction applied.
- `P62-D2-005` classified `major` on D-13 test (4) alone (no existing test harness for any `-ui.ts` file in this unit), consistent with `RU-62-04`'s own precedent for UI-layer findings needing new test infrastructure.
- The `setopts-catalog.ts` `bbjDetail`-completeness question was investigated with a live documentation fetch and resolved as a non-defect (source-doc-driven, not a gap) — recorded as verified-clean evidence in the D2 cell rather than a finding or a not-reproducible disposition, since it fully cleared its `trace`/`repro` evidence bar with a clean result.
- `RVW-03` marked complete: this plan and `62-01` are the only two plans whose frontmatter declares `RVW-03`, and both are now done, covering the complete 12-file webview-composer surface. `RVW-02` remains open pending `62-04`/`62-05`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` blocks passed on the first run.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `62-COVERAGE.md` now has 3 of 5 Phase 62 units fully swept (`RU-62-04`, `RU-62-01`, `RU-62-03`); phase-wide verdict count is 21/40, pending 14/40, `n/a` 5/40 — matching the D-14 gate's re-derived totals (35/5/40).
- `RVW-03` is now fully satisfied (both `RU-62-04` and `RU-62-03` complete).
- Phase 65's cross-cutting security synthesis inherits `P62-D1-005` as a concrete, evidenced finding on the value-assembly side of the composer surface, complementing `RU-62-04`'s HTML-generation-side findings.
- Phase 63 inherits a corroborating `RU-63-04` referral (SETOPTS has no IntelliJ counterpart, confirmed from two independent Phase 62 units) to re-triage alongside `RU-62-04`'s existing referral.
- Plan `62-05` (`RU-62-05`, wave 4, depends on this plan) is next.

---
*Phase: 62-extension-host-webview-composer-review*
*Completed: 2026-08-18*
