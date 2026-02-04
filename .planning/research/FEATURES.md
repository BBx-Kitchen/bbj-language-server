# Feature Landscape: Langium 3.2.1 to 4.x Migration

**Domain:** Language server framework major version upgrade
**Researched:** 2026-02-03
**Target version:** Langium 4.1.3 (latest stable), langium-cli 4.1.0
**Current version:** Langium 3.2.1, langium-cli 3.2.0

---

## Breaking Changes That MUST Be Addressed

These changes will cause compilation failures. The build will not succeed without fixing them.

### BC-1: `PrecomputedScopes` Renamed to `LocalSymbols`

**PR:** #1788
**Confidence:** HIGH (verified in CHANGELOG, multiple sources)
**Complexity:** MEDIUM (pervasive rename + interface change)

The type `PrecomputedScopes` has been renamed to `LocalSymbols` and a dedicated interface was introduced.

**Files affected:**
- `bbj-scope-local.ts` -- Uses `PrecomputedScopes` as return type from `computeLocalScopes()` and parameter type in `processNode()` and `addToScope()`. Also imports `MultiMap` to construct it.
- `bbj-scope.ts` -- Accesses `document.precomputedScopes` property on `LangiumDocument`.

**What to change:**
- All `PrecomputedScopes` type references become `LocalSymbols`
- `document.precomputedScopes` property accessor likely renamed to `document.localSymbols` (or similar -- verify during implementation)
- Import statements must be updated
- `MultiMap<AstNode, AstNodeDescription>` construction may need to use the new `LocalSymbols` interface instead

**Risk:** The `LocalSymbols` interface may have different methods than `MultiMap`. The old `PrecomputedScopes` was simply `MultiMap<AstNode, AstNodeDescription>`. The new `LocalSymbols` is a dedicated interface -- need to verify it still supports `.get()`, `.add()`, and iteration patterns used in `bbj-scope-local.ts`.

---

### BC-2: `computeExports` / `computeLocalScopes` Method Renames

**PR:** #1788 (same as above)
**Confidence:** MEDIUM (inferred from the `PrecomputedScopes` -> `LocalSymbols` rename and naming consistency; file-based scoping recipe uses `collectExportedSymbols`)
**Complexity:** LOW-MEDIUM (method renames in one file)

The `ScopeComputation` interface methods were likely renamed:
- `computeExports()` -> `collectExportedSymbols()`
- `computeLocalScopes()` -> `collectLocalSymbols()`

**Files affected:**
- `bbj-scope-local.ts` -- Overrides both `computeExports()` and `computeLocalScopes()` in `BbjScopeComputation extends DefaultScopeComputation`.

**What to change:**
```
// Old (3.x)
override async computeExports(document, cancelToken): Promise<AstNodeDescription[]>
override async computeLocalScopes(document, cancelToken): Promise<PrecomputedScopes>

// New (4.x) -- VERIFY exact names during implementation
override async collectExportedSymbols(document, cancelToken): Promise<AstNodeDescription[]>
override async collectLocalSymbols(document, cancelToken): Promise<LocalSymbols>
```

**Risk:** If the method names in `DefaultScopeComputation` changed but we don't update our overrides, TypeScript will error because the `override` keyword requires the method to exist in the base class. The `computeExportsForNode` helper called inside `computeExports` may also be renamed.

---

### BC-3: Generated AST Type Constants Changed from `TypeName` to `TypeName.$type`

**PR:** #1942
**Confidence:** HIGH (verified in CHANGELOG, multiple sources)
**Complexity:** HIGH (pervasive across entire codebase)

Previously, the generated `ast.ts` exported constant strings like `export const MethodDecl = 'MethodDecl'`. Now they are accessed as `MethodDecl.$type` (the constant is now an object with a `$type` property).

**Files affected (EVERY file that uses generated type constants as strings):**
- `bbj-scope.ts` -- Uses `MethodDecl`, `LibFunction`, `Class`, `NamedElement`, `JavaClass`, `LibEventType`, `LibMember`, `FieldDecl`, `CompoundStatement`, `BbjClass` as string constants in comparisons like `descr.type === MethodDecl`
- `bbj-scope-local.ts` -- Uses `FieldDecl`, `MethodDecl`, `CompoundStatement` as string constants in object literal `type:` fields
- `bbj-linker.ts` -- Uses `VariableDecl`, `BinaryExpression`, `ParameterCall`, `ConstructorCall`, `MethodDecl`, `LibFunction` as string constants
- `bbj-validator.ts` -- Uses `JavaField`, `JavaMethod`, `MethodDecl`, `FieldDecl` in comparisons; uses `BBjAstType` in `ValidationChecks<BBjAstType>`
- `bbj-completion-provider.ts` -- Uses `LibSymbolicLabelDecl`, `LibEventType` in comparisons
- `bbj-hover.ts` -- Uses `MethodDecl`, `LibFunction`, `JavaMethod`, `LibEventType` in switch cases
- `bbj-nodedescription-provider.ts` -- Uses `MethodDecl`, `LibFunction`, `JavaMethod`, `LibEventType` in switch cases
- `bbj-semantic-token-provider.ts` -- Uses `ParameterDecl`, `SymbolRef`, `MethodCall` in switch on `$type`
- `bbj-node-kind.ts` -- Uses `MethodDecl`, `LibFunction`, `BbjClass`, `ArrayDecl`, `LibEventType`, `JavaPackage`, `JavaMethod`, `JavaClass` in switch cases
- `bbj-type-inferer.ts` -- Likely uses type constants in comparisons

**What to change:**
Every usage of a generated type constant as a string must change:
```typescript
// Old (3.x): Type constant IS the string
case MethodDecl:           // MethodDecl === 'MethodDecl'
descr.type === MethodDecl  // string comparison

// New (4.x): Type constant is an object, use .$type
case MethodDecl.$type:           // MethodDecl.$type === 'MethodDecl'
descr.type === MethodDecl.$type  // string comparison
```

**IMPORTANT:** The `is*` type guard functions (like `isMethodDecl`, `isBbjClass`, etc.) should still work unchanged since they check `node.$type`. The constant change primarily affects:
1. Direct comparisons: `node.$type === TypeName` -> `node.$type === TypeName.$type`
2. Type constants used as strings: `type: FieldDecl` -> `type: FieldDecl.$type` (in object literals for AstNodeDescription)
3. Switch cases: `case TypeName:` -> `case TypeName.$type:`

**Risk:** This is the single highest-volume change. Missing one occurrence will cause a runtime bug (comparison will fail because `TypeName` is now an object, not a string). Thorough search-and-replace needed. A global find for all imported type constants used in comparisons is required.

---

### BC-4: `Reference | MultiReference` in Linker and Scope Provider

**PR:** #1509
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** MEDIUM (affects linker method signatures)

The type of references used throughout the linker service and scope provider is now `Reference | MultiReference`. The `ReferenceInfo` type may also be affected.

**Files affected:**
- `bbj-linker.ts` -- Overrides `link()`, `doLink()`, and `getCandidate()` on `DefaultLinker`. The `doLink(refInfo: ReferenceInfo, document: LangiumDocument)` signature may need updating if `ReferenceInfo` now contains `Reference | MultiReference`.
- `bbj-scope.ts` -- `getScope(context: ReferenceInfo)` in `BbjScopeProvider`. The `ReferenceInfo` type may have changed.

**What to change:**
- Method signatures for `doLink` and `getCandidate` may need to accept `Reference | MultiReference`
- Need to handle the case where `refInfo.reference` could be a `MultiReference`
- The `link()` method override iterates `AstUtils.streamReferences(node)` which may now yield `MultiReference` items

**Risk:** Since BBj grammar does not use multi-references, the actual MultiReference path is unlikely to be triggered at runtime. However, the TypeScript types must still match. The simplest approach is to type-narrow to `Reference` at the entry point of each override.

---

### BC-5: `createReferenceCompletionItem` Signature Change

**PR:** #1976
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW-MEDIUM

`DefaultCompletionProvider#createReferenceCompletionItem` now requires additional arguments (`refInfo` and `context` parameters).

**Files affected:**
- `bbj-completion-provider.ts` -- Overrides `createReferenceCompletionItem(nodeDescription: AstNodeDescription)`. Must be updated to accept the new parameters.

**What to change:**
```typescript
// Old (3.x)
override createReferenceCompletionItem(nodeDescription: AstNodeDescription): CompletionValueItem

// New (4.x) -- exact params need verification
override createReferenceCompletionItem(nodeDescription: AstNodeDescription, refInfo: ReferenceInfo, context: CompletionContext): CompletionValueItem
```

**Risk:** LOW. The override currently only uses `nodeDescription`. The new params can be accepted and ignored. But the super call `super.createReferenceCompletionItem(nodeDescription)` must also pass the new arguments.

---

### BC-6: TypeScript >= 5.8.0 Required

**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** NONE (already satisfied)

Langium 4.x requires TypeScript >= 5.8.0.

**Current project:** TypeScript ^5.8.3 -- already compatible. No action needed.

---

### BC-7: `langium-cli` 4.x Regeneration Required

**Confidence:** HIGH (follows from major version change)
**Complexity:** LOW

The generated files in `src/language/generated/` must be regenerated with langium-cli 4.x. The generated `module.ts`, `ast.ts`, and `grammar.ts` will have structural changes including:
- Type constants as objects with `$type` (BC-3)
- Potential changes to `BBjGeneratedModule` and `BBjGeneratedSharedModule` types
- New imports from different langium subpaths
- `BBjAstType` structure may change from string enum to object type mapping

**Files affected:**
- `src/language/generated/ast.ts` (regenerated)
- `src/language/generated/grammar.ts` (regenerated)
- `src/language/generated/module.ts` (regenerated)

**What to change:**
```bash
npm install langium@~4.1.3 langium-cli@~4.1.0
npx langium generate
```

Then fix any compilation errors in hand-written code that depends on generated types.

---

### BC-8: Rule Naming Restrictions

**PR:** #1979
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW (verify only)

Rules are no longer allowed to use the same name as the grammar in which they are contained. Grammar names must be unique.

**Files affected:**
- `bbj.langium` -- Grammar is named `BBj`. Must verify no parser rule is named `BBj`.
- `java-types.langium` -- No grammar name declared (it's imported), so no issue.

**Assessment:** The grammar is named `BBj` and there is no parser rule named `BBj` in the grammar file. The entry rule is `Model`. **No action required** but verify during generation.

---

### BC-9: Removed Deprecated Fields and Functions

**PR:** #1991
**Confidence:** MEDIUM (CHANGELOG confirms removal but does not enumerate specific items)
**Complexity:** UNKNOWN until compilation attempted

Several deprecated fields and functions were removed. The specific list is not fully documented in the CHANGELOG.

**Potentially affected APIs used in this project:**
- `prepareLangiumParser` -- Used in `bbj-module.ts` to create a custom parser. This function may have been removed or renamed.
- `getDiagnosticRange` -- Used in `bbj-document-validator.ts`. May have been removed.
- `toDiagnosticSeverity` -- Used in `bbj-document-validator.ts`. May have been removed.
- `DocumentValidator.LinkingError` -- Static constant used in `bbj-document-validator.ts`. May have changed.

**Risk:** HIGH for `prepareLangiumParser` specifically. The custom parser creation in `bbj-module.ts` (lines 103-117) uses `prepareLangiumParser(services)` then calls `parser.finalize()`. If this API was removed, the entire parser customization approach needs reworking.

**Strategy:** Attempt compilation first. Any removed APIs will surface as import errors. Check PR #1991 diff at `https://github.com/eclipse-langium/langium/pull/1991` for the definitive list.

---

### BC-10: Singleton Item Removed from `DefaultServiceRegistry`

**PR:** #1768
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW

The singleton item in the `DefaultServiceRegistry` has been removed.

**Files affected:**
- `bbj-ws-manager.ts` -- Uses `services.ServiceRegistry.all` to find BBj services: `services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj')`. If `ServiceRegistry` API changed, this will break.

**What to change:** Verify `ServiceRegistry.all` still exists and returns the expected type. If not, find the new API for looking up language-specific services from shared services.

---

### BC-11: Extended File System Provider Interface

**PR:** #1784
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW

The extended file system provider interface requires implementing more methods.

**Files affected:**
- `bbj-ws-manager.ts` -- Uses `this.fileSystemProvider.readDirectory()` and `this.fileSystemProvider.readFile()`. Since the project uses the default `NodeFileSystem` from `langium/node`, this is unlikely to need manual changes.

**Assessment:** Likely no action needed since we use `NodeFileSystem` from `langium/node`, which should implement the extended interface. But verify.

---

### BC-12: Refined EBNF-Based Terminals

**PR:** #1966
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW

Refined EBNF-based terminals to avoid synthetic capturing groups.

**Files affected:**
- `bbj.langium` -- Uses regex-based terminals (not EBNF-based). The BBj grammar defines terminals with explicit regex patterns: `terminal ID: /[_a-zA-Z][\w_]*(@)?/;` etc.
- `bbj-token-builder.ts` -- Builds custom tokens with regex patterns. No EBNF terminals used.

**Assessment:** The BBj grammar uses explicit regex terminals, not EBNF character ranges. **Likely no action needed**, but verify during generation.

---

### BC-13: Removed Unused Xtext Features from Langium Grammar

**PR:** #1945
**Confidence:** HIGH (verified in CHANGELOG)
**Complexity:** LOW (verify only)

Removed unused Xtext features from the Langium grammar language itself.

**Assessment:** This affects what syntax is valid in `.langium` files. Potentially affects:
- `type` declarations (like `type BBjClassMember = FieldDecl | MethodDecl`)
- `interface` declarations
- `fragment` rules

The BBj grammar uses all of these. Run `langium generate` to check if any grammar constructs are now invalid. The grammar uses standard Langium features; Xtext-specific features (like wildcard imports or certain annotation syntax) are not used.

---

## Behavioral Changes (Compiles But Behavior Differs)

These changes may not cause compilation errors but could change runtime behavior.

### BH-1: `$type` Property on Generated Interfaces

The generated AST interfaces now include a `readonly $type` property with a string literal type. Runtime `node.$type` checks still work, but the constants used for comparison have changed (see BC-3). If any code does `node.$type === 'MethodDecl'` using raw strings instead of constants, those will still work. Only constant-based comparisons break at compile time.

---

### BH-2: `findDeclaration` Renamed to `findDeclarations`

**PR:** #1509
**Confidence:** HIGH

`References#findDeclaration` was renamed to `findDeclarations` and now returns an array.

**Files affected:** None directly -- the project does not appear to call `findDeclaration` in custom code. This is primarily an LSP-level concern. But verify no usages exist in the extension code.

---

### BH-3: Document Builder Option to Skip Eager Linking

Langium 4.0 added a `DocumentBuilder` option to skip eager linking. This is a new feature, not a breaking change, but could affect performance characteristics if the default behavior changed.

**Assessment:** Verify that `BBjDocumentBuilder` still behaves correctly with the new defaults. The `buildDocuments` override may need signature adjustment if `BuildOptions` type changed.

---

## Deprecation Warnings (Works But Should Be Updated)

### DW-1: Check for New Deprecation Warnings After Upgrade

After upgrading, compile and watch for TypeScript deprecation warnings. Langium 4.x may have deprecated APIs that still work but are marked for removal in 5.x. Address these in a follow-up commit to stay current.

---

## New Features Available (NOT Needed for This Milestone)

These are available after upgrading but are optional enhancements, not required for migration.

### NF-1: Infix Operator Support

Langium 4.0 adds infix operator notation for describing binary operator precedence more concisely. The BBj grammar currently uses the traditional left-recursive pattern for binary expressions. Could be adopted later to simplify the expression grammar.

### NF-2: Strict Grammar Mode

Can be enabled in `langium-config.json` to disallow inferred types. Could improve type safety but requires declaring all types explicitly. The BBj grammar heavily uses inferred types -- this would be a large effort to adopt.

### NF-3: GBNF Grammar Generation

The CLI now supports generating GBNF grammars for AI/LLM integration.

### NF-4: `fileNames` Configuration Option

New config option for better control over file associations.

### NF-5: `DeepPartialAstNode` Utility Type

New utility type for better type checking in tests.

### NF-6: Multi-Reference Support in Grammar

Grammar cross-references can now target multiple AST nodes (partial classes, namespaces). Not relevant for BBj.

---

## Feature Dependencies and Migration Order

```
BC-7 (regenerate with CLI 4.x)
  |
  v
BC-3 (fix type constants .$type) -- highest volume change
  |
  +---> BC-1 + BC-2 (PrecomputedScopes -> LocalSymbols + method renames)
  |
  +---> BC-4 (Reference | MultiReference in linker)
  |
  +---> BC-5 (completion provider signature)
  |
  +---> BC-9 (removed deprecated APIs -- especially prepareLangiumParser)
  |
  +---> BC-10, BC-11 (service registry, filesystem provider)
  |
  v
Compile and fix remaining errors
  |
  v
Run tests
```

**Recommended migration sequence:**

1. **Phase 1: Dependencies** -- Update `package.json` to langium ~4.1.3 and langium-cli ~4.1.0. Run `npm install`.
2. **Phase 2: Regenerate** -- Run `npx langium generate`. This regenerates `ast.ts`, `grammar.ts`, `module.ts`. Fix any grammar issues (BC-8, BC-12, BC-13).
3. **Phase 3: Fix type constants** -- Global search-and-replace for all type constant usages (BC-3). This is the highest volume change.
4. **Phase 4: Fix scope computation** -- Rename `PrecomputedScopes` to `LocalSymbols`, rename overridden methods (BC-1, BC-2).
5. **Phase 5: Fix linker** -- Update `BbjLinker` for `Reference | MultiReference` (BC-4).
6. **Phase 6: Fix completion provider** -- Update `createReferenceCompletionItem` signature (BC-5).
7. **Phase 7: Fix deprecated API removals** -- Address `prepareLangiumParser` and any other removed APIs (BC-9).
8. **Phase 8: Fix remaining** -- Service registry (BC-10), filesystem provider (BC-11), other compilation errors.
9. **Phase 9: Test** -- Run full test suite, verify all features work.

---

## Complexity Summary

| Breaking Change | ID | Files Affected | Complexity | Risk |
|----------------|-----|---------------|------------|------|
| PrecomputedScopes -> LocalSymbols | BC-1 | 2 | MEDIUM | Interface shape may differ |
| Method renames (scope computation) | BC-2 | 1 | LOW-MEDIUM | Override becomes dead code if missed |
| Type constants .$type | BC-3 | 10+ | HIGH | Runtime bugs if any missed |
| Reference/MultiReference | BC-4 | 2 | MEDIUM | Type narrowing needed |
| Completion provider signature | BC-5 | 1 | LOW | Accept and pass through |
| TypeScript >= 5.8.0 | BC-6 | 0 | NONE | Already satisfied |
| Regenerate with CLI 4.x | BC-7 | 3 (generated) | LOW | Automated |
| Rule naming restrictions | BC-8 | 0 | NONE (verify) | Already compliant |
| Removed deprecated APIs | BC-9 | 2+ | UNKNOWN | prepareLangiumParser is critical |
| ServiceRegistry changes | BC-10 | 1 | LOW | Verify API |
| FileSystem provider | BC-11 | 0 | NONE | NodeFileSystem handles it |
| EBNF terminals | BC-12 | 0 | NONE (verify) | Uses regex, not EBNF |
| Xtext features removed | BC-13 | 0 | NONE (verify) | Run langium generate |

**Overall migration complexity:** MEDIUM-HIGH, primarily due to the pervasive type constant changes (BC-3) and the unknown scope of deprecated API removals (BC-9).

---

## Sources

- [Langium 4.0 Release Blog Post](https://www.typefox.io/blog/langium-release-4.0/)
- [Langium CHANGELOG (packages/langium)](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md)
- [Langium GitHub Releases](https://github.com/langium/langium/releases)
- [Langium npm Package](https://www.npmjs.com/package/langium) -- latest stable: 4.1.3
- [langium-cli npm Package](https://www.npmjs.com/package/langium-cli) -- latest stable: 4.1.0
- [Langium API Docs v4.1.0](https://eclipse-langium.github.io/langium/)
- [Langium Documentation](https://langium.org/docs/)
- [Langium File-based Scoping Recipe](https://langium.org/docs/recipes/scoping/file-based/)
- [Langium Qualified Name Scoping Recipe](https://langium.org/docs/recipes/scoping/qualified-name/)

**Confidence note:** The exact details of BC-9 (removed deprecated APIs) could not be fully enumerated from web sources. PR #1991 on the Langium GitHub contains the definitive list. The `prepareLangiumParser` removal is flagged as LOW confidence -- it may still exist in 4.x. This will be resolved definitively when compilation is attempted.
