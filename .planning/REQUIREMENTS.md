# Requirements: BBj Language Server - IntelliJ Integration

**Defined:** 2026-02-01
**Core Value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code through a shared language server

## v1 Requirements

Requirements for internal alpha release. Each maps to roadmap phases.

### Plugin Foundation

- [x] **FOUND-01**: IntelliJ plugin project builds with Gradle and LSP4IJ dependency, targeting Community Edition
- [x] **FOUND-02**: BBj file types (.bbj, .bbl, .bbjt, .src) registered with custom icon and language association
- [x] **FOUND-03**: TextMate grammar (bbj.tmLanguage.json) provides syntax highlighting for BBj code in IntelliJ
- [ ] **FOUND-04**: Settings UI allows user to configure BBj home path and classpath entries
- [ ] **FOUND-05**: Settings UI allows user to configure or override Node.js runtime path

### Language Server Integration

- [ ] **LSI-01**: Plugin detects system Node.js installation and validates version (16+)
- [ ] **LSI-02**: Plugin starts language server process (node main.cjs) over stdio when BBj file is opened
- [ ] **LSI-03**: Plugin stops language server process cleanly when project closes (no zombie processes)
- [ ] **LSI-04**: Plugin restarts language server when settings change (BBj home path, classpath)
- [ ] **LSI-05**: Syntax errors and validation warnings appear as inline diagnostics in the editor
- [ ] **LSI-06**: Code completion provides BBj keywords, built-in functions, and variables
- [ ] **LSI-07**: Go-to-definition navigates to symbol declarations (Ctrl+Click / Cmd+Click)
- [ ] **LSI-08**: Hover shows documentation and type information for symbols
- [ ] **LSI-09**: Signature help shows parameter hints when typing function calls

### Java Interop

- [ ] **JAVA-01**: Language server connects to running java-interop service (hosted by BBjServices on localhost:5008)
- [ ] **JAVA-02**: Code completion includes Java class names and method signatures from java-interop
- [ ] **JAVA-03**: Plugin shows user-visible error if java-interop service is unreachable (BBjServices not running)

### Error Handling & UX

- [ ] **UX-01**: Plugin shows balloon notification when language server fails to start (with actionable message)
- [ ] **UX-02**: Plugin shows clear error when Node.js is not found (with installation instructions)
- [ ] **UX-03**: Status bar widget shows language server connection state (Running / Disconnected / Error)
- [ ] **UX-04**: "Restart BBj Language Server" action available in Tools menu

### Distribution & Packaging

- [ ] **DIST-01**: Language server bundle (main.cjs) packaged inside plugin distribution
- [x] **DIST-02**: TextMate grammar files packaged inside plugin distribution
- [ ] **DIST-03**: Plugin builds as installable ZIP for manual IntelliJ installation
- [ ] **DIST-04**: Plugin works on macOS, Windows, and Linux

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced IDE Features

- **V2-01**: Semantic token highlighting for context-aware syntax coloring (beyond TextMate regex)
- **V2-02**: Find references / Find usages (Alt+F7)
- **V2-03**: Rename refactoring across files (Shift+F6)
- **V2-04**: Code formatting via language server (Ctrl+Alt+L)
- **V2-05**: Document symbols in Structure panel (Alt+7)
- **V2-06**: Folding regions for functions, classes, and blocks

### Advanced Integration

- **V2-07**: Bundled Node.js runtime (zero-install experience)
- **V2-08**: Run configurations for BBj programs
- **V2-09**: Debug adapter integration
- **V2-10**: JetBrains Marketplace publication

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser/lexer | Defeats purpose of reusing existing LS; LSP4IJ + TextMate sufficient |
| Grammar-Kit based parser | Duplicates Langium grammar; maintenance burden |
| JetBrains native LSP API | Requires Ultimate Edition; violates Community Edition constraint |
| Language server modifications | IntelliJ adapts to existing LS; single source of truth |
| Project wizard/templates | Not needed for alpha; users open existing BBj projects |
| Build system integration | BBj is interpreter-based; no standard build system |
| Call hierarchy | Complex feature; low ROI for alpha |
| Workspace symbol search | Performance concerns on large BBj projects |
| Inlay hints / type annotations | Requires server-side implementation |
| java-interop process management | BBjServices hosts java-interop; plugin only connects |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 2 | Complete |
| FOUND-04 | Phase 3 | Pending |
| FOUND-05 | Phase 3 | Pending |
| LSI-01 | Phase 3 | Pending |
| LSI-02 | Phase 3 | Pending |
| LSI-03 | Phase 3 | Pending |
| LSI-04 | Phase 3 | Pending |
| LSI-05 | Phase 4 | Pending |
| LSI-06 | Phase 4 | Pending |
| LSI-07 | Phase 4 | Pending |
| LSI-08 | Phase 4 | Pending |
| LSI-09 | Phase 4 | Pending |
| JAVA-01 | Phase 5 | Pending |
| JAVA-02 | Phase 5 | Pending |
| JAVA-03 | Phase 5 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 3 | Pending |
| UX-03 | Phase 5 | Pending |
| UX-04 | Phase 4 | Pending |
| DIST-01 | Phase 6 | Pending |
| DIST-02 | Phase 2 | Complete |
| DIST-03 | Phase 6 | Pending |
| DIST-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 — Phase 2 complete (FOUND-03, DIST-02)*
