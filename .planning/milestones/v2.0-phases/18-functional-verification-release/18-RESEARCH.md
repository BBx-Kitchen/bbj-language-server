# Phase 18: Functional Verification & Release - Research

**Researched:** 2026-02-03
**Domain:** Language server functional testing, VS Code extension packaging, IntelliJ plugin building
**Confidence:** HIGH

## Summary

This phase verifies that all 9 language server features work identically in both VS Code and IntelliJ after the Langium 4 upgrade, then builds release artifacts without publishing. The standard approach is a two-part verification strategy: automated LSP testing using Langium's built-in test framework for VS Code, and build-only verification for IntelliJ (user tests runtime manually). A critical requirement is explicitly verifying the 7 Chevrotain "unreachable" tokens (EXTRACT, DELETE, INPUT, ENTER, SAVE, READ, FIND) work correctly at runtime, proving Phase 17's false-positive analysis correct.

The testing strategy leverages Langium's `parseHelper` from `langium/test` for automated verification of parser correctness, combined with direct LSP feature invocation tests using the language server's service API. Release artifact building uses `@vscode/vsce package` for VS Code (creates .vsix file) and `./gradlew buildPlugin` for IntelliJ (creates .jar in build/distributions/), both serving as packaging verification without actual publication.

**Primary recommendation:** Write automated tests using Langium's test framework with vitest, selecting diverse test fixtures from the examples/ directory, and explicitly test the 7 flagged tokens with both standalone and compound statement usage patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^1.6.1 | Test framework | Already in project, Langium ecosystem standard, fast unit testing |
| langium/test | ~4.1.x | Langium testing utilities | Official Langium test helpers, provides parseHelper for AST validation |
| @vscode/vsce | latest | VS Code packaging | Official Microsoft tool for .vsix creation |
| Gradle intellijPlatform plugin | 2.x | IntelliJ build | Official JetBrains plugin for building IDE plugins |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | ^22.0.0 | Node.js type definitions | Already in project for test type safety |
| langium EmptyFileSystem | ~4.1.x | Mock file system for tests | Isolate tests from real filesystem, already used in existing tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vitest | jest | Vitest is faster, ES module native, already in project |
| Automated tests | Manual testing only | Manual testing misses regressions, isn't repeatable |
| parseHelper | Raw LSP requests | parseHelper provides higher-level API, validates AST structure |

**Installation:**
```bash
# All dependencies already installed in project
npm test  # runs vitest
```

## Architecture Patterns

### Recommended Test File Structure
```
bbj-vscode/test/
├── functional/              # New: functional verification tests
│   ├── chevrotain-tokens.test.ts   # 7 unreachable tokens verification
│   ├── lsp-features.test.ts        # All 9 LSP features
│   └── fixtures/                   # Test BBj files
└── [existing test files]           # Keep existing unit tests
```

### Pattern 1: Langium parseHelper Testing
**What:** Use Langium's built-in parseHelper to verify parser correctness and language features
**When to use:** Testing syntax highlighting, diagnostics, completion, document symbols (features that depend on AST)
**Example:**
```typescript
// Source: langium/test documentation + bbj-vscode/test/parser.test.ts
import { parseHelper } from 'langium/test';
import { EmptyFileSystem } from 'langium';
import { createBBjServices } from '../src/language/bbj-module';
import { describe, test, expect } from 'vitest';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

describe('Feature verification', () => {
    test('READ token works standalone', async () => {
        const doc = await parse(`
            READ(1,KEY="TEST")A$
        `);
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
        expect(doc.parseResult.parserErrors).toHaveLength(0);
    });
});
```

### Pattern 2: LSP Feature Testing via Services
**What:** Directly invoke LSP features through the language service API
**When to use:** Testing completion, hover, signature help, go-to-definition (LSP protocol features)
**Example:**
```typescript
// Source: Langium testing patterns + VS Code LSP testing guide
import { CompletionList } from 'vscode-languageserver';

test('Completion provides BBj keywords', async () => {
    const doc = await parse('PR');
    const position = { line: 0, character: 2 };
    const completions = await services.BBj.lsp.CompletionProvider
        .getCompletion(doc, { textDocument: { uri: doc.uri.toString() }, position });

    const printItem = completions?.items.find(i => i.label === 'PRINT');
    expect(printItem).toBeDefined();
});
```

### Pattern 3: Two-Part Verification Strategy
**What:** Automated testing for VS Code features, build-only verification for IntelliJ
**When to use:** This project (user constraint: IntelliJ runtime testing is manual)
**Structure:**
```typescript
describe('VS Code Feature Verification (Automated)', () => {
    // All 9 features tested programmatically
    test('FUNC-01: Syntax highlighting', () => { /* ... */ });
    test('FUNC-02: Diagnostics', () => { /* ... */ });
    // ... etc
});

describe('IntelliJ Build Verification', () => {
    // Run as part of CI/test suite
    test('IntelliJ .jar artifact builds', async () => {
        // Invoke Gradle buildPlugin
        // Assert artifact exists at expected path
    });
});
```

### Anti-Patterns to Avoid
- **Over-testing implementation details:** Don't test Langium internals, test observable behavior (e.g., "completions contain PRINT" not "CompletionProvider.computeCompletions called")
- **Testing features in isolation:** Many LSP features depend on valid parsing — test holistically (parse + feature)
- **Ignoring test fixtures:** Reuse examples/ directory files as realistic test cases, don't create synthetic minimal snippets for everything

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST parsing for tests | Manual token/AST inspection | `parseHelper` from langium/test | Handles document lifecycle, validation, provides typed AST access |
| LSP protocol message testing | Raw JSON-RPC messages | Langium service API (CompletionProvider, HoverProvider, etc.) | Type-safe, abstracts protocol details, works at AST level |
| VS Code .vsix packaging | Manual zip with manifest | `@vscode/vsce package` | Validates manifest, handles assets, enforces marketplace rules |
| IntelliJ plugin building | Manual JAR packaging | Gradle intellijPlatform plugin | Handles dependencies, plugin.xml validation, IDE version compatibility |
| Test fixtures | Inline strings only | examples/ directory files | Real-world code catches edge cases, maintains realistic test coverage |

**Key insight:** Language server testing is about verifying the AST → LSP feature pipeline, not about testing Langium itself. Use Langium's test utilities to focus on your grammar's correctness and your custom service implementations.

## Common Pitfalls

### Pitfall 1: False Confidence from Unit Tests
**What goes wrong:** Unit tests pass but runtime integration fails (e.g., completion works in test but not in VS Code)
**Why it happens:** Tests use mocked services or simplified contexts that don't match real IDE environment
**How to avoid:**
- Use `createBBjServices(EmptyFileSystem)` exactly as production code does
- Test with realistic BBj code from examples/ directory
- Include multi-file scenarios (imports, USE statements) in tests
**Warning signs:** Tests pass but manual testing in VS Code reveals issues

### Pitfall 2: Chevrotain Token Testing Without Context
**What goes wrong:** Testing "READ works" without testing both standalone (`READ\n`) and compound (`READ RECORD`) patterns
**Why it happens:** Phase 17 identified the issue is about lookahead patterns distinguishing standalone vs compound usage
**How to avoid:** For each of the 7 tokens (EXTRACT, DELETE, INPUT, ENTER, SAVE, READ, FIND), test:
```typescript
test('READ standalone (triggers KEYWORD_STANDALONE)', async () => {
    const doc = await parse('READ\nPRINT "done"');
    expect(doc.parseResult.lexerErrors).toHaveLength(0);
});

test('READ compound (triggers individual READ token)', async () => {
    const doc = await parse('READ RECORD(1)A$');
    expect(doc.parseResult.lexerErrors).toHaveLength(0);
});
```
**Warning signs:** Tests only check one usage pattern per token

### Pitfall 3: Treating Build Failures as Packaging Issues
**What goes wrong:** `vsce package` or `gradlew buildPlugin` fails, assumed to be packaging configuration problem
**Why it happens:** Build failures often indicate source code issues (missing files, broken imports) not packaging issues
**How to avoid:**
- Run `npm run build` and `tsc -b` before attempting packaging
- Check that all referenced files exist (icons, grammars, LICENSE)
- Verify no git-ignored files are referenced in package.json "files" array
**Warning signs:** "File not found" errors during packaging step

### Pitfall 4: Skipping Diagnostics in Feature Tests
**What goes wrong:** Parser tests pass but validation/diagnostics aren't tested, regressions go unnoticed
**Why it happens:** Focus on "does it parse" rather than "does it diagnose correctly"
**How to avoid:**
```typescript
function expectNoValidationErrors(document: LangiumDocument) {
    expect(document.diagnostics?.map(d => d.message).join('\n')).toBe('');
}

test('Valid code has no diagnostics', async () => {
    const doc = await parse('PRINT "hello"', { validation: true });
    expectNoValidationErrors(doc);
});
```
**Warning signs:** No tests call `parse` with `{ validation: true }`

### Pitfall 5: Manual Verification Without Checklist
**What goes wrong:** User "tests" manually but forgets to check specific features, reports feature works when it doesn't
**Why it happens:** No structured verification checklist provided
**How to avoid:** Generate a clear pass/fail checklist document:
```markdown
## VS Code Verification Checklist
- [ ] FUNC-01: Syntax highlighting - Open examples/bbj-classes.bbj, verify keywords are colored
- [ ] FUNC-02: Diagnostics - Introduce syntax error, red squiggle appears
... (all 9 features with explicit test steps)
```
**Warning signs:** Verification report says "manually tested" without specific steps documented

## Code Examples

Verified patterns from official sources and existing tests:

### Example 1: Comprehensive Token Verification Test
```typescript
// Source: bbj-vscode/test/parser.test.ts + Phase 17 requirements
import { parseHelper } from 'langium/test';
import { EmptyFileSystem } from 'langium';
import { createBBjServices } from '../src/language/bbj-module';
import { describe, test, expect } from 'vitest';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

describe('Chevrotain Unreachable Tokens Runtime Verification', () => {
    // Each of 7 tokens tested in both standalone and compound contexts

    test('READ - standalone (KEYWORD_STANDALONE pattern)', async () => {
        const doc = await parse('READ\n', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
        expect(doc.parseResult.parserErrors).toHaveLength(0);
    });

    test('READ - compound statement (individual token)', async () => {
        const doc = await parse('READ(1,KEY="TEST")A$', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
        expect(doc.parseResult.parserErrors).toHaveLength(0);
    });

    test('INPUT - standalone', async () => {
        const doc = await parse('INPUT\n', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('INPUT - compound with prompt', async () => {
        const doc = await parse('INPUT "Name:", name$', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('ENTER - standalone', async () => {
        const doc = await parse('ENTER\n', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('ENTER - with variables', async () => {
        const doc = await parse('ENTER var1$, var2$', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('EXTRACT - compound statement', async () => {
        const doc = await parse('EXTRACT(1,KEY="key")data$', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('DELETE - standalone', async () => {
        const doc = await parse('DELETE\n', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('DELETE - with labels', async () => {
        const doc = await parse('DELETE label1, label2', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('SAVE - standalone', async () => {
        const doc = await parse('SAVE\n', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('SAVE - with filename', async () => {
        const doc = await parse('SAVE "program.bbj"', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });

    test('FIND - compound statement', async () => {
        const doc = await parse('FIND(1,KEY="key")data$', { validation: true });
        expect(doc.parseResult.lexerErrors).toHaveLength(0);
    });
});
```

### Example 2: LSP Feature Verification Test
```typescript
// Source: Langium testing patterns + VS Code extension testing guide
import { Position } from 'vscode-languageserver';

describe('FUNC-03: Code Completion', () => {
    test('BBj keywords appear in completions', async () => {
        const doc = await parse('P');
        const completions = await services.BBj.lsp.CompletionProvider
            .getCompletion(doc, {
                textDocument: { uri: doc.uri.toString() },
                position: Position.create(0, 1)
            });

        const keywords = completions?.items.filter(i =>
            ['PRINT', 'PRECISION', 'PREFIX'].includes(i.label)
        );
        expect(keywords.length).toBeGreaterThan(0);
    });

    test('Variable completion after declaration', async () => {
        const doc = await parse('LET myVar = 123\nPRINT my');
        const completions = await services.BBj.lsp.CompletionProvider
            .getCompletion(doc, {
                textDocument: { uri: doc.uri.toString() },
                position: Position.create(1, 9)
            });

        const myVarCompletion = completions?.items.find(i => i.label === 'myVar');
        expect(myVarCompletion).toBeDefined();
    });
});

describe('FUNC-05: Hover Information', () => {
    test('Hover on function shows signature', async () => {
        const doc = await parse('PRINT "hello"');
        const hover = await services.BBj.lsp.HoverProvider
            .getHoverContent(doc, {
                textDocument: { uri: doc.uri.toString() },
                position: Position.create(0, 2)  // On "PRINT"
            });

        expect(hover).toBeDefined();
        expect(hover?.contents).toContain('PRINT');
    });
});
```

### Example 3: VS Code Packaging Verification
```bash
# Source: @vscode/vsce documentation + official VS Code publishing guide
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension

cd bbj-vscode

# Ensure build artifacts exist
npm run build

# Create .vsix package (does NOT publish)
npx @vscode/vsce package

# Verify artifact created
test -f bbj-lang-*.vsix && echo "✓ VS Code .vsix created" || echo "✗ Packaging failed"

# Check package contents (optional, for debugging)
unzip -l bbj-lang-*.vsix | grep "out/language/main.cjs"
```

### Example 4: IntelliJ Build Verification
```bash
# Source: IntelliJ Platform Gradle Plugin 2.x documentation
# https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html

cd bbj-intellij

# Ensure language server is built first
cd ../bbj-vscode && npm run build && cd ../bbj-intellij

# Build plugin (creates .jar but does NOT publish)
./gradlew buildPlugin

# Verify artifact created
test -f build/distributions/bbj-intellij-*.jar && \
    echo "✓ IntelliJ .jar created" || echo "✗ Build failed"

# Check that main.cjs was bundled (optional)
unzip -l build/distributions/bbj-intellij-*.jar | grep "main.cjs"
```

### Example 5: Automated IntelliJ Build Test
```typescript
// Source: Integration testing patterns + Gradle wrapper conventions
import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

describe('FUNC-10: IntelliJ Plugin Build', () => {
    test('Gradle buildPlugin succeeds', () => {
        const projectRoot = join(__dirname, '../../..');
        const intellijDir = join(projectRoot, 'bbj-intellij');

        // Build VS Code language server first (IntelliJ depends on it)
        execSync('npm run build', {
            cwd: join(projectRoot, 'bbj-vscode'),
            stdio: 'inherit'
        });

        // Build IntelliJ plugin
        execSync('./gradlew clean buildPlugin', {
            cwd: intellijDir,
            stdio: 'inherit'
        });

        // Verify artifact exists
        const artifactPattern = join(intellijDir, 'build/distributions/bbj-intellij-*.jar');
        const artifacts = require('glob').sync(artifactPattern);

        expect(artifacts.length).toBeGreaterThan(0);
        expect(existsSync(artifacts[0])).toBe(true);
    }, 60000); // 60s timeout for Gradle build
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual testing only | Automated LSP testing with parseHelper | Langium 2.x+ | Regression prevention, faster verification cycles |
| `vsce` npm package | `@vscode/vsce` scoped package | VS Code 2023+ | Official Microsoft scoped package, better maintained |
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | 2024+ | New DSL, better IDE version compatibility, improved verification |
| jest test framework | vitest | 2023+ | Faster, native ES modules, better Vite integration |

**Deprecated/outdated:**
- `vsce` (unscoped): Use `@vscode/vsce` instead
- Gradle IntelliJ Plugin 1.x: Migrate to 2.x (2.x is current, 1.x no longer maintained)
- Manual LSP protocol testing: Use Langium service API (higher level, type-safe)

## Open Questions

Things that couldn't be fully resolved:

1. **IntelliJ Manual Testing Scope**
   - What we know: User will test runtime behavior manually, this phase only builds artifact
   - What's unclear: Should we provide a detailed manual test checklist, or just state "user tests manually"?
   - Recommendation: Provide a minimal checklist (open file, verify syntax highlighting, try completion) in the verification report so user knows what to test

2. **Chevrotain False Positive Handling**
   - What we know: Phase 17 confirmed warnings are false positives, runtime works correctly
   - What's unclear: Will explicitly testing these tokens definitively prove false positive status, or will warnings persist?
   - Recommendation: Tests should verify functional correctness (parsing succeeds), warnings in logs are acceptable if function works

3. **Regression Definition**
   - What we know: Zero tolerance for regressions — features must work exactly as before
   - What's unclear: What defines "exactly as before" for subjective features like completion quality?
   - Recommendation: Define regression as "feature that worked in Phase 1 now fails or produces errors" not "completion results differ slightly"

4. **Test Fixture Selection**
   - What we know: Claude's discretion to pick test fixtures from repo
   - What's unclear: How many fixtures are enough? Should we test all 80+ examples/ files or a representative subset?
   - Recommendation: Select 5-10 diverse files covering: classes, java-interop, basic syntax, edge cases (e.g., examples/bbj-classes.bbj, examples/java-interop.bbj)

## Sources

### Primary (HIGH confidence)
- Langium testing documentation - `langium/test` parseHelper API verified in bbj-vscode/test/*.test.ts
- [Language Server Extension Guide | Visual Studio Code Extension API](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) - Official LSP testing approaches
- [Publishing Extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) - `vsce package` usage and verification
- [Tasks | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html) - buildPlugin task documentation
- [IntelliJ Platform Gradle Plugin (2.x) | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html) - Official plugin building guide
- Phase 17 VERIFICATION.md - Chevrotain false positive analysis and recommendation to verify at runtime
- bbj-vscode/test/parser.test.ts - Existing test patterns using parseHelper and expectNoParserLexerErrors

### Secondary (MEDIUM confidence)
- [Testing your DSLs in Langium - DEV Community](https://dev.to/diverse_research/testing-your-dsls-in-langium-gp9) - parseHelper usage patterns
- [Building VS Code Extensions in 2026: The Complete Guide](https://abdulkadersafi.com/blog/building-vs-code-extensions-in-2026-the-complete-modern-guide) - Modern extension workflow
- [LSPRAG: LSP-Guided RAG for Language-Agnostic Real-Time Unit Test Generation](https://arxiv.org/html/2510.22210v1) - Automated LSP testing approaches (2026 research)

### Tertiary (LOW confidence)
- None - all sources verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools verified in existing project setup (vitest, langium/test, @vscode/vsce, Gradle plugin)
- Architecture: HIGH - Patterns extracted from existing bbj-vscode/test/*.test.ts files and official Langium docs
- Pitfalls: HIGH - Based on Phase 17 findings (Chevrotain warnings) and common LSP testing mistakes from official guides

**Research date:** 2026-02-03
**Valid until:** 30 days (stable tooling, Langium 4 and VS Code extension APIs are stable)
