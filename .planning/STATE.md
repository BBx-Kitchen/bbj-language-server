# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.
**Current focus:** v1.1 Polish & Run Commands

## Current Position

Milestone: v1.1 Polish & Run Commands
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-01 — Milestone v1.1 started

## Milestone History

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 Internal Alpha | 1-6 | 19 | 2026-02-01 |

See: .planning/MILESTONES.md

## Accumulated Context

### Known Issues (from v1.0 — being addressed in v1.1)

1. **Comment toggling (REM)** — BbjCommenter registered but not functional in testing
2. **Bracket/keyword matching** — Requires custom lexer or LSP support
3. **"LSP Symbol ..." popup text** — Cosmetic issue on Cmd+hover
4. **LS shutdown delay on last file close** — Consider keeping LS alive briefly
5. **Linux runtime testing** — Code-complete but not human-tested
6. **BbjCompletionFeature orphaned** — Custom completion icons not wired
7. **Stale bbj-intellij/META-INF/plugin.xml** — Old Phase 1-2 leftover, no runtime impact

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-01
Stopped at: Milestone v1.1 initialized, defining requirements
Resume file: None
Next: Define requirements → create roadmap
