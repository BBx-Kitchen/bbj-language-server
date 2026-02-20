# Phase 29: DEF FN & Inheritance Resolution - Research

**Researched:** 2026-02-07
**Domain:** Langium scoping and validation
**Confidence:** HIGH

## Summary

This phase addresses two distinct problems in the BBj language server:

1. **DEF FN line-break validation error** — single-line `def fnName(params)=expression` inside class methods produces false "needs to end with a line break" errors because the validator treats `def` and `fnName(...)=expr` as two separate statements.

2. **Inheritance chain resolution** — `#field!` and `#method()` references do not resolve through BBj super classes or Java super classes, requiring implementation of inheritance chain traversal in the scope provider.

The codebase already has infrastructure for both areas: `line-break-validation.ts` handles statement-level validation, and `bbj-scope.ts` has partial inheritance support (`createBBjClassMemberScope` walks one level, `createJavaClassMemberScope` does not walk Java inheritance). DEF FN parameter scoping is NOT currently handled — parameters need to be added to local scope computation.

**Primary recommendation:** Fix line-break validator to recognize single-line DEF FN as a single statement; extend `createBBjClassMemberScope` and `createJavaClassMemberScope` to recursively walk inheritance chains with cycle protection; add DEF FN parameter scoping to `BbjScopeComputation.processNode`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### DEF FN scoping rules
- DEF FN parameters are scoped to the FN body only — they do NOT leak into the enclosing method
- Variables assigned inside DEF FN body are local to the FN — they do NOT leak into the enclosing scope
- Enclosing method variables (including DECLARE'd ones) ARE visible inside the DEF FN body (closure-like)
- No DEF FN nesting — DEF FN cannot appear inside another DEF FN
- DEF FN can appear anywhere a statement is valid (not restricted to program/method top level)

#### DEF FN line-break validation
- The specific bug: single-line `def fnName(params)=expression` inside a class method produces false "needs to end with a line break" errors
- The line-break validator treats `def` and `fnName(...)=expr` as two separate statements
- Fix must recognize `DEF FN...` as a single statement inside methods
- The issue only manifests inside method bodies — program-scope DEF FN already works correctly
- Multi-line DEF FN already works correctly — only single-line form is broken

#### Inheritance chain traversal
- Walk the full inheritance chain: current class → parent → grandparent → ... until found or chain ends
- Methods: resolve through both BBj super classes AND Java super classes (via java-interop reflection)
- Fields (`#field!`): resolve through BBj super classes only — Java classes don't have BBj-style FIELD declarations
- Maximum depth: cap at 20 levels to prevent infinite loops (cyclic inheritance detection is Phase 30)
- `#super!.method()` should resolve through Java super class if the BBj class extends a Java class

#### Error behavior for unresolved members
- Unresolved `#field!` (not found in current class or any BBj super): **Error** severity (red)
- Unresolved `#method()` (not found in BBj or Java inheritance chain): **Error** severity (red)
- Error messages should show the chain searched: e.g., "#field! not found in MyClass, BBjWidget, BBjControl"
- When super class itself can't be resolved (e.g., USE file not found): show BOTH the "super class not found" error AND "field/method not found" errors — don't suppress cascading diagnostics

### Claude's Discretion
- Exact approach for fixing the line-break validator for DEF FN in methods
- How to implement inheritance chain walking (recursive vs iterative, caching)
- Integration with existing scope provider for DEF FN parameter scoping
- Performance optimization for deep inheritance chains
- Exact error message wording (as long as it includes the chain searched)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

Current implementation uses:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.x | Language server framework | Codebase already uses Langium 4 |
| AST Utils | Langium | Tree traversal and node lookup | Standard Langium API |
| Scope Provider | Langium | Reference resolution | Core Langium scoping mechanism |

**Installation:**
No new dependencies — all work uses existing Langium 4 APIs.

## Architecture Patterns

### Current Line-Break Validation Structure

**File:** `bbj-vscode/src/language/validations/line-break-validation.ts`

The validator uses a configuration map pattern:
```typescript
const lineBreakMap: LineBreakConfig<any>[] = [
    [isFieldDecl, { before: ['FIELD'], after: true, both: false }],
    [isMethodDecl, { before: ['METHOD'], after: false, both: ['METHODEND'] }],
    ifStatementLineBreaks(),
    elseStatementLineBreaks(),
    [isStandaloneStatement, { before: false, after: false, both: true }],
];
```

**Key insight:** The problem is that single-line `def fnName(params)=expression` inside methods triggers `isStandaloneStatement` which requires line breaks before AND after. The validator doesn't recognize it as a single statement.

**Existing pattern for exceptions:** `isStandaloneStatement` already checks for:
- CompoundStatement container
- LetStatement container
- ForStatement container
- Inside single-line IF

**Fix approach:** Add `isDefFunction` to the exclusion list in `isStandaloneStatement` OR add a dedicated DEF FN line-break config that overrides standalone behavior.

### Current Inheritance Resolution Structure

**File:** `bbj-vscode/src/language/bbj-scope.ts`

The scope provider has partial inheritance support:

```typescript
createBBjClassMemberScope(bbjType: BbjClass, methodsOnly: boolean = false, visited: Set<BbjClass> = new Set()): StreamScope {
    // Cycle protection: stop if we've already visited this class
    if (visited.has(bbjType)) {
        return this.createCaseSensitiveScope([]);
    }
    visited.add(bbjType);

    const document = AstUtils.getDocument(bbjType)
    const typeScope = document?.localSymbols?.getStream(bbjType).toArray()
    let descriptions: AstNodeDescription[] = []
    if (typeScope) {
        descriptions.push(...typeScope.filter((member: AstNodeDescription) => !methodsOnly || member.type === MethodDecl.$type))
    }
    if (bbjType.extends.length == 1) {
        const superType = getClass(bbjType.extends[0]);
        if (isBbjClass(superType)) {
            return this.createCaseSensitiveScope(descriptions, this.createBBjClassMemberScope(superType, methodsOnly, visited))
        } else if (isJavaClass(superType)) {
            // Recursively traverse Java class inheritance chain
            return this.createCaseSensitiveScope(descriptions, this.createJavaClassMemberScope(superType))
        }
    }
    // handle implicit extends java.lang.Object (or unresolvable extends)
    const javaObject = this.javaInterop.getResolvedClass('java.lang.Object');
    if (javaObject) {
        const members = stream(javaObject.fields).concat(javaObject.methods);
        return this.createCaseSensitiveScope(descriptions, this.createScopeForNodes(members))
    }
    return this.createCaseSensitiveScope(descriptions)
}
```

**What works:**
- BBj → BBj inheritance: walks ONE level (`createBBjClassMemberScope` recurses for BBj super)
- Cycle protection with `visited` set
- Falls back to `java.lang.Object` if no super or super is unresolvable

**What's missing:**
- Java → Java inheritance: `createJavaClassMemberScope` does NOT walk Java super classes
- Error messages don't show the chain searched
- No 20-level depth cap (relies only on cycle detection)

**Pattern from Langium documentation:**

The [Langium class member scoping recipe](https://langium.org/docs/recipes/scoping/class-member/) shows the canonical pattern:

```typescript
private scopeClassMembers(classItem: Class): Scope {
    const allMembers = getClassChain(classItem)
        .flatMap(e => e.members);
    return this.createScopeForNodes(allMembers);
}
```

Where `getClassChain` recursively collects all classes in the inheritance hierarchy.

### Current DEF FN Parameter Scoping

**File:** `bbj-vscode/src/language/bbj-scope-local.ts` (BbjScopeComputation)

**Current state:** DEF FN parameters are NOT added to scope. The `processNode` method handles:
- VariableDecl (DECLARE statements)
- ArrayDecl (DIM statements)
- Assignment (implicit variable creation)
- BbjClass (this!, super!, field accessors)
- InputVariable (READ, DREAD, ENTER)
- Java classes

**What's missing:** No branch for `isDefFunction` to add parameters to local scope.

**Grammar structure:**
```typescript
interface DefFunction extends NamedElement {
    parameters: NamedElement[];
    value?: Expression;
    body?: DefFunctionStatement[];
}
```

DefFunction can appear in:
- Program.statements
- MethodDecl.body
- DefFunction.body (but user decision says NO NESTING)

**Pattern for parameter scoping:** Similar to `MethodDecl` parameter handling in `check-variable-scoping.ts`:

```typescript
// For MethodDecl: params are always visible, record at position -1
if (isMethodDecl(node)) {
    for (const param of node.params) {
        if (param.name) {
            declPositions.set(param.name.toLowerCase(), -1);
        }
    }
}
```

DEF FN parameters need similar treatment in scope computation.

### Pattern: Recursive Inheritance Traversal

**Recommended approach:** Iterative with depth tracking (not recursive) to avoid stack overflow on deep/cyclic chains.

```typescript
// Pseudocode for inheritance chain traversal
function walkInheritanceChain(startClass: Class, maxDepth: number = 20): Class[] {
    const chain: Class[] = [];
    const visited = new Set<Class>();
    let current: Class | undefined = startClass;
    let depth = 0;

    while (current && depth < maxDepth) {
        if (visited.has(current)) {
            break; // cycle detected
        }
        visited.add(current);
        chain.push(current);

        current = getSuperClass(current);
        depth++;
    }

    return chain;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST traversal | Custom node walker | `AstUtils.streamAllContents()` | Langium's built-in traversal handles all edge cases |
| Scope creation | Manual Map<string, AstNode> | `StreamScope`, `createScopeForNodes()` | Langium's scope API handles case sensitivity, outer scopes, and predicate filtering |
| Reference linking | Direct property assignment | `DefaultLinker.doLink()` | Langium handles deferred linking, document state, and error reporting |
| Cycle detection in inheritance | Custom visited tracking | Langium's built-in or Set-based tracking | Set-based tracking is standard pattern, already present in codebase |

**Key insight:** The codebase already uses Langium's standard APIs correctly. Don't replace them with custom implementations.

## Common Pitfalls

### Pitfall 1: Modifying Visitor-Based Code Without Testing Prune Logic

**What goes wrong:** The line-break validator uses `AstUtils.streamAst()` which visits every node. If you add a DEF FN config without updating `isStandaloneStatement`, single-line DEF FN will still trigger false errors.

**Why it happens:** The config map is checked in order, and `isStandaloneStatement` is a catch-all at the end that matches most statements. It returns `true` for any statement not inside a CompoundStatement/LetStatement/ForStatement/etc.

**How to avoid:**
1. Either exclude `isDefFunction` from `isStandaloneStatement`
2. OR add a dedicated `[isDefFunction, { before: false, after: false, both: false }]` entry BEFORE the `isStandaloneStatement` entry
3. Test with single-line DEF FN inside a method to verify the fix

**Warning signs:** If tests show line-break errors persist, check the order of configs in `lineBreakMap`.

### Pitfall 2: Not Walking Java Inheritance Chains

**What goes wrong:** Resolving `#method()` stops at the immediate Java class and doesn't find methods inherited from Java super classes.

**Why it happens:** `createJavaClassMemberScope` (line 369) does NOT recurse:
```typescript
createJavaClassMemberScope(javaClass: JavaClass): Scope {
    // Get members from current Java class
    const members = stream(javaClass.fields).concat(javaClass.methods);
    // Note: JavaClass does not include superclass information from java-interop
    // Superclass traversal is not currently supported for Java classes
    return this.createScopeForNodes(members);
}
```

**How to avoid:**
1. Check if `javaClass` has super class information from java-interop (may need to query `JavaInteropService`)
2. If Java super classes are available, recursively walk the chain
3. If not available, document the limitation and add a TODO for Phase 30

**Warning signs:** Tests showing Java method inheritance (e.g., `Object.toString()` on a custom class) fail to resolve.

### Pitfall 3: DEF FN Parameter Scoping Leaking into Enclosing Method

**What goes wrong:** Parameters declared in a DEF FN expression are visible in the enclosing method scope instead of being scoped only to the DEF FN body.

**Why it happens:** Scope computation adds all variables to their `$container` scope. If DEF FN parameters are added to `Program` or `MethodDecl` scope instead of `DefFunction` scope, they leak.

**How to avoid:**
1. Add DEF FN parameters to the `DefFunction` node's scope, NOT its container
2. In `processNode`, check `if (isDefFunction(node))` and add parameters with `this.addToScope(scopes, node, description)`
3. The validator already skips DEF FN bodies in `checkUseBeforeAssignment` (line 214: `if (isDefFunction(child)) { continue; }`)

**Warning signs:**
- Variables with same name as DEF FN parameters show "already declared" errors in enclosing method
- Completion inside method shows DEF FN parameters that shouldn't be visible

### Pitfall 4: Not Including Chain in Error Messages

**What goes wrong:** Unresolved `#field!` or `#method()` shows generic "not found" error without indicating which classes were searched.

**Why it happens:** Scope provider returns `EMPTY_SCOPE` when resolution fails, and linker generates default error message.

**How to avoid:**
1. Collect the inheritance chain during scope resolution
2. If member not found, attach chain info to the linking error (may require custom `LinkingError` or enhanced diagnostics)
3. Alternative: Log the chain during scope resolution for debugging

**Warning signs:** Error messages in tests don't show "searched in MyClass, BBjWidget, BBjControl" format.

## Code Examples

### Example 1: Fix Line-Break Validation for Single-Line DEF FN

**Source:** Inferred from existing `isStandaloneStatement` pattern in `line-break-validation.ts`

```typescript
// BEFORE: isStandaloneStatement returns true for DEF FN
function isStandaloneStatement(node: AstNode): node is Statement {
    const previous = getPreviousNode(node);
    if (isLabelDecl(node) || isLabelDecl(previous)) {
        return false;
    }
    if (isStatement(node) && !isParameterDecl(node) && !isCommentStatement(node)) {
        if (isCompoundStatement(node.$container)
            || isLetStatement(node.$container)
            || isForStatement(node.$container)
            || isArrayDeclarationStatement(node.$container)
            || AstUtils.getContainerOfType(previous, isSwitchStatement)
            || AstUtils.getContainerOfType(previous, isIfStatement)
            || isInsideSingleLineIf(node)) {
            return false;
        }
        return true;
    }
    return false;
}

// AFTER: Exclude DEF FN from standalone statement check
function isStandaloneStatement(node: AstNode): node is Statement {
    const previous = getPreviousNode(node);
    if (isLabelDecl(node) || isLabelDecl(previous)) {
        return false;
    }
    if (isStatement(node) && !isParameterDecl(node) && !isCommentStatement(node)) {
        if (isCompoundStatement(node.$container)
            || isLetStatement(node.$container)
            || isForStatement(node.$container)
            || isArrayDeclarationStatement(node.$container)
            || isDefFunction(node.$container)  // ADD THIS LINE
            || AstUtils.getContainerOfType(previous, isSwitchStatement)
            || AstUtils.getContainerOfType(previous, isIfStatement)
            || isInsideSingleLineIf(node)) {
            return false;
        }
        return true;
    }
    return false;
}
```

**ALTERNATIVE approach:** Add explicit DEF FN config before isStandaloneStatement:

```typescript
const lineBreakMap: LineBreakConfig<any>[] = [
    // ... existing configs ...
    [isDefFunction, {
        before: false,
        after: false,
        both: false  // Single-line DEF FN needs no line breaks
    }],
    [isStandaloneStatement, {
        before: false,
        after: false,
        both: true
    }],
];
```

### Example 2: Add DEF FN Parameters to Local Scope

**Source:** Pattern from existing `processNode` in `bbj-scope-local.ts`

```typescript
// In BbjScopeComputation.processNode():
protected async processNode(node: AstNode, document: LangiumDocument, scopes: LocalSymbols): Promise<void> {
    // ... existing branches ...

    if (isDefFunction(node)) {
        // Add DEF FN parameters to the function's own scope
        for (const param of node.parameters) {
            if (param.name) {
                const description = this.descriptions.createDescription(param, param.name);
                this.addToScope(scopes, node, description);  // Scope to DefFunction, not container
            }
        }
    } else if (isUse(node) && node.javaClass) {
        // ... existing USE handling ...
    }
    // ... rest of processNode ...
}
```

**Key:** Scope parameters to `node` (the DefFunction itself), NOT `node.$container` (the enclosing MethodDecl/Program).

### Example 3: Walk Java Inheritance Chain

**Source:** Pattern inferred from existing `createBBjClassMemberScope` + Langium docs

```typescript
createJavaClassMemberScope(javaClass: JavaClass, depth: number = 0, visited: Set<JavaClass> = new Set()): Scope {
    const MAX_DEPTH = 20;

    // Cycle and depth protection
    if (depth >= MAX_DEPTH || visited.has(javaClass)) {
        return this.createCaseSensitiveScope([]);
    }
    visited.add(javaClass);

    // Get members from current Java class
    const members = stream(javaClass.fields).concat(javaClass.methods);

    // TODO: Check if javaClass has superclass information
    // Java interop currently does NOT provide super class references
    // For now, only resolve one level
    // Phase 30 should add Java reflection to get super class chain

    return this.createScopeForNodes(members);
}
```

**Note:** As of this research, `JavaClass` AST nodes from java-interop do NOT include super class references. The Java backend service (`getRawClass`) would need to return super class FQN for full inheritance traversal. This may be a Phase 30 enhancement.

**Current workaround:** For BBj classes extending Java classes, the code already falls back to `java.lang.Object` members (line 361-365 in bbj-scope.ts).

### Example 4: Iterative Inheritance Chain Collection

**Source:** Pattern from codebase + Langium class member scoping recipe

```typescript
// Helper function to collect full inheritance chain
private getClassChain(klass: BbjClass, maxDepth: number = 20): BbjClass[] {
    const chain: BbjClass[] = [];
    const visited = new Set<BbjClass>();
    let current: BbjClass | undefined = klass;
    let depth = 0;

    while (current && depth < maxDepth) {
        if (visited.has(current)) {
            break; // Cycle detected
        }
        visited.add(current);
        chain.push(current);

        if (current.extends.length > 0) {
            const superType = getClass(current.extends[0]);
            current = isBbjClass(superType) ? superType : undefined;
        } else {
            break;
        }
        depth++;
    }

    return chain;
}

// Usage in createBBjClassMemberScope
createBBjClassMemberScope(bbjType: BbjClass, methodsOnly: boolean = false): StreamScope {
    const chain = this.getClassChain(bbjType);
    const allMembers: AstNodeDescription[] = [];

    for (const klass of chain) {
        const document = AstUtils.getDocument(klass);
        const typeScope = document?.localSymbols?.getStream(klass).toArray();
        if (typeScope) {
            const filtered = typeScope.filter((member: AstNodeDescription) =>
                !methodsOnly || member.type === MethodDecl.$type
            );
            allMembers.push(...filtered);
        }
    }

    // If chain ends with Java class, add Java members + Object fallback
    const lastSuper = chain.length > 0 ? chain[chain.length - 1].extends[0] : undefined;
    if (lastSuper) {
        const superType = getClass(lastSuper);
        if (isJavaClass(superType)) {
            return this.createCaseSensitiveScope(allMembers, this.createJavaClassMemberScope(superType));
        }
    }

    // Fallback to java.lang.Object
    const javaObject = this.javaInterop.getResolvedClass('java.lang.Object');
    if (javaObject) {
        const members = stream(javaObject.fields).concat(javaObject.methods);
        return this.createCaseSensitiveScope(allMembers, this.createScopeForNodes(members));
    }

    return this.createCaseSensitiveScope(allMembers);
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No DEF FN parameter scoping | Need to add in Phase 29 | Parameters currently leak or aren't recognized |
| BBj inheritance: one level | Walks one level recursively | Grandparent members don't resolve |
| Java inheritance: none | Only immediate class | Inherited Java methods don't resolve |
| Line-break: treats DEF as standalone | Need fix in Phase 29 | False errors on single-line DEF FN in methods |

**Deprecated/outdated:**
- None identified — codebase uses Langium 4 patterns correctly

## Open Questions

1. **Java super class information from java-interop**
   - What we know: `JavaClass` AST nodes do NOT currently include super class references
   - What's unclear: Does the Java backend service (`getRawClass`) return super class FQN? Need to check Java interop protocol
   - Recommendation: Test with a known Java class (e.g., `ArrayList`) and check if super class info is available. If not, Phase 30 may need to enhance java-interop to return super class chain

2. **DEF FN nesting detection**
   - What we know: User decision says "no DEF FN nesting" but grammar allows it (DefFunction.body can contain DefFunction)
   - What's unclear: Should the validator actively prevent nesting, or just not support parameter scoping for nested DEF FN?
   - Recommendation: Add validation error if nested DEF FN detected (user decision says "cannot appear inside another DEF FN")

3. **Error message enhancement strategy**
   - What we know: Need to show chain searched in error messages
   - What's unclear: Best approach — custom LinkingError subclass, enhanced diagnostics, or log-based debugging?
   - Recommendation: Start with enhanced error message in `createLinkingError` override, similar to existing source location enhancement in `bbj-linker.ts` (lines 115-123)

## Sources

### Primary (HIGH confidence)
- Codebase files:
  - `bbj-vscode/src/language/validations/line-break-validation.ts` — Current line-break validation implementation
  - `bbj-vscode/src/language/bbj-scope.ts` — Current scope provider with partial inheritance support
  - `bbj-vscode/src/language/bbj-scope-local.ts` — Scope computation (processNode pattern)
  - `bbj-vscode/src/language/bbj.langium` — Grammar defining DefFunction structure
  - `bbj-vscode/src/language/validations/check-variable-scoping.ts` — Variable scoping validation (shows DEF FN exclusion pattern)
  - `bbj-vscode/test/test-data/class-def.bbj` — Test file showing BBj class inheritance with `extends` and `#super!`

### Secondary (MEDIUM confidence)
- [Langium Class Member Scoping Recipe](https://langium.org/docs/recipes/scoping/class-member/) — Canonical pattern for inheritance chain resolution
- [Langium GitHub: langium-lox example](https://github.com/TypeFox/langium-lox) — Real-world example of `getClassChain` implementation
- [Langium Scoping Documentation](https://langium.org/docs/recipes/scoping/) — Overview of scope provider patterns

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Line-break validation fix: HIGH — Bug is clearly visible in code, fix pattern is straightforward
- DEF FN parameter scoping: HIGH — Pattern exists for MethodDecl params, can replicate for DefFunction
- BBj inheritance chain: HIGH — Existing code already has recursion pattern, just needs depth cap and cleanup
- Java inheritance chain: MEDIUM — JavaClass may not have super class info from java-interop, needs investigation
- Error messages with chain: MEDIUM — Enhancement strategy unclear, multiple viable approaches

**Research date:** 2026-02-07
**Valid until:** 30 days (stable Langium 4 APIs, no fast-moving dependencies)
