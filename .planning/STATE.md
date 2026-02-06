# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.0 Improving BBj Language Support

## Current Position

Milestone: v3.0 Improving BBj Language Support
Phase: 24 of 27 (Grammar & Parsing Fixes)
Plan: 1 of 4 in phase
Status: In progress
Last activity: 2026-02-06 — Completed 24-01-PLAN.md (GRAM-02: keyword-prefixed identifiers)

Progress: [█░░░░░░░░░] 6%

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
- Total plans completed: 15 (v2.0: 11, v2.2: 3, v3.0: 1)
- Average duration: 5.9 min
- Total execution time: ~79 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

| Decision | Phase | Context |
|----------|-------|---------|
| Apply LONGER_ALT to ALL keyword tokens (future-proof) | 24-01 | Chevrotain tokenization |
| Use readData instead of forEach in tests (FOR is context-sensitive) | 24-01 | Test clarity |

See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md

### Known Issues

1. Structure View symbol kind differentiation — SymbolKind.Field default case (now IDE-01 in v3.0)
2. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-06T07:24:20Z
Stopped at: Completed 24-01-PLAN.md
Resume file: None
Next: Plan 24-02 (next grammar fix)
