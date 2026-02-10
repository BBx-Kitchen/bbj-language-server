# Project State: BBj Language Server

**Last Updated:** 2026-02-10

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.6 IntelliJ Platform API Compatibility — Phase 49: Fix Deprecated APIs and Verify

---

## Current Position

Phase: 49 of 49 (Fix Deprecated APIs and Verify)
Plan: 1 of 1 complete
Status: Phase 49 complete
Last activity: 2026-02-10 — Completed 49-01: Fix Deprecated APIs and Verify

Progress: [██████████████████████████████████████████████████] 100% (120/120 estimated plans)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 13
**Phases completed:** 49
**Plans completed:** 120
**Days elapsed:** 9
**Velocity:** ~13 plans/day

### Recent History

**v3.5 (Shipped: 2026-02-09):**
- Duration: 1 day
- Phases: 4 (44-47)
- Plans: 7
- Files modified: 41 (+3,689 / -1,695 lines)
- Key: Dual-IDE docs site, IntelliJ User Guide, VS Code audit, stale content cleanup

**v3.4 (Shipped: 2026-02-08):**
- Duration: 1 day
- Phases: 4 (40-43)
- Plans: 4
- Files modified: 25 (+1,052 / -52 lines)
- Key: Parser keyword fix, .bbl exclusion, toolbar cleanup, token auth fix, config.bbx support

**v3.3 (Shipped: 2026-02-08):**
- Duration: 1 day
- Phases: 5 (35-39)
- Plans: 6
- Files modified: 45 (+6,578 / -107 lines)
- Key: Logger infrastructure, debug flag, console migration, diagnostic filtering, parser ambiguity docs

---

## Accumulated Context

### Active Constraints

**IntelliJ plugin only:** All v3.6 work is in bbj-intellij/ directory (Java code)
**No language server changes:** These are IntelliJ Platform API replacements only
**Forward compatibility:** Ensure plugin works with IntelliJ 2026.1+

### Decisions

Full decision log in PROJECT.md Key Decisions table.
- [Phase 48]: Use TextBrowseFolderListener constructor pattern for browse folder listeners with title/description
- [Phase 48]: Remove null check on PluginId.getId() result as it never returns null
- [Phase 49]: Use ProcessListener interface instead of ProcessAdapter for process event handling
- [Phase 49]: Use customizeDefaults() mutation pattern instead of getDefaultCommonSettings() for code style configuration
- [Phase 49]: Use FileChooserDescriptor constructor pattern instead of deprecated factory methods

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files

### Blockers/Concerns

None — all v3.6 requirements are straightforward API replacements with clear IntelliJ Platform documentation.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 10 | Fix IntelliJ MainToolbar group registration: move compile action to EditorPopupMenu + ToolsMenu with alt+C shortcut | 2026-02-10 | 8c57712 | [10-fix-intellij-maintoolbar-group-registrat](./quick/10-fix-intellij-maintoolbar-group-registrat/) |
| 9 | Automate JetBrains Marketplace publishing in manual release workflow | 2026-02-10 | 576198d | [9-automate-jetbrains-marketplace-publishin](./quick/9-automate-jetbrains-marketplace-publishin/) |
| 8 | Fix documentation links: correct JetBrains Marketplace and BBj Documentation URLs | 2026-02-10 | c8b4b91 | [8-fix-documentation-links-add-jetbrains-ma](./quick/8-fix-documentation-links-add-jetbrains-ma/) |
| 7 | Add client info string to EM auth token: include OS and IDE info (e.g. "MacOS VS Code") in token payload | 2026-02-09 | 3f6aa1f | [7-add-client-info-string-to-em-auth-token-](./quick/7-add-client-info-string-to-em-auth-token-/) |
| 6 | Fix em-login.bbj and em-validate-token.bbj Windows compatibility: replace -tIO with GUI client using PRINT HIDE and temp file output | 2026-02-09 | 5cb33ab | [6-fix-em-login-bbj-and-em-validate-token-b](./quick/6-fix-em-login-bbj-and-em-validate-token-b/) |

---
| Phase 48 P01 | 180 | 2 tasks | 3 files |
| Phase 49 P01 | 501 | 2 tasks | 3 files |

## Session Continuity

### What Just Happened

- Completed Phase 49 Plan 01: Fix Deprecated APIs and Verify
  - Replaced ProcessAdapter with ProcessListener interface (COMPAT-05)
  - Replaced getDefaultCommonSettings() with customizeDefaults() (COMPAT-06)
  - Fixed deprecated createSingleFileDescriptor with FileChooserDescriptor constructor (bug from Phase 48)
  - Ran plugin verifier across 6 IntelliJ IDE versions (2024.2 to 2026.1 EAP)
  - Verified zero deprecated and zero scheduled-for-removal API usages (VERIFY-01, VERIFY-02)
- v3.6 milestone complete: Zero IntelliJ Platform compatibility warnings
- 3 files modified, 2 commits created
- Duration: 501 seconds

### What's Next

**Immediate:** Milestone v3.6 complete — ready for release or next milestone planning

### Context for Next Session

**Milestone v3.6 status:** Complete (phases 48-49, 2/2 plans)
**All IntelliJ Platform API compatibility issues resolved:**
- 0 scheduled-for-removal API usages
- 0 deprecated API usages
- 19 experimental API usages from LSP4IJ (expected, tracked in tech debt)
**Forward compatibility:** Plugin verified against IntelliJ 2024.2 through 2026.1 EAP

---

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |
| v2.2 IntelliJ Build & Release Automation | 21-23 | 3 | 2026-02-05 |
| v3.0 Improving BBj Language Support | 24-27 | 11 | 2026-02-06 |
| v3.1 PRIO 1+2 Issue Burndown | 28-31 | 13 | 2026-02-07 |
| v3.2 Bug Fix Release | 32-34 | 10 | 2026-02-08 |
| v3.3 Output & Diagnostic Cleanup | 35-39 | 6 | 2026-02-08 |
| v3.4 0.8.0 Issue Closure | 40-43 | 4 | 2026-02-08 |
| v3.5 Documentation for 0.8.0 Release | 44-47 | 7 | 2026-02-09 |
| v3.6 IntelliJ Platform API Compatibility | 48-49 | 2 | 2026-02-10 |

**Total velocity:** 120 plans across 14 milestones in 9 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-10 after completing Phase 49 Plan 01*
