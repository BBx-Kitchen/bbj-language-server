# Project State: BBj Language Server

**Last Updated:** 2026-02-10

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Planning next milestone

---

## Current Position

Phase: N/A — between milestones
Status: v3.6 milestone complete
Last activity: 2026-02-16 — Completed quick task 11: Enhance EM auth token info-string

Progress: [██████████████████████████████████████████████████] 100% (14 milestones shipped)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 14
**Phases completed:** 49
**Plans completed:** 121
**Days elapsed:** 10
**Velocity:** ~12 plans/day

### Recent History

**v3.6 (Shipped: 2026-02-10):**
- Duration: 1 day
- Phases: 2 (48-49)
- Plans: 2
- Files modified: 12 (+658 / -63 lines)
- Key: IntelliJ Platform API compatibility — zero deprecated/scheduled-for-removal warnings

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

---

## Accumulated Context

### Active Constraints

(None — between milestones)

### Decisions

Full decision log in PROJECT.md Key Decisions table.

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)

### Blockers/Concerns

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 11 | Enhance EM auth token info-string: rename payload key to "info-string", enrich format to "{IDE} on {platform} as {username}" | 2026-02-16 | 5a5b6ed | [11-enhance-em-auth-token-info-string-change](./quick/11-enhance-em-auth-token-info-string-change/) |
| 10 | Fix IntelliJ MainToolbar group registration: move compile action to EditorPopupMenu + ToolsMenu with alt+C shortcut | 2026-02-10 | 8c57712 | [10-fix-intellij-maintoolbar-group-registrat](./quick/10-fix-intellij-maintoolbar-group-registrat/) |
| 9 | Automate JetBrains Marketplace publishing in manual release workflow | 2026-02-10 | 576198d | [9-automate-jetbrains-marketplace-publishin](./quick/9-automate-jetbrains-marketplace-publishin/) |
| 8 | Fix documentation links: correct JetBrains Marketplace and BBj Documentation URLs | 2026-02-10 | c8b4b91 | [8-fix-documentation-links-add-jetbrains-ma](./quick/8-fix-documentation-links-add-jetbrains-ma/) |
| 7 | Add client info string to EM auth token: include OS and IDE info (e.g. "MacOS VS Code") in token payload | 2026-02-09 | 3f6aa1f | [7-add-client-info-string-to-em-auth-token-](./quick/7-add-client-info-string-to-em-auth-token-/) |
| 6 | Fix em-login.bbj and em-validate-token.bbj Windows compatibility: replace -tIO with GUI client using PRINT HIDE and temp file output | 2026-02-09 | 5cb33ab | [6-fix-em-login-bbj-and-em-validate-token-b](./quick/6-fix-em-login-bbj-and-em-validate-token-b/) |

---

## Session Continuity

### What Just Happened

- Shipped v3.6 IntelliJ Platform API Compatibility milestone
- All deprecated and scheduled-for-removal IntelliJ Platform APIs replaced
- Plugin verifier confirms zero compatibility warnings across 6 IDE versions

### What's Next

**Immediate:** `/gsd:new-milestone` — start next milestone

### Context for Next Session

**All milestones complete.** No active work. Ready for next milestone planning.

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

**Total velocity:** 121 plans across 14 milestones in 10 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-10 after v3.6 milestone complete*
