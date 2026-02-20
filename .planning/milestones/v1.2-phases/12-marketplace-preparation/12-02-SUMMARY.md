---
phase: 12-marketplace-preparation
plan: 02
subsystem: marketplace
tags: [plugin-verifier, jetbrains-marketplace, compatibility, distribution-zip]

# Dependency graph
requires:
  - phase: 12-01
    provides: Complete marketplace metadata (description, LICENSE, NOTICES)
provides:
  - Plugin verifier passing with zero compatibility errors
  - Verified distribution ZIP ready for JetBrains Marketplace upload
  - Fixed plugin ID and untilBuild format per Marketplace requirements
affects: [marketplace-submission]

# Tech tracking
tech-stack:
  added: []
  patterns: [plugin-verifier-compliance, marketplace-plugin-id-rules]

key-files:
  created: []
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Changed plugin ID from 'com.basis.bbj.intellij' to 'com.basis.bbj' (Marketplace rule: no 'intellij' in ID)"
  - "Changed untilBuild to '242.*' wildcard format (empty string not allowed)"

patterns-established:
  - "Plugin verifier must pass with zero compatibility errors before Marketplace submission"
  - "Plugin ID must not contain 'intellij' keyword per Marketplace naming rules"
  - "untilBuild must use wildcard format (e.g., '242.*') not empty string"

# Metrics
duration: 15min
completed: 2026-02-02
---

# Phase 12 Plan 02: Plugin Verifier Compliance Summary

**Plugin verifier passing with zero compatibility errors after fixing plugin ID and untilBuild format, producing verified distribution ZIP ready for JetBrains Marketplace upload**

## Performance

- **Duration:** 15 minutes
- **Started:** 2026-02-02T21:05:00Z
- **Completed:** 2026-02-02T21:20:00Z
- **Tasks:** 2 (1 auto, 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- Fixed plugin ID to comply with Marketplace naming rules (removed 'intellij' keyword)
- Fixed untilBuild format to use wildcard pattern instead of empty string
- Plugin verifier now passes with zero compatibility errors (only expected LSP4IJ experimental API warnings)
- Distribution ZIP verified to contain all required Marketplace assets: plugin.xml, icons, LICENSE, NOTICES, language server, TextMate grammars
- Human verified distribution is complete and ready for upload (702KB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Run plugin verifier and fix any errors** - `5add12d` (fix)
2. **Task 2: Human verification checkpoint** - Approved (no commit - checkpoint only)

## Files Created/Modified

**Modified:**
- `bbj-intellij/build.gradle.kts` - Changed untilBuild from empty string to '242.*'
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Changed plugin ID from 'com.basis.bbj.intellij' to 'com.basis.bbj'

## Plugin Verifier Results

**Before fixes:**
- Plugin ID 'com.basis.bbj.intellij' violated Marketplace rule (no 'intellij' keyword allowed in plugin ID)
- untilBuild empty string caused verifier warnings

**After fixes:**
- **Compatibility errors:** 0 ✓
- **Deprecated API usage:** 2 (LSP4IJ internal, acceptable)
- **Experimental API usage:** 24 (LSP4IJ features, no stable alternatives available)
- **Distribution ZIP:** bbj-intellij-0.1.0.zip (686KB → 702KB after verification)

## Distribution ZIP Contents (Human Verified)

The user verified the distribution ZIP contains all required Marketplace assets:

- ✓ plugin.xml (with complete description, vendor, change notes)
- ✓ pluginIcon.svg (994 bytes, vector format)
- ✓ pluginIcon_dark.svg (dark theme variant)
- ✓ LICENSE (MIT License text)
- ✓ NOTICES (LSP4IJ, TextMate, Langium attributions)
- ✓ lib/language-server/main.cjs (bundled language server)
- ✓ lib/textmate/bbj-bundle/ (TextMate grammars for syntax highlighting)

**ZIP size:** 702KB (within Marketplace limits)

## Decisions Made

1. **Changed plugin ID to 'com.basis.bbj'** - JetBrains Marketplace naming rules prohibit 'intellij' keyword in plugin IDs. Removed '.intellij' suffix to comply. Plugin still works identically, just with cleaner ID.

2. **Set untilBuild to '242.*'** - Empty string is not a valid untilBuild format. Changed to '242.*' to indicate compatibility with all 2024.2.x minor versions. Aligns with sinceBuild='242.20224' in plugin.xml.

## Deviations from Plan

None - plan executed exactly as written. Plugin verifier found two issues (plugin ID and untilBuild format), both were fixed as part of Task 1's expected "fix any errors" scope.

## Issues Encountered

None - verifier issues were straightforward to fix once identified. Human verification checkpoint confirmed distribution is complete.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Marketplace submission ready:**
- ✓ Plugin verifier passes with zero compatibility errors
- ✓ Distribution ZIP contains all required files (verified by human)
- ✓ Plugin icon displays correctly (40x40 SVG, under 3KB)
- ✓ LICENSE and NOTICES included in distribution
- ✓ Description.html complete with verified feature list
- ✓ Version 0.1.0 with change notes

**Blockers/concerns:**
- None

**Next steps:**
- Upload bbj-intellij-0.1.0.zip to JetBrains Marketplace
- Complete marketplace listing form (name, category, tags)
- Submit for JetBrains review

---
*Phase: 12-marketplace-preparation*
*Completed: 2026-02-02*
