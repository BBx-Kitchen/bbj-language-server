---
status: complete
phase: 28-variable-scoping-declaration-order
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md]
started: 2026-02-07T12:00:00Z
updated: 2026-02-07T12:06:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Use Before Assignment Warning
expected: In a BBj program file, write `PRINT x$` before `x$ = "hello"`. The PRINT line should show a hint-level diagnostic indicating use before assignment.
result: pass

### 2. No Warning After Assignment
expected: In a BBj program file, write `x$ = "hello"` then `PRINT x$` below it. No use-before-assignment hint should appear on the PRINT line.
result: pass

### 3. DECLARE Whole-Scope Visibility
expected: In a method, use a variable before its DECLARE statement (e.g. `PRINT myVar!` then `DECLARE BBjString myVar!`). No use-before-assignment hint should appear because DECLARE gives whole-scope visibility.
result: pass

### 4. Conflicting DECLARE Types
expected: In a method, add two DECLARE statements for the same variable with different types (e.g. `DECLARE BBjString x!` and `DECLARE BBjNumber x!`). An error diagnostic should appear flagging the conflicting types.
result: pass

### 5. DIM Variable Recognized
expected: In a program file, write `DIM a$[10]` then reference `a$` in a PRINT or DREAD below it. The reference should resolve without errors.
result: pass

### 6. Compound Statement Ordering
expected: Write a compound statement like `x = 1 ; PRINT y ; y = 2` on a single line. The `PRINT y` should show a use-before-assignment hint because `y` is assigned after the PRINT within the same compound statement.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
