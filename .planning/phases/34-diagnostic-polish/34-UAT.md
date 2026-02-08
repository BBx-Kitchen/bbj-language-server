---
status: complete
phase: 34-diagnostic-polish
source: 34-01-SUMMARY.md
started: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:04:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings show "BBj" capitalization
expected: Open VS Code Settings (Cmd+,), search for "bbj". The setting "Auto Save upon run of BBj program" should show "BBj" with capital B, capital B, lowercase j — not "bbj" or "Bbj".
result: issue
reported: "The headlines say 'Bbj: Classpath' so it looks wrong"
severity: major

### 2. USE with bad file path shows error diagnostic
expected: In a .bbj file, type `use ::nonexistent/file.bbj::SomeClass`. A red squiggly error should appear on the `::nonexistent/file.bbj::` portion (not the entire line). Hovering shows a message containing "could not be resolved".
result: pass

### 3. USE with valid file path shows no error
expected: In a .bbj file with a valid USE statement like `use ::somefile.bbj::ClassName` where the referenced file exists in your workspace or PREFIX path, no new error diagnostic should appear on the file path portion.
result: issue
reported: "not completely. Only works when the referenced class file is in the project. If it needs resolution over PREFIX it does not work"
severity: major

### 4. Existing USE statements still work
expected: Open an existing .bbj file that uses `use` statements with Java classes (e.g., `use java.util.HashMap`). These should continue to work as before — no new errors or changed behavior on Java class imports.
result: pass

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "VS Code settings panel shows 'BBj' (capital B, capital B, lowercase j) in all setting labels"
  status: failed
  reason: "User reported: The headlines say 'Bbj: Classpath' so it looks wrong"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "USE statements referencing valid (indexed) file paths produce no new diagnostics"
  status: failed
  reason: "User reported: not completely. Only works when the referenced class file is in the project. If it needs resolution over PREFIX it does not work"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
