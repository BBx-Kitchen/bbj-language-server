---
phase: 10-bug-fixes-polish
plan: 01
subsystem: editor
tags: [commenter, bracket-matching, lsp4ij, code-style]

# Dependency graph
requires:
  - phase: 03-parser-psi
    provides: BbjWordLexer and BbjTokenTypes for token-level parsing
provides:
  - REM comment toggling at column 0 with IntelliJ code style settings
  - Bracket matching for (), [], {} with lexer token types
  - Hover popup suppression to prevent "LSP Symbol ..." placeholder
affects: [10-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LanguageCodeStyleSettingsProvider for column-0 comment placement
    - PairedBraceMatcher with distinct bracket token types
    - LSPHoverFeature.isSupported() override to disable features

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "LINE_COMMENT_AT_FIRST_COLUMN = true forces REM at column 0"
  - "Comment stacking handled automatically by IntelliJ's comment handler"
  - "Bracket token types (LPAREN, RPAREN, etc.) required for PairedBraceMatcher"
  - "LSPHoverFeature.isSupported() = false suppresses hover placeholder"

patterns-established:
  - "Code style settings control comment placement behavior"
  - "Lexer must emit specific token types for bracket matching to work"
  - "LSP4IJ client features can be disabled by overriding isSupported()"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 10 Plan 01: Bug Fixes & Polish Summary

**REM comment toggling at column 0, bracket matching for (), [], {}, and suppressed LSP Symbol hover placeholder**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T07:59:40Z
- **Completed:** 2026-02-02T08:02:07Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Cmd+/ toggles REM comments at column 0 (not indentation level) via code style settings
- Bracket matching highlights (), [], {} pairs when cursor is adjacent
- Hover popup no longer shows confusing "LSP Symbol ..." placeholder text

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix comment toggling and enforce column-0 REM placement** - `390e07e` (feat)
2. **Task 2: Implement bracket matching with lexer token types** - `b71d1e4` (feat)
3. **Task 3: Suppress LSP Symbol hover placeholder** - `e64110e` (fix)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLanguageCodeStyleSettingsProvider.java` - Forces LINE_COMMENT_AT_FIRST_COLUMN = true for BBj language
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java` - Defines three bracket pairs for matching and navigation
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java` - Added LPAREN, RPAREN, LBRACKET, RBRACKET, LBRACE, RBRACE token types
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java` - Emits bracket-specific tokens instead of generic SYMBOL
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - Overrides LSPHoverFeature.isSupported() to disable hover
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Registered langCodeStyleSettingsProvider and lang.braceMatcher extension points

## Decisions Made

- **LINE_COMMENT_AT_FIRST_COLUMN = true** - IntelliJ code style setting forces REM at column 0 (before indentation), matching BBj standard
- **Comment stacking works automatically** - IntelliJ's default comment handler stacks REM prefixes when commenting already-commented lines
- **Distinct bracket token types required** - PairedBraceMatcher needs separate LPAREN/RPAREN/etc. tokens; generic SYMBOL token insufficient
- **Hover disabled completely** - LSPHoverFeature.isSupported() = false suppresses placeholder; language server doesn't implement hover anyway

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All three fixes implemented cleanly:
- Code style provider API straightforward
- PairedBraceMatcher well-documented pattern
- LSP4IJ hover feature API available in 0.19.0

## Next Phase Readiness

Ready for 10-02:
- Comment toggling (FIX-01) resolved
- Bracket matching (FIX-02) resolved
- LSP Symbol popup (FIX-03) resolved
- Remaining fixes: LS shutdown grace period (FIX-04), completion icons (FIX-05), stale META-INF (FIX-06), Linux review (FIX-07)

---
*Phase: 10-bug-fixes-polish*
*Completed: 2026-02-02*
