# Roadmap: BBj Language Server - IntelliJ Integration

## Overview

This roadmap delivers a working IntelliJ plugin that brings BBj language support to JetBrains IDEs by connecting to the existing language server via LSP4IJ. The journey progresses from plugin scaffolding and static syntax highlighting through full language server integration with diagnostics and completions, culminating in Java interop support and cross-platform distribution. Each phase builds on the previous, with success measured by observable user behaviors rather than implementation tasks.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Plugin Scaffolding** - Gradle project with file type registration
- [x] **Phase 2: Syntax Highlighting** - TextMate grammar integration for visual feedback
- [ ] **Phase 3: Settings & Runtime** - Configuration UI and Node.js detection
- [ ] **Phase 4: Language Server Integration** - Core LSP features with process management
- [ ] **Phase 5: Java Interop** - Full Java completion via java-interop service
- [ ] **Phase 6: Distribution** - Cross-platform packaging and bundling

## Phase Details

### Phase 1: Plugin Scaffolding
**Goal**: IntelliJ recognizes BBj files and has a functional plugin structure
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02
**Success Criteria** (what must be TRUE):
  1. IntelliJ IDEA Community Edition loads the plugin from sandbox without errors
  2. BBj files (.bbj, .bbl, .bbjt, .src) appear with custom icon in Project view
  3. Opening a BBj file creates an editor instance (even without syntax highlighting yet)
  4. Plugin builds successfully via `./gradlew buildPlugin` and produces installable ZIP
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Gradle project setup with IntelliJ Platform SDK
- [x] 01-02-PLAN.md — BBj file type registration with custom icon

### Phase 2: Syntax Highlighting
**Goal**: BBj code displays with color syntax highlighting via TextMate grammar integration
**Depends on**: Phase 1
**Requirements**: FOUND-03, DIST-02
**Success Criteria** (what must be TRUE):
  1. BBj keywords (IF, WHILE, FOR, etc.) appear in distinct color from identifiers
  2. String literals and comments display in different colors from code
  3. Syntax highlighting appears immediately when opening BBj file (no delay waiting for server)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — TextMate grammar integration with Gradle sync and bundle provider
- [x] 02-02-PLAN.md — Color Scheme settings page for BBj token customization

### Phase 3: Settings & Runtime
**Goal**: Users can configure BBj environment and plugin detects Node.js
**Depends on**: Phase 2
**Requirements**: FOUND-04, FOUND-05, LSI-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Settings UI (Preferences > Languages & Frameworks > BBj) shows BBj home path field, Node.js path field, and classpath dropdown
  2. BBj home auto-detects from ~/BASIS/Install.properties and common locations, with manual browse override
  3. Classpath dropdown lists named entries from BBj.properties (e.g., bbj_default, addon); user selects one
  4. Plugin detects Node.js from system PATH, displays version, allows manual path override
  5. Editor banner appears on BBj files when BBj home or Node.js is missing/invalid, with action links
  6. Settings persist as application-level (global) config across IDE restarts
  7. Settings changes auto-restart the language server (Phase 4 will consume these settings)
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Settings state model and runtime detection utilities
- [ ] 03-02-PLAN.md — Settings UI page with validation and classpath dropdown
- [ ] 03-03-PLAN.md — Editor notification banners and human verification

### Phase 4: Language Server Integration
**Goal**: Core LSP features work end-to-end (diagnostics, completion, navigation, hover)
**Depends on**: Phase 3
**Requirements**: LSI-02, LSI-03, LSI-04, LSI-05, LSI-06, LSI-07, LSI-08, LSI-09, UX-01, UX-04
**Success Criteria** (what must be TRUE):
  1. Language server process starts when first BBj file is opened, visible in status bar widget
  2. Syntax errors appear as red underlines in editor with hover tooltips explaining the error
  3. Typing triggers code completion popup with BBj keywords, built-in functions, and local variables
  4. Ctrl+Click (Cmd+Click on macOS) on a variable navigates to its declaration
  5. Hovering over a function shows its documentation and signature
  6. Typing function name followed by opening paren shows parameter hints
  7. Changing settings triggers language server restart, reflected in status bar
  8. Closing project cleanly stops language server (no zombie processes remain)
  9. Tools menu includes "Restart BBj Language Server" action that works when clicked
  10. Language server crash triggers balloon notification with error message and restart option
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 5: Java Interop
**Goal**: Java class and method completions work via java-interop service
**Depends on**: Phase 4
**Requirements**: JAVA-01, JAVA-02, JAVA-03, UX-03
**Success Criteria** (what must be TRUE):
  1. Language server successfully connects to java-interop service on localhost:5008 at startup
  2. Typing Java class reference triggers completion popup with Java class names from configured classpath
  3. After selecting Java class, typing period shows method completion with Java method signatures
  4. Status bar widget shows java-interop connection state alongside language server state
  5. If java-interop service is unreachable (BBjServices not running), user sees notification explaining BBjServices requirement
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 6: Distribution
**Goal**: Plugin packages for installation on Windows, macOS, and Linux
**Depends on**: Phase 5
**Requirements**: DIST-01, DIST-03, DIST-04
**Success Criteria** (what must be TRUE):
  1. Plugin ZIP includes bundled language server (main.cjs) in correct directory structure
  2. Plugin ZIP installs via "Install Plugin from Disk" on fresh IntelliJ instance without errors
  3. After installation from ZIP, all Phase 4 and Phase 5 features work identically to development sandbox
  4. Plugin tested and working on macOS, Windows, and Linux environments
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Scaffolding | 2/2 | ✓ Complete | 2026-02-01 |
| 2. Syntax Highlighting | 2/2 | ✓ Complete | 2026-02-01 |
| 3. Settings & Runtime | 0/3 | In progress | - |
| 4. Language Server Integration | 0/? | Not started | - |
| 5. Java Interop | 0/? | Not started | - |
| 6. Distribution | 0/? | Not started | - |
