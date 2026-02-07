---
status: complete
phase: 29-def-fn-inheritance-resolution
source: [29-01-SUMMARY.md, 29-02-SUMMARY.md, 29-03-SUMMARY.md]
started: 2026-02-07T12:10:00Z
updated: 2026-02-07T12:18:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Multi-line DEF FN in Class Method
expected: In a class method, define a multi-line DEF FN (e.g. DEF FNAdd(a, b) ... FNEND). No line-break validation error should appear on the DEF FN statement or its body.
result: pass

### 2. DEF FN Parameters Resolve in Body
expected: Inside a DEF FN body (multi-line or single-line in program scope), reference a parameter declared in the FN signature. The parameter should resolve without any "Could not resolve" warning.
result: issue
reported: "In def fnIsText(_f$,_t$) I see '_f' and '_t' in code completion, not _f$ or _t$."
severity: major

### 3. DEF FN Parameters Don't Leak
expected: After a DEF FN definition, reference one of its parameters in the enclosing scope (outside the FN body). A "Could not resolve" warning should appear, proving the parameter is not visible outside the FN.
result: pass
note: Resolution correct (warning appears), but completion still offers parameters outside FN body — logged as part of test 2 issue scope.

### 4. Super Class Field Access
expected: Create a BBj class that extends another class. In the subclass, access a field defined in the parent class using `#fieldName!`. The field reference should resolve without errors.
result: issue
reported: "Not okay. Get 'Could not resolve reference to NamedElement named A!'. [in test123.bbj:31]"
severity: major

### 5. Inherited Method Resolution
expected: In a subclass, call a method defined in a BBj super class (e.g. `#super!.methodName()` or `#methodName()`). The method call should resolve without a linking error.
result: pass

## Summary

total: 5
passed: 3
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "DEF FN parameters show with correct suffix ($) in completion and don't appear in completion outside FN body"
  status: failed
  reason: "User reported: In def fnIsText(_f$,_t$) I see '_f' and '_t' in code completion, not _f$ or _t$."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Super class field access resolves without errors in subclass"
  status: failed
  reason: "User reported: Not okay. Get 'Could not resolve reference to NamedElement named A!'. [in test123.bbj:31]"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
