# Testing Patterns

**Analysis Date:** 2026-09-21

## Test Framework

**Runner:**
- Framework: Vitest 4.1.10
- Config: `bbj-vscode/vitest.config.ts`
- Node minimum: v22

**Assertion Library:**
- Built-in Vitest expect() API
- Langium test assertions: `expectNoIssues()`, `expectError()`, `expectWarning()`, `expectCompletion()`

**Run Commands:**
```bash
npm test                       # Run all tests (vitest run)
npm run test:watch             # Watch mode (vitest watch)
npm run test:coverage          # Generate coverage report (v8, HTML output to ./coverage)
npm run test:bbj               # Run all tests including BBj-dependent tests (RUN_BBJ_TESTS=1)
npx vitest run test/file.test.ts  # Run single test file
```

**Coverage Configuration (`vitest.config.ts`):**
- Provider: V8
- Reporters: text, html, json-summary
- Reports directory: `./coverage`
- Excluded from coverage:
  - `src/language/generated/**` (Langium-generated, excluded from measurement)
  - `src/extension.ts` (VSCode extension entry point, hard to unit test)
  - `**/*.d.ts` (type definitions)
- Thresholds (conservative, non-enforced by CI):
  - Lines: 50%, Functions: 45%, Branches: 40%, Statements: 50%
  - Only triggered by `npm run test:coverage` script
  - CI does NOT run coverage checks currently

## Test File Organization

**Location:**
- Test files in `bbj-vscode/test/` directory (separate from `src/`)
- Follow directory structure of tested code
- Examples:
  - `test/validation.test.ts` - tests for `src/language/bbj-validator.ts`
  - `test/rename.test.ts` - tests for rename provider
  - `test/linking.test.ts` - tests for linking/reference resolution
  - `test/completion-test.test.ts` - tests for completion provider

**Naming:**
- Pattern: `[feature].test.ts`
- Examples: `validation.test.ts`, `rename.test.ts`, `completion-test.test.ts`
- Test data lives in `test/test-data/` subdirectory

**Structure:**
```
test/
├── test-data/              # Test fixtures and example BBj files
│   ├── issue190-switch-case.bbj
│   ├── class-def.bbj
│   └── conformance/        # Conformance suite test data
├── bbj-test-module.ts      # Test service injection
├── test-helper.ts          # Shared test utilities
├── validation.test.ts      # Main validator tests
├── linking.test.ts         # Linking/resolution tests
├── completion-test.test.ts # Completion provider tests
└── rename.test.ts          # Rename provider tests
```

**Test Data:**
- Example files in `test/test-data/` automatically parsed by `example-files.test.ts`
- Files must produce zero lexer/parser errors (regression test)
- Named after issues: `issue447-`, `issue190-`
- Conformance test corpus in `test/test-data/conformance/`

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test, beforeAll } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

describe('Feature Name Tests', async () => {
    const services = createBBjTestServices(EmptyFileSystem);
    let helper: ReturnType<typeof createHelper>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        helper = createHelper(services);
    });

    test('Test case description', async () => {
        // Arrange
        const source = `...`;
        
        // Act
        const result = await helper.doSomething(source);
        
        // Assert
        expect(result).toBeDefined();
    });
});
```

**Common Test Patterns:**

1. **Validation Helper Pattern** (from `validation.test.ts`):
   ```typescript
   const services = createBBjServices(EmptyFileSystem);
   const validate = validationHelper<Program>(services.BBj);
   
   test('Check something', async () => {
       const result = await validate(`code here`);
       expectNoIssues(result);
   });
   ```

2. **Parse Helper Pattern** (from `linking.test.ts`):
   ```typescript
   const validate = (content: string) => 
       parseHelper<Model>(services.BBj)(content, { validation: true });
   
   test('Linking test', async () => {
       const doc = await validate(`code`);
       expectNoErrors(doc);
   });
   ```

3. **Custom Provider Helper Pattern** (from `rename.test.ts`):
   ```typescript
   async function renameAt(source: string, symbol: string, occurrence: number, newName: string) {
       const parse = parseHelper<Model>(services.BBj);
       const uri = `file:///test/rename${counter++}.bbj`;
       const doc = await parse(source, { documentUri: uri, validation: false });
       const provider = services.BBj.lsp.RenameProvider;
       
       // Find occurrence and call provider
       const text = doc.textDocument.getText();
       let idx = -1;
       for (let i = 0; i < occurrence; i++) {
           idx = text.indexOf(symbol, idx + 1);
       }
       
       const position = doc.textDocument.positionAt(idx);
       const edit = await provider!.rename(doc, { textDocument: { uri }, position, newName });
       return edit?.changes?.[uri] ?? [];
   }
   ```

4. **Completion Provider Pattern** (from `completion-test.test.ts`):
   ```typescript
   const completion = expectCompletion(bbjServices);
   
   test('completion case', async () => {
       await completion({
           text: `code with <|> marker`,
           index: 0,
           expectedItems: ['item1', 'item2']
       });
   });
   ```

**Setup/Teardown:**
- `beforeAll()`: Initialize workspace once per describe block
- No `afterAll()` in most tests (workspace reused across tests)
- Unique documentUri for each test to avoid cross-contamination
- Counter variables increment to ensure unique URIs:
  ```typescript
  let counter = 0;
  const uri = `file:///test/feature${counter++}.bbj`;
  ```

## Mocking

**Framework:** Vitest's `vi` object + Langium test utilities

**Mocking Strategy:**

1. **Java Interop Mocking** (from `bbj-test-module.ts`):
   - `JavaInteropTestService` extends real `JavaInteropService`
   - Injects fake Java classes (BBjAPI, HashMap, String, etc.) instead of reaching :5008
   - Never reaches real socket service in unit tests
   - Test seam: `seedCompleteClassIndex()` for full index behavior
   - Test seam: `resetCompleteClassIndex()` to revert to old-server behavior

   ```typescript
   class JavaInteropTestService extends JavaInteropService {
       constructor(services: BBjServices) {
           super(services);
           // Init JavadocProvider
           if (!JavadocProvider.getInstance().isInitialized()) {
               JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider);
           }
           // Add fake Java classes
           const fakeClasses = [
               createBBjApiClass(this.classpath),
               createHashMapClass(this.classpath),
               // ...
           ];
           fakeClasses.forEach(c => {
               this.classpath.classes.push(c);
               this.resolveClass(c);
           });
       }
       
       public override async ensureCompleteClassIndex(): Promise<boolean> {
           return this.hasCompleteClassIndex();  // Never reaches socket
       }
   }
   ```

2. **Test Service Module** (from `bbj-test-module.ts`):
   ```typescript
   export function createBBjTestServices(context: DefaultSharedModuleContext) {
       const shared = inject(
           createDefaultSharedModule(context),
           BBjGeneratedSharedModule,
           BBjSharedModule
       );
       const BBj = inject(
           createDefaultModule({ shared }),
           BBjGeneratedModule,
           BBjModule,
           BBjTestModule  // Overrides real services with test versions
       );
       registerValidationChecks(BBj);
       return { shared, BBj };
   }
   
   const BBjTestModule: Module<BBjServices, PartialLangiumServices & DeepPartial<BBjAddedServices>> = {
       parser: {
           Lexer: (services) => new TestableBBjLexer(services)
       },
       java: {
           JavaInteropService: (services) => new JavaInteropTestService(services)
       }
   }
   ```

3. **Vitest Spies** (from `completion-test.test.ts`):
   ```typescript
   import { vi } from 'vitest';
   // Vitest vi.spyOn() available but rarely used in this codebase
   // Mocking at the service level is preferred
   ```

**What to Mock:**
- Java interop socket service (always mocked via JavaInteropTestService)
- File system access (EmptyFileSystem for unit tests)
- BBjCPL compiler integration (stubbed or skipped in unit tests)

**What NOT to Mock:**
- Langium parser/lexer (test with real parsing)
- Validation framework (test real validation checks)
- LSP providers (test real provider implementations)
- Type inference logic (test real type computation)

## Fixtures and Factories

**Test Data Strategy:**

1. **Inline BBj Code** (most common):
   ```typescript
   test('Test name', async () => {
       const result = await validate(`
           class public MyClass
           classend
           let x = new MyClass()
       `);
       expectNoIssues(result);
   });
   ```

2. **Test Data Files** (for complex multi-file tests):
   - Location: `test/test-data/`
   - Naming: `[feature]-[purpose].bbj` or `issue[number]-[description].bbj`
   - Examples: `issue190-switch-case.bbj`, `issue447-[name].bbj`

3. **Fake Java Class Factories** (from `bbj-test-module.ts`):
   ```typescript
   function createBBjApiClass(classpath: Classpath): JavaClass {
       const javaClass = JavaClass.create({
           name: 'BBjAPI',
           packageName: 'com.basis.startup',
           isAbstract: false,
           isInterface: false,
           // ...
       });
       // Add methods and fields
       return javaClass;
   }
   ```

4. **Helper Factory Functions** (from `test-helper.ts`):
   ```typescript
   export async function initializeWorkspace(shared: LangiumSharedServices) {
       const wsManager = shared.workspace.WorkspaceManager;
       await wsManager.initializeWorkspace([{ name: 'test', uri: 'file:/test' }]);
   }
   
   export function findFirst<T extends AstNode>(
       document: LangiumDocument,
       filter: (item: unknown) => item is T,
       streamAll: boolean = false
   ): T | undefined {
       return (streamAll ? 
           AstUtils.streamAllContents(document.parseResult.value) : 
           AstUtils.streamContents(document.parseResult.value)
       ).find(filter);
   }
   
   export function findByIndex<T extends AstNode>(
       document: LangiumDocument,
       filter: (item: unknown) => item is T,
       index: number
   ): T | undefined {
       const matches = AstUtils.streamContents(document.parseResult.value)
           .filter(filter).toArray();
       return matches[index];
   }
   ```

## Coverage

**Requirements:** No enforced minimum (conservative thresholds start at 50% lines)

**View Coverage:**
```bash
npm run test:coverage
# View HTML report
open coverage/index.html
```

**Coverage Reporting:**
- Enabled: `provider: 'v8'` in vitest.config.ts
- Formats: text (console), html (detailed), json-summary (CI integration)
- Default disabled: set `enabled: false`, requires `--coverage` flag to activate

**Coverage Gaps:**
- Langium-generated code explicitly excluded: `src/language/generated/**`
- VSCode extension entry point hard to test: `src/extension.ts`
- CPL/BBj integration tests skipped unless `RUN_BBJ_TESTS=1` (environment-dependent)

## Test Types

**Unit Tests:**
- Scope: Individual service methods, validators, helpers
- Approach: Inline BBj code, test single feature in isolation
- Fixtures: EmptyFileSystem, test services with mocked Java interop
- Examples: `validation.test.ts`, `linking.test.ts`
- Count: Majority of test suite

**Integration Tests:**
- Scope: Multiple providers working together (e.g., resolve + hover, completion + linking)
- Approach: Set up multi-statement BBj programs, test cross-component behavior
- Fixtures: Real workspace manager, can test multiple documents
- Examples: Complex rename tests, completion refinement tests
- Conditional: Some tests run only if `RUN_BBJ_TESTS=1` (BBj runtime on :5008)

**E2E Tests:**
- Framework: None in this codebase (manual UAT instead)
- VSCode extension e2e testing via ext-test suite (separate from unit tests)
- Manual UAT checklist in `QA/` directory

## Common Patterns

**Async Testing:**
```typescript
test('Async operation', async () => {
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
});
```

**Error Testing:**
```typescript
test('Validation error case', async () => {
    const result = await validate(`invalid syntax`);
    expectError(result, 'Expected error message', {
        node: findFirst(result.document, isSpecificType),
        property: 'fieldName'
    });
});
```

**Conditional Tests (BBj-dependent):**
```typescript
import { shouldRunBBjTests } from './test-helper.js';

describe('BBj Integration Tests', async () => {
    let isInteropRunning = await shouldRunBBjTests();
    
    test.skipIf(!isInteropRunning)('Test requiring :5008', async () => {
        // Only runs if RUN_BBJ_TESTS=1 or port 5008 is open
    });
});
```

**Completion Testing with Trigger Characters:**
```typescript
// Custom completion driver for '#' trigger (field access)
async function fieldCompletion(text: string, cancelToken?: CancellationToken) {
    const offset = text.indexOf('<|>');
    const clean = text.replace('<|>', '');
    const doc = await parseHelper<Model>(bbjServices)(
        clean, { documentUri: `file:///field-completion-${counter++}.bbj` });
    const params: CompletionParams = {
        textDocument: { uri: doc.textDocument.uri },
        position: doc.textDocument.positionAt(offset),
        context: { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter: '#' }
    };
    return bbjServices.lsp.CompletionProvider!.getCompletion(doc, params, cancelToken);
}
```

**Reference Finding Helper:**
```typescript
function findLinkingErrors(document: LangiumDocument): Diagnostic[] {
    return document.diagnostics?.filter(
        err => err.data?.code === DocumentValidator.LinkingError
    ) ?? [];
}

test('Linking test', async () => {
    const doc = await validate(`code`);
    const errors = findLinkingErrors(doc);
    expect(errors).toHaveLength(0);
});
```

**Marker-based Position Testing:**
```typescript
// Test helpers use '<|>' marker to indicate cursor position
const text = `class public MyClass\nmethod<|>\nmethodend`;
const offset = text.indexOf('<|>');
const clean = text.replace('<|>', '');
const position = doc.textDocument.positionAt(offset);
```

## Test Environment

**Environment Variables:**

- `RUN_BBJ_TESTS`: Controls BBj-dependent test execution
  - `1` or `true`: Force BBj tests on
  - `0` or `false`: Force BBj tests off
  - Unset (default): Run only if port 5008 is reachable

**Node Requirements:**
- Minimum Node v22 (TypeScript target ES6, module Node16)
- Maximum: Latest LTS supported by VSCode (1.101.0+)

**Workspace Setup:**
- All tests use `EmptyFileSystem` (no real disk access)
- Workspace initialized once per describe block via `initializeWorkspace()`
- Test documents get unique URIs to avoid collision

**Known Conditional Skips:**
- Tests requiring Java interop (port 5008) can be conditionally skipped
- Tests requiring BBj compiler integration can be skipped if interop unavailable
- All tests pass CI environment without these external dependencies

---

*Testing analysis: 2026-09-21*
