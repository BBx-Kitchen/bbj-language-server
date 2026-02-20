---
phase: 57-bug-fixes
plan: "02"
subsystem: parser/lexer/validation
tags: [bug-fix, lexer, parser, validator, regression-tests]
dependency_graph:
  requires: []
  provides: [correct-release-token-lexing, declare-class-body-recovery]
  affects: [bbj-token-builder, bbj-langium-grammar, bbj-validator, bbj-linker]
tech_stack:
  added: []
  patterns: [chevrotain-longer-alt, langium-grammar-recovery, langium-validation-checks]
key_files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-validator.ts
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/test/parser.test.ts
decisions:
  - "Guard checkDeclareNotInClassBody on node.$type === 'VariableDecl' to prevent FieldDecl subtypes from being flagged"
  - "Cast BBjClassMember to { visibility?: string } instead of FieldDecl | MethodDecl in linker and validator — minimal, type-safe, avoids extra imports"
metrics:
  duration: "~10 minutes"
  completed: 2026-02-20
  tasks_completed: 2
  files_modified: 5
---

# Phase 57 Plan 02: Fix RELEASE Token Lexing and DECLARE Class Body Recovery Summary

Fixed two parser-level bugs: RELEASE-prefixed suffixed identifiers now lex correctly as single tokens (not keyword + orphan), and DECLARE at class member level produces a recoverable validation error instead of crashing the parser.

## Tasks Completed

### Task 1: Fix RELEASE token LONGER_ALT and add DECLARE recovery in grammar

**Commits:** 89707f4

**BUG-03 — RELEASE LONGER_ALT fix:**

In `bbj-token-builder.ts`, `RELEASE_NL` and `RELEASE_NO_NL` had `LONGER_ALT = id` (only ID, not ID_WITH_SUFFIX). This caused `releaseVersion!` to lex as RELEASE token + `Version!` orphan. Fixed by setting:

```typescript
releaseNl.LONGER_ALT = [idWithSuffix, id];
releaseNoNl.LONGER_ALT = [idWithSuffix, id];
```

Now matches the same pattern as all standard keywords (set in the general loop at lines 39-49).

**BUG-04 — DECLARE recovery in class body:**

Extended `ClassMember` grammar rule in `bbj.langium`:

```
ClassMember returns ClassMember:
    FieldDecl | MethodDecl | VariableDecl
;
```

Also updated `type BBjClassMember = FieldDecl | MethodDecl | VariableDecl` and ran `npm run langium:generate`.

Added `checkDeclareNotInClassBody` validation in `bbj-validator.ts`:
- Registered as `VariableDecl: validator.checkDeclareNotInClassBody`
- Checks `node.$type === 'VariableDecl'` guard (prevents firing for FieldDecl/ParameterDecl subtypes)
- Checks `isBbjClass(node.$container) && node.$containerProperty === 'members'`
- Emits: "DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body."

**Auto-fixed TypeScript errors (Rule 1):** Adding `VariableDecl` to `BBjClassMember` union broke two `visibility` accesses (since `VariableDecl` has no `visibility`). Fixed with type casts to `{ visibility?: string }` in `bbj-linker.ts` and `bbj-validator.ts`.

### Task 2: Add regression tests for BUG-03 and BUG-04

**Commits:** f065bd2

Added four tests to `parser.test.ts`:

1. **Keyword-prefixed suffixed identifiers parse without error** — `releaseVersion!`, `stepMode!`, `release!`, `releaseDate` all parse cleanly
2. **Bare RELEASE keyword still works as statement** — non-regression test
3. **DECLARE in class body produces validation error, not parser crash** — verifies parser does NOT crash, and diagnostics include a DECLARE-related error
4. **DECLARE inside method body is valid** — non-regression for the valid case

All 4 new tests pass. Full test suite: **505 tests pass, 4 skipped, 0 failures**.

## Verification Results

1. `releaseVersion!`, `release!`, `releaseDate`, `stepMode!` — parse without lexer/parser errors: PASS
2. Bare `RELEASE` statement — still works as keyword: PASS
3. DECLARE in class body at member level — validation diagnostic error, no parser crash: PASS
4. DECLARE inside method body — valid, no error: PASS
5. Parser recovers after misplaced DECLARE, continues parsing MethodDecl after it: PASS
6. `npm run langium:generate` — succeeds: PASS
7. `npm run build` — succeeds: PASS
8. Full test suite — all 505 tests pass, no regressions: PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors from expanded BBjClassMember union**
- **Found during:** Task 1 (build step)
- **Issue:** Adding `VariableDecl` to `BBjClassMember = FieldDecl | MethodDecl | VariableDecl` made `.visibility` access a TypeScript error in `bbj-linker.ts:51` and `bbj-validator.ts:167`, since `VariableDecl` lacks `visibility`
- **Fix:** Cast to `{ visibility?: string }` at each access site — minimal and correct since `VariableDecl` at class body level has undefined visibility (treated as PUBLIC, which is the safe default)
- **Files modified:** `bbj-vscode/src/language/bbj-linker.ts`, `bbj-vscode/src/language/bbj-validator.ts`
- **Commit:** 89707f4

**2. [Rule 1 - Bug] Added $type guard to checkDeclareNotInClassBody**
- **Found during:** Task 2 (test run)
- **Issue:** Registering `VariableDecl` check caused `FieldDecl` subtypes (which extend `VariableDecl`) to also be validated, incorrectly flagging valid FIELD declarations in class bodies
- **Fix:** Added `if (node.$type !== 'VariableDecl') return;` guard so only base DECLARE statements trigger the error
- **Files modified:** `bbj-vscode/src/language/bbj-validator.ts`
- **Commit:** f065bd2

## Self-Check

### Files exist
- [x] `bbj-vscode/src/language/bbj-token-builder.ts` — LONGER_ALT fixed
- [x] `bbj-vscode/src/language/bbj.langium` — ClassMember includes VariableDecl
- [x] `bbj-vscode/src/language/bbj-validator.ts` — checkDeclareNotInClassBody implemented and registered
- [x] `bbj-vscode/test/parser.test.ts` — 4 new tests added

### Commits exist
- [x] 89707f4 — fix(57-02): fix RELEASE LONGER_ALT and add DECLARE recovery in class body
- [x] f065bd2 — test(57-02): add regression tests for BUG-03 and BUG-04

## Self-Check: PASSED
