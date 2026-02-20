---
phase: 02-syntax-highlighting
plan: 02
subsystem: syntax-highlighting
tags: [color-scheme, settings, commenter, intellij-plugin]

# Dependency graph
requires:
  - phase: 02-syntax-highlighting
    plan: 01
    provides: "TextMate grammar integration, syntax highlighting"
provides:
  - "BBj Color Scheme settings page with 9 token types"
  - "BbjCommenter for REM line comments"
affects: [04-language-server-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ColorSettingsPage with tag-based demo text highlighting"
    - "Native Commenter implementation (TextMate language-configuration.json not used by IntelliJ for custom FileTypes)"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java
  modified:
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "ColorSettingsPage uses tag-based demo text (no custom lexer needed)"
  - "BbjCommenter needed because custom FileType overrides TextMate language-configuration.json"
  - "Bracket matching and comment toggling deferred — known IntelliJ limitation with TextMate + custom FileType"

patterns-established:
  - "Native IntelliJ extension points needed for features beyond syntax highlighting when using TextMate + custom FileType"

# Metrics
duration: 15min
completed: 2026-02-01
---

# Phase 02 Plan 02: Color Scheme Settings Page Summary

**BBj Color Scheme settings page with token customization and BbjCommenter**

## Performance

- **Duration:** 15 min (including debugging and human verification)
- **Completed:** 2026-02-01
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- BBj section in Settings > Editor > Color Scheme with 9 customizable token types
- Demo BBj code preview with live color updates
- BbjCommenter implementation for REM line comment toggling

## Task Commits

1. **Task 1: BbjColorSettingsPage implementation** - `c7aa8b2` (feat)
   - Created BbjColorSettingsPage with 9 TextAttributesKey constants
   - Implemented getDemoText() with annotated BBj code
   - Registered colorSettingsPage in plugin.xml

2. **Task 2: Human verification** — User approved syntax highlighting works
   - Confirmed keywords, strings, comments display in distinct colors
   - Confirmed Color Scheme settings page visible and functional

## Additional Fixes During Verification

3. **Fix: TextMate bundle language ID case mismatch** - `e3421c1` (fix)
   - package.json used lowercase "bbj" but IntelliJ Language uses "BBj"
   - TextMate bundle lookup is case-sensitive

4. **Fix: Add editorHighlighterProvider** - `096b5f7` (fix)
   - lang.syntaxHighlighterFactory alone insufficient for FileType bridging
   - editorHighlighterProvider needed at the file-type level

5. **BbjCommenter for REM comments** - `d218a98` (feat)
   - Custom FileType overrides TextMate language-configuration.json
   - Native Commenter implementation required

## Files Created/Modified

**Created:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjColorSettingsPage.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjCommenter.java`

**Modified:**
- `bbj-intellij/src/main/resources/META-INF/plugin.xml`
- `bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json`

## Known Limitations (Parked)

1. **Comment toggling (Cmd+/ / REM)** — BbjCommenter is registered but not functional in sandbox testing. Root cause unclear. May resolve with language server integration in Phase 4.

2. **Bracket/keyword matching** — IntelliJ's TextMate integration does not expose bracket matching from language-configuration.json when a custom FileType is registered. PairedBraceMatcher requires a custom lexer with IElementType tokens. Keyword-based blocks (CLASS/CLASSEND) would need a FoldingBuilder. Both deferred to Phase 4 when LSP provides structural information.

## Deviations from Plan

- Added editorHighlighterProvider (not in original plan) — required for TextMate FileType bridging
- Fixed package.json language ID casing — case-sensitive matching not anticipated
- Comment toggling and bracket matching deferred as known limitations

---
*Phase: 02-syntax-highlighting*
*Completed: 2026-02-01*
