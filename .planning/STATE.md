# Project State: BBj Language Server

**Last Updated:** 2026-02-19

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.7 Diagnostic Quality & BBjCPL Integration — Phase 50: Diagnostic Noise Reduction

---

## Current Position

Phase: 50 of 53 (Diagnostic Noise Reduction)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-19 — v3.7 roadmap created (4 phases, 12 requirements mapped)

Progress: [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% (v3.7)

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 14
**Phases completed:** 49
**Plans completed:** 121
**Days elapsed:** 10 (through v3.6)
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

---

## Accumulated Context

### Active Constraints

- Phase 53 depends on Phases 50, 51, and 52 all completing first
- Phase 52 exit criterion: BBjCPL output parser must have fixture-backed unit tests before Phase 53 wiring
- CPU rebuild loop pitfall: BBjCPL must be invoked inside `buildDocuments()`, never from an `onBuildPhase` callback
- BBjCPL stderr format is documented but unconfirmed empirically — validate in Phase 52 before assuming regex

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key v3.7 decisions pending:
- BBjCPL output parser regex (to be determined empirically in Phase 52)
- On-save trigger implementation approach (BBjDocumentUpdateHandler vs onChange guard)

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
| 14 | Fix manual release workflow: pass -Pversion to verifyPlugin/publishPlugin, add checkout to create-release job for gh CLI git context | 2026-02-17 | 8956e26 | [14-fix-manual-release-workflow-pass-version](./quick/14-fix-manual-release-workflow-pass-version/) |
| 13 | Fix IntelliJ multi-instance language server: replace custom grace period with LSP4IJ native timeout, fix crash recovery, add disposal guards | 2026-02-16 | 293fea5 | [13-fix-intellij-multi-instance-language-ser](./quick/13-fix-intellij-multi-instance-language-ser/) |

---

## Session Continuity

### What Just Happened

- v3.7 milestone roadmap created: 4 phases (50-53), 12 requirements mapped, 100% coverage
- Phase ordering: 50 (noise reduction) → 51 (outline resilience) → 52 (BBjCPL foundation) → 53 (integration)
- Phases 50 and 51 are independent of BBjCPL and ship immediate user value; execute in parallel if possible
- Phase 52 must complete with fixture-backed tests before Phase 53 begins

### What's Next

**Immediate:** `/gsd:plan-phase 50` — Diagnostic Noise Reduction

### Context for Next Session

**v3.7 roadmap ready for planning.** Start with Phase 50: override `BBjDocumentValidator.validateDocument()` to add `applyHierarchyFilter()` — suppress linking/semantic diagnostics when `document.parseResult.parserErrors.length > 0`. Then Phase 51: new `BBjDocumentSymbolProvider` with null-safe `getSymbol()`/`getChildSymbols()` to prevent blank Structure View on partial ASTs. Both are independent components, confirmed patterns, no research gaps.

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
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | TBD | In progress |

**Total velocity:** 121 plans across 14 milestones in 10 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-19 after v3.7 roadmap creation*
