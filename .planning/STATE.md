# Project State: BBj Language Server

**Last Updated:** 2026-02-08

## Project Reference

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Milestone:** v3.3 Output & Diagnostic Cleanup
**Milestone Goal:** Reduce default LS output to a quiet, professional minimum — users see only what matters.

**Current Focus:** Implement debug logging controls and diagnostic filtering for quiet startup experience.

---

## Current Position

**Active Phase:** Phase 39 - Parser Diagnostics (Complete)
**Active Plan:** 1 of 1 complete

**Phase Status:** Complete
**Phase Goal:** Investigate and document parser ambiguity warnings, implement debug-gated verbose logging
**Last Activity:** 2026-02-08 - Completed 39-01-PLAN.md (ambiguity investigation + debug logging + docs)

**Progress Bar:**
```
Milestone v3.3: [████████████████████] 10/10 requirements (100%)
Phase 39:       [████████████████████] 1/1 plans complete (100%)
```

---

## Performance Metrics

### Current Milestone (v3.3)

**Started:** 2026-02-08
**Phases completed:** 5/5
**Plans completed:** 6/6 (35-01, 36-01, 37-01, 37-02, 38-01, 39-01)
**Requirements completed:** 10/10
**Days elapsed:** 0

**Velocity:** 6 plans/day (Phases 35-39 complete, milestone COMPLETE)

### Recent History

**v3.2 (Shipped: 2026-02-08):**
- Duration: 2 days (2026-02-07 → 2026-02-08)
- Phases: 3 (32-34)
- Plans: 10 (including 4 gap closures)
- Files modified: 21 (+812 / -72 lines)
- Key: BBjAPI resolution, USE navigation, parser fixes

**v3.1 (Shipped: 2026-02-07):**
- Duration: 2 days (2026-02-06 → 2026-02-07)
- Phases: 4 (28-31)
- Plans: 13 (including 2 gap closures)
- Files modified: 95 (+12,720 / -273 lines)
- Key: Variable scoping, DEF FN, inheritance, token auth

**v3.0 (Shipped: 2026-02-06):**
- Duration: 1 day
- Phases: 4 (24-27)
- Plans: 11 (including 1 gap closure)
- Files modified: 21 (+918 / -113 lines)
- Key: Parser fixes, type resolution, CPU investigation

---

## Accumulated Context

### Recent Decisions

**Decision:** Suppress all parser ambiguities rather than refactor grammar
**Rationale:** All 47 Chevrotain ambiguity patterns are safe - BBj's non-reserved keywords create inherent ambiguity that ALL(*) successfully resolves. Grammar refactoring would require BBj syntax redesign.
**Date:** 2026-02-08 (Phase 39-01)
**Impact:** Parser correctly handles BBj's permissive syntax; ambiguity warnings are diagnostic noise shown only when debug=true

**Decision:** Use existing bbj.debug flag for parser ambiguity verbosity
**Rationale:** Phase 36 established bbj.debug as unified debug flag; parser ambiguities are debug-level diagnostics like other verbose output
**Date:** 2026-02-08 (Phase 39-01)
**Impact:** Consistent UX - one debug flag controls all verbose output including parser ambiguity details

**Decision:** Regular enum instead of const enum for LogLevel
**Rationale:** Regular numeric enum ensures compatibility with isolatedModules (may be used in IntelliJ LSP4IJ builds) and provides better debuggability; performance difference for 4 enum values is negligible
**Date:** 2026-02-08 (Phase 35-01)
**Impact:** Logger uses regular enum, safe for all build configurations

**Decision:** ISO 8601 timestamps on debug messages only
**Rationale:** Debug messages include full timestamp via toISOString() for unambiguous log analysis; info/warn/error messages are plain text for cleaner output
**Date:** 2026-02-08 (Phase 35-01)
**Impact:** Debug output includes [2026-02-08T14:28:52.123Z] prefix, other levels are plain

**Decision:** Scoped loggers expose debug method only
**Rationale:** Component tags are most valuable for debug-level output where identifying the source matters; info/warn/error don't need component context
**Date:** 2026-02-08 (Phase 35-01)
**Impact:** logger.scoped(component) returns {debug()} object, not full logger interface

**Decision:** Lightweight logger wrapper instead of external framework
**Rationale:** Existing `vscode-languageserver` provides all needed logging features; Pino/Winston add 200KB-1MB+ bundle size for features LSP already provides
**Date:** 2026-02-08
**Impact:** Phase 35 implementation uses 60-line singleton pattern

**Decision:** Singleton logger instead of Langium DI injection
**Rationale:** Logger needs to work immediately in main.ts before DI container fully configured; logging is diagnostic infrastructure not business logic
**Date:** 2026-02-08
**Impact:** Acceptable trade-off for simpler initialization

**Decision:** Quiet startup via temporary log level override
**Rationale:** Gate verbose output until first document validation completes; restore original level after workspace ready
**Date:** 2026-02-08
**Impact:** Phase 36 implements transient ERROR level during startup

**Decision:** Verification-only phase for synthetic file filtering
**Rationale:** Existing `shouldValidate()` already skips JavaSyntheticDocUri and external documents; just verify coverage
**Date:** 2026-02-08
**Impact:** Phase 38 expected to require zero code changes

**Decision:** Lazy evaluation callbacks for expensive logger operations
**Rationale:** Use `() => string` callbacks for JSON.stringify and array.join to prevent unnecessary computation when debug mode disabled
**Date:** 2026-02-08 (Phase 37-01)
**Impact:** Essential summaries use logger.info (BBj home, class count), verbose details use logger.debug with lazy callbacks

**Decision:** Info vs debug classification for startup output
**Rationale:** Essential summaries (BBj home, class count, Java Classes loaded, JavadocProvider packages) use logger.info for visibility even with debug=false; verbose details (classpath entries, class resolution) use logger.debug
**Date:** 2026-02-08 (Phase 37-01)
**Impact:** Startup with debug=false shows only essential summaries; debug=true shows verbose details

### Active Constraints

**Never suppress console.error():** Error output must always be visible regardless of debug flag state to prevent hiding real failures
**Filter by severity not file type:** Diagnostic filtering must preserve parser/lexer errors even from synthetic files
**Hot-reload all settings:** Settings changes via `onDidChangeConfiguration` must clear cached state to prevent desynchronization

### Pending TODOs

- [x] Phase 35 (Logger Infrastructure) — COMPLETE
- [x] Phase 36 (Settings Plumbing) — COMPLETE
- [x] Phase 37 (Console Migration) — COMPLETE (42 calls migrated, 0 remain)
- [x] Phase 38 (Diagnostic Filtering) — COMPLETE (bbjlib:/ filtering + javadoc aggregation)
- [x] Phase 39 (Parser Diagnostics) — COMPLETE (47 ambiguities documented, debug-gated logging, docs)

### Known Blockers

None currently identified.

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall) — CAST now handled by CastExpression

---

## Session Continuity

### What Just Happened

- Phase 39 (Parser Diagnostics) completed — Plan 01 executed
- Investigated 47 Chevrotain ambiguity patterns via parser initialization (SingleStatement, MethodDecl, QualifiedClass, PrimaryExpression, DefFunction, etc.)
- All ambiguities classified as safe to suppress - BBj's non-reserved keywords create inherent grammar conflicts resolved by ALL(*) lookahead
- Enhanced bbj-module.ts lookaheadStrategy.logging callback with logger.isDebug() check
- Debug mode shows full Chevrotain messages with grammar rule names; non-debug shows one-time summary
- Documented bbj.debug setting in Docusaurus configuration.md with usage instructions and troubleshooting guidance
- Verification passed: 460 tests passing, 11 pre-existing failures unchanged, TypeScript compiles cleanly
- Commits: 2b1998c (investigation), 08c0625 (enhanced logging), aee2ee2 (documentation)

### What's Next

**Immediate:** Milestone v3.3 COMPLETE (5/5 phases, 10/10 requirements)

**After v3.3:**
- Plan next milestone or address backlog items

**Milestone v3.3 path:** 35 ✓ → 36 ✓ → 37 ✓ → 38 ✓ → 39 ✓ (COMPLETE)

### Context for Next Session

**Project:** Langium 4.1.3 language server with 10+ milestones shipped over 8 days
**Tech stack:** TypeScript, Node.js 20.18.1, Langium 4.1.3, vscode-languageserver 9.0.1
**Codebase size:** ~23,000 LOC TypeScript
**Test coverage:** 88% with V8 coverage
**Deployment:** Both VS Code extension and IntelliJ plugin via LSP4IJ

**Key files from milestone v3.3:**
- `bbj-vscode/src/language/logger.ts` — Logger singleton (Phase 35)
- `bbj-vscode/src/language/main.ts` — LS entry point, debug flag handling (Phase 36)
- `bbj-vscode/src/language/bbj-module.ts` — Parser construction, debug-gated ambiguity logging (Phase 39)
- `bbj-vscode/src/language/bbj-document-builder.ts` — shouldValidate() logic (Phase 38)
- `bbj-vscode/src/language/java-javadoc.ts` — Javadoc error aggregation (Phase 38)
- `.planning/phases/39-parser-diagnostics/39-INVESTIGATION.md` — Parser ambiguity root cause analysis (Phase 39)
- `documentation/docs/user-guide/configuration.md` — bbj.debug documentation (Phase 39)

---

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
| v3.2 Bug Fix Release | 32-34 | 10 | 2026-02-08 |

**Total velocity:** 99 plans across 9 milestones in 8 days

See: `.planning/MILESTONES.md`

---

*State initialized: 2026-02-08 for v3.3 milestone*
