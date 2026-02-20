# Investigation: PREFIX File Path Validation False Errors

**Status:** Root cause identified
**Date:** 2026-02-08

## Problem Statement

User reports that `use ::somefile.bbj::ClassName` shows a false error "File 'somefile.bbj' could not be resolved" when the file exists and is resolved via PREFIX directories from config.bbx.

**Expected:** No error when file exists in PREFIX path
**Actual:** Error shown even though:
- File exists at PREFIX path
- Scope resolution works (code completion shows the class)
- References resolve correctly

## Root Cause

**Validation runs BEFORE external PREFIX-resolved documents are loaded and indexed.**

### Timeline of Events

1. **Workspace Build Starts** (`BBjDocumentBuilder.buildDocuments`)
   - Calls `super.buildDocuments(workspace documents)`
   - For each workspace document:
     - Parse → Index → Link → **VALIDATE**
   - Validator encounters `use ::somefile.bbj::ClassName`
   - `checkUsedClassExists` checks `IndexManager.allElements(BbjClass.$type)`
   - somefile.bbj **NOT YET LOADED** from PREFIX path
   - Reports error: "File 'somefile.bbj' could not be resolved"

2. **External Documents Loaded** (after validation completes)
   - `addImportedBBjDocuments` executes
   - Scans workspace documents for USE statements
   - Loads somefile.bbj from PREFIX directory
   - Adds to IndexManager
   - **Too late** - validation already ran

### Why Scope Resolution Works

Scope resolution (`getBBjClassesFromFile`) is **lazy** - it runs:
- During code completion (user action)
- During reference resolution (on-demand)

By the time these execute, external documents have been loaded and indexed.

### Why Validation Fails

Validation is **eager** - it runs during the initial build phase, before external documents are discovered and loaded.

## Technical Details

### Code Locations

1. **Validator** (`bbj-validator.ts:280-318`)
   ```typescript
   checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
       if (use.bbjFilePath) {
           // Builds list of possible URIs (current dir + PREFIX dirs)
           const adjustedFileUris = [
               UriUtils.resolvePath(UriUtils.dirname(currentDocUri), cleanPath)
           ].concat(
               prefixes.map(prefixPath => URI.file(resolve(prefixPath, cleanPath)))
           );

           // Checks if any BbjClass exists at these URIs
           const resolved = this.indexManager.allElements(BbjClass.$type).some(bbjClass => {
               return adjustedFileUris.some(adjustedFileUri =>
                   bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())
               );
           });

           if (!resolved) {
               accept('error', `File '${cleanPath}' could not be resolved...`);
           }
       }
   }
   ```

2. **Scope Provider** (`bbj-scope.ts:219-236`)
   ```typescript
   private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
       // IDENTICAL logic to validator
       let bbjClasses = this.indexManager.allElements(BbjClass.$type).filter(bbjClass => {
           return adjustedFileUris.some(adjustedFileUri =>
               bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase())
           );
       })
       return new StreamScopeWithPredicate(bbjClasses);
   }
   ```

   **Both use identical logic** - the only difference is **timing**.

3. **Document Builder** (`bbj-document-builder.ts:42-50`)
   ```typescript
   protected override async buildDocuments(documents, options, cancelToken) {
       await super.buildDocuments(documents, options, cancelToken);  // ← Validation happens here

       // Skip if we're already inside an import cycle
       if (!this.isImportingBBjDocuments) {
           await this.addImportedBBjDocuments(documents, options, cancelToken);  // ← External docs loaded here
       }
   }
   ```

4. **External Document Loading** (`bbj-document-builder.ts:83-149`)
   ```typescript
   async addImportedBBjDocuments(documents, options, cancelToken) {
       // Only scan workspace documents for USE statements
       const workspaceDocuments = documents.filter(doc => !bbjWsManager.isExternalDocument(doc.uri));

       const bbjImports = new Set<string>();
       for (const document of workspaceDocuments) {
           // Find all USE statements with bbjFilePath
           AstUtils.streamAllContents(document.parseResult.value)
               .filter(isUse)
               .forEach((use: Use) => {
                   if (use.bbjFilePath) {
                       const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
                       bbjImports.add(cleanPath);
                   }
               })
       }

       // Load files from PREFIX directories
       for (const importPath of bbjImports) {
           for (const prefixPath of prefixes) {
               try {
                   const prefixedPath = URI.file(resolve(prefixPath, importPath));
                   const fileContent = await fsProvider.readFile(prefixedPath);
                   const document = documentFactory.fromString(fileContent, prefixedPath);

                   if (!langiumDocuments.hasDocument(document.uri)) {
                       langiumDocuments.addDocument(document);
                       addedDocuments.push(document.uri);
                   }
                   break;
               } catch (e) {
                   // Try next PREFIX
               }
           }
       }

       if (addedDocuments.length > 0) {
           await this.update(addedDocuments, [], cancelToken);  // Indexes external docs
       }
   }
   ```

### Why External Documents ARE Indexed

External documents go through these states:
1. **Parsed** - AST built
2. **IndexedContent** - BbjClass exported to IndexManager ✓
3. **ComputedScopes** - Scopes computed
4. **Linked** - References linked (partial for external docs)
5. **Validated** - SKIPPED (`shouldValidate` returns false)

The `shouldValidate()` override only affects validation, not indexing:

```typescript
protected override shouldValidate(_document: LangiumDocument<AstNode>): boolean {
    if (this.wsManager().isExternalDocument(_document.uri)) {
        const validate = super.shouldValidate(_document)
            && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
        if (!validate) {
            _document.state = DocumentState.Validated;  // Skip validation
        }
        return validate;  // returns false
    }
    return super.shouldValidate(_document);
}
```

**External documents ARE indexed** - they just don't get validated (to avoid showing errors in library code).

## Solution Options

### Option 1: Re-validate after external docs loaded ⭐ RECOMMENDED
- After `addImportedBBjDocuments` completes and indexes external docs
- Re-run validation on workspace documents that have USE statements
- Update diagnostics for those documents

**Pros:**
- Minimal refactoring
- User sees correct diagnostics
- External docs properly indexed before check

**Cons:**
- Some performance overhead (double validation)
- Can be optimized to only re-validate specific USE nodes

### Option 2: Load external docs BEFORE validation
- Refactor `buildDocuments` to:
  1. Parse all workspace docs (but don't link/validate)
  2. Scan for USE statements
  3. Load external docs
  4. Index everything
  5. Then link and validate

**Pros:**
- Single validation pass
- Clean separation of concerns

**Cons:**
- Requires significant refactoring of Langium's build flow
- May need to override more Langium internals
- Complex changes to document state machine

### Option 3: Filesystem check instead of index check
- In validator, check if file exists on disk in PREFIX paths
- Don't rely on IndexManager

**Pros:**
- Works regardless of loading order

**Cons:**
- Filesystem I/O during validation (performance impact)
- Duplicates filesystem logic already in addImportedBBjDocuments
- Doesn't validate that file was actually parsed successfully

### Option 4: Make validator check lazy
- Don't validate USE statements during build
- Only validate when class is actually referenced elsewhere

**Pros:**
- No timing issues

**Cons:**
- User sees error at usage site, not at USE statement
- Less helpful error messages
- Reduces value of USE validation

### Option 5: Skip validation for PREFIX-resolved paths
- Detect if path would be resolved via PREFIX
- Skip validation for those cases

**Pros:**
- Simple to implement

**Cons:**
- Silent failures for typos in PREFIX paths
- Inconsistent validation (relative paths validated, PREFIX paths not)

## Recommended Fix

**Implement Option 1 with optimization:**

1. Track which workspace documents have USE statements during initial validation
2. After `addImportedBBjDocuments` completes:
   - Only re-run `checkUsedClassExists` on those specific USE nodes
   - Update diagnostics for affected documents
3. Use Langium's diagnostic manager to update errors

**Implementation approach:**
```typescript
// In BBjDocumentBuilder
protected override async buildDocuments(documents, options, cancelToken) {
    await super.buildDocuments(documents, options, cancelToken);

    if (!this.isImportingBBjDocuments) {
        const addedDocs = await this.addImportedBBjDocuments(documents, options, cancelToken);

        if (addedDocs.length > 0) {
            // Re-validate USE statements in workspace documents
            await this.revalidateUseStatements(documents, cancelToken);
        }
    }
}

private async revalidateUseStatements(documents, cancelToken) {
    // For each workspace document with USE statements:
    //   - Re-run checkUsedClassExists validator
    //   - Update diagnostics
}
```

## Files Involved

- **bbj-vscode/src/language/bbj-validator.ts** - Contains `checkUsedClassExists`
- **bbj-vscode/src/language/bbj-scope.ts** - Contains `getBBjClassesFromFile`
- **bbj-vscode/src/language/bbj-document-builder.ts** - Build sequencing
- **bbj-vscode/src/language/bbj-ws-manager.ts** - PREFIX path management

## Verification

To verify the fix works:
1. Create workspace document with `use ::lib/MyClass.bbj::MyClass`
2. Ensure MyClass.bbj exists in a PREFIX directory (not workspace)
3. Open workspace document
4. Verify NO error is shown on the USE statement
5. Verify code completion works after USE statement
6. Verify references to MyClass resolve correctly
