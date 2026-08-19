---
phase: 68-deliverable-documents
plan: 04
subsystem: docs
tags: [node, esm, markdown, derivation-script, review-findings, doc-03]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "68-03's complete MAJOR-REFACTORS.md ## Other Dispositions section (DOC-04's 71-item population) and the emit-other/extractProseSubBlocks apparatus, plus the emit-easy/emit-major/check scaffolding from 68-01/68-02"
provides:
  - "A shared ## Coverage preamble (### Scope then ### Gaps) opening both EASY-FIXES.md and MAJOR-REFACTORS.md, byte-identical, generated once by renderCoveragePreamble and spliced between the title and ## Derivation (moved down) in both documents"
  - "### Scope: the 21 review units + 8 file-exception rows across four sweep phases, all eight D1-D8 dimensions, the 232-cell grid totals (148 applies / 84 n/a), the 224-record evidence-tier distribution (108 repro / 80 trace / 36 inherited), all seven REQUIREMENTS.md Out-of-Scope exclusions with reasons plus the documentation/ (D8-only) and README.md (excluded, future-D8-candidate) boundary cases, and the 224=144+77+3 corpus size — citing INVENTORY.md by section name rather than restating its grid"
  - "### Gaps: the JDK-17 gap (nine bbj-intellij/ fixes review-verified only under Phase 67 D-14, one deferred under D-15, review-verified never shortened to bare 'verified'), the 11 deterministic test/linking.test.ts Interop-related-tests failures plus the separate hookTimeout run-to-run variance (Phase 64 D-06 — port 5008 does not fix them), the 24 not-reproducible candidate claims (linked to Other Dispositions), and Phase 65's ~36-enumerated/3-recorded shape"
  - "derive-review-docs.mjs's renderCoveragePreamble, easyTitle/majorTitle + easyDerivation/majorDerivation (split out of the former easyHeader/majorHeader so ## Coverage can be spliced between them), extractTopLevelSection (a ## heading extractor that does not stop at a ### sub-heading, unlike the existing DOC-04 extractSubsection), and checkCanonicalSectionOrder"
  - "check()'s DOC-03 assertion group (5 assertions): single-first-heading presence, cross-document byte-identity (first differing line + both lines on mismatch), live-render equality against renderCoveragePreamble() (hand-edit gate, reports preamble length in lines), Scope-before-Gaps ordering, and phase_conventions section-order validation (observed heading sequence reported on violation) — verified round-trip against both a ### Gaps hand edit and a heading reorder"
affects: [68-05, 68-06, 68-07, 69-github-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 7765
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "extractTopLevelSection over extractSubsection for a section with its own ### sub-headings: extractSubsection's terminator regex /\\n##/ also matches the first \\n### line (### is a superset match of ##), so it cannot span ## Coverage's own ### Scope/### Gaps sub-headings — extractTopLevelSection uses /^## /m instead, which does not match ### lines because their third character is # rather than a space"
    - "Title/Derivation split so a shared cross-cutting block can be spliced between them: easyHeader()/majorHeader() (which fused the # title and ## Derivation into one string) were split into easyTitle()/majorTitle() and easyDerivation()/majorDerivation() so renderCoveragePreamble()'s single ## Coverage string can sit between title and Derivation in the write composition without either document's Derivation text changing"
    - "Live-render equality as the hand-edit gate, not mere cross-document equality: check() compares each document's ## Coverage text against renderCoveragePreamble()'s output computed fresh at check time, not just against each other — two documents edited identically would still pass a bare cross-document diff but fail the live-render check, closing that gap (T-68-14)"
    - "Canonical section-order check as a per-document subsequence, not a full-order requirement: CANONICAL_HEADING_ORDER lists every slot this whole phase will eventually fill (through ## Close-out, not yet written by any plan), and checkCanonicalSectionOrder only requires that whichever ## headings a document currently carries appear in non-decreasing slot order — so the check is stable across the phase's remaining plans rather than needing updates as later sections are added"

key-files:
  created: []
  modified:
    - .planning/phases/68-deliverable-documents/derive-review-docs.mjs
    - .planning/reviews/EASY-FIXES.md
    - .planning/reviews/MAJOR-REFACTORS.md

key-decisions:
  - "Split Tasks 1 and 2's script code across one commit rather than two, following 68-02's and 68-03's own precedent (documented in their SUMMARYs): renderCoveragePreamble's ### Scope and ### Gaps sub-sections are one function producing one string emitted into both documents in a single write, so authoring and regenerating them in two separate commits would mean re-running the same emit/write cycle twice for no verifiable intermediate state (Task 1's own verify block already requires ### Scope AND the coverage identity check to pass together with ### Gaps absent — there is no meaningful checkpoint between the two halves of one preamble). Task 3's check()-extension work is a genuinely separable increment (a new assertion group over already-written documents) and landed in its own commit."
  - "Preamble length is 79 lines, reported by check()'s own PASS line at every run (\"both documents' Coverage text equals the live renderCoveragePreamble() output (79 lines)\") — no INVENTORY.md or REQUIREMENTS.md fact named in the plan's must_haves/acceptance_criteria was omitted for length; every required literal (21, 8, 232, 148, 84, 224, 108, 80, 36, all eight dimension names, all seven Out-of-Scope rows, the documentation/ and README.md boundary cases, Temurin 25.0.3, P63-D7-004, 5008, linking.test.ts, hookTimeout, ~36/3 for Phase 65) is present and grep-verified."

requirements-completed: [DOC-03]

coverage:
  - id: D1
    description: "Both EASY-FIXES.md and MAJOR-REFACTORS.md open with the same ## Coverage block (### Scope then ### Gaps), byte-identical, positioned after the title and before ## Derivation"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check — DOC-03 assertion group (5 PASS lines: heading presence, cross-document byte-identity, live-render equality, Scope-before-Gaps, section order)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The gap half states the JDK-17 gap, the 11 interop test failures plus hookTimeout variance, the 24 not-reproducible claims, and Phase 65's shape, each with its cause and record IDs — no requirement's wording restated as met"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "grep -Fq checks for 'Temurin 25.0.3', 'P63-D7-004', '5008', 'linking.test.ts', 'hookTimeout' in EASY-FIXES.md (Task 2 verify block)"
        status: pass
    human_judgment: true
    rationale: "Whether the gap prose reads as honest rather than rosier — the actual judgment call DOC-03 exists for — is a human-legible-prose question the grep/check assertions can confirm content-presence for but cannot adjudicate tone or completeness of framing."

# Metrics
duration: 3min
completed: 2026-08-19
status: complete
---

# Phase 68 Plan 04: Shared Coverage Preamble Summary

**Added a `## Coverage` section (`### Scope` + `### Gaps`) generated once by `renderCoveragePreamble` and spliced identically into both `EASY-FIXES.md` and `MAJOR-REFACTORS.md`, with a standing `check()` gate that fails on any hand edit or heading reorder.**

## Performance

- **Duration:** ~3 min (commit timestamps 18:37:50Z → 18:40:06Z)
- **Started:** 2026-08-19T18:37:50Z
- **Completed:** 2026-08-19T18:40:06Z
- **Tasks:** 3
- **Files modified:** 3 (`derive-review-docs.mjs`, `EASY-FIXES.md`, `MAJOR-REFACTORS.md`)

## Accomplishments
- `renderCoveragePreamble()` produces one 79-line block — `### Scope` (21 units + 8 file-exception rows, all eight D1-D8 dimensions, 232-cell grid totals, 224-record evidence-tier distribution, all seven named exclusions with reasons, the `documentation/`/`README.md` boundary cases, the 224=144+77+3 corpus size) then `### Gaps` (JDK-17/IntelliJ, 11 interop test failures + hookTimeout variance, 24 not-reproducible claims, Phase 65's shape) — emitted identically into both documents by construction
- `easyHeader()`/`majorHeader()` split into title + derivation halves so `## Coverage` sits between the `# ` title and `## Derivation` per this plan's `<phase_conventions>`, without altering either document's `## Derivation` text
- `check()`'s new DOC-03 assertion group (5 assertions) verified round-trip: a hand edit to `### Gaps` in one document now fails with the first differing line and both lines shown; reverting returns `check` to exit 0; moving `## Coverage` below `## Derivation` fails with the observed heading sequence printed; reverting again returns to exit 0
- All pre-existing DOC-01/DOC-02/DOC-04 assertions (27 PASS lines total) still pass unchanged after both documents were fully regenerated via `emit-easy --write` / `emit-major --write` / `emit-other --write`

## Task Commits

Each task was committed atomically (Tasks 1 and 2 share one commit — one `renderCoveragePreamble` producer with two halves that only becomes checkable as a whole, see Decisions):

1. **Task 1 + Task 2: The Scope half and the Gap half** - `d9f17bc` (feat)
2. **Task 3: Preamble identity and section order added to the standing check** - `60a1588` (test)

**Plan metadata:** _pending — this commit_

## Files Created/Modified
- `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` - `renderCoveragePreamble`, `easyTitle`/`majorTitle`, `easyDerivation`/`majorDerivation`, `extractTopLevelSection`, `CANONICAL_HEADING_ORDER`, `canonicalSlotForHeading`, `checkCanonicalSectionOrder`, and `check()`'s new DOC-03 assertion group
- `.planning/reviews/EASY-FIXES.md` - regenerated with `## Coverage` as its first section
- `.planning/reviews/MAJOR-REFACTORS.md` - regenerated with `## Coverage` as its first section (its `## Other Dispositions` section, unaffected, re-spliced back on by `emit-other --write`)

## Decisions Made
See `key-decisions` in frontmatter: (1) Tasks 1+2 share one commit since `renderCoveragePreamble`'s two halves are one function with no independently-checkable intermediate state; Task 3 is a separable check-only increment and landed on its own. (2) The 79-line preamble omits no INVENTORY.md/REQUIREMENTS.md fact the plan required — every literal and citation named in `must_haves`/`acceptance_criteria` is present and grep-verified.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were verified directly (grep checks, `diff` of extracted Coverage sections, `node derive-review-docs.mjs check`, and the Task 3 hand-edit/reorder round-trip) with no auto-fixes required.

## Issues Encountered

None. The baseline `check()` run before any edit was already green (0 failures across 27 assertions carried over from 68-01/68-02/68-03), so the new DOC-03 work started from a clean, fully-passing corpus.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both documents now open with an identical, mechanically-verified coverage statement. Plan `68-05` and onward can proceed to author the remaining sections (`## Close-out` per `<phase_conventions>`) without re-deriving or duplicating scope/gap prose — any future edit to either document's `## Coverage` copy, or a reorder of its top-level headings, is caught by `check()` before it can silently ship.

---
*Phase: 68-deliverable-documents*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- FOUND: `.planning/reviews/EASY-FIXES.md`
- FOUND: `.planning/reviews/MAJOR-REFACTORS.md`
- FOUND: `.planning/phases/68-deliverable-documents/68-04-SUMMARY.md`
- FOUND commit `d9f17bc` (Task 1+2)
- FOUND commit `60a1588` (Task 3)
- FOUND commit `b5b8ee1` (this SUMMARY)
