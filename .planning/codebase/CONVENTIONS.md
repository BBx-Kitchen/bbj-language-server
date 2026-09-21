# Coding Conventions

**Analysis Date:** 2026-09-21

## Naming Patterns

**Files:**
- Kebab-case with descriptive names describing purpose and component
- Suffixes indicate type: `-provider.ts`, `-validator.ts`, `-module.ts`, `-service.ts`
- Examples:
  - `bbj-validator.ts`, `bbj-hover.ts`, `bbj-completion-provider.ts`, `bbj-module.ts`
  - `bbj-test-module.ts`, `test-helper.ts` for test utilities
  - Feature-specific providers: `bbj-definition-provider.ts`, `bbj-document-symbol-provider.ts`

**Classes and Types:**
- PascalCase for all class/interface/type names
- Service implementations: `BBjValidator`, `BBjHoverProvider`, `JavaInteropService`
- Abstract base services inherit from Langium: `extends AstNodeHoverProvider`, `extends DefaultDefinitionProvider`
- Constants for configuration: `ZERO_RANGE`, `TERMINATOR_CONSUMING_LEAF_TOKENS`
- Enums: `LogLevel` (PascalCase with UPPER_CASE variants)

**Functions and Methods:**
- camelCase for all function and method names
- Private methods prefixed with underscore when needed: `_getTypeInternal()`
- Verb-forward naming: `getType()`, `checkValidation()`, `findDeclaration()`, `createMarkdownContent()`
- Test helpers follow same pattern: `fieldCompletion()`, `renameAt()`, `useDotCompletion()`

**Variables:**
- camelCase for local variables and parameters: `offset`, `document`, `cstNode`
- Prefix for context-specific variables: `const parse = parseHelper<Model>(services.BBj)`
- Configuration flags: `isPortOpen`, `isInteropRunning`, `isCompleteClassIndex`
- Counters use descriptive names: `fieldCompletionCounter`, `dotCompletionCounter`

**Constants and Enums:**
- UPPER_CASE_SNAKE_CASE for const exports and significant constants: `ZERO_RANGE`, `RUN_BBJ_TESTS`
- LogLevel enum variants: `LogLevel.ERROR`, `LogLevel.DEBUG`

**Test Names:**
- Descriptive test names following format: `'[verb] [subject] [condition/issue]'`
- Issue references in test names: `test('Do not link to method if field requested')`
- Issue numbers in comments: `// Issue #77: field rename previously behaved wrongly`

## Code Style

**Formatting:**
- No Prettier configuration — relies on TypeScript compiler and ESLint conventions
- Semicolons required (strict TypeScript mode)
- Double quotes for strings (consistent across codebase)
- 4-space indentation (TypeScript default)

**Linting:**
- Tool: ESLint with `typescript-eslint` plugin (see `bbj-vscode/eslint.config.js`)
- Config: `eslint.config.js` using flat config format
- Ignored paths: `out/**`, `src/language/generated/**` (auto-generated code)
- Rule set: TypeScript-specific strict rules (minimal custom overrides currently)
- Run via: `npm run lint`

**TypeScript Configuration (`tsconfig.json`):**
- Target: ES6
- Module: Node16
- Strict mode enabled:
  - `strict: true` (all strict options)
  - `noUnusedLocals: true` (unused variables error)
  - `noImplicitReturns: true` (all code paths must return)
  - `noImplicitOverride: true` (override keyword required)
  - `forceConsistentCasingInFileNames: true`

## Import Organization

**Order (strict pattern observed):**
1. Langium core imports (langium, langium/lsp, langium/test)
2. VSCode/LSP protocol imports (vscode-languageserver, vscode-languageserver-protocol, vscode-uri)
3. Node.js built-ins (path, fs, net, etc.)
4. Local generated imports (`../src/language/generated/ast.js`, `../src/language/generated/module.js`)
5. Local service imports (`../src/language/bbj-module.js`, `../src/language/bbj-validator.js`)
6. Other local imports (`./bbj-test-module.js`, `./test-helper.js`)

**Examples:**
```typescript
// Pattern 1: Langium utilities + LSP types
import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { Hover, HoverParams } from 'vscode-languageserver';

// Pattern 2: Generated + services
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program, isDefFunction } from '../src/language/generated/ast.js';

// Pattern 3: Test utilities
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
```

**Path Aliases:**
- No path aliases configured; all imports use relative paths
- Absolute imports avoided

**Barrel Files:**
- Used for generated code: `src/language/generated/ast.ts` exports all AST types
- Used for modules: `src/language/generated/module.ts` exports service definitions

## Error Handling

**Strategy:** Graceful degradation with logged errors

**Patterns observed:**

1. **Validation errors:** Use Langium `ValidationAcceptor` pattern
   ```typescript
   accept("error", "message", { node: someNode, property: 'fieldName' });
   ```
   See: `bbj-validator.ts` checkLabelDecl, checkOpenStatementOptions, etc.

2. **LSP service errors:** Try-catch with graceful undefined return
   ```typescript
   try {
       return await super.getHoverContent(document, params);
   } catch (e) {
       logger.warn(`Hover failed at offset ${offset}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
       return undefined;  // Never fail LSP requests
   }
   ```
   See: `bbj-hover.ts` getHoverContent()

3. **Type resolution:** Cycle detection with resolving set
   ```typescript
   if (this.resolving.has(expression)) {
       return undefined;
   }
   this.resolving.add(expression);
   try {
       return this.getTypeInternal(expression);
   } finally {
       this.resolving.delete(expression);
   }
   ```
   See: `bbj-type-inferer.ts` getType()

4. **Langium reference errors:** Wrapped in try-catch
   ```typescript
   try {
       reference = expression.symbol.ref;
   } catch {
       // Langium throws on cyclic reference resolution
       return undefined;
   }
   ```

**Exception types:**
- Langium throws on cyclic resolution attempts → caught and converted to undefined
- LSP errors logged but never propagated (user sees repeated failure noise)
- Parse/lexer errors collected in document diagnostics, not thrown

## Logging

**Framework:** Custom lightweight singleton logger (`src/language/logger.ts`)

**Usage pattern:**
```typescript
import { logger } from './logger.js';

logger.debug(`Parser: ${message}`);  // Only when currentLevel >= DEBUG
logger.warn(`Hover failed: ${e.message}`);
logger.info('Log level changed to DEBUG');
```

**Log levels:**
- ERROR (0) - critical failures (rarely used)
- WARN (1) - degraded behavior that continues (default)
- INFO (2) - informational messages
- DEBUG (3) - verbose diagnostic output

**Performance:** Lazy evaluation with callback functions
```typescript
logger.debug(() => `Expensive computation: ${complexValue}`);  // Only evaluated if DEBUG enabled
```

**Configuration:** Controlled by `bbj.debug` VSCode setting

**When to log:**
- Warnings: LSP request failures, degradation paths (hover, definition)
- Debug: Parser ambiguities, lexer token handling, scope computation details
- Info: Service initialization, configuration changes

## Comments

**When to Comment:**
- Public API signatures (classes, exported functions): JSDoc required
- Complex algorithms: Explain "why", not "what"
- Non-obvious workarounds: Reference issue numbers (`// Issue #77:`, `// See #663`)
- Browser/feature compatibility: Explain version constraints
- Multi-step validation: Comment each major step

**JSDoc/TSDoc Usage:**

Public classes and methods use JSDoc:
```typescript
/**
 * Custom definition provider that enhances USE statement navigation.
 *
 * For USE statements with BbjClass references, this provider navigates to 
 * the specific class declaration line within the file, not just the file start.
 *
 * Also handles RUN/CALL file literals (#663): a string literal has no declaration...
 */
export class BBjDefinitionProvider extends DefaultDefinitionProvider {
    private readonly runCallContext: RunCallResolutionContext;
    
    /**
     * Gate for tests that require the BBj/Java side.
     * 
     * @param port - Port to check
     * @returns Promise<boolean> - True if port is open
     */
    export async function isPortOpen(port: number): Promise<boolean>
}
```

**Comments for non-obvious code:**
```typescript
// TERMINATOR_CONSUMING_LEAF_TOKENS are tokens built by bbj-token-builder.ts
// whose regex only matches when a trailing ';' or line break directly follows,
// consuming that terminator into the token's own matched text.
const TERMINATOR_CONSUMING_LEAF_TOKENS = new Set(['KEYWORD_STANDALONE']);
```

**Issue-reference comments:**
```typescript
// Issue #460: partially typed class after `use java.util.` still narrows
// Issue #475 (DISC-05): hex StringLiteral resolves to no declaration
```

## Function Design

**Size:** Most functions 20-50 lines; complex validators/providers 100-150 lines

**Parameters:**
- Accept `services: BBjServices` (dependency injection pattern)
- Accept LSP types: `document: LangiumDocument`, `params: HoverParams`
- Accept Langium types: `node: AstNode`, `accept: ValidationAcceptor`
- Helper functions accept `text: string`, `occurrence: number`, `newName: string`

**Return Values:**
- Langium validators return void, accept errors via `accept()` callback
- LSP providers return `Promise<T | undefined>` (never throw)
- Type inference returns `Type | undefined` (not found or cyclic)
- Helper functions return specific types or undefined: `LocationLink[] | undefined`

**Async/Await:** LSP services and Javadoc resolution use async
```typescript
override async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined>
public async ensureCompleteClassIndex(): Promise<boolean>
```

## Module Design

**Exports:**
- Service classes: exported as named exports (not default)
- Constants: exported as `const`
- Type definitions: exported as `type` or `interface`
- Helper functions: named exports

**Example from `bbj-module.ts`:**
```typescript
export type BBjAddedServices = { ... }
export type BBjServices = LangiumServices & BBjAddedServices
export const BBjModule: Module<BBjServices, ...> = { ... }
export function registerValidationChecks(services: BBjServices) { ... }
```

**Barrel Files:**
- Generated code uses barrel: `import { BBjServices, BBjModule } from '../language/generated/module.js'`
- Not used for hand-written code (direct imports preferred)

**Dependency Injection:**
- Services registered in `BBjModule` via Langium's `Module<>` pattern
- Constructor receives `services: BBjServices` injected by framework
- No global singletons except logger (which is explicitly `getInstance()`)
- JavadocProvider uses explicit `getInstance()` initialization check

## Cross-Cutting Concerns

**Logging:** Logger singleton (see Logging section)

**Validation:** 
- Two-tier approach:
  1. Langium validator (LSP-safe, conservative checks): `bbj-validator.ts`
  2. Document validator (deeper checks with CPL): `bbj-document-validator.ts`
- Type resolution warnings can be toggled: `setTypeResolutionWarnings(enabled)`

**Authentication:** N/A (language server, not web service)

**Formatting:** No runtime formatter; compile-time type checking enforces style

---

*Convention analysis: 2026-09-21*
