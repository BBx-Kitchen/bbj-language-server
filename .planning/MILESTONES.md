# Project Milestones: BBj Language Server

## v2.0 Langium 4 Upgrade (Shipped: 2026-02-04)

**Delivered:** Upgraded language server from Langium 3.2 to Langium 4.1.3 with zero feature regressions across VS Code and IntelliJ, plus test coverage infrastructure and human QA procedures.

**Phases completed:** 14-20 (11 plans total)

**Key accomplishments:**

- Upgraded Langium 3.2 → 4.1.3 with clean dependency tree and regenerated grammar
- Migrated 77 TypeScript errors: type constants to `.$type` pattern, `PrecomputedScopes` → `LocalSymbols`, scope method renames
- Updated API signatures: completion provider 3-param signature, `Reference | MultiReference` union type guards in linker
- Test suite passing with 88% V8 coverage and threshold-based regression prevention
- Release artifacts ready: VS Code .vsix (1.67 MB) and IntelliJ .zip (701 KB)
- Human QA procedures: 27-item full test and 8-item smoke test checklists

**Stats:**

- 70 files created/modified
- +9,562 / -287 lines (code + planning docs)
- ~23,000 LOC TypeScript (codebase total)
- 7 phases, 11 plans
- 2 days (2026-02-03 → 2026-02-04)

**Git range:** `c9efe7a` → `11acf7d`

**What's next:** User-handled version bump and publishing (RELS-01, RELS-02, RELS-03)

---

## v1.2 Run Fixes & Marketplace (Shipped: 2026-02-02)

**Delivered:** Fixed all broken run commands with proper stderr capture, prepared plugin for JetBrains Marketplace publication with verified metadata, licensing, and plugin verifier compliance — ready for first public release.

**Phases completed:** 11-13 (5 plans total)

**Key accomplishments:**

- Fixed BBj executable resolution using java.nio.file.Files API (handles symbolic links correctly)
- Added process stderr capture via ProcessAdapter routed to LS log window with auto-show on errors
- Replaced MainToolBar with ProjectViewPopupMenu submenu for IntelliJ new UI compatibility
- Prepared complete Marketplace metadata (description, icons, MIT License, NOTICES, change notes)
- Passed JetBrains plugin verifier with zero compatibility errors across 6 IDE versions
- Fixed plugin ID mismatch that broke BUI/DWC run commands in production installs

**Stats:**

- 33 files created/modified
- 3,902 lines of Java (plugin source, cumulative)
- 3 phases, 5 plans
- 1 day (2026-02-02)

**Git range:** `68d2672` → `439ce83`

**What's next:** Upload bbj-intellij-0.1.0.zip to JetBrains Marketplace for first public publication.

---

## v1.1 Polish & Run Commands (Shipped: 2026-02-02)

**Delivered:** Brand icons, run commands (GUI/BUI/DWC), Structure view, and all 7 carried-forward v1.0 bug fixes — bringing the IntelliJ plugin to feature parity with VSCode for daily development workflows.

**Phases completed:** 7-10 (6 plans total)

**Key accomplishments:**

- BBj brand icons (file, config, plugin listing, run actions) with light/dark theme support harvested from VSCode SVGs
- Run BBj programs as GUI/BUI/DWC directly from IntelliJ with toolbar buttons (Alt+G/B/D shortcuts) and bundled web.bbj runner
- Document outline / Structure view via LSP DocumentSymbol with click-to-navigate
- REM comment toggling, bracket matching, and LSP hover placeholder suppression
- 30-second LS shutdown grace period preventing disruptive restarts on file switches
- Completion popup icons using platform AllIcons.Nodes with Java-interop distinction

**Stats:**

- 35 files created/modified
- 3,808 lines of Java (plugin source, cumulative)
- 4 phases, 6 plans
- 1 day from v1.0 ship to v1.1 ship (2026-02-01 → 2026-02-02)

**Git range:** `a0acf5d` → `620db16`

**What's next:** TBD — semantic tokens, find references, rename refactoring, Marketplace publication, or new milestone

---

## v1.0 Internal Alpha (Shipped: 2026-02-01)

**Delivered:** IntelliJ plugin providing full BBj language support (syntax highlighting, diagnostics, code completion, Java interop) via LSP4IJ and the shared Langium-based language server.

**Phases completed:** 1-6 (19 plans total)

**Key accomplishments:**
- Gradle-based IntelliJ plugin with BBj file type registration and custom icons for Community and Ultimate editions
- TextMate grammar integration for instant syntax highlighting of BBj and BBx code
- Configuration UI with auto-detection of BBj home, classpath entries, and Node.js runtime
- Full LSP integration via LSP4IJ: diagnostics, completion, hover, go-to-definition, signature help
- Java class/method completions via java-interop service with independent TCP health monitoring
- Cross-platform distribution with bundled language server and automatic Node.js download

**Stats:**
- 96 files created/modified
- 7,253 lines of Java (plugin source)
- 6 phases, 19 plans
- 1 day from start to ship
- Verified on macOS ARM (Ultimate 2025.3.2) and Windows x64 (Community Edition)

**Git range:** `da38c85` → `c0f430e`

**What's next:** v2 features (semantic tokens, find references, rename, Marketplace publication) or new milestone TBD

---
