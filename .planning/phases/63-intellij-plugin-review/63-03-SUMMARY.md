---
phase: 63-intellij-plugin-review
plan: 03
subsystem: review
tags: [intellij, composer, dialogs, lsp4ij, gson, dto, setopts, security-audit, sec-03, java]

requires:
  - phase: 63-intellij-plugin-review
    plan: 02
    provides: .planning/reviews/63-COVERAGE.md with RU-63-03 and RU-63-01 both fully swept (28 findings, phase-wide verdict count 14), establishing the recording shape this plan copies exactly
provides:
  - RU-63-04 (Composer dialogs & bridge, 13 files / 2,067 LOC, the largest unit by LOC in Phase 63, INVENTORY risk rank 3) fully swept across all 7 live dimensions
  - Confirmation that the composer "bridge" (BbjComposerServer/BbjComposerService) is an LSP4IJ proxy over the existing language server connection, not a spawned external process — correcting INVENTORY's own risk-rank framing
  - A field-for-field DTO shape comparison between ComposerModels.java and composer-commands.ts's param/result types, finding a dormant (currently inert) shape gap
  - Both inherited Phase 62 referrals (#4 from RU-62-04, #5 from RU-62-03) — the SETOPTS-has-no-IntelliJ-counterpart absence seen from two vantage points — dispositioned together as one promoted finding
affects: [63-intellij-plugin-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents, 69-github-issues]

actuals:
  tokens: 17400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Bridge-characterization correction — traced BbjComposerServer.java/BbjComposerService.java against INVENTORY's own risk-rank description ('bridge to an external composer process') and found no ProcessBuilder/Runtime.exec/socket anywhere in the unit; every composer request rides the existing LSP4IJ connection, so the description was corrected rather than carried forward unverified"
    - "Field-for-field DTO comparison as the D7 evidence method — comparing ComposerModels.java's public fields against composer-commands.ts's TypeScript interfaces name-by-name surfaced a dormant shape gap (MsgboxPreview.exprText, CatalogItem.constant) that neither UI currently consumes, distinguishing a 'currently inert' finding from an 'active regression'"
    - "Merged-referral triage — two Phase 62 referrals describing the same SETOPTS absence from two vantage points (generator-layer and logic/UI-layer) triaged as one disposition naming both sources, per D-06, rather than double-counted"

key-files:
  created: []
  modified:
    - .planning/reviews/63-COVERAGE.md

key-decisions:
  - "Corrected INVENTORY's risk-rank description of the composer bridge ('bridge to an external composer process') after tracing BbjComposerServer.java/BbjComposerService.java: it is an LSP4J @JsonRequest proxy over the same running language server, not a spawned process — no ProcessBuilder/Runtime.exec/socket exists anywhere in the 13 files"
  - "Recorded P63-D2-010 (stale captured document-edit range never revalidated between dialog-open decode and post-modal apply) matching the plan's own threat model entry T-63-P03-S4 — a genuine, evidenced correctness gap distinct from the D1 self-inflicted-input framing"
  - "Found a dormant DTO field gap (MsgboxPreview.exprText, msgbox CatalogItem.constant present in TypeScript, absent from Java's unified DTOs) via field-for-field comparison, then verified it currently has zero user-visible impact — VS Code's own webview also never reads exprText — recording it as a low-severity, currently-inert shape gap (P63-D7-004) rather than an active parity bug, and classifying it easy (single-file, no-behavior-change DTO field addition)"
  - "Triaged inherited referrals #4 (RU-62-04) and #5 (RU-62-03) as one merged disposition per D-06: verified against the current tree that SETOPTS has no bbj/composer/setopts/* LS command, no SetoptsComposerDialog.java, and no SetOpts* DTO; checked PROJECT.md's Key Decisions and setopts-catalog.ts's own header (which names IntelliJ reuse as a stated future intention, not an exclusion) and found no deliberate scope decision — promoted to P63-D7-005 with dedup naming #475 as a partial-overlap (porting the existing #474 config.bbx composer vs. #475's broader BBj-code-scoped request)"
  - "Rated the mechanical dialog/intention/helper duplication findings (P63-D4-007/008/009) major under D-09's strict single-file test despite being pure structural refactors satisfying test (4) vacuously, mirroring RU-63-01's own precedent for the same test-(1)-fails-regardless-of-behavior pattern"
  - "D5 cell cross-references P63-D5-001 by ID with no new finding allocated — only this unit's own untested-behaviour consequence, plus the VS-Code-has-4-composer-test-files / IntelliJ-has-none asymmetry, per D-08"

requirements-completed: []  # RVW-04 is phase-wide (spans all 5 plans); not marked complete until 63-05 closes the phase

metrics:
  duration: ~24min (task commits only)
  completed: 2026-08-18
  status: complete
---

# Phase 63 Plan 03: RU-63-04 (Composer dialogs & bridge) Summary

**Swept all 13 files under `bbj-intellij/.../composer/` (the largest unit by LOC in Phase 63) across all 7 live dimensions, recording 14 findings including a dormant DTO shape gap found by a field-for-field comparison against the language server's TypeScript types, and merged both inherited SETOPTS-absence referrals into one promoted finding.**

## Performance

- **Duration:** ~24 min (task commits only)
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/63-COVERAGE.md`)

## Accomplishments

- Swept `RU-63-04` (Composer dialogs & bridge, 13 files / 2,067 LOC, INVENTORY risk rank 3) end to end across all 7 live dimensions — D1, D2, D3, D7 at `repro`/repro-equivalent tier; D4, D5, D8 at `trace` tier.
- Recorded 14 findings: 1 D1 (unescaped/unvalidated dialog-input/catalog-value/LS-preview-string writes into the user's document, mirroring Phase 62's `P62-D1-005` on the IntelliJ side), 4 D2 (unhandled `CompletableFuture` failures across all composer LSP4IJ calls — zero `.exceptionally()`/`.handle()`/`.whenComplete()` anywhere in the unit; a catalogs-sublist-null NPE risk; an unguarded `AddWindowEdit` array-index gap; and `P63-D2-010`, a stale captured document-edit range applied with no revalidation, matching the plan's own threat model entry T-63-P03-S4), 2 D3 (no debounce on per-keystroke preview requests across all three dialogs; catalogs and server resolution re-fetched on every single composer-open invocation rather than cached), 3 D4 (the AddWindow/AddChildWindow dialog pair's ~85-88% structural duplication; the three `Configure*Intention.java` files' near-identical triple; three small static helpers — `clip()`, `labeled()`, `setEnabledRecursive()` — duplicated verbatim with no shared composer/ utility), 1 D5 (`P63-D5-001` cross-reference plus this unit's own untested-behaviour consequence — no new ID), 2 D7 (a dormant DTO field gap found by field-for-field comparison against `composer-commands.ts`, and the merged SETOPTS-absence referral promoted to `P63-D7-005`), and 2 D8 (stale "create-only"/"both composer UIs" class-doc claims that post-date the `#473` addChildWindow addition, and `ComposerModels.java`'s "mirroring" doc claim softened against the confirmed DTO field gap).
- Established, by tracing `BbjComposerServer.java`/`BbjComposerService.java` in full, that the composer "bridge" spawns no external process at all — it is an LSP4J `@JsonRequest` proxy resolved through `LanguageServerManager` over the existing language-server connection — correcting INVENTORY's own risk-rank description of it as bridging "to an external composer process."
- Ran a field-for-field DTO comparison (`ComposerModels.java` vs. `composer-commands.ts`'s TypeScript param/result interfaces) as the D7 evidence method, confirming generated-BBj-code equivalence for msgbox/addwindow/addchildwindow holds by construction (all three dialogs call the identical shared `bbj/composer/*/preview` LS handlers), and surfacing one dormant shape gap (`MsgboxPreview.exprText`, msgbox `CatalogItem.constant`) that neither IDE's UI currently consumes.
- Triaged both inherited Phase 62 referrals (#4 `RU-62-04`, #5 `RU-62-03` — the same SETOPTS-has-no-IntelliJ-counterpart absence from two vantage points) as one merged disposition per D-06, re-verified against the current tree, and promoted to `P63-D7-005` with `dedup:` naming #475 explicitly as a partial-overlap (porting the existing, already-shipped `#474` config.bbx composer, distinct from #475's broader BBj-code-scoped decode-hover/tri-state request).

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-63-04 at evidence tier `repro` — D1, D2, D3, D7 — and triage the merged SETOPTS referral** - `3ddf882` (docs)
2. **Task 2: Complete RU-63-04 at evidence tier `trace` — D4, D5, D8** - `967aba4` (docs)

_No TDD tasks in this plan — it is a review-recording plan that modifies no source file._

## Files Created/Modified

- `.planning/reviews/63-COVERAGE.md` - Filled the `## RU-63-04 — Composer dialogs & bridge` section only: all 7 live cells, the merged inherited-referral triage, 14 finding records, the empty Not-reproducible-dispositions and Cross-unit-referrals statements, and the unit closure/scope-fidelity note.

## Decisions Made

- Corrected INVENTORY's "bridge to an external composer process" framing after tracing the actual code: no `ProcessBuilder`/`Runtime.exec`/socket exists anywhere in this unit's 13 files — the bridge is an LSP4IJ proxy over the same running language server.
- Recorded `P63-D2-010` (stale captured document-edit range, no revalidation between decode-at-launch and apply-after-modal-close) matching threat `T-63-P03-S4` from the plan's own threat model.
- Found the `MsgboxPreview.exprText`/`CatalogItem.constant` DTO field gap via field-for-field comparison, then verified VS Code's own webview also never reads `exprText` — classifying the gap as currently inert (low severity, easy fix) rather than an active display regression, since the actually-generated/inserted BBj code is unaffected on either side.
- Merged inherited referrals #4 and #5 into one disposition per D-06, re-verifying the SETOPTS absence against the current tree rather than re-deriving Phase 62's own commands, and checked `PROJECT.md`'s Key Decisions plus `setopts-catalog.ts`'s own header (naming IntelliJ reuse as a stated future intention) before concluding no deliberate scope decision exists — promoted to `P63-D7-005`.
- Classified all three D4 duplication findings and the multi-file D8 finding `major` under D-09's strict single-file test despite being behavior-preserving refactors/doc-only edits that satisfy test (4) vacuously — each spans 2-3 files, failing test (1) — mirroring `RU-63-01`'s own precedent; kept the single-file D7/D8 DTO-comment findings `easy`.
- Kept D5 to a pure cross-reference (`P63-D5-001`) plus this unit's own untested-behaviour consequence and the VS-Code-has-4-composer-test-files / IntelliJ-has-none asymmetry, allocating no new D5 finding ID, per D-08.

## Deviations from Plan

None - plan executed exactly as written. All checks the plan's `<action>` text specified were performed at both evidence tiers; every candidate claim raised during the sweep cleared its tier and was recorded as a finding (no `### Not-reproducible dispositions` entry was needed, and no outbound `### Cross-unit referrals` was needed, both stated explicitly rather than omitted per the stopping rule's empty-subblock register).

## Known Stubs

None — this plan's deliverable is a review-coverage document, not application code; there is no data-rendering surface to stub. The remaining two `## RU-63-0N` unit sections (`RU-63-05`, `RU-63-02`) and `## Phase 63 Close-Out` remain intentionally stubbed with `pending`, per plan `63-01`'s designed handoff shape for plans `63-04` and `63-05`.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-63-04`'s D1/D2 findings (`P63-D1-006` unescaped document-write path, `P63-D2-010` stale-range revalidation gap) are concrete, evidenced IntelliJ-side records ready for Phase 65's SEC-05 (process spawning / document-edit trust) synthesis; the bridge-characterization correction (LSP4IJ proxy, not a spawned process) is ready for Phase 65's SEC-04/SEC-05 cross-cutting picture.
- All 8 inherited-referral-ledger rows now carry `promoted` dispositions after this plan (rows 1-3 from `RU-63-01`, rows 4-5 merged here into `P63-D7-005`, row 8 already promoted by `RU-63-03`) — only rows 6-7 (`RU-62-05`/`RU-62-02` → `RU-63-02`) remain outstanding for plan `63-05`, updating the phase's third hard gate (D-17.3) toward completion.
- Plan `63-04` (`RU-63-05`, LSP wiring, server lifecycle & status UI) is next in the wave chain and inherits no Phase 62 referral rows.
- Phase-wide verdict count is 21 of 40 (14 `pending` remaining, both matching the plan's own gate arithmetic); `RU-63-04`'s D5 cell's `P63-D7-004` cross-reference and the DTO round-trip test gap it names are ready for Phase 66's DEBT-02 re-triage discussion alongside `P63-D5-001`.

---
*Phase: 63-intellij-plugin-review*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/phases/63-intellij-plugin-review/63-03-SUMMARY.md`
- FOUND: commit `3ddf882` (Task 1)
- FOUND: commit `967aba4` (Task 2)
