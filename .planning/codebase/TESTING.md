# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**
- Vitest 1.6.1
- Config: `vitest.config.ts` (minimal - only test configuration, no globals enabled)

**Assertion Library:**
- `expect` from Vitest (built-in)
- Langium test helpers: `expectError`, `expectNoIssues` from `langium/test`

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run test:watch    # Watch mode (vitest watch)
```

Note: No coverage command detected in package.json scripts.

## Test File Organization

**Location:**
- Co-located approach: `test/` directory at root of `bbj-vscode/` project
- Tests are in separate `/test/` directory, not alongside source files

**Naming:**
- Pattern: `[feature].test.ts` or `[feature]-[aspect].test.ts`
- Examples:
  - `parser.test.ts` - Parser functionality
  - `utils.test.ts` - Utility functions
  - `lexer.test.ts` - Lexer functionality
  - `compiler-options.test.ts` - Compiler option handling
  - `document-symbol.test.ts` - Document symbol provider
  - `comment-provider.test.ts` - Comment provider
  - `classes.test.ts` - Class-related functionality
  - `linking.test.ts` - Linking logic
  - `validation.test.ts` - Validation checks
  - `javadoc.test.ts` - JavaDoc parsing
  - `imports.test.ts` - Import handling
  - `example-files.test.ts` - Integration with example files
  - `completion-test.test.ts` - Completion provider

**Structure:**
```
bbj-vscode/
├── test/
│   ├── test-data/         # Test input files (.bbj programs)
│   ├── test-helper.ts     # Shared test utilities
│   ├── parser.test.ts
│   ├── validation.test.ts
│   └── ...
├── src/
│   └── ...
```

## Test Structure

**Suite Organization:**
```typescript
// From parser.test.ts
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

describe('Parser Tests', () => {

    beforeAll(() => services.shared.workspace.WorkspaceManager.initializeWorkspace([]));

    test('Program parsed', async () => {
        const result = await parse('some_string$ = "Hello ""World"""')
        expect(isProgram(result.parseResult.value)).true
        const prog = result.parseResult.value as Program
        expect(prog.statements.length).toBe(1)
        expectNoParserLexerErrors(result)
    })
})
```

**Patterns:**
- Setup with `beforeAll()`: Initialize services and workspace before any tests
- Setup with `beforeEach()`: Reset state between tests (from `classes.test.ts`)
- Teardown with `afterEach()`: Clean up after each test (from `classes.test.ts`)
- Helper functions within test files: `expectNoParserLexerErrors()`, `expectNoValidationErrors()`, `expectToContainAstNodeType()`
- Assertion chaining: Multiple expectations in single test
- Descriptive test names that read as sentences: "Program definition test", "Library parsed", "Symbolic link reference starts with"

## Mocking

**Framework:**
- No explicit mocking library detected (Vitest has built-in mocking but not used in observed tests)

**Patterns:**
- Mock objects created manually for simple cases:
  - `compiler-options.test.ts` creates mock `WorkspaceConfiguration`:
    ```typescript
    function createMockConfig(settings: Record<string, unknown>): WorkspaceConfiguration {
        return {
            get: <T>(key: string): T | undefined => {
                return settings[key] as T | undefined;
            },
            has: (key: string): boolean => {
                return key in settings;
            },
            inspect: () => undefined,
            update: async () => { /* no-op */ }
        } as WorkspaceConfiguration;
    }
    ```
- `EmptyFileSystem` used as test filesystem: `createBBjServices(EmptyFileSystem)`
- No mocking of external services - tests work with actual parsed documents

**What to Mock:**
- Configuration objects with simple interfaces
- File system for isolated testing
- VSCode API objects (when testing command handlers)

**What NOT to Mock:**
- Langium services and AST parsing - use actual parser for integration tests
- Language features - test with real grammar
- Validators and providers - test actual implementation behavior

## Fixtures and Factories

**Test Data:**
```typescript
// From utils.test.ts - Input fixtures
const exampleInput = `
classpath=~/git/bbj-language-server/examples/lib/com.google.guava_30.1.0.v20221112-0806.jar:~/someOtherPath.jar:~/someOtherPath2.jar
PREFIX="~/BBJ/utils/" "~/BBJ/plugins/" "~/BBJ/utils/reporting/bbjasper/"
`;

// From parser.test.ts - BBj code snippets
const program = await parse(`
REM arrays
dim A[1,4]
number = A[1]

REM Variables
some_string$ = "Hello ""World"""
some_number = 3.14 - +1
some_integer% = 7
some_object! = NULL()

FOR i=1 TO 10
    PRINT "Number ", i
NEXT
`)

// From compiler-options.test.ts - Configuration fixtures
const config = createMockConfig({
    'compiler.typeChecking.enabled': true,
    'compiler.typeChecking.warnings': true
});
```

**Location:**
- Inline test data for small fixtures (most tests)
- `test/test-data/` directory for example .bbj files used by `example-files.test.ts`
- `test/test-helper.ts` contains shared test utilities: `findByIndex`, `findFirst`, `initializeWorkspace`

## Coverage

**Requirements:** No coverage requirements enforced (no coverage config in package.json)

**View Coverage:**
- No coverage command available
- Could be added via: `npm run test -- --coverage` with Vitest coverage plugin

## Test Types

**Unit Tests:**
- Scope: Individual functions and classes
- Approach: Test with mocked dependencies and simple inputs
- Example `compiler-options.test.ts`: Tests `buildCompileOptions()` and `validateOptions()` with mock configs
- Example `utils.test.ts`: Tests `parseSettings()` parsing logic with fixed input
- Location: `src/Commands/`, `src/language/` individual components

**Integration Tests:**
- Scope: Parser + Validator together, complete language features
- Approach: Parse real BBj code and verify AST properties
- Example `parser.test.ts`: Parse BBj statements and verify AST node types
- Example `validation.test.ts`: Parse code and run validators, checking for specific diagnostics
- Example `classes.test.ts`: Parse class definitions and verify scope/linking
- Location: Most tests in `test/` directory that use `validationHelper` or `parseHelper`

**E2E Tests:**
- Framework: Not detected in current test suite
- Alternative: Example file parsing in `example-files.test.ts` serves as integration smoke test

## Common Patterns

**Async Testing:**
```typescript
// From parser.test.ts
test('Program parsed', async () => {
    const result = await parse('some_string$ = "Hello ""World"""')
    expect(isProgram(result.parseResult.value)).true
})

// From validation.test.ts - Using validationHelper
test('Symbolic link reference starts with', async () => {
    const validationResult = await validate(`
    class public List
    classend
    let map = new List(err=*next)
    `);

    expectNoIssues(validationResult, {
        node: findFirst(validationResult.document, isBinaryExpression),
        property: 'right'
    });
});
```

**Error Testing:**
```typescript
// From validation.test.ts
test('KeyedFile statement invalid options', async () => {
    const validationResult = await validate(`
    VKEYED "MYFILE",10,80,1000,MODE="somemode"
    XKEYED "MYFILE",10,80,1000,MODE="somemode"
    `);

    expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
        node: findFirst(validationResult.document, isKeyedFileStatement),
        property: 'mode'
    });
    expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
        node: findByIndex(validationResult.document, isKeyedFileStatement, 1),
        property: 'mode'
    });
});
```

**Performance Testing:**
```typescript
// From parser.test.ts - Sanity check performance
test('Performance test', async () => {
    const count = 5;
    const startTime = performance.now();
    for (let index = 0; index < count; index++) {
        await parse(`print x;`, { validation: false });
    }
    const endTime = performance.now();
    const timeInSeconds = (endTime - startTime) / 1000;
    console.log(`Parse ${count} times took: ${timeInSeconds} seconds`);
    expect(timeInSeconds, 'Parser is too slow').toBeLessThan(14);
});
```

**Type Guard Testing:**
```typescript
// From parser.test.ts - Verify AST node types
function expectToContainAstNodeType<N extends AstNode>(document: LangiumDocument, predicate: (ast: AstNode) => ast is N) {
    expect(AstUtils.streamAst(document.parseResult.value).some(predicate)).toBeTruthy();
}

test('Library parsed', async () => {
    const lib = await parse(`library ...`);
    expect(isLibrary(lib.parseResult.value)).true
})
```

## Test Helpers

**Key helpers in `test/test-helper.ts`:**
- `findFirst(document, predicate)` - Find first AST node matching type guard
- `findByIndex(document, predicate, index)` - Find nth matching AST node
- `initializeWorkspace(sharedServices)` - Initialize workspace for document parsing

**Langium test helpers used:**
- `parseHelper<T>(services)` - Creates parse function for language
- `validationHelper<T>(services)` - Creates validation function
- `expectError(result, message, location)` - Assert diagnostic error at location
- `expectNoIssues(result, filter?)` - Assert no diagnostics (optionally filtered)

## Total Test Coverage

- **Total test files:** 13
- **Total test lines:** ~3,938
- **Coverage areas:**
  - Parser and lexer: `parser.test.ts`, `lexer.test.ts`
  - Validators: `validation.test.ts`, `classes.test.ts`, `linking.test.ts`
  - Language providers: `completion-test.test.ts`, `document-symbol.test.ts`, `javadoc.test.ts`, `comment-provider.test.ts`
  - Commands/Options: `compiler-options.test.ts`
  - Utilities: `utils.test.ts`
  - Integration: `imports.test.ts`, `example-files.test.ts`

---

*Testing analysis: 2026-02-01*
