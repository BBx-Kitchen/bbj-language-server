---
phase: 98-line-break-validation-false-alarms-a2
plan: 08
subsystem: validation
tags: [langium, validation, line-break, declare, scalar-types]

# Dependency graph
requires:
  - phase: 98-line-break-validation-false-alarms-a2 (plan 04, plan 06)
    provides: the same-line closer-stepping fix in elseStatementLineBreaks/ifEndStatementLineBreaks, and the resolution-based conflicting-DECLARE narrowing in checkConflictingDeclares
provides:
  - Balance-counted backward walks in elseStatementLineBreaks and ifEndStatementLineBreaks that re-detect a misplaced ELSE or a trailing end-of-IF with no open IF left on the line, without re-flagging any nested single-line IF/FI/ELSE chain
  - A module-level exported KNOWN_BBJ_SCALAR_TYPES constant in check-classes.ts, reused by checkConflictingDeclares to detect a BBj scalar-vs-scalar DECLARE conflict without needing a live Java classpath
affects: [98-09, 98-10]

# Actuals (#2632)
actuals:
  tokens: 9700
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local per-invocation counter inside a mask closure to distinguish 'closer already spent on an inner IF' from 'closer governs this node', without changing the loop's advance step or termination guard"
    - "Promote a private validator constant to a module-level export when a sibling check needs the same list, instead of typing a second copy"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/line-break-walk-termination.test.ts
    - bbj-vscode/src/language/validations/check-classes.ts
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
    - bbj-vscode/test/variable-scoping.test.ts

key-decisions:
  - "elseStatementLineBreaks and ifEndStatementLineBreaks each get their own local openIfs counter, incremented by a closer and decremented (not stopped at) when an IF is found while positive, so a nested chain still resolves to its true governing IF"
  - "ELSE does not increment ifEndStatementLineBreaks's counter -- an ELSE still belongs to an open IF, so it is a valid thing for an end-of-IF to close directly"
  - "The scalar-vs-scalar DECLARE short circuit is placed before the class-resolution guard and requires BOTH sides to be a known BBj scalar type name -- a mixed scalar/unresolvable pair still falls through unchanged to bbjTypesAreRelated"

patterns-established:
  - "Backward-walk balance bookkeeping: a local integer counts unclaimed closers stepped over; the counter changes which branch of the loop body fires, never the loop's condition or advance step, keeping termination proofs from earlier plans intact"

requirements-completed: [VALID-04, VALID-05]

coverage:
  - id: D1
    description: "An ELSE that follows an already-closed single-line IF on the same line, a trailing end-of-IF with no open IF left, and a second ELSE for one IF are all reported again"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-walk-termination.test.ts#a closer with no open IF left on the line is still flagged"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every single-line IF/FI/ELSE form the compiler accepts, including nested chains this phase fixed, still produces zero line-break diagnostics"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-single-line-if.test.ts"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/line-break-walk-termination.test.ts"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/line-break-validation.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both backward walks still terminate on every input in the termination and timeout suites"
    requirement: VALID-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-walk-timeout.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "A conflicting DECLARE of two different BBj scalar types is reported again with no Java classpath loaded, at warning severity at program scope and error severity in a method body"
    requirement: VALID-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE of two different BBj scalar types at program scope produces a warning, not an error"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation > Conflicting DECLARE of two different BBj scalar types inside a method body produces an error"
        status: pass
    human_judgment: false
  - id: D5
    description: "A same-scalar-type pair and a mixed scalar/unresolvable pair stay silent, and every other existing SCOPE-05 case keeps its verdict"
    requirement: VALID-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/variable-scoping.test.ts#SCOPE-05: DECLARE type propagation"
        status: pass
    human_judgment: false

duration: 19min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 08: Balance-counted backward walks and scalar-vs-scalar DECLARE conflict Summary

**Restores two true positives this phase's earlier narrowings silently dropped: a misplaced ELSE/FI on a single-line chain, and a BBj scalar-type DECLARE conflict with no Java classpath loaded — both via a local counter, no traversal change.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-21T05:34:30Z
- **Completed:** 2026-09-21T05:53:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `elseStatementLineBreaks` and `ifEndStatementLineBreaks` in `line-break-validation.ts` now carry a local `openIfs` counter: a same-line closer stepped over increments it, and an IF found while it is positive is spent on that closer (decrement, keep walking) rather than accepted as this node's own governing IF. This re-flags a non-nested ELSE/FI whose only IF was already consumed, while every nested single-line IF/FI/ELSE chain the phase already fixed stays silent.
- Three new still-flagged regression cases and three explicit nested positive controls added to `line-break-walk-termination.test.ts`, run standalone as red before the fix and green after.
- `check-classes.ts`'s private `KNOWN_BBJ_SCALAR_TYPES` set promoted to a module-level export, reused (not duplicated) by `checkConflictingDeclares` in `check-variable-scoping.ts` to short-circuit a scalar-vs-scalar DECLARE conflict before the class-resolution guard — restoring detection with `EmptyFileSystem` and no live Java classpath, at the same scope-based severity the resolution-based rule already used.
- Four new DECLARE cases added to the existing `SCOPE-05: DECLARE type propagation` describe block in `variable-scoping.test.ts`, asserting severity explicitly (not just "some diagnostic").

## Task Commits

Each task was committed atomically (task 1 and task 3 are `tdd="true"`, each RED then GREEN):

1. **Task 1 RED: failing still-flagged tests** - `6aed9399` (test)
2. **Task 2: balance counter in both walks** - `8ba30038` (feat)
3. **Task 3 RED: failing scalar-vs-scalar DECLARE tests** - `0627cdd2` (test)
4. **Task 3 GREEN: scalar short circuit** - `5bfa5ddf` (feat)

**Plan metadata:** committed separately after this summary.

## Files Created/Modified
- `bbj-vscode/src/language/validations/line-break-validation.ts` - balance-counted `elseStatementLineBreaks` / `ifEndStatementLineBreaks`
- `bbj-vscode/test/line-break-walk-termination.test.ts` - three still-flagged regression cases + three nested positive controls
- `bbj-vscode/src/language/validations/check-classes.ts` - `KNOWN_BBJ_SCALAR_TYPES` promoted to a module-level export
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` - scalar-vs-scalar short circuit in `checkConflictingDeclares`
- `bbj-vscode/test/variable-scoping.test.ts` - four new SCOPE-05 DECLARE cases

## The balance rule, exactly as implemented

Both walks share the same shape: a local `openIfs` counter starts at 0 and only ever changes inside the same-line backward loop; the loop's condition (`isSingleStatement(prev) && isSameLine(prev, node)`) and its advance step (`prev = previousStatement(prev)`) are untouched from before this plan, so every termination proof from earlier plans still holds.

- **`elseStatementLineBreaks`** (governs an ELSE): a same-line end-of-IF statement OR another ELSE increments `openIfs` — a prior closer or ELSE already spent one open IF, and an ELSE cannot own two ELSE clauses any more than an IF can own two closers. An IF found while `openIfs > 0` is decremented and walked past (it belongs to a closer already stepped over); an IF found at `openIfs === 0` governs this ELSE and clears the diagnostic.
- **`ifEndStatementLineBreaks`** (governs an end-of-IF / FI): only a same-line end-of-IF increments `openIfs`. An ELSE does **not** increment here — an ELSE still belongs to an IF that is open, so it is a valid thing for an end-of-IF to close directly, exactly as before this plan. An IF or ELSE found while `openIfs > 0` is decremented and walked past; found at `openIfs === 0` it governs this end-of-IF.

The two walks differ only in which node kind bumps the counter (ELSE counts as a closer for the ELSE walk but not for the end-of-IF walk), because an ELSE always needs its own IF but never needs its own end-of-IF.

## Before/after verdict, every input in this plan's observed_behaviour block

| Input | Before | After |
|---|---|---|
| `if a=1 then b=1 fi else c=1` | no line-break diagnostics | ELSE flagged: "start in a new line: else" |
| `if a=1 then b=1 fi fi` | no line-break diagnostics | trailing FI flagged: "start in a new line: fi" |
| `if a then b=1 else c=1 else d=1` | no line-break diagnostics | second ELSE flagged: "start in a new line: else" |
| `if a then if b then c = 1 fi else d = 1 fi` | clean | clean (unchanged) |
| `if a then if b then c = 1 fi fi` | clean | clean (unchanged) |
| `if a then b=1 else c=1 fi` | clean | clean (unchanged) |
| `if x then a = 1 fi if y then b = 2 fi` | clean | clean (unchanged) |
| `if x then a = 1; b = 2 else b = 3` | clean | clean (unchanged) |
| `if x then a = 1; b = 2 fi` | clean | clean (unchanged) |
| `if x then a = 1 fi; if y then b = 2 fi` | clean | clean (unchanged) |
| `a = 1; b = 2 else c = 3` | flagged | flagged (unchanged) |
| `a = 1; b = 2 fi` | flagged | flagged (unchanged) |
| `mylabel: fi` | flagged | flagged (unchanged) |
| five-line `if x then` / `a = 1` / `fi if y then` / `b = 2` / `fi` | exactly the two documented messages | exactly the same two messages (unchanged) |
| `DECLARE BBjNumber x!` / `DECLARE BBjString x!` (program scope, no classpath) | unresolved-reference linking diagnostics only, no conflicting-DECLARE diagnostic | warning-severity conflicting-DECLARE diagnostic, no error-severity one |
| same pair, inside a method body | no conflicting-DECLARE diagnostic | error-severity conflicting-DECLARE diagnostic |
| `DECLARE BBjNumber x!` / `DECLARE BBjNumber x!` (same scalar) | silent | silent (unchanged) |
| `DECLARE BBjNumber x!` / `DECLARE NoSuchClass x!` (mixed) | silent | silent (unchanged) |

## A2 watch item for the phase's final gap plan

A scalar-vs-scalar DECLARE mismatch inside a method body is now an **error**-severity diagnostic where it previously produced nothing at all (the resolution-based rule required both sides to resolve to a class, which never happens for a bare scalar name with no classpath). This could in principle add hits to the phase's A2 conformance measurement if the corpus contains this shape inside a method body. The pre-authorised narrowing, per this plan's action block, is to emit the scalar branch as a **warning** in both scopes if the closing conformance run shows a new conflicting-DECLARE error group — do not remove the branch, downgrade its severity instead and record the outcome.

## Decisions Made
- Balance counter placed as local state inside each mask closure (not module-level), so it is per-invocation and never shared across nodes or documents.
- The scalar short circuit is placed before the class-resolution guard in `checkConflictingDeclares` and requires BOTH sides to be a known scalar name — a mixed pair (one scalar, one unresolvable class name) falls through unchanged to the existing resolution-based rule, per the plan's explicit prohibition against short-circuiting a mixed pair.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dropped the nonexistent `--reporter=basic` vitest flag**
- **Found during:** Task 1 verify (and every subsequent verify command copied from the plan)
- **Issue:** The plan's `<verify>` commands specify `--reporter=basic`, which does not exist in the installed vitest 4.1.10 and makes the command fail for the wrong reason (a CLI argument error, not a test result).
- **Fix:** Ran the same commands with the default reporter (or `--reporter=json` where `numFailedTests` was needed), as flagged in this plan's own project rules.
- **Files modified:** None (verification-only, no source change).
- **Verification:** All targeted and whole-suite runs completed and reported real pass/fail counts.
- **Committed in:** N/A (verification-only deviation, documented here per the working rules).

**2. [Rule 1 - Bug in my own draft] Trimmed Task 2's comments to stay under the diff-size acceptance threshold**
- **Found during:** Task 2, running its own third automated acceptance check (`git diff --numstat`)
- **Issue:** My first draft of the balance-rule comments added 45 lines to `line-break-validation.ts`, exceeding the plan's stated 40-line ceiling meant to catch scope creep beyond the two mask closures.
- **Fix:** Condensed the two per-function doc comments into one shared comment above `elseStatementLineBreaks` and shortened the inline comments, preserving the "why" (balance rule, ELSE-doesn't-increment-for-FI asymmetry) without repeating it per function. Final diff: 27 insertions, 16 deletions.
- **Files modified:** `bbj-vscode/src/language/validations/line-break-validation.ts`
- **Verification:** Re-ran the full targeted test set (all 5 files) and the whole-suite JSON report after trimming; both still green.
- **Committed in:** `8ba30038` (the trimmed version is what was committed; no separate commit for the oversized draft, which was never staged).

**3. [Plan defect, not fixed] Task 3's `check-classes.ts` acceptance-criteria grep count is mis-specified**
- **Found during:** Task 3 acceptance-criteria verification
- **Issue:** The plan's automated check requires `grep -c 'bbjnumber' check-classes.ts` to equal exactly 1, framed as "a second occurrence means a duplicate scalar list was introduced." The file already contained two other, unrelated pre-existing private constants (`NUMERIC_RETURN_TYPES`, `BBJ_SCALAR_RETURN_TYPES`, both used by method-return-type checks with no connection to `checkConflictingDeclares`) that also contain the substring `bbjnumber`, so the whole-file count was 3 before this plan touched the file and remains 3 after. Confirmed via `git show HEAD~1:...check-classes.ts | grep -n bbjnumber` that these two other occurrences predate this plan.
- **Actual property verified instead:** No duplicate `KNOWN_BBJ_SCALAR_TYPES` list exists — the diff promotes the single existing private set to a module-level export and removes the private copy; `check-variable-scoping.ts` imports it and contains zero literal scalar-type-name occurrences of its own (confirmed: `grep -c 'bbjnumber' check-variable-scoping.ts` = 0, matching the plan's second, correctly-specified check).
- **Files modified:** None beyond what Task 3 already changed; this is a verification-only note.
- **Committed in:** N/A — no code change was warranted; recorded here per the deviation rules' "genuinely unsure -> document" guidance rather than altering unrelated pre-existing constants outside this task's scope.

---

**Total deviations:** 2 auto-fixed (both Rule 1/3, both self-contained to verification/comment size), 1 plan defect documented without a corresponding code change.
**Impact on plan:** None of the three affected the shipped behavior; all three are documented so a future reader does not mistake the flag typo, the trimmed comment, or the pre-existing unrelated constants for a real gap.

## Issues Encountered
- Two whole-file-suite runs (`test/conformance-regressions.test.ts` and `test/class-validations-issues.test.ts`) reported a `beforeAll` hook timeout when run alongside other files with `--maxWorkers` contention, matching this repository's documented pattern (a failed suite with zero failed tests is a hook timeout under contention, not a real failure). Re-ran each file standalone and both passed cleanly; the whole-suite JSON report's `numFailedTests` was 0 throughout.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both verification gaps this plan targeted (the balance-counter defect in the single-line IF/FI/ELSE walks, and the scalar-vs-scalar DECLARE narrowing) are closed with regression coverage.
- The A2 watch item above (in-method scalar conflict now error-severity) is handed to the phase's final gap plan (98-10) to check against the closing conformance measurement.
- `.planning/REQUIREMENTS.md` intentionally left untouched per this plan's working rules; its Phase 98 checkboxes stay unchecked until the phase's final gap plan resolves them.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*
