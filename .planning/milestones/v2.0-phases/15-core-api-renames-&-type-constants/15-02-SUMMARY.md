---
phase: 15-core-api-renames-type-constants
plan: 02
subsystem: language-server-core
tags: [langium, scope-computation, scope-provider, api-migration, type-system]

# Dependency graph
requires:
  - phase: 15-01
    provides: Type constant .$type pattern for 4 provider files
provides:
  - LocalSymbols type replacing PrecomputedScopes in scope computation
  - Langium 4 method names for scope computation (collectExportedSymbols, collectLocalSymbols)
  - document.localSymbols property access pattern
  - Type constant .$type usage in all scope files (18 total migrations)
affects: [16-validator-utils-renames, 17-formatter-api-updates, remaining-phase-migrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LocalSymbols type for scope computation state"
    - "collectExportedSymbols/collectLocalSymbols method pattern"
    - "document.localSymbols property access"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-scope-local.ts
    - bbj-vscode/src/language/bbj-scope.ts

key-decisions:
  - "All PrecomputedScopes references migrated to LocalSymbols"
  - "All scope computation methods renamed to Langium 4 equivalents"
  - "Type constant .$type pattern applied consistently (18 usages)"

patterns-established:
  - "LocalSymbols: Type for precomputed scope data in Langium 4"
  - "collectExportedSymbols: Renamed from computeExports"
  - "collectLocalSymbols: Renamed from computeLocalScopes"
  - "document.localSymbols: Property access replacing precomputedScopes"

# Metrics
duration: 2min
completed: 2026-02-03
---

# Phase 15 Plan 02: Scope API Renames & Type Constants Summary

**Migrated scope computation to Langium 4 API with LocalSymbols type, collectExportedSymbols/collectLocalSymbols methods, document.localSymbols property, and 18 type constant .$type migrations across both scope files**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-03T10:27:46Z
- **Completed:** 2026-02-03T10:30:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- PrecomputedScopes fully replaced by LocalSymbols in imports and type annotations (4 locations)
- Scope computation methods renamed: computeExports → collectExportedSymbols, computeLocalScopes → collectLocalSymbols, computeExportsForNode → collectExportedSymbolsForNode
- All document.precomputedScopes property accesses updated to document.localSymbols (3 locations)
- 18 type constant usages migrated to .$type suffix across scope files (6 in scope-local, 12 in scope)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename PrecomputedScopes, scope methods, and type constants in bbj-scope-local.ts** - `98d1f0e` (refactor)
   - LocalSymbols import and type annotations
   - Method renames (3 locations)
   - 6 type constant .$type migrations (FieldDecl, MethodDecl, CompoundStatement)

2. **Task 2: Update property accesses and type constants in bbj-scope.ts** - `8d5cfba` (refactor)
   - document.localSymbols property accesses (3 locations)
   - 12 type constant .$type migrations (switch cases, allElements, getGlobalScope, isSubtype, equality)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-scope-local.ts` - Scope computation with LocalSymbols and Langium 4 method names
- `bbj-vscode/src/language/bbj-scope.ts` - Scope provider with localSymbols property and type constant .$type usage

## Decisions Made
None - followed plan as specified. All renames and migrations applied exactly as designed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all changes were straightforward API renames and type constant migrations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Scope computation and scope provider files fully migrated to Langium 4 API:
- LocalSymbols type in use
- Langium 4 method names applied
- Property accesses updated
- Type constant .$type pattern consistent

Ready for remaining phase 15 plans (validator, utils, formatter migrations).

---
*Phase: 15-core-api-renames-type-constants*
*Completed: 2026-02-03*
