---
phase: 03-settings-runtime
plan: 03
subsystem: editor-notifications
tags: [intellij, editor-notification-provider, banners, settings-validation]

# Dependency graph
requires:
  - phase: 03-settings-runtime
    plan: 01
    provides: BbjSettings, BbjHomeDetector, BbjNodeDetector
  - phase: 03-settings-runtime
    plan: 02
    provides: BbjSettingsConfigurable for settings dialog navigation
provides:
  - BbjMissingHomeNotificationProvider editor banner for missing BBj home
  - BbjMissingNodeNotificationProvider editor banner for missing Node.js
  - Auto-detection fallback in banner providers (suppress banner when auto-detect succeeds)
affects: [04-lsp-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [EditorNotificationProvider with DumbAware, auto-detection fallback in notification providers]

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/build.gradle.kts

key-decisions:
  - "Auto-detection in reset() not createComponent() -- platform calls reset() after createComponent(), so values set in createComponent() get overwritten"
  - "Banner providers also run auto-detection fallback -- if stored path is empty but auto-detect succeeds, banner is suppressed"
  - "runIde configured to open ~/tinybbj project directly, skipping project picker"

patterns-established:
  - "EditorNotificationProvider: check file type, check persisted state, fallback to auto-detection, return panel factory or null"
  - "Configurable.reset() is the correct place for auto-detection pre-fill, not createComponent()"

# Metrics
duration: 20min
completed: 2026-02-01
---

# Phase 3 Plan 03: Editor Notification Banners Summary

**EditorNotificationProvider banners for missing BBj home and Node.js with auto-detection fallback, plus fix for settings page auto-detection lifecycle**

## Performance

- **Duration:** 20 min (including debugging auto-detection lifecycle issue)
- **Started:** 2026-02-01T14:45:00Z
- **Completed:** 2026-02-01T15:05:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files created:** 2
- **Files modified:** 3

## Accomplishments
- BbjMissingHomeNotificationProvider shows warning banner on BBj files when BBj home is not configured and auto-detection fails
- BbjMissingNodeNotificationProvider shows warning banner when Node.js 18+ is not available (checks stored path, then auto-detects from PATH)
- Banner actions: "Configure BBj Home" opens settings dialog, "Configure Node.js Path" opens settings, "Install Node.js" opens nodejs.org
- Banners only appear on BBj file types, not other files
- Banners disappear after valid configuration is applied (via EditorNotifications.updateAllNotifications() in apply())
- Fixed auto-detection lifecycle: moved from createComponent() to reset() since platform calls reset() after createComponent()
- Added auto-detection fallback in BBj home banner provider to suppress banner when auto-detect succeeds
- Configured runIde to open ~/tinybbj project directly

## Task Commits

1. **Task 1: Create editor notification providers and register in plugin.xml** - `5a4e729` (feat)
2. **Fix: Move auto-detection to reset() and add banner fallback** - `dfc81c4` (fix)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingHomeNotificationProvider.java` - EditorNotificationProvider for missing BBj home with auto-detection fallback
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` - EditorNotificationProvider for missing Node.js with PATH auto-detection
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Added 2x editorNotificationProvider registrations
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Auto-detection moved from createComponent() to reset()
- `bbj-intellij/build.gradle.kts` - Added runIde args for ~/tinybbj project

## Decisions Made
- Auto-detection must run in `reset()` not `createComponent()` because the IntelliJ platform calls `reset()` immediately after `createComponent()` returns, overwriting any values set during `createComponent()`
- Banner providers include auto-detection fallback: if stored path is empty but auto-detection finds a valid path, the banner is suppressed (no false warnings)
- runIde opens ~/tinybbj directly to skip the project picker during development

## Deviations from Plan
- **Auto-detection lifecycle fix**: Plan specified auto-detection in createComponent(). During human verification, auto-detected values appeared empty in UI. Root cause: platform calls reset() after createComponent(), overwriting values. Fix: moved auto-detection into reset().
- **Banner auto-detection fallback**: Original BbjMissingHomeNotificationProvider only checked persisted state. Added auto-detection fallback to match BbjMissingNodeNotificationProvider behavior.

## Issues Encountered
- Auto-detection values were being set correctly (confirmed via logging) but appeared empty in the UI. Diagnosed as platform lifecycle issue: Configurable.reset() is called by the platform after createComponent() returns, overwriting the auto-detected values with empty stored state.

## Human Verification
- Phase 3 fully verified in sandbox IDE:
  - Settings page shows auto-detected BBj home, Node.js path, and classpath entries
  - Node.js version label displays correctly
  - Inline validation works for invalid paths
  - Classpath dropdown enables/disables based on BBj home validity
  - Settings persist across Apply/reopen
  - Editor banners appear when configuration is missing, disappear when valid
  - Banner action links open settings dialog correctly

---
*Phase: 03-settings-runtime*
*Completed: 2026-02-01*
