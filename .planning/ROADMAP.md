# Roadmap: BBj Language Server

## Milestones

- ✅ **v1.0 Internal Alpha** — Phases 1-6 (shipped 2026-02-01)
- ✅ **v1.1 Polish & Run Commands** — Phases 7-10 (shipped 2026-02-02)
- ✅ **v1.2 Run Fixes & Marketplace** — Phases 11-13 (shipped 2026-02-02)
- ✅ **v2.0 Langium 4 Upgrade** — Phases 14-20 (shipped 2026-02-04)
- ✅ **v2.1 Feature Gap Analysis** — Research only (shipped 2026-02-04)
- ✅ **v2.2 IntelliJ Build & Release Automation** — Phases 21-23 (shipped 2026-02-05)
- ✅ **v3.0 Improving BBj Language Support** — Phases 24-27 (shipped 2026-02-06)
- ✅ **v3.1 PRIO 1+2 Issue Burndown** — Phases 28-31 (shipped 2026-02-07)
- ✅ **v3.2 Bug Fix Release** — Phases 32-34 (shipped 2026-02-08)
- ✅ **v3.3 Output & Diagnostic Cleanup** — Phases 35-39 (shipped 2026-02-08)
- ✅ **v3.4 0.8.0 Issue Closure** — Phases 40-43 (shipped 2026-02-08)
- 🚧 **v3.5 Documentation for 0.8.0 Release** — Phases 44-47 (in progress)

## Phases

<details>
<summary>✅ v1.0 Internal Alpha (Phases 1-6) — SHIPPED 2026-02-01</summary>

- [x] Phase 1: Plugin Scaffolding (3/3 plans)
- [x] Phase 2: Syntax Highlighting (2/2 plans)
- [x] Phase 3: Settings & Runtime (3/3 plans)
- [x] Phase 4: Language Server Integration (5/5 plans)
- [x] Phase 5: Java Interop (3/3 plans)
- [x] Phase 6: Distribution (3/3 plans)

</details>

<details>
<summary>✅ v1.1 Polish & Run Commands (Phases 7-10) — SHIPPED 2026-02-02</summary>

- [x] Phase 7: Brand Icons (1/1 plan)
- [x] Phase 8: Run Commands (2/2 plans)
- [x] Phase 9: Structure View (1/1 plan)
- [x] Phase 10: Bug Fixes & Polish (2/2 plans)

</details>

<details>
<summary>✅ v1.2 Run Fixes & Marketplace (Phases 11-13) — SHIPPED 2026-02-02</summary>

- [x] Phase 11: Run Command Fixes (2/2 plans)
- [x] Phase 12: Marketplace Preparation (2/2 plans)
- [x] Phase 13: Plugin ID Fix (1/1 plan)

</details>

<details>
<summary>✅ v2.0 Langium 4 Upgrade (Phases 14-20) — SHIPPED 2026-02-04</summary>

- [x] Phase 14: Deps & Grammar (1/1 plan)
- [x] Phase 15: Core API Renames & Type Constants (2/2 plans)
- [x] Phase 16: API Signature & Deprecated API Migration (2/2 plans)
- [x] Phase 17: Build Verification & Test Suite (2/2 plans)
- [x] Phase 18: Functional Verification & Release (2/2 plans)
- [x] Phase 19: Test Plan (1/1 plan)
- [x] Phase 20: Human QA Testing (1/1 plan)

</details>

<details>
<summary>✅ v2.1 Feature Gap Analysis — SHIPPED 2026-02-04</summary>

Research-only milestone — no phases.

</details>

<details>
<summary>✅ v2.2 IntelliJ Build & Release Automation (Phases 21-23) — SHIPPED 2026-02-05</summary>

- [x] Phase 21: Preview Workflow (1/1 plan)
- [x] Phase 22: Release Workflow (1/1 plan)
- [x] Phase 23: PR Validation (1/1 plan)

</details>

<details>
<summary>✅ v3.0 Improving BBj Language Support (Phases 24-27) — SHIPPED 2026-02-06</summary>

- [x] Phase 24: Grammar & Parsing Fixes (3/3 plans)
- [x] Phase 25: Type Resolution & Crash Fixes (3/3 plans)
- [x] Phase 26: CPU Stability (2/2 plans)
- [x] Phase 27: IDE Polish (3/3 plans)

</details>

<details>
<summary>✅ v3.1 PRIO 1+2 Issue Burndown (Phases 28-31) — SHIPPED 2026-02-07</summary>

- [x] Phase 28: Variable Scoping & Declaration Order (4/4 plans)
- [x] Phase 29: DEF FN & Inheritance Resolution (3/3 plans)
- [x] Phase 30: Java Reflection & Error Reporting (3/3 plans)
- [x] Phase 31: Extension Settings & File Types (3/3 plans)

</details>

<details>
<summary>✅ v3.2 Bug Fix Release (Phases 32-34) — SHIPPED 2026-02-08</summary>

- [x] Phase 32: Regression Fixes (4/4 plans)
- [x] Phase 33: Parser & Lexer Fixes (4/4 plans)
- [x] Phase 34: Diagnostic Polish (2/2 plans)

</details>

<details>
<summary>✅ v3.3 Output & Diagnostic Cleanup (Phases 35-39) — SHIPPED 2026-02-08</summary>

- [x] Phase 35: Logger Infrastructure (1/1 plan)
- [x] Phase 36: Settings Plumbing (1/1 plan)
- [x] Phase 37: Console Migration (2/2 plans)
- [x] Phase 38: Diagnostic Filtering (1/1 plan)
- [x] Phase 39: Parser Diagnostics (1/1 plan)

</details>

<details>
<summary>✅ v3.4 0.8.0 Issue Closure (Phases 40-43) — SHIPPED 2026-02-08</summary>

- [x] Phase 40: Parser Fix (1/1 plan)
- [x] Phase 41: File Type Fix (1/1 plan)
- [x] Phase 42: Toolbar Button Polish (1/1 plan)
- [x] Phase 43: Run Command Fixes (1/1 plan)

</details>

### 🚧 v3.5 Documentation for 0.8.0 Release (In Progress)

**Milestone Goal:** Restructure the Docusaurus documentation site for dual-IDE coverage (VS Code + IntelliJ), audit user guide pages for accuracy, remove developer guide from public site, and update site chrome — ready for 0.8.0 release.

#### Phase 44: Site Chrome for Dual-IDE Support
**Goal**: Documentation site presents both VS Code and IntelliJ as equal first-class citizens
**Depends on**: Nothing (first phase of milestone)
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. Site tagline references both VS Code and IntelliJ
  2. JetBrains Marketplace link appears in navbar and footer alongside VS Code Marketplace
  3. Developer Guide is removed from navbar and footer navigation
  4. Landing page presents both IDEs with equal marketplace link prominence
**Plans**: 2 plans

Plans:
- [ ] 44-01-PLAN.md — Restructure docs directories (move user-guide to vscode/, create intellij/ stubs, delete developer-guide/)
- [ ] 44-02-PLAN.md — Update site config, navbar, footer, and landing page for dual-IDE presentation

#### Phase 45: IntelliJ User Guide Creation
**Goal**: IntelliJ users have complete documentation covering getting started, features, configuration, and commands
**Depends on**: Phase 44 (site infrastructure ready)
**Requirements**: IJUG-01, IJUG-02, IJUG-03, IJUG-04
**Success Criteria** (what must be TRUE):
  1. IntelliJ Getting Started page documents installation from JetBrains Marketplace and .zip file with initial setup steps
  2. IntelliJ Features page documents all working features (completion, diagnostics, hover, go-to-definition, structure view, run commands, syntax highlighting, Java interop)
  3. IntelliJ Configuration page documents Settings UI with all available settings (BBj Home, classpath, interop host/port, config.bbx, debug flag, EM token auth)
  4. IntelliJ Commands page documents all keyboard shortcuts (Alt+G/B/D), toolbar buttons, and context menu actions
**Plans**: TBD

Plans:
- [ ] 45-01: TBD

#### Phase 46: VS Code User Guide Audit
**Goal**: VS Code documentation accurately reflects current extension capabilities without phantom features
**Depends on**: Phase 45 (parallel with IntelliJ guide ensures consistency)
**Requirements**: VSCA-01, VSCA-02, VSCA-03, VSCA-04, VSCA-05
**Success Criteria** (what must be TRUE):
  1. Features page lists only implemented features and includes all v3.x additions (EM token auth, debug flag, type resolution warnings, config.bbx, interop settings)
  2. Configuration page documents token-based EM authentication instead of plaintext passwords, includes all new settings from v3.x
  3. Commands page lists only existing commands (removes Decompile, includes Refresh Java Classes)
  4. Getting Started page installation steps match current extension behavior
  5. File types table correctly documents .bbl exclusion from source features, .bbx and .src inclusion
**Plans**: TBD

Plans:
- [ ] 46-01: TBD

#### Phase 47: Documentation Cleanup
**Goal**: Documentation site is free of stale content that confuses users
**Depends on**: Phase 46 (cleanup after content updates)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. Roadmap page is removed entirely from docs site
  2. Developer Guide directory and all pages are removed from docs site
  3. Sidebar and category metadata reflect new structure without references to removed content
**Plans**: TBD

Plans:
- [ ] 47-01: TBD

## Progress

<details>
<summary>✅ Completed Milestones (v1.0 - v3.4)</summary>

| Phase Range | Milestone | Plans | Status | Shipped |
|-------------|-----------|-------|--------|---------|
| 1-6 | v1.0 Internal Alpha | 19 | ✓ Complete | 2026-02-01 |
| 7-10 | v1.1 Polish & Run Commands | 6 | ✓ Complete | 2026-02-02 |
| 11-13 | v1.2 Run Fixes & Marketplace | 5 | ✓ Complete | 2026-02-02 |
| 14-20 | v2.0 Langium 4 Upgrade | 11 | ✓ Complete | 2026-02-04 |
| N/A | v2.1 Feature Gap Analysis | N/A | ✓ Complete | 2026-02-04 |
| 21-23 | v2.2 IntelliJ Build & Release | 3 | ✓ Complete | 2026-02-05 |
| 24-27 | v3.0 BBj Language Support | 11 | ✓ Complete | 2026-02-06 |
| 28-31 | v3.1 PRIO 1+2 Burndown | 13 | ✓ Complete | 2026-02-07 |
| 32-34 | v3.2 Bug Fix Release | 10 | ✓ Complete | 2026-02-08 |
| 35-39 | v3.3 Output & Diagnostic Cleanup | 6 | ✓ Complete | 2026-02-08 |
| 40-43 | v3.4 0.8.0 Issue Closure | 4 | ✓ Complete | 2026-02-08 |

</details>

### v3.5 Documentation for 0.8.0 Release

**Execution Order:**
Phases execute in numeric order: 44 → 45 → 46 → 47

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 44. Site Chrome | 0/TBD | Not started | - |
| 45. IntelliJ Guide | 0/TBD | Not started | - |
| 46. VS Code Audit | 0/TBD | Not started | - |
| 47. Cleanup | 0/TBD | Not started | - |

**Total:** 12 milestones shipped, 43 phases complete, 110 plans shipped

---

*Roadmap last updated: 2026-02-09 after v3.5 roadmap created*
