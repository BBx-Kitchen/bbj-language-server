---
phase: 14-deps-grammar
plan: 01
subsystem: build
tags: [langium, chevrotain, typescript, code-generation]

# Dependency graph
requires:
  - phase: 13-marketplace
    provides: Stable v1.2 release with Langium 3.2.x baseline
provides:
  - Langium 4.1.3 runtime and langium-cli 4.1.0 installed
  - Clean dependency tree with single chevrotain 11.0.3 instance
  - Generated AST/grammar/module files using Langium 4 patterns
  - Baseline for Phase 15-18 source code migration
affects: [15-type-system, 16-services, 17-validation, 18-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Langium 4 type constants use object form: { $type: 'TypeName', ... }"
    - "Generated files remain gitignored (regenerated via npm prepare)"

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/package-lock.json
    - bbj-vscode/src/language/generated/ast.ts (gitignored, regenerated)
    - bbj-vscode/src/language/generated/grammar.ts (gitignored, regenerated)
    - bbj-vscode/src/language/generated/module.ts (gitignored, regenerated)

key-decisions:
  - "Kept tilde version ranges (~4.1.3, ~4.1.0) consistent with project convention"
  - "Generated files remain gitignored - correct build-time generation approach"
  - "Did not modify any other dependencies - minimal risk upgrade"

patterns-established:
  - "Langium 4 type constant pattern: export const TypeName = { $type: 'TypeName', property: 'property', ... }"
  - "Atomic commits per task with verification steps documented"

# Metrics
duration: 2min
completed: 2026-02-03
---

# Phase 14 Plan 01: Dependency Update & Grammar Regeneration Summary

**Langium 4.1.3 runtime and CLI installed cleanly, grammar regenerated with new type constant pattern, 77 hand-written source errors deferred to Phase 15**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-03T09:42:32Z
- **Completed:** 2026-02-03T09:44:34Z
- **Tasks:** 2
- **Files modified:** 2 (tracked), 3 (gitignored generated)

## Accomplishments
- Updated langium from ~3.2.1 to ~4.1.3 and langium-cli from ~3.2.0 to ~4.1.0
- Verified clean dependency tree with single chevrotain 11.0.3 instance (no duplicates)
- Regenerated grammar with zero errors, documented new Langium 4 type constant pattern
- Confirmed generated files compile cleanly (zero TypeScript errors in generated/)
- Documented 77 TypeScript errors in hand-written source for Phase 15 scoping

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Langium packages and verify dependency tree** - `edcb59d` (chore)

Task 2 (grammar regeneration) produced no tracked file changes as generated files are properly gitignored and regenerated during build.

## Files Created/Modified
- `bbj-vscode/package.json` - Updated langium to ~4.1.3, langium-cli to ~4.1.0
- `bbj-vscode/package-lock.json` - Resolved dependency tree with Langium 4 packages
- `bbj-vscode/src/language/generated/ast.ts` - Regenerated with Langium 4 type constant pattern (gitignored)
- `bbj-vscode/src/language/generated/grammar.ts` - Regenerated serialized grammar (gitignored)
- `bbj-vscode/src/language/generated/module.ts` - Regenerated DI module (gitignored)

## Decisions Made

**Package versions:**
- Used tilde ranges (~4.1.3, ~4.1.0) to match project convention
- Kept chevrotain at ~11.0.3 (already compatible with Langium 4.1.x)
- Did not update typescript, esbuild, or other dependencies (minimal risk approach)

**Generated files:**
- Verified generated files are gitignored (correct - they're regenerated via `npm run prepare`)
- No commit needed for Task 2 as no tracked files changed
- Generation verified through successful command execution and file inspection

**Grammar changes:**
- No grammar syntax changes required
- Single warning about parser rule consuming no input (pre-existing, non-blocking)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All verification criteria passed on first attempt:
- DEPS-01: langium 4.1.3 installed ✓
- DEPS-02: langium-cli 4.1.0 installed ✓
- DEPS-03: Single chevrotain 11.0.3 instance ✓
- DEPS-04: No peer dependency conflicts ✓
- GRAM-01: langium generate succeeded ✓
- GRAM-02: Generated files compile cleanly ✓
- GRAM-03: Grammar files unchanged ✓

## New Langium 4 Type Constant Pattern

**Critical for Phase 15:** Langium 4 changed type constants from strings to objects.

**Old pattern (Langium 3):**
```typescript
export const MethodDecl = 'MethodDecl'
```

**New pattern (Langium 4):**
```typescript
export const MethodDecl = {
    $type: 'MethodDecl',
    array: 'array',
    body: 'body',
    // ... all property names as string literals
}
```

**Impact:** Hand-written code comparing types with `node.$type === MethodDecl` now compares to an object instead of a string. Phase 15 must update to `node.$type === MethodDecl.$type` or `is(node, MethodDecl)`.

## Hand-written Source Errors

**Documented for Phase 15 scoping:**
- Total TypeScript errors: 77
- All errors are in hand-written source (none in generated/)
- Expected error categories:
  - Type constant comparisons (string vs object)
  - Removed/renamed Langium 3 APIs
  - Module import changes
  - ValidationCheck type changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 15 (Type System Migration):**
- Langium 4 packages installed and verified
- Generated code compiles cleanly
- New type constant pattern documented
- Error count established (77 errors to fix)

**No blockers or concerns.**

**Next step:** Phase 15 will fix type constant comparisons, update validation checks, and resolve the 77 TypeScript errors in hand-written source.

---
*Phase: 14-deps-grammar*
*Completed: 2026-02-03*
