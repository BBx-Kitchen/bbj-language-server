---
status: passed
phase: 59-java-class-reference-features
source: [59-01-SUMMARY.md, 59-02-SUMMARY.md, 59-03-SUMMARY.md]
started: 2026-02-21T00:00:00Z
updated: 2026-02-21T09:00:00Z
audit_acknowledged:
  milestone: v4.1
  at: 2026-09-03
  gap_snapshot: "passed::scenarios=0"
---

## Current Test

[testing complete]

## Tests

### 1. .class Completion Appears on Java Object Reference

expected: In a BBj file, after `USE java.util.HashMap`, declare a variable like `h! = new java.util.HashMap()`. Type `h!.` and trigger completion. The completion list should include a `.class` item among the regular HashMap methods.
result: pass

### 2. .class Resolves Without Unresolvable Warning

expected: Type `h!.class` (with `h!` being a Java object variable). The `.class` member should resolve without an "unresolvable" diagnostic warning in the editor.
result: pass

### 3. Chained .class Method Access

expected: Type `h!.class.getName()`. After typing the second `.`, the completion list should offer `java.lang.Class` methods (getName, getSimpleName, getSuperclass, etc.). No unresolvable warnings should appear on the chain.
result: pass

### 4. Static Method Completion on USE Class Reference

expected: After `USE java.lang.String`, type `String.` and trigger completion. The completion list should show only static methods of String (valueOf, format, join, etc.) — no instance methods like charAt or length.
result: pass
retest: "pass — static methods now appear on USE class references after isStatic race condition fix + JAR deployment"
note: "New issue discovered: `x! = String.valueOf(2)` does not infer return type for x! — x! has no completions. This is a type inference gap for static method call assignments, not a Phase 59 regression. Filed as future work."

### 5. Inherited Static Methods Appear

expected: After `USE java.util.ArrayList`, type `ArrayList.` and trigger completion. Static methods inherited from superclasses should appear alongside ArrayList's own static methods.
result: pass
retest: "pass — follows from Test 4 fix (getMethods() includes inherited methods)"

### 6. Deprecated Methods Show Strikethrough

expected: Type a `.` on a Java object that has deprecated methods (e.g., a Date object or any class with @Deprecated methods). In the completion list, deprecated methods should appear with strikethrough text decoration, visually distinguishing them from non-deprecated methods.
result: pass
retest: "pass — after deploying patched bbj-ls JAR with isDeprecated field"

### 7. Deprecated Classes Show Strikethrough

expected: If a deprecated class (e.g., one annotated with @Deprecated) appears in a completion list, it should also show with strikethrough decoration — consistent with deprecated methods.
result: skipped
reason: Classes never appear in completion lists correctly — pre-existing limitation, not Phase 59 scope

### 8. Constructor Completion After new ClassName(

expected: Type `new java.util.HashMap(` and trigger completion. Constructor signatures should appear as completion items — separate items per overload showing parameter types.
result: pass
retest: "pass — after deploying patched bbj-ls JAR with constructors field + '(' trigger character"

### 9. BBj Class Constructor Completion

expected: Define a BBj class with a `create` method, then type `new MyClass(` and trigger completion. The constructor/create method signature should appear as a completion item.
result: pass
retest: "pass — confirmed by user"

## Summary

total: 9
passed: 7
issues: 0
pending: 0
skipped: 2

## Resolved Gaps

- truth: "Typing `.` on a USE class reference offers static methods of that class in the completion list"
  status: resolved
  fix: "isStatic race condition fixed in java-interop.ts (two-phase class resolution) + patched bbj-ls JAR deployed with isStatic field"
  test: 4
  commit: 99820a0

- truth: "Inherited static methods from superclasses appear in static method completion"
  status: resolved
  fix: "Same as Test 4 — getMethods() includes inherited methods"
  test: 5
  commit: 99820a0

- truth: "Deprecated methods appear in the completion list with strikethrough (CompletionItemTag.Deprecated)"
  status: resolved
  fix: "Patched bbj-ls JAR deployed with isDeprecated field on MethodInfo, FieldInfo, ClassInfo"
  test: 6
  commit: 0fedac6

- truth: "After `new ClassName(`, the completion list offers constructor signatures for that class"
  status: resolved
  fix: "Patched bbj-ls JAR deployed with constructors field + '(' trigger character added + empty CompletionList fallback"
  test: 8
  commits: [99820a0, 0fedac6]

## New Issues Discovered

- area: type-inference
  description: "Static method call return type not inferred for variable assignment. `x! = String.valueOf(2)` does not give x! the String type — x! has no completions."
  severity: minor
  scope: future work (not Phase 59)
  repro: |
    USE java.lang.String
    x! = String.valueOf(2)
    ? x!
    ? x!.class
    REM x! does not obtain String type, no completion offered
