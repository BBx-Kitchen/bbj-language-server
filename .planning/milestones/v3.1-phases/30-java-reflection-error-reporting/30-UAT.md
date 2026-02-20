---
status: diagnosed
phase: 30-java-reflection-error-reporting
source: [30-01-SUMMARY.md, 30-02-SUMMARY.md, 30-03-SUMMARY.md]
started: 2026-02-07T12:30:00Z
updated: 2026-02-07T12:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cyclic Reference Error with File and Line
expected: Create a cyclic reference scenario (e.g. class A extends B and class B extends A). The error in the Problems panel should include the source filename and line number where the cycle was detected.
result: issue
reported: "a! = a!.toString() is flagged as cyclic, but class public A extends B / class public B extends A is not"
severity: major

### 2. Cyclic Reference Error Severity
expected: The cyclic reference error should appear with Error severity (red squiggle/icon) in the Problems panel, not Warning severity (yellow).
result: pass

### 3. Refresh Java Classes Command
expected: Open the VS Code command palette (Cmd+Shift+P) and search for "BBj: Refresh Java Classes". The command should appear and execute without error, showing a "Java classes refreshed" notification.
result: pass

### 4. Auto-Refresh on Settings Change
expected: Change the `bbj.classpath` or `bbj.home` setting in VS Code settings. Java class data should refresh automatically without needing to run the manual refresh command. Any new classes on the updated classpath should become available for completion.
result: pass

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Cyclic class inheritance (A extends B, B extends A) is detected and reported with file+line info"
  status: failed
  reason: "User reported: a! = a!.toString() is flagged as cyclic, but class public A extends B / class public B extends A is not"
  severity: major
  test: 1
  root_cause: "Two distinct bugs: (1) False positive: BBjTypeInferer.getType() creates re-entrant reference access chain (MemberCall.member -> scope -> getType(receiver) -> Assignment -> getType(value) -> same MemberCall.member) triggering Langium's per-Reference re-entrancy guard. (2) Missing detection: extends clause resolves via flat index lookup so two separate Reference objects never interact; no dedicated cyclic inheritance validator exists."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-type-inferer.ts"
      issue: "Lines 20-21 and 34-35: Assignment -> getType(value) -> MemberCall -> member.ref creates re-entrant chain"
    - path: "bbj-vscode/src/language/bbj-scope.ts"
      issue: "Lines 79-85: extends uses flat index lookup; Lines 336-338: visited Set silently prevents infinite loops but reports no error"
    - path: "bbj-vscode/src/language/validations/check-classes.ts"
      issue: "Missing cyclic inheritance check"
  missing:
    - "Add re-entrancy guard in BBjTypeInferer.getType() to prevent false positive cyclic detection"
    - "Add dedicated cyclic inheritance validator in check-classes.ts that walks extends chain with visited Set"
  debug_session: ".planning/debug/cyclic-reference-detection.md"
