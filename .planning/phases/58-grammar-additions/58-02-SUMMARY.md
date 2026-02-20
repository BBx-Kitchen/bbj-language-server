---
phase: 58-grammar-additions
plan: "02"
subsystem: grammar
tags: [langium, parser, bbj, serial, addr, expression, grammar-rule]

# Dependency graph
requires:
  - phase: 58-01
    provides: EXIT_NO_NL token, ExitWithNumberStatement update — grammar addition pattern established
provides:
  - SerialStatement grammar rule with optional records/recsize pair, Mode?, and Err? clauses
  - AddrStatement fileid broadened from StringLiteral to Expression
  - isSerialStatement type guard in generated AST
  - GRAM-02 and GRAM-03 parser tests passing
affects: [grammar, parser, ast-types]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional paired arguments: use grouped alternative '(' records=Expression ',' recsize=Expression ')?' when two args must appear together or not at all"
    - "Broadening fileid type: change StringLiteral to Expression in statement rules to accept variable references and computed paths, not just string literals"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "records and recsize grouped as optional pair in SerialStatement: both must appear together per BBj syntax, so '(',' records ',' recsize ')?' expresses this constraint correctly"
  - "ADDR fileid: StringLiteral -> Expression allows ADDR myPath$ and ADDR getPath$() — existing string literal tests remain valid as StringLiteral is a subset of Expression"
  - "ROADMAP.md Phase 58 phase list line corrected from 'ADDR function' to 'ADDR verb' for accuracy"

patterns-established:
  - "Paired optional args pattern: (',' arg1=Expression ',' arg2=Expression)? — use when two arguments always appear together or not at all"

requirements-completed: [GRAM-02, GRAM-03]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 58 Plan 02: SERIAL Verb and ADDR Expression Summary

**SerialStatement grammar rule added with optional records/recsize pair + Mode? + Err?, and AddrStatement fileid broadened from StringLiteral to Expression, closing GRAM-02 and GRAM-03**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-20T19:22:00Z
- **Completed:** 2026-02-20T19:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- SerialStatement grammar rule added: `'SERIAL' fileid=Expression (',' records=Expression ',' recsize=Expression)? Mode? Err?`
- AddrStatement fileid type broadened: `StringLiteral` -> `Expression` (GRAM-03)
- SerialStatement added to SingleStatement alternatives list (alphabetically between SelectStatement and SetDayStatement)
- ROADMAP.md Phase 58 description corrected: "ADDR function" -> "ADDR verb"
- 2 new parser tests added: GRAM-02 (6 SERIAL forms) and GRAM-03 (ADDR with variable reference)
- All 509 tests pass (507 pre-existing + 2 new), zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SERIAL verb grammar rule and broaden ADDR fileid to Expression** - `5026cdf` (feat)
2. **Task 2: Add GRAM-02 SERIAL verb and GRAM-03 ADDR expression parser tests** - `8baedba` (test)

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - SerialStatement added to SingleStatement alternatives and grammar rule defined; AddrStatement fileid changed from StringLiteral to Expression
- `bbj-vscode/test/parser.test.ts` - isSerialStatement imported; GRAM-02 test (6 SERIAL forms) and GRAM-03 test (ADDR with variable) added

## Decisions Made
- **Grouped optional pair for records/recsize**: BBj SERIAL syntax requires records and recsize to always appear together or not at all. The grammar `(',' records=Expression ',' recsize=Expression)?` correctly captures this constraint — one without the other is not valid BBj.
- **Expression for ADDR fileid**: Changing from StringLiteral to Expression allows `ADDR myPath$`, `ADDR getPath$()`, and `ADDR "literal"` — all valid BBj. Pre-existing ADDR tests with string literals continue to pass since StringLiteral is a subset of Expression.
- **Alphabetical placement for SerialStatement**: Inserted between SelectStatement and SetDayStatement — "SERI" sorts after "SELE" and before "SET".

## Deviations from Plan

None - plan executed exactly as written. The ROADMAP.md "ADDR function" correction on the phase list line (line 176) was a minor additional fix noticed during the ROADMAP update step; the success criteria section (line 202) already had the correct "ADDR verb" text from the previous plan.

## Issues Encountered
None. Grammar regeneration, build, and all tests passed cleanly on first attempt.

## Next Phase Readiness
- GRAM-01, GRAM-02, and GRAM-03 all closed: Phase 58 is complete
- Foundation ready for Phase 59: Java Class Reference Features
- No blockers or concerns

## Self-Check: PASSED

- 58-02-SUMMARY.md: FOUND
- bbj-vscode/src/language/bbj.langium: FOUND (SerialStatement added, ADDR fileid Expression)
- bbj-vscode/test/parser.test.ts: FOUND (GRAM-02, GRAM-03 tests added)
- Commit 5026cdf (feat): FOUND
- Commit 8baedba (test): FOUND
- 509 tests pass (507 pre-existing + 2 new)

---
*Phase: 58-grammar-additions*
*Completed: 2026-02-20*
