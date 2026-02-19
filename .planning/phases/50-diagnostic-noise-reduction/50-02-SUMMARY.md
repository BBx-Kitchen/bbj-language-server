---
phase: 50-diagnostic-noise-reduction
plan: 02
subsystem: diagnostics
tags: [vscode-extension, settings, status-bar, language-server, lsp, initializationOptions]

# Dependency graph
requires:
  - phase: 50-01
    provides: exported setSuppressCascading() and setMaxErrors() functions from bbj-document-validator.ts
provides:
  - bbj.diagnostics.suppressCascading VS Code setting wired end-to-end
  - bbj.diagnostics.maxErrors VS Code setting wired end-to-end
  - Status bar indicator showing when diagnostics are suppressed
affects:
  - 50-01
  - 53-bbjcpl-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "initializationOptions object pattern for passing VS Code settings to language server on startup"
    - "onDidChangeConfiguration handler with immediate-apply settings placed before workspaceInitialized guard"
    - "Status bar heuristic using getDiagnostics() — show on any error + setting enabled"

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/main.ts

key-decisions:
  - "Status bar uses heuristic (any error + setting enabled) rather than a custom LSP notification — sufficient for Phase 50, Phase 53 can refine"
  - "Diagnostic suppression settings placed before !workspaceInitialized guard so they apply immediately without Java class reload"

patterns-established:
  - "Settings that don't trigger Java class reload are placed before the workspaceInitialized startup gate in onDidChangeConfiguration"

requirements-completed: [DIAG-02]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 50 Plan 02: Settings Wiring & Status Bar Summary

**VS Code settings bbj.diagnostics.suppressCascading and bbj.diagnostics.maxErrors wired through initializationOptions and onDidChangeConfiguration to bbj-document-validator module flags, with a status bar indicator showing when diagnostics are filtered**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T12:53:00Z
- **Completed:** 2026-02-19T12:55:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Two new VS Code settings (`bbj.diagnostics.suppressCascading`, `bbj.diagnostics.maxErrors`) added to package.json schema under `bbj.*` namespace
- Settings flow complete: package.json -> extension.ts initializationOptions -> bbj-ws-manager.ts onInitialize -> bbj-document-validator.ts module flags
- Live settings flow complete: VS Code settings change -> main.ts onDidChangeConfiguration -> bbj-document-validator.ts module flags (applied immediately, before startup gate)
- Status bar indicator shows `$(warning) Diagnostics filtered` when active BBj document has errors and suppressCascading is enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Add settings schema and wire through initialization and config change** - `b7cfb89` (feat)
2. **Task 2: Add status bar indicator for active diagnostic suppression** - `7228308` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `bbj-vscode/package.json` - Added bbj.diagnostics.suppressCascading and bbj.diagnostics.maxErrors settings schema
- `bbj-vscode/src/extension.ts` - Added suppressCascading and maxErrors to initializationOptions; added suppressionStatusBar with update logic
- `bbj-vscode/src/language/bbj-ws-manager.ts` - Added import and onInitialize handler reading suppression settings
- `bbj-vscode/src/language/main.ts` - Added import and onDidChangeConfiguration handler applying suppression settings immediately

## Decisions Made
- Status bar uses a heuristic (any error exists + suppressCascading enabled) rather than a custom LSP notification. The VS Code extension API's `getDiagnostics()` does not expose `data.code` so we cannot distinguish parse vs semantic errors. This is Good Enough for Phase 50 — it may show even when only semantic errors exist, which is still informative. Phase 53 can refine.
- Diagnostic suppression settings placed before the `!workspaceInitialized` guard in `onDidChangeConfiguration` — they don't trigger Java class reload so they should apply immediately like the `debug` setting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

6 pre-existing test failures in classes.test.ts, completion-test.test.ts, imports.test.ts, and validation.test.ts confirmed before and after — all unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 50 complete: diagnostic suppression hierarchy (Plan 01) and VS Code settings wiring + status bar (Plan 02) are both done
- Plan 01 implemented the core suppression logic in bbj-document-validator.ts
- Plan 02 wired the user-facing controls end-to-end
- Phase 53 (BBjCPL integration) can extend DiagnosticTier enum with BBjCPL = 3 tier and add a custom LSP notification for precise suppression state if the status bar heuristic proves insufficient

---
*Phase: 50-diagnostic-noise-reduction*
*Completed: 2026-02-19*
