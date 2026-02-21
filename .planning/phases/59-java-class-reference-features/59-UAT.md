---
status: complete
phase: 59-java-class-reference-features
source: [59-01-SUMMARY.md, 59-02-SUMMARY.md, 59-03-SUMMARY.md]
started: 2026-02-21T00:00:00Z
updated: 2026-02-21T01:00:00Z
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
result: issue
reported: "completion only suggests CLASS on String. when imported with USE. When I type java.lang.String. and trigger completion I see valueOf and all the others"
severity: major

### 5. Inherited Static Methods Appear
expected: After `USE java.util.ArrayList`, type `ArrayList.` and trigger completion. Static methods inherited from superclasses should appear alongside ArrayList's own static methods.
result: issue
reported: "Same as before - not over USE. But which ones are from Abstract parents?"
severity: major

### 6. Deprecated Methods Show Strikethrough
expected: Type a `.` on a Java object that has deprecated methods (e.g., a Date object or any class with @Deprecated methods). In the completion list, deprecated methods should appear with strikethrough text decoration, visually distinguishing them from non-deprecated methods.
result: issue
reported: "getHours() on java.util.Date is not visibly deprecated. Did you make changes to the Java Interrop part that might need to be transferred to BBj?"
severity: major

### 7. Deprecated Classes Show Strikethrough
expected: If a deprecated class (e.g., one annotated with @Deprecated) appears in a completion list, it should also show with strikethrough decoration — consistent with deprecated methods.
result: skipped
reason: Classes never appear in completion lists correctly — pre-existing limitation, not Phase 59 scope

### 8. Constructor Completion After new ClassName(
expected: Type `new java.util.HashMap(` and trigger completion. Constructor signatures should appear as completion items — separate items per overload showing parameter types.
result: issue
reported: "doesn't work. no constructor items appear after the opening parent, only generic stuff from context in VSCode after a longer Loading.... wait time"
severity: major

### 9. BBj Class Constructor Completion
expected: Define a BBj class with a `create` method, then type `new MyClass(` and trigger completion. The constructor/create method signature should appear as a completion item.
result: skipped
reason: Depends on Test 8 fix — postponed by user

## Summary

total: 9
passed: 3
issues: 4
pending: 0
skipped: 2

## Gaps

- truth: "Typing `.` on a USE class reference offers static methods of that class in the completion list"
  status: failed
  reason: "User reported: completion only suggests CLASS on String. when imported with USE. When I type java.lang.String. and trigger completion I see valueOf and all the others"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Inherited static methods from superclasses appear in static method completion"
  status: failed
  reason: "User reported: Same as before - not over USE. But which ones are from Abstract parents?"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Deprecated methods appear in the completion list with strikethrough (CompletionItemTag.Deprecated)"
  status: failed
  reason: "User reported: getHours() on java.util.Date is not visibly deprecated. Did you make changes to the Java Interrop part that might need to be transferred to BBj?"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "After `new ClassName(`, the completion list offers constructor signatures for that class"
  status: failed
  reason: "User reported: doesn't work. no constructor items appear after the opening parent, only generic stuff from context in VSCode after a longer Loading.... wait time"
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
