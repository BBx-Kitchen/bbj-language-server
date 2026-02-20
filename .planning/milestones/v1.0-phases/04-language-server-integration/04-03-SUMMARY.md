---
phase: 04-language-server-integration
plan: 03
subsystem: observability
tags: [LSP4IJ, ConsoleView, notifications, error-handling, tool-window]

# Dependency graph
requires:
  - phase: 04-language-server-integration
    plan: 02
    provides: BbjServerService with status broadcast via message bus
provides:
  - Tool window with ConsoleView for real-time language server log output
  - Crash recovery system with auto-restart once, stop on second crash
  - Balloon notification and editor banner for crash state
  - Clean project shutdown that force-stops language server
  - Log level configuration (Error/Warn/Info/Debug) passed to language server
affects: [future debugging features, server diagnostics, error monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ConsoleView in tool window for log output
    - EditorNotificationProvider for file-scoped banners
    - NotificationGroupManager for balloon notifications with actions
    - Crash detection via ServerStatus transitions (started/starting → stopped)
    - Auto-restart with crash count window (30s)

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
    - bbj-intellij/src/main/resources/icons/bbj-toolwindow.svg
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "ConsoleView created via TextConsoleBuilderFactory for proper lifecycle management"
  - "Crash detection: ServerStatus.stopped when previous was started/starting = unexpected crash"
  - "Auto-restart once on first crash, stop and notify on second crash within 30s"
  - "Balloon notification includes Show Log (opens tool window) and Restart (clears crash state) actions"
  - "Editor banner persists until crash state cleared or server successfully restarts"
  - "Log level sent to server in createSettings() alongside BBj home and classpath"

patterns-established:
  - "Tool window factory registers ConsoleView with service via setConsoleView()"
  - "Service logs to console only if consoleView is set (graceful when tool window not open)"
  - "Crash state tracked via boolean flag, cleared on successful start or manual restart"
  - "Project disposal hook in service ensures clean server shutdown on project close"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 04 Plan 03: Tool Window & Crash Recovery Summary

**Tool window with real-time log output, crash recovery with auto-restart limit, balloon/banner notifications, and log level configuration**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-01T15:39:31Z
- **Completed:** 2026-02-01T15:43:31Z
- **Tasks:** 2
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- Tool window in bottom panel shows all language server status changes and errors
- Crash recovery automatically restarts server once, then stops with notification after second crash
- Balloon notification provides Show Log and Restart actions for user recovery
- Editor banner appears on BBj files when server is crashed until resolved
- Project disposal cleanly stops language server (no zombie processes)
- Log level dropdown in settings with Error/Warn/Info/Debug options sent to server

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tool window and crash recovery system** - `6f2ac7e` (feat)
2. **Task 2: Add log level setting and pass to language server** - `419a921` (feat)

## Files Created/Modified

**Created:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerLogToolWindowFactory.java` - Tool window factory creating ConsoleView for server log output
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` - Editor banner shown on BBj files when server is crashed
- `bbj-intellij/src/main/resources/icons/bbj-toolwindow.svg` - 13x13 console icon for tool window in BBj blue

**Modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` - Added ConsoleView logging, crash detection with auto-restart logic, balloon notifications, project disposal hook
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - Log all status changes to console, pass logLevel to server
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - Added logLevel field with "Info" default
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Added log level dropdown with 4 options
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Wired log level in isModified/apply/reset
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered tool window, notification group, and crash banner provider

## Decisions Made

**Crash detection via status transitions:**
- Detect crash when ServerStatus becomes `stopped` but previous status was `started` or `starting` (unexpected stop)
- This distinguishes deliberate shutdown from crashes

**Auto-restart strategy:**
- First crash: auto-restart after 1 second delay, log "Auto-restarting (attempt 1)"
- Second crash within 30s: stop auto-restart, log error, fire balloon notification, show editor banner
- Crash count resets after 30s window expires (allows recovery from transient issues)

**Crash state management:**
- `serverCrashed` flag tracks whether server is in crashed state for editor banner visibility
- `clearCrashState()` resets both flag and crash count, triggers editor notification refresh
- Successful start (ServerStatus.started) automatically clears crash state

**Log output strategy:**
- Tool window factory stores ConsoleView reference in BbjServerService
- Service logs to console only if consoleView is not null (graceful when tool window closed)
- All status changes logged to console for debugging visibility

**Log level configuration:**
- Default "Info" level balances verbosity with usefulness
- Passed to server in createSettings() alongside existing BBj home and classpath
- Changing log level triggers debounced restart (from existing apply() logic)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward.

## Next Phase Readiness

**Observability complete:**
- Users can see real-time server logs in tool window
- Crashes automatically trigger recovery with clear UI feedback
- Editor banners and balloon notifications guide users to resolution
- Log level configurable for debugging verbosity

**Ready for Plan 04-04 (Server Status Reporting):**
- All error handling and crash recovery infrastructure in place
- Tool window provides log visibility foundation
- Status broadcast message bus ready for additional subscribers
- Clean shutdown ensures no resource leaks during development iteration

**No blockers:** Server lifecycle, error handling, and user feedback systems fully functional.

---
*Phase: 04-language-server-integration*
*Completed: 2026-02-01*
