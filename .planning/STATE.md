# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.0 Improving BBj Language Support

## Current Position

Milestone: v3.0 Improving BBj Language Support
Phase: 25 of 27 (Type Resolution & Crash Fixes)
Plan: 4 of TBD
Status: In progress
Last activity: 2026-02-06 — Completed 25-04-PLAN.md

Progress: [██░░░░░░░░] 25%

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
- Total plans completed: 20 (v2.0: 11, v2.2: 3, v3.0: 6)
- Average duration: 8.5 min
- Total execution time: ~160 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

| Decision | Phase | Context |
|----------|-------|---------|
| Apply LONGER_ALT to ALL keyword tokens (future-proof) | 24-01 | Chevrotain tokenization |
| Use readData instead of forEach in tests (FOR is context-sensitive) | 24-01 | Test clarity |
| Made COMMENT terminal newline optional for inline REM support | 24-02 | Grammar terminals |
| DREAD reuses InputItem/Err fragments (consistent with READ pattern) | 24-02 | Grammar design |
| MethodDecl body type (Statement \| DefFunction)[] for type safety | 24-02 | Langium AST types |
| Validation regexes must account for semicolon separators | 24-02 | Line break validation |
| CAST with unresolvable type returns undefined (treats as untyped) | 25-01 | Type inference |
| Warning severity (not error) for CAST with unresolvable type | 25-01 | Diagnostics |
| Implicit getter type resolution via FieldDecl check in isMemberCall | 25-01 | Type inference |
| Visited Set parameter defaults to new Set() at call sites for ergonomic API | 25-02 | Scope creation |
| createJavaClassMemberScope recursively walks Java superclass chain | 25-02 | Inheritance traversal |
| Hover inheritance detection compares receiver type vs declaring class | 25-02 | Hover provider |
| Warning on unresolvable super appears on MemberCall, not class definition | 25-02 | Validation |
| DECLARE anywhere in method applies to entire method scope (not block-scoped) | 25-03 | Variable scope |
| USE statements wrapped in try/catch for independent processing | 25-03 | Crash resistance |
| Unresolvable USE shows warning (not error) with actionable message | 25-03 | Diagnostics |
| Inner class fallback attempts dollar-sign notation on resolution failure | 25-03 | Java interop |
| bbj.typeResolution.warnings defaults to true (warnings enabled) | 25-04 | Configuration |
| Module-level config function pattern for runtime feature toggles | 25-04 | Validator architecture |
| Setting applies to all three warning types: CAST, USE, super class resolution | 25-04 | User experience |

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

Last session: 2026-02-06T09:54:11Z
Stopped at: Completed 25-04-PLAN.md
Resume file: None
Next: Continue with phase 25 plans
