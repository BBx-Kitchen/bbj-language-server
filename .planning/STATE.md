# Project State: BBj Language Server

**Last Updated:** 2026-02-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.8 Test & Debt Cleanup

---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-20 — Milestone v3.8 started

---

## Performance Metrics

### Cumulative

**Started:** 2026-02-01
**Milestones shipped:** 14
**Phases completed:** 49
**Plans completed:** 121
**Days elapsed:** 10 (through v3.6)
**Velocity:** ~12 plans/day

### Recent History

**v3.6 (Shipped: 2026-02-10):**
- Duration: 1 day
- Phases: 2 (48-49)
- Plans: 2
- Files modified: 12 (+658 / -63 lines)
- Key: IntelliJ Platform API compatibility — zero deprecated/scheduled-for-removal warnings

**v3.5 (Shipped: 2026-02-09):**
- Duration: 1 day
- Phases: 4 (44-47)
- Plans: 7
- Files modified: 41 (+3,689 / -1,695 lines)
- Key: Dual-IDE docs site, IntelliJ User Guide, VS Code audit, stale content cleanup

---

## Accumulated Context

### Active Constraints

- Phase 53 depends on Phases 50, 51, and 52 all completing first
- Phase 52 exit criterion: BBjCPL output parser must have fixture-backed unit tests before Phase 53 wiring
- CPU rebuild loop pitfall: BBjCPL must be invoked inside `buildDocuments()`, never from an `onBuildPhase` callback
- BBjCPL stderr format CONFIRMED: source code on same line as error header; regex validated empirically (Phase 52 Plan 01)

### Decisions

Full decision log in PROJECT.md Key Decisions table. Key v3.7 decisions pending:
- BBjCPL output parser regex (to be determined empirically in Phase 52)
- On-save trigger implementation approach (BBjDocumentUpdateHandler vs onChange guard)
- [Phase 50]: Match linking errors by data.code not severity in Rule 1 — toDiagnostic() downgrades non-cyclic linking errors to Warning, so severity check misses them
- [Phase 50]: getDiagnosticTier() wired into applyDiagnosticHierarchy() for parse detection and cap logic — avoids TS noUnusedLocals error while strengthening extensibility
- [Phase 50]: Per-file suppression only: File B linking errors survive when File A has parse errors — users fix File A first
- [Phase 50-diagnostic-noise-reduction]: Diagnostic suppression settings placed before !workspaceInitialized guard — apply immediately without Java class reload
- [Phase 50-diagnostic-noise-reduction]: Status bar uses getDiagnostics() heuristic (any error + setting enabled) — not a custom LSP notification; Phase 53 can refine
- [Phase 51-outline-resilience]: DefaultDocumentSymbolProvider imported from langium/lsp (not langium) — only exported from LSP sub-module
- [Phase 51-outline-resilience]: BBjDocumentSymbolProvider: per-node try/catch, (parse error) fallback, deep-walk via AstUtils.streamAllContents — keeps Structure View populated during syntax errors
- [Phase 51-outline-resilience]: Large file threshold for deep-walk fallback: 200,000 chars (~10k lines) — skips expensive full-tree scan on large files
- [Phase 52-bbjcpl-foundation]: bbjcpl format confirmed empirically: source code on SAME line as error header (not separate line). Format: '<path>: error at line <legacy> (<physical>):     <source>'
- [Phase 52-bbjcpl-foundation]: BBjCPL parser regex: ^.+:\s+error at line \d+ \((\d+)\):\s*(.*) — physical line in parens is 1-based, converted to 0-based for LSP; source snippet included in diagnostic message
- [Phase 52-bbjcpl-foundation plan 02]: AbortController.abort() on ENOENT spawn (proc.pid=undefined) sends kill signal to process group 0 — crashes vitest worker with exit 144. Fix: cancel flag + proc.kill() only when proc.pid !== undefined
- [Phase 52-bbjcpl-foundation plan 02]: BBjCPLService uses CompileHandle interface (not AbortController) in inFlight map; cancel() method checks pid validity; settle() wrapper prevents double-resolve when error+close both fire
- [Phase 53-01-bbjcpl-diagnostic-integration]: setCompilerTrigger/getCompilerTrigger defined in bbj-document-validator.ts (not main.ts) to avoid circular import with bbj-ws-manager.ts
- [Phase 53-01-bbjcpl-diagnostic-integration]: DiagnosticTier.BBjCPL = 3 (highest); Rule 0 suppresses only Langium Parse-tier diagnostics when BBjCPL errors present — not all Langium diagnostics
- [Phase 53-01-bbjcpl-diagnostic-integration]: mergeDiagnostics() same-line match: keep Langium message, stamp source='BBjCPL'; BBjCPL-only lines added directly; Langium-only unchanged
- [Phase 53-02]: notifyBbjcplAvailability extracted to bbj-notifications.ts: importing main.ts from bbj-document-builder crashes tests (createConnection at module load time); isolated module with initNotifications(connection) called by main.ts at startup
- [Phase 53-02]: trackBbjcplAvailability uses fs.accessSync to check bbjcpl binary at BBj home — direct and reliable vs monitoring compile() return value ([] is ambiguous between clean file and ENOENT)
- [Phase 53-02]: Both trigger modes 'on-save' and 'debounced' route through debouncedCompile() with 500ms debounce — distinction preserved for future use, both use same path at current integration stage

### Tech Debt

- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented in Phase 26 FINDINGS.md but not yet implemented
- Dead code in type inferer (MethodCall CAST branch) and validator (checkCastTypeResolvable for MethodCall)
- 6 pre-existing test failures
- 14 pre-existing TODO/FIXME comments across 6 files
- 19 LSP4IJ experimental API usages (expected, requires LSP4IJ to stabilize)

### Blockers/Concerns

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 14 | Fix manual release workflow: pass -Pversion to verifyPlugin/publishPlugin, add checkout to create-release job for gh CLI git context | 2026-02-17 | 8956e26 | [14-fix-manual-release-workflow-pass-version](./quick/14-fix-manual-release-workflow-pass-version/) |
| 13 | Fix IntelliJ multi-instance language server: replace custom grace period with LSP4IJ native timeout, fix crash recovery, add disposal guards | 2026-02-16 | 293fea5 | [13-fix-intellij-multi-instance-language-ser](./quick/13-fix-intellij-multi-instance-language-ser/) |

---
| Phase 53 P01 | 2 | 2 tasks | 6 files |
| Phase 53 P02 | 6 | 3 tasks | 5 files |

## Session Continuity

### What Just Happened

- Phase 53 Plan 02 complete: full BBjCPL diagnostic integration wired end-to-end
- BBjCPLService.compile() called from buildDocuments() after Langium validation (NOT from onBuildPhase)
- 500ms trailing-edge debounce prevents CPU spike on rapid saves; clear-then-show prevents flicker
- Trigger mode 'off' clears stale BBjCPL diagnostics; 'on-save' and 'debounced' both use debouncedCompile()
- Lazy availability detection via fs.accessSync on first compile trigger; notifies client once
- bbj-notifications.ts created to isolate notifyBbjcplAvailability from main.ts circular import
- BBjCPL status bar item added (hidden by default); bbj/bbjcplAvailability listener in extension.ts
- compilerTrigger added to initializationOptions in extension.ts
- 7 integration tests for mergeDiagnostics() all pass; total 496 tests pass (4 pre-existing failures)
- Requirements CPL-08 marked complete (CPL-05/06/07 completed in Plan 01)

### What's Next

**Phase 53 complete.** v3.7 Diagnostic Quality & BBjCPL Integration milestone is fully implemented.
Next: version bump and release preparation for v3.7.

### Context for Next Session

**Phase 53 complete.** End-to-end BBjCPL integration is working.

**Key architectural decisions for future reference:**
- `bbj-notifications.ts` holds connection reference — imported by shared services, initialized by main.ts
- BBjCPL called from inside `buildDocuments()`, never from `onBuildPhase` (CPU rebuild loop prevention)
- Lazy availability detection: `trackBbjcplAvailability()` runs once on first compile trigger
- `mergeDiagnostics()` in `bbj-document-validator.ts` — same-line: keep Langium msg, stamp BBjCPL source
- Always exits 0; errors on stderr only; stdout always empty

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
| v3.3 Output & Diagnostic Cleanup | 35-39 | 6 | 2026-02-08 |
| v3.4 0.8.0 Issue Closure | 40-43 | 4 | 2026-02-08 |
| v3.5 Documentation for 0.8.0 Release | 44-47 | 7 | 2026-02-09 |
| v3.6 IntelliJ Platform API Compatibility | 48-49 | 2 | 2026-02-10 |
| v3.7 Diagnostic Quality & BBjCPL Integration | 50-53 | TBD | In progress |

**Total velocity:** 121 plans across 14 milestones in 10 days

See: `.planning/MILESTONES.md`

---

*State updated: 2026-02-20 after Phase 53 Plan 01 completion — Stopped at: Completed 53-bbjcpl-diagnostic-integration 53-01-PLAN.md*
