# Architecture: Langium 3.2.1 to 4.x Migration Impact

**Domain:** Language Server framework upgrade (Langium 3 to 4)
**Researched:** 2026-02-03
**Target version:** Langium 4.1.3 / langium-cli 4.1.0
**Confidence:** MEDIUM-HIGH (based on official blog post, CHANGELOG, and codebase analysis; WebFetch to official docs was unavailable for deep verification of some specifics)

## Executive Summary

The Langium 3.2.1 to 4.x upgrade introduces roughly 10 breaking changes, of which 6 directly impact the BBj language server codebase. The DI module system (`inject`, `createDefaultModule`, `createDefaultSharedModule`) and the LS entry point (`main.ts`, `startLanguageServer`) are structurally unchanged -- this is good news. The main effort concentrates on: (1) renaming `PrecomputedScopes` to `LocalSymbols` and updating the `document.precomputedScopes` property to `document.localSymbols`, (2) updating AST type string constants from `TypeName` to `TypeName.$type` across ~25 usage sites, (3) adapting the linker and scope provider for `Reference | MultiReference`, (4) updating the `createReferenceCompletionItem` signature, and (5) regenerating all grammar-derived code. The bundling (esbuild to CJS) and VS Code / IntelliJ consumption patterns are unaffected.

## Current Architecture (Langium 3.2.1)

### Component Map

```
src/language/
  bbj.langium              (999 lines)  -- Main grammar
  java-types.langium       (62 lines)   -- Java type declarations (interfaces only, no parser rules)
  generated/
    ast.ts                 (~4000 lines) -- Generated: AST types, type guards, reflection
    grammar.ts             (~large)      -- Generated: Grammar JSON
    module.ts              (31 lines)    -- Generated: DI module with AstReflection, Grammar, LanguageMetaData
  bbj-module.ts                         -- Custom DI module + createBBjServices()
  main.ts                               -- LS entry point
  bbj-scope-local.ts                    -- ScopeComputation (uses PrecomputedScopes)
  bbj-scope.ts                          -- ScopeProvider (uses precomputedScopes property)
  bbj-linker.ts                         -- Linker (uses ReferenceInfo, doLink)
  bbj-completion-provider.ts            -- CompletionProvider (uses createReferenceCompletionItem)
  bbj-lexer.ts                          -- Custom lexer (line continuation handling)
  bbj-token-builder.ts                  -- Custom token builder (context-sensitive tokens)
  bbj-hover.ts                          -- Hover provider
  bbj-validator.ts                      -- Validation checks
  bbj-document-validator.ts             -- DocumentValidator (linking error downgrade)
  bbj-document-builder.ts               -- DocumentBuilder (transitive BBj imports)
  bbj-ws-manager.ts                     -- WorkspaceManager (settings, library loading)
  bbj-index-manager.ts                  -- IndexManager (external document filtering)
  bbj-nodedescription-provider.ts       -- AST description provider
  bbj-semantic-token-provider.ts        -- Semantic tokens
  bbj-signature-help-provider.ts        -- Signature help
  bbj-type-inferer.ts                   -- Type inference
  bbj-value-converter.ts                -- Value converter
  bbj-comment-provider.ts               -- Comment provider
  java-interop.ts                       -- Java backend JSON-RPC client
  validations/                          -- Additional validation checks
```

### Dependency Injection Flow (Unchanged in Langium 4)

```
main.ts
  createConnection(ProposedFeatures.all)
  createBBjServices({ connection, ...NodeFileSystem })
    inject(createDefaultSharedModule(context), BBjGeneratedSharedModule, BBjSharedModule)
    inject(createDefaultModule({ shared }), BBjGeneratedModule, BBjModule)
    shared.ServiceRegistry.register(BBj)
    registerValidationChecks(BBj)
  startLanguageServer(shared)
```

This pattern is standard Langium 3.x and remains valid in Langium 4.x. The `inject()`, `createDefaultSharedModule()`, `createDefaultModule()`, and `startLanguageServer()` functions have not changed their signatures.

### Import Path Pattern (Already Correct)

The codebase already uses the post-3.0 import split:
- `'langium'` for core types (AstNode, Reference, DefaultLinker, etc.)
- `'langium/lsp'` for LSP types (LangiumServices, LangiumSharedServices, createDefaultModule, etc.)
- `'langium/node'` for NodeFileSystem

These import paths are unchanged in Langium 4.

## Breaking Changes Impact Analysis

### BREAKING CHANGE 1: PrecomputedScopes renamed to LocalSymbols (#1788)

**Severity: HIGH -- direct code changes required in 3 files**

**What changed:**
- Type `PrecomputedScopes` renamed to `LocalSymbols`
- `LangiumDocument.precomputedScopes` property renamed to `LangiumDocument.localSymbols`
- A dedicated `LocalSymbols` interface was introduced (may differ from the raw `MultiMap<AstNode, AstNodeDescription>` that `PrecomputedScopes` was an alias for)

**Files impacted:**

| File | Usage | Change Required |
|------|-------|-----------------|
| `bbj-scope-local.ts` | `PrecomputedScopes` type in 4 locations (import, return type, parameter types) | Rename to `LocalSymbols` |
| `bbj-scope.ts` | `document.precomputedScopes` in 3 locations (lines 133, 248, 337) | Rename to `document.localSymbols` |
| `bbj-scope-local.ts` | `computeLocalScopes` return type `Promise<PrecomputedScopes>` | Rename return type |

**Specific code sites:**

```typescript
// bbj-scope-local.ts line 12 (import)
import { PrecomputedScopes } from 'langium';
// CHANGE TO:
import { LocalSymbols } from 'langium';

// bbj-scope-local.ts line 59 (method signature)
override async computeLocalScopes(...): Promise<PrecomputedScopes>
// CHANGE TO:
override async computeLocalScopes(...): Promise<LocalSymbols>

// bbj-scope-local.ts line 81, 260 (parameter types)
protected override async processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes)
private addToScope(scopes: PrecomputedScopes, scopeHolder: AstNode, descr: AstNodeDescription)
// CHANGE TO: LocalSymbols

// bbj-scope.ts lines 133, 248, 337
const precomputed = doc.precomputedScopes
document.precomputedScopes?.get(program)
document?.precomputedScopes?.get(bbjType)
// CHANGE TO: doc.localSymbols, document.localSymbols?.get(...)
```

**Confidence: HIGH** -- Rename confirmed in CHANGELOG as breaking change. The property rename on `LangiumDocument` is confirmed by multiple sources. The exact interface shape of `LocalSymbols` vs old `MultiMap` needs verification during implementation (may need to check if `.get()` and `.add()` still work the same way).

**Risk factor:** LOW if `LocalSymbols` is structurally compatible with `MultiMap<AstNode, AstNodeDescription>`. The `computeLocalScopes` in `BbjScopeComputation` creates `new MultiMap<AstNode, AstNodeDescription>()` directly (line 61). If `LocalSymbols` is a different interface, the constructor pattern may also need updating.

---

### BREAKING CHANGE 2: AST Type String Constants ($type suffix) (#1942)

**Severity: HIGH -- ~25+ code sites to update across many files**

**What changed:**
In Langium 3.x, generated `ast.ts` exports string constants like:
```typescript
export const FieldDecl = 'FieldDecl';
export const MethodDecl = 'MethodDecl';
```

In Langium 4.x, these constants have moved to a `$type` property, so access becomes `FieldDecl.$type` instead of just `FieldDecl`.

**Files impacted (every file using AST type string constants):**

| File | Usage Pattern | Sites |
|------|--------------|-------|
| `bbj-scope-local.ts` | `type: FieldDecl`, `type: MethodDecl`, `$type === CompoundStatement` | 6 |
| `bbj-linker.ts` | `type: VariableDecl`, `$type === BinaryExpression`, `$type === ParameterCall`, `$type === ConstructorCall`, `descr.type !== MethodDecl`, `descr.type !== LibFunction` | 6 |
| `bbj-nodedescription-provider.ts` | `case MethodDecl:`, `case LibFunction:`, `case JavaMethod:`, `case LibEventType:` in switch | 4 |
| `bbj-semantic-token-provider.ts` | `case ParameterDecl:`, `case SymbolRef:`, `case MethodCall:` | 3 |
| `bbj-scope.ts` | `descr.type === MethodDecl`, type arguments to `allElements()`, `getGlobalScope()` calls | ~8 |
| `bbj-validator.ts` | `ValidationChecks<BBjAstType>` registration keys | ~12 |
| `java-interop.ts` | `$type: Classpath` in synthetic document creation | 1 |
| `validations/check-classes.ts` | `ValidationChecks<BBjAstType>` registration keys | ~6 |
| `bbj-document-validator.ts` | `DocumentValidator.LinkingError` (may be unaffected if this is a static const) | 1 |

**Example transformations:**

```typescript
// BEFORE (Langium 3.x)
type: FieldDecl,
descr.type !== MethodDecl
case MethodDecl: return enhanceFunctionDescription(...)
scopeHolder.$type === CompoundStatement

// AFTER (Langium 4.x) -- NEEDS VERIFICATION
type: FieldDecl.$type,
descr.type !== MethodDecl.$type
case MethodDecl.$type: return enhanceFunctionDescription(...)
scopeHolder.$type === CompoundStatement.$type
```

**Confidence: MEDIUM** -- The CHANGELOG confirms "generated type names from ast.ts have been moved from `<typeName>` to `<typeName>.$type`". However, the exact mechanism needs verification: do the existing string constant exports still exist alongside a new object export, or are they completely replaced? The search results suggest the constants move from being strings to being something with a `.$type` property. This needs to be confirmed by regenerating the grammar and examining the output.

**CRITICAL NOTE:** The `ValidationChecks<BBjAstType>` registrations in `bbj-validator.ts` and `check-classes.ts` use type names as keys:
```typescript
const checks: ValidationChecks<BBjAstType> = {
    LabelDecl: validator.checkLabelDecl,
    Use: validator.checkUsedClassExists,
    // ...
};
```
These are TypeScript literal types (property names), not runtime string values. They may or may not be affected by this change depending on how `ValidationChecks` is typed in Langium 4. This needs careful verification.

---

### BREAKING CHANGE 3: Reference | MultiReference in Linker and Scope (#1509)

**Severity: MEDIUM -- impacts custom linker**

**What changed:**
- The type of references used throughout the linker service and scope provider is now `Reference | MultiReference`
- `References#findDeclaration` renamed to `findDeclarations` and returns an array

**Files impacted:**

| File | Usage | Impact |
|------|-------|--------|
| `bbj-linker.ts` | `doLink(refInfo: ReferenceInfo, document: LangiumDocument)` | Method signature may need `Reference \| MultiReference` handling |
| `bbj-linker.ts` | `getCandidate(refInfo: ReferenceInfo)` | May need to handle MultiReference cases |
| `bbj-scope.ts` | `getScope(context: ReferenceInfo)` | ReferenceInfo type may include MultiReference fields |

**Current doLink signature:**
```typescript
override doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
    // accesses refInfo.container, refInfo.property, refInfo.reference
    // refInfo.reference.$refText is used for matching
}
```

**Impact analysis:**
- `BbjLinker.doLink()` receives `ReferenceInfo` which contains a `.reference` field. If this field type changed from `Reference` to `Reference | MultiReference`, the code accessing `refInfo.reference.$refText` and `refInfo.reference.$refNode` must handle both cases.
- `BbjLinker.getCandidate()` returns `AstNodeDescription | LinkingError` -- this return type may change if Langium 4 expects support for multiple candidates.
- The BBj grammar currently does not use multi-references (no `@=` syntax), so the actual runtime behavior should be single references. But the TypeScript types must be correct.

**Confidence: MEDIUM** -- The change is confirmed but the exact TypeScript type signatures need verification against Langium 4 source. The BBj language does not use multi-references, so the adaptation likely involves union type handling only.

---

### BREAKING CHANGE 4: createReferenceCompletionItem Signature (#1976)

**Severity: MEDIUM -- 1 file, 2 sites**

**What changed:**
`DefaultCompletionProvider#createReferenceCompletionItem` now requires more arguments.

**File impacted:**

```typescript
// bbj-completion-provider.ts lines 15-16
override createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription): CompletionValueItem {
    const superImpl = super.createReferenceCompletionItem(nodeDescription)
```

Both the override signature and the `super` call need to be updated to include the new required arguments.

**Confidence: MEDIUM** -- The change is confirmed in the CHANGELOG but the exact new parameters are unknown without checking Langium 4 source code. Will need to check the `DefaultCompletionProvider` class API during implementation.

---

### BREAKING CHANGE 5: DefaultServiceRegistry Singleton Removed (#1768)

**Severity: LOW -- may or may not impact**

**What changed:**
The singleton item in `DefaultServiceRegistry` has been removed. The `DefaultServiceRegistry#map` field has been deprecated in favor of `fileExtensionMap` and `languageIdMap`.

**File impacted:**

```typescript
// bbj-ws-manager.ts line 44
const bbjServices = services.ServiceRegistry.all.find(
    service => service.LanguageMetaData.languageId === 'bbj'
) as BBjServices;
```

This code uses `ServiceRegistry.all` which iterates all registered services. This should still work, but needs verification. The `.all` property may return a different structure if the internal registry changed.

**Confidence: LOW** -- The specific impact on `.all` iteration is not confirmed. The code pattern is unusual (looking up language services from shared services by ID); it may need adaptation.

---

### BREAKING CHANGE 6: FileSystemProvider Extended Interface (#1784)

**Severity: LOW -- likely no custom FS provider**

**What changed:** The extended file system provider interface requires implementing more methods.

**Impact analysis:** The BBj LS uses `NodeFileSystem` from `'langium/node'` which provides the standard Node.js filesystem implementation. Since `NodeFileSystem` is maintained by Langium, it will be updated to match the new interface. No custom `FileSystemProvider` is implemented in the BBj codebase.

However, `BBjWorkspaceManager` directly calls `this.fileSystemProvider.readDirectory()` and `this.fileSystemProvider.readFile()`. If these methods changed signatures, updates would be needed.

**Confidence: MEDIUM** -- No custom FS provider, but method signatures on the existing provider may have changed.

---

### BREAKING CHANGE 7: TypeScript 5.8+ Required

**Severity: NONE (already satisfied)**

Current `package.json` has `"typescript": "^5.8.3"` which satisfies the `>= 5.8.0` requirement.

---

### BREAKING CHANGE 8: Grammar Rule Naming Restrictions (#1979)

**Severity: NONE (not affected)**

Rules cannot share names with the grammar they are in, and grammar names must be unique. The BBj grammar is named `BBj` (line 6 of `bbj.langium`). Checking rule names:
- No rule is named `BBj` (there is `BbjClass`, `BBjTypeRef`, etc., but not exactly `BBj`)
- There is only one grammar file with parser rules (`bbj.langium`); `java-types.langium` has only `interface` declarations
- Grammar names are already unique (`BBj` is the only grammar name)

---

### BREAKING CHANGE 9: Removed Deprecated Fields/Functions (#1991)

**Severity: UNKNOWN -- needs verification during implementation**

Several deprecated fields and functions were removed. The exact list is not available from the CHANGELOG; it requires checking PR #1991. The BBj codebase uses these Langium APIs that might be affected:

| API | File | Risk |
|-----|------|------|
| `prepareLangiumParser` | `bbj-module.ts` | MEDIUM -- may have been deprecated |
| `DocumentState.Linked` / `DocumentState.Validated` | `bbj-linker.ts`, `bbj-document-builder.ts` | LOW -- likely still exists |
| `DocumentValidator.LinkingError` | `bbj-document-validator.ts` | LOW -- likely still exists |

**`prepareLangiumParser` is the highest risk item.** The `bbj-module.ts` uses:
```typescript
import { prepareLangiumParser } from 'langium';
const parser = prepareLangiumParser(services);
```
If `prepareLangiumParser` was deprecated in 3.x and removed in 4.0, this will be a compile error. The alternative would be constructing the parser differently.

**Confidence: LOW** -- Cannot confirm without checking Langium 4 exports. Flag for immediate verification.

---

### BREAKING CHANGE 10: Refined EBNF Terminals (#1966)

**Severity: LOW -- grammar regeneration handles this**

Refined EBNF-based terminals to avoid synthetic capturing groups. This affects how terminal rules with character classes and alternations are compiled. Since the BBj grammar uses custom `BBjTokenBuilder` that overrides `buildTerminalToken` for most custom terminals, and the standard terminals (ID, STRING_LITERAL, etc.) are defined with simple regex patterns, this should have minimal impact.

**Action:** Regenerate grammar and verify terminal behavior with the test suite.

## Generated Code Changes

### What Regeneration Produces

Running `langium generate` with `langium-cli@4.1.0` will regenerate three files in `src/language/generated/`:

1. **`ast.ts`** -- This will change significantly:
   - Type constant exports change from `export const TypeName = 'TypeName'` to a pattern using `TypeName.$type`
   - `BBjAstReflection` class may have structural changes
   - Type guard functions (`isXxx`) should remain functionally equivalent
   - `TypeMetaData` entries may change structure

2. **`grammar.ts`** -- The grammar JSON structure should be largely the same, but may include new metadata fields

3. **`module.ts`** -- The generated module structure should remain compatible. Current structure:
   ```typescript
   export const BBjGeneratedSharedModule: Module<LangiumSharedCoreServices, LangiumGeneratedSharedCoreServices> = {
       AstReflection: () => new BBjAstReflection()
   };
   export const BBjGeneratedModule: Module<LangiumCoreServices, LangiumGeneratedCoreServices> = {
       Grammar: () => BBjGrammar(),
       LanguageMetaData: () => BBjLanguageMetaData,
       parser: { ParserConfig: () => parserConfig }
   };
   ```
   This may have the same or slightly different types. The `LangiumGeneratedCoreServices` type may have new fields.

### langium-config.json Changes

The current `langium-config.json` is:
```json
{
    "projectName": "BBj",
    "languages": [{
        "id": "bbj",
        "grammar": "src/language/bbj.langium",
        "fileExtensions": [".bbj", ".bbl", ".bbjt"],
        "caseInsensitive": true,
        "textMate": { "out": "syntaxes/gen-bbj.tmLanguage.json" }
    }],
    "out": "src/language/generated",
    "chevrotainParserConfig": {
        "recoveryEnabled": true,
        "nodeLocationTracking": "full"
    }
}
```

**New options available in Langium 4 (optional):**
- `strict: true` -- disallows inferred types (not recommended to enable during migration; adds complexity)
- `fileNames` -- improved control over file associations

**No required changes** to the config format. The existing config should work with langium-cli 4.1.0.

## Components: Changed vs Unchanged

### UNCHANGED (No code changes needed)

| Component | File | Why Unchanged |
|-----------|------|---------------|
| Entry point | `main.ts` | `startLanguageServer`, `createConnection`, `NodeFileSystem` patterns identical |
| Extension | `extension.ts` | VS Code client side, no Langium API usage |
| Lexer | `bbj-lexer.ts` | Extends `DefaultLexer`, no changed APIs |
| Value converter | `bbj-value-converter.ts` | Extends `DefaultValueConverter`, no changed APIs |
| Comment provider | `bbj-comment-provider.ts` | Implements `CommentProvider`, interface unchanged |
| Hover provider | `bbj-hover.ts` | Extends `AstNodeHoverProvider`, no changed APIs |
| Type inferer | `bbj-type-inferer.ts` | Custom service, no Langium base class changes |
| Java interop | `java-interop.ts` | Custom service, minor `$type: Classpath` update only |
| Signature help | `bbj-signature-help-provider.ts` | Extends `AbstractSignatureHelpProvider`, no changed APIs |
| esbuild config | `esbuild.mjs` | Bundler config unchanged; CJS output still works |

### MODIFIED (Code changes required)

| Component | File | Changes |
|-----------|------|---------|
| **DI Module** | `bbj-module.ts` | `prepareLangiumParser` may be removed; verify and update parser creation |
| **Scope computation** | `bbj-scope-local.ts` | `PrecomputedScopes` -> `LocalSymbols` (4 sites); AST type constants -> `.$type` (6 sites) |
| **Scope provider** | `bbj-scope.ts` | `document.precomputedScopes` -> `document.localSymbols` (3 sites); AST type constants (8 sites) |
| **Linker** | `bbj-linker.ts` | `Reference \| MultiReference` type handling; AST type constants (6 sites) |
| **Completion** | `bbj-completion-provider.ts` | `createReferenceCompletionItem` new signature (2 sites) |
| **Node descriptions** | `bbj-nodedescription-provider.ts` | AST type constants in switch cases (4 sites) |
| **Semantic tokens** | `bbj-semantic-token-provider.ts` | AST type constants in switch cases (3 sites) |
| **Validator** | `bbj-validator.ts` | AST type constants in ValidationChecks keys (verify if affected) |
| **Class checks** | `validations/check-classes.ts` | AST type constants in ValidationChecks keys (verify if affected) |
| **Document builder** | `bbj-document-builder.ts` | Possibly unchanged; verify `BuildOptions` type |
| **Workspace manager** | `bbj-ws-manager.ts` | `ServiceRegistry.all` usage; verify FS provider methods |
| **Index manager** | `bbj-index-manager.ts` | Likely unchanged; verify `isAffected` signature |
| **Document validator** | `bbj-document-validator.ts` | Likely unchanged; verify `DiagnosticData`, `DocumentValidator.LinkingError` |

### REGENERATED (Automatic, no manual changes)

| Component | File | Notes |
|-----------|------|-------|
| AST types | `generated/ast.ts` | Full regeneration; type constant format changes |
| Grammar | `generated/grammar.ts` | Full regeneration; JSON structure may change slightly |
| Module | `generated/module.ts` | Full regeneration; types may change slightly |

## Data Flow Changes

### Scope Computation Flow

**Before (Langium 3.x):**
```
computeLocalScopes() → returns MultiMap<AstNode, AstNodeDescription> as PrecomputedScopes
  → stored in document.precomputedScopes
  → consumed by ScopeProvider via document.precomputedScopes.get(node)
```

**After (Langium 4.x):**
```
computeLocalScopes() → returns LocalSymbols (new dedicated interface)
  → stored in document.localSymbols
  → consumed by ScopeProvider via document.localSymbols.get(node)
```

**Key question:** Does `LocalSymbols` still support `new MultiMap<AstNode, AstNodeDescription>()` as its implementation? The `BbjScopeComputation.computeLocalScopes()` creates `const scopes = new MultiMap<AstNode, AstNodeDescription>()` and returns it. If `LocalSymbols` requires a different type, the construction pattern must change. **Flag for immediate verification.**

### Linking Flow

**Before (Langium 3.x):**
```
AstUtils.streamReferences(node) → Stream<ReferenceInfo>
  each ReferenceInfo contains: { container, property, reference: Reference }
  doLink(refInfo, document) → processes single Reference
```

**After (Langium 4.x):**
```
AstUtils.streamReferences(node) → Stream<ReferenceInfo>
  each ReferenceInfo may contain: { container, property, reference: Reference | MultiReference }
  doLink(refInfo, document) → must handle Reference | MultiReference
```

Since the BBj grammar does not use multi-references (`@=` syntax), all actual references at runtime will be single `Reference` objects. The code must compile with the wider union type, but behavior should be identical.

## Recommended Migration Order

### Phase 1: Dependency Update + Grammar Regeneration (Foundation)

**Why first:** Establishes the new baseline. Generated code must be regenerated before any hand-written code changes can compile against it.

1. Update `package.json`:
   - `"langium": "~4.1.3"`
   - `"langium-cli": "~4.1.0"`
   - `"chevrotain": "~11.0.3"` (verify compatibility)
2. Run `npm install`
3. Run `npx langium generate`
4. Examine regenerated `ast.ts`, `grammar.ts`, `module.ts` for structural changes
5. **DO NOT expect compilation to succeed yet** -- this establishes the new generated code

### Phase 2: Fix Compile Errors - Type Renames (Quick wins)

**Why second:** These are mechanical renames with no logic changes.

1. `PrecomputedScopes` -> `LocalSymbols` in imports and type annotations
2. `document.precomputedScopes` -> `document.localSymbols` in property access
3. Verify `MultiMap` is still valid for `LocalSymbols` construction
4. Fix any removed deprecated imports that cause immediate compile errors

### Phase 3: Fix Compile Errors - AST Type Constants (Systematic)

**Why third:** Most files affected, but changes are mechanical once the new pattern is understood.

1. Examine the new `ast.ts` to understand the exact new constant format
2. If constants moved to `TypeName.$type`: Update all `type: TypeName` to `type: TypeName.$type`
3. If constants moved to `TypeName.$type`: Update all `case TypeName:` to `case TypeName.$type:`
4. If constants moved to `TypeName.$type`: Update all `$type === TypeName` to `$type === TypeName.$type`
5. Verify `ValidationChecks<BBjAstType>` key syntax (these are TypeScript property names, may work differently)

### Phase 4: Fix Compile Errors - API Signature Changes (Careful)

**Why fourth:** These require understanding the new API shapes, not just renaming.

1. Update `createReferenceCompletionItem` signature and `super` call
2. Update `doLink` / `getCandidate` for `Reference | MultiReference` type
3. Verify/fix `prepareLangiumParser` usage (may need replacement)
4. Check `ServiceRegistry.all` usage pattern

### Phase 5: Verification and Testing

**Why last:** Full integration testing after all compile errors resolved.

1. Build passes (`tsc -b tsconfig.json`)
2. Bundle succeeds (`node esbuild.mjs`)
3. Run existing test suite (`vitest run`)
4. Manual testing: Start VS Code extension, verify:
   - Parsing works (syntax highlighting, error detection)
   - Completion works
   - Go-to-definition works
   - Hover works
   - Java interop works
   - Validation works
5. Manual testing: Start IntelliJ plugin (uses same `main.cjs`), verify basic functionality

## Bundling and Distribution: No Changes

The esbuild configuration remains valid:

```javascript
// esbuild.mjs -- NO CHANGES NEEDED
entryPoints: ['src/extension.ts', 'src/language/main.ts'],
outdir: 'out',
outExtension: { '.js': '.cjs' },
bundle: true,
target: "es6",
format: 'cjs',
external: ['vscode'],
platform: 'node',
```

Langium 4.x continues to be ESM-native but fully bundleable to CJS via esbuild. The VS Code extension expects `out/extension.cjs` and the LS expects `out/language/main.cjs` -- both produced by this config.

The IntelliJ plugin bundles and runs `main.cjs` via Node.js stdio -- this is completely transparent to the Langium version.

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `prepareLangiumParser` removed | Medium | High (blocks parser creation) | Check Langium 4 exports immediately; alternative: use standard parser creation |
| `LocalSymbols` interface incompatible with `MultiMap` | Low | High (blocks scope computation) | Check interface definition; may need adapter |
| `ValidationChecks` key format changed | Low | Medium (breaks validation registration) | Regenerate and inspect; keys are TypeScript literal types |
| Hidden deprecated API removals (#1991) | Medium | Medium (compile errors) | Systematic: fix all compile errors after dependency update |
| Chevrotain version incompatibility | Low | High (parser breaks) | Langium 4 pins its own chevrotain; verify peer dependency |
| Test suite assumptions broken | Medium | Low (tests fail) | Run tests early; fix assertions |

## Sources

- [Langium 4.0 Release Blog Post](https://www.typefox.io/blog/langium-release-4.0/) -- Official announcement with feature overview
- [Langium CHANGELOG](https://github.com/eclipse-langium/langium/blob/main/packages/langium/CHANGELOG.md) -- Detailed breaking changes list
- [Langium GitHub Releases](https://github.com/langium/langium/releases) -- Version-specific release notes
- [Langium npm package](https://www.npmjs.com/package/langium) -- Latest version 4.1.3
- [langium-cli npm package](https://www.npmjs.com/package/langium-cli) -- Latest version 4.1.0
- [PR #1788: PrecomputedScopes to LocalSymbols](https://github.com/eclipse-langium/langium/pull/1788) -- Rename details
- [PR #1509: MultiReference support](https://github.com/eclipse-langium/langium/pull/1509) -- Reference type changes
- [PR #1942: AST type name changes](https://github.com/eclipse-langium/langium/pull/1942) -- $type constant migration
- [PR #1976: CompletionProvider changes](https://github.com/eclipse-langium/langium/pull/1976) -- New required arguments
- [PR #1991: Removed deprecated items](https://github.com/eclipse-langium/langium/pull/1991) -- Full list of removed APIs (not enumerated in CHANGELOG)
