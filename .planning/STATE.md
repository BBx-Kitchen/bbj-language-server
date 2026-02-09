# Project State: BBj Language Server

**Last Updated:** 2026-02-09

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.5 Documentation for 0.8.0 Release

---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-09 — Milestone v3.5 started

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 12
**Phases completed:** 43
**Plans completed:** 110
**Days elapsed:** 8
**Velocity:** ~14 plans/day

### Recent History

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

**v3.2 (Shipped: 2026-02-08):**
- Duration: 2 days (2026-02-07 → 2026-02-08)
- Phases: 3 (32-34)
- Plans: 10 (including 4 gap closures)
- Files modified: 21 (+812 / -72 lines)
- Key: BBjAPI resolution, USE navigation, parser fixes

---

## Accumulated Context

### Active Constraints

**Never suppress console.error():** Error output must always be visible regardless of debug flag state
**Hot-reload all settings:** Settings changes via `onDidChangeConfiguration` must clear cached state

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files

### Known Blockers

None currently identified.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix duplicate BBj output channels created on each launch | 2026-02-08 | e0e3306 | [1-fix-duplicate-bbj-output-channels-create](./quick/1-fix-duplicate-bbj-output-channels-create/) |
| 2 | Fix em-login.bbj not found in IntelliJ plugin bundle | 2026-02-08 | 24804d4 | [2-fix-em-login-bbj-not-found-in-intellij-p](./quick/2-fix-em-login-bbj-not-found-in-intellij-p/) |
| 3 | Fix duplicate BBj output channel (LanguageClient) | 2026-02-08 | 16944c0 | [3-fix-duplicate-bbj-output-channel-ensure-](./quick/3-fix-duplicate-bbj-output-channel-ensure-/) |
| 4 | Fix IntelliJ BUI/DWC passing empty string as config argument | 2026-02-08 | 79f20a0 | [4-fix-intellij-bui-dwc-passing-dash-as-con](./quick/4-fix-intellij-bui-dwc-passing-dash-as-con/) |
| 5 | Fix EM token expiration — JWT expiry check and server-side validation before usage | 2026-02-09 | 34cee89 | [5-fix-em-token-expiration-jwt-expiry-check](./quick/5-fix-em-token-expiration-jwt-expiry-check/) |

---

## Session Continuity

### What Just Happened

- Milestone v3.5 started — Documentation for 0.8.0 Release
- Restructuring docs site for dual-IDE coverage (VS Code + IntelliJ)
- Removing Developer Guide from public site, removing stale Roadmap
- Auditing user guide pages for accuracy

### What's Next

**Immediate:** Define requirements and create roadmap for v3.5

### Context for Next Session

**Project:** Langium 4.1.3 language server with 12 milestones shipped over 8 days
**Tech stack:** TypeScript, Node.js 20.18.1, Langium 4.1.3, vscode-languageserver 9.0.1
**Codebase size:** ~23,000 LOC TypeScript
**Test coverage:** 88% with V8 coverage (468 passing, 6 failing pre-existing)
**Deployment:** Both VS Code extension and IntelliJ plugin via LSP4IJ

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

**Total velocity:** 110 plans across 12 milestones in 8 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-09 after v3.5 milestone started*
