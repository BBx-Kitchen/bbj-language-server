---
phase: 69-github-issue-filing
plan: 06
subsystem: docs
tags: [issue-filing, drafting, low-severity, vscode, intellij, documentation]
dependency-graph:
  requires:
    - 69-01-PLAN.md (phase_conventions: label parse, title rule, six-section body order, verbatim-lift rule)
    - .planning/reviews/MAJOR-REFACTORS.md (source corpus, read-only)
  provides:
    - .planning/phases/69-github-issue-filing/69-BODIES-06.md
  affects:
    - 69-08 (assembly into 69-ISSUE-DRAFT.md's `## Index`/`## Bodies` sections)
tech-stack:
  added: []
  patterns:
    - "Six-section body order (Problem/Evidence/Failure scenario/Proposed approach/Acceptance criteria/Traceability) rendered identically for all 18 records, low and D1-primary alike"
    - "Labels parsed from proposed_labels: alone, never effort: or severity: (D-09), verified against live `gh label list`"
    - "Review-internal RU-nn-nn reference translated in place into plain artifact language, matching the convention established in 69-BODIES-01.md through -05.md (not the literal bracketed-gloss reading of D-11)"
key-files:
  created:
    - .planning/phases/69-github-issue-filing/69-BODIES-06.md
  modified: []
decisions:
  - "P63-D3-006's proposed_approach: references RU-63-03 ('mirroring RU-63-03's own getNodeDataDirectory() pattern'). Translated in place to 'the Node.js download-and-cache logic's own getNodeDataDirectory() pattern (in bbj-intellij's BbjNodeDownloader.java)', consistent with 69-BODIES-01.md's P63-D1-007 precedent — no raw RU-nn-nn token left in the delimited region and no bracketed gloss appended after a literal RU-nn-nn mention, since none survives to gloss."
  - "All 3 D1-primary records in this band (P62-D1-001, P62-D1-006, P63-D1-006) are `low` severity and therefore route public issue under the two-field predicate, filed with the same template/labels/order as every other record (D-03) — no advisory handling, no redacted Evidence, no exploit recipe."
  - "P64-D8-001 (area=documentation, the corpus's second documentation record) carries the existing `documentation` label; no label was created. Its acceptance criteria state a code-versus-comment agreement condition, not a docs-site restructuring task."
  - "P63-D4-005's location: field names three Java files with no line range at all. Its Evidence section reproduces the location value byte-identically in backticks and does not invent a line number or range."
metrics:
  duration: ~25min
  completed: 2026-08-20
status: complete
actuals:
  tokens: 13240
  tasks: 2
  commits: 2
---

# Phase 69 Plan 06: Render filing-order rows 108-125 Summary

Rendered `69-BODIES-06.md`, holding 18 index rows and 18 delimited body blocks for filing-order
rows 108-125 — the middle band of the corpus's 57 `low`-severity records, all routed
`public issue`, spanning `BBj integration and infrastructure`, `vscode`, `documentation` and
`intellij` areas, with one record's review-internal reference translated in place and one
record's evidence reproducing a file-only location with no invented line range.

## What Was Built

- `.planning/phases/69-github-issue-filing/69-BODIES-06.md` — a new intermediate render shard
  covering filing-order rows 108-125. Structure matches `69-BODIES-01.md`'s approved template and
  `69-BODIES-05.md`'s prior-shard shape exactly: `## Index rows 108-125` (a five-column table) and
  `## Bodies rows 108-125` (18 numbered sections, each with a `<!-- BODY-BEGIN id --> ... <!--
  BODY-END id -->` delimited region containing the fixed six-section body order).
- All 18 records route `public issue` — the band contains no `critical`/`high` D1-primary record,
  so the advisory route is never taken here.
- 3 D1-primary records (`P62-D1-001`, `P62-D1-006`, `P63-D1-006`) are filed exactly like every
  other record in this shard — same template, same label set, same numbered position, same
  `## Evidence` shape (surface/problem-class/impact only, no reproduction command, no payload, no
  ordered step sequence).
- `P64-D8-001` — the second of the corpus's two `area=documentation` records — carries the
  existing `documentation` label, confirmed present in `gh label list`; nothing was created.
- `P63-D3-006` — the one record in this band whose lifted `proposed_approach:` text carries a
  review-internal `RU-63-03` reference — was translated in place: "mirroring RU-63-03's own
  getNodeDataDirectory() pattern" became "mirroring the Node.js download-and-cache logic's own
  getNodeDataDirectory() pattern (in bbj-intellij's BbjNodeDownloader.java)". Verified
  `getNodeDataDirectory()` is a real private method in `BbjNodeDownloader.java:285`. This follows
  the in-place-translation convention already established for `P63-D1-007` in `69-BODIES-01.md`,
  not the literal "lift verbatim then append a bracketed gloss" reading of D-11's own text — the
  established precedent across all five prior shards translates the reference itself rather than
  leaving the raw `RU-nn-nn` token present with a gloss appended.
- `P64-D4-006`'s 1,072-character `failure_scenario:` field was lifted byte-for-byte (confirmed by
  length and by a first-120-character verbatim match inside its delimited region) — it is the
  longest `failure_scenario:` in this shard and the plan's stated third-longest in the corpus.
- `P63-D4-005`'s `location:` field names three Java action files with no line range at all
  (`BbjComposeAddChildWindowAction.java,BbjComposeAddWindowAction.java,BbjComposeMsgboxAction.java`).
  Its `## Evidence` section reproduces that value byte-identically in backticks rather than
  inventing a line number the record does not carry.
- All nine `dedup:` values in each task's band were individually confirmed to read `none` while
  extracting — no record in this band carries a `dedup:` annotation. Confirmed for all 18:
  `P64-D4-002`, `P64-D4-006`, `P64-D8-001`, `P61-D4-004`, `P61-D4-015`, `P62-D1-001`,
  `P62-D1-006`, `P62-D4-003`, `P63-D1-006`, `P63-D2-002`, `P63-D2-008`, `P63-D2-011`,
  `P63-D3-003`, `P63-D3-004`, `P63-D3-006`, `P63-D4-003`, `P63-D4-004`, `P63-D4-005`.

Task 1 rendered rows 108-116 (9 records, first commit `b958740`). Task 2 appended rows 117-125
(9 records, second commit `bd05ab5`), completing the shard's 18 rows. Each task's own `<verify>`
script was run against the file's state at that point in the sequence and passed before
committing.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues encountered.

### Applied convention (not a deviation from intent)

**RU-63-03 in-place translation vs. D-11's literal "verbatim + bracketed gloss" wording.**
`P63-D3-006` is not one of the seventeen finding IDs the phase-conventions gloss list names, and
its RU-nn-nn reference sits inside `proposed_approach:`, not `failure_scenario:`. D-11's literal
text says a verbatim-lifted sentence containing a review-internal reference should be lifted
verbatim with a bracketed gloss appended after it. The orchestrator's prior-wave context for this
plan states the settled convention actually applied across `69-BODIES-01.md` through `-05.md` is
to translate the reference in place into plain artifact language instead, which is what
`69-BODIES-01.md`'s `P63-D1-007` already does for the same `RU-63-03` referent. Followed that
established precedent rather than re-deriving a bracketed-gloss reading that would leave the raw
`RU-nn-nn` token present in the delimited region — which the region-scoped self-containedness gate
forbids regardless of which reading is chosen.

No auth gates encountered. No architectural changes needed.

## Verification

Ran both tasks' `<automated>` verify scripts against the file's state at the point each task
completed (9-record state after Task 1, 18-record state after Task 2). Both passed:

- 18 `BODY-BEGIN`/`BODY-END` marker pairs, 18 index rows, all routed `public issue`, 0 routed
  `private draft advisory`.
- Each of the six section headings appears exactly 18 times inside the delimited regions.
- Zero occurrences of `.planning/`, `MAJOR-REFACTORS`, `COVERAGE.md`, `INVENTORY.md`, an
  `RU-nn-nn` identifier, or a `§` pointer inside the concatenated delimited regions.
- All 18 target finding IDs present as `BODY-BEGIN` markers.
- `P64-D4-006`'s delimited region contains the first 120 characters of its corpus
  `failure_scenario:` field verbatim.
- `P63-D4-005`'s delimited region contains its corpus `location:` value byte-identically.
- `git diff --quiet .planning/reviews/MAJOR-REFACTORS.md` exits 0 — the corpus was never touched.
- `git status --porcelain .planning/reviews/` is empty.

Additionally confirmed live against `gh label list` (read-only, no write): `vscode`, `intellij`,
`documentation`, `BBj integration and infrastructure`, `PRIO 3`, `2` and `4` all exist
byte-identical in the repository's label set — no label was created by this plan.

## Known Stubs

None. All 18 bodies are complete, self-contained renderings per the phase's fixed six-section
template — no placeholder text, no empty acceptance criteria, no unwired data.

## Threat Flags

None. This plan only reads `MAJOR-REFACTORS.md` and writes a new intermediate draft file under
`.planning/`; no tracker write, no new endpoint, no new trust boundary.

## Self-Check: PASSED

- FOUND: `.planning/phases/69-github-issue-filing/69-BODIES-06.md`
- FOUND: commit `b958740` (Task 1)
- FOUND: commit `bd05ab5` (Task 2)
