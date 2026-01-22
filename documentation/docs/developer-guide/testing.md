---
sidebar_position: 4
title: Testing
---

# Testing

The BBj Language Server includes a comprehensive test suite to ensure reliability and correctness.

## Test Framework

The project uses [Vitest](https://vitest.dev/) as the test framework, which provides:

- Fast execution
- TypeScript support
- Watch mode
- Coverage reporting

## Running Tests

### All Tests

```bash
cd bbj-vscode
npm run test
```

### Watch Mode

```bash
npm run test:watch
```

### Specific Test File

```bash
npx vitest run parser.test.ts
```

### Specific Test Case

```bash
npx vitest run -t "Check IF verb"
```

## Test Structure

Tests are located in `bbj-vscode/test/`:

```
test/
├── parser.test.ts          # Parser functionality
├── lexer.test.ts           # Lexical analysis
├── completion-test.test.ts # Code completion
├── validation.test.ts      # Validation rules
├── linking.test.ts         # Reference resolution
├── document-symbol.test.ts # Document symbols
├── comment-provider.test.ts# Comment handling
├── javadoc.test.ts         # JavaDoc processing
├── imports.test.ts         # Import statements
├── classes.test.ts         # Class definitions
├── example-files.test.ts   # Real-world file parsing
├── utils.test.ts           # Utility functions
└── test-data/              # Test fixtures
    ├── *.bbj               # Sample BBj files
    └── *.json              # JSON fixtures
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { createServices } from './test-utils';

describe('Feature name', () => {
    it('should do something', async () => {
        const services = createServices();
        // Test implementation
        expect(result).toBe(expected);
    });
});
```

### Testing Parser

```typescript
import { parseHelper } from './test-utils';

describe('Parser', () => {
    it('should parse IF statement', async () => {
        const parse = await parseHelper();
        const result = await parse(`
            IF x = 1 THEN
                PRINT "one"
            FI
        `);

        expect(result.parserErrors).toHaveLength(0);
        expect(result.value.declarations).toHaveLength(1);
    });
});
```

### Testing Validation

```typescript
import { validationHelper } from './test-utils';

describe('Validation', () => {
    it('should report undefined variable', async () => {
        const validate = await validationHelper();
        const diagnostics = await validate(`
            PRINT undefined_var$
        `);

        expect(diagnostics).toContainEqual(
            expect.objectContaining({
                message: expect.stringContaining('undefined')
            })
        );
    });
});
```

### Testing Completion

```typescript
import { completionHelper } from './test-utils';

describe('Completion', () => {
    it('should suggest keywords', async () => {
        const complete = await completionHelper();
        const completions = await complete(`
            PRI<cursor>
        `);

        expect(completions.items).toContainEqual(
            expect.objectContaining({ label: 'PRINT' })
        );
    });
});
```

## Test Utilities

### `test-utils.ts`

Common utilities for testing:

```typescript
// Create language services
export function createServices(): BBjServices;

// Parse helper
export function parseHelper(): Promise<ParseHelper>;

// Validation helper
export function validationHelper(): Promise<ValidationHelper>;

// Completion helper
export function completionHelper(): Promise<CompletionHelper>;
```

### Test Data Files

Place test fixtures in `test/test-data/`:

- `.bbj` files for parsing tests
- `.json` files for expected results
- Subdirectories for organized test cases

## VS Code Launch Configurations

Debug tests in VS Code:

1. **Vitest: Run All** - Run entire test suite
2. **Vitest: Run Selected File** - Run current test file

Set breakpoints and step through test execution.

## Coverage

Generate coverage report:

```bash
npx vitest run --coverage
```

Coverage report is generated in `coverage/` directory.

## Verb Test Table

The project maintains a comprehensive test table in `VERBs.md` tracking implementation status for all BBj verbs:

| Status | Verb | Test Command |
|--------|------|--------------|
| OK | ADDR | `npx vitest run -t "Check ADDR verb"` |
| OK | BACKGROUND | `npx vitest run -t "Check BACKGROUND statement"` |
| TODO | AUTO | Needs implementation |
| ... | ... | ... |

Use this table to:
- Find tests for specific verbs
- Identify missing test coverage
- Track implementation progress

## Testing Best Practices

### 1. Isolate Tests

Each test should be independent:

```typescript
it('should work independently', async () => {
    // Create fresh services for each test
    const services = createServices();
    // ...
});
```

### 2. Test Edge Cases

```typescript
describe('Edge cases', () => {
    it('handles empty input', async () => { /* ... */ });
    it('handles very long lines', async () => { /* ... */ });
    it('handles special characters', async () => { /* ... */ });
});
```

### 3. Use Descriptive Names

```typescript
// Good
it('should report error when variable is used before declaration', ...);

// Bad
it('test1', ...);
```

### 4. Test Both Success and Failure

```typescript
describe('Validation', () => {
    it('accepts valid syntax', async () => { /* ... */ });
    it('rejects invalid syntax', async () => { /* ... */ });
});
```

## Continuous Integration

Tests run automatically on:

- Pull requests
- Pushes to main branch

Check `.github/workflows/build.yml` for CI configuration.

## Java Interop Tests

The Java service has its own test suite:

```bash
cd java-interop
./gradlew test
```

Tests are in `src/test/java/` using JUnit 5.
