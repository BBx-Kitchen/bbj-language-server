---
status: diagnosed
phase: 34-diagnostic-polish
source: 34-01-SUMMARY.md, 34-02-SUMMARY.md
started: 2026-02-08T06:15:00Z
updated: 2026-02-08T06:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings Description Capitalization
expected: Open VS Code Settings (Cmd+,), search for "bbj". The "Auto Save upon run" setting description should read "Auto Save upon run of BBj program" — not "bbj". (Section headers like "Bbj:" are a known VS Code platform limitation and are excluded from this test.)
result: pass

### 2. USE with Non-Existent File Path Shows Error
expected: In a .bbj file, type `use ::nonexistent/file.bbj::SomeClass`. A red squiggly error should appear on the `::nonexistent/file.bbj::` portion with a message containing "could not be resolved".
result: pass

### 3. USE with Valid Workspace File Path Shows No Error
expected: In a .bbj file, USE a class from another BBj file that exists directly in your workspace (e.g., `use ::localfile.bbj::LocalClass`). No file-path error diagnostic should appear on the `::path::` portion.
result: pass

### 4. USE with PREFIX-Resolved File Path Shows No Error (Gap Retest)
expected: In a .bbj file, USE a class from a BBj file that resolves via a PREFIX directory (not directly in the workspace). After the language server finishes loading, no false "could not be resolved" error should appear. Any brief flash of error during initial load is acceptable as long as it clears automatically.
result: issue
reported: "Still seeing File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Check the file path and PREFIX configuration. Idea: can we add the PREFIX that was searched to the error message? List the directories?"
severity: major

### 5. Genuinely Broken File Paths Keep Their Error
expected: A USE statement referencing a file that does NOT exist in the workspace or any PREFIX directory should continue to show the "could not be resolved" error. The PREFIX reconciliation should NOT remove errors for genuinely missing files.
result: skipped
reason: Depends on Test 4 (proper PREFIX resolution) which failed

## Summary

total: 5
passed: 3
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "USE statements referencing files that resolve via PREFIX directories show no false error after language server finishes loading"
  status: failed
  reason: "User reported: Still seeing File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Check the file path and PREFIX configuration. Idea: can we add the PREFIX that was searched to the error message? List the directories?"
  severity: major
  test: 4
  root_cause: "Three compounding bugs: (1) URI-to-fsPath cross-format endsWith comparison is fragile and fails on path normalization differences, (2) silent catch blocks in addImportedBBjDocuments hide file loading failures, (3) error message doesn't list searched PREFIX directories"
  artifacts:
    - path: "bbj-vscode/src/language/bbj-document-builder.ts"
      issue: "endsWith comparison between URI string and fsPath at line 199; silent catch at lines 136-138"
    - path: "bbj-vscode/src/language/bbj-validator.ts"
      issue: "Same endsWith comparison at line 310; error message lacks PREFIX paths at line 314"
    - path: "bbj-vscode/src/language/bbj-scope.ts"
      issue: "Same endsWith comparison at line 230"
  missing:
    - "Replace endsWith with proper fsPath-to-fsPath equality in all 3 locations"
    - "Add logging to addImportedBBjDocuments catch blocks"
    - "Include searched PREFIX directories in error message"
    - "Enable and fix skipped PREFIX test in imports.test.ts"
  debug_session: ".planning/phases/34-diagnostic-polish/34-re-DEBUG-PREFIX.md"
