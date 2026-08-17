---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Stability and Quality
current_phase: 60
current_phase_name: baseline-resync-review-standards
status: executing
stopped_at: Completed 60-02-PLAN.md (INVENTORY.md expanded to 21 review units, applicability grid, surface accounting; BASE-03 complete)
last_updated: "2026-08-17T19:11:17.424Z"
last_activity: 2026-08-17
last_activity_desc: Roadmap created for v4.0 (Phases 60-69, 38 requirements mapped, 100% coverage)
progress:
  total_phases: 10
  completed_phases: 0
  total_plans: 4
  completed_plans: 2
  percent: 50
---

# Project State: BBj Language Server

**Last Updated:** 2026-08-17

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-17)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** Phase 60 — baseline-resync-review-standards

---

## Current Position

Phase: 60 (baseline-resync-review-standards) — EXECUTING
Plan: 3 of 4
Status: Ready to execute
Last activity: 2026-08-17 — Phase 60 execution started

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 16
**Phases completed:** 59
**Plans completed:** 143
**Days elapsed:** 21
**Velocity:** ~6.8 plans/day

### Recent History

**v3.9 (Shipped: 2026-02-21):**

- Duration: 1 day
- Phases: 3 (57-59)
- Plans: 8
- Key: Bug fixes, grammar additions (EXIT/SERIAL/ADDR), Java class reference features (.class, static methods, deprecated, constructors)

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
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 60 P01 | ~34s (task commits only) | 4 tasks | 1 files |
| Phase 60 P02 | ~1h | 3 tasks | 1 files |

## Accumulated Context

### Active Constraints

- TEST-03 (DEF FN suffix completion) skipped — Langium grammar follower limitation
- bbj-notifications.ts isolation module must be preserved — importing main.ts from shared services crashes tests
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment
- v4.0 scope excludes `java-interop/` Java service and `src/language/generated/` (machine-generated, 17.5k LOC)
- v4.0 ISSUE-01 is a hard gate — no GitHub issue is filed before the user approves the drafted list

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key recent decisions:

- [Phase 59]: Two-phase resolveClass: synchronously set isStatic/deprecated before registering in resolvedClasses
- [Phase 59]: isClassRef via SymbolRef.symbol.ref → isJavaClass for static-only completion filtering
- [Phase 59]: MemberCall isClassRef extension dropped — old JAR does not send isStatic for fields
- [Phase 59]: ( trigger returns empty CompletionList (not undefined) — prevents slow fallthrough
- [Phase 59]: CompletionItemTag.Deprecated only — no sortText change, no label suffix
- [v4.0 Roadmap]: SEC-03/SEC-06/SEC-07/SEC-08 folded into the single-owning module review phase
  (RVW-04, RVW-01, RVW-05, RVW-05 respectively); SEC-01/SEC-02/SEC-04/SEC-05 given a dedicated
  Cross-Cutting Security Audit phase (65) because each spans multiple modules/IDEs

- [v4.0 Roadmap]: RVW-01 (`src/language/`, ~8.5k LOC) kept as a single phase rather than split —
  comparable in scale to RVW-04's single-phase 6.6k LOC IntelliJ review, so splitting wasn't
  necessary to keep the phase executable

- [v4.0 Roadmap]: RVW-06 (verified failure scenario) and RVW-07 (dedup vs open issues) established
  as standards in Phase 60 and enforced as a success criterion in every review/security phase (61-65)

- [v4.0 Roadmap]: FIX-01..04 isolated to a single dedicated Phase 67 run after all review sweeps —
  review phases record findings, this phase is the only one that applies them

- [Phase 60 Plan 01]: Finding-ID scheme locked as phase-dimension-seq (P{phase}-D{dimension}-{seq}) at Task 1 checkpoint, confirming D-11
- [Phase 60 Plan 01]: Baseline range pinned to 2194616..v0.12.0 (153 commits), not HEAD, because HEAD moves with v4.0 planning commits
- [Phase 60 Plan 02]: Applicability grid n/a cells use short markers resolved in a keyed Exclusion reasons list (232 cells across 29 rows) rather than inline prose, to keep the grid readable
- [Phase 60 Plan 02]: RU-62-04 kept in its pre-existing physical position (predates the D-07 ascending phase/risk-rank ordering rule) with a documented ordering-exception note, rather than moved

### Tech Debt

- CPU stability mitigations documented but not yet implemented (#232) — re-triaged in v4.0 Phase 66 (DEBT-01)
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize) — re-triaged in v4.0 Phase 66 (DEBT-05)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change — re-triaged in v4.0 Phase 66 (DEBT-05)
- IntelliJ TextMate bundle cannot exclude config.bbx at filename level
- FQN path static-only filtering deferred — re-triaged in v4.0 Phase 66 (DEBT-04)
- Static method return type inference gap — String.valueOf(2) does not assign type — re-triaged in v4.0 Phase 66 (DEBT-03)

### Blockers/Concerns

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260329-oqw | PR #383: Return undefined instead of empty list from getFieldCompletion to allow other providers to continue | 2026-03-29 | ab42eef | [260329-oqw-pr-383-return-undefined-instead-of-empty](./quick/260329-oqw-pr-383-return-undefined-instead-of-empty/) |

---

## Session Continuity

Last session: 2026-08-17T19:11:17.409Z
Stopped at: Completed 60-02-PLAN.md (INVENTORY.md expanded to 21 review units, applicability grid, surface accounting; BASE-03 complete)
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
| v3.9 Quick Wins | 57-59 | 8 | 2026-02-21 |

v4.0 Stability and Quality (Phases 60-69) is in progress — not yet in this table (added on ship).

See: `.planning/MILESTONES.md`

---

*State updated: 2026-08-17 after v4.0 ROADMAP.md creation*
