---
phase: 15-core-api-renames-type-constants
verified: 2026-02-03T10:38:07Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Every TypeName constant usage updated to TypeName.$type pattern (25+ sites across 10+ files)"
  gaps_remaining: []
  regressions: []
---

# Phase 15: Core API Renames & Type Constants Verification Report

**Phase Goal:** All mechanical renames and type constant migrations applied so scope computation, validators, and type-checking code reference Langium 4 APIs correctly

**Verified:** 2026-02-03T10:38:07Z
**Status:** passed
**Re-verification:** Yes — after gap closure (commit 1201457)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every TypeName constant usage updated to TypeName.$type pattern (25+ sites across 10+ files) | ✓ VERIFIED | 65 .$type usages found across 8 files. Previous gaps in bbj-linker.ts (5) and java-interop.ts (8) now fixed. Zero bare type constant usages remain. |
| 2 | All PrecomputedScopes references renamed to LocalSymbols with correct interface usage | ✓ VERIFIED | 4 usages in scope-local.ts (import + 3 type annotations). Zero remaining references to PrecomputedScopes. |
| 3 | All document.precomputedScopes property accesses updated to new name | ✓ VERIFIED | 3 usages in scope.ts (lines 133, 248, 337) all updated to document.localSymbols. Zero remaining references to precomputedScopes property. |
| 4 | Scope computation method names updated if renamed in Langium 4 | ✓ VERIFIED | collectExportedSymbols (line 54), collectLocalSymbols (line 59), collectExportedSymbolsForNode (line 56) all renamed and overridden correctly. |
| 5 | All import paths resolve correctly for renamed/moved Langium exports | ✓ VERIFIED | LocalSymbols imported from 'langium' (line 10 scope-local.ts). All imports resolve correctly. |

**Score:** 5/5 truths fully verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-node-kind.ts` | Symbol/completion kind with .$type switch cases | ✓ VERIFIED | 15 .$type usages (13 switch cases + node.$type comparisons) |
| `bbj-vscode/src/language/bbj-semantic-token-provider.ts` | Semantic tokens with .$type switch cases | ✓ VERIFIED | 4 .$type usages (3 switch cases + node.$type) |
| `bbj-vscode/src/language/bbj-nodedescription-provider.ts` | Node descriptions with .$type switch cases | ✓ VERIFIED | 11 .$type usages (4 switch cases + string literal comparisons) |
| `bbj-vscode/src/language/bbj-completion-provider.ts` | Completion customization with .$type comparisons | ✓ VERIFIED | 2 .$type usages (equality comparisons) |
| `bbj-vscode/src/language/bbj-scope-local.ts` | Scope computation with LocalSymbols and .$type | ✓ VERIFIED | 6 .$type usages, LocalSymbols imported and used correctly (4 usages total) |
| `bbj-vscode/src/language/bbj-scope.ts` | Scope provider with localSymbols property and .$type | ✓ VERIFIED | 13 .$type usages, 3 localSymbols property accesses |
| `bbj-vscode/src/language/bbj-linker.ts` | Linker with .$type comparisons and AstNodeDescription type property | ✓ VERIFIED | 5 .$type usages (lines 21, 85, 87×2, 94×2). All gaps closed. |
| `bbj-vscode/src/language/java-interop.ts` | Java interop with .$type assignments for AST nodes | ✓ VERIFIED | 8 .$type usages (lines 46, 198, 259, 278, 285, 295, 351, 388). All gaps closed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| bbj-node-kind.ts | generated/ast.js | import type constants, access .$type | ✓ WIRED | All 15 switch cases use .$type pattern |
| bbj-completion-provider.ts | generated/ast.js | import type constants, compare .type === X.$type | ✓ WIRED | Both equality comparisons use .$type |
| bbj-scope-local.ts | langium | import LocalSymbols | ✓ WIRED | Line 10: LocalSymbols imported from 'langium' |
| bbj-scope-local.ts | DefaultScopeComputation | override collectExportedSymbols and collectLocalSymbols | ✓ WIRED | Lines 54, 59: both methods overridden with Langium 4 names |
| bbj-scope.ts | LangiumDocument | document.localSymbols property access | ✓ WIRED | Lines 133, 248, 337: all use localSymbols property |
| bbj-scope.ts | generated/ast.js | type constants with .$type for scope methods | ✓ WIRED | All 13 usages correct |
| bbj-linker.ts | generated/ast.js | type constant in AstNodeDescription and comparisons | ✓ WIRED | Line 21: type: VariableDecl.$type; Lines 85-87: $type comparisons; Line 94: type !== X.$type comparisons |
| java-interop.ts | generated/ast.js | type constant in AST node $type property | ✓ WIRED | Lines 46, 198, 259, 278, 285, 295, 351, 388: all $type assignments use .$type suffix |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| MIGR-01: AST type constants migrated to Langium 4 format | ✓ SATISFIED | All 65 usages across 8 files now use .$type suffix |
| MIGR-02: PrecomputedScopes renamed to LocalSymbols | ✓ SATISFIED | All 4 references updated |
| MIGR-03: document.precomputedScopes property updated | ✓ SATISFIED | All 3 property accesses updated |
| MIGR-07: Scope computation method renames applied | ✓ SATISFIED | All 3 method names updated |
| MIGR-09: All import paths updated | ✓ SATISFIED | LocalSymbols imported correctly from 'langium' |

### Anti-Patterns Found

**Zero anti-patterns remain after gap closure.**

Previous verification found 6 blocker anti-patterns in bbj-linker.ts and java-interop.ts (bare type constants). All have been fixed in commit 1201457.

Comprehensive scans performed:
- ✓ No bare type constant usages in type property assignments
- ✓ No bare type constant usages in $type property assignments
- ✓ No bare type constant usages in === or !== comparisons
- ✓ No remaining PrecomputedScopes references
- ✓ No remaining precomputedScopes property accesses
- ✓ No TODO/FIXME comments related to type constants

### Gap Closure Summary

**Previous gaps (from initial verification):**

1. **bbj-linker.ts (3 gaps):**
   - Line 21: `type: VariableDecl` → Fixed to `type: VariableDecl.$type`
   - Line 94: `descr.type !== MethodDecl` → Fixed to `descr.type !== MethodDecl.$type`
   - Line 94: `descr.type !== LibFunction` → Fixed to `descr.type !== LibFunction.$type`

2. **java-interop.ts (3 gaps identified, 8 total fixed):**
   - Line 46: `$type: Classpath` → Fixed to `$type: Classpath.$type`
   - Line 198: `$type: JavaPackage` → Fixed to `$type: JavaPackage.$type`
   - Line 388: `$type: JavaPackage` → Fixed to `$type: JavaPackage.$type`
   - Additional fixes at lines 259, 278, 285, 295, 351 (found during gap closure)

**Verification approach:**

After gap closure commit, performed comprehensive re-verification:

1. ✓ Read both fixed files to confirm all changes applied
2. ✓ Counted .$type usages: bbj-linker.ts (5), java-interop.ts (8)
3. ✓ Searched ALL source files for remaining bare type constants (none found)
4. ✓ Searched for bare type property assignments (none found)
5. ✓ Searched for bare $type property assignments (none found)
6. ✓ Searched for bare type comparisons with ===/!== (none found)
7. ✓ Verified PrecomputedScopes → LocalSymbols migration (complete)
8. ✓ Verified document.precomputedScopes → document.localSymbols (complete)
9. ✓ Verified scope method renames (complete)
10. ✓ Verified import paths (correct)

**Total type constant usages migrated:** 65 across 8 files
- bbj-node-kind.ts: 15
- bbj-semantic-token-provider.ts: 4
- bbj-nodedescription-provider.ts: 11
- bbj-completion-provider.ts: 2
- bbj-scope-local.ts: 6
- bbj-scope.ts: 13
- bbj-linker.ts: 5 (newly fixed)
- java-interop.ts: 8 (newly fixed)
- bbj-validator.ts: 1 (pre-existing, uses node.$type property correctly)

**Regressions:** None detected. All previously passing items remain correct.

---

_Verified: 2026-02-03T10:38:07Z_
_Verifier: Claude (gsd-verifier)_
_Previous verification: 2026-02-03T10:33:46Z (gaps_found)_
_Gap closure commit: 1201457aa9bfa1d46929f9c447f532a5ee764d0f_
