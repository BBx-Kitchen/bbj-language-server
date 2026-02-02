# Milestone v1.2: Run Fixes & Marketplace

**Status:** IN PROGRESS
**Phases:** 11-12
**Total Plans:** TBD

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
  3. Plugin distribution includes EULA or license text that users see during installation
  4. Running JetBrains plugin verifier produces zero errors (warnings acceptable)
**Plans:** 2 plans

Plans:
- [ ] 12-01-PLAN.md — Marketplace metadata, licensing, and Gradle configuration
- [ ] 12-02-PLAN.md — Plugin verifier compliance and final verification

## Progress

**Execution Order:** 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 11. Run Command Fixes | 2/2 | ✓ Complete | 2026-02-02 |
| 12. Marketplace Preparation | 0/2 | Not started | - |

---

## Milestone Summary

**Key Decisions:**

- Use java.nio.file.Files API for executable resolution (JDK-4956115 symbolic link handling)
- Route all run errors to LS log window only (no notification balloons)
- Gate run actions on LS started status to prevent bad state
- Eager BBj Home auto-detection in BbjSettings.getState()
- Move process launch off EDT to pooled thread
- Replace MainToolBar with ProjectViewPopupMenu submenu

**Issues Resolved:**

- BBj executable "not found" despite valid BBj Home (symbolic link issue)
- Toolbar buttons hidden in IntelliJ new UI (MainToolBar not shown by default)
- Process stderr silently lost (no capture)
- IDE lockup when running without LS connected
- BBj Home "not configured" false positive (auto-detection only in settings dialog)

**Issues Deferred:**

- Windows end-to-end testing (RUN-05) — no Windows environment available for automated testing

**Technical Debt Incurred:**

None

---

_For current project status, see .planning/STATE.md_
_Started: 2026-02-02_
