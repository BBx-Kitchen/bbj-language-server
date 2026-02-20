---
phase: 27-ide-polish
plan: 01
subsystem: language-server
tags: [langium, lsp, vscode, symbol-kind, completion, structure-view, menu-scoping]

# Dependency graph
requires:
  - phase: 25-type-resolution
    provides: bbj-hover.ts, bbj-scope.ts, bbj-linker.ts for type resolution
provides:
  - Differentiated SymbolKind and CompletionItemKind mappings for Structure View and completion popups
  - Run icon scoping limited to BBj file types (.bbj, .bbl, .bbx, .src), excluding .bbjt
  - Fixed language registration for .bbx extension
affects: [27-02, 27-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LSP SymbolKind.Key for labels, SymbolKind.Variable for variables/fields, SymbolKind.Method for methods"
    - "VS Code when clause with resourceExtname exclusion for file type scoping"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-node-kind.ts
    - bbj-vscode/package.json
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/bbj-linker.ts

key-decisions:
  - "Labels use SymbolKind.Key / CompletionItemKind.Keyword (Claude's discretion per user constraint)"
  - "Variables and fields both use SymbolKind.Variable (per user decision: they share the same kind)"
  - "Methods use SymbolKind.Method, DEF FN functions use SymbolKind.Function (visually distinguished per user decision)"
  - ".bbjt files excluded from run icons via resourceExtname != .bbjt in when clause"

patterns-established:
  - "Distinct SymbolKind per AST node type in getSymbolKind() mirrors CompletionItemKind in getCompletionItemKind()"
  - "When clauses combine language ID and extension checks for precise file type scoping"

# Metrics
duration: 6min
completed: 2026-02-06
---

# Phase 27 Plan 01: Symbol Differentiation & Run Icon Scoping Summary

**Structure View and completion popups now show distinct icons for labels (Key), variables/fields (Variable), methods (Method), and DEF FN functions (Function); run icons scoped to .bbj/.bbl/.bbx/.src only**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-06T21:46:04Z
- **Completed:** 2026-02-06T21:52:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Structure View and completion popups display distinct icons for each BBj symbol type (labels, variables, fields, methods, DEF FN functions) instead of generic Field icon for all
- Run icons (GUI/BUI/DWC) appear only on runnable BBj files (.bbj, .bbl, .bbx, .src), not on .bbjt test files or non-BBj files
- Fixed .bbx language registration missing dot prefix, ensuring resourceLangId == bbx evaluates correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Differentiate SymbolKind and CompletionItemKind mappings** - `c114470` (feat)
2. **Task 2: Fix run icon scoping to BBj file types only** - `a038ffe` (fix)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-node-kind.ts` - Added distinct SymbolKind/CompletionItemKind mappings for LabelDecl, VariableDecl, FieldDecl, MethodDecl, DefFunction
- `bbj-vscode/package.json` - Fixed .bbx extension registration with dot prefix; updated 9 run command when clauses to exclude .bbjt files
- `bbj-vscode/src/language/bbj-hover.ts` - Fixed unused imports and findDeclarationNodeAtOffset usage (pre-existing build blocker)
- `bbj-vscode/src/language/bbj-scope.ts` - Removed incorrect JavaClass.superclass logic (property doesn't exist in AST)
- `bbj-vscode/src/language/bbj-linker.ts` - Fixed unused imports (pre-existing build blocker)

## Decisions Made
- Labels use SymbolKind.Key (Claude's discretion): semantically closest to labels/line references
- Labels use CompletionItemKind.Keyword for completion popups (CompletionItemKind has no Key equivalent)
- Variables and fields share SymbolKind.Variable per user decision (# prefix on fields is sufficient to distinguish)
- Methods changed from SymbolKind.Function to SymbolKind.Method per user decision (visual distinction from DEF FN)
- .bbjt files excluded via `resourceExtname != .bbjt` in when clause, preserving language intelligence while hiding run icons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed incorrect JavaClass.superclass logic in bbj-scope.ts**
- **Found during:** Task 1 build verification
- **Issue:** Code attempted to access JavaClass.superclass property, which doesn't exist in the AST. JavaClass interface (line 1249 of generated/ast.ts) has no superclass field. java-interop doesn't provide superclass information.
- **Fix:** Removed lines 373-379 attempting superclass traversal; left comment noting limitation
- **Files modified:** bbj-vscode/src/language/bbj-scope.ts
- **Verification:** Build succeeds with no TypeScript errors
- **Committed in:** c114470 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed unused imports in bbj-hover.ts**
- **Found during:** Task 1 build verification
- **Issue:** TypeScript compilation failed due to unused imports: AstUtils, findDeclarationNodeAtOffset (non-existent export), LangiumServices, BbjClass, getClass
- **Fix:** Removed unused imports; replaced findDeclarationNodeAtOffset with findLeafNodeAtOffset from bbj-validator.ts
- **Files modified:** bbj-vscode/src/language/bbj-hover.ts
- **Verification:** Build succeeds with no TypeScript errors
- **Committed in:** c114470 (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed unused imports in bbj-linker.ts**
- **Found during:** Task 1 build verification
- **Issue:** TypeScript compilation failed due to unused import: dirname, relative from 'path'
- **Fix:** Removed unused import line (line 14 had been changed from 'path' to 'node:path' but then the usage was removed)
- **Files modified:** bbj-vscode/src/language/bbj-linker.ts
- **Verification:** Build succeeds with no TypeScript errors
- **Committed in:** c114470 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes were necessary to unblock build compilation. Pre-existing errors from phase 25 left the codebase in a non-compilable state. No scope creep.

## Issues Encountered
- Pre-existing build errors from phase 25 blocked Task 1 completion until fixed (JavaClass.superclass bug, unused imports)
- Edit tool failed to apply changes to package.json; switched to sed for reliable file modification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Symbol differentiation complete, ready for field completion trigger implementation (plan 27-02)
- Run icon scoping complete, no blockers
- Build verified successful, all TypeScript compilation errors resolved

---
*Phase: 27-ide-polish*
*Completed: 2026-02-06*

## Self-Check: PASSED
