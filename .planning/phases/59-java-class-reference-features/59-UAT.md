---
status: diagnosed
phase: 59-java-class-reference-features
source: [59-01-SUMMARY.md, 59-02-SUMMARY.md, 59-03-SUMMARY.md]
started: 2026-02-21T00:00:00Z
updated: 2026-02-21T02:00:00Z
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
  root_cause: "Two factors: (1) isClassRef detection in bbj-scope.ts only checks SymbolRef receivers — USE path sets isClassRef=true but static method filter returns empty because isStatic is not yet populated when class is first accessed (race condition in java-interop.ts where class is registered at line 385 before method properties are set at line 403). (2) FQN path bypasses isClassRef entirely (MemberCall receiver, not SymbolRef) so it shows ALL methods unfiltered."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-scope.ts"
      issue: "isClassRef detection only handles SymbolRef (line 163), misses MemberCall receivers; static method filter at line 178 returns empty due to isStatic not populated"
    - path: "bbj-vscode/src/language/java-interop.ts"
      issue: "Class registered in resolvedClasses (line 385) before method.isStatic is set (line 403) — race condition"
  missing:
    - "Extend isClassRef to detect MemberCall receivers resolving to JavaClass"
    - "Move resolvedClasses.set() after method properties are populated, or set properties before registration"
  debug_session: ".planning/debug/use-import-static-completion.md"

- truth: "Inherited static methods from superclasses appear in static method completion"
  status: failed
  reason: "User reported: Same as before - not over USE. But which ones are from Abstract parents?"
  severity: major
  test: 5
  root_cause: "Same root cause as Test 4 — static methods don't appear at all on USE refs. Once the isStatic race condition is fixed, inherited statics will work automatically since backend uses getMethods() which includes superclass methods."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-scope.ts"
      issue: "Same as Test 4 — static method filter returns empty"
  missing:
    - "Fix Test 4 root cause — inherited statics will follow"
  debug_session: ".planning/debug/use-import-static-completion.md"

- truth: "Deprecated methods appear in the completion list with strikethrough (CompletionItemTag.Deprecated)"
  status: failed
  reason: "User reported: getHours() on java.util.Date is not visibly deprecated. Did you make changes to the Java Interrop part that might need to be transferred to BBj?"
  severity: major
  test: 6
  root_cause: "BBj-bundled Java interop service predates commit a02e009. The isDeprecated field was added to MethodInfo/FieldInfo/ClassInfo in that commit, but BBj's bundled version doesn't have it. TypeScript gracefully degrades (isDeprecated ?? false → always false). The LS code is correct but the data never arrives from BBj's runtime."
  artifacts:
    - path: "java-interop/src/main/java/bbj/interop/data/MethodInfo.java"
      issue: "isDeprecated field exists in repo but not in BBj-bundled version"
    - path: "bbj-vscode/src/language/java-interop.ts"
      issue: "Line 402: graceful degradation masks the missing data (isDeprecated ?? false)"
  missing:
    - "Deploy updated java-interop JAR to BBj runtime with isDeprecated, isStatic, and constructors fields"
  debug_session: ".planning/debug/deprecated-strikethrough.md"

- truth: "After `new ClassName(`, the completion list offers constructor signatures for that class"
  status: failed
  reason: "User reported: doesn't work. no constructor items appear after the opening parent, only generic stuff from context in VSCode after a longer Loading.... wait time"
  severity: major
  test: 8
  root_cause: "Three factors: (1) '(' is not registered as a trigger character in completionOptions (only '#' is) — completion never auto-fires when user types '('. (2) getConstructorCompletion() has 5 silent return-undefined points with no logging — when it fails, it silently falls through to super.getCompletion() which runs slow default completion. (3) BBj-bundled interop likely doesn't send constructors field (same deployment issue as deprecated)."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-completion-provider.ts"
      issue: "Line 14: triggerCharacters only has '#', missing '('. Lines 76-136: 5 silent return-undefined exit points. Line 30: fallthrough to slow super.getCompletion()"
  missing:
    - "Add '(' to triggerCharacters"
    - "Return empty CompletionList instead of undefined when trigger is '(' to prevent slow fallthrough"
    - "Deploy updated java-interop JAR with constructors field to BBj runtime"
  debug_session: ".planning/debug/constructor-completion.md"
