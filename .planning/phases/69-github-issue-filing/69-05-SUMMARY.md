---
phase: 69-github-issue-filing
plan: 05
subsystem: docs
tags: [issue-filing, drafting, low-severity, vscode, intellij]
dependency-graph:
  requires:
    - 69-01-PLAN.md (phase_conventions: label parse, title rule, six-section body order, verbatim-lift rule)
    - .planning/reviews/MAJOR-REFACTORS.md (source corpus, read-only)
  provides:
    - .planning/phases/69-github-issue-filing/69-BODIES-05.md
  affects:
    - 69-08 (assembly into 69-ISSUE-DRAFT.md's `## Index`/`## Bodies` sections)
tech-stack:
  added: []
  patterns:
    - "Six-section body order (Problem/Evidence/Failure scenario/Proposed approach/Acceptance criteria/Traceability) rendered identically for all 20 records, low and D1-primary alike"
    - "Labels parsed from proposed_labels: alone, never effort: or severity: (D-09), verified against live `gh label list`"
key-files:
  created:
    - .planning/phases/69-github-issue-filing/69-BODIES-05.md
  modified: []
decisions:
  - "P63-D3-005's prose rounding annotation inside effort: (`revised 2026-08-18: recorded as 3... Rounded DOWN...`) is review bookkeeping only — never read as a label source and never transcribed into the rendered body; labels come from proposed_labels: alone (intellij, PRIO 3, 2)"
  - "All 5 D1-primary records in this band (P61-D1-009, P62-D1-002, P62-D1-007, P63-D1-002, P63-D1-008) are `low` severity and therefore route public issue under the two-field predicate, filed with the same template/labels/order as every other record (D-03) — no advisory handling, no redacted Evidence"
  - "P63-D8-004 (area=documentation) acceptance criteria state a code-versus-docs agreement condition (each class doc accurately names its create/edit-in-place flows), not a docs-site restructuring task"
metrics:
  duration: ~20min
  completed: 2026-08-20
status: complete
actuals:
  tokens: 11972
  tasks: 2
  commits: 2
---

# Phase 69 Plan 05: Render filing-order rows 88-107 (first 20 `low` records) Summary

Rendered `69-BODIES-05.md`, holding 20 index rows and 20 delimited body blocks for
filing-order rows 88-107 — the first 20 of the 57 `low`-severity records in
`MAJOR-REFACTORS.md`, all routed `public issue`, all carrying the `PRIO 3` label, with the
one record whose `effort:` field carries a non-numeric rounding annotation correctly labelled
from `proposed_labels:` alone instead of that annotation.

## What Was Built

- `.planning/phases/69-github-issue-filing/69-BODIES-05.md` — a new intermediate render shard
  covering filing-order rows 88-107. Structure matches `69-BODIES-01.md`'s approved template and
  `69-BODIES-04.md`'s prior-shard shape exactly: `## Index rows 88-107` (a five-column table) and
  `## Bodies rows 88-107` (20 numbered sections, each with a `<!-- BODY-BEGIN id --> ... <!--
  BODY-END id -->` delimited region containing the fixed six-section body order).
- All 20 records route `public issue` — the band contains no `critical`/`high` D1-primary record,
  so the advisory route is never taken here.
- 5 D1-primary records (`P61-D1-009`, `P62-D1-002`, `P62-D1-007`, `P63-D1-002`, `P63-D1-008`) are
  filed exactly like every other record in this shard — same template, same label set, same
  numbered position, same `## Evidence` shape (surface/problem-class/impact only, no
  reproduction command or payload).
- `P63-D3-005` — the record this shard exists to prove — carries labels `intellij`, `PRIO 3`, `2`
  parsed from `proposed_labels:`; its `effort:` field's prose rounding annotation ("revised
  2026-08-18: recorded as 3 ... Rounded DOWN to the nearest legal value ... Original value
  retained here.") does not appear anywhere in the rendered body or index row.
- `P63-D8-004` — area=`documentation` — carries the `documentation` label (confirmed to exist in
  the repository's label set) and its `## Acceptance criteria` state a code-versus-docs agreement
  condition rather than a docs restructuring task.
- Confirmed all 20 `dedup:` values in this band read `none` — no `## Traceability` section in this
  shard claims a relationship to an existing tracker item.

## Task Order

Task 1 rendered rows 88-97 (10 records, first commit). Task 2 appended rows 98-107 (10 records,
second commit), completing the shard's 20 rows. Each task's own `<verify>` script was run against
the file's state at that point in the sequence and passed before committing.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues encountered.

### Observed discrepancy (documented, not corrected)

**Plan's stated D1-primary count for Task 1 vs. the corpus.** The plan's `<action>` text for Task 1
states "Five records in this band are D1-primary ... four of them in this task's ten." Extracting
all ten Task 1 records directly from `MAJOR-REFACTORS.md` and reading each `dimension:` field
shows all five band D1-primary records (`P61-D1-009`, `P62-D1-002`, `P62-D1-007`, `P63-D1-002`,
`P63-D1-008`) fall inside Task 1's ten, not four of them — none of Task 2's ten
(`P63-D2-005/006/009/014`, `P63-D3-005`, `P63-D4-002`, `P63-D8-004`, `P64-D2-002/006`,
`P64-D3-003`) carries `dimension: D1` as primary. This is a plan-text discrepancy against the
corpus, not a corpus re-triage — the record's own `dimension:` field is transcribed as written per
the corpus-is-closed rule, and the acceptance criterion ("No `## Evidence` section of the four
D1-primary records contains a command line, a payload, or an ordered step sequence") is satisfied
more strictly than required, since it holds for all five.

No auth gates encountered. No architectural changes needed.

## Verification

Ran both tasks' `<automated>` verify scripts against the file's state at the point each task
completed (10-record state after Task 1, 20-record state after Task 2). Both passed:

- 20 `BODY-BEGIN`/`BODY-END` marker pairs, 20 index rows, all routed `public issue`.
- Each of the six section headings appears exactly 20 times inside the delimited regions.
- Zero occurrences of `.planning/`, `MAJOR-REFACTORS`, `COVERAGE.md`, `INVENTORY.md`, an
  `RU-nn-nn` identifier, or a `§` pointer inside the concatenated delimited regions.
- All 20 target finding IDs present as `BODY-BEGIN` markers.
- `P63-D3-005`'s delimited region contains no fragment of the word "rounded" or the phrase
  "locked {2,4,8}" (case-insensitive).
- `git diff --quiet .planning/reviews/MAJOR-REFACTORS.md` exits 0 — the corpus was never touched.
- `git status --porcelain .planning/reviews/` is empty.

Additionally confirmed live against `gh label list`: `vscode`, `intellij`, `documentation`,
`BBj integration and infrastructure`, `PRIO 3` and `2` all exist byte-identical in the
repository's label set.

## Known Stubs

None. All 20 bodies are complete, self-contained renderings per the phase's fixed six-section
template — no placeholder text, no empty acceptance criteria, no unwired data.

## Threat Flags

None. This plan only reads `MAJOR-REFACTORS.md` and writes a new intermediate draft file under
`.planning/`; no tracker write, no new endpoint, no new trust boundary.

## Self-Check: PASSED

- FOUND: `.planning/phases/69-github-issue-filing/69-BODIES-05.md`
- FOUND: commit `662a3f9` (Task 1)
- FOUND: commit `9c1f0db` (Task 2)
