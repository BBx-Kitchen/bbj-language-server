---
phase: 33-parser-and-lexer-fixes
plan: 01
subsystem: language-server
tags: [langium, grammar, parser, bbj, method-signatures]

# Dependency graph
requires:
  - phase: 32-regression-fixes
    provides: BBj language server with working class resolution and definition navigation
provides:
  - void return type support in method signatures (case-insensitive)
  - Grammar infrastructure for array type notation (validator prepared for future work)
  - Test coverage for void return types
affects: [34-completion-fixes, future-type-system-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [case-insensitive-keyword-handling, optional-grammar-alternatives]

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "Use voidReturn boolean property instead of treating void as a class reference"
  - "Defer PARSE-04 (cast array notation) due to Langium parser ambiguity challenges"

patterns-established:
  - "Optional alternatives in grammar using (A | B)? pattern for method return types"

# Metrics
duration: 70min
completed: 2026-02-07
---

# Phase 33 Plan 01: Parser and Lexer Fixes Summary

**Void return type support for BBj method signatures, eliminating false "unresolvable class" errors**

## Performance

- **Duration:** 70 min
- **Started:** 2026-02-07T19:38:38Z
- **Completed:** 2026-02-07T20:48:51Z
- **Tasks:** 1 (partial completion)
- **Files modified:** 3

## Accomplishments

- Method signatures with `void` return type now parse without errors
- Case-insensitive void keyword support (VOID, Void, void all work)
- Test coverage added for void return type scenarios
- Grammar foundation laid for future array type notation work

## Task Commits

1. **Task 1: Fix void return type and cast array notation in grammar** - `aeeb7d2` (feat)
   - PARSE-01 complete: void return type fully implemented
   - PARSE-04 deferred: cast array notation requires deeper investigation

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` - Added voidReturn property to MethodDeclStart fragment and MethodDecl interface
- `bbj-vscode/src/language/bbj-validator.ts` - Added infrastructure for cast array type validation (prepared for future work)
- `bbj-vscode/test/parser.test.ts` - Added test coverage for void return types and placeholder tests for cast array notation

## Decisions Made

**Use voidReturn boolean instead of class reference:**
- Decided to add `voidReturn?='void'` as an alternative to `returnType=QualifiedClass` in the grammar
- This approach cleanly separates void (no return value) from class-typed returns
- Langium's case-insensitive keyword matching handles VOID/Void/void automatically

**Defer PARSE-04 (cast array notation):**
- Attempted multiple grammar approaches for allowing `Type[]` in cast expressions
- Encountered Langium parser generator ambiguities with empty bracket notation
- Making `indices` optional in ArrayElement breaks other array access patterns
- Requires deeper understanding of Langium's parser generator and lookahead behavior
- Test cases added but skipped pending resolution

## Deviations from Plan

### Incomplete Work

**1. [Rule 4 - Architectural] PARSE-04 cast array notation deferred**
- **Planned:** Make `cast(BBjString[], x!)` parse without errors
- **Issue:** ArrayElement grammar rule `"[" (all?="ALL" | indices+=Expression (',' indices+=Expression)*) "]"` requires at least one index or ALL keyword
- **Attempted fixes:**
  1. Made indices optional: `(indices+=Expression (...)*)?` - broke 6 existing array tests
  2. Added empty alternative with `{infer ArrayElement}` - caused lexer errors
  3. Explored ParameterCall with arrayDims - didn't address root parsing issue
- **Root cause:** After parsing `Type[]`, parser continues MemberCall loop and misinterprets `,` token context
- **Decision:** Defer to future investigation - requires Langium parser generator expertise
- **Tests:** Added but marked with `test.skip()` to prevent false failures
- **Validator:** Prepared with ArrayElement empty-indices check for when grammar is fixed

---

**Total deviations:** 1 incomplete (cast array notation)
**Impact on plan:** PARSE-01 (void) complete and working. PARSE-04 (cast arrays) requires architectural investigation beyond current Langium knowledge. No regressions introduced - all 177 previously passing tests still pass.

## Issues Encountered

**Langium ArrayElement grammar ambiguity:**
- Problem: Empty brackets `[]` after a type reference in `cast(Type[], expr)` don't parse
- Root cause: ArrayElement expects `ALL` or at least one Expression index
- Making indices truly optional breaks existing array access tests (creates parser ambiguities)
- Attempted 3 different grammar patterns, all failed with either parse errors or test regressions
- Resolution: Deferred pending deeper Langium parser generator investigation

**Test baseline tracking:**
- Discovered during debugging that baseline has 6 failing tests (pre-existing, unrelated to this work)
- Verified via git stash that these failures existed before changes
- Final state: 179 passing, 6 failing (unchanged from baseline), 3 skipped (2 PARSE-04 + 1 pre-existing)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- Void return type support complete and tested
- Grammar generation and build processes working
- No regressions in existing functionality

**Blockers/Concerns:**
- PARSE-04 (cast array notation) remains unresolved
- Requires either:
  1. Langium grammar expert consultation
  2. Alternative approach (e.g., relaxing validator instead of fixing parser)
  3. Confirmation that `cast(Type[], expr)` syntax is actually invalid BBj
- Recommend verifying with real BBj code or documentation whether this cast syntax is truly supported

**Recommendation:**
Consider moving PARSE-04 to a separate investigation task. The void return type fix (PARSE-01) delivers immediate value by eliminating a common false error. The cast array notation issue may require input from BBj language experts to confirm if the syntax is even valid in real BBj code.

---
*Phase: 33-parser-and-lexer-fixes*
*Completed: 2026-02-07*
