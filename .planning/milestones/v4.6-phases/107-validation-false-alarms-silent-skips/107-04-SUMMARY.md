---
phase: 107-validation-false-alarms-silent-skips
plan: 04
subsystem: validation
tags: [langium, line-break-validation, conformance, def-fn, colon-continuation]

requires:
  - phase: 107-validation-false-alarms-silent-skips
    provides: "107-01's elseStatementLineBreaks counter repair, confirmed by this plan's own baseline as the state the private-corpus target set is measured against"
provides:
  - "Confirmation that the 7 files re-flagged at the Phase 98 close (6 blank-message + 1 ':else') carry zero bbj-line-break Errors on the current tree"
  - "A previously-unidentified false-alarm mechanism found, fixed and pinned: previousStatement() no longer stops at a same-line RETURN (DefReturn) inside a DEF FN body when walking back to find a governing IF"
  - "A private-corpus re-measure showing the target set fully cleared, 0 newly-entered line-break false alarms, and 2 newly-exposed raw-B files traced and reported (not silently re-flagged)"
  - "The live-endpoint reconciliation test repaired with a fresh compiler-accepted/Langium-flagged fixture pair, confirmed against the live parseProgram endpoint"
affects: [107-06]

actuals:
  tokens: 4400
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "previousStatement()'s single shared sibling-lookup, used by all three balance-rule walkers plus isInsideSingleLineIf, now transparently skips a same-index run of DefReturn siblings (DefFunctionStatement = DefReturn | Statement, so DefReturn is never itself a Statement) instead of treating one as 'no predecessor'"

key-files:
  created:
    - .planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md
  modified:
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
    - bbj-vscode/test/functional/parse-program-live.test.ts

key-decisions:
  - "previousStatement() now skips transparently past a same-line run of DefReturn siblings inside a DEF FN body when finding the governing statement for the IF/ELSE/FI line-break balance walk -- a DEF FN body mixes RETURN (DefReturn, not a Statement) in with ordinary Statement siblings, and a same-line RETURN was stopping the shared backward walk one step early, starving every ELSE/IF on a colon-continued chain of its own governing IF"
  - "Two newly-exposed raw-B corpus files (a compiler-rejected SELECT...FROM...WHERE construct) were reported in 107-CONFORMANCE.md rather than fixed -- each file's only Error-severity diagnostic was the now-removed false alarm on an unrelated DEF FN inline IF/ELSE/RETURN, and nothing else in the language server ever raised an Error for the rejected SELECT construct; left for 107-06's human check per this plan's own instruction not to re-flag valid code to protect the B gate"
  - "(orchestrator-assigned) parse-program-live.test.ts's nested single-line IF/ELSE/FI fixture no longer draws any Langium syntax complaint once this plan's fix landed, so its own precondition assertion started failing; replaced with a different, freshly-verified compiler-accepted/Langium-flagged pair (a numeric GOSUB target with no matching label, inside a REPEAT/UNTIL loop) rather than restructuring the test around 'no complaint at all', since a genuine pre-existing (and out-of-scope) false alarm was still available"

patterns-established:
  - "A per-file local probe script (never committed, run from outside the repository) that validates a fixed id list with the same test-double services the harness uses, for investigating a private-corpus residue shape without ever reading or writing corpus text into the repository"

requirements-completed: []

coverage:
  - id: D1
    description: "The 7 files re-flagged at the Phase 98 close (VAL-01's target set) carry zero line-break Errors on the current tree"
    requirement: "VAL-01"
    verification:
      - kind: other
        ref: "phase-107-file-probe.mts run against the target-set id list -- 0 of 7 files report a bbj-line-break Error (local output, not committed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The previously-unidentified DEF-FN/RETURN-adjacency false-alarm shape is pinned by a synthetic failing-then-passing test and a matching clean fixture"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/line-break-single-line-if.test.ts#a colon-continued ELSE-IF chain inside a DEF FN body, closed only by FNEND produces no line-break diagnostics"
        status: pass
      - kind: e2e
        ref: "test/example-files.test.ts#Every fixture in test-data parses and validates clean (covers the new single-line-if-forms.bbj entry)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No line-break-message false alarm newly appears anywhere in the corpus; existing 'still flagged' regressions and every prior line-break/conformance suite stay green"
    requirement: "VAL-01"
    verification:
      - kind: other
        ref: "private-corpus full re-measure: line-break-message A2 22 (base) -> 12 (this run), 0 newly entered, 10 cleared"
        status: pass
      - kind: unit
        ref: "test/line-break-walk-termination.test.ts, test/line-break-validation.test.ts, test/conformance-regressions.test.ts -- all pass"
        status: pass
    human_judgment: false
  - id: D4
    description: "(orchestrator-assigned) The live-endpoint reconciliation test's now-stale precondition is repaired with a fresh, verified compiler-accepted/Langium-flagged fixture"
    verification:
      - kind: integration
        ref: "test/functional/parse-program-live.test.ts#a document the BBj parser accepts carries no language-server syntax error -- run against the live bbj-ls endpoint on :5008"
        status: pass
    human_judgment: false

duration: 44min
completed: 2026-09-24
status: complete
---

# Phase 107 Plan 04: VAL-01 private-corpus confirmation and DEF-FN RETURN-adjacency fix Summary

**Confirmed the Phase-98 line-break residue is fully cleared on the private corpus, found and fixed a second false-alarm mechanism (a same-line RETURN inside a DEF FN body was blocking the balance-rule walk), and re-measured to zero new regressions.**

## Performance

- **Duration:** 44 min
- **Started:** 2026-09-24T21:46:00Z (approx)
- **Completed:** 2026-09-24T22:29:09Z
- **Tasks:** 2 plan tasks + 1 orchestrator-assigned extra task
- **Files modified:** 4 modified, 1 created

## Accomplishments
- Baselined the private conformance harness against the phase base commit (before any of this
  phase's three fixes), confirming the VAL-01 target set is exactly 7 files (6 blank-message + 1
  `: else`) — matching the last local run's own count for the same two groups exactly
- Found a second, previously-unidentified false-alarm mechanism via a purpose-built local probe: a
  `RETURN` statement (`DefReturn`, not a `Statement`) sitting between two same-line IF/ELSE-family
  statements inside a `DEF FN` body made the shared `previousStatement()` walk return "no
  predecessor," starving every `ELSE`/`IF` on a colon-continued chain of its own governing IF
- Fixed it with a targeted change to the one shared helper (skip transparently past a same-line run
  of `RETURN` siblings), pinned by a synthetic invented-name test through a full RED/GREEN cycle,
  and added a matching clean fixture to the conformance regression file
- Re-measured against the private corpus: target set fully cleared (7/7), zero newly-entered
  line-break false alarms, two newly-exposed raw-B files traced to the exact same removed false
  alarm and reported (not silently re-flagged) for 107-06's human check
- Repaired `parse-program-live.test.ts`'s reconciliation fixture, whose own precondition this
  plan's fix incidentally invalidated, with a fresh compiler-accepted/Langium-flagged pair
  (a numeric GOSUB target with no matching label) confirmed against the live endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2 (TDD RED): add failing test for the DEF-FN RETURN-adjacency shape** - `01572e48` (test)
2. **Task 2 (TDD GREEN): fix `previousStatement()` and add the clean fixture** - `a5f7c297` (fix)
3. **Task 1/2 write-up: baseline, target set and re-measure** - `2a69723a` (docs)
4. **Orchestrator-assigned: repair the live-endpoint reconciliation fixture** - `ffd2bb8e` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/validations/line-break-validation.ts` - `previousStatement()` skips
  past a same-line run of `DefReturn` siblings when finding the governing statement
- `bbj-vscode/test/line-break-single-line-if.test.ts` - new "stays clean" case for a
  colon-continued ELSE-IF chain inside a DEF FN body closed only by FNEND
- `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` - matching clean fixture,
  auto-parsed by `example-files.test.ts` and `conformance-regressions.test.ts`
- `bbj-vscode/test/functional/parse-program-live.test.ts` - reconciliation test's fixture replaced
  with a numeric-GOSUB-target repro, verified against the live endpoint
- `.planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md` - baseline, target
  set, mechanism and re-measure, all in own words, no corpus text

## Decisions Made
- Used the plan's own two-counter/shared-helper structure (D-01) as given; the actual new
  investigation and fix this plan required was in `previousStatement()`, a different function from
  the one 107-01 touched, so it did not conflict with 107-01's own "no shared stack-walk helper"
  constraint (that constraint was about the two counters inside `elseStatementLineBreaks` and
  `ifEndStatementLineBreaks`, not about the sibling-lookup helper both of them call)
- See frontmatter `key-decisions` for the two other decisions (the DEF-FN/RETURN fix mechanism, and
  reporting rather than fixing the two newly-exposed raw-B files) and the orchestrator-assigned
  fixture repair

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `previousStatement()` stopped at a same-line RETURN inside a DEF FN body**
- **Found during:** Task 1 (per-file probe on the target set found 2 of 7 files still carrying a
  `bbj-line-break` Error after 107-01's own fix)
- **Issue:** A DEF FN body's sibling list mixes `RETURN` (`DefReturn`, a distinct AST type used only
  inside a function body) in with ordinary `Statement` siblings; the shared backward-walk helper's
  lookup treated a `RETURN` sibling as "not a statement" rather than "a statement to walk past,"
  returning `undefined` and stopping the walk one step too early. Every `ELSE`/`IF` on a
  colon-continued multi-branch chain closed only by `FNEND` (no explicit `FI` anywhere) lost its
  own governing IF this way and was flagged as a false alarm.
- **Fix:** `previousStatement()` now walks past a same-index run of `DefReturn` siblings to find
  the nearest real `Statement` sibling before applying its existing compound-statement/plain-
  statement logic. No change to message text, no fallback for an empty CST range (D-04 respected).
- **Files modified:** `bbj-vscode/src/language/validations/line-break-validation.ts`,
  `bbj-vscode/test/line-break-single-line-if.test.ts`,
  `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj`
- **Verification:** Synthetic invented-name test failed before the fix (3 diagnostics), passed
  after (0). Both originally-flagged corpus files (read locally, never quoted) confirmed clean via
  the local probe. Full private-corpus re-measure shows the target set at 0/7 remaining and no
  newly-entered line-break false alarm anywhere in the corpus.
- **Committed in:** `01572e48` (test, RED) and `a5f7c297` (fix, GREEN)

**2. [Rule 1 - Bug, orchestrator-assigned] `parse-program-live.test.ts`'s reconciliation fixture
lost its own precondition**
- **Found during:** the orchestrator-assigned extra task (the wave-1 whole-suite gate flagged this
  test failing, caused by this plan's own line-break fix removing the diagnostic the test relied on)
- **Issue:** The test's fixture (the nested single-line IF/ELSE/FI one-liner) no longer draws any
  Langium syntax complaint once this plan's fix landed, so its own precondition assertion
  (`complaints.length` > 0) started failing — not a real regression, a stale fixture.
- **Fix:** Replaced the fixture with a different, freshly-invented shape — `flag=0\nrepeat\ngosub
  1000\nuntil flag=1\n` — confirmed via a direct call to the live `parseProgram` endpoint to return
  zero compiler errors, and confirmed via `validationHelper` to still draw two `bbj-line-break`
  Errors on the current tree (a numeric GOSUB/GOTO target is not parsed as part of the GOSUB
  statement's own CST node, so the bare number falls through as a separate flagged statement).
  This shape is unrelated to VAL-01 and pre-existing; it was not fixed, only used as a still-valid
  fixture. The comment above the fixture was rewritten to describe the new mechanism, with no
  planning identifiers.
- **Files modified:** `bbj-vscode/test/functional/parse-program-live.test.ts`
- **Verification:** `npx vitest run test/functional/parse-program-live.test.ts` against the live
  `bbj-ls` endpoint on `:5008` — all 7 tests pass, confirmed running (not skipped) via the verbose
  reporter.
- **Committed in:** `ffd2bb8e`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs, one plan-scoped and one orchestrator-assigned).
**Impact on plan:** Both fixes were necessary for correctness; the first is this plan's own core
deliverable (VAL-01's residue), the second repairs test breakage this plan's own fix caused
elsewhere in the suite. No scope creep — neither the newly-exposed raw-B files nor the numeric
GOSUB/GOTO shape were fixed, both being out of this plan's scope.

## Issues Encountered
None beyond the two deviations above, both resolved.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAL-01's line-break residue is fully cleared and re-measured; per the shared-ID gate, VAL-01 is
  not marked Complete in REQUIREMENTS.md until plan 06 (which also declares it) finishes.
- The two newly-exposed raw-B corpus files (a compiler-rejected SELECT construct with no Error-
  severity diagnostic anywhere) are reported in `107-CONFORMANCE.md` §3 for 107-06's human check —
  not a blocker, but should not be silently dropped.
- 107-06's own unknown-Java-member noise count (7,390 A2 entries from 107-03's test-double
  incompleteness) is reported for context only; disposing of it is 107-06's job.
- Whole-suite re-run (`RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2`) shows exactly the known
  11-failure baseline (`linking.test.ts` "Interop related tests", interop backend drift, unrelated
  to this plan) — no new failures introduced.

## Self-Check: PASSED

All modified/created files verified present on disk; all four commit hashes (`01572e48`,
`a5f7c297`, `2a69723a`, `ffd2bb8e`) verified in `git log`.

---
*Phase: 107-validation-false-alarms-silent-skips*
*Completed: 2026-09-24*
