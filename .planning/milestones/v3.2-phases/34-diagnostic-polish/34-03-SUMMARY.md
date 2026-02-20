---
phase: 34-diagnostic-polish
plan: 03
subsystem: language-server
tags: [uri-comparison, fspath, prefix, diagnostic-reconciliation, langium]

# Dependency graph
requires:
  - phase: 34-02
    provides: diagnostic reconciliation framework (revalidateUseFilePathDiagnostics, USE_FILE_NOT_RESOLVED_PREFIX)
provides:
  - Correct fsPath-based URI comparison in all 3 scope/validation/reconciliation locations
  - Actionable error messages with searched PREFIX directories
  - Debug logging for PREFIX file loading failures
  - Enabled PREFIX test with EmptyFileSystem pattern
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "normalize(uri.fsPath) equality for cross-document URI comparison"
    - "EmptyFileSystem with pre-parsed documents for PREFIX test isolation"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/test/imports.test.ts

key-decisions:
  - "Use normalize() on both sides of fsPath equality to handle non-normalized paths (e.g., /./folder/file.bbj vs /folder/file.bbj)"
  - "Include searched paths list in USE file-path error messages for user actionability"
  - "Pre-parse documents at specific URIs to test PREFIX resolution without real filesystem"

patterns-established:
  - "normalize(bbjClass.documentUri.fsPath).toLowerCase() === normalize(adjustedFileUri.fsPath).toLowerCase() for all cross-document path matching"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 34 Plan 03: Gap Closure Summary

**Fixed PREFIX diagnostic reconciliation with normalized fsPath equality, actionable error messages, and enabled PREFIX test**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T06:36:21Z
- **Completed:** 2026-02-08T06:43:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced 3 broken `endsWith` URI-to-fsPath comparisons with correct `normalize(fsPath) === normalize(fsPath)` equality
- Error messages for unresolved USE file paths now include the list of directories that were searched
- PREFIX file loading failures are now logged (debug for individual paths, warn for complete failure)
- Previously skipped PREFIX test enabled and passing using EmptyFileSystem with pre-parsed documents

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix URI comparison and add logging in all 3 locations** - `c51cd72` (fix)
2. **Task 2: Enable PREFIX test in imports.test.ts** - `f66f701` (test)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-builder.ts` - Fixed fsPath comparison in revalidateUseFilePathDiagnostics, added PREFIX debug/warn logging
- `bbj-vscode/src/language/bbj-validator.ts` - Fixed fsPath comparison in checkUsedClassExists, added searched paths to error message
- `bbj-vscode/src/language/bbj-scope.ts` - Fixed fsPath comparison in getBBjClassesFromFile
- `bbj-vscode/test/imports.test.ts` - Enabled PREFIX test with EmptyFileSystem, removed NodeFileSystem dependency

## Decisions Made
- Used `normalize()` from Node `path` module on both sides of fsPath equality to handle non-normalized paths. The original plan specified plain `fsPath === fsPath` but testing revealed that Langium's validationHelper with relative documentUri options (e.g., `./folder/test.bbj`) produces non-normalized URI paths like `/./folder/test.bbj` which don't match the normalized `/folder/test.bbj`. `normalize()` handles this robustly.
- Pre-parsed documents at specific URIs for PREFIX test isolation instead of using NodeFileSystem with real files on disk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added path normalization to fsPath comparison**
- **Found during:** Task 1 (URI comparison fix)
- **Issue:** Plain `fsPath === fsPath` equality caused a regression in the "Can access public class from different non-related folder file" test. Root cause: Langium test helpers create URIs from non-normalized relative paths like `./folder/test.bbj`, producing fsPaths like `/./folder/test.bbj` that don't match the resolved `/folder/test.bbj`.
- **Fix:** Added `normalize()` to both sides of the comparison in all 3 locations: `normalize(bbjClass.documentUri.fsPath).toLowerCase() === normalize(adjustedFileUri.fsPath).toLowerCase()`
- **Files modified:** bbj-document-builder.ts, bbj-validator.ts, bbj-scope.ts
- **Verification:** All 432 previously passing tests still pass (zero regressions)
- **Committed in:** c51cd72 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential correctness fix. The plan's suggested `fsPath === fsPath` comparison was almost correct but missed edge cases with non-normalized paths. `normalize()` adds robustness without changing semantics.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 34 gap closure complete
- All PREFIX diagnostic reconciliation issues resolved
- Test coverage: 433 passing, 10 failing (pre-existing), 3 skipped
- Ready for v3.2 milestone verification and release

## Self-Check: PASSED

- All 4 modified files exist
- Both task commits verified (c51cd72, f66f701)
- SUMMARY.md created at expected path

---
*Phase: 34-diagnostic-polish*
*Completed: 2026-02-08*
