# Codebase Structure

**Analysis Date:** 2026-09-28

**last_mapped_commit:** 3a02c40ab6022a5dcc590e6a19bd9ce0f5cdebbb

## Directory Layout

```
bbj-language-server/
├── bbj-vscode/                    # Main VS Code extension + language server (TypeScript, Langium)
│   ├── src/
│   │   ├── language/              # Core language server services
│   │   │   ├── main.ts            # LSP server entry point (creates connection, wires services)
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
│   │   │   ├── Validation & Error Diagnostics
│   │   │   │   ├── bbj-validator.ts          # Main validation service + check registration
│   │   │   │   ├── bbj-document-validator.ts # Document-level validation + CPL compiler integration
│   │   │   │   ├── bbj-parser-service.ts     # Bridge to live BBj parser backend for parse errors
│   │   │   │   ├── bbj-diagnostic-reconciliation.ts  # Merge live parser diagnostics with Langium errors
│   │   │   │   └── bbj-kept-check.ts         # Incremental change tracking for error re-placement
│   │   │   ├── Java Integration
│   │   │   │   ├── java-interop.ts           # Java class resolution via socket :5008
│   │   │   │   ├── java-javadoc.ts           # Javadoc parsing and formatting
│   │   │   │   └── java-class-reload.ts      # Hot reload for classpath changes
│   │   │   ├── Compiler Integration
│   │   │   │   ├── bbj-cpl-service.ts        # BBj compiler (CPL) integration for diagnostics
│   │   │   │   └── bbj-cpl-parser.ts         # CPL error message parsing
│   │   │   ├── Workspace Management
│   │   │   │   ├── bbj-ws-manager.ts         # Workspace document tracking
│   │   │   │   ├── bbj-document-builder.ts   # Document lifecycle (parse → link → validate → reconcile)
│   │   │   │   └── bbj-index-manager.ts      # Symbol index for workspace-wide lookups
│   │   │   ├── LSP Feature Providers
│   │   │   │   ├── bbj-completion-provider.ts        # Autocompletion (keywords, variables, classes)
│   │   │   │   ├── bbj-hover.ts                      # Hover tooltip with type/doc info
│   │   │   │   ├── bbj-hover-handler.ts              # Config-aware hover rendering
│   │   │   │   ├── bbj-definition-provider.ts        # Go-to-definition
│   │   │   │   ├── bbj-semantic-token-provider.ts    # Syntax highlighting token ranges
│   │   │   │   ├── bbj-signature-help-provider.ts    # Function/method parameter hints
│   │   │   │   ├── bbj-inlay-hint-provider.ts        # Inline type/parameter annotations
│   │   │   │   ├── bbj-code-action-provider.ts       # Quick fixes and refactorings
│   │   │   │   ├── bbj-code-action-handler.ts        # Code action execution
│   │   │   │   ├── bbj-document-symbol-provider.ts   # Outline and breadcrumb navigation
│   │   │   │   ├── composer-codelens.ts              # Code lens for composers (UI builder)
│   │   │   │   └── bbj-comment-provider.ts           # JSDoc-style documentation parsing
│   │   │   ├── Code Lens Handlers (Composers)
│   │   │   │   ├── composer-codelens-handler.ts
│   │   │   │   └── composer-commands.ts
│   │   │   ├── Configuration & File Watching
│   │   │   │   ├── config-path-resolver.ts    # Resolves BBx config file path
│   │   │   │   ├── config-watcher.ts          # Watches config file for changes
│   │   │   │   ├── config-reload-notification.ts # Sends config change notifications
│   │   │   │   ├── compiler-options.ts        # BBj compiler option definitions
│   │   │   │   ├── resolved-config-path-request.ts # Handles config path requests
│   │   │   │   └── compile-command.ts         # Compile on-demand handler
│   │   │   ├── Request/Notification Handlers
│   │   │   │   ├── bbj-notifications.ts       # Server→client notifications
│   │   │   │   ├── setopts-in-code-request.ts # SETOPTS inline request handler
│   │   │   │   ├── setopts-code-scanner.ts    # Parse SETOPTS in source
│   │   │   │   ├── bbj-document-update-handler.ts   # Save event handling
│   │   │   │   └── run-call-target.ts         # RUN target resolution
│   │   │   ├── Utilities
│   │   │   │   ├── bbj-node-kind.ts           # LSP node kind provider
│   │   │   │   ├── bbj-nodedescription-provider.ts  # AST node descriptions for indexing
│   │   │   │   ├── bbj-use-insert.ts          # Automatic USE statement insertion
│   │   │   │   ├── bbj-overload-selector.ts   # Function overload selection
│   │   │   │   ├── lsp-position.ts            # LSP position utilities
│   │   │   │   ├── utils.ts                   # General utilities
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
│   │   │   ├── test-helper.ts               # Test utilities
│   │   │   ├── test-data/
│   │   │   │   ├── *.bbj                    # Example BBj files for parsing regression
│   │   │   │   ├── conformance/             # Conformance test suite (details.json, flagged.txt)
│   │   │   │   └── cpl-fixture-*/           # BBj home fixtures for compiler tests
│   │   │   ├── *.test.ts                    # Unit/integration tests (Vitest)
│   │   │   ├── functional/                  # Functional tests
│   │   │   └── support/                     # Test helpers
│   │   ├── tools/                   # Development tools and scripts
│   │   ├── package.json              # VS Code extension manifest + npm build config
│   │   ├── tsconfig.json             # TypeScript configuration
│   │   ├── vitest.config.ts          # Vitest test runner configuration
│   │   └── esbuild.mjs               # esbuild bundler script
│   ├── bbj-language-configuration.json  # VS Code language config (indentation, brackets)
│   ├── bbx-language-configuration.json  # BBx config language config
│   └── out/                             # Build output (generated by npm run build)
│       └── language/
│           └── main.cjs               # Bundled language server (consumed by VS Code + IntelliJ)
│
├── java-interop/                    # Java backend for classpath resolution (Java, Gradle)
│   ├── src/main/java/
│   │   └── com/basis/bbj/interop/   # JSON-RPC socket service on port 5008
│   ├── build.gradle.kts             # Gradle build config
│   └── gradle/                      # Gradle wrapper and settings
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
│   ├── static/                      # Static assets
│   └── package.json                 # Docusaurus build config
│
├── examples/                        # Real-world BBj sample files
│   ├── issue*.bbj                   # Files named after GitHub issues (regression tests)
│   ├── imports/                     # Import examples
│   ├── invalid/                     # Invalid syntax examples
│   ├── javadoc/                     # Javadoc examples
│   ├── test/                        # Test examples
│   └── [subdirs]/
│
├── QA/                              # Manual testing checklists
│   └── test-runs/                   # Smoke/full test results
│
├── .planning/                       # GSD milestones, phases, research
│   ├── codebase/                    # These analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
│   ├── phases/                      # Work phases (phase-NN-*.md)
│   ├── milestones/                  # Release milestones
│   ├── research/                    # Investigation notes
│   ├── debug/                       # Debug/trace notes
│   ├── quick/                       # Quick tasks and notes
│   ├── seeds/                       # Seed ideas
│   ├── todos/                       # TODO tracking
│   └── ui-reviews/                  # UI review notes
│
├── .github/                         # GitHub configuration and CI/CD
│   ├── workflows/                   # GitHub Actions workflows
│   │   ├── build.yml                # PR validation (lint, test, package)
│   │   ├── preview.yml              # Auto-publish preview builds on main
│   │   ├── manual-release.yml       # Manual stable release (both platforms)
│   │   ├── deploy-docs.yml          # Deploy Docusaurus docs site
│   │   ├── pr-vsix.yml              # Create VSIX artifact link on PR
│   │   ├── workflow-hygiene.yml     # Validate workflow syntax
│   │   └── (other config files)
│   └── dependabot.yml               # Dependabot configuration for dependency updates
│
├── .devcontainer/                   # Dev container config (BBj :8888, java-interop :5008)
├── .gitpod.yml                      # Gitpod dev environment setup (init tasks, extensions)
├── .claude/                         # Claude Code project settings
│   └── worktrees/                   # Git worktrees for parallel work
│
├── .gsd/                            # GSD tool state (milestones, phases, state tracking)
├── .vscode/                         # VS Code workspace settings
│
├── CLAUDE.md                        # Project guidelines (this repository)
├── README.md                        # Project overview
├── LICENSE                          # License file
├── .gitignore                       # Git ignore patterns
└── [other config files]
```

## Directory Purposes

**bbj-vscode/:**
The primary development directory. Contains the Langium-based language server and VS Code extension client in TypeScript. Built and bundled to `out/language/main.cjs`, which is consumed by both the VS Code extension and the IntelliJ plugin (via LSP4IJ).

**bbj-vscode/src/language/:**
Core language server implementation. Entry point is `main.ts`, which creates the LSP connection and wires services via `bbj-module.ts`. Every major subsystem (lexer, parser, validator, Java interop, LSP providers, diagnostic reconciliation) lives here. Services are wired via dependency injection in `bbj-module.ts`.

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

**.planning/:**
GSD project management and research. Phases track work items; milestones track releases; research notes document investigations; codebase docs live here.

**.github/workflows/:**
GitHub Actions CI/CD pipeline definitions. Each workflow file defines an automated process:
- `build.yml` — triggered on PRs to main; runs on Node 22; validates lint, tests, packages VS Code extension
- `preview.yml` — triggered on pushes to main; auto-bumps patch version, builds both LS and plugins, verifies IntelliJ compatibility, publishes to preview channels on both marketplaces
- `manual-release.yml` — manual dispatch workflow; validates version format, builds and verifies all (LS, VS Code, IntelliJ), publishes to stable channels, tags release, creates GitHub Release
- `deploy-docs.yml` — deploys Docusaurus documentation site on changes to docs/
- `pr-vsix.yml` — creates a downloadable VSIX artifact link in PR comments
- `workflow-hygiene.yml` — syntax validation for workflow files
- `dependabot.yml` — configuration (not a workflow) that auto-opens dependency update PRs

**.gitpod.yml:**
Cloud-based dev environment setup for Gitpod. Defines init task to install npm deps in bbj-vscode and build java-interop via Gradle. Pre-installs VS Code extensions (Langium, ESLint, Java).

**CLAUDE.md:**
Project guidelines for Claude Code. Documents repo overview, build commands, architecture patterns, DI module structure, testing patterns, shell rules.

**README.md:**
Public project overview with quick-start links, documentation pointers, and Gitpod one-click setup.

## Key File Locations

**Entry Points:**
- `bbj-vscode/src/language/main.ts` — Language server LSP entry point; creates connection, wires services
- `bbj-vscode/src/extension.ts` — VS Code extension activates here; starts LanguageClient
- `bbj-intellij/build.gradle.kts` — IntelliJ plugin build (wraps language server)

**Configuration:**
- `bbj-vscode/package.json` — VS Code extension manifest (language, commands, settings, key bindings)
- `bbj-vscode/tsconfig.json` — TypeScript compiler options
- `bbj-vscode/esbuild.mjs` — esbuild bundler script producing `out/language/main.cjs`
- `bbj-vscode/vitest.config.ts` — test runner config
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

**Parser Integration:**
- `bbj-vscode/src/language/bbj-parser-service.ts` — Bridge to live BBj parser backend
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` — Merge live parser diagnostics with Langium errors
- `bbj-vscode/src/language/bbj-kept-check.ts` — Incremental change tracking for error re-placement

**Validation Checks:**
- `bbj-vscode/src/language/validations/check-classes.ts` — Class/interface validations
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — Variable scope checking
- `bbj-vscode/src/language/validations/check-function-calls.ts` — Function call validation
- `bbj-vscode/src/language/validations/line-break-validation.ts` — Line-break and continuation validation

**Java Integration:**
- `bbj-vscode/src/language/java-interop.ts` — Main Java interop service (socket :5008, LRU cache)
- `bbj-vscode/src/language/java-javadoc.ts` — Javadoc parsing and formatting
- `bbj-vscode/src/language/java-class-reload.ts` — Refresh Java classpath on file changes
- `java-interop/src/main/java/com/basis/bbj/interop/` — Java backend implementation

**LSP Feature Providers:**
- `bbj-vscode/src/language/bbj-completion-provider.ts` — Autocompletion
- `bbj-vscode/src/language/bbj-hover.ts` — Hover information
- `bbj-vscode/src/language/bbj-definition-provider.ts` — Go-to-definition
- `bbj-vscode/src/language/bbj-semantic-token-provider.ts` — Syntax highlighting
- `bbj-vscode/src/language/bbj-signature-help-provider.ts` — Parameter hints
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` — Inlay hints
- `bbj-vscode/src/language/bbj-code-action-provider.ts` — Quick fixes
- `bbj-vscode/src/language/bbj-code-action-handler.ts` — Code action execution
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` — Outline

**Workspace & Document Management:**
- `bbj-vscode/src/language/bbj-document-builder.ts` — Parse → Link → Validate → Reconcile lifecycle
- `bbj-vscode/src/language/bbj-ws-manager.ts` — Workspace document tracking
- `bbj-vscode/src/language/bbj-index-manager.ts` — Symbol indexing

**Compiler Integration:**
- `bbj-vscode/src/language/bbj-cpl-service.ts` — BBj CPL compiler service
- `bbj-vscode/src/language/bbj-document-validator.ts` — Document-level validation + CPL integration
- `bbj-vscode/src/language/compiler-options.ts` — Compiler option definitions

**Configuration & File Watching:**
- `bbj-vscode/src/language/config-watcher.ts` — Watches config file for changes
- `bbj-vscode/src/language/config-path-resolver.ts` — Resolves BBx config file path
- `bbj-vscode/src/language/config-reload-notification.ts` — Sends config change notifications

**Syntax Highlighting:**
- `bbj-vscode/syntaxes/bbj.tmLanguage.json` — TextMate grammar for `.bbj/.bbl` files
- `bbj-vscode/syntaxes/bbx.tmLanguage.json` — TextMate grammar for config files

**Testing:**
- `bbj-vscode/test/bbj-test-module.ts` — Test service factory with mock Java interop
- `bbj-vscode/test/test-helper.ts` — Test utilities
- `bbj-vscode/test/test-data/` — Example `.bbj` files for regression testing
- `bbj-vscode/test/*.test.ts` — Unit/integration tests (Vitest)

**CI/CD Workflows:**
- `.github/workflows/build.yml` — PR validation pipeline
- `.github/workflows/preview.yml` — Automated preview release pipeline
- `.github/workflows/manual-release.yml` — Manual stable release pipeline
- `.github/workflows/deploy-docs.yml` — Documentation deployment
- `.github/workflows/pr-vsix.yml` — PR artifact generation
- `.github/workflows/workflow-hygiene.yml` — Workflow linting

**Development Environment:**
- `.gitpod.yml` — Gitpod init tasks and extension setup

## Naming Conventions

**Files:**
- Services: `bbj-*.ts` (e.g., `bbj-validator.ts`, `bbj-completion-provider.ts`)
- Providers: `*-provider.ts` (e.g., `bbj-completion-provider.ts`, `bbj-hover.ts`)
- Handlers: `*-handler.ts` (e.g., `bbj-hover-handler.ts`, `bbj-code-action-handler.ts`)
- Test data: `.bbj`, `.bbjt`, `.src`, `.bbx`, `.bbl` for source files
- Test files: `*.test.ts` (Vitest convention)
- Grammar: `*.langium` (Langium syntax definition)
- Configuration: `*.json`, `*.ts` (tsconfig, vitest.config, esbuild.mjs, package.json)
- Generated: `generated/` directory (never manually edited)
- Workflows: `.github/workflows/*.yml` (GitHub Actions)

**Directories:**
- Services by subsystem: `language/` (parsing, analysis), `Commands/` (CLI), tests in `test/`
- Validation logic: `validations/` (separate checks)
- Built-in library: `lib/` (.bbl definitions, events)
- Test data: `test/test-data/` with subdirs for fixture types
- UI builder: `[component]-composer*.ts` (msgbox, addwindow, setopts, cvs)
- CI/CD: `.github/workflows/` for all automation

**Exports & Modules:**
- Services exported from `bbj-module.ts` as `BBjServices` type (includes all custom + Langium services)
- Test utilities exported from `test/bbj-test-module.ts` (createBBjTestServices)
- AST types exported from `generated/ast.ts` (isXxx() type guards, classes)

## Where to Add New Code

**New LSP Feature (e.g., Code Lens):**
- Create `bbj-codelens-provider.ts` in `src/language/`
- Extend Langium's `DefaultCodeLensProvider` or implement `CodeLensProvider` interface
- Register in `BBjModule.lsp` in `bbj-module.ts`
- Wire into `main.ts` via `createBBjServices()` (already auto-wired if registered in BBjModule)

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

**New Request/Notification Handler:**
- Create handler in `src/language/` (e.g., `new-feature-request.ts`)
- Register in `main.ts` via `connection.onRequest()` or `connection.onNotification()`
- Export handler function and call it during server initialization in `main.ts`

**New Test:**
- Create `test/feature-name.test.ts` using Vitest
- Import `createBBjTestServices`, `expect`, test runner
- Use test data fixtures from `test/test-data/` if needed
- Run with `npm test` or `npx vitest run test/feature-name.test.ts`

**Test Data (Example BBj Files):**
- Drop `.bbj` file in `test/test-data/` — it's auto-parsed by `example-files.test.ts`
- Name after issue: `issue123-feature.bbj` (helps track regression)
- Must parse with zero errors (lexer/parser contract)

**New CI/CD Workflow:**
- Create `.github/workflows/new-workflow.yml` with desired triggers and jobs
- Reference existing workflows for patterns (e.g., use Node 22 for JS, Java 17 for Gradle)
- Test locally with `act` (GitHub Actions runner emulator) or validate via GitHub Actions syntax
- Document trigger conditions and artifacts in workflow comments

**New Dependency Update or Release Mechanism:**
- If dependency management: update `.github/dependabot.yml` configuration
- If new release process: create new workflow in `.github/workflows/` (follow manual-release.yml pattern)
- Both platforms (VS Code + IntelliJ) should verify before publish to avoid stranded half-releases

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
- Subdirs: `phases/` (work plans), `milestones/` (releases), `research/` (investigation), `codebase/` (these docs), `debug/` (debugging notes), `quick/` (quick tasks)
- Committed: Yes (project documentation)

**.github/workflows/:**
- Purpose: GitHub Actions CI/CD automation
- Files: One `.yml` per workflow (build, preview, release, deploy-docs, etc.)
- Triggers: PR events, push to main, manual dispatch (workflow_dispatch)
- Artifacts: Language server, VS Code .vsix, IntelliJ .zip, uploaded for consumption/publishing
- Committed: Yes (CI/CD configuration)

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

*Structure analysis: 2026-09-28*
