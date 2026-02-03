---
phase: 03-settings-runtime
plan: 02
subsystem: settings-ui
tags: [intellij, swing, settings-page, configurable, component-validator, form-builder]

# Dependency graph
requires:
  - phase: 01-plugin-scaffolding
    provides: Plugin project structure and build configuration
  - phase: 03-settings-runtime
    plan: 01
    provides: BbjSettings, BbjHomeDetector, BbjNodeDetector
provides:
  - BbjSettingsComponent Swing panel with three sections
  - BbjSettingsConfigurable controller wiring UI to persistent state
  - applicationService and applicationConfigurable registrations in plugin.xml
affects: [03-03 editor notification banners, 04-lsp-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [MVC settings pattern (Component/Configurable/Settings), ComponentValidator inline validation, FormBuilder section layout]

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Auto-detection fills fields on createComponent() but requires explicit Apply to persist -- pre-fills without auto-saving"
  - "Node.js version detection runs synchronously on document change in settings page -- acceptable for settings interactions"

patterns-established:
  - "Configurable implements Disposable for ComponentValidator lifecycle cleanup"
  - "DocumentAdapter triggers revalidation and dynamic UI updates on text field changes"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 3 Plan 02: Settings UI Page Summary

**Swing settings page at Languages & Frameworks > BBj with TextFieldWithBrowseButton inputs, ComponentValidator inline validation, and dynamic classpath ComboBox wired to BbjSettings persistent state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T13:39:28Z
- **Completed:** 2026-02-01T13:41:03Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments
- BbjSettingsComponent provides a three-section Swing panel (BBj Environment, Node.js Runtime, Classpath) using FormBuilder with TitledSeparators
- BBj home and Node.js path fields use TextFieldWithBrowseButton with FileChooserDescriptorFactory
- Inline validation via ComponentValidator: BBj home checks for cfg/BBj.properties, Node.js checks file existence and version >= 18
- Classpath ComboBox dynamically populates from BBj.properties when BBj home is valid, disabled with placeholder when invalid
- Node.js version label shows detected version or error message below the path field
- BbjSettingsConfigurable implements Configurable + Disposable, wiring UI to BbjSettings persistent state
- Auto-detection pre-fills empty fields on panel creation (BBj home from Install.properties, Node.js from PATH)
- apply() persists all three settings and refreshes EditorNotifications across open projects
- applicationService registered for BbjSettings, applicationConfigurable at parentId="language" with displayName="BBj"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BbjSettingsComponent Swing panel** - `5b88e9c` (feat)
2. **Task 2: Create BbjSettingsConfigurable and register in plugin.xml** - `0c30d18` (feat)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - Swing settings panel with browse buttons, inline validation, dynamic classpath dropdown, version label
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` - Settings controller with auto-detection, isModified/apply/reset, Disposable cleanup
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Added applicationService for BbjSettings and applicationConfigurable for settings page

## Decisions Made
- Auto-detection fills fields on createComponent() but requires explicit Apply to persist -- user sees pre-filled values but they are not saved until they click Apply/OK
- Node.js version detection via BbjNodeDetector.getNodeVersion() runs synchronously on document change -- acceptable latency for settings page interactions (not on file open or IDE startup)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Settings page fully functional and registered in plugin.xml
- BbjSettings applicationService registration enables Phase 4 to retrieve settings for LSP initialization options
- EditorNotifications.updateAllNotifications() call in apply() prepares for Phase 3 Plan 03 editor notification banners
- Configurable class ID available for ShowSettingsUtil.showSettingsDialog() from banner action links

---
*Phase: 03-settings-runtime*
*Completed: 2026-02-01*
