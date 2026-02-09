# Project State: BBj Language Server

**Last Updated:** 2026-02-09

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.5 Documentation for 0.8.0 Release - Phase 46 (VS Code Audit)

---

## Current Position

Phase: 45 of 47 (IntelliJ User Guide Creation) ✓ VERIFIED
Plan: All complete
Status: Phase verified — ready for Phase 46
Last activity: 2026-02-09 — Phase 45 verified (11/11 must-haves passed)

Progress: [██████████████████████████████████████████░░] 95% (45 of 47 phases complete)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 12
**Phases completed:** 44
**Plans completed:** 115
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

### Decisions

Recent decisions affecting v3.5:
- 44-02: Set onBrokenLinks to 'warn' temporarily during directory restructuring
- 44-02: Three hero buttons with equal visual weight for dual-IDE parity
- 44-02: Removed decompile reference to reflect actual v3.x commands
- v3.4: Generic LONGER_ALT order for all keyword-prefixed identifiers with type suffixes
- v3.4: Config path as ARGV(9) to web.bbj for backward-compatible parameter passing
- v3.3: Quiet startup via temporary ERROR level override until first document validation

Full decision log in PROJECT.md Key Decisions table.
- [Phase 45]: Document Settings UI path as Languages & Frameworks > BBj (IntelliJ native UI, not JSON)
- [Phase 45]: Log Level dropdown (Error/Warn/Info/Debug) documented instead of bbj.debug flag

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files

### Blockers/Concerns

None currently identified.

---

## Session Continuity

### What Just Happened

- Phase 45 executed and verified (2 plans, 1 wave parallel, 6 commits)
  - 45-01: Index, Getting Started, Features pages (IJUG-01, IJUG-02)
  - 45-02: Configuration, Commands pages (IJUG-03, IJUG-04)
  - Verification: 11/11 must-haves passed, all requirements (IJUG-01..04) satisfied
  - All 5 IntelliJ Guide pages complete — no "Coming Soon" stubs remaining

### What's Next

**Immediate:** Plan Phase 46 (VS Code User Guide Audit)

### Context for Next Session

**Project:** Langium 4.1.3 language server with 12 milestones shipped over 8 days
**Tech stack:** TypeScript, Node.js 20.18.1, Langium 4.1.3, vscode-languageserver 9.0.1
**Codebase size:** ~23,000 LOC TypeScript
**Test coverage:** 88% with V8 coverage (468 passing, 6 failing pre-existing)
**Deployment:** Both VS Code extension and IntelliJ plugin via LSP4IJ
**Documentation:** Docusaurus site at bbj-language-server/docs/

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

**Total velocity:** 115 plans across 12 milestones in 8 days

See: `.planning/MILESTONES.md`

### Phase 45 Execution

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 45-01 | 151s | 2 | 3 |
| 45-02 | 146s | 2 | 2 |

### Phase 44 Execution

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 44-01 | 105s | 2 | 23 |
| 44-02 | 119s | 2 | 2 |

---

*State updated: 2026-02-09 after completing 45-01-PLAN.md*

