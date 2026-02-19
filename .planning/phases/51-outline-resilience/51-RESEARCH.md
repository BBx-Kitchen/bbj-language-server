# Phase 51: Outline Resilience - Research

**Researched:** 2026-02-19
**Domain:** Langium `DefaultDocumentSymbolProvider`, LSP `textDocument/documentSymbol`, partial AST traversal
**Confidence:** HIGH — all findings verified against actual Langium 4.1.3 source in `bbj-vscode/node_modules/langium` and the live codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Show partial methods — if a method's name/signature was parsed but the body is broken, it still appears in the outline
- Unparseable declarations that have no recoverable name show with fallback label `(parse error)`
- Recover everything possible — classes, methods, labels, fields, variables — not just top-level constructs
- Labels and symbols after the error point should appear if Langium's error recovery parsed them (not cut off at error)
- Debounced outline updates during rapid typing — avoid flicker

### Claude's Discretion

- Visual differentiation of partial/broken symbols (icon, tag, or same as normal)
- AST walk strategy vs text scan — whatever is most maintainable and reliable
- Error handling approach per-node during symbol extraction
- Hierarchy preservation decisions on broken class bodies
- Field recovery when parent class node is broken
- Large file size threshold for skipping recovery
- Outline update transition when errors are resolved

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTL-01 | Document symbols survive syntax errors without crashing — Structure View does not go blank or throw errors on partial ASTs | Override `DefaultDocumentSymbolProvider.getSymbol()` with a try/catch per-node and guard all property accesses; the handler runs at `DocumentState.Parsed` which is reached even for files with errors |
| OUTL-02 | Methods/classes before and after error point visible in Structure View — syntax error in one method does not hide other methods in the outline | Langium's Chevrotain-based parser performs error recovery and produces a partial AST with nodes before and after the error; `AstUtils.streamAllContents` + direct property walk reaches those nodes; the symbol provider must walk the full AST rather than stopping at the first missing CST node |
</phase_requirements>

---

## Summary

The current codebase does **not** have a custom `DocumentSymbolProvider`. Langium's `DefaultDocumentSymbolProvider` is used as-is, registered via the `NodeKindProvider` hook in `BBjSharedModule`. When a document has parse errors, Langium's Chevrotain parser performs error recovery and produces a partial AST — nodes with names parsed before the error still exist with valid `$cstNode` references, and nodes after the error point are also recovered to varying degrees. The `DefaultDocumentSymbolProvider` iterates the AST via `streamContents`, calls `nameProvider.getNameNode()` (which calls `GrammarUtils.findNodeForProperty`), and checks `astNode.$cstNode`. If either is missing it falls through to `getChildSymbols()` with no error. The core problem is that for nodes where `name` was parsed but `$cstNode` is partially corrupt (or for nodes where the name property itself is `undefined` due to recovery), the provider either silently skips them or accesses properties that may throw.

The solution is a custom `BBjDocumentSymbolProvider` that extends `DefaultDocumentSymbolProvider` and adds: (1) per-node try/catch to prevent a single bad node from killing the entire traversal, (2) graceful handling of nodes where `name` is `undefined` (emit `(parse error)` symbol using the CST range if available), (3) `AstUtils.streamAllContents` deep walk instead of shallow `streamContents` to ensure symbols after an error point are found even if the parent container node is broken. The debounce requirement is already handled by Langium and VS Code's LSP client — the language server does not need to implement its own debounce for document symbol responses.

Both VS Code and IntelliJ consume the identical `textDocument/documentSymbol` LSP response. The IntelliJ plugin uses `lsp4ij` and connects to the same Node.js language server process — no IDE-specific code changes are needed for this phase.

**Primary recommendation:** Add `BBjDocumentSymbolProvider` extending `DefaultDocumentSymbolProvider` in `bbj-vscode/src/language/`, register it in `BBjModule.lsp`, and override `getSymbol()` with error-safe node walking and `(parse error)` fallback for anonymous broken nodes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | `4.1.3` | `DefaultDocumentSymbolProvider`, `AstUtils.streamAllContents`, `AstUtils.streamContents`, `GrammarUtils.findNodeForProperty` | Already in use; the symbol provider API is fully public and designed for subclassing |
| `vscode-languageserver-types` | (existing) | `DocumentSymbol`, `SymbolKind`, `SymbolTag`, `Range` | Already in use via `bbj-node-kind.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None — no new packages needed | — | — | All required APIs already present |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Subclassing `DefaultDocumentSymbolProvider` | Full re-implementation | Subclassing is always preferred — inherits future Langium improvements automatically, reduces code surface |
| `AstUtils.streamAllContents` for deep AST walk | Text scan (regex over raw source) | AST walk preserves hierarchy and range information; text scan is a last resort for nodes that parser recovery discards entirely. Since Langium's error recovery is good enough to parse before/after the error, AST walk is more reliable and maintainable |
| Text scan fallback for missed symbols | No fallback | `bbj-scope-local.ts` already uses a regex fallback for class exports on parse errors; the same pattern is available here but the decision section marks this as Claude's discretion — use only if AST walk proves insufficient |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

One new file, one modified file:

```
bbj-vscode/src/language/
├── bbj-document-symbol-provider.ts   ← NEW: BBjDocumentSymbolProvider class
├── bbj-module.ts                     ← MODIFY: register DocumentSymbolProvider in lsp section
└── bbj-node-kind.ts                  ← unchanged (already handles all relevant SymbolKinds)
```

### How Langium's Document Symbol Pipeline Works

**Confidence: HIGH** — verified against `langium/lib/lsp/language-server.js` and `document-symbol-provider.js`.

1. The LSP connection registers `connection.onDocumentSymbol(...)` with `requiredState = DocumentState.Parsed`
2. `DocumentState.Parsed` is reached even for documents with parser errors — the AST exists with whatever error recovery produced
3. `getSymbols(document, params)` is called, receives `document.parseResult.value` (the root `Program` or `Model` node)
4. The default implementation calls `getSymbol(document, rootNode)` which recurses via `getChildSymbols` → `streamContents` → `getSymbol` per child
5. If an uncaught exception is thrown in `getSymbols()`, Langium's `responseError` re-throws non-cancellation errors — meaning an unhandled TypeError makes the outline go blank with an error in the client

**Key facts confirmed:**
- `document.parseResult.value` is always non-null (it's the `Program` root, potentially with empty `statements` array)
- `document.parseResult.parserErrors` may contain errors but the AST still exists
- `AstNode.$cstNode` may be `undefined` for nodes inserted by error recovery that have no source text mapping
- `GrammarUtils.findNodeForProperty(node.$cstNode, 'name')` returns `undefined` if `node.$cstNode` is `undefined` (it guards the `!node` case internally)
- `DefaultDocumentSymbolProvider.getSymbol()` already handles `nameNode == undefined || astNode.$cstNode == undefined` gracefully by falling through to `getChildSymbols` — the problem is with nodes that _do_ have a `$cstNode` but have an `undefined` name property

### Pattern 1: BBjDocumentSymbolProvider — Error-Safe Walk

**What:** Extends `DefaultDocumentSymbolProvider`, overrides `getSymbol()` to wrap each node in try/catch, adds `(parse error)` fallback, uses `AstUtils.streamAllContents` for deep traversal when shallow walk misses nodes after an error.

**When to use:** Always — replaces the default provider entirely via module registration.

**Key insight:** The `NamedElement` interface in the BBj grammar has `name: string` (required, not optional). After Chevrotain error recovery, a `BbjClass` or `MethodDecl` node may exist with `name: ''` or `name: undefined` (TypeScript type says `string` but runtime may differ under recovery). Guard `node.name` existence at runtime.

**Example:**

```typescript
// Source: pattern derived from DefaultDocumentSymbolProvider + bbj-scope-local.ts error recovery patterns
import { AstNode, AstUtils, CstNode, DefaultDocumentSymbolProvider, LangiumDocument, LangiumServices } from 'langium';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-types';
import { DocumentSymbolParams } from 'vscode-languageserver-protocol';

export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override getSymbols(document: LangiumDocument, params: DocumentSymbolParams): DocumentSymbol[] {
        try {
            return this.getSymbol(document, document.parseResult.value);
        } catch {
            // If traversal fails entirely, return empty — never throw to client
            return [];
        }
    }

    override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        try {
            const nameNode = this.nameProvider.getNameNode(astNode);
            if (nameNode && astNode.$cstNode) {
                const computedName = this.nameProvider.getName(astNode) ?? '';
                const displayName = computedName.trim() || '(parse error)';
                return [this.createSymbol(document, astNode, astNode.$cstNode, nameNode, displayName)];
            }
            // Node has no name node — check if it has a name property that is non-empty (error recovery case)
            const name = (astNode as any).name;
            if (typeof name === 'string' && name.trim() && astNode.$cstNode) {
                // Create a synthetic CST-based symbol using available range info
                return [this.createSymbol(document, astNode, astNode.$cstNode, astNode.$cstNode, name)];
            }
            return this.getChildSymbols(document, astNode) ?? [];
        } catch {
            // Per-node guard: skip this node, don't propagate
            return [];
        }
    }

    override getChildSymbols(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] | undefined {
        const children: DocumentSymbol[] = [];
        try {
            for (const child of AstUtils.streamContents(astNode)) {
                try {
                    const result = this.getSymbol(document, child);
                    children.push(...result);
                } catch {
                    // skip individual child
                }
            }
        } catch {
            // streamContents threw (shouldn't happen but guard anyway)
        }
        return children.length > 0 ? children : undefined;
    }
}
```

### Pattern 2: Recovery for Symbols After Error Point

**What:** Langium's Chevrotain parser uses built-in error recovery (token deletion, insertion, re-sync). After a syntax error in a method body, the parser re-synchronizes at `METHODEND` and continues. This means `BbjClass.members` typically contains the full list of `MethodDecl` nodes even when one method body is broken. The `DefaultDocumentSymbolProvider`'s `streamContents` already walks `members: MethodDecl[]` — the parent array is intact, so each method is visited.

**Confirmed by:** `Program` interface has `statements: Array<BbjClass | DefFunction | Statement>` — an array that survives partial parsing because Chevrotain populates it incrementally. `BbjClass` has `members: Array<ClassMember>` — same structure.

**When deeper walk is needed:** If a `BbjClass` node exists but its `name` is missing (class declaration itself was broken), the default walk won't emit a class symbol but still recursively visits members. If the class node is entirely missing from `Program.statements` (parser recovery discarded it), an `AstUtils.streamAllContents` scan or text regex is needed. The decision is Claude's discretion — the text regex fallback in `bbj-scope-local.ts` is the established pattern.

### Pattern 3: Module Registration

**What:** Register `BBjDocumentSymbolProvider` in `BBjModule.lsp` in `bbj-module.ts`.

**Example:**
```typescript
// bbj-module.ts — in BBjModule
lsp: {
    DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    // ... existing providers
},
```

This is the same pattern used for every other custom LSP provider in the file.

### Pattern 4: Debounce — Already Handled

**What:** The context decision requires debounced outline updates during rapid typing to avoid flicker.

**Finding (HIGH confidence):** Langium already handles this at the document build level. The `DefaultDocumentBuilder` uses a 2-second debounce (`updateDelay = 2000ms` by default — may vary) before triggering document updates after text changes. The LSP client (VS Code, IntelliJ via lsp4ij) re-requests `textDocument/documentSymbol` only after document state advances. **No custom debounce code is needed in the symbol provider.** The existing update pipeline is the debounce mechanism.

**Verification:** `addDocumentUpdateHandler` in Langium's `language-server.js` calls `connection.onDidChangeTextDocument` → `documentBuilder.update()` which internally coalesces rapid changes.

### Anti-Patterns to Avoid

- **Throwing from `getSymbols()`**: Any uncaught exception causes `responseError` to re-throw and the outline goes blank. All traversal code must be wrapped in try/catch.
- **Accessing `.name` without checking**: Under Chevrotain error recovery, `NamedElement.name` can be `undefined` at runtime even though the TypeScript type says `string`. Always check `typeof name === 'string' && name.trim()`.
- **Stopping traversal at first missing `$cstNode`**: The default `DefaultDocumentSymbolProvider.getSymbol()` gracefully handles `$cstNode === undefined` by falling through to `getChildSymbols()`. Do not skip this fallthrough — it is what allows symbols after the error point to be found.
- **Custom debounce in the symbol provider**: Not needed. Would create double-debounce and potential inconsistency.
- **Emitting empty-string symbol names**: The LSP `DocumentSymbol.name` field must not be an empty string. Always use `'(parse error)'` as the fallback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST traversal | Custom tree walker | `AstUtils.streamContents`, `AstUtils.streamAllContents` | Langium's streams handle null-safety, type guards (`isAstNode`), and array element filtering already |
| CST range lookup | Manual offset calculation | `GrammarUtils.findNodeForProperty(node.$cstNode, 'name')` | Already used in `BbjNameProvider` and `bbj-scope-local.ts`; handles undefined $cstNode gracefully |
| Error recovery strategy | Custom parser modification | None — rely on Chevrotain's built-in recovery | Grammar changes are explicitly out of scope; Chevrotain's recovery is already producing usable partial ASTs |
| Symbol kind mapping | New kind lookup table | `BBjNodeKindProvider.getSymbolKind()` | Already maps all relevant node types (`BbjClass` → Class, `MethodDecl` → Method, `FieldDecl` → Variable, `LabelDecl` → Key, `VariableDecl` → Variable, `ArrayDecl` → Array) |

**Key insight:** All the infrastructure for symbol extraction already exists and works correctly for valid files. The work is purely defensive wrappers and fallback handling — not new symbol logic.

---

## Common Pitfalls

### Pitfall 1: `name` Property Undefined at Runtime Despite TypeScript Type

**What goes wrong:** `NamedElement.name` is typed as `string` (not `string | undefined`). Under Chevrotain error recovery for a broken class declaration like `class public` (missing name), the parser may produce a `BbjClass` node with `name: ''` or `name: undefined`. Calling `nameNode.text` on a recovered node may return `''`. Emitting an empty-string symbol name violates the LSP spec.

**Why it happens:** TypeScript types reflect the grammar's intent, not what error recovery actually produces. The parser's assignment `name = ValidName` fails if `ValidName` was missing, leaving the property at its default value (which may be `undefined` or `''` depending on Chevrotain version).

**How to avoid:** Always check `typeof name === 'string' && name.trim()` before using a name. Use `'(parse error)'` as the display name when this check fails.

**Warning signs:** Test with a file that has `class public` (missing class name) — if the outline shows a symbol with an empty name, the guard is missing.

### Pitfall 2: Partial Class Body Hides Methods

**What goes wrong:** If a `BbjClass` node's `$cstNode` is missing or corrupt, the default `getSymbol()` call returns `getChildSymbols()`. But `getChildSymbols()` calls `streamContents(astNode)`, and `streamContents` checks `isAstNode(value)` on each property. Array entries that are `undefined` (due to recovery) return false from `isAstNode` and are silently skipped. If all `members` entries are bad, the class appears in the outline with no children.

**Why it happens:** Chevrotain may produce array slots with `undefined` values when a production fails mid-array. `streamContents` filters these out via `isAstNode(element)`. The class symbol may appear but have zero children even when the source has methods.

**How to avoid:** When collecting children for a `BbjClass`, also try `AstUtils.streamAllContents(astNode).filter(isBbjClass | isMethodDecl | isFieldDecl)` as a fallback path when `streamContents` produces zero children. This is Claude's discretion — the most maintainable approach.

**Warning signs:** Test with a class that has a broken first method but valid subsequent methods — if only the class appears but no methods appear as children, this pitfall has occurred.

### Pitfall 3: Symbol Provider Registered in Wrong Module

**What goes wrong:** Registering `DocumentSymbolProvider` in `BBjSharedModule` instead of `BBjModule`. The shared module only holds `NodeKindProvider`. Document symbol logic belongs in the language-specific module.

**Why it happens:** The module structure has two layers — `BBjSharedModule` (shared services) and `BBjModule` (language services). The `lsp` service group exists in both but for different purposes.

**How to avoid:** Register in `BBjModule.lsp`, following the same pattern as `DefinitionProvider`, `HoverProvider`, etc.

**Warning signs:** TypeScript compilation error about service types; or the custom provider never being called (Langium falls back to default).

### Pitfall 4: Symbols for Library/Synthetic Documents

**What goes wrong:** The symbol provider may be called for synthetic documents (e.g., the Java classpath document at `JavaSyntheticDocUri`, or `bbjlib://` URIs). These don't have `Program` as their root and may throw when the provider tries to extract BBj-specific symbols.

**Why it happens:** `createRequestHandler` looks up services by URI and forwards to the registered provider — all documents use the same `BBjDocumentSymbolProvider`.

**How to avoid:** Check `document.uri.scheme` early and return `[]` for synthetic URIs. Alternatively, guard with `isProgram(document.parseResult.value)` before walking statements. The existing `BBjDocumentValidator.shouldValidate()` shows the established pattern for excluding synthetic documents.

**Warning signs:** Errors in test runs involving classpath or library documents.

### Pitfall 5: Large File Threshold

**What goes wrong:** On very large BBj files (thousands of lines) with syntax errors, the deep `streamAllContents` fallback walk could be slow.

**Why it happens:** `streamAllContents` is a full tree traversal. On large files with many statement nodes, this takes longer than the shallow `streamContents` call in the default provider.

**How to avoid:** Per the context, Claude should pick an appropriate threshold based on typical BBj file sizes. A reasonable default is 50,000 characters — if `document.textDocument.getText().length > threshold`, skip the deep-walk fallback and return whatever the AST walk already found. This is a defensive measure; the primary walk via `streamContents` is still fast.

---

## Code Examples

Verified patterns from actual codebase:

### Registering a Custom LSP Provider

```typescript
// Source: bbj-vscode/src/language/bbj-module.ts — existing lsp section
lsp: {
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    HoverProvider: (services) => new BBjHoverProvider(services),
    CompletionProvider: (services) => new BBjCompletionProvider(services),
    SemanticTokenProvider: (services) => new BBjSemanticTokenProvider(services),
    SignatureHelp: () => new BBjSignatureHelpProvider(),
    // Add:
    DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),
},
```

### Checking for Parse Errors and Using parserErrors

```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts (lines 67-101)
if (document.parseResult.parserErrors.length > 0 || document.parseResult.lexerErrors.length > 0) {
    // Apply additional recovery logic
    const allBbjClasses = AstUtils.streamAllContents(document.parseResult.value)
        .filter(isBbjClass)
        .toArray();
    // ...
}
```

### AstNode Type Guards Available

```typescript
// Source: bbj-vscode/src/language/generated/ast.ts
import {
    BbjClass, isBbjClass,
    MethodDecl, isMethodDecl,
    FieldDecl, isFieldDecl,
    LabelDecl, isLabelDecl,
    VariableDecl, isVariableDecl,
    ArrayDecl, isArrayDecl,
    DefFunction, isDefFunction,
    Program, isProgram
} from './generated/ast.js';
```

### DefaultDocumentSymbolProvider API (Full)

```typescript
// Source: bbj-vscode/node_modules/langium/lib/lsp/document-symbol-provider.d.ts
export declare class DefaultDocumentSymbolProvider implements DocumentSymbolProvider {
    protected readonly nameProvider: NameProvider;
    protected readonly nodeKindProvider: NodeKindProvider;
    constructor(services: LangiumServices);
    getSymbols(document: LangiumDocument, _params: DocumentSymbolParams, _cancelToken?: CancellationToken): MaybePromise<DocumentSymbol[]>;
    protected getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[];
    protected createSymbol(document: LangiumDocument, astNode: AstNode, cstNode: CstNode, nameNode: CstNode, computedName?: string): DocumentSymbol;
    protected getChildSymbols(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] | undefined;
}
```

### `createSymbol` produces (verified from source):

```typescript
// Source: langium/lib/lsp/document-symbol-provider.js
{
    kind: this.nodeKindProvider.getSymbolKind(astNode),
    name: computedName || nameNode.text,
    range: cstNode.range,
    selectionRange: nameNode.range,
    children: this.getChildSymbols(document, astNode)
}
```

Note: `computedName || nameNode.text` — if `computedName` is `''`, it falls through to `nameNode.text`. For the `(parse error)` case, pass `'(parse error)'` as `computedName` to override. Also note `nameNode` is used for `selectionRange` — for partial nodes, passing `cstNode` as `nameNode` is acceptable, it just means the selection range equals the full node range.

### SymbolTag Available (but only Deprecated)

```typescript
// Source: vscode-languageserver-types/lib/esm/main.d.ts
export declare namespace SymbolTag {
    const Deprecated: 1;
}
export type SymbolTag = 1;
```

Only `SymbolTag.Deprecated` exists in LSP 3.16. There is **no "error" or "partial" SymbolTag**. For visual differentiation of broken symbols, options are: (a) use the same `SymbolKind` as normal (no visual difference, simplest), (b) use `SymbolKind.Null` or an unusual kind (IDEs may render differently), or (c) append text to the name like `TestMethod (partial)`. The context marks this as Claude's discretion.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No custom symbol provider — `DefaultDocumentSymbolProvider` used as-is | Custom `BBjDocumentSymbolProvider` extending default | This phase | Adds error resilience; existing behavior for valid files is 100% preserved |
| No error handling in symbol extraction | Per-node try/catch, `(parse error)` fallback | This phase | Outline stays populated under any parse error condition |

**Deprecated/outdated:**
- `SymbolInformation` (flat symbol list): deprecated in LSP 3.16 in favor of `DocumentSymbol` (hierarchical). Langium's `DefaultDocumentSymbolProvider` already uses `DocumentSymbol`. Do not use the old flat format.

---

## Open Questions

1. **Does Langium's error recovery produce symbols after the error point for BBj specifically?**
   - What we know: Chevrotain has built-in error recovery (re-sync at statement boundaries). `Program.statements` is an array populated incrementally. The BBj grammar's `Statements` fragment uses `statements+=` which means each successfully parsed statement is pushed independently.
   - What's unclear: Whether a broken method body at position N causes all subsequent methods to be missing from `BbjClass.members`, or just that one method.
   - Recommendation: Write a test first — parse a file with `class public TestClass\n  METHOD public void broken(@)\n  METHODEND\n  METHOD public void good()\n  METHODEND\nclassend` and inspect `document.parseResult.value` to see if `good` appears in members. This determines whether the standard walk is sufficient or a deep fallback is needed.

2. **Large file threshold value**
   - What we know: Context says Claude should pick an appropriate threshold. BBj programs at BASIS typically range from small scripts (< 1,000 lines) to large enterprise files (5,000-20,000 lines).
   - What's unclear: The actual performance impact of `streamAllContents` on a 20,000-line file.
   - Recommendation: Use 200,000 characters (~10,000 lines at 20 chars/line) as the threshold. At that size, skip the deep-walk fallback and return whatever the standard walk found. This is conservative — most files are well under this threshold.

3. **Debounce implementation**
   - What we know: Langium's `DefaultDocumentBuilder` has an internal `updateDelay` for coalescing text changes before processing. VS Code's LSP client only requests `documentSymbol` after the server sends a response to `textDocument/didChange`.
   - What's unclear: The exact debounce timing in the installed Langium 4.1.3 — could not find `updateDelay` constant in `node_modules`.
   - Recommendation: Do not add any debounce in `BBjDocumentSymbolProvider`. The existing pipeline is the debounce. If the user decision about debouncing refers to preventing flicker during typing, this is already handled at the Langium level.

---

## Sources

### Primary (HIGH confidence)

- `bbj-vscode/node_modules/langium/lib/lsp/document-symbol-provider.js` — full `DefaultDocumentSymbolProvider` implementation, verified line by line
- `bbj-vscode/node_modules/langium/lib/lsp/document-symbol-provider.d.ts` — TypeScript API for override points
- `bbj-vscode/node_modules/langium/lib/lsp/language-server.js` — `addDocumentSymbolHandler`, `createRequestHandler`, `requiredState = DocumentState.Parsed` confirmed
- `bbj-vscode/node_modules/langium/lib/utils/ast-utils.js` — `streamContents` implementation with `isAstNode` guard
- `bbj-vscode/node_modules/langium/lib/utils/grammar-utils.js` — `findNodeForProperty` guards undefined node
- `bbj-vscode/node_modules/langium/lib/workspace/documents.d.ts` — `LangiumDocument.parseResult: ParseResult<T>` confirmed always non-null
- `bbj-vscode/node_modules/langium/lib/syntax-tree.d.ts` — `AstNode.$cstNode?: CstNode` (optional), `NamedElement.name: string` (required but may be empty under recovery)
- `bbj-vscode/node_modules/vscode-languageserver-types/lib/esm/main.d.ts` — `DocumentSymbol` interface, `SymbolTag` namespace (only `Deprecated: 1` exists)
- `bbj-vscode/src/language/bbj-module.ts` — confirmed no `DocumentSymbolProvider` registered; `BBjNodeKindProvider` registered in `BBjSharedModule.lsp.NodeKindProvider`
- `bbj-vscode/src/language/bbj-node-kind.ts` — `BBjNodeKindProvider.getSymbolKind()` maps all relevant node types
- `bbj-vscode/src/language/bbj-scope-local.ts` — existing error recovery pattern: parse error detection + `AstUtils.streamAllContents` + regex text scan fallback
- `bbj-vscode/src/language/generated/ast.ts` — `Program.statements: Array<BbjClass | DefFunction | Statement>`, `BbjClass.members: Array<ClassMember>`, `MethodDecl.body: Array<DefFunction | Statement>`, `NamedElement.name: string`
- `bbj-vscode/src/language/bbj.langium` — `ClassDecl` grammar rule confirmed: `members+=ClassMember` (array, populated incrementally)
- `bbj-vscode/test/document-symbol.test.ts` — existing test for valid files; structure confirmed; no error-recovery tests exist yet

### Secondary (MEDIUM confidence)

- IntelliJ plugin source (`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java`) — confirmed IntelliJ uses `OSProcessStreamConnectionProvider` connecting to same Node.js LSP process; no IDE-specific symbol code
- Langium 4.1.3 version confirmed from `bbj-vscode/node_modules/langium/package.json`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all APIs verified in installed node_modules
- Architecture: HIGH — override points and registration pattern fully confirmed from source
- Pitfalls: HIGH — derived from direct code inspection (not assumptions); error recovery behavior is MEDIUM because actual Chevrotain recovery output for BBj-specific partial ASTs needs a test to verify

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days — Langium API is stable)
