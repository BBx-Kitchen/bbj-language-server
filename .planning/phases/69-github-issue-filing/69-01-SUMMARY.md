---
phase: 69-github-issue-filing
plan: 01
subsystem: docs
tags: [github-issues, security-advisories, gh-cli, drafting, planning-doc]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "MAJOR-REFACTORS.md's 144 record blocks (id/location/dimension/severity/evidence/failure_scenario/proposed_approach/proposed_labels/issue: fields), the filing-order Index, and Phase 69's own cross-unit referrals for P64-D1-004 and P64-D6-008"
provides:
  - "The Phase 69 drafting contract, written down once in 69-ISSUE-DRAFT.md and demonstrated end-to-end on both routing paths"
  - "69-BODIES-01.md holding all 17 wave-1 filing-order entries (9 private draft advisories + 8 public issues), fully rendered index rows and delimited body blocks"
  - "The D-07 dedup baseline recorded in writing (15 frozen issues + 4 mid-milestone issues, zero matches against the 144-record corpus)"
affects: [69-02, 69-03, 69-04, 69-05, 69-06, 69-07, 69-08, 69-09]

# Actuals (#2632)
actuals:
  tokens: 21000
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Six-section fixed body order (Problem/Evidence/Failure scenario/Proposed approach/Acceptance criteria/Traceability), delimited by BODY-BEGIN/BODY-END markers, reused verbatim for the remaining 127 wave-2 records"
    - "Bracketed inline gloss appended immediately after a verbatim-lifted sentence containing a review-internal reference (RU-nn-nn, or a phase's own decision-ID synthesis reference), rather than paraphrasing the sentence itself"

key-files:
  created: []
  modified:
    - .planning/phases/69-github-issue-filing/69-BODIES-01.md

key-decisions:
  - "ISSUE-01..04 are NOT marked complete in REQUIREMENTS.md by this plan — this is plan 1 of 13 in the phase and only the draft exists; no tracker write, no approval, and no live dedup re-query against the whole tracker have happened yet. Marking them complete now would misstate phase state, contradicting the project's own established honesty pattern (Phase 66 D-02, Phase 67 D-07/D-14, Phase 68 D-08/D-11)."
  - "P66-D3-001's proposed_approach field describes a test-fixture unblocking precondition (extending createBBjTestServices with real classpath data) rather than the code fix for the scope-caching/pruning problem its own failure_scenario names. Transcribed verbatim per the corpus-is-closed rule (no re-triage); acceptance criteria authored to tie both the failure_scenario's fix condition and the proposed_approach's regression-fixture precondition together without inventing new scope or editorializing inside the delimited body region."

patterns-established:
  - "Acceptance criteria for the four intellij-route findings blocked on the missing bbj-intellij src/test/ source set state the gap in plain language rather than citing the internal finding ID (P63-D5-001) that names it, preserving D-11 self-containedness for an authored (non-verbatim) section."

requirements-completed: []

coverage: []

# Metrics
duration: ~20min
completed: 2026-08-19
status: complete
---

# Phase 69 Plan 01: Drafting Contract and Wave-1 Render Summary

**Phase 69's drafting contract (six-section body template, route predicate, label/title derivation) proven on two exemplar records and then applied to render all 17 wave-1 filing-order entries — 9 private draft security advisories and 8 public issues — with zero tracker writes.**

## Performance

- **Duration:** ~20 min (plan-level, spanning both tasks)
- **Started:** 2026-08-19T20:41:28Z
- **Completed:** 2026-08-19T21:00:56Z
- **Tasks:** 2 completed (2/2)
- **Files modified:** 2 (`69-ISSUE-DRAFT.md` created by Task 1; `69-BODIES-01.md` created by Task 1, extended by Task 2)

## Accomplishments

- `69-ISSUE-DRAFT.md`'s full frame (`## Derivation`, `## Reconciliation`, `## Routing decisions`,
  `## Discrepancies`, `## Dedup baseline`, `## D1 security surface`, `## Index`, `## Bodies`) written
  once and demonstrated on the advisory route (`P62-D1-003`) and the public route (`P64-D6-007`).
- The tracer feedback gate: user reviewed and approved the drafting contract and the two exemplar
  bodies before rendering continued to the remaining fifteen records.
- All 17 wave-1 filing-order entries rendered into `69-BODIES-01.md` — 9 private draft advisory
  routes and 8 public issue routes — with index rows, titles, labels, and full six-section
  delimited body blocks in filing order (rows 1-17).
- The two records carrying phase-addressed instructions honored under their own limits:
  `P64-D1-004`'s `## Evidence` states surface/problem class/impact only, with no reconstruction from
  `64-COVERAGE.md`'s workflow-security cells; `P64-D6-008`'s body states the `brace-expansion`
  reachability question as open rather than asserting an answer.
- Three review-internal references glossed at the point they appear in verbatim-lifted text
  (`RU-62-01` in `P64-D6-008`, `RU-63-03` in `P63-D1-007`, `RU-64-03`/`SEC-04`/`SEC-05` in
  `P64-D1-002`), keeping the delimited body regions self-contained per D-11 while lifting the source
  sentences byte-for-byte.

## Task Commits

Each task was committed atomically:

1. **Task 1: The drafting contract, proven end-to-end on both routes** - `2ab92b9` (docs) — completed
   by the prior executor agent, verified present on resume; not re-executed or amended.
2. **Task 2: Render the remaining 15 wave-1 records (filing-order rows 2, 4-17)** - `d7f21f8` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `.planning/phases/69-github-issue-filing/69-ISSUE-DRAFT.md` - the ISSUE-01 approval artifact's
  frame (created by Task 1; untouched by Task 2)
- `.planning/phases/69-github-issue-filing/69-BODIES-01.md` - all 17 wave-1 filing-order index rows
  and delimited body blocks (Task 1 rendered rows 1 and 3; Task 2 rendered rows 2, 4-17)

## Decisions Made

- ISSUE-01..04 left `Pending` in REQUIREMENTS.md (see `key-decisions` above) — the draft is not the
  approval, and this plan writes no tracker entry.
- `P66-D3-001`'s acceptance criteria authored to restate both its failure_scenario's fix condition
  (per-file caching + external-document pruning) and its proposed_approach's own regression-fixture
  precondition (a repo-local Java classpath test fixture), rather than treating the mismatch between
  the two source fields as something to silently paper over or editorialize about inside the body.
- Acceptance criteria for the intellij-route findings that depend on the missing `bbj-intellij`
  `src/test/` source set describe the gap in plain language instead of citing its finding ID
  (`P63-D5-001`) directly, since a bare unexplained finding ID inside an authored section would
  violate D-11 self-containedness for a reader with no access to `MAJOR-REFACTORS.md`.

## Deviations from Plan

None - plan executed exactly as written for Task 2. Task 1's deviations (if any) were recorded in
the prior executor's work and are not re-litigated here since that commit is untouched.

## Issues Encountered

None. The route predicate applied to all 15 records matched the plan's stated 8-advisory/7-public
split exactly (verified by checking `dimension:`/`severity:` per record rather than trusting the
list), and the filing-order Index (`MAJOR-REFACTORS.md` lines 107-125) matched the plan's stated row
numbers exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `69-BODIES-01.md` holds all 17 wave-1 entries; plan `69-02` (or whichever plan renders the next
  band) can extend it or move to the next shard using `69-ISSUE-DRAFT.md`'s `## Derivation` and the
  17 rendered exemplars as its contract, per the plan's own success criterion.
- No tracker write has occurred (`gh issue list --state all --limit 1000 --json number --jq 'length'`
  returns 268 both before and after this plan's work); `git diff --quiet .planning/reviews/MAJOR-REFACTORS.md`
  still exits 0.
- ISSUE-01..05 remain `Pending` in REQUIREMENTS.md, correctly reflecting that only the draft — not
  the approval, the filing, or the write-back — has happened so far.

---
*Phase: 69-github-issue-filing*
*Completed: 2026-08-19*
