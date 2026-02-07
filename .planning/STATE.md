# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 33 - Parser and Lexer Fixes (v3.2 Bug Fix Release)

## Current Position

Milestone: v3.2 Bug Fix Release
Phase: 33 of 34 (Parser and Lexer Fixes)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-07 -- Completed 33-02-PLAN.md (DEF FN suffixed variables, SELECT verb)

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
- Total plans completed: 94 across all milestones (33-02 completed)
- Total execution time: ~501 min (through v3.0) + v3.1 + 66 min (Phase 32) + 82 min (Phase 33)
- 8 milestones shipped in 7 days

*Updated after each plan completion*

## Accumulated Context

### Decisions

**Phase 32 (Regression Fixes):**
- Override collectLocationLinks (not getDefinition) to preserve Langium's reference resolution pipeline
- Use nameProvider.getNameNode() to find exact class name CST node for precise navigation
- Test with inline class references rather than cross-file USE statements (simpler test environment)

**Phase 33 (Parser and Lexer Fixes):**
- Use voidReturn boolean property instead of treating void as a class reference in method signatures
- Defer PARSE-04 (cast array notation) due to Langium parser ambiguity challenges - requires expert consultation or alternative approach
- Set keyword LONGER_ALT to array [id, idWithSuffix] to prevent keyword matching when identifier has suffix (fixes mode$ vs MODE conflict)
- Use BinaryExpression instead of Expression for SELECT template to avoid StringMask operator ambiguity

See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md
- .planning/milestones/v3.0-ROADMAP.md
- .planning/milestones/v3.1-ROADMAP.md

### Known Issues

1. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)
2. **PARSE-04: cast array notation** - `cast(BBjString[], x!)` syntax fails to parse due to ArrayElement grammar requiring indices or ALL keyword. Requires Langium parser generator expertise or confirmation that syntax is invalid BBj.
3. Five pre-existing parser test failures: hex string parsing, array tests, REDIM, RELEASE, FILE/XFILE (documented in 33-02 summary)

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented

### Blockers/Concerns

**Phase 33 complete:**
- PARSE-01 (void return type) complete - eliminates false "unresolvable class" errors for `method public void doSomething()`
- PARSE-02 (DEF FN suffixed variables) complete - `mode$`, `count%`, `obj!` work in DEF FN inside class methods
- PARSE-03 (SELECT verb) complete - full grammar support for SELECT with MODE, ERR, WHERE, SORTBY, LIMIT, field lists
- PARSE-04 (cast array notation) deferred - requires either Langium expert, alternative validator approach, or confirmation syntax is invalid in real BBj
- Test coverage: 195 passing (+15 new), 5 failing (pre-existing), 3 skipped

**Phase 32 complete. Pending user verification:**
- User needs to rebuild and verify BBjAPI CC and BBjVector resolution work in VS Code
- USE PREFIX resolution is a pre-existing issue (not Phase 32 regression), tracked for future work
- IntelliJ plugin LSP compatibility for LocationLink.targetSelectionRange needs verification

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 33-02-PLAN.md (Phase 33 complete)
Resume file: .planning/phases/33-parser-and-lexer-fixes/33-02-SUMMARY.md
Next: Phase 34 or v3.2 milestone planning
