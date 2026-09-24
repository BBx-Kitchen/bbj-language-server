<!-- refreshed: 2026-09-24 -->
# Architecture

**Analysis Date:** 2026-09-24

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
│              `src/language/main.ts` (LSP entry point)             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Input Layer: Lexer & Parser                               │ │
│  │  - `bbj-lexer.ts`: Custom lexer with line-continuation     │ │
│  │  - `bbj-token-builder.ts`: Custom token patterns           │ │
│  │  - `bbj.langium`: Grammar definition                       │ │
│  │  - `bbj-parser-service.ts`: Live BBj parser backend bridge │ │
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
│  │  - `bbj-diagnostic-reconciliation.ts`: Merge parser        │ │
│  │    diagnostics with Langium's diagnostics                  │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  External Services                                         │ │
│  │  - `java-interop.ts`: Java classpath resolution via :5008  │ │
│  │  - `java-javadoc.ts`: Java documentation extraction        │ │
│  │  - `java-class-reload.ts`: Refresh Java classpath          │ │
│  │  - `bbj-ws-manager.ts`: Workspace management               │ │
│  │  - `bbj-document-builder.ts`: Document lifecycle            │ │
│  │  - `bbj-kept-check.ts`: Incremental change tracking        │ │
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
│  │  - `bbj-code-action-handler.ts`: Code action execution     │ │
│  │  - `bbj-document-symbol-provider.ts`: Outline              │ │
│  │  - `composer-codelens.ts`: Code lens for composers         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │  Request/Notification Handlers                             │ │
│  │  - `bbj-notifications.ts`: Server→client notifications      │ │
│  │  - `composer-commands.ts`: Composer UI requests             │ │
│  │  - `compile-command.ts`: Compile on-demand requests         │ │
│  │  - `config-watcher.ts`: Config file change monitoring       │ │
│  │  - `bbj-document-update-handler.ts`: Save event handling    │ │
│  │  - `setopts-in-code-request.ts`: SETOPTS inline requests    │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴──────────┬───────────────┐
                    │                  │               │
         ┌──────────▼──────────┐   ┌───▼──────────┐   ┌▼─────────────────┐
         │ java-interop        │   │ BBj CPL      │   │ BBj Live Parser   │
         │ Socket :5008        │   │ Compiler     │   │ Socket Backend    │
         │ (Java classes)      │   │ (on save)    │   │ (live diagnostics)│
         └─────────────────────┘   └──────────────┘   └───────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Lexer** | Tokenize BBj source with line-continuation handling | `bbj-lexer.ts` |
| **Parser** | Parse tokens into AST using Langium grammar | `bbj.langium`, `bbj-module.ts` |
| **Parser Service** | Bridge to live BBj parser backend for diagnostics | `bbj-parser-service.ts` |
| **Scope Provider** | Resolve symbol names and build scope chains | `bbj-scope.ts`, `bbj-scope-local.ts` |
| **Linker** | Link cross-file references and external definitions | `bbj-linker.ts` |
| **Type Inferer** | Infer and track variable/expression types | `bbj-type-inferer.ts` |
| **Validator** | Register and execute validation checks | `bbj-validator.ts`, `validations/` |
| **Diagnostic Reconciliation** | Merge live parser and Langium diagnostics | `bbj-diagnostic-reconciliation.ts` |
| **Java Interop** | Resolve Java classes and members via socket | `java-interop.ts` |
| **Java Class Reload** | Refresh Java classpath on file changes | `java-class-reload.ts` |
| **Document Builder** | Manage document parse/link/validate lifecycle | `bbj-document-builder.ts` |
| **Workspace Manager** | Track and index all workspace documents | `bbj-ws-manager.ts`, `bbj-index-manager.ts` |
| **Change Tracker** | Log incremental text changes for error re-placement | `bbj-kept-check.ts` |
| **Completion Provider** | Suggest completions (variables, functions, classes) | `bbj-completion-provider.ts` |
| **Hover Provider** | Display symbol/type info on hover | `bbj-hover.ts` |
| **Definition Provider** | Navigate to symbol definition | `bbj-definition-provider.ts` |
| **Semantic Tokens** | Provide syntax highlighting ranges | `bbj-semantic-token-provider.ts` |
| **Signature Help** | Display function/method parameter hints | `bbj-signature-help-provider.ts` |
| **Inlay Hints** | Show inline type/parameter info | `bbj-inlay-hint-provider.ts` |
| **Code Actions** | Provide quick fixes and refactorings | `bbj-code-action-provider.ts` |
| **Code Action Handler** | Execute code action operations | `bbj-code-action-handler.ts` |
| **Document Symbol** | Provide document outline / breadcrumb | `bbj-document-symbol-provider.ts` |
| **Code Lens** | Provide inline code references (composers) | `composer-codelens.ts` |
| **Update Handler** | Handle save events (advertise textDocumentSync.save) | `bbj-document-update-handler.ts` |

## Pattern Overview

**Overall:** Langium-based Language Server with custom service overrides and live parser integration

**Key Characteristics:**
- **Dependency Injection (DI)**: Services are wired via `bbj-module.ts` using Langium's injection pattern
- **Layered Pipeline**: Parse → Link → Validate → Serve (separate phases, each can interrupt on cancellation)
- **Case-Insensitive**: Grammar and scope provider handle BBj's case-insensitivity throughout
- **Cross-File References**: `bbj-linker.ts` resolves USE statements and external symbol references
- **Java Integration**: Async socket service (`java-interop.ts`) provides Java class resolution
- **Live Parser Integration**: `bbj-parser-service.ts` bridges Langium's parser with the native BBj parser endpoint
- **Diagnostic Reconciliation**: `bbj-diagnostic-reconciliation.ts` merges live parser diagnostics with Langium validation errors
- **Lazy Evaluation**: Java interop uses LRU caching (5000 class limit) to manage memory
- **Incremental Change Tracking**: `bbj-kept-check.ts` records text changes for error line re-placement
- **Custom Tokens**: `bbj-token-builder.ts` builds special tokens for statements, keywords, and line boundaries

## Layers

**Input Layer (Parsing):**
- Purpose: Tokenize and parse BBj source into AST; bridge to live parser backend for truth verification
- Location: `bbj-lexer.ts`, `bbj-token-builder.ts`, `bbj.langium`, `bbj-parser-service.ts`
- Contains: Custom lexer with line-continuation handling; Langium grammar rules; live parser error bridge
- Depends on: Chevrotain (tokenization), Langium parser generator, java-interop (ParseProgram RPC)
- Used by: Document builder, validator, all analysis layers

**Scope & Linking Layer (Name Resolution):**
- Purpose: Resolve symbol names across files and external sources
- Location: `bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-linker.ts`, `bbj-scope-computation` (in scope-local)
- Contains: Symbol scope providers, cross-reference resolution, local scope computation
- Depends on: AST navigation, type inference, Java interop (for external types)
- Used by: Validator, completion, definition, hover providers

**Analysis Layer (Validation & Inference):**
- Purpose: Check correctness and infer types; reconcile parser diagnostics
- Location: `bbj-validator.ts`, `validations/`, `bbj-type-inferer.ts`, `bbj-document-validator.ts`, `bbj-cpl-service.ts`, `bbj-diagnostic-reconciliation.ts`
- Contains: Validation checks (classes, variable scoping, function calls, line breaks); type tracking; CPL compiler integration; diagnostic merging
- Depends on: Scope layer, Java interop, BBj compiler CLI, live parser endpoint
- Used by: Document builder, IDE features (errors/diagnostics)

**Workspace Layer (Document Management):**
- Purpose: Manage document lifecycle, indexing, and workspace state; track incremental changes
- Location: `bbj-document-builder.ts`, `bbj-ws-manager.ts`, `bbj-index-manager.ts`, `bbj-kept-check.ts`
- Contains: Document parsing, linking, validation orchestration; workspace-wide symbol index; change log per document
- Depends on: Lexer, parser, all analysis services, text document manager
- Used by: Language client, all IDE features

**LSP Feature Layer (IDE Operations):**
- Purpose: Provide editor integration (completion, hover, definition, etc.)
- Location: `bbj-completion-provider.ts`, `bbj-hover.ts`, `bbj-definition-provider.ts`, and others
- Contains: Each provider implements a single LSP feature
- Depends on: Scope layer, type inference, Java interop, workspace index
- Used by: Language client → VS Code / IntelliJ client

**Request/Notification Layer (Server Operations):**
- Purpose: Handle LSP requests and initiate server→client notifications
- Location: `bbj-notifications.ts`, `composer-commands.ts`, `compile-command.ts`, `config-watcher.ts`, `bbj-document-update-handler.ts`
- Contains: Config reload notifications, composer UI requests, compile triggers, save event handling
- Depends on: LSP connection, workspace, document builder
- Used by: Main server loop, language client

## Data Flow

### Primary Request Path (Editing a BBj File)

1. **User edits file** → LSP client sends `textDocument/didChange` (VS Code `extension.ts` or IntelliJ LSP4IJ)
2. **Change logged** → `bbj-kept-check.ts` records the delta for later line re-mapping
3. **Document build triggered** (`bbj-document-builder.ts`)
   - Parse: Lexer tokenizes with line-continuation handling (`bbj-lexer.ts`)
   - Parse: Parser builds AST using grammar (`bbj.langium`)
   - Link: Resolver computes scopes and resolves cross-references (`bbj-scope.ts`, `bbj-linker.ts`)
   - Validate: Validator runs all checks (`bbj-validator.ts`), registers line-break checks
   - Reconcile: Diagnostic reconciliation merges parser diagnostics with validation errors (`bbj-diagnostic-reconciliation.ts`)
   - Workspace update: Index manager updates symbol tables (`bbj-index-manager.ts`)
4. **Diagnostics published** → Client shows errors/warnings in editor
5. **IDE requests features**:
   - Hover at offset → `BBjHoverProvider.hover()` (`bbj-hover.ts`)
   - Completion at offset → `BBjCompletionProvider.getCompletion()` (`bbj-completion-provider.ts`)
   - Definition at offset → `BBjDefinitionProvider.getDefinition()` (`bbj-definition-provider.ts`)

### Live Parser Integration Flow (Verifying Parse)

1. **Document text changes** or **document is opened**
2. **BBjParserService** (if connected) sends `ParseProgram` RPC to `:5008` backend
3. **Backend returns** list of `ParseError` objects (one-based line/char coordinates)
4. **parseErrorToRange()** converts errors to LSP `Range` (zero-based, clamped to document bounds)
5. **Diagnostic reconciliation** checks each Langium parse error against the live verdict:
   - If live parser has error on same line: Langium error demoted to warning or hidden
   - If no match: Langium error stays as-is (live parser silent on that line)
6. **Reconciled diagnostics** published to client

### Save-Time Compile Flow (Fallback if Live Parser Down)

1. **Document is saved** → `textDocument/didSave` fires
2. **BBjDocumentValidator** invokes BBj CPL compiler (if configured and enabled)
3. **CPL diagnostics** compared against current line-based Langium errors
4. **Fallback reconciliation** downgrades Langium syntax errors that overlap compile diagnostics
5. **Merged result** published

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
- Examples: `bbj-scope.ts` (getScope methods for different node types)
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

**Parse Error Reconciliation (DiagnosticTier):**
- Purpose: Classify and merge Langium diagnostics with live parser diagnostics
- Examples: `bbj-diagnostic-reconciliation.ts` (reconcileWithVerdict, reconcileWithFallbackCheck)
- Pattern: Per-line override strategy: live parser verdict suppresses Langium parse errors on matching lines

**Incremental Change Log (ChangeLog):**
- Purpose: Track text edits to re-map error line numbers after partial document changes
- Examples: `bbj-kept-check.ts` (TextDocumentsConfiguration with onDidChangeContent recorder)
- Pattern: Event-listener on TextDocuments fires for every change; delta logged per document

## Entry Points

**LSP Server (Node.js):**
- Location: `src/language/main.ts`
- Triggers: Process startup; LSP `initialize` handshake from client
- Responsibilities: Create LSP connection, wire services via `bbj-module.ts`, register request/notification handlers, start language server

**VS Code Extension:**
- Location: `extension.ts` (in parent src/ outside language/)
- Triggers: VS Code activate event (opening a `.bbj`/`.bbx` file)
- Responsibilities: Start LanguageClient, register commands (run, compile, show config), manage webviews (composers)

**Language Server Module:**
- Location: `bbj-module.ts` (createBBjServices)
- Triggers: Called from `main.ts` during initialization
- Responsibilities: Wire all services (parser, validators, LSP providers, Java interop); return service container

**Document Processing:**
- Location: `bbj-document-builder.ts` (build method)
- Triggers: Document changed (via workspace manager)
- Responsibilities: Execute parse → link → validate pipeline; interrupt on cancellation

## Architectural Constraints

- **Threading:** Single-threaded event loop (Langium services are not thread-safe); Java interop and parser socket requests are async/await-based
- **Global state:** `java-interop.ts` maintains singleton connection and LRU class cache; workspace manager holds all parsed documents; parser service holds live parser connection state
- **Circular imports:** None observed; dependency graph flows upward (lexer → parser → analyzer → workspace → LSP)
- **Case-insensitivity:** BBj keywords and symbols are case-insensitive; scope provider normalizes names to lowercase before lookup
- **External dependency:** Java interop requires java-interop service on port 5008; if unavailable, class resolution fails gracefully with fallback to partial index
- **External dependency:** Live parser backend (BBj :5008 new endpoint) required for live parse verification; if unavailable, system falls back to save-time compile checks via CPL
- **Grammar changes:** Editing `bbj.langium` requires running `npm run langium:generate` to regenerate `generated/ast.ts`, `generated/grammar.ts`, `generated/module.ts`; never edit generated files directly
- **Service injection:** All services must be registered in `BBjModule` or `BBjSharedModule` to be available at runtime

## Anti-Patterns

### Untracked Mutable State

**What happens:** Service holds mutable data (e.g., class cache) without a clear access path or invalidation strategy

**Why it's wrong:** Makes the system hard to debug; stale data silently affects IDE behavior; concurrent requests can race and corrupt state

**Do this instead:** Centralize state in a well-named service (e.g., `JavaInteropService._resolvedClasses`), expose via getter/setter, document invalidation (LRU eviction, cancellation, explicit clear)

Reference: `java-interop.ts` (LruMap, resolved classes cache with TTL)

### Direct AST Traversal Without Scope

**What happens:** Code walks the AST tree directly to find symbols instead of using the scope provider

**Why it's wrong:** Misses renamed symbols, loses case-insensitivity, doesn't account for shadowing across scopes, breaks on cross-file references

**Do this instead:** Use `BBjScopeProvider.getScope(refInfo)` to get the correct scope chain, then resolve via `scope.getElement(name)`

Reference: `bbj-scope.ts` (entire module), `bbj-completion-provider.ts` (using scope for cross-references)

### Synchronous Java Interop Calls

**What happens:** Code calls `JavaInteropService.resolveClass(...)` without `await`, or holds a blocking lock while resolving

**Why it's wrong:** Blocks the event loop; timeouts on slow networks hang the entire server; cancellation tokens aren't respected

**Do this instead:** All Java interop calls are async; use `await` and pass `CancellationToken` from the current request

Reference: `java-interop.ts` (async link method), `bbj-completion-provider.ts` (async completionForCrossReference)

### Ignoring Diagnostic Reconciliation

**What happens:** Code publishes Langium parse errors directly without checking live parser verdict

**Why it's wrong:** Users see duplicate or contradictory error messages; live parser truth is ignored in favor of Langium's parser

**Do this instead:** Route all diagnostics through `bbj-diagnostic-reconciliation.ts` before publishing. The live parser verdict overrides Langium's on matching lines.

Reference: `bbj-diagnostic-reconciliation.ts`, `bbj-document-builder.ts` (how it reconciles before publish)

## Error Handling

**Strategy:** Layered error handling with fallbacks; live parser bridging with CPL fallback

**Patterns:**
- **Parse errors**: Reported as diagnostics; partial AST is still used for analysis (robust recovery). Live parser verdict takes precedence over Langium parser.
- **Linking errors**: Unresolved references logged; validator reports undefined symbol errors; editor shows squigglies
- **Validation errors**: Collected and published; don't prevent other validation checks or IDE features from running
- **Java interop errors**: Transport failures (socket down, timeout) distinguish from "class not found"; transport failures are not cached; fallback to partial index
- **Parser backend errors**: If live parser endpoint down, system falls back to save-time CPL compile checks; both are optional (system works without either)
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
- Reconciliation applies verdict rules post-validation

**Authentication:**
- Java interop socket is unauthenticated (assumes local :5008 is trusted)
- BBj live parser socket is unauthenticated (assumes local :5008 or other endpoint is trusted)
- VS Code secrets storage used for BBj.properties paths, config file credentials

**Workspace Indexing:**
- Automatic via document builder on every change
- Incremental updates (only changed document re-indexed)
- USE statements trigger cross-file index updates

**Change Tracking:**
- Every text edit recorded in per-document change log (`bbj-kept-check.ts`)
- Change log used to re-map error line numbers if live parser verdict spans multiple lines

---

*Architecture analysis: 2026-09-24*
