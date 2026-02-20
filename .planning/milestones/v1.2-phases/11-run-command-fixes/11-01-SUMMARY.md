---
phase: 11-run-command-fixes
plan: 01
subsystem: run-commands
tags: [java, intellij-platform, process-handling, nio, symbolic-links]

# Dependency graph
requires:
  - phase: 10-polish-run-commands
    provides: Run command actions (GUI, BUI, DWC) with basic execution
provides:
  - Fixed BBj executable resolution using java.nio.file.Files API (handles symbolic links correctly)
  - Pre-launch validation with clear error messages routed to LS log window
  - Process stderr capture via ProcessAdapter with auto-showing log window
  - No notification balloons for run command errors (LS log window only)
affects: [11-02-toolbar-visibility, 12-marketplace-prep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "java.nio.file.Files API for symbolic link-aware file operations"
    - "ProcessAdapter for capturing process output before startNotify()"
    - "LS log window as centralized error output location (no notification balloons)"
    - "Pre-launch validation pattern for run commands"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java

key-decisions:
  - "Use java.nio.file.Files API instead of java.io.File for executable resolution (JDK-4956115 symbolic link handling)"
  - "Route all run command errors to LS log window only, no notification balloons (per 11-CONTEXT.md)"
  - "Attach ProcessAdapter before startNotify() to capture early stderr output (per RESEARCH.md pitfall #3)"
  - "Auto-show log window only on errors, not on success"

patterns-established:
  - "Pre-launch validation pattern: validateBeforeRun() checks BBj Home, directory, and executable before any process spawn"
  - "Error routing pattern: logError() logs to LS log window and auto-shows window, logInfo() logs without auto-show"
  - "Process output capture pattern: ProcessAdapter attached before startNotify() for complete output capture"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 11 Plan 01: Run Command Fixes Summary

**Fixed BBj executable "not found" bug using java.nio.file.Files API and added comprehensive stderr capture to LS log window**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T14:15:36Z
- **Completed:** 2026-02-02T14:18:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- BBj executable resolution now uses java.nio.file.Files API instead of java.io.File, fixing symbolic link handling (JDK-4956115)
- Pre-launch validation checks BBj Home configuration, directory existence, and executable availability before any process spawn
- Process stderr output captured via ProcessAdapter and routed to LS log window with run mode prefix
- Log window auto-shows only when errors occur (validation failures, stderr output, non-zero exit codes)
- Removed notification balloons for run command errors - all errors now go to LS log window only

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix executable resolution and add pre-launch validation** - `f38780e` (fix)
2. **Task 2: Add ProcessAdapter for stderr capture** - `495587d` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - Fixed executable resolution using java.nio.file.Files, added validateBeforeRun(), ProcessAdapter for stderr capture, logError()/logInfo() helpers
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunGuiAction.java` - Removed redundant BBj Home check (now handled in base class), updated to use logError()
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - Removed redundant BBj Home check, updated to use logError() for web.bbj validation
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - Removed redundant BBj Home check, updated to use logError() for web.bbj validation

## Decisions Made

**1. java.nio.file.Files API for executable resolution**
- Replaced java.io.File.exists() with Files.exists() to handle symbolic links correctly
- Uses Files.isRegularFile() and Files.isExecutable() for comprehensive validation
- Tries both bin/bbj and direct path as fallback for installation variations

**2. LS log window as centralized error output**
- All run command errors route to LS log window via BbjServerService.logToConsole()
- No notification balloons for run errors (per 11-CONTEXT.md decision)
- Auto-show log window on errors only (validation failures, stderr, non-zero exit codes)

**3. Pre-launch validation before process spawn**
- validateBeforeRun() checks BBj Home, directory existence, and executable before buildCommandLine()
- Clear error messages for each validation failure ("BBj Home is not configured", "directory does not exist", "executable not found")
- Prevents confusing "process not found" errors by catching issues early

**4. ProcessAdapter attached before startNotify()**
- Critical for capturing early process output (per RESEARCH.md pitfall #3)
- Filters stderr specifically using ProcessOutputTypes.STDERR
- Logs non-zero exit codes to help diagnose failed launches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. The java.nio.file.Files API drop-in replacement for java.io.File worked as expected, and ProcessAdapter integration was straightforward.

## User Setup Required

None - no external service configuration required. Users only need to configure BBj Home in Settings > Languages & Frameworks > BBj (existing requirement).

## Next Phase Readiness

- Run command executable resolution and stderr capture complete
- Ready for Phase 11 Plan 02 (toolbar visibility fixes for new UI)
- LS log window now serves as centralized error output for all run command issues

---
*Phase: 11-run-command-fixes*
*Completed: 2026-02-02*
