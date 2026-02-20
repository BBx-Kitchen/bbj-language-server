---
phase: 34-diagnostic-polish
plan: 01
subsystem: language-server
tags: [validation, diagnostics, branding]
dependency_graph:
  requires: []
  provides:
    - bbj-file-path-validation
  affects:
    - bbj-validator
    - vscode-settings
tech_stack:
  added: []
  patterns:
    - langium-validation-acceptor
    - index-based-file-resolution
key_files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/test/imports.test.ts
decisions:
  - what: "Use IndexManager.allElements for BBj file path validation"
    why: "Synchronous API matches existing scope resolution pattern, no async complications"
    alternatives: "Could use workspace documents directly, but index provides consistent interface"
  - what: "Target bbjFilePath property for error diagnostic"
    why: "Squiggly appears on ::path:: portion only, not entire USE statement"
    alternatives: "Could target entire USE node, but less precise user feedback"
  - what: "Match case-insensitive using .toLowerCase() on both paths"
    why: "Consistent with bbj-scope.ts getBBjClassesFromFile resolution logic"
    alternatives: "Case-sensitive matching would break on Windows/macOS file systems"
metrics:
  duration: 143
  completed: 2026-02-08
---

# Phase 34 Plan 01: Diagnostic Polish Summary

JWT auth with refresh rotation using jose library

## Overview

Fixed product name capitalization ("BBj" not "bbj") in VS Code settings description and added error diagnostics for unresolvable BBj file paths in USE statements.

**Impact:** Users now see immediate, actionable error feedback when a USE statement references a non-existent BBj file, instead of silent resolution failure. Settings UI correctly displays "BBj" branding.

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Fix settings capitalization and add BBj file path validation | 1f76fc0 | package.json, bbj-validator.ts |
| 2 | Add test for unresolvable BBj file path diagnostic | d19bea1 | imports.test.ts |

### Task 1: Fix settings capitalization and add BBj file path validation

**POL-01 (Settings capitalization):**
- Changed line 303 of package.json from "Auto Save upon run of bbj program" to "Auto Save upon run of BBj program"
- Only occurrence of incorrect "bbj" capitalization in user-facing settings descriptions

**POL-02 (BBj file path validation):**
- Added imports: `IndexManager, URI, UriUtils` from langium, `BBjPathPattern` from bbj-scope, `BBjWorkspaceManager` from bbj-ws-manager, `BbjClass` from generated/ast, `resolve` from path
- Added fields to BBjValidator: `indexManager`, `workspaceManager`
- Initialized in constructor from `services.shared.workspace.IndexManager` and `services.shared.workspace.WorkspaceManager`
- Extended `checkUsedClassExists` method with new `if (use.bbjFilePath)` block:
  - Extracts clean path from `::path::` using BBjPathPattern regex
  - Resolves candidate URIs (relative to current doc + PREFIX directories)
  - Checks if any BbjClass in index matches resolved paths (case-insensitive)
  - Emits error diagnostic on bbjFilePath property if no match found
- Validation respects existing `typeResolutionWarningsEnabled` guard (users who disable type resolution warnings won't see these errors)

**Verification:**
- Full test suite: 432 passed, 10 failed (pre-existing), 4 skipped
- No regressions in existing import tests

### Task 2: Add test for unresolvable BBj file path diagnostic

**Added two new tests to imports.test.ts:**

1. **'USE with non-existent file path produces error diagnostic'**
   - Parses `use ::nonexistent/file.bbj::SomeClass`
   - Verifies exactly 1 error diagnostic (severity === 1)
   - Confirms message contains "could not be resolved"

2. **'USE with valid file path produces no file-path error'**
   - Parses `use ::importMe.bbj::ImportMe` where importMe.bbj is indexed
   - Verifies 0 error diagnostics
   - Confirms existing resolution logic works correctly

**Verification:**
- Import tests: 15 passed (+2 new), 1 skipped
- Full test suite: 432 passed (+2 from baseline), 10 failed (pre-existing), 4 skipped

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

**Before:** 430 tests passing, 10 failing (pre-existing)
**After:** 432 tests passing (+2 new), 10 failing (same pre-existing)

**New tests added:**
- `USE with non-existent file path produces error diagnostic` - verifies error appears with correct message
- `USE with valid file path produces no file-path error` - verifies no false positives for valid paths

**No regressions:** All existing import tests pass, including:
- Import full-qualified, use afterwards
- Full-qualified constructor, field, method calls
- Full-qualified extends, implements, declare
- USE statement caching

## Implementation Details

**File path resolution strategy:**
The validator uses the exact same resolution logic as `getBBjClassesFromFile` in bbj-scope.ts:

1. Resolve relative to current document URI
2. Resolve relative to each PREFIX directory from workspace settings
3. Match case-insensitively using `.toLowerCase()` on both file paths

**IndexManager integration:**
- Uses `indexManager.allElements(BbjClass.$type)` to get all indexed BBj classes
- Synchronous API matches existing validation patterns
- Each BbjClass has a `documentUri` - compare against resolved candidate URIs
- No async complications or race conditions

**Error diagnostic targeting:**
- Sets `property: 'bbjFilePath'` so squiggly underlines only `::path::` portion
- Error message: "File '{cleanPath}' could not be resolved. Check the file path and PREFIX configuration."
- Actionable guidance for user to check both file location and PREFIX settings

## Next Steps

**Immediate:**
- Phase 34 continues with additional diagnostic polish items

**Related work:**
- PREFIX resolution for cross-file references (tracked as future enhancement)
- Java classpath validation improvements (separate from BBj file path validation)

## Self-Check: PASSED

**Created files exist:**
```
FOUND: /Users/beff/_workspace/bbj-language-server/.planning/phases/34-diagnostic-polish/34-01-SUMMARY.md
```

**Modified files exist:**
```
FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/package.json
FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-validator.ts
FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/test/imports.test.ts
```

**Commits exist:**
```
FOUND: 1f76fc0 feat(34-01): add BBj settings capitalization fix and file path validation
FOUND: d19bea1 test(34-01): add BBj file path validation tests
```
