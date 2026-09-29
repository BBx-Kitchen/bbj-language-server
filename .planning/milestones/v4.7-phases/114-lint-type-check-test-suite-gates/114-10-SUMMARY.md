---
phase: 114-lint-type-check-test-suite-gates
plan: "10"
subsystem: testing
tags: [typescript, vscode-languageserver, diagnostics, tsconfig, vitest]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double these files already build on"
  - phase: 114-07
    provides: "the working tsconfig.test.json / typecheck:test gate this plan's six files are checked against, plus baseline/typecheck-before.txt's per-plan digest"
provides:
  - "TEST-02 fix group 'diagnostic messages, part A' (D-05) at zero type errors: the six test files with the largest string|MarkupContent message-reading error counts (line-break-validation, line-break-single-line-if, parser-keyword-statements, unresolvable-type, classes, variable-scoping) all read diagnostic text through the official Diagnostic.getMessageString(d) helper instead of a bare .message string read"
affects: [114-13]

actuals:
  tokens: 9918
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Diagnostic.getMessageString(d) at every diagnostic-message read across this plan's six files (local filter helpers and direct .includes/.startsWith/.toLowerCase/equality reads alike), matching the pattern 114-04/114-05/114-08/114-09 already established for the LSP 3.18 string | MarkupContent cascade"

key-files:
  modified:
    - bbj-vscode/test/line-break-validation.test.ts
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - bbj-vscode/test/unresolvable-type.test.ts
    - bbj-vscode/test/classes.test.ts
    - bbj-vscode/test/variable-scoping.test.ts

key-decisions:
  - "variable-scoping.test.ts's find predicate at 'ref => ref.symbol.$refText === 'x!' && ref !== fieldDecl' drops the second clause: a SymbolRef can never be a FieldDecl ($type union has no overlap), so TS2367 flagged it as always-true and provably vacuous. Per the plan's own must-have truth, only this comparison is removed -- the predicate still selects the identical single PRINT x! reference as before, and every downstream expect() is unchanged. Recorded here per the plan's explicit instruction to document the removal as a vacuous test clause."
  - "classes.test.ts's two relative imports (../src/language/generated/ast, ./test-helper) gain .js suffixes for Node16 module resolution (TS2835), matching the fix already applied to this file's bbj-module import in 114-02."
  - "Every fix in both tasks is a straight message-read substitution (Diagnostic.getMessageString(d) in place of d.message, or a locally-typed helper's parameter widened from '{ message: string }[]' to the real 'Diagnostic[]') -- no assertion value, matcher, or expected-string was touched, and no cast or disable comment was introduced anywhere in the diff."

requirements-completed: []
# TEST-02 is also declared by 114-11 through 114-13 (all still open); per this plan's explicit
# instruction, it is intentionally left un-marked in REQUIREMENTS.md here. Plan 114-13 closes it
# once every declaring plan is done.

coverage:
  - id: D1
    description: "The four files whose type errors came from a helper typed for `{ message: string }[]` (line-break-validation, line-break-single-line-if, parser-keyword-statements, unresolvable-type) all accept the real LSP Diagnostic[] list and read every message through Diagnostic.getMessageString, with unchanged test results"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "cd bbj-vscode && npx tsc -p tsconfig.test.json --noEmit | grep -cE '^test/(line-break-validation|line-break-single-line-if|parser-keyword-statements|unresolvable-type)\\.test\\.ts' = 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/line-break-validation.test.ts test/line-break-single-line-if.test.ts test/parser-keyword-statements.test.ts test/unresolvable-type.test.ts (462/462 passed)"
        status: pass
      - kind: other
        ref: "grep -c '{ message: string }\\[\\]' test/line-break-validation.test.ts = 0; npx eslint on all four files --max-warnings 0 exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "classes.test.ts and variable-scoping.test.ts (the two largest message-reading files) reach zero type errors through Diagnostic.getMessageString at every message read, classes.test.ts's relative imports gain .js suffixes, and variable-scoping.test.ts's one always-true type comparison is dropped as a documented vacuous clause -- with the whole suite matching the phase baseline exactly"
    requirement: TEST-02
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.test.json --noEmit reports zero errors across all six of this plan's files; zero errors in src/; npm run build exits 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/classes.test.ts test/variable-scoping.test.ts (87/87 passed)"
        status: pass
      - kind: other
        ref: "grep -cE '\\.message\\.(includes|startsWith|toLowerCase)\\(' on both files = 0 for both; npx eslint on both files --max-warnings 0 exits 0; git diff e8941d48 -- (all six files) | grep '^+[^+]' | grep -cE '@ts-(nocheck|expect-error|ignore)|as any|as string\\b|eslint-disable' = 0; same diff grepped for planning identifiers = 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-10-run1.json, run2.json): both interop5008=open, hookTimeoutSuites=0, numFailedTests=11, and FAILED_TEST lines byte-identical to baseline/suite-before.txt in both runs"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 10: Test-Tree Type-Check Gate — Diagnostic Messages, Part A Summary

**The six test files with the largest LSP 3.18 `string | MarkupContent` diagnostic-message error counts (108 errors total) all read messages through the official `Diagnostic.getMessageString` helper instead of a bare `.message` string read, with zero behaviour change confirmed across two byte-identical whole-suite runs.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-27T20:31:17Z (approx, immediately after 114-09's SUMMARY commit)
- **Completed:** 2026-09-27T20:43:00Z (approx)
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `line-break-validation.test.ts`, `line-break-single-line-if.test.ts` and `parser-keyword-statements.test.ts` each retype their local `lineBreakDiagnostics` helper from `{ message: string }[]` to the real `Diagnostic[]`, reading messages through `Diagnostic.getMessageString(d)` inside the filter/map predicates; `line-break-validation.test.ts`'s three direct `d.message` reads outside the helper get the same fix.
- `unresolvable-type.test.ts`'s `unresolvableWarnings` helper is retyped the same way, and its four direct `/cannot be resolved/.test(d.message)` reads are fixed identically.
- `classes.test.ts` replaces all 23 `.includes(...)` and all indexed/mapped `.message` reads (`diagnostics[0].message`, `typeErrors[0].message`, etc.) with `Diagnostic.getMessageString(d)`, and its two relative imports (`../src/language/generated/ast`, `./test-helper`) gain `.js` suffixes for Node16 resolution.
- `variable-scoping.test.ts` replaces all 26 `.startsWith`/`.includes`/`.toLowerCase`/equality `.message` reads (across `d`, `e` and `h` predicate parameter names) with `Diagnostic.getMessageString(...)`, and drops the always-true `ref !== fieldDecl` clause from one `find` predicate (a `SymbolRef` can never be a `FieldDecl`) — the predicate still selects the identical single reference.
- Zero type errors across all six files (108 → 0), zero `src/` errors, `npm run build` green, `npx eslint` clean on all six files, 549 targeted tests pass (462 + 87), and two whole-suite `npm test` runs both reproduce `baseline/suite-before.txt`'s 11-test `FAILED_TEST` set exactly on the first attempt.

## Task Commits

1. **Task 1: The four files with a string-typed diagnostic helper accept real LSP diagnostics** - `bdbc14ca` (fix)
2. **Task 2: classes.test.ts and variable-scoping.test.ts reach zero errors, and the whole suite matches the baseline** - `744991e0` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/line-break-validation.test.ts` - `lineBreakDiagnostics` helper retyped to `Diagnostic[]`; three direct message reads fixed
- `bbj-vscode/test/line-break-single-line-if.test.ts` - `lineBreakDiagnostics` helper retyped, its `.map(d => d.message)` output now `Diagnostic.getMessageString(d)`
- `bbj-vscode/test/parser-keyword-statements.test.ts` - `lineBreakDiagnostics` helper retyped to `Diagnostic[]`
- `bbj-vscode/test/unresolvable-type.test.ts` - `unresolvableWarnings` helper retyped; four direct message reads fixed
- `bbj-vscode/test/classes.test.ts` - all `.message` reads (23 `.includes`, indexed/mapped reads) routed through `Diagnostic.getMessageString`; `.js` import suffixes added
- `bbj-vscode/test/variable-scoping.test.ts` - all `.message` reads (16 comparisons + 10 `.startsWith`/`.includes` per the interfaces block) routed through `Diagnostic.getMessageString`; vacuous `ref !== fieldDecl` clause dropped

## Decisions Made
See `key-decisions` in the frontmatter for the two decisions with the most reasoning behind them (the vacuous-clause removal in `variable-scoping.test.ts`, and the `.js` import-suffix fix in `classes.test.ts`). Every other fix (helper retyping, direct message-read substitution) was already named or directly implied by the plan's own `<interfaces>` text.

## Deviations from Plan

None - plan executed exactly as written. The one behaviour-adjacent edit (dropping the always-true `ref !== fieldDecl` clause in `variable-scoping.test.ts`) was explicitly directed by the plan's Task 2 `<action>` and `must_haves.truths`, not a deviation discovered during execution.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six files in this plan's TEST-02 "diagnostic messages, part A" group are at zero type errors; combined with 114-07's, 114-08's and 114-09's earlier groups, the test-tree total continues to shrink toward zero for the remaining 114-11 and 114-12 plans.
- TEST-02 is also declared by 114-11 through 114-13 (all still open); per this plan's explicit instruction it is intentionally left un-marked in `REQUIREMENTS.md` here — plan 114-13 closes it once every declaring plan is done.
- `coverage/phase-114/114-10-run1.json` and `run2.json` are the whole-suite evidence for this plan (gitignored raw reports; both runs' digests matched `baseline/suite-before.txt`'s `FAILED_TEST` set exactly on the first attempt, no re-run investigation needed).

## Self-Check: PASSED

All 6 modified files verified present on disk with their described edits. Both task commits (`bdbc14ca`, `744991e0`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npx tsc -p tsconfig.test.json --noEmit` reports zero errors across this plan's six files and zero `src/` errors; `npm run build` exits 0; two whole-suite runs' `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
