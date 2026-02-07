# Phase 32: Regression Fixes - Research

**Researched:** 2026-02-07
**Domain:** Langium linker/scope system, reference resolution, go-to-definition
**Confidence:** HIGH

## Summary

Phase 32 restores two regression bugs introduced in v3.1: BBjAPI() resolution and USE statement Ctrl-click navigation. Research reveals that both issues stem from how references resolve in Langium's linker/scope architecture.

**BBjAPI() regression:** The linker already has case-insensitive special handling (lines 106-110 of bbj-linker.ts), but it requires BBjAPI to exist in the scope as a JavaClass. The issue is that BBjAPI() must resolve even when the Java interop service is unavailable or BBjAPI isn't indexed. Solution: Create a synthetic built-in BBjAPI class document that's always loaded, independent of Java interop.

**USE navigation regression:** Langium's default `DefinitionProvider` uses `this.references.findDeclarationNodes()` which depends on the linker resolving the reference. For `USE ::filename.bbj::ClassName`, the reference is to the `BbjClass`, not the file path. The linker already resolves this (bbj-scope.ts lines 166-171), but navigation needs enhancement to jump to the specific class declaration line, not just the file.

**Primary recommendation:** Implement BBjAPI as a built-in synthetic class using Langium's built-in library pattern (loadAdditionalDocuments), and enhance USE statement navigation by creating a custom DefinitionProvider that handles BbjClass references specially.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**BBjAPI() resolution:**
- Treat BBjAPI() as a special built-in call — hardcode recognition so it always resolves to BBjAPI type
- Does NOT depend on Java interop service availability — always resolves regardless of service status
- Show all methods from BBjAPI class in completions (no filtering or prioritization)
- Only BBjAPI() itself needs special built-in treatment — chained calls like .getConfig() resolve through normal return-type inference

**USE navigation:**
- Ctrl-click on class name in USE statement should navigate to the .bbj file AND jump to the specific class declaration line
- Only supports BBj classes in the `USE ::filename.bbj::ClassName` format — not Java classes
- Only the full form with both filename and classname — short form `USE ::ClassName` not in scope
- If the .bbj file can't be found via PREFIX paths, show an info message (e.g., "File not found in PREFIX paths")

**Regression verification:**
- Broad automated test coverage — add/fix tests for both regressions AND related linker/navigation paths
- Manual sign-off required before moving to Phase 33 — phase stays open until user confirms both regressions are fixed in IDE
- Manual testing in BOTH VS Code and IntelliJ
- Provide a manual test checklist with specific scenarios to verify in each IDE

### Claude's Discretion

- Technical approach to implementing BBjAPI() as built-in (grammar rule, scope provider, linker override, etc.)
- How to structure the manual test checklist
- Which related linker/navigation paths need broader test coverage

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

## Standard Stack

### Core Langium Architecture

| Component | Purpose | Current Implementation |
|-----------|---------|----------------------|
| **BbjLinker** | Resolves cross-references | Extends `DefaultLinker`, already has BBjAPI case-insensitive handling (lines 106-110) |
| **BbjScopeProvider** | Provides scope for name resolution | Extends `DefaultScopeProvider`, handles USE statements (lines 166-171) |
| **BBjWorkspaceManager** | Loads workspace and library documents | Extends `DefaultWorkspaceManager`, loads built-in functions/variables via `loadAdditionalDocuments` (line 163-172) |
| **DefaultDefinitionProvider** | Go-to-definition handler | Uses `this.references.findDeclarationNodes()` from linker resolution |
| **BBjTypeInferer** | Type inference for expressions | Custom service, queries linker-resolved references |

### Built-in Library Pattern (Langium)

Langium's standard pattern for always-available built-in elements:

```typescript
// BBjWorkspaceManager already uses this pattern
protected override async loadAdditionalDocuments(
    _folders: WorkspaceFolder[],
    collector: (document: LangiumDocument<AstNode>) => void
): Promise<void> {
    collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
    collector(this.documentFactory.fromString(builtinVariables, URI.parse('bbjlib:///variables.bbl')));
    // Add BBjAPI here
}
```

**Why this works for BBjAPI:**
- Synthetic documents are indexed automatically during workspace initialization
- Available to scope providers and linkers without Java interop
- References resolve normally through Langium's standard linking pipeline
- No special-case handling needed in multiple places — single source of truth

**Source:** [Langium Built-in Libraries](https://langium.org/docs/recipes/builtin-library/)

### Alternative NOT Recommended: Parser/Grammar Changes

**Why NOT use grammar rules for BBjAPI():**
- Would require recognizing `BBjAPI()` at parse time
- Creates tight coupling between parser and type system
- Breaks when users have case variations (BBjAPI vs bbjapi vs BBJAPI)
- Grammar changes require regeneration and increased complexity

**Decision: Use synthetic document approach** — cleaner separation of concerns, leverages existing Langium patterns.

## Architecture Patterns

### Pattern 1: Built-in Synthetic Class Document

**What:** Create a minimal BBj class definition for BBjAPI and load it as a synthetic document

**When to use:** For built-in types that must always resolve, independent of external services

**Example:**
```typescript
// In bbj-ws-manager.ts or new file lib/bbj-api.ts
export const builtinBBjAPI = `
class BBjAPI
    REM Built-in BBj API factory class
    REM Methods are resolved via Java interop when available
classend
`.trimLeft();

// In BBjWorkspaceManager.loadAdditionalDocuments
collector(this.documentFactory.fromString(
    builtinBBjAPI,
    URI.parse('bbjlib:///bbj-api.bbl')
));
```

**Tradeoff:** The synthetic BBjAPI class won't have method signatures unless Java interop loads them. This is acceptable because:
1. BBjAPI completion/hover needs Java interop anyway (for method details)
2. We only need the type to exist for `api! = BBjAPI()` to not show linker error
3. Once assigned, `api!.getConfig()` resolves through normal type inference which queries Java interop

### Pattern 2: Custom DefinitionProvider for Enhanced Navigation

**What:** Override `DefaultDefinitionProvider` to handle BbjClass references specially

**When to use:** When go-to-definition needs to jump to a specific line within a file, not just the file

**Example structure:**
```typescript
export class BBjDefinitionProvider extends DefaultDefinitionProvider {

    override getDefinition(document: LangiumDocument, params: DefinitionParams): LocationLink[] | undefined {
        const links = super.getDefinition(document, params);

        // Check if this is a USE statement with BbjClass reference
        const refNode = findReferenceNodeAtOffset(...);
        if (isUseStatement(refNode.container) && isBbjClassReference(refNode)) {
            // Enhance link to point to class declaration line, not file start
            return this.enhanceUseLinkToClassDecl(links);
        }

        return links;
    }

    private enhanceUseLinkToClassDecl(links: LocationLink[]): LocationLink[] {
        // Find the actual class declaration in target document
        // Update LocationLink.targetRange to class name CstNode
    }
}
```

**Registration in bbj-module.ts:**
```typescript
lsp: {
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    // ... other LSP services
}
```

### Pattern 3: Linker Error → Info Message

**What:** When USE statement references unresolvable file path, show user-friendly info message

**Where:** Custom DefinitionProvider can check if reference is unresolved and return custom notification

**Example:**
```typescript
if (!links || links.length === 0) {
    // Check if this is a USE statement with unresolvable path
    if (isUseStatement(context)) {
        // Return undefined (no navigation), let validator show warning
        // OR: Show information message via connection.window.showInformationMessage
    }
}
```

**Note:** Validation should show diagnostic; navigation shows info only if user explicitly Ctrl-clicks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Built-in type registration | Custom linker logic for BBjAPI lookup | Langium's built-in library pattern (loadAdditionalDocuments) | Already used for builtinFunctions, builtinVariables — consistent pattern, automatic indexing |
| AST node location finding | Manual CST traversal | `AstUtils.findNodeForProperty`, `GrammarUtils.findNodeForProperty` | Langium provides CST utilities that handle edge cases |
| Reference resolution | Custom lookup in linker | Existing scope/linker pipeline | Linker already resolves USE statement references (bbj-scope.ts:166-171) |

**Key insight:** Langium's architecture separates concerns (parsing, linking, scoping, LSP). Don't bypass the pipeline — extend it at the right layer.

## Common Pitfalls

### Pitfall 1: Hardcoding BBjAPI in Multiple Places

**What goes wrong:** Adding special case handling in linker, scope provider, type inferer, completion provider

**Why it happens:** Feels simpler to check `if (name === 'BBjAPI')` everywhere than to understand built-in library pattern

**How to avoid:**
- Create ONE synthetic document for BBjAPI in loadAdditionalDocuments
- Let normal linking/scoping pipeline handle it
- Only the linker already has special case (lines 106-110) for case-insensitivity — that's sufficient

**Warning signs:**
- Adding `if (name.toLowerCase() === 'bbjapi')` in multiple files
- Creating synthetic AST nodes outside workspace manager
- Scope provider returning hardcoded descriptions

### Pitfall 2: Assuming DefinitionProvider Gets File Path

**What goes wrong:** Trying to resolve `::filename.bbj::` portion in DefinitionProvider

**Why it happens:** The USE statement *looks* like it has a file path, but Langium references point to AST nodes, not strings

**How to avoid:**
- Understand that `bbjClass=[BbjClass:ValidName]` means the reference resolves to a BbjClass AST node
- The scope provider (bbj-scope.ts:166-171) already handles file path resolution via PREFIX paths
- DefinitionProvider works with the resolved BbjClass node, not the raw file path string

**Verification:**
```typescript
// Grammar defines:
Use: 'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName])

// This means:
// - bbjFilePath is a string property (BBjFilePath terminal)
// - bbjClass is a reference to a BbjClass node
// - Scope provider resolves the reference by finding .bbj files via PREFIX paths
// - DefinitionProvider receives the resolved BbjClass node
```

### Pitfall 3: Java Interop Dependency

**What goes wrong:** BBjAPI resolution breaks when Java service is unavailable (port 5008 not open)

**Why it happens:** The linker's special case (lines 106-110) looks up BBjAPI in scope, which queries indexManager for JavaClass

**Root cause:** BBjAPI is loaded by Java interop, not as a built-in

**How to avoid:**
- Load BBjAPI as synthetic built-in class (ALWAYS available)
- Java interop can augment it with methods when available
- But the base class exists regardless of service status

**Test verification:**
```typescript
// Test: BBjAPI resolves WITHOUT Java interop running
test('BBjAPI resolves when interop service unavailable', async () => {
    // Assumes java-interop service is NOT started (port 5008 not listening)
    const document = await validate(`
        api! = BBjAPI()
        api!.getConfig()  REM May warn about unresolved method, but BBjAPI itself resolves
    `)
    expectNoLinkingError(document, 'BBjAPI')
})
```

### Pitfall 4: Navigation to File vs Declaration

**What goes wrong:** Ctrl-click navigates to start of .bbj file, not the class declaration line

**Why it happens:** Default behavior when reference resolves to document without specific CST node

**How to avoid:**
- Custom DefinitionProvider must find the BbjClass declaration's name CST node
- Use `GrammarUtils.findNodeForProperty(node.$cstNode, 'name')` to get exact location
- Return LocationLink with targetSelectionRange = class name range

**Warning signs:**
- Navigation jumps to line 1 of file
- Can't distinguish between multiple classes in same file

## Code Examples

### Example 1: Adding BBjAPI Built-in Class

```typescript
// In bbj-vscode/src/language/lib/bbj-api.ts (new file)
export const builtinBBjAPI = `
class BBjAPI
    REM Built-in BBj API factory class
    REM Provides access to BBj runtime services
    REM Full method signatures loaded via Java interop when available
classend
`.trimStart();

// In bbj-ws-manager.ts - loadAdditionalDocuments method
import { builtinBBjAPI } from './lib/bbj-api.js';

protected override async loadAdditionalDocuments(
    _folders: WorkspaceFolder[],
    collector: (document: LangiumDocument<AstNode>) => void
): Promise<void> {
    collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
    collector(this.documentFactory.fromString(builtinVariables, URI.parse('bbjlib:///variables.bbl')));
    collector(this.documentFactory.fromString(builtinSymbolicLabels, URI.parse('bbjlib:///labels.bbl')));
    collector(this.documentFactory.fromString(builtinEvents, URI.parse('bbjlib:///events.bbl')));
    collector(this.documentFactory.fromString(builtinBBjAPI, URI.parse('bbjlib:///bbj-api.bbl')));
}
```

**Source:** Existing pattern in bbj-ws-manager.ts lines 163-172

### Example 2: Custom DefinitionProvider for USE Navigation

```typescript
// In bbj-vscode/src/language/bbj-definition-provider.ts (new file)
import { DefaultDefinitionProvider, LocationLink, DefinitionParams, LangiumDocument,
         AstUtils, GrammarUtils } from 'langium';
import { LangiumServices } from 'langium/lsp';
import { isUse, isBbjClass } from './generated/ast.js';

export class BBjDefinitionProvider extends DefaultDefinitionProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override getDefinition(
        document: LangiumDocument,
        params: DefinitionParams
    ): LocationLink[] | undefined {
        const links = super.getDefinition(document, params);

        if (!links || links.length === 0) {
            return undefined;
        }

        // Enhance USE statement navigation to jump to class declaration line
        return links.map(link => {
            // Find the reference at cursor position
            const rootNode = document.parseResult.value;
            const cst = rootNode.$cstNode;
            const offset = document.textDocument.offsetAt(params.position);
            const sourceCstNode = findDeclarationNodeAtOffset(cst, offset, this.grammarConfig.nameRegexp);

            if (!sourceCstNode) return link;

            const refContainer = sourceCstNode.astNode.$container;

            // Check if this is a USE statement with BbjClass reference
            if (isUse(refContainer)) {
                const targetDoc = this.langiumDocuments.getDocument(link.targetUri);
                if (!targetDoc) return link;

                // Find the actual class declaration in target document
                const targetClass = AstUtils.streamAllContents(targetDoc.parseResult.value)
                    .find(node => isBbjClass(node));

                if (targetClass && targetClass.$cstNode) {
                    // Find the 'name' property CST node for precise selection
                    const nameNode = GrammarUtils.findNodeForProperty(targetClass.$cstNode, 'name');
                    if (nameNode) {
                        // Return enhanced link pointing to class name, not file start
                        return LocationLink.create(
                            link.targetUri,
                            targetClass.$cstNode.range,        // Full class range
                            nameNode.range,                    // Selection on class name
                            link.originSelectionRange
                        );
                    }
                }
            }

            return link;
        });
    }
}

// Register in bbj-module.ts
import { BBjDefinitionProvider } from './bbj-definition-provider.js';

export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    // ... existing services
    lsp: {
        DefinitionProvider: (services) => new BBjDefinitionProvider(services),
        // ... other LSP services remain unchanged
    },
    // ... other modules
};
```

**Source pattern:** Langium's [DefaultDefinitionProvider](https://github.com/eclipse-langium/langium/blob/main/packages/langium/src/lsp/definition-provider.ts)

### Example 3: Test for BBjAPI Resolution

```typescript
// In bbj-vscode/test/linking.test.ts - update skipped test
test('Case insensitive access to BBjAPI', async () => {
    // BEFORE: test.skip with comment about indexing issue
    // AFTER: Full test now that BBjAPI is built-in
    const document = await validate(`
        API! = BbJaPi()
        api2! = bbjapi()
        api3! = BBJAPI()
    `)
    expectNoErrors(document)
})

test('BBjAPI resolves without Java interop', async () => {
    // This test verifies BBjAPI works even when Java service is down
    // (In test environment, Java interop service may not be running)
    const document = await validate(`
        api! = BBjAPI()
        PRINT api!  REM Type is BBjAPI, no linker error
    `)
    const linkingErrors = findLinkingErrors(document)
    const bbjApiError = linkingErrors.find(err => err.message.includes('BBjAPI'))
    expect(bbjApiError).toBeUndefined()
})
```

**Source:** Existing test pattern from linking.test.ts lines 126-135

### Example 4: Test for USE Navigation

```typescript
// In bbj-vscode/test/functional/lsp-features.test.ts or new navigation.test.ts
import { expectGoToDefinition } from 'langium/test';

describe('USE Statement Navigation', () => {
    test('Ctrl-click on class name navigates to class declaration line', async () => {
        // Setup: Create a .bbj file with a class
        const classFile = await parse(`
            class public MyClass
                field public String name!
            classend
        `, { uri: 'file:///workspace/mylib.bbj', validation: true });

        // Test: USE statement in another file
        const userFile = await parse(`
            use ::mylib.bbj::MyCl<|>ass
            obj! = new MyClass()
        `, { validation: true });

        // Verify: Definition points to class name line, not file start
        const definition = await services.BBj.lsp.DefinitionProvider!.getDefinition(
            userFile,
            { textDocument: { uri: userFile.uri.toString() }, position: cursorPosition }
        );

        expect(definition).toBeDefined();
        expect(definition!.length).toBe(1);
        expect(definition![0].targetUri).toBe(classFile.uri.toString());
        expect(definition![0].targetSelectionRange.start.line).toBe(1); // Line with "class public MyClass"
    });

    test('USE statement with unresolvable file shows no navigation', async () => {
        const document = await parse(`
            use ::nonexistent.bbj::FakeClass
        `, { validation: true });

        const definition = await services.BBj.lsp.DefinitionProvider!.getDefinition(
            document,
            { textDocument: { uri: document.uri.toString() }, position: /* on FakeClass */ }
        );

        // Navigation should fail gracefully (no links)
        expect(definition).toBeUndefined();

        // Validation should show warning about unresolvable class
        const warnings = document.diagnostics?.filter(d => d.severity === DiagnosticSeverity.Warning);
        expect(warnings!.length).toBeGreaterThan(0);
    });
});
```

**Source pattern:** Langium test utilities from langium/test

## State of the Art

### Regression Timeline

| Date | Event | Impact |
|------|-------|--------|
| Pre-v3.1 | BBjAPI() worked case-insensitively | Special case in linker (commit 3e8900e) |
| Pre-v3.1 | USE statement Ctrl-click navigated | Default Langium behavior worked |
| v3.1 | Langium 3.2.1 → 4.x upgrade | Multiple breaking changes (see ARCHITECTURE.md) |
| v3.1 | BBjAPI() regression | Linker case-insensitive lookup still exists, but BBjAPI not always indexed |
| v3.1 | USE navigation regression | Reference resolution works, but navigation doesn't jump to class line |
| Current | test.skip for BBjAPI (line 126) | "Test module doesn't properly index JavaClass" |

**Root cause analysis:**

1. **BBjAPI regression:** Java interop service loads BBjAPI as a JavaClass, but:
   - Service may not be available (port 5008 not open)
   - Test environment doesn't index JavaClass properly (per comment in linking.test.ts:128-130)
   - Linker's special case (lines 106-110) requires BBjAPI to exist in scope

2. **USE navigation regression:**
   - Scope provider correctly resolves `USE ::file.bbj::ClassName` reference (bbj-scope.ts:166-171)
   - Default DefinitionProvider navigates to resolved node's document
   - But doesn't enhance navigation to jump to specific class declaration line
   - Issue #357 tracks this regression

**Migration impact:** The Langium 4 upgrade didn't directly break these features, but exposed existing brittleness:
- BBjAPI depending on Java interop availability was always fragile
- USE navigation was never explicitly enhanced beyond default behavior

## Open Questions

### Question 1: Should BBjAPI Built-in Include Method Stubs?

**What we know:**
- BBjAPI has ~50+ methods (getConfig, getFileSystem, etc.)
- Java interop provides full method signatures when available

**What's unclear:**
- Should synthetic BBjAPI class include method stubs for completion when Java interop is unavailable?
- OR: Just define the class, let Java interop augment with methods?

**Recommendation:**
Start with minimal class (just `class BBjAPI classend`). Reasons:
1. User decision: "Show all methods from BBjAPI class in completions" implies we need Java interop for method list
2. Stubs would duplicate information that Java interop provides
3. Keeping synthetic document minimal reduces maintenance
4. Goal is type resolution, not completion — completion already requires Java interop

**Validation approach:** Test with and without Java interop, document behavior difference.

### Question 2: IntelliJ Plugin Testing for Navigation

**What we know:**
- Manual testing required in BOTH VS Code and IntelliJ
- IntelliJ plugin uses same language server (main.cjs)
- LSP go-to-definition is standard protocol

**What's unclear:**
- Does IntelliJ plugin correctly consume LSP LocationLink with targetSelectionRange?
- Any IntelliJ-specific quirks for USE statement navigation?

**Recommendation:**
- Build automated tests for VS Code (LSP protocol level)
- Create manual test checklist for IntelliJ with specific USE scenarios
- User provides manual sign-off for IntelliJ

## Sources

### Primary (HIGH confidence)

- Langium Documentation: [Built-in Libraries](https://langium.org/docs/recipes/builtin-library/) - Built-in library pattern via loadAdditionalDocuments
- Langium Documentation: [Configuration via Services](https://langium.org/docs/reference/configuration-services/) - Overriding services like DefinitionProvider
- BBj Language Server Codebase: bbj-linker.ts lines 106-110 - Existing BBjAPI case-insensitive handling
- BBj Language Server Codebase: bbj-scope.ts lines 166-171 - USE statement scope resolution
- BBj Language Server Codebase: bbj-ws-manager.ts lines 163-172 - Existing built-in library loading pattern
- BBj Language Server Codebase: linking.test.ts lines 126-135 - Skipped BBjAPI test with root cause comment
- .planning/REQUIREMENTS.md - REG-01 and REG-02 requirements

### Secondary (MEDIUM confidence)

- Langium GitHub: [DefaultDefinitionProvider source](https://github.com/eclipse-langium/langium/blob/main/packages/langium/src/lsp/definition-provider.ts) - Implementation pattern
- Langium Documentation: [Document Lifecycle](https://langium.org/docs/reference/document-lifecycle/) - How documents are indexed and linked
- Git history: commit 3e8900e "The hardcoded short constructor BBjAPI() is case insensitive #28" - Original BBjAPI fix

### Tertiary (LOW confidence)

- WebSearch: "Langium synthetic AST nodes" - Design principle against synthetic nodes outside workspace manager
- .planning/research/ARCHITECTURE.md - Langium 4 migration impact analysis (informs Langium API patterns)

## Metadata

**Confidence breakdown:**
- BBjAPI resolution approach: HIGH - Built-in library pattern is documented Langium best practice, already used for builtinFunctions
- USE navigation approach: HIGH - DefaultDefinitionProvider override is standard Langium pattern, reference resolution already works
- Test coverage areas: MEDIUM - Exact test scenarios depend on implementation details, but core linker/navigation paths are clear
- IntelliJ compatibility: LOW - Requires manual validation, LSP protocol should work but needs verification

**Research date:** 2026-02-07
**Valid until:** 60 days (architecture is stable; implementation details may evolve)
