# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.
**Current focus:** v1.2 Run Fixes & Marketplace

## Current Position

Milestone: v1.2 Run Fixes & Marketplace
Phase: 11 (Run Command Fixes)
Plan: 01 of 2 complete
Status: In progress
Last activity: 2026-02-02 — Completed 11-01-PLAN.md (Run command fixes)

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-12 | TBD | In progress |

See: .planning/MILESTONES.md

## Accumulated Context

### Known Issues

1. Structure View symbol kind differentiation — labels, variables, and fields all show same icon (SymbolKind.Field) due to BBjNodeKindProvider default case. Language server issue. (Deferred from v1.1)
2. ~~Run commands broken — BBj executable "not found" despite configured BBj Home path.~~ **FIXED in 11-01**
3. ~~Run command output not captured in IntelliJ console tool window~~ **FIXED in 11-01 - stderr now routed to LS log window**
4. Toolbar buttons not visible in new UI. (Active in Phase 11-02)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02T14:18:23Z
Stopped at: Completed 11-01-PLAN.md
Resume file: None
Next: Continue Phase 11 with Plan 02 (toolbar visibility)

## Recent Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Use java.nio.file.Files API for executable resolution | 11-01 | Handles symbolic links correctly (JDK-4956115), fixes "not found" errors |
| Route run command errors to LS log window only (no balloons) | 11-01 | Centralized error output, auto-show only on errors |
| Attach ProcessAdapter before startNotify() | 11-01 | Captures early stderr output (per RESEARCH.md pitfall #3) |
| Pre-launch validation before process spawn | 11-01 | Catches BBj Home, directory, executable issues before confusing errors |
