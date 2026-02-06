---
phase: 25-type-resolution-crash-fixes
plan: 05
subsystem: language-server
tags: [langium, completion, scope, error-handling, typescript]

# Dependency graph
requires:
  - phase: 25-type-resolution-crash-fixes
    provides: UAT test suite (25-04) identifying accessor completion and USE crash gaps
provides:
  - Implicit accessor completion with return type and parentheses matching regular methods
  - Defensive guards preventing server crash on unnamed VariableDecl nodes
  - Silent JSDoc parse error handling for complex Java documentation
affects: [completion, hover, scope-computation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FunctionNodeDescription with parameters/returnType for consistent method-like completion formatting"
    - "Defensive undefined-name guards in scope computation and description providers"
    - "Silent fallthrough for JSDoc parse failures on complex Java docs"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-scope-local.ts
    - bbj-vscode/src/language/bbj-nodedescription-provider.ts
    - bbj-vscode/src/language/bbj-hover.ts

key-decisions:
  - "Return FunctionNodeDescription from createAccessorDescription for completion parity with regular methods"
  - "Guard node.name in processNode VariableDecl branch to prevent crashes from unresolvable USE statements"
  - "Silence JSDoc parse errors rather than console.warn for non-actionable Java doc parsing failures"

patterns-established:
  - "isFunctionNodeDescription check: description must have 'parameters' and 'returnType' fields"
  - "Getters: parameters=[], returnType=field type; Setters: parameters=[{name:'value', type:fieldType}], returnType=''"
  - "Belt-and-suspenders: guard at call site AND in provider for undefined name handling"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 25 Plan 05: Gap Closure Summary

**Implicit getter/setter completion now shows return type and parentheses like regular methods; server no longer crashes on USE with unresolvable classes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T19:28:49Z
- **Completed:** 2026-02-06T19:30:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implicit accessor completion displays with parentheses and return type (e.g., `getName(): BBjString`, `setName(value): void`)
- Server handles unnamed VariableDecl nodes from unresolvable USE statements without crashing
- JSDoc parse failures on complex Java documentation (e.g., HashMap) no longer produce console noise

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix implicit accessor completion to show return type and parentheses** - `5568da9` (feat)
2. **Task 2: Guard against undefined name in scope computation and reduce JSDoc noise** - `fc8af2a` (fix)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-scope-local.ts` - Changed createAccessorDescription to return FunctionNodeDescription with parameters and returnType; added node.name guard in processNode
- `bbj-vscode/src/language/bbj-nodedescription-provider.ts` - Added undefined name guard in createDescription override
- `bbj-vscode/src/language/bbj-hover.ts` - Silenced JSDoc parse warnings in tryParseJavaDoc

## Decisions Made

**1. Return FunctionNodeDescription from createAccessorDescription**
- Rationale: The completion provider's `isFunctionNodeDescription()` check requires both `parameters` and `returnType` fields to format as method with parentheses. Plain AstNodeDescription lacks these fields, causing accessors to display as bare names.
- Implementation: Getters get `parameters: []` and `returnType: fieldType`; setters get `parameters: [{name: 'value', type: fieldType}]` and `returnType: ''` (void convention)

**2. Guard node.name at both call site and provider**
- Rationale: Parse errors from unresolvable USE statements can produce VariableDecl nodes with undefined name. Belt-and-suspenders defense prevents crashes even if future callers forget to check.
- Implementation: Added `&& node.name` check in bbj-scope-local.ts processNode; added early return in BBjAstNodeDescriptionProvider.createDescription

**3. Silence JSDoc parse warnings**
- Rationale: Complex Java documentation (HashMap, etc.) produces expected parse failures. These are non-actionable and only create noise in output.
- Implementation: Replaced `console.warn(error)` with silent fallthrough to raw comment text

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

UAT gaps from phase 25 are now closed:
- Implicit accessor completion matches regular method presentation
- Server handles malformed nodes defensively
- Console output is cleaner (no JSDoc noise)

All 18 pre-existing test failures remain unchanged (expected baseline).

## Self-Check: PASSED

---
*Phase: 25-type-resolution-crash-fixes*
*Completed: 2026-02-06*
