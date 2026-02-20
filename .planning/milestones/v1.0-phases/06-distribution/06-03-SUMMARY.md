---
phase: 06-distribution
plan: 03
subsystem: verification
tags: [testing, distribution, cross-platform, compatibility]

# Dependency graph
requires:
  - phase: 06-distribution/01
    provides: "Plugin ZIP with marketplace-ready packaging"
  - phase: 06-distribution/02
    provides: "Node.js auto-download capability"
provides:
  - "Verified plugin works on IntelliJ Ultimate 2025.3 (build 253)"
  - "Verified plugin works on IntelliJ Community Edition (Windows)"
  - "Verified Node.js download flow on Windows CE"
  - "Fixed untilBuild compatibility cap"
  - "Fixed Node download notification to offer LS restart action"
affects: [distribution, user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java

key-decisions:
  - "untilBuild uses provider { \"\" } (empty string = no upper bound) instead of hardcoded version"
  - "Node download success notification includes Restart Language Server action button"

patterns-established: []

# Metrics
duration: 45min
completed: 2026-02-01
---

# Phase 6 Plan 03: Human Verification Summary

**Plugin verified on IntelliJ Ultimate 2025.3.2 and Windows Community Edition. Two compatibility issues found and fixed, one UX improvement applied.**

## Performance

- **Duration:** ~45 min (interactive debugging with user)
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Files modified:** 2

## Accomplishments
- Plugin installs and runs on IntelliJ IDEA Ultimate 2025.3.2 (build IU-253.30387.90)
- Plugin installs and runs on IntelliJ IDEA Community Edition (Windows)
- Syntax highlighting, code completion, hover, go-to-definition, diagnostics all verified working
- Settings page with auto-detection verified working
- Node.js download flow verified on Windows (one-click download from banner)
- Welcome notification verified
- Status bar widgets verified

## Task Commits

1. **Build verification** - `e7daa1a` (chore)
2. **Fix untilBuild compatibility cap** - `a39dbfd` (fix)
3. **Add Restart LS action to Node download notification** - `0c98553` (fix)

## Issues Found and Fixed

### Issue 1: untilBuild cap blocked IntelliJ 2025.3
- **Symptom:** Plugin rejected: "requires build 243.* or older but current build is IU-253.30387.90"
- **Root cause:** `untilBuild = "243.*"` in build.gradle.kts capped at IntelliJ 2024.3.x
- **Fix:** Changed to `untilBuild = provider { "" }` (no upper bound)
- **Commit:** `a39dbfd`

### Issue 2: File type association conflict on upgrade
- **Symptom:** BBj files showed no icon, no highlighting, no LSP on IntelliJ Ultimate 2025.3.2
- **Root cause:** User had previously associated .bbj with "Text" file type. IntelliJ persisted a `removed_mapping` entry in `filetypes.xml` that blocked the plugin's FileType registration even after removing the Text association.
- **Fix:** User manually re-added .bbj extension to BBj file type in Settings > Editor > File Types
- **Note:** This is an IntelliJ platform behavior, not a plugin bug. Only affects users who had prior .bbj associations.

### Issue 3: Node.js download required IDE restart
- **Symptom:** After Node.js download on Windows CE, user had to restart the IDE to activate the language server
- **Root cause:** Success notification only showed text "Restart BBj Language Server to activate" with no action button
- **Fix:** Added "Restart Language Server" action button to the notification that calls BbjServerService.restart()
- **Commit:** `0c98553`

## Deviations from Plan

1. untilBuild fix was not anticipated — plan originally assumed 243.* would be sufficient
2. File type conflict debugging was extensive but is a platform-level issue, not fixable in plugin code
3. Node download UX improvement (restart action) was added based on user feedback

## User Setup Required

None for standard installation. Users upgrading from a previous .bbj association may need to re-add the extension in File Types settings.

---
*Phase: 06-distribution*
*Completed: 2026-02-01*
