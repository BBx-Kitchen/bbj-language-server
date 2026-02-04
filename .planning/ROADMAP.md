# Roadmap: BBj Language Server

## Milestones

- v1.0 Internal Alpha - Phases 1-6 (shipped 2026-02-01)
- v1.1 Polish & Run Commands - Phases 7-10 (shipped 2026-02-02)
- v1.2 Run Fixes & Marketplace - Phases 11-13 (shipped 2026-02-02)
- **v2.0 Langium 4 Upgrade** - Phases 14-20 (in progress)

## v2.0 Langium 4 Upgrade

### Overview

Upgrade the language server from Langium 3.2 to Langium 4.1.3 with zero feature regressions, then publish updated VS Code extension and IntelliJ plugin. The migration follows a strict sequential dependency chain: install new packages, regenerate grammar, apply mechanical renames, resolve complex API changes, verify builds, confirm runtime behavior, and release. All 34 requirements address infrastructure migration -- no new user-facing features.

### Phases

- [x] **Phase 14: Dependency Update & Grammar Regeneration** - New packages installed, grammar regenerated, generated code compiles
- [x] **Phase 15: Core API Renames & Type Constants** - Mechanical renames and type constant migration across all source files
- [x] **Phase 16: API Signature & Deprecated API Migration** - Complex API shape changes in linker, completion, parser, and remaining deprecated usages
- [x] **Phase 17: Build Verification & Test Suite** - Full TypeScript compilation, esbuild bundle, and test suite green
- [x] **Phase 18: Functional Verification & Release** - Runtime behavior verified in both IDEs, release artifacts built (publishing and versioning handled by user separately)
- [x] **Phase 19: Test Plan** - Fix failing tests, add coverage infrastructure, establish quality gates
- [x] **Phase 20: Human QA Testing** - Add instructions for human QA testing, recurring testing checklists

### Phase Details

#### Phase 14: Dependency Update & Grammar Regeneration
**Goal**: New Langium 4 packages installed and grammar regenerated with generated code that compiles cleanly
**Depends on**: Nothing (first phase of milestone)
**Requirements**: DEPS-01, DEPS-02, DEPS-03, DEPS-04, GRAM-01, GRAM-02, GRAM-03
**Success Criteria** (what must be TRUE):
  1. `npm install` completes with zero peer dependency conflicts
  2. `langium generate` produces new ast.ts, grammar.ts, and module.ts without errors
  3. Generated files compile with `tsc` (ignoring hand-written source errors)
  4. No grammar syntax changes were needed, or necessary changes have been applied
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md -- Update langium packages to 4.1.3/4.1.0, regenerate grammar, verify generated code compiles

#### Phase 15: Core API Renames & Type Constants
**Goal**: All mechanical renames and type constant migrations applied so scope computation, validators, and type-checking code reference Langium 4 APIs correctly
**Depends on**: Phase 14
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-07, MIGR-09
**Success Criteria** (what must be TRUE):
  1. Every `TypeName` constant usage updated to `TypeName.$type` pattern (25+ sites across 10+ files)
  2. All `PrecomputedScopes` references renamed to `LocalSymbols` with correct interface usage
  3. All `document.precomputedScopes` property accesses updated to new name
  4. Scope computation method names updated if renamed in Langium 4
  5. All import paths resolve correctly for renamed/moved Langium exports
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md -- Migrate type constants to .$type in provider files (node-kind, description, semantic-token, completion)
- [x] 15-02-PLAN.md -- Rename PrecomputedScopes to LocalSymbols, scope methods, and type constants in scope files

#### Phase 16: API Signature & Deprecated API Migration
**Goal**: All complex API shape changes resolved -- linker handles new Reference union type, completion provider uses new signature, parser creation updated, and no deprecated API usages remain
**Depends on**: Phase 15
**Requirements**: MIGR-04, MIGR-05, MIGR-06, MIGR-08
**Success Criteria** (what must be TRUE):
  1. Linker and scope provider handle `Reference | MultiReference` union type with proper narrowing
  2. Completion provider's `createReferenceCompletionItem` calls use the new parameter signature
  3. `prepareLangiumParser` usage replaced with Langium 4 equivalent (or confirmed still available)
  4. Zero remaining usages of APIs removed in Langium 4 PR #1991
**Plans**: 1 plan

Plans:
- [x] 16-01-PLAN.md -- Update completion provider signature and linker type guards for Langium 4 API compatibility

#### Phase 17: Build Verification & Test Suite
**Goal**: The entire project compiles, bundles, and passes all tests -- both VS Code extension and IntelliJ plugin produce valid build artifacts
**Depends on**: Phase 16
**Requirements**: BLDT-01, BLDT-02, BLDT-03, BLDT-04, BLDT-05
**Success Criteria** (what must be TRUE):
  1. `tsc` compiles the full project with zero errors
  2. `esbuild` produces a valid main.cjs bundle
  3. All existing tests pass (vitest suite green, no regressions)
  4. VS Code extension packages successfully (`vsce package` or equivalent)
  5. IntelliJ plugin builds with the updated bundled main.cjs
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md -- Fix all 21 TypeScript compilation errors across 7 source files (LocalSymbols API, CstNode API, method signatures, type constants)
- [x] 17-02-PLAN.md -- Fix test failures, build esbuild bundle, smoke-test main.cjs, verify IntelliJ Gradle build

#### Phase 18: Functional Verification & Release
**Goal**: Every existing language server feature works identically in both VS Code and IntelliJ after the upgrade, and release artifacts are built for user to publish
**Depends on**: Phase 17
**Requirements**: FUNC-01, FUNC-02, FUNC-03, FUNC-04, FUNC-05, FUNC-06, FUNC-07, FUNC-08, FUNC-09, FUNC-10
**Note**: RELS-01 (VS Code publishing), RELS-02 (IntelliJ publishing), and RELS-03 (version bumps) are user responsibilities per Phase 18 CONTEXT.md decisions -- not in Claude's scope for this phase
**Success Criteria** (what must be TRUE):
  1. All 9 language features work in VS Code: syntax highlighting, diagnostics, completion (BBj + Java), hover, signature help, go-to-definition, document symbols, semantic tokens
  2. IntelliJ plugin provides the same feature set as before the upgrade (no regressions)
  3. VS Code .vsix artifact builds successfully (packaging verification)
  4. IntelliJ .zip artifact builds successfully (packaging verification)
**Plans**: 2 plans

Plans:
- [x] 18-01-PLAN.md -- Chevrotain token runtime verification and LSP feature functional tests
- [x] 18-02-PLAN.md -- Build release artifacts (.vsix + .zip) and produce verification report

#### Phase 19: Test Plan
**Goal:** Fix failing tests, add coverage infrastructure, and establish quality gates for the test suite
**Depends on:** Phase 18
**Requirements:** TEST-01 (all tests pass), TEST-02 (coverage reporting), TEST-03 (quality gates)
**Success Criteria** (what must be TRUE):
  1. All tests pass (0 failures)
  2. Coverage reporting configured with @vitest/coverage-v8
  3. Coverage excludes generated files (src/language/generated/**)
  4. Coverage thresholds established to prevent regressions
**Plans:** 2 plans

Plans:
- [x] 19-01-PLAN.md -- Fix 2 failing tests (parser.test.ts type constant, linking.test.ts BBjAPI case)
- [x] 19-02-PLAN.md -- Add coverage infrastructure (@vitest/coverage-v8) with thresholds

#### Phase 20: Human QA Testing
**Goal:** Create documentation for human QA testing with recurring testing checklists
**Depends on:** Phase 19
**Requirements:** QA-01 (testing instructions), QA-02 (recurring checklists)
**Success Criteria** (what must be TRUE):
  1. Human QA testing instructions documented
  2. Recurring testing checklists defined for pre-release verification
  3. Checklists cover all major features (syntax, diagnostics, completion, hover, etc.)
**Plans:** 1 plan

Plans:
- [x] 20-01-PLAN.md -- Create QA directory with testing guide, full test checklist, and smoke test checklist

### Coverage

**Requirements mapped: 34/34**

| Category | Count | Phase | Requirements |
|----------|-------|-------|-------------|
| Dependencies | 4 | 14 | DEPS-01, DEPS-02, DEPS-03, DEPS-04 |
| Grammar | 3 | 14 | GRAM-01, GRAM-02, GRAM-03 |
| Source Migration (renames) | 5 | 15 | MIGR-01, MIGR-02, MIGR-03, MIGR-07, MIGR-09 |
| Source Migration (signatures) | 4 | 16 | MIGR-04, MIGR-05, MIGR-06, MIGR-08 |
| Build & Test | 5 | 17 | BLDT-01, BLDT-02, BLDT-03, BLDT-04, BLDT-05 |
| Functional Verification | 10 | 18 | FUNC-01 through FUNC-10 |
| Release | 3 | N/A (user) | RELS-01, RELS-02, RELS-03 (user handles publishing and versioning) |

No orphaned requirements. No duplicates.

### Research Flags

Phases needing investigation during planning:
- **Phase 15**: Verify whether `computeExports`/`computeLocalScopes` were renamed (MEDIUM confidence). Verify `LocalSymbols` interface shape.
- **Phase 16**: Determine `prepareLangiumParser` status (LOW confidence -- highest risk item). Determine exact `createReferenceCompletionItem` new signature.

Phases with standard patterns (no deep research needed):
- **Phase 14**: Standard npm + langium-cli workflow
- **Phase 17**: Standard build verification
- **Phase 18**: Standard smoke testing + publish workflow
- **Phase 19**: Standard testing infrastructure (vitest coverage)
- **Phase 20**: Documentation-only (QA checklists)

## Progress

**Execution Order:** 14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20 (strictly sequential)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Deps & Grammar | v2.0 | 1/1 | Complete | 2026-02-03 |
| 15. Core Renames | v2.0 | 2/2 | Complete | 2026-02-03 |
| 16. API Signatures | v2.0 | 1/1 | Complete | 2026-02-03 |
| 17. Build & Test | v2.0 | 2/2 | Complete | 2026-02-03 |
| 18. Verify & Release | v2.0 | 2/2 | Complete | 2026-02-04 |
| 19. Test Plan | v2.0 | 2/2 | Complete | 2026-02-04 |
| 20. Human QA Testing | v2.0 | 1/1 | Complete | 2026-02-04 |
