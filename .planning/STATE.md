# Project State: BBj Language Server

**Last Updated:** 2026-02-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.8 Test & Debt Cleanup — Phase 54: Fix Failing Tests

---

## Current Position

Phase: 54 of 56 (Fix Failing Tests)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-02-20 — Completed 54-01-PLAN.md (TEST-01, TEST-02, TEST-05, TEST-06 fixed)

Progress: [█░░░░░░░░░] 10% (v3.8)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 14
**Phases completed:** 53
**Plans completed:** 129
**Days elapsed:** 19
**Velocity:** ~6.7 plans/day

### Recent History

**v3.7 (Shipped: 2026-02-20):**
- Duration: 1 day
- Phases: 4 (50-53)
- Plans: 7
- Key: Diagnostic noise reduction, Structure View resilience, BBjCPL compiler integration

**v3.6 (Shipped: 2026-02-10):**
- Duration: 1 day
- Phases: 2 (48-49)
- Plans: 2
- Key: IntelliJ Platform API compatibility — zero deprecated/scheduled-for-removal warnings

### v3.8 Plan Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 54-fix-failing-tests P01 | 2 min | 2 | 2 |

---

## Accumulated Context

### Active Constraints

- TEST-03 (DEF FN `$` suffix completion) may be a real bug requiring implementation changes — scope confirmed in Phase 54
- FIX-01 (bbj-linker.ts receiver ref) and FIX-02 (bbj-scope.ts orphaned AST hack) may be intentional — Phase 56 resolves the ambiguity
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:
- [Phase 53]: bbj-notifications.ts isolation module — importing main.ts crashes tests at module load time
- [Phase 53]: BBjCPL called from inside buildDocuments(), never from onBuildPhase (CPU rebuild loop prevention)
- [Phase 52]: Cancel flag + proc.kill() over AbortController — AbortController crashes vitest worker on ENOENT
- [Phase 50]: Per-file suppression only — File B linking errors survive when File A has parse errors
- [Phase 54]: Use toContain/RegExp over toBe/string for error message assertions in tests — tolerates future message format changes

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
Stopped at: Completed 54-fix-failing-tests-01-PLAN.md
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
| v3.8 Test & Debt Cleanup | 54-56 | TBD | In progress |

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-20 after completing 54-01-PLAN.md*
