# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Language Server Protocol (LSP) architecture with plugin-based service composition

**Key Characteristics:**
- Langium-based DSL (Domain-Specific Language) framework for BBj language parsing
- Dependency injection system for modular service registration
- Bidirectional communication between VS Code extension and language server
- Java interop service for classpath introspection via JSON-RPC sockets
- Lexer/Parser/Linker/Validator pipeline for semantic analysis

## Layers

**VS Code Extension Layer:**
- Purpose: User interface, command handling, configuration management
- Location: `bbj-vscode/src/extension.ts`
- Contains: Command registration, compiler options UI, settings integration
- Depends on: vscode API, language client
- Used by: VS Code host process

**Language Server Core:**
- Purpose: LSP protocol implementation and service initialization
- Location: `bbj-vscode/src/language/main.ts`
- Contains: Connection setup, service composition, Langium framework integration
- Depends on: Langium framework, service modules
- Used by: Extension's LanguageClient

**Language Services (Grammar/Parse/Analysis):**
- Purpose: BBj language grammar, parsing, and semantic analysis
- Location: `bbj-vscode/src/language/` (non-generated files)
- Contains: Grammar definition, parser customization, AST manipulation
- Depends on: Langium framework, generated AST types
- Used by: Linker, Validator, Index Manager

**Semantic Analysis Layer:**
- Purpose: Type inference, scope resolution, cross-reference linking
- Location: `bbj-vscode/src/language/bbj-type-inferer.ts`, `bbj-linker.ts`, `bbj-scope.ts`
- Contains: Type tracking, symbol resolution, class hierarchy
- Depends on: JavaInteropService, generated AST, workspace manager
- Used by: Validator, Completion Provider

**LSP Feature Providers:**
- Purpose: IDE features like completion, hover, signature help, semantic tokens
- Location: `bbj-vscode/src/language/bbj-*-provider.ts` files
- Contains: Feature-specific implementations extending Langium defaults
- Depends on: LangiumServices, semantic analysis layer
- Used by: Language client via LSP protocol

**Validation Layer:**
- Purpose: Syntax and semantic error checking
- Location: `bbj-vscode/src/language/bbj-validator.ts`, `validations/`
- Contains: Custom validation checks, error reporting
- Depends on: Type inferer, Java interop
- Used by: Document validator during parsing

**Java Interop Service:**
- Purpose: Reflect and cache Java class metadata for DDL-to-Java integration
- Location: `bbj-vscode/src/language/java-interop.ts`
- Contains: Socket communication, classpath scanning, class/method resolution
- Depends on: Java backend service (separate process)
- Used by: Type inferer, scope provider, completion provider

**Java Backend Service:**
- Purpose: Runtime Java classpath introspection
- Location: `java-interop/src/main/java/bbj/interop/`
- Contains: Reflection-based class scanning, JSON-RPC server
- Depends on: Guava, JSon-RPC library, JDK reflection
- Used by: Language server via socket connection

**Workspace Management:**
- Purpose: Document indexing, cross-file references, build coordination
- Location: `bbj-vscode/src/language/bbj-ws-manager.ts`, `bbj-index-manager.ts`, `bbj-document-builder.ts`
- Contains: Document lifecycle management, incremental updates
- Depends on: Langium workspace framework
- Used by: Linker, validator, scope provider

**Command Execution Layer:**
- Purpose: Compiler integration and BBj runtime commands
- Location: `bbj-vscode/src/Commands/Commands.cjs`
- Contains: Subprocess execution, BBj compiler invocation, web app running
- Depends on: Node.js child_process, file system
- Used by: Extension command handlers

## Data Flow

**File Parse → Analysis → LSP Features:**

1. User opens/edits BBj file → VS Code extension detects change
2. Extension notifies language client of document change
3. Language client sends `didChange` notification to language server
4. Language server parses document:
   - Lexer (`bbj-lexer.ts`) tokenizes input
   - Parser (`generated/grammar.ts`) builds AST from tokens
   - ValueConverter (`bbj-value-converter.ts`) normalizes values
   - TokenBuilder (`bbj-token-builder.ts`) builds token stream
5. DocumentBuilder triggers linking and validation:
   - Linker (`bbj-linker.ts`) resolves cross-references
   - ScopeProvider (`bbj-scope.ts`) builds symbol scopes
   - Validator (`bbj-validator.ts`) checks semantic rules
6. IndexManager updates workspace symbol index
7. Completion/Hover/Signature providers use analyzed AST for IDE features
8. SemanticTokenProvider generates syntax highlighting
9. Language server publishes diagnostics (errors/warnings) back to client

**Java Interop Flow:**

1. BBj file references Java class: `DIM obj AS JavaClass`
2. Linker encounters unresolved reference to `JavaClass`
3. Linker queries JavaInteropService for `JavaClass`
4. JavaInteropService connects to Java backend (socket) if needed
5. Java backend reflects on classpath, returns class metadata
6. JavaInteropService caches result
7. Linker resolves reference to synthetic JavaClass node
8. Type inferer tracks type for member calls (e.g., `obj!method()`)
9. Completion provider offers Java methods/fields in context

**State Management:**

- **Document State**: Tracked per file (Parsed → Linked → Validated)
- **Symbol Cache**: Workspace-wide index of classes, functions, fields
- **Type Cache**: BBjTypeInferer memoizes expression types
- **Java Classes Cache**: JavaInteropService caches reflection results per FQN
- **Scope Cache**: Built incrementally from document parsing order

## Key Abstractions

**AST (Abstract Syntax Tree):**
- Purpose: Represents parsed BBj program structure
- Examples: `Program`, `Statement`, `Expression`, `Class`, `MethodDecl`
- Location: `bbj-vscode/src/language/generated/ast.ts`
- Pattern: Generated by Langium from grammar, extended with custom properties

**Services:**
- Purpose: Composable language features via dependency injection
- Examples: `BBjServices`, `LangiumServices`, `BBjAddedServices`
- Location: `bbj-vscode/src/language/bbj-module.ts`
- Pattern: Module-based composition using Langium's service registry

**Providers:**
- Purpose: Langium-compatible implementations of LSP features
- Examples: `BBjCompletionProvider`, `BBjHoverProvider`, `BBjValidator`
- Location: `bbj-vscode/src/language/bbj-*-provider.ts`
- Pattern: Extend Langium defaults, override specific methods

**Reference & Scope:**
- Purpose: Cross-reference resolution and symbol visibility
- Examples: `BbjScopeProvider`, `BbjScopeComputation`, `BbjLinker`
- Location: `bbj-vscode/src/language/bbj-scope*.ts`, `bbj-linker.ts`
- Pattern: Langium scoping framework with custom symbol matching rules

**Java Integration:**
- Purpose: Seamless DDL-to-Java type and member access
- Examples: `JavaInteropService`, `BBjTypeInferer`
- Location: `bbj-vscode/src/language/java-interop.ts`, `bbj-type-inferer.ts`
- Pattern: Parallel AST nodes for Java classes/methods with cached metadata

## Entry Points

**VS Code Extension Entry:**
- Location: `bbj-vscode/src/extension.ts` (`activate()` function)
- Triggers: VS Code activates extension when BBj file is opened
- Responsibilities:
  - Initialize language client
  - Register VS Code commands (compile, run, decompile, etc.)
  - Manage extension settings and BBj home configuration
  - Launch language server subprocess

**Language Server Entry:**
- Location: `bbj-vscode/src/language/main.ts` (module execution)
- Triggers: Language client spawns as Node.js subprocess
- Responsibilities:
  - Create Langium services via `createBBjServices()`
  - Start LSP server on stdio/socket connection
  - Handle lifecycle (initialize, shutdown)

**Document Entry:**
- Location: `bbj-vscode/src/language/bbj.langium` (entry rule: `Model`)
- Triggers: Each BBj file parsed independently
- Responsibilities:
  - Parse as `Program` or `Library`
  - Extract top-level statements and class definitions

**Java Interop Entry:**
- Location: `java-interop/src/main/java/bbj/interop/SocketServiceApp.java`
- Triggers: External process started by bbj-vscode or manually
- Responsibilities:
  - Listen on port 5008 for JSON-RPC requests
  - Serve class metadata from classpath
  - Manage classloader for dynamic JAR loading

## Error Handling

**Strategy:** Multi-level error reporting with graceful degradation

**Patterns:**

1. **Parse Errors**: Lexer/Parser generate diagnostic with location
   - Reported as red squiggles in editor
   - Prevents linking of erroneous subtrees

2. **Linking Errors**: Unresolved references flagged
   - Reported in Problems panel
   - Type inference skips unresolved nodes

3. **Validation Errors**: Semantic checks during validation phase
   - Custom validators implement `ValidationChecks<T>`
   - Errors attached to specific AST nodes

4. **Java Interop Errors**: Connection/reflection failures
   - Caught in `JavaInteropService.connect()`
   - Errors logged, features degrade (e.g., no Java completion)

5. **Command Execution Errors**: Compiler/runtime failures
   - Process stderr captured in `execWithProgress()`
   - Errors shown in VS Code notification or output channel

## Cross-Cutting Concerns

**Logging:**
- Console methods: `console.log()`, `console.warn()`, `console.error()`, `console.debug()`
- Approach: Direct logging to VS Code output channel or browser console
- Performance threshold logging in `bbj-linker.ts` (>500ms operations)

**Validation:**
- Registered via `registerValidationChecks()` in `bbj-validator.ts`
- Approach: Registry-based validation with custom check implementations
- Examples: `checkReturnValueInDef()`, `checkMemberCallUsingAccessLevels()`

**Authentication:**
- Not applicable (language server is local, no remote auth)
- BBj connection via local home directory path

---

*Architecture analysis: 2026-02-01*
