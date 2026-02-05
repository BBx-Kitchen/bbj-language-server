# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v2.2 IntelliJ Build & Release Automation - Phase 21 Preview Workflow

## Current Position

Milestone: v2.2 IntelliJ Build & Release Automation
Phase: 21 of 23 (Preview Workflow)
Plan: 1 of 1
Status: Phase complete
Last activity: 2026-02-05 - Completed 21-01-PLAN.md

Progress: [###.......] 33%

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 12 (v2.0: 11, v2.2: 1)
- Average duration: 3.2 min
- Total execution time: ~40 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
See archived decisions in .planning/milestones/v2.0-ROADMAP.md

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-02-05 | 21-01 | Use providers.gradleProperty over systemProperty | Simpler Gradle API sufficient for CI |
| 2026-02-05 | 21-01 | Keep publish-preview job name | Avoids breaking external references |

### Known Issues

1. Structure View symbol kind differentiation -- SymbolKind.Field default case (deferred from v1.1)
2. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)

### Roadmap Evolution

v2.2 milestone roadmap created. Three phases: Preview Workflow (21), Release Workflow (22), PR Validation (23).
Phase 21 complete - preview workflow now builds both VS Code and IntelliJ plugins.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-05
Stopped at: Completed 21-01-PLAN.md (Phase 21 complete)
Resume file: None
Next: /gsd:plan-phase 22
