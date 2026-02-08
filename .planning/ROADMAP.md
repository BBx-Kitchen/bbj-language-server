# Roadmap: BBj Language Server v3.3

**Milestone:** v3.3 Output & Diagnostic Cleanup
**Goal:** Reduce default LS output to a quiet, professional minimum — users see only what matters.
**Phases:** 35-39
**Depth:** Standard

## Overview

This milestone implements debug logging controls and diagnostic filtering for the BBj Language Server. Users get a quiet, professional startup experience by default with verbose output available on-demand via debug flag. Synthetic file diagnostics are properly suppressed, javadoc errors are smartly aggregated, and parser ambiguity warnings are investigated for proper handling.

## Phases

### Phase 35: Logger Infrastructure

**Goal:** Foundation layer exists for level-based logging with zero overhead when disabled

**Dependencies:** None

**Requirements:** LOG-01 (partial - logger singleton structure)

**Success Criteria:**
1. Developer can import logger singleton and call `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()` methods
2. Logger respects LogLevel enum (DEBUG, INFO, WARN, ERROR) and silently drops messages below current level
3. Logger calls have zero overhead when disabled (enum comparison only, no string formatting)
4. Logger builds and type-checks with existing TypeScript configuration

**Status:** ✓ Complete (2026-02-08)

Plans:
- [x] 35-01-PLAN.md -- Create logger singleton module and unit tests

---

### Phase 36: Settings Plumbing

**Goal:** Debug flag flows from IDE settings to language server and controls logger behavior

**Dependencies:** Phase 35

**Requirements:** LOG-01 (complete), LOG-05 (hot-reload)

**Success Criteria:**
1. User can toggle `bbj.debug` setting in VS Code and IntelliJ without LS restart
2. Setting change triggers `onDidChangeConfiguration` handler that updates logger level immediately
3. Quiet startup mode gates verbose output until first document validation completes (temporary ERROR level override)
4. Logger level persists correctly across setting changes (no state desync)

**Plans:** 1 plan

**Status:** ✓ Complete (2026-02-08)

Plans:
- [x] 36-01-PLAN.md -- Wire bbj.debug setting to logger via onDidChangeConfiguration with quiet startup

---

### Phase 37: Console Migration

**Goal:** All console output respects debug flag — quiet by default, verbose on-demand

**Dependencies:** Phase 36

**Requirements:** LOG-02 (quiet default), LOG-03 (verbose on-demand), LOG-04 (console call migration)

**Success Criteria:**
1. Startup output shows only essential summary lines when debug is off (BBj home, class count, errors only)
2. Verbose output shows detailed information when debug is on (individual class resolution, classpath details, javadoc scanning)
3. All `console.log()` and `console.debug()` calls migrated to `logger.info()` or `logger.debug()` as appropriate
4. Error output (`console.error()`) never suppressed regardless of debug flag state
5. High-impact files migrated first (java-interop.ts, bbj-ws-manager.ts, bbj-scope-local.ts, main.ts)

**Status:** ✓ Complete (2026-02-08)

Plans:
- [x] 37-01-PLAN.md -- Migrate high-volume files (java-interop.ts, bbj-ws-manager.ts, java-javadoc.ts)
- [x] 37-02-PLAN.md -- Migrate remaining files (main.ts, scopes, linker, module, hover, builder, formatter)

---

### Phase 38: Diagnostic Filtering

**Goal:** Users see only actionable diagnostics — synthetic file errors and javadoc spam eliminated

**Dependencies:** None (verification of existing behavior)

**Requirements:** DIAG-01 (synthetic file suppression), DIAG-02 (javadoc error aggregation)

**Success Criteria:**
1. Parse errors from synthetic/internal files (bbj-api.bbl, functions.bbl, classpath:/, bbjlib:/ URIs) are not shown to users
2. Existing `shouldValidate()` logic verified to cover all synthetic URI schemes
3. Javadoc loading shows single summary error if all sources fail (not per-path spam)
4. Javadoc loading shows no error if any source succeeds (silent partial success)

**Status:** ✓ Complete (2026-02-08)

Plans:
- [x] 38-01-PLAN.md -- Add bbjlib:/ scheme suppression, aggregate javadoc errors, migrate last console.error calls

---

### Phase 39: Parser Diagnostics

**Goal:** Chevrotain ambiguity warnings handled appropriately — either fixed or moved behind debug flag

**Dependencies:** Phase 36 (uses debug flag infrastructure)

**Requirements:** PARSE-01 (investigation), PARSE-02 (fix or suppress), DOCS-01 (documentation)

**Success Criteria:**
1. Root cause of Chevrotain "Ambiguous Alternatives Detected" message documented with specific grammar rules identified
2. Grammar ambiguities either resolved via refactoring or explicitly suppressed via IGNORE_AMBIGUITIES with rationale
3. Parser ambiguity details available on-demand via debug flag (not shown by default)
4. Debug logging setting documented in Docusaurus docs with instructions for enabling verbose output
5. If grammar changes required, all tests pass with zero regressions

---

## Progress Tracking

| Phase | Status | Requirements | Plans | Completed |
|-------|--------|--------------|-------|-----------|
| 35 - Logger Infrastructure | ✓ Complete | LOG-01 (partial) | 1/1 | 2026-02-08 |
| 36 - Settings Plumbing | ✓ Complete | LOG-01, LOG-05 | 1/1 | 2026-02-08 |
| 37 - Console Migration | ✓ Complete | LOG-02, LOG-03, LOG-04 | 2/2 | 2026-02-08 |
| 38 - Diagnostic Filtering | ✓ Complete | DIAG-01, DIAG-02 | 1/1 | 2026-02-08 |
| 39 - Parser Diagnostics | Pending | PARSE-01, PARSE-02, DOCS-01 | 0/0 | — |

**Milestone Progress:** 7/10 requirements (70%)

---

## Phase Dependencies

```
Phase 35 (Logger Infrastructure)
  ↓
Phase 36 (Settings Plumbing)
  ↓
Phase 37 (Console Migration)

Phase 38 (Diagnostic Filtering) [independent]

Phase 36 (Settings Plumbing)
  ↓
Phase 39 (Parser Diagnostics)
```

**Critical path:** 35 → 36 → 37 (sequential)
**Parallel work:** Phase 38 can run independently

---

## Coverage Summary

**Total v3.3 requirements:** 10
**Mapped to phases:** 10
**Unmapped:** 0

All requirements covered:
- Phase 35: LOG-01 (partial)
- Phase 36: LOG-01 (complete), LOG-05
- Phase 37: LOG-02, LOG-03, LOG-04
- Phase 38: DIAG-01, DIAG-02
- Phase 39: PARSE-01, PARSE-02, DOCS-01

---

*Roadmap created: 2026-02-08*
*Last updated: 2026-02-08 after Phase 38 execution complete*
