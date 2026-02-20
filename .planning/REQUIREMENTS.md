# Requirements: BBj Language Server

**Defined:** 2026-02-20
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.9 Requirements

Requirements for v3.9 Quick Wins milestone. Each maps to roadmap phases.

### Bug Fixes

- [ ] **BUG-01**: EM Config "--" no longer causes DWC/BUI startup failure (#382)
- [ ] **BUG-02**: config.bbx files are highlighted with BBj syntax highlighting (#381)
- [ ] **BUG-03**: `releaseVersion!` and similar suffixed identifiers parse without error (#379)
- [ ] **BUG-04**: DECLARE statement in class body outside methods parses without error (#380)

### Grammar

- [ ] **GRAM-01**: EXIT verb accepts optional integer parameter (#376)
- [ ] **GRAM-02**: SERIAL verb recognized by parser (#375)
- [ ] **GRAM-03**: ADDR function recognized by parser (#377)

### Feature Gaps

- [ ] **FEAT-01**: `.class` property on class references resolves to java.lang.Class (#373)
- [ ] **FEAT-02**: Static method completion on class references via USE statements (#374)
- [ ] **FEAT-03**: Deprecated methods show strikethrough indicator in completion items
- [ ] **FEAT-04**: Constructor completion for `new ClassName()` expressions

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
| BUG-01 | — | Pending |
| BUG-02 | — | Pending |
| BUG-03 | — | Pending |
| BUG-04 | — | Pending |
| GRAM-01 | — | Pending |
| GRAM-02 | — | Pending |
| GRAM-03 | — | Pending |
| FEAT-01 | — | Pending |
| FEAT-02 | — | Pending |
| FEAT-03 | — | Pending |
| FEAT-04 | — | Pending |

**Coverage:**
- v3.9 requirements: 11 total
- Mapped to phases: 0
- Unmapped: 11

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after initial definition*
