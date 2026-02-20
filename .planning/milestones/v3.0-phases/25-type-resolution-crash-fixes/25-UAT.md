---
status: diagnosed
phase: 25-type-resolution-crash-fixes
source: [25-01-SUMMARY.md, 25-02-SUMMARY.md, 25-03-SUMMARY.md, 25-04-SUMMARY.md]
started: 2026-02-06T22:00:00Z
updated: 2026-02-06T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. CAST() type resolution enables method completion
expected: In a BBj class method, write a CAST(BBjString, someVar) expression followed by a dot. The language server should offer BBjString methods in the completion list (e.g., .length(), .substring()). The CAST target type should flow through to downstream expressions.
result: pass

### 2. CAST() with unresolvable type shows warning
expected: Write a CAST() with a type name that doesn't exist (e.g., CAST(NonExistentType, x)). The language server should show a yellow warning squiggly (not a red error) indicating the type could not be resolved.
result: pass

### 3. Implicit getter type conveyance
expected: In a BBj class with a field like `field public BBjString Name$`, calling `obj.getName()` (the auto-generated getter) followed by a dot should offer BBjString methods in the completion list. The getter should convey the backing field's type.
result: issue
reported: "It's just saying getName but no Type and no () like for a regular method"
severity: major

### 4. Inherited field access from parent class
expected: Create a parent BBj class with a field, then a child class that extends it. In code using the child class, accessing the inherited field (e.g., `child.parentField`) should work without errors — no "Could not resolve reference" diagnostic on the inherited member.
result: pass

### 5. Multi-level inheritance (grandparent fields)
expected: Create three classes: Grandparent with a field, Parent extends Grandparent, Child extends Parent. Accessing the grandparent's field on a Child instance should work without errors — the full inheritance chain should be traversed.
result: pass

### 6. Hover shows "inherited from" for inherited members
expected: Hover over an inherited field or method on a child class instance. The hover tooltip should include text like "inherited from ParentClass" indicating where the member was originally defined.
result: pass

### 7. DECLARE statement visible throughout entire method
expected: In a class method, place a DECLARE statement anywhere (e.g., middle or end of method). Variables declared by that DECLARE should be recognized throughout the entire method body, not just after the DECLARE line. No "unresolved reference" errors for the declared variable used before the DECLARE.
result: pass

### 8. USE statement crash resistance
expected: Add a USE statement referencing a class that doesn't exist on the classpath (e.g., `USE com.nonexistent.FakeClass`). The language server should NOT crash — it should show a warning diagnostic and continue working normally. Other USE statements in the same file should still resolve correctly.
result: issue
reported: "Server crashes in loop with 'Error: Node at path /statements@12 has no name' in BbjScopeComputation.processNode / BBjAstNodeDescriptionProvider.createDescription. Server crashed 5 times in 3 minutes and stopped restarting. Also: TypeError in buildInlineTokens reading 'length' of undefined in hover provider."
severity: blocker

### 9. Type resolution warnings toggle setting
expected: Open VS Code Settings and search for "bbj.typeResolution.warnings". A checkbox setting should appear under BBj configuration. When disabled (unchecked), type resolution warnings (CAST, USE, super class) should stop appearing. When re-enabled, warnings should reappear.
result: skipped
reason: Server crashed and could not restart — unable to test settings

## Summary

total: 9
passed: 6
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "Implicit getter completion should show return type and parentheses like a regular method"
  status: failed
  reason: "User reported: It's just saying getName but no Type and no () like for a regular method"
  severity: major
  test: 3
  root_cause: "createAccessorDescription in bbj-scope-local.ts creates a plain AstNodeDescription with type=MethodDecl but WITHOUT parameters or returnType fields. The completion provider checks isFunctionNodeDescription() which requires both parameters and returnType — since accessor descriptions lack these, they fall through to default completion (just name, no parens or type)."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-scope-local.ts"
      issue: "createAccessorDescription (line 310) returns AstNodeDescription without parameters/returnType"
    - path: "bbj-vscode/src/language/bbj-completion-provider.ts"
      issue: "createReferenceCompletionItem (line 126) only formats with parens/type when isFunctionNodeDescription is true"
  missing:
    - "createAccessorDescription should return FunctionNodeDescription with parameters (empty for getter, one param for setter) and returnType (field type for getter, void for setter)"
  debug_session: ""

- truth: "USE statement with unresolvable class should show warning without crashing the server"
  status: failed
  reason: "User reported: Server crashes in loop with 'Error: Node at path /statements@12 has no name' in BbjScopeComputation.processNode / BBjAstNodeDescriptionProvider.createDescription. Server crashed 5 times in 3 minutes and stopped restarting. Also: TypeError in buildInlineTokens reading 'length' of undefined in hover provider."
  severity: blocker
  test: 8
  root_cause: "TWO separate issues: (A) Scope crash: Langium's DefaultAstNodeDescriptionProvider.createDescription throws 'has no name' when called with name=undefined for a statement node at /statements@12 that lacks a name property. A workspace BBj file has a statement at index 12 that gets processed by processNode, and somewhere createDescription is called with undefined name — either from processNode line 123 (VariableDecl with undefined name) or from a node type that falls through without proper name guard. The BBjAstNodeDescriptionProvider override should catch this and return gracefully instead of letting the throw crash the server. (B) Hover crash: Langium's parseJSDoc/buildInlineTokens throws TypeError when parsing certain JavaDoc content (e.g., HashMap). The existing try-catch in tryParseJavaDoc catches this and logs it via console.warn — it's non-fatal but noisy."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-nodedescription-provider.ts"
      issue: "createDescription calls super.createDescription which throws on undefined name — no defensive guard"
    - path: "bbj-vscode/src/language/bbj-scope-local.ts"
      issue: "processNode line 123 passes node.name to createDescription without null check for VariableDecl"
    - path: "bbj-vscode/src/language/bbj-hover.ts"
      issue: "tryParseJavaDoc catches parseJSDoc errors but logs them as console.warn (non-fatal, just noisy)"
  missing:
    - "BBjAstNodeDescriptionProvider.createDescription should guard against undefined name — return a safe description or skip instead of letting Langium throw"
    - "processNode should guard node.name before calling createDescription for VariableDecl"
    - "tryParseJavaDoc should silently catch errors instead of console.warn to reduce noise"
  debug_session: ""
