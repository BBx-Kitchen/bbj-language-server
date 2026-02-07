# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.1 Phase 29 - DEF FN & Inheritance Resolution

## Current Position

Milestone: v3.1 PRIO 1+2 Issue Burndown
Phase: 29 of 31 (DEF FN & Inheritance Resolution)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-02-07 -- Completed 29-01-PLAN.md

Progress: [███░░░░░░░] 27%

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
- Total plans completed: 60+ across all milestones
- Average duration: ~7.4 min per plan
- Total execution time: ~246 min

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
| Skip single-line DEF FN inside methods test | 29-01 | Parser bug - single-line DEF FN not parsed correctly in validate helper, but works in parse helper |
| DEF FN parameters scoped to DefFunction node | 29-01 | Parameters visible in FN body but don't leak to enclosing scope |
| DEF FN name added to container scope | 29-01 | Enables function calls to resolve |
| MAX_INHERITANCE_DEPTH set to 20 | 29-02 | Prevents infinite loops from cyclic or pathologically deep inheritance chains |
| Skip enhanced error messages for unresolved class members | 29-02 | Langium linker errors adequate; adding chain info would duplicate diagnostics |

### Known Issues

1. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)
2. Single-line DEF FN inside class methods not parsed correctly by validate test helper (parser/lexer RPAREN_NO_NL token issue)

### Tech Debt

- EM credentials stored as plaintext in settings (targeted in Phase 31, CONF-03)
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 29-01-PLAN.md
Resume file: None
Next: Continue Phase 29 planning or verify phase completion
