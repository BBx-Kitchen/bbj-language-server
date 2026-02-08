---
status: complete
phase: 33-parser-and-lexer-fixes
source: [33-01-SUMMARY.md, 33-02-SUMMARY.md, 33-03-SUMMARY.md]
started: 2026-02-08T05:10:00Z
updated: 2026-02-08T05:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Void return type in method signature
expected: Open a BBj file containing `method public void doSomething()` in a class. No error or warning should appear on the `void` keyword — it should not be flagged as an unresolvable class.
result: pass

### 2. DEF FN with suffixed variables inside class method
expected: Open a BBj file with a DEF FN inside a class method body that uses suffixed variables like `mode$`, `count%`, or `obj!`. No lexer or parser errors should appear. Example: `DEF FNGetMode$(X$)=X$+"_mode"` inside a `method public void doWork()`.
result: pass
note: "CC still shows no suffix inside a DEF FN inside a method (cosmetic, not a Phase 33 issue)"

### 3. SELECT verb with clauses
expected: Open a BBj file with a SELECT statement like `SELECT (ch)rec$ FROM "customers.dat" WHERE (rec.balance>1000) SORTBY rec.name$`. No false parse errors or line-break validation errors should appear. All clause keywords (FROM, WHERE, SORTBY, LIMIT, MODE, ERR) should be accepted.
result: pass

### 4. Cast with array type notation
expected: Open a BBj file with `x! = cast(BBjString[], someVar!)`. No parse error should appear. Multi-dimensional arrays like `cast(BBjString[][], x!)` should also work. Regular cast without brackets like `cast(BBjString, x!)` should still work and show type inference (code completion on the result).
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
