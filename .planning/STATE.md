# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.
**Current focus:** Phase 34 - Diagnostic Polish (v3.2 Bug Fix Release)

## Current Position

Milestone: v3.2 Bug Fix Release
Phase: 34 of 34 (Diagnostic Polish)
Plan: 3 of 3 in current phase (gap closure)
Status: Phase complete (all gaps closed)
Last activity: 2026-02-08 -- Completed 34-03-PLAN.md (gap closure: URI comparison fix)

Progress: [██████████] 100%

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
- Total plans completed: 98 across all milestones (34-03 gap closure completed)
- Total execution time: ~501 min (through v3.0) + v3.1 + 66 min (Phase 32) + 92 min (Phase 33) + 11 min (Phase 34)
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

**Phase 34 (Diagnostic Polish):**
- Use IndexManager.allElements for BBj file path validation (synchronous API matches existing scope resolution pattern)
- Target bbjFilePath property for error diagnostic (squiggly appears on ::path:: portion only)
- Match case-insensitive using .toLowerCase() on both paths (consistent with bbj-scope.ts resolution logic)
- Re-check diagnostics after addImportedBBjDocuments completes (validation runs BEFORE PREFIX docs are loaded, creating false positives)
- Filter diagnostics by message prefix pattern matching (no diagnostic metadata available to identify source validation rule)
- Use normalize() on both sides of fsPath equality to handle non-normalized paths from URI.parse with relative inputs
- Include searched PREFIX directories in USE file-path error messages for user actionability

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

**Phase 34 complete:**
- POL-01 (settings capitalization) complete - VS Code settings panel shows "BBj" not "bbj" in AutoSaveUponRun description
- POL-02 (BBj file path validation) complete - USE statements with non-existent file paths show error diagnostic on ::path:: portion
- POL-03 (PREFIX diagnostic reconciliation) complete - false "could not be resolved" errors removed after PREFIX docs load
- POL-03 gap closure complete - URI comparison uses normalized fsPath equality, error messages include searched paths
- Gap 1 accepted: VS Code setting group headers ("Bbj:") cannot be fixed without breaking user configs - platform limitation
- Test coverage: 433 passing, 10 failing (pre-existing), 3 skipped

**Phase 33 complete (all gaps closed):**
- PARSE-01 (void return type) - eliminates false "unresolvable class" errors for `method public void doSomething()`
- PARSE-02 (DEF FN suffixed variables) - `mode$`, `count%`, `obj!` work in DEF FN inside class methods
- PARSE-03 (SELECT verb) - full grammar support for SELECT with MODE, ERR, WHERE, SORTBY, LIMIT, field lists
- PARSE-04 (cast array notation) - CastExpression grammar rule with QualifiedClass + arrayDims brackets

**Phase 32 complete. Pending user verification:**
- User needs to rebuild and verify BBjAPI CC and BBjVector resolution work in VS Code
- USE PREFIX resolution is a pre-existing issue (not Phase 32 regression), tracked for future work
- IntelliJ plugin LSP compatibility for LocationLink.targetSelectionRange needs verification

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 34-03-PLAN.md (Phase 34 gap closure - URI comparison fix)
Resume file: .planning/phases/34-diagnostic-polish/34-03-SUMMARY.md
Next: v3.2 milestone verification and release preparation
