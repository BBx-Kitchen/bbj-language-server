---
phase: 24-grammar-parsing-fixes
plan: 02
subsystem: language-server
tags: [langium, chevrotain, parser, grammar, bbj, comments, dread, data, def-fn]

# Dependency graph
requires:
  - phase: 24-01
    provides: Keyword-prefixed identifier fix (GRAM-02)
provides:
  - COMMENT terminal accepting optional newline for inline REM comments
  - DreadStatement and DataStatement grammar rules with full AST support
  - DefFunction allowed inside MethodDecl body with type-safe AST
  - Line break validation regex accepting semicolon before REM
  - 12 new tests covering GRAM-01, GRAM-03, GRAM-04, GRAM-05
affects: [25-type-resolution-scoping, validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Terminal regex optional groups for context-dependent syntax (newline optional in COMMENT)"
    - "Grammar union types for heterogeneous container elements (Statement | DefFunction in MethodDecl.body)"
    - "Validation regex evolution for compound statement compatibility (lineEndRegex semicolon handling)"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser.test.ts
    - bbj-vscode/src/language/validations/line-break-validation.ts

key-decisions:
  - "Made COMMENT terminal newline optional to support inline REM after semicolons and at end-of-file"
  - "Reused existing InputItem and Err fragments for DreadStatement (consistent with ReadStatement pattern)"
  - "Updated MethodDecl interface body type to (Statement | DefFunction)[] for type safety"
  - "Fixed lineEndRegex to accept optional semicolon before REM (case-insensitive matching)"

patterns-established:
  - "Grammar extensions reuse existing fragments where syntax is similar (DREAD reuses InputItem from READ)"
  - "Validation regexes must account for compound statement separators (semicolon) not just newlines"

# Metrics
duration: 38min
completed: 2026-02-06
---

# Phase 24 Plan 02: Grammar Parsing Fixes Summary

**DREAD/DATA statements, DEF FN in methods, and inline REM comments now parse correctly - GRAM-01, GRAM-03, GRAM-04, GRAM-05 fixed**

## Performance

- **Duration:** 38m 30s
- **Started:** 2026-02-06T06:51:57Z
- **Completed:** 2026-02-06T07:30:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed COMMENT terminal to allow optional newline (supports inline REM and end-of-file REM)
- Added DreadStatement and DataStatement grammar rules with AST generation
- Enabled DefFunction inside class method bodies with updated type interface
- Fixed line break validation to accept `;rem` comment pattern
- Added 12 comprehensive tests proving all four grammar fixes work correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix COMMENT terminal and add DREAD/DATA/DEF-FN-in-methods to grammar** - `0de06e9` (feat)
2. **Task 2: Add tests for GRAM-01, GRAM-03, GRAM-04, GRAM-05** - `6017762` (test)

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - Added COMMENT terminal fix, DreadStatement/DataStatement rules, DefFunction in MethodDecl body
- `bbj-vscode/test/parser.test.ts` - Added 12 new tests for GRAM-01, GRAM-03, GRAM-04, GRAM-05
- `bbj-vscode/src/language/validations/line-break-validation.ts` - Updated lineEndRegex to accept semicolon before REM (case-insensitive)

## Decisions Made

**1. COMMENT terminal newline made optional**
- Rationale: REM at end-of-file or after semicolons doesn't always have trailing newline
- Implementation: Changed `[\n\r]+` to `([\n\r]+)?` in terminal regex
- Verification: Existing REM tests still pass, new inline REM tests pass

**2. DREAD reuses InputItem and Err fragments**
- Rationale: DREAD syntax identical to READ for input items and error handling
- Implementation: `'DREAD' items+=InputItem (',' items+=InputItem)* Err?`
- Verification: DREAD with ERR option parses correctly

**3. DATA takes comma-separated expressions (not restricted from compound statements in grammar)**
- Rationale: Per CONTEXT.md decision, DATA semantics can be enforced in validation later - grammar should parse it
- Implementation: `'DATA' values+=Expression (',' values+=Expression)*`
- Future work: Add validation rule if DATA in compound statements needs to be flagged

**4. MethodDecl body type updated to (Statement | DefFunction)[]**
- Rationale: Langium generates strict types from interfaces - must explicitly allow DefFunction in body
- Implementation: Updated both grammar rule and interface declaration
- Verification: DEF FN inside methods parses without TypeScript errors

**5. Line break validation regex extended for semicolon + REM**
- Rationale: `endif;rem` is valid BBj - validation was incorrectly flagging it as missing line break
- Implementation: Added `(;[ \t]*)?` to lineEndRegex, made case-insensitive with `i` flag
- Verification: GRAM-01 tests pass with validation enabled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed line break validation regex**
- **Found during:** Task 2 (test execution)
- **Issue:** Tests for `endif;rem` were passing parser but failing validation with "needs to end with a line break" error
- **Fix:** Updated lineEndRegex in line-break-validation.ts to accept optional semicolon before REM, made case-insensitive
- **Files modified:** bbj-vscode/src/language/validations/line-break-validation.ts
- **Verification:** All GRAM-01 tests pass with validation enabled
- **Committed in:** 6017762 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Validation fix necessary to complete GRAM-01 functionality. Grammar change alone insufficient - validation layer needed alignment. No scope creep.

## Issues Encountered

**Pre-existing test failures unrelated to changes**
- 11 tests were failing before plan execution
- Same 11 tests still fail after changes
- Verified by temporarily stashing changes and running tests
- Our changes added 12 new passing tests (339 → 351 total)
- Existing REM compound statement test (line 253-266) still passes

## Next Phase Readiness
- Grammar fixes for GRAM-01, GRAM-03, GRAM-04, GRAM-05 complete
- GRAM-02 (keyword-prefixed identifiers) already completed in 24-01
- Ready for Phase 25 (Type Resolution & Scoping) - CAST(), super class field access, implicit getters
- No blockers

---
*Phase: 24-grammar-parsing-fixes*
*Completed: 2026-02-06*

## Self-Check: PASSED
