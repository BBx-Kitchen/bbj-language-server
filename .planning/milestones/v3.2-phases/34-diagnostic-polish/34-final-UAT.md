---
status: diagnosed
phase: 34-diagnostic-polish
source: 34-01-SUMMARY.md, 34-02-SUMMARY.md, 34-03-SUMMARY.md
started: 2026-02-08T07:00:00Z
updated: 2026-02-08T07:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Settings show "BBj" capitalization
expected: Open VS Code Settings, search "bbj". The Auto Save description reads "Auto Save upon run of BBj program" (capital B, capital B, lowercase j). The group header "Bbj:" is expected (platform limitation).
result: pass

### 2. USE with non-existent file shows error diagnostic
expected: In a .bbj file, type `use ::nonexistent/fake.bbj::SomeClass`. The `nonexistent/fake.bbj` portion (between the `::` delimiters) should show a red squiggly error. The error message should include "could not be resolved" AND list the directories that were searched (e.g., "Searched: /path/to/workspace/..., /prefix1/..., /prefix2/...").
result: pass

### 3. USE with valid workspace-local file shows no file-path error
expected: In a .bbj file, create a USE statement referencing an actual .bbj file that exists in the workspace (e.g., `use ::SomeExistingFile.bbj::ClassName`). There should be NO "could not be resolved" error on the file path portion. (There may be class-level errors if the class name doesn't match — that's separate.)
result: pass

### 4. PREFIX-resolved files show no false error after loading
expected: Open a BBj workspace that uses PREFIX directories. USE statements referencing files that exist in PREFIX directories (e.g., `use ::BBjGridExWidget/BBjGridExWidget.bbj::BBjGridExWidget`) should initially show an error but it should CLEAR within a few seconds as the language server loads PREFIX documents. After loading completes, no "could not be resolved" error should remain for valid PREFIX files.
result: issue
reported: "NO PASS. Still error, but the file is in the PREFIX (it's /Users/beff/bbx/plugins/BBjGridExWidget/BBjGridExWidget.bbj) that shows now in the error: File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Searched: [26 PREFIX paths listed, correct path /Users/beff/bbx/plugins/BBjGridExWidget/BBjGridExWidget.bbj IS in the list]. The searched paths feature works but reconciliation still doesn't clear the error for files that exist."
severity: major

### 5. Code completion works on BBjAPI()
expected: Type `api! = BBjAPI()` then on the next line type `api!.` — code completion should show BBjAPI methods (e.g., makeVector, getConfig, etc.). No linker error on the BBjAPI() call.
result: pass

### 6. Ctrl-click on USE class navigates to definition
expected: In a USE statement like `use ::SomeFile.bbj::ClassName`, Ctrl-click (or Cmd-click on Mac) on the class name should navigate to the class definition in the referenced file.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "USE statements referencing files that resolve via PREFIX directories show no false error after language server finishes loading"
  status: failed
  reason: "User reported: File exists at /Users/beff/bbx/plugins/BBjGridExWidget/BBjGridExWidget.bbj (confirmed in searched paths list) but error persists. Reconciliation finds the path but still doesn't clear the diagnostic."
  severity: major
  test: 4
  root_cause: "addImportedBBjDocuments loads PREFIX files without checking if they're binary/tokenized (<<bbj>> header). Binary files parse with no BbjClass nodes, so class never enters index. Also needs runtime logging to diagnose PREFIX ordering (25+ dirs, first match wins) and parse errors in loaded files."
  artifacts:
    - path: "bbj-vscode/src/language/bbj-document-builder.ts"
      issue: "addImportedBBjDocuments line 143 - no binary file check before fromString()"
  missing:
    - "Add binary file detection (<<bbj>> header) to skip tokenized files"
    - "Add runtime logging for loaded PREFIX files (class count, parse errors)"
    - "Add post-index verification that expected BbjClass is in index"
  debug_session: ".planning/debug/prefix-reconciliation-final.md"
