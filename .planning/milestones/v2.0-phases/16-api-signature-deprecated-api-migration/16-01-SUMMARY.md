---
phase: 16-api-signature-deprecated-api-migration
plan: 01
subsystem: api
tags: [langium, typescript, completion, linker, migration]

# Dependency graph
requires:
  - phase: 15-core-api-renames-type-constants
    provides: Langium 4 type system with .$type pattern and LocalSymbols
provides:
  - Completion provider with Langium 4 three-parameter signature
  - Linker with Reference/MultiReference union type handling
  - Clean deprecated API audit (zero pre-v3 API usages)
affects: [17-compilation-verification, 18-integration-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reference type guards using isReference for union type safety"
    - "Completion provider override matching Langium 4 signature with ReferenceInfo and CompletionContext"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/src/language/bbj-linker.ts

key-decisions:
  - "Used defensive type guard for MultiReference at top of getCandidate (BBj only uses single references)"
  - "Prefixed unused parameters with underscore (_refInfo, _context) following TypeScript convention"

patterns-established:
  - "Override methods must match exact Langium 4 signatures including new required parameters"
  - "Type guards (isReference) preferred over type assertions for union type safety"

# Metrics
duration: 1min
completed: 2026-02-03
---

# Phase 16 Plan 01: API Signature & Deprecated API Migration Summary

**Completion provider and linker updated to Langium 4 API signatures with Reference union type guards and zero deprecated API usages**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-03T11:12:25Z
- **Completed:** 2026-02-03T11:13:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated createReferenceCompletionItem override to accept three parameters (nodeDescription, ReferenceInfo, CompletionContext)
- Added isReference type guard in linker to handle Reference | MultiReference union type safely
- Verified prepareLangiumParser usage remains valid (no changes needed to bbj-module.ts)
- Completed deprecated API audit: zero usages of findDeclaration, getLocalScopes, or getExportedElements

## Task Commits

Each task was committed atomically:

1. **Task 1: Update completion provider signature for Langium 4** - `d1d7405` (feat)
2. **Task 2: Add Reference union type guards to linker and audit for deprecated APIs** - `8dfdaff` (feat)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-completion-provider.ts` - Updated createReferenceCompletionItem to match Langium 4 signature with ReferenceInfo and CompletionContext parameters
- `bbj-vscode/src/language/bbj-linker.ts` - Added isReference type guard at top of getCandidate for defensive MultiReference handling

## Decisions Made
- Used underscore prefix (_refInfo, _context) for parameters forwarded to super but not used in override
- Added defensive early-return for MultiReference cases even though BBj only uses single references (future-proofing)
- Confirmed prepareLangiumParser in bbj-module.ts requires no changes (valid as-is per RESEARCH.md)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four targeted API signature changes complete: MIGR-04, MIGR-05, MIGR-06, MIGR-08 resolved
- Zero deprecated API usages remain in codebase
- Ready for Phase 17: Compilation Verification to confirm TypeScript build passes
- Reference type guard pattern established for future union type handling

---
*Phase: 16-api-signature-deprecated-api-migration*
*Completed: 2026-02-03*
