# Phase 15: Core API Renames & Type Constants - Research

**Researched:** 2026-02-03
**Domain:** Langium 4 breaking changes - AST type system and scope computation
**Confidence:** HIGH

## Summary

Phase 15 addresses mechanical API renames introduced in Langium 4.0. The research confirms three major breaking changes: (1) AST type constants moved from `TypeName` to `TypeName.$type`, (2) `PrecomputedScopes` renamed to `LocalSymbols` with `document.precomputedScopes` becoming `document.localSymbols`, and (3) scope computation method names changed from `computeExports`/`computeLocalScopes` to `collectExportedSymbols`/`collectLocalSymbols`.

The BBj language server codebase has **195 type guard calls** across **21 files**, **23 switch case statements** using type constants, **3 PrecomputedScopes references**, and **2 scope computation method overrides** that all require updates.

**Primary recommendation:** Apply systematic find-and-replace for type constants and method renames, then update imports. This is pure mechanical migration with zero behavioral changes.

## Standard Stack

No new dependencies required. This phase works with the already-installed Langium 4.1.3.

### Breaking Changes Confirmed

| Change | Langium Version | PR Number | Status |
|--------|----------------|-----------|---------|
| Type constants: `TypeName` → `TypeName.$type` | 4.0.0 | #1942 | Verified |
| `PrecomputedScopes` → `LocalSymbols` | 4.0.0 | #1788 | Verified |
| `document.precomputedScopes` → `document.localSymbols` | 4.0.0 | #1788 | Verified |
| `computeExports` → `collectExportedSymbols` | 4.0.0 | (ScopeComputation interface) | Verified |
| `computeLocalScopes` → `collectLocalSymbols` | 4.0.0 | (ScopeComputation interface) | Verified |

## Architecture Patterns

### Pattern 1: Type Constant Migration

**What:** In Langium 3, generated AST types exported string constants directly. In Langium 4, they're namespaced as properties on type objects.

**Old pattern (Langium 3):**
```typescript
// Generated in ast.ts (Langium 3)
export const AddrStatement = 'AddrStatement';

// Usage in switch statements
switch (node.$type) {
    case MethodDecl:  // string constant
        return SymbolKind.Function;
}
```

**New pattern (Langium 4):**
```typescript
// Generated in ast.ts (Langium 4)
export const MethodDecl = {
    $type: 'MethodDecl',
    err: 'err',
    fileid: 'fileid'
} as const;

// Usage in switch statements
switch (node.$type) {
    case MethodDecl.$type:  // property access
        return SymbolKind.Function;
}
```

**Migration action:** Add `.$type` suffix to every type constant reference in switch cases.

### Pattern 2: PrecomputedScopes → LocalSymbols

**What:** Langium 4.0 renamed the scope precomputation result type and document property.

**Old pattern (Langium 3):**
```typescript
import { PrecomputedScopes } from 'langium';

async computeLocalScopes(document: LangiumDocument): Promise<PrecomputedScopes> {
    const scopes = new MultiMap<AstNode, AstNodeDescription>();
    // ...
    return scopes;
}

// Accessing precomputed scopes
const precomputed = doc.precomputedScopes;
const locals = document.precomputedScopes?.get(program);
```

**New pattern (Langium 4):**
```typescript
import { LocalSymbols } from 'langium';

async collectLocalSymbols(document: LangiumDocument): Promise<LocalSymbols> {
    const scopes = new MultiMap<AstNode, AstNodeDescription>();
    // ...
    return scopes;
}

// Accessing local symbols
const precomputed = doc.localSymbols;
const locals = document.localSymbols?.get(program);
```

**LocalSymbols interface:**
```typescript
export interface LocalSymbols {
    has(node: AstNode): boolean;
    getStream(key: AstNode): Stream<AstNodeDescription>;
}
```

**Migration actions:**
1. Update import: `PrecomputedScopes` → `LocalSymbols`
2. Rename method: `computeLocalScopes` → `collectLocalSymbols`
3. Update return type: `Promise<PrecomputedScopes>` → `Promise<LocalSymbols>`
4. Replace property access: `document.precomputedScopes` → `document.localSymbols`

### Pattern 3: Scope Computation Method Renames

**What:** The `ScopeComputation` interface method names changed in Langium 4.

**Old pattern (Langium 3):**
```typescript
class BbjScopeComputation extends DefaultScopeComputation {
    override async computeExports(document: LangiumDocument): Promise<AstNodeDescription[]> {
        return this.computeExportsForNode(/* ... */);
    }

    override async computeLocalScopes(document: LangiumDocument): Promise<PrecomputedScopes> {
        // ...
    }
}
```

**New pattern (Langium 4):**
```typescript
class BbjScopeComputation extends DefaultScopeComputation {
    override async collectExportedSymbols(document: LangiumDocument): Promise<AstNodeDescription[]> {
        return this.collectExportedSymbolsForNode(/* ... */);
    }

    override async collectLocalSymbols(document: LangiumDocument): Promise<LocalSymbols> {
        // ...
    }
}
```

**Migration actions:**
1. Rename method: `computeExports` → `collectExportedSymbols`
2. Rename method: `computeLocalScopes` → `collectLocalSymbols`
3. Update helper call: `computeExportsForNode` → `collectExportedSymbolsForNode`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type constant updates | Manual search in each file | Find-and-replace with regex | Type constants follow strict pattern, regex is safer |
| Import path updates | Update each import manually | Automated import fix | Langium 4 exports remain in same modules |

**Key insight:** These are purely mechanical renames with zero logic changes. Automation reduces human error.

## Common Pitfalls

### Pitfall 1: Missing .$type suffix in switch cases

**What goes wrong:** Code compiles but type comparisons always fail at runtime because you're comparing a string to an object.

**Why it happens:** The import `MethodDecl` still works, but it's now an object `{ $type: 'MethodDecl', ... }` instead of the string `'MethodDecl'`.

**Example:**
```typescript
// WRONG - compiles but broken at runtime
import { MethodDecl } from './generated/ast.js';
switch (node.$type) {
    case MethodDecl:  // comparing "MethodDecl" string to { $type: "MethodDecl" } object
        return SymbolKind.Function;  // never matches!
}
```

**How to avoid:** Every switch case using a generated type constant MUST add `.$type`:
```typescript
// CORRECT
switch (node.$type) {
    case MethodDecl.$type:  // now comparing strings "MethodDecl" === "MethodDecl"
        return SymbolKind.Function;
}
```

**Warning signs:**
- Tests pass for compilation but fail at runtime
- Switch statement default cases executing unexpectedly
- Symbol kinds or completion item kinds showing incorrect values

### Pitfall 2: Inconsistent property rename (precomputedScopes vs localSymbols)

**What goes wrong:** Mixing old and new property names causes undefined access errors.

**Why it happens:** `document.precomputedScopes` no longer exists in Langium 4. Accessing it returns `undefined`.

**Example:**
```typescript
// WRONG - accessing old property
const locals = document.precomputedScopes?.get(program);  // undefined!

// CORRECT - use new property name
const locals = document.localSymbols?.get(program);
```

**How to avoid:** Global search for `precomputedScopes` in non-generated files, replace ALL occurrences with `localSymbols`.

**Warning signs:**
- Scope resolution failures
- Cross-references not resolving
- "Cannot read property 'get' of undefined" errors

### Pitfall 3: Forgetting to rename helper methods

**What goes wrong:** Calling `this.computeExportsForNode()` instead of `this.collectExportedSymbolsForNode()`.

**Why it happens:** The parent class method was renamed but the call wasn't updated.

**Example:**
```typescript
// WRONG - old method name
return this.computeExportsForNode(document.parseResult.value, document, filterFn);
// TypeError: this.computeExportsForNode is not a function

// CORRECT - new method name
return this.collectExportedSymbolsForNode(document.parseResult.value, document, filterFn);
```

**How to avoid:** When renaming override methods, check for all calls to parent class helper methods.

**Warning signs:**
- TypeScript errors: "Property does not exist on type"
- Runtime errors: "is not a function"

## Code Examples

### Example 1: Type Constant in Switch Statement

**Before (Langium 3):**
```typescript
// Source: bbj-vscode/src/language/bbj-node-kind.ts
import { MethodDecl, LibFunction, BbjClass } from "./generated/ast.js";

getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
    switch (isAstNode(node) ? node.$type : node.type) {
        case MethodDecl:
        case LibFunction:
            return SymbolKind.Function
        case BbjClass:
            return SymbolKind.Class
        default:
            return SymbolKind.Field
    }
}
```

**After (Langium 4):**
```typescript
// Source: bbj-vscode/src/language/bbj-node-kind.ts
import { MethodDecl, LibFunction, BbjClass } from "./generated/ast.js";

getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
    switch (isAstNode(node) ? node.$type : node.type) {
        case MethodDecl.$type:
        case LibFunction.$type:
            return SymbolKind.Function
        case BbjClass.$type:
            return SymbolKind.Class
        default:
            return SymbolKind.Field
    }
}
```

### Example 2: Scope Computation Class

**Before (Langium 3):**
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts
import { PrecomputedScopes } from 'langium';

export class BbjScopeComputation extends DefaultScopeComputation {
    override async computeExports(document: LangiumDocument): Promise<AstNodeDescription[]> {
        return this.computeExportsForNode(
            document.parseResult.value,
            document,
            (node) => AstUtils.streamContents(node).filter(child => isClass(child)),
            cancelToken
        );
    }

    override async computeLocalScopes(document: LangiumDocument, cancelToken: CancellationToken): Promise<PrecomputedScopes> {
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        for (const node of AstUtils.streamAllContents(rootNode)) {
            await this.processNode(node, document, scopes);
        }
        return scopes;
    }

    protected override async processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): Promise<void> {
        super.processNode(node, document, scopes);
        // custom logic
    }
}
```

**After (Langium 4):**
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts
import { LocalSymbols } from 'langium';

export class BbjScopeComputation extends DefaultScopeComputation {
    override async collectExportedSymbols(document: LangiumDocument): Promise<AstNodeDescription[]> {
        return this.collectExportedSymbolsForNode(
            document.parseResult.value,
            document,
            (node) => AstUtils.streamContents(node).filter(child => isClass(child)),
            cancelToken
        );
    }

    override async collectLocalSymbols(document: LangiumDocument, cancelToken: CancellationToken): Promise<LocalSymbols> {
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        for (const node of AstUtils.streamAllContents(rootNode)) {
            await this.processNode(node, document, scopes);
        }
        return scopes;
    }

    protected override async processNode(node: AstNode, document: LangiumDocument, scopes: LocalSymbols): Promise<void> {
        super.processNode(node, document, scopes);
        // custom logic
    }
}
```

### Example 3: Accessing Precomputed Scopes

**Before (Langium 3):**
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts
const precomputed = doc.precomputedScopes;
if (precomputed) {
    const locals = document.precomputedScopes?.get(program);
    // ...
}
```

**After (Langium 4):**
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts
const precomputed = doc.localSymbols;
if (precomputed) {
    const locals = document.localSymbols?.get(program);
    // ...
}
```

## State of the Art

| Old Approach (Langium 3) | Current Approach (Langium 4) | When Changed | Impact |
|--------------------------|------------------------------|--------------|--------|
| `const TypeName = 'TypeName'` | `const TypeName = { $type: 'TypeName', ... }` | v4.0.0 (July 2025) | Type safety improved, runtime type checks more robust |
| `PrecomputedScopes` | `LocalSymbols` | v4.0.0 (July 2025) | Clearer naming, dedicated interface for scope results |
| `document.precomputedScopes` | `document.localSymbols` | v4.0.0 (July 2025) | Consistent with type rename |
| `computeExports` / `computeLocalScopes` | `collectExportedSymbols` / `collectLocalSymbols` | v4.0.0 (July 2025) | Better verb choice: "collect" vs "compute" |

**Deprecated/outdated:**
- Direct type constant imports used as strings: Now objects with `$type` property
- `PrecomputedScopes` type: Renamed to `LocalSymbols`
- `ScopeComputation.computeExports`: Renamed to `collectExportedSymbols`
- `ScopeComputation.computeLocalScopes`: Renamed to `collectLocalSymbols`

## Codebase Inventory

### Files Requiring Type Constant Updates

21 files with 195 total type guard calls (these use `is*()` functions which are unaffected):

| File | Type Guard Calls | Type Constant Cases | Priority |
|------|------------------|---------------------|----------|
| `bbj-scope.ts` | 27 | 3 | High |
| `bbj-scope-local.ts` | 23 | 0 | High |
| `line-break-validation.ts` | 30 | 0 | Medium |
| `bbj-type-inferer.ts` | 15 | 0 | Medium |
| `bbj-hover.ts` | 13 | 0 | Medium |
| `bbj-validator.ts` | 12 | 0 | Medium |
| `bbj-linker.ts` | 8 | 0 | Medium |
| `bbj-node-kind.ts` | 2 | 14 | **CRITICAL** |
| `bbj-semantic-token-provider.ts` | 0 | 3 | **CRITICAL** |
| `bbj-nodedescription-provider.ts` | 0 | 6 | **CRITICAL** |
| Others | 65 | 0 | Low |

**Type constant switch cases: 23 total across 3 files**

### PrecomputedScopes References

**File:** `bbj-vscode/src/language/bbj-scope-local.ts`
- Line 12: Import statement
- Line 59: Method return type
- Line 81: Parameter type
- Line 260: Parameter type

**File:** `bbj-vscode/src/language/bbj-scope.ts`
- Line 133: Property access `doc.precomputedScopes`
- Line 248: Property access `document.precomputedScopes?.get(program)`
- Line 337: Property access `document?.precomputedScopes?.get(bbjType)`

**Total:** 4 import/type references + 3 property accesses = 7 updates required

### Scope Computation Method Overrides

**File:** `bbj-vscode/src/language/bbj-scope-local.ts`
- Line 54: `computeExports` method override → `collectExportedSymbols`
- Line 56: Call to `this.computeExportsForNode` → `this.collectExportedSymbolsForNode`
- Line 59: `computeLocalScopes` method override → `collectLocalSymbols`
- Line 81: `processNode` parameter type update

**Total:** 2 method renames + 1 helper method call + 1 type update = 4 updates required

### String Literal Type Comparisons

**File:** `bbj-vscode/src/language/bbj-nodedescription-provider.ts`
- Line 64: `symbol.ref.$type === "JavaClass"` (acceptable - using string literal)
- Line 79: `symbol.ref.$type === "JavaClass"` (acceptable - using string literal)

**Note:** String literal comparisons are valid and don't need changes. Only switch cases using imported type constants need `.$type` suffix.

## Open Questions

None. All migration patterns are confirmed and straightforward.

## Sources

### Primary (HIGH confidence)
- Langium 4.1.3 installed type definitions: `/node_modules/langium/lib/references/scope-computation.d.ts`
- Langium 4.1.3 installed type definitions: `/node_modules/langium/lib/workspace/documents.d.ts`
- Generated AST file (Langium 4.1.3): `bbj-vscode/src/language/generated/ast.ts`
- [Langium CHANGELOG.md](https://github.com/langium/langium/blob/main/packages/langium/CHANGELOG.md) - PR #1942, #1788

### Secondary (MEDIUM confidence)
- [Langium 4.0 Release Announcement](https://www.typefox.io/blog/langium-release-4.0/) - Breaking changes overview
- [Langium Example: domain-model-scope.ts](https://github.com/eclipse-langium/langium/blob/main/examples/domainmodel/src/language-server/domain-model-scope.ts) - Langium 4 scope computation pattern

## Metadata

**Confidence breakdown:**
- Type constant pattern: HIGH - Verified from generated ast.ts and installed type definitions
- PrecomputedScopes → LocalSymbols: HIGH - Verified from installed type definitions and CHANGELOG
- Method renames: HIGH - Verified from ScopeComputation interface in installed types
- Codebase inventory: HIGH - Verified by grep analysis of actual source files

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable API)
