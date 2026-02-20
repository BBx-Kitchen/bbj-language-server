---
phase: 28-variable-scoping-declaration-order
plan: 01
subsystem: validation
tags: [langium, variable-scoping, diagnostics, declare, use-before-assignment]

# Dependency graph
requires:
  - phase: none
    provides: n/a
provides:
  - Use-before-assignment hint diagnostics for program and method scope
  - Conflicting DECLARE type detection with error diagnostics
  - Grammar auto boolean property on VariableDecl for DECLARE AUTO
affects: [28-02, future type inference phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-pass validation with declaration position map, walkStatements with CompoundStatement recursion]

key-files:
  created:
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-validator.ts

key-decisions:
  - "Plain assignments (x = 5) are LetStatements in the grammar, no need for ExpressionStatement handling"
  - "Use hint severity for use-before-assignment to avoid false positive noise"
  - "Compare DECLARE types case-insensitively for conflict detection"

patterns-established:
  - "Two-pass validation: build declaration map then check usages via AstUtils.streamAllContents"
  - "walkStatements helper recurses into CompoundStatements for complete coverage"
  - "Standalone registerXxxChecks() function pattern for modular validation registration"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 28 Plan 01: Variable Scoping Validation Summary

**Use-before-assignment hint diagnostics and conflicting DECLARE detection with grammar auto property for DECLARE AUTO**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-07T05:49:38Z
- **Completed:** 2026-02-07T05:54:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Grammar updated to capture `auto` keyword as boolean property on VariableDecl (`auto?='auto'?`)
- Two-pass validation for use-before-assignment: builds declaration position map from LET, DIM, DREAD, FOR, READ, ENTER statements, then checks all SymbolRef usages
- Conflicting DECLARE detection groups VariableDecl nodes by name and flags type mismatches as errors
- Both checks registered for Program and MethodDecl scopes
- DECLARE variables correctly exempted (whole-scope visibility)
- Class fields, method parameters, and unresolved references correctly skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Grammar update for DECLARE AUTO property** - `c5b96fc` (feat)
2. **Task 2: Create variable scoping validation and register checks** - `95232f2` (feat)

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - Added `auto?='auto'?` to VariableDecl rule and `auto?: boolean` to interface
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` - New 319-line validation file with checkUseBeforeAssignment and checkConflictingDeclares
- `bbj-vscode/src/language/bbj-validator.ts` - Import and registration of registerVariableScopingChecks

## Decisions Made
- Plain assignments (`x = 5`) without `LET` keyword are parsed as `LetStatement` nodes in the grammar, so no separate ExpressionStatement/Assignment handling was needed (plan had included this but it was unnecessary)
- DECLARE type comparison uses case-insensitive comparison for robustness with BBj's case-insensitive identifiers
- Hint severity used for use-before-assignment to provide gentle developer guidance without blocking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed ExpressionStatement/Assignment handling that caused type error**
- **Found during:** Task 2 (validation file creation)
- **Issue:** Plan specified handling plain assignments via `isExpressionStatement(stmt) && isAssignment(stmt.expression)`, but `Assignment` is not part of the `Expression` type union in the AST. Plain `x = 5` assignments are actually parsed as `LetStatement` nodes.
- **Fix:** Removed the ExpressionStatement/Assignment block and removed unused imports (Statement, DefFunction, SingleStatement, isExpressionStatement)
- **Files modified:** bbj-vscode/src/language/validations/check-variable-scoping.ts
- **Verification:** Build passes, all LetStatement handling covers both `LET x = 5` and `x = 5` forms
- **Committed in:** 95232f2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in plan specification)
**Impact on plan:** Minor correction -- the plan's understanding of Assignment placement in the AST was incorrect but the LetStatement handler already covers all assignment forms.

## Issues Encountered
None beyond the plan specification correction noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Variable scoping validation infrastructure is in place
- Plan 02 can build on this for tests and DIM/DREAD linkage enhancements
- The `auto` boolean property on VariableDecl enables future DECLARE AUTO type narrowing logic

## Self-Check: PASSED

---
*Phase: 28-variable-scoping-declaration-order*
*Completed: 2026-02-07*
