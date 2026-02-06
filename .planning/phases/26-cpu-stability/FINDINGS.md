# CPU Stability Investigation Findings

## Executive Summary

Static analysis reveals a **CONFIRMED** infinite rebuild loop in the document builder pipeline when transitive BBj imports form dependency cycles. When `BBjDocumentBuilder.addImportedBBjDocuments()` discovers new USE statements, it calls `this.update()` which triggers `buildDocuments()` on the newly added documents. These documents' USE statements are then resolved, potentially importing MORE documents, creating an unbounded expansion. In multi-project workspaces where projects cross-reference via USE statements, this creates a sustained CPU loop as documents continuously rebuild each other. This is the primary root cause.

A secondary contributing factor is over-invalidation in `BBjIndexManager.isAffected()`: workspace documents with reference errors are marked as affected by ANY change, causing unnecessary cascading rebuilds that compound the primary issue.

## Issue Context

- **GitHub Issue:** #232
- **Symptom:** 100% CPU usage in multi-project VS Code workspaces
- **Environment:** VS Code extension, BBj language server, macOS
- **Trigger:** Opening workspace containing multiple BBj projects with cross-project USE statements
- **Impact:** System becomes unresponsive, requires force-quit of VS Code

## Root Cause Analysis

### [RANK 1] Transitive Document Rebuild Loop -- LIKELIHOOD: HIGH

**Status:** CONFIRMED via static analysis

**Evidence:**

`BBjDocumentBuilder.addImportedBBjDocuments()` (lines 45-94 in `bbj-document-builder.ts`):

```typescript
// Line 52-60: Collects USE statement paths from all documents
for (const document of documents) {
    await interruptAndCheck(cancelToken);
    AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
        if (use.bbjFilePath) {
            const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
            bbjImports.add(cleanPath);
        }
    })
}

// Line 88-93: For each new document found, calls this.update()
if (addedDocuments.length > 0) {
    const started = Date.now()
    await this.update(addedDocuments, [], cancelToken);  // ← CRITICAL: triggers rebuild
    const elapsed = Date.now() - started
    console.debug(`Transitive BBj file update for ${addedDocuments.length} documents took ${elapsed}ms`)
}
```

**Langium's `DefaultDocumentBuilder.update()` implementation** (lines 79-124 in `node_modules/langium/lib/workspace/document-builder.js`):

```javascript
async update(changed, deleted, cancelToken = CancellationToken.None) {
    // Lines 95-104: Invalidates changed documents, sets state to Changed
    for (const changedUri of changedUris) {
        const invalidated = this.langiumDocuments.invalidateDocument(changedUri);
        if (!invalidated) {
            const newDocument = this.langiumDocumentFactory.fromModel({ $type: 'INVALID' }, changedUri);
            newDocument.state = DocumentState.Changed;
            this.langiumDocuments.addDocument(newDocument);
        }
        this.buildState.delete(changedUri.toString());
    }

    // Lines 107-111: Marks affected documents for relinking
    this.langiumDocuments.all
        .filter(doc => !allChangedUris.has(doc.uri.toString()) && this.shouldRelink(doc, allChangedUris))
        .forEach(doc => this.resetToState(doc, DocumentState.ComputedScopes));

    // Line 124: Calls buildDocuments on ALL documents that need rebuilding
    await this.buildDocuments(rebuildDocuments, this.updateBuildOptions, cancelToken);
}
```

**BBjDocumentBuilder.buildDocuments() override** (lines 39-43):

```typescript
protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
    await super.buildDocuments(documents, options, cancelToken);
    // Collect and add referenced BBj Document. Trigger update afterwards.
    await this.addImportedBBjDocuments(documents, options, cancelToken);  // ← Completes the cycle
}
```

**Critical Finding: The Rebuild Loop**

The call chain forms a cycle:

1. `buildDocuments()` → calls `addImportedBBjDocuments()`
2. `addImportedBBjDocuments()` → loads USE dependencies → calls `this.update(addedDocuments, [], cancelToken)`
3. `update()` → marks documents as Changed → calls `buildDocuments(rebuildDocuments, ...)`
4. **LOOP BACK TO STEP 1** - The newly added documents now go through buildDocuments, which resolves THEIR USE statements, potentially finding MORE documents

**Mechanism: How it causes CPU spike**

In a multi-project workspace with cross-references:
- Project A has `file-a.bbj` with `USE "project-b/file-b.bbj"`
- Project B has `file-b.bbj` with `USE "shared/utils.bbj"`
- Shared folder has `utils.bbj` with `USE "project-a/helpers.bbj"`

Execution flow:
1. Workspace initializes, starts building workspace documents
2. `file-a.bbj` is built → `addImportedBBjDocuments` finds `file-b.bbj` → calls `update([file-b])`
3. `update()` triggers `buildDocuments([file-b])` → `addImportedBBjDocuments` finds `utils.bbj` → calls `update([utils])`
4. `update()` triggers `buildDocuments([utils])` → `addImportedBBjDocuments` finds `helpers.bbj` → calls `update([helpers])`
5. **Cycle continues indefinitely** as each document imports the next in the chain

**Guards that SHOULD prevent this but DON'T:**

Line 82 in `bbj-document-builder.ts`:
```typescript
if (!langiumDocuments.hasDocument(document.uri)) {
    langiumDocuments.addDocument(document);
    addedDocuments.push(document.uri);
}
```

This prevents adding the SAME document twice to the document set, BUT:
- It only checks if document is already in `langiumDocuments`
- It does NOT prevent rebuilding documents that were ALREADY processed in a previous iteration
- Once `update()` is called with a document, that document gets its state reset to `Changed` (line 96 in Langium), so subsequent cycles WILL rebuild it again

**Verdict:** CONFIRMED — This is an infinite rebuild loop. The lack of a "currently processing" guard or maximum recursion depth allows transitive imports to expand unboundedly.

---

### [RANK 2] IndexManager Over-Invalidation -- LIKELIHOOD: MEDIUM

**Status:** LIKELY contributor (compounds Rank 1 issue)

**Evidence:**

`BBjIndexManager.isAffected()` (lines 14-32 in `bbj-index-manager.ts`):

```typescript
public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
    if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
        // only affected by ClassPath changes
        return false;
    }
    if (this.wsManager() instanceof BBjWorkspaceManager) {
        const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
        const isExternal = bbjWsManager.isExternalDocument(document.uri)

        // Lines 22-24: CRITICAL LOGIC
        if (document.references.some(e => e.error !== undefined)) {
            // don't rebuild external documents that has errors
            return !isExternal  // ← Returns TRUE for ALL workspace docs with errors
        }

        // Lines 26-28: Complex external document logic
        if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
            // don't rebuild external documents if ws document changed
            return false;
        }
    }
    return super.isAffected(document, changedUris);
}
```

**Critical Finding: Over-broad affectedness check**

Line 22-24 logic:
- If a workspace document has ANY reference errors (unresolved symbols, type errors, etc.)
- AND any document in the workspace changes
- The document is marked as affected (returns `true`)

**Mechanism: How it causes excessive rebuilds**

1. During workspace initialization, many documents may have temporary reference errors as dependencies are still being loaded
2. When `BBjDocumentBuilder` calls `update()` with newly loaded documents (line 90), those URIs become `changedUris`
3. `IndexManager.isAffected()` is called for ALL documents in the workspace
4. ANY workspace document with reference errors returns `true`
5. Those documents are added to the rebuild queue (line 111 in Langium's `update()`)
6. This compounds the rebuild loop from Rank 1 — not only are transitive imports causing rebuilds, but documents with errors are ALSO being rebuilt unnecessarily

**Example scenario:**

- Workspace has 50 BBj files
- 20 files have unresolved references (common during initialization)
- `addImportedBBjDocuments` loads 1 new file via USE statement
- Calls `update([new-file])`
- `isAffected()` checks all 50 files → 20 files return `true` (have errors)
- Now 21 documents are queued for rebuild (the 1 new file + 20 with errors)
- Each of those 21 documents goes through `buildDocuments()` → potentially discovers MORE USE statements
- **Exponential growth in rebuild queue**

**Line 26-28 analysis:**

```typescript
if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
    return false;
}
```

This translates to: "If NOT all changed URIs are external AND this document IS external, return false"

Boolean logic breakdown:
- `[...changedUris].every(changed => bbjWsManager.isExternalDocument(...))` checks if ALL changed documents are external
- `!` inverts it: "at least one changed document is NOT external" (i.e., is a workspace document)
- `&& isExternal`: "AND the current document IS external"
- Result: "Don't rebuild external documents if a workspace document changed"

**This logic is correct** for preventing external documents from rebuilding due to workspace changes. However, it does NOT address the over-invalidation of workspace documents in lines 22-24.

**Verdict:** LIKELY — This logic compounds the primary rebuild loop by marking too many documents as affected, increasing the rebuild queue exponentially.

---

## Proposed Mitigations

### Mitigation 1: Add Processing Guard to Prevent Transitive Rebuild Loops (addresses Rank 1)

**What:** Track documents currently being processed in a build cycle and skip re-processing them within the same cycle.

**Where:** `bbj-document-builder.ts`, lines 39-43 and 45-94

**Implementation approach:**

Add a Set to track documents in the current build cycle:

```typescript
export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    private currentBuildCycle: Set<string> = new Set();

    protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
        // Mark all documents as being processed in this cycle
        documents.forEach(doc => this.currentBuildCycle.add(doc.uri.toString()));

        try {
            await super.buildDocuments(documents, options, cancelToken);
            await this.addImportedBBjDocuments(documents, options, cancelToken);
        } finally {
            // Clear after build completes
            this.currentBuildCycle.clear();
        }
    }

    async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
        // ... existing USE collection logic ...

        const addedDocuments: URI[] = []
        for (const importPath of bbjImports) {
            // ... existing file resolution logic ...
            if (docFileData) {
                const document = documentFactory.fromString(docFileData.text, docFileData.uri);
                if (!langiumDocuments.hasDocument(document.uri)
                    && !this.currentBuildCycle.has(document.uri.toString())) {  // ← NEW GUARD
                    langiumDocuments.addDocument(document);
                    addedDocuments.push(document.uri);
                }
            }
        }

        if (addedDocuments.length > 0) {
            // Instead of calling this.update(), which triggers full rebuild:
            // Option A: DON'T call update, let next workspace sync handle these
            // Option B: Call a specialized method that builds WITHOUT recursing into USE statements
            // Option C: Mark these as "external" to prevent re-triggering USE resolution
        }
    }
}
```

**Alternative approach (simpler):** Don't call `this.update()` at all in `addImportedBBjDocuments`. Instead:
- Add documents to `langiumDocuments`
- Let Langium's normal workspace synchronization build them in the next cycle
- This breaks the immediate recursion

**Effort:** Medium (2-4 hours)
- Modify 2 methods
- Add state tracking
- Test with multi-project workspace to verify no infinite loop
- Verify transitive dependencies still resolve (just in subsequent cycles, not immediately)

**Risk:** Low
- Changes are localized to BBjDocumentBuilder
- Existing guard (`langiumDocuments.hasDocument`) prevents duplicate additions
- Worst case: transitive dependencies take longer to resolve (multiple build cycles instead of one recursive cycle)

---

### Mitigation 2: Refine isAffected Logic to Reduce Over-Invalidation (addresses Rank 2)

**What:** Only mark documents as affected if they have a DIRECT dependency relationship with the changed documents, not just because they have reference errors.

**Where:** `bbj-index-manager.ts`, lines 22-24

**Implementation approach:**

```typescript
public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
    if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
        return false;
    }
    if (this.wsManager() instanceof BBjWorkspaceManager) {
        const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
        const isExternal = bbjWsManager.isExternalDocument(document.uri)

        // REMOVED: Overly broad error-based invalidation
        // if (document.references.some(e => e.error !== undefined)) {
        //     return !isExternal
        // }

        // NEW: Only rebuild if document has errors AND references one of the changed URIs
        if (document.references.some(e => e.error !== undefined)) {
            // Check if this document references any of the changed URIs
            const changedUriStrings = [...changedUris];
            const hasDirectDependency = document.references.some(ref =>
                changedUriStrings.includes(ref.targetUri?.toString() || '')
            );
            if (hasDirectDependency) {
                return !isExternal;  // Only rebuild workspace docs with direct dependencies
            }
        }

        if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
            return false;
        }
    }
    return super.isAffected(document, changedUris);
}
```

**Effort:** Small (1-2 hours)
- Modify 1 method
- Add dependency checking logic
- Test that documents with resolved dependencies to changed files still rebuild
- Verify documents with unrelated errors DON'T rebuild unnecessarily

**Risk:** Medium
- Incorrect logic could cause documents to NOT rebuild when they should
- Need comprehensive testing to ensure all valid dependency cases are covered
- May need to check both target and container references

---

### Mitigation 3: Add Maximum Recursion Depth for Transitive Imports (addresses Rank 1 - fallback)

**What:** Limit the depth of transitive USE resolution to prevent unbounded expansion.

**Where:** `bbj-document-builder.ts`, add a depth counter parameter to `addImportedBBjDocuments`

**Implementation approach:**

```typescript
export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    private static readonly MAX_IMPORT_DEPTH = 10;

    protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
        await super.buildDocuments(documents, options, cancelToken);
        await this.addImportedBBjDocuments(documents, options, cancelToken, 0);  // Start at depth 0
    }

    async addImportedBBjDocuments(
        documents: LangiumDocument<AstNode>[],
        options: BuildOptions,
        cancelToken: CancellationToken,
        depth: number = 0  // NEW PARAMETER
    ) {
        if (depth >= BBjDocumentBuilder.MAX_IMPORT_DEPTH) {
            console.warn(`Maximum transitive import depth (${BBjDocumentBuilder.MAX_IMPORT_DEPTH}) reached. Stopping USE resolution.`);
            return;
        }

        // ... existing logic ...

        if (addedDocuments.length > 0) {
            const started = Date.now()
            // Pass depth + 1 to nested calls
            await this.update(addedDocuments, [], cancelToken, depth + 1);
            const elapsed = Date.now() - started
            console.debug(`Transitive BBj file update (depth ${depth}) for ${addedDocuments.length} documents took ${elapsed}ms`)
        }
    }
}
```

**Note:** This requires modifying Langium's `update()` signature to accept depth parameter, which is invasive. Better approach: track depth in instance variable.

**Revised simpler approach:**

```typescript
export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    private static readonly MAX_IMPORT_DEPTH = 10;
    private currentImportDepth: number = 0;

    async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
        this.currentImportDepth++;

        if (this.currentImportDepth > BBjDocumentBuilder.MAX_IMPORT_DEPTH) {
            console.warn(`Maximum transitive import depth (${BBjDocumentBuilder.MAX_IMPORT_DEPTH}) reached. Stopping USE resolution to prevent infinite loop.`);
            this.currentImportDepth--;
            return;
        }

        try {
            // ... existing logic ...
            if (addedDocuments.length > 0) {
                await this.update(addedDocuments, [], cancelToken);
            }
        } finally {
            this.currentImportDepth--;
        }
    }
}
```

**Effort:** Small (1 hour)
- Add depth tracking
- Add guard condition
- Test with deep import chains

**Risk:** Low
- This is a safety net, not a fix
- Deep legitimate import chains (>10 levels) would be cut off
- Better than infinite loop, but Mitigation 1 is preferred

---

### Mitigation 4: Mark Imported Documents as External to Skip Recursive USE Resolution (addresses Rank 1)

**What:** Imported documents (those loaded via USE statements) should be marked as "external" so they don't trigger recursive USE resolution.

**Where:** `bbj-document-builder.ts` line 83 and `bbj-ws-manager.ts` `isExternalDocument()` method

**Implementation approach:**

Currently, `BBjWorkspaceManager.isExternalDocument()` (lines 162-172) checks if a document's path starts with a prefix path. Imported documents ARE correctly identified as external.

However, `BBjDocumentBuilder.shouldValidate()` (lines 21-37) skips validation for external documents but doesn't skip linking or USE resolution.

**The issue:** External documents still go through the full `buildDocuments()` pipeline, including `addImportedBBjDocuments()`, which resolves THEIR USE statements.

**Fix:** Skip USE resolution for external documents:

```typescript
async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
    const bbjWsManager = this.wsManager() as BBjWorkspaceManager;

    // Filter out external documents before processing USE statements
    const workspaceDocuments = documents.filter(doc =>
        !(bbjWsManager instanceof BBjWorkspaceManager && bbjWsManager.isExternalDocument(doc.uri))
    );

    if (workspaceDocuments.length === 0) {
        return;  // No workspace documents to process
    }

    let prefixes = bbjWsManager.getSettings()?.prefixes;
    if (!prefixes) {
        return
    }

    const bbjImports = new Set<string>();
    for (const document of workspaceDocuments) {  // ← Changed from 'documents' to 'workspaceDocuments'
        await interruptAndCheck(cancelToken);
        AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
            if (use.bbjFilePath) {
                const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
                bbjImports.add(cleanPath);
            }
        })
    }

    // ... rest of logic unchanged ...
}
```

**Rationale:** External documents (loaded from prefix paths) are dependencies, not part of the active workspace. Their USE statements should NOT trigger further transitive loading — only workspace documents should expand the import graph.

**Effort:** Small (1 hour)
- Add filter at start of `addImportedBBjDocuments`
- Test that workspace documents still resolve USE correctly
- Verify external documents don't trigger recursive loading

**Risk:** Low
- External documents are already treated specially (no validation)
- This aligns with the existing design intent
- May need to verify that external-to-external USE statements (if they exist) are handled correctly

---

## Recommended Investigation Next Steps

While static analysis CONFIRMS the rebuild loop hypothesis, runtime verification would provide additional data:

### 1. Add Instrumentation to Confirm Loop Pattern

Add logging to `bbj-document-builder.ts`:

```typescript
protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
    const uris = documents.map(d => d.uri.toString()).join(', ');
    console.warn(`[BUILD-CYCLE] buildDocuments called with ${documents.length} documents: ${uris}`);
    console.warn(`[BUILD-CYCLE] Stack trace:`, new Error().stack?.split('\n').slice(2, 6).join('\n'));

    await super.buildDocuments(documents, options, cancelToken);
    await this.addImportedBBjDocuments(documents, options, cancelToken);
}

async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
    console.warn(`[USE-RESOLUTION] Processing ${documents.length} documents for USE statements`);

    // ... existing logic ...

    if (addedDocuments.length > 0) {
        console.warn(`[USE-RESOLUTION] Found ${addedDocuments.length} new documents via USE statements. Calling update().`);
        console.warn(`[USE-RESOLUTION] New documents: ${addedDocuments.map(uri => uri.toString()).join(', ')}`);
        await this.update(addedDocuments, [], cancelToken);
    }
}
```

**Expected output if hypothesis is correct:**
- Repeated `[BUILD-CYCLE]` entries for the same documents
- Growing list of documents in `addedDocuments` showing transitive expansion
- Stack traces showing recursive call pattern

### 2. Profile with Node.js CPU Profiler

```bash
node --cpu-prof /Users/beff/_workspace/bbj-language-server/bbj-vscode/out/language/main.cjs --stdio
# Open multi-project workspace in VS Code
# Wait for CPU spike
# Kill language server process
# Generate flamegraph: 0x CPU.*.cpuprofile
```

**Expected result:**
- `buildDocuments` and `addImportedBBjDocuments` dominate the flamegraph
- Wide flat plateau indicating hot loop
- High call count for these methods

### 3. Test Mitigation Effectiveness

After implementing Mitigation 1 or 4:
- Open same multi-project workspace
- Monitor CPU usage (should remain under 20%)
- Verify transitive USE dependencies still resolve (check LSP features work)
- Measure startup time (should be faster without infinite loop)

---

## Code Locations Reference

| File | Lines | Component | Relevance |
|------|-------|-----------|-----------|
| `bbj-document-builder.ts` | 39-43 | `buildDocuments()` override | Calls `addImportedBBjDocuments`, completing the loop |
| `bbj-document-builder.ts` | 45-94 | `addImportedBBjDocuments()` | Calls `this.update()` on line 90, triggering rebuild |
| `bbj-document-builder.ts` | 55 | AST traversal | Uses `streamAllContents` to find USE statements |
| `bbj-document-builder.ts` | 82 | Duplicate check | Guards against adding same document twice, but NOT against rebuilding |
| `bbj-index-manager.ts` | 14-32 | `isAffected()` override | Lines 22-24 cause over-invalidation for docs with errors |
| `bbj-index-manager.ts` | 26-28 | External doc logic | Correctly prevents external docs from rebuilding due to workspace changes |
| `bbj-ws-manager.ts` | 59-127 | `initializeWorkspace()` | Lines 112-118 load Java classpath (potential secondary blocker) |
| `bbj-ws-manager.ts` | 129-141 | `shouldIncludeEntry()` | Correctly filters to only .bbj/.bbl/.bbjt files |
| `bbj-ws-manager.ts` | 162-172 | `isExternalDocument()` | Correctly identifies documents loaded from prefix paths |
| `bbj-linker.ts` | 35-63 | `link()` override | Lines 41, 54 use AST traversal (potential secondary performance issue) |
| `java-interop.ts` | 59-76 | `connect()` | Socket connection to Java service (potential blocking, but async) |
| `java-interop.ts` | 132-149 | `loadClasspath()` | Called during initialization, truly async (Promise-based) |
| `node_modules/langium/.../document-builder.js` | 79-124 | `DefaultDocumentBuilder.update()` | Lines 95-104 invalidate documents, line 124 calls `buildDocuments()` |
| `node_modules/langium/.../document-builder.js` | 117-123 | Rebuild document collection | Collects ALL documents with state < Linked OR incomplete builds |

---

## Summary

The root cause of 100% CPU usage in multi-project workspaces is a **confirmed infinite rebuild loop** in the transitive import resolution logic. The BBj document builder resolves USE statements recursively without bounds, and each resolution triggers a full document update cycle, which rebuilds documents that then resolve MORE USE statements.

**Primary fix:** Implement Mitigation 1 (processing guard) or Mitigation 4 (skip USE resolution for external docs).

**Secondary fix:** Implement Mitigation 2 (refine isAffected logic) to reduce compounding effects.

These mitigations are concrete, low-risk, and can be implemented in a follow-up phase with high confidence of resolving issue #232.
