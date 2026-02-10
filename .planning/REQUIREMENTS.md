# Requirements: BBj Language Server

**Defined:** 2026-02-10
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## v3.6 Requirements

Requirements for IntelliJ Platform API compatibility. Each maps to roadmap phases.

### Compatibility — Scheduled for Removal

- [ ] **COMPAT-01**: Replace `SystemInfo.is64Bit` and `SystemInfo.isAarch64` with current platform detection API in `BbjNodeDownloader.getArchitecture()`
- [ ] **COMPAT-02**: Replace `PluginId.findId(String)` with non-deprecated plugin lookup in `BbjEMLoginAction.getEMLoginBbjPath()`
- [ ] **COMPAT-03**: Replace `TextFieldWithBrowseButton.addBrowseFolderListener(...)` with current browse API in `BbjSettingsComponent`
- [ ] **COMPAT-04**: Replace `FileChooserDescriptorFactory.createSingleLocalFileDescriptor()` with current file chooser API in `BbjSettingsComponent`

### Compatibility — Deprecated

- [ ] **COMPAT-05**: Replace `ProcessAdapter` class with `ProcessListener` interface in `BbjRunActionBase`
- [ ] **COMPAT-06**: Replace `LanguageCodeStyleSettingsProvider.getDefaultCommonSettings()` with current code style API in `BbjLanguageCodeStyleSettingsProvider`

### Verification

- [ ] **VERIFY-01**: Plugin verifier reports 0 scheduled-for-removal API usages
- [ ] **VERIFY-02**: Plugin verifier reports 0 deprecated API usages

## Future Requirements

### Experimental API Compatibility

- **EXP-01**: Reduce LSP4IJ experimental API surface (19 usages) — requires LSP4IJ to stabilize APIs
- **EXP-02**: Add compatibility shims for LSPClientFeatures, LSPCompletionFeature, LSPDocumentLinkFeature

## Out of Scope

| Feature | Reason |
|---------|--------|
| LSP4IJ experimental API migration | LSP4IJ APIs are inherently experimental; can't avoid without abandoning LSP4IJ |
| New IntelliJ features | This milestone is purely compatibility maintenance |
| VS Code extension changes | Only IntelliJ plugin code affected |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMPAT-01 | TBD | Pending |
| COMPAT-02 | TBD | Pending |
| COMPAT-03 | TBD | Pending |
| COMPAT-04 | TBD | Pending |
| COMPAT-05 | TBD | Pending |
| COMPAT-06 | TBD | Pending |
| VERIFY-01 | TBD | Pending |
| VERIFY-02 | TBD | Pending |

**Coverage:**
- v3.6 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
