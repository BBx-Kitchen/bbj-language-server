# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-03)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 15 - Core API Renames & Type Constants

## Current Position

Milestone: v2.0 Langium 4 Upgrade
Phase: 15 of 18 (Core API Renames & Type Constants)
Plan: 02 of 05
Status: In progress
Last activity: 2026-02-03 -- Completed 15-02-PLAN.md (Scope API renames & type constants)

Progress: [██........] 20% (1/5 v2.0 phases)

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (v2.0)
- Average duration: 1.7 min
- Total execution time: 5 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 start]: Langium 3 to 4 upgrade -- no new features, clean migration only
- [v2.0 start]: Keep chevrotain ~11.0.3 pin (compatible with Langium 4.1.x)
- [14-01]: Tilde version ranges (~4.1.3, ~4.1.0) for consistency with project convention
- [14-01]: Generated files remain gitignored (regenerated at build time)
- [15-01]: All type constant usages migrated to .$type pattern for Langium 4 compatibility
- [15-02]: PrecomputedScopes → LocalSymbols, computeExports/computeLocalScopes → collectExportedSymbols/collectLocalSymbols
- [15-02]: document.precomputedScopes → document.localSymbols property access pattern

### Known Issues

1. Structure View symbol kind differentiation -- SymbolKind.Field default case (deferred from v1.1)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 15-02-PLAN.md (Scope API renames & type constants)
Resume file: None
Next: Continue Phase 15 - remaining plans (validator, utils, formatter migrations)
