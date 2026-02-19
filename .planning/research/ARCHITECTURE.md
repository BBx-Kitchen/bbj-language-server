# Architecture Research

**Domain:** Langium-based Language Server — BBjCPL integration, diagnostic hierarchy, outline resilience
**Researched:** 2026-02-19
**Confidence:** HIGH (based on direct source inspection of Langium 4.1.3 type definitions and existing codebase)

---

## Standard Architecture

### System Overview

```
+---------------------------------------------------------------------+
|                    VS Code / IntelliJ (LSP Client)                   |
+---------------------------------------------------------------------+
|  didChange     textDocument    workspace/                            |
|  didSave       /symbol         publishDiag                           |
+--+-------------+---------------+---------+---------------------------+
   |             |               |         |
+--v-------------v---------------v---------v---------------------------+
|                  Language Server (Node.js / stdio)                   |
|                                                                      |
|  +------------------------------------------------------------------+|
|  |  BBjDocumentBuilder  (extends DefaultDocumentBuilder)            ||
|  |                                                                  ||
|  |  buildDocuments()                                                ||
|  |    -> parse -> index -> computeScopes -> link -> indexRefs       ||
|  |    -> validate (BBjDocumentValidator)                            ||
|  |    -> addImportedBBjDocuments()       [existing]                 ||
|  |    -> revalidateUseFilePathDiags()    [existing]                 ||
|  |    -> [NEW] invokeBBjCPLAndMerge()                               ||
|  |    -> notifyDocumentPhase(Validated)  <- Langium publishes       ||
|  |                                                                  ||
|  +------------------------------------------------------------------+|
|                                                                      |
|  +--------------------+  +--------------------+  +-----------------+ |
|  |BBjDocumentValidator|  |[NEW] BBjCPL         |  |[NEW] BBjDocument| |
|  |(extends Default    |  |CompilerService      |  |SymbolProvider   | |
|  |DocumentValidator)  |  |                     |  |(extends Default)| |
|  |                    |  | invokeCPL()         |  |                 | |
|  |applyHierarchyFilter|  | parseCPLOutput()    |  |getSymbols()     | |
|  |() in validateDoc() |  | mapToLSP()          |  | with parse-error| |
|  +--------------------+  +--------------------+  | resilience      | |
|                                                  +-----------------+ |
|                                                                      |
|  +------------------------------------------------------------------+|
|  |  BBjWorkspaceManager  (settings: bbjHome, trigger config)        ||
|  +------------------------------------------------------------------+|
|  +------------------------------------------------------------------+|
|  |  BBjModule DI  -- registers all services                         ||
|  +------------------------------------------------------------------+|
+----------------------------------------------------------------------+
                         |
                         v
+----------------------------------------------------------------------+
|                  BBjCPL  (external subprocess)                        |
|    bbjcpl -N [options] filename.bbj  ->  stderr: line diagnostics    |
+----------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `BBjDocumentBuilder` | Document lifecycle orchestration, transitive USE import resolution | Existing - extend |
| `BBjDocumentValidator` | Langium diagnostics: linking errors, semantic checks, hierarchy filtering | Existing - extend |
| `BBjCPLCompilerService` | Subprocess invocation, output parsing, LSP diagnostic mapping | New |
| `BBjDocumentSymbolProvider` | Outline with parse-error resilience | New |
| `BBjWorkspaceManager` | BBj home path, settings, trigger config | Existing - no changes needed |

---

## Question-by-Question Architecture Answers

### Q1: Where Does BBjCPL Invocation Fit in the Langium Document Lifecycle?

**Answer: After `DocumentState.Validated`, inside the existing `buildDocuments()` override.**

Langium's document lifecycle (confirmed from `documents.d.ts`):

```
Changed(0) -> Parsed(1) -> IndexedContent(2) -> ComputedScopes(3)
           -> Linked(4) -> IndexedReferences(5) -> Validated(6)
```

After `Validated`, Langium's internal `addDiagnosticsHandler` calls `connection.sendDiagnostics()` via its own `onDocumentPhase(DocumentState.Validated, ...)` listener. To merge BBjCPL output into that single send, BBjCPL must run before `notifyDocumentPhase` is called.

**The integration point:**

BBjCPL invocation belongs **inside** the existing `BBjDocumentBuilder.buildDocuments()` override, appended after `super.buildDocuments()` completes. This is exactly the same pattern already used by `addImportedBBjDocuments()` and `revalidateUseFilePathDiagnostics()`.

```typescript
// In BBjDocumentBuilder.buildDocuments():
protected override async buildDocuments(
    documents: LangiumDocument[], options: BuildOptions, cancelToken: CancellationToken
): Promise<void> {
    await super.buildDocuments(documents, options, cancelToken);
    if (!this.isImportingBBjDocuments) {
        await this.addImportedBBjDocuments(documents, options, cancelToken);
        await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
        // NEW: invoke BBjCPL and merge diagnostics for qualifying documents
        await this.invokeBBjCPLAndMerge(documents, cancelToken);
    }
}
```

`invokeBBjCPLAndMerge` mutates `document.diagnostics` in place, then calls `notifyDocumentPhase(document, DocumentState.Validated, cancelToken)` to push the merged result. The Langium `addDiagnosticsHandler` listener fires on this notification and sends the updated array to the client.

**Why NOT parallel:** BBjCPL should run sequentially after Langium validation. Diagnostic merging is simpler when both result sets exist before the final send. Parallel invocation could race with Langium's own `onDocumentPhase` emission.

**Why NOT a separate `onBuildPhase` listener in main.ts:** Putting it inside `buildDocuments()` keeps all post-validation side effects in one place (consistent with `revalidateUseFilePathDiagnostics`). It also ensures the build cancel token propagates to BBjCPL invocations, so rapid edits properly cancel pending CPL runs.

---

### Q2: How Should Diagnostics Be Merged/Reconciled?

**Answer: Mutate `document.diagnostics` in place before calling `notifyDocumentPhase`.**

The `document.diagnostics` field (type `Diagnostic[] | undefined`) is populated by `DefaultDocumentBuilder.validate()`. After `super.buildDocuments()` returns, this array contains all Langium diagnostics. To merge BBjCPL output:

```typescript
private async invokeBBjCPLAndMerge(
    documents: LangiumDocument[], cancelToken: CancellationToken
): Promise<void> {
    for (const doc of documents) {
        if (!this.shouldValidate(doc)) continue;  // skips bbjlib, external, etc.
        if (!this.shouldRunCPL(doc)) continue;    // trigger mode check

        const cplDiags = await this.cplService.compile(doc.uri, cancelToken);
        // Append CPL diagnostics; document.diagnostics already contains Langium's
        doc.diagnostics = [...(doc.diagnostics ?? []), ...cplDiags];
        // Re-emit so the client sees the merged set
        await this.notifyDocumentPhase(doc, DocumentState.Validated, cancelToken);
    }
}
```

**Deduplication strategy:** CPL and Langium may report similar errors (e.g., a syntax error detected by both). Use source tagging: Langium diagnostics carry `source: 'bbj'` (from `getSource()` in `DefaultDocumentValidator`). Tag CPL diagnostics `source: 'BBjCPL'`. No deduplication by default - if both report the same issue, both appear. This is honest behavior and lets users understand which tool caught what.

**Severity mapping from BBjCPL:** All stderr output maps to `DiagnosticSeverity.Error` unless the `-W` flag is used and BBjCPL distinguishes warnings in its output format (needs empirical verification).

---

### Q3: Where Does Diagnostic Hierarchy Filtering Happen?

**Answer: In `BBjDocumentValidator`, extending `validateDocument()` to filter after `super.validateDocument()`.**

The existing `BBjDocumentValidator.toDiagnostic()` already performs severity overrides (linking errors downgraded from Error to Warning). The hierarchy filtering extends the same class:

```typescript
// In BBjDocumentValidator (extends DefaultDocumentValidator):
override async validateDocument(
    document: LangiumDocument,
    options?: ValidationOptions,
    cancelToken?: CancellationToken
): Promise<Diagnostic[]> {
    const all = await super.validateDocument(document, options, cancelToken);
    return this.applyHierarchyFilter(all);
}

private applyHierarchyFilter(diags: Diagnostic[]): Diagnostic[] {
    const hasParseErrors = diags.some(
        d => (d.data as DiagnosticData)?.code === DocumentValidator.ParsingError
    );
    if (hasParseErrors) {
        // Suppress downstream noise when the document doesn't parse
        return diags.filter(d => {
            const code = (d.data as DiagnosticData)?.code;
            return code === DocumentValidator.LexingError
                || code === DocumentValidator.ParsingError;
        });
    }
    return diags;
}
```

**Hierarchy rationale:** Parse errors make linking and semantic errors unreliable. Showing 40 cascade diagnostics from a single unclosed brace is noise. The filter suppresses linking and semantic diagnostics when parse errors are present - the user should fix parsing first.

**Alternative placement considered:** Filtering in `BBjDocumentBuilder` after `validate()` was rejected because `BBjDocumentValidator.validateDocument()` returns a fresh array - the builder stores it in `document.diagnostics`. Filtering in the validator ensures the stored array is clean from the start, and the logic stays encapsulated with the rest of the diagnostic transformation.

---

### Q4: How to Override Langium's DefaultDocumentSymbolProvider for Outline Resilience?

**Answer: New service `BBjDocumentSymbolProvider`, registered in `BBjModule.lsp.DocumentSymbolProvider`.**

The `DefaultDocumentSymbolProvider` (confirmed from `document-symbol-provider.d.ts`) traverses the AST via `getSymbols()` -> `getSymbol()` -> `getChildSymbols()`. When there are parse errors, the AST is partial - some nodes are missing or malformed - which can cause an empty or broken outline.

**Langium registers the document symbol handler at `DocumentState.Parsed`** (confirmed from `addDocumentSymbolHandler` using `requiredState = DocumentState.Parsed`), so the AST is always at least partially available. The resilience layer adds null-safety when traversing that partial AST.

```typescript
// bbj-document-symbol-provider.ts
export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {
    override getSymbols(
        document: LangiumDocument,
        params: DocumentSymbolParams,
        cancelToken?: CancellationToken
    ): MaybePromise<DocumentSymbol[]> {
        try {
            return super.getSymbols(document, params, cancelToken);
        } catch {
            // Parse error fallback: extract symbols from partial AST via safe traversal
            return this.getSymbolsFromPartialAst(document);
        }
    }

    private getSymbolsFromPartialAst(document: LangiumDocument): DocumentSymbol[] {
        // Walk document.parseResult.value with null-checks on every node
        // Collect: BbjClass nodes, MethodDecl, FieldDecl, LabelDecl, DefFunction
        // Return whatever is recoverable - better than nothing
        const symbols: DocumentSymbol[] = [];
        try {
            AstUtils.streamAllContents(document.parseResult.value).forEach(node => {
                try {
                    const syms = this.getSymbol(document, node);
                    symbols.push(...syms);
                } catch { /* skip broken nodes */ }
            });
        } catch { /* AST too broken to walk */ }
        return symbols;
    }
}
```

**Registration in BBjModule:**

```typescript
// bbj-module.ts - in BBjModule lsp section:
lsp: {
    // ... existing providers ...
    DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),  // NEW
}
```

---

### Q5: Data Flow - "File Changed" to "Diagnostics Published"

**Complete flow after integration:**

```
1. User saves/edits BBj file
   |
2. DocumentUpdateHandler.didChangeContent() / didSaveDocument()
   |
3. DocumentBuilder.update([changedUri], [])
   |
4. BBjDocumentBuilder.buildDocuments(documents, options, cancelToken)
   |
   +-- 4a. super.buildDocuments()
   |       +-- parse (Chevrotain)
   |       +-- index content
   |       +-- compute scopes
   |       +-- link (BbjLinker)
   |       +-- index references
   |       +-- validate (BBjDocumentValidator)
   |               +-- lexing errors
   |               +-- parsing errors
   |               +-- linking errors (severity-overridden)
   |               +-- AST validation checks
   |               +-- applyHierarchyFilter()  [NEW]
   |
   +-- 4b. addImportedBBjDocuments()  [existing]
   |
   +-- 4c. revalidateUseFilePathDiagnostics()  [existing]
   |
   +-- 4d. [NEW] invokeBBjCPLAndMerge()
           +-- shouldRunCPL(doc)?  -> check trigger mode & bbj.home
           +-- BBjCPLCompilerService.compile(doc.uri, cancelToken)
           |       +-- spawn bbjcpl -N [options] filename.bbj
           |       +-- collect stderr
           |       +-- parseCPLOutput() -> Diagnostic[]
           +-- merge into document.diagnostics
           +-- notifyDocumentPhase(doc, Validated, cancelToken)
                   |
5. addDiagnosticsHandler listener fires (Langium internal, language-server.js line 278)
   |
6. connection.sendDiagnostics({ uri, diagnostics: merged })
   |
7. Client (VS Code / IntelliJ LSP4IJ) shows squiggles
```

---

### Q6: Configurable Trigger (On-Save vs Debounced)

**Answer: The trigger decision lives in a guard method in `BBjDocumentBuilder`, checking settings at invocation time. On-save tracking requires a `BBjDocumentUpdateHandler` override.**

Langium's `DocumentUpdateHandler` has `didSaveDocument?` and `didChangeContent?` hooks (confirmed from `document-update-handler.d.ts`). For on-save mode, track the last-saved URIs in a Set populated by a custom handler:

```typescript
// bbj-document-update-handler.ts
export class BBjDocumentUpdateHandler extends DefaultDocumentUpdateHandler {
    private readonly savedUris = new Set<string>();

    override didSaveDocument(event: TextDocumentChangeEvent<TextDocument>): void {
        this.savedUris.add(event.document.uri);
        super.didSaveDocument(event);
    }

    wasRecentlySaved(uri: URI): boolean {
        const key = uri.toString();
        const result = this.savedUris.has(key);
        this.savedUris.delete(key);  // consume - one-shot check
        return result;
    }
}
```

**Trigger guard in BBjDocumentBuilder:**

```typescript
private shouldRunCPL(document: LangiumDocument): boolean {
    const bbjHome = (this.wsManager() as BBjWorkspaceManager).getBBjDir();
    if (!bbjHome) return false;  // no compiler available

    const trigger = this.getCPLTrigger(); // 'onChange' | 'onSave' | 'off'
    if (trigger === 'off') return false;
    if (trigger === 'onSave') {
        return this.updateHandler?.wasRecentlySaved(document.uri) ?? false;
    }
    return true; // 'onChange': always run (debounced by Langium's own update queue)
}
```

**On-change debouncing:** Langium handles keystroke debouncing via `WorkspaceLock` internally - rapid edits cancel and restart the build. BBjCPL automatically benefits because it runs inside `buildDocuments()`, which is guarded by the cancel token. No additional debouncing needed.

**Settings path:** New setting `bbj.compiler.autoCheck` with values `'onChange' | 'onSave' | 'off'` (default `'onChange'`). Read from workspace config at invocation time for hot-reload compatibility, consistent with how other settings are read via `wsManager`.

**Registration in BBjSharedModule:**

```typescript
// bbj-module.ts BBjSharedModule:
export const BBjSharedModule = {
    lsp: {
        NodeKindProvider: () => new BBjNodeKindProvider(),
        DocumentUpdateHandler: (services) => new BBjDocumentUpdateHandler(services),  // NEW (if onSave needed)
    },
    workspace: {
        DocumentBuilder: (services) => new BBjDocumentBuilder(services),
        WorkspaceManager: (services) => new BBjWorkspaceManager(services),
        IndexManager: (services) => new BBjIndexManager(services)
    }
};
```

---

## New vs Modified Components

### New Files

| File | Type | Purpose |
|------|------|---------|
| `bbj-cpl-compiler-service.ts` | New service | Subprocess invocation, stderr parsing, LSP Diagnostic mapping |
| `bbj-document-symbol-provider.ts` | New LSP provider | Outline resilience with parse-error fallback |
| `bbj-document-update-handler.ts` | New shared service (optional) | On-save tracking if on-save trigger mode is required |

### Modified Files

| File | Change | Scope |
|------|--------|-------|
| `bbj-document-builder.ts` | Add `invokeBBjCPLAndMerge()`, `shouldRunCPL()` methods | ~40 lines in `buildDocuments()` and new guard methods |
| `bbj-document-validator.ts` | Add `applyHierarchyFilter()` private method, override `validateDocument()` | ~25 lines |
| `bbj-module.ts` | Register `DocumentSymbolProvider`, `BBjCPLCompilerService`, optional `DocumentUpdateHandler` | ~15 lines in DI declarations and type definitions |
| `main.ts` | Add `cplTrigger` to settings change handler | ~5 lines |

---

## Component Boundaries

| Component | Communicates With | Protocol |
|-----------|-------------------|----------|
| `BBjCPLCompilerService` | `BBjDocumentBuilder` | Direct method call (DI-injected) |
| `BBjCPLCompilerService` | `BBjWorkspaceManager` | Via `services.shared.workspace.WorkspaceManager` cast |
| `BBjCPLCompilerService` | `bbjcpl` subprocess | `child_process.spawn` + stderr pipe |
| `BBjDocumentBuilder` | `BBjCPLCompilerService` | DI-injected reference in `BBjServices.compiler.CPLCompilerService` |
| `BBjDocumentSymbolProvider` | Langium AST | `document.parseResult.value` direct access |
| `BBjDocumentUpdateHandler` | `BBjDocumentBuilder` | `wasRecentlySaved(uri)` method call |

---

## BBjCPL Invocation Details

**Command for diagnostic-only mode** (confirmed from BASIS docs, `-N` flag):
```
bbjcpl -N [additional options] filename.bbj
```

The `-N` flag (validate-only) avoids producing tokenized `.bbj` output as a side effect. The existing VS Code `compile` command (in `Commands.cjs`) uses the same binary path pattern:
```javascript
"${home}/bin/bbjcpl${os.platform() === 'win32' ? '.exe' : ''}"
```

**Stderr format (LOW confidence - needs empirical verification):**

From the BASIS documentation search results, BBjCPL error messages include both the BBj line number and the ASCII file line number. The exact format requires a live test run. Likely format:
```
filename.bbj(42): Error: Undeclared variable 'foo!'
```
or possibly:
```
Error in filename.bbj at line 42: ...
```

The regex in `BBjCPLCompilerService.parseCPLOutput()` must be verified empirically against a real BBj installation before shipping.

---

## Diagnostic Merge Data Flow

```
document.diagnostics (after Langium validate + hierarchy filter)
    = [lexErr1, parseErr2, linkWarn3, semanticErr4]  <- source: 'bbj'

BBjCPLCompilerService.compile()
    = [cplErr5, cplErr6]  <- source: 'BBjCPL', severity: Error

invokeBBjCPLAndMerge() mutates document.diagnostics
    = [lexErr1, parseErr2, linkWarn3, semanticErr4, cplErr5, cplErr6]

notifyDocumentPhase(Validated)
    -> addDiagnosticsHandler listener (Langium internal)
    -> connection.sendDiagnostics({ uri, diagnostics })
    -> client receives merged array, all squiggles updated atomically
```

---

## Patterns to Follow

### Pattern 1: Post-Validate Extension in buildDocuments()

**What:** Append async operations after `super.buildDocuments()` in the existing override.
**When to use:** Any operation that needs the final validated AST and diagnostics.
**Established by:** `addImportedBBjDocuments()` and `revalidateUseFilePathDiagnostics()` already follow this pattern.

```typescript
protected override async buildDocuments(
    documents: LangiumDocument[], options: BuildOptions, cancelToken: CancellationToken
): Promise<void> {
    await super.buildDocuments(documents, options, cancelToken);
    if (!this.isImportingBBjDocuments) {
        await this.addImportedBBjDocuments(documents, options, cancelToken);
        await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
        await this.invokeBBjCPLAndMerge(documents, cancelToken);  // NEW
    }
}
```

### Pattern 2: notifyDocumentPhase for Incremental Diagnostic Updates

**What:** Call `notifyDocumentPhase(doc, DocumentState.Validated, cancelToken)` after mutating `document.diagnostics`.
**When to use:** Any time updated diagnostics need pushing without re-running the full build pipeline.
**Established by:** `revalidateUseFilePathDiagnostics()` already calls this to remove false-positive USE path diagnostics.

### Pattern 3: Lazy Settings Access via wsManager

**What:** Read settings from `BBjWorkspaceManager` at invocation time, not at constructor time.
**When to use:** Any setting that can change via hot-reload (`bbj.home`, trigger mode).
**Established by:** All existing services that read `bbjdir` or `prefixes` do this pattern.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Registering a Separate onBuildPhase Listener for CPL in main.ts

**What people do:** Register `documentBuilder.onBuildPhase(DocumentState.Validated, ...)` in `main.ts` to fire CPL.
**Why it's wrong:** This listener fires AFTER Langium has already called `sendDiagnostics` (Langium registers its own `onDocumentPhase` listener that fires first). The merged CPL diagnostics would arrive in a second `publishDiagnostics` notification, causing visible diagnostic flicker - squiggles appear, then change.
**Do this instead:** Merge inside `buildDocuments()` before `notifyDocumentPhase` so one `sendDiagnostics` carries all diagnostics.

### Anti-Pattern 2: Running BBjCPL on Every Keystroke Without Relying on Build Queue

**What people do:** Hook CPL invocation directly into `didChangeContent` without cancel token support.
**Why it's wrong:** BBjCPL is a subprocess - it doesn't support mid-process cancellation. Concurrent invocations pile up on large files.
**Do this instead:** CPL runs inside `buildDocuments()` which is already guarded by Langium's `WorkspaceLock` and `cancelToken`. Rapid edits cancel the previous build, so CPL is naturally debounced.

### Anti-Pattern 3: Failing Silently on bbjcpl Not Found

**What people do:** Return empty diagnostics when `bbjcpl` executable is missing.
**Why it's wrong:** Users think CPL is running and producing no errors when it is not running at all.
**Do this instead:** If `bbj.home` is set but the binary is not found, emit one `DiagnosticSeverity.Warning` at range (0,0)-(0,0): `"BBjCPL not found at {path}. Compiler checks disabled."` If `bbj.home` is not configured, log at debug level and return silently (user hasn't opted in).

### Anti-Pattern 4: Mutating Document State from BBjCPLCompilerService

**What people do:** Mark documents as needing relinking after CPL runs, or reset `document.state`.
**Why it's wrong:** BBjCPL diagnostics are line-based, not AST-based. They do not affect reference resolution. Resetting document state triggers a full rebuild loop.
**Do this instead:** Only mutate `document.diagnostics`. Never touch `document.state`.

---

## Build Order Recommendation

Given dependencies between new components:

1. **`BBjDocumentValidator` (hierarchy filter)** - Modifies existing class, no new dependencies. Can ship independently for immediate noise-reduction benefit even before CPL integration.

2. **`BBjDocumentSymbolProvider`** - Independent of CPL. Can ship with or before CPL integration. Straightforward override of `DefaultDocumentSymbolProvider`.

3. **`BBjCPLCompilerService`** - Self-contained subprocess wrapper. No dependencies on other new components. Testable independently with a fixture `.bbj` file and a real BBj installation.

4. **`BBjDocumentBuilder` (CPL integration)** - Depends on `BBjCPLCompilerService` being stable. Wire `invokeBBjCPLAndMerge()` into `buildDocuments()` after service is verified.

5. **`BBjDocumentUpdateHandler`** (on-save trigger, optional) - Only needed if `'onSave'` trigger mode is a requirement. Can be deferred until trigger mode configuration is designed.

---

## DI Registration Plan

New additions to `bbj-module.ts`:

```typescript
// Extend BBjAddedServices type:
export type BBjAddedServices = {
    validation: { BBjValidator: BBjValidator },
    java: { JavaInteropService: JavaInteropService },
    types: { Inferer: TypeInferer },
    compiler: { CPLCompilerService: BBjCPLCompilerService },  // NEW
}

// In BBjModule lsp section:
lsp: {
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    HoverProvider: (services) => new BBjHoverProvider(services),
    CompletionProvider: (services) => new BBjCompletionProvider(services),
    SemanticTokenProvider: (services) => new BBjSemanticTokenProvider(services),
    SignatureHelp: () => new BBjSignatureHelpProvider(),
    DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),  // NEW
},

// In BBjModule compiler section (new top-level group):
compiler: {
    CPLCompilerService: (services) => new BBjCPLCompilerService(services),  // NEW
},

// In BBjSharedModule (optional, for on-save trigger):
lsp: {
    NodeKindProvider: () => new BBjNodeKindProvider(),
    DocumentUpdateHandler: (services) => new BBjDocumentUpdateHandler(services),  // NEW (optional)
},
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `bbjcpl` binary | `child_process.spawn` with stderr pipe | Use `-N` (validate-only) flag; path from `BBjWorkspaceManager.getBBjDir()` + `/bin/bbjcpl` |
| LSP connection | `connection.sendDiagnostics` via Langium's `addDiagnosticsHandler` | No direct connection access needed - mutate `document.diagnostics` and call `notifyDocumentPhase` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `BBjDocumentBuilder` <-> `BBjCPLCompilerService` | Direct method call (DI-injected) | Service injected via `BBjServices.compiler.CPLCompilerService` |
| `BBjDocumentValidator` <-> Langium pipeline | Return filtered `Diagnostic[]` from `validateDocument()` | Override intercepts after `super.validateDocument()` |
| `BBjDocumentSymbolProvider` <-> Langium LSP | Registered as `lsp.DocumentSymbolProvider` in `BBjModule` | Replaces default implementation |
| `BBjDocumentUpdateHandler` <-> `BBjDocumentBuilder` | `wasRecentlySaved(uri)` method call | Optional - only if on-save mode is required |

---

## Sources

- Langium 4.1.3 source: `bbj-vscode/node_modules/langium/lib/workspace/document-builder.d.ts` (HIGH confidence - direct inspection)
- Langium 4.1.3 source: `bbj-vscode/node_modules/langium/lib/workspace/documents.d.ts` - `DocumentState` enum (HIGH confidence)
- Langium 4.1.3 source: `bbj-vscode/node_modules/langium/lib/lsp/document-symbol-provider.d.ts` (HIGH confidence)
- Langium 4.1.3 source: `bbj-vscode/node_modules/langium/lib/lsp/document-update-handler.d.ts` (HIGH confidence)
- Langium 4.1.3 source: `bbj-vscode/node_modules/langium/lib/lsp/language-server.js` lines 268-285 - `addDiagnosticsHandler` implementation confirming `onDocumentPhase(Validated)` emit (HIGH confidence)
- Existing `bbj-document-builder.ts` - `notifyDocumentPhase` and `revalidateUseFilePathDiagnostics` usage patterns (HIGH confidence)
- Existing `bbj-document-validator.ts` - `toDiagnostic` severity override pattern (HIGH confidence)
- Existing `bbj-module.ts` - DI registration conventions (HIGH confidence)
- BASIS BBjCPL documentation: https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm (MEDIUM confidence - found via search, confirms stderr output and -N flag)
- BBjCPL stderr output format: LOW confidence - exact regex pattern needs empirical verification against a real BBj installation
- [Langium Document Lifecycle docs](https://langium.org/docs/reference/document-lifecycle/) (MEDIUM confidence - found via search)

---

*Architecture research for: BBjCPL integration with Langium-based BBj Language Server*
*Researched: 2026-02-19*
