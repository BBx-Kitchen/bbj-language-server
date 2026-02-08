---
status: diagnosed
trigger: "PREFIX diagnostic reconciliation not clearing false 'could not be resolved' errors for USE statements referencing files in PREFIX directories"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: Three bugs compound: fragile URI comparison, silent file loading failures, unhelpful error messages
test: Full code trace of document builder, validator, scope provider, and Langium internals
expecting: N/A - diagnosis complete
next_action: Implement fixes per priority order in 34-re-DEBUG-PREFIX.md

## Symptoms

expected: After PREFIX docs load, revalidateUseFilePathDiagnostics should clear "could not be resolved" errors for USE statements whose files exist in PREFIX directories
actual: `use ::BBjGridExWidget/BBjGridExWidget.bbj::BBjGridExWidget` still shows error even after PREFIX docs are loaded
errors: "File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Check the file path and PREFIX configuration."
reproduction: Open a file with USE statement referencing a PREFIX-directory file; wait for PREFIX docs to load
started: After phase 34-02 implementation

## Eliminated

- hypothesis: Reconciliation method not being called
  evidence: Code path confirmed - called at bbj-document-builder.ts:55 after addImportedBBjDocuments
  timestamp: 2026-02-08

- hypothesis: Diagnostic message prefix mismatch
  evidence: USE_FILE_NOT_RESOLVED_PREFIX = "File '" matches message "File 'BBjGridExWidget/...'" correctly
  timestamp: 2026-02-08

- hypothesis: Path extraction regex fails
  evidence: /^File '([^']+)'/ correctly extracts "BBjGridExWidget/BBjGridExWidget.bbj" from the message
  timestamp: 2026-02-08

- hypothesis: PREFIX doc not indexed before reconciliation runs
  evidence: Langium buildDocuments indexes ALL docs before validating ANY. Inner update->buildDocuments call indexes PREFIX doc before workspace doc re-validation.
  timestamp: 2026-02-08

- hypothesis: notifyDocumentPhase doesn't send diagnostics to editor
  evidence: Langium addDiagnosticsHandler registers onDocumentPhase(Validated) listener that calls connection.sendDiagnostics
  timestamp: 2026-02-08

- hypothesis: Validation categories exclude checkUsedClassExists in update builds
  evidence: updateBuildOptions has categories ['built-in', 'fast']; checkUsedClassExists defaults to 'fast' category
  timestamp: 2026-02-08

## Evidence

- timestamp: 2026-02-08
  checked: URI comparison in reconciliation (bbj-document-builder.ts:199)
  found: Uses endsWith between URI.toString() and URI.fsPath - cross-format comparison
  implication: Works on macOS but fragile; fails on Windows; could fail with path normalization differences

- timestamp: 2026-02-08
  checked: File loading error handling (bbj-document-builder.ts:136-138)
  found: catch block is empty - no logging when readFile fails for a PREFIX path
  implication: If file fails to load from ALL prefixes, failure is completely silent

- timestamp: 2026-02-08
  checked: Error message format (bbj-validator.ts:314)
  found: Message says "Check the file path and PREFIX configuration" but doesn't list which paths were searched
  implication: User cannot debug PREFIX configuration issues from the error message alone

- timestamp: 2026-02-08
  checked: Same endsWith comparison in 3 locations
  found: bbj-document-builder.ts:199, bbj-validator.ts:310, bbj-scope.ts:230 all use identical fragile comparison
  implication: All 3 would need to be fixed consistently

- timestamp: 2026-02-08
  checked: Relink path during initial build
  found: shouldRelink correctly identifies workspace docs with unresolved bbjClass references and resets them for re-validation
  implication: The relink path is the PRIMARY fix mechanism; reconciliation is a safety net

- timestamp: 2026-02-08
  checked: Test coverage
  found: PREFIX tests are SKIPPED (imports.test.ts:208 - describe.skip). No integration test for PREFIX reconciliation flow.
  implication: The reconciliation was never verified against real PREFIX configuration

## Resolution

root_cause: |
  Three compounding issues:
  1. URI-to-fsPath cross-format comparison (endsWith on different formats) - fragile
  2. Silent failure when PREFIX file loading fails - no logging
  3. Error message lacks PREFIX paths searched - user cannot debug

  Full analysis: .planning/phases/34-diagnostic-polish/34-re-DEBUG-PREFIX.md

fix: Not applied (diagnosis-only mode)
verification: Not applicable
files_changed: []
