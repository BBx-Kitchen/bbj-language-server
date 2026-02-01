---
phase: 05-java-interop
plan: 02
subsystem: ui
tags: [java-interop, status-widget, editor-banner, initializationOptions, lsp4ij]

# Dependency graph
requires:
  - phase: 05-java-interop
    plan: 01
    provides: BbjJavaInteropService with TCP health check and message bus
provides:
  - Java-interop status bar widget displaying connection state
  - Persistent editor banner for disconnected java-interop
  - InitializationOptions extended with javaInteropHost and javaInteropPort
  - Icon assets for connected/disconnected states
affects: [05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Status bar widget pattern for secondary service status display
    - Non-dismissible editor banner for persistent warnings
    - Forward-compatible config passing (LS doesn't read it yet but will)

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java
    - bbj-intellij/src/main/resources/icons/bbj-interop-connected.svg
    - bbj-intellij/src/main/resources/icons/bbj-interop-disconnected.svg
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Status widget separate from LSP widget - java-interop is independent service"
  - "Gray icon for disconnected (not red) - gray implies 'not available/inactive' vs red implies 'error/crash'"
  - "Widget only visible when BBj file is open - matches LSP widget pattern"
  - "Reconnect via full LS restart - no separate java-interop reconnect path"
  - "Banner non-dismissible - user needs BBjServices to get java completions"
  - "javaInteropHost/Port passed now even though LS ignores them - forward-compatible for when LS is updated"

patterns-established:
  - "Status bar widget pattern: subscribe to message bus topic, update on status changes, hide when irrelevant"
  - "Editor banner pattern: check service status, return null if OK, return panel builder if warning needed"
  - "Forward-compatible config: pass config to LS now for future use even if not currently read"

# Metrics
duration: 2.5min
completed: 2026-02-01
---

# Phase 5 Plan 02: Status Bar Widget Summary

**Java-interop status bar widget, persistent editor banner for unavailable state, and initializationOptions extended to pass java-interop configuration to language server**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-01T18:06:40Z
- **Completed:** 2026-02-01T18:09:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Status bar widget shows java-interop connection state (Connected/Disconnected/Checking) with color-coded icons
- Widget only visible when BBj file is open (same pattern as LSP widget)
- Widget click shows popup with Reconnect (restarts LS) and Open Settings actions
- Editor banner appears when java-interop disconnected: "Start BBjServices for Java completions"
- Banner non-dismissible and disappears automatically when connection established
- InitializationOptions now include javaInteropHost and javaInteropPort for language server
- Forward-compatible: LS currently ignores these options but plugin already sends them

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend initializationOptions and create status bar widget** - `1587703` (feat)
2. **Task 2: Create editor banner and register all extensions** - `3144f94` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - Added javaInteropHost="127.0.0.1" and javaInteropPort to initializationOptions
- `bbj-intellij/src/main/resources/icons/bbj-interop-connected.svg` - Green circle icon (#50C878, r=4)
- `bbj-intellij/src/main/resources/icons/bbj-interop-disconnected.svg` - Gray circle icon (#888888, r=4)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` - Added INTEROP_CONNECTED and INTEROP_DISCONNECTED constants
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java` - Widget implementation with message bus subscription and visibility control
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidgetFactory.java` - Factory for widget creation
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjJavaInteropNotificationProvider.java` - Editor banner provider for disconnected state
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered widget factory and notification provider

## Decisions Made
- **Status widget separate from LSP widget**: Java-interop is an independent service (BBjServices), not part of LS lifecycle. Users need to see both states separately to understand what's working and what's not.
- **Gray icon for disconnected, not red**: Gray implies "not available/inactive" while red implies "error/crash". Java-interop being unavailable is not an error - it's a normal state when BBjServices isn't running.
- **Widget only visible when BBj file open**: Matches the LSP widget pattern - irrelevant information when not editing BBj code.
- **Reconnect via full LS restart**: No separate java-interop reconnect action - the LS manages its own connection to java-interop, so plugin just restarts the whole server.
- **Banner non-dismissible**: Users fundamentally need BBjServices running to get Java completions. Non-dismissible banner ensures they see the requirement.
- **Pass javaInteropHost/Port now even though LS ignores them**: The LS currently hardcodes DEFAULT_PORT=5008 and ignores initializationOptions for java-interop config. However, passing it now is forward-compatible - when the LS is updated to read configurable ports, the IntelliJ plugin will already be sending them. This allows LS changes without plugin changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build succeeded first time, all verifications passed.

## User Setup Required

None - no external configuration required. Java-interop widget will show "Disconnected" until user starts BBjServices externally.

## Next Phase Readiness
- Status bar widget displaying java-interop connection state
- Editor banner alerting users when BBjServices not running
- InitializationOptions ready for when LS supports configurable java-interop port
- All UI components ready for Plan 05-03 human verification

## Design Notes

**Why separate status widget:**
Java-interop is NOT part of the language server lifecycle - it's a separate service (BBjServices) that the language server connects to. Users need to see both states independently:
- LSP widget: "Is the language server running?" (plugin manages this)
- Java-interop widget: "Is BBjServices running?" (external dependency)

This separation makes it clear what's working and what needs user action.

**Why forward-compatible config:**
The language server (bbj-vscode/src/language/java-interop.ts) currently hardcodes `DEFAULT_PORT = 5008` and does not read initializationOptions for java-interop configuration. However, the VS Code extension DOES allow users to configure the port (though it's also currently ignored by the server). Passing the config from IntelliJ now means:
1. Parity with VS Code extension behavior
2. When LS is updated to honor configurable ports, IntelliJ plugin already works
3. No breaking changes when LS evolves

**Why non-dismissible banner:**
Unlike configuration errors (missing BBj home, missing Node.js) which can be fixed in settings, java-interop being unavailable requires external action (starting BBjServices). Making the banner dismissible would let users hide a fundamental requirement for Java completions. Non-dismissible ensures visibility until the service is available.

---
*Phase: 05-java-interop*
*Completed: 2026-02-01*
