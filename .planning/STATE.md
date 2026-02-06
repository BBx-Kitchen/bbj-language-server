# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.0 Improving BBj Language Support

## Current Position

Milestone: v3.0 Improving BBj Language Support
Phase: Not started (defining requirements)
Status: Defining requirements
Last activity: 2026-02-06 — Milestone v3.0 started

Progress: [░░░░░░░░░░] 0%

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |
| v2.0 Langium 4 Upgrade | 14-20 | 11 | 2026-02-04 |
| v2.1 Feature Gap Analysis | N/A | N/A | 2026-02-04 |
| v2.2 IntelliJ Build & Release Automation | 21-23 | 3 | 2026-02-05 |

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 14 (v2.0: 11, v2.2: 3)
- Average duration: 3.2 min
- Total execution time: ~45 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md

### Known Issues

1. Structure View symbol kind differentiation — SymbolKind.Field default case (deferred from v1.1, now in v3.0 scope)
2. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-06
Stopped at: Defining v3.0 requirements
Resume file: None
Next: Define requirements → create roadmap
