# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.8.3 - Core VS Code extension and language server implementation
- JavaScript (CommonJS) - Build and command scripts (esbuild, Commands.cjs)
- Java 17 - Java interoperability service for classpath introspection

**Secondary:**
- JSON - Configuration files, syntax definitions, grammar definitions
- TextMate Grammar JSON - Language syntax highlighting definitions (`bbj.tmLanguage.json`, `bbx.tmLanguage.json`)

## Runtime

**Environment:**
- Node.js 16+ (configured via `tsconfig.json` module target "Node16")
- Java Runtime Environment (JRE) 17+ for java-interop service
- VS Code 1.67.0+ (extension target platform)

**Package Manager:**
- npm (Node.js package manager)
- Gradle 7.x (Java build management via `java-interop/gradlew`)
- Lockfile: `bbj-vscode/package-lock.json` (present)

## Frameworks

**Core:**
- Langium 3.2.1 - Language engineering framework for DSL development
- VS Code Language Server Protocol (LSP) - via `vscode-languageclient` 9.0.1 and `vscode-languageserver` for node.js

**Testing:**
- Vitest 1.6.1 - Unit and integration test framework
- JUnit 5.9.1 - Java unit testing framework

**Build/Dev:**
- TypeScript 5.8.3 - Static type checking and transpilation
- esbuild 0.25.12 - Fast bundler for extension bundling
- Concurrently 8.2.2 - Run multiple npm scripts concurrently
- Langium CLI 3.2.0 - Code generation for Langium DSL artifacts
- ESLint 8.57.1 - JavaScript/TypeScript linting
- Chevrotain 11.0.3 - Parser framework (used by Langium)

## Key Dependencies

**Critical:**
- `langium` 3.2.1 - Why it matters: Core language engineering framework; enables DSL parsing, semantic analysis, and code generation for the BBj language
- `vscode-languageclient` 9.0.1 - Why it matters: Connects VS Code extension to language server via JSON-RPC protocol
- `vscode-languageserver` - Why it matters: Provides LSP protocol implementation on server side
- `chevrotain` 11.0.3 - Why it matters: Parser combinator library; used by Langium for grammar-based parsing

**Infrastructure:**
- `vscode-jsonrpc` 8.2.1 - JSON-RPC message protocol for client-server communication
- `vscode-uri` 3.1.0 - URI handling for VS Code documents
- `properties-reader` 2.3.0 - Parsing BBj.properties files for classpath configuration
- `properties-file` 3.6.3 - Alternative properties file handling

**Java Interop:**
- `org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc:0.20.1` - JSON-RPC for Java-side communication
- `com.google.guava:guava:31.1-jre` - Google utilities library

## Configuration

**Environment:**
- Configuration stored in VS Code workspace settings under `bbj.*` namespace (see `package.json` contributes.configuration)
- BBj home directory configured via `bbj.home` setting
- Build debug options: `DEBUG_BREAK` and `DEBUG_SOCKET` environment variables control language server debugging

**Build:**
- `tsconfig.json` - TypeScript compiler configuration (ES6 target, Node16 module resolution, strict mode)
- `.eslintrc.json` - ESLint configuration with @typescript-eslint parser
- `vitest.config.ts` - Vitest test framework configuration
- `esbuild.mjs` - ESBuild bundler configuration for extension output
- `java-interop/build.gradle` - Gradle build configuration for Java service

## Platform Requirements

**Development:**
- Node.js 16+ (LTS recommended)
- Java Development Kit (JDK) 17+
- npm (comes with Node.js)
- Gradle wrapper (included in java-interop directory)
- TypeScript 5.8.3+ (installed via npm)

**Production:**
- VS Code 1.67.0+
- BBj runtime (external, not included; configured via `bbj.home` setting)
- Java Runtime Environment 17+ (for java-interop service)
- Node.js runtime (bundled with VS Code extension)

## Output & Artifacts

**Build Output:**
- `out/extension.cjs` - Main VS Code extension entry point (transpiled from `src/extension.ts`)
- `out/main.cjs` - Language server entry point (transpiled from `src/language/main.ts`)
- `java-interop/build/libs/` - Java JAR artifacts

---

*Stack analysis: 2026-02-01*
