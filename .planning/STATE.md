# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 33 - Parser and Lexer Fixes (v3.2 Bug Fix Release)

## Current Position

Milestone: v3.2 Bug Fix Release
Phase: 33 of 34 (Parser and Lexer Fixes)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-02-08 -- Completed 33-03-PLAN.md (CastExpression grammar rule for cast array notation)

Progress: [██████░░░░] 67%

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
- Total plans completed: 95 across all milestones (33-03 completed)
- Total execution time: ~501 min (through v3.0) + v3.1 + 66 min (Phase 32) + 92 min (Phase 33)
- 8 milestones shipped in 8 days

*Updated after each plan completion*

## Accumulated Context

### Decisions

**Phase 32 (Regression Fixes):**
- Override collectLocationLinks (not getDefinition) to preserve Langium's reference resolution pipeline
- Use nameProvider.getNameNode() to find exact class name CST node for precise navigation
- Test with inline class references rather than cross-file USE statements (simpler test environment)

**Phase 33 (Parser and Lexer Fixes):**
- Use voidReturn boolean property instead of treating void as a class reference in method signatures
- Set keyword LONGER_ALT to array [id, idWithSuffix] to prevent keyword matching when identifier has suffix (fixes mode$ vs MODE conflict)
- Use BinaryExpression instead of Expression for SELECT template to avoid StringMask operator ambiguity
- CastExpression as dedicated PrimaryExpression alternative with QualifiedClass + arrayDims brackets - avoids ArrayElement ambiguity entirely
- CAST keyword with caseInsensitive:true handles cast/CAST/Cast automatically via Langium keyword config

See archived decisions in:
- .planning/milestones/v2.0-ROADMAP.md
- .planning/milestones/v2.2-ROADMAP.md
- .planning/milestones/v3.0-ROADMAP.md
- .planning/milestones/v3.1-ROADMAP.md

### Known Issues

1. Chevrotain lexer false-positive warnings in test output (documented, non-blocking)
2. Pre-existing parser test failures (10): hex string parsing, array tests, REDIM, RELEASE, FILE/XFILE, 2 classes access-level tests, 2 validation access-level tests, 1 completion test
3. `declare auto x!` generates parser error because QualifiedClass requires ID but x! is ID_WITH_SUFFIX (pre-existing, cosmetic - parser recovers correctly)

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall) - CAST now handled by CastExpression

### Blockers/Concerns

**Phase 33 fully complete (all gaps closed):**
- PARSE-01 (void return type) complete - eliminates false "unresolvable class" errors for `method public void doSomething()`
- PARSE-02 (DEF FN suffixed variables) complete - `mode$`, `count%`, `obj!` work in DEF FN inside class methods
- PARSE-03 (SELECT verb) complete - full grammar support for SELECT with MODE, ERR, WHERE, SORTBY, LIMIT, field lists
- PARSE-04 (cast array notation) complete - CastExpression grammar rule with QualifiedClass + arrayDims brackets
- Test coverage: 430 passing (+4 from 33-03), 10 failing (pre-existing), 4 skipped (1 pre-existing TABLE test + 3 other)

**Phase 32 complete. Pending user verification:**
- User needs to rebuild and verify BBjAPI CC and BBjVector resolution work in VS Code
- USE PREFIX resolution is a pre-existing issue (not Phase 32 regression), tracked for future work
- IntelliJ plugin LSP compatibility for LocationLink.targetSelectionRange needs verification

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 33-03-PLAN.md (Phase 33 fully complete, all gaps closed)
Resume file: .planning/phases/33-parser-and-lexer-fixes/33-03-SUMMARY.md
Next: Phase 34 or v3.2 milestone planning
