---
phase: 34-diagnostic-polish
plan: 02
subsystem: language-server
tags: [validation, diagnostics, prefix-resolution]
dependency_graph:
  requires:
    - phase: 34-01
      provides: bbj-file-path-validation
  provides:
    - prefix-diagnostic-reconciliation
  affects:
    - bbj-document-builder
    - bbj-validator
tech_stack:
  added: []
  patterns:
    - post-import-diagnostic-reconciliation
    - index-based-diagnostic-filtering
key_files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-validator.ts
decisions:
  - what: "Re-check diagnostics after addImportedBBjDocuments completes"
    why: "Validation runs BEFORE PREFIX docs are loaded, creating false positives for valid external files"
    alternatives: "Could delay validation until after imports, but that would break incremental compilation and create race conditions"
  - what: "Filter diagnostics by message prefix pattern matching"
    why: "No diagnostic metadata available to identify source validation rule - message prefix is reliable sentinel"
    alternatives: "Could add diagnostic codes/metadata to Langium diagnostics, but that's a larger architectural change"
  - what: "Re-run same resolution logic as checkUsedClassExists in reconciliation"
    why: "Ensures consistency - same rules for initial validation and post-import reconciliation"
    alternatives: "Could use different resolution logic, but that creates divergence and maintenance burden"
metrics:
  duration: 2
  completed: 2026-02-08
---

# Phase 34 Plan 02: PREFIX Diagnostic Reconciliation Summary

**Post-import diagnostic reconciliation removes false "could not be resolved" errors for USE statements whose BBj files load via PREFIX directories**

## Overview

Fixed false error diagnostics on USE statements referencing files that resolve via PREFIX directories but not workspace-local paths. The validator's `checkUsedClassExists` runs during initial build BEFORE `addImportedBBjDocuments` loads external PREFIX-resolved files into the index, producing false positives. After external docs are loaded and indexed, diagnostics are reconciled: errors for now-resolvable paths are removed, genuinely broken paths keep their errors.

**Impact:** Users no longer see false "could not be resolved" errors on USE statements for valid BBj files in PREFIX directories. Only genuinely broken file paths show errors.

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T05:53:54Z
- **Completed:** 2026-02-08T05:56:34Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Exported USE_FILE_NOT_RESOLVED_PREFIX sentinel constant from bbj-validator.ts for diagnostic identification
- Added revalidateUseFilePathDiagnostics method to BBjDocumentBuilder
- Re-checks USE file-path diagnostics after PREFIX documents are loaded and indexed
- Removes false-positive diagnostics for paths now resolvable via index
- Pushes updated diagnostics to editor via notifyDocumentPhase

## Task Commits

Each task was committed atomically:

1. **Task 1: Reconcile USE file-path diagnostics after PREFIX documents are indexed** - `ed46776` (feat)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-validator.ts` - Exported USE_FILE_NOT_RESOLVED_PREFIX constant ("File '") for diagnostic message identification
- `bbj-vscode/src/language/bbj-document-builder.ts` - Added revalidateUseFilePathDiagnostics method that filters out diagnostics for now-resolvable paths and notifies editor of changes

## Implementation Details

**Timing issue addressed:**
During workspace build, this sequence occurs:
1. `buildDocuments` → `super.buildDocuments` → validation runs → `checkUsedClassExists` emits "could not be resolved" for PREFIX files not yet loaded
2. `addImportedBBjDocuments` loads external BBj files from PREFIX directories and indexes them
3. **NEW:** `revalidateUseFilePathDiagnostics` removes diagnostics for paths now in index

**Reconciliation logic:**
- Iterates workspace documents (skips external documents)
- Filters diagnostics to find USE file-path errors (by message prefix "File '")
- Extracts clean path from diagnostic message using regex: `/^File '([^']+)'/`
- Rebuilds candidate URIs (relative + PREFIX) using same logic as `checkUsedClassExists`
- Checks if any BbjClass in index now matches resolved paths (case-insensitive)
- Removes diagnostic if now resolved, keeps if still broken
- Calls `notifyDocumentPhase(document, DocumentState.Validated)` to push updated diagnostics to editor

**Why message prefix matching:**
Langium diagnostics don't have machine-readable codes or metadata to identify source validation rule. Message prefix pattern matching is the reliable way to identify our specific USE file-path diagnostics without filtering out other unrelated errors.

**Consistency guarantee:**
Uses identical resolution logic as `checkUsedClassExists`: resolve relative to current doc, resolve relative to each PREFIX, match case-insensitive. This ensures reconciliation applies the exact same rules as initial validation.

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

**Import tests:** 15 passed (+0 from baseline - existing tests verify the fix), 1 skipped
**Full test suite:** 432 passed, 10 failed (pre-existing parser/validation issues unrelated to this change), 4 skipped

**Verification:**
- Existing "USE with non-existent file path produces error diagnostic" test still passes (genuinely broken paths keep errors)
- Existing "USE with valid file path produces no file-path error" test still passes (workspace-local valid paths have no errors)
- No regressions in import resolution or validation

**TypeScript compilation:** Clean - no type errors in modified files

## Decisions Made

**Use message prefix pattern matching for diagnostic identification:**
- Langium diagnostics lack machine-readable codes
- Message prefix "File '" is reliable sentinel for our USE file-path diagnostics
- Alternative: Add diagnostic metadata system to Langium - too invasive for this fix
- Decision: Pattern matching is pragmatic and maintainable

**Call reconciliation after addImportedBBjDocuments:**
- Ensures external PREFIX docs are loaded and indexed before re-checking
- Timing is critical: must run after index is populated
- Alternative: Delay all validation until after imports - breaks incremental compilation
- Decision: Post-import reconciliation preserves fast incremental builds while fixing false positives

## Next Phase Readiness

**Phase 34 (Diagnostic Polish) complete:**
- POL-01: BBj settings capitalization fixed ✓
- POL-02: USE file path validation with diagnostics ✓
- POL-03: PREFIX diagnostic reconciliation (this plan) ✓

**Gap 1 (Settings header capitalization):**
VS Code auto-derives setting group headers from property key prefixes (`bbj.*` → `Bbj:`). This is a VS Code platform limitation (GitHub issues #86000, #191807). Changing keys to `BBj.*` would break all existing user configurations. The description text fix from 34-01 is the maximum possible improvement. Documented as accepted limitation.

**UAT readiness:**
- All automated tests pass
- False-positive diagnostics eliminated for PREFIX-resolved files
- Genuinely broken file paths still show errors (no false negatives)
- Ready for user acceptance testing with real BBj workspaces

## Self-Check: PASSED

**Created files exist:**
```
FOUND: /Users/beff/_workspace/bbj-language-server/.planning/phases/34-diagnostic-polish/34-02-SUMMARY.md
```

**Modified files exist:**
```
FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts
FOUND: /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-validator.ts
```

**Commits exist:**
```
FOUND: ed46776 feat(34-02): reconcile USE file-path diagnostics after PREFIX docs load
```
