---
status: complete
phase: 24-grammar-parsing-fixes
source: [24-01-SUMMARY.md, 24-02-SUMMARY.md]
started: 2026-02-06T20:00:00Z
updated: 2026-02-06T20:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Keyword-prefixed identifiers parse as identifiers
expected: Open a BBj file containing identifiers like `getResult`, `isNew`, or `readData` as variable names, labels, GOTO targets, or field names. The language server should NOT show parse errors — they should be recognized as identifiers, not split into keyword + remainder.
result: pass

### 2. Inline REM comments after semicolons
expected: Write a line like `endif;rem this is a comment` or `x=1;REM note`. The language server should parse this without errors — the REM after the semicolon should be treated as a comment.
result: pass

### 3. DREAD statement parsing
expected: Write a `DREAD` statement (e.g., `DREAD X$,Y$` or `DREAD X$,ERR=100`). The language server should parse it without errors — DREAD should be recognized as a valid statement.
result: issue
reported: "DREAD X$ reports 'Could not resolve reference to NamedElement named X$' even though DREAD is initializing/reading that variable — it shouldn't require X$ to already exist"
severity: major

### 4. DATA statement parsing
expected: Write a `DATA` statement (e.g., `DATA 1,2,3` or `DATA "hello","world"`). The language server should parse it without errors — DATA should be recognized as a valid statement.
result: pass

### 5. DEF FN inside class methods
expected: Define a `DEF FN` function inside a class method body. The language server should parse it without errors — DEF FN should be allowed inside methods, not just at the top level.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "DREAD statement should not require variables to be pre-declared — it initializes them"
  status: failed
  reason: "User reported: DREAD X$ reports 'Could not resolve reference to NamedElement named X$' even though DREAD is initializing/reading that variable — it shouldn't require X$ to already exist"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
