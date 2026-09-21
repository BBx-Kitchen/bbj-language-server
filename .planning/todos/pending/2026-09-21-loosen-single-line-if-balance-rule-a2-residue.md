---
created: 2026-09-21
title: Loosen single-line IF balance rule for the 5 re-flagged valid files (A2 27 → ≤ 25)
area: line-break-validation
severity: minor
files:

  - bbj-vscode/src/language/validations/line-break-validation.ts (elseStatementLineBreaks, ifEndStatementLineBreaks)

audit_acknowledged:
  milestone: v4.5
  at: 2026-09-21
---

## Problem

Phase 98's closing conformance re-run (`.planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md`
section 10) measured A2 = 27, two over the roadmap's ≤25 gate, up 5 from the phase boundary's 22.
The +5 are two message groups:

- "This statement needs to start in a new line: " (blank message) — 4 files
- "This statement needs to start in a new line: else" — 1 file

Both reappeared after plan 08's commit `8ba30038` changed `elseStatementLineBreaks` and
`ifEndStatementLineBreaks` (`bbj-vscode/src/language/validations/line-break-validation.ts`) from an
unconditional backward walk past any same-line ELSE/end-of-IF closer to a counter that only steps
past a closer when a matching, still-open IF remains further back. That change was necessary — it
restored detection of a genuinely misplaced ELSE/FI with no open IF left on the line, which the
unconditional walk had started silently accepting (a real false-negative regression). But its
side effect is that these 5 files, which the compiler accepts, are single-line `IF ... FI` /
`IF ... ELSE` shapes the counter now mis-measures as having no open IF left, even though the
governing IF is still there.

This is the same "A2" false-alarm class Phase 98 exists to remove — valid code producing a
line-break error the compiler would never report.

## Decision

Accepted as carried-forward residue for Phase 98's close (`.planning/phases/98-line-break-validation-false-alarms-a2/98-VERIFICATION.md`
`overrides:` block, accepted by Stephan Wald, 2026-09-21) — not treated as correct behavior. Phase 98
did not narrow or widen the counter further to avoid reopening the false-negative the counter was
built to close, per this phase's own prohibition against engineering a check to move a number without
enough investigation to be confident of the fix.

## What's needed

Identify the specific single-line shape (or shapes) the counter still mis-measures — likely an
edge case in how it counts open IFs versus stepped-over closers within a same-line chain — and adjust
the bookkeeping so these 5 files stop being flagged without reintroducing the false-negative plan 08
closed (a non-nested ELSE/FI closing an already-closed IF must stay flagged). Re-run the private
conformance harness afterward and confirm A2 returns to at or below 25 with no regression in B.

## Not fixed here

No corpus file name, path, or source line may be used to investigate or describe this — synthetic
regression fixtures under `bbj-vscode/test/test-data/conformance/` are the sanctioned way to
reproduce and test the shape once identified.

## Concrete repro (from the post-gap-closure code review, 2026-09-21)

`if a then if b then c=1 else d=1 fi else e=1 fi` — legal nested one-liner — is flagged with
"This statement needs to start in a new line: else". Mechanism per 98-REVIEW.md (WR-A):
`elseStatementLineBreaks` counts a same-line `ElseStatement` as an independent closer claim,
while `ifEndStatementLineBreaks` treats it as consuming; a complete inner `IF…ELSE…FI` group is
therefore double-counted against the outer ELSE. Start the fix from this input (add it as a
"stays clean" case), keep the three "still flagged" regressions, then re-measure A2.
