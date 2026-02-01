# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
bbj-language-server/
├── bbj-vscode/                      # VS Code extension and language server
│   ├── src/
│   │   ├── extension.ts             # Extension activation and VS Code commands
│   │   ├── document-formatter.ts    # BBj document formatting
│   │   ├── Commands/
│   │   │   ├── Commands.cjs         # BBj compiler and runtime execution
│   │   │   └── CompilerOptions.ts   # Compiler option definitions and management
│   │   └── language/                # Language server implementation
│   │       ├── main.ts              # LSP server entry point
│   │       ├── bbj-module.ts        # Langium service composition
│   │       ├── bbj.langium          # BBj grammar definition
│   │       ├── java-types.langium   # Java type integration grammar
│   │       ├── generated/           # Langium-generated AST and grammar
│   │       ├── validations/         # Semantic validation implementations
│   │       ├── lib/                 # Standard library definitions (functions, events, variables)
│   │       └── [feature-providers]  # LSP feature implementations
│   ├── test/                        # Test files and test data
│   ├── snippets/                    # VS Code code snippets
│   ├── syntaxes/                    # TextMate syntax definitions
│   ├── package.json                 # Extension and npm configuration
│   └── tsconfig.json                # TypeScript configuration
├── java-interop/                    # Java classpath introspection service
│   ├── src/main/java/bbj/interop/  # Java source code
│   │   ├── InteropService.java      # JSON-RPC service interface
│   │   ├── SocketServiceApp.java    # Main entry point, socket server
│   │   └── data/                    # DTO classes for class metadata
│   ├── build.gradle                 # Gradle build configuration
│   └── gradlew                      # Gradle wrapper
├── documentation/                   # Docusaurus documentation site
├── examples/                        # Example BBj programs
├── .planning/                       # GSD codebase analysis (this directory)
└── README.md                        # Project overview
```

## Directory Purposes

**bbj-vscode/src/extension.ts:**
- Purpose: VS Code extension activation and command registration
- Contains: Language client initialization, command handlers, configuration UI
- Key functions: `activate()`, `deactivate()`, compiler option UI handlers

**bbj-vscode/src/Commands/:**
- Purpose: BBj compiler and runtime integration
- `Commands.cjs`: CommonJS module for subprocess execution (compile, run, decompile, web apps)
- `CompilerOptions.ts`: Typed definitions of compiler options with validation

**bbj-vscode/src/language/:**
- Purpose: Complete language server implementation (39 TypeScript files)
- Entry: `main.ts` starts LSP server
- Core: `bbj-module.ts` composes all services via dependency injection
- Grammar: `bbj.langium` defines complete BBj syntax
- Processing pipeline: Lexer → Parser → ValueConverter → TokenBuilder → AST

**bbj-vscode/src/language/generated/:**
- Purpose: Auto-generated code by langium-cli from grammar
- Contains: `ast.ts` (AST node classes), `grammar.ts` (compiled grammar), `module.ts` (base services)
- Note: DO NOT edit directly; regenerate from grammar file

**bbj-vscode/src/language/lib/:**
- Purpose: Built-in BBj library definitions (functions, events, variables, labels)
- Files: Each `.bbl` file auto-synced to corresponding `.ts`
- Examples:
  - `functions.bbl/functions.ts`: Standard BBj functions (ARRAY, DIM, OPEN, PRINT, etc.)
  - `events.bbl/events.ts`: System events (CLICK, CHANGE, FOCUS, etc.)
  - `variables.bbl/variables.ts`: Built-in variables ($ERR, $HKEY, etc.)
  - `labels.bbl/labels.ts`: Special labels/keywords

**bbj-vscode/src/language/validations/:**
- Purpose: Custom semantic validation rules
- `check-classes.ts`: Class declaration and member access validation
- `line-break-validation.ts`: Line continuation and statement formatting rules

**bbj-vscode/src/language/[feature-providers]:**
- Purpose: Implement LSP features (completion, hover, signatures, etc.)
- Patterns: All extend Langium base providers, override specific methods
- Files:
  - `bbj-completion-provider.ts`: Code completion with type-aware suggestions
  - `bbj-hover.ts`: Hover information with documentation
  - `bbj-signature-help-provider.ts`: Function signature hints
  - `bbj-semantic-token-provider.ts`: Syntax highlighting tokens
  - `bbj-comment-provider.ts`: Extract documentation comments

**bbj-vscode/src/language/[semantic-analysis]:**
- Purpose: Type inference and reference resolution
- Files:
  - `bbj-type-inferer.ts`: Infer types of expressions and variables
  - `bbj-linker.ts`: Resolve cross-references across files
  - `bbj-scope.ts`: Build and query symbol scopes
  - `bbj-scope-local.ts`: Local scope computation and predicates

**bbj-vscode/src/language/[core-processing]:**
- Purpose: Core language processing (parsing, tokenization, visitor patterns)
- Files:
  - `bbj-lexer.ts`: Custom tokenizer extending Langium defaults
  - `bbj-value-converter.ts`: Normalize parsed values (strings, numbers, etc.)
  - `bbj-token-builder.ts`: Build token stream for parser
  - `bbj-document-builder.ts`: Coordinate document parsing/linking/validation
  - `bbj-document-validator.ts`: Dispatch validation to registered checks

**bbj-vscode/src/language/[workspace-management]:**
- Purpose: Manage multi-file projects and symbol indexing
- Files:
  - `bbj-ws-manager.ts`: Track documents, classify as BBj/Java/external
  - `bbj-index-manager.ts`: Build and update workspace symbol index
  - `bbj-node-kind.ts`: Classify AST nodes for IDE icons

**bbj-vscode/src/language/[java-integration]:**
- Purpose: Seamless Java DDL integration
- Files:
  - `java-interop.ts`: Socket client for Java backend service, class caching
  - `java-javadoc.ts`: Fetch and parse Javadoc from external sources
  - `bbj-nodedescription-provider.ts`: Enhance AST descriptions with metadata

**bbj-vscode/src/language/[utilities]:**
- Purpose: Helper functions and assertions
- Files:
  - `utils.ts`: Type assertions and utility functions
  - `assertions.ts`: Runtime type checking
  - `constants.ts`: Shared constants (e.g., NegativeLabelIdList)

**bbj-vscode/test/:**
- Purpose: Test suite and test data
- `test-data/`: Sample BBj files for testing
- Test runner configuration in `package.json`

**bbj-vscode/snippets/:**
- Purpose: VS Code code snippets (templates for common constructs)
- Content: `.json` files with snippet definitions

**bbj-vscode/syntaxes/:**
- Purpose: TextMate syntax definitions for editor highlighting
- Content: `.json` files defining token patterns for BBj and related languages

**java-interop/src/main/java/bbj/interop/:**
- Purpose: Java backend service for classpath introspection
- `InteropService.java`: JSON-RPC service with methods for class/package queries
- `SocketServiceApp.java`: Listens on port 5008, routes JSON-RPC requests
- `data/`: DTO classes (ClassInfo, MethodInfo, FieldInfo, etc.)
- `JavaLangPackage.java`: Mock implementation for java.lang reflection

**java-interop/build.gradle:**
- Purpose: Gradle build configuration for Java backend
- Dependencies: Guava, JSON-RPC library

## Key File Locations

**Entry Points:**
- Extension entry: `bbj-vscode/src/extension.ts` - `activate()` function
- Language server entry: `bbj-vscode/src/language/main.ts` - module load
- Java service entry: `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` - main()
- Grammar entry rule: `bbj-vscode/src/language/bbj.langium` - `entry Model`

**Configuration:**
- VS Code extension manifest: `bbj-vscode/package.json`
- BBj language config: `bbj-vscode/bbj-language-configuration.json`
- TypeScript config: `bbj-vscode/tsconfig.json`
- Java Gradle config: `java-interop/build.gradle`
- Compiler options schema: `bbj-vscode/src/Commands/CompilerOptions.ts`

**Core Logic:**
- Service composition: `bbj-vscode/src/language/bbj-module.ts` (BBjModule, BBjSharedModule)
- Grammar definition: `bbj-vscode/src/language/bbj.langium`
- Validation registry: `bbj-vscode/src/language/bbj-validator.ts` (registerValidationChecks)
- Scope resolution: `bbj-vscode/src/language/bbj-scope.ts` (BbjScopeProvider)
- Type inference: `bbj-vscode/src/language/bbj-type-inferer.ts` (BBjTypeInferer)
- Java interop: `bbj-vscode/src/language/java-interop.ts` (JavaInteropService)

**Testing:**
- Test files: `bbj-vscode/test/` (pattern: `*.test.ts`)
- Test data: `bbj-vscode/test/test-data/` (sample `.bbj` files)
- Jest/Vitest config: See `bbj-vscode/package.json` scripts

## Naming Conventions

**Files:**
- TypeScript files: `kebab-case.ts` (e.g., `bbj-completion-provider.ts`)
- Generated files: `generated/` directory, `[name].ts`
- Grammar files: `.langium` extension
- Java files: `PascalCase.java` (e.g., `InteropService.java`)
- CommonJS modules: `.cjs` extension
- Test files: `*.test.ts` or `*.spec.ts`

**Directories:**
- Feature/concern directories: lowercase with hyphens (e.g., `language`, `validations`, `lib`)
- Java packages: lowercase with dots (e.g., `bbj.interop.data`)
- Generated code: `generated/` subdirectory

**Classes & Types:**
- Providers: Prefix `BBj` or `Bbj` + feature name (e.g., `BBjCompletionProvider`)
- Services: Suffix `Service` (e.g., `JavaInteropService`)
- Modules: Suffix `Module` (e.g., `BBjModule`)
- Manager: Suffix `Manager` (e.g., `BBjWorkspaceManager`)
- Data classes: DTO suffix or descriptive name (e.g., `MethodInfo`, `ClassInfoParams`)

**Functions & Constants:**
- Validators/checkers: Prefix `check` (e.g., `checkReturnValueInDef`)
- Predicates: Prefix `is` (e.g., `isBbjClass`, `isMethodDecl`)
- Providers: Function prefix or class method
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`, `NegativeLabelIdList`)

## Where to Add New Code

**New Feature (e.g., new IDE capability):**
- Primary code: `bbj-vscode/src/language/bbj-[feature]-provider.ts`
- Service registration: Add to `BBjModule` in `bbj-vscode/src/language/bbj-module.ts`
- Tests: `bbj-vscode/test/[feature].test.ts`

**New Validation Rule:**
- Implementation: `bbj-vscode/src/language/validations/[rule-name]-validation.ts`
- Register: Add to `ValidationChecks<BBjAstType>` in `bbj-validator.ts`
- Tests: `bbj-vscode/test/validations/[rule-name].test.ts`

**New Built-in Library Element (function, event, variable):**
- Definition: Edit corresponding `.bbl` file in `bbj-vscode/src/language/lib/`
- Sync: Run `npm run build` to regenerate `.ts` from `.bbl`
- Location:
  - Functions: `bbj-vscode/src/language/lib/functions.bbl`
  - Events: `bbj-vscode/src/language/lib/events.bbl`
  - Variables: `bbj-vscode/src/language/lib/variables.bbl`
  - Labels: `bbj-vscode/src/language/lib/labels.bbl`

**New Grammar Rule:**
- Location: `bbj-vscode/src/language/bbj.langium`
- Regeneration: Run `npm run langium:generate` to update generated AST

**New Compiler Command:**
- Command handler: Add to `Commands.cjs` (compile, run, decompile)
- VS Code registration: Add to `contributes.commands` in `bbj-vscode/package.json`
- Options: Define in `CompilerOptions.ts` if configurable

**New Java Interop Method:**
- Java backend: Add method to `InteropService.java` with `@JsonRequest` annotation
- TypeScript client: Call in `JavaInteropService.ts` via `connection.sendRequest()`

**Utilities & Helpers:**
- Shared utilities: `bbj-vscode/src/language/utils.ts`
- Type assertions: `bbj-vscode/src/language/assertions.ts`
- Constants: `bbj-vscode/src/language/constants.ts`

## Special Directories

**bbj-vscode/src/language/generated/:**
- Purpose: Auto-generated by langium-cli
- Generated: Yes (from `bbj.langium` and `java-types.langium`)
- Committed: Yes (checked in to repo)
- Regeneration: `npm run langium:generate` in bbj-vscode/
- Contents:
  - `ast.ts`: All AST node classes (Program, Statement, Expression, etc.)
  - `grammar.ts`: Compiled grammar object
  - `module.ts`: Base Langium services (extended in `bbj-module.ts`)

**bbj-vscode/src/language/lib/:**
- Purpose: Built-in library type definitions
- Generated: Partially (`.ts` files synced from `.bbl`)
- Committed: Both `.bbl` and `.ts` checked in
- Regeneration: Edit `.bbl` files, run build script
- Contents: Standard BBj functions, events, variables, labels

**bbj-vscode/out/:**
- Purpose: Compiled JavaScript output
- Generated: Yes (from TypeScript `src/`)
- Committed: No (git-ignored)
- Regeneration: `npm run build` or `npm run watch`

**bbj-vscode/test/test-data/:**
- Purpose: Sample BBj files for unit and integration tests
- Generated: No (manually maintained)
- Committed: Yes
- Contents: Minimal BBj programs exercising specific features

**java-interop/build/:**
- Purpose: Java gradle build output
- Generated: Yes (from `src/`)
- Committed: No (git-ignored)
- Regeneration: `./gradlew build`

---

*Structure analysis: 2026-02-01*
