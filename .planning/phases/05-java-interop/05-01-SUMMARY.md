---
phase: 05-java-interop
plan: 01
subsystem: ui
tags: [java-interop, settings, tcp-health-check, message-bus, lsp4ij]

# Dependency graph
requires:
  - phase: 04-language-server-integration
    provides: Settings infrastructure, message bus pattern, service architecture
provides:
  - Java-interop port configuration in settings with auto-detection from BBjServices config
  - BbjJavaInteropService with TCP health check and status broadcast
  - Message bus topic for java-interop status changes
  - Foundation for java-interop UI components (status widget, editor banner)
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Plugin-side TCP health check for services that don't expose status via LSP
    - Grace period pattern for transient connection failures
    - Message bus subscription to language server lifecycle

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Port field is int (not String) - port is numeric, validates 1-65535"
  - "Auto-detection parses BBj.properties for java.interop.port or bridge.port properties"
  - "Auto-detection is best-effort (never throws, returns 5008 default on any error)"
  - "Plugin-side TCP health check required because language server does not expose java-interop status via LSP protocol"
  - "Grace period (2s) prevents flashing UI on transient disconnects"
  - "Health checks start when language server starts, stop when language server stops"

patterns-established:
  - "Settings auto-detection pattern: reuse bbjHome variable from earlier in reset() to avoid redundant detection"
  - "Service lifecycle tied to language server lifecycle via message bus subscription in constructor"
  - "TCP health check with configurable grace period for status stability"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 5 Plan 01: Settings Port Config Summary

**Java-interop port configuration with auto-detection from BBjServices config and TCP health check service broadcasting connection status via message bus**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01T17:58:57Z
- **Completed:** 2026-02-01T18:02:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Settings page shows "Java Interop" section with static "localhost" label and editable port field
- Port auto-detects from BBjServices BBj.properties config (best-effort, falls back to 5008)
- BbjJavaInteropService monitors java-interop availability via periodic TCP health checks
- Status changes broadcast via message bus topic for UI components to subscribe
- Foundation ready for status widget and editor banner in plan 05-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add java-interop port to settings state and UI with auto-detection** - `dbd0e4f` (feat)
2. **Task 2: Create BbjJavaInteropService with TCP health check** - `83e6ca7` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - Added javaInteropPort field (int, default 5008) and detectJavaInteropPort() method
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Added Java Interop section with static localhost label and port text field with validation
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Wired javaInteropPort to isModified/apply/reset, added auto-detection in reset()
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` - New project service with TCP health check, grace period, and message bus broadcasting
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered BbjJavaInteropService as projectService

## Decisions Made
- Port field is int (not String) because port is numeric data, validates 1-65535
- Auto-detection searches BBj.properties for patterns: `java.interop.port=` or `bridge.port=` (property name poorly documented)
- Auto-detection is best-effort: never throws, wraps all I/O in try-catch, returns 5008 default on any error
- Plugin-side TCP health check required because language server does NOT expose java-interop connection status via LSP protocol (no custom notifications, no status fields in existing Langium server)
- TCP check is for UI STATUS DISPLAY only - plugin does not manage LS-to-java-interop connection (LS connects on its own)
- 2-second grace period prevents flashing disconnected status on transient network issues
- Health checks tied to language server lifecycle: start when LS starts, stop when LS stops (via message bus subscription)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Variable name conflict in BbjSettingsConfigurable.reset()**
- Initial implementation redeclared `bbjHome` variable when adding java-interop auto-detection
- Compilation error: "variable bbjHome is already defined in method reset()"
- Fix: Reused existing `bbjHome` variable from earlier in method (already includes auto-detection logic)
- Simpler code and avoids redundant detection

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Java-interop port configuration complete and persisting in settings
- TCP health check service monitoring connection status
- Message bus topic ready for subscribers (status widget, editor banner)
- Ready for plan 05-02: Status bar widget integration and initializationOptions

## Design Notes

**Why plugin-side TCP health check:**
The language server (bbj-vscode/src/language/java-interop.ts) already connects to java-interop internally via createSocket() on DEFAULT_PORT 5008. However, the server does NOT expose java-interop connection status via LSP protocol - there are no custom notifications or status reports. Modifying the language server is out of scope per REQUIREMENTS.md. Therefore the plugin independently probes the TCP port to determine whether BBjServices is reachable. This is for STATUS DISPLAY only - the plugin does not manage the LS-to-java-interop connection. The plugin passes config via initializationOptions and the server connects on its own.

**Java completions already implemented:**
The language server ALREADY implements java-interop completions (see java-interop.ts, bbj-scope.ts, bbj-scope-local.ts). Java class names and method signatures are provided by the existing Langium-based server when it successfully connects to BBjServices java-interop on port 5008. The VS Code extension already uses this. The IntelliJ plugin just needs to: (1) pass the port config via initializationOptions so LS knows where to connect, and (2) show UI status so the user knows if java-interop is working. No new LS-side implementation is needed for JAVA-02.

---
*Phase: 05-java-interop*
*Completed: 2026-02-01*
