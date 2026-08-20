---
phase: 69-github-issue-filing
plan: 03
subsystem: docs
tags: [security-review, issue-drafting, major-refactors, lsp4ij, ci-cd, github-actions]

# Dependency graph
requires:
  - phase: 69-github-issue-filing (plan 01)
    provides: the ISSUE-01 approval frame (69-ISSUE-DRAFT.md), the route predicate, the label/title
      rules, the six-section body order, and the rendered 69-BODIES-01.md template shape
provides:
  - 69-BODIES-03.md — 24 index rows and 24 delimited public-issue bodies for filing-order rows 41-64
  - Both halves of the corpus's only supersedes pair (P63-D4-010 / P66-D4-001), each naming the
    other and stating the direction of the relationship
affects: [69-04, 69-05, 69-06, 69-07 (remaining render shards), 69-08 (assembly/approval gate)]

actuals:
  tokens: 18391
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Review-internal reference translation: RU-nn-nn / COVERAGE.md / § pointers inside a
      verbatim-lifted field are translated in place into plain outside-reader language rather than
      lifted with a bracketed gloss, matching the convention retroactively applied to 69-BODIES-01.md
      and already used by 69-BODIES-02.md."

key-files:
  created:
    - .planning/phases/69-github-issue-filing/69-BODIES-03.md
  modified: []

key-decisions:
  - "Applied the settled review-internal-reference convention (in-place plain-language translation,
    no bracketed gloss) to both RU-nn-nn occurrences (P64-D6-005) and a bare § pointer (P64-D3-002)
    that were not literally covered by the prior-wave note's RU-nn-nn-only wording, for shape
    consistency with 69-BODIES-01.md and 69-BODIES-02.md, both of which show zero occurrences of any
    review-internal marker."
  - "P63-D4-010's Proposed approach section is an unusual verbatim field — the source record's own
    prose states that P66-D4-001 supersedes it, rather than describing a fix. Lifted byte-identically
    per D-11 regardless of its unusual content; the Traceability section adds the required
    direction-stating sentence on top of it."
  - "P63-D4-010's Acceptance criteria intentionally does not commit to new test-authoring scope for
    the superseded finding; it points to the successor issue (P66-D4-001) as the place that scope is
    tracked, avoiding double-committing the same regression-test work to two open issues."

requirements-completed: []  # ISSUE-02/ISSUE-03 intentionally left Pending per plan's requirements_note — properties of filed issues, none filed yet

coverage:
  - id: D1
    description: "69-BODIES-03.md holds 24 index rows and 24 delimited body blocks for filing-order rows 41-64, all routed public issue"
    requirement: "ISSUE-02"
    verification:
      - kind: unit
        ref: "Task 1 <verify> automated block (12-row band, rows 41-52)"
        status: pass
      - kind: unit
        ref: "Task 2 <verify> automated block (24-row band, rows 41-64)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both halves of the supersedes pair (P63-D4-010 row 53, P66-D4-001 row 63) name each other and state the direction of the relationship"
    requirement: "ISSUE-02"
    verification:
      - kind: unit
        ref: "Task 2 <verify> automated block: awk region-scoped grep confirming each body's delimited region contains the other's finding ID"
        status: pass
    human_judgment: false
  - id: D3
    description: "P66-D4-001's three labels (intellij, PRIO 2, 4) are parsed from proposed_labels: only; no fragment of its prose effort: field appears as a label"
    requirement: "ISSUE-03"
    verification:
      - kind: unit
        ref: "Task 2 <verify> automated block: awk column-6 extraction of row 63's index row, grep for intellij; manual cross-check of all 24 label rows against gh label list output"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every body carries all five ISSUE-02 elements in fixed six-section order, with failure_scenario: and proposed_approach: lifted byte-identically (apart from the two records needing in-place review-internal-reference translation)"
    requirement: "ISSUE-02"
    verification:
      - kind: unit
        ref: "Task 1 and Task 2 <verify> automated blocks: per-section heading counts; a standalone Python byte-identity diff was additionally run against the raw MAJOR-REFACTORS.md records for all 24 findings' failure_scenario/proposed_approach fields"
        status: pass
    human_judgment: false
  - id: D5
    description: "The concatenated delimited regions of 69-BODIES-03.md contain zero pointers into .planning/, no review-corpus filename reference, no RU-nn-nn identifier and no § pointer"
    requirement: "ISSUE-02"
    verification:
      - kind: unit
        ref: "Task 1 and Task 2 <verify> automated blocks: region-scoped extended grep against the forbidden-pattern set"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-20
status: complete
---

# Phase 69 Plan 03: Render filing-order rows 41-64 into 69-BODIES-03.md Summary

**Rendered 24 public-issue draft bodies for filing-order rows 41-64, including both halves of the
corpus's only supersedes relationship (P63-D4-010 / P66-D4-001), so a triager reading either issue
can see the relationship without opening any review document.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-08-20T04:17:00Z (approx, session start)
- **Completed:** 2026-08-20T05:12:24Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (created)

## Accomplishments

- Created `69-BODIES-03.md` holding 24 index rows and 24 delimited body blocks (`BODY-BEGIN`/
  `BODY-END`) for filing-order rows 41-64, all routed `public issue` — the entire band is `medium`
  severity, so the route predicate resolves the same way for every record, verified rather than
  assumed.
- Rendered both halves of the corpus's only `supersedes` pair: row 53 (`P63-D4-010`)'s
  `## Traceability` states it is superseded by `P66-D4-001` and what remains true of it as its own
  standalone issue; row 63 (`P66-D4-001`)'s `## Traceability` states what it supersedes and what its
  live jar-measurement re-triage adds beyond the earlier record. Neither finding is dropped from the
  144-record denominator.
- Correctly parsed `P66-D4-001`'s three labels (`intellij`, `PRIO 2`, `4`) from `proposed_labels:`
  alone, ignoring the prose note carried inside its `effort:` field (D-09) — cross-checked against
  live `gh label list` output to confirm all label names exist in the repository.
- Verified byte-identity of every `## Failure scenario` and `## Proposed approach` section against
  the raw `MAJOR-REFACTORS.md` record fields with a standalone Python diff script, catching and
  fixing several backtick-dropping errors from the initial draft before committing.
- Applied the settled review-internal-reference convention (in-place plain-language translation, no
  bracketed gloss) to `P64-D3-002`'s `§"Recorded departures"` pointer and `P64-D6-005`'s two
  `RU-64-02` references — the only two records in this band needing it — keeping the concatenated
  delimited regions free of any `.planning/`, `COVERAGE.md`, `INVENTORY.md`, `RU-nn-nn`, or `§`
  reference.
- Left the `MAJOR-REFACTORS.md` corpus untouched throughout (`git diff --quiet` asserted after both
  tasks) and made no writes to the GitHub tracker.

## Task Commits

Each task was committed atomically:

1. **Task 1: Render filing-order rows 41-52 (12 records)** - `b6a7104` (docs)
2. **Task 2: Render filing-order rows 53-64, including both halves of the supersedes pair** - `b33ad25` (docs)

**Plan metadata:** commit pending (this SUMMARY.md + STATE.md + ROADMAP.md commit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Backticks dropped from several verbatim-lifted sections during initial drafting**
- **Found during:** Task 2, post-write byte-identity verification
- **Issue:** Four records (`P64-D1-001`, `P64-D1-005`, `P64-D2-003`, `P64-D6-003`) and both
  in-place-translation records (`P64-D3-002`, `P64-D6-005`) had backticks around inline code/paths
  silently stripped when the `## Failure scenario`/`## Proposed approach` text was first drafted,
  breaking the byte-identity requirement (D-11) even though no forbidden review-internal pattern was
  present.
- **Fix:** Ran a standalone Python script comparing every rendered `## Failure scenario`/
  `## Proposed approach` section against the raw source record fields extracted from
  `MAJOR-REFACTORS.md`, identified every mismatch, and re-edited each affected section to restore
  the exact source text (including all backticks), leaving only the two intentional
  review-internal-reference translations as the sole permitted departures from byte-identity.
- **Files modified:** `.planning/phases/69-github-issue-filing/69-BODIES-03.md`
- **Commit:** `b33ad25` (fixed before commit, not a separate commit)

Or: none beyond the above — the plan otherwise executed as written, task by task.

### Discrepancy carried into this shard (already flagged upstream)

`69-ISSUE-DRAFT.md`'s own `## Discrepancies` section flags that 16 records with
`area=BBj integration and infrastructure` (including four in this band: `P64-D1-001`, `P64-D1-005`,
`P64-D2-003`, `P64-D3-002`) get a 35-character title prefix under D-10's literal rule. This plan
rendered titles per that literal rule, per the upstream decision that the `69-08` gate is where any
change to the rule is made — not silently absorbed here.

## Self-Check: PASSED

- `.planning/phases/69-github-issue-filing/69-BODIES-03.md` — FOUND (1114 lines, 73563 bytes)
- Commit `b6a7104` — FOUND in `git log`
- Commit `b33ad25` — FOUND in `git log`
- All 24 `BODY-BEGIN`/`BODY-END` marker pairs present and matched
- Byte-identity of all 24 records' `## Failure scenario`/`## Proposed approach` verified against
  `MAJOR-REFACTORS.md` source fields (22 exact, 2 with the intentional in-place translation applied)
- `git diff --quiet .planning/reviews/MAJOR-REFACTORS.md` — confirmed clean after both tasks
