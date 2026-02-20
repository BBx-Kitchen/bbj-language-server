---
phase: 38-diagnostic-filtering
plan: 01
subsystem: diagnostics
tags: [validation, synthetic-files, javadoc, logging, error-aggregation]
completed: 2026-02-08

dependency_graph:
  requires:
    - phase: 37
      plan: 01
      reason: "logger infrastructure for error migration"
  provides:
    - capability: "bbjlib:/ synthetic file filtering"
      for: ["phase-39", "milestone-v3.3"]
    - capability: "javadoc error aggregation"
      for: ["milestone-v3.3"]
  affects:
    - component: "bbj-document-builder"
      impact: "shouldValidate now filters bbjlib:/ scheme URIs"
    - component: "java-javadoc"
      impact: "initialize aggregates errors, uses logger.error"

tech_stack:
  added: []
  patterns:
    - "URI scheme-based filtering for synthetic documents"
    - "Error aggregation with success/failure tracking"
    - "Silent partial success (no warning when at least one source works)"

key_files:
  created: []
  modified:
    - path: "bbj-vscode/src/language/bbj-document-builder.ts"
      lines_changed: "+5"
      summary: "Added bbjlib:/ scheme check to shouldValidate()"
    - path: "bbj-vscode/src/language/java-javadoc.ts"
      lines_changed: "+11/-9"
      summary: "Added error aggregation, migrated console.error to logger.error"
    - path: "bbj-vscode/test/javadoc.test.ts"
      lines_changed: "+87/-8"
      summary: "Added aggregation tests, updated existing test comments"

decisions: []

metrics:
  duration_minutes: 3
  tasks_completed: 2
  commits: 2
  tests_added: 2
  tests_passing: 460 (up from 458)
  tests_failing: 11 (pre-existing, unchanged)
---

# Phase 38 Plan 01: Diagnostic Filtering Summary

**One-liner:** Added bbjlib:/ synthetic file filtering and javadoc error aggregation with single summary warning

## What Was Built

Fixed two diagnostic filtering gaps:

1. **bbjlib:/ scheme filtering (DIAG-01)**: Added URI scheme check in `shouldValidate()` to prevent validation of synthetic files (functions.bbl, variables.bbl, labels.bbl, events.bbl, bbj-api.bbl). Mirrors existing pattern in bbj-index-manager.ts.

2. **Javadoc error aggregation (DIAG-02)**: Replaced per-path error spam with single summary warning only when ALL sources fail. Silent on partial success. Migrated remaining console.error calls to logger.error.

## Implementation Details

### Task 1: bbjlib:/ Scheme Check (Commit da2323c)

Added scheme check in `bbj-document-builder.ts` at line 32, immediately after the existing JavaSyntheticDocUri check:

```typescript
if (_document.uri.scheme === 'bbjlib') {
    // never validate synthetic bbjlib files (functions.bbl, variables.bbl, etc.)
    _document.state = DocumentState.Validated;
    return false;
}
```

This ensures consistency with bbj-index-manager.ts (line 15) which uses the same pattern.

**Files modified:**
- bbj-vscode/src/language/bbj-document-builder.ts (+5 lines)

**Impact:** Parse errors from functions.bbl, variables.bbl, labels.bbl, events.bbl, bbj-api.bbl are now suppressed. Existing classpath:/bbj.bbl filtering unchanged.

### Task 2: Javadoc Error Aggregation (Commit ed63217)

Added success/failure tracking in `initialize()` method:

- Track `failedRoots` array and `successCount` counter
- Add failed root to array in catch block (line 57)
- Increment `successCount` after successful directory scan (line 73)
- Emit single `logger.warn()` only when `successCount === 0 && failedRoots.length > 0`
- Update logger.info to show source count: "initialized with X packages from Y source(s)"

Migrated console.error to logger.error in `loadJavadocFile()`:
- Line 154: package name mismatch error
- Line 160: failed to load file error

**Files modified:**
- bbj-vscode/src/language/java-javadoc.ts (+11/-9 lines)
- bbj-vscode/test/javadoc.test.ts (+87/-8 lines)

**Tests added:**
1. "initialize shows no per-path errors, only summary warning when all fail" - verifies aggregated warning when all roots fail
2. "initialize shows no warning when at least one source succeeds" - verifies silent partial success

**Impact:** Users see single summary warning when ALL javadoc sources fail, no warning when at least one succeeds. Zero console.error calls remain in java-javadoc.ts.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All success criteria met:

- [x] shouldValidate() returns false for bbjlib:/ scheme documents, setting DocumentState.Validated
- [x] Javadoc initialize() emits zero warnings when any source succeeds
- [x] Javadoc initialize() emits single summary warning when all sources fail
- [x] loadJavadocFile() uses logger.error() not console.error()
- [x] All tests pass (existing + new): 460 passing (up from 458), 11 pre-existing failures unchanged
- [x] No regressions in full test suite
- [x] Pattern consistency: both bbj-document-builder.ts and bbj-index-manager.ts use `scheme === 'bbjlib'`

## Testing

**Test suite results:**
- Total tests: 474 (3 skipped)
- Passing: 460 (+2 new javadoc aggregation tests)
- Failing: 11 (pre-existing failures in validation.test.ts, parser.test.ts, classes.test.ts, completion-test.test.ts, imports.test.ts - noted in plan as unrelated)

**New tests:**
1. Javadoc aggregation - total failure scenario (single summary warning)
2. Javadoc aggregation - partial success scenario (silent, no warning)

**Existing tests:**
- All existing javadoc tests still pass (console.error spy still works since logger.error delegates)
- No regressions introduced

## Next Steps

Plan complete. Ready for Phase 38 Phase-level verification and STATE.md update.

**Milestone v3.3 Progress:**
- Phase 35 (Logger Infrastructure): Complete
- Phase 36 (Settings Plumbing): Complete
- Phase 37 (Console Migration): Complete
- Phase 38 (Diagnostic Filtering): Plan 01 complete (1/1)
- Phase 39 (Parser Diagnostics): Pending

## Self-Check: PASSED

Created files verification:
- .planning/phases/38-diagnostic-filtering/38-01-SUMMARY.md: CREATED (this file)

Modified files verification:
```bash
[ -f "/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts" ] && echo "FOUND: bbj-document-builder.ts" || echo "MISSING"
# FOUND: bbj-document-builder.ts

[ -f "/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/java-javadoc.ts" ] && echo "FOUND: java-javadoc.ts" || echo "MISSING"
# FOUND: java-javadoc.ts

[ -f "/Users/beff/_workspace/bbj-language-server/bbj-vscode/test/javadoc.test.ts" ] && echo "FOUND: javadoc.test.ts" || echo "MISSING"
# FOUND: javadoc.test.ts
```

Commit verification:
```bash
git log --oneline --all | grep -q "da2323c" && echo "FOUND: da2323c" || echo "MISSING"
# FOUND: da2323c

git log --oneline --all | grep -q "ed63217" && echo "FOUND: ed63217" || echo "MISSING"
# FOUND: ed63217
```

All files and commits verified.
