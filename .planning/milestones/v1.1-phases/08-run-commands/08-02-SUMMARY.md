---
phase: 08-run-commands
plan: 02
subsystem: run-commands
tags: [intellij, bbj, bui, dwc, web-runner, gradle, plugin-actions]

# Dependency graph
requires:
  - phase: 08-01
    provides: GUI run action foundation with BbjRunActionBase, settings integration, keyboard shortcuts
provides:
  - BUI and DWC run actions using web.bbj runner with EM authentication
  - web.bbj bundled in plugin distribution at lib/tools/
  - EM username/password settings (defaults: admin/admin123)
  - Auto-save before run setting (defaults: true)
  - All three run actions (GUI/BUI/DWC) in toolbar with Alt+G/B/D shortcuts
affects: [09-structure-view, 10-bug-fixes]

# Tech tracking
tech-stack:
  added: [web.bbj runner from bbj-vscode]
  patterns: [web.bbj path resolution via PluginManagerCore, shared command-building logic in action classes]

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/build.gradle.kts

key-decisions:
  - "web.bbj located via PluginManagerCore.getPlugin().getPluginPath().resolve(lib/tools/web.bbj)"
  - "BUI and DWC actions as separate classes (not parameterized) for clarity in action registry"
  - "EM credentials stored in BbjSettings.State with defaults matching VSCode (admin/admin123)"
  - "All three run actions in MainToolBar as separate buttons (not dropdown group)"
  - "Working directory for web.bbj is tools directory (parent of web.bbj), not project root"

patterns-established:
  - "web.bbj command pattern: bbj -q -WD<toolsDir> <toolsDir>/web.bbj - <client-type> <args>"
  - "Gradle resource bundling: copyWebRunner task + prepareSandbox inclusion"
  - "Run action keyboard shortcuts: Alt+G (GUI), Alt+B (BUI), Alt+D (DWC)"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 08 Plan 02: Run Commands BUI/DWC Summary

**BUI and DWC run actions with web.bbj bundling, EM authentication settings, and toolbar integration completing run command parity with VSCode**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01T22:58:23Z
- **Completed:** 2026-02-01T23:02:05Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- BUI and DWC run actions spawn web.bbj runner with client type parameter matching VSCode behavior
- web.bbj bundled in plugin distribution via Gradle copy tasks (copyWebRunner + prepareSandbox)
- EM username/password settings added to settings page with admin/admin123 defaults
- All three run actions (GUI, BUI, DWC) appear as separate toolbar buttons with Alt+G/B/D shortcuts
- Auto-save before run checkbox added to settings (defaults to checked, wired into all run actions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BUI/DWC run actions, bundle web.bbj, add EM settings** - `888b86e` (feat)
2. **Task 2: Register all three run actions with toolbar buttons and keyboard shortcuts** - `fc5e11f` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java` - BUI run action extending BbjRunActionBase, builds command with BUI client type
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java` - DWC run action extending BbjRunActionBase, builds command with DWC client type
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - Added getWebBbjPath() helper to locate bundled web.bbj via PluginManagerCore
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - Added emUsername and emPassword fields to State (defaults: admin/admin123)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Added EM username/password text fields and auto-save checkbox to settings UI
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Wired new settings fields in isModified(), apply(), reset()
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered bbj.runBui and bbj.runDwc actions with keyboard shortcuts (Alt+B/D), toolbar buttons, and context menu placement
- `bbj-intellij/build.gradle.kts` - Added copyWebRunner task and prepareSandbox inclusion for web.bbj bundling

## Decisions Made
- **web.bbj path resolution via PluginManagerCore:** Used `PluginManagerCore.getPlugin(PluginId.getId("com.basis.bbj.intellij")).getPluginPath().resolve("lib/tools/web.bbj")` instead of PathManager approach for more robust plugin path discovery
- **Separate BUI/DWC action classes:** Created two distinct action classes instead of a single parameterized class for clearer action registry and simpler code
- **EM credentials in settings with defaults:** Added emUsername and emPassword to BbjSettings.State with admin/admin123 defaults matching VSCode configuration (bbj.web.username/password)
- **Working directory for web.bbj is tools directory:** Set command working directory to web.bbj's parent directory (lib/tools/) matching VSCode's `webRunnerWorkingDir` pattern
- **Three separate toolbar buttons:** Registered all three run actions individually in MainToolBar (not as a popup group) so each has a visible toolbar button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Run commands feature complete. Users can now:
- Run BBj programs as GUI via toolbar button or Alt+G
- Run BBj programs as BUI via toolbar button or Alt+B (opens in browser)
- Run BBj programs as DWC via toolbar button or Alt+D (opens in browser)
- Configure EM credentials for web runner authentication
- Toggle auto-save before run behavior

All three run modes tested with buildPlugin (successful compilation and bundling).

Ready for Phase 09 (Structure View) which is independent of run commands.

---
*Phase: 08-run-commands*
*Completed: 2026-02-01*
