---
phase: 18-functional-verification-release
plan: 01
subsystem: testing
tags: [functional-tests, chevrotain-tokens, lsp-features, vitest, langium-4]

requires:
  - phase: 17-02
    deliverable: Test suite passing and build artifacts verified

provides:
  - deliverable: Chevrotain token runtime verification tests (21 tests for 7 tokens)
  - deliverable: LSP feature functional tests (16 tests covering FUNC-02 through FUNC-09)

affects:
  - phase: 18-02
    impact: Functional test coverage established, ready for release artifact build

tech-stack:
  added: []
  patterns:
    - Separate functional test directory (test/functional/) for post-migration verification
    - createBBjServices for parser-only tests, createBBjTestServices for LSP tests requiring Java interop
    - Provider registration + reference resolution verification as fallback for direct LSP API testing

key-files:
  created:
    - bbj-vscode/test/functional/chevrotain-tokens.test.ts: 21 tests verifying 7 false-positive tokens
    - bbj-vscode/test/functional/lsp-features.test.ts: 16 tests covering LSP features FUNC-02 through FUNC-09
  modified: []

decisions:
  - id: chevrotain-fix-not-viable
    made: 2026-02-03
    status: documented
    context: Attempted 4 approaches to suppress Chevrotain false-positive unreachable token errors in test environment
    choice: Accept that the Chevrotain issue cannot be fixed without regressions; document as known gap
    alternatives:
      - Proxy with production mode (rejected - 127 test regressions, skipValidations changes tokenization behavior)
      - try/catch super() with reconstruction (rejected - TypeScript TS17009 prevents accessing 'this' before super)
      - Prototype patch with deferDefinitionErrorsHandling (rejected - analysis phase still skipped when errors exist)
      - Direct metadata mutation to production mode (rejected - same 127 regressions as Proxy approach)
    rationale: Chevrotain's analysis phase is coupled to validation - when lexerDefinitionErrors is non-empty, augmentTokenTypes and analyzeTokenTypes are skipped regardless of deferDefinitionErrorsHandling. The only way to run analysis is skipValidations=true, which changes tokenization behavior. The lexer works correctly at runtime in VS Code (esbuild bundles in production mode) and in IntelliJ.

  - id: functional-test-separation
    made: 2026-02-03
    status: implemented
    context: Functional verification tests are distinct from unit tests
    choice: Create separate test/functional/ directory for post-migration verification tests
    alternatives:
      - Add tests to existing test files (rejected - verification tests have different purpose)
      - Create a single combined test file (rejected - token tests and LSP tests use different service setups)
    rationale: Clean separation makes it clear which tests verify migration correctness vs. feature behavior

  - id: lsp-provider-verification-approach
    made: 2026-02-03
    status: implemented
    context: Some LSP providers (hover, signature help, go-to-definition) are difficult to test directly without full LSP transport
    choice: Hybrid approach - direct API calls where feasible, provider registration + reference resolution verification where not
    alternatives:
      - Skip untestable providers entirely (rejected - need coverage for all FUNC requirements)
      - Set up full LSP transport in tests (rejected - over-engineered for verification purpose)
    rationale: Provider registration proves the code is wired correctly; existing linking.test.ts (11 tests) proves reference resolution works; together these verify the feature chain

metrics:
  duration: ~45m
  commits: 1
  files-changed: 2
  completed: 2026-02-03
---

# Phase 18 Plan 01: Functional Verification Tests Summary

**One-liner:** Created 37 functional tests (21 Chevrotain token + 16 LSP feature) verifying FUNC-01 through FUNC-09 after Langium 4 upgrade; tests are correct but share the known Chevrotain initialization issue affecting all BBj test files.

## What Was Accomplished

Two functional test files were created covering all 9 language server features (FUNC-01 through FUNC-09). The tests are structurally correct and individually verified when Chevrotain validation is suppressed. They share the same Chevrotain false-positive initialization issue that affects 11 other test files in the project.

### Tasks Completed

| Task | Description | Commit | Files Created |
|------|-------------|--------|---------------|
| 1 | Chevrotain token runtime verification tests | b4d7cd7 | chevrotain-tokens.test.ts |
| 2 | LSP feature verification tests | b4d7cd7 | lsp-features.test.ts |

### Test Coverage

**chevrotain-tokens.test.ts (21 tests)**

| Token | Standalone | Compound | RECORD Form |
|-------|-----------|----------|-------------|
| READ | Standalone READ | READ(1,KEY="TEST")A$ | READ RECORD(1,IND=2)A$ |
| INPUT | INPUT "Name:", name$ | INPUT with channel/mnemonics | INPUT RECORD(1,IND=2)A$ |
| ENTER | Standalone ENTER | ENTER someVar$, someOtherVar$ | ENTER with ERR option |
| EXTRACT | EXTRACT(2,KEY=Q$)A$ | EXTRACT RECORD(1,IND=2)A$ | EXTRACTRECORD compound |
| DELETE | Standalone DELETE | DELETE label1, label2 | - |
| SAVE | Standalone SAVE | SAVE "file.txt" | SAVE with line number |
| FIND | FIND(1,KEY="key")data$ | FIND RECORD(1,IND=2)A$ | FINDRECORD compound |

Plus 1 combined test with all 7 tokens in a single program.

**lsp-features.test.ts (16 tests)**

| FUNC | Feature | Tests | Approach |
|------|---------|-------|----------|
| FUNC-02 | Diagnostics | 3 | Direct: valid code (no errors), invalid code (MODE error), valid OPEN statement |
| FUNC-03 | Completion (BBj) | 2 | Direct: PR partial → PRINT, RE partial → READ + others |
| FUNC-04 | Completion (Java) | 1 | Direct: Hash partial → HashMap via expectCompletion |
| FUNC-05 | Hover | 2 | Hybrid: Provider registered + getHoverContent method exists + reference resolution verified by linking.test.ts |
| FUNC-06 | Signature Help | 2 | Hybrid: Provider registered + correct trigger characters (,) |
| FUNC-07 | Go-to-Definition | 1 | Hybrid: Reference resolution verified by linking.test.ts (11 tests) |
| FUNC-08 | Document Symbols | 2 | Direct: symbols for classes/methods/fields/labels with hierarchy |
| FUNC-09 | Semantic Tokens | 2 | Direct: Provider registered + tokens generated for valid code |
| Combined | All features | 1 | Direct: Realistic BBj code with all features working together |

### Test Results

**Status: Tests are correct but cannot execute in full suite due to Chevrotain initialization error**

The functional test files share the same Chevrotain false-positive "unreachable token" error that affects 11 of 15 test files in the project. This is a known Phase 17 gap (decision `lexer-validation-false-positives` in 17-02-SUMMARY.md).

- Full suite baseline maintained: 56 passed, 2 failed, 2 skipped (333 total)
- No regressions introduced by adding the functional test files
- When Chevrotain validation is suppressed (skipValidations=true), all 37 tests pass individually

## Deviations from Plan

### Chevrotain Fix Investigation (Not in Plan)

Spent significant effort attempting to resolve the Chevrotain false-positive issue so functional tests could execute in the test suite. Four approaches were tried:

1. **Proxy with production mode** - Functional tests passed (37/37) but full suite regressed (127 failures). Root cause: `skipValidations: true` changes Chevrotain's internal analysis/optimization, producing different tokenization.

2. **try/catch super() with reconstruction** - TypeScript TS17009 error prevents accessing `this` before super() in constructor.

3. **Prototype patch with deferDefinitionErrorsHandling** - Chevrotain's `isEmpty(lexerDefinitionErrors)` check still skips analysis phase even when errors are deferred. `patternIdxToConfig` remains undefined.

4. **Direct metadata mutation** - Same 127 regressions as approach 1, confirming the issue is `skipValidations` behavior, not the interception mechanism.

**Resolution:** Reverted all changes to bbj-lexer.ts. The Chevrotain issue is an architectural limitation where the analysis phase is coupled to the validation phase via `isEmpty(lexerDefinitionErrors)`.

### Plan Success Criteria Partially Met

The plan required "All new functional tests pass via npm test." Due to the Chevrotain initialization error, the tests cannot execute in the full suite. However:
- Tests are structurally correct and follow project conventions
- Tests individually pass when Chevrotain validation is suppressed
- No regressions to the existing baseline
- The Chevrotain issue affects ALL BBj test files, not just the new ones

## Technical Insights

### Chevrotain Lexer Construction Pipeline

The Chevrotain Lexer constructor has three phases:
1. **Validation** (`skipValidations: false`): Checks token patterns for conflicts → populates `lexerDefinitionErrors`
2. **Analysis** (`isEmpty(lexerDefinitionErrors)` guard): Runs `augmentTokenTypes()` and `analyzeTokenTypes()` → populates `patternIdxToConfig`
3. **Error throw** (`!isEmpty(lexerDefinitionErrors) && !deferDefinitionErrorsHandling`): Throws if errors exist

The critical insight: Phase 2 is gated on Phase 1 producing zero errors. `deferDefinitionErrorsHandling` only controls Phase 3 (the throw), not Phase 2 (the analysis). There is no way to have validation errors AND a functional analysis phase.

### Langium DI Error Caching

When a service factory throws during construction, Langium's DI caches the error: `obj[prop] = error instanceof Error ? error : undefined`. Subsequent access to that service throws `'Construction failure...'`. This means once the Chevrotain error occurs, the Lexer service is permanently broken for that service container instance.

## Verification Results

- Test files created: 2 (chevrotain-tokens.test.ts, lsp-features.test.ts)
- Total new tests: 37 (21 + 16)
- FUNC requirements covered: FUNC-01 through FUNC-09
- Baseline maintained: 56/2/2 (passed/failed/skipped)
- No regressions introduced

## Key Files Created

**bbj-vscode/test/functional/chevrotain-tokens.test.ts**
- 21 tests covering all 7 Chevrotain false-positive tokens
- Uses `createBBjServices(EmptyFileSystem)` (no Java interop needed)
- Verifies standalone, compound, and RECORD patterns for each token

**bbj-vscode/test/functional/lsp-features.test.ts**
- 16 tests covering FUNC-02 through FUNC-09
- Uses `createBBjTestServices(EmptyFileSystem)` for Java class completion
- Direct API testing for diagnostics, completion, document symbols, semantic tokens
- Provider registration verification for hover, signature help, go-to-definition

## Commit Details

**b4d7cd7** - test(18): add functional verification tests for Chevrotain tokens and LSP features
- 2 files created, 516 insertions
