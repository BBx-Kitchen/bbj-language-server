---
status: diagnosed
trigger: "PREFIX diagnostic reconciliation doesn't clear 'could not be resolved' error even though correct file path IS in searched paths list"
created: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:00:00Z
---

## Current Focus

hypothesis: The re-link path works correctly in theory but fails in practice due to a race condition between the outer build's diagnostics notification and the inner build's correction. The reconciliation safety net also fails because it checks the same documents array whose diagnostics were already sent to the editor by the outer build.
test: Full code trace of outer build -> inner update -> reconciliation flow
expecting: N/A - diagnosis complete
next_action: Implement fix per root cause analysis below

## Symptoms

expected: After PREFIX docs load via addImportedBBjDocuments, the 'could not be resolved' error should be cleared (either by re-link re-validation or by reconciliation safety net)
actual: Error persists in editor showing "File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Searched: [paths including correct path]"
errors: "File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Searched: ..."
reproduction: Open a workspace with USE statement referencing a file in a PREFIX directory. Wait for language server to finish loading.
started: After phase 34-02 implementation

## Eliminated

- hypothesis: URI-to-fsPath cross-format endsWith comparison (Root Cause 1 from 34-re-DEBUG-PREFIX.md)
  evidence: All three comparison locations (bbj-document-builder.ts:201, bbj-validator.ts:310, bbj-scope.ts:230) already use normalize(x.fsPath).toLowerCase() === normalize(y.fsPath).toLowerCase() with strict equality. The endsWith bug has been fixed.
  timestamp: 2026-02-08

- hypothesis: Silent failure when PREFIX file loading fails (Root Cause 2 from 34-re-DEBUG-PREFIX.md)
  evidence: Logging is already in place - catch block at line 137 logs console.debug, and line 141 logs console.warn when no prefix finds the file.
  timestamp: 2026-02-08

- hypothesis: Error message lacks PREFIX path information (Root Cause 3 from 34-re-DEBUG-PREFIX.md)
  evidence: Error message at bbj-validator.ts:315 already includes "Searched:" with all searched paths via searchedPaths.join(', ').
  timestamp: 2026-02-08

- hypothesis: Reconciliation not called
  evidence: Code path confirmed at bbj-document-builder.ts:55 - called after addImportedBBjDocuments when !isImportingBBjDocuments
  timestamp: 2026-02-08

- hypothesis: Diagnostic message prefix mismatch
  evidence: USE_FILE_NOT_RESOLVED_PREFIX = "File '" matches the message "File 'BBjGridExWidget/...'" correctly
  timestamp: 2026-02-08

- hypothesis: Path extraction regex fails
  evidence: /^File '([^']+)'/ correctly extracts the clean path from the error message
  timestamp: 2026-02-08

- hypothesis: checkUsedClassExists not run during update builds
  evidence: Registered without category (defaults to 'fast'). updateBuildOptions has categories ['built-in', 'fast']. Both match.
  timestamp: 2026-02-08

- hypothesis: shouldValidate returns false for workspace docs during inner build
  evidence: Inner build uses updateBuildOptions (validation truthy). super.shouldValidate returns true. !isExternalDocument returns true for workspace docs.
  timestamp: 2026-02-08

- hypothesis: shouldRelink returns false (workspace doc not re-linked)
  evidence: During import mode (isImportingBBjDocuments=true), shouldRelink checks document.references for errors. The bbjClass ref has a LinkingError from initial linking (PREFIX not in index). Returns true.
  timestamp: 2026-02-08

- hypothesis: PREFIX doc BbjClass not exported by collectExportedSymbols
  evidence: collectExportedSymbols filters with isClass(child), which matches BbjClass (extends Class). BbjClass is a direct child of Program via statements property.
  timestamp: 2026-02-08

- hypothesis: allElements(BbjClass.$type) doesn't match subtypes
  evidence: DefaultIndexManager.getFileDescriptions uses astReflection.isSubtype(e.type, nodeType) for filtering.
  timestamp: 2026-02-08

## Evidence

- timestamp: 2026-02-08
  checked: Previous debug research (34-re-DEBUG-PREFIX.md) root causes vs actual code
  found: All three "root causes" from previous research have ALREADY been fixed in the current codebase. The endsWith comparison is now normalize+fsPath+equality. Logging exists. Error messages include searched paths. Yet the bug persists.
  implication: The actual root cause is different from what was previously diagnosed. A fourth issue exists.

- timestamp: 2026-02-08
  checked: Initial workspace build options
  found: DefaultWorkspaceManager.initialBuildOptions = {} (empty object). validation is undefined. shouldValidate returns false. NO validation runs during initial workspace build.
  implication: The error is NOT produced during initial workspace build. It's produced during subsequent update cycles (when updateBuildOptions with validation enabled is used).

- timestamp: 2026-02-08
  checked: Outer build -> inner update flow during update cycle
  found: When update triggers buildDocuments -> super.buildDocuments validates my.bbj (PREFIX not loaded yet, error emitted) -> addImportedBBjDocuments loads PREFIX -> inner update re-links and re-validates my.bbj (PREFIX now in index, error NOT emitted) -> notifyDocumentPhase sends clean diagnostics
  implication: The re-link path SHOULD clear the error. But there's a timing issue: the outer build's notifyDocumentPhase already sent the ERROR diagnostics to the editor before the inner build sends the CLEAN diagnostics.

- timestamp: 2026-02-08
  checked: Diagnostic notification ordering
  found: During super.buildDocuments Phase 6 (Validate), notifyDocumentPhase is called for each validated document. This sends diagnostics with the error to the editor. Later, the inner build's Phase 6 sends clean diagnostics. The editor should receive BOTH and display the LAST one.
  implication: If the LSP connection handles messages correctly (FIFO), the clean diagnostics should overwrite the error diagnostics. The bug may be that this override doesn't happen reliably.

- timestamp: 2026-02-08
  checked: The reconciliation as safety net
  found: revalidateUseFilePathDiagnostics runs AFTER addImportedBBjDocuments. At this point, my.bbj has already been re-validated by the inner build (clean diagnostics). The reconciliation finds nothing to remove. It's a no-op.
  implication: The reconciliation only helps if the inner build does NOT re-validate. This happens when shouldRelink returns false (no reference errors). But in the typical case, shouldRelink returns true (bbjClass ref has error).

- timestamp: 2026-02-08
  checked: What happens when addImportedBBjDocuments finds NO new documents to load
  found: If all PREFIX files were already loaded in a previous cycle (hasDocument returns true), addedDocuments is empty, update is NOT called, and re-validation does NOT happen. The error from the outer build persists.
  implication: This is a REAL scenario: after the first build cycle loads PREFIX files, subsequent update cycles skip loading (files already in langiumDocuments). The workspace document gets validated with PREFIX files already in the index, so no error is emitted in subsequent cycles. BUT if the PREFIX file's symbols were somehow lost from the index...

- timestamp: 2026-02-08
  checked: Whether PREFIX document symbols survive between update cycles
  found: PREFIX documents are added to langiumDocuments but never removed. Their symbolIndex entries are set during indexing and only cleared by removeContent (called during resetToState or remove). The BBjIndexManager.isAffected override prevents external docs from being rebuilt when only workspace docs change.
  implication: PREFIX symbols SHOULD persist across update cycles. Unless something triggers a reset.

- timestamp: 2026-02-08
  checked: BBjIndexManager.isAffected behavior for external documents
  found: At bbj-index-manager.ts:21-25, if NOT all changedUris are external AND the document IS external, isAffected returns false. This means external (PREFIX) docs are NOT rebuilt when workspace docs change.
  implication: Correct behavior - PREFIX docs should not be rebuilt on workspace changes. Their symbols persist.

- timestamp: 2026-02-08
  checked: The critical edge case for the FIRST update after workspace init
  found: |
    During initial workspace build: options={}, validation NOT run, no diagnostics emitted.
    addImportedBBjDocuments runs, loads PREFIX files, inner update rebuilds workspace docs with updateBuildOptions (validation enabled).
    This is the FIRST time validation runs for workspace docs.
    PREFIX files are already in the index (indexed during inner build's Phase 2 BEFORE workspace docs are validated in Phase 6).
    So checkUsedClassExists SHOULD find the BbjClass. No error.

    BUT: What if the BbjClass in the PREFIX file doesn't have a class name matching what the USE statement expects? Or what if the file has parse errors?
    The file might be a tokenized/binary BBj file (starts with <<bbj>>) that can't be parsed.
  implication: The most likely PRACTICAL cause is that the PREFIX file either doesn't parse correctly or doesn't contain the expected class declaration.

## Resolution

root_cause: |
  After exhaustive analysis of the entire code flow (validator, document builder, Langium internals,
  scope provider, linker, index manager, workspace manager), the previous three "root causes" have
  ALL been fixed in the current codebase. The actual remaining issues are:

  **PRIMARY ROOT CAUSE: The re-link path works correctly but has no diagnostic observability.**

  The entire PREFIX resolution pipeline (load file -> index -> re-link -> re-validate -> send diagnostics)
  works correctly IN THEORY. The code flow is sound:
  1. Outer build validates workspace docs (PREFIX not loaded -> error emitted -> diagnostics sent to editor)
  2. addImportedBBjDocuments loads PREFIX files
  3. Inner update re-links workspace docs (PREFIX now in index -> ref resolves)
  4. Inner build re-validates (no error emitted -> clean diagnostics sent to editor)

  The error SHOULD be cleared by step 4's notifyDocumentPhase sending clean diagnostics.

  If the error persists, it means one of these runtime conditions:

  A. **The PREFIX file doesn't parse correctly** (tokenized/binary .bbj file, syntax errors, no CLASS declaration)
     - addImportedBBjDocuments reads the file content but the parser produces no BbjClass nodes
     - collectExportedSymbols exports nothing for that document
     - allElements(BbjClass.$type) finds no matching class
     - The error persists because there IS no class in the index

  B. **The PREFIX file IS parsed but the class has a different name than expected**
     - e.g., file defines CLASS PUBLIC GridExWidget but USE expects BBjGridExWidget
     - getBBjClassesFromFile finds no matching class in the scope
     - checkUsedClassExists finds no matching class by file URI (there IS a class but its name doesn't match the USE ref)
     - Wait -- checkUsedClassExists checks by FILE URI, not by class name. It should still find it.
     - Actually, checkUsedClassExists checks allElements(BbjClass.$type).some(bbjClass => adjustedFileUris.some(uri => path_match))
     - This only checks if ANY BbjClass exists at the file URI. It doesn't check the class name.
     - So even if the class name is different, the FILE PATH check would pass.
     - But the bbjClass cross-reference would still fail (wrong name in scope).
     - Result: FILE PATH error is cleared, but a separate LINKING error would appear for the unresolved class reference.

  C. **The PREFIX path resolution produces a different URI than the loaded document's URI**
     - addImportedBBjDocuments uses URI.file(resolve(prefixPath, importPath))
     - checkUsedClassExists uses URI.file(resolve(prefixPath, cleanPath))
     - Both use the same resolve() call with the same prefix path and same clean path
     - The URIs should be identical
     - UNLESS prefixPath has inconsistencies (trailing slash vs no trailing slash, symlinks, etc.)
     - resolve() handles trailing slashes correctly
     - But symlinks could cause URI.file to produce different paths

  D. **addImportedBBjDocuments fails silently for the specific file**
     - readFile succeeds for the file but returns content that can't be parsed
     - Or readFile throws but the catch block only logs at debug level
     - With 25+ PREFIX directories, the correct file might be shadowed by an earlier PREFIX
     - The PREFIX order matters: the FIRST matching prefix wins (break at line 135)

  **RECOMMENDED FIX: Add comprehensive runtime logging to diagnose the exact failure point.**

  The code has the correct structure but lacks observability to determine which runtime condition
  is causing the failure. The fix should add logging at each critical decision point so the exact
  failure can be identified from the language server output.

fix: |
  Add diagnostic logging to identify the exact runtime failure point:

  1. In addImportedBBjDocuments (bbj-document-builder.ts):
     - Log each USE statement found and its clean path
     - Log each PREFIX path tried with success/failure and reason
     - Log whether the document was already in langiumDocuments (hasDocument check)
     - Log how many BbjClass nodes were exported after indexing the PREFIX doc

  2. In the inner update path:
     - Log which workspace documents are being re-linked (shouldRelink returned true)
     - Log the result of re-validation (how many diagnostics before vs after)

  3. In revalidateUseFilePathDiagnostics:
     - Log how many USE file path diagnostics were found
     - Log whether each one was resolved (nowResolved) or not
     - Log the BbjClass entries found in the index for the relevant URIs

  4. In checkUsedClassExists:
     - Log the number of BbjClass entries in allElements
     - Log the URI comparison results for the relevant file

verification: Not yet applied
files_changed: []
