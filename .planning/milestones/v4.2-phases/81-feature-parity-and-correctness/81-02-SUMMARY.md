---
phase: 81-feature-parity-and-correctness
plan: 02
subsystem: intellij-lexer
tags: [intellij, lexer, psi, brace-matching, bbj-grammar, junit5]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness
    provides: plain-Java seam + source-guard test convention (C-01), no new test framework
  - phase: 80-em-token-security
    provides: red-then-green execution convention for tdd="true" tasks
provides:
  - "BbjStringCommentScanner: a plain-Java scanning seam (scanString/scanComment/isCommentStart) mirroring the grammar's STRING_LITERAL and COMMENT terminals"
  - "BbjTokenTypes.STRING (BBJ_STRING) and BbjTokenTypes.COMMENT (BBJ_COMMENT) element types"
  - "BbjWordLexer.advance() dispatching to the scanner ahead of the word branch, so bracket characters inside a string or rem comment are never emitted as bracket tokens"
  - "BbjParserDefinition.getStringLiteralElements()/getCommentTokens() reporting the new token sets instead of TokenSet.EMPTY"
  - "BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType refusing pairing inside a string or comment context"
affects: [83-regression-test-hardening]

# Actuals (#2632)
actuals:
  tokens: 5921
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java scanning seam (no IntelliJ imports) wrapped by the platform lexer, tested with plain JUnit 5 (C-01 convention, extended from Phase 79/80 into a new lexer/ package)"
    - "Source-guard test asserting production wiring sites by counting literal occurrences in source text, with comment/javadoc lines stripped before counting"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lexer/BbjStringCommentScanner.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjLexerStringCommentSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjParserDefinition.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java

key-decisions:
  - "Scanner methods take (CharSequence, int start, int end) and return an exclusive end offset or boolean, so BbjWordLexer can call them with zero allocation, matching the existing lexer's own style."
  - "isCommentStart compares each of the three rem letters against its explicit upper/lower ASCII form rather than lower-casing a substring, so recognition is provably unaffected by the JVM default locale (pinned by a Turkish-locale test)."
  - "Task 2's extended 10-case test table passed against the Task 1 scanner unchanged -- no production defect was found, so it landed as a single test-only commit rather than a red-then-green pair."

requirements-completed: [PARITY-02]

coverage:
  - id: D1
    description: "Bracket characters inside a BBj string literal (including doubled-quote escapes) are never emitted as bracket tokens"
    requirement: "PARITY-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java#printValueNotABracketIsOneStringTokenAndTheParenthesisIsInsideIt"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java#aDoubledQuoteInsideAStringDoesNotEndTheLiteral"
        status: pass
    human_judgment: false
  - id: D2
    description: "An unterminated quote runs to the end of its line only, never disabling bracket matching for the rest of the file"
    requirement: "PARITY-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java#anUnterminatedQuoteRunsToTheEndOfItsLineOnly"
        status: pass
    human_judgment: false
  - id: D3
    description: "Word-bounded rem/Rem/REM opens a comment running to end of line; remark, rem15 and rem$ stay ordinary words, unaffected by default locale"
    requirement: "PARITY-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java#remFollowedByATabOrByEndOfLineIsACommentStart"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java#remRecognitionIsUnaffectedByTheDefaultLocale"
        status: pass
    human_judgment: false
  - id: D4
    description: "BbjParserDefinition and BbjPairedBraceMatcher are wired to the new token types, and the wiring is pinned by a source guard"
    requirement: "PARITY-02"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjLexerStringCommentSourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live-editor confirmation: a bracket inside a string or rem comment does not highlight, navigate, or auto-close in a real IDE session"
    verification: []
    human_judgment: true
    rationale: "The plugin's editor behaviour cannot be exercised without the IntelliJ platform, which C-01 keeps out of this test module. Deferred to /gsd-verify-work UAT in a live IDE, per Phase 79/80 practice."

duration: 15min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 02: IntelliJ lexer learns BBj strings and rem comments Summary

**`BbjStringCommentScanner` mirrors the Langium grammar's `STRING_LITERAL`/`COMMENT` terminals as a plain-Java seam, so a bracket inside `PRINT "value (not a bracket)"` or a `rem (x` comment is never classified as a bracket token in IntelliJ.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05T10:30:18Z (following 81-01 close-out)
- **Completed:** 2026-09-05T10:38:36Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- New `BbjStringCommentScanner` (no IntelliJ imports, no fields) implements `scanString`, `scanComment` and `isCommentStart`, covering the full #568 case table: doubled-quote escapes, unterminated quotes stopping at the line terminator, `rem`/`Rem`/`REM` word-boundary recognition (`remark`/`rem15`/`rem$` excluded), locale-independence, and UTF-16 surrogate-pair offset correctness.
- `BbjWordLexer` gains two new dispatch branches (comment, then string) ahead of the word branch, emitting `BbjTokenTypes.STRING`/`COMMENT`; all six bracket cases and the word/symbol branches are untouched.
- `BbjParserDefinition.getStringLiteralElements()`/`getCommentTokens()` now report the new token sets instead of `TokenSet.EMPTY`, and `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` refuses pairing inside either context.
- A source guard (`BbjLexerStringCommentSourceGuardTest`) pins all three D-13 wiring sites and the comment-before-word dispatch order, so a future refactor cannot silently disconnect the seam.
- 23 new tests (13 scanner behaviour + 10 source guard); whole IntelliJ module green at 259 tests, 0 failures.

## Task Commits

Each task was committed atomically, following the RED/GREEN TDD cycle:

1. **Task 1: End-to-end inert bracket** — RED `dbd9156` (test), GREEN `8ff7c28` (feat)
2. **Task 2: Full #568 case table** — `a78d739` (test) — all 13 tests passed against the Task 1 scanner unchanged, so no separate GREEN commit was needed
3. **Task 3: Wire token sets and brace matcher** — RED `6d41d37` (test), GREEN `9900cbf` (feat)

_TDD tasks produced RED-then-GREEN commit pairs where a production change was required (Tasks 1 and 3); Task 2 added test coverage that passed immediately against existing code._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lexer/BbjStringCommentScanner.java` — the plain-Java scanning seam
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTokenTypes.java` — added `STRING`/`COMMENT` element types
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java` — dispatches to the scanner ahead of the word branch
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjParserDefinition.java` — returns the new token sets instead of `TokenSet.EMPTY`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjPairedBraceMatcher.java` — refuses pairing inside string/comment context
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjStringCommentScannerTest.java` — 13 behavioural tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lexer/BbjLexerStringCommentSourceGuardTest.java` — 10 source-guard assertions

## Decisions Made
- Scanner API shape `(CharSequence, int start, int end) -> int | boolean` avoids allocation and matches `BbjWordLexer`'s existing style.
- `isCommentStart` compares explicit upper/lower ASCII characters rather than folding case, proven locale-independent by a Turkish-locale test (`remRecognitionIsUnaffectedByTheDefaultLocale`).
- Task 2's case-table tests passed against the Task 1 implementation without any fix — the scanner's design already satisfied every #568 acceptance case and both grammar boundaries on first pass.

## Deviations from Plan

None - plan executed exactly as written. `plugin.xml` required no change (verified via `git diff --stat`), matching the plan's own acceptance criterion.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PARITY-02 (#568) is closed: bracket matching, Ctrl+Shift+M navigation and auto-close are now inert inside BBj string literals and `rem` comments in the IntelliJ plugin.
- Live-editor UAT (bracket inside a string/comment does not highlight/navigate/auto-close; real code brackets on the same line still work) is deferred to `/gsd-verify-work`, per Phase 79/80 practice — this is the sole human-judgment item (D5).
- 81-03 (REM toggle mechanics, #540) is independent of this plan's `BbjWordLexer` changes and does not depend on the new `COMMENT` token (D-15); it can proceed without waiting on this plan.
- Phase 83 (BUILD-05 regression hardening) can add LSP4IJ canary coverage on this lexer surface if desired; no gap was left open by this plan.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*

## Self-Check: PASSED

All key files confirmed present on disk (`BbjStringCommentScanner.java`, `BbjStringCommentScannerTest.java`,
`BbjLexerStringCommentSourceGuardTest.java`, this SUMMARY). All 5 task commits (`dbd9156`, `8ff7c28`,
`a78d739`, `6d41d37`, `9900cbf`) confirmed present in `git log`. Plan-level verification re-run clean:
`BbjStringCommentScannerTest` 13/13, `BbjLexerStringCommentSourceGuardTest` 10/10, whole module 259/259.
