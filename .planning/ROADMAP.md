# Milestone v1.2: Run Fixes & Marketplace

**Status:** COMPLETE
**Phases:** 11-13
**Total Plans:** 5

## Overview

Fix broken run commands, capture console output for proper debugging, and prepare the plugin for JetBrains Marketplace publication with all required assets and approval criteria.

## Phases

### Phase 11: Run Command Fixes

**Goal**: Run commands work reliably across platforms with proper console output capture
**Depends on**: Nothing (first phase of v1.2; fixes issues from v1.1 Phase 8)
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05
**Success Criteria** (what must be TRUE):
  1. User configures BBj Home path in settings, and the BBj executable is correctly resolved and found for run commands
  2. Run toolbar buttons (GUI/BUI/DWC) are visible in IntelliJ's new UI (Community and Ultimate editions)
  3. User runs a BBj program, and stdout/stderr output appears in IntelliJ's console tool window (not lost)
  4. User runs a BBj program as GUI/BUI/DWC on macOS and all three modes execute successfully
  5. User runs a BBj program as GUI/BUI/DWC on Windows and all three modes execute successfully
**Plans:** 2 plans

Plans:
- [x] 11-01-PLAN.md — Fix executable resolution and add stderr capture
- [x] 11-02-PLAN.md — Fix toolbar visibility and add context menu

### Phase 12: Marketplace Preparation

**Goal**: Plugin meets all JetBrains Marketplace approval criteria and is ready for first publication
**Depends on**: Phase 11 (marketplace submission requires working functionality)
**Requirements**: MKT-01, MKT-02, MKT-03, MKT-04
**Success Criteria** (what must be TRUE):
  1. Plugin has a 40x40 and 80x80 logo/icon that displays correctly in JetBrains Marketplace listings
  2. plugin.xml contains complete description, vendor information, and change notes suitable for Marketplace listing
  3. Plugin distribution includes MIT License file in META-INF
  4. Running JetBrains plugin verifier produces zero errors (warnings acceptable)
**Plans:** 2 plans

Plans:
- [x] 12-01-PLAN.md — Marketplace metadata, licensing, and Gradle configuration
- [x] 12-02-PLAN.md — Plugin verifier compliance and final verification

### Phase 13: Plugin ID Fix

**Goal**: Fix plugin ID mismatch so BUI/DWC run commands and LS path resolution work in production Marketplace installs
**Depends on**: Phase 12 (plugin ID was changed in 12-02)
**Requirements**: (closes audit gaps, no new requirements)
**Gap Closure**: Fixes integration gap and 2 broken E2E flows from v1.2-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. All `PluginId.getId()` calls in Java source use `"com.basis.bbj"` matching plugin.xml `<id>`
  2. BUI/DWC run commands can resolve web.bbj path from plugin bundle in production installs
  3. Language server resolves main.cjs via plugin path (not classloader fallback) in production installs
  4. Plugin verifier still passes with zero compatibility errors after fix
  5. Distribution ZIP rebuilt with corrected classes
**Plans:** 1 plan

Plans:
- [x] 13-01-PLAN.md — Fix PluginId.getId() callsites and rebuild distribution

## Progress

**Execution Order:** 11 -> 12 -> 13

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Run Command Fixes | 2/2 | ✓ Complete | 2026-02-02 |
| 12. Marketplace Preparation | 2/2 | ✓ Complete | 2026-02-02 |
| 13. Plugin ID Fix | 1/1 | ✓ Complete | 2026-02-02 |

---

## Milestone Summary

**Key Decisions:**

- Use java.nio.file.Files API for executable resolution (JDK-4956115 symbolic link handling)
- Route all run errors to LS log window only (no notification balloons)
- Gate run actions on LS started status to prevent bad state
- Eager BBj Home auto-detection in BbjSettings.getState()
- Move process launch off EDT to pooled thread
- Replace MainToolBar with ProjectViewPopupMenu submenu
- Only list features with confirmed codebase implementation evidence in marketplace listing
- Plugin ID `com.basis.bbj` (removed 'intellij' per Marketplace naming rules)
- Use `recommended()` for pluginVerification IDE selection
- untilBuild `242.*` wildcard format (empty string not valid)

**Issues Resolved:**

- BBj executable "not found" despite valid BBj Home (symbolic link issue)
- Toolbar buttons hidden in IntelliJ new UI (MainToolBar not shown by default)
- Process stderr silently lost (no capture)
- IDE lockup when running without LS connected
- BBj Home "not configured" false positive (auto-detection only in settings dialog)
- Plugin verifier errors: plugin ID contained 'intellij' keyword, untilBuild empty string
- CDATA wrapper collision in Gradle changeNotes (patchPluginXml adds it automatically)

**Issues Resolved (Marketplace):**

- Plugin icon SVGs (40x40 scalable) already existed, verified in distribution
- All 9 features verified against codebase before claiming in marketplace listing
- MIT License and third-party NOTICES included in distribution META-INF

**Issues Resolved (Gap Closure):**

- Plugin ID mismatch: PluginId.getId() calls used old "com.basis.bbj.intellij" instead of "com.basis.bbj" — broke BUI/DWC run and degraded LS startup in production

**Issues Deferred:**

- Windows end-to-end testing (RUN-05) — no Windows environment available for automated testing

**Technical Debt Incurred:**

None

---

_For current project status, see .planning/STATE.md_
_Started: 2026-02-02_
