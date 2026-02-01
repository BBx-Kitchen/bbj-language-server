---
phase: 03-settings-runtime
plan: 01
subsystem: settings
tags: [intellij, persistent-state, bbj-detection, nodejs-detection, settings-model]

# Dependency graph
requires:
  - phase: 01-plugin-scaffolding
    provides: Plugin project structure and build configuration
provides:
  - BbjSettings PersistentStateComponent with application-level state
  - BbjHomeDetector for BBj installation auto-detection
  - BbjNodeDetector for Node.js PATH detection and version validation
  - getBBjClasspathEntries() for parsing BBj.properties classpath names
affects: [03-02 settings UI, 03-03 editor banners, 04-lsp-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [PersistentStateComponent for XML settings, utility classes with private constructors]

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjHomeDetector.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java
  modified: []

key-decisions:
  - "No @Service annotation on BbjSettings -- registered via plugin.xml applicationService in Plan 02"
  - "getBBjClasspathEntries does not filter underscore-prefixed entries, matching VS Code parity"

patterns-established:
  - "Utility classes: private constructor, all static methods, @Nullable/@NotNull annotations"
  - "PersistentStateComponent: @State annotation with fully qualified name, inner State class with public String fields defaulting to empty string"

# Metrics
duration: 1min
completed: 2026-02-01
---

# Phase 3 Plan 01: Settings State & Runtime Detection Summary

**PersistentStateComponent settings model with BBj home auto-detection from Install.properties and Node.js PATH detection with version >= 18 enforcement**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-01T13:35:57Z
- **Completed:** 2026-02-01T13:37:15Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- BbjSettings provides persistent application-level state with bbjHomePath, nodeJsPath, and classpathEntry fields
- BbjHomeDetector reads ~/BASIS/Install.properties and checks common OS locations to find BBj installations
- BbjNodeDetector finds Node.js on system PATH and validates version >= 18 via GeneralCommandLine
- getBBjClasspathEntries() parses basis.classpath.* entries from BBj.properties for classpath dropdown population

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BbjSettings persistent state service** - `edad67c` (feat)
2. **Task 2: Create BbjHomeDetector and BbjNodeDetector utility classes** - `d1187ca` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - PersistentStateComponent with State inner class, getInstance(), getBBjClasspathEntries()
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjHomeDetector.java` - BBj home auto-detection from installer trace and common paths, validation via cfg/BBj.properties
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java` - Node.js detection from PATH, version query via GeneralCommandLine, minimum version check

## Decisions Made
- No `@Service` annotation on BbjSettings -- the service will be registered via plugin.xml `applicationService` extension point in Plan 02, as required for PersistentStateComponent
- getBBjClasspathEntries does not filter underscore-prefixed entries (e.g., `_webforj_default`), matching VS Code extension behavior for parity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BbjSettings ready for consumption by BbjSettingsComponent (Plan 02) and EditorNotificationProviders (Plan 03)
- BbjHomeDetector and BbjNodeDetector ready for settings page auto-detection and inline validation
- plugin.xml service registration deferred to Plan 02 as designed

---
*Phase: 03-settings-runtime*
*Completed: 2026-02-01*
