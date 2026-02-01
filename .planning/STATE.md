# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.
**Current focus:** Phase 2 - Syntax Highlighting

## Current Position

Phase: 2 of 6 (Syntax Highlighting)
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-02-01 — Completed 02-01-PLAN.md (TextMate grammar integration)

Progress: [███░░░░░░░] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 2.7 minutes
- Total execution time: 0.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Plugin Scaffolding | 2 | 6 min | 3 min |
| 2 - Syntax Highlighting | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (2 min), 02-01 (2 min)
- Trend: Consistent efficiency

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All work happens in feature branch of existing bbj-language-server repo
- New bbj-intellij/ subdirectory alongside bbj-vscode/
- LSP4IJ approach (Community Edition compatible) over native JetBrains LSP
- Language server is fully decoupled, runs standalone over stdio
- java-interop hosted by BBjServices (not managed by plugin, just connects)

**From Plan 01-01:**
- Gradle 8.13+ required for IntelliJ Platform Gradle Plugin 2.11.0
- Kotlin DSL (build.gradle.kts) for type-safe build configuration
- IntelliJ IDEA Community 2024.2 as target platform
- Java 17 target compatibility
- Version-less plugin declaration in build.gradle.kts (version in settings.gradle.kts only)

**From Plan 01-02:**
- Private constructors for singleton Language and FileType classes
- Leading slash in icon path (/icons/bbj.svg) for absolute resource loading
- BbjFileType must be final class per IntelliJ Platform convention
- getName() returns "BBj" matching plugin.xml name attribute exactly
- Single SVG icon in neutral blue visible on both light/dark themes

**From Plan 02-01:**
- Grammar files copied from bbj-vscode at build time, not duplicated in source tree
- Static package.json in src/main/resources, grammar files in build/resources/main
- Both BBj and BBx grammars included in single bundle
- lang.syntaxHighlighterFactory bridges custom FileType to TextMate engine

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-01 11:24 UTC
Stopped at: Completed 02-01-PLAN.md (TextMate grammar integration) - Phase 2 complete
Resume file: None
Next: Phase 3 (LSP Integration)
