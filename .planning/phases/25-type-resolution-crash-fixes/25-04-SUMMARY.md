---
phase: 25-type-resolution-crash-fixes
plan: 04
subsystem: configuration
tags: [vscode, settings, workspace-config, validation, type-resolution]

# Dependency graph
requires:
  - phase: 25-01
    provides: "CAST type resolution warnings"
  - phase: 25-02
    provides: "Unresolvable super class access warnings"
  - phase: 25-03
    provides: "USE unresolvable class warnings"
provides:
  - "Workspace setting bbj.typeResolution.warnings to toggle all type resolution warnings"
  - "Configuration flow from VS Code settings through language server initialization"
  - "Module-level warning guard in validator for runtime control"
affects: [validation, type-resolution, user-configuration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workspace setting passed via initializationOptions to language server"
    - "Module-level configuration function pattern for runtime feature toggles"
    - "Guard pattern at top of validation methods for conditional diagnostics"

key-files:
  created: []
  modified:
    - bbj-vscode/package.json
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts

key-decisions:
  - "Setting defaults to true (warnings enabled) to maintain current behavior"
  - "Module-level config function instead of passing setting through DI chain"
  - "Setting applies to all three warning types: CAST, USE, super class resolution"

patterns-established:
  - "initializationOptions pattern for passing VS Code settings to language server"
  - "setTypeResolutionWarnings() module function called from workspace manager on init"
  - "Early return guards (if (!enabled) return) at top of validation methods"

# Metrics
duration: 30min
completed: 2026-02-06
---

# Phase 25 Plan 04: Type Resolution Warnings Toggle Summary

**Workspace setting bbj.typeResolution.warnings controls all type resolution diagnostics, with default enabled for current behavior and disable option for dynamic codebases**

## Performance

- **Duration:** 30 min
- **Started:** 2026-02-06T09:23:18Z
- **Completed:** 2026-02-06T09:54:11Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Added bbj.typeResolution.warnings workspace setting with default true
- Setting passed from VS Code extension to language server via initializationOptions
- Module-level configuration in bbj-validator.ts with setTypeResolutionWarnings() function
- All three type resolution warnings (CAST, USE, super class) controlled by single setting
- Workspace manager reads setting on initialization and configures validator

## Task Commits

Each task was committed atomically:

1. **Task 1: Add workspace setting and integrate into validator** - `6e5b920` (feat)

## Files Created/Modified
- `bbj-vscode/package.json` - Added bbj.typeResolution.warnings configuration property
- `bbj-vscode/src/extension.ts` - Pass typeResolutionWarnings via initializationOptions
- `bbj-vscode/src/language/bbj-validator.ts` - Module-level config and guards in validation methods
- `bbj-vscode/src/language/bbj-ws-manager.ts` - Read setting and call setTypeResolutionWarnings() on init

## Decisions Made

**Setting scope and default:**
- Setting is window-scoped (applies to entire workspace)
- Defaults to true to maintain current behavior (warnings enabled)
- When set to false, all type resolution warnings are suppressed

**Configuration flow:**
- VS Code setting → extension.ts → initializationOptions → workspace manager → validator
- Workspace manager calls setTypeResolutionWarnings() during onInitialize
- Module-level variable typeResolutionWarningsEnabled guards all three validation methods

**Single setting for all warnings:**
- One setting controls CAST, USE, and super class warnings
- Simpler user experience than per-warning toggles
- Addresses user request: "for heavily dynamic codebases where these warnings are noisy"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All tests passed with same pre-existing failures (unrelated to this work).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All type resolution crash fixes and warnings are now complete
- User has control over warning verbosity via workspace setting
- Setting will appear in VS Code settings UI under "BBj > Type Resolution > Warnings"
- Ready for Phase 25 completion or additional validation improvements

## Self-Check: PASSED

All files and commits verified to exist.

---
*Phase: 25-type-resolution-crash-fixes*
*Completed: 2026-02-06*
