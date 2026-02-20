---
phase: 06-distribution
plan: 02
subsystem: distribution
tags: [nodejs, download, platform-detection, intellij-plugin, background-tasks]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Gradle build configuration, plugin structure"
  - phase: 03-language-server
    provides: "BbjLanguageServer with Node.js path resolution"
provides:
  - "Automatic Node.js download for users without system Node.js"
  - "Platform detection (macOS ARM/x64, Windows x64, Linux x64)"
  - "Background download with progress indicator"
  - "Persistent Node.js cache in plugin data directory"
affects: [distribution, installation, user-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Background tasks with Task.Backgroundable for non-blocking downloads"
    - "Platform-specific binary handling via SystemInfo API"
    - "Plugin data persistence in PathManager.getPluginsPath()"

key-files:
  created:
    - "bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java"
  modified:
    - "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java"
    - "bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java"

key-decisions:
  - "Node.js v20.18.1 LTS as bundled version (meets minimum requirement of v18+)"
  - "Download from official nodejs.org distribution (not third-party mirrors)"
  - "Synchronous cache check (getCachedNodePath) with async download (downloadNodeAsync)"
  - "Editor banner shows Download action first (most common user path)"

patterns-established:
  - "4-step Node.js resolution: settings → auto-detect → cached download → fallback"
  - "EditorNotifications.updateAllNotifications() to refresh banners after async operations"
  - "Platform detection using SystemInfo (not System.getProperty) for edge case handling"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 6 Plan 02: Node.js Auto-Download Summary

**Plugin automatically downloads Node.js v20.18.1 in background when system Node.js is missing, with platform detection for macOS (ARM/x64), Windows (x64), and Linux (x64)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T19:22:53Z
- **Completed:** 2026-02-01T19:25:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- BbjNodeDownloader handles platform detection, download, extraction, and caching
- Language server startup automatically uses downloaded Node.js when system Node.js unavailable
- Missing-Node banner offers one-click "Download Node.js" action
- Download runs in background without blocking IDE
- Downloaded Node.js persists across IDE restarts in plugin data directory

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BbjNodeDownloader with platform detection and download** - `7d67316` (feat)
2. **Task 2: Integrate Node.js download into language server startup and notification banner** - `06e3c57` (feat)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - Platform detection, async download from nodejs.org, archive extraction (tar.gz/zip), caching in plugin data directory
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` - Updated resolveNodePath() with 4-step chain (settings → detect → cached download → fallback)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` - Added "Download Node.js" action with EditorNotifications refresh callback

## Decisions Made

**Node.js v20.18.1 LTS:** Selected current LTS version at time of development (meets minimum v18+ requirement, ~25MB download size, stable release)

**Official nodejs.org distribution:** Download directly from https://nodejs.org/dist/ rather than third-party mirrors for security and reliability

**Synchronous cache check + async download:** getCachedNodePath() is fast/synchronous for startup path resolution, downloadNodeAsync() runs in background with Task.Backgroundable for non-blocking UX

**Download action as primary option:** "Download Node.js" appears first in missing-node banner since most users don't have Node.js pre-installed (vs "Configure" which assumes existing installation)

**Platform-specific URLs:** Construct correct URLs for all target platforms:
- macOS ARM: `node-v20.18.1-darwin-arm64.tar.gz`
- macOS x64: `node-v20.18.1-darwin-x64.tar.gz`
- Windows x64: `node-v20.18.1-win-x64.zip`
- Linux x64: `node-v20.18.1-linux-x64.tar.gz`

**SystemInfo API usage:** Use `com.intellij.openapi.util.SystemInfo` for platform detection (not `System.getProperty`) to handle edge cases like macOS ARM detection (`SystemInfo.isAarch64`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. All verification criteria met:
- Compilation succeeds with no errors
- BbjNodeDownloader correctly constructs URLs for all 3 platforms
- BbjLanguageServer.resolveNodePath() has 4-step resolution chain
- BbjMissingNodeNotificationProvider includes "Download Node.js" action
- EditorNotifications.updateAllNotifications() callback ensures banner dismisses after download

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 Plan 03 (Plugin Marketplace Publishing):**
- Node.js dependency fully automated (download fallback eliminates installation blocker)
- Background download with progress notification provides good UX
- Downloaded binaries cached in plugin data directory (persist across IDE restarts)
- Editor banner provides three user paths: download (auto), configure (manual), install manually (external)

**Zero blockers** - plugin can now run on any system without pre-installed Node.js

---
*Phase: 06-distribution*
*Completed: 2026-02-01*
