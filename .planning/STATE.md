# Project State: BBj Language Server

**Last Updated:** 2026-02-10

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.6 IntelliJ Platform API Compatibility

---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-10 — Milestone v3.6 started

Progress: 13 milestones shipped, 47 phases complete, 118 plans shipped

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 13
**Phases completed:** 47
**Plans completed:** 118
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

**Never suppress console.error():** Error output must always be visible regardless of debug flag state
**Hot-reload all settings:** Settings changes via `onDidChangeConfiguration` must clear cached state

### Decisions

Full decision log in PROJECT.md Key Decisions table.

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files

### Blockers/Concerns

None currently identified.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 10 | Fix IntelliJ MainToolbar group registration: move compile action to EditorPopupMenu + ToolsMenu with alt+C shortcut | 2026-02-10 | 8c57712 | [10-fix-intellij-maintoolbar-group-registrat](./quick/10-fix-intellij-maintoolbar-group-registrat/) |
| 9 | Automate JetBrains Marketplace publishing in manual release workflow | 2026-02-10 | 576198d | [9-automate-jetbrains-marketplace-publishin](./quick/9-automate-jetbrains-marketplace-publishin/) |
| 8 | Fix documentation links: correct JetBrains Marketplace and BBj Documentation URLs | 2026-02-10 | c8b4b91 | [8-fix-documentation-links-add-jetbrains-ma](./quick/8-fix-documentation-links-add-jetbrains-ma/) |
| 7 | Add client info string to EM auth token: include OS and IDE info (e.g. "MacOS VS Code") in token payload | 2026-02-09 | 3f6aa1f | [7-add-client-info-string-to-em-auth-token-](./quick/7-add-client-info-string-to-em-auth-token-/) |
| 6 | Fix em-login.bbj and em-validate-token.bbj Windows compatibility: replace -tIO with GUI client using PRINT HIDE and temp file output | 2026-02-09 | 5cb33ab | [6-fix-em-login-bbj-and-em-validate-token-b](./quick/6-fix-em-login-bbj-and-em-validate-token-b/) |

---

## Session Continuity

### What Just Happened

- v3.6 IntelliJ Platform API Compatibility milestone started
  - JetBrains plugin verifier flagged 4 scheduled-for-removal and 4 deprecated API usages
  - 19 experimental API usages (all LSP4IJ) accepted as unavoidable

### What's Next

**Immediate:** Define requirements and create roadmap

### Context for Next Session

**Project:** Langium 4.1.3 language server with 13 milestones shipped over 9 days
**Tech stack:** TypeScript, Node.js 20.18.1, Langium 4.1.3, vscode-languageserver 9.0.1
**Codebase size:** ~23,000 LOC TypeScript
**Test coverage:** 88% with V8 coverage (468 passing, 6 failing pre-existing)
**Deployment:** Both VS Code extension and IntelliJ plugin via LSP4IJ
**Documentation:** Docusaurus site with dual-IDE guides (VS Code + IntelliJ)

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

**Total velocity:** 118 plans across 13 milestones in 9 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-10 after v3.6 milestone started*
