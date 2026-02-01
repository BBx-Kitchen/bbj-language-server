# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- Kebab-case for TypeScript source files: `bbj-completion-provider.ts`, `bbj-validator.ts`, `document-formatter.ts`
- Test files use same convention with `.test.ts` suffix: `parser.test.ts`, `validation.test.ts`, `compiler-options.test.ts`
- Generated files in `src/language/generated/` include `module.ts`, `ast.ts`, `grammar.ts`

**Functions:**
- camelCase for all function declarations
- Prefixed with descriptive verbs: `parseSettings`, `createReferenceCompletionItem`, `checkLabelDecl`, `buildCompileOptions`, `validateOptions`
- Exported functions clearly named: `activate`, `deactivate`, `configureCompileOptions`, `registerValidationChecks`
- Helper functions start with descriptive prefix: `getBBjClasspathEntries`, `getCurrentValue`, `formatCurrentValueDescription`, `isOptionSelected`, `promptForValue`, `getFullConfigKey`, `getOptionValue`, `isOptionEnabled`

**Variables:**
- camelCase for all variable declarations
- Const constants use camelCase: `unsavedContentMap`, `services`, `parse`, `config`
- Singular names for single items: `result`, `error`, `document`, `item`
- Plural names for collections: `classpathEntries`, `selectedItems`, `diagnostics`, `items`, `errors`, `warnings`

**Types:**
- PascalCase for all type names and interfaces: `CompilerOption`, `CompilerOptionGroup`, `ValidationResult`, `FunctionNodeDescription`, `MethodData`, `CompilerOptionQuickPickItem`
- Type names are descriptive and specific: `BBjServices`, `LangiumServices`, `BBjDocument`, `JavaDocument`
- Union types clearly defined: `CompilerOptionType = 'boolean' | 'string' | 'number'`
- Extension interfaces append specific suffix: `extends DefaultCompletionProvider`, `extends AstNodeHoverProvider`

**Classes:**
- PascalCase with descriptive names: `BBjCompletionProvider`, `BBjValidator`, `BBjHoverProvider`, `BbjScopeComputation`, `JavaInteropService`
- Prefixed with `BBj` or `Bbj` for domain-specific classes
- Extend base classes from frameworks: `DefaultCompletionProvider`, `AstNodeHoverProvider`, `DefaultLinker`

## Code Style

**Formatting:**
- No Prettier config detected - formatting is manual/convention-based
- Line length appears to follow reasonable limits (no lines truncated at 2000 chars in samples)
- Consistent indentation of 2 spaces (visible in method signatures and nested code)

**Linting:**
- ESLint configured in `.eslintrc.json` with:
  - Parser: `@typescript-eslint/parser`
  - Plugin: `@typescript-eslint`
  - Currently no explicit rules (empty rules object)
- TypeScript strict mode enabled in `tsconfig.json`:
  - `strict: true`
  - `noUnusedLocals: true`
  - `noImplicitReturns: true`
  - `noImplicitOverride: true`
- Run linting with: `npm run lint` (eslint src test --ext ts)

**Imports Organization:**
- Order: Framework imports → Node module imports → Local imports with relative paths
- Example from `extension.ts`:
  ```typescript
  import * as vscode from 'vscode';
  import * as path from 'path';
  import * as fs from 'fs';
  import { LanguageClient, ... } from 'vscode-languageclient/node.js';
  import { BBjLibraryFileSystemProvider } from './language/lib/fs-provider.js';
  import { DocumentFormatter } from './document-formatter.js';
  import { ... } from './Commands/CompilerOptions.js';
  import Commands from './Commands/Commands.cjs';
  ```
- All imports use `.js` extension (ES module syntax)
- Wildcard imports used for larger namespaces: `import * as vscode`
- Named imports for specific exports: `import { parseHelper } from 'langium/test'`

**Path Aliases:**
- No path aliases configured - all imports are relative paths or full package names
- Relative paths use `./` prefix within same project

## Error Handling

**Patterns:**
- Try-catch blocks wrap file I/O and external calls:
  - `src/extension.ts` line 34-58: `try { ... } catch (error) { console.error(...); return []; }`
- Promise rejection and resolution explicit: `Promise.reject(err)`, `Promise.resolve()`
- Null checks explicit: `if (!bbjHome)`, `if (entries.length === 0)`, `if (!scopeChoice)`
- Error messages specific and user-facing: "Please set bbj.home first to see available classpath entries"
- Validation errors collected into arrays before reporting: `const validation = validateOptions(config)`
- Async error handling uses `.then(..., (err) => { ... })` pattern in `document-formatter.ts`

**Validator pattern:** Custom validation uses AcceptorPattern
- `src/language/bbj-validator.ts`: `export function registerValidationChecks(services: BBjServices)`
- Checks registry: `registry.register(checks, validator)`
- Validation methods accept `ValidationAcceptor` callback: `checkLabelDecl(labelDecl: LabelDecl, accept: ValidationAcceptor)`

## Logging

**Framework:** Plain `console` API (no logging framework)

**Patterns:**
- `console.error()` for errors: Used in `src/extension.ts` line 56 for file read failures
- `console.log()` for debug/informational output:
  - Performance timing: `src/test/parser.test.ts` line 39: `console.log(\`Parse ${count} times took: ${timeInSeconds} seconds\`)`
  - Formatter performance warnings: `src/document-formatter.ts` line 75: `console.log(\`Formatting took too long (${timeTaken}ms)\`)`
- `console.warn()` for warnings:
  - Exception handling in hover provider: `src/language/bbj-hover.ts` line 68: `console.warn(e)`
  - JavaDoc parsing errors: `src/language/bbj-hover.ts` line 89: `console.warn(error)`

## Comments

**When to Comment:**
- Complex logic has explanatory comments:
  - `src/extension.ts` line 26: `// Function to read BBj.properties and extract classpath entry names`
  - `src/document-formatter.ts` line 4: `// Store unsaved content in memory`
- Parameter explanations in function comments: `src/extension.ts` line 61-65 (interface definition with property comments)
- REM statements for legacy/special behavior: `src/extension.ts` line 46-47 comment explains regex pattern

**JSDoc/TSDoc:**
- Used for public functions and exported APIs:
  - `src/extension.ts` lines 67-72: Full JSDoc with parameter types and description
  - `src/Commands/CompilerOptions.ts` lines 9-17: Interface documentation with field descriptions
  - Type definitions include doc comments: `src/Commands/CompilerOptions.ts` line 28: `/** The CLI flag (e.g., '-t', '-W', '-c') */`
- Parameter documentation: `flag: string; // The CLI flag`
- Return type documentation sometimes included in interface comments

**Special patterns:**
- Inline comments for non-obvious behavior:
  - `src/extension.ts` line 134: `// User cancelled`
  - `src/extension.ts` line 138: `// User cleared the value`
- Configuration comments for disabled features: `src/vitest.config.ts` shows commented example: `// globals: true,`

## Function Design

**Size:**
- Most functions range 10-50 lines
- Larger functions break down into phases with comments:
  - `src/extension.ts` `configureCompileOptions()` (lines 153-325, ~170 lines) breaks into:
    1. Build QuickPick items with separators
    2. Show multi-select dialog
    3. Ask for scope
    4. Process options
    5. Prompt for parameterized values
    6. Update configurations
    7. Validate final configuration

**Parameters:**
- Type annotations required (TypeScript strict mode)
- Function parameters grouped logically: `option: CompilerOption, value: boolean | string | number | null`
- Optional parameters: `typeAdjust: ((type: string) => string) = (t) => t ?? ''` with default
- Destructuring used for objects when helpful: `const { document } = event`

**Return Values:**
- Explicit return types on all exported functions: `export async function configureCompileOptions(): Promise<void>`
- `Promise` return types for async operations: `Thenable<void>`, `Promise<string>`, `Thenable<vscode.TextEdit[] | undefined>`
- Void/undefined for fire-and-forget operations
- Custom types for complex returns: `ValidationResult` with `isValid`, `errors`, `warnings` fields

## Module Design

**Exports:**
- Named exports for classes and functions: `export class BBjValidator`, `export function registerValidationChecks`
- Default exports used rarely (example: `import Commands from './Commands/Commands.cjs'`)
- Type exports explicit: `export type CompilerOptionGroup = ...`
- Interface exports explicit: `export interface CompilerOption { ... }`

**Barrel Files:**
- Not detected as a pattern in this codebase
- Imports are direct from source files: `from './language/bbj-module'` not `from './language'`
- Index files appear not to be used for re-exports

**File Organization:**
- Single responsibility principle: Each file focuses on one concern
  - `bbj-validator.ts`: Validation registration and checks
  - `bbj-completion-provider.ts`: Completion item creation
  - `bbj-hover.ts`: Hover content generation
  - `CompilerOptions.ts`: Compiler option definitions and building
- Related functionality grouped by feature:
  - `/src/language/validations/`: Check implementations
  - `/src/Commands/`: Command handlers and options
  - `/src/language/lib/`: Library-related implementations

---

*Convention analysis: 2026-02-01*
