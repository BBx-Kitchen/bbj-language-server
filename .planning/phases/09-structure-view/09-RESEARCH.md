# Phase 9: Structure View - Research

**Researched:** 2026-02-02
**Domain:** LSP4IJ DocumentSymbol / IntelliJ Structure View integration
**Confidence:** HIGH

## Summary

The Structure View regression has a clear, single root cause: the `lang.psiStructureViewFactory` extension point is missing from `plugin.xml`. LSP4IJ auto-registers this extension point only for TEXT and TextMate languages, but the BBj plugin uses a custom `BbjLanguage` class, which requires explicit registration. The language server side (Langium's `DefaultDocumentSymbolProvider` + custom `BBjNodeKindProvider`) is confirmed working -- the existing `document-symbol.test.ts` test passes and the bundled server advertises `documentSymbolProvider` in its capabilities.

The fix is a single XML line in `plugin.xml` that binds LSP4IJ's `LSPDocumentSymbolStructureViewFactory` to the `BBj` language. No Java code, no language server changes, no custom StructureViewProvider implementation needed. This is purely a configuration gap that was never added because the plugin was developed phase-by-phase and the Structure View extension point was not part of the Phase 04 (LSP integration) setup.

**Primary recommendation:** Add `<lang.psiStructureViewFactory language="BBj" implementationClass="com.redhat.devtools.lsp4ij.features.documentSymbol.LSPDocumentSymbolStructureViewFactory"/>` to plugin.xml, then verify the three success criteria (symbol tree renders, updates on edit, click-to-navigate works).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| LSP4IJ | 0.19.0 | Maps LSP documentSymbol to IntelliJ Structure View | Already the project's LSP client; provides `LSPDocumentSymbolStructureViewFactory` |
| Langium | (bundled in main.cjs) | Provides `DefaultDocumentSymbolProvider` + `BBjNodeKindProvider` | Already the language server framework; DocumentSymbol support is built-in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vscode-languageserver | (bundled) | LSP protocol types (`SymbolKind`, `DocumentSymbol`) | Already used by language server |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LSP4IJ auto-mapping | Custom `PsiStructureViewFactory` | No benefit; LSP4IJ handles all the mapping correctly |
| LSP4IJ auto-mapping | JetBrains native LSP API (2025.3+) | Only available in newer IDEs; plugin targets 2024.2+ |

**Installation:** No new dependencies needed. LSP4IJ 0.19.0 is already declared in `build.gradle.kts`.

## Architecture Patterns

### How LSP4IJ Structure View Works

The architecture has three layers:

```
Language Server (Langium)
  └── DefaultDocumentSymbolProvider
       └── BBjNodeKindProvider (maps AST nodes to SymbolKind)
            ↓ textDocument/documentSymbol response
LSP4IJ (IntelliJ plugin)
  └── LSPDocumentSymbolStructureViewFactory
       └── Maps DocumentSymbol[] to IntelliJ StructureView tree
            ↓ lang.psiStructureViewFactory extension point
IntelliJ Platform
  └── Structure Tool Window (Alt+7 / Cmd+7)
       └── Renders tree, handles click-to-navigate, auto-refresh
```

### Pattern: Extension Point Binding for Custom Languages

**What:** LSP4IJ auto-registers several IntelliJ extension points for TEXT and TextMate languages but requires explicit registration for custom languages.

**When to use:** Whenever the plugin defines a custom `Language` subclass (like `BbjLanguage`) and wants LSP features that map to IntelliJ extension points.

**Example:**
```xml
<!-- Source: LSP4IJ DeveloperGuide.md - Special Cases section -->
<extensions defaultExtensionNs="com.intellij">
    <!-- LSP textDocument/documentSymbol -> Structure View -->
    <lang.psiStructureViewFactory
        language="BBj"
        implementationClass="com.redhat.devtools.lsp4ij.features.documentSymbol.LSPDocumentSymbolStructureViewFactory"/>
</extensions>
```

### Current Symbol Coverage

The `BBjNodeKindProvider` (in `bbj-vscode/src/language/bbj-node-kind.ts`) maps these AST types:

| AST Type | SymbolKind | Appears In Structure View As |
|----------|-----------|------------------------------|
| `MethodDecl` | Function | Method icon |
| `LibFunction` | Function | Function icon |
| `BbjClass` | Class | Class icon |
| `ArrayDecl` | Array | Array icon |
| `LibEventType` | Event | Event icon |
| `JavaPackage` | Package | Package icon |
| Everything else | Field | Field icon (variables, labels, etc.) |

The existing test (`document-symbol.test.ts`) confirms the hierarchy:
- Top-level: `testVar!`, `TestClass`, `some_label`
- Under `TestClass`: `testField!`, `TestMethod`

### Anti-Patterns to Avoid

- **Writing a custom `PsiStructureViewFactory`:** LSP4IJ already provides one. A custom implementation would duplicate logic and break when LSP4IJ updates.
- **Modifying the language server to "fix" the Structure View:** The server is working correctly (test passes). The issue is plugin-side configuration only.
- **Registering DocumentSymbol via `LSPClientFeatures`:** The `LSPClientFeatures` class in the factory is for enabling/disabling features, not for wiring extension points. The extension point must be in `plugin.xml`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structure View tree rendering | Custom `PsiStructureViewFactory` | `LSPDocumentSymbolStructureViewFactory` from LSP4IJ | Handles all SymbolKind icons, tree hierarchy, selection range, click navigation |
| Symbol-to-icon mapping | Custom icon mapping in plugin | LSP4IJ default icon mapping from `SymbolKind` | LSP4IJ maps all standard SymbolKind values to IntelliJ icons |
| Auto-refresh on edit | Custom document listener | LSP4IJ built-in refresh | LSP4IJ re-requests documentSymbol on document changes |

**Key insight:** The entire Structure View feature is already implemented by LSP4IJ and the Langium language server. The only missing piece is a single XML declaration that connects them.

## Common Pitfalls

### Pitfall 1: Thinking the Regression is in the Language Server

**What goes wrong:** Spending time debugging the Langium DocumentSymbolProvider when the server is working correctly.
**Why it happens:** When a feature stops working, the instinct is to check the provider first.
**How to avoid:** The `document-symbol.test.ts` test passes, and the server advertises `documentSymbolProvider` in capabilities. The issue is exclusively in `plugin.xml`.
**Warning signs:** If DocumentSymbol works in VSCode but not IntelliJ, the problem is always on the IntelliJ/LSP4IJ side.

### Pitfall 2: Missing Extension Points for Custom Languages

**What goes wrong:** LSP4IJ silently does nothing when a required extension point is not registered for a custom language.
**Why it happens:** LSP4IJ only auto-registers for TEXT and TextMate languages. Custom language plugins must declare extension points explicitly.
**How to avoid:** Check the LSP4IJ DeveloperGuide "Special Cases" section for all extension points that need explicit binding.
**Warning signs:** Feature works for plain text files but not for files with your custom language.

### Pitfall 3: Forgetting `order="first"` When Needed

**What goes wrong:** Another plugin or the IDE provides a default `psiStructureViewFactory` for the same language, and it takes priority.
**Why it happens:** Extension point ordering matters when multiple providers exist.
**How to avoid:** For BBj, there is no competing `psiStructureViewFactory`, so `order="first"` is not needed. But it is harmless to add if future conflicts arise.
**Warning signs:** Structure View opens but shows wrong/empty content.

### Pitfall 4: Not Testing All Three Success Criteria

**What goes wrong:** Structure tree renders but navigation or auto-refresh does not work.
**Why it happens:** Only testing visual rendering without testing interaction.
**How to avoid:** Explicitly test: (1) tree renders with correct hierarchy, (2) editing updates the tree, (3) clicking navigates to symbol location.
**Warning signs:** Partial feature functionality.

## Code Examples

### The Fix: plugin.xml Addition

```xml
<!-- Source: LSP4IJ DeveloperGuide.md -->
<!-- Add inside <extensions defaultExtensionNs="com.intellij"> block -->

<!-- LSP textDocument/documentSymbol -> Structure View -->
<lang.psiStructureViewFactory
    language="BBj"
    implementationClass="com.redhat.devtools.lsp4ij.features.documentSymbol.LSPDocumentSymbolStructureViewFactory"/>
```

Place this alongside the other `com.intellij` extensions (e.g., after `lang.commenter` or `lang.parserDefinition`).

### Language Server DocumentSymbol Response (Reference)

The language server already produces correct responses. For a BBj file like:

```bbj
declare BBjVector testVar!
class public TestClass
    field public Boolean testField!
    method public void TestMethod()
    methodend
classend
some_label:
```

The server returns a `DocumentSymbol[]` with hierarchy:
```json
[
  { "name": "testVar!", "kind": 8, "range": "...", "selectionRange": "..." },
  { "name": "TestClass", "kind": 5, "range": "...", "selectionRange": "...",
    "children": [
      { "name": "testField!", "kind": 8, "range": "...", "selectionRange": "..." },
      { "name": "TestMethod", "kind": 12, "range": "...", "selectionRange": "..." }
    ]
  },
  { "name": "some_label", "kind": 8, "range": "...", "selectionRange": "..." }
]
```

Where kind 5 = Class, kind 8 = Field, kind 12 = Function.

### BBjNodeKindProvider (Existing Code, No Changes Needed)

```typescript
// Source: bbj-vscode/src/language/bbj-node-kind.ts
export class BBjNodeKindProvider implements NodeKindProvider {
    getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case MethodDecl:
            case LibFunction:
                return SymbolKind.Function
            case BbjClass:
                return SymbolKind.Class
            case ArrayDecl:
                return SymbolKind.Array
            case LibEventType:
                return SymbolKind.Event
            case JavaPackage:
                return SymbolKind.Package
            default:
                return SymbolKind.Field
        }
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No Structure View for custom languages in LSP4IJ | `lang.psiStructureViewFactory` binding | LSP4IJ 0.6.0 | Custom languages must declare extension point |
| No breadcrumbs support | Breadcrumbs via documentSymbol | LSP4IJ 0.12.0 | Auto-registered for all languages (no plugin.xml needed) |
| LSP4IJ only | JetBrains native LSP API (2025.3+) | JetBrains 2025.3 | Native documentSymbol support, but requires newer IDE |

**Note:** The plugin targets IntelliJ 2024.2+ (`sinceBuild = "242"`), so the JetBrains native LSP API is not yet applicable.

## Related Extension Points Also Missing

While out of scope for this phase, the following LSP4IJ extension points are also missing for the custom BBj language and could be added in future phases:

| Extension Point | LSP4IJ Class | LSP Feature | Current State |
|----------------|-------------|-------------|---------------|
| `lang.foldingBuilder` | `LSPFoldingRangeBuilder` | textDocument/foldingRange | Server advertises capability, plugin missing registration |
| `codeInsight.parameterInfo` | `LSPParameterInfoHandler` | textDocument/signatureHelp | Server advertises capability, plugin missing registration |

These are noted here because they share the same root cause pattern (missing extension point for custom language) and the planner may want to add them as bonus items.

## Open Questions

1. **Was Structure View ever truly working?**
   - What we know: Context says it "was working during v1.0 development." However, git history shows `lang.psiStructureViewFactory` was never registered in `plugin.xml`. It is possible it worked when the plugin briefly used TextMate language ID instead of a custom language, or it was tested against a development version of LSP4IJ that auto-registered more broadly.
   - What's unclear: The exact timeline of when it broke vs. when the custom language was introduced.
   - Recommendation: The fix is clear regardless of the historical cause. Register the extension point and verify.

2. **Should folding and signature help extension points be added in this phase?**
   - What we know: Both are missing the same way as the Structure View extension point.
   - What's unclear: Whether they are in scope for Phase 09.
   - Recommendation: They are out of scope per the phase boundary but should be flagged for a future phase or added as optional bonus items.

## Sources

### Primary (HIGH confidence)
- LSP4IJ DeveloperGuide.md - "Special Cases" section documenting `lang.psiStructureViewFactory` requirement for custom languages: https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md
- LSP4IJ LSPSupport.md - DocumentSymbol feature documentation: https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPSupport.md
- Local codebase verification:
  - `bbj-intellij/src/main/resources/META-INF/plugin.xml` - confirmed missing `lang.psiStructureViewFactory`
  - `bbj-vscode/src/language/bbj-node-kind.ts` - confirmed working `BBjNodeKindProvider`
  - `bbj-vscode/test/document-symbol.test.ts` - confirmed passing test (1 test, all green)
  - `bbj-vscode/out/language/main.cjs` - confirmed server advertises `documentSymbolProvider`
  - `bbj-intellij/build.gradle.kts` - confirmed LSP4IJ 0.19.0 dependency

### Secondary (MEDIUM confidence)
- LSP4IJ GitHub releases page - confirmed documentSymbol support added in 0.6.0: https://github.com/redhat-developer/lsp4ij/releases
- IntelliJ Platform SDK - Structure View documentation: https://plugins.jetbrains.com/docs/intellij/structure-view.html

### Tertiary (LOW confidence)
- None needed. All findings verified with primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from codebase and LSP4IJ official docs
- Architecture: HIGH - verified from LSP4IJ DeveloperGuide and local code inspection
- Root cause: HIGH - confirmed via git history (never registered) and official docs (required for custom languages)
- Pitfalls: HIGH - derived from direct investigation and official documentation

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable domain, LSP4IJ 0.19.0 is pinned)
