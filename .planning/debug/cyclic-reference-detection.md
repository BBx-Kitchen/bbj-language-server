---
status: resolved
trigger: "Cyclic class inheritance not detected; self-reference falsely flagged as cyclic"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - v3.1 fixes are working correctly
test: Verified implementation details and test suite
expecting: All cyclic inheritance tests pass (they do!)
next_action: Determine why user reported issue - fixes are working

## Symptoms

expected: Cyclic class inheritance (A extends B, B extends A) should be detected and reported. Self-referencing variable access (a! = a!.toString()) should NOT be flagged.
actual: Cyclic inheritance is NOT flagged. Self-reference IS falsely flagged as cyclic.
errors: False positive cyclic reference error on `a! = a!.toString()`; missing error on actual cyclic inheritance
reproduction: Create two classes with cyclic extends; create variable self-reference with method call
started: After Phase 30-02 override of throwCyclicReferenceError

## Eliminated

- hypothesis: Langium's linker detects semantic class inheritance cycles
  evidence: Langium's cycle detection is purely mechanical -- it detects re-entrant access to the SAME Reference object (via _ref === RefResolving sentinel). It does NOT analyze class hierarchies.
  timestamp: 2026-02-07

## Evidence

- timestamp: 2026-02-07T00:30:00Z
  checked: Ran cyclic inheritance test suite (bbj-vscode/test/classes.test.ts)
  found: ALL cyclic inheritance tests PASS - ✓ Direct cyclic inheritance (A extends B, B extends A) reports error; ✓ Self-extending class (A extends A) reports error; ✓ Three-class cycle (A extends B, B extends C, C extends A) reports error; ✓ No false positive on valid linear inheritance; ✓ No false positive on self-referencing variable assignment (a! = a!)
  implication: Both v3.1 fixes ARE working correctly - re-entrancy guard prevents false positive on self-reference, CyclicInheritanceValidator correctly detects actual cycles

- timestamp: 2026-02-07T00:35:00Z
  checked: Verified implementation in bbj-type-inferer.ts (lines 13, 20-27) and check-classes.ts (lines 48, 129-153)
  found: Fix A - Re-entrancy guard in BBjTypeInferer.getType() using Set<AstNode> resolving field (lines 13, 20-27). Returns undefined if expression is already being resolved, preventing infinite loop on self-referencing assignments. Fix B - CyclicInheritanceValidator.checkCyclicInheritance() (lines 129-153) walks inheritance chain with visited Set, detects cycles, reports error.
  implication: Both fixes are correctly implemented and working as designed

- timestamp: 2026-02-07
  checked: Langium DefaultLinker.buildReference() (node_modules/langium/src/references/linker.ts lines 215-258)
  found: Cyclic detection works via _ref field sentinel. When ref getter is accessed, if _ref === undefined, sets _ref = RefResolving, then resolves. If during resolution the SAME ref getter is accessed again and _ref === RefResolving, calls throwCyclicReferenceError(). This is re-entrant access detection on a single Reference object, NOT semantic cycle detection.
  implication: Langium's built-in "cyclic reference" detection CANNOT detect class hierarchy cycles (A extends B, B extends A) because resolving A's extends to B does NOT require resolving B's extends to A -- they use different Reference objects.

- timestamp: 2026-02-07
  checked: BbjScopeProvider.getScope() for MemberCall.member (bbj-scope.ts lines 153-165)
  found: When resolving a MemberCall.member reference, getScope() calls typeInferer.getType(receiver) to determine the receiver's type and build the member scope.
  implication: Type inference during scope resolution can trigger re-entrant reference access.

- timestamp: 2026-02-07
  checked: BBjTypeInferer.getType() (bbj-type-inferer.ts lines 17-79)
  found: For SymbolRef, accesses expression.symbol.ref; if that's an Assignment, calls getType(assignment.value). For MemberCall, accesses expression.member.ref. This creates a chain: resolving MemberCall.member -> getType(receiver) -> resolve SymbolRef -> get Assignment -> getType(value=MemberCall) -> access member.ref again.
  implication: Self-referencing assignments (a! = a!.toString()) cause the type inferer to access the SAME member.ref that is currently being resolved, triggering the false cyclic detection.

- timestamp: 2026-02-07
  checked: BBjScopeComputation (bbj-scope-local.ts lines 145-159)
  found: For assignments like `a! = a!.toString()`, the scope computation adds `a!` to local scope with path pointing to the Assignment node and type FieldDecl. So `a!` resolves to the Assignment node itself.
  implication: The right-hand side `a!` in `a! = a!.toString()` resolves to the assignment, and getType follows the assignment's value back to the MemberCall being resolved.

- timestamp: 2026-02-07
  checked: DefaultLinker.doLink() catch block (linker.ts lines 154-161)
  found: The Error thrown by throwCyclicReferenceError is caught and wrapped into a LinkingError with message "An error occurred while resolving reference to 'toString': Cyclic reference resolution detected for 'toString' [in ...]"
  implication: The error message contains "Cyclic reference" which causes BBjDocumentValidator to treat it as Error severity and add relatedInformation.

- timestamp: 2026-02-07
  checked: BbjScopeProvider.getScope() for SimpleTypeRef.simpleClass (bbj-scope.ts lines 79-85)
  found: For extends clause resolution, getScope() calls resolveClassScopeByName() which does a simple index lookup by class name. It does NOT resolve the target class's extends clause.
  implication: Resolving A's extends reference to B never triggers resolution of B's extends reference to A. No re-entrant access occurs, so Langium's cycle detection cannot fire.

- timestamp: 2026-02-07
  checked: check-classes.ts and bbj-validator.ts validation checks
  found: No validation check exists for cyclic class inheritance. The BbjClass validation only checks visibility and class reference accessibility (public/protected/private). The createBBjClassMemberScope in bbj-scope.ts has a visited Set for cycle protection (to avoid infinite loops during member resolution), but this is a silent guard, not a diagnostic reporter.
  implication: Cyclic inheritance is silently tolerated. The visited Set prevents infinite loops in scope building but no error is reported to the user.

## Resolution

root_cause: |
  TWO distinct root causes:

  **Issue 1 - False positive on self-referencing variable (a! = a!.toString()):**
  The type inferer creates a re-entrant reference access cycle during MemberCall.member resolution:
  1. doLink processes MemberCall(a!.toString()).member -> sets _ref = RefResolving
  2. getScope() calls typeInferer.getType(receiver=SymbolRef(a!))
  3. getType resolves a! -> finds Assignment node (a! = a!.toString())
  4. getType(Assignment) calls getType(assignment.value) where value IS the same MemberCall
  5. getType(MemberCall) accesses expression.member.ref -> _ref === RefResolving -> BOOM
  This is Langium's re-entrant resolution guard firing on a legitimate self-referencing pattern, not an actual cyclic class hierarchy.

  **Issue 2 - Missing detection of actual cyclic inheritance (A extends B, B extends A):**
  Langium's cyclic detection is purely mechanical (re-entrant access to a single Reference object). It CANNOT detect semantic class hierarchy cycles because resolving A's extends→B and B's extends→A use DIFFERENT Reference objects on different AST nodes. The resolution of SimpleTypeRef.simpleClass just does an index name lookup -- it never needs to resolve the target class's own extends clause. No dedicated validation for cyclic inheritance exists. The visited Set in createBBjClassMemberScope silently prevents infinite loops during member scope building but reports no diagnostic.

fix: |
  Wrapped `.ref` accesses in BBjTypeInferer.getTypeInternal() with try/catch blocks for both
  SymbolRef (expression.symbol.ref) and MemberCall (expression.member.ref). Langium's cyclic
  reference Error is caught and returns undefined (untyped) instead of propagating as a false
  diagnostic. The v3.1 re-entrancy guard (Set<AstNode>) handles the Expression-level cycle,
  but the Langium-level cycle (Reference._ref === RefResolving) fires INSIDE getTypeInternal
  before the guard can catch it — hence the try/catch is needed at the .ref access sites.
verification: |
  - 63 linking tests pass (including new test for b!=b!.toString() without prior assignment)
  - Build succeeds
files_changed:
  - bbj-vscode/src/language/bbj-type-inferer.ts
  - bbj-vscode/test/linking.test.ts
