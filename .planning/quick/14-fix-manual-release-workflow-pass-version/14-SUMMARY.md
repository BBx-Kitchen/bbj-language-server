---
phase: quick-14
plan: 01
subsystem: infra
tags: [github-actions, gradle, release-workflow, intellij, versioning]

# Dependency graph
requires: []
provides:
  - Fixed manual-release workflow that correctly versions IntelliJ plugin during verify and publish
  - Fixed create-release job that now has git repo context for gh CLI
affects: [release-automation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pass -Pversion gradle property to all plugin tasks (buildPlugin, verifyPlugin, publishPlugin) to override build.gradle.kts default"
    - "Include actions/checkout@v4 in any job that calls gh CLI, even if no source code is needed"

key-files:
  created: []
  modified:
    - .github/workflows/manual-release.yml

key-decisions:
  - "Pass -Pversion to verifyPlugin so compatibility check runs against the release artifact, not a default-versioned one"
  - "Pass -Pversion to publishPlugin to ensure JetBrains Marketplace receives the correct version instead of 0.1.0"
  - "Add actions/checkout@v4 as first step in create-release job — gh CLI requires git repo context to create releases"

patterns-established: []

# Metrics
duration: 3min
completed: 2026-02-17
---

# Quick Task 14: Fix Manual Release Workflow Pass Version Summary

**Three-line fix: verifyPlugin and publishPlugin now receive -Pversion from build-vscode outputs, and create-release job has actions/checkout@v4 so gh CLI can create GitHub Releases**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-17T15:59:18Z
- **Completed:** 2026-02-17T16:02:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `verifyPlugin` now receives `-Pversion=${{ needs.build-vscode.outputs.version }}` — plugin compatibility check runs against the correctly-versioned artifact
- `publishPlugin` now receives `-Pversion=${{ needs.build-vscode.outputs.version }}` — JetBrains Marketplace receives the release version instead of the default 0.1.0 from build.gradle.kts
- `create-release` job now has `actions/checkout@v4` as its first step, providing the git repository context that `gh release create` requires

## Task Commits

1. **Task 1: Fix version passing and add checkout to manual release workflow** - `8956e26` (fix)

## Files Created/Modified

- `.github/workflows/manual-release.yml` - Fixed verifyPlugin, publishPlugin, and create-release job

## Decisions Made

- Pass `-Pversion` to both `verifyPlugin` and `publishPlugin` — `buildPlugin` already received it but verification and publishing were using the Gradle default (0.1.0)
- Add `actions/checkout@v4` before artifact downloads in `create-release` — `gh release create` invokes git internally and requires a real git repository context, which is absent on a fresh runner without checkout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Manual release workflow is now correct end-to-end: builds, verifies, and publishes IntelliJ plugin with the release version, then creates a GitHub Release with both artifacts attached

---
*Phase: quick-14*
*Completed: 2026-02-17*
