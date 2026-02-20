# DEBUG: PREFIX Diagnostic Reconciliation Not Clearing False Errors

**Status:** Root cause analysis complete
**Date:** 2026-02-08

## Summary

After thorough investigation of the entire code path (validator, document builder, Langium internals, scope provider, linker, workspace manager), the reconciliation logic in `revalidateUseFilePathDiagnostics` is **architecturally correct** but has **three bugs** and **missing observability** that prevent it from working reliably.

---

## ROOT CAUSE 1: URI-to-fsPath Cross-Format Comparison (Bug in `endsWith` logic)

**Location:** `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts`, lines 197-201

```typescript
const nowResolved = this.indexManager.allElements(BbjClass.$type).some(bbjClass => {
    return adjustedFileUris.some(adjustedFileUri =>
        bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())
    );
});
```

**Problem:** This compares a URI string (`file:///path/to/file.bbj`) against a filesystem path (`/path/to/file.bbj`) using `endsWith`. While this works by coincidence on macOS/Linux (because the URI path portion equals the fsPath prefixed with `file:///`), it is:

1. **Fragile:** Depends on the URI scheme being `file:` and the path not having percent-encoded characters
2. **Wrong on Windows:** URI uses `file:///c%3A/path/file.bbj` while fsPath uses `c:\path\file.bbj` -- forward vs backslashes, colon encoding
3. **Inconsistent with proper URI comparison:** Should compare `documentUri.toString()` with `adjustedFileUri.toString()`, or `documentUri.fsPath` with `adjustedFileUri.fsPath`

**This same flawed comparison exists in 3 places:**
- `bbj-document-builder.ts:199` (reconciliation)
- `bbj-validator.ts:310` (initial validation)
- `bbj-scope.ts:230` (scope resolution)

**Why scope resolution works anyway:** On macOS, the `endsWith` comparison happens to produce the correct result because both `documentUri.toString()` and `adjustedFileUri.fsPath` use forward slashes. But if there's any path normalization difference (symlinks, `.`/`..` components, double slashes, case mismatches beyond lowercase), the comparison fails.

**Fix direction:** Change all three locations to compare URIs consistently:
```typescript
bbjClass.documentUri.fsPath.toLowerCase() === adjustedFileUri.fsPath.toLowerCase()
// or
bbjClass.documentUri.toString() === adjustedFileUri.toString()
```
Using exact equality instead of `endsWith` also avoids false positives where one path is a suffix of another.

---

## ROOT CAUSE 2: Silent Failure When PREFIX File Loading Fails

**Location:** `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts`, lines 130-138

```typescript
for (const prefixPath of prefixes) {
    const prefixedPath = URI.file(resolve(prefixPath, importPath));
    try {
        const fileContent = await fsProvider.readFile(prefixedPath);
        docFileData = { uri: prefixedPath, text: fileContent };
        break;
    } catch (e) {
        // Continue to the next prefixPath if readFile fails  <-- SILENT!
    }
}
```

**Problem:** When `readFile` fails for ALL prefix paths, there is absolutely NO logging. The file simply isn't loaded, and the false diagnostic persists. The user has no way to diagnose why.

If the PREFIX directories are configured incorrectly, or the file doesn't exist at the expected path, or there's a permissions issue, or the path has encoding issues, the failure is completely invisible.

**This is the most likely practical cause of the reported bug.** The user sees the diagnostic and thinks reconciliation failed, when in reality the file was never loaded in the first place.

**Fix direction:** Add logging when file loading fails:
```typescript
catch (e) {
    console.debug(`[PREFIX] File not found at ${prefixedPath.fsPath}: ${e}`);
}
// After the prefix loop:
if (!docFileData) {
    console.warn(`[PREFIX] Could not load '${importPath}' from any PREFIX path. Searched: ${prefixes.join(', ')}`);
}
```

---

## ROOT CAUSE 3: Error Message Lacks PREFIX Path Information

**Location:** `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-validator.ts`, line 314

```typescript
accept('error', `File '${cleanPath}' could not be resolved. Check the file path and PREFIX configuration.`, {
    node: use,
    property: 'bbjFilePath'
});
```

**Problem:** The error message tells the user "Check the file path and PREFIX configuration" but doesn't tell them:
- WHICH PREFIX directories were searched
- WHETHER any PREFIX directories are configured at all
- What the full resolved paths would be

This makes debugging PREFIX configuration issues nearly impossible.

**Fix direction:** Include searched paths in the error message:
```typescript
const searchedPaths = [
    UriUtils.resolvePath(UriUtils.dirname(currentDocUri), cleanPath).fsPath,
    ...prefixes.map(p => resolve(p, cleanPath))
];
accept('error', `File '${cleanPath}' could not be resolved. Check the file path and PREFIX configuration. Searched: ${searchedPaths.join(', ')}`, {
    node: use,
    property: 'bbjFilePath'
});
```

**IMPORTANT:** If the error message format changes, the reconciliation method's regex (`/^File '([^']+)'/`) must still work. The path extraction only reads up to the first `'`, so appending " Searched: ..." after the existing message is safe.

---

## Detailed Flow Analysis

### Why the Relink Path Usually Works (But Isn't Sufficient)

During the initial workspace build:

1. `buildDocuments(allWorkspaceDocs)` validates workspace docs -- PREFIX docs NOT in index -- false error produced
2. `addImportedBBjDocuments` loads PREFIX docs, calls `this.update(addedDocuments, [])`
3. Inside `update()`: `shouldRelink(wsDoc, prefixDocUris)` checks `document.references.some(ref => ref.error !== undefined)` during import mode
4. The `bbjClass` cross-reference on the USE statement has a linking error (scope was empty during initial linking)
5. Workspace doc reset to `ComputedScopes`, diagnostics cleared (`document.diagnostics = undefined`)
6. Inner `buildDocuments` re-links workspace doc (PREFIX doc now indexed -- reference resolves)
7. Re-validation runs `checkUsedClassExists` -- PREFIX doc in index -- NO error produced
8. Clean diagnostics sent to editor via `notifyDocumentPhase`

**This path works correctly when:**
- The PREFIX doc loads successfully
- The PREFIX doc contains BbjClass declarations
- The PREFIX doc is parseable
- The `bbjClass` reference had a linking error (causing shouldRelink to return true)

### Why the Reconciliation Safety Net Is Needed

The reconciliation (`revalidateUseFilePathDiagnostics`) handles edge cases where the relink path doesn't fire:
- Documents without unresolved references (all refs resolved to wrong targets)
- Documents that aren't in the relink candidates for other reasons

### Langium Internals Verified

| Component | Behavior | Verified |
|-----------|----------|----------|
| `buildDocuments` | Phases run sequentially: Parse -> Index -> Scope -> Link -> Validate. ALL docs indexed before ANY validated. | YES |
| `resetToState(ComputedScopes)` | Clears diagnostics (`diagnostics = undefined`), unlinks references | YES |
| `validate()` | APPENDS to diagnostics (line 632: `push()`), or sets new array if undefined | YES |
| `updateBuildOptions` | Categories `['built-in', 'fast']`. `checkUsedClassExists` defaults to `'fast'`. Both run during update builds. | YES |
| `shouldValidate` | External docs skipped, workspace docs validated | YES |
| `shouldRelink` | During import: checks refs for errors. Otherwise: `isAffected` only. | YES |
| `notifyDocumentPhase` | Triggers `onDocumentPhase` listeners, which call `connection.sendDiagnostics()` | YES |
| `collectExportedSymbols` | Exports `BbjClass` (via `isClass` which matches subtypes) | YES |

---

## Files Involved

| File | Lines | What |
|------|-------|------|
| `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts` | 128-147 | `addImportedBBjDocuments` - PREFIX doc loading (silent failures) |
| `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts` | 163-212 | `revalidateUseFilePathDiagnostics` - reconciliation (endsWith bug) |
| `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-validator.ts` | 297-320 | `checkUsedClassExists` - initial validation (endsWith bug, missing paths in message) |
| `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-scope.ts` | 219-236 | `getBBjClassesFromFile` - scope resolution (endsWith bug) |

---

## Recommended Fix Approach

### Priority 1: Add Observability (Root Cause 2)

Add logging to `addImportedBBjDocuments` so users and developers can see what PREFIX resolution is doing:
- Log each prefix path tried
- Log whether file was found
- Warn when no prefix finds the file

### Priority 2: Fix URI Comparison (Root Cause 1)

Change the `endsWith` comparison to proper URI comparison in all 3 locations:
```typescript
// Instead of:
bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())

// Use:
bbjClass.documentUri.fsPath.toLowerCase() === adjustedFileUri.fsPath.toLowerCase()
```

Note: Using exact `fsPath` equality instead of `endsWith` is correct because `adjustedFileUri` is already an absolute path (resolved via `resolve()` or `UriUtils.resolvePath`).

### Priority 3: Include PREFIX Paths in Error Message (Root Cause 3)

Modify the error message in `checkUsedClassExists` to include the list of paths searched:
```
File 'BBjGridExWidget/BBjGridExWidget.bbj' could not be resolved. Searched: /workspace/src/BBjGridExWidget/BBjGridExWidget.bbj, /prefix1/BBjGridExWidget/BBjGridExWidget.bbj, /prefix2/BBjGridExWidget/BBjGridExWidget.bbj
```

Update the reconciliation's path extraction regex if needed (current regex `/^File '([^']+)'/` would still work since it only reads up to the first `'`).

---

## Why the Existing Tests Don't Catch This

1. **Import tests use `EmptyFileSystem`** -- no real file I/O, PREFIX resolution never exercises real paths
2. **PREFIX tests are SKIPPED** (`describe.skip` at `/Users/beff/_workspace/bbj-language-server/bbj-vscode/test/imports.test.ts:208`) with comment "Needs additional adjustments in the document builder"
3. **No integration test** exercises the full flow: workspace init -> initial validation -> PREFIX doc loading -> reconciliation -> diagnostic update
4. **The reconciliation was designed based on theoretical analysis** (see 34-DEBUG-PREFIX.md and 34-02-PLAN.md) but never verified against a real PREFIX environment
