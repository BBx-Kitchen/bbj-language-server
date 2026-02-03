# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.
**Current focus:** Planning next milestone

## Current Position

Milestone: v1.2 Run Fixes & Marketplace — COMPLETE
Phase: All phases complete (13/13)
Plan: All plans complete (26/26 cumulative)
Status: Ready for Marketplace submission and next milestone planning
Last activity: 2026-02-02 — v1.2 milestone archived

Progress: █████████████████████████ 100% (26/26 plans complete)

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |
| v1.2 Run Fixes & Marketplace | 11-13 | 5 | 2026-02-02 |

See: .planning/MILESTONES.md

## Accumulated Context

### Known Issues

1. Structure View symbol kind differentiation — labels, variables, and fields all show same icon (SymbolKind.Field) due to BBjNodeKindProvider default case. Language server issue. (Deferred from v1.1)

### Tech Debt

- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02
Stopped at: v1.2 milestone archived
Resume file: None
Next: `/gsd:new-milestone` to plan next version, or upload bbj-intellij-0.1.0.zip to JetBrains Marketplace.
