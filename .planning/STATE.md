# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.1 Phase 29 - DEF FN & Inheritance Resolution

## Current Position

Milestone: v3.1 PRIO 1+2 Issue Burndown
Phase: 29 of 31 (DEF FN & Inheritance Resolution)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-07 -- Phase 28 complete (2 plans, verified)

Progress: [███░░░░░░░] 25%

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

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 58+ across all milestones
- Average duration: ~7.5 min per plan
- Total execution time: ~229 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md
- .planning/milestones/v3.0-ROADMAP.md

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Plain assignments are LetStatements, no ExpressionStatement handling needed | 28-01 | Grammar parses `x = 5` as LetStatement with optional LET keyword |
| Hint severity for use-before-assignment | 28-01 | Gentle guidance, avoids false positive noise |
| Case-insensitive DECLARE type comparison | 28-01 | BBj is case-insensitive for identifiers |
| Offset-based position tracking for use-before-assignment | 28-02 | Handles compound statements on same line correctly |
| ArrayDecl excluded from isVariableDecl DECLARE branch in scope computation | 28-02 | ArrayDecl extends VariableDecl but needs different scope holder |
| Exact $type check for DECLARE skip instead of isVariableDecl() | 28-02 | isVariableDecl matches subtypes (ArrayDecl, FieldDecl, ParameterDecl) |

### Known Issues

1. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)

### Tech Debt

- EM credentials stored as plaintext in settings (targeted in Phase 31, CONF-03)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-07
Stopped at: Phase 28 complete, verified
Resume file: None
Next: `/gsd:discuss-phase 29`
