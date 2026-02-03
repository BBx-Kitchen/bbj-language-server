# Requirements: BBj Language Server — Langium 4 Upgrade

**Defined:** 2026-02-03
**Core Value:** BBj developers get consistent, high-quality language intelligence in both VS Code and IntelliJ through a single shared language server.

## v1 Requirements

Requirements for the v2.0 milestone. Each maps to roadmap phases.

### Dependencies

- [ ] **DEPS-01**: Langium updated from 3.2.1 to 4.1.3
- [ ] **DEPS-02**: langium-cli updated from 3.2.0 to 4.1.0
- [ ] **DEPS-03**: Chevrotain version conflict resolved (direct dependency aligned with Langium 4's requirement)
- [ ] **DEPS-04**: All other dependencies compatible with Langium 4 (no peer dependency conflicts)

### Grammar & Generated Code

- [ ] **GRAM-01**: Grammar regenerated with langium-cli 4.1.0 (ast.ts, grammar.ts, module.ts)
- [ ] **GRAM-02**: Generated code compiles without errors
- [ ] **GRAM-03**: No grammar syntax changes needed (or applied if required)

### Source Migration

- [ ] **MIGR-01**: AST type constants migrated to Langium 4 format (`TypeName.$type`) across all source files
- [ ] **MIGR-02**: `PrecomputedScopes` renamed to `LocalSymbols` in all references
- [ ] **MIGR-03**: `document.precomputedScopes` property accessor updated
- [ ] **MIGR-04**: `Reference | MultiReference` union type handled in linker and scope provider
- [ ] **MIGR-05**: Completion provider signature updated (`createReferenceCompletionItem` new params)
- [ ] **MIGR-06**: `prepareLangiumParser` usage resolved (updated or replaced if removed)
- [ ] **MIGR-07**: Scope computation method renames applied (if `computeLocalScopes`/`computeExports` renamed)
- [ ] **MIGR-08**: All remaining deprecated API usages resolved (PR #1991 removals)
- [ ] **MIGR-09**: All import paths updated for renamed/moved exports

### Build & Test

- [ ] **BLDТ-01**: TypeScript compilation passes with zero errors
- [ ] **BLDT-02**: esbuild bundle produces valid main.cjs
- [ ] **BLDT-03**: Existing test suite passes (all tests green)
- [ ] **BLDT-04**: VS Code extension builds successfully
- [ ] **BLDT-05**: IntelliJ plugin builds with updated bundled main.cjs

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPS-01 | TBD | Pending |
| DEPS-02 | TBD | Pending |
| DEPS-03 | TBD | Pending |
| DEPS-04 | TBD | Pending |
| GRAM-01 | TBD | Pending |
| GRAM-02 | TBD | Pending |
| GRAM-03 | TBD | Pending |
| MIGR-01 | TBD | Pending |
| MIGR-02 | TBD | Pending |
| MIGR-03 | TBD | Pending |
| MIGR-04 | TBD | Pending |
| MIGR-05 | TBD | Pending |
| MIGR-06 | TBD | Pending |
| MIGR-07 | TBD | Pending |
| MIGR-08 | TBD | Pending |
| MIGR-09 | TBD | Pending |
| BLDT-01 | TBD | Pending |
| BLDT-02 | TBD | Pending |
| BLDT-03 | TBD | Pending |
| BLDT-04 | TBD | Pending |
| BLDT-05 | TBD | Pending |
| FUNC-01 | TBD | Pending |
| FUNC-02 | TBD | Pending |
| FUNC-03 | TBD | Pending |
| FUNC-04 | TBD | Pending |
| FUNC-05 | TBD | Pending |
| FUNC-06 | TBD | Pending |
| FUNC-07 | TBD | Pending |
| FUNC-08 | TBD | Pending |
| FUNC-09 | TBD | Pending |
| FUNC-10 | TBD | Pending |
| RELS-01 | TBD | Pending |
| RELS-02 | TBD | Pending |
| RELS-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 0
- Unmapped: 34 (pending roadmap creation)

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-03 after initial definition*
