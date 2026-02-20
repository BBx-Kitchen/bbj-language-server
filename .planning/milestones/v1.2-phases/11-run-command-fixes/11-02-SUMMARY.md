---
phase: 11-run-command-fixes
plan: 02
subsystem: run-commands
tags: [intellij-platform, plugin-xml, actions, context-menu, ui]

# Dependency graph
requires:
  - phase: 11-01
    provides: Fixed executable resolution, stderr capture, pre-launch validation
provides:
  - ProjectViewPopupMenu context menu for BBj run actions
  - Removed MainToolBar registrations (new UI compatibility)
  - Run actions gated on language server status
  - Auto-detection of BBj Home on first settings access
affects: [12-marketplace-prep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Action group popup in ProjectViewPopupMenu for project tree context menu"
    - "Gate actions on language server status in update() method"
    - "Eager auto-detection in PersistentStateComponent.getState()"
    - "Process launch on pooled thread via executeOnPooledThread()"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java

key-decisions:
  - "Remove MainToolBar registrations — unreliable in IntelliJ new UI (default since 2024.2)"
  - "Add ProjectViewPopupMenu submenu instead of individual toolbar buttons"
  - "Gate run actions on LS started status to prevent bad state when server is stopped"
  - "Move process launch off EDT to executeOnPooledThread() to prevent UI freezing"
  - "Auto-detect BBj Home eagerly in getState() instead of only in settings dialog"

patterns-established:
  - "Action gating pattern: check service status in update() to prevent actions against uninitialized services"
  - "Eager auto-detection pattern: run detection in getState() so settings are ready before UI interaction"

# Metrics
duration: ~10min (including 2 bugfix iterations from human verification)
completed: 2026-02-02
---

# Phase 11 Plan 02: Toolbar Visibility & Context Menu Summary

**Fixed run action visibility in IntelliJ new UI, added project tree context menu, gated actions on LS status, and added eager BBj Home auto-detection**

## Performance

- **Completed:** 2026-02-02
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 3
- **Bugfix iterations:** 2 (from checkpoint feedback)

## Accomplishments
- Removed MainToolBar registrations that were hidden in IntelliJ's new UI (default since 2024.2)
- Added "BBj Run" submenu to ProjectViewPopupMenu for right-click context menu in project tree
- Editor context menu registrations and keyboard shortcuts (Alt+G/B/D) preserved
- Run actions gated on language server `started` status — disabled when LS is not running
- Process launch moved off EDT to pooled thread to prevent UI freezing
- BBj Home and Node.js path auto-detected eagerly in `BbjSettings.getState()` — no need to visit settings dialog first

## Task Commits

1. **Task 1: Update plugin.xml action registrations** — `f0ab928`
2. **Task 2: Update action update() for project tree context** — `784089c`
3. **Bugfix: Gate run actions on LS status, move process off EDT** — `1f9e88b`
4. **Bugfix: Eager auto-detection in BbjSettings.getState()** — `8170c70`

## Files Created/Modified
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — Removed MainToolBar, added ProjectViewPopupMenu group
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — LS status gate in update(), process launch on pooled thread
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` — Eager auto-detection in getState()

## Decisions Made

**1. Remove MainToolBar, add ProjectViewPopupMenu**
- MainToolBar actions not shown by default in IntelliJ new UI (2024.2+)
- ProjectViewPopupMenu submenu provides right-click access in project tree
- Editor popup menu and keyboard shortcuts unaffected

**2. Gate run actions on LS started status**
- Discovered during human verification: running actions when LS is stopped (grace period) caused service bad state and lost status bar widgets
- Fix: update() checks BbjServerService.getCurrentStatus() == ServerStatus.started

**3. Move process launch off EDT**
- OSProcessHandler creation can block if process startup is slow
- Moved to ApplicationManager.executeOnPooledThread()

**4. Eager BBj Home auto-detection**
- Discovered during human verification: users had to visit settings dialog for auto-detection to run
- Fix: BbjSettings.getState() runs BbjHomeDetector.detectBbjHome() when bbjHomePath is empty

## Deviations from Plan

- **Added LS status gating** — not in original plan, discovered during checkpoint verification
- **Added eager auto-detection** — not in original plan, discovered during checkpoint verification
- **Process launch moved off EDT** — not in original plan, defensive fix for UI freezing

## Issues Encountered

1. **IDE lockup when running without LS** — Run actions triggered with LS stopped caused bad service state. Fixed by gating on LS status.
2. **BBj Home "not configured" false positive** — Auto-detection only ran in settings dialog. Fixed by eager detection in getState().

## User Setup Required

None — BBj Home and Node.js path are auto-detected. Users only need BBj installed in a standard location.

## Next Phase Readiness

- All Phase 11 run command fixes complete and human-verified
- Ready for Phase 12 (Marketplace Preparation)

---
*Phase: 11-run-command-fixes*
*Completed: 2026-02-02*
