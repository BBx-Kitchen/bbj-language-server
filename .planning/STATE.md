# Project State: BBj Language Server

**Last Updated:** 2026-02-08

## Project Reference

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Milestone:** v3.3 Output & Diagnostic Cleanup
**Milestone Goal:** Reduce default LS output to a quiet, professional minimum — users see only what matters.

**Current Focus:** Implement debug logging controls and diagnostic filtering for quiet startup experience.

---

## Current Position

**Active Phase:** Phase 36 - Settings Plumbing
**Active Plan:** 1 of 1 (Plan 01 complete)

**Phase Status:** Complete
**Phase Goal:** Debug flag flows from IDE settings to language server and controls logger behavior
**Last Activity:** 2026-02-08 - Completed 36-01-PLAN.md

**Progress Bar:**
```
Milestone v3.3: [████░░░░░░░░░░░░░░░░] 2/10 requirements (20%)
Phase 36:       [████████████████████] 3/3 success criteria (100%)
```

---

## Performance Metrics

### Current Milestone (v3.3)

**Started:** 2026-02-08
**Phases completed:** 2/5
**Requirements completed:** 2/10
**Days elapsed:** 0

**Velocity:** 2 phases/day (Phase 35-36 completed 2026-02-08)

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

### Active Constraints

**Never suppress console.error():** Error output must always be visible regardless of debug flag state to prevent hiding real failures
**Filter by severity not file type:** Diagnostic filtering must preserve parser/lexer errors even from synthetic files
**Hot-reload all settings:** Settings changes via `onDidChangeConfiguration` must clear cached state to prevent desynchronization

### Pending TODOs

- [x] Phase 35 (Logger Infrastructure) — COMPLETE
- [x] Phase 36 (Settings Plumbing) — COMPLETE
- [ ] Determine exact console.* call sites for migration (Phase 37 scope)
- [ ] Test debug flag behavior in IntelliJ LSP4IJ during Phase 37
- [ ] Verify synthetic URI scheme coverage (classpath:/, bbjlib:/) in Phase 38
- [ ] Enable Chevrotain ambiguity logging to identify grammar rules in Phase 39

### Known Blockers

None currently identified.

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall) — CAST now handled by CastExpression

---

## Session Continuity

### What Just Happened

- Phase 36 (Settings Plumbing) completed in 2 minutes
- Added bbj.debug boolean setting to package.json (default: false)
- Wired onDidChangeConfiguration handler to logger.setLevel()
- Implemented quiet startup (ERROR level until first validation)
- Implemented hot-reload (debug=true→DEBUG, false→WARN without LS restart)
- Added 8 integration tests (25/25 passing total)
- All tests pass, TypeScript compilation succeeds with zero errors
- Commits: b840f2e (feat: wire setting), f21b251 (test: integration tests)

### What's Next

**Immediate:** Phase 37 - Console Migration (systematic refactoring of 56 console.* call sites)

**After Phase 37:**
- Phase 38: Diagnostic Filtering (verification only)
- Phase 39: Parser Diagnostics (investigation + docs)

**Critical path:** Phases 35 → 36 → 37 must execute sequentially (now: 35 ✓, 36 ✓)
**Parallel opportunity:** Phase 38 can run independently

### Context for Next Session

**Project:** Langium 4.1.3 language server with 10+ milestones shipped over 8 days
**Tech stack:** TypeScript, Node.js 20.18.1, Langium 4.1.3, vscode-languageserver 9.0.1
**Codebase size:** ~23,000 LOC TypeScript
**Test coverage:** 88% with V8 coverage
**Deployment:** Both VS Code extension and IntelliJ plugin via LSP4IJ

**Key files for v3.3:**
- `bbj-vscode/src/language/main.ts` — LS entry point, onDidChangeConfiguration handler
- `bbj-vscode/src/language/bbj-ws-manager.ts` — Settings initialization, onInitialize pattern
- `bbj-vscode/src/language/bbj-document-builder.ts` — shouldValidate() logic for synthetic files
- `bbj-vscode/src/language/java-interop.ts` — High console output volume (javadoc scanning)
- `bbj-vscode/package.json` — VS Code settings schema

**Research insights:**
- 56 console.* call sites across 10 files need migration
- Existing shouldValidate() likely already filters synthetic files (verification needed)
- Chevrotain ambiguity warnings emitted during grammar construction (before document processing)

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
