# Project Milestones: BBj Language Server

## v3.1 PRIO 1+2 Issue Burndown (Shipped: 2026-02-07)

**Delivered:** Closed all PRIO 1+2 GitHub issues — fixed variable scoping bugs, DEF FN parameter isolation, inheritance resolution, Java reflection staleness, cyclic reference detection, and made extension settings (interop host/port, config.bbx path, EM auth) fully configurable with token-based security.

**Phases completed:** 28-31 (13 plans total, including 2 gap closures)

**Key accomplishments:**

- Use-before-assignment hint diagnostics with two-pass offset-based detection across LET, DIM, DREAD, FOR, READ, ENTER
- DEF FN definitions inside class methods work without false line-break errors; parameters properly scoped to function body
- Super class field access via `#field!` resolves through BBj inheritance chain (parent, grandparent, multi-level)
- Java reflection uses `Class.getMethods()` for inherited methods; Refresh Java Classes command in both IDEs
- Cyclic reference errors upgraded to Error severity with file:line info and clickable navigation; false positive on `a! = a!.toString()` eliminated
- Dedicated cyclic inheritance validator detects A extends B, B extends A patterns
- .bbx files treated identically to .bbj (icon, language features, run commands) in both VS Code and IntelliJ
- Configurable java-interop host/port and config.bbx path with hot-reload support
- Token-based EM authentication via BBjAdminFactory — VS Code SecretStorage, IntelliJ PasswordSafe; no plaintext passwords

**Stats:**

- 95 files modified (+12,720 / -273 lines)
- 4 phases, 13 plans (including 2 gap closures)
- 2 days (2026-02-06 → 2026-02-07)
- Milestone audit: 13/13 requirements, 4/4 phases, 12/12 integrations, 8/8 E2E flows

**Git range:** `v3.0` → `00f1ec5`

**What's next:** Start next milestone for remaining feature gaps, CPU stability mitigations, or PRIO 3 issue burndown.

---

## v3.0 Improving BBj Language Support (Shipped: 2026-02-06)

**Delivered:** Fixed false errors on common BBj syntax patterns, resolved crashes, improved type resolution for code completion, investigated CPU stability, and polished IDE features — eliminating the most-reported pain points in the language server.

**Phases completed:** 24-27 (11 plans total, including 1 gap closure)

**Key accomplishments:**

- LONGER_ALT keyword/identifier disambiguation — camel-case methods like `getResult`, `isNew` no longer split into keyword + identifier
- Inline REM comments after `endif`/`swend` and colon line-continuation parse without error
- DREAD verb and DATA statement fully supported by grammar
- DEF FN / FNEND blocks inside class methods parse without error
- CAST() correctly conveys type for downstream method resolution and completion
- Super class field access via `#field!` resolved through cycle-safe inheritance traversal
- Implicit getter calls convey return type for method chaining and completion
- DECLARE recognized anywhere in method scope (not just before first use)
- USE statements with inner/nested Java classes no longer crash (try/catch wrapping + dollar-sign fallback)
- Configurable type resolution warnings setting (`bbj.typeResolution.warnings`)
- Root cause analysis of 100% CPU in multi-project workspaces (infinite rebuild loop identified, mitigations ranked)
- Structure View: labels (Key), variables (Variable), methods (Method), DEF FN (Function) show distinct icons
- Run icons scoped to BBj file types only (.bbj, .bbl, .bbx, .src), excluded from .bbjt
- Global field `#` triggers completion of class fields with inheritance-aware collection
- Cyclic reference and linker error messages include source filename and line number

**Stats:**

- 21 files modified (+918 / -113 lines)
- 4 phases, 11 plans (including 1 gap closure)
- 1 day (2026-02-06)
- Milestone audit: 16/16 requirements, 4/4 phases, 4/4 E2E flows

**Git range:** `ca3d8e0` → `d7f3455`

**What's next:** Start next milestone for additional feature gap implementation or CPU stability mitigation.

---

## v2.2 IntelliJ Build & Release Automation (Shipped: 2026-02-05)

**Delivered:** Unified CI/CD automation for both VS Code and IntelliJ extensions — preview builds on every push to main, manual production releases with GitHub Release artifacts containing both .vsix and .zip.

**Phases completed:** 21-23 (3 plans total)

**Key accomplishments:**

- Gradle property injection for dynamic version sync between VS Code and IntelliJ extensions
- Two-job preview workflow with artifact sharing (main.cjs between builds)
- Three-job manual release workflow with GitHub Release creation
- IntelliJ installation instructions embedded in release notes
- PR validation workflow with path filtering for IntelliJ and shared dependencies
- Plugin verifier integration in release builds (catches IDE compatibility issues before users)

**Stats:**

- 16 files created/modified
- +1,950 / -40 lines (workflows + Gradle config)
- 3 phases, 3 plans
- 1 day (2026-02-05)

**Git range:** `90c42ff` → `f561d9f`

**What's next:** Create first unified release via `manual-release.yml` workflow dispatch, or start next milestone for feature gap implementation.

---

## v2.1 Feature Gap Analysis (Shipped: 2026-02-04)

**Delivered:** Comprehensive competitive analysis comparing BBj Language Server against Dynamo Tools VS Code extension, with prioritized feature gap backlog and implementation recommendations.

**Phases completed:** Research-only milestone (no code phases)

**Key findings:**

- Extensions are **fundamentally complementary**: BBj LS provides code intelligence (parsing, diagnostics, navigation); Dynamo Tools provides metadata-driven completion (Company Libraries, Data Dictionary)
- **12 feature gaps identified** and prioritized by user impact:
  - HIGH: Called program completion, Data Dictionary fields, Global field `#` trigger, BBjTemplatedString getters/setters
  - MEDIUM: Chained method resolution, Static method completion, Constructor completion, External doc links
  - LOW: Reopen as BBj, Company Library concept, Deprecated indicators, Legacy file detection
- **Integration opportunity:** Dynamo Tools Company Library JSON format could be consumed directly for metadata-driven completions
- **Quick wins identified:** Global field completion (uses existing AST), Deprecated method indicator, Reopen as BBj command

**Deliverable:**

- `.planning/research/DYNAMO-ANALYSIS.md` — Full gap analysis document with:
  - Side-by-side feature comparison table
  - 12 prioritized gaps with user impact assessment
  - Implementation notes for each gap
  - Phased implementation recommendation

**Stats:**

- 1 analysis document (400+ lines)
- VSIX reverse-engineered: 2,339 lines of JavaScript analyzed
- 1 day (2026-02-04)

**What's next:** Implement gap features (start with `/gsd:new-milestone`) or keep as reference backlog

---

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
