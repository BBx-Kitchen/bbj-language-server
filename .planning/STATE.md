# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 33 - Parser and Lexer Fixes (v3.2 Bug Fix Release)

## Current Position

Milestone: v3.2 Bug Fix Release
Phase: 33 of 34 (Parser and Lexer Fixes)
Plan: 0 of TBD in current phase
Status: Not started
Last activity: 2026-02-07 -- Completed Phase 32 (Regression Fixes) including onDidChangeConfiguration fix

Progress: [████░░░░░░] 33%

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

See: .planning/MILESTONES.md

## Performance Metrics

**Velocity:**
- Total plans completed: 92 across all milestones (32-01, 32-02, 32-03 completed)
- Total execution time: ~501 min (through v3.0) + v3.1 + 66 min (Phase 32)
- 8 milestones shipped in 7 days

*Updated after each plan completion*

## Accumulated Context

### Decisions

**Phase 32 (Regression Fixes):**
- Override collectLocationLinks (not getDefinition) to preserve Langium's reference resolution pipeline
- Use nameProvider.getNameNode() to find exact class name CST node for precise navigation
- Test with inline class references rather than cross-file USE statements (simpler test environment)

See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md
- .planning/milestones/v3.0-ROADMAP.md
- .planning/milestones/v3.1-ROADMAP.md

### Known Issues

1. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)
2. Single-line DEF FN inside class methods not parsed correctly by validate test helper (parser/lexer RPAREN_NO_NL token issue)

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented

### Blockers/Concerns

**Phase 32 complete. Pending user verification:**
- User needs to rebuild and verify BBjAPI CC and BBjVector resolution work in VS Code
- USE PREFIX resolution is a pre-existing issue (not Phase 32 regression), tracked for future work
- IntelliJ plugin LSP compatibility for LocationLink.targetSelectionRange needs verification

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed Phase 32 (all 3 plans including onDidChangeConfiguration fix)
Resume file: None
Next: Phase 33 (Parser and Lexer Fixes)
