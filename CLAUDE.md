# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Langium-based language server for BBj (BASIS Business Language) powering both a VS Code extension and an IntelliJ plugin through a single shared language server. The BBj language is **case-insensitive**.

## Repository Structure

- **`bbj-vscode/`** — VS Code extension + language server (TypeScript, Langium). This is where nearly all development happens.
- **`java-interop/`** — Java JSON-RPC socket service (port 5008) that provides classpath info (classes, fields, methods) to the language server.
- **`bbj-intellij/`** — IntelliJ plugin (Kotlin/Java) that wraps the same language server via LSP4IJ.
- **`documentation/`** — Docusaurus docs site, published at https://BBx-Kitchen.github.io/bbj-language-server/ (user guide, developer guide, roadmap).
- **`examples/`** — real-world BBj sample files, many named after GitHub issues (e.g. `issue190-switch-case.bbj`) as syntax regression material.
- **`QA/`** — manual smoke/full test checklists for release testing.

## Build & Test Commands

All commands run from `bbj-vscode/`:

```bash
npm install                    # Install dependencies
npm run langium:generate       # Regenerate AST/grammar from bbj.langium (run after grammar changes)
npm run build                  # TypeScript compile + esbuild bundle
npm run watch                  # Concurrent tsc + esbuild watch
npm test                       # Run all tests (vitest)
npx vitest run <file>          # Run a single test file, e.g. npx vitest run test/validation.test.ts
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report (V8)
npm run lint                   # ESLint
```

Java interop (from `java-interop/`):
```bash
./gradlew build
./gradlew run                  # Starts socket service on localhost:5008
```

IntelliJ plugin (from `bbj-intellij/`):
```bash
./gradlew build
```

## Architecture

### Langium Pipeline

The language server follows Langium's architecture with custom service overrides registered via dependency injection in `bbj-vscode/src/language/bbj-module.ts`. Key services:

- **Grammar**: `src/language/bbj.langium` — complete BBj syntax definition. Changes here require `npm run langium:generate` to regenerate `src/language/generated/` (AST types in `ast.ts`, grammar in `grammar.ts`, DI module in `module.ts`). Never edit generated files directly.
- **Scope/Linking**: `bbj-scope.ts` (name provider + scope provider), `bbj-scope-local.ts` (scope computation/LocalSymbols), `bbj-linker.ts` (cross-file reference linking)
- **Validation**: `bbj-validator.ts` (main validator registering checks), `bbj-document-validator.ts` (document-level validation with BBjCPL compiler integration), plus `validations/check-classes.ts`, `validations/check-variable-scoping.ts`, `validations/line-break-validation.ts`
- **Completion**: `bbj-completion-provider.ts`
- **Type inference**: `bbj-type-inferer.ts`
- **Java interop**: `java-interop.ts` — connects to the java-interop socket service to resolve Java classes/methods/fields for completion and hover
- **Lexer**: `bbj-lexer.ts` — custom lexer with line-continuation handling (`prepareLineSplitter`)
- **CPL integration**: `bbj-cpl-service.ts`, `bbj-cpl-parser.ts` — integration with BBj's native compiler for diagnostics

### DI Module Pattern

Services are wired in `bbj-module.ts` via `createBBjServices()`. Custom service groups:
- `services.java.JavaInteropService` — Java classpath integration
- `services.types.Inferer` — type inference
- `services.compiler.BBjCPLService` — BBj compiler integration
- `services.validation.BBjValidator` — validation checks

### Testing Pattern

Tests use Vitest with Langium's `EmptyFileSystem` and test utilities:

```typescript
import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);
```

For tests needing Java interop, use `createBBjTestServices` from `test/bbj-test-module.ts`, which injects `JavaInteropTestService` with fake Java classes (BBjAPI, HashMap, String) and a `TestableBBjLexer`.

Helper functions in `test/test-helper.ts`: `initializeWorkspace()`, `findFirst()`, `findByIndex()`.

Every `.bbj` file in `test/test-data/` is automatically parsed by `example-files.test.ts` and must produce zero lexer/parser errors — drop a file there to add a parsing regression test.

### IDE Integration

Both VS Code and IntelliJ consume the same language server binary (`out/language/main.cjs`). The IntelliJ plugin bundles the compiled LS and TextMate grammar, and connects via LSP4IJ. Both share:
- TextMate grammar: `syntaxes/bbj.tmLanguage.json`
- Run tools: `web.bbj`, `em-login.bbj`

### AST Type Constants

Langium 4.x uses `ClassName` (the string type constant) for `$type` checks. For example: `$type: JavaClass` (not a string literal). Use `isXxx()` type guard functions from `generated/ast.ts` for runtime type checks.
