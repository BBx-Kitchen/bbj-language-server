# Phase 27: IDE Polish - Research

**Researched:** 2026-02-06
**Domain:** LSP Symbol Differentiation, VS Code Menu Scoping, Completion Triggers, Diagnostic Message Enhancement
**Confidence:** HIGH

## Summary

Phase 27 addresses four independent IDE quality-of-life improvements across both VS Code and IntelliJ extensions. The research confirms that all four features use well-established LSP and IDE extension patterns with clear implementation paths.

**Symbol kind differentiation** requires updating the `BBjNodeKindProvider` to map BBj AST node types (labels, variables, fields, methods, DEF functions) to appropriate LSP SymbolKind enum values. The LSP 3.17 specification defines 26 SymbolKind values, including Key (20) for labels, Variable (13) for variables, Field (8) for fields, Method (6) for methods, and Function (12) for DEF functions. Both Structure View and completion popups consume the same SymbolKind, ensuring consistency.

**Run icon scoping in VS Code** is a package.json `when` clause issue. The current clause `resourceLangId == bbj || resourceLangId == bbx` should scope icons to BBj file types, but issue #354 reports they appear on all files. The language configuration shows `.bbj`, `.bbl`, `.bbjt`, `.src` are registered to language ID `bbj`, and `.bbx` files use a separate `bbx` language. The fix requires investigating whether the `when` clause is correctly evaluating or if file extension registration needs adjustment. IntelliJ already correctly scopes run actions via `BbjRunActionBase.update()` checking file extensions explicitly.

**Field completion on `#` trigger** follows the same pattern as signature help (which triggers on `(` and `,`). Langium's `AbstractCompletionProvider` doesn't expose trigger character configuration directly, but Langium's LSP integration uses `vscode-languageserver` which sends server capabilities during initialization. The implementation requires returning completion options with `triggerCharacters: ['#']` during server capability registration, then filtering completion items to show only fields when triggered by `#` inside a class method body.

**Error message enhancement** involves modifying the linker and validator to include source filenames in diagnostic messages. The LSP Diagnostic structure includes a `message` field (required, string) where filename information can be embedded. The `BBjLinker` and validation checks (`checkUsedClassExists`, class visibility checks) need to construct messages like `"Cyclic reference: Helper.bbj:42"` or `"Linker error: Cannot resolve symbol 'Foo' in Bar.bbj:15"` using `AstUtils.getDocument(node).uri` to get file paths and `node.$cstNode` to get line numbers.

**Primary recommendation:** Implement the four features as independent tasks with clear boundaries. Symbol kind mapping is a pure enum update, run icon scoping is a package.json/language configuration fix, field completion is a trigger character + filtering implementation, and error messages are string formatting enhancements in existing diagnostic code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Symbol kind mapping
- Labels, variables/fields, methods, and DEF FN functions should each use appropriate distinct SymbolKinds
- Variables and fields can share the same SymbolKind — the `#` prefix on fields is sufficient to distinguish them
- Methods get SymbolKind.Method, DEF FN functions get SymbolKind.Function — visually distinguished
- Differentiated kinds apply to both Structure View AND completion popups (consistent everywhere)

#### Run icon scoping (VS Code only)
- Run icons (GUI/BUI/DWC) should appear on `.bbj`, `.bbl`, `.bbx`, `.src` files only
- `.bbjt` excluded — unit test files need a test panel (deferred)
- `.arc` excluded — not runnable
- IntelliJ run icons are already correctly scoped — no changes needed there
- Current `when` clause in package.json uses `resourceLangId == bbj || resourceLangId == bbx` — needs investigation and fix if icons still appear on non-BBj files
- May need to add `.bbl` and `.src` to the `when` clause or language registration

#### # field completion
- Typing `#` immediately triggers field completion popup (trigger character)
- Shows fields from current class AND inherited fields (protected and public only, no private)
- Static fields included
- `#` stays as typed; completion inserts the field name after it (result: `#fieldName`)
- Only triggers inside class method bodies — not outside classes or in other contexts

#### Error message format
- Cyclic reference and linker error messages include source filename with relative path (from workspace root)
- Include line number where the issue originates: e.g., `Helper.bbj:42`
- Cyclic reference errors appear at the detection point only — not duplicated in both files
- Error message points to the other file involved

### Claude's Discretion
- Exact SymbolKind choice for labels (Key, Event, or other appropriate kind)
- Linker error message detail level (whether to include symbol name, file, or both — based on what info is available in the error path)
- Exact error message wording

### Deferred Ideas (OUT OF SCOPE)
- Unit test panel for `.bbjt` files — needs its own implementation phase (test discovery, run, results display)
</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium | 4.1.3 | Language server framework with built-in LSP support | Already the project's language server; provides `DefaultDocumentSymbolProvider`, `DefaultCompletionProvider`, and diagnostic infrastructure |
| vscode-languageserver | 9.0.1 | LSP protocol types and server capabilities | Already used for LSP communication; defines `SymbolKind`, `CompletionOptions`, `Diagnostic` |
| LSP4IJ | 0.19.0 | IntelliJ LSP client | Already the IntelliJ plugin's LSP integration; consumes SymbolKind and CompletionItem from server |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vscode-languageclient | 9.0.1 | VS Code LSP client | Already used in VS Code extension; no changes needed (client-side only) |
| node:path | Built-in | File path manipulation | Use `relative()` for workspace-relative paths in error messages |

### Alternatives Considered

None. All features use existing libraries and LSP protocol standards.

**Installation:** No new dependencies needed. All libraries are already declared in `package.json` files.

## Architecture Patterns

### Pattern 1: SymbolKind Mapping in NodeKindProvider

**What:** Map AST node types to LSP SymbolKind enum values in both `getSymbolKind()` and `getCompletionItemKind()`.

**When to use:** When differentiating symbol types for Structure View and completion popups.

**Implementation:**
```typescript
// Source: bbj-vscode/src/language/bbj-node-kind.ts (existing pattern)
export class BBjNodeKindProvider implements NodeKindProvider {
    getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LabelDecl.$type:
                return SymbolKind.Key  // Or Event, per Claude's discretion
            case VariableDecl.$type:
            case FieldDecl.$type:
                return SymbolKind.Variable  // Or Field - both work, Variable preferred per user decision
            case MethodDecl.$type:
                return SymbolKind.Method
            case DefFunction.$type:
            case LibFunction.$type:
                return SymbolKind.Function
            // ... other cases
            default:
                return SymbolKind.Field
        }
    }

    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
        // Mirror the SymbolKind mapping for consistency
        // CompletionItemKind enum values differ but map to same visual icons
    }
}
```

**Key insight:** Both methods must return consistent kinds for the same node type to ensure Structure View and completion popups show the same icons.

### Pattern 2: Trigger Character Configuration

**What:** Register trigger characters in server capabilities during LSP initialization.

**When to use:** When a specific character should automatically open completion popups.

**Implementation:**
```typescript
// Source: bbj-vscode/src/language/bbj-signature-help-provider.ts (existing pattern)
// Similar pattern applies to completion
export class BBjCompletionProvider extends DefaultCompletionProvider {
    // Override to add trigger characters
    // Langium's startCompletion() method uses this
    override async getCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList> {
        // Check if triggered by '#'
        const triggerChar = params.context?.triggerCharacter;
        if (triggerChar === '#') {
            // Filter to field-only completion
            return this.getFieldCompletion(document, params);
        }
        // Normal completion
        return super.getCompletion(document, params);
    }
}
```

**Server capability registration:**
```typescript
// Langium automatically registers capabilities based on provider configuration
// The completion provider needs to declare trigger characters
// This is done in the shared services module initialization
```

**Key insight:** Trigger characters are declared server-side during initialization, then the server receives completion requests with `triggerCharacter` context when user types those characters.

### Pattern 3: VS Code Menu When Clauses

**What:** Use `when` clauses in `package.json` to conditionally show menu items based on context.

**When to use:** Scoping commands to specific file types or editor states.

**Current implementation (needs investigation):**
```json
// Source: bbj-vscode/package.json
"menus": {
    "editor/title": [
        {
            "when": "resourceLangId == bbj || resourceLangId == bbx",
            "command": "bbj.run",
            "group": "navigation"
        }
    ]
}
```

**Language configuration:**
```json
"languages": [
    {
        "id": "bbj",
        "extensions": [".bbj", ".bbl", ".bbjt", ".src"]
    },
    {
        "id": "bbx",
        "extensions": ["bbx"]  // Note: missing dot prefix in original
    }
]
```

**Investigation needed:** Why does `resourceLangId == bbj` not correctly scope to only `.bbj/.bbl/.bbjt/.src` files? Possible causes:
1. Language ID resolution may not work correctly for all extensions
2. `.bbl` and `.src` may not be properly registered to `bbj` language
3. VS Code may be matching the `when` clause too broadly

**Key insight:** IntelliJ explicitly checks file extensions in `BbjRunActionBase.update()` rather than relying on language ID matching, which works correctly.

### Pattern 4: Diagnostic Message Enhancement

**What:** Include source filename and line number in diagnostic messages.

**When to use:** When errors involve cross-file references (cyclic dependencies, unresolved imports, visibility violations).

**Implementation:**
```typescript
// Source: bbj-vscode/src/language/bbj-validator.ts (existing pattern)
export class BBjValidator {
    checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
        if (use.javaClass) {
            const className = getFQNFullname(use.javaClass);
            if (use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
                // BEFORE: accept('warning', `Class '${className}' could not be resolved.`, { node: use });
                // AFTER: Include source filename where class should be defined
                const sourceFile = this.getSourceFileForClass(use.javaClass);
                accept('warning', `Class '${className}' could not be resolved in ${sourceFile}`, { node: use });
            }
        }
    }

    private getSourceFileForClass(node: AstNode): string {
        const doc = AstUtils.getDocument(node);
        const wsRoot = this.getWorkspaceRoot();
        const relativePath = relative(wsRoot, doc.uri.fsPath);
        const lineNumber = node.$cstNode ? node.$cstNode.range.start.line + 1 : 0;
        return `${relativePath}:${lineNumber}`;
    }
}
```

**Key insight:** Use `AstUtils.getDocument(node).uri.fsPath` for absolute paths, `relative()` for workspace-relative paths, and `node.$cstNode.range.start.line` for line numbers.

### Anti-Patterns to Avoid

- **Inconsistent SymbolKind mapping:** Using different kinds for the same node type in `getSymbolKind()` vs `getCompletionItemKind()` causes visual inconsistency between Structure View and completion popups.
- **Trigger character without filtering:** Adding `#` as a trigger character but showing all completion items (not just fields) creates a confusing UX.
- **Hardcoded file paths in diagnostics:** Using absolute paths instead of workspace-relative paths makes error messages hard to read and not portable across machines.
- **Duplicating error messages:** Showing the same cyclic reference error in both files involved — should only appear at the detection point.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SymbolKind icon mapping | Custom icon mapping logic | LSP SymbolKind enum + client's built-in rendering | VS Code and IntelliJ/LSP4IJ already map SymbolKind to appropriate icons |
| Completion trigger registration | Custom keystroke listeners | LSP CompletionOptions.triggerCharacters | LSP protocol standard, automatically handled by client |
| File path formatting | String concatenation | `node:path.relative()` + `AstUtils.getDocument()` | Handles path separators, normalization, and workspace-relative paths correctly |
| Context-aware completion filtering | Manual AST traversal at completion time | Existing `AstUtils.getContainerOfType()` pattern | Already used throughout codebase for context detection |

**Key insight:** All four features use existing LSP protocol capabilities and established Langium patterns. No custom infrastructure needed.

## Common Pitfalls

### Pitfall 1: CompletionItemKind vs SymbolKind Enum Mismatch

**What goes wrong:** Using `SymbolKind.Method` (value 6) when `CompletionItemKind.Method` (value 2) is needed, or vice versa.

**Why it happens:** The two enums have different numeric values even though they represent the same concepts.

**How to avoid:** Always use the correct enum type for each method:
- `getSymbolKind()` returns `SymbolKind` (for Structure View)
- `getCompletionItemKind()` returns `CompletionItemKind` (for completion popups)

**Warning signs:** Icons appear correct in one feature but wrong in another.

### Pitfall 2: Trigger Character Shows Unfiltered Completion

**What goes wrong:** User types `#`, completion popup opens, but shows variables, methods, and keywords — not just fields.

**Why it happens:** Trigger character registration doesn't automatically filter results; the completion provider must filter based on trigger context.

**How to avoid:** Check `params.context?.triggerCharacter === '#'` and return only field completions when triggered by `#`.

**Warning signs:** Completion popup opens on `#` but shows irrelevant items.

### Pitfall 3: Run Icons Appear on Non-BBj Files Despite When Clause

**What goes wrong:** The `when: "resourceLangId == bbj"` clause is in package.json, but icons appear on all text files.

**Why it happens:** Language ID resolution may fail for certain extensions, or the `when` clause evaluation has a bug.

**How to avoid:**
1. Verify all extensions (`.bbj`, `.bbl`, `.src`) are registered to language ID `bbj`
2. Check if `.bbx` extension is correctly associated (current config shows `"extensions": ["bbx"]` without dot prefix)
3. Consider adding explicit file pattern matching in `when` clause if language ID matching is unreliable

**Warning signs:** Commands appear in context menu for `.txt`, `.md`, or other non-BBj files.

### Pitfall 4: Absolute Paths in Error Messages

**What goes wrong:** Error message shows `/Users/john/workspace/project/src/Helper.bbj:42` instead of `src/Helper.bbj:42`.

**Why it happens:** Using `doc.uri.fsPath` directly without making it workspace-relative.

**How to avoid:** Use `path.relative(workspaceRoot, doc.uri.fsPath)` to create workspace-relative paths.

**Warning signs:** Error messages contain full filesystem paths that differ across developers' machines.

### Pitfall 5: Field Completion Shows Private Fields from Superclass

**What goes wrong:** Typing `#` shows all fields including private ones from parent classes.

**Why it happens:** Not filtering by visibility when collecting inherited fields.

**How to avoid:** When traversing inheritance hierarchy, only include fields with `visibility !== 'private'` from superclasses. Private fields are only visible within their own class.

**Warning signs:** Completion suggests fields that cause visibility errors when selected.

### Pitfall 6: Field Completion Triggers Outside Class Methods

**What goes wrong:** Typing `#` in top-level code triggers field completion, but there's no class context.

**Why it happens:** Not checking whether cursor is inside a class method body before providing field completion.

**How to avoid:** Use `AstUtils.getContainerOfType(node, isBbjClass)` and verify cursor is inside a method body before returning field completions.

**Warning signs:** Field completion appears in contexts where `#` is not a field reference operator.

## Code Examples

### Symbol Kind Mapping (Enhancement)

```typescript
// Source: bbj-vscode/src/language/bbj-node-kind.ts
import { SymbolKind, CompletionItemKind } from 'vscode-languageserver';
import { LabelDecl, VariableDecl, FieldDecl, MethodDecl, DefFunction } from './generated/ast.js';

export class BBjNodeKindProvider implements NodeKindProvider {
    getSymbolKind(node: AstNode | AstNodeDescription): SymbolKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LabelDecl.$type:
                return SymbolKind.Key  // Labels as Key (20)
            case VariableDecl.$type:
                return SymbolKind.Variable  // Variables as Variable (13)
            case FieldDecl.$type:
                return SymbolKind.Variable  // Fields as Variable (13) - user wants same kind
            case MethodDecl.$type:
                return SymbolKind.Method  // Methods as Method (6)
            case DefFunction.$type:
            case LibFunction.$type:
                return SymbolKind.Function  // DEF FN as Function (12)
            case BbjClass.$type:
                return SymbolKind.Class
            case ArrayDecl.$type:
                return SymbolKind.Array
            case LibEventType.$type:
                return SymbolKind.Event
            case JavaPackage.$type:
                return SymbolKind.Package
            default:
                return SymbolKind.Field  // Fallback
        }
    }

    getCompletionItemKind(node: AstNode | AstNodeDescription): CompletionItemKind {
        switch (isAstNode(node) ? node.$type : node.type) {
            case LabelDecl.$type:
                return CompletionItemKind.Event  // Labels as Event (closest match)
            case VariableDecl.$type:
            case FieldDecl.$type:
                return CompletionItemKind.Variable  // Variables/Fields as Variable
            case MethodDecl.$type:
                return CompletionItemKind.Method
            case DefFunction.$type:
            case LibFunction.$type:
            case JavaMethod.$type:
                return CompletionItemKind.Function
            case JavaClass.$type:
            case BbjClass.$type:
                return CompletionItemKind.Class
            case LibEventType.$type:
                return CompletionItemKind.Event
            case JavaPackage.$type:
                return CompletionItemKind.Folder
            default:
                return CompletionItemKind.Field
        }
    }
}
```

### Field Completion on # Trigger

```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts (enhancement)
import { CompletionContext, CompletionParams } from 'vscode-languageserver';

export class BBjCompletionProvider extends DefaultCompletionProvider {
    constructor(services: LangiumServices) {
        super(services);
    }

    override async getCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList> {
        const triggerChar = params.context?.triggerCharacter;

        // Handle # trigger for field completion
        if (triggerChar === '#') {
            return this.getFieldCompletion(document, params);
        }

        // Normal completion
        return super.getCompletion(document, params);
    }

    protected async getFieldCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList> {
        const offset = document.textDocument.offsetAt(params.position);
        const rootNode = document.parseResult.value;
        const node = findLeafNodeAtOffset(rootNode.$cstNode, offset);

        if (!node) {
            return { items: [], isIncomplete: false };
        }

        // Check if we're inside a class method
        const method = AstUtils.getContainerOfType(node.astNode, isMethodDecl);
        const klass = AstUtils.getContainerOfType(node.astNode, isBbjClass);

        if (!method || !klass) {
            // Not inside a class method — don't provide field completion
            return { items: [], isIncomplete: false };
        }

        // Collect fields from current class and superclasses
        const fields = this.collectFields(klass);

        // Convert to completion items
        const items: CompletionItem[] = fields.map(field => {
            return {
                label: field.name,
                kind: CompletionItemKind.Variable,
                detail: `${field.type?.ref?.name ?? 'Object'} field`,
                insertText: field.name,  // Insert field name without #
                documentation: field.docu
            };
        });

        return { items, isIncomplete: false };
    }

    protected collectFields(klass: BbjClass): FieldDecl[] {
        const fields: FieldDecl[] = [];

        // Add fields from current class (all visibilities)
        fields.push(...klass.members.filter(isFieldDecl));

        // Add inherited fields (protected and public only)
        const superClasses = this.getSuperClasses(klass);
        for (const superClass of superClasses) {
            const inheritedFields = superClass.members
                .filter(isFieldDecl)
                .filter(f => {
                    const visibility = f.visibility?.toUpperCase() ?? 'PUBLIC';
                    return visibility === 'PUBLIC' || visibility === 'PROTECTED';
                });
            fields.push(...inheritedFields);
        }

        return fields;
    }

    protected getSuperClasses(klass: BbjClass): BbjClass[] {
        const result: BbjClass[] = [];
        for (const extendsRef of klass.extends) {
            const superClass = extendsRef.ref;
            if (superClass && isBbjClass(superClass)) {
                result.push(superClass);
                // Recursively get superclass hierarchy
                result.push(...this.getSuperClasses(superClass));
            }
        }
        return result;
    }
}
```

### Server Capability Registration for Trigger Characters

```typescript
// Source: Langium internal (reference pattern)
// In Langium, completion options are registered automatically
// To add trigger characters, override the completion provider's capability registration

// The server initialization sends CompletionOptions during initialize response:
{
    capabilities: {
        completionProvider: {
            triggerCharacters: ['#'],  // Add # as trigger
            resolveProvider: true
        }
    }
}

// Langium's startLanguageServer() automatically builds this from services
// Need to configure in shared services or override capability builder
```

### VS Code When Clause Fix (Investigation Required)

```json
// Source: bbj-vscode/package.json (current - needs investigation)
{
    "languages": [
        {
            "id": "bbj",
            "extensions": [".bbj", ".bbl", ".bbjt", ".src"]
        },
        {
            "id": "bbx",
            "extensions": [".bbx"]  // FIX: should be ".bbx" with dot
        }
    ],
    "menus": {
        "editor/title": [
            {
                "when": "resourceLangId == bbj || resourceLangId == bbx",
                "command": "bbj.run",
                "group": "navigation"
            }
        ]
    }
}

// ALTERNATIVE if resourceLangId doesn't work reliably:
// Use file extension pattern matching
{
    "when": "resourceExtname == .bbj || resourceExtname == .bbl || resourceExtname == .bbx || resourceExtname == .src"
}

// Or combine both approaches
{
    "when": "(resourceLangId == bbj || resourceLangId == bbx) && resourceExtname in ['.bbj', '.bbl', '.bbx', '.src']"
}
```

### Error Message Enhancement

```typescript
// Source: bbj-vscode/src/language/bbj-validator.ts (enhancement)
import { relative } from 'path';
import { AstUtils } from 'langium';

export class BBjValidator {
    checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
        if (!typeResolutionWarningsEnabled) return;

        if (use.javaClass) {
            const className = getFQNFullname(use.javaClass);
            if (use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
                const sourceInfo = this.getSourceLocation(use);
                accept('warning', `Class '${className}' could not be resolved (referenced in ${sourceInfo})`, {
                    node: use
                });
            }
        }
    }

    protected getSourceLocation(node: AstNode): string {
        const doc = AstUtils.getDocument(node);
        const workspaceRoot = this.getWorkspaceRoot(doc);
        const relativePath = relative(workspaceRoot, doc.uri.fsPath);

        if (node.$cstNode) {
            const lineNumber = node.$cstNode.range.start.line + 1;
            return `${relativePath}:${lineNumber}`;
        }

        return relativePath;
    }

    protected getWorkspaceRoot(doc: LangiumDocument): string {
        // Get workspace root from document's workspace
        // This is available via services.shared.workspace
        const workspaceManager = this.services.shared.workspace.WorkspaceManager;
        const folders = workspaceManager.getWorkspaceFolders();
        if (folders.length > 0) {
            return folders[0].uri.fsPath;
        }
        // Fallback: use document directory
        return dirname(doc.uri.fsPath);
    }
}

// Enhanced cyclic reference detection
export class BbjLinker extends DefaultLinker {
    override createLinkingError(refInfo: ReferenceInfo): LinkingError {
        const error = super.createLinkingError(refInfo);

        // If this is a cyclic reference, enhance the message
        if (this.isCyclicReference(refInfo)) {
            const targetFile = this.getTargetFile(refInfo);
            error.message = `Cyclic reference detected: ${targetFile}`;
        }

        return error;
    }

    protected getTargetFile(refInfo: ReferenceInfo): string {
        // Determine which file the reference points to
        const targetNode = refInfo.reference.$refNode;
        if (targetNode) {
            const doc = AstUtils.getDocument(targetNode.root.astNode);
            const wsRoot = this.getWorkspaceRoot(doc);
            const relativePath = relative(wsRoot, doc.uri.fsPath);
            const lineNumber = targetNode.range.start.line + 1;
            return `${relativePath}:${lineNumber}`;
        }
        return 'unknown';
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All symbols as SymbolKind.Field | Differentiated SymbolKind per node type | LSP 3.0+ (2016) | Better Structure View organization and icon clarity |
| Manual completion triggering | LSP CompletionOptions.triggerCharacters | LSP 3.0+ (2016) | Automatic trigger on special characters |
| Generic error messages | Context-aware messages with file/line info | LSP 3.16+ (2020) | DiagnosticRelatedInformation for cross-file errors |
| Hardcoded menu visibility | VS Code when clauses | VS Code 1.0+ (2015) | Dynamic context-aware menu scoping |

**Current best practices:**
- Use all 26 SymbolKind values appropriately (LSP 3.17 as of 2026)
- Include `relatedInformation` in Diagnostics for cross-file errors
- Use `resourceLangId`, `resourceExtname`, and other VS Code context keys for precise scoping
- Register trigger characters server-side, not client-side

## Open Questions

1. **Why does VS Code `resourceLangId == bbj` not correctly scope run icons?**
   - What we know: The `when` clause is in package.json, language configuration maps extensions to `bbj` ID
   - What's unclear: Whether this is a VS Code bug, language registration issue, or `when` clause evaluation problem
   - Recommendation: Test with explicit extension matching (`resourceExtname`) as backup, investigate VS Code language ID resolution

2. **Should labels use SymbolKind.Key or SymbolKind.Event?**
   - What we know: LSP spec defines both Key (20) and Event (24) as valid SymbolKind values
   - What's unclear: Which provides better visual distinction in Structure View
   - Recommendation: Start with Key (semantically closer to labels), can switch to Event if icons are unclear

3. **How to register CompletionOptions.triggerCharacters in Langium?**
   - What we know: Langium uses `vscode-languageserver` for LSP integration, signature help provider shows pattern
   - What's unclear: Whether to override capability builder or configure in shared services
   - Recommendation: Follow signature help provider pattern, check Langium documentation for capability customization

4. **Should static fields be included in `#` completion?**
   - What we know: User decision says "Static fields included"
   - What's unclear: Whether this means instance context can access static fields (yes in BBj) or if `#` is even valid for static field access
   - Recommendation: Include static fields for completeness, users can filter as needed

## Sources

### Primary (HIGH confidence)
- LSP 3.17 Specification - SymbolKind enumeration: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/
- VS Code API - When Clause Contexts: https://code.visualstudio.com/api/references/when-clause-contexts
- VS Code API - Contribution Points: https://code.visualstudio.com/api/references/contribution-points
- Langium official documentation - Configuration via Services: https://langium.org/docs/reference/configuration-services/
- Local codebase verification:
  - `bbj-vscode/src/language/bbj-node-kind.ts` - confirmed existing SymbolKind mapping pattern
  - `bbj-vscode/src/language/bbj-signature-help-provider.ts` - confirmed trigger character pattern
  - `bbj-vscode/src/language/bbj-completion-provider.ts` - confirmed completion provider structure
  - `bbj-vscode/src/language/bbj-validator.ts` - confirmed diagnostic message construction
  - `bbj-vscode/package.json` - confirmed menu `when` clause configuration
  - `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - confirmed IntelliJ file extension checking

### Secondary (MEDIUM confidence)
- LSP SymbolKind complete list: https://docs.rs/lsp-types/0.55.3/lsp_types/enum.SymbolKind.html
- VS Code Language Identifiers: https://code.visualstudio.com/docs/languages/identifiers
- Langium GitHub discussions on completion: https://github.com/eclipse-langium/langium/discussions/1620

### Tertiary (LOW confidence)
- None needed. All findings verified with primary sources or codebase inspection.

## Metadata

**Confidence breakdown:**
- Symbol kind mapping: HIGH - LSP spec documented, pattern exists in codebase
- Run icon scoping: MEDIUM - Configuration looks correct, but reported issue suggests investigation needed
- Field completion trigger: HIGH - Pattern established by signature help provider, LSP spec documented
- Error message enhancement: HIGH - Diagnostic structure documented, path utilities well-known

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, LSP 3.17 and Langium 4.1.3 are current)
