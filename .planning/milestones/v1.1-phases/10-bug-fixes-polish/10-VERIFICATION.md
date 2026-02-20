---
phase: 10-bug-fixes-polish
verified: 2026-02-02T08:09:50Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Completion popup shows distinct icons for functions, variables, and keywords instead of generic icons"
    status: failed
    reason: "BbjCompletionFeature exists but is completely orphaned - not wired into LSP4IJ at all"
    artifacts:
      - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjCompletionFeature.java"
        issue: "File exists with AllIcons.Nodes mapping and Java-interop detection, but is never imported or called"
      - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java"
        issue: "Missing .setCompletionFeature(new BbjCompletionFeature()) wiring"
    missing:
      - "Import BbjCompletionFeature in BbjLanguageServerFactory"
      - "Call .setCompletionFeature(new BbjCompletionFeature()) in createClientFeatures() method"
      - "Verify LSP4IJ LSPCompletionFeature API exists, or implement alternative wiring"
---

# Phase 10: Bug Fixes & Polish Verification Report

**Phase Goal:** All 7 carried-forward v1.0 issues are resolved, completing the polish pass
**Verified:** 2026-02-02T08:09:50Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pressing Cmd+/ (or Ctrl+/) on selected lines toggles REM comment prefix correctly | ✓ VERIFIED | BbjCommenter returns "REM ", BbjLanguageCodeStyleSettingsProvider sets LINE_COMMENT_AT_FIRST_COLUMN = true, registered in plugin.xml |
| 2 | Bracket matching highlights matching parentheses, square brackets, and curly braces when cursor is adjacent | ✓ VERIFIED | BbjPairedBraceMatcher defines 3 bracket pairs with BbjTokenTypes constants, BbjWordLexer emits bracket-specific tokens, registered in plugin.xml |
| 3 | Cmd+hover no longer shows "LSP Symbol ..." placeholder text (either suppressed or replaced with meaningful content) | ✓ VERIFIED | BbjLanguageServerFactory.setHoverFeature() overrides isSupported() to return false, disabling hover placeholder |
| 4 | Closing the last BBj file does not immediately kill the language server; reopening a BBj file within a few seconds reuses the running server | ✓ VERIFIED | BbjServerService has FileEditorManagerListener tracking BBj files, 30-second grace period with ScheduledExecutorService, cancelGracePeriod() on reopen, BbjStatusBarWidget shows "BBj: Idle" during grace period |
| 5 | Completion popup shows distinct icons for functions, variables, and keywords instead of generic icons | ✗ FAILED | BbjCompletionFeature exists with AllIcons.Nodes mapping and Java-interop detection but is ORPHANED - never imported or called anywhere in codebase |

**Score:** 4/5 truths verified

### Required Artifacts

#### Plan 10-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BbjCommenter.java` | REM line comment prefix for Cmd+/ toggling | ✓ VERIFIED | EXISTS (36 lines), SUBSTANTIVE (returns "REM ", implements Commenter), WIRED (imported by IntelliJ via plugin.xml lang.commenter) |
| `BbjLanguageCodeStyleSettingsProvider.java` | Forces LINE_COMMENT_AT_FIRST_COLUMN = true | ✓ VERIFIED | EXISTS (32 lines), SUBSTANTIVE (sets LINE_COMMENT_AT_FIRST_COLUMN = true), WIRED (registered in plugin.xml langCodeStyleSettingsProvider) |
| `BbjPairedBraceMatcher.java` | Bracket pair definitions for (), [], {} | ✓ VERIFIED | EXISTS (39 lines), SUBSTANTIVE (defines 3 BracePairs with BbjTokenTypes constants), WIRED (registered in plugin.xml lang.braceMatcher) |
| `BbjTokenTypes.java` | Token types for bracket characters (LPAREN, RPAREN, etc.) | ✓ VERIFIED | EXISTS (24 lines), SUBSTANTIVE (6 bracket token types defined), WIRED (referenced by BbjPairedBraceMatcher and BbjWordLexer) |
| `BbjWordLexer.java` | Lexer emitting bracket-specific tokens | ✓ VERIFIED | EXISTS (106 lines), SUBSTANTIVE (switch statement emits BbjTokenTypes.LPAREN/RPAREN/etc.), WIRED (used by BbjParserDefinition registered in plugin.xml) |
| `plugin.xml` | Extension point registrations for braceMatcher and langCodeStyleSettingsProvider | ✓ VERIFIED | EXISTS, SUBSTANTIVE (lines 92-93: langCodeStyleSettingsProvider, lines 96-98: lang.braceMatcher), WIRED (plugin descriptor loaded by IntelliJ) |

#### Plan 10-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `BbjServerService.java` | Grace period lifecycle with 30-second delayed shutdown | ✓ VERIFIED | EXISTS (334+ lines), SUBSTANTIVE (FileEditorManagerListener, GRACE_PERIOD_SECONDS = 30, ScheduledExecutorService, isBbjFile/checkAndStartGracePeriod/startGracePeriod/cancelGracePeriod/isInGracePeriod methods), WIRED (project service registered in plugin.xml, message bus subscription active) |
| `BbjStatusBarWidget.java` | Idle state display during grace period | ✓ VERIFIED | EXISTS (176 lines), SUBSTANTIVE (checks isInGracePeriod() in updateStatus(), displays "BBj: Idle" with STATUS_STARTING icon), WIRED (subscribes to BbjServerStatusListener, registered as statusBarWidgetFactory in plugin.xml) |
| `BbjCompletionFeature.java` | LSPCompletionFeature subclass with platform icon mapping and Java-interop distinction | ⚠️ ORPHANED | EXISTS (106 lines), SUBSTANTIVE (AllIcons.Nodes mapping, isJavaInteropCompletion() heuristic, getIcon() method), NOT WIRED (never imported anywhere, TODO comment line 15 says "Wire into LSP4IJ completion pipeline when LSPCompletionFeature API becomes available") |
| `BbjIcons.java` | Cleaned up icon constants without orphaned completion icons | ✓ VERIFIED | EXISTS (18 lines), SUBSTANTIVE (11 icon constants, NO FUNCTION/VARIABLE/KEYWORD constants), NO orphaned imports |
| `BbjNodeDownloader.java` | ARM64 detection on all platforms | ✓ VERIFIED | EXISTS, SUBSTANTIVE (getArchitecture() checks SystemInfo.isAarch64 first, returns "arm64" for all ARM64 platforms), WIRED (called by downloadNodeAsync) |

**Deleted files verified:**
- `bbj-intellij/src/main/resources/icons/bbj-function.svg` — DELETED ✓
- `bbj-intellij/src/main/resources/icons/bbj-variable.svg` — DELETED ✓
- `bbj-intellij/src/main/resources/icons/bbj-keyword.svg` — DELETED ✓
- `bbj-intellij/META-INF/` directory — DELETED ✓

### Key Link Verification

#### Plan 10-01 Links

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| BbjPairedBraceMatcher | BbjTokenTypes | BracePair references LPAREN/RPAREN token types | ✓ WIRED | BracePair constructors use BbjTokenTypes.LPAREN, BbjTokenTypes.RPAREN, etc. (lines 17-19) |
| BbjWordLexer | BbjTokenTypes | Lexer emits bracket-specific token types | ✓ WIRED | Switch statement lines 84-92 returns BbjTokenTypes.LPAREN/RPAREN/LBRACKET/RBRACKET/LBRACE/RBRACE |
| plugin.xml | BbjPairedBraceMatcher | lang.braceMatcher extension point registration | ✓ WIRED | Line 96-98: lang.braceMatcher language="BBj" implementationClass |
| plugin.xml | BbjLanguageCodeStyleSettingsProvider | langCodeStyleSettingsProvider extension point registration | ✓ WIRED | Line 92-93: langCodeStyleSettingsProvider implementation |

#### Plan 10-02 Links

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| BbjServerService | FileEditorManagerListener | Message bus subscription tracking BBj file open/close | ✓ WIRED | Constructor lines 64-80: subscribes to FILE_EDITOR_MANAGER topic, calls isBbjFile/cancelGracePeriod/checkAndStartGracePeriod |
| BbjServerService | BbjStatusBarWidget | Status broadcast including idle state | ✓ WIRED | Lines 282-286 and 312-316: publishes BbjServerStatusListener.TOPIC to trigger status bar update |
| BbjCompletionFeature | AllIcons.Nodes | Platform icon mapping replacing custom SVG icons | ✓ PARTIAL | BbjCompletionFeature imports AllIcons.Nodes and returns platform icons, BUT entire class is orphaned (not called) |
| BbjLanguageServerFactory | BbjCompletionFeature | setCompletionFeature() wiring in createClientFeatures() | ✗ NOT_WIRED | BbjCompletionFeature is NEVER imported in BbjLanguageServerFactory, no .setCompletionFeature() call exists |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| FIX-01: Comment toggling (Ctrl+/ / Cmd+/) inserts/removes REM prefix | ✓ SATISFIED | None — BbjCommenter + CODE_STYLE settings verified |
| FIX-02: Bracket matching works for parentheses, square brackets, and curly braces | ✓ SATISFIED | None — BbjPairedBraceMatcher + lexer token types verified |
| FIX-03: "LSP Symbol ..." popup text on Cmd+hover is suppressed or shows meaningful content | ✓ SATISFIED | None — LSPHoverFeature.isSupported() = false verified |
| FIX-04: Language server stays alive briefly after last BBj file is closed (grace period) | ✓ SATISFIED | None — 30-second grace period with FileEditorManagerListener verified |
| FIX-05: BbjCompletionFeature custom icons (function, variable, keyword) display in completion popup | ✗ BLOCKED | BbjCompletionFeature is ORPHANED — never wired into LSP4IJ |
| FIX-06: Stale bbj-intellij/META-INF/plugin.xml file removed or consolidated | ✓ SATISFIED | None — bbj-intellij/META-INF/ directory deleted, orphaned SVG files deleted |
| FIX-07: Linux code paths reviewed for correctness (process spawning, path separators, Node.js detection) | ✓ SATISFIED | None — BbjNodeDownloader ARM64 detection fixed, no hardcoded path separators found |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| BbjCompletionFeature.java | 15 | TODO comment: "Wire into LSP4IJ completion pipeline when LSPCompletionFeature API becomes available" | 🛑 Blocker | Entire completion icon feature is non-functional — class exists but never called |
| BbjCompletionFeature.java | entire file | Orphaned utility class — no imports, no usage anywhere in codebase | 🛑 Blocker | Truth #5 (completion icons) is unsatisfied despite artifact existing |

### Human Verification Required

1. **Test Comment Toggling Behavior**
   - **Test:** Open a .bbj file, type code on line 1, press Cmd+/ (macOS) or Ctrl+/ (Windows/Linux)
   - **Expected:** Line becomes `REM code` with REM at column 0 (before any indentation). Press Cmd+/ again and REM is removed. Comment an already-commented line and it becomes `REM REM code`.
   - **Why human:** IntelliJ comment handler behavior can't be verified without running IDE

2. **Test Bracket Matching Highlight**
   - **Test:** Open a .bbj file, type `print("hello")` or `arr[0]` or `{key: val}`, place cursor adjacent to opening bracket
   - **Expected:** Matching closing bracket is highlighted. Use Ctrl+Shift+M to jump between matching brackets.
   - **Why human:** Visual bracket highlighting can't be verified programmatically

3. **Test Hover Placeholder Suppression**
   - **Test:** Open a .bbj file with BBj symbols, Cmd+hover (macOS) or Ctrl+Q (Windows/Linux) over a symbol
   - **Expected:** No "LSP Symbol ..." placeholder text appears. Either no hover, or meaningful hover content from language server.
   - **Why human:** Hover UI behavior can't be verified without running IDE

4. **Test Language Server Grace Period**
   - **Test:** Open a .bbj file (server starts), close the file, wait 5 seconds, reopen a .bbj file
   - **Expected:** Status bar shows "BBj: Idle" after closing file. Reopening file within 30 seconds reuses running server (no restart delay). Waiting 30+ seconds causes server to stop.
   - **Why human:** FileEditorManagerListener runtime behavior and timing can't be verified without running IDE

5. **Test Completion Icon Display (WILL FAIL)**
   - **Test:** Open a .bbj file, trigger completion (Ctrl+Space), observe icons in completion popup
   - **Expected:** Functions, variables, keywords show distinct platform icons (should work per FIX-05)
   - **Actual:** Generic LSP4IJ icons will appear because BbjCompletionFeature is orphaned
   - **Why human:** Completion popup rendering can't be verified programmatically. This test will confirm the gap found in automated verification.

### Gaps Summary

**Critical Gap Found:** Truth #5 (completion icons) is FAILED.

BbjCompletionFeature.java exists with correct implementation:
- Maps CompletionItemKind to AllIcons.Nodes platform icons
- Distinguishes Java-interop completions with detail field heuristic
- Has getIcon() method ready to be called

BUT it is completely orphaned:
- Never imported in any file in the codebase
- Never called by LSP4IJ or any plugin code
- Has TODO comment (line 15) admitting it's not wired: "Wire into LSP4IJ completion pipeline when LSPCompletionFeature API becomes available"

The summary for 10-02 claimed:
> "Completion icon mapping code is correct but not yet wired into LSP4IJ pipeline. Will work once API becomes available or when we upgrade LSP4IJ version."

This is technically accurate BUT misleading. The code is "correct" in isolation, but the truth "Completion popup shows distinct icons" is FALSE because the code is never executed. The artifact exists but provides no functionality.

**What's missing:**
1. Import BbjCompletionFeature in BbjLanguageServerFactory
2. Wire it via .setCompletionFeature(new BbjCompletionFeature()) in createClientFeatures() — OR —
3. Find alternative LSP4IJ API to hook completion icon mapping if setCompletionFeature() doesn't exist
4. If no API exists in current LSP4IJ version, document this as a known limitation and track for future LSP4IJ upgrade

**Root cause:** Plan 10-02 Task 2 discovered during execution that LSPCompletionFeature API doesn't exist in LSP4IJ 0.19.0. The executor correctly added a TODO and kept BbjCompletionFeature as a utility class. However, the artifact was marked DONE and the truth was considered satisfied, when in reality the truth FAILED because the feature is non-functional.

**Impact:** Users will NOT see distinct completion icons. Completion popup will show generic LSP4IJ icons for all symbol types. Java-interop completions will NOT be visually distinguished from BBj completions. FIX-05 requirement is NOT satisfied.

**Severity:** Medium priority. Does not block plugin functionality (completions still work), but polish goal is incomplete. One of 7 v1.0 issues remains unresolved.

---

_Verified: 2026-02-02T08:09:50Z_
_Verifier: Claude (gsd-verifier)_
