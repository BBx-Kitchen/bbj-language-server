# Requirements: BBj Language Server

**Defined:** 2026-02-20
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.9 Requirements

Requirements for v3.9 Quick Wins milestone. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: EM Config "--" no longer causes DWC/BUI startup failure (#382)
- [x] **BUG-02**: config.bbx files are highlighted with BBj syntax highlighting (#381)
- [x] **BUG-03**: `releaseVersion!` and similar suffixed identifiers parse without error (#379)
- [x] **BUG-04**: DECLARE statement in class body outside methods parses without error (#380)

### Grammar

- [x] **GRAM-01**: EXIT verb accepts optional integer parameter (#376)
- [x] **GRAM-02**: SERIAL verb recognized by parser (#375)
- [x] **GRAM-03**: ADDR function recognized by parser (#377)

### Feature Gaps

- [ ] **FEAT-01**: `.class` property on class references resolves to java.lang.Class (#373)
- [x] **FEAT-02**: Static method completion on class references via USE statements (#374)
- [x] **FEAT-03**: Deprecated methods show strikethrough indicator in completion items
- [x] **FEAT-04**: Constructor completion for `new ClassName()` expressions

## Future Requirements

### Architectural

- **ARCH-01**: CPU stability mitigations for multi-project workspaces (#232)
- **ARCH-02**: LSP4IJ experimental API stabilization tracking
- **ARCH-03**: BBjCPL pipe mode (stdin) for reduced JVM startup overhead
- **ARCH-04**: BBjCPL diagnostic range correlation (line errors → token ranges)

### Features

- **FEAT-05**: BBjCPL static type checking (-t flag)
- **FEAT-06**: Called program completion (Dynamo Tools gap analysis)
- **FEAT-07**: Data Dictionary field completion (Dynamo Tools gap analysis)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Debugging support | Major feature, requires dedicated milestone |
| BBj project wizard/templates | Future milestone |
| Refactoring support (rename across files) | Future milestone |
| Real-time chat / collaboration | Not relevant to language server |
| Native IntelliJ parser/lexer rewrite | LSP4IJ approach reuses existing LS |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 57 | Complete |
| BUG-02 | Phase 57 | Complete |
| BUG-03 | Phase 57 | Complete |
| BUG-04 | Phase 57 | Complete |
| GRAM-01 | Phase 58 | Complete |
| GRAM-02 | Phase 58 | Complete |
| GRAM-03 | Phase 58 | Complete |
| FEAT-01 | Phase 59 | Pending |
| FEAT-02 | Phase 59 | Complete |
| FEAT-03 | Phase 59 | Complete |
| FEAT-04 | Phase 59 | Complete |

**Coverage:**
- v3.9 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after v3.9 roadmap creation*
