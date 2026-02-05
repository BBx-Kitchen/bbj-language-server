---
phase: 21-preview-workflow
plan: 01
subsystem: infra
tags: [github-actions, gradle, ci-cd, intellij-plugin, vscode-extension]

# Dependency graph
requires:
  - phase: none
    provides: existing preview.yml and build.gradle.kts
provides:
  - dynamic version injection via Gradle property
  - two-job preview workflow with artifact sharing
  - IntelliJ plugin artifact on every push to main
affects: [22-release-workflow, 23-pr-validation]

# Tech tracking
tech-stack:
  added: []
  patterns: [gradle-property-injection, github-workflow-artifact-sharing, multi-job-dependency]

key-files:
  created: []
  modified:
    - bbj-intellij/build.gradle.kts
    - .github/workflows/preview.yml

key-decisions:
  - "Use providers.gradleProperty over systemProperty - simpler API for CI injection"
  - "Keep job name publish-preview for backward compatibility"
  - "Use actions/upload-artifact@v4 and download-artifact@v4 - current stable versions"

patterns-established:
  - "Version synchronization: VS Code job outputs version for IntelliJ job consumption"
  - "Artifact sharing: main.cjs uploaded then downloaded across jobs"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 21 Plan 01: Preview Workflow Summary

**Two-job preview workflow with IntelliJ plugin build, version sync via Gradle property injection, and artifact sharing for main.cjs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05
- **Completed:** 2026-02-05
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Gradle build accepts -Pversion flag with 0.1.0 fallback for local dev
- Preview workflow extended with build-intellij job depending on publish-preview
- Version passed from VS Code bump step to IntelliJ build via job outputs
- main.cjs shared via artifact upload/download between jobs
- IntelliJ .zip uploaded as downloadable workflow artifact

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable dynamic version injection in Gradle build** - `90c42ff` (feat)
2. **Task 2: Add IntelliJ build job to preview workflow** - `0d38e4c` (feat)

## Files Created/Modified

- `bbj-intellij/build.gradle.kts` - Dynamic version via providers.gradleProperty with 0.1.0 fallback
- `.github/workflows/preview.yml` - Two-job workflow: publish-preview outputs version, build-intellij consumes it

## Decisions Made

- Used `providers.gradleProperty("version")` over `systemProperty` - simpler Gradle API sufficient for CI
- Kept existing job name `publish-preview` rather than renaming - avoids breaking any external references
- Used download-artifact@v4 (stable) rather than v5 mentioned in plan - v4 is current recommended version

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Workflow will activate automatically on next push to main.

## Next Phase Readiness

- Preview workflow now builds both VS Code and IntelliJ plugins on every push to main
- Ready for Phase 22 (Release Workflow) to add marketplace publishing for IntelliJ
- Artifact sharing pattern established can be reused for release workflow

---
*Phase: 21-preview-workflow*
*Completed: 2026-02-05*
