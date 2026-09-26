---
phase: 107-validation-false-alarms-silent-skips
plan: 01
subsystem: validation
tags: [langium, line-break-validation, single-line-if, false-positive]

requires: []
provides:
  - "A repaired elseStatementLineBreaks walker that stops flagging a nested single-line IF/ELSE/FI group's outer ELSE"
  - "A D-02 regression matrix pinning both the clean shapes and the still-flagged shapes"
  - "New clean conformance fixtures for the nested-ELSE and colon-continued single-line IF forms"
affects: [107-04, 107-06]

actuals:
  tokens: 12000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two independent local counters (openIfs, elseClaims) inside one backward walk, instead of a shared stack, to keep an inner group's ELSE from double-spending an outer IF's claim"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj

key-decisions:
  - "Used a second local counter (elseClaims) rather than the 98-REVIEW.md WR-A one-line snippet (moving isElseStatement into the decrement branch): a throwaway probe against this tree showed the WR-A snippet un-flags 'a second ELSE for one IF is still flagged', which must stay flagged. The two-counter approach passed every existing suite and the full D-02 matrix."
  - "The colon-continuation blank-message residue (D-03) needed no separate investigation or fix: a before/after probe showed the same Task 1 counter repair also clears it, because the lexer joins colon-continued lines into one physical line before the walker ever runs, making the continued form structurally identical to the plain nested one-liner."

patterns-established:
  - "openIfs/elseClaims two-counter bookkeeping in elseStatementLineBreaks, kept structurally distinct from ifEndStatementLineBreaks per D-01 (no shared stack-walk helper)"

requirements-completed: [VAL-01]

coverage:
  - id: D1
    description: "Nested single-line IF/ELSE/FI groups no longer draw a false 'needs a new line' diagnostic on the outer ELSE, including the colon-continued form"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#a nested single-line IF/ELSE/FI followed on the same line by the outer ELSE produces no line-break diagnostics"
        status: pass
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#the nested one-liner continued over colon-prefixed lines produces no line-break diagnostics"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every existing 'still flagged' regression stays flagged, plus a new extra-ELSE-after-a-complete-group case"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/line-break-walk-termination.test.ts#a second ELSE for one IF is still flagged"
        status: pass
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#an extra ELSE after a complete nested IF/ELSE/FI group is still flagged"
        status: pass
    human_judgment: false
  - id: D3
    description: "Message text unchanged, no fallback text for an empty CST range, and the end-of-IF walker byte-identical"
    requirement: "VAL-01"
    verification:
      - kind: other
        ref: "grep -c \"This statement needs to start in a new line\" line-break-validation.ts == 2; diff of ifEndStatementLineBreaks against HEAD == empty"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-24
status: complete
---

# Phase 107 Plan 01: Nested single-line IF/ELSE/FI false alarm Summary

**Two-counter repair in `elseStatementLineBreaks` stops the false "needs a new line" diagnostic on a nested single-line IF/ELSE/FI group's outer ELSE, while every existing false-negative guard and the colon-continued blank-message residue both clear under the same fix.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-24T20:09:00Z (approx)
- **Completed:** 2026-09-24T20:21:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Repaired `elseStatementLineBreaks` with a second local counter (`elseClaims`) so a same-line ELSE claims an outer IF only when no end-of-IF is pending — the exact WR-A defect mechanism, fixed without the naive one-line snippet that would have reopened a false negative
- Built the full D-02 regression matrix: three-level nesting, ELSE-only nesting with no inner end-of-IF, semicolon-chained branches before an end-of-IF/ELSE, a labelled nested one-liner, the same one-liner continued over colon-prefixed lines, keyword-as-identifier probes, and a new "extra ELSE after a complete nested group" still-flagged case
- Extended `single-line-if-forms.bbj` with matching clean fixtures in upper/lower/mixed case, including a colon-continued form, protecting the fix against regression in the private conformance harness
- Confirmed via a before/after probe (run against the pre-fix tree, then deleted) that exactly four shapes flip from flagged to clean and nothing else changes — including the colon-continuation blank-message A2 residue, which turned out to share Task 1's root cause rather than needing a separate D-03 investigation

## Task Commits

Each task was committed atomically:

1. **Task 1: The nested one-liner with an inner ELSE stays clean, end to end** - `dddfba78` (fix)
2. **Task 2: The regression matrix, the continued form and the clean fixtures** - `30500588` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/validations/line-break-validation.ts` - `elseStatementLineBreaks` now tracks `openIfs` and `elseClaims` separately; balance-rule comment rewritten in plain words
- `bbj-vscode/test/line-break-single-line-if.test.ts` - D-02 matrix of clean and still-flagged cases
- `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` - new clean fixtures, counts 13-39, upper/lower/mixed case including a colon-continued form

## Decisions Made
- Used the plan's specified two-counter bookkeeping instead of the 98-REVIEW.md WR-A snippet, because a planning-time probe (recorded in the plan's own assumptions) showed the WR-A snippet un-flags the "second ELSE for one IF" regression. This was not a deviation — the plan's `<action>` for Task 1 specified this exact bookkeeping.
- Treated the colon-continuation blank-message residue as resolved by the same fix rather than opening a separate D-03 investigation, based on the probe evidence recorded below.

## Deviations from Plan

None - plan executed exactly as written. The plan's Task 1 action fully specified the counter bookkeeping (no deviation was needed to arrive at a passing implementation), and Task 2's before/after probe confirmed the predicted four-shape diff with no residue requiring further investigation.

## Probe Evidence (before/after, synthetic inputs only, run and deleted)

Probe run against the Task-1-fixed tree (`/tmp/phase-107-01-probe-after.txt`) and against the commit immediately before Task 1's commit (`/tmp/phase-107-01-probe-before.txt`), restored afterward via `git checkout HEAD --`. Per input:

| Input (synthetic label) | Before | After |
|---|---|---|
| deeper nesting (3-level) | flagged (`else`) | clean |
| else-only nesting | clean | clean |
| semicolon-chained simple | clean | clean |
| semicolon-chained with else | clean | clean |
| semicolon-chained nested | flagged (`else`) | clean |
| labelled nested one-liner | flagged (`else`) | clean |
| continued form (colon-prefixed lines) | flagged (blank message: `"This statement needs to start in a new line: "`) | clean |
| keyword-as-identifier | clean | clean |
| extra else after complete nested group | flagged (2x `else`) | flagged (1x `else`) — still flagged, message shape allowed to differ |
| second else for one if (flat) | flagged (`else`) | flagged (`else`) — unaffected control |
| else after if/fi closed, then unrelated else | flagged (`else`) | flagged (`else`) — unaffected control |
| double fi with no second open if | flagged (`fi`) | flagged (`fi`) — unaffected control |
| label then bare fi | flagged (`fi`) | flagged (`fi`) — unaffected control |
| two statements no semicolon | flagged (2 messages) | flagged (2 messages) — unaffected control |

Exactly four inputs changed from flagged to clean (deeper nesting, semicolon-chained nested, labelled nested one-liner, continued form), matching the plan's own prediction. The continued form's blank-message shape confirms the colon-continuation A2 residue shares Task 1's root cause: the lexer's `prepareLineSplitter` joins colon-continued physical lines into one line before `checkLineBreaks` ever runs, so the joined nested-one-liner-with-ELSE is exactly the Task 1 shape.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAL-01's line-break fix is in place and fully regression-tested at the unit level; the private conformance harness re-measurement (A2 gate, D-13) is 107-04's job, not this plan's.
- 107-04 and 107-06 also declare VAL-01 in their frontmatter; per the shared-ID gate, VAL-01 is not marked complete in REQUIREMENTS.md until all three plans have a SUMMARY.
- No blockers for 107-02 (VAL-02) or 107-03/107-05 (VAL-03), which are independent of this plan's files.

## Self-Check: PASSED

All modified files verified present on disk; all three commit hashes (`dddfba78`, `30500588`, `f2b82de8`) verified in git log.

---
*Phase: 107-validation-false-alarms-silent-skips*
*Completed: 2026-09-24*
