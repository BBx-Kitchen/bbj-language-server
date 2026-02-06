# Phase 25: Type Resolution & Crash Fixes - Research

**Researched:** 2026-02-06
**Domain:** Langium Language Server Type System & Java Interop
**Confidence:** HIGH

## Summary

This phase fixes type conveyance infrastructure in the BBj language server to ensure CAST(), super class fields, implicit getters, and DECLARE correctly provide type information for downstream completion. It also fixes USE statement crashes on Java inner classes. The codebase is a Langium 4.1.3-based language server with Java interop via JSON-RPC socket.

The standard approach is to extend the existing `BBjTypeInferer.getType()` method to handle CAST function calls, traverse inheritance chains in `BbjScopeProvider.createBBjClassMemberScope()`, add accessor type resolution for implicit getters, integrate DECLARE into `BbjScopeComputation` scope processing, and fix inner class name parsing in `JavaInteropService.extractPackageName()`.

All fixes are localized to existing Langium service classes with well-defined extension points. The architecture already supports these features — they just need correct implementation.

**Primary recommendation:** Extend type inferer for CAST (check if symbol ref resolves to CAST library function), traverse full inheritance chain in member scope creation, resolve getter return types using field type, make DECLARE visible at method scope during processNode, and handle Java inner class dollar-sign notation in package name extraction.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Type resolution fallback behavior:**
- When CAST() references an unresolvable type: show warning diagnostic, treat result as untyped (no completion offered)
- DECLARE type is authoritative — if variable is reassigned to incompatible type, DECLARE wins for type resolution purposes
- Implicit getter with unresolvable return type: no completion offered on the result (only complete when type is confidently resolved)
- DECLARE applies to entire method scope regardless of position in the method body (not position-sensitive)

**Super class field resolution:**
- Traverse the full inheritance chain with no depth limit — walk up to Object, including Java supers
- `#field!` access on inherited fields resolves silently without warning
- Hover/tooltip on inherited fields should say "inherited from ParentClass" as helpful info
- If a class extends an unresolvable type, each `#field!` access gets a warning explaining why resolution is incomplete
- `#` completion inside a class includes inherited fields from super classes (own + inherited)

**Diagnostic messaging:**
- Type resolution failures (CAST to unknown type, unresolvable DECLARE type) use Warning severity (yellow squiggly)
- Squiggly underline appears on the whole statement (CAST() or DECLARE), not just the type name
- Include actionable suggestions where possible (e.g., "Did you mean BBjString?" or "Add USE statement for X")
- Add a workspace setting to disable type resolution warnings entirely (for heavily dynamic codebases)

**USE crash recovery:**
- Warning diagnostic on the specific USE line that couldn't be resolved
- Each USE statement is independent — one failure doesn't block others from processing
- Attempt to resolve Java inner classes using classpath JARs (not just graceful skip)
- Inner class lookup scope: classpath JARs only (not workspace Java sources)

### Claude's Discretion

- Exact implementation of inner class resolution via JAR inspection
- How to integrate DECLARE scope into existing scoping infrastructure
- Performance considerations for full inheritance chain traversal
- Warning message wording and diagnostic codes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.1.3 | DSL language engineering framework | Core architecture; provides AST, linking, scope, validation infrastructure |
| TypeScript | 5.8.3 | Type-safe implementation | Project language; strict mode enabled |
| Chevrotain | 11.0.3 | Parser framework | Used by Langium; handles tokenization and parsing |
| vscode-languageserver | 9.0.1+ | LSP protocol implementation | Server-side LSP communication |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 1.6.1 | Testing framework | All new tests (unit and integration) |
| ESLint | 8.57.1 | Code linting | Pre-commit checks; zero violations required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Langium services extension | Manual AST walking | Langium services already handle caching, lifecycle — don't bypass |
| Custom type cache | Re-compute on demand | Performance regression; existing inferer pattern works |

**Installation:**
```bash
# Dependencies already installed in bbj-vscode/
npm install
```

## Architecture Patterns

### Recommended Project Structure
```
bbj-vscode/src/language/
├── bbj-type-inferer.ts       # TYPE-01, TYPE-03: Extend getType()
├── bbj-scope.ts              # TYPE-02: Extend createBBjClassMemberScope()
├── bbj-scope-local.ts        # TYPE-04: Extend processNode()
├── java-interop.ts           # STAB-01: Fix extractPackageName()
└── validations/
    └── type-resolution.ts    # NEW: Type resolution warnings
```

### Pattern 1: Extending Type Inference (TYPE-01, TYPE-03)
**What:** Add cases to `BBjTypeInferer.getType()` for MethodCall nodes that resolve to specific library functions
**When to use:** Need to infer type from function call result (CAST, implicit getters)
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-type-inferer.ts (lines 17-57)
public getType(expression: Expression): JavaPackage | Class | undefined {
    if (isSymbolRef(expression)) {
        const reference = expression.symbol.ref
        if (isAssignment(reference)) {
            return this.getType((reference as Assignment).value);
        }
        // ... existing cases
    } else if (isMethodCall(expression)) {
        // TYPE-01: Check if method is CAST function
        if (isSymbolRef(expression.method)) {
            const methodRef = expression.method.symbol.ref;
            if (isLibFunction(methodRef) && methodRef.name.toLowerCase() === 'cast') {
                // First arg is type, second is object
                if (expression.args.length >= 1) {
                    const typeArg = expression.args[0].expression;
                    // Resolve type argument to class
                    // Return class or undefined if unresolvable
                }
            }
        }
        // TYPE-03: Check if method is implicit getter (getName$, setName$)
        if (isMemberCall(expression.method)) {
            const member = expression.method.member.ref;
            if (isMethodDecl(member)) {
                // Implicit getter created by BbjScopeComputation line 278-286
                // Return type from accessor's backing field
                return getClass(member.returnType);
            }
        }
        return this.getType(expression.method);
    }
    // ... existing cases
}
```

### Pattern 2: Inheritance Chain Traversal (TYPE-02)
**What:** Recursively walk super class hierarchy until no more extends clauses
**When to use:** Building member scope for class (fields, methods, accessors)
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts (lines 335-358)
createBBjClassMemberScope(bbjType: BbjClass, methodsOnly: boolean = false): StreamScope {
    const document = AstUtils.getDocument(bbjType)
    const typeScope = document?.localSymbols?.getStream(bbjType).toArray()
    let descriptions: AstNodeDescription[] = []
    if (typeScope) {
        descriptions.push(...typeScope.filter((member: AstNodeDescription) =>
            !methodsOnly || member.type === MethodDecl.$type))
    }

    // TYPE-02: Traverse FULL inheritance chain (not just first level)
    if (bbjType.extends.length == 1) {
        const superType = getClass(bbjType.extends[0]);
        if (isBbjClass(superType)) {
            // RECURSIVE: Walk entire chain
            return this.createCaseSensitiveScope(descriptions,
                this.createBBjClassMemberScope(superType, methodsOnly))
        } else if (isJavaClass(superType)) {
            // Java classes need same treatment
            // Need to walk Java superclass chain too
            return this.createCaseSensitiveScope(descriptions,
                this.createJavaClassMemberScope(superType))
        }
    }
    // Fallback: implicit java.lang.Object super
    const javaObject = this.javaInterop.getResolvedClass('java.lang.Object');
    if (javaObject) {
        const members = stream(javaObject.fields).concat(javaObject.methods);
        return this.createCaseSensitiveScope(descriptions, this.createScopeForNodes(members))
    }
    return this.createCaseSensitiveScope(descriptions)
}
```

### Pattern 3: Scope Integration via processNode (TYPE-04)
**What:** Add variable to appropriate scope during document building phase
**When to use:** Statement creates variable visible in containing scope (FOR, LET, DECLARE)
**Example:**
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts (lines 81-208)
protected async processNode(node: AstNode, document: LangiumDocument, scopes: LocalSymbols): Promise<void> {
    // TYPE-04: Handle DECLARE statement
    if (isVariableDecl(node) && node.$containerProperty !== 'params') {
        // DECLARE creates method-scoped variable
        const scopeHolder = this.findMethodScopeHolder(node);
        if (scopeHolder) {
            const description = this.descriptions.createDescription(node, node.name);
            this.addToScope(scopes, scopeHolder, description);
        }
    }
    // ... existing cases
}

private findMethodScopeHolder(node: AstNode): AstNode | undefined {
    // Walk up AST until we hit method or program boundary
    let current = node.$container;
    while (current) {
        if (isMethodDecl(current) || isProgram(current)) {
            return current;
        }
        current = current.$container;
    }
    return undefined;
}
```

### Pattern 4: Java Inner Class Resolution (STAB-01)
**What:** Handle Java inner class names with $ separator (e.g., `org.jsoup.nodes.Element$SomeInner`)
**When to use:** Resolving Java classes from USE statements via JavaInteropService
**Example:**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts (lines 416-426)
function extractPackageName(className: string): string {
    const lastIndexOfDot = className.lastIndexOf('.');
    if (lastIndexOfDot === -1) {
        return ''; // No package name
    }

    // STAB-01: Handle inner classes (Outer$Inner)
    // Inner class package is same as outer class package
    // Find first capital letter to distinguish package from class
    const match = className.match(/\.(?=[A-Z])/);
    if (match && match.index !== undefined) {
        return className.substring(0, match.index); // Extract package name
    }

    return className.substring(0, lastIndexOfDot); // Fallback to last dot
}
```

### Anti-Patterns to Avoid
- **Bypassing Langium services:** Don't manually walk AST when ScopeProvider already provides correct hooks
- **Caching without invalidation:** Type inferer is called frequently; don't add stateful caches without document change invalidation
- **Synchronous Java interop:** JavaInteropService.resolveClassByName() is async; always await
- **Mutating shared state:** Langium services are singletons; avoid mutable instance state

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding parent scope | Loop up $container chain | `AstUtils.getContainerOfType(node, isMethodDecl)` | Langium provides type-safe container search |
| Creating AST descriptions | Manual AstNodeDescription object | `this.descriptions.createDescription(node, name)` | Ensures consistent document URI, path, segments |
| Type reference resolution | Direct .ref access | `getClass(qualifiedClass)` helper | Handles BBjTypeRef, SimpleTypeRef, JavaTypeRef unions |
| Diagnostic creation | Manual accept() calls | ValidationChecks registry pattern | Langium validator lifecycle handles batch diagnostics |
| Scope lookup | Linear array search | StreamScope with predicate | Case-insensitive, outer scope chaining built-in |

**Key insight:** Langium's service architecture already handles AST lifecycle, reference linking, and scope computation. Extend existing services instead of reimplementing infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting to Await Java Interop
**What goes wrong:** JavaInteropService methods are async but TypeInferer.getType() is sync
**Why it happens:** Type inference happens during linking phase which can't be async in Langium
**How to avoid:** Pre-resolve Java classes during BbjScopeComputation.processNode() (which is async). Type inferer only accesses already-resolved classes via getResolvedClass()
**Warning signs:** Type resolution works for implicit imports but fails for USE statements

### Pitfall 2: Infinite Recursion in Inheritance Chain
**What goes wrong:** Cyclic class inheritance causes stack overflow
**Why it happens:** Traversing extends without tracking visited classes
**How to avoid:** Maintain Set of visited classes in createBBjClassMemberScope recursion; bail if class already visited
**Warning signs:** LS crashes on specific class hierarchies; "Maximum call stack size exceeded"

### Pitfall 3: Position-Sensitive DECLARE Scope
**What goes wrong:** DECLARE only visible after declaration point in source
**Why it happens:** BbjScopeComputation.processNode() adds to scope in document order
**How to avoid:** DECLARE creates method-scoped variable visible everywhere in method (user decision). Add to method scope, not statement scope
**Warning signs:** Variable completion works below DECLARE but not above

### Pitfall 4: Missing Type Check Before getClass()
**What goes wrong:** Crash when expression.args[0].expression is not a type reference
**Why it happens:** CAST(obj!, "StringLiteral") is valid BBj but first arg isn't a class
**How to avoid:** Check if typeArg is BBjTypeRef/SimpleTypeRef/JavaTypeRef before calling getClass()
**Warning signs:** LS crashes on CAST with string literal type argument

### Pitfall 5: Implicit Getter Type from Method Not Field
**What goes wrong:** Accessor return type is empty string "" instead of field type
**Why it happens:** BbjScopeComputation creates accessor descriptions with MethodDecl.$type but doesn't set returnType property
**How to avoid:** Store backing field reference in accessor description metadata; resolve field type in type inferer
**Warning signs:** Method completion shows getName$() but chaining fails

## Code Examples

Verified patterns from codebase:

### Checking LibFunction by Name
```typescript
// Source: bbj-vscode/src/language/bbj-type-inferer.ts
if (isSymbolRef(expression.method)) {
    const methodRef = expression.method.symbol.ref;
    if (isLibFunction(methodRef)) {
        // Check function name (case-insensitive per BBj semantics)
        const funcName = methodRef.name.toLowerCase();
        if (funcName === 'cast') {
            // Handle CAST() type conveyance
        }
    }
}
```

### Traversing Class Hierarchy with Java Super
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts (lines 335-358)
if (bbjType.extends.length == 1) {
    const superType = getClass(bbjType.extends[0]);
    if (isBbjClass(superType)) {
        return this.createCaseSensitiveScope(descriptions,
            this.createBBjClassMemberScope(superType, methodsOnly))
    } else if (isJavaClass(superType)) {
        // Java class needs field + method concatenation
        return this.createCaseSensitiveScope(descriptions,
            this.createScopeForNodes(stream(superType.fields).concat(superType.methods)))
    }
}
```

### Adding Diagnostic with Info Object
```typescript
// Source: bbj-vscode/src/language/bbj-validator.ts (lines 65-103)
accept("warning", "Could not resolve type 'UnknownClass'", {
    node: useStatement,
    property: 'javaClass',
    // Optional: include code for disabling via workspace setting
    code: 'type-resolution'
});
```

### Resolving QualifiedClass Union Type
```typescript
// Source: bbj-vscode/src/language/bbj-nodedescription-provider.ts (lines 54-67)
export function getClass(klass: QualifiedClass|undefined): Class|undefined {
    if(!klass) {
        return undefined;
    }
    switch(klass.$type) {
        case 'BBjTypeRef': return klass.klass.ref;
        case 'SimpleTypeRef': return klass.simpleClass.ref;
        case "JavaTypeRef":
            const parts = klass.pathParts;
            const symbol = parts[parts.length - 1].symbol;
            return symbol && symbol.ref && symbol.ref.$type === "JavaClass" ? symbol.ref : undefined;
        default: assertUnreachable(klass);
    }
}
```

### Async processNode with Java Resolution
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts (lines 82-98)
if (isUse(node) && node.javaClass) {
    const javaClassName = getFQNFullname(node.javaClass);
    const javaClass = await this.tryResolveJavaReference(javaClassName, this.javaInterop);
    if (!javaClass) {
        return; // Resolution failed; validator will report diagnostic
    }
    if (javaClass.error) {
        console.warn(`Java '${javaClassName}' class resolution error: ${javaClass.error}`)
        return;
    }
    const program = node.$container;
    const simpleName = javaClassName.substring(javaClassName.lastIndexOf('.') + 1);
    this.addToScope(scopes, program, this.descriptions.createDescription(javaClass, simpleName))
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PrecomputedScopes API | LocalSymbols API | Phase 15 (Langium 4 migration) | Scope computation signatures changed |
| Type flags ($type: string) | Type constants (Class.$type) | Phase 15 (Langium 4 migration) | Type guards use constants, not strings |
| Single-level super scope | (Needs implementation) | Phase 25 (this phase) | Will enable full inheritance chain |
| No DECLARE support | (Needs implementation) | Phase 25 (this phase) | Will enable method-scoped type hints |

**Deprecated/outdated:**
- `PrecomputedScopes` API: Replaced by `LocalSymbols` in Langium 4; use `document.localSymbols` instead
- Direct `$type` string checks: Use type constants (`Class.$type`) instead of `"Class"`
- Langium 3.2 signature APIs: Langium 4.1.3 uses different completion provider signatures

## Open Questions

Things that couldn't be fully resolved:

1. **Java inner class JAR inspection mechanism**
   - What we know: Java backend already uses reflection via `Class.forName()`
   - What's unclear: Does java-interop service handle `$` separator in class names?
   - Recommendation: Check java-interop source; if not, add $ to . replacement before reflection

2. **Performance of full inheritance traversal**
   - What we know: createBBjClassMemberScope called on every member access
   - What's unclear: Will deep hierarchies cause noticeable lag?
   - Recommendation: Add cycle detection; limit depth to 50 classes; measure in tests

3. **Accessor type metadata storage**
   - What we know: Accessors created in BbjScopeComputation (line 278-286)
   - What's unclear: Where to store backing field reference?
   - Recommendation: Add custom property to AstNodeDescription (e.g., `backingField: string`)

## Sources

### Primary (HIGH confidence)
- Codebase: `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/` - Direct source analysis
- `bbj-type-inferer.ts` (lines 1-58) - Current type inference implementation
- `bbj-scope.ts` (lines 58-430) - Scope provider and member scope creation
- `bbj-scope-local.ts` (lines 1-312) - Scope computation and processNode hook
- `java-interop.ts` (lines 1-468) - Java class resolution and package extraction
- `bbj-validator.ts` (lines 1-100) - Validation patterns and diagnostic creation
- `.planning/codebase/ARCHITECTURE.md` - Langium architecture overview
- `.planning/codebase/STACK.md` - Langium 4.1.3, TypeScript 5.8.3

### Secondary (MEDIUM confidence)
- `.planning/phases/25-type-resolution-crash-fixes/25-CONTEXT.md` - User decisions and requirements
- `.planning/REQUIREMENTS.md` - TYPE-01 through TYPE-04, STAB-01 definitions

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified from package.json and source imports
- Architecture: HIGH - Analyzed actual service class implementations and Langium patterns
- Pitfalls: HIGH - Derived from codebase structure and Langium service lifecycle

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable Langium framework)
