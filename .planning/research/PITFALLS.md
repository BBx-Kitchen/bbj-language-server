# Domain Pitfalls: Langium 3.2.1 to 4.2.0 Migration

**Domain:** Langium-based language server upgrade (BBj)
**Researched:** 2026-02-03
**Overall Confidence:** MEDIUM-HIGH (verified against npm registry, CHANGELOG, and codebase analysis; some details from web search only)

---

## Critical Pitfalls

Mistakes that cause the migration to fail, produce silent runtime bugs, or require significant rework.

---

### Pitfall 1: AST Type Name Constants Restructured (`<Type>` to `<Type>.$type`)

**What goes wrong:** Langium 4 changed how generated `ast.ts` exports type name constants. In Langium 3, the generated code exports `export const JavaClass = 'JavaClass'`. In Langium 4, the type name is accessed via `<TypeName>.$type` instead (#1942). Every place in the codebase that uses these constants as string comparisons will compile but produce incorrect runtime behavior, OR will fail to compile if the type system catches the mismatch.

**Why it happens:** The Langium team restructured `ast.ts` to provide richer type metadata (property constants, better TypeScript integration). The string constants changed from being direct exports to properties on type objects.

**Consequences:**
- Switch statements using `case ParameterDecl:`, `case SymbolRef:`, `case MethodCall:` (as in `bbj-semantic-token-provider.ts`) will silently stop matching if the constant shape changes.
- Comparisons like `descr.type !== MethodDecl` (in `bbj-linker.ts`) and `descr.type === MethodDecl` (in `bbj-scope.ts`) will fail silently.
- The `$type:` property in synthetic AST node creation (test module: `$type: JavaClass`) may stop working.
- `AstNodeDescription` objects with `type: FieldDecl` or `type: VariableDecl` (in `bbj-scope-local.ts`, `bbj-linker.ts`) will break.

**Specific locations in the BBj codebase:**
| File | Pattern | Lines |
|------|---------|-------|
| `bbj-semantic-token-provider.ts` | `case ParameterDecl:`, `case SymbolRef:`, `case MethodCall:` | 13, 15, 17 |
| `bbj-linker.ts` | `type: VariableDecl`, `$type === BinaryExpression`, `$type === ParameterCall`, `$type === ConstructorCall`, `descr.type !== MethodDecl && descr.type !== LibFunction` | 21, 85, 87, 94 |
| `bbj-scope.ts` | `member.type === MethodDecl`, `nodeDescription.type === LibSymbolicLabelDecl`, `nodeDescription.type === LibEventType` | 340, plus scope.ts and completion-provider.ts |
| `bbj-scope-local.ts` | `type: FieldDecl` (5 occurrences), `type: MethodDecl` (1 occurrence), `$type === CompoundStatement` | 109, 122, 132, 163, 261, 282 |
| `bbj-completion-provider.ts` | `nodeDescription.type === LibSymbolicLabelDecl`, `nodeDescription.type === LibEventType` | 43, 46 |
| `test/bbj-test-module.ts` | `$type: JavaClass`, `$type: JavaMethod` | 87, 102, 111, 126, 135, 150 |

**Prevention:**
1. After regenerating with `langium-cli` 4.x, inspect the new `generated/ast.ts` to understand the exact new pattern before changing any code.
2. Use TypeScript strict mode to catch type mismatches at compile time.
3. Systematically grep for all string constant usages: `grep -rn "type: [A-Z]" src/` and `grep -rn "case [A-Z]" src/` and `grep -rn "\$type === [A-Z]" src/` and `grep -rn "\$type: [A-Z]" test/`.
4. The compiler WILL catch many of these if TypeScript is strict enough, but `case` statements with string literals that happen to match may slip through.

**Detection:** TypeScript compilation errors after regeneration; runtime `switch` statements that never match (semantic tokens stop working, scope resolution returns wrong results).

**Confidence:** HIGH (verified via npm, CHANGELOG #1942, and also confirmed via the related change: "`BBjAstType` changed from string enumeration to object type mapping" #738).

**Phase:** Must be addressed during the "regenerate and update generated code" step, then immediately followed by a full codebase sweep.

---

### Pitfall 2: `PrecomputedScopes` Renamed to `LocalSymbols`

**What goes wrong:** The `PrecomputedScopes` type is renamed to `LocalSymbols` with a new dedicated interface (#1788). All imports, type annotations, and method signatures that reference `PrecomputedScopes` will break.

**Why it happens:** Langium 4 introduced a cleaner abstraction for local symbol storage.

**Consequences:** Direct compilation failure in `bbj-scope-local.ts` (4 occurrences of `PrecomputedScopes`).

**Specific locations:**
| File | Usage |
|------|-------|
| `bbj-scope-local.ts` | Import on line 12, return type on line 59, parameter type on line 81, parameter type on line 260 |

**Prevention:**
1. Simple find-and-replace: `PrecomputedScopes` to `LocalSymbols`.
2. But ALSO check whether the new `LocalSymbols` interface has different methods than the old `PrecomputedScopes` type. The old type was `MultiMap<AstNode, AstNodeDescription>`. If the new `LocalSymbols` has additional required methods, the `addToScope` pattern using `scopes.add(key, descr)` and `scopes.get(scopeHolder)` may need updating.

**Detection:** Immediate TypeScript compilation failure.

**Confidence:** HIGH (verified via CHANGELOG, confirmed by codebase grep).

**Phase:** Early in the migration, during "fix compilation errors" step.

---

### Pitfall 3: `Reference | MultiReference` Throughout Linker and Scope Provider

**What goes wrong:** Langium 4 changes the reference type used throughout the linker and scope provider from `Reference` to `Reference | MultiReference` (#1509). The custom `BbjLinker` and `BbjScopeProvider` override methods that accept `ReferenceInfo` and work with references. If these methods don't handle the new `MultiReference` union, they will crash at runtime when the linker encounters multi-references.

**Why it happens:** Langium 4 added multi-reference support (a single grammar property can reference multiple targets).

**Consequences:**
- `BbjLinker.doLink(refInfo: ReferenceInfo, ...)` -- the `ReferenceInfo` type may now carry `MultiReference` instances.
- `BbjLinker.getCandidate(refInfo: ReferenceInfo)` -- same issue.
- All code accessing `refInfo.reference.$refText` or `refInfo.reference.ref` may need to check for multi-reference.
- `BbjScopeProvider.getScope(context: ReferenceInfo)` -- all the scope resolution logic.

**Prevention:**
1. After upgrading, check whether `ReferenceInfo.reference` is now typed as `Reference | MultiReference`.
2. In practice, the BBj grammar likely does NOT use multi-references, so the actual runtime risk is low. But the TYPE system will enforce handling of the union.
3. Add runtime guards (`if ('ref' in refInfo.reference)` or use Langium's utility functions) where needed.

**Detection:** TypeScript compilation errors in linker and scope provider overrides.

**Confidence:** HIGH (verified via CHANGELOG #1509).

**Phase:** During "fix compilation errors" step, after linker/scope provider files fail to compile.

---

### Pitfall 4: `prepareLangiumParser` Removal or Signature Change

**What goes wrong:** The `bbj-module.ts` file uses `prepareLangiumParser(services)` on line 104 to create a custom parser with modified ambiguity logging. Langium 4 removed several deprecated functions (#1991). If `prepareLangiumParser` was among them, the custom parser creation code will break entirely.

**Why it happens:** Langium 4 cleaned up deprecated APIs in a batch removal.

**Consequences:**
- The entire parser initialization fails.
- The custom ambiguity logging workaround stops working.
- The `parser.finalize()` call pattern may also have changed.

**Specific location:**
```typescript
// bbj-module.ts lines 103-117
function createBBjParser(services: LangiumServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    const lookaheadStrategy = (parser as any).wrapper.lookaheadStrategy
    // ...
    parser.finalize();
    return parser;
}
```

**Prevention:**
1. Before upgrading, check whether `prepareLangiumParser` still exists in Langium 4 by examining the package exports.
2. The internal `(parser as any).wrapper.lookaheadStrategy` access is already fragile (uses `any` cast). This may break independently.
3. Alternative: See if Langium 4 provides a cleaner way to customize parser ambiguity handling.

**Detection:** Import error or runtime crash on startup.

**Confidence:** MEDIUM (the function is known to exist in 3.x; #1991 removed "several deprecated fields and functions" but the exact list is not publicly enumerated in the CHANGELOG. Need to verify by checking actual Langium 4 exports).

**Phase:** Early in migration, during parser module compilation.

---

### Pitfall 5: `DefaultCompletionProvider.createReferenceCompletionItem` Signature Change

**What goes wrong:** The `BBjCompletionProvider` overrides `createReferenceCompletionItem(nodeDescription)`. Langium 4 changed this method to require additional `refInfo` and `context` parameters (#1976). The override will either fail to compile or fail to be called (if the base class method has a different name/arity).

**Why it happens:** Langium 4 enriched the completion provider API to pass more context.

**Consequences:**
- All custom completion logic in `BBjCompletionProvider` stops working.
- The method override is silently ignored if arity changes (TypeScript `noImplicitOverride` would catch this).

**Additionally:** `DefaultCompletionProvider.filterCrossReference` was replaced by `getReferenceCandidates`. If `BBjCompletionProvider` uses `filterCrossReference` (does not appear to, based on grep), that would also break.

**Specific location:**
```typescript
// bbj-completion-provider.ts line 15
override createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription): CompletionValueItem {
```

**Prevention:**
1. The project uses `noImplicitOverride: true` in tsconfig.json. This will produce a compilation error if the parent method signature changes.
2. Check the new signature and adapt the override.
3. Check whether `FunctionNodeDescription` (a custom type) is still compatible with what the new API expects.

**Detection:** TypeScript compilation error (due to `noImplicitOverride`).

**Confidence:** HIGH (verified via CHANGELOG #1976).

**Phase:** During "fix compilation errors" step.

---

### Pitfall 6: Chevrotain Version Bump (11.0.3 to 11.1.1)

**What goes wrong:** Langium 4.2.0 depends on `chevrotain ~11.1.1` (verified via npm). The project explicitly pins `chevrotain ~11.0.3` in its own `package.json` dependencies. If both versions coexist or if 11.1.x has breaking changes in token handling, the custom `BBjTokenBuilder` and `BbjLexer` could malfunction.

**Why it happens:** The project lists `chevrotain` as a direct dependency (not just a transitive one), and the version ranges don't overlap.

**Consequences:**
- Duplicate chevrotain instances in node_modules causing "use only a single bundling tool" warnings from Chevrotain.
- Token type mismatch between Langium's internal chevrotain and the project's.
- The custom `BBjTokenBuilder.buildTerminalToken` returns `TokenType` objects from the wrong chevrotain instance.
- `regexPatternFunction` (used 13 times in `bbj-token-builder.ts`) may behave differently.

**Prevention:**
1. Remove the direct `chevrotain` dependency from `package.json` and rely on Langium's transitive dependency.
2. If chevrotain APIs are used directly, import from `langium` re-exports instead of from `chevrotain` directly.
3. Check `bbj-token-builder.ts` line 1: `import { TokenType, TokenVocabulary } from "chevrotain"` -- this direct import is the risk point.

**Detection:** Runtime tokenization failures, "use only a single bundling tool" warnings, esbuild duplicate module warnings.

**Confidence:** HIGH (verified exact version mismatch via `npm view langium@4.2.0 dependencies`).

**Phase:** During the dependency update step, before any code changes.

---

### Pitfall 7: Module Registration / Service Registry Changes

**What goes wrong:** The `DefaultServiceRegistry` singleton was removed (#1768) and the `map` field was deprecated in favor of `fileExtensionMap`/`languageIdMap`. The `bbj-module.ts` calls `shared.ServiceRegistry.register(BBj)` (line 159). If the `register` method signature changed or the singleton removal affects how services are looked up, the entire service wiring breaks.

**Also:** The `BBjWorkspaceManager` constructor accesses `services.ServiceRegistry.all` to find BBj services (line 44):
```typescript
const bbjServices = services.ServiceRegistry.all.find(
    service => service.LanguageMetaData.languageId === 'bbj'
) as BBjServices;
```
If `.all` was removed or renamed, this lookup fails.

**Consequences:**
- Java interop service never initializes.
- Language server starts but provides no functionality.
- Silent failure (no crash, just no features).

**Prevention:**
1. Check whether `ServiceRegistry.register()` and `ServiceRegistry.all` still exist in Langium 4.
2. Check the Langium 4 module registration examples for the current pattern.
3. The test module (`bbj-test-module.ts`) also uses this pattern, so it needs updating too.

**Detection:** Runtime: Java interop fails to load, features silently missing. TypeScript: compilation error if `.all` is removed.

**Confidence:** MEDIUM (singleton removal is confirmed via #1768, but exact impact on `register()` and `.all` methods needs verification against Langium 4 source).

**Phase:** During the module/DI wiring phase of migration.

---

## Moderate Pitfalls

Mistakes that cause delays, test failures, or require rework but don't block the entire migration.

---

### Pitfall 8: TypeScript Version Requirement (>= 5.8.0)

**What goes wrong:** Langium 4 requires TypeScript >= 5.8.0. The project currently uses `typescript ^5.8.3` which satisfies this, but older CI environments or lock files might pin an earlier version.

**Prevention:** Verify `typescript` version in lock file. The `^5.8.3` range is compatible, but ensure `npm install` actually resolves to >= 5.8.0.

**Detection:** Compilation errors with cryptic type messages.

**Confidence:** HIGH (verified via CHANGELOG).

**Phase:** During dependency update.

---

### Pitfall 9: Node.js Engine Requirement Jump

**What goes wrong:** Langium 3.2.1 requires Node >= 16.0.0. Langium 4.2.0 requires Node >= 20.10.0 and npm >= 10.2.3 (verified via `npm view langium@4.2.0 engines`). CI/CD pipelines, developer machines, or the VS Code extension host may run older Node versions.

**Prevention:**
1. Update `engines` field in `package.json` to match.
2. Update CI/CD pipeline Node version.
3. VS Code's built-in Node is usually recent enough, but verify.

**Detection:** `npm install` warnings or runtime crashes on older Node.

**Confidence:** HIGH (verified via npm).

**Phase:** Very first step, before any dependency changes.

---

### Pitfall 10: `DefaultDocumentBuilder` Changes (Custom Validation Categories)

**What goes wrong:** The `BBjDocumentBuilder` extends `DefaultDocumentBuilder` and overrides `shouldValidate`, `buildDocuments`, and the constructor. Langium 4 added custom validation categories (#1837) which likely changed the `DefaultDocumentBuilder` interface. The `shouldValidate` method signature or the `BuildOptions` type may have new required fields.

**Consequences:**
- The custom `shouldValidate` override may not align with the new base class signature.
- The `buildDocuments` override may miss new build phases.
- The `addImportedBBjDocuments` method calls `this.update(addedDocuments, [], cancelToken)` -- the `update` method signature may have changed.

**Prevention:**
1. Check the `DefaultDocumentBuilder` API in Langium 4 for new abstract methods.
2. Check whether `BuildOptions` has new fields.
3. Verify that `this.langiumDocumentFactory`, `this.langiumDocuments`, and `this.update()` still exist on the base class.

**Detection:** TypeScript compilation errors on the override methods.

**Confidence:** MEDIUM (the feature addition is confirmed, but exact API impact on the base class is not fully documented).

**Phase:** During "fix compilation errors" step.

---

### Pitfall 11: `DefaultDocumentValidator.toDiagnostic` Protected Method Changes

**What goes wrong:** `BBjDocumentValidator` overrides `toDiagnostic` to downgrade linking errors to warnings. It also imports `getDiagnosticRange`, `toDiagnosticSeverity`, `DiagnosticData`, and `DocumentValidator.LinkingError` from `langium`. If any of these utility exports were moved, renamed, or had signature changes, the custom validator breaks.

**Specific imports at risk:**
```typescript
import { getDiagnosticRange, toDiagnosticSeverity, DiagnosticData, DiagnosticInfo, DocumentValidator } from "langium";
```

**Prevention:**
1. Check whether `getDiagnosticRange`, `toDiagnosticSeverity`, and `DocumentValidator.LinkingError` are still exported from `langium` core.
2. The `toDiagnostic` method signature uses generics -- check for changes.
3. Langium moved all LSP-related functionality to `langium/lsp` in earlier versions; verify these utilities are still in core.

**Detection:** TypeScript import errors or compilation errors.

**Confidence:** MEDIUM (these are internal/protected APIs that could have changed without being highlighted in the CHANGELOG).

**Phase:** During "fix compilation errors" step.

---

### Pitfall 12: `FileSystemProvider` Interface Extension

**What goes wrong:** Langium 4 extended the `FileSystemProvider` interface with new required methods (#1784). The `BBjWorkspaceManager` and `BBjDocumentBuilder` use `this.fileSystemProvider` extensively. If the default implementation gained new methods that the code depends on, or if the project provides a custom `FileSystemProvider`, it must implement the new methods.

**Prevention:**
1. The project uses `NodeFileSystem` from `langium/node` (in `main.ts`), which should provide the updated implementation.
2. The test setup uses `EmptyFileSystem` (in `parser.test.ts`). Check whether `EmptyFileSystem` was updated for Langium 4.
3. If the project has any custom file system provider implementation, it must implement new methods.

**Detection:** TypeScript compilation error on missing interface methods.

**Confidence:** HIGH (verified via CHANGELOG #1784).

**Phase:** During "fix compilation errors" step, especially in test files.

---

### Pitfall 13: `References.findDeclaration` Renamed to `findDeclarations` (Plural)

**What goes wrong:** The `References.findDeclaration` method was renamed to `findDeclarations` and now returns an array (#1509). If any BBj code calls this method, it will break.

**Prevention:** Grep the codebase for `findDeclaration` and update to `findDeclarations` with appropriate array handling.

**Detection:** TypeScript compilation error.

**Confidence:** HIGH (verified via CHANGELOG #1509). LOW confidence on codebase impact (did not find direct usage in grepping, but it could be used indirectly).

**Phase:** During "fix compilation errors" step.

---

### Pitfall 14: Regeneration Order Mistake

**What goes wrong:** Running `langium generate` with the OLD `langium-cli` (3.2.0) after updating the `langium` runtime to 4.x, or vice versa. The generated `ast.ts`, `grammar.ts`, and `module.ts` files will be incompatible with the runtime if the CLI and library versions don't match.

**Why it happens:** `npm install` might update `langium` but leave `langium-cli` at 3.2.0 if version ranges are too tight. Or the developer regenerates before updating both packages.

**Consequences:**
- Generated `module.ts` imports types from `langium` that don't exist in the installed version.
- Generated `ast.ts` uses the old constant format with the new runtime.
- Grammar JSON format in `grammar.ts` may be incompatible.
- Confusing compilation errors that look like the grammar is wrong.

**Prevention:**
1. Update BOTH `langium` and `langium-cli` to 4.2.0 in the SAME step.
2. Then run `langium generate` immediately after.
3. Commit the generated files.
4. Only then start fixing compilation errors in custom code.

**Correct order:**
```
1. npm install langium@~4.2.0 langium-cli@~4.2.0
2. npx langium generate
3. Inspect generated files for new patterns
4. Fix custom code
```

**Detection:** Bizarre compilation errors in generated files, type mismatches between generated and runtime code.

**Confidence:** HIGH (structural certainty -- version mismatch always causes issues).

**Phase:** The very first step of the actual code migration.

---

### Pitfall 15: Grammar Validation Stricter in Langium 4

**What goes wrong:** Langium 4 added grammar validations: rules cannot use the same name as the grammar (#1979), grammar names must be unique (#1979), and unused Xtext features were removed (#1945). Running `langium generate` on the existing grammar may produce NEW validation errors that didn't exist in Langium 3.

**Specific risk for BBj:**
- Grammar name is `BBj`. No rule is named `BBj` (verified), so #1979 is safe.
- The `java-types.langium` file defines interfaces only (no parser rules), which uses Langium's "declared types" syntax. Check this is still valid in Langium 4.
- Any Xtext-inherited grammar features used (like `hidden()` syntax, or old-style actions) may now produce errors.

**Prevention:**
1. Run `langium generate` and carefully review ALL warnings and errors before proceeding.
2. The `caseInsensitive: true` config may need verification -- check if it's still supported.
3. The `chevrotainParserConfig` in `langium-config.json` should still work but verify.

**Detection:** `langium generate` command fails or produces warnings.

**Confidence:** HIGH for the grammar name rule; MEDIUM for other grammar validations.

**Phase:** During the `langium generate` step.

---

### Pitfall 16: Test Suite Breakage from `parseHelper` and `EmptyFileSystem`

**What goes wrong:** Tests import `parseHelper` from `langium/test` and use `EmptyFileSystem` from `langium`. Both of these test utilities may have changed in Langium 4. The `expectFunction` from `langium/test` was deprecated. If test utilities were reorganized, all test files will need import path changes.

**Specific risks:**
- `parser.test.ts` line 3: `import { parseHelper } from 'langium/test'` -- check if this export still exists.
- `parser.test.ts` line 8: `createBBjServices(EmptyFileSystem)` -- check `EmptyFileSystem` shape.
- `test-helper.ts`: `initializeWorkspace` calls `wsManager.initializeWorkspace([{ name: 'test', uri: 'file:/test' }])` -- check if `initializeWorkspace` signature changed.
- All 15 test files may need `import` updates.

**Prevention:**
1. Run `npm run test` immediately after compilation succeeds.
2. Fix test infrastructure (`bbj-test-module.ts`, `test-helper.ts`) first, then individual tests.
3. The synthetic AST nodes in `bbj-test-module.ts` (with `$type: JavaClass`) are the highest risk.

**Detection:** Test compilation failures or runtime test failures.

**Confidence:** MEDIUM (test utility changes are not well-documented in the CHANGELOG).

**Phase:** After all source code compiles, before declaring migration complete.

---

### Pitfall 17: Esbuild Bundle Compatibility

**What goes wrong:** The project bundles via `esbuild.mjs` with `format: 'cjs'`. Langium 4 continues to be ESM-first. The project already handles the ESM-to-CJS conversion, but Chevrotain 11.1.1 may have different ESM/CJS compatibility characteristics than 11.0.3. The known `__esModule` export conflict with Chevrotain's ESM bundle could resurface.

**Current esbuild config:**
```javascript
entryPoints: ['src/extension.ts', 'src/language/main.ts'],
outExtension: { '.js': '.cjs' },
format: 'cjs',
platform: 'node'
```

**Prevention:**
1. Test the esbuild bundle after upgrading, before testing in VS Code.
2. If Chevrotain ESM issues appear, try adding `chevrotain` to the `external` array or use the `--main-fields=module,main` flag.
3. Verify the bundle works by running `node out/main.cjs` (it should fail gracefully with "no connection" rather than with import errors).

**Detection:** Bundle build failures, or runtime `require()` errors when loading the extension.

**Confidence:** MEDIUM (esbuild/Chevrotain ESM issues are documented for other versions but not specifically for this exact version combination).

**Phase:** After code changes, during the "build and verify" step.

---

## Minor Pitfalls

Annoyances or issues that are easily fixable but worth knowing about.

---

### Pitfall 18: Import Path Changes for LSP-Related Types

**What goes wrong:** Various types and functions may have moved between `langium` and `langium/lsp` entry points. The project already uses the split imports (e.g., `from 'langium/lsp'`), but any new type movements in v4 could cause import errors.

**Known import patterns in the project:**
- `from 'langium'` -- core types
- `from 'langium/lsp'` -- LSP service types
- `from 'langium/test'` -- test utilities
- `from 'langium/node'` -- Node.js file system

**Prevention:** If an import fails, check whether the type moved to a different entry point.

**Confidence:** MEDIUM.

**Phase:** During "fix compilation errors" step.

---

### Pitfall 19: `BBjAstType` Change from String Enumeration to Object Type

**What goes wrong:** The generated `BBjAstType` type (from `ast.ts`) changed from "an enumeration of string types to an object type mapping AST type names to their type declarations" (#738). The `BbjScopeProvider.getScope` method uses `AstNodeTypesWithCrossReferences<BBjAstType>` and `CrossReferencesOfAstNodeType<typeof container>` which depend on the exact shape of `BBjAstType`.

**Specific risk:**
```typescript
// bbj-scope.ts line 76
const container = context.container as AstNodeTypesWithCrossReferences<BBjAstType>;
```
If `BBjAstType` is now an object map instead of a union of string literals, this type utility may work differently.

**Prevention:** After regeneration, inspect `BBjAstType` in the new `ast.ts` and check TypeScript errors in `bbj-scope.ts`.

**Detection:** TypeScript compilation errors in scope provider.

**Confidence:** MEDIUM (the change is documented but exact impact on these utility types needs verification).

**Phase:** During "fix compilation errors" step.

---

### Pitfall 20: `loadGrammarFromJson` Changes

**What goes wrong:** The generated `grammar.ts` uses `loadGrammarFromJson()` from `langium`. If the JSON serialization format for grammars changed in Langium 4, the old generated `grammar.ts` won't work with the new runtime. Conversely, the new generated `grammar.ts` won't work with the old runtime.

**Prevention:** This is automatically handled by regenerating with the matching `langium-cli` version. Just ensure regeneration happens.

**Detection:** Runtime crash when trying to load the grammar.

**Confidence:** HIGH (structural certainty that regeneration is needed).

**Phase:** Handled by the regeneration step.

---

### Pitfall 21: `StreamScope` Protected Field Access Changes

**What goes wrong:** The `StreamScopeWithPredicate` class (in `bbj-scope.ts`) extends `StreamScope` and accesses protected fields: `this.caseInsensitive`, `this.elements`, and `this.outerScope`. If Langium 4 changed the visibility or naming of these fields, the custom scope class breaks.

**Prevention:** Check whether `StreamScope` protected fields are stable in Langium 4.

**Detection:** TypeScript compilation error on field access.

**Confidence:** LOW (no evidence of change, but protected field access is inherently fragile).

**Phase:** During "fix compilation errors" step.

---

## Phase-Specific Warnings

| Migration Phase | Likely Pitfall | Mitigation |
|----------------|---------------|------------|
| **1. Environment prep** | Node.js version too old (#9) | Require Node >= 20.10.0 |
| **2. Dependency update** | Chevrotain version mismatch (#6), TypeScript version (#8) | Update langium + langium-cli + remove direct chevrotain dep simultaneously |
| **3. Grammar regeneration** | Wrong regeneration order (#14), grammar validation errors (#15) | Update deps first, then regenerate, inspect output |
| **4. Fix compilation** | PrecomputedScopes rename (#2), type constant changes (#1), completion provider (#5), linker/scope Reference union (#3), parser creation (#4) | Fix in dependency order: generated types first, then services |
| **5. Module wiring** | Service registry changes (#7) | Check register/all patterns against Langium 4 examples |
| **6. Runtime testing** | Silent behavior changes from type constants (#1), esbuild bundle (#17) | Run full test suite, test in VS Code manually |
| **7. Test suite** | Test utility changes (#16), synthetic AST nodes (#1) | Fix test module first, then individual tests |

## Recommended Migration Order

Based on pitfall dependencies, the migration should proceed in this exact order:

1. **Verify environment:** Node >= 20.10.0, TypeScript >= 5.8.0
2. **Update dependencies atomically:** `langium`, `langium-cli` to ~4.2.0, remove direct `chevrotain` dependency
3. **Regenerate:** `npx langium generate` -- fix any grammar validation errors
4. **Inspect generated `ast.ts`:** Understand the new type constant pattern before touching any code
5. **Fix generated module imports:** `module.ts` type imports
6. **Fix `PrecomputedScopes` to `LocalSymbols`:** Simple rename with possible interface adaptation
7. **Fix type constant usages across ALL files:** The biggest single task (Pitfalls #1 and #19)
8. **Fix linker/scope provider for Reference | MultiReference:** #3
9. **Fix completion provider:** #5
10. **Fix parser creation:** #4
11. **Fix document builder/validator:** #10, #11
12. **Fix service registry usage:** #7
13. **Compile and fix remaining errors**
14. **Run test suite and fix test infrastructure:** #16
15. **Build esbuild bundle and verify:** #17
16. **Manual smoke test in VS Code**

## Sources

- [Langium CHANGELOG](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) -- PRIMARY source for all breaking changes
- [Langium 4.0 Release Blog Post](https://www.typefox.io/blog/langium-release-4.0/) -- Overview of new features
- [npm: langium@4.2.0 dependencies](https://www.npmjs.com/package/langium) -- Verified Chevrotain ~11.1.1 requirement
- [npm: langium@4.2.0 engines](https://www.npmjs.com/package/langium) -- Verified Node >= 20.10.0 requirement
- [Langium Code Bundling Guide](https://langium.org/docs/recipes/code-bundling/) -- esbuild guidance
- [Langium Document Lifecycle](https://langium.org/docs/reference/document-lifecycle/) -- DocumentState reference
- Codebase analysis of `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/` -- all file-specific findings
