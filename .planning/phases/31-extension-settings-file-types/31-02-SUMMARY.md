---
phase: 31-extension-settings-file-types
plan: 02
subsystem: ide
tags: [intellij, bbx, file-type, settings, java-interop, configuration]

# Dependency graph
requires:
  - phase: 31-01
    provides: .bbx file type and configurable interop in VS Code
provides:
  - ".bbx file support in IntelliJ with BBj icon and language features"
  - "Configurable java-interop host in IntelliJ settings"
  - "Configurable config.bbx path in IntelliJ settings"
affects: ["31-04"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["IntelliJ PersistentStateComponent for settings persistence"]

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java

key-decisions:
  - "Placed config.bbx path field in BBj Environment section (before Java Interop) for logical grouping"
  - "Made host field editable text input (not dropdown) for maximum flexibility including IP addresses"
  - "Empty config path means default {bbjHome}/cfg/config.bbx (server handles default resolution)"

patterns-established:
  - "Settings flow: UI component -> Configurable controller -> PersistentState -> LanguageServerFactory initializationOptions"
  - "Health check uses same host/port from settings that language server receives"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 31 Plan 02: IntelliJ Settings & File Types Summary

**.bbx files merged into BBj file type with full language features; configurable java-interop host and config.bbx path in IntelliJ settings**

## Performance

- **Duration:** 2 min 49 sec
- **Started:** 2026-02-07T14:08:13Z
- **Completed:** 2026-02-07T14:11:02Z
- **Tasks:** 2
- **Files modified:** 8 (7 modified, 1 deleted)

## Accomplishments
- .bbx files recognized as BBj file type in IntelliJ with BBj icon, run commands, and full language server features
- Java-interop host configurable in IntelliJ settings (was hardcoded to 127.0.0.1)
- Config.bbx path configurable in IntelliJ settings (overrides default {bbjHome}/cfg/config.bbx)
- Health checks now use configurable host instead of hardcoded localhost

## Task Commits

Each task was committed atomically:

1. **Task 1: Merge .bbx into BBj file type in IntelliJ** - `bdc6f9e` (feat)
2. **Task 2: Add interop host and config path to IntelliJ settings** - `dabd6b8` (feat)

## Files Created/Modified

### Deleted
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigFileType.java` - Removed separate file type class for .bbx

### Modified
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Merged bbx extension into BBj fileType, removed duplicate languageMapping
- `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json` - Added .bbx to BBj language extensions, removed separate BBx language/grammar
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - Added javaInteropHost and configPath fields to State class
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Added editable host field and config path field to settings UI
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Added load/save logic for host and configPath fields
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - Reads host and configPath from settings, passes to language server via initializationOptions
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropService.java` - Health checks use configurable host from settings instead of hardcoded "127.0.0.1"

## Decisions Made

1. **Config path field placement:** Placed in BBj Environment section (immediately after BBj home field) rather than in Java Interop section. Rationale: config.bbx is a BBj configuration file, conceptually related to BBj home rather than java-interop service.

2. **Host field UI:** Made host an editable text field rather than dropdown or validation-restricted input. Rationale: Users may need to connect to remote java-interop instances via IP addresses, hostnames, or docker service names. Maximum flexibility is appropriate here.

3. **Empty config path behavior:** Empty/blank config path means use default {bbjHome}/cfg/config.bbx. The language server handles default resolution when initializationOptions.configPath is empty string. Rationale: Matches VS Code implementation pattern from 31-01.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All file modifications applied cleanly. Verification checks confirmed:
- No remaining references to BbxConfigFileType in codebase
- .bbx extension present in BBj fileType definition
- TextMate bundle has single language entry with .bbx
- javaInteropHost and configPath present in all required files
- No hardcoded "127.0.0.1" in BbjJavaInteropService
- Editable host field replaced static label in BbjSettingsComponent

## User Setup Required

None - no external service configuration required. Settings changes apply immediately via language server restart.

## Next Phase Readiness

- IntelliJ now has feature parity with VS Code for .bbx file handling and configurable settings
- Ready for Plan 03 (VS Code .bbx syntax highlighting) which is VS Code-only
- Ready for Plan 04 (document .bbx flag and config settings) which documents these completed features

---
*Phase: 31-extension-settings-file-types*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified:
- 7 modified files exist
- 2 task commits exist (bdc6f9e, dabd6b8)
