# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Building the project

**bbj-vscode directory:**
```bash
cd bbj-vscode
npm install             # Install dependencies
npm run build          # Build the extension
npm run watch          # Watch mode for development
npm run langium:generate  # Generate Langium language files
```

**java-interop directory:**
```bash
cd java-interop
./gradlew assemble     # Build Java components
./gradlew run          # Run the Java interop service
```

### Testing
```bash
cd bbj-vscode
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Linting
```bash
cd bbj-vscode
npm run lint           # Run ESLint on src and test directories
```

### Development workflow
```bash
npm run prepare        # Run langium:generate and build
npm run esbuild        # Bundle extension with sourcemaps
npm run esbuild-watch  # Bundle in watch mode
```

## Architecture Overview

This project implements a BBj language server and VS Code extension with two main components:

### 1. bbj-vscode - Language Server & Extension
- **Langium-based Language Server**: Provides parsing, validation, code completion, and other language features
- **Main entry points**:
  - `src/extension.ts`: VS Code extension activation and command registration
  - `src/language/main.ts`: Language server initialization
  - `src/language/bbj.langium`: BBj grammar definition using Langium DSL
  
- **Key services**:
  - `bbj-validator.ts`: Custom validation rules
  - `bbj-completion-provider.ts`: Code completion logic
  - `bbj-hover.ts`: Hover information provider
  - `bbj-linker.ts`: Reference resolution
  - `bbj-scope.ts` & `bbj-scope-local.ts`: Scope computation
  - `bbj-lexer.ts`: Custom lexer implementation
  
- **Java interop integration**: The extension communicates with a Java service to resolve Java types and BBj built-in types

### 2. java-interop - Java Type Resolution Service
- **Socket-based JSON-RPC service** that provides Java classpath information
- **Main classes**:
  - `SocketServiceApp.java`: Entry point, listens on port 5007
  - `InteropService.java`: Handles requests for class, method, and field information
  - `LanguageServer.java`: JSON-RPC endpoint implementation
  
- **Integration with BBj**: Can run inside BBj Services for full BBj type resolution

## Key Design Patterns

1. **Langium Framework**: The language server uses Langium's declarative grammar and service architecture
2. **Generated Code**: Parser and AST types are generated from `bbj.langium` grammar file
3. **File System Providers**: Custom file system provider for BBj library files (`bbl:` scheme)
4. **Document Building**: Custom document builder manages workspace indexing
5. **Token Building**: Custom token builder for syntax highlighting

## Important Notes

- The extension requires Java 21 and BBj 24.00+
- Java interop service must be running for full type resolution
- The formatter uses an external BBjCodeFormatter JAR file
- Extension can run BBj programs in GUI, BUI, or DWC modes
- Supports .bbj, .bbl, and .bbjt file extensions