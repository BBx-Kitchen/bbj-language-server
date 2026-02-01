# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.
**Current focus:** Phase 5 - Java Interop (in progress)

## Current Position

Phase: 5 of 6 (Java Interop)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-01 — Completed 05-02-PLAN.md

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 6.0 minutes
- Total execution time: 1.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Plugin Scaffolding | 2 | 6 min | 3 min |
| 2 - Syntax Highlighting | 2 | 17 min | 8.5 min |
| 3 - Settings & Runtime | 3 | 23 min | 7.7 min |
| 4 - Language Server Integration | 4 | 57 min | 14.3 min |
| 5 - Java Interop | 2 | 6.5 min | 3.25 min |

**Recent Trend:**
- Last 5 plans: 04-03 (4 min), 04-04 (45 min), 05-01 (4 min), 05-02 (2.5 min)
- Trend: Consistent execution time for implementation tasks (~3-4 min)

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

**From Plan 04-02:**
- Simplified LanguageServerManager.stop() without StopOptions (not exposed in LSP4IJ 0.19.0)
- Status bar visibility controlled by BBj file focus (hide when irrelevant)
- 500ms debounce delay for settings-change restart (balance responsiveness/stability)
- Message bus broadcast for status updates (extensible for future subscribers)

**From Plan 04-03:**
- ConsoleView created via TextConsoleBuilderFactory for proper lifecycle management
- Crash detection: ServerStatus.stopped when previous was started/starting = unexpected crash
- Auto-restart once on first crash, stop and notify on second crash within 30s
- Balloon notification includes Show Log and Restart actions for user recovery
- Editor banner persists until crash state cleared or server successfully restarts
- Log level sent to server in createSettings() alongside BBj home and classpath

**From Plan 04-04 (human verification):**
- Document link feature disabled via LSPClientFeatures — Langium advertises it but has no provider
- initializationOptions passed via LSPClientFeatures.initializeParams(), not createSettings()
- Minimal ParserDefinition with word-level lexer fixes Cmd+hover range (whole-file PsiElement problem)
- BundledDictionaryProvider registered directly in plugin.xml (spellchecker is platform core, not separate plugin)
- Parameter hints via Ctrl+P is standard IntelliJ behavior (not auto-triggered like VS Code)
- Custom Language + no ParserDefinition = one giant PsiElement (breaks LSP4IJ navigation)
- "LSP Symbol ..." popup text on Cmd+hover is cosmetic — can be polished later

**From Plan 05-01:**
- Port field is int (not String) - port is numeric data, validates 1-65535
- Auto-detection searches BBj.properties for java.interop.port or bridge.port properties (poorly documented)
- Auto-detection is best-effort: never throws, returns 5008 default on any error
- Plugin-side TCP health check required because LS does not expose java-interop status via LSP protocol
- TCP check is for UI status display only - plugin does not manage LS-to-java-interop connection
- 2-second grace period prevents flashing disconnected status on transient network issues
- Health checks tied to LS lifecycle: start when LS starts, stop when LS stops (via message bus subscription)

**From Plan 05-02:**
- Status widget separate from LSP widget - java-interop is independent service (BBjServices)
- Gray icon for disconnected (not red) - gray implies "not available/inactive" vs red implies "error/crash"
- Widget only visible when BBj file is open - matches LSP widget pattern
- Reconnect via full LS restart - no separate java-interop reconnect path
- Banner non-dismissible - user fundamentally needs BBjServices for Java completions
- javaInteropHost/Port passed to LS now even though LS currently ignores them - forward-compatible for when LS is updated

### Pending Todos

1. **Comment toggling (REM)** — BbjCommenter registered but not functional in testing. May need investigation.
2. **Bracket/keyword matching** — Requires custom lexer or LSP support. Low priority.
3. **"LSP Symbol ..." popup text** — Cosmetic issue on Cmd+hover. Polish later.

### Blockers/Concerns

None blocking.

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 05-02-PLAN.md
Resume file: None
Next: Plan 05-03 — Human verification of all 5 success criteria
