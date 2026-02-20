---
phase: 02-syntax-highlighting
plan: 01
subsystem: syntax-highlighting
tags: [textmate, grammar, bbj, intellij-plugin]

# Dependency graph
requires:
  - phase: 01-plugin-scaffolding
    provides: "Plugin build infrastructure, BbjLanguage, BbjFileType"
provides:
  - "TextMate grammar integration for BBj and BBx syntax highlighting"
  - "Gradle build task to sync grammars from bbj-vscode at compile time"
  - "BbjTextMateBundleProvider for runtime grammar extraction"
  - "Language configuration support for bracket matching and comment toggling"
affects: [03-lsp-integration, 04-symbol-navigation]

# Tech tracking
tech-stack:
  added: [org.jetbrains.plugins.textmate]
  patterns:
    - "Build-time grammar sync from bbj-vscode (single source of truth)"
    - "TextMate bundle provider pattern for bundled grammars"
    - "Custom FileType bridged to TextMate via lang.syntaxHighlighterFactory"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java
    - bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json
  modified:
    - bbj-intellij/build.gradle.kts
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Grammar files copied from bbj-vscode at build time, not duplicated in source tree"
  - "Static package.json in src/main/resources, grammar files in build/resources/main"
  - "Both BBj and BBx grammars included in single bundle"
  - "lang.syntaxHighlighterFactory bridges custom FileType to TextMate engine"

patterns-established:
  - "Single source of truth for grammars: bbj-vscode syntaxes/ directory"
  - "Gradle Copy task syncs grammars at processResources lifecycle phase"
  - "TextMateBundleProvider extracts resources to temp directory at runtime"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 02 Plan 01: TextMate Grammar Integration Summary

**BBj syntax highlighting via TextMate bundle with build-time grammar sync from bbj-vscode**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T11:21:16Z
- **Completed:** 2026-02-01T11:24:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TextMate grammar integration for BBj and BBx file types
- Build-time sync of grammars and language configurations from bbj-vscode
- Runtime bundle provider extracting grammars from JAR to temp directory
- Syntax highlighting, bracket matching, and comment toggling ready without language server

## Task Commits

Each task was committed atomically:

1. **Task 1: Build system and TextMate bundle descriptor** - `04bc127` (chore)
   - Added bundledPlugin("org.jetbrains.plugins.textmate") to build.gradle.kts
   - Created Gradle Copy task to sync grammars from bbj-vscode at processResources
   - Created static package.json bundle descriptor for TextMate engine

2. **Task 2: TextMate bundle provider and plugin.xml wiring** - `804357a` (feat)
   - Implemented BbjTextMateBundleProvider to extract grammars to temp directory
   - Added org.jetbrains.plugins.textmate dependency to plugin.xml
   - Bridged BBj FileType to TextMate via lang.syntaxHighlighterFactory
   - Registered textmate.bundleProvider extension for bundle loading

## Files Created/Modified

**Created:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java` - TextMate bundle provider extracting grammars from resources to temp directory at runtime
- `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json` - VS Code-format bundle descriptor mapping languages to grammars and configurations

**Modified:**
- `bbj-intellij/build.gradle.kts` - Added TextMate plugin dependency, Gradle Copy task for grammar sync
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Added TextMate dependency, lang.syntaxHighlighterFactory, and textmate.bundleProvider extensions

## Decisions Made

1. **Grammar sync strategy:** Grammars copied from bbj-vscode at build time via Gradle Copy task, not duplicated in source tree. This maintains bbj-vscode as single source of truth.

2. **Resource organization:** Static package.json in `src/main/resources/textmate/bbj-bundle/`, grammar files copied to `build/resources/main/textmate/bbj-bundle/`. Both end up merged in same resource path in final JAR.

3. **Bundle scope:** Both BBj and BBx grammars included in single bundle, mapped via separate language IDs in package.json.

4. **FileType bridging:** Critical to register `lang.syntaxHighlighterFactory` with `TextMateSyntaxHighlighterFactory` implementation. Without this, custom BbjFileType would override TextMate highlighting with empty highlighter.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build and packaging succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for LSP integration.** Syntax highlighting provides immediate visual feedback on code structure. Next phase (LSP integration) will add semantic highlighting, diagnostics, and code intelligence features that build upon this foundation.

**Grammar maintenance:** Any updates to BBj/BBx grammars should be made in bbj-vscode/syntaxes/ and will automatically sync to plugin at next build.

---
*Phase: 02-syntax-highlighting*
*Completed: 2026-02-01*
