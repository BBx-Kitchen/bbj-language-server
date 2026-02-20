# Phase 17: Build Verification & Test Suite - Research

**Researched:** 2026-02-03
**Domain:** TypeScript compilation, esbuild bundling, vitest testing, Langium 4 API completion
**Confidence:** HIGH

## Summary

Phase 17 is a mechanical verification and fix phase -- get the full project compiling, bundling, and passing all tests after the Langium 3-to-4 migration (Phases 14-16). The current state shows 21 TypeScript compilation errors and 9 test file failures stemming from incomplete Langium 4 API migrations. These errors fall into clear categories: (1) LocalSymbols API misuse (calling `.get()` instead of `.getStream()`), (2) CstNode API changes (`.element` → `.astNode`, `.children` → `.content`), (3) method signature mismatches in workspace manager, hover provider, and document builder, and (4) lexer token ordering issues causing test failures.

The project uses a standard TypeScript + esbuild + vitest stack with IntelliJ Gradle build depending on the esbuild output. The build chain is: `tsc -b` → `esbuild` → `vsce package` for VS Code, and Gradle `build` task copies `out/language/main.cjs` into IntelliJ plugin resources.

**Primary recommendation:** Fix compilation errors by category (LocalSymbols API → CstNode API → method signatures → lexer), then address test failures (primarily the lexer ordering issue and JavadocProvider singleton), smoke-test the bundle, verify IntelliJ build, and defer vsce package to Phase 18 (release phase).

## Standard Stack

### Core Build Tools
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8.3 | Type-safe compilation | Required by Langium, provides strict type checking |
| esbuild | 0.25.12 | Fast bundling | Langium ecosystem standard, produces standalone .cjs bundles |
| vitest | 1.6.1 | Testing framework | Modern, fast, Vite-based test runner with ESM support |
| Langium | 4.1.3 | Language server framework | Core dependency, source of all API changes |

### VS Code Extension Build
| Tool | Purpose | When Used |
|------|---------|-----------|
| `tsc -b tsconfig.json` | Compile TypeScript to check types (noEmit: true) | Every build, produces no output files |
| `node ./esbuild.mjs` | Bundle extension.ts and language/main.ts to .cjs | After tsc succeeds |
| `vsce package` | Create .vsix extension package | Release phase (Phase 18) |

### IntelliJ Plugin Build
| Tool | Purpose | Dependencies |
|------|---------|--------------|
| Gradle `build` task | Compile Java, copy resources, build .jar | Requires `bbj-vscode/out/language/main.cjs` |
| `copyLanguageServer` task | Copy main.cjs from VS Code build output | Depends on esbuild completing |
| `prepareSandbox` task | Stage files for plugin sandbox | Runtime dependency |

### Test Infrastructure
| Component | Purpose | Framework |
|-----------|---------|-----------|
| vitest | Test runner, assertions | vitest 1.6.1 |
| `createBBjTestServices` | Test service container with mocks | Langium test helpers |
| `parseHelper` | Parse BBj code in tests | Langium test utilities |
| `expectCompletion` | Completion test assertions | Langium test utilities |

**Installation:**
```bash
cd bbj-vscode
npm install  # Already done, packages at correct versions
```

## Architecture Patterns

### Build Process Flow
```
1. TypeScript compilation (type checking only, noEmit: true)
   ├─ bbj-vscode/tsconfig.json (main sources)
   └─ bbj-vscode/tsconfig.test.json (test sources)

2. esbuild bundling (produces actual output)
   ├─ src/extension.ts → out/extension.cjs (VS Code extension)
   └─ src/language/main.ts → out/language/main.cjs (language server)

3. IntelliJ Gradle build (consumes language server)
   └─ Copies out/language/main.cjs into plugin resources
```

### Error Categories and Fix Patterns

**Category 1: LocalSymbols API Changes**
The Langium 4 `LocalSymbols` interface changed from `MultiMap<K, V>` methods to stream-based API:
- OLD: `scopes.get(node)` returns `V[]`
- NEW: `scopes.getStream(node)` returns `Stream<V>`
- OLD: `scopes.add(node, value)`
- NEW: Use `MultiMap<K, V>` directly (DefaultScopeComputation returns MultiMap which implements LocalSymbols)

**Pattern: LocalSymbols is an interface, implementation is MultiMap**
```typescript
// In collectLocalSymbols(), create MultiMap (which implements LocalSymbols)
const scopes = new MultiMap<AstNode, AstNodeDescription>();

// Pass to processNode as LocalSymbols (interface contract)
await this.processNode(node, document, scopes);

// MultiMap.add() works because scopes is actually MultiMap
scopes.add(rootNode, description);  // ✓ Works

// But if you only have LocalSymbols reference, use getStream()
function usesInterface(symbols: LocalSymbols) {
    const stream = symbols.getStream(node);  // ✓ Correct
    // symbols.get(node);  ✗ Does not exist on interface
}

// Return scopes as LocalSymbols (MultiMap implements it)
return scopes;  // ✓ Valid return type
```

**Category 2: CstNode API Renames**
- `.element` → `.astNode` (property holding the AST node)
- `.children` → `.content` (property holding child CST nodes on CompositeCstNode)

**Pattern:**
```typescript
// Old
const astNode = cstNode.element;
const kids = compositeCstNode.children;

// New
const astNode = cstNode.astNode;
const kids = compositeCstNode.content;
```

**Category 3: Method Signature Changes**

| Method | Old Signature | New Signature | Fix Needed |
|--------|--------------|---------------|------------|
| `getAstNodeHoverContent` | `Promise<Hover \| undefined>` | `MaybePromise<string \| undefined>` | Return string, not Hover object |
| `traverseFolder` | 4 params: `(workspaceFolder, folderPath, fileExtensions, collector)` | 2 params: `(folderPath, uris)` | Update signature or remove override |
| `processNode` (scope-local) | Type: `PrecomputedScopes` | Type: `LocalSymbols` | Already done in Phase 15 |
| `buildDocuments` | May need override modifier | Add `override` keyword | Check base class signature |

**Category 4: Type Guard Usage with Strings**
Some validators call type guards with string type names instead of type constant objects. In Langium 4, type guards expect the actual type object with `.$type` property.

**Pattern:**
```typescript
// Old (Langium 3)
this.accept('warning', 'FieldDecl', messageFunction, node);

// New (Langium 4)
this.accept('warning', FieldDecl.$type, messageFunction, node);
```

### Test Failure Patterns

**Pattern 1: Lexer Token Ordering**
Chevrotain lexer requires more specific tokens before general patterns. The error "Token X can never be matched because it appears AFTER Token Y" means reorder token definitions in `bbj-lexer.ts`.

**Pattern 2: JavadocProvider Singleton**
Multiple test files call `JavadocProvider.getInstance().initialize()` causing "already initialized" errors. Solution: Either use `beforeAll` to initialize once, check `isInitialized()` before calling, or add cleanup in `afterAll`.

**Pattern 3: LocalSymbols in Tests**
Tests calling `document.precomputedScopes` need updating to `document.localSymbols`. Tests expecting `.get()` need `.getStream().toArray()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle smoke-testing | Custom Node.js loader testing | Simple `node -e 'require("./main.cjs")'` | Verifies bundle loads without errors; catches missing externals |
| LocalSymbols iteration | Custom iteration logic | `.getStream().toArray()` or stream methods | MultiMap already optimized; stream API is the contract |
| Type constant migration | Find/replace type names | Use `TypeName.$type` pattern consistently | Type guards and AST operations expect this pattern |
| Test service cleanup | Manual singleton reset | beforeAll/afterAll hooks with isInitialized checks | Standard vitest lifecycle management |

**Key insight:** The LocalSymbols interface change from array-based `.get()` to stream-based `.getStream()` is intentional -- it allows lazy evaluation and better performance for large documents. Don't try to preserve `.get()` calls; embrace the stream API.

## Common Pitfalls

### Pitfall 1: Treating LocalSymbols as MultiMap in Type Annotations
**What goes wrong:** Code expects `scopes.add()` or `scopes.get()` but TypeScript shows those methods don't exist.
**Why it happens:** Function parameter typed as `LocalSymbols` (interface) instead of `MultiMap` (implementation). The interface only guarantees `has()` and `getStream()`.
**How to avoid:**
- In `collectLocalSymbols()`, create and return `MultiMap` (which implements `LocalSymbols`)
- In `processNode()` and other helpers, accept `LocalSymbols` for the interface contract but know the actual value is `MultiMap`
- If you need `.add()`, either keep the variable as `MultiMap` type or cast: `(scopes as MultiMap<K, V>).add()`
**Warning signs:**
- TypeScript error "Property 'get' does not exist on type 'LocalSymbols'"
- TypeScript error "Property 'add' does not exist on type 'LocalSymbols'"

### Pitfall 2: Returning Wrong Type from getAstNodeHoverContent
**What goes wrong:** TypeScript error "Type 'Promise<Hover | undefined>' is not assignable to type 'MaybePromise<string | undefined>'"
**Why it happens:** Langium 4 changed `AstNodeHoverProvider.getAstNodeHoverContent` to return the hover content string, not the full Hover object. The base class now constructs the Hover object for you.
**How to avoid:**
- Return just the markdown string: `return "```bbj\n" + signature + "\n```"`
- Remove `Hover` object construction: no more `{ contents: { kind: MarkupKind.Markdown, value: ... } }`
- Let the base class handle the Hover object creation
**Warning signs:** Hover-related compilation errors mentioning return type mismatch

### Pitfall 3: Confusing CstNode.element with AstNode.$cstNode
**What goes wrong:** Code tries to get the AST node from a CST node using old `.element` property.
**Why it happens:** Property was renamed to `.astNode` in Langium 4.
**How to avoid:**
- Always use `cstNode.astNode` to get the AST node from a CST node
- Always use `astNode.$cstNode` to get the CST node from an AST node
- Remember: CST → AST uses `.astNode`, AST → CST uses `.$cstNode`
**Warning signs:**
- TypeScript error "Property 'element' does not exist on type 'CstNode'"
- TypeScript error "Property 'element' does not exist on type 'LeafCstNode'"

### Pitfall 4: Running Tests Before Fixing Compilation
**What goes wrong:** Test failures are hard to diagnose because the source code doesn't compile.
**Why it happens:** Attempting to run tests while compilation errors exist.
**How to avoid:** Always fix all `tsc` errors before running tests. The test phase verifies behavior, not whether code compiles.
**Warning signs:** Test failures with messages about undefined properties or type mismatches that match compilation errors

### Pitfall 5: Assuming esbuild Success Means Correct Bundle
**What goes wrong:** esbuild completes but the bundle doesn't load due to missing externals or import errors.
**Why it happens:** esbuild is permissive and bundles even with some unresolved imports.
**How to avoid:** Always smoke-test the bundle with `node -e 'require("./out/language/main.cjs")'` after building. This catches loading errors early.
**Warning signs:** IntelliJ plugin fails to start language server despite successful esbuild; runtime errors about missing modules

## Code Examples

Verified patterns from current codebase and Langium 4 documentation:

### LocalSymbols Usage (from DefaultScopeComputation pattern)
```typescript
// Source: bbj-scope-local.ts + Langium 4 DefaultScopeComputation
override async collectLocalSymbols(
    document: LangiumDocument,
    cancelToken: CancellationToken
): Promise<LocalSymbols> {
    const rootNode = document.parseResult.value;
    // Create MultiMap (which implements LocalSymbols)
    const scopes = new MultiMap<AstNode, AstNodeDescription>();

    for (const node of AstUtils.streamAllContents(rootNode)) {
        await interruptAndCheck(cancelToken);
        // Pass as LocalSymbols (interface type)
        await this.processNode(node, document, scopes);
    }

    // Can use MultiMap.add() because scopes is MultiMap
    scopes.add(rootNode, someDescription);

    // Return as LocalSymbols (MultiMap implements it)
    return scopes;
}

// Helper that accepts LocalSymbols but works with MultiMap
protected async processNode(
    node: AstNode,
    document: LangiumDocument,
    scopes: LocalSymbols  // Interface type in signature
): Promise<void> {
    // Cast to MultiMap when you need .add()
    (scopes as MultiMap<AstNode, AstNodeDescription>).add(node.$container, description);
}

// Reading from LocalSymbols (use stream API)
const symbolStream = document.localSymbols?.getStream(node);
const symbols = symbolStream?.toArray() ?? [];
```

### CstNode Property Access
```typescript
// Source: Langium 4 syntax-tree.d.ts + bbj-scope.ts fixes
// OLD (Langium 3)
const astNode = cstNode.element;
const children = compositeCstNode.children;

// NEW (Langium 4)
const astNode = cstNode.astNode;
const children = compositeCstNode.content;

// Example from actual fix needed
// bbj-scope.ts line 206
const paramNode = callNode.arguments[i].$cstNode;
if (paramNode?.element) {  // ✗ OLD
    // ...
}
// Fix:
if (paramNode?.astNode) {  // ✓ NEW
    // ...
}
```

### Hover Provider Return Type
```typescript
// Source: Langium 4 hover-provider.d.ts
export class BBjHoverProvider extends AstNodeHoverProvider {
    // OLD (Langium 3)
    protected getAstNodeHoverContent(node: AstNode): Promise<Hover | undefined> {
        const content = buildContent(node);
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: content
            }
        };
    }

    // NEW (Langium 4)
    protected getAstNodeHoverContent(node: AstNode): Promise<string | undefined> {
        // Just return the markdown string
        return buildContent(node);
    }
}
```

### Type Constant Usage in Validators
```typescript
// Source: bbj-validator.ts + Langium 4 migration pattern
// OLD (Langium 3)
this.accept('warning', 'FieldDecl', messageFunction, node);

// NEW (Langium 4)
import { FieldDecl } from './generated/ast.js';
this.accept('warning', FieldDecl.$type, messageFunction, node);
```

### Bundle Smoke Test
```bash
# Source: Standard Node.js practice
# After esbuild completes
node -e 'require("./bbj-vscode/out/language/main.cjs")'

# Success: No output (bundle loads cleanly)
# Failure: Error messages about missing modules or syntax errors
```

### Test Service Initialization
```typescript
// Source: bbj-test-module.ts + vitest patterns
// Test file pattern
describe('My Tests', async () => {
    const services = createBBjTestServices(EmptyFileSystem);

    beforeAll(async () => {
        // Initialize workspace once
        await initializeWorkspace(services.shared);

        // Initialize JavadocProvider if not already done
        if (!JavadocProvider.getInstance().isInitialized()) {
            JavadocProvider.getInstance().initialize(
                [],
                services.shared.workspace.FileSystemProvider
            );
        }
    });

    test('My test', async () => {
        // Test code
    });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PrecomputedScopes` with `.get()` | `LocalSymbols` with `.getStream()` | Langium 4.0 | Stream-based API for lazy evaluation; breaks all scope access code |
| `CstNode.element` | `CstNode.astNode` | Langium 4.0 | More explicit naming; breaks all CST→AST navigation |
| `CompositeCstNode.children` | `CompositeCstNode.content` | Langium 4.0 | Consistency with other content properties; breaks CST traversal |
| `computeExports()` / `computeLocalScopes()` | `collectExportedSymbols()` / `collectLocalSymbols()` | Langium 4.0 | Clearer naming; automated migration possible |
| `document.precomputedScopes` | `document.localSymbols` | Langium 4.0 | Consistency with new API; automated migration possible |
| Hover returns `Hover` object | Hover returns `string` content | Langium 4.0 | Simpler contract, base class handles object construction |
| 4-param `traverseFolder()` | 2-param `traverseFolder()` | Langium 4.0 | Simplified API; requires signature update or override removal |

**Deprecated/outdated:**
- `PrecomputedScopes` type: Use `LocalSymbols` instead
- `.element` on CstNode: Use `.astNode` instead
- `.children` on CompositeCstNode: Use `.content` instead
- Direct `.get()` on LocalSymbols: Use `.getStream()` instead

## Current Error Inventory

### TypeScript Compilation Errors (21 total)

**LocalSymbols API misuse (6 errors):**
- `bbj-scope-local.ts:104` - Property 'get' does not exist on type 'LocalSymbols'
- `bbj-scope-local.ts:104` - Parameter 'descr' implicitly has an 'any' type
- `bbj-scope-local.ts:158` - Property 'get' does not exist on type 'LocalSymbols'
- `bbj-scope-local.ts:158` - Parameter 'descr' implicitly has an 'any' type
- `bbj-scope-local.ts:262` - Property 'add' does not exist on type 'LocalSymbols'
- `bbj-scope.ts:145` - Property 'get' does not exist on type 'LocalSymbols'

**LocalSymbols Stream API (3 errors):**
- `bbj-scope.ts:248` - Property 'get' does not exist on type 'LocalSymbols'
- `bbj-scope.ts:249` - Parameter 'descr' implicitly has an 'any' type
- `bbj-scope.ts:337` - Property 'get' does not exist on type 'LocalSymbols'

**CstNode API changes (4 errors):**
- `bbj-scope.ts:206` - Property 'element' does not exist on type 'CstNode'
- `bbj-scope.ts:208` - Property 'element' does not exist on type 'CstNode'
- `bbj-validator.ts:271` - Property 'children' does not exist on type 'CompositeCstNode'
- `bbj-validator.ts:276` - Property 'children' does not exist on type 'CompositeCstNode'

**Method signature mismatches (5 errors):**
- `bbj-document-builder.ts:13` - Missing 'override' modifier
- `bbj-hover.ts:20` - Return type mismatch (Promise<Hover> vs MaybePromise<string>)
- `bbj-scope-local.ts:81` - Invalid 'override' on processNode (not in base class)
- `bbj-ws-manager.ts:118` - traverseFolder signature mismatch (4 params vs 2 params)
- `bbj-ws-manager.ts:121` - Property 'includeEntry' does not exist

**Type constant misuse (3 errors):**
- `bbj-validator.ts:71` - String 'FieldDecl' not assignable to type constant union
- `bbj-scope.ts:340` - Parameter 'member' implicitly has an 'any' type
- `validations/line-break-validation.ts:114` - Property 'element' does not exist on LeafCstNode

### Test Failures (9 failing test files, 2 failing tests)

**Lexer initialization errors (multiple files):**
- Chevrotain errors about unreachable tokens (EXTRACT, DELETE, INPUT, ENTER, SAVE, READ, FIND all "can never be matched")
- Root cause: Token ordering in lexer definition

**JavadocProvider singleton errors (2 test files):**
- `document-symbol.test.ts` - "JavadocProvider already initialized"
- `linking.test.ts` - "JavadocProvider already initialized"

**Specific test failures:**
- `completion-test.test.ts` - Fails due to lexer initialization errors (1 failed test)
- `lexer.test.ts` - Fails due to lexer initialization errors (no tests could run)

## Open Questions

1. **traverseFolder override necessity**
   - What we know: Langium 4 changed signature from 4 params to 2 params
   - What's unclear: Whether the override is still needed or can be removed
   - Recommendation: Try removing the override; if custom logic needed, rewrite for new signature

2. **includeEntry vs shouldIncludeEntry**
   - What we know: Error says `includeEntry` doesn't exist, base class has `shouldIncludeEntry`
   - What's unclear: Whether it's a simple rename or API restructure
   - Recommendation: Check base class implementation, likely just rename to `shouldIncludeEntry`

3. **vsce package in Phase 17 vs Phase 18**
   - What we know: Phase 17 is "build verification", Phase 18 is "functional verification & release"
   - What's unclear: Whether vsce package belongs in build verification or release
   - Recommendation: Smoke-test the bundle in Phase 17, defer full vsce package to Phase 18 (along with publishing)

4. **Test granularity for lexer fixes**
   - What we know: Lexer token ordering needs fixing
   - What's unclear: Whether to fix and test incrementally or fix all tokens at once
   - Recommendation: Fix all unreachable tokens in one go, test suite will validate

## Sources

### Primary (HIGH confidence)
- Langium 4.1.3 type definitions (`node_modules/langium/lib/**/*.d.ts`)
- Current TypeScript compilation output (`npm run build`)
- Current test suite output (`npm test`)
- package.json build scripts (verified in `/Users/beff/_workspace/bbj-language-server/bbj-vscode/package.json`)
- IntelliJ build.gradle.kts (verified in `/Users/beff/_workspace/bbj-language-server/bbj-intellij/build.gradle.kts`)

### Secondary (MEDIUM confidence)
- Phase 15 PLAN files (precedent for LocalSymbols and type constant migrations)
- Phase 16 PLAN files (precedent for API signature changes)
- Existing test infrastructure patterns (bbj-test-module.ts, test-helper.ts)

### Tertiary (LOW confidence)
- None used -- all findings from direct source inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools verified in package.json and build files
- Architecture: HIGH - Build chain traced through actual configuration files
- Pitfalls: HIGH - All derived from actual compilation and test errors
- Error inventory: HIGH - Complete listing from current build/test output

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days, Langium 4.1.x is stable)

## Fix Strategy Recommendation

Based on error categories and dependencies, recommended fix order:

1. **LocalSymbols API** (blocks most scope code)
   - Fix `.get()` → `.getStream().toArray()` or `.getStream()` in bbj-scope-local.ts and bbj-scope.ts
   - Fix `.add()` usage by casting to MultiMap or keeping variable as MultiMap type
   - Fix type annotations: `scopes: LocalSymbols` where needed

2. **CstNode API** (blocks validator and scope code)
   - Fix `.element` → `.astNode` in bbj-scope.ts, bbj-validator.ts, line-break-validation.ts
   - Fix `.children` → `.content` in bbj-validator.ts

3. **Method signatures** (blocks service compilation)
   - Add `override` to bbj-document-builder.ts
   - Fix hover provider return type (string instead of Hover object)
   - Remove invalid `override` from processNode or adjust base class
   - Fix or remove traverseFolder override
   - Rename includeEntry → shouldIncludeEntry

4. **Type constants** (quick fix)
   - Fix bbj-validator.ts line 71: use `FieldDecl.$type` instead of `'FieldDecl'`

5. **Lexer token ordering** (blocks tests)
   - Reorder tokens in bbj-lexer.ts to fix Chevrotain unreachable token errors

6. **Test infrastructure** (cleanup)
   - Fix JavadocProvider singleton initialization in tests

7. **Bundle verification** (validation)
   - Smoke-test: `node -e 'require("./bbj-vscode/out/language/main.cjs")'`
   - Run vitest suite: `npm test`
   - Build IntelliJ plugin: `cd bbj-intellij && ./gradlew build`

This order minimizes rework -- each step unlocks the next without backward dependencies.
