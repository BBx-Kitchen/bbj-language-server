---
phase: 28-variable-scoping-declaration-order
plan: 02
subsystem: validation
tags: [langium, variable-scoping, testing, vitest, diagnostics, declare, use-before-assignment, dim, dread]

# Dependency graph
requires:
  - phase: 28-01
    provides: check-variable-scoping.ts validation infrastructure (use-before-assignment + conflicting DECLARE)
provides:
  - 25-test comprehensive variable scoping test suite covering SCOPE-01, SCOPE-04, SCOPE-05
  - Fix for ArrayDecl scope computation bug (DIM variables now correctly visible)
  - Offset-based position tracking for compound statement accuracy
affects: [future type inference phases, future DIM/DREAD enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns: [offset-based position tracking instead of line-based for compound statement correctness]

key-files:
  created:
    - bbj-vscode/test/variable-scoping.test.ts
  modified:
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
    - bbj-vscode/src/language/bbj-scope-local.ts

key-decisions:
  - "Use offset-based position comparison instead of line-based to handle compound statements on same line"
  - "ArrayDecl scope computation fixed: isVariableDecl() in processNode now excludes ArrayDecl with !isArrayDecl() guard"
  - "DECLARE skip check uses $type === 'VariableDecl' (exact type) instead of isVariableDecl() (which includes subtypes)"
  - "Test file inlines findAll() helper instead of importing from validation.test.ts to avoid duplicate test execution"

patterns-established:
  - "expectHint helper wraps expectIssue with DiagnosticSeverity.Hint for hint-level test assertions"
  - "expectNoHints helper filters diagnostics by severity and optional message regex for negative hint tests"

# Metrics
duration: 11min
completed: 2026-02-07
---

# Phase 28 Plan 02: Variable Scoping Test Suite and Edge Case Fixes Summary

**25-test comprehensive suite for SCOPE-01/04/05 with ArrayDecl scope fix and offset-based position tracking**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-07T05:58:05Z
- **Completed:** 2026-02-07T06:09:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 25 passing tests covering all three SCOPE requirements (SCOPE-01 use-before-assignment, SCOPE-04 DIM/DREAD linkage, SCOPE-05 DECLARE type propagation)
- Fixed bug where ArrayDecl (DIM) was treated as DECLARE in scope computation, causing DIM'd variables to not be found when used before the DIM statement
- Switched from line-based to offset-based position tracking so compound statements on the same line (`x = 1 ; PRINT y ; y = 2`) are correctly ordered
- No regressions in existing test suite (16 pre-existing failures unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Comprehensive test suite for variable scoping** - `6411e1c` (test)
2. **Task 2: Fix edge cases discovered during testing** - `7f766dd` (fix)

## Files Created/Modified
- `bbj-vscode/test/variable-scoping.test.ts` - 344-line test file with 25 tests across 3 describe blocks
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` - Offset-based position tracking, fixed DECLARE skip logic
- `bbj-vscode/src/language/bbj-scope-local.ts` - Added `!isArrayDecl(node)` guard to prevent ArrayDecl being handled as DECLARE in processNode

## Decisions Made
- **Offset-based ordering:** Switched from `$cstNode.range.start.line` to `$cstNode.offset` for position comparison. This correctly handles compound statements where multiple sub-statements share the same line number but have different character offsets.
- **ArrayDecl scope fix:** The `isVariableDecl()` type guard matches all subtypes (ArrayDecl, FieldDecl, ParameterDecl, VariableDecl). The DECLARE branch in `processNode` was catching ArrayDecl and scoping it to `node.$container` (ArrayDeclarationStatement) instead of the proper `node.$container.$container` (Program/MethodDecl). Added `!isArrayDecl(node)` guard.
- **Exact type check for DECLARE skip:** Changed `isVariableDecl(child.symbol.ref) && !isParameterDecl(...) && !isFieldDecl(...)` to `child.symbol.ref.$type === 'VariableDecl'` which is simpler and more precise.
- **Inline findAll helper:** Instead of importing `findAll` from validation.test.ts (which caused vitest to also run all test blocks from that file), the helper is inlined in the test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ArrayDecl incorrectly scoped as DECLARE in bbj-scope-local.ts**
- **Found during:** Task 2 (testing `PRINT a$` before `DIM a$[10]`)
- **Issue:** `isVariableDecl(node)` in `processNode` matched ArrayDecl, scoping it to `node.$container` (ArrayDeclarationStatement) instead of the correct `node.$container.$container` (Program). This caused DIM'd variables to be invisible in PRINT before the DIM.
- **Fix:** Added `!isArrayDecl(node)` guard so ArrayDecl falls through to its proper handler at line 201
- **Files modified:** bbj-vscode/src/language/bbj-scope-local.ts
- **Verification:** `PRINT a$` before `DIM a$[10]` now correctly shows use-before-assignment hint
- **Committed in:** 7f766dd

**2. [Rule 1 - Bug] isVariableDecl() matched ArrayDecl in DECLARE skip check**
- **Found during:** Task 2 (investigating DIM hint not firing)
- **Issue:** `isVariableDecl(child.symbol.ref)` in pass 2 of checkUseBeforeAssignment returned true for ArrayDecl references, causing them to be skipped as DECLARE variables
- **Fix:** Changed to `child.symbol.ref.$type === 'VariableDecl'` for exact type match
- **Files modified:** bbj-vscode/src/language/validations/check-variable-scoping.ts
- **Committed in:** 7f766dd

**3. [Rule 1 - Bug] Line-based comparison fails for compound statements**
- **Found during:** Task 2 (testing `x = 1 ; PRINT y ; y = 2`)
- **Issue:** All sub-statements in a compound statement share the same line number, so `usageLine < declLine` never evaluates to true for `PRINT y` vs `y = 2`
- **Fix:** Switched to offset-based comparison using `$cstNode.offset` throughout both passes
- **Files modified:** bbj-vscode/src/language/validations/check-variable-scoping.ts
- **Committed in:** 7f766dd

**4. [Rule 3 - Blocking] Import from validation.test.ts caused duplicate test execution**
- **Found during:** Task 1 (initial test run showed 51 tests instead of 25)
- **Issue:** Importing `findAll` from validation.test.ts caused vitest to register all describe blocks from that file
- **Fix:** Inlined `findAll` helper function in variable-scoping.test.ts
- **Files modified:** bbj-vscode/test/variable-scoping.test.ts
- **Committed in:** 6411e1c

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. The ArrayDecl scope computation fix (deviation 1) was an existing latent bug that only became visible through thorough testing. No scope creep.

## Issues Encountered
None beyond the edge cases documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 28 is complete with both validation implementation and comprehensive tests
- All three SCOPE requirements (SCOPE-01, SCOPE-04, SCOPE-05) are verified through passing tests
- The DECLARE AUTO boolean property enables future type narrowing logic

## Self-Check: PASSED
