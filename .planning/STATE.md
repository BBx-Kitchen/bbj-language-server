# Project State: BBj Language Server

**Last Updated:** 2026-02-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.9 Quick Wins — Phase 57: Bug Fixes

---

## Current Position

Phase: 57 of 59 (Bug Fixes)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-20 — v3.9 roadmap created (3 phases: 57-59)

Progress: [░░░░░░░░░░] 0% (v3.9)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 15
**Phases completed:** 56
**Plans completed:** 135
**Days elapsed:** 19
**Velocity:** ~6.7 plans/day

### Recent History

**v3.8 (Shipped: 2026-02-20):**
- Duration: 1 day
- Phases: 3 (54-56)
- Plans: 7
- Key: Fixed all test failures, re-enabled disabled assertions, removed dead code, resolved all production FIXMEs

**v3.7 (Shipped: 2026-02-20):**
- Duration: 1 day
- Phases: 4 (50-53)
- Plans: 7
- Key: Diagnostic noise reduction, Structure View resilience, BBjCPL compiler integration

---

## Accumulated Context

### Active Constraints

- TEST-03 (DEF FN `$` suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:
- [Phase 56]: method.docu populated at class resolution time so completion provider can access synchronously
- [Phase 56]: notifyJavaConnectionError uses window.showErrorMessage — user-actionable issue requiring prominent feedback
- [Phase 55]: Removed MethodCall CAST branches — unreachable since Phase 33 CastExpression grammar rule
- [Phase 54]: Use toContain/RegExp over toBe/string for error message assertions — tolerates future format changes
- [Phase 53]: bbj-notifications.ts isolation module — importing main.ts crashes tests at module load time

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change

### Blockers/Concerns

None

### Quick Tasks Completed

| # | Description | Date | Commit |
|---|-------------|------|--------|
| 14 | Fix manual release workflow: pass -Pversion to verifyPlugin/publishPlugin | 2026-02-17 | 8956e26 |
| 13 | Fix IntelliJ multi-instance language server: replace grace period with LSP4IJ native timeout | 2026-02-16 | 293fea5 |

---

## Session Continuity

Last session: 2026-02-20
Stopped at: v3.9 roadmap created — ready to plan Phase 57
Resume file: None

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
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | 7 | 2026-02-20 |
| v3.8 Test & Debt Cleanup | 54-56 | 7 | 2026-02-20 |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-20 after v3.9 roadmap creation*
