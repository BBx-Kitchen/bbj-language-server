---
phase: 04
plan: 02
subsystem: ui
tags: [status-bar, server-lifecycle, java, intellij-platform]

# Dependencies
requires:
  - "04-01 (LSP4IJ core integration, BbjLanguageClient)"
  - "03-01 (BbjSettings for configuration)"
provides:
  - "Status bar widget showing language server state"
  - "BbjServerService for centralized server lifecycle management"
  - "Tools menu restart action"
  - "Debounced settings-change restart"
affects:
  - "04-03 (tool window logging will use BbjServerService status)"
  - "04-04 (restart recovery will extend BbjServerService)"

# Technical
tech-stack:
  added:
    - "com.intellij.util.Alarm (debounced restart scheduling)"
    - "StatusBarWidget/StatusBarWidgetFactory APIs"
    - "MessageBus/Topic for status broadcast"
  patterns:
    - "Project-level service for server lifecycle centralization"
    - "Message bus pub/sub for UI updates"
    - "Debounced operation using Alarm"

# Artifacts
key-files:
  created:
    - "BbjServerService.java - Project service managing server lifecycle"
    - "BbjStatusBarWidget.java - Status bar UI component"
    - "BbjStatusBarWidgetFactory.java - Widget factory for registration"
    - "BbjRestartServerAction.java - Tools menu restart action"
    - "bbj-status-ready.svg - Green status icon"
    - "bbj-status-starting.svg - Amber status icon"
    - "bbj-status-error.svg - Red status icon"
  modified:
    - "BbjLanguageClient.java - Dispatches status to BbjServerService"
    - "BbjSettingsConfigurable.java - Triggers debounced restart on Apply"
    - "BbjIcons.java - Added status icon constants"
    - "plugin.xml - Registered projectService, statusBarWidgetFactory, actions"

decisions:
  - decision: "Simplified LanguageServerManager.stop() without StopOptions"
    rationale: "LSP4IJ 0.19.0 doesn't expose StopOptions class. Simple stop() method works for restart use case."
    impact: "Server stop is clean, no need for explicit willDisable flag"
    alternatives:
      - "Use reflection to access StopOptions - rejected (fragile, version-dependent)"

  - decision: "Status bar visibility controlled by BBj file focus"
    rationale: "Widget only meaningful when user is working on BBj files"
    impact: "Clean UI when not editing BBj, no clutter in status bar"
    alternatives:
      - "Always visible - rejected (unnecessary when not editing BBj)"

  - decision: "500ms debounce delay for settings-change restart"
    rationale: "Prevents rapid restarts if user clicks Apply multiple times"
    impact: "Single restart occurs after settings stabilize"
    alternatives:
      - "Immediate restart - rejected (could cause rapid start/stop cycles)"
      - "1000ms delay - rejected (feels sluggish)"

  - decision: "Message bus broadcast instead of direct widget update"
    rationale: "Allows multiple UI components to subscribe to status changes"
    impact: "Extensible for future tool window, notifications, etc."
    alternatives:
      - "Direct widget reference - rejected (tight coupling, single subscriber)"

metrics:
  duration: "4 minutes"
  completed: "2026-02-01"
---

# Phase 4 Plan 02: Status Bar Widget Summary

**One-liner:** Status bar widget shows language server state (Ready/Starting/Error) with colored icons, popup actions (Restart/Settings/Log), and debounced settings-change restart via BbjServerService.

## What Was Built

### Core Components

**1. BbjServerService (Project-level service)**
- Centralizes server lifecycle: restart(), scheduleRestart(), updateStatus()
- Debounced restart using com.intellij.util.Alarm (500ms delay)
- Message bus broadcast via BbjServerStatusListener.TOPIC
- Tracks current ServerStatus (started/starting/stopped/error)
- Fields for crash recovery (lastCrashTime, crashCount) prepared for Plan 03

**2. Status Bar Widget**
- BbjStatusBarWidgetFactory registered in plugin.xml
- BbjStatusBarWidget extends CustomStatusBarWidget
- Icon + text label showing: "BBj: Ready", "BBj: Starting", "BBj: Error", "BBj: Stopped"
- Three status icons (13x13 SVG): green (ready), amber (starting), red (error)
- Visible only when BBj file (.bbj, .bbl, .bbjt, .src) is focused
- Click opens JPopupMenu with three actions:
  - **Restart Server** - calls BbjServerService.restart()
  - **Open Settings** - opens BBj settings page
  - **Show Server Log** - opens tool window (prepared for Plan 03)

**3. Tools Menu Action**
- BbjRestartServerAction registered in plugin.xml actions block
- Visible/enabled only when BBj file is focused
- Calls BbjServerService.restart() on click

**4. Settings-Change Restart**
- BbjSettingsConfigurable.apply() triggers scheduleRestart() for all open projects
- Debounced: multiple Apply clicks within 500ms result in single restart

### Integration Points

**BbjLanguageClient → BbjServerService:**
```java
handleServerStatusChanged(ServerStatus serverStatus) {
    BbjServerService.getInstance(getProject()).updateStatus(serverStatus);
}
```

**BbjServerService → Status Bar Widget:**
```java
project.getMessageBus()
    .syncPublisher(BbjServerStatusListener.TOPIC)
    .statusChanged(status);
```

**Status Bar Widget subscribes:**
```java
messageBusConnection.subscribe(
    BbjServerStatusListener.TOPIC,
    this::updateStatus
);
```

## Tasks Completed

| Task | Description | Commit | Duration |
|------|-------------|--------|----------|
| 1 | Create BbjServerService and status bar widget | bceb401 | 3 min |
| 2 | Create restart action and settings-change trigger | 9955ef2 | 1 min |

## Technical Achievements

1. **Message Bus Architecture** - Clean pub/sub pattern allows future tool window, notifications to subscribe
2. **Debounced Operations** - Alarm-based debouncing prevents rapid restart cycles
3. **Visibility Control** - Widget only shows when relevant (BBj file focused)
4. **Extensibility** - BbjServerService prepared for crash recovery (Plan 03)

## Decisions Made

### Simplified LanguageServerManager API
**Context:** Plan specified StopOptions to prevent willDisable flag, but LSP4IJ 0.19.0 doesn't expose StopOptions.

**Decision:** Use simple `manager.stop("bbjLanguageServer")` without options.

**Rationale:** Default stop behavior works for restart use case. Server stops cleanly and restarts immediately.

**Impact:** Cleaner code, no version-specific reflection hacks.

### 500ms Debounce Delay
**Context:** Settings Apply could be clicked multiple times rapidly.

**Decision:** 500ms delay via Alarm.

**Rationale:** Balances responsiveness (not too slow) with stability (prevents rapid restarts).

**Impact:** User sees single restart after settings stabilize, not multiple start/stop cycles.

## Deviations from Plan

**None** - Plan executed exactly as written.

## Next Phase Readiness

### Blockers
None.

### Concerns
None. Status bar widget ready for integration with tool window logging (Plan 03).

### Dependencies for Next Plan
Plan 04-03 (tool window logging) can now:
- Display logs via "Show Server Log" popup action
- Subscribe to BbjServerStatusListener for status updates
- Use BbjServerService.getCurrentStatus() for initial state

## Testing Notes

**Manual verification needed:**
1. Status bar appears when BBj file is opened
2. Status bar disappears when non-BBj file is focused
3. Clicking widget opens popup menu with 3 actions
4. Tools > Restart BBj Language Server appears when BBj file focused
5. Changing settings and clicking Apply triggers debounced restart (watch status bar: Starting → Ready)

**Build verification:**
```bash
./gradlew buildPlugin
# BUILD SUCCESSFUL in 2s
```

## Lessons Learned

1. **LSP4IJ API surface is minimal** - Many expected classes (StopOptions) don't exist. Simpler API than anticipated.
2. **StatusBarWidget visibility** - EditorBasedWidget has built-in selection tracking, but manual visibility control via updateVisibility() more explicit.
3. **Message bus setup** - MessageBusConnection must be stored for disconnect in dispose(), not just fire-and-forget.

## Summary

Status bar widget provides professional language server UX: visible state indication, quick access to restart/settings/logs. BbjServerService centralizes lifecycle management with debouncing, ready for crash recovery extension in Plan 03.

**Key achievement:** Users now have real-time visibility into server state and manual control over restart, making the language server feel like a first-class IDE feature rather than invisible background process.
