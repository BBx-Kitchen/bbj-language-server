# Phase 19: Test Plan - Research

**Researched:** 2026-02-04
**Domain:** Software testing strategy and test planning for TypeScript/Langium language servers
**Confidence:** HIGH

## Summary

Phase 19 focuses on creating a comprehensive test plan for the BBj Language Server to formalize testing practices, improve coverage, address known test failures, and establish quality gates for future development. The project currently has a strong test foundation (331/335 tests passing, 98.8% pass rate) using vitest as the test runner and Langium's test utilities.

Research identifies three primary focus areas: (1) fixing the 2 pre-existing test failures in completion-test.test.ts and comment-provider.test.ts that fail due to workspace initialization issues, (2) implementing test coverage reporting to identify gaps in the 39 source files, and (3) documenting a comprehensive test strategy that codifies current testing patterns and establishes quality gates for future phases.

The current test suite demonstrates mature testing practices with separation of concerns (unit tests for parser/lexer/validation, functional tests for LSP features) and good use of Langium testing utilities (parseHelper, expectCompletion). The infrastructure is solid but lacks coverage measurement and formal documentation.

**Primary recommendation:** Create a comprehensive test plan document that establishes coverage baselines, formalizes test categorization (unit/integration/functional), documents testing patterns, and sets quality gates for future development. Fix the 2 failing tests as foundational work, then add coverage tooling to identify gaps.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 1.6.1 | Test runner and framework | Industry standard for Vite/ESM projects, 30-70% faster than Jest, native TypeScript support |
| langium/test | 4.1.3 | Langium testing utilities | Official testing API for Langium language servers, provides parseHelper, expectCompletion |
| @vitest/coverage-v8 | latest | Code coverage provider | Native V8 coverage via Chrome DevTools Protocol, no transpilation needed, fastest option |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/ui | 1.6.x | Browser-based test UI | Development-time test visualization and debugging |
| vitest-github-actions-reporter | latest | CI reporting | GitHub Actions integration for test results in PRs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vitest/coverage-v8 | @vitest/coverage-istanbul | Istanbul offers battle-tested instrumentation (since 2012) but requires Babel pre-transpilation and is slower; V8 is sufficient for Node-based language server |

**Installation:**
```bash
npm install --save-dev @vitest/coverage-v8 @vitest/ui
```

## Architecture Patterns

### Recommended Test Structure
```
test/
├── functional/         # End-to-end LSP feature tests (integration level)
│   ├── lsp-features.test.ts      # FUNC-01 through FUNC-09 verification
│   └── chevrotain-tokens.test.ts # Token runtime verification
├── unit/              # Isolated component tests (NOT YET CREATED)
│   ├── parser.test.ts           # Move from root
│   ├── lexer.test.ts            # Move from root
│   ├── validation.test.ts       # Move from root
│   └── scope.test.ts            # Future: test bbj-scope in isolation
├── integration/       # Multi-component interaction tests (NOT YET CREATED)
│   ├── linking.test.ts          # Move from root
│   ├── imports.test.ts          # Move from root
│   └── java-interop.test.ts     # Future: comprehensive Java interop
├── bbj-test-module.ts # Test service factory
└── test-helper.ts     # Shared test utilities
```

### Pattern 1: Langium Test Service Factory
**What:** Custom service builder that injects test-specific implementations (mocked Java classes, testable lexer)
**When to use:** Every test file that needs to parse BBj code or access language services
**Example:**
```typescript
// Source: bbj-vscode/test/bbj-test-module.ts
import { EmptyFileSystem } from 'langium';
import { createBBjTestServices } from './bbj-test-module.js';

const services = createBBjTestServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);
```

### Pattern 2: Parse and Validate Helper
**What:** Reusable assertion function that verifies no lexer, parser, or validation errors
**When to use:** Functional and integration tests where valid BBj code should parse cleanly
**Example:**
```typescript
// Source: Langium testing best practices (dev.to/diverse_research)
function expectNoErrors(document: LangiumDocument) {
    expect(document.parseResult.lexerErrors.length).toBe(0);
    expect(document.parseResult.parserErrors.length).toBe(0);
    expect(document.diagnostics?.filter(d => d.severity === DiagnosticSeverity.Error).length).toBe(0);
}
```

### Pattern 3: Workspace Initialization for LSP Tests
**What:** Initialize the Langium workspace manager before running LSP feature tests
**When to use:** Tests that access workspace-level services (completion, hover, references)
**Example:**
```typescript
// Source: bbj-vscode/test/test-helper.ts
beforeAll(async () => {
    await initializeWorkspace(services.shared);
});
```

### Pattern 4: Coverage Configuration with Thresholds
**What:** Vitest coverage configuration with quality gates
**When to use:** Establish minimum coverage baselines to prevent regressions
**Example:**
```typescript
// Source: https://vitest.dev/config/coverage
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/language/generated/**', 'src/extension.ts'],
      thresholds: {
        lines: 70,      // Start conservative, increase over time
        functions: 65,
        branches: 60,
        statements: 70
      }
    }
  }
})
```

### Anti-Patterns to Avoid
- **Indexing synthetic test documents:** Causes "service registry contains no services for extension" errors. Test documents should NOT be added to the workspace index (Phase 17 decision: synthetic test documents should not be indexed)
- **Skipping workspace initialization:** Completion and other LSP features require workspace manager initialization before tests run
- **Mixing test concerns:** Don't test parser correctness and semantic validation in the same test case; separate syntax tests from validation tests
- **No test isolation:** Always use `EmptyFileSystem` or clean workspace state; don't share documents across test cases

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test coverage reporting | Custom code instrumenter | @vitest/coverage-v8 | Native V8 coverage via CDP, no transpilation, handles TypeScript source maps automatically |
| LSP test harnesses | Custom document builders | langium/test (parseHelper, expectCompletion) | Official Langium testing API, handles service initialization and document lifecycle |
| Test result formatting | Custom reporters | vitest built-in reporters + vitest-github-actions-reporter | Battle-tested, handles CI integration, structured output for GitHub PRs |
| Workspace initialization | Manual document indexing | initializeWorkspace helper | Prevents service registry errors, handles document lifecycle correctly |

**Key insight:** Langium and Vitest ecosystems provide comprehensive testing infrastructure. Custom solutions introduce maintenance burden and risk missing edge cases (e.g., service registry lifecycle, document URI handling).

## Common Pitfalls

### Pitfall 1: Test Failures Due to Workspace Initialization Order
**What goes wrong:** Tests fail with "Could not resolve reference" or service registry errors even though the same code works at runtime
**Why it happens:** LSP services (completion, hover, references) require workspace manager initialization. If workspace isn't initialized before services access indexed documents, lookups fail
**How to avoid:** Always call `await initializeWorkspace(services.shared)` in `beforeAll` hook for LSP feature tests
**Warning signs:** Tests pass individually (`vitest run specific-test.test.ts`) but fail when run with full suite; "service registry contains no services" errors

### Pitfall 2: Coverage Provider Mismatch with Environment
**What goes wrong:** Coverage generation fails or produces incorrect results
**Why it happens:** V8 coverage provider requires V8-based runtime (Node.js). Istanbul provider requires Babel transpilation. Mismatched provider/environment causes failures
**How to avoid:** Use v8 provider for Node.js language servers (this project's case). Only use istanbul if targeting non-V8 runtimes (Firefox, Bun)
**Warning signs:** Coverage reports show 0% coverage or crash with "profiler not available"

### Pitfall 3: Generated Code in Coverage Reports
**What goes wrong:** Coverage reports show low percentages due to untested generated files (ast.ts, grammar.ts, module.ts)
**Why it happens:** Langium CLI generates code that isn't meant to be tested directly
**How to avoid:** Exclude `src/language/generated/**` from coverage reports using `coverage.exclude` configuration
**Warning signs:** Coverage percentage is artificially low; reports list generated files with 0% coverage

### Pitfall 4: Test Coverage Theater
**What goes wrong:** Team focuses on achieving arbitrary coverage numbers (e.g., 100%) rather than testing meaningful scenarios
**Why it happens:** Coverage metrics become targets rather than diagnostic tools
**How to avoid:** Set realistic baselines (70% lines, 65% functions) that prevent regressions. Focus test effort on critical paths (parser, validator, LSP features) rather than coverage maximization
**Warning signs:** Tests that exercise code without assertions; tests for getter/setter methods with no logic

## Code Examples

Verified patterns from official sources:

### Test Service Factory with Mocked Dependencies
```typescript
// Source: bbj-vscode/test/bbj-test-module.ts (HIGH confidence - project file)
import { createBBjTestServices } from './bbj-test-module.js';
import { EmptyFileSystem } from 'langium';

const services = createBBjTestServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);
const completion = expectCompletion(services.BBj);

// BBjTestModule injects:
// - TestableBBjLexer (exposes protected methods)
// - JavaInteropTestService (pre-populated with HashMap, BBjAPI, String classes)
```

### Functional LSP Feature Test
```typescript
// Source: bbj-vscode/test/functional/lsp-features.test.ts (HIGH confidence - project file)
describe('LSP Feature Verification Tests', async () => {
    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    test('Should propose BBj keywords on partial input', async () => {
        await completion({
            text: `PR<|>`,
            index: 0,
            assert: (completions) => {
                const labels = completions.items.map(item => item.label);
                expect(labels.some(l => l.toLowerCase() === 'print')).toBe(true);
            }
        });
    });
});
```

### Coverage Configuration
```typescript
// Source: https://vitest.dev/config/coverage (HIGH confidence - official docs)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: false, // Enable via --coverage flag, not by default
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/language/generated/**',
        'src/extension.ts',
        '**/*.d.ts',
        '**/types/**'
      ],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70
      }
    }
  }
})
```

### Test Plan Document Structure
```typescript
// Source: https://www.testrail.com/blog/create-a-test-plan/ (MEDIUM confidence - verified pattern)
// Test plan should include:
// 1. Test Scope - What is and isn't covered
// 2. Test Objectives - Quality gates and acceptance criteria
// 3. Test Strategy - Unit/integration/functional categorization
// 4. Test Environment - Node version, OS requirements
// 5. Entry/Exit Criteria - When to start/stop testing phases
// 6. Risk Analysis - Known issues and mitigation strategies
// 7. Test Schedule - Timeline for test execution
// 8. Test Deliverables - Coverage reports, test results
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest test runner | Vitest test runner | Langium 4 upgrade (2024-2025) | 30-70% faster CI execution, native ESM support, better TypeScript integration |
| expectFunction from langium/test | node:assert package | Langium 4.0+ | Simplified testing API, removed deprecated utilities |
| Manual workspace initialization | initializeWorkspace helper | Project evolution | Prevents service registry errors consistently |
| Pre-commit hooks without tests | CI-based testing only | Current state | No quality gates before commits; opportunity to add pre-commit test hooks |

**Deprecated/outdated:**
- `expectFunction` from langium/test: Deprecated in Langium 4, use node:assert or vitest's expect
- Jest for Langium projects: Vitest is now the standard recommendation for new Langium projects

## Open Questions

Things that couldn't be fully resolved:

1. **Should Phase 19 reorganize test directory structure?**
   - What we know: Current structure mixes unit and integration tests in root test/ directory; functional/ subdirectory exists for LSP tests
   - What's unclear: Whether reorganization risk outweighs benefit at this stage; potential for breaking existing test patterns
   - Recommendation: Document recommended structure in test plan but defer reorganization to future phase. Current structure works; cleanup is nice-to-have, not critical

2. **What coverage thresholds are realistic for this project?**
   - What we know: 39 source files, 335 passing tests, strong parser/validator coverage based on test names
   - What's unclear: Current coverage percentage unknown (no tooling in place)
   - Recommendation: Add coverage tooling first, establish baseline (likely 60-75% based on test suite size), then set thresholds 5-10% below baseline to prevent regressions

3. **Should IntelliJ plugin have separate test plan?**
   - What we know: IntelliJ plugin bundles language server (main.cjs), verified manually in Phase 18
   - What's unclear: Whether IntelliJ-specific test automation is in scope for test plan
   - Recommendation: Test plan focuses on language server testing (VS Code extension is primary); IntelliJ manual verification remains out of scope (user handles)

4. **Do the 2 failing tests represent real bugs or initialization issues?**
   - What we know: completion-test.test.ts and comment-provider.test.ts fail; both use services without workspace initialization
   - What's unclear: Whether failures are test infrastructure issues or actual code bugs
   - Recommendation: Investigate both tests; if workspace initialization fixes them, they're infrastructure issues. If not, they're code bugs to fix

## Sources

### Primary (HIGH confidence)
- bbj-vscode/package.json - vitest 1.6.1 confirmed
- bbj-vscode/test/bbj-test-module.ts - test service factory pattern
- bbj-vscode/test/functional/lsp-features.test.ts - functional test patterns
- bbj-vscode/vitest.config.ts - minimal current configuration
- .planning/phases/18-functional-verification-release/18-VERIFICATION-REPORT.md - test suite status (335/337 passing)
- [Vitest Coverage Configuration](https://vitest.dev/config/coverage) - official v8/istanbul documentation
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage) - thresholds and best practices

### Secondary (MEDIUM confidence)
- [Testing DSLs in Langium (DEV Community)](https://dev.to/diverse_research/testing-your-dsls-in-langium-gp9) - parseHelper patterns, assertModelNoErrors helper
- [Vitest vs Jest 30: Why 2026 is the Year of Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) - performance benchmarks
- [Software Testing Best Practices for 2026](https://bugbug.io/blog/test-automation/software-testing-best-practices/) - test documentation guidance
- [How To Create A Test Plan (TestRail)](https://www.testrail.com/blog/create-a-test-plan/) - test plan structure template

### Tertiary (LOW confidence)
- [Test Strategy Templates (StrongQA)](https://strongqa.com/qa-portal/testing-docs-templates/test-strategy) - general testing strategy patterns (not language-server specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - vitest version confirmed in package.json, Langium testing utilities verified in project code
- Architecture: HIGH - patterns extracted directly from project's working test files (bbj-test-module.ts, lsp-features.test.ts)
- Pitfalls: HIGH - workspace initialization issue documented in Phase 17 decisions, coverage provider limitations from official vitest docs
- Test plan structure: MEDIUM - based on general testing best practices, not Langium-specific guidance

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - testing practices are stable, vitest 1.6.x is current)
