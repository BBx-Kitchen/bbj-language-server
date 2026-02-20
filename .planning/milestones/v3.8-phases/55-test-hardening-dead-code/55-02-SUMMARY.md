---
phase: 55-test-hardening-dead-code
plan: "02"
subsystem: testing
tags: [dead-code, type-inferer, validator, cast, langium]

# Dependency graph
requires:
  - phase: 55-test-hardening-dead-code-01
    provides: Confirmed DEAD-01/DEAD-02 are unreachable since Phase 33 introduced CastExpression grammar rule
provides:
  - bbj-type-inferer.ts without unreachable MethodCall CAST branch
  - bbj-validator.ts without dead checkCastTypeResolvable method and registration
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead code identified by grammar-level construct superseding legacy call-based pattern"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-type-inferer.ts
    - bbj-vscode/src/language/bbj-validator.ts

key-decisions:
  - "Removed MethodCall CAST branch from type-inferer — CastExpression grammar rule handles all CAST since Phase 33; branch is unreachable"
  - "Removed checkCastTypeResolvable validator — redundant with checkCastExpressionTypeResolvable; MethodCall CAST path can never be triggered"
  - "Retained isArrayElement import in bbj-validator.ts — still used in live checkExceptClause (line 70)"
  - "Retained BbjClass import in bbj-validator.ts — used by checkUsedClassExists added in Phase 54"

patterns-established: []

requirements-completed:
  - DEAD-01
  - DEAD-02

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 55 Plan 02: Dead Code Removal — MethodCall CAST Branches Summary

**Deleted 65 lines of unreachable MethodCall CAST dead code from type-inferer and validator; all 501 tests pass clean**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T11:36:09Z
- **Completed:** 2026-02-20T11:38:08Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Removed `isMethodCall` CAST branch (22 lines) from `bbj-type-inferer.ts` — unreachable since Phase 33 introduced `CastExpression` grammar rule
- Removed `checkCastTypeResolvable` method (37 lines) and its registration from `bbj-validator.ts` — superseded by `checkCastExpressionTypeResolvable`
- Cleaned up `isMethodCall`, `isLibFunction` from `bbj-type-inferer.ts` imports; `MethodCall`, `isLibFunction` from `bbj-validator.ts` imports
- All 501 tests pass; TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify dead code status and remove MethodCall CAST branches** - `9178757` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-type-inferer.ts` - Removed dead `isMethodCall` CAST branch (lines 88-109) and unused `isMethodCall`/`isLibFunction` imports
- `bbj-vscode/src/language/bbj-validator.ts` - Removed dead `checkCastTypeResolvable` method and registration, removed `MethodCall`/`isLibFunction` imports

## Decisions Made
- Retained `isArrayElement` in `bbj-validator.ts` imports — the live `checkExceptClause` method on line 70 uses it, not just the dead `checkCastTypeResolvable`
- Retained `BbjClass` import — actively used by `checkUsedClassExists` added in Phase 54

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DEAD-01 and DEAD-02 requirements satisfied
- Phase 55 dead code removal complete; proceed to Phase 56 (FIX-01/FIX-02 ambiguity resolution)

## Self-Check: PASSED

All artifacts verified:
- `bbj-vscode/src/language/bbj-type-inferer.ts` - exists, dead branch removed
- `bbj-vscode/src/language/bbj-validator.ts` - exists, dead method removed
- `.planning/phases/55-test-hardening-dead-code/55-02-SUMMARY.md` - exists
- Commit `9178757` - confirmed in git log

---
*Phase: 55-test-hardening-dead-code*
*Completed: 2026-02-20*
