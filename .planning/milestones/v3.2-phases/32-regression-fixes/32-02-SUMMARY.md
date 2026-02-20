---
phase: 32-regression-fixes
plan: 02
subsystem: lsp
tags: [langium, definition-provider, navigation, use-statement, go-to-definition]

# Dependency graph
requires:
  - phase: 32-regression-fixes
    provides: Built-in BBjAPI class (plan 01)
provides:
  - Custom DefinitionProvider for enhanced USE statement navigation
  - BbjClass navigation jumps to class name declaration, not file start
  - Test coverage for go-to-definition behavior
affects: [33-manual-verification, future-lsp-features]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Custom LSP provider pattern - extend DefaultDefinitionProvider and override collectLocationLinks"]

key-files:
  created:
    - bbj-vscode/src/language/bbj-definition-provider.ts
    - bbj-vscode/test/definition.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts

key-decisions:
  - "Override collectLocationLinks (not getDefinition) to preserve Langium's reference resolution pipeline"
  - "Use nameProvider.getNameNode() to find exact class name CST node for precise navigation"
  - "Test with inline class references rather than cross-file USE statements (simpler test environment)"

patterns-established:
  - "LSP provider customization: extend Default[Provider], override specific methods, register in BBjModule.lsp"
  - "For BbjClass targets, navigate to class name node using nameProvider.getNameNode()"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 32 Plan 02: USE Statement Navigation Summary

**Custom DefinitionProvider navigates Ctrl-click on USE statement class names to exact class declaration line via nameProvider.getNameNode()**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T17:34:47Z
- **Completed:** 2026-02-07T17:37:36Z
- **Tasks:** 2
- **Files modified:** 2 (created 2 new files)

## Accomplishments

- BBjDefinitionProvider extends DefaultDefinitionProvider to enhance USE statement navigation
- For BbjClass references (USE ::filename.bbj::ClassName), Ctrl-click navigates to the specific class name line, not file start
- Default navigation behavior preserved for all non-BbjClass targets (variables, methods, etc.)
- Test coverage verifies DefinitionProvider registration and BbjClass navigation behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BBjDefinitionProvider with USE statement navigation** - `2e12178` (feat)
2. **Task 2: Add automated tests for USE statement definition navigation** - `b8e8e21` (test)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-definition-provider.ts` - Custom DefinitionProvider that navigates BbjClass references to class name nodes
- `bbj-vscode/test/definition.test.ts` - Tests for go-to-definition on BbjClass references
- `bbj-vscode/src/language/bbj-module.ts` - Registered BBjDefinitionProvider in lsp.DefinitionProvider

## Decisions Made

**Override collectLocationLinks instead of getDefinition:**
- Langium's DefaultDefinitionProvider.getDefinition calls findDeclarationNodeAtOffset then collectLocationLinks
- Reference resolution (via this.references.findDeclarationNodes) happens in findLinks, called from collectLocationLinks
- By overriding collectLocationLinks, we preserve the entire reference resolution pipeline and only customize the LocationLink creation

**Use nameProvider.getNameNode() for precise targeting:**
- BbjClass AST nodes have a $cstNode that covers the entire class declaration (class...classend)
- nameProvider.getNameNode(targetNode) returns the specific CST node for the class name identifier
- This ensures navigation jumps to and highlights the class name line, not the first line of the class block

**Test with inline class references:**
- Cross-file USE statement testing requires PREFIX path resolution in test environment
- Testing with inline class references (new MyClass() in same file as class declaration) validates the core behavior
- The enhancement applies to any BbjClass reference, whether from USE statements or direct references

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready for manual testing (Phase 33):**
- USE statement navigation is now enhanced to jump to class declarations
- Manual verification required in both VS Code and IntelliJ IDEs
- Need to test cross-file USE statements with PREFIX path resolution (not covered by automated tests)

**Blockers/Concerns:**
- Automated tests use inline class references (same file) due to test environment limitations
- Cross-file USE statement navigation (actual user scenario) needs manual verification
- IntelliJ plugin LSP compatibility for LocationLink.targetSelectionRange needs verification

---
*Phase: 32-regression-fixes*
*Completed: 2026-02-07*

## Self-Check: PASSED
