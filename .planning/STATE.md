# Project State: BBj Language Server

**Last Updated:** 2026-02-20

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Current Focus:** v3.7 Diagnostic Quality & BBjCPL Integration — Phase 52 in progress (Plan 02 remaining)

---

## Current Position

Phase: 52 of 53 (BBjCPL Foundation — In Progress)
Plan: 1 of 2 in current phase (complete)
Status: Phase 52 Plan 01 complete — fixture capture + parseBbjcplOutput() TDD'd
Last activity: 2026-02-20 — Phase 52 Plan 01 complete: bbjcpl stderr parser with fixture-backed unit tests

Progress: [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25% (v3.7)

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

## Session Continuity

### What Just Happened

- Phase 52 Plan 01 complete: bbjcpl output parser TDD'd with real fixture files
- Captured real bbjcpl stderr output using /Users/beff/bbx/bin/bbjcpl binary
- Empirically confirmed format: source code on SAME line as error header (not separate line)
- parseBbjcplOutput() implemented with 9 unit tests; all pass; 6 pre-existing failures unchanged
- Requirements CPL-01 and CPL-03 marked complete

### What's Next

**Immediate:** Phase 52 Plan 02 — BBjCPL Process Lifecycle Service

### Context for Next Session

**Phase 52 Plan 01 complete.** parseBbjcplOutput() ready; fixture files committed.

**BBjCPL format confirmed:**
- Format: `<filepath>: error at line <legacy> (<physical>):     <source_code_on_same_line>`
- Regex: `^.+:\s+error at line \d+ \((\d+)\):\s*(.*)`
- Binary at: /Users/beff/bbx/bin/bbjcpl (also accessible via BBJCPL_PATH env or bbjcpl-check.sh hook)
- Always exits 0; errors on stderr only; stdout always empty

**Phase 51 complete.** BBjDocumentSymbolProvider active — Structure View now populated even for files with syntax errors.

**Phase 50 complete.** Full diagnostic suppression stack in place:
- Plan 01: Core suppression logic in BBjDocumentValidator (DiagnosticTier, applyDiagnosticHierarchy, setSuppressCascading, setMaxErrors)
- Plan 02: VS Code settings wiring + status bar indicator
- Phase 53 extension path: add `BBjCPL = 3` to `DiagnosticTier` enum and one branch to `getDiagnosticTier()`; add custom LSP notification for precise status bar state

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

*State updated: 2026-02-20 after Phase 52 Plan 01 completion — Stopped at: Completed 52-bbjcpl-foundation 52-01-PLAN.md*
