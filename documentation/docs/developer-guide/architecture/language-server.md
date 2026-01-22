---
sidebar_position: 2
title: Language Server
---

# Language Server Architecture

The BBj Language Server is built on the [Langium](https://langium.org/) framework, providing a grammar-based approach to language tooling.

## Langium Overview

Langium is a TypeScript framework for building language servers. It provides:

- Grammar definition language
- Automatic parser and AST generation
- Built-in LSP support
- Extensible service architecture

## Grammar Definition

The BBj grammar is defined in `src/language/bbj.langium`. This file specifies:

### Entry Rules

```langium
entry CompilationUnit:
    (declarations+=Declaration)*
;

Declaration:
    ClassDeclaration | InterfaceDeclaration | ProgramDeclaration
;
```

### Statements

The grammar covers all BBj verbs and statements:

- Control flow (IF, FOR, WHILE, SWITCH)
- I/O operations (PRINT, READ, WRITE, INPUT)
- File operations (OPEN, CLOSE, ERASE)
- Class definitions (CLASS, METHOD, FIELD)
- SQL operations (SQLOPEN, SQLEXEC, SQLPREP)
- And many more...

### Expressions

BBj expressions including:

- Arithmetic operations
- String operations
- Function calls
- Method invocations
- Array access

## Service Architecture

The language server uses dependency injection to wire together services.

### Module Definition

`bbj-module.ts` defines the service bindings:

```typescript
export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    validation: {
        BBjValidator: (services) => new BBjValidator(services)
    },
    java: {
        JavaInteropService: (services) => new JavaInteropService(services)
    },
    types: {
        Inferer: (services) => new TypeInferer(services)
    },
    // ... more services
};
```

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| `BBjValidator` | `bbj-validator.ts` | Semantic validation |
| `BBjCompletionProvider` | `bbj-completion-provider.ts` | Code completion |
| `BBjHoverProvider` | `bbj-hover.ts` | Hover information |
| `BBjScopeProvider` | `bbj-scope.ts` | Symbol resolution |
| `TypeInferer` | `bbj-type-inferer.ts` | Type inference |
| `JavaInteropService` | `java-interop.ts` | Java class integration |

## Parsing

### Lexer

The custom lexer (`bbj-lexer.ts`) handles BBj-specific tokenization:

- Case-insensitive keywords
- Line number handling
- String literals
- Comments (REM, //, /* */)

### Parser Configuration

```typescript
chevrotainParserConfig: {
    recoveryEnabled: true,
    nodeLocationTracking: "full"
}
```

- **Error Recovery**: Continues parsing after errors
- **Location Tracking**: Full source positions for all nodes

## Validation

### Syntax Validation

Automatic from grammar rules:
- Missing required elements
- Invalid token sequences
- Unclosed blocks

### Semantic Validation

Custom validation in `bbj-validator.ts`:

```typescript
@check(ClassDeclaration)
checkClassDeclaration(node: ClassDeclaration, accept: ValidationAcceptor): void {
    // Validate class structure
}
```

Common checks:
- Undefined variable references
- Invalid method signatures
- Access level violations
- File option compatibility

## Scope Resolution

### Global Scope

`bbj-scope.ts` provides workspace-wide symbol resolution:

- Class definitions
- Interface definitions
- Global variables
- Labels

### Local Scope

`bbj-scope-local.ts` handles block-level scoping:

- Method parameters
- Local variables
- FOR loop variables
- Nested block variables

## Completion

The completion provider (`bbj-completion-provider.ts`) offers:

### Keyword Completion

All BBj verbs and keywords based on grammar context.

### Member Completion

After `.` operator:
- Object methods
- Object fields
- Static members

### Java Class Completion

Integration with Java interop service for:
- Class names after `use` statements
- Method completions on Java objects
- Constructor parameters

## Built-in Libraries

The `lib/` directory contains BBj standard library definitions:

| File | Content |
|------|---------|
| `functions.bbl` | Built-in function signatures |
| `variables.bbl` | Global variable definitions |
| `events.bbl` | Event type definitions |
| `labels.bbl` | Standard label definitions |

These are automatically loaded and provide completion and validation support.

## Document Management

### Document Builder

`bbj-document-builder.ts` manages document lifecycle:

1. Document opened → Parse and validate
2. Document changed → Incremental update
3. Document closed → Release resources

### Workspace Manager

`bbj-ws-manager.ts` handles workspace-level operations:

- File watching
- Cross-file reference resolution
- Index updates

## Performance Considerations

- **Lazy Loading**: Classes loaded on demand
- **Caching**: Parsed documents and Java classes cached
- **Incremental Updates**: Only re-parse changed portions
- **Async Operations**: Non-blocking Java interop calls
