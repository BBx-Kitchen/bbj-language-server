# Project Milestones: BBj Language Server

## v4.0 Stability and Quality (Shipped: 2026-08-20)

**Closed 2026-08-20** on records. The audit scored 40/40 requirements with no blockers
and no unmet requirements; its deferred items are handed forward rather than left open
(see below). Code shipped via PR #636 (`7371c26`) plus the GHSA-p5f3-9456-9pcx
remediation in PR #637 (`cf01570`).

**Where the artifacts live — by decision, not by accident.** Phases 60–69,
REQUIREMENTS.md, the v4.0 ROADMAP and `v4.0-MILESTONE-AUDIT.md` were authored on the
local `v4.0-stability-and-quality` branch and are **deliberately not merged to `main`**.
The remote branch of that name was force-pushed to a trimmed, code-only revision
(`cd8c7f8`) which is long merged; the branch is closed and is to be left alone.

The reason the full artifact tree stays off `main`: roughly fourteen of its files —
`reviews/65-COVERAGE.md`, `phases/69-github-issue-filing/69-ISSUE-DRAFT.md`,
`reviews/64-COVERAGE.md`, `reviews/MAJOR-REFACTORS.md`, `reviews/62-COVERAGE.md`,
`phases/65-*/65-03-PLAN.md` and the `69-*` filing ledger among them — describe the eight
still-unfixed advisories in detail. Publishing them to a public repository ahead of their
fixes is exactly what the private-fork flow exists to prevent. `main`'s `.planning/`
therefore jumps from v3.9 to this entry, and that gap is intentional.

**Delivered:** a ten-phase review-and-hardening pass over the whole repo — language
core, extension host / webview composers, IntelliJ plugin, build/CI/dependencies —
plus a cross-cutting security audit, debt re-triage, easy-fix application, and issue
filing.

**Phases completed:** 60–69 (62 plans)

| Phase | Name |
|-------|------|
| 60 | baseline-resync-review-standards |
| 61 | language-core-review |
| 62 | extension-host-webview-composer-review |
| 63 | intellij-plugin-review |
| 64 | build-ci-dependency-review |
| 65 | cross-cutting-security-audit |
| 66 | known-debt-re-triage |
| 67 | apply-easy-fixes |
| 68 | deliverable-documents |
| 69 | github-issue-filing |

**Audit scores:** requirements 40/40 · phases 10/10 · integration 6/6 · flows 1/1 ·
gaps: none.

**Deferred items — carried forward to the v4.1 security milestone** (also filed to
`tmp_human_review/`):

- **9 security advisories remain unpublished drafts** — GHSA-p5f3-9456-9pcx,
  -89r9-2pw4-mc7f, -5f22-gqrx-xr22, -c4hw-5j83-cx5h, -5vrp-fj75-pm5q,
  -9gv3-gr6g-c4rj, -33x9-cpwv-xcv2, -xxp5-vv2w-42q8, -h43f-jcjr-2g4j. Not
  world-visible. Publishing is a deliberate separate act this milestone did not perform.
- **WR-01..WR-06** — six concurrency/behavior warnings from phase 67. The audit claims
  these were "recorded ONLY in 67-REVIEW.md — not on the GitHub tracker"; **that is
  incorrect.** Verified 2026-08-20: WR-02 and WR-04 were fixed in-phase and the fixes are
  present on `main` (`java-interop.ts:190-191`, `bbj-lexer.ts:19`), and WR-01/03/05/06 are
  filed as open issues #497/#498/#499/#500. The audit summary needs correcting; the
  underlying `67-REVIEW.md` is accurate. Note `8194248` is not an ancestor of `main` (PR
  #636 rebased), so SHA-ancestry checks falsely report the fixes as missing — compare file
  content instead.
- **Nyquist validation 0/10** — no phase has a VALIDATION.md while the nyquist
  capability is active at `verify:post`. A coverage TODO, not a compliance failure.
- **Branch `issue492-cpu-regression-tests`** — 3 unmerged commits (705 insertions,
  6 regression-test files) reachable from no other ref, for the now-closed issue #492.
  Deliberately retained.
- **Local test suite red** — 11 failures under `Linking Tests > Interop related tests`.
  The audit attributes these to "a dead java-interop service on :5008"; the real cause,
  established 2026-08-20, is that **BBjServices owns port 5008** while
  `shouldRunBBjTests()` (`test/test-helper.ts:37-43`) gates on a bare TCP connect with no
  protocol handshake — so the gate false-positives and enables tests nothing can serve.
  Green under `RUN_BBJ_TESTS=0`; reproduced identically at `291cd23`. Not attributable to
  any v4.0 phase. Note CI is green only because CI has no BBj and therefore *skips* these
  tests — CI green is not evidence they pass.

**Stats (code on `main`, v3.9 tip → now):**

- 159 commits, 233 files changed (+20,526 / -3,813 lines, excluding `.planning/`)
- 10 phases, 62 plans
- 181 days (2026-02-21 → 2026-08-20)
- Marketplace releases 0.9.0, 0.10.0, 0.11.0, 0.12.0

**Git range:** `2194616` → `291cd23` (PR #636 merge commit: `7371c26`)

**What's next:** GHSA-p5f3-9456-9pcx is **fixed and merged** (PR #637, `cf01570`,
verified 9/9 must-haves with a live-BBj compile-path test); the preview build goes to QA
ahead of release. The remaining 8 advisories move into the **v4.1 security milestone**,
each with its own temporary private fork created 2026-08-20 from its advisory page. The
WR-01..WR-06 items are tracked as issues #497–#500 (two were already fixed in-phase).

---

## v3.4 0.8.0 Issue Closure (Shipped: 2026-02-08)

**Delivered:** Closed all 7 open GitHub issues tagged with the 0.8.0 milestone — fixed parser keyword conflicts, excluded .bbl library files from language features, cleaned up toolbar buttons, fixed token authentication corruption, and added config.bbx path support to all run commands across both VS Code and IntelliJ.

**Phases completed:** 40-43 (4 plans total)

**Key accomplishments:**

- Generic LONGER_ALT order fix for all keyword-prefixed identifiers — `stepXYZ!`, `selectMode$` etc. parse correctly in class definitions (#368)
- Excluded .bbl library files from BBj source file registration in VS Code, IntelliJ, and workspace manager (#369)
- Removed non-functional Decompile command, added compile icons, and file-scoped visibility guards for toolbar actions in both IDEs (#370, #354)
- Fixed token authentication corruption — `? 'HIDE'` in em-login.bbj was printing "HIDE" to stdout before the JWT token (#256, #359)
- Config.bbx path support added to all run commands (GUI/BUI/DWC) in both VS Code and IntelliJ (#244)

**Stats:**

- 25 files modified (+1,052 / -52 lines)
- 4 phases, 4 plans
- 1 day (2026-02-08)
- GitHub issues closed: #368, #369, #370, #354, #256, #359, #244

**Git range:** `33d0d93` → `b785697`

**What's next:** All 0.8.0 issues closed. Ready for 0.8.0 release or next milestone.

---

## v3.3 Output & Diagnostic Cleanup (Shipped: 2026-02-08)

**Delivered:** Implemented level-based debug logging, migrated all console output to respect the debug flag, suppressed synthetic file diagnostics and javadoc spam, investigated Chevrotain ambiguity warnings, and documented the debug setting — giving users a quiet, professional language server by default with verbose output on demand.

**Phases completed:** 35-39 (6 plans total)

**Key accomplishments:**

- Logger singleton with zero-overhead level filtering, lazy evaluation callbacks, and scoped component tags for debug output
- `bbj.debug` setting wired to logger via hot-reload — quiet startup (ERROR level) until workspace init, then WARN (default) or DEBUG
- 42 console.log/debug/warn calls migrated across 11 files; essential summaries via logger.info, verbose details via logger.debug
- Synthetic file diagnostics suppressed (bbjlib:/ scheme check), javadoc errors aggregated to single summary warning
- 47 Chevrotain ambiguity patterns investigated and documented — all safe (BBj's non-reserved keywords), moved behind debug flag
- Debug logging setting documented in Docusaurus configuration guide with troubleshooting section

**Stats:**

- 45 files modified (+6,578 / -107 lines)
- 5 phases, 6 plans
- 1 day (2026-02-08)
- Milestone audit: 10/10 requirements, 5/5 phases, 6/6 integrations, 3/3 E2E flows

**Git range:** `9244881` → `0b485a1`

---

## v3.2 Bug Fix Release (Shipped: 2026-02-08)

**Delivered:** Fixed regressions and parser bugs that produced false errors on valid BBj code — restored BBjAPI() resolution, USE statement navigation, and eliminated diagnostics noise from void methods, suffixed variables, SELECT statements, and cast expressions.

**Phases completed:** 32-34 (10 plans total, including 4 gap closures)

**Key accomplishments:**

- Built-in BBjAPI class loaded as synthetic document — resolves case-insensitively independent of Java interop, restoring completion on `api!.` variables
- Custom DefinitionProvider for USE statement Ctrl-click navigation to exact class declaration line via nameProvider.getNameNode()
- Fixed onDidChangeConfiguration race condition that cleared Java class cache during VS Code startup
- CastExpression grammar rule — `cast(BBjString[], var!)` parses correctly with array type notation and arrayDims support
- void return type (`voidReturn` property), DEF FN suffixed variables (LONGER_ALT fix), and SELECT verb grammar — eliminated false errors on valid BBj syntax
- USE file path validation with PREFIX reconciliation, binary file detection (`<<bbj>>` header), normalize(fsPath) URI comparison, and searched-paths error messages

**Stats:**

- 21 files modified (+812 / -72 lines)
- 3 phases, 10 plans (including 4 gap closures)
- 2 days (2026-02-07 → 2026-02-08)
- Test improvement: +30 passing (434 total), -7 failures (10 remaining, all pre-existing)
- Milestone audit: 8/8 requirements, 3/3 phases, 15/15 integrations, 6/6 E2E flows

**Git range:** `v3.1` → `542438f`

**What's next:** Start next milestone for remaining feature gaps, CPU stability mitigations, or PRIO 3 issue burndown.

---

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

## v3.3 Output & Diagnostic Cleanup (Shipped: 2026-02-08)

**Delivered:** Implemented level-based debug logging, migrated all console output to respect the debug flag, suppressed synthetic file diagnostics and javadoc spam, investigated Chevrotain ambiguity warnings, and documented the debug setting — giving users a quiet, professional language server by default with verbose output on demand.

**Phases completed:** 35-39 (6 plans total)

**Key accomplishments:**

- Logger singleton with zero-overhead level filtering, lazy evaluation callbacks, and scoped component tags for debug output
- `bbj.debug` setting wired to logger via hot-reload — quiet startup (ERROR level) until workspace init, then WARN (default) or DEBUG
- 42 console.log/debug/warn calls migrated across 11 files; essential summaries via logger.info, verbose details via logger.debug
- Synthetic file diagnostics suppressed (bbjlib:/ scheme check), javadoc errors aggregated to single summary warning
- 47 Chevrotain ambiguity patterns investigated and documented — all safe (BBj's non-reserved keywords), moved behind debug flag
- Debug logging setting documented in Docusaurus configuration guide with troubleshooting section

**Stats:**

- 45 files modified (+6,578 / -107 lines)
- 5 phases, 6 plans
- 1 day (2026-02-08)
- Milestone audit: 10/10 requirements, 5/5 phases, 6/6 integrations, 3/3 E2E flows

**Git range:** `9244881` → `0b485a1`

**What's next:** Start next milestone for remaining feature gaps, CPU stability mitigations, or additional issue burndown.

---


## v3.4 0.8.0 Issue Closure (Shipped: 2026-02-08)

**Phases completed:** 43 phases, 86 plans, 4 tasks

**Key accomplishments:**
- (none recorded)

---


## v3.5 Documentation for 0.8.0 Release (Shipped: 2026-02-09)

**Phases completed:** 47 phases, 93 plans, 14 tasks

**Key accomplishments:**
- (none recorded)

---


## v3.6 IntelliJ Platform API Compatibility (Shipped: 2026-02-10)

**Delivered:** Eliminated all deprecated and scheduled-for-removal IntelliJ Platform API usages flagged by JetBrains plugin verifier, ensuring forward compatibility with IntelliJ 2026.1+. Plugin verifier confirms zero compatibility warnings across 6 IDE versions.

**Phases completed:** 48-49 (2 plans total)

**Key accomplishments:**

- Replaced 4 scheduled-for-removal APIs: CpuArch for platform detection, PluginId.getId for plugin lookup, TextBrowseFolderListener for browse folders, FileChooserDescriptor constructor for file selection
- Replaced 2 deprecated APIs: ProcessListener interface for process events, customizeDefaults() for code style configuration
- Fixed additional deprecated FileChooserDescriptor factory method discovered during verification
- Plugin verifier confirms zero deprecated and zero scheduled-for-removal API usages across 6 IntelliJ IDE versions (2024.2 through 2026.1 EAP)

**Stats:**

- 12 files modified (+658 / -63 lines)
- 2 phases, 2 plans
- 1 day (2026-02-10)
- 8/8 requirements satisfied (COMPAT-01 through COMPAT-06, VERIFY-01, VERIFY-02)

**Git range:** `f756600` → `95851ad`

**What's next:** v3.6 milestone complete. All IntelliJ Platform compatibility issues resolved.

---


## v3.7 Diagnostic Quality & BBjCPL Integration (Shipped: 2026-02-20)

**Phases completed:** 53 phases, 102 plans, 18 tasks

**Key accomplishments:**
- (none recorded)

---


## v3.8 Test & Debt Cleanup (Shipped: 2026-02-20)

**Delivered:** Fixed all pre-existing test failures, re-enabled disabled parser assertions, removed confirmed dead code branches, and resolved every production FIXME and actionable TODO — leaving the test suite fully green and the codebase free of ambiguous technical debt markers.

**Phases completed:** 54-56 (7 plans total, including 1 gap closure)

**Key accomplishments:**

- Fixed 6 pre-existing test failures: updated error message assertions to use `toContain`/RegExp matching, added USE validation for files with no BbjClass nodes, documented TEST-03 as Langium grammar follower limitation
- Re-enabled 6 of 9 disabled `expectNoValidationErrors()` parser test assertions; remaining 3 documented as requiring Java classpath unavailable in EmptyFileSystem
- Removed dead MethodCall CAST branches from `bbj-type-inferer.ts` (24 lines) and `bbj-validator.ts` (41 lines) — unreachable since Phase 33 CastExpression grammar rule
- Resolved 4 production FIXMEs: linker receiver ref (intentional), scope orphaned AST (Langium lifecycle), javadoc cancellation (restored missing return), InteropService inner class (stale since #314)
- Implemented Javadoc-enriched completion items — `method.docu` populated during `resolveClass()` with signature and parsed Javadoc markdown
- Added Java connection error notification via `window/showMessage` when interop service fails to connect

**Stats:**

- 35 files modified (+2,376 / -191 lines)
- 3 phases, 7 plans (including 1 gap closure for TODO-01b)
- 1 day (2026-02-20)
- Milestone audit: 15/15 requirements, 3/3 phases, 15/15 integrations, 3/3 E2E flows
- Test suite: 501 passed, 4 skipped, 0 failures

**Git range:** `ff1c2c2` → `c71185a`

**What's next:** All test and debt cleanup targets met. Ready for next milestone.

---


## v3.9 Quick Wins (Shipped: 2026-02-21)

**Delivered:** Fixed four reported regressions, added three missing grammar verbs (EXIT, SERIAL, ADDR), and implemented four Java class reference features (.class resolution, static method completion, deprecated strikethrough, constructor completion) — enriching code intelligence for Java interop workflows.

**Phases completed:** 57-59 (8 plans total)

**Key accomplishments:**

- Stripped EM Config "--" sentinel from classpath across all 6 run command paths (VS Code + IntelliJ DWC/BUI/GUI)
- Excluded config.bbx and config.min from BBj syntax highlighting via VS Code configurationDefaults
- Fixed RELEASE token LONGER_ALT for keyword-prefixed suffixed identifiers (`releaseVersion!`, `stepMode!`)
- Added DECLARE-in-class-body grammar recovery with validator diagnostic instead of parser crash
- Added EXIT_NO_NL custom terminal for EXIT with optional numeric argument (restrictive lookahead avoids flow-control ambiguity)
- Added SerialStatement grammar rule and broadened ADDR fileid from StringLiteral to Expression
- Enriched Java backend with isStatic, isDeprecated, and constructor extraction via reflection
- Implemented .class type resolution returning java.lang.Class with synthetic scope injection
- Static method completion on USE class references via isClassRef detection and isStatic filtering
- Deprecated strikethrough via CompletionItemTag.Deprecated for methods, fields, and classes
- Constructor completion for `new ClassName(` with `(` trigger character and snippet insertText

**Stats:**

- 21 files modified (+1,494 / -29 lines)
- 3 phases, 8 plans
- 1 day (2026-02-20 → 2026-02-21)
- Milestone audit: 11/11 requirements, 3/3 phases, 16/16 integrations, 11/12 E2E flows
- Test suite: 511 passed, 4 skipped, 0 failures

**Git range:** `576b61b` → `2194616`

**Tech debt accepted:**
- IntelliJ TextMate bundle cannot exclude config.bbx by filename (platform limitation)
- FQN path static-only filtering deferred (USE alias path works; requires JAR redeployment)
- Static method return type inference gap (future work)

**What's next:** All v3.9 targets met. Ready for next milestone.

---

