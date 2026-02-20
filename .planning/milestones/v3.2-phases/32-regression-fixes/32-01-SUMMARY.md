---
phase: 32-regression-fixes
plan: 01
subsystem: language-server
tags: [langium, linker, scope, built-in-library, BBjAPI, regression-fix]

# Dependency graph
requires:
  - phase: 26-linker-cpu-regression
    provides: Infinite rebuild loop fix, linker performance stabilization
provides:
  - Built-in BBjAPI class loaded as synthetic document (bbjlib:///bbj-api.bbl)
  - BBjAPI() resolves case-insensitively independent of Java interop service
  - Linker fallback for built-in BbjClass lookup via IndexManager
affects: [33-use-navigation, completion, type-inference, java-interop-optional]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Built-in synthetic class documents using Langium's loadAdditionalDocuments pattern"
    - "Linker fallback mechanism using IndexManager for built-in types"

key-files:
  created:
    - bbj-vscode/src/language/lib/bbj-api.ts
  modified:
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/test/linking.test.ts

key-decisions:
  - "BBjAPI implemented as minimal BbjClass (no methods) - method signatures loaded dynamically by Java interop when available"
  - "Linker fallback checks IndexManager for built-in BbjClass when JavaClass not in scope"
  - "Built-in BBjAPI uses bbjlib:/// URI scheme consistent with other built-in documents"

patterns-established:
  - "Pattern: Built-in types always available via loadAdditionalDocuments, independent of external services"
  - "Pattern: Linker special cases can fall back to IndexManager for guaranteed resolution"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 32 Plan 01: BBjAPI Regression Fix Summary

**Built-in BBjAPI class resolves case-insensitively via synthetic document, independent of Java interop service availability**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-07T17:33:14Z
- **Completed:** 2026-02-07T17:37:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- BBjAPI() now resolves without linker error regardless of Java interop service status
- Case-insensitive BBjAPI access works (BbJaPi(), BBJAPI(), bbjapi())
- Variables assigned from BBjAPI() have type BBjAPI enabling downstream type inference
- Previously skipped BBjAPI test now active and passing with 2 additional regression tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create built-in BBjAPI class and load as synthetic document** - `68565f7` (feat)
2. **Task 2: Fix BBjAPI linking test and add comprehensive regression tests** - `50f24f6` (test)

## Files Created/Modified
- `bbj-vscode/src/language/lib/bbj-api.ts` - Minimal BBjAPI class definition (library document)
- `bbj-vscode/src/language/bbj-ws-manager.ts` - Loads BBjAPI as built-in document via loadAdditionalDocuments
- `bbj-vscode/src/language/bbj-linker.ts` - Added IndexManager reference and fallback for BBjAPI lookup
- `bbj-vscode/test/linking.test.ts` - Unskipped BBjAPI test, added 2 regression tests

## Decisions Made

**1. Minimal class definition**
- Built-in BBjAPI class contains no method signatures
- Rationale: Method signatures come from Java interop when available; built-in only ensures type exists for resolution
- Benefit: No duplication; single source of truth for methods

**2. Linker fallback via IndexManager**
- When scope.getElement('BBjAPI') returns nothing, linker queries IndexManager for BbjClass named 'BBjAPI'
- Rationale: Built-in BbjClass not in default NamedElement scope for method calls; IndexManager provides direct lookup
- Benefit: Minimal scope provider changes; contained logic in linker special case

**3. URI scheme bbjlib:///**
- Used consistent `bbjlib:///bbj-api.bbl` URI for built-in document
- Rationale: Matches existing pattern for functions.bbl, variables.bbl, labels.bbl, events.bbl
- Benefit: Uniform discovery; clear differentiation from workspace documents

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly following Langium's built-in library pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BBjAPI regression (REG-01) is now fixed
- Ready for Phase 32 Plan 02: USE statement navigation regression (REG-02)
- All linker tests pass (within expected pre-existing failure count)
- Built-in library pattern established for future built-in types if needed

---
*Phase: 32-regression-fixes*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files and commits verified:
- bbj-vscode/src/language/lib/bbj-api.ts: FOUND
- Commit 68565f7: FOUND
- Commit 50f24f6: FOUND
