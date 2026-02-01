# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.
**Current focus:** Phase 4 - Language Server Integration (in progress)

## Current Position

Phase: 4 of 6 (Language Server Integration)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-01 — Completed 04-01-PLAN.md (LSP core integration)

Progress: [██████░░░░] 62%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 6.5 minutes
- Total execution time: 0.85 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Plugin Scaffolding | 2 | 6 min | 3 min |
| 2 - Syntax Highlighting | 2 | 17 min | 8.5 min |
| 3 - Settings & Runtime | 3 | 23 min | 7.7 min |
| 4 - Language Server Integration | 1 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 03-01 (1 min), 03-02 (2 min), 03-03 (20 min), 04-01 (4 min)
- Trend: 04-01 fast execution - straightforward LSP4IJ integration with one API adaptation

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
- editorHighlighterProvider + lang.syntaxHighlighterFactory both needed to bridge custom FileType to TextMate engine
- TextMate bundle language IDs must match IntelliJ Language ID exactly (case-sensitive)

**From Plan 02-02:**
- ColorSettingsPage uses tag-based demo text highlighting (no custom lexer)
- Native Commenter/BraceMatcher required — TextMate language-configuration.json is NOT used by IntelliJ when custom FileType is registered
- Comment toggling and bracket matching deferred to Phase 4 (LSP integration)

**From Plan 03-01:**
- No @Service annotation on BbjSettings — registered via plugin.xml applicationService in Plan 02
- getBBjClasspathEntries does not filter underscore-prefixed entries, matching VS Code parity
- Utility classes use private constructors with all static methods

**From Plan 03-02:**
- Auto-detection fills fields in reset() and requires explicit Apply to persist
- Node.js version detection runs synchronously on document change in settings page

**From Plan 03-03:**
- Auto-detection must run in Configurable.reset(), NOT createComponent() — platform calls reset() after createComponent()
- Banner providers include auto-detection fallback to suppress false warnings
- runIde configured to open ~/tinybbj directly (skip project picker)

**From Plan 04-01:**
- LSP4IJ 0.19.0 as LSP integration layer (Community Edition compatible)
- Language server bundle copied at build time from bbj-vscode/out/language/
- Node.js path resolution: settings → auto-detection → system PATH fallback
- Server path resolution: plugin installation path → classloader resource extraction
- BbjCompletionFeature as utility class (LSP4IJ API simpler than expected)
- Language ID lowercase 'bbj' to match Langium server expectations

### Pending Todos

1. **Comment toggling (REM)** — BbjCommenter registered but not functional in testing. Investigate further or resolve via LSP in Phase 4.
2. **Bracket/keyword matching** — Requires custom lexer or LSP. Deferred to Phase 4.

### Blockers/Concerns

None blocking. Parked items above are non-critical for Phase 2 goals.

## Session Continuity

Last session: 2026-02-01 15:28 UTC
Stopped at: Completed 04-01-PLAN.md (LSP core integration)
Resume file: None
Next: Plan 04-02 — Status bar widget
