# Technology Stack: Langium 3.x to 4.x Upgrade

**Project:** BBj Language Server (bbj-vscode)
**Researched:** 2026-02-03
**Milestone:** Langium 3.2.1 -> 4.1.3 upgrade
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

Langium 4.x is a **breaking major release** with significant API changes across the scope/linker/reference system, generated AST structure, and grammar semantics. The BBj language server uses many of these APIs in custom overrides, making this a non-trivial upgrade. The core npm package structure (`langium` + `langium-cli`) is unchanged, but internal APIs have been renamed, re-typed, and restructured.

**Correction from milestone context:** The latest stable Langium version is **4.1.3** (not 4.2.0 as stated). The `langium-cli` latest is **4.1.0**. There is no 4.2.0 release as of 2026-02-03.

---

## Version Targets

### Upgrade To

| Package | Current | Target | Why This Version |
|---------|---------|--------|------------------|
| `langium` | ~3.2.1 | ~4.1.3 | Latest stable; patch releases (4.1.1-4.1.3) contain bug fixes over 4.1.0 |
| `langium-cli` | ~3.2.0 | ~4.1.0 | Latest CLI release; matches langium 4.1.x line |
| `typescript` | ^5.8.3 | ^5.8.3 | **No change needed.** Langium 4.x requires >=5.8.0; current 5.8.3 satisfies this. |

**Confidence:** HIGH -- version numbers verified via npm registry search results from 2026-02-03.

### Do NOT Change

| Package | Version | Why Keep |
|---------|---------|----------|
| `chevrotain` | ~11.0.3 | **KEEP.** `bbj-token-builder.ts` imports `TokenType` and `TokenVocabulary` directly from `chevrotain`. Langium does NOT re-export these types. Version ~11.0.3 is compatible with Langium 4.x (which uses chevrotain 11.0.x internally). |
| `typescript` | ^5.8.3 | Already satisfies Langium 4.x requirement of >=5.8.0 |
| `esbuild` | ^0.25.12 | Bundler; unrelated to Langium version |
| `vitest` | ^1.6.1 | Test runner; unrelated to Langium version |
| `vscode-languageclient` | ^9.0.1 | VS Code client; unrelated to Langium internals |
| `vscode-jsonrpc` | ^8.2.1 | JSON-RPC transport; unrelated |
| `vscode-uri` | ^3.1.0 | URI utilities; Langium uses this internally too |
| `properties-file` | ^3.6.3 | BBj-specific; unrelated |
| `properties-reader` | ^2.3.0 | BBj-specific; unrelated |
| Node.js | 20.18.1 LTS | Runtime; Langium 4 has no new Node version requirement |

---

## Breaking Changes Requiring Code Modifications

### 1. `PrecomputedScopes` -> `LocalSymbols` (CRITICAL)

**What changed:** The `PrecomputedScopes` type was renamed to `LocalSymbols` with a dedicated interface (PR #1788).

**Impact on this project:** **HIGH** -- `BbjScopeComputation` in `src/language/bbj-scope-local.ts` directly imports and uses `PrecomputedScopes` in 4 locations:
- Import statement (line 12)
- `computeLocalScopes()` return type (line 59)
- `processNode()` parameter type (line 81)
- `addToScope()` parameter type (line 260)

**Migration:** Find-and-replace `PrecomputedScopes` with `LocalSymbols` in imports and type annotations. The method name `computeLocalScopes` aligns with the new naming.

**Confidence:** HIGH -- verified in official CHANGELOG.

### 2. `Reference | MultiReference` Type Union (CRITICAL)

**What changed:** The type of references throughout the linker service and scope provider is now `Reference | MultiReference` (PR #1509). This enables multi-reference support (one reference node resolving to multiple declarations).

**Impact on this project:** **HIGH** -- The following files work directly with references:
- `src/language/bbj-linker.ts` -- `doLink()`, `getCandidate()` use `ReferenceInfo`
- `src/language/bbj-scope.ts` -- `getScope()` uses `ReferenceInfo`
- `src/language/bbj-scope-local.ts` -- scope computation
- `src/language/bbj-validator.ts` -- `Reference<Class>` usage
- `src/language/bbj-signature-help-provider.ts` -- `Reference<NamedElement>`
- `src/language/bbj-nodedescription-provider.ts` -- `Reference<Class>`, `Reference<JavaClass>`

**Migration:** Review each reference usage site. Existing `Reference` usages may need to handle `MultiReference` cases, or narrow the type with type guards. Since this project does not use multi-references, most sites can use the `Reference` type directly, but override signatures must match the new parent class signatures that accept `Reference | MultiReference`.

**Confidence:** HIGH -- verified in official CHANGELOG.

### 3. `findDeclaration` -> `findDeclarations` (CHECK NEEDED)

**What changed:** `References#findDeclaration` was renamed to `findDeclarations` and now returns an array of objects (PR #1509).

**Impact on this project:** **LOW** -- grep found no direct usage of `findDeclaration` in the codebase. However, the linker override (`BbjLinker`) extends `DefaultLinker` which may internally use this. Verify at compile time.

**Confidence:** HIGH -- verified in official CHANGELOG. Low impact confirmed by grep.

### 4. Generated AST Type Constants: `TypeName` -> `TypeName.$type` (CRITICAL)

**What changed:** The generated type name constants in `ast.ts` moved from `export const TypeName = 'TypeName'` to a structure where the string is accessed via `TypeName.$type` (PR #1942).

**Impact on this project:** **HIGH** -- The project uses generated type constants extensively:
- `bbj-linker.ts`: `BinaryExpression`, `ParameterCall`, `ConstructorCall`, `VariableDecl`, `MethodDecl`, `LibFunction` used in comparisons like `$type === BinaryExpression`
- `bbj-completion-provider.ts`: `LibSymbolicLabelDecl`, `LibEventType` used in `.type === LibSymbolicLabelDecl`
- `bbj-scope.ts`: `MethodDecl` used in `member.type === MethodDecl`
- `bbj-scope-local.ts`: `CompoundStatement` used in `$type === CompoundStatement`
- `bbj-nodedescription-provider.ts`: String literals `"JavaClass"` used in `$type === "JavaClass"`

**Migration:** Two approaches:
1. **Update all references:** Change `BinaryExpression` to `BinaryExpression.$type` everywhere. This is the intended approach.
2. **String literals stay the same:** The 2 occurrences using string `"JavaClass"` directly won't break since they compare to a string.

The `is*` type guard functions (e.g., `isBBjClassMember`, `isMethodDecl`) are generated and should continue to work after regeneration. **Prefer using `is*` guards over direct `$type` comparisons** where possible.

**Confidence:** HIGH -- verified via CHANGELOG and web search.

### 5. `createReferenceCompletionItem` Signature Change (MODERATE)

**What changed:** `DefaultCompletionProvider#createReferenceCompletionItem` now requires more arguments (PR #1976).

**Impact on this project:** **MODERATE** -- `BBjCompletionProvider` in `src/language/bbj-completion-provider.ts` overrides this method (line 15). The override signature must be updated to match the new parent class signature.

**Migration:** Check the new method signature in Langium 4.x source/docs and update the override. The current override takes `(nodeDescription: AstNodeDescription | FunctionNodeDescription)` -- additional parameters may be required.

**Confidence:** HIGH that the signature changed; LOW on what the new parameters are (would need to check Langium 4.x source).

### 6. `filterCrossReference` -> `getReferenceCandidates` (NO IMPACT)

**What changed:** `DefaultCompletionProvider#filterCrossReference` was replaced by `getReferenceCandidates`.

**Impact on this project:** **NONE** -- grep found no usage of `filterCrossReference` in the codebase.

**Confidence:** HIGH.

### 7. `prepareLangiumParser` Potentially Deprecated/Removed (CRITICAL)

**What changed:** Several deprecated fields and functions were removed in PR #1991. The CHANGELOG does not enumerate each one.

**Impact on this project:** **HIGH** -- `bbj-module.ts` imports `prepareLangiumParser` from `langium` (line 12) and uses it to create a custom parser with modified ambiguity logging (lines 103-117). If this function was removed, the parser creation approach needs rewriting.

**Migration:** If removed, likely replaced with a different parser factory function. Check Langium 4.x exports. Alternatively, use the default parser creation and configure logging via the service injection system.

**Confidence:** LOW -- could not verify whether `prepareLangiumParser` specifically was removed. This is the highest-risk item that may require investigation at compile time.

### 8. Grammar Name Uniqueness and Rule Naming (LOW RISK)

**What changed:**
- Rules can no longer use the same name as the grammar (PR #1979)
- Grammar names must be unique (PR #1979)

**Impact on this project:** **NONE** -- The grammar is named `BBj` and no rule is named `BBj`. The `java-types.langium` file has no grammar declaration (interfaces only). No conflict exists.

**Confidence:** HIGH -- verified by reading the grammar files.

### 9. Removed Xtext Features from Grammar Language (LOW-MEDIUM RISK)

**What changed:** Unused Xtext features were removed from the Langium grammar language (PR #1945).

**Impact on this project:** **UNKNOWN** -- Could not determine which specific Xtext features were removed. The BBj grammar uses `{infer ...}` actions and EBNF-style terminal rules which were originally Xtext features.

**Migration:** Run `langium generate` after upgrade and check for grammar validation errors. Fix any deprecated syntax.

**Confidence:** LOW -- could not enumerate removed features.

### 10. EBNF Terminal Refinements (LOW RISK)

**What changed:** Refined EBNF-based terminals to avoid synthetic capturing groups (PR #1966).

**Impact on this project:** **LOW** -- The BBj grammar uses regex-based terminals (visible in generated `ast.ts`), not EBNF-based terminals. Should have no impact.

**Confidence:** MEDIUM -- based on reading generated terminal patterns.

### 11. `LangiumDocuments#getOrCreateDocument` Now Async (CHECK NEEDED)

**What changed:** `getOrCreateDocument` now returns `Promise<LangiumDocument>` instead of `LangiumDocument`. Sync alternative: use `getDocument` + `createDocument`.

**Impact on this project:** **NONE based on grep** -- no direct usage of `getOrCreateDocument` found. However, custom services (`BBjWorkspaceManager`, `BBjIndexManager`, `BBjDocumentBuilder`) may be affected indirectly through parent class methods.

**Confidence:** MEDIUM -- direct usage confirmed absent; indirect impact needs compile-time verification.

---

## Generated Code Changes

### Regeneration Required

After upgrading `langium-cli` to 4.1.0, you **must** run `langium generate` to regenerate:

1. `src/language/generated/ast.ts` -- AST types, type guards, type constants (will change format)
2. `src/language/generated/grammar.ts` -- Grammar serialization
3. `src/language/generated/module.ts` -- Generated service module

**The generated files will have different content.** Specifically:
- Type constants will use `.$type` pattern instead of bare string constants
- `ast.ts` will include property constants for types (new in 4.x)
- The `BBjAstReflection` class structure may change
- Module header will say `langium-cli 4.1.0` instead of `langium-cli 3.2.0`

### Grammar Files: No Syntax Changes Expected

Based on analysis of `bbj.langium` and `java-types.langium`:
- No rule shares a name with the grammar (`BBj`)
- No Xtext-specific syntax was identified (uses standard Langium grammar features)
- The `{infer ...}` actions are core Langium syntax, not removed Xtext features
- Interface-only `.langium` files (like `java-types.langium`) should work unchanged

**Confidence:** MEDIUM -- grammar changes cannot be fully verified without running the CLI.

---

## langium-config.json Changes

The current `langium-config.json` uses:
```json
{
    "projectName": "BBj",
    "languages": [...],
    "out": "src/language/generated",
    "chevrotainParserConfig": {
        "recoveryEnabled": true,
        "nodeLocationTracking": "full"
    }
}
```

**Potential changes:**
- The `chevrotainParserConfig` key name may need updating if the config schema changed. Langium 4.x may use a different key or structure.
- New optional keys available: `strict` mode for disallowing inferred types (optional, not required for migration).
- New optional key: `fileNames` for file association control (added in 4.1.0).

**Confidence:** LOW -- config schema changes not fully documented in search results. Test with `langium generate` after upgrade.

---

## Package.json Changes

### Before (current)
```json
{
  "dependencies": {
    "chevrotain": "~11.0.3",
    "langium": "~3.2.1",
    "properties-file": "^3.6.3",
    "properties-reader": "^2.3.0",
    "vscode-jsonrpc": "^8.2.1",
    "vscode-languageclient": "^9.0.1",
    "vscode-uri": "^3.1.0"
  },
  "devDependencies": {
    "langium-cli": "~3.2.0",
    "typescript": "^5.8.3"
  }
}
```

### After (target)
```json
{
  "dependencies": {
    "chevrotain": "~11.0.3",
    "langium": "~4.1.3",
    "properties-file": "^3.6.3",
    "properties-reader": "^2.3.0",
    "vscode-jsonrpc": "^8.2.1",
    "vscode-languageclient": "^9.0.1",
    "vscode-uri": "^3.1.0"
  },
  "devDependencies": {
    "langium-cli": "~4.1.0",
    "typescript": "^5.8.3"
  }
}
```

**Key changes:**
1. `langium`: `~3.2.1` -> `~4.1.3`
2. `langium-cli`: `~3.2.0` -> `~4.1.0`

**Kept unchanged:**
3. `chevrotain`: `~11.0.3` -- **KEEP.** See Chevrotain analysis below.

**Confidence:** HIGH for langium/langium-cli versions.

---

## Chevrotain Direct Dependency Analysis

**Verdict: KEEP the direct `chevrotain` dependency.**

The project has `chevrotain: "~11.0.3"` as a direct dependency. Investigation found a direct import:

```
src/language/bbj-token-builder.ts:1: import { TokenType, TokenVocabulary } from "chevrotain";
```

`BBjTokenBuilder` (58 lines of custom token ordering, regex-based terminal overrides, and keyword categorization) relies on `TokenType` and `TokenVocabulary` types from chevrotain. These types are NOT re-exported by the `langium` package -- they must be imported from `chevrotain` directly.

**Version compatibility:** Langium 4.x depends on chevrotain in the 11.0.x range internally. The current `~11.0.3` pin is compatible. No version change needed.

**Potential improvement (optional, post-migration):** If Langium 4.x starts re-exporting these types (needs verification), the direct dependency could be moved to `devDependencies` or removed. But for now, keep it.

---

## Affected Source Files Summary

Ranked by migration effort (highest first):

| File | Changes Required | Effort |
|------|-----------------|--------|
| `src/language/bbj-module.ts` | `prepareLangiumParser` may be removed; parser creation needs rewriting | HIGH |
| `src/language/bbj-scope-local.ts` | `PrecomputedScopes` -> `LocalSymbols` (4 sites) | MODERATE |
| `src/language/bbj-linker.ts` | `Reference | MultiReference` in override signatures; `$type` constant format | MODERATE |
| `src/language/bbj-completion-provider.ts` | `createReferenceCompletionItem` new signature; `$type` constant format | MODERATE |
| `src/language/bbj-scope.ts` | `Reference | MultiReference` in override signatures; `$type` constant format | MODERATE |
| `src/language/bbj-validator.ts` | `Reference` type may need MultiReference handling; `$type` constants | LOW-MODERATE |
| `src/language/bbj-nodedescription-provider.ts` | `$type` string comparisons (uses string literals, less affected) | LOW |
| `src/language/bbj-signature-help-provider.ts` | `Reference` type in method signatures | LOW |
| `src/language/bbj-semantic-token-provider.ts` | May need minor type adjustments | LOW |
| `src/language/generated/ast.ts` | **Regenerated** -- not manually edited | AUTO |
| `src/language/generated/grammar.ts` | **Regenerated** -- not manually edited | AUTO |
| `src/language/generated/module.ts` | **Regenerated** -- not manually edited | AUTO |

**Files likely unaffected:**
- `src/language/bbj-hover.ts` -- uses stable APIs (DocumentationProvider, parseJSDoc)
- `src/language/bbj-value-converter.ts` -- uses stable APIs (DefaultValueConverter)
- `src/language/bbj-token-builder.ts` -- uses stable APIs (DefaultTokenBuilder, chevrotain types); token builder API unchanged
- `src/language/bbj-lexer.ts` -- uses stable APIs (DefaultLexer)
- `src/language/bbj-comment-provider.ts` -- uses stable APIs
- `src/language/bbj-document-validator.ts` -- uses stable APIs
- `src/language/java-interop.ts` -- uses stable APIs (AstUtils, LangiumDocuments)
- `src/language/java-javadoc.ts` -- uses FileSystemProvider (note: `readFileSync` was removed from FileSystemProvider in an earlier release, but this file uses `EmptyFileSystemProvider`; verify)
- `src/extension.ts` -- VS Code extension client; no Langium API usage

---

## New Features Available (Optional Adoption)

These are available in Langium 4.x but NOT required for the migration:

| Feature | Version | Description | Adopt? |
|---------|---------|-------------|--------|
| Strict mode | 4.0.0 | Disallow inferred types in grammar | NO -- would require grammar rewrite |
| Infix operators | 4.0.0 | Simplified operator precedence grammar | MAYBE -- could simplify BBj expression grammar later |
| GBNF grammar export | 4.1.0 | Export grammar in GBNF format for LLMs | NO -- not relevant |
| `fileNames` config | 4.1.0 | Control file association per language | MAYBE -- useful for `.src` files |
| Skip eager linking | 4.1.0 | `DocumentBuilder` option | MAYBE -- useful for performance |
| `DeepPartialAstNode` type | 4.0.0 | Better typing for partial AST construction | LOW PRIORITY |

**Recommendation:** Focus the upgrade on API compatibility first. Adopt new features in a subsequent milestone.

---

## Migration Order (Recommended)

1. **Update `package.json`** -- bump langium + langium-cli versions (keep chevrotain as-is)
2. **Run `npm install`** -- resolve dependencies
3. **Run `langium generate`** -- regenerate AST/grammar/module files. Fix any grammar validation errors.
4. **Fix compilation errors** -- work through TypeScript errors in this order:
   a. `PrecomputedScopes` -> `LocalSymbols` (simple rename)
   b. `prepareLangiumParser` replacement (if removed)
   c. `$type` constant format changes
   d. `Reference | MultiReference` type adjustments
   e. `createReferenceCompletionItem` signature update
5. **Run tests** -- `vitest run` to verify behavior
6. **Manual smoke test** -- launch VS Code extension and test language features

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `prepareLangiumParser` removed | MEDIUM | HIGH | Check Langium 4.x exports; may need parser creation rewrite |
| Grammar validation errors on regeneration | LOW | HIGH | BBj grammar uses standard features; unlikely to hit removed syntax |
| `Reference | MultiReference` type incompatibility in overrides | HIGH | MEDIUM | Most overrides can narrow to `Reference`; signature must match parent |
| Chevrotain version conflict | LOW | LOW | Keep ~11.0.3; matches Langium 4.x internal chevrotain range |
| Test breakage from AST structure changes | MEDIUM | MEDIUM | Regenerated `is*` guards should work; test assertions on `$type` strings need updating |
| Unknown breaking changes not in CHANGELOG | LOW | UNKNOWN | Langium team documents breaking changes well; compile errors will reveal |

---

## Sources

### Official / HIGH Confidence
- [Langium 4.0 Release Blog Post](https://www.typefox.io/blog/langium-release-4.0/) -- TypeFox official
- [Langium CHANGELOG (packages/langium)](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) -- Official changelog
- [Langium GitHub Releases](https://github.com/langium/langium/releases) -- Release history
- [langium npm page](https://www.npmjs.com/package/langium) -- Version 4.1.3 confirmed
- [langium-cli npm page](https://www.npmjs.com/package/langium-cli) -- Version 4.1.0 confirmed

### MEDIUM Confidence
- [Langium Documentation](https://langium.org/docs/) -- Official docs (may not be fully updated for 4.x)
- [langium npm dependencies tab](https://www.npmjs.com/package/langium?activeTab=dependencies) -- Dependency list

### Research Gaps (LOW Confidence)
- Exact `prepareLangiumParser` status -- could not verify removal; needs compile-time check
- Exact `createReferenceCompletionItem` new parameters -- needs Langium 4.x source inspection
- Exact Xtext features removed in PR #1945 -- needs PR review
- `chevrotainParserConfig` key compatibility in `langium-config.json` -- needs testing
- `AstNodeTypesWithCrossReferences` / `CrossReferencesOfAstNodeType` status -- used in `bbj-scope.ts`, changes unclear
