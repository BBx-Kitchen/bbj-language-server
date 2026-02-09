# Requirements: BBj Language Server

**Defined:** 2026-02-09
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.5 Requirements

Requirements for the 0.8.0 documentation release. Each maps to roadmap phases.

### Site Chrome

- [ ] **SITE-01**: Docusaurus tagline updated to cover both VS Code and IntelliJ
- [ ] **SITE-02**: JetBrains Marketplace link added to navbar and footer alongside VS Code Marketplace
- [ ] **SITE-03**: Developer Guide removed from navbar and footer navigation
- [ ] **SITE-04**: Landing page (user-guide/index.md) updated to reference both IDEs with equal marketplace link prominence

### VS Code User Guide Audit

- [ ] **VSCA-01**: Features page audited — remove phantom features (Find All References as standalone, Decompile command) and add missing ones (EM token auth, debug flag, type resolution warnings, config.bbx setting, interop host/port)
- [ ] **VSCA-02**: Configuration page audited — remove plaintext password documentation, add token-based EM auth, add config.bbx path setting, add interop host/port settings, add type resolution warnings setting
- [ ] **VSCA-03**: Commands page audited — remove Decompile command, verify all listed commands exist, add Refresh Java Classes
- [ ] **VSCA-04**: Getting Started page audited — verify installation steps and setup instructions match current extension behavior
- [ ] **VSCA-05**: File types table corrected — .bbl excluded from source code features, .bbx and .src properly documented

### IntelliJ User Guide

- [ ] **IJUG-01**: Getting Started page — installation from JetBrains Marketplace and .zip file, BBj Home auto-detection, initial setup, first program run
- [ ] **IJUG-02**: Features page — completion, diagnostics, hover, go-to-definition, structure view, run commands, syntax highlighting, Java interop completion
- [ ] **IJUG-03**: Configuration page — Settings UI path, BBj Home, classpath, interop host/port, config.bbx path, debug flag, EM token authentication
- [ ] **IJUG-04**: Commands page — Run as GUI/BUI/DWC shortcuts (Alt+G/B/D), compile command, toolbar buttons, context menu actions

### Cleanup

- [ ] **CLEAN-01**: Roadmap page removed entirely
- [ ] **CLEAN-02**: Developer Guide directory and all pages removed from docs site
- [ ] **CLEAN-03**: Sidebar and category metadata updated to reflect new structure

## Future Requirements

### Documentation Enhancements

- **DOC-01**: Screenshots and GIFs showing features in action
- **DOC-02**: Troubleshooting guide consolidation across IDEs
- **DOC-03**: Release notes / changelog page

## Out of Scope

| Feature | Reason |
|---------|--------|
| Developer Guide rewrite | Removed from public site; repo READMEs serve this purpose |
| Eclipse integration docs | Eclipse plugin not yet built |
| API reference / JavaDoc hosting | Separate concern, not part of user docs |
| Localization / i18n | English-only for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SITE-01 | Phase 44 | Pending |
| SITE-02 | Phase 44 | Pending |
| SITE-03 | Phase 44 | Pending |
| SITE-04 | Phase 44 | Pending |
| VSCA-01 | Phase 46 | Pending |
| VSCA-02 | Phase 46 | Pending |
| VSCA-03 | Phase 46 | Pending |
| VSCA-04 | Phase 46 | Pending |
| VSCA-05 | Phase 46 | Pending |
| IJUG-01 | Phase 45 | Pending |
| IJUG-02 | Phase 45 | Pending |
| IJUG-03 | Phase 45 | Pending |
| IJUG-04 | Phase 45 | Pending |
| CLEAN-01 | Phase 47 | ✓ Complete |
| CLEAN-02 | Phase 47 | ✓ Complete |
| CLEAN-03 | Phase 47 | ✓ Complete |

**Coverage:**
- v3.5 requirements: 16 total
- Mapped to phases: 16 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after v3.5 roadmap created*
