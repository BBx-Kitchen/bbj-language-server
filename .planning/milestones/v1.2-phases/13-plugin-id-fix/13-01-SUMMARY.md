---
phase: 13-plugin-id-fix
plan: 01
subsystem: infra
tags: [intellij-platform, plugin, marketplace]

# Dependency graph
requires:
  - phase: 12-marketplace-preparation
    provides: "Changed plugin.xml ID to 'com.basis.bbj' per Marketplace rules"
provides:
  - "Corrected hardcoded PluginId.getId() references to match plugin.xml ID"
  - "BUI/DWC run commands now functional in production Marketplace installs"
  - "Language server startup now uses primary path resolution (no temp file fallback)"
affects: [marketplace-submission, production-installs]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java

key-decisions:
  - "Fixed plugin ID mismatch by changing two PluginId.getId() string literals from 'com.basis.bbj.intellij' to 'com.basis.bbj'"

patterns-established: []

# Metrics
duration: 6min
completed: 2026-02-02
---

# Phase 13 Plan 01: Plugin ID Fix Summary

**Corrected hardcoded plugin ID references to match plugin.xml, unblocking BUI/DWC run commands and optimizing language server startup for production Marketplace installs**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-02T21:41:23Z
- **Completed:** 2026-02-02T21:47:23Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Fixed plugin ID mismatch in BbjLanguageServer.java (language server path resolution)
- Fixed plugin ID mismatch in BbjRunActionBase.java (web.bbj path resolution for BUI/DWC)
- Verified zero old plugin ID references remain in source code
- Rebuilt plugin distribution with corrected classes
- Confirmed plugin verifier passes with zero compatibility errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix PluginId.getId() callsites and rebuild distribution** - `409ec38` (fix)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` - Changed PluginId.getId() from "com.basis.bbj.intellij" to "com.basis.bbj" (line 70)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - Changed PluginId.getId() from "com.basis.bbj.intellij" to "com.basis.bbj" (line 231)

## Decisions Made

**Decision:** Changed PluginId.getId() string literals from "com.basis.bbj.intellij" to "com.basis.bbj" to match plugin.xml ID changed in Phase 12.

**Rationale:** Phase 12 commit 5add12d changed plugin.xml ID per Marketplace naming rules but left hardcoded Java references to the old ID. This broke BUI/DWC run commands entirely (getWebBbjPath() returned null) and degraded LS startup (primary path failed, fell back to temp file extraction). Fix was simple string literal change with immediate impact on production functionality.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward two-line fix followed by clean rebuild and verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Marketplace submission:**
- Plugin ID mismatch resolved
- BUI/DWC run commands functional
- Language server path resolution optimized
- Plugin verifier passes with zero compatibility errors
- Distribution ZIP rebuilt (bbj-intellij-0.1.0.zip, 685KB)

**No blockers:** All v1.2 requirements satisfied. Plugin ready for JetBrains Marketplace submission.

---
*Phase: 13-plugin-id-fix*
*Completed: 2026-02-02*
