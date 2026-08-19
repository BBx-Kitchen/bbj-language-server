---
phase: 69-github-issue-filing
plan: 02
subsystem: docs
tags: [github-issues, security-triage, drafting, corpus-rendering]

# Dependency graph
requires:
  - phase: 69-github-issue-filing plan 01
    provides: "The drafting contract (69-ISSUE-DRAFT.md) and the approved rendering template (69-BODIES-01.md)"
provides:
  - "69-BODIES-02.md: 23 index rows and 23 delimited body blocks for filing-order rows 18-40, all routed public issue"
affects: [69-08-approval-gate, 69-10-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 15942
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: ["Single-record awk extraction from MAJOR-REFACTORS.md", "Six-section delimited body block rendering", "Verbatim-lift with byte-identity cross-check via python3 diff"]

key-files:
  created:
    - .planning/phases/69-github-issue-filing/69-BODIES-02.md
  modified: []

key-decisions:
  - "P61-D1-004's failure_scenario, which literally contains the RU-61-06 review-internal reference twice, was translated in place to outside-reader terms rather than left verbatim-plus-appended-gloss, because this plan's own automated verify requires zero RU-nn-nn occurrences across the whole delimited region — a stricter self-containedness gate than wave-1's (see Deviations)."
  - "P61-D1-007 (dedup #485 partial-overlap) and P61-D5-003 (dedup DEBT-02, an internal debt item) both filed with their Traceability sections stating what the finding adds, per D-08 — neither skipped."

patterns-established: []

# ISSUE-02/03 describe FILED issues (tracker self-containedness / labels); this plan only drafts
# 23 of 144 records (rows 18-40, plan 2 of 7 rendering plans). Following 69-01's own precedent
# ("ISSUE-01..04 left Pending — only the draft exists after plan 1 of 13; marking complete would
# misstate phase state"), these are NOT marked complete in REQUIREMENTS.md despite being carried
# in this plan's frontmatter `requirements:` field. They will be marked complete once the full
# corpus is drafted, approved, and filed.
requirements-completed: []

coverage:
  - id: D1
    description: "69-BODIES-02.md holds 23 index rows and 23 delimited body blocks for filing-order rows 18-40, all routed public issue, matching the wave-1 template shape verbatim"
    requirement: "ISSUE-02"
    verification:
      - kind: other
        ref: "shell verify block in 69-02-PLAN.md Task 1 and Task 2 (grep/awk counts over 69-BODIES-02.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every body's failure_scenario and proposed_approach are byte-identical to their source MAJOR-REFACTORS.md fields (verified programmatically), apart from the one documented P61-D1-004 exception"
    requirement: "ISSUE-02"
    verification:
      - kind: other
        ref: "python3 byte-identity diff script run against all 23 records (21 exact matches + P61-D1-004 documented exception + P61-D1-004 itself checked separately)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every entry's three labels are parsed from proposed_labels: alone and match gh label list output"
    requirement: "ISSUE-03"
    verification:
      - kind: other
        ref: "python3 label-validation script cross-checking all 23 **Labels:** lines against `gh label list --json name`"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-19
status: complete
---

# Phase 69 Plan 02: Filing-Order Rows 18-40 Summary

**Rendered 23 medium-severity, public-route GitHub issue bodies (filing-order rows 18-40) into `69-BODIES-02.md`, matching the wave-1-approved template shape verbatim.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-19T21:05:00Z (approx)
- **Completed:** 2026-08-19T21:40:00Z (approx)
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Rendered filing-order rows 18-29 (12 records) into a new `69-BODIES-02.md`, establishing the shard's index table and body-block structure
- Rendered filing-order rows 30-40 (11 records), completing all 23 rows of the band
- Preserved byte-identical verbatim lifts of `failure_scenario:`/`proposed_approach:` for 22 of 23 records, verified programmatically against the extracted source fields
- Carried both dedup annotations in this band into their bodies per D-08: `P61-D1-007` (partial overlap with open issue #485) and `P61-D5-003` (relationship to an internal test-assertion re-triage effort, described without exposing the `DEBT-02` identifier as a lookup key)
- Left the review corpus (`MAJOR-REFACTORS.md`) untouched throughout (`git diff --quiet` verified after every task)

## Task Commits

Each task was committed atomically:

1. **Task 1: Render filing-order rows 18-29 (12 records)** - `5a4b577` (docs)
2. **Task 2: Render filing-order rows 30-40 (11 records)** - `62e0fe0` (docs)

**Plan metadata:** (pending — see final commit below)

## Files Created/Modified
- `.planning/phases/69-github-issue-filing/69-BODIES-02.md` - 23 index rows + 23 delimited body blocks (`BODY-BEGIN`/`BODY-END`) for filing-order rows 18-40, all routed `public issue`

## Decisions Made
- **P61-D1-004's review-internal reference translated in place, not appended-after.** See Deviations below — this is the one place this plan's rendering diverges from wave-1's simple "lift verbatim, append bracket" pattern, because this plan's own `<verify>` script (unlike wave-1's) asserts zero `RU-nn-nn` occurrences across the *entire* delimited region, and a trailing bracket still containing the literal token `RU-61-06` would trip that same check.
- **P61-D5-003's Traceability describes the related internal re-triage work without using `DEBT-02` as a lookup key**, per the task's own explicit instruction — while its verbatim-lifted `## Proposed approach` section (required byte-identical under D-11) does still contain the literal string `DEBT-02`, since that instruction was scoped to the Traceability section only and the automated verify script does not check for it there.
- **ISSUE-02/ISSUE-03 left Pending in REQUIREMENTS.md**, matching 69-01's own precedent. Both requirements describe properties of *filed* tracker issues ("each filed issue is self-contained," "each filed issue carries... labels"); this plan only drafts 23 of 144 records (rows 18-40, plan 2 of 7 rendering plans), with no tracker write occurring anywhere before `69-08`'s approval gate. The `gsd-tools requirements mark-complete` command was run once with `ISSUE-02 ISSUE-03` (matching this plan's frontmatter `requirements:` field) as directed by the standard workflow, found it would flip both to Complete on the strength of a partial draft, and the change was reverted (`git checkout -- .planning/REQUIREMENTS.md`) before committing, exactly as 69-01 reasoned for ISSUE-01..04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / internal spec contradiction] P61-D1-004's failure_scenario cannot simultaneously satisfy "lift verbatim, do not delete the reference" and "zero RU-nn-nn occurrences in the delimited region"**
- **Found during:** Task 2, while rendering `P61-D1-004`
- **Issue:** The plan's phase-wide convention (69-01-PLAN.md §phase_conventions, D-11) says a review-internal reference inside a verbatim-lifted sentence is "still lifted verbatim" with a bracketed gloss "appended immediately after it," and explicitly warns "deleting the reference and leaving it dangling are both wrong." But `P61-D1-004`'s source `failure_scenario:` field literally contains the token `RU-61-06` twice, and this plan's own Task 2 `<verify><automated>` block (unlike wave-1's, which had no such check) asserts `grep -Ec '...|RU-[0-9][0-9]-[0-9][0-9]|§'` returns zero across the whole delimited region — a check that a trailing `[RU-61-06 is the ...]`-style gloss would *also* trip, since the gloss itself would still contain the literal substring. These two requirements cannot both be satisfied literally for this one record.
- **Fix:** Resolved in favor of the machine-verified, security-relevant constraint (self-containment / no internal-corpus-identifier leak into a public tracker body, which is exactly what threat T-69-13 exists to mitigate). Replaced both inline occurrences of `RU-61-06` with the plain-language description "the java-interop peer-response handling unit," and closed with a bracketed gloss naming the real file (`bbj-vscode/src/language/java-interop.ts`) with no `RU-`-prefixed token anywhere in the body. Meaning and every other clause of the sentence preserved unchanged. Documented here as a deviation rather than silently resolved, per the acceptance criteria's own permissive wording ("glossed away **or replaced by outside-reader terms**").
- **Files modified:** `.planning/phases/69-github-issue-filing/69-BODIES-02.md`
- **Verification:** Re-ran Task 2's full automated verify block after the fix — all checks pass, including the zero-`RU-nn-nn` gate; confirmed all other 22 records' `failure_scenario`/`proposed_approach` remain byte-identical to source via a python3 diff script.
- **Committed in:** `62e0fe0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (internal plan-spec contradiction, resolved toward the stricter automated gate)
**Impact on plan:** Necessary to make Task 2's own `<verify>` block pass at all for this record. No scope creep — the fix is confined to two clauses of one record's `## Failure scenario` section; every other record's verbatim lift is untouched and independently verified byte-identical.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`69-BODIES-02.md` holds all 23 rows of filing-order rows 18-40, structurally identical to the
wave-1-approved `69-BODIES-01.md` (six-section body order, delimited `BODY-BEGIN`/`BODY-END`
markers, index table shape). No tracker write occurred — `.planning/reviews/MAJOR-REFACTORS.md`
remains untouched. Ready for plan `69-08`'s concatenation into `69-ISSUE-DRAFT.md`'s `## Bodies`
section without further modification.

---
*Phase: 69-github-issue-filing*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: .planning/phases/69-github-issue-filing/69-BODIES-02.md
- FOUND: .planning/phases/69-github-issue-filing/69-02-SUMMARY.md
- FOUND commit: 5a4b577
- FOUND commit: 62e0fe0
