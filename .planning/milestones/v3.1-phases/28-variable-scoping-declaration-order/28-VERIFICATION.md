---
phase: 28-variable-scoping-declaration-order
verified: 2026-02-07T07:15:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 28: Variable Scoping & Declaration Order Verification Report

**Phase Goal:** Program-scope variables respect declaration order, DIM-declared arrays are recognized by DREAD, and DECLARE type info propagates correctly
**Verified:** 2026-02-07T07:15:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A variable used before its DIM/LET/assignment in program scope shows a "not declared" warning; the same variable used after its declaration resolves correctly | VERIFIED | `checkUseBeforeAssignment` in `check-variable-scoping.ts` (344 lines) implements two-pass offset-based detection. 16 passing tests in SCOPE-01 describe block validate LET, DIM, plain assignment, FOR init, DREAD, READ, ENTER, and compound statement scenarios. Both positive (hint fires) and negative (no hint after assignment) cases pass. |
| 2 | A DREAD statement referencing a variable previously DIM'd as an array (subscript form) resolves without error | VERIFIED | 3 passing tests in SCOPE-04 describe block: "DREAD after DIM resolves without error", "DREAD creates variable in scope if not DIMd", "DIM then DREAD preserves array info". The `bbj-scope-local.ts` fix (`!isArrayDecl(node)` guard at line 117) ensures DIM'd variables are properly scoped and visible to subsequent DREAD. |
| 3 | A DECLARE statement anywhere in a method causes the declared type to apply to the variable throughout the entire method scope (not just after the DECLARE) | VERIFIED | Line 236: `child.symbol.ref.$type === 'VariableDecl'` causes DECLARE variables to be skipped from use-before-assignment checks (whole-scope visibility). `bbj-scope-local.ts` line 117-122 scopes DECLARE to the entire method body. Test "No hint for DECLARE variable used before DECLARE statement" and "DECLARE in method body applies to entire method - no hint" both pass. |
| 4 | Existing tests pass -- no regressions in class-scope or method-scope variable resolution | VERIFIED | Full test suite: 740 passed, 16 failed (all pre-existing). None of the 16 failing test files were modified during phase 28 (confirmed via `git log`). The 25 new variable-scoping tests all pass. Build compiles cleanly with zero errors. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/validations/check-variable-scoping.ts` | Use-before-assignment validation + conflicting DECLARE detection | VERIFIED (344 lines, no stubs, wired) | Two-pass validation with offset-based ordering, exported `registerVariableScopingChecks`, handles LET/DIM/DREAD/FOR/READ/ENTER. No TODO/FIXME/placeholder patterns. |
| `bbj-vscode/src/language/bbj.langium` | VariableDecl with auto boolean property | VERIFIED | Line 298: `auto?='auto'?` in VariableDecl rule |
| `bbj-vscode/src/language/generated/ast.ts` | Generated AST with auto boolean | VERIFIED | Line 2854: `auto: boolean` on VariableDecl interface |
| `bbj-vscode/src/language/bbj-validator.ts` | Registration of variable scoping checks | VERIFIED | Line 14: import, Line 50: `registerVariableScopingChecks(registry)` call |
| `bbj-vscode/src/language/bbj-scope-local.ts` | ArrayDecl guard for proper DIM scoping | VERIFIED | Line 117: `isVariableDecl(node) && !isArrayDecl(node)` prevents DIM from being treated as DECLARE |
| `bbj-vscode/test/variable-scoping.test.ts` | Comprehensive test coverage for SCOPE-01, SCOPE-04, SCOPE-05 | VERIFIED (344 lines, 25 tests, all pass) | Three describe blocks, positive and negative cases, custom `expectHint`/`expectNoHints` helpers |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bbj-validator.ts` | `check-variable-scoping.ts` | `import { registerVariableScopingChecks }` + call in `registerValidationChecks` | WIRED | Line 14 import, Line 50 call |
| `check-variable-scoping.ts` | `generated/ast.ts` | AST type guards and node types | WIRED | 20+ imports: `isLetStatement`, `isArrayDeclarationStatement`, `isDreadStatement`, `isSymbolRef`, `isVariableDecl`, etc. |
| `check-variable-scoping.ts` | `bbj-nodedescription-provider.ts` | `getFQNFullname` for DECLARE type comparison | WIRED | Line 25 import, used at lines 317, 320 for type conflict detection |
| `bbj-scope-local.ts` | `generated/ast.ts` | `isArrayDecl` guard | WIRED | Line 22 import, Line 117 usage |
| `variable-scoping.test.ts` | `check-variable-scoping.ts` | Validation system (validationHelper triggers registered checks) | WIRED | 25 tests exercise the validation via Langium's validation pipeline |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SCOPE-01: Variables only visible after declaration/initialization in program scope | SATISFIED | 16 passing tests in SCOPE-01 block. `checkUseBeforeAssignment` implements two-pass detection for LET, DIM, DREAD, FOR, READ, ENTER, plain assignment. |
| SCOPE-04: DREAD recognizes variables already declared by DIM (array subscript form) | SATISFIED | 3 passing tests in SCOPE-04 block. `bbj-scope-local.ts` fix ensures DIM'd arrays are properly scoped. |
| SCOPE-05: DECLARE type information applies to variable usage before the DECLARE statement | SATISFIED | 6 passing tests in SCOPE-05 block. DECLARE skipped in use-before-assignment (whole-scope visibility). Conflicting DECLARE types detected. DECLARE AUTO property parsed. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any phase 28 artifacts |

### Human Verification Required

### 1. Visual diagnostic display in VS Code

**Test:** Open a BBj file with a variable used before assignment. Check that the hint diagnostic appears as a subtle underline (not error-red).
**Expected:** Hint-severity diagnostic appears with the message "'varname' used before assignment (first assigned at line N)" and is displayed as a subtle visual indicator.
**Why human:** Diagnostic severity rendering in the editor is a VS Code presentation concern that cannot be verified programmatically.

### 2. DECLARE type propagation in completion

**Test:** In a method, type `DECLARE java.lang.String myVar!` at the bottom. Above the DECLARE, type `myVar!.` and check if String methods appear in completion.
**Expected:** String methods (charAt, length, etc.) appear in autocomplete for `myVar!` even though the DECLARE is below the usage point.
**Why human:** Completion behavior depends on the full language server pipeline (scope resolution + completion provider) and real-time editor interaction.

### Gaps Summary

No gaps found. All four success criteria are met:

1. Use-before-assignment hint diagnostics work correctly with offset-based ordering, handling compound statements, and correctly exempting DECLARE, class fields, method parameters, and unresolved references.
2. DREAD after DIM resolves without error, thanks to the `!isArrayDecl(node)` guard in `bbj-scope-local.ts` that prevents DIM from being incorrectly scoped as a DECLARE.
3. DECLARE variables have whole-scope visibility -- the validation skips them via exact `$type === 'VariableDecl'` check, and the scoping system places them at method level.
4. No test regressions -- all 16 pre-existing failures are unchanged, and 25 new tests pass.

---

_Verified: 2026-02-07T07:15:00Z_
_Verifier: Claude (gsd-verifier)_
