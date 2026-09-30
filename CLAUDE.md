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
npm test                       # Run all tests (vitest); BBj/Java-dependent tests are skipped unless BBj is reachable
npm run test:bbj               # Run all tests incl. BBj-side tests (RUN_BBJ_TESTS=1); needs java-interop up on :5008
npx vitest run <file>          # Run a single test file, e.g. npx vitest run test/validation.test.ts
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report (V8)
npm run lint                   # ESLint
npm run typecheck:test         # tsc --noEmit over the test tree and the interop harness (tsconfig.test.json + tsconfig.harness.json)
npm run interop-harness -- --host … --port …   # Java interop test harness against a live interop peer (writes tools/interop-test-harness/report.html)
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
Build `bbj-vscode` first — `./gradlew build` (or `buildPlugin`) fails fast if `bbj-vscode/out/language/main.cjs` is missing; any host JDK works, since JDK 17 is provisioned automatically.

### CI gates

Every pull request to `main` runs `.github/workflows/build.yml`: build, `npm run lint`,
`npm run typecheck:test`, then `npm test`, then packages a test VSIX — any failing step fails
the PR. `.github/workflows/workflow-hygiene.yml` runs three dependency-free checkers from the
repo root on every push and pull request to `main`; run them locally before pushing a workflow
change:
```bash
node bbj-vscode/tools/check-workflow-secrets.mjs .github/workflows .github/actions/*        # no inline secrets in run: bodies
node bbj-vscode/tools/check-gradle-wrapper.mjs                                              # wrapper checksum pinned and validated
node bbj-vscode/tools/check-action-pins-and-permissions.mjs                                 # actions SHA-pinned, least-privilege permissions
```

## Architecture

### Langium Pipeline

The language server follows Langium's architecture with custom service overrides registered via dependency injection in `bbj-vscode/src/language/bbj-module.ts`. Key services:

- **Grammar**: `src/language/bbj.langium` — complete BBj syntax definition. Changes here require `npm run langium:generate` to regenerate `src/language/generated/` (AST types in `ast.ts`, grammar in `grammar.ts`, DI module in `module.ts`). Never edit generated files directly.
- **Scope/Linking**: `bbj-scope.ts` (name provider + scope provider), `bbj-scope-local.ts` (scope computation/LocalSymbols), `bbj-linker.ts` (cross-file reference linking)
- **Validation**: `bbj-validator.ts` (main validator registering checks), `bbj-document-validator.ts` (document-level validation with BBjCPL compiler integration), plus the modules in `validations/`: `check-classes.ts` (registers only the class checks below via `registerClassChecks`), `class-types.ts` (shared class-type helpers — `classFqn`, `bbjSupertypesReach` — used by the class checks and variable-scoping), `check-cyclic-inheritance.ts` (detects a cyclic BBj class inheritance chain), `check-class-reference.ts` (class reference resolution and PUBLIC/PROTECTED/PRIVATE visibility), `check-return-types.ts` (METHODRET and field-initializer type checks), `check-constructor.ts` (interface instantiability and constructor argument-count checks), `check-unknown-java-member.ts` (flags an unknown member access on a fully resolved Java class), `check-function-calls.ts`, `check-variable-scoping.ts`, `line-break-validation.ts`
- **Completion**: `bbj-completion-provider.ts` (`CompletionProvider`). `bbj-module.ts`'s `lsp` service group registers eight further LSP feature providers alongside it: `DocumentSymbolProvider` (`bbj-document-symbol-provider.ts`), `DefinitionProvider` (`bbj-definition-provider.ts`), `HoverProvider` (`bbj-hover.ts`), `SemanticTokenProvider` (`bbj-semantic-token-provider.ts`), `SignatureHelp` (`bbj-signature-help-provider.ts`), `InlayHintProvider` (`bbj-inlay-hint-provider.ts`), `CodeActionProvider` (`bbj-code-action-provider.ts`), and `CodeLensProvider` (`BBjComposerCodeLensProvider` in `composer-codelens.ts` — the composer cues on `addWindow`, MSGBOX, `addChildWindow`, CVS() and in-code SETOPTS)
- **Type inference**: `bbj-type-inferer.ts`
- **Java interop**: `java-interop.ts` (`JavaInteropService`) is a thin wiring/delegate front over several split-out modules: `java-interop-connection.ts` (the shared socket + JSON-RPC connection, its circuit breaker and the `parseProgram` lane), `java-interop-cache.ts` (the bounded cache of resolved Java classes, the package tree, and the class resolution pipeline), `java-interop-class-index.ts` (the simple-name index of every known class, used for missing-`use` suggestions), `java-interop-classpath.ts` (loads the configured classpath and implicit imports into the synthetic classpath document), and `java-interop-lock.ts` (the re-entrant FIFO lock serializing Java class resolution). `java-peer-guard.ts` bounds, escapes and validates Java class data arriving from the interop peer before it reaches the AST, hover, or completion. `java-javadoc.ts` (`JavadocProvider`) provides Javadoc information for internal binary classes.
- **Lexer**: `bbj-lexer.ts` — custom lexer with line-continuation handling (`prepareLineSplitter`)
- **CPL integration**: `bbj-cpl-service.ts`, `bbj-cpl-parser.ts` — integration with BBj's native compiler for diagnostics; `bbj-parser-service.ts` (`BBjParserService`) — live compiler diagnostics from BBj's own parser via the `parseProgram` endpoint, probed and latched once per connection generation.

### DI Module Pattern

Services are wired in `bbj-module.ts` via `createBBjServices()`. Custom service groups:
- `services.java.JavaInteropService` — Java classpath integration
- `services.java.JavadocProvider` — injected per services set; there is no static singleton
- `services.types.Inferer` — type inference
- `services.compiler.BBjCPLService` — BBj compiler integration
- `services.compiler.BBjParserService` — live parser diagnostics
- `services.validation.BBjValidator` — validation checks

### Testing Pattern

Tests use Vitest with Langium's `EmptyFileSystem` and test utilities. `createBBjTestServices` from
`test/bbj-test-module.ts` is the default entry point for new tests:

```typescript
import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { createBBjTestServices } from './bbj-test-module.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);
```

It is hermetic — it injects `JavaInteropTestService` (fake Java classes such as BBjAPI, HashMap
and String; see the file for the full set) and `TestableBBjLexer`, and accepts an optional
`JavadocProvider`, so tests never reach the real java-interop socket or a shared javadoc
singleton. `createBBjServices` from `../src/language/bbj-module.js` is the production entry
point — reach for it only when a test deliberately needs the real services.

Helper functions in `test/test-helper.ts`: `initializeWorkspace()`, `findFirst()`, `findByIndex()`.

Every `.bbj` file in `test/test-data/` is automatically parsed by `example-files.test.ts` and must produce zero lexer/parser errors — drop a file there to add a parsing regression test.

### IDE Integration

Both VS Code and IntelliJ consume the same language server binary (`out/language/main.cjs`). The IntelliJ plugin bundles the compiled LS and TextMate grammar, and connects via LSP4IJ. Both share:
- TextMate grammar and language configuration: `syntaxes/bbj.tmLanguage.json`, `syntaxes/bbx.tmLanguage.json`, `bbj-language-configuration.json`, `bbx-language-configuration.json` (copied byte-identically into the IntelliJ plugin bundle by `bbj-intellij/build.gradle.kts`'s `copyTextMateBundle` task)
- Run tools: `web.bbj`, `em-login.bbj`

### AST Type Constants

Langium 4.x uses `ClassName` (the string type constant) for `$type` checks. For example: `$type: JavaClass` (not a string literal). Use `isXxx()` type guard functions from `generated/ast.ts` for runtime type checks.

### Shell and File-Access Rules

The Claude Code permission hooks block reads of `.env` and other secret-bearing files, and they cannot tell a scoped search from a secret read when a shell command is opaque. A chained `cd … && grep …`, a relative path, or a bare recursive `grep -r`/`find`/`cat` over a directory trips that block and forces a manual approval prompt. To keep the hooks quiet and the run autonomous:

- **Search and read with the built-in tools first:** use `Grep` for content search, `Glob` for file discovery, and `Read` for file contents. Only fall back to shell `grep`/`find`/`cat` when a built-in tool genuinely cannot do the job (for example a pipeline into another program).
- **Every shell path is absolute and complete.** Name the exact file or the exact directory from the repo root (`/home/coder/repos/bbj-language-server/...`); never rely on the current working directory, and never use `.`/`..` or `~` shortcuts as the search target.
- **Never chain `cd` with `grep`, `find`, `cat`, `sed`, `head`, or `tail`.** Run the command directly against the absolute path instead of changing directory first. `cd` is acceptable only in front of a build tool that needs its project directory (`cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew …`, `npm --prefix …` is preferred where the tool supports it).
- **No blind recursive scans.** `grep -r` and `find` over a directory sweep secret files by accident; scope the target to the specific files or subtree needed (`--include` / `-name` filters, or the `Grep` tool with a `glob`), and never point any read at `.env*`, `*.pem`, `*.key`, or credential stores.
- **Scope commit staging the same way:** `git add <exact path>` only, never `git add -A` or `git add .`.
