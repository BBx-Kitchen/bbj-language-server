# Requirements: BBj Language Server - IntelliJ Integration

**Defined:** 2026-02-02
**Core Value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.

## v1.2 Requirements

Requirements for Milestone v1.2: Run Fixes & Marketplace. Each maps to roadmap phases.

### Run Commands

- [x] **RUN-01**: BBj executable is correctly resolved from configured BBj Home path
- [x] **RUN-02**: Run toolbar buttons (GUI/BUI/DWC) are visible in IntelliJ new UI
- [x] **RUN-03**: Run command stdout/stderr is captured and displayed in IntelliJ console tool window
- [x] **RUN-04**: Run commands work end-to-end on macOS (GUI/BUI/DWC)
- [x] **RUN-05**: Run commands work end-to-end on Windows (GUI/BUI/DWC)

### Marketplace

- [ ] **MKT-01**: Plugin has a logo/icon for JetBrains Marketplace listing
- [ ] **MKT-02**: Plugin has a complete description and metadata for Marketplace listing
- [ ] **MKT-03**: Plugin includes EULA or license text
- [ ] **MKT-04**: Plugin passes JetBrains plugin verifier with no errors

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Language Features

- **LANG-01**: Semantic tokens for more accurate syntax highlighting
- **LANG-02**: Find references across project
- **LANG-03**: Rename refactoring across files
- **LANG-04**: Structure View symbol kind differentiation (language server issue)

### Developer Experience

- **DX-01**: Debugging support for BBj programs
- **DX-02**: BBj project wizard/templates
- **DX-03**: Code formatting

### Security

- **SEC-01**: EM credentials encrypted storage (currently plaintext)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser/lexer rewrite | LSP4IJ approach reuses existing LS — no need to reimplement |
| Language server modifications | IntelliJ adapts to what the LS provides |
| BbjCompletionFeature LSP4IJ wiring | Depends on future LSP4IJ API; tracked as tech debt |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RUN-01 | 11 | Complete |
| RUN-02 | 11 | Complete |
| RUN-03 | 11 | Complete |
| RUN-04 | 11 | Complete |
| RUN-05 | 11 | Complete |
| MKT-01 | 12 | Pending |
| MKT-02 | 12 | Pending |
| MKT-03 | 12 | Pending |
| MKT-04 | 12 | Pending |

**Coverage:**
- v1.2 requirements: 9 total
- Mapped to phases: 9/9 (100%)
- Phase 11 (Run Command Fixes): 5 requirements
- Phase 12 (Marketplace Preparation): 4 requirements

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
