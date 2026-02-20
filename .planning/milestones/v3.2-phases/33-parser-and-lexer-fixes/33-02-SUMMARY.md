---
phase: 33-parser-and-lexer-fixes
plan: 02
subsystem: language-server
tags: [langium, grammar, parser, lexer, bbj, keywords, type-suffixes, select-verb]

# Dependency graph
requires:
  - phase: 33-parser-and-lexer-fixes (plan 01)
    provides: Void return type support and test baseline
provides:
  - DEF FN with suffixed variables ($, %, !) in class methods
  - SELECT verb grammar with full clause support (MODE, ERR, WHERE, SORTBY, LIMIT, field lists)
  - Keyword token builder configured to prevent suffix character conflicts
affects: [34-completion-fixes, future-diagnostics-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [keyword-longer-alt-arrays, binary-expression-for-grammar-disambiguation]

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "Set keyword LONGER_ALT to array [id, idWithSuffix] to prevent keyword matching when identifier has suffix"
  - "Use BinaryExpression instead of Expression for SELECT template to avoid StringMask operator ambiguity"

patterns-established:
  - "TokenBuilder LONGER_ALT arrays allow keywords to defer to multiple terminal types"
  - "Use BinaryExpression when grammar context requires stricter parsing than full Expression"

# Metrics
duration: 12min
completed: 2026-02-07
---

# Phase 33 Plan 02: Parser and Lexer Fixes Summary

**DEF FN with type-suffixed variables in class methods and SELECT verb grammar with full clause support**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-07T20:52:30Z
- **Completed:** 2026-02-07T21:05:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- DEF FN with $, %, and ! type suffixes now works correctly inside class method bodies
- SELECT verb grammar supports all documented clauses: MODE, ERR, field lists, WHERE, SORTBY, LIMIT
- Multi-line SELECT statements with colon continuation parse correctly
- Keyword tokenization fixed to prevent conflicts with suffixed identifiers (mode$ vs MODE keyword)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix DEF FN with suffixed variables inside class methods** - `6c4ab20` (fix)
2. **Task 2: Add SELECT verb grammar rule** - `06ad6af` (feat)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-token-builder.ts` - Modified keyword LONGER_ALT to include both ID and ID_WITH_SUFFIX terminals
- `bbj-vscode/src/language/bbj.langium` - Added SelectStatement rule with full syntax support, added to SingleStatement alternatives
- `bbj-vscode/test/parser.test.ts` - Added 15 new tests (8 for PARSE-02, 7 for PARSE-03)

## Decisions Made

**Use LONGER_ALT array for keyword tokens:**
- Keywords like MODE were matching before suffixed identifiers (mode$)
- Set `keywordToken.LONGER_ALT = [id, idWithSuffix]` to allow both terminal types to take priority
- This ensures `mode$` is tokenized as ID_WITH_SUFFIX, not MODE keyword + unexpected $

**Use BinaryExpression for SELECT template:**
- Initially used Expression for template, but `:` is the StringMask operator in BBj
- Expression allows StringMask, which caused `rec$:field1,field2` to be parsed as a single expression
- Changed to BinaryExpression (which excludes StringMask) so `:` starts the field list instead
- This disambiguates SELECT-specific field list syntax from general expression syntax

## Deviations from Plan

None - plan executed exactly as written. Both PARSE-02 and PARSE-03 requirements satisfied.

## Issues Encountered

**Keyword vs suffixed identifier tokenization:**
- Problem: Keywords like MODE were matching `mode$` as MODE + unexpected character $
- Root cause: Langium keyword tokens had LONGER_ALT=id, but not ID_WITH_SUFFIX
- Resolution: Modified BBjTokenBuilder to set LONGER_ALT to array containing both terminals
- Impact: Simple one-line change, no grammar refactoring needed

**SELECT field list ambiguity with StringMask operator:**
- Problem: `:` is the StringMask operator in BBj expressions
- Field list `rec$:field1,field2` was parsed as StringMask expression, not template + field list
- Resolution: Used BinaryExpression instead of Expression for template to exclude StringMask
- Impact: Clean grammar fix, all SELECT tests pass without breaking other functionality

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- All PARSE requirements (01, 02, 03) complete except deferred PARSE-04
- Grammar generation and build processes working
- Test coverage comprehensive: 195 passing, 5 failing (pre-existing), 3 skipped
- No regressions introduced

**Blockers/Concerns:**
- PARSE-04 (cast array notation) remains deferred from Plan 01 - requires architectural investigation
- 5 pre-existing test failures documented but unchanged: hex string parsing, array tests, REDIM, RELEASE, FILE/XFILE
- These failures existed before Phase 33 and are not blocking current functionality

---
*Phase: 33-parser-and-lexer-fixes*
*Completed: 2026-02-07*
