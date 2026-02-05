---
phase: 22-release-workflow
plan: 01
subsystem: infra
tags: [github-actions, ci-cd, release-automation, gradle, vsce]

# Dependency graph
requires:
  - phase: 21-preview-workflow
    provides: preview.yml pattern for building both VS Code and IntelliJ extensions
provides:
  - Three-job release workflow (build-vscode, build-intellij, create-release)
  - GitHub Release creation with both extension artifacts attached
  - IntelliJ installation instructions in release body
affects: [23-pr-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-job workflow pattern with artifact passing"
    - "GitHub Release creation via gh CLI with auto-generated notes"

key-files:
  created: []
  modified:
    - .github/workflows/manual-release.yml

key-decisions:
  - "Rename output .zip to bbj-intellij-{version}.zip for clarity"
  - "Use 1-day artifact retention (short-lived, go to GitHub Release)"
  - "Include IntelliJ installation instructions directly in release body"

patterns-established:
  - "Release workflow extends VS Code build with IntelliJ parallel build"
  - "GitHub Release created after both builds complete with both artifacts"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 22 Plan 01: Release Workflow Summary

**Manual workflow dispatch creates unified GitHub Release with both VS Code .vsix and IntelliJ .zip artifacts, plus installation instructions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T06:13:34Z
- **Completed:** 2026-02-05T06:15:20Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Extended manual-release.yml from single-job VS Code publishing to three-job unified release workflow
- IntelliJ plugin built with same version number as VS Code extension
- GitHub Release automatically created with both artifacts attached and installation instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add IntelliJ build job to manual-release workflow** - `0e5727d` (feat)
2. **Task 2: Add GitHub Release creation job** - `d28b9b9` (feat)

## Files Created/Modified
- `.github/workflows/manual-release.yml` - Extended from single VS Code job to three-job workflow (build-vscode, build-intellij, create-release)

## Decisions Made

**1. Rename IntelliJ plugin to bbj-intellij-{version}.zip**
- Rationale: Default filename is generic bbj-lang-*.zip. Adding "intellij" prefix makes it clear which IDE this is for when users browse GitHub Release assets.

**2. Use 1-day artifact retention**
- Rationale: Artifacts are intermediate build outputs that get attached to GitHub Release. Short retention saves storage since release assets are permanent.

**3. Include installation instructions in release body**
- Rationale: GitHub Release is primary distribution channel for IntelliJ plugin (no JetBrains Marketplace). Users need clear steps visible on release page.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 23 (PR Validation). Release workflow complete and ready to use.

**Available capabilities:**
- Manual workflow dispatch with version input (x.y.0 format)
- Version validation (must be greater than current, must end in .0)
- Automatic version bump, commit, and tag creation
- VS Code Marketplace publishing
- IntelliJ plugin build with matching version
- GitHub Release with both artifacts and installation instructions

**Pattern established:** Phase 21 preview workflow and Phase 22 release workflow both follow the same build-intellij job pattern - download language server artifact, build with Gradle, upload plugin artifact. Phase 23 can reuse this pattern for PR validation.

---
*Phase: 22-release-workflow*
*Completed: 2026-02-05*
