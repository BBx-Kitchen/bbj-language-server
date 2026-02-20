---
phase: 07-brand-icons
plan: 01
subsystem: ui
tags: [svg, icons, intellij, dark-theme, file-type, brand]

# Dependency graph
requires:
  - phase: 01-bootstrap
    provides: "BbjIcons.java icon loading pattern and BbjFileType registration"
provides:
  - "12 SVG brand icons (6 light/dark pairs) for file types, plugin listing, and run actions"
  - "BbjIcons constants: CONFIG, RUN_GUI, RUN_BUI, RUN_DWC"
  - "BbxConfigFileType for .bbx files with config gear icon"
  - "pluginIcon.svg/pluginIcon_dark.svg with real brand B-logo"
affects: [08-run-commands, 10-bug-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntelliJ _dark.svg suffix convention for automatic theme switching"
    - "viewBox=0 0 3000 3000 with translate/scale transform for high-res path data in 16x16 icons"

key-files:
  created:
    - bbj-intellij/src/main/resources/icons/bbj_dark.svg
    - bbj-intellij/src/main/resources/icons/bbj-config.svg
    - bbj-intellij/src/main/resources/icons/bbj-config_dark.svg
    - bbj-intellij/src/main/resources/icons/run-gui.svg
    - bbj-intellij/src/main/resources/icons/run-gui_dark.svg
    - bbj-intellij/src/main/resources/icons/run-bui.svg
    - bbj-intellij/src/main/resources/icons/run-bui_dark.svg
    - bbj-intellij/src/main/resources/icons/run-dwc.svg
    - bbj-intellij/src/main/resources/icons/run-dwc_dark.svg
    - bbj-intellij/src/main/resources/META-INF/pluginIcon_dark.svg
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigFileType.java
  modified:
    - bbj-intellij/src/main/resources/icons/bbj.svg
    - bbj-intellij/src/main/resources/META-INF/pluginIcon.svg
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Used viewBox 0 0 3000 3000 with translate(0,3000) scale(1,-1) to preserve original B-logo path data at 16x16"
  - "Kept stroke-based rendering for Tabler icons (config gear, run actions) rather than converting to fill paths"
  - "BbxConfigFileType uses BbjLanguage.INSTANCE to share language features with .bbj files"
  - "Added LSP languageMapping for BBx Config fileType with languageId bbx for language server"

patterns-established:
  - "Icon naming: base.svg + base_dark.svg in /icons/ directory"
  - "Icon colors: #6E6E6E for light theme, #AFB1B3 for dark theme"
  - "Plugin icon at 40x40 in META-INF/, file icons at 16x16 in /icons/"

# Metrics
duration: 12min
completed: 2026-02-01
---

# Phase 7 Plan 1: Brand Icons Summary

**BBj brand B-logo and Tabler icons converted from VSCode SVGs to IntelliJ format with light/dark theme support, .bbx config file type registered, and run action icon constants ready for Phase 8**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 15

## Accomplishments
- Converted all 6 VSCode brand SVGs to IntelliJ-compatible format with proper light (#6E6E6E) and dark (#AFB1B3) theme variants
- Replaced placeholder plugin marketplace icon with real BBj B-logo at 40x40
- Created BbxConfigFileType for .bbx files with config gear icon and LSP language mapping
- Added CONFIG, RUN_GUI, RUN_BUI, RUN_DWC constants to BbjIcons.java ready for Phase 8 wiring
- Human verification passed: all icons display correctly in sandbox IDE across light and dark themes

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert VSCode SVGs to IntelliJ icon format** - `2dab732` (feat)
2. **Task 2: Register icons and .bbx file type in Java and plugin.xml** - `61247c8` (feat)
3. **Task 3: Visual verification checkpoint** - approved (human-verify)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `bbj-intellij/src/main/resources/icons/bbj.svg` - BBj B-logo file icon (light), replaced generic blue B
- `bbj-intellij/src/main/resources/icons/bbj_dark.svg` - BBj B-logo file icon (dark)
- `bbj-intellij/src/main/resources/icons/bbj-config.svg` - Config gear icon (light) for .bbx files
- `bbj-intellij/src/main/resources/icons/bbj-config_dark.svg` - Config gear icon (dark)
- `bbj-intellij/src/main/resources/icons/run-gui.svg` - Run GUI play triangle icon (light)
- `bbj-intellij/src/main/resources/icons/run-gui_dark.svg` - Run GUI play triangle icon (dark)
- `bbj-intellij/src/main/resources/icons/run-bui.svg` - Run BUI browser icon (light)
- `bbj-intellij/src/main/resources/icons/run-bui_dark.svg` - Run BUI browser icon (dark)
- `bbj-intellij/src/main/resources/icons/run-dwc.svg` - Run DWC chrome icon (light)
- `bbj-intellij/src/main/resources/icons/run-dwc_dark.svg` - Run DWC chrome icon (dark)
- `bbj-intellij/src/main/resources/META-INF/pluginIcon.svg` - Plugin marketplace icon (light) with real brand logo
- `bbj-intellij/src/main/resources/META-INF/pluginIcon_dark.svg` - Plugin marketplace icon (dark)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjIcons.java` - Added CONFIG, RUN_GUI, RUN_BUI, RUN_DWC constants
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbxConfigFileType.java` - New FileType for .bbx config files
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered BbxConfigFileType and LSP language mapping for bbx

## Decisions Made
- Used `viewBox="0 0 3000 3000"` with `translate(0,3000) scale(1,-1)` transform to preserve the original BBj B-logo path coordinates from the VSCode source SVG without rescaling path data
- Kept stroke-based rendering (stroke-width="2") for Tabler-sourced icons (config gear, run-gui, run-bui, run-dwc) since IntelliJ renders strokes correctly
- BbxConfigFileType uses `BbjLanguage.INSTANCE` so .bbx files share BBj language features (syntax highlighting, LSP support)
- Added separate `languageMapping` for BBx Config with `languageId="bbx"` so the language server receives the correct language identifier for .bbx files
- IntelliJ standard icon colors: `#6E6E6E` (light theme), `#AFB1B3` (dark theme) applied consistently across all icons

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All run action icon constants (RUN_GUI, RUN_BUI, RUN_DWC) are defined and ready for Phase 8 toolbar button wiring
- CONFIG icon and BbxConfigFileType are complete, no further icon work needed
- Phase 8 can reference `BbjIcons.RUN_GUI`, `BbjIcons.RUN_BUI`, `BbjIcons.RUN_DWC` directly
- Gradle build passes cleanly with all new registrations

---
*Phase: 07-brand-icons*
*Completed: 2026-02-01*
