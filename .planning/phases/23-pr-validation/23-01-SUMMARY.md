---
phase: 23-pr-validation
plan: 01
subsystem: infra
tags: [github-actions, ci, intellij, plugin-verifier]

# Dependency graph
requires:
  - phase: 22-release-workflow
    provides: manual-release.yml with IntelliJ plugin build
  - phase: 21-preview-workflow
    provides: preview.yml pattern for two-job workflow structure
provides:
  - PR validation workflow for IntelliJ plugin
  - Path-filtered CI triggering on shared dependencies
  - Plugin verification in release builds
affects: [future-release-automation, intellij-plugin-development]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Path-filtered PR validation for monorepo
    - Plugin verifier integration for IntelliJ compatibility checks

key-files:
  created:
    - .github/workflows/pr-validation.yml
  modified:
    - .github/workflows/manual-release.yml

key-decisions:
  - "verifyPlugin only in release builds (too slow for PR validation)"
  - "GITHUB_TOKEN required for verifyPlugin to avoid API rate limiting"
  - "1-day artifact retention for PR validation (short-lived)"

patterns-established:
  - "Path filtering: bbj-intellij/, bbj-vscode/out/language/, tools/, syntaxes/"
  - "Two-job pattern: build-vscode uploads artifact, validate-intellij downloads"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 23 Plan 01: PR Validation Summary

**PR validation workflow with path filtering for IntelliJ plugin, plus plugin verifier integration in release builds**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T12:00:00Z
- **Completed:** 2026-02-05T12:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created PR validation workflow triggered on IntelliJ plugin and shared dependency changes
- Added plugin verification step to release workflow for IDE compatibility checks
- Configured proper GITHUB_TOKEN for plugin verifier API rate limiting

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PR validation workflow with path filtering** - `76c118d` (feat)
2. **Task 2: Add plugin verification to release workflow** - `f561d9f` (feat)

## Files Created/Modified
- `.github/workflows/pr-validation.yml` - New PR validation workflow with path filtering and two-job structure
- `.github/workflows/manual-release.yml` - Added verifyPlugin step after buildPlugin

## Decisions Made
- **verifyPlugin only in release builds** - Too slow for PR validation (downloads multiple IDE versions, 5-10+ min). PRs should be fast for developer iteration.
- **GITHUB_TOKEN for verifyPlugin** - Required to avoid GitHub API rate limiting when plugin verifier resolves latest IDE versions.
- **1-day artifact retention** - PR validation artifacts are short-lived; no need for longer retention.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PR validation workflow ready for testing on actual PRs
- Plugin verifier configured for release builds
- v2.2 milestone complete with all three phases (Preview, Release, PR Validation)

---
*Phase: 23-pr-validation*
*Completed: 2026-02-05*
