# Requirements: BBj Language Server - IntelliJ Integration v1.1

**Defined:** 2026-02-01
**Core Value:** BBj developers using IntelliJ get the same language intelligence they have in VS Code — through a single shared language server.

## v1.1 Requirements

Requirements for v1.1 Polish & Run Commands milestone. Each maps to roadmap phases.

### Icons

- [ ] **ICON-01**: Plugin uses BBj brand file icon (from VSCode bbj-file SVGs) for .bbj/.bbl/.bbjt/.src files in light and dark themes
- [ ] **ICON-02**: Plugin uses BBj config icon (from VSCode bbj-config SVGs) for .bbx files in light and dark themes
- [ ] **ICON-03**: Plugin uses BBj brand icon (from VSCode icon.png) as marketplace/plugin listing icon
- [ ] **ICON-04**: Run GUI toolbar button uses VSCode run-gui icon (light/dark)
- [ ] **ICON-05**: Run BUI toolbar button uses VSCode run-bui icon (light/dark)
- [ ] **ICON-06**: Run DWC toolbar button uses VSCode run-dwc icon (light/dark)

### Run Commands

- [ ] **RUN-01**: User can run current BBj file as GUI program via menu action (spawns bbj executable with -q flag and file path)
- [ ] **RUN-02**: User can run current BBj file as BUI program via menu action (uses bundled web.bbj runner with BUI client type)
- [ ] **RUN-03**: User can run current BBj file as DWC program via menu action (uses bundled web.bbj runner with DWC client type)
- [ ] **RUN-04**: Run GUI/BUI/DWC actions appear as toolbar buttons in the editor toolbar
- [ ] **RUN-05**: Run GUI action has keyboard shortcut Alt+G
- [ ] **RUN-06**: Run BUI action has keyboard shortcut Alt+B
- [ ] **RUN-07**: Run DWC action has keyboard shortcut Alt+D
- [ ] **RUN-08**: Run commands use BBj home path from plugin settings to locate bbj executable
- [ ] **RUN-09**: Run commands use classpath from plugin settings when configured
- [ ] **RUN-10**: Run commands auto-save the active file before execution (configurable)
- [ ] **RUN-11**: Run command errors display in IntelliJ notification balloons
- [ ] **RUN-12**: Plugin bundles web.bbj runner script for BUI/DWC execution

### Structure View

- [ ] **STRUC-01**: Document outline / Structure tool window shows symbols from the language server (classes, methods, variables, labels)
- [ ] **STRUC-02**: Structure view updates when document changes
- [ ] **STRUC-03**: Clicking a symbol in Structure view navigates to its location in the editor

### Bug Fixes

- [ ] **FIX-01**: Comment toggling (Ctrl+/ / Cmd+/) inserts/removes REM prefix on selected lines
- [ ] **FIX-02**: Bracket matching works for parentheses, square brackets, and curly braces
- [ ] **FIX-03**: "LSP Symbol ..." popup text on Cmd+hover is suppressed or shows meaningful content
- [ ] **FIX-04**: Language server stays alive briefly after last BBj file is closed (grace period to avoid restart on quick file switches)
- [ ] **FIX-05**: BbjCompletionFeature custom icons (function, variable, keyword) display in completion popup
- [ ] **FIX-06**: Stale bbj-intellij/META-INF/plugin.xml file removed or consolidated
- [ ] **FIX-07**: Linux code paths reviewed for correctness (process spawning, path separators, Node.js detection)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Enhanced Features

- **ENH-01**: Semantic token highlighting (more precise than TextMate)
- **ENH-02**: Find references across files
- **ENH-03**: Rename refactoring
- **ENH-04**: Code formatting

### Developer Experience

- **DEV-01**: Debugging support (breakpoints, step through)
- **DEV-02**: BBj project wizard/templates
- **DEV-03**: JetBrains Marketplace publication

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native IntelliJ parser/lexer | LSP4IJ approach reuses existing LS — no need to rewrite |
| Full run configurations (with run/debug toolbar) | Run actions sufficient for v1.1; full RunConfiguration infrastructure deferred |
| Decompile/denumber commands | VSCode-specific workflow, not requested for IntelliJ |
| Compile command | Not requested for this milestone |
| Open config/properties/EM commands | VSCode convenience commands, not prioritized |
| Web runner settings (username/password/app names) | Use defaults for v1.1; settings expansion deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ICON-01 | Phase 7 | Complete |
| ICON-02 | Phase 7 | Complete |
| ICON-03 | Phase 7 | Complete |
| ICON-04 | Phase 7 | Complete |
| ICON-05 | Phase 7 | Complete |
| ICON-06 | Phase 7 | Complete |
| RUN-01 | Phase 8 | Pending |
| RUN-02 | Phase 8 | Pending |
| RUN-03 | Phase 8 | Pending |
| RUN-04 | Phase 8 | Pending |
| RUN-05 | Phase 8 | Pending |
| RUN-06 | Phase 8 | Pending |
| RUN-07 | Phase 8 | Pending |
| RUN-08 | Phase 8 | Pending |
| RUN-09 | Phase 8 | Pending |
| RUN-10 | Phase 8 | Pending |
| RUN-11 | Phase 8 | Pending |
| RUN-12 | Phase 8 | Pending |
| STRUC-01 | Phase 9 | Pending |
| STRUC-02 | Phase 9 | Pending |
| STRUC-03 | Phase 9 | Pending |
| FIX-01 | Phase 10 | Pending |
| FIX-02 | Phase 10 | Pending |
| FIX-03 | Phase 10 | Pending |
| FIX-04 | Phase 10 | Pending |
| FIX-05 | Phase 10 | Pending |
| FIX-06 | Phase 10 | Pending |
| FIX-07 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after Phase 7 completion*
