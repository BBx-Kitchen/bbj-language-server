---
phase: 54-fix-failing-tests
plan: "02"
subsystem: testing
tags: [langium, scope, validator, completion, use-statement, bbj-classes]

requires: []
provides:
  - "TEST-03 resolved: DEF FN completion inside class methods skip with documented root cause"
  - "TEST-04 fixed: USE validator warns when referenced file has no BbjClass nodes"
affects:
  - "54-fix-failing-tests"

tech-stack:
  added: []
  patterns:
    - "USE validation checks IndexManager for BbjClass exports, not just document existence"
    - "Test skip pattern with root-cause documentation for deferred grammar/completion issues"

key-files:
  created: []
  modified:
    - "bbj-vscode/src/language/bbj-validator.ts"
    - "bbj-vscode/test/completion-test.test.ts"
    - "bbj-vscode/test/imports.test.ts"

key-decisions:
  - "TEST-03: Skip test — root cause is Langium DefaultCompletionProvider grammar follower not producing completions inside MethodDecl.body for statement expressions; scope chain is correct"
  - "TEST-04: Use IndexManager.allElements(BbjClass.$type) to detect no-class files (consistent with getBBjClassesFromFile in bbj-scope.ts)"
  - "TEST-04: Emit warning (not error) when file exists but has no BBj classes, per user decision"
  - "TEST-04: Update test filter to accept both severity=1 (Error) and severity=2 (Warning) for File' prefix diagnostics"

patterns-established:
  - "BBjClass index check pattern: IndexManager.allElements(BbjClass.$type).some(desc => normalize(desc.documentUri.fsPath).toLowerCase() === resolvedFsPath)"

requirements-completed:
  - TEST-03
  - TEST-04

duration: 8min
completed: 2026-02-20
---

# Phase 54 Plan 02: Fix TEST-03 and TEST-04 Summary

**USE validator now warns on files with no BBj classes (TEST-04 fixed); DEF FN completion inside class methods documented as grammar-level limitation and skipped (TEST-03)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T10:20:00Z
- **Completed:** 2026-02-20T10:27:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Investigated TEST-03 (DEF FN param completion inside class method): scope chain is correct, root cause is Langium completion engine not producing completions inside MethodDecl.body for statement expressions — test skipped with detailed root-cause comment
- Fixed TEST-04: `checkUsedClassExists` now checks IndexManager for BbjClass exports after finding the document, emits a warning when the file exists but contains no BBj classes
- All 507 tests pass, 4 skipped (1 new skip for TEST-03, 3 pre-existing)

## Task Commits

1. **Task 1: Skip DEF FN param completion test (TEST-03)** - `85eab68` (fix)
2. **Task 2: Add USE validation for files with no BbjClass nodes (TEST-04)** - `f3c4881` (fix)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-validator.ts` - Added BbjClass import and normalize import; refactored file-found check to find resolvedUri then verify it has BbjClass index entries; emit warning when no classes found
- `bbj-vscode/test/completion-test.test.ts` - Skipped "DEF FN parameters with $ suffix inside class method" test with detailed root-cause documentation
- `bbj-vscode/test/imports.test.ts` - Updated test filter to accept both Error (severity=1) and Warning (severity=2) for File' prefix diagnostics

## Decisions Made

- **TEST-03 skip rationale:** Scope debug confirmed params ARE correctly registered in localSymbols under DefFunction with correct container chain (DefFunction -> MethodDecl -> BbjClass -> Program). Root cause is that `PRINT <|>` inside any class method body returns 0 completions — even without DEF FN wrapping. This is a Langium completion provider grammar traversal issue, not a scope issue. Fix requires changes to the grammar or completion provider's grammar follower, which is disproportionately complex per plan fallback rule.

- **TEST-04 implementation:** Used `IndexManager.allElements(BbjClass.$type)` to check for exported classes, consistent with how `getBBjClassesFromFile` works in `bbj-scope.ts`. This correctly handles parser errors since `collectExportedSymbols` has regex fallback — if no classes appear in the index after all recovery attempts, the file truly has no accessible classes.

## Deviations from Plan

None - plan executed exactly as written (including the TEST-03 fallback skip path specified in the plan).

## Issues Encountered

None significant. The debug investigation for TEST-03 confirmed quickly that the root cause was in the completion grammar traversal rather than scope computation.

## Next Phase Readiness

- TEST-03 and TEST-04 requirements resolved (TEST-03 as skip, TEST-04 as passing fix)
- Ready for remaining failing test fixes in Phase 54

---
*Phase: 54-fix-failing-tests*
*Completed: 2026-02-20*
