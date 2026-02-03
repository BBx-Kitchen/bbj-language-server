# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-03)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 14 - Dependency Update & Grammar Regeneration

## Current Position

Milestone: v2.0 Langium 4 Upgrade
Phase: 14 of 18 (Dependency Update & Grammar Regeneration)
Plan: --
Status: Ready to plan
Last activity: 2026-02-03 -- Roadmap created for v2.0 milestone (5 phases, 34 requirements)

Progress: [..........] 0%

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v2.0)
- Average duration: --
- Total execution time: --

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 start]: Langium 3 to 4 upgrade -- no new features, clean migration only
- [v2.0 start]: Keep chevrotain ~11.0.3 pin (compatible with Langium 4.1.x)

### Known Issues

1. Structure View symbol kind differentiation -- SymbolKind.Field default case (deferred from v1.1)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-03
Stopped at: Roadmap created for v2.0 -- ready to plan Phase 14
Resume file: None
Next: `/gsd:plan-phase 14`
