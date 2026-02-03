# Requirements: BBj Language Server -- Langium 4 Upgrade

**Defined:** 2026-02-03
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v1 Requirements

Requirements for the v2.0 milestone. Each maps to roadmap phases.

### Dependencies

- [x] **DEPS-01**: Langium updated from 3.2.1 to 4.1.3
- [x] **DEPS-02**: langium-cli updated from 3.2.0 to 4.1.0
- [x] **DEPS-03**: Chevrotain version conflict resolved (direct dependency aligned with Langium 4's requirement)
- [x] **DEPS-04**: All other dependencies compatible with Langium 4 (no peer dependency conflicts)

### Grammar & Generated Code

- [x] **GRAM-01**: Grammar regenerated with langium-cli 4.1.0 (ast.ts, grammar.ts, module.ts)
- [x] **GRAM-02**: Generated code compiles without errors
- [x] **GRAM-03**: No grammar syntax changes needed (or applied if required)

### Source Migration

- [x] **MIGR-01**: AST type constants migrated to Langium 4 format (`TypeName.$type`) across all source files
- [x] **MIGR-02**: `PrecomputedScopes` renamed to `LocalSymbols` in all references
- [x] **MIGR-03**: `document.precomputedScopes` property accessor updated
- [x] **MIGR-04**: `Reference | MultiReference` union type handled in linker and scope provider
- [x] **MIGR-05**: Completion provider signature updated (`createReferenceCompletionItem` new params)
- [x] **MIGR-06**: `prepareLangiumParser` usage resolved (updated or replaced if removed)
- [x] **MIGR-07**: Scope computation method renames applied (if `computeLocalScopes`/`computeExports` renamed)
- [x] **MIGR-08**: All remaining deprecated API usages resolved (PR #1991 removals)
- [x] **MIGR-09**: All import paths updated for renamed/moved exports

### Build & Test

- [x] **BLDT-01**: TypeScript compilation passes with zero errors
- [x] **BLDT-02**: esbuild bundle produces valid main.cjs
- [x] **BLDT-03**: Existing test suite passes (all tests green)
- [x] **BLDT-04**: VS Code extension builds successfully
- [x] **BLDT-05**: IntelliJ plugin builds with updated bundled main.cjs

### Functional Verification

- [ ] **FUNC-01**: Syntax highlighting works in VS Code
- [ ] **FUNC-02**: Diagnostics/error squiggles display correctly
- [ ] **FUNC-03**: Code completion works for BBj keywords, functions, variables
- [ ] **FUNC-04**: Java class/method completion works via java-interop
- [ ] **FUNC-05**: Hover information displays
- [ ] **FUNC-06**: Signature help works
- [ ] **FUNC-07**: Go-to-definition navigates correctly
- [ ] **FUNC-08**: Document symbols/Structure view works
- [ ] **FUNC-09**: Semantic token highlighting works
- [ ] **FUNC-10**: IntelliJ plugin provides same feature set as before upgrade

### Release

- [ ] **RELS-01**: VS Code extension published with updated language server
- [ ] **RELS-02**: IntelliJ plugin published with updated bundled main.cjs
- [ ] **RELS-03**: Version numbers bumped appropriately

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Langium 4 New Features

- **L4NF-01**: BNF syntax support in grammar files
- **L4NF-02**: AI/LLM integration features
- **L4NF-03**: New grammar language features from Langium 4

## Out of Scope

| Feature | Reason |
|---------|--------|
| Adopting Langium 4 new features (BNF, AI) | Upgrade-only milestone; let dust settle first |
| Grammar rewrite to use new syntax | Not needed for migration; future optimization |
| Refactoring existing custom services | Migration only; no improvements beyond what's required |
| New IDE features | Separate milestone; this is infrastructure |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPS-01 | Phase 14 | Complete |
| DEPS-02 | Phase 14 | Complete |
| DEPS-03 | Phase 14 | Complete |
| DEPS-04 | Phase 14 | Complete |
| GRAM-01 | Phase 14 | Complete |
| GRAM-02 | Phase 14 | Complete |
| GRAM-03 | Phase 14 | Complete |
| MIGR-01 | Phase 15 | Complete |
| MIGR-02 | Phase 15 | Complete |
| MIGR-03 | Phase 15 | Complete |
| MIGR-04 | Phase 16 | Complete |
| MIGR-05 | Phase 16 | Complete |
| MIGR-06 | Phase 16 | Complete |
| MIGR-07 | Phase 15 | Complete |
| MIGR-08 | Phase 16 | Complete |
| MIGR-09 | Phase 15 | Complete |
| BLDT-01 | Phase 17 | Complete |
| BLDT-02 | Phase 17 | Complete |
| BLDT-03 | Phase 17 | Complete |
| BLDT-04 | Phase 17 | Complete |
| BLDT-05 | Phase 17 | Complete |
| FUNC-01 | Phase 18 | Pending |
| FUNC-02 | Phase 18 | Pending |
| FUNC-03 | Phase 18 | Pending |
| FUNC-04 | Phase 18 | Pending |
| FUNC-05 | Phase 18 | Pending |
| FUNC-06 | Phase 18 | Pending |
| FUNC-07 | Phase 18 | Pending |
| FUNC-08 | Phase 18 | Pending |
| FUNC-09 | Phase 18 | Pending |
| FUNC-10 | Phase 18 | Pending |
| RELS-01 | Phase 18 | Pending |
| RELS-02 | Phase 18 | Pending |
| RELS-03 | Phase 18 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-03 after Phase 17 completion*
