# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** v3.0 Improving BBj Language Support

## Current Position

Milestone: v3.0 Improving BBj Language Support
Phase: 27 of 27 (IDE Polish)
Plan: 2 of 3
Status: In progress
Last activity: 2026-02-06 — Completed 27-02-PLAN.md (field completion trigger)

Progress: [████████░░] 83%

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
- Total plans completed: 24 (v2.0: 11, v2.2: 3, v3.0: 10)
- Average duration: 7.7 min
- Total execution time: ~195 min

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
| Confirmed infinite rebuild loop as root cause via static analysis | 26-01 | CPU stability investigation |
| Prioritized Mitigation 1 (processing guard) and 4 (skip external USE) as primary fixes | 26-01 | Document builder optimization |
| Ranked IndexManager over-invalidation as secondary contributor (not root cause) | 26-01 | Performance analysis |
| Used readonly completionOptions property (not getter) following Langium pattern | 27-02 | Completion trigger registration |
| Cursor is AFTER # so find leaf node at offset-1 | 27-02 | Field completion positioning |
| Field names include type suffix (name$, count) per BBj convention | 27-02 | Completion item format |
| Empty class returns empty list gracefully | 27-02 | Edge case handling |
| Unresolved superclass references skipped silently | 27-02 | Field collection resilience |

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

Last session: 2026-02-06
Stopped at: Completed 27-02-PLAN.md (field completion trigger)
Resume file: None
Next: 27-03-PLAN.md (error message enhancement with source filenames)
