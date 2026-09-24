<!-- refreshed: 2026-09-21 -->
# Architecture

**Analysis Date:** 2026-09-21

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                       VS Code / IntelliJ Client                  │
│                  (BBj Editor with IDE Features)                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ LSP (Language Server Protocol)
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    Language Server (Langium)                      │
│              `src/language/bbj-module.ts` (entry)                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Input Layer: Lexer & Parser                               │ │
│  │  - `bbj-lexer.ts`: Custom lexer with line-continuation     │ │
│  │  - `bbj-token-builder.ts`: Custom token patterns           │ │
│  │  - `bbj.langium`: Grammar definition                       │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  Linking & Scope Layer                                     │ │
│  │  - `bbj-scope.ts`: Scope provider for symbol resolution    │ │
│  │  - `bbj-scope-local.ts`: Local scope computation           │ │
│  │  - `bbj-linker.ts`: Cross-file reference linking           │ │
│  │  - `bbj-index-manager.ts`: Workspace symbol index          │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  Analysis Layer                                            │ │
│  │  - `bbj-type-inferer.ts`: Type inference                   │ │
│  │  - `bbj-validator.ts`: Validation checks                   │ │
│  │  - `validations/`: Delegated validators (classes,          │ │
│  │    scoping, function calls, line-breaks)                   │ │
│  │  - `bbj-document-validator.ts`: Document-level validation  │ │
│  │  - `bbj-cpl-service.ts`: BBj compiler (CPL) integration    │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  External Services                                         │ │
│  │  - `java-interop.ts`: Java classpath resolution via :5008  │ │
│  │  - `java-javadoc.ts`: Java documentation extraction        │ │
│  │  - `bbj-ws-manager.ts`: Workspace management               │ │
│  │  - `bbj-document-builder.ts`: Document lifecycle            │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  LSP Feature Providers (IDE Features)                      │ │
│  │  - `bbj-completion-provider.ts`: Autocompletion            │ │
│  │  - `bbj-hover.ts`: Hover information                       │ │
│  │  - `bbj-definition-provider.ts`: Go-to-definition          │ │
│  │  - `bbj-semantic-token-provider.ts`: Syntax highlighting   │ │
│  │  - `bbj-signature-help-provider.ts`: Parameter hints       │ │
│  │  - `bbj-inlay-hint-provider.ts`: Inlay hints               │ │
│  │  - `bbj-code-action-provider.ts`: Quick fixes              │ │
│  │  - `bbj-document-symbol-provider.ts`: Outline              │ │
│  │  - `composer-codelens.ts`: Code lens for composers         │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
         ┌──────────▼──────────┐   ┌─▼───────────────────┐
         │ java-interop        │   │  BBj CPL Compiler   │
         │ Socket :5008        │   │  Native integration │
         │ (Java classes)      │   │  for diagnostics    │
         └─────────────────────┘   └─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Lexer** | Tokenize BBj source with line-continuation handling | `bbj-lexer.ts` |
| **Parser** | Parse tokens into AST using Langium grammar | `bbj.langium`, `bbj-module.ts` |
| **Scope Provider** | Resolve symbol names and build scope chains | `bbj-scope.ts`, `bbj-scope-local.ts` |
| **Linker** | Link cross-file references and external definitions | `bbj-linker.ts` |
| **Type Inferer** | Infer and track variable/expression types | `bbj-type-inferer.ts` |
| **Validator** | Register and execute validation checks | `bbj-validator.ts`, `validations/` |
| **Java Interop** | Resolve Java classes and members via socket | `java-interop.ts` |
| **Document Builder** | Manage document parse/link/validate lifecycle | `bbj-document-builder.ts` |
| **Workspace Manager** | Track and index all workspace documents | `bbj-ws-manager.ts`, `bbj-index-manager.ts` |
| **Completion Provider** | Suggest completions (variables, functions, classes) | `bbj-completion-provider.ts` |
| **Hover Provider** | Display symbol/type info on hover | `bbj-hover.ts` |
| **Definition Provider** | Navigate to symbol definition | `bbj-definition-provider.ts` |
| **Semantic Tokens** | Provide syntax highlighting ranges | `bbj-semantic-token-provider.ts` |
| **Signature Help** | Display function/method parameter hints | `bbj-signature-help-provider.ts` |
| **Inlay Hints** | Show inline type/parameter info | `bbj-inlay-hint-provider.ts` |
| **Code Actions** | Provide quick fixes and refactorings | `bbj-code-action-provider.ts` |
| **Document Symbol** | Provide document outline / breadcrumb | `bbj-document-symbol-provider.ts` |
| **Code Lens** | Provide inline code references (composers) | `composer-codelens.ts` |

## Pattern Overview

**Overall:** Langium-based Language Server with custom service overrides

**Key Characteristics:**
- **Dependency Injection (DI)**: Services are wired via `bbj-module.ts` using Langium's injection pattern
- **Layered Pipeline**: Parse → Link → Validate → Serve (separate phases, each can interrupt on cancellation)
- **Case-Insensitive**: Grammar and scope provider handle BBj's case-insensitivity throughout
- **Cross-File References**: `bbj-linker.ts` resolves USE statements and external symbol references
- **Java Integration**: Async socket service (`java-interop.ts`) provides Java class resolution
- **Lazy Evaluation**: Java interop uses LRU caching (5000 class limit) to manage memory
- **Custom Tokens**: `bbj-token-builder.ts` builds special tokens for statements, keywords, and line boundaries

## Layers

**Input Layer (Parsing):**
- Purpose: Tokenize and parse BBj source into AST
- Location: `bbj-lexer.ts`, `bbj-token-builder.ts`, `bbj.langium`
- Contains: Custom lexer with line-continuation handling; Langium grammar rules
- Depends on: Chevrotain (tokenization), Langium parser generator
- Used by: Document builder, validator, all analysis layers

**Scope & Linking Layer (Name Resolution):**
- Purpose: Resolve symbol names across files and external sources
- Location: `bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-linker.ts`, `bbj-scope-computation` (in scope-local)
- Contains: Symbol scope providers, cross-reference resolution, local scope computation
- Depends on: AST navigation, type inference, Java interop (for external types)
- Used by: Validator, completion, definition, hover providers

**Analysis Layer (Validation & Inference):**
- Purpose: Check correctness and infer types
- Location: `bbj-validator.ts`, `validations/`, `bbj-type-inferer.ts`, `bbj-document-validator.ts`, `bbj-cpl-service.ts`
- Contains: Validation checks (classes, variable scoping, function calls, line breaks); type tracking; CPL compiler integration
- Depends on: Scope layer, Java interop, BBj compiler CLI
- Used by: Document builder, IDE features (errors/diagnostics)

**Workspace Layer (Document Management):**
- Purpose: Manage document lifecycle, indexing, and workspace state
- Location: `bbj-document-builder.ts`, `bbj-ws-manager.ts`, `bbj-index-manager.ts`
- Contains: Document parsing, linking, validation orchestration; workspace-wide symbol index
- Depends on: Lexer, parser, all analysis services
- Used by: Language client, all IDE features

**LSP Feature Layer (IDE Operations):**
- Purpose: Provide editor integration (completion, hover, definition, etc.)
- Location: `bbj-completion-provider.ts`, `bbj-hover.ts`, `bbj-definition-provider.ts`, and seven others
- Contains: Each provider implements a single LSP feature
- Depends on: Scope layer, type inference, Java interop, workspace index
- Used by: Language client → VS Code / IntelliJ client

## Data Flow

### Primary Request Path (Editing a BBj File)

1. **User edits file** → LSP client sends `textDocument/didChange` (`extension.ts` in VS Code)
2. **Document build triggered** (`bbj-document-builder.ts`)
   - Parse: Lexer tokenizes with line-continuation handling (`bbj-lexer.ts`)
   - Parse: Parser builds AST using grammar (`bbj.langium`)
   - Link: Resolver computes scopes and resolves cross-references (`bbj-scope.ts`, `bbj-linker.ts`)
   - Validate: Validator runs all checks, optionally calls CPL compiler (`bbj-validator.ts`, `bbj-cpl-service.ts`)
   - Workspace update: Index manager updates symbol tables (`bbj-index-manager.ts`)
3. **Diagnostics published** → Client shows errors/warnings in editor
4. **IDE requests features**:
   - Hover at offset → `BBjHoverProvider.hover()` (`bbj-hover.ts`)
   - Completion at offset → `BBjCompletionProvider.getCompletion()` (`bbj-completion-provider.ts`)
   - Definition at offset → `BBjDefinitionProvider.getDefinition()` (`bbj-definition-provider.ts`)

### Java Interop Flow (Resolving Java Classes)

1. **Completion/Hover mentions Java class** (e.g., `new HashMap()`)
2. **Scope provider** or **completion provider** calls `JavaInteropService.resolveClass(fqn, token)`
3. **LRU cache check** — if cached, return immediately
4. **Breaker check** — if circuit open and cooldown active, fail fast
5. **Socket connect** → `java-interop:5008` with JSON-RPC request
6. **Backend response** → class with methods, fields, supertypes, javadoc
7. **Cache store** → Add to LRU map (evict oldest if > 5000 entries)
8. **Return to caller** → Suggest members or hover info

### Type Inference Flow (Variable Type Tracking)

1. **Assignment encountered** (e.g., `x = 5`)
2. **Type inferer** traces RHS expression type (`bbj-type-inferer.ts`)
3. **Store type** in local scope/symbol map
4. **Later references** to `x` lookup stored type
5. **Scope layer** provides type to completion/hover for member suggestions (e.g., `x.` → methods on inferred type)

### Symbol Scoping Flow (Variable Resolution)

1. **Symbol reference** encountered (e.g., `PRINT x`)
2. **Scope provider** builds scope chain: local block → method → class → program → imports (`bbj-scope-local.ts`)
3. **Each scope level** looks up symbol name (case-insensitive)
4. **Found** → Linker stores reference; validation confirms type safety
5. **Not found** → Validator reports undefined variable error

## Key Abstractions

**Scope Chain (BBjScopeProvider):**
- Purpose: Provide symbol resolution context across nested blocks, methods, classes, files
- Examples: `bbj-scope.ts` lines 80-300 (getScope methods for different node types)
- Pattern: Default Langium scope provider extended with BBj-specific rules (case-insensitivity, Java interop, class inheritance)

**Local Symbol Map (BbjScopeComputation):**
- Purpose: Track variable declarations and types within a block/method
- Examples: `bbj-scope-local.ts` (LocalSymbols class, scope computation for statements)
- Pattern: Visitor pattern over AST nodes, accumulating symbols in ordered map

**Validation Check (BBjValidator methods):**
- Purpose: Implement a single validation concern (e.g., class existence, variable scoping)
- Examples: `checkLabelDecl()`, `checkCastExpressionTypeResolvable()`, `checkFunctionCall()` delegates
- Pattern: Each check is a method on validator registered with `ValidationRegistry`

**LSP Provider (e.g., CompletionProvider):**
- Purpose: Translate AST/scope analysis into IDE-consumable format (CompletionItem, Hover, etc.)
- Examples: `BBjCompletionProvider` extends `DefaultCompletionProvider`; `BBjHoverProvider` extends `DefaultHoverProvider`
- Pattern: Override Langium's default logic with BBj-specific filtering/sorting/formatting

**Java Class Model (JavaClass AST node):**
- Purpose: Represent a resolved Java class with members, type info, and javadoc
- Examples: `generated/ast.ts` defines JavaClass, JavaField, JavaMethod, JavaPackage
- Pattern: Langium-generated AST types mirroring Java reflection; manually populated by java-interop socket

## Entry Points

**VS Code Extension:**
- Location: `extension.ts`
- Triggers: VS Code activate event (opening a .bbj/.bbx file)
- Responsibilities: Start LanguageClient, register commands (run, compile, show config), manage webviews (composers)

**Language Server:**
- Location: `bbj-module.ts` (createBBjServices)
- Triggers: LSP connection from client (`initialize`, `initialized`)
- Responsibilities: Wire all services, handle document lifecycle (open, change, close), dispatch LSP requests

**Document Processing:**
- Location: `bbj-document-builder.ts` (build method)
- Triggers: Document changed (via workspace manager)
- Responsibilities: Execute parse → link → validate pipeline; interrupt on cancellation

## Architectural Constraints

- **Threading:** Single-threaded event loop (Langium services are not thread-safe); Java interop socket requests are async/await-based
- **Global state:** `java-interop.ts` maintains singleton connection and LRU class cache; workspace manager holds all parsed documents
- **Circular imports:** None observed; dependency graph flows upward (lexer → parser → analyzer → workspace → LSP)
- **Case-insensitivity:** BBj keywords and symbols are case-insensitive; scope provider normalizes names to lowercase before lookup
- **External dependency:** Java interop requires java-interop service on port 5008; if unavailable, class resolution fails gracefully with fallback to partial index
- **Grammar changes:** Editing `bbj.langium` requires running `npm run langium:generate` to regenerate `generated/ast.ts`, `generated/grammar.ts`, `generated/module.ts`; never edit generated files directly
- **Service injection:** All services must be registered in `BBjModule` or `BBjSharedModule` to be available at runtime

## Anti-Patterns

### Untracked Mutable State

**What happens:** Service holds mutable data (e.g., class cache) without a clear access path or invalidation strategy

**Why it's wrong:** Makes the system hard to debug; stale data silently affects IDE behavior; concurrent requests can race and corrupt state

**Do this instead:** Centralize state in a well-named service (e.g., `JavaInteropService._resolvedClasses`), expose via getter/setter, document invalidation (LRU eviction, cancellation, explicit clear)

Reference: `java-interop.ts` lines 140-150 (LruMap, resolved classes cache with TTL)

### Direct AST Traversal Without Scope

**What happens:** Code walks the AST tree directly to find symbols instead of using the scope provider

**Why it's wrong:** Misses renamed symbols, loses case-insensitivity, doesn't account for shadowing across scopes, breaks on cross-file references

**Do this instead:** Use `BBjScopeProvider.getScope(refInfo)` to get the correct scope chain, then resolve via `scope.getElement(name)`

Reference: `bbj-scope.ts` (entire module), `bbj-completion-provider.ts` lines 98-108 (using scope for cross-references)

### Synchronous Java Interop Calls

**What happens:** Code calls `JavaInteropService.resolveClass(...)` without `await`, or holds a blocking lock while resolving

**Why it's wrong:** Blocks the event loop; timeouts on slow networks hang the entire server; cancellation tokens aren't respected

**Do this instead:** All Java interop calls are async; use `await` and pass `CancellationToken` from the current request

Reference: `java-interop.ts` line 41 (async link method), `bbj-completion-provider.ts` line 98 (async completionForCrossReference)

## Error Handling

**Strategy:** Layered error handling with fallbacks

**Patterns:**
- **Parse errors**: Reported as diagnostics; partial AST is still used for analysis (robust recovery)
- **Linking errors**: Unresolved references logged; validator reports undefined symbol errors; editor shows squigglies
- **Validation errors**: Collected and published; don't prevent other validation checks or IDE features from running
- **Java interop errors**: Transport failures (socket down, timeout) distinguish from "class not found"; transport failures are not cached; fallback to partial index
- **Cancellation**: Every async operation checks cancellation token; cancellation throws, propagates up, stops remaining work

## Cross-Cutting Concerns

**Logging:** 
- `logger.ts` singleton (debug/info/warn/error levels)
- Enabled via `BBj.debug` setting
- Performance slow-path logging (e.g., linking > 500ms) in `bbj-linker.ts`

**Validation:**
- Delegated to service methods + registry-registered checks
- Supports severity levels (error/warning/info/hint)
- Line-break validation is special (runs on every node as a post-parse check)

**Authentication:**
- Java interop socket is unauthenticated (assumes local :5008 is trusted)
- VS Code secrets storage used for BBj.properties paths, config file credentials

**Workspace Indexing:**
- Automatic via document builder on every change
- Incremental updates (only changed document re-indexed)
- USE statements trigger cross-file index updates

---

*Architecture analysis: 2026-09-21*
