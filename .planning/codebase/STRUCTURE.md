# Codebase Structure

**Analysis Date:** 2026-09-21

## Directory Layout

```
bbj-language-server/
├── bbj-vscode/                    # Main VS Code extension + language server (TypeScript, Langium)
│   ├── src/
│   │   ├── language/              # Core language server services
│   │   │   ├── bbj.langium        # Grammar definition (case-insensitive BBj syntax)
│   │   │   ├── bbj-module.ts      # Dependency injection wiring for all services
│   │   │   ├── generated/         # Auto-generated from grammar (never edit directly)
│   │   │   │   ├── ast.ts         # AST type definitions
│   │   │   │   ├── grammar.ts     # Compiled grammar rules
│   │   │   │   └── module.ts      # Generated service module
│   │   │   ├── lib/               # Built-in library definitions
│   │   │   │   ├── fs-provider.ts # Virtual filesystem for .bbl files
│   │   │   │   ├── functions.ts   # BBj built-in functions (hand-maintained)
│   │   │   │   ├── functions.bbl  # Built-in function declarations (hand-synced with functions.ts)
│   │   │   │   └── events.ts      # UI event types
│   │   │   ├── validations/       # Delegated validation checks
│   │   │   │   ├── check-classes.ts
│   │   │   │   ├── check-variable-scoping.ts
│   │   │   │   ├── check-function-calls.ts
│   │   │   │   └── line-break-validation.ts
│   │   │   ├── Parsing & Tokenization
│   │   │   │   ├── bbj-lexer.ts               # Custom lexer with line-continuation handling
│   │   │   │   └── bbj-token-builder.ts      # Custom token patterns
│   │   │   ├── Scope & Linking (Name Resolution)
│   │   │   │   ├── bbj-scope.ts              # Symbol scope provider + cross-reference resolution
│   │   │   │   ├── bbj-scope-local.ts        # Local symbol computation for blocks/methods
│   │   │   │   └── bbj-linker.ts             # Cross-file reference linking
│   │   │   ├── Type Analysis
│   │   │   │   ├── bbj-type-inferer.ts       # Variable/expression type inference
│   │   │   │   └── bbj-value-converter.ts    # Langium value conversion
│   │   │   ├── Validation
│   │   │   │   ├── bbj-validator.ts          # Main validation service + check registration
│   │   │   │   └── bbj-document-validator.ts # Document-level validation + CPL compiler integration
│   │   │   ├── Java Integration
│   │   │   │   ├── java-interop.ts           # Java class resolution via socket :5008
│   │   │   │   ├── java-javadoc.ts           # Javadoc parsing and formatting
│   │   │   │   ├── java-class-reload.ts      # Hot reload for classpath changes
│   │   │   │   └── java-types.langium        # Java class/method/field AST definitions
│   │   │   ├── Compiler Integration
│   │   │   │   ├── bbj-cpl-service.ts        # BBj compiler (CPL) integration for diagnostics
│   │   │   │   └── bbj-cpl-parser.ts         # CPL error message parsing
│   │   │   ├── Workspace Management
│   │   │   │   ├── bbj-ws-manager.ts         # Workspace document tracking
│   │   │   │   ├── bbj-document-builder.ts   # Document lifecycle (parse → link → validate)
│   │   │   │   └── bbj-index-manager.ts      # Symbol index for workspace-wide lookups
│   │   │   ├── LSP Feature Providers
│   │   │   │   ├── bbj-completion-provider.ts        # Autocompletion (keywords, variables, classes)
│   │   │   │   ├── bbj-hover.ts                      # Hover tooltip with type/doc info
│   │   │   │   ├── bbj-definition-provider.ts        # Go-to-definition
│   │   │   │   ├── bbj-semantic-token-provider.ts    # Syntax highlighting token ranges
│   │   │   │   ├── bbj-signature-help-provider.ts    # Function/method parameter hints
│   │   │   │   ├── bbj-inlay-hint-provider.ts        # Inline type/parameter annotations
│   │   │   │   ├── bbj-code-action-provider.ts       # Quick fixes and refactorings
│   │   │   │   ├── bbj-document-symbol-provider.ts   # Outline and breadcrumb navigation
│   │   │   │   ├── composer-codelens.ts              # Code lens for composers (UI builder)
│   │   │   │   └── bbj-comment-provider.ts           # JSDoc-style documentation parsing
│   │   │   ├── Code Lens Handlers (Composers)
│   │   │   │   ├── composer-codelens-handler.ts
│   │   │   │   └── composer-commands.ts
│   │   │   ├── Configuration
│   │   │   │   ├── config-path-resolver.ts    # Resolves BBx config file path
│   │   │   │   ├── config-watcher.ts          # Watches config file for changes
│   │   │   │   ├── compiler-options.ts        # BBj compiler option definitions
│   │   │   │   └── compile-command.ts         # Compile command builder
│   │   │   ├── Utilities
│   │   │   │   ├── bbj-node-kind.ts           # LSP node kind provider
│   │   │   │   ├── bbj-nodedescription-provider.ts  # AST node descriptions for indexing
│   │   │   │   ├── bbj-use-insert.ts          # Automatic USE statement insertion
│   │   │   │   ├── bbj-hover-handler.ts       # Hover rendering helpers
│   │   │   │   ├── bbj-overload-selector.ts   # Function overload selection
│   │   │   │   ├── bbj-notifications.ts       # Server-to-client notifications
│   │   │   │   ├── constants.ts               # Shared constants
│   │   │   │   └── logger.ts                  # Logging utility
│   │   ├── Commands/                # VS Code command implementations
│   │   │   ├── process-runner.ts    # Execute external processes (BBj, bbjcpl)
│   │   │   ├── process-args.ts      # Build command arguments
│   │   │   ├── target-resolution.ts # Resolve active BBj file to run/compile
│   │   │   ├── CompilerOptions.ts   # Compiler option picker UI
│   │   │   └── Commands.cjs         # Command registry (must-run, em-login, etc.)
│   │   ├── Composer UI (Web Views) # UI builder UI
│   │   │   ├── msgbox-composer*.ts
│   │   │   ├── addwindow-composer*.ts
│   │   │   ├── addchildwindow-composer*.ts
│   │   │   ├── cvs-composer*.ts
│   │   │   ├── setopts-composer*.ts
│   │   │   └── setopts-catalog.ts
│   │   ├── Utilities
│   │   │   ├── extension.ts               # VS Code extension entry point + client setup
│   │   │   ├── document-formatter.ts      # Document formatter implementation
│   │   │   ├── tokenized-bbj.ts           # Tokenized source detection
│   │   │   ├── line-numbering.ts          # Line number tracking for sources
│   │   │   ├── restart-gate.ts            # Language server restart coordination
│   │   │   ├── webview-panel-lifecycle.ts # Web view panel management
│   │   │   ├── webview-nonce.ts           # Security nonce for web views
│   │   │   ├── config-path-cache.ts       # Cache active config path
│   │   │   ├── formatter-verifier.ts      # Formatter correctness checks
│   │   │   └── bbj-home-layout.ts         # BBj home directory structure
│   │   ├── syntaxes/                # TextMate grammar definitions
│   │   │   ├── bbj.tmLanguage.json  # BBj syntax highlighting grammar
│   │   │   └── bbx.tmLanguage.json  # BBx config syntax highlighting
│   │   ├── snippets/                # VS Code code snippets
│   │   │   └── bbj.json
│   │   ├── images/                  # Icons and visual assets
│   │   ├── test/
│   │   │   ├── bbj-test-module.ts            # Test service factory (mock Java interop)
│   │   │   ├── test-data/
│   │   │   │   ├── *.bbj                    # Example BBj files for parsing regression
│   │   │   │   ├── conformance/             # Conformance test suite (details.json, flagged.txt)
│   │   │   │   └── cpl-fixture-*/           # BBj home fixtures for compiler tests
│   │   │   ├── *.test.ts                    # Unit/integration tests (Vitest)
│   │   │   ├── functional/                  # Functional tests
│   │   │   └── support/                     # Test helpers
│   │   ├── package.json              # VS Code extension manifest + npm build config
│   │   ├── tsconfig.json             # TypeScript configuration
│   │   └── esbuild.mjs               # esbuild bundler script (vitest.config.ts holds test config)
│   ├── bbj-language-configuration.json  # VS Code language config (indentation, brackets)
│   ├── bbx-language-configuration.json  # BBx config language config
│   └── out/                             # Build output (generated by npm run build)
│       └── language/
│           └── main.cjs               # Bundled language server (consumed by VS Code + IntelliJ)
│
├── java-interop/                    # Java backend for classpath resolution (Java, Gradle)
│   ├── src/main/java/
│   │   └── com/basis/bbj/interop/   # JSON-RPC socket service on port 5008
│   └── build.gradle.kts             # Gradle build config
│
├── bbj-intellij/                    # IntelliJ IDEA plugin (Kotlin, LSP4IJ)
│   ├── src/main/
│   │   ├── java/                    # IntelliJ plugin code
│   │   └── resources/               # TextMate grammars (copied from bbj-vscode)
│   ├── build.gradle.kts             # IntelliJ plugin build config
│   └── .intellijPlatform/           # Platform downloads and sandbox
│
├── documentation/                   # Docusaurus docs site
│   ├── docs/                        # Markdown documentation
│   ├── src/                         # Custom components
│   └── package.json                 # Docusaurus build config
│
├── examples/                        # Real-world BBj sample files
│   ├── issue*.bbj                   # Files named after GitHub issues (regression tests)
│   └── [subdirs]/
│
├── QA/                              # Manual testing checklists
│   └── test-runs/                   # Smoke/full test results
│
├── .planning/                       # GSD milestones, phases, research
│   ├── codebase/                    # These analysis documents (ARCHITECTURE.md, etc.)
│   ├── phases/                      # Work phases (phase-NN-*.md)
│   ├── milestones/                  # Release milestones
│   └── research/                    # Investigation notes
│
├── .devcontainer/                   # Dev container config (BBj :8888, java-interop :5008)
├── .claude/                         # Claude Code project settings
│   └── worktrees/                   # Git worktrees for parallel work
│
├── .gsd/                            # GSD tool state (milestones, phases, state tracking)
│
├── CLAUDE.md                        # Project guidelines (this repository)
└── README.md                        # Project overview

```

## Directory Purposes

**bbj-vscode/:**
The primary development directory. Contains the Langium-based language server and VS Code extension client in TypeScript. Built and bundled to `out/language/main.cjs`, which is consumed by both the VS Code extension and the IntelliJ plugin (via LSP4IJ).

**bbj-vscode/src/language/:**
Core language server implementation. Every major subsystem (lexer, parser, validator, Java interop, LSP providers) is here. Services are wired via dependency injection in `bbj-module.ts`.

**bbj-vscode/src/language/validations/:**
Separate validation checks (classes, scoping, function calls, line breaks) to keep the validator modular and testable.

**bbj-vscode/src/language/lib/:**
Built-in BBj library definitions (functions, events) and virtual filesystem provider for `.bbl` library files.

**bbj-vscode/src/language/generated/:**
Auto-generated from `bbj.langium` by `npm run langium:generate`. Contains AST types, grammar rules, and the generated DI module. **Never edit directly.**

**bbj-vscode/src/Commands/:**
VS Code command implementations (run, compile, show config, etc.) and their argument parsing.

**bbj-vscode/test/:**
Vitest unit and integration tests. Tests use `bbj-test-module.ts` to inject a mock Java interop service. Test data files (`.bbj` examples) in `test-data/` are auto-parsed by `example-files.test.ts` as regression tests.

**java-interop/:**
Separate Java/Gradle project providing a JSON-RPC socket service on `localhost:5008`. Returns Java class metadata (methods, fields, supertypes, javadoc). The language server connects to it for completion, hover, and type checking of Java interop code.

**bbj-intellij/:**
IntelliJ plugin wrapping the same language server (`out/language/main.cjs`) via LSP4IJ framework. Bundles TextMate grammars copied from `bbj-vscode/syntaxes/`.

**examples/:**
Real-world BBj sample files, many named after GitHub issues (e.g., `issue190-switch-case.bbj`) to track syntax regression tests.

## Key File Locations

**Entry Points:**
- `bbj-vscode/src/extension.ts` — VS Code extension activates here; starts LanguageClient
- `bbj-vscode/src/language/bbj-module.ts` — Language server entry point; wires all services via DI
- `bbj-intellij/build.gradle.kts` — IntelliJ plugin build (wraps language server)

**Configuration:**
- `bbj-vscode/package.json` — VS Code extension manifest (language, commands, settings, key bindings)
- `bbj-vscode/tsconfig.json` — TypeScript compiler options
- `bbj-vscode/esbuild.mjs` — esbuild bundler script producing `out/language/main.cjs`; `bbj-vscode/vitest.config.ts` — test runner config
- `bbj-vscode/bbj-language-configuration.json` — VS Code language behavior (indentation, brackets, block comments)

**Grammar & Parsing:**
- `bbj-vscode/src/language/bbj.langium` — Complete BBj grammar (the source of truth)
- `bbj-vscode/src/language/bbj-lexer.ts` — Custom lexer with line-continuation handling
- `bbj-vscode/src/language/bbj-token-builder.ts` — Custom token patterns
- `bbj-vscode/src/language/generated/ast.ts` — AST type definitions (auto-generated)

**Core Analysis:**
- `bbj-vscode/src/language/bbj-scope.ts` — Symbol resolution and scope provider
- `bbj-vscode/src/language/bbj-scope-local.ts` — Local scope computation
- `bbj-vscode/src/language/bbj-linker.ts` — Cross-file reference linking
- `bbj-vscode/src/language/bbj-type-inferer.ts` — Type inference
- `bbj-vscode/src/language/bbj-validator.ts` — Main validator + check registration

**Validation Checks:**
- `bbj-vscode/src/language/validations/check-classes.ts` — Class/interface validations
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — Variable scope checking
- `bbj-vscode/src/language/validations/check-function-calls.ts` — Function call validation
- `bbj-vscode/src/language/validations/line-break-validation.ts` — Line-break and continuation validation

**Java Integration:**
- `bbj-vscode/src/language/java-interop.ts` — Main Java interop service (socket :5008, LRU cache)
- `bbj-vscode/src/language/java-javadoc.ts` — Javadoc parsing and formatting
- `java-interop/src/main/java/com/basis/bbj/interop/` — Java backend implementation

**LSP Feature Providers:**
- `bbj-vscode/src/language/bbj-completion-provider.ts` — Autocompletion
- `bbj-vscode/src/language/bbj-hover.ts` — Hover information
- `bbj-vscode/src/language/bbj-definition-provider.ts` — Go-to-definition
- `bbj-vscode/src/language/bbj-semantic-token-provider.ts` — Syntax highlighting
- `bbj-vscode/src/language/bbj-signature-help-provider.ts` — Parameter hints
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` — Inlay hints
- `bbj-vscode/src/language/bbj-code-action-provider.ts` — Quick fixes
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` — Outline

**Workspace & Document Management:**
- `bbj-vscode/src/language/bbj-document-builder.ts` — Parse → Link → Validate lifecycle
- `bbj-vscode/src/language/bbj-ws-manager.ts` — Workspace document tracking
- `bbj-vscode/src/language/bbj-index-manager.ts` — Symbol indexing

**Compiler Integration:**
- `bbj-vscode/src/language/bbj-cpl-service.ts` — BBj CPL compiler service
- `bbj-vscode/src/language/bbj-document-validator.ts` — Document-level validation + CPL integration
- `bbj-vscode/src/language/compiler-options.ts` — Compiler option definitions

**Syntax Highlighting:**
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` — TextMate grammar for `.bbj/.bbl` files
- `bbj-vscode/syntaxes/bbx.tmLanguage.json` — TextMate grammar for config files

**Testing:**
- `bbj-vscode/test/bbj-test-module.ts` — Test service factory with mock Java interop
- `bbj-vscode/test/test-data/` — Example `.bbj` files for regression testing
- `bbj-vscode/test/*.test.ts` — Unit/integration tests (Vitest)

## Naming Conventions

**Files:**
- Services: `bbj-*.ts` (e.g., `bbj-validator.ts`, `bbj-completion-provider.ts`)
- Test data: `.bbj`, `.bbjt`, `.src`, `.bbx`, `.bbl` for source files
- Test files: `*.test.ts` (Vitest convention)
- Grammar: `*.langium` (Langium syntax definition)
- Configuration: `*.json`, `*.ts` (tsconfig, vitest.config, esbuild.mjs, package.json)
- Generated: `generated/` directory (never manually edited)

**Directories:**
- Services by subsystem: `language/` (parsing, analysis), `Commands/` (CLI), tests in `test/`
- Validation logic: `validations/` (separate checks)
- Built-in library: `lib/` (.bbl definitions, events)
- Test data: `test/test-data/` with subdirs for fixture types
- UI builder: `[component]-composer*.ts` (msgbox, addwindow, setopts, cvs)

**Exports & Modules:**
- Services exported from `bbj-module.ts` as `BBjServices` type (includes all custom + Langium services)
- Test utilities exported from `test/bbj-test-module.ts` (createBBjTestServices)
- AST types exported from `generated/ast.ts` (isXxx() type guards, classes)

## Where to Add New Code

**New LSP Feature (e.g., Code Lens):**
- Create `bbj-codelens-provider.ts` in `src/language/`
- Extend Langium's `DefaultCodeLensProvider` or implement `CodeLensProvider` interface
- Register in `BBjModule.lsp` in `bbj-module.ts`
- Wire into `extension.ts` via `client.start()`

**New Validation Check:**
- Create `validations/check-new-area.ts` with a function `registerNewAreaChecks(registry: ValidationRegistry)`
- Use `registry.register()` to bind check methods to AST node types
- Import and call the function from `bbj-validator.ts` in `registerValidationChecks()`
- Add test file `test/new-area-validations.test.ts` using `createBBjTestServices`

**New Service:**
- Create `src/language/new-service.ts` with class `NewService`
- Define in `BBjAddedServices` type in `bbj-module.ts`
- Wire in `BBjModule` and/or `BBjSharedModule`
- Inject via constructor into other services as `protected readonly newService: NewService`

**New Command:**
- Add command entry to `package.json` (`contributes.commands`)
- Implement handler in `src/Commands/` or directly in `extension.ts`
- Register handler in `extension.ts` via `context.subscriptions.push(vscode.commands.registerCommand(...))`

**New Test:**
- Create `test/feature-name.test.ts` using Vitest
- Import `createBBjTestServices`, `expect`, test runner
- Use test data fixtures from `test/test-data/` if needed
- Run with `npm test` or `npx vitest run test/feature-name.test.ts`

**Test Data (Example BBj Files):**
- Drop `.bbj` file in `test/test-data/` — it's auto-parsed by `example-files.test.ts`
- Name after issue: `issue123-feature.bbj` (helps track regression)
- Must parse with zero errors (lexer/parser contract)

## Special Directories

**generated/:**
- Purpose: Auto-generated Langium artifacts
- Files: `ast.ts` (types), `grammar.ts` (rules), `module.ts` (DI)
- Generated: `npm run langium:generate` from `bbj.langium`
- Committed: Yes (committed to git so builds don't need langium-cli)
- Edit: **Never** — re-run `langium:generate` after editing `bbj.langium`

**out/:**
- Purpose: Build output
- Files: `language/main.cjs` (bundled LS), `language/bbj.tmLanguage.json` (copied), source maps
- Generated: `npm run build` (esbuild + tsc)
- Committed: No (built on CI and locally)
- Clean: `git clean -fdx out/`

**test-data/cpl-fixture-*bbjhome/:**
- Purpose: Mock BBj home directories for compiler testing
- Structure: Each has `bin/`, `cfg/`, `lib/` directories + BBj.properties
- Used by: `bbj-cpl-service.ts` tests to mock compiler behavior
- Committed: Yes (fixtures needed for CI)

**.planning/:**
- Purpose: GSD milestone/phase/research tracking
- Subdirs: `phases/` (work plans), `milestones/` (releases), `research/` (investigation), `codebase/` (these docs)
- Committed: Yes (project documentation)

**syntaxes/:**
- Purpose: TextMate grammar (syntax highlighting)
- Files: `bbj.tmLanguage.json`, `bbx.tmLanguage.json`
- Copied: Into `bbj-intellij/src/main/resources/` by IntelliJ build
- Edit: JSON format; no generation step

**node_modules/, .gradle/, build/, .intellijPlatform/sandbox/:**
- Purpose: Dependency installations and build artifacts
- Committed: No (created by `npm install`, `./gradlew`, etc.)
- Clean: `npm install` / `./gradlew clean`

---

*Structure analysis: 2026-09-21*
