# Phase 28: Variable Scoping & Declaration Order - Research

**Researched:** 2026-02-06
**Domain:** Langium scope computation, validation, and type resolution for BBj language semantics
**Confidence:** HIGH

## Summary

This phase implements three related scoping features in the BBj language server: (1) use-before-assignment diagnostics for non-DECLARE variables in program and method scope, (2) DIM/DREAD array linkage so DREAD picks up type/dimension info from prior DIM statements, and (3) whole-scope visibility for DECLARE type propagation regardless of statement position.

The existing codebase already handles much of the infrastructure. `BbjScopeComputation` (in `bbj-scope-local.ts`) already scopes DECLARE (`VariableDecl`) to the method body rather than its containing block (lines 117-125). The `BbjScopeProvider` (in `bbj-scope.ts`) already handles SymbolRef resolution through local symbols + imported classes + global scope. What is missing is: (a) a validation pass that checks whether a variable reference appears before any assignment/DIM/DREAD in source order, (b) linking DREAD input variables to prior DIM declarations for type info, and (c) ensuring DECLARE type info is visible throughout the entire scope.

**Primary recommendation:** Implement this as a new validation file (`validations/check-variable-scoping.ts`) that walks statement lists and tracks declaration positions, plus minor adjustments to the scope computation for DIM/DREAD linkage. Do NOT modify the core scope provider -- use validation-phase checks instead.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Flag use-before-assignment for non-DECLARE variables (LET, DIM, plain assignment) -- hint severity (blue/faint)
- DECLARE does NOT need to come before first use -- it applies to the entire scope regardless of position
- Branching is ignored: any assignment above the current line counts as declared, even inside IF/FOR blocks
- Applies to both program scope and method scope
- DREAD is an assignment operation, not a read -- referencing an undeclared variable in DREAD is valid (it creates the variable)
- DREAD can reference any variable, not just DIM'd arrays
- When a variable is DIM'd with subscripts (e.g., `DIM A$[10]`), DREAD referencing `A$` should link back to that DIM and pick up type/dimension info
- DREAD looks in current scope only, not parent scopes
- DECLARE applies to the entire scope (whole-scope visibility) regardless of where the DECLARE statement appears
- Same behavior in both program scope and method scope
- Plain DECLARE is strict -- the declared type is locked, assignments must be compatible
- DECLARE AUTO allows derived types -- the type can narrow through assignments
- Multiple DECLAREs for the same variable with different types: flag as error (red)
- Use-before-assignment: Hint severity (blue/faint)
- Conflicting DECLARE types: Error severity (red)
- Messages include specifics: variable name and location of the conflicting/missing declaration
- No comment-based suppression -- diagnostics are always shown

### Claude's Discretion
- Exact implementation approach for tracking declaration positions
- How to integrate with existing scope provider infrastructure
- Performance optimization for scope scanning
- Error message exact wording (as long as it includes variable name and location info)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

This phase uses only existing project dependencies. No new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.x | Language server framework | Already in use -- all scope/validation infrastructure |
| vscode-languageserver | 9.x | LSP types (DiagnosticSeverity) | Already in use for diagnostics |
| vitest | latest | Test framework | Already in use for all tests |

### Supporting
No new libraries needed. All functionality can be built with:
- `langium` ValidationAcceptor with `'hint'` and `'error'` severity
- `langium` AstUtils for AST traversal
- `langium/test` for `validationHelper`, `expectError`, `expectIssue`
- Existing AST type guards from `generated/ast.ts`

## Architecture Patterns

### Recommended Project Structure
```
bbj-vscode/src/language/
  validations/
    check-variable-scoping.ts   # NEW: use-before-assignment + conflicting DECLARE checks
  bbj-scope-local.ts            # MODIFY: enhance DIM/DREAD linkage in processNode()
  bbj-validator.ts              # MODIFY: register new validation checks
  bbj-type-inferer.ts           # POTENTIALLY MODIFY: handle DECLARE AUTO type narrowing

bbj-vscode/test/
  variable-scoping.test.ts      # NEW: comprehensive test file
```

### Pattern 1: Statement-Order Validation via AstNode Walking
**What:** Walk the `statements` array of a Program or MethodDecl body in source order, building a map of "first assignment position" for each variable name. Then for each SymbolRef usage, check if it appears before the first assignment.
**When to use:** For the use-before-assignment diagnostic (SCOPE-01).
**Why this approach:** Langium's scope computation runs before validation and intentionally does NOT track source order -- it makes all local symbols visible within their scope holder. Modifying scope computation to be position-sensitive would break fundamental Langium assumptions. Instead, a validation-phase check is the correct Langium pattern.

```typescript
// Pseudocode for the core algorithm
function checkVariableScoping(program: Program, accept: ValidationAcceptor): void {
    const declPositions = new Map<string, { line: number, node: AstNode }>();

    // Phase 1: Walk statements in order, record first assignment position for each variable
    walkStatements(program.statements, (stmt) => {
        if (isLetStatement(stmt)) {
            for (const assignment of stmt.assignments) {
                recordAssignment(declPositions, assignment);
            }
        }
        if (isArrayDeclarationStatement(stmt)) {
            for (const dim of stmt.items) {
                recordDim(declPositions, dim);
            }
        }
        if (isDreadStatement(stmt)) {
            for (const item of stmt.items) {
                recordDreadAssignment(declPositions, item);
            }
        }
        // ... ForStatement init, plain assignment ExpressionStatement, etc.
    });

    // Phase 2: Walk all SymbolRef usages, check if before first assignment
    // Skip: VariableDecl (DECLARE) references -- they have whole-scope visibility
    walkAllUsages(program, (ref, line) => {
        const decl = declPositions.get(ref.name.toLowerCase());
        if (decl && line < decl.line) {
            // Check it's not a DECLARE variable (DECLARE has whole-scope visibility)
            if (!isDeclareVariable(ref)) {
                accept('hint', `'${ref.name}' used before assignment (first assigned at line ${decl.line})`, {
                    node: ref.$container,
                    // ...
                });
            }
        }
    });
}
```

### Pattern 2: DECLARE Conflict Detection
**What:** Collect all DECLARE (VariableDecl) statements in a scope, group by variable name (case-insensitive), and flag when multiple DECLAREs declare different types for the same variable.
**When to use:** For the conflicting-DECLARE diagnostic.

```typescript
function checkConflictingDeclares(scope: AstNode, accept: ValidationAcceptor): void {
    const declares = new Map<string, VariableDecl[]>();
    // Collect all DECLARE statements in scope
    for (const stmt of statementsInScope) {
        if (isVariableDecl(stmt)) {
            const key = stmt.name.toLowerCase();
            if (!declares.has(key)) declares.set(key, []);
            declares.get(key)!.push(stmt);
        }
    }
    // Check for type conflicts
    for (const [name, decls] of declares) {
        if (decls.length > 1) {
            const firstType = getFQNFullname(decls[0].type);
            for (let i = 1; i < decls.length; i++) {
                const thisType = getFQNFullname(decls[i].type);
                if (thisType !== firstType) {
                    accept('error', `Conflicting DECLARE for '${decls[i].name}': type '${thisType}' conflicts with '${firstType}' (declared at line ${lineOf(decls[0])})`, {
                        node: decls[i]
                    });
                }
            }
        }
    }
}
```

### Pattern 3: DIM/DREAD Linkage Enhancement
**What:** In `BbjScopeComputation.processNode()`, when processing a DREAD's InputVariable items, check if the referenced variable was previously DIM'd with subscripts. If so, store that association so the type inferer can pick up the DIM's type/dimension info.
**When to use:** For SCOPE-04 (DREAD recognizes DIM'd arrays).

**Key insight from existing code:** The `processNode` method in `bbj-scope-local.ts` (lines 179-200) already handles `InputVariable` inside `isDreadStatement` -- it creates a FieldDecl-typed description and adds it to the scope. The issue is that this creates a NEW description rather than linking to the existing DIM-created ArrayDecl description. The fix is to check if an ArrayDecl already exists in the scope before creating a new one.

### Pattern 4: Registration via ValidationChecks
**What:** Register the new validation functions in `registerValidationChecks()` in `bbj-validator.ts`.
**When to use:** Standard Langium pattern for all custom validators.

```typescript
// In bbj-validator.ts registerValidationChecks():
const checks: ValidationChecks<BBjAstType> = {
    // ... existing checks ...
    Program: [checkVariableScoping, checkConflictingDeclares],
    MethodDecl: [checkMethodVariableScoping, checkMethodConflictingDeclares],
};
```

### Anti-Patterns to Avoid
- **Modifying scope computation to be position-aware:** Langium's scope computation is intentionally position-agnostic. Making it position-sensitive would break reference resolution (e.g., DECLARE must be visible regardless of position). Use validation-phase checks instead.
- **Filtering scope results in ScopeProvider.getScope():** This would affect completion, hover, and all other features. Scope should remain complete; diagnostics should flag issues separately.
- **Walking the CST instead of AST for position info:** The AST has `$cstNode.range` which gives exact line/column. Use that, not CST traversal.
- **Case-sensitive variable name comparison:** BBj is case-insensitive for variable names. Always compare with `.toLowerCase()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST traversal | Manual recursive walker | `AstUtils.streamAllContents()` / `AstUtils.streamContents()` | Handles all container types correctly |
| Getting line numbers | CST offset parsing | `node.$cstNode?.range.start.line` | Standard Langium pattern, already used everywhere |
| Scope holder lookup | Walking $container manually | `AstUtils.getContainerOfType(node, isMethodDecl)` | Handles all nesting correctly |
| Type name comparison | String parsing of type refs | `getFQNFullname()` from `bbj-nodedescription-provider.ts` | Already handles BBjTypeRef, SimpleTypeRef, JavaTypeRef |
| Case-insensitive names | Custom normalization | `.toLowerCase()` on both sides | Consistent with existing codebase pattern |
| Hint-level test assertions | Custom diagnostic filter | `expectIssue()` from `langium/test` with `severity: DiagnosticSeverity.Hint` | Langium's test framework supports arbitrary severity via `expectIssue` |

## Common Pitfalls

### Pitfall 1: Statement Lists Are Nested in CompoundStatements
**What goes wrong:** A simple walk of `program.statements` misses statements inside compound statements (`;`-separated lines like `a = 1 ; b = 2`).
**Why it happens:** BBj uses `;` for compound statements, which creates a `CompoundStatement` wrapper containing multiple `SingleStatement`s. The AST structure is: `Program -> Statement -> CompoundStatement -> [SingleStatement, SingleStatement, ...]`.
**How to avoid:** The `walkStatements` function MUST recurse into `CompoundStatement.statements`. The existing `collectUseStatements` function in `bbj-scope.ts` (lines 437-448) shows the correct pattern:
```typescript
function collectUseStatements(statements: Statement[]): Use[] {
    for (const statement of statements) {
        if (isCompoundStatement(statement)) {
            uses.push(...collectUseStatements(statement.statements))
        }
    }
}
```
**Warning signs:** Tests with compound statements fail to detect use-before-assignment.

### Pitfall 2: ForStatement Init Assignment Container
**What goes wrong:** The assignment in `FOR i = 1 TO 10` is inside a `ForStatement.init`, not a `LetStatement.assignments`.
**Why it happens:** The grammar defines `ForStatement: 'FOR' init=Assignment 'TO' to=Expression`.
**How to avoid:** Handle `ForStatement` explicitly when collecting assignment positions. The existing `findScopeHolder` method (lines 297-306 in bbj-scope-local.ts) already shows this pattern.
**Warning signs:** FOR loop variables not recognized as declared.

### Pitfall 3: DREAD InputVariable Is an Expression-typed Node
**What goes wrong:** Trying to get the variable name from a DREAD item as if it were a simple NamedElement.
**Why it happens:** `InputItem` can be an `InputVariable`, `Expression`, or `OtherItem`. An `InputVariable` wraps an `Expression` (typically a `SymbolRef`). You need to unwrap: `isDreadStatement(container) -> items[i] -> isSymbolRef(item) -> item.symbol.$refText`.
**How to avoid:** Follow the existing pattern in `bbj-scope-local.ts` lines 179-200 which correctly handles `isInputVariable(node) && isDreadStatement(node.$container)` and then checks `isSymbolRef(node)`.
**Warning signs:** DREAD variables not being treated as assignments.

### Pitfall 4: DECLARE Scoped to Method Body, Not Block
**What goes wrong:** DECLARE inside an IF block is only visible within that IF block.
**Why it happens:** Default Langium scoping scopes symbols to their container.
**How to avoid:** This is ALREADY FIXED in `bbj-scope-local.ts` lines 117-125:
```typescript
} else if (isVariableDecl(node) && node.$containerProperty !== 'params') {
    const methodScope = AstUtils.getContainerOfType(node, isMethodDecl);
    const scopeHolder = methodScope ?? node.$container;
    // ...
}
```
This hoists DECLARE to the method scope (or program scope if not in a method). Do NOT change this behavior.
**Warning signs:** None -- this already works. Just be aware it exists.

### Pitfall 5: LetStatement Is Optional
**What goes wrong:** Missing plain assignment statements that don't use the `LET` keyword.
**Why it happens:** In BBj, `LET` is optional: `x = 5` is the same as `LET x = 5`. The grammar is `LetStatement: 'LET'? assignments+=Assignment`. Both produce a `LetStatement` node.
**How to avoid:** Always handle `LetStatement` -- the grammar ensures both forms produce the same AST node type. Check `isLetStatement(stmt)`.
**Warning signs:** None if you handle LetStatement, since the parser normalizes both forms.

### Pitfall 6: Existing Linking Errors Are Warnings
**What goes wrong:** Adding hint-severity use-before-assignment diagnostics for variables that also have linking errors (unresolved references).
**Why it happens:** `BBjDocumentValidator` (line 14) downgrades linking errors to warnings. A variable used before assignment AND before it exists in scope would get both a linking warning and a use-before-assignment hint.
**How to avoid:** Only check use-before-assignment for variables that DO resolve (i.e., the SymbolRef.symbol.ref is defined). If a variable cannot be resolved at all, the linking warning is sufficient. This also avoids double-reporting.
**Warning signs:** Duplicate diagnostics on the same symbol reference.

### Pitfall 7: Performance on Large Files
**What goes wrong:** O(n^2) scanning if you re-walk the statement list for every symbol reference.
**Why it happens:** Walking statements to build a declaration map, then walking all contents for usages.
**How to avoid:** Use a two-pass approach: (1) single walk to build the declaration position map, (2) single walk of all contents to check usages. Both passes are O(n). The map lookup is O(1).
**Warning signs:** Sluggish validation on large BBj files (1000+ lines).

## Code Examples

### Example 1: Getting Line Number from AST Node
```typescript
// Source: existing pattern in bbj-validator.ts (lines 158-161)
const lineNumber = member.$cstNode?.range.start.line;
const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';  // +1 for 1-based display
```

### Example 2: Registering Validation Checks
```typescript
// Source: bbj-validator.ts lines 28-49
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        // Per-node-type checks:
        Program: checkProgramVariableScoping,  // NEW
        MethodDecl: checkMethodVariableScoping, // NEW
        // ...existing checks...
    };
    registry.register(checks, validator);
}
```

### Example 3: Accepting Hint-Severity Diagnostic
```typescript
// Langium ValidationSeverity type includes 'hint' (see langium/src/validation/validation-registry.ts:61)
accept('hint', `'${varName}' used before assignment (first assigned at line ${declLine + 1})`, {
    node: symbolRef,
    // property: 'symbol'  // optional: narrow the diagnostic range to the symbol name
});
```

### Example 4: Accepting Error-Severity Diagnostic
```typescript
accept('error', `Conflicting DECLARE for '${declNode.name}': type '${thisType}' conflicts with '${firstType}' (declared at line ${firstDeclLine + 1})`, {
    node: declNode,
    property: 'name'
});
```

### Example 5: Walking Statements Recursively (Including Compound)
```typescript
// Adapted from bbj-scope.ts collectUseStatements pattern
import { isCompoundStatement, isLetStatement, isArrayDeclarationStatement, isDreadStatement, isForStatement, Statement } from './generated/ast.js';

function walkStatements(statements: Statement[], callback: (stmt: Statement) => void): void {
    for (const statement of statements) {
        callback(statement);
        if (isCompoundStatement(statement)) {
            walkStatements(statement.statements, callback);
        }
    }
}
```

### Example 6: Checking if SymbolRef Resolves to a VariableDecl (DECLARE)
```typescript
import { isVariableDecl, isSymbolRef, SymbolRef } from './generated/ast.js';

function isReferenceToDeclare(ref: SymbolRef): boolean {
    return ref.symbol.ref !== undefined && isVariableDecl(ref.symbol.ref);
}
```

### Example 7: Testing Hint-Level Diagnostics
```typescript
// Langium's test framework does not have expectHint(), but expectIssue() works
import { expectIssue } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';

// Custom helper:
function expectHint(validationResult, message, filterOptions) {
    expectIssue(validationResult, {
        ...filterOptions,
        message,
        severity: DiagnosticSeverity.Hint,
    });
}
```

### Example 8: Existing DREAD/InputVariable Handling in Scope Computation
```typescript
// Source: bbj-scope-local.ts lines 179-200
// This shows how DREAD items are already processed -- creates new FieldDecl descriptions
} else if (isInputVariable(node) && (isReadStatement(node.$container) || isDreadStatement(node.$container) || isEnterStatement(node.$container))) {
    if (isSymbolRef(node)) {
        const scopeHolder = node.$container.$container
        const inputName = node.symbol.$refText
        if (scopes.getStream(scopeHolder).toArray().findIndex((descr) => descr.name === inputName) === -1) {
            this.addToScope(scopes, scopeHolder, {
                name: inputName,
                nameSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                selectionSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                type: FieldDecl.$type,
                documentUri: document.uri,
                path: this.astNodeLocator.getAstNodePath(node)
            })
        }
    }
}
```

**Key insight for DIM/DREAD linkage:** The current code creates a FieldDecl-typed description for DREAD items. For DIM/DREAD linkage (SCOPE-04), when a DREAD references a variable that was already DIM'd as an ArrayDecl, the DREAD should NOT create a new FieldDecl description -- it should reuse or link to the existing ArrayDecl description. This way, the type inferer (`BBjTypeInferer.getType()`) will follow the reference to the ArrayDecl and pick up its type/dimension info.

The existing check `scopes.getStream(scopeHolder).toArray().findIndex((descr) => descr.name === inputName) === -1` already skips creating a new description if one exists. So if a DIM has already been processed and added to scope, DREAD will not overwrite it. The issue is likely that DIM adds to a different scope holder than DREAD expects, or that the `isInputVariable` check creates a description that shadows the DIM's ArrayDecl description.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No use-before-assignment checking | Validation-phase position tracking | This phase | New feature |
| DREAD creates new FieldDecl description | DREAD links to existing ArrayDecl if present | This phase | Better type resolution |
| DECLARE visible only after its position | DECLARE already scoped to method body | Already implemented | No change needed for scoping |

**Already implemented (no changes needed):**
- DECLARE scoping to method body (bbj-scope-local.ts lines 117-125)
- DREAD/ENTER/READ input variable scope creation (bbj-scope-local.ts lines 179-200)
- Assignment scope creation (bbj-scope-local.ts lines 130-145)
- CompoundStatement handling -- addToScope uses parent scope (bbj-scope-local.ts lines 292-295)

**Needs implementation:**
- Use-before-assignment validation (new validation pass)
- Conflicting DECLARE detection (new validation pass)
- DIM/DREAD ArrayDecl linkage fix (minor change to processNode)

## Key Implementation Details

### Determining Statement Order
Use `$cstNode.range.start.line` for position comparison. This gives the 0-based line number in the source document. All comparisons should use this, NOT AST order (which may not match source order for hoisted constructs).

### Scope Boundaries for Variable Checking
- **Program scope:** Walk `program.statements` array. Variables in program scope are visible within the program.
- **Method scope:** Walk `methodDecl.body` array. DECLARE is already hoisted to method scope. For non-DECLARE variables, check within the method body only.
- **Class scope is out of bounds:** Class field declarations (`FIELD`) are handled by the class member scope provider, not by this validation.
- **DEF function scope:** Walk `defFunction.body` array. DEF function parameters are always in scope.

### DECLARE AUTO vs Plain DECLARE
- **Plain DECLARE (`declare Type var`):** The declared type is locked. The type inferer should use the DECLARE's type, ignoring assignments.
- **DECLARE AUTO (`declare auto Type var`):** The type can narrow. The type inferer should consider both the DECLARE type and any assignment types, preferring the more specific type.
- Both variants are parsed as `VariableDecl` nodes. The `auto` keyword presence can be checked via the grammar -- the VariableDecl grammar rule is: `'declare' 'auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName`.

To check for `auto`, look at the CST node for the `'auto'` keyword in the VariableDecl's children, or add a grammar property. The current grammar does NOT store `auto` as a named property -- it is just an optional keyword. This means we need to check the CST:
```typescript
function isDeclareAuto(decl: VariableDecl): boolean {
    if (!decl.$cstNode) return false;
    // Check if the 'auto' keyword is present in the CST
    for (const child of (decl.$cstNode as any).content ?? []) {
        if (child.text?.toLowerCase() === 'auto') return true;
    }
    return false;
}
```

**Alternatively**, the grammar could be modified to capture `auto` as a boolean property, similar to how `static` and `array` are captured. This would be cleaner and more reliable. Recommended approach.

### Important: VariableDecl Grammar Modification for `auto`
The current grammar:
```
VariableDecl returns VariableDecl:
    'declare' 'auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName;
```

Recommended change:
```
VariableDecl returns VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName;
```

This would add an `auto: boolean` property to the VariableDecl AST interface, making it trivially checkable. The generated AST would need regeneration (`npx langium-cli generate`).

## Open Questions

1. **DECLARE AUTO type narrowing scope**
   - What we know: DECLARE AUTO allows derived types -- the type can narrow through assignments.
   - What's unclear: Is the narrowed type visible globally in the scope, or only after the narrowing assignment? The CONTEXT.md says DECLARE has whole-scope visibility, but it's unclear if the _narrowed_ type also has whole-scope visibility.
   - Recommendation: For this phase, treat DECLARE AUTO type as the declared type (like plain DECLARE) and defer the type narrowing logic to a future phase if needed. The primary concern here is that DECLARE AUTO doesn't flag type mismatches on assignments.

2. **DREAD with array subscript (`DREAD COLOR$[ALL]`)**
   - What we know: DREAD can reference array elements with `[ALL]` subscript.
   - What's unclear: Should `DREAD COLOR$[ALL]` link back to `DIM COLOR$[1:COUNT]`? The current InputVariable handling creates descriptions for SymbolRef items, but `COLOR$[ALL]` is an ArrayElement, not a plain SymbolRef.
   - Recommendation: Handle this case -- check for ArrayElement within DREAD items and extract the base variable name from the receiver.

3. **Interaction with existing linking warnings**
   - What we know: BBjDocumentValidator downgrades linking errors to warnings. A variable used before any declaration in scope gets a linking warning.
   - What's unclear: When a variable IS declared (just later in the file), it resolves fine in scope (because scope is not position-sensitive). So the use-before-assignment diagnostic fires on variables that DO resolve but appear before their first assignment.
   - Recommendation: Only fire use-before-assignment for resolved references (where `ref.symbol.ref` is defined). Unresolved references already get linking warnings.

## Sources

### Primary (HIGH confidence)
- Langium source: `node_modules/langium/src/references/scope-provider.ts` -- DefaultScopeProvider.getScope() walks container hierarchy
- Langium source: `node_modules/langium/src/references/scope-computation.ts` -- DefaultScopeComputation pattern
- Langium source: `node_modules/langium/src/validation/validation-registry.ts` -- ValidationSeverity includes 'hint'
- Langium source: `node_modules/langium/src/test/langium-test.ts` -- expectIssue, expectError, expectWarning (no expectHint)
- Project source: `bbj-vscode/src/language/bbj-scope-local.ts` -- BbjScopeComputation with VariableDecl hoisting
- Project source: `bbj-vscode/src/language/bbj-scope.ts` -- BbjScopeProvider.getScope()
- Project source: `bbj-vscode/src/language/bbj-validator.ts` -- validation registration pattern
- Project source: `bbj-vscode/src/language/bbj.langium` -- grammar for VariableDecl, DIM, DREAD, LET, ForStatement
- Project source: `bbj-vscode/src/language/generated/ast.ts` -- AST interfaces
- Project source: `bbj-vscode/test/validation.test.ts` -- test patterns
- Project source: `bbj-vscode/test/linking.test.ts` -- linking test patterns

### Secondary (MEDIUM confidence)
- GitHub Issue #4: Program variable scope -- confirms the requirement for declaration-order checking
- GitHub Issue #247: DREAD verb and DATA -- shows DREAD syntax examples including `DREAD COLOR$[ALL]`
- GitHub Issue #265: DECLARE anywhere in scope -- confirms whole-scope visibility requirement

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all existing Langium patterns
- Architecture: HIGH - Follows established validation pattern used throughout codebase
- Pitfalls: HIGH - All identified from direct code inspection
- DIM/DREAD linkage details: MEDIUM - Need to verify ArrayElement handling in DREAD items during implementation
- DECLARE AUTO narrowing: MEDIUM - Deferred complexity, but basic detection is straightforward

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (stable domain -- no external dependency changes expected)
