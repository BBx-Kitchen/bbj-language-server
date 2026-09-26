---
phase: 107-validation-false-alarms-silent-skips
plan: 02
subsystem: validation
tags: [langium, scope-computation, use-before-assignment, silent-skip]

requires: []
provides:
  - "checkUseBeforeAssignment no longer throws on a SymbolRef with no symbol -- it skips the malformed node silently and keeps checking the rest of the scope"
  - "BbjScopeComputation's input-variable branch (READ/DREAD/ENTER targets) no longer crashes scope computation on the same malformed shape"
  - "A regression suite covering every reachable malformed-reference shape found this session, in both program and method scope"
affects: [107-04, 107-06]

actuals:
  tokens: 3300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Inline optional read (`symbol?.$refText`) at every enumerated site, matching the file's existing `?.` idiom on `.$refText` -- no new shared type-guard helper"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
    - bbj-vscode/src/language/bbj-scope-local.ts
    - bbj-vscode/test/variable-scoping.test.ts

key-decisions:
  - "The `# = 1` control test asserts message count and each message's own stable text/prefix rather than a literal snapshot of the full diagnostics -- the base-tree probe for this shape produced a >6000-alternative Chevrotain token-sequence listing (a single `#` at the very start of a file is a bare parser rejection, unrelated to anything this plan touches); embedding that literal text in source would be an unreadable, Chevrotain-version-fragile snapshot for no added correctness value. Confirmed via probe that the current (fixed) tree produces the identical 2-diagnostic shape, same last-message text and same first-message prefix, as the pre-Task-1 base tree."
  - "Used validationHelper's underlying parseHelper<Model> pattern (as the plan's own interfaces section specified) rather than validationHelper directly, so the tests read the exact document object recallLangiumDiagnostics keys on -- matches the file's existing P61-D5-008 test's use of the same parseHelper<Model> pattern."

patterns-established:
  - "Guard every `.symbol` read at the point of use with `?.` rather than introducing a shared 'asserted resolved SymbolRef' type guard -- keeps the fix minimal and auditable per site (D-06)."

requirements-completed: []

coverage:
  - id: D1
    description: "checkUseBeforeAssignment no longer throws on a symbol-less SymbolRef ('## = 1'); it keeps producing the use-before-assignment hint for the rest of the file"
    requirement: "VAL-02"
    verification:
      - kind: unit
        ref: "test/variable-scoping.test.ts#a malformed double-sigil assignment does not stop the check"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#building a malformed double-sigil assignment does not throw"
        status: pass
    human_judgment: false
  - id: D2
    description: "Scope computation no longer crashes the whole document build on the same malformed shape (ENTER ##, and by extension DREAD/READ/ENTER-with-array-element variants)"
    requirement: "VAL-02"
    verification:
      - kind: unit
        ref: "test/variable-scoping.test.ts#a malformed ENTER target does not crash scope computation"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#a malformed %s target does not stop validation (test.each: DREAD ##, READ(1)##, ENTER ##[1], DREAD ##[ALL], FOR ## = 1 TO 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A malformed reference emits no diagnostic of its own for itself: exactly one use-before-assignment hint is produced (for the real variable), in both program and method scope; the single-sigil control case and repeated validation are unaffected"
    requirement: "VAL-02"
    verification:
      - kind: unit
        ref: "test/variable-scoping.test.ts#the check adds nothing for the malformed node itself -- exactly one hint, for the real variable"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#a malformed reference inside a class method body still produces the method-scope hint"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#the single-sigil `# = 1` shape behaves exactly as before (control case)"
        status: pass
      - kind: unit
        ref: "test/variable-scoping.test.ts#validating the same malformed input twice in a row yields identical diagnostics both times"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-24
status: complete
---

# Phase 107 Plan 02: Malformed-reference silent skip in use-before-assignment and scope computation Summary

**Eight `.symbol` reads in `check-variable-scoping.ts` and one in `bbj-scope-local.ts` gained an inline optional guard, so a `SymbolRef` with no `symbol` (the `## = 1` / `ENTER ##` shape) is now skipped silently instead of throwing and either disabling the whole check for a scope or crashing document build.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-24T20:23:00Z (approx, immediately after 107-01)
- **Completed:** 2026-09-24T20:33:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Guarded all eight enumerated `.symbol` reads in `check-variable-scoping.ts` with an inline `?.`, matching the file's own existing idiom on `.$refText` -- no new shared type-guard helper (D-06)
- Guarded the `bbj-scope-local.ts` input-variable branch with `isSymbolRef(node) && node.symbol`, so `ENTER ##` (and the `READ`/`DREAD` equivalents) no longer crash scope computation, one build phase before validation can even run
- Confirmed via a throwaway probe against the pre-fix tree (run, then restored and deleted) that `DREAD ##`, `READ(1)##`, `DREAD ##[ALL]` and `FOR ## = 1 TO 2` each produced a validation-crash diagnostic, and `ENTER ##[1]` threw and crashed the build -- all five are clean after the fix
- Pinned the malformed shape in method scope (produces its own hint, no crash), the D-07 "check adds nothing for the malformed node itself" exactly-one-hint case, the single-sigil `# = 1` control case (a genuine, pre-existing parser error entirely unrelated to this fix), and idempotency (validating the same input twice yields identical diagnostics)

## Task Commits

Each task was committed atomically:

1. **Task 1: A file with a symbol-less reference keeps its use-before-assignment check and builds, end to end** - `68a7fa42` (fix)
2. **Task 2: Every reachable malformed-reference shape is pinned, in program and method scope** - `cf280654` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` - all 8 `.symbol` reads guarded with `?.`; the read after the existing `varName === undefined` early-continue (line ~276) is unchanged, since it can only be reached once `symbol` is already known present
- `bbj-vscode/src/language/bbj-scope-local.ts` - the input-variable branch's `isSymbolRef(node)` condition now also requires `node.symbol`
- `bbj-vscode/test/variable-scoping.test.ts` - new "Use before assignment with a reference that has no symbol" describe block: the three Task 1 RED/GREEN tests, plus Task 2's five-shape `test.each`, the method-scope test, the exactly-one-hint test, the single-sigil control test, and the idempotency test

## Decisions Made
- The base-tree per-shape probe results (Task 2, step 1) are recorded above under "Probe Evidence" and in the "Accomplishments" section, rather than persisted as a separate file -- the probe script itself was written, run and deleted per the plan's own instruction, never staged
- The `# = 1` control test compares message count and each message's own stable text/prefix instead of a literal full-text snapshot of the base tree's >6000-alternative Chevrotain token listing (documented as a key-decision above)

## Deviations from Plan

None - plan executed exactly as written. Task 1's RED-then-GREEN sequence, the eight-site guard enumeration, and the `bbj-scope-local.ts` guard all matched the plan's own specification; Task 2's probe reproduced exactly the crash/throw pattern the plan predicted for each of the five shapes, and the test additions cover every behavior the plan's `<behavior>` block listed.

## Probe Evidence (before/after, synthetic inputs only, run and deleted)

Two throwaway probe files were written directly over the working copies for `check-variable-scoping.ts` and `bbj-scope-local.ts` (restored via `git checkout HEAD --` immediately after each probe run) to measure the pre-Task-1 (base) tree's behavior, per Task 2's own instruction. Neither probe file nor the copied pre-fix sources were ever committed.

| Input (shape) | Base-tree result | Result after this plan's fix |
|---|---|---|
| `DREAD ##` | validation-crash diagnostic ("An error occurred during validation...") | clean |
| `READ(1)##` | validation-crash diagnostic | clean |
| `ENTER ##[1]` | threw (`TypeError: Cannot read properties of undefined (reading '$refText')`), crashed the whole document build | clean |
| `DREAD ##[ALL]` | validation-crash diagnostic | clean |
| `FOR ## = 1 TO 2` | validation-crash diagnostic | clean |
| `# = 1\nprint z\nz = 1\n` (control) | 2 parser diagnostics: a large Chevrotain "Expecting: one of these possible Token sequences" listing, then "Expecting end of file but found `#`." | identical shape (same count, same last message, same first-message prefix) -- confirmed unaffected, as expected (a bare parser rejection this fix never touches) |

This exactly matches the plan's own prediction ("The planning probe saw a crash message for DREAD, READ, FOR and `DREAD ##[ALL]`, and a thrown TypeError for `ENTER ##[1]`").

## Issues Encountered
- `beforeAll` hook timeouts (`Hook timed out in 10000ms`) occurred twice in a row while running the test file in isolation, due to system CPU contention from an unrelated background process (not this repo's tooling). Resolved by re-running with `--hookTimeout=30000`; not a code issue -- consistent with the project's known "whole-suite hook timeouts are contention" pattern, here appearing even for a single file under unusually high host load.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VAL-02's fix and regression suite are in place. Per the shared-ID gate, VAL-02 is declared by both this plan and 107-06 -- it is intentionally NOT marked complete in REQUIREMENTS.md here; the phase verifier / orchestrator handles that once both plans have a SUMMARY.
- No blockers for 107-03/107-05 (VAL-03) or 107-04/107-06 (VAL-01 conformance re-measurement and VAL-03 harness pass), which are independent of this plan's files.

## Self-Check: PASSED

All modified files verified present on disk; both commit hashes (`68a7fa42`, `cf280654`) verified in git log; `npx tsc -p tsconfig.json` and `npx vitest run test/variable-scoping.test.ts` both pass (49/49 tests).

---
*Phase: 107-validation-false-alarms-silent-skips*
*Completed: 2026-09-24*
