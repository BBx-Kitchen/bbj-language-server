---
phase: 53-bbjcpl-diagnostic-integration
plan: 01
subsystem: diagnostics
tags: [bbj, bbjcpl, diagnostics, compiler, lsp, langium]

# Dependency graph
requires:
  - phase: 52-bbjcpl-foundation
    provides: parseBbjcplOutput() parser with 'BBj Compiler' source label and BBjCPLService DI registration

provides:
  - Source label 'BBjCPL' on all BBjCPL parser output diagnostics
  - DiagnosticTier.BBjCPL = 3 in diagnostic hierarchy enum
  - getDiagnosticTier() BBjCPL branch (source === 'BBjCPL')
  - applyDiagnosticHierarchy() Rule 0: suppress Langium parse errors when BBjCPL errors present
  - mergeDiagnostics() exported function for Plan 02 buildDocuments() integration
  - bbj.compiler.trigger setting (debounced/on-save/off, default: debounced)
  - getCompilerTrigger()/setCompilerTrigger() module-level state in bbj-document-validator.ts
  - Trigger propagation: initializationOptions → setCompilerTrigger in bbj-ws-manager.ts
  - Trigger propagation: onDidChangeConfiguration → setCompilerTrigger in main.ts
  - notifyBbjcplAvailability() LSP notification function for CPL-08 prep

affects:
  - 53-02: depends on mergeDiagnostics() and getCompilerTrigger() for buildDocuments() integration
  - extension client: reads bbj.compiler.trigger setting and sends via initializationOptions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level state with getter/setter pattern for server configuration (matches setSuppressCascading/setMaxErrors pattern)
    - DiagnosticTier const enum for priority-based diagnostic suppression hierarchy
    - Source label string matching for diagnostic classification ('BBjCPL' sentinel)

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-cpl-parser.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/package.json
    - bbj-vscode/test/cpl-parser.test.ts

key-decisions:
  - "setCompilerTrigger/getCompilerTrigger defined in bbj-document-validator.ts (not main.ts) to avoid circular imports with bbj-ws-manager.ts"
  - "DiagnosticTier.BBjCPL = 3 as highest tier — Rule 0 suppresses Langium parse errors (not all Langium diagnostics) when BBjCPL errors present; Rule 2 still naturally suppresses warnings since BBjCPL diags are Error severity"
  - "mergeDiagnostics(): same-line match keeps Langium message but stamps source='BBjCPL' (compiler confirmation); BBjCPL-only errors added directly; Langium-only unchanged"
  - "notifyBbjcplAvailability() uses deduplication guard (bbjcplAvailableState) to avoid sending repeated notifications with same value"

patterns-established:
  - "Module-level config state in bbj-document-validator.ts: all server config setters co-located (setSuppressCascading, setMaxErrors, setCompilerTrigger)"
  - "Trigger setting wired at both startup (initializationOptions) and runtime (onDidChangeConfiguration) — same pattern as suppressCascading/maxErrors"

requirements-completed: [CPL-05, CPL-06, CPL-07]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 53 Plan 01: BBjCPL Diagnostic Integration — Data Model & Configuration Summary

**BBjCPL source label rename, tier-3 diagnostic hierarchy with parse-error suppression, mergeDiagnostics() export, and compiler trigger setting wired through initializationOptions and onDidChangeConfiguration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T08:37:50Z
- **Completed:** 2026-02-20T08:39:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Renamed source label from 'BBj Compiler' to 'BBjCPL' throughout parser output and all test assertions (9 tests pass)
- Extended DiagnosticTier enum with BBjCPL = 3 (highest priority); wired getDiagnosticTier() and applyDiagnosticHierarchy() Rule 0 to suppress redundant Langium parse errors when BBjCPL errors exist
- Added exported mergeDiagnostics() function with same-line match logic (Langium message preserved, source stamped 'BBjCPL'; BBjCPL-only errors appended)
- Added bbj.compiler.trigger setting (debounced/on-save/off) to package.json; wired setCompilerTrigger/getCompilerTrigger through both startup (initializationOptions) and runtime (onDidChangeConfiguration) paths
- Added notifyBbjcplAvailability() LSP notification helper with deduplication guard for CPL-08 prep

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename source label and extend diagnostic hierarchy with merge function** - `75ba8c9` (feat)
2. **Task 2: Add trigger setting to package.json and wire through server configuration** - `92128cb` (feat)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-cpl-parser.ts` - Source label changed from 'BBj Compiler' to 'BBjCPL'
- `bbj-vscode/src/language/bbj-document-validator.ts` - DiagnosticTier.BBjCPL = 3, getDiagnosticTier() BBjCPL branch, Rule 0 in applyDiagnosticHierarchy(), exported mergeDiagnostics(), getCompilerTrigger()/setCompilerTrigger()
- `bbj-vscode/src/language/main.ts` - setCompilerTrigger import, onDidChangeConfiguration handler, notifyBbjcplAvailability()
- `bbj-vscode/src/language/bbj-ws-manager.ts` - setCompilerTrigger import and wiring from initializationOptions.compilerTrigger
- `bbj-vscode/package.json` - bbj.compiler.trigger setting with enum [debounced, on-save, off]
- `bbj-vscode/test/cpl-parser.test.ts` - Updated all 4 source assertions from 'BBj Compiler' to 'BBjCPL'

## Decisions Made

- **setCompilerTrigger in bbj-document-validator.ts**: Placed alongside setSuppressCascading/setMaxErrors instead of main.ts to avoid circular import (bbj-ws-manager.ts imports from bbj-document-validator.ts, not main.ts). Plan anticipated this and provided the correct architecture.
- **Rule 0 scope**: Only suppresses DiagnosticTier.Parse diagnostics when BBjCPL errors present (not all Langium diagnostics). Langium semantic errors and warnings are handled by Rules 1-2 normally. This is correct because BBjCPL parse errors directly correspond to Langium parse errors — they're redundant, not overlapping with semantic checks.
- **mergeDiagnostics() same-line logic**: Keeps Langium diagnostic message (more descriptive) and stamps source='BBjCPL' as confirmation signal. BBjCPL-only errors (lines with no Langium match) are appended directly with their BBjCPL source.

## Deviations from Plan

None - plan executed exactly as written. The plan already anticipated the circular import concern and provided the revised architecture (setCompilerTrigger in bbj-document-validator.ts).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can now call `mergeDiagnostics(langiumDiags, cplDiags)` imported from `./bbj-document-validator.js`
- Plan 02 can call `getCompilerTrigger()` to gate BBjCPLService.compile() calls
- Plan 02 can call `notifyBbjcplAvailability(available)` to notify the VS Code client when BBjCPL is available/unavailable
- All existing tests pass, zero TypeScript errors

---
*Phase: 53-bbjcpl-diagnostic-integration*
*Completed: 2026-02-20*
