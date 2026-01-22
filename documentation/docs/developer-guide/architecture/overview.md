---
sidebar_position: 1
title: Overview
---

# Architecture Overview

The BBj Language Server project consists of three main components that work together to provide comprehensive IDE support for BBj development.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Extension Host (TypeScript)             │    │
│  │  - Commands (Run, Compile, Decompile)               │    │
│  │  - Configuration management                          │    │
│  │  - UI integration                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                     LSP Protocol                             │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Language Server (Langium-based)            │    │
│  │  - Parsing and validation                            │    │
│  │  - Code completion                                   │    │
│  │  - Hover information                                 │    │
│  │  - Navigation (Go to Definition, References)         │    │
│  │  - Semantic tokens                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                     JSON-RPC (Port 5008)
                            │
┌─────────────────────────────────────────────────────────────┐
│               Java Interop Service (Java)                    │
│  - Classpath introspection                                   │
│  - Class/method/field reflection                             │
│  - JavaDoc extraction                                        │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. VS Code Extension (`/bbj-vscode/`)

The main entry point for users. This TypeScript-based extension:

- Registers the BBj language with VS Code
- Provides commands for running, compiling, and managing BBj programs
- Launches and communicates with the language server
- Manages configuration and settings

**Key Files:**
- `src/extension.ts` - Extension activation and command registration
- `src/Commands/Commands.cjs` - VS Code command implementations
- `package.json` - Extension manifest and contribution points

### 2. Language Server (Langium-based)

Built on the [Langium](https://langium.org/) framework, the language server implements the Language Server Protocol (LSP) to provide:

- **Parsing**: Grammar-based parsing of BBj source files
- **Validation**: Syntax and semantic error detection
- **Completion**: Context-aware code suggestions
- **Hover**: Documentation and type information
- **Navigation**: Go to definition, find references
- **Semantic Tokens**: Rich syntax highlighting

**Key Files:**
- `src/language/bbj.langium` - BBj grammar definition
- `src/language/bbj-module.ts` - Dependency injection module
- `src/language/bbj-completion-provider.ts` - Code completion
- `src/language/bbj-validator.ts` - Validation rules

### 3. Java Interop Service (`/java-interop/`)

A standalone Java application that provides reflection-based information about Java classes:

- Listens on port 5008 for JSON-RPC requests
- Introspects classpath to discover available classes
- Returns class information (methods, fields, constructors)
- Extracts JavaDoc documentation

**Key Files:**
- `src/main/java/bbj/interop/SocketServiceApp.java` - Main entry point
- `src/main/java/bbj/interop/InteropService.java` - Core service implementation

## Communication Flow

### Startup Sequence

1. User opens a `.bbj` file in VS Code
2. Extension activates and starts the language server process
3. Language server initializes Langium services
4. Java interop service is started (or connected to if already running)
5. Extension is ready for use

### Request Flow

1. **User Action**: User types in editor
2. **VS Code**: Sends LSP request to language server
3. **Language Server**: Processes request using Langium services
4. **Java Interop** (if needed): Language server queries Java service for class info
5. **Response**: Results returned through LSP to VS Code
6. **Display**: VS Code shows completions, diagnostics, etc.

## File Types

The extension supports multiple BBj file types:

| Extension | Description | Language ID |
|-----------|-------------|-------------|
| `.bbj` | BBj source files | `bbj` |
| `.bbl` | BBj library files | `bbj` |
| `.bbjt` | BBj template files | `bbj` |
| `.bbx` | BBj configuration files | `bbx` |

## Dependencies

### TypeScript/Node.js

- **Langium** (~3.2.1) - Language server framework
- **Chevrotain** (~11.0.3) - Parser generator
- **vscode-languageclient/server** - LSP implementation

### Java

- **LSP4J** (0.20.1) - JSON-RPC communication
- **Guava** (31.1) - Utility library
- **Java 17+** - Runtime requirement
