# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.
**Current focus:** v1.2 Run Fixes & Marketplace

## Current Position

Milestone: v1.2 Run Fixes & Marketplace
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-02 — Milestone v1.2 started

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |
| v1.1 Polish & Run Commands | 7-10 | 6 | 2026-02-02 |

See: .planning/MILESTONES.md

## Accumulated Context

### Known Issues

1. Structure View symbol kind differentiation — labels, variables, and fields all show same icon (SymbolKind.Field) due to BBjNodeKindProvider default case. Language server issue.
2. Run commands broken — BBj executable "not found" despite configured BBj Home path. Toolbar buttons not visible in new UI.

### Tech Debt

- Run command output not captured in IntelliJ console tool window
- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02
Stopped at: Defining v1.2 requirements
Resume file: None
Next: Complete requirements and roadmap, then /gsd:plan-phase 11
