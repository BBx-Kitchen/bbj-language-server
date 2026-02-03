---
phase: 12-marketplace-preparation
plan: 01
subsystem: marketplace
tags: [jetbrains-marketplace, gradle, metadata, licensing]

# Dependency graph
requires:
  - phase: 11-run-command-fixes
    provides: Working run commands for GUI/BUI/DWC programs
provides:
  - Complete marketplace metadata (description.html with verified features)
  - MIT License file in plugin distribution
  - NOTICES file with third-party attributions (LSP4IJ, TextMate, Langium)
  - Gradle configuration with version 0.1.0, change notes, and plugin verification
affects: [12-02-icon-assets, marketplace-submission]

# Tech tracking
tech-stack:
  added: []
  patterns: [verified-feature-listing, marketplace-compliant-html, third-party-attribution]

key-files:
  created:
    - bbj-intellij/src/main/resources/META-INF/LICENSE
    - bbj-intellij/src/main/resources/META-INF/NOTICES
  modified:
    - bbj-intellij/src/main/resources/META-INF/description.html
    - bbj-intellij/build.gradle.kts

key-decisions:
  - "Only list features with confirmed codebase implementation evidence"
  - "Remove CDATA wrapper from Gradle changeNotes (patchPluginXml adds it automatically)"
  - "Use recommended() for pluginVerification IDE selection (auto-aligns with sinceBuild/untilBuild)"

patterns-established:
  - "Feature verification before marketplace claims: search codebase for implementation evidence (BBjHoverProvider, BBjCompletionProvider, etc.) before listing feature"
  - "Marketplace-safe HTML: only p, ul, li, strong, em, a tags in description.html"
  - "NOTICES structure: separator lines between dependencies, include copyright, license type, and source URL"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 12 Plan 01: Marketplace Preparation Summary

**Marketplace metadata with verified feature list, MIT License, third-party NOTICES, and Gradle 0.1.0 config with plugin verification**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-02T20:06:56Z
- **Completed:** 2026-02-02T20:09:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Verified all implemented features by searching codebase (BBjHoverProvider, BBjCompletionProvider, BBjSignatureHelpProvider, BBjNodeKindProvider, run actions)
- Created description.html with honest feature list and shared language server mention
- Created LICENSE and NOTICES files for plugin distribution compliance
- Updated build.gradle.kts to version 0.1.0 with change notes and plugin verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify features, update description.html, and create LICENSE + NOTICES files** - `e3e8f40` (feat)
2. **Task 2: Update build.gradle.kts with version, changeNotes, and pluginVerification** - `504c4b5` (feat)

## Files Created/Modified

**Created:**
- `bbj-intellij/src/main/resources/META-INF/LICENSE` - MIT License for plugin distribution
- `bbj-intellij/src/main/resources/META-INF/NOTICES` - Third-party attributions (LSP4IJ EPL-2.0, TextMate MIT, Langium MIT)

**Modified:**
- `bbj-intellij/src/main/resources/META-INF/description.html` - Updated with verified feature list (9 features), shared language server mention, GitHub link, only marketplace-safe HTML tags
- `bbj-intellij/build.gradle.kts` - Version 0.1.0, changeNotes with initial release feature list, pluginVerification with recommended()

## Feature Verification Evidence

Before writing description.html, verified each feature by searching codebase:

- **Syntax highlighting:** bbj.tmLanguage.json and bbx.tmLanguage.json exist in syntaxes/
- **Real-time diagnostics:** BBjValidator and BBjDocumentValidator registered
- **Code completion:** BBjCompletionProvider registered in bbj-module.ts
- **Go-to-definition:** Langium default (BbjLinker exists)
- **Hover documentation:** BBjHoverProvider registered
- **Signature help:** BBjSignatureHelpProvider registered
- **Java interop intelligence:** JavaInteropService exists
- **Run commands:** BbjRunGuiAction, BbjRunBuiAction, BbjRunDwcAction exist (Phase 11)
- **Document outline:** BBjNodeKindProvider exists (structure view support)

All 9 features listed in description.html and changeNotes have concrete implementation evidence.

## Decisions Made

1. **Remove CDATA wrapper from Gradle changeNotes** - Initial attempt wrapped changeNotes in `<![CDATA[...]]>` but Gradle's patchPluginXml task already wraps it, causing "CDATA cannot internally contain a CDATA ending delimiter" error. Removed wrapper, letting Gradle handle it automatically.

2. **Use recommended() for pluginVerification** - Instead of hardcoding IDE versions, use `recommended()` which auto-selects based on sinceBuild/untilBuild from pluginConfiguration, preventing version mismatches.

3. **Verify features before claiming** - Critical decision per CONTEXT.md requirement: search codebase for implementation evidence (provider classes, action implementations) before listing any feature in marketplace metadata. Ensures honest feature list.

## Deviations from Plan

**1. [Rule 3 - Blocking] Removed CDATA wrapper from changeNotes**
- **Found during:** Task 2 (running verifyPluginProjectConfiguration)
- **Issue:** Gradle build failed with "CDATA cannot internally contain a CDATA ending delimiter (]]>)" error because patchPluginXml task adds CDATA wrapper automatically
- **Fix:** Removed `<![CDATA[` and `]]>` from changeNotes string in build.gradle.kts, letting Gradle plugin handle CDATA wrapping
- **Files modified:** bbj-intellij/build.gradle.kts
- **Verification:** verifyPluginProjectConfiguration passed, buildPlugin succeeded
- **Committed in:** 504c4b5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Single auto-fix required to unblock Gradle build. No scope creep.

## Issues Encountered

None - feature verification and metadata creation went smoothly. CDATA wrapper issue was quickly resolved by removing manual wrapper.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for icon assets (Plan 02):**
- description.html complete with marketplace-safe HTML
- LICENSE and NOTICES files ready for distribution
- build.gradle.kts configured for marketplace submission
- Plugin builds successfully (686KB distribution ZIP)

**Blockers/concerns:**
- None

**Verification passed:**
- verifyPluginProjectConfiguration: SUCCESS
- buildPlugin: SUCCESS (produces bbj-intellij-0.1.0.zip)
- LICENSE and NOTICES confirmed in JAR META-INF/
- Feature lists in description.html and changeNotes match (same 9 verified features)

---
*Phase: 12-marketplace-preparation*
*Completed: 2026-02-02*
