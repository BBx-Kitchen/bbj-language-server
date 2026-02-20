---
phase: 04-language-server-integration
plan: 04
subsystem: verification
tags: [human-verification, acceptance-testing, bug-fixes]

# Dependency graph
requires:
  - phase: 04-language-server-integration
    plan: 03
    provides: Complete language server integration with all UI components
provides:
  - Human-verified confirmation that all 10 Phase 4 success criteria pass
  - Bug fixes discovered during verification (document links, initializationOptions, Cmd+hover range, spell checker)
  - Minimal ParserDefinition for correct PSI element boundaries
affects: [phase completion, phase verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LSPClientFeatures.initializeParams() for sending initializationOptions
    - LSPDocumentLinkFeature.isSupported() to disable unwanted LSP features
    - Minimal ParserDefinition with word-level lexer for correct PsiElement boundaries
    - BundledDictionaryProvider for spell checker dictionary integration

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjParserDefinition.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPsiElement.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjFile.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSpellcheckingStrategy.java
    - bbj-intellij/src/main/resources/com/basis/bbj/intellij/bbj.dic
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml

key-decisions:
  - "Document link feature disabled via LSPClientFeatures — Langium advertises it but has no provider"
  - "initializationOptions passed via LSPClientFeatures.initializeParams(), not createSettings()"
  - "Minimal ParserDefinition with word-level lexer fixes Cmd+hover range (whole-file PsiElement problem)"
  - "BundledDictionaryProvider registered directly in plugin.xml (spellchecker is platform core, not separate plugin)"
  - "Parameter hints via Ctrl+P is standard IntelliJ behavior (not auto-triggered like VS Code)"

patterns-established:
  - "LSPClientFeatures is the right place for client-side LSP customization (init options, feature toggles)"
  - "Custom Language + no ParserDefinition = one giant PsiElement (breaks LSP4IJ navigation)"
  - "Dictionary files placed in same package as provider class for classloader resolution"

# Metrics
duration: 45min
completed: 2026-02-01
---

# Phase 04 Plan 04: Human Verification Summary

**Human verification of all 10 Phase 4 success criteria with bug fixes**

## Performance

- **Duration:** ~45 minutes (includes investigation and 4 bug fixes)
- **Completed:** 2026-02-01
- **Bug fixes:** 4 (document links, initializationOptions, Cmd+hover range, spell checker)

## Verification Results

All 10 success criteria **PASS**:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Server starts on BBj file open | PASS |
| 2 | Diagnostics (error underlines) | PASS |
| 3 | Code completion (Ctrl+Space) | PASS |
| 4 | Go-to-definition (Cmd+Click) | PASS |
| 5 | Hover documentation with Javadoc | PASS |
| 6 | Parameter hints (Ctrl+P) | PASS |
| 7 | Settings restart (debounced) | PASS |
| 8 | Clean shutdown (no zombies) | PASS |
| 9 | Tools menu restart action | PASS |
| 10 | Crash notification + recovery | PASS |

## Bug Fixes During Verification

### Fix 1: Document links highlighting entire file (facc604)
- **Symptom:** Ctrl+Click caused entire file to turn blue/underlined
- **Root cause:** LSP4IJ's document link annotator was active without a provider
- **Fix:** Disabled document link feature via `LSPClientFeatures.setDocumentLinkFeature()`

### Fix 2: Missing Javadoc in hover (facc604)
- **Symptom:** Hover showed function signatures but no Javadoc text (VS Code had it)
- **Root cause:** `initializationOptions` (home, classpath) never sent in LSP initialize request — server couldn't find javadoc JSON files
- **Fix:** Override `LSPClientFeatures.initializeParams()` to set home and classpath

### Fix 3: Cmd+hover underlines entire file (8487d2a)
- **Symptom:** Holding Cmd and hovering over a variable underlined the entire file
- **Root cause:** No ParserDefinition → single PsiElement for entire file → `findElementAt()` returns whole-file range
- **Fix:** Created minimal `BbjParserDefinition` with `BbjWordLexer` that tokenizes into WORD/SYMBOL/WHITESPACE

### Fix 4: Spell checker flags BBj keywords (4832fe8)
- **Symptom:** IntelliJ spell checker flagged `classend`, `methodend`, etc. as typos
- **Root cause:** `com.intellij.spellchecker` is platform core, not a separate plugin — optional dependency silently failed
- **Fix:** Registered `BundledDictionaryProvider` directly in main plugin.xml with bbj.dic dictionary

## Deviations from Plan

Plan was a pure verification checkpoint. Four bugs were discovered and fixed during testing — all committed before final approval.

## Issues Encountered

- LSP4IJ's `LSPDocumentLinkAnnotator` does NOT check `isSupported()` before annotating — required feature-level disable
- `createSettings()` (workspace/didChangeConfiguration) is NOT the same as `initializationOptions` — different LSP lifecycle points
- LSP4IJ's `SimpleLanguageUtils` hardcodes PlainTextLanguage and TextMateLanguage — custom Language classes take PSI-based code path

## Notes for Future

- "LSP Symbol ..." popup text on Cmd+hover could be polished (cosmetic)
- ParserDefinition could be enriched later (from Langium grammar) for deeper IDE integration
- Parameter hints auto-trigger on `(` is VS Code behavior; IntelliJ uses Ctrl+P (standard)

---
*Phase: 04-language-server-integration*
*Completed: 2026-02-01*
