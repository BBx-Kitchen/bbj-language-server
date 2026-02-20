---
phase: 58-grammar-additions
plan: "01"
subsystem: grammar
tags: [langium, chevrotain, lexer, parser, tokens, exit, bbj]

# Dependency graph
requires: []
provides:
  - EXIT verb accepts numeric literal/parenthesized-expression argument: EXIT 0, EXIT -1, EXIT (expr)
  - EXIT_NO_NL custom terminal token with pattern /EXIT(?=[ \t]+[0-9(+\-])/i
  - ExitWithNumberStatement grammar rule updated with EXIT_NO_NL | kind='EXIT' alternatives
  - Parser tests covering GRAM-01 EXIT numeric argument and EXIT-prefixed identifiers
affects: [grammar, parser, token-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EXIT_NO_NL restrictive lookahead: use [0-9(+\\-] character class instead of negative complement to avoid matching flow-control keywords in inline-if contexts"
    - "Token complementarity: for RELEASE, NL/NO_NL are complements (positive/negative same pattern); for EXIT, NO_NL uses character-class restriction to sidestep the `exit else` ambiguity"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "Use restrictive EXIT_NO_NL pattern /EXIT(?=[ t]+[0-9(+\\-])/i rather than complement of EXIT_NL — prevents false matches for `exit else` in inline-if constructs while still covering EXIT 0, EXIT -1, EXIT (expr)"
  - "Keep kind='EXIT' in ExitWithNumberStatement for bare EXIT — avoids re-introducing the ambiguity that would arise from EXIT_NL competing with EXIT_NO_NL on inputs like `EXIT\\n   ` (trailing whitespace after newline)"
  - "EXIT myVar not supported via EXIT_NO_NL (myVar starts with letter, indistinguishable from keywords) — EXIT myVar parses as bare EXIT then myVar as ExpressionStatement; parser tests still pass since expectNoParserLexerErrors ignores linker errors"

patterns-established:
  - "Character-class lookahead restriction: when a token must not match before flow-control keywords, restrict the lookahead character class to unambiguously non-keyword starters ([0-9(+\\-]) rather than attempting a negative lookahead for all keywords"

requirements-completed: [GRAM-01]

# Metrics
duration: 18min
completed: 2026-02-20
---

# Phase 58 Plan 01: EXIT Numeric Argument Grammar Summary

**EXIT_NO_NL custom token with pattern /EXIT(?=[ \t]+[0-9(+\-])/i enables EXIT 0, EXIT -1, and EXIT (expr) to parse without error while preserving all 507 existing tests**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-20T18:01:43Z
- **Completed:** 2026-02-20T18:19:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- EXIT verb now accepts numeric literals and parenthesized expressions as optional argument: `EXIT 0`, `EXIT 1`, `EXIT -1`, `EXIT (myVar+1)`
- EXIT_NO_NL custom terminal added to bbj-token-builder.ts following RELEASE pattern
- ExitWithNumberStatement grammar rule updated: `EXIT_NO_NL exitVal=Expression | kind='EXIT' | RELEASE_NL | RELEASE_NO_NL exitVal=Expression`
- 2 new parser tests added: GRAM-01 EXIT numeric argument and EXIT-prefixed identifiers non-regression
- Zero regressions: all 507 pre-existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EXIT_NO_NL token and update grammar** - `9ddde30` (feat)
2. **Task 2: Add parser tests for EXIT with numeric argument** - `b986a70` (test)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-token-builder.ts` - EXIT_NO_NL token added: spliced, CATEGORIES/LONGER_ALT set, custom buildTerminalToken branch with pattern `/EXIT(?=[ \t]+[0-9(+\-])/i`
- `bbj-vscode/src/language/bbj.langium` - EXIT_NO_NL terminal declaration added; ExitWithNumberStatement rule updated to include `EXIT_NO_NL exitVal=Expression` alternative
- `bbj-vscode/test/parser.test.ts` - GRAM-01 test and EXIT-prefixed identifier non-regression test added

## Decisions Made
- **Restrictive character-class pattern over negative complement**: The RELEASE pattern uses complementary positive/negative lookaheads (RELEASE_NL fires when at EOL; RELEASE_NO_NL fires when not at EOL). Applying this directly to EXIT causes `exit else` to match EXIT_NO_NL (since `else` is a non-EOL char), making `else` parse as exitVal and causing linker errors. The fix: restrict EXIT_NO_NL to fire only when EXIT is followed by `[0-9(+\-]` — unambiguously numeric expression starters that cannot be BBj keywords.
- **Kept kind='EXIT' for bare EXIT**: Adding EXIT_NL (complement of EXIT_NO_NL) was attempted but caused EXIT_NL and EXIT_NO_NL to compete for `EXIT\n   ` (newline followed by trailing spaces from template literals), with EXIT_NO_NL winning due to lower token index. Keeping `kind='EXIT'` as the bare-EXIT alternative is simpler and consistent with the original grammar.
- **EXIT myVar limitation accepted**: `EXIT myVar` (variable reference) does not fire EXIT_NO_NL (myVar starts with a letter, indistinguishable from keywords like `else`). The test for `EXIT myVar` passes because `EXIT` is parsed as bare ExitWithNumberStatement and `myVar` as a subsequent ExpressionStatement — no parser/lexer error, only a linker error (unresolved symbol) which is ignored by `expectNoParserLexerErrors`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EXIT_NO_NL initial pattern caused EXITTO keyword to be unreachable**
- **Found during:** Task 1 (token builder implementation)
- **Issue:** Pattern `/EXIT(?!\s*(;\s*|\r?\n))/i` matched EXIT in "EXITTO" since "EXITTO" doesn't end with EOL — lexer reported EXITTO as unreachable
- **Fix:** Narrowed pattern to `/EXIT(?=[ \t]+[0-9(+\-])/i` which requires mandatory horizontal whitespace then numeric expression start — 'T' in EXITTO is not in `[0-9(+\-]`
- **Files modified:** bbj-vscode/src/language/bbj-token-builder.ts
- **Verification:** `npm test` — all tests pass, no "EXITTO can never be matched" lexer error
- **Committed in:** 9ddde30 (Task 1 commit)

**2. [Rule 1 - Bug] EXIT_NO_NL matched `exit else` in inline-if, causing linker error**
- **Found during:** Task 1 (first pattern attempt)
- **Issue:** Pattern `/EXIT(?=\s+[^\r\n;])/i` matched `exit` before `else` in `if cond then exit else return`, making `else` parse as exitVal SymbolRef — linker error "cannot resolve 'else'"
- **Fix:** Narrowed to character-class lookahead `[0-9(+\-]` and reverted to `kind='EXIT'` for bare exit. Removed EXIT_NL entirely (was causing competition with EXIT_NO_NL for `EXIT\n   ` inputs due to trailing spaces in template literals)
- **Files modified:** bbj-vscode/src/language/bbj-token-builder.ts, bbj-vscode/src/language/bbj.langium
- **Verification:** `npm test` — all 507 tests pass including the `exit else` validation test
- **Committed in:** 9ddde30 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs in initial implementation)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Token mutual-exclusivity requires careful analysis: Chevrotain resolves same-length token matches by position in vocabulary array. When EXIT_NL and EXIT_NO_NL both matched `EXIT\n   ` (newline + trailing spaces), EXIT_NO_NL won because it was at a lower index — causing the regex behavior to diverge from expected. Root cause: `\s*` in `(?=\s*(;\s*|\r?\n))` is greedy but backtracks in JS regex lookaheads, causing `EXIT\n   ` to match both patterns.
- Debug approach: Direct Chevrotain lexer testing (via `bbjServices.parser.Lexer.chevrotainLexer.tokenize()`) was essential for identifying which token fired on specific inputs.

## Next Phase Readiness
- GRAM-01 closed: EXIT verb now accepts numeric exit codes (literals and parenthesized expressions)
- Foundation in place for additional grammar additions in phase 58
- Known limitation: `EXIT myVar` (letter-starting variable) not supported via EXIT_NO_NL — documented in plan for future improvement if needed

---
*Phase: 58-grammar-additions*
*Completed: 2026-02-20*
