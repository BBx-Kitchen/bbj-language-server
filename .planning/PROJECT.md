# BBj Language Server

## What This Is

A Langium-based language server for BBj that powers both the VS Code extension and the IntelliJ plugin (via LSP4IJ). Provides syntax highlighting, diagnostics, code completion, go-to-definition, signature help, Structure view, run and compile commands (GUI/BUI/DWC), visual code composers (MSGBOX, addWindow/addChildWindow, CVS(), SETOPTS) with in-editor cues, and Java class/method completions across both IDEs through a single shared language server. The IntelliJ plugin is published as `com.basis.bbj` on JetBrains Marketplace.

## Core Value

BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

## Current State

**v4.3 Polish & Quality shipped 2026-09-13** (override closeout: the milestone audit reported
`tech_debt` with 25/25 requirements, 9/9 phases, complete integration and flows and no gaps;
21 open artifacts were acknowledged at close). The 23 issues on GitHub milestone #5 are fixed
in code: the configured config file is honored everywhere and hot-reloads without a manual
restart, IntelliJ refreshes Java classes without a restart and auto-detects the interop port,
every composer has a persistent cue in both IDEs with new SETOPTS-in-code and CVS()
composers, composer writes are validated and stale-safe on both hosts, the language server no
longer scales with workspace size or hangs on an unreachable interop peer, and host-side
commands behave under repeated use and with no editor focused. All of phases 84-92 are now on
`origin/main` — local `main` and `origin/main` are in sync (verified 2026-09-17) — and the
milestone #5 issues stay open until a release ships.
Phase artifacts for 84-92 are archived under `.planning/milestones/v4.3-phases/` (tracked, no
embargo).

**v4.2 IntelliJ Burn-down shipped 2026-09-06** (override closeout: all six phases verified
and 20/20 requirements closed, but no milestone-level audit was run and eight artifacts were
acknowledged as deferred). The IntelliJ plugin no longer blocks the EDT on token, login,
settings or restart paths; EM JWT handling fails closed with owner-only temp files on POSIX
and Windows; "Compile BBj File" runs bbjcpl through the shared language server's new
`bbj/compile` request; composers surface failures and refuse stale edits; the build pins
JDK 17 and a checksum-verified Gradle wrapper; and the IntelliJ JUnit suite grew from 96 to
504 tests. The v4.2 code landed on `origin/main` through the filtered pull request #651 on
2026-09-06; local `main` and `origin/main` are in sync, the preview version is 0.12.28, and
all 22 IntelliJ issues it closes are closed on GitHub. Phase artifacts for 78-83 are archived
under `.planning/milestones/v4.2-phases/` (tracked, no embargo).

**v4.1 Security Advisory Remediation shipped 2026-09-03** (override closeout). All eight
remaining high-severity advisories have their fixes merged to public `main` through
human-gated pull requests (#638-#647). Preview builds up to 0.12.27 are live on both
marketplaces. No advisory is published yet: publication is gated on a tagged release, and
the severity/CVE decisions are taken by the maintainer at that point. Phase-level artifacts
for 70-77 are archived off `main` under `.planning/milestones/v4.1-phases/` (embargoed
until publication).

<!-- Do NOT list advisory ids grouped by flaw class here, or anywhere under .planning/ on
     public main. Grouping ids by what they have in common discloses the flaw class of each
     one. See the disclosure notice in the archived v4.1 REQUIREMENTS. -->

## Current Milestone: v4.4 IntelliJ Focus

**Goal:** Close every open issue on GitHub milestone #7 — eleven behaviour fixes and ten
duplication consolidations in the IntelliJ plugin — settle the two outstanding Node.js questions,
and ship the result as release 0.16.0.

**Target features:**

- Eleven behaviour-affecting IntelliJ fixes: EDT `NullPointerException` guard on a malformed
  catalogs response (#609), composer write validation (#607), TextMate bundle temp-directory
  caching and cleanup (#613), the inert Color Scheme customization page (#621), EM login
  temp-file cleanup on a process-launch failure (#590), the java-interop health check's
  `project.isDisposed()` guard (#592), Node cache-vs-inaccessible diagnosis (#588), java-interop
  poll visibility/focus gating (#593), java-interop peer-identity confirmation (#587),
  `applyHexEdit` array length guard (#591), and EM Login action enablement (#589).
- Ten duplication and placement consolidations, none of which changes behaviour: addWindow-family
  dialog base (#630), BUI/DWC run-action base (#615), editor notification providers (#622),
  status-bar widgets and their factories (#620), shared Swing helpers (#619),
  `Configure*Intention` (#618), composer-launch actions (#616), plugin-tool-path resolution
  (#614), EM token-validation relocation out of the run-action base (#617), and the java-interop
  default port constant (#594).
- A product decision on whether an unusable configured Node.js path should fall back to the
  cached download, taken alongside #588 (same file, same diagnosis gap).
- Live Windows attestation of Node.js auto-install, closing the major-severity todo carried
  since v4.2.
- Release 0.16.0 cut and published to both marketplaces, closing GitHub milestone #7. This is the
  first real exercise of SEED-002's verify-before-publish gate.

**Deferred candidates (not v4.4):** diagnostics and completion accuracy (#522, #561/#578, #577,
#556, #527, #526, #466); the remaining IntelliJ parity items (#634, #631); onboarding and docs
(#476, #385, #595, #601, #108 follow-up); SETOPTS block discoverability UX (#666); the UAT-log
issues #659-#662; CI/dependency hygiene and v4.3's own tech debt (MILESTONES.md).

## Requirements

### Validated

- ✓ BBj grammar parsing and AST generation via Langium — existing
- ✓ Syntax validation and semantic diagnostics — existing
- ✓ Code completion for BBj keywords, functions, variables — existing
- ✓ Java class/method completion via java-interop service — existing
- ✓ Hover information and signature help — existing
- ✓ TextMate grammar for syntax highlighting (bbj.tmLanguage.json) — existing
- ✓ Language server runs as standalone Node.js process over stdio/IPC — existing
- ✓ java-interop runs as separate Java process over JSON-RPC socket — existing
- ✓ IntelliJ plugin project with Gradle build and LSP4IJ dependency — v1.0
- ✓ Language server process management (start/stop/restart from IntelliJ) — v1.0
- ✓ Syntax highlighting in IntelliJ via TextMate grammar — v1.0
- ✓ Diagnostics/error display in IntelliJ editor — v1.0
- ✓ Code completion for BBj constructs in IntelliJ — v1.0
- ✓ Java interop completion working end-to-end in IntelliJ — v1.0
- ✓ BBj file type registration (.bbj, .bbl, .bbjt, .src) — v1.0
- ✓ Settings UI for BBj home path and classpath configuration — v1.0
- ✓ Bundled language server (compiled JS) in plugin distribution — v1.0
- ✓ Node.js runtime detection with automatic download fallback — v1.0
- ✓ java-interop connection health monitoring with status bar widget — v1.0
- ✓ BBj brand icons (file, config, run actions) with light/dark themes — v1.1
- ✓ Run BBj programs as GUI/BUI/DWC from toolbar and keyboard shortcuts — v1.1
- ✓ Document outline / Structure view via LSP DocumentSymbol — v1.1
- ✓ REM comment toggling (Cmd+/ / Ctrl+/) — v1.1
- ✓ Bracket matching for (), [], {} — v1.1
- ✓ Completion popup icons with Java-interop distinction — v1.1
- ✓ 30-second LS shutdown grace period — v1.1
- ✓ Linux/ARM64 code path review — v1.1
- ✓ BBj executable resolution using java.nio.file.Files API (symbolic link handling) — v1.2
- ✓ Run toolbar visible in IntelliJ new UI via ProjectViewPopupMenu — v1.2
- ✓ Run command stderr captured in LS log window — v1.2
- ✓ Run commands work end-to-end on macOS (GUI/BUI/DWC) — v1.2
- ✓ Run commands work end-to-end on Windows (GUI/BUI/DWC) — v1.2
- ✓ Marketplace logo/icon (pluginIcon.svg with dark variant) — v1.2
- ✓ Marketplace description, vendor info, and change notes — v1.2
- ✓ MIT License and third-party NOTICES in distribution — v1.2
- ✓ Plugin verifier passes with zero compatibility errors — v1.2
- ✓ Langium upgraded from 3.2 to 4.1.3 with zero feature regressions — v2.0
- ✓ All AST type constants migrated to .$type pattern — v2.0
- ✓ PrecomputedScopes → LocalSymbols migration complete — v2.0
- ✓ Completion provider and linker API signatures updated for Langium 4 — v2.0
- ✓ Test suite passing with 88% V8 coverage — v2.0
- ✓ Human QA testing procedures documented (27-item full test, 8-item smoke test) — v2.0

- ✓ Feature gap analysis comparing BBj LS vs Dynamo Tools extension — v2.1 (research milestone)
- ✓ IntelliJ plugin version sourced from bbj-vscode/package.json — v2.2
- ✓ GitHub Actions workflow for preview releases (both extensions) — v2.2
- ✓ GitHub Actions workflow for manual production releases (both extensions) — v2.2
- ✓ IntelliJ .zip artifact attached to GitHub Releases — v2.2
- ✓ Gradle build integrated into CI pipeline — v2.2
- ✓ PR validation for IntelliJ plugin changes — v2.2
- ✓ Plugin verifier integration for release builds — v2.2

- ✓ `endif`/`swend` followed by `;rem` comment parses without error (#318) — v3.0
- ✓ Camel-case method names with embedded keywords parse as single identifiers (#316) — v3.0
- ✓ DREAD verb and DATA statement supported by grammar (#247) — v3.0
- ✓ DEF FN / FNEND inside class methods parse without error (#226) — v3.0
- ✓ Comment after colon line-continuation parses without error (#118) — v3.0
- ✓ CAST() conveys type for downstream completion (#352) — v3.0
- ✓ Super class field access via `#field!` resolved without false warning (#240) — v3.0
- ✓ Implicit getter conveys return type for completion (#241) — v3.0
- ✓ DECLARE recognized anywhere in method scope (#265) — v3.0
- ✓ USE statements with inner classes no longer crash (#314) — v3.0
- ✓ 100% CPU in multi-project workspaces investigated with ranked mitigations (#232) — v3.0
- ✓ Labels/variables/fields show distinct SymbolKind in Structure View (#353) — v3.0
- ✓ Run icons scoped to BBj file types only (#354) — v3.0
- ✓ Run icons support .bbx, .src file extensions (#340) — v3.0
- ✓ Global field `#` triggers completion of class fields (gap analysis) — v3.0
- ✓ Cyclic reference and linker error messages include source filename (#245) — v3.0
- ✓ Configurable type resolution warnings setting — v3.0
- ✓ Program variable scope — vars only visible after declaration (#4) — v3.1
- ✓ setSlot() not found by Java reflection (#180) — v3.1
- ✓ .bbx files treated as BBj programs with proper icons and run support (#340) — v3.1
- ✓ Linking error invoking method from Java super class (#85) — v3.1
- ✓ DEF FN in methods — line-break validation + parameter scoping (#226) — v3.1
- ✓ Super class #field! access resolved via inheritance (#240) — v3.1
- ✓ config.bbx and other BBj options configurable (#244) — v3.1
- ✓ Cyclic reference error includes filename and line number (#245) — v3.1
- ✓ DREAD with DIM'd array variables resolves correctly (#247) — v3.1
- ✓ EM token-based auth instead of plaintext password (#256) — v3.1
- ✓ Interop hostname and port configurable in settings (#257) — v3.1
- ✓ Cyclic inheritance detection (A extends B, B extends A) — v3.1
- ✓ False positive cyclic detection on self-referencing variables eliminated — v3.1

- ✓ BBjAPI() resolves via built-in synthetic document, independent of Java interop — v3.2
- ✓ USE statement Ctrl-click navigation to class definition via DefinitionProvider (#357) — v3.2
- ✓ `void` keyword in method signature not flagged as unresolvable class (#356) — v3.2
- ✓ `mode$` and suffixed variables in DEF FN inside class methods parse correctly (#355) — v3.2
- ✓ `select` statement with from/where/sortby clauses parses without false errors (#295) — v3.2
- ✓ `cast(BBjString[],...)` array type notation in CAST parsed via CastExpression (#296) — v3.2
- ✓ VS Code settings labels show "BBj" capitalization (#315) — v3.2
- ✓ Unresolvable file path in USE statement flagged with searched-paths error (#172) — v3.2

- ✓ Debug logging flag (`bbj.debug`) off by default, hot-reloadable without LS restart — v3.3
- ✓ Quiet startup — class resolution, classpath, javadoc scanning behind debug flag — v3.3
- ✓ All console.log/debug/warn calls migrated to logger singleton respecting debug flag — v3.3
- ✓ Smart javadoc error reporting — single summary warning only when all sources fail — v3.3
- ✓ Synthetic file diagnostics suppressed (bbjlib:/ scheme, classpath:/ scheme) — v3.3
- ✓ Chevrotain ambiguity warnings investigated (47 patterns, all safe) and moved behind debug flag — v3.3
- ✓ Debug logging setting documented in Docusaurus configuration guide — v3.3

- ✓ Field names starting with `step` (e.g. `stepXYZ!`) parse correctly in class definitions (#368) — v3.4
- ✓ `.bbl` files excluded from BBj source code file type registration (#369) — v3.4
- ✓ Decompile toolbar button removed entirely from both IDEs (#370) — v3.4
- ✓ Compile toolbar button has proper icon with file-scoped visibility (#370, #354) — v3.4
- ✓ Token-based EM authentication works end-to-end for BUI/DWC launch (#256, #359) — v3.4
- ✓ Run commands use configured config.bbx path from settings (#244) — v3.4

- ✓ Restructure docs site for dual-IDE coverage (VS Code + IntelliJ) — v3.5
- ✓ Create separate IntelliJ User Guide section (5 pages) — v3.5
- ✓ Audit all VS Code user-facing pages for accuracy against actual codebase — v3.5
- ✓ Update site-wide chrome (tagline, navbar, footer, marketplace links) — v3.5
- ✓ Remove Developer Guide from public docs site — v3.5
- ✓ Remove stale Roadmap page — v3.5
- ✓ Document EM token authentication and new settings — v3.5

- ✓ All deprecated IntelliJ Platform APIs replaced with current equivalents — v3.6
- ✓ All scheduled-for-removal IntelliJ Platform APIs replaced with current equivalents — v3.6
- ✓ Plugin verifier reports zero compatibility warnings across IntelliJ 2024.2-2026.1 — v3.6

- ✓ Diagnostic noise reduction — single syntax error produces 1-3 diagnostics instead of 40+ cascading noise — v3.7
- ✓ Configurable diagnostic suppression hierarchy (suppressCascading, maxErrors settings) — v3.7
- ✓ Structure View resilience — outline stays populated during syntax errors with deep-walk AST recovery — v3.7
- ✓ BBjCPL compiler output format discovered empirically and parser validated against real fixtures — v3.7
- ✓ BBjCPL process management — abort-on-resave, configurable timeout, ENOENT graceful degradation — v3.7
- ✓ BBjCPL diagnostics labeled "BBjCPL" with tier 3 (highest) in diagnostic hierarchy — v3.7
- ✓ BBjCPL errors suppress redundant Langium parse errors via hierarchy Rule 0 — v3.7
- ✓ Configurable compiler trigger (debounced/on-save/off) via bbj.compiler.trigger setting — v3.7
- ✓ BBjCPL integration in buildDocuments() with 500ms trailing-edge debounce — v3.7
- ✓ Graceful degradation when BBj not installed — status bar indicator, no error dialogs — v3.7
- ✓ mergeDiagnostics() — same-line: Langium message + BBjCPL source; BBjCPL-only: added directly — v3.7

- ✓ Fixed 6 pre-existing test failures (stale expectations + USE validation) — v3.8
- ✓ 6 of 9 disabled parser test assertions re-enabled and passing — v3.8
- ✓ Dead MethodCall CAST branches removed from type inferer and validator — v3.8
- ✓ 4 production FIXMEs resolved or documented as intentional — v3.8
- ✓ Javadoc-enriched completion items with method.docu population at class resolution — v3.8
- ✓ Java connection error notification via window/showMessage — v3.8

- ✓ EM Config "--" sentinel stripped from classpath in all run commands (#382) — v3.9
- ✓ config.bbx and config.min excluded from BBj syntax highlighting in VS Code (#381) — v3.9
- ✓ RELEASE-prefixed suffixed identifiers (`releaseVersion!`, `stepMode!`) parse without error (#379) — v3.9
- ✓ DECLARE in class body produces validation error instead of parser crash (#380) — v3.9
- ✓ EXIT verb accepts optional integer parameter (#376) — v3.9
- ✓ SERIAL verb recognized by parser (#375) — v3.9
- ✓ ADDR verb accepts any expression as fileid (#377) — v3.9
- ✓ `.class` property on class references resolves to java.lang.Class (#373) — v3.9
- ✓ Static method completion on class references via USE statements (#374) — v3.9
- ✓ Deprecated methods show strikethrough indicator in completion items — v3.9
- ✓ Constructor completion for `new ClassName()` expressions — v3.9
- ✓ GHSA-p5f3-9456-9pcx remediated: shell-string command construction replaced with argument arrays — v4.1 (PR #637)
- ✓ **SEC-02**: GHSA-5f22-gqrx-xr22 remediated, verified, and its fix merged — v4.1 Phase 71 (PR #639)
- ✓ **SEC-05**: GHSA-9gv3-gr6g-c4rj remediated, verified, and its fix merged — v4.1 Phase 74 (PR #642)
- ✓ **SEC-06**: GHSA-33x9-cpwv-xcv2 remediated, verified, and its fix merged — v4.1 Phase 75 (PR #643, released 0.12.24)
- ✓ **SEC-07**: GHSA-xxp5-vv2w-42q8 remediated, verified, and its fix merged — v4.1 Phase 75 (same commits as SEC-06; Phase 76 closed by Phase 75)
- ✓ **SEC-08**: GHSA-h43f-jcjr-2g4j remediated, verified, and its fix merged — v4.1 Phase 77 (PR #647, preview 0.12.27; publication awaits a tagged release)
- ✓ **SEC-01**: GHSA-89r9-2pw4-mc7f remediated, verified, and its fix merged — v4.1 Phase 70 (PR #638; verified with 2 recorded overrides)
- ✓ **SEC-03**: GHSA-c4hw-5j83-cx5h remediated, verified, and its fix merged — v4.1 Phase 72 (PR #640)
- ✓ **SEC-04**: GHSA-5vrp-fj75-pm5q remediated, verified, and its fix merged — v4.1 Phase 73 (PR #641)

- ✓ **BUILD-01**: `bbj-intellij` builds and tests on this host's JDK 25 via committed Gradle daemon-JVM criteria plus a Java 17 toolchain block and the foojay resolver (#570) — v4.2 Phase 78
- ✓ **BUILD-02**: Gradle wrapper regenerated to checksum-pinned 8.14.5 with publisher-verified JAR, Dependabot gradle stanza, and an enumerated transitive tree (#503, #576) — v4.2 Phase 78
- ✓ **BUILD-03**: `./gradlew buildPlugin`/`build` fail fast with a directed message when `bbj-vscode/out/language/main.cjs` is missing or empty (#517) — v4.2 Phase 78
- ✓ **EDT-01**: Run As BUI/DWC and EM login assert off-EDT at runtime on top of the v4.1 CR-02 pooled dispatch, locked by a source guard (#506) — v4.2 Phase 79
- ✓ **EDT-02**: Settings-dialog keystrokes never touch the filesystem or spawn a subprocess on the EDT; per-field `KeystrokeDebouncer` with staleness discard and EDT refusal (#541) — v4.2 Phase 79
- ✓ **EDT-03**: Missing-Node notification resolves `node --version` through a stat-keyed `BbjNodeVersionCache`, one spawn per unchanged path (#543) — v4.2 Phase 79
- ✓ **EDT-04**: First-crash restart delay scheduled on a pooled-thread Alarm; zero `Thread.sleep` in `BbjServerService` (#513) — v4.2 Phase 79
- ✓ **EDT-05**: All eight restart triggers funnel through `requestRestart(long)` over a synchronized coalescing `RestartGate` (#539) — v4.2 Phase 79
- ✓ **EDT-06**: In-memory atomic `DownloadGuard` replaces the persisted download flag; two concurrent requests start one download (#537) — v4.2 Phase 79
- ✓ **TOKEN-01**: EM login classifies the JWT once through a three-valued `JwtValidity.check` and fails closed on malformed or expired tokens before anything reaches PasswordSafe (#535) — v4.2 Phase 80
- ✓ **TOKEN-02**: `createOwnerOnlyFile` yields a POSIX 0600 file, a Windows single-owner-ACE file, or a fail-closed `IOException` — no default-permission fallback; the owner ACE covers the extended-attribute bits Windows folds into a file open (#536) — v4.2 Phase 80 (Windows write-through and `icacls` check attested by hand 2026-09-05)
- ✓ **TOKEN-03**: One WARNING balloon per distinct non-keychain PasswordSafe backend via `BackendNoticePolicy`, reset on return to the keychain, with an "Open Password Settings" action (#552) — v4.2 Phase 80
- ✓ **TOKEN-04**: `TokenValidationCache` memoizes server-side token validation for five minutes keyed on the token digest; `storeToken`/`deleteToken` invalidate; BUI/DWC share one `validateTokenTrusted` entry point (#542) — v4.2 Phase 80
- ✓ **PARITY-01**: "Compile BBj File" sends `bbj/compile` to the shared language server, which runs bbjcpl through `BBjCPLService`; success or `line:col message` diagnostics render in an IntelliJ balloon, with no bbjcpl invocation logic duplicated on the IntelliJ side (#571) — v4.2 Phase 81
- ✓ **PARITY-02**: Brackets inside string literals (including `""`-doubled quotes) and `rem` comments are inert for matching, navigation and auto-close; `BbjStringCommentScanner` emits STRING/COMMENT tokens ahead of the word lexer (#568) — v4.2 Phase 81
- ✓ **PARITY-03**: Ctrl+/ recognizes `rem`, `Rem` and `REM` (word-bounded) and strips the prefix instead of stacking one; `RemToggleSeam` behind a `SelfManagingCommenter`, locale-independent (#540) — v4.2 Phase 81
- ✓ **COMP-01**: Every composer `CompletableFuture` chain (launcher and each dialog's refresh) terminates in one `ComposerFlow` handler that renders exactly one reason-keyed `ComposerNotices` balloon; a hung request is bounded (30 s launch, 10 s refresh), OK is disabled while the preview is unavailable, and one balloon per dialog session (#538) — v4.2 Phase 82
- ✓ **COMP-02**: `StaleEditGuard` re-decodes the captured line against the live document and re-checks the modification stamp inside the write command; on any mismatch the edit aborts with a warning balloon and a "Reopen composer" action instead of rewriting the range, for all three composers (#567); the three composer intentions ship `intentionDescriptions/` resources and an `Html` preview so the lightbulb popup no longer throws (#433) — v4.2 Phase 82
- ✓ **BUILD-04**: The Node download/extract/cache pipeline runs under plain JUnit 5 through the injected `NodeInstallPipeline` seam against four committed fixture archives on both platform branches (symlink-safe cleanup fixed), and the Phase 79 EDT paths gain their missing failure-path and banner-decision coverage (`BbjSettingsLookups` failure result, `NodeAvailability` seam); `./gradlew test` runs them green (#569) — v4.2 Phase 83
- ✓ **BUILD-05**: Every LSP4IJ `@ApiStatus.Experimental` coupling point plus the `bbj/compile` surface is fenced by reflective signature canaries with class-file marker assertions, an eleven-file symbol-level import allowlist, override-site source guards, a cross-language `bbj/*` request-name contract test, composer DTO round trips and a version-pin test (#544; closes #554) — v4.2 Phase 83
- ✓ **CFG-01**: The configured config file, of any name and location, is honored by PREFIX and project-wide USE resolution, run and compile commands and the SETOPTS composer, through one shared `resolveConfigPath()` pushed to both hosts over `bbj/resolvedConfigPath` (#485) — v4.3 Phase 84
- ✓ **CFG-02**: The configured config file gets config-file treatment regardless of filename — VS Code re-applies the `bbx-config` language on open, server push and setting change; IntelliJ gives it its own `BBx Config` file type through a `FileTypeOverrider` (#485) — v4.3 Phase 84
- ✓ **CFG-03**: A change to the resolved config file's consumed content reloads the language server through a debounced, quiescence-gated push and one coalescing restart per host with a non-blocking status signal; SETOPTS-only writes never restart it (#486) — v4.3 Phase 85
- ✓ **CFG-04**: Refresh Java Classes on IntelliJ completes without taking diagnostics, completion, hover or Structure View offline; a deliberate restart (Settings Apply, manual restart, config-reload, refresh fallback) is classified separately from a genuine crash, and overlapping stop/start cycles are structurally prevented (#632) — v4.3 Phase 86
- ✓ **CFG-05**: java-interop port is auto-detected for every reader of settings, not only the Settings dialog; an explicitly confirmed port 5008 is never silently overwritten by auto-detection (#608) — v4.3 Phase 86
- ✓ **DISC-04**: User editing config.bbx in IntelliJ gets a visual SETOPTS composer equivalent to VS Code's existing one, served by a shared `bbj/composer/setopts/*` command layer that both IDEs use (#633) — v4.3 Phase 87
- ✓ **DISC-05**: Hovering a `SETOPTS` literal or an OPTS-derived `IOR`/`AND` line in BBj code shows which options it sets or clears (#475, decode tier) — v4.3 Phase 88
- ✓ **DISC-06**: Tri-state Set/Clear/Leave composer generates a SETOPTS read-modify-write block and edits the two statically safe shapes in place (#475, composer tiers) — v4.3 Phase 88
- ✓ **DISC-01**: Persistent, clickable composer cue on every MSGBOX, addWindow, addChildWindow, CVS and SETOPTS line in both IDEs, served as a bounded `textDocument/codeLens` gated at `DocumentState.Parsed` and rendered by LSP4IJ Code Vision in IntelliJ (#650) — v4.3 Phase 89
- ✓ **DISC-02**: MSGBOX composer offered for expression-valued options; a constant sum pre-fills it, any other expression opens compose-and-replace with a banner (#648) — v4.3 Phase 89
- ✓ **DISC-03**: Visual CVS() composer in both IDEs (bits 1-128 in ascending order, version-gated `chars`), edit-in-place for literal-mask calls, and completion of an unfinished `CVS(` call without nesting (#649) — v4.3 Phase 89
- ✓ **DISC-07**: Malformed free text in addWindow/addChildWindow composer fields is rejected before insert, with `valid` carried in the shared preview payload so both IDEs gate the same way (#623) — v4.3 Phase 90
- ✓ **DISC-08**: Edits made during the MSGBOX QuickPick wizard never corrupt unrelated text — the target call is re-resolved span-exact before the edit and the edit aborts on mismatch; an unfinished `MSGBOX(` completes in place without nesting (#532) — v4.3 Phase 90
- ✓ **DISC-09**: Opening and closing any VS Code composer repeatedly leaks no message-handler listeners (#530) — v4.3 Phase 90
- ✓ **DISC-10**: Typing in an IntelliJ composer dialog produces one preview round trip per settle point (#611) — v4.3 Phase 90
- ✓ **DISC-11**: Reopening an IntelliJ composer reuses the cached server proxy and catalogs; the cache clears on any language-server status change (#612) — v4.3 Phase 90
- ✓ **RESP-01**: `::file::Class` scope lookups and PREFIX symbol collection no longer scale with total workspace size — a path-keyed class index and linker-mirrored member-body pruning, pinned by work counters and a loose timing ratio on a synthetic 10-vs-250-file workspace (#505) — v4.3 Phase 91
- ✓ **RESP-02**: With java-interop unreachable, validation waits about one connect timeout in total and shows one popup per outage; a request-driven half-open probe recovers without `clearCache()`, reloading the classpath and implicit imports before one document re-check (#504) — v4.3 Phase 91
- ✓ **RESP-03**: A class evicted from the resolved-class LRU during its own cyclic resolution resolves to itself with no 30-second stall or stub; the in-flight registry drains after success, timeout, cancellation and `clearCache()` (#497) — v4.3 Phase 91
- ✓ **RESP-04**: Concurrent completion requests on different documents each honor their own cancellation token, and a cancelled request never rejects the shared per-prefix class lookup (#498) — v4.3 Phase 91
- ✓ **RESP-05**: Decompile deletes the leftover `<input>.lst` before bbjlst runs, so a fresh listing is accepted on coarse-mtime filesystems without any mtime comparison; an undeletable leftover fails closed and a `.lst` input is never deleted (#500) — v4.3 Phase 92
- ✓ **RESP-06**: A format request reuses an in-flight formatter run only when its document text is identical; different content spawns its own run, and an older run settling never evicts a newer entry (#499) — v4.3 Phase 92
- ✓ **RESP-07**: Run, Run BUI/DWC, Compile, Decompile and Denumber resolve their target argument-first through a vscode-free `target-resolution.ts`; with no runnable BBj editor they show one shared "No active BBj file" warning, and BUI/DWC warn before any EM credential prompt (#512) — v4.3 Phase 92
- ✓ **RESP-08**: Every `activate()` registration — 14 commands, the formatting provider and three notification handlers — is pushed onto `context.subscriptions`, so a second activation in the same host re-registers without `already exists` (#531) — v4.3 Phase 92
- ✓ **RESP-09**: IntelliJ's BBj and Java status-bar widgets follow editor selection changes and show only when a selected file's resolved file type is `BBj`, hiding for `BBx Config` and non-BBj tabs on the click itself (#610) — v4.3 Phase 92

### Active

Defined for milestone v4.4 in `.planning/REQUIREMENTS.md` — the 21 open issues on GitHub
milestone #7, the Node.js cached-download fallback decision, the live Windows attestation, and
the 0.16.0 release. v4.3's 25 requirements shipped and are listed under Validated above
(archive: `.planning/milestones/v4.3-REQUIREMENTS.md`).

Carried over, maintainer-owned (not GSD phases):
- [ ] Tagged release carrying all nine merged advisory fixes, followed by advisory publication (PROC-03) — v4.4's 0.16.0 release is the candidate
- [ ] Phase 70 guardrail-breadth hardening (`WINDOWS.md` entry 1)
- ✓ Land the local-only v4.3 commits on `origin/main` — done; local `main` and `origin/main` in sync (verified 2026-09-17)

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone
- BBjCPL static type checking (-t flag) — requires prefix/config setup; deferred to future milestone
- BBjCPL pipe mode (stdin) — reduced JVM startup overhead; deferred to future milestone
- BBjCPL diagnostic range correlation — mapping line errors to exact token ranges; deferred to future milestone
- Decode-and-edit for every SETOPTS-in-code shape — the effective options vector is a runtime value; only the two statically safe shapes can be edited soundly (v4.3, #475)
- General expression evaluation for MSGBOX/CVS options — would preview variables and method calls wrongly; only constant sums are decoded, anything else composes-and-replaces (v4.3)
- A native IntelliJ `LineMarkerProvider` per composer — the plugin has no BBj PSI; composer cues come from the language server (v4.3)

## Context

**Current state:** v4.3 Polish & Quality shipped 2026-09-13 (Phases 84-92, 70 plans, 25/25 requirements); 20 milestones shipped. Phases 84-91 are on `origin/main`; Phase 92 and the late validation/security docs (31 commits) are on local `main` only. Whole-suite vitest green at `numFailedTests: 0` (1,873 passed, 29 skipped); IntelliJ JUnit suite 865 tests (504 at v4.3 start). v4.3 changed 232 files outside `.planning/` (+32,201 / −1,149). All nine known advisory fixes merged; publication awaits a tagged release. Next milestone not yet defined.

**Tech stack:** Java 17, Gradle 8.14.5 (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.21.0 (Gradle pin; the runtime plugin is unpinned in `plugin.xml`), TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded), Langium ~4.3.1 (langium-cli ~4.3.0), Chevrotain ~12.0.0, TypeScript ^5.8.3, esbuild ^0.28.1, Vitest ^4.1.10 with V8 coverage (pins read from `bbj-vscode/package.json` on 2026-09-06; the earlier 4.1.3/11.0.3/1.6.1 figures were stale).

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary. BBjCPL compiler integration lives in `bbj-document-builder.ts` with lazy service resolution and availability detection via `bbj-notifications.ts`.

**java-interop:** Runs as a configurable Java process (default localhost:5008, now user-configurable) via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. Both IDEs support Refresh Java Classes command. The IntelliJ plugin monitors connection health via independent TCP probes.

**Target users:** BBj developers using VS Code or IntelliJ (Community Edition supported).

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`.

**Known tech debt:**
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- CPU stability mitigations documented but not yet implemented (#232)
- CPL-06 hierarchy suppression takes one extra build cycle after BBjCPL merge (timing nuance, end state correct)
- TEST-03 (DEF FN completion inside class methods) skipped — Langium grammar follower limitation
- 3 parser.test.ts assertions DISABLED — require Java classpath unavailable in EmptyFileSystem test environment
- IntelliJ TextMate bundle cannot exclude config.bbx by filename (platform limitation)
- FQN path static-only filtering deferred — USE alias path works; MemberCall isClassRef requires JAR redeployment
- Static method return type inference gap — String.valueOf(2) does not assign type to target variable
- v4.3 audit tech debt: planning identifiers in 21 source/test files, accepted review risks (86-05 WR-01/WR-02, AR-88-12), duplicated SETOPTS initial-selection logic, `document-formatter.ts` import-time listeners, the `.lst` denumber input path — listed in MILESTONES.md

## Constraints

- **Community Edition**: Plugin must work with IntelliJ Community Edition (rules out JetBrains native LSP API)
- **Node.js dependency**: Language server requires Node.js runtime — auto-downloaded if not available
- **Shared LS is the single authority**: features both IDEs need are added as host-neutral language-server requests (`bbj/compile`, `bbj/composer/*`, `bbj/resolvedConfigPath`, `bbj/refreshJavaClasses`), never reimplemented on the IntelliJ side
- **Langium 4 new features deferred**: BNF syntax, AI features, etc. deferred to future milestones (v2.0 was clean upgrade only)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LSP4IJ over native JetBrains LSP | Community Edition support needed; reuses existing LS | ✓ Good — works on both CE and Ultimate |
| LSP4IJ over native IntelliJ plugin | Ship fast; avoid multi-month rewrite; single source of truth | ✓ Good — shipped in 1 day |
| Same repo, new subdirectory | Keep related code together during active development; split later | ✓ Good — shared TextMate grammars and LS bundle |
| Feature branch workflow | Avoid polluting main while IntelliJ support matures | ✓ Good — main unchanged |
| 4-step Node.js resolution | settings > detect > cached download > PATH fallback | ✓ Good — zero-install experience on Windows tested |
| TextMate grammar reuse | Single source of truth; no IntelliJ lexer maintenance | ✓ Good — instant highlighting without server |
| Application-level settings | Global config, not per-project | ✓ Good — matches BBj installation pattern |
| Independent TCP health check for java-interop | Don't rely on LS reporting java-interop status | ✓ Good — clear status bar with grace period |
| stdio transport for LS | Simpler than TCP; LSP4IJ handles it natively | ✓ Good — reliable process management |
| IntelliJ _dark.svg suffix convention | Auto-selected by IntelliJ theme system | ✓ Good — zero code for theme switching |
| Project root as run working directory | Consistent across GUI/BUI/DWC modes | ✓ Good — differs from VSCode but simpler |
| Abstract BbjRunActionBase pattern | Shared auto-save, settings, error handling across 3 run modes | ✓ Good — DRY, extensible |
| web.bbj path via PluginManagerCore | Robust plugin path discovery for bundled runner | ✓ Good — works in sandbox and production |
| Single XML for Structure View | LSP4IJ handles DocumentSymbol → tree mapping | ✓ Good — 5 lines, no custom Java |
| 30-second LS grace period | Prevents disruptive restarts when switching files | ✓ Good — smooth UX |
| Platform AllIcons.Nodes for completion | Native look; Java-interop distinction via detail heuristic | ✓ Good — consistent with IntelliJ |
| java.nio.file.Files API for executable resolution | JDK-4956115 symbolic link handling | ✓ Good — fixed "not found" bug |
| LS log window only (no notification balloons) | Centralized error output for run commands | ✓ Good — clean UX |
| Gate run actions on LS started status | Prevents IDE lockup when LS stopped | ✓ Good — prevents bad state |
| Eager BBj Home auto-detection in getState() | Zero-config experience without visiting settings | ✓ Good — works on first run |
| Process launch off EDT to pooled thread | Prevents UI freezing during process startup | ✓ Good — responsive UI |
| ProjectViewPopupMenu instead of MainToolBar | MainToolBar hidden in IntelliJ new UI (2024.2+) | ✓ Good — reliable access |
| Plugin ID `com.basis.bbj` (no 'intellij') | Marketplace naming rules prohibit 'intellij' keyword | ✓ Good — compliant |
| `recommended()` for plugin verifier | Auto-aligns with sinceBuild/untilBuild range | ✓ Good — no version mismatches |
| Only claim features with implementation evidence | Ensures honest marketplace listing | ✓ Good — all 9 features verified |

| LONGER_ALT for keyword/identifier disambiguation | Chevrotain tokenizer splits camel-case names; LONGER_ALT on all keywords fixes it | ✓ Good — v3.0 shipped |
| CAST with unresolvable type returns undefined | Treats as untyped rather than error; warning severity for diagnostics | ✓ Good — v3.0 shipped |
| DECLARE method-scoped (not block-scoped) | Matches BBj runtime behavior; DECLARE anywhere in method applies to entire scope | ✓ Good — v3.0 shipped |
| USE statements wrapped in try/catch | Independent processing prevents single bad USE from crashing entire file analysis | ✓ Good — v3.0 shipped |
| Inner class dollar-sign fallback | Attempts `Outer$Inner` notation on resolution failure for nested Java classes | ✓ Good — v3.0 shipped |
| Module-level config for type resolution warnings | `bbj.typeResolution.warnings` defaults to true; runtime toggleable | ✓ Good — v3.0 shipped |
| basename() for error message file paths | Cleaner than workspace-relative paths; 1-based line numbers for readability | ✓ Good — v3.0 shipped |
| Langium 3 → 4 upgrade (no new features) | Stay current; enable future AI/BNF features; avoid falling behind | ✓ Good — v2.0 shipped |
| Type constants .$type pattern | Langium 4 changed type constants from strings to objects | ✓ Good — all 77 errors migrated |
| LocalSymbols over PrecomputedScopes | Langium 4 API rename | ✓ Good — clean migration |
| V8 coverage over Istanbul | Native Node.js profiler, faster, better TypeScript source maps | ✓ Good — 88% baseline |
| Conservative coverage thresholds | 50% lines (actual 88%) allows flexibility while preventing regression | ✓ Good — CI quality gates |
| Research-only milestone precedent | v2.1 established that analysis milestones (no code) can ship as proper versions | ✓ Good — clean history |
| Gradle property injection for version | `providers.gradleProperty("version")` simpler than systemProperty for CI | ✓ Good — v2.2 shipped |
| verifyPlugin only in release builds | Too slow for PR validation (downloads multiple IDE versions) | ✓ Good — correct tradeoff |
| GITHUB_TOKEN for plugin verifier | Avoids API rate limiting when resolving IDE versions | ✓ Good — reliable builds |
| Path-filtered PR validation | Triggers only when IntelliJ or shared dependencies change | ✓ Good — fast PRs |

| Hint severity for use-before-assignment | Gentle guidance without false positive noise | ✓ Good — v3.1 shipped |
| Two-pass offset-based variable scoping | Handles compound statements on same line correctly | ✓ Good — v3.1 shipped |
| DEF FN parameters scoped to DefFunction node | Visible in FN body, don't leak to enclosing scope | ✓ Good — v3.1 shipped |
| MAX_INHERITANCE_DEPTH = 20 | Safety net for infinite loops in both scope traversal and cyclic detection | ✓ Good — v3.1 shipped |
| Re-entrancy guard in BBjTypeInferer | Prevents false cyclic detection on `a! = a!.toString()` patterns | ✓ Good — v3.1 shipped |
| Dedicated cyclic inheritance validator | Langium's built-in can't detect semantic class hierarchy cycles | ✓ Good — v3.1 shipped |
| Merged .bbx into BBj language | Full BBj treatment (icon, completion, diagnostics, run commands) | ✓ Good — v3.1 shipped |
| JWT token-based EM auth via BBjAdminFactory | More secure than storing encrypted credentials; enables token expiry | ✓ Good — v3.1 shipped |
| Token as 8th param to web.bbj | Backward compatibility with existing username/password interface | ✓ Good — v3.1 shipped |
| Configurable interop host/port with hot-reload | Settings changes take effect without extension restart | ✓ Good — v3.1 shipped |

| Built-in synthetic BBjAPI via loadAdditionalDocuments | BBjAPI resolves independent of Java interop; methods from JavaClass when available | ✓ Good — v3.2 shipped |
| Override collectLocationLinks for DefinitionProvider | Preserves Langium's reference resolution pipeline while customizing navigation | ✓ Good — v3.2 shipped |
| Settings change detection guard | Track current config and skip reload when BBj-specific settings unchanged | ✓ Good — v3.2 shipped |
| voidReturn boolean instead of class reference | Avoids false "unresolvable class" errors for void methods | ✓ Good — v3.2 shipped |
| LONGER_ALT array [id, idWithSuffix] for keywords | Prevents keyword matching when identifier has suffix (mode$ vs MODE) | ✓ Good — v3.2 shipped |
| CastExpression as dedicated PrimaryExpression | Avoids ArrayElement ambiguity; CAST parsed as keyword-level construct | ✓ Good — v3.2 shipped |
| normalize(fsPath) equality for URI comparison | Cross-document URI comparison in scope, validation, and reconciliation | ✓ Good — v3.2 shipped |
| Binary <<bbj>> header detection before parsing | Prevents silent failures when loading tokenized BBj files via PREFIX | ✓ Good — v3.2 shipped |
| USE_FILE_NOT_RESOLVED_PREFIX sentinel pattern | Enables targeted diagnostic filtering without diagnostic metadata | ✓ Good — v3.2 shipped |

| Lightweight logger singleton over Pino/Winston | 60-line module-scoped singleton avoids 200KB-1MB+ bundle for features LSP already provides | ✓ Good — v3.3 shipped |
| Singleton logger over Langium DI injection | Logger needs immediate availability in main.ts before DI container fully configured | ✓ Good — v3.3 shipped |
| Regular enum over const enum for LogLevel | Compatibility with isolatedModules; better debuggability; negligible perf difference for 4 values | ✓ Good — v3.3 shipped |
| Quiet startup via temporary ERROR level override | Gate verbose output until first document validation completes; restore user's level after workspace ready | ✓ Good — v3.3 shipped |
| Lazy evaluation callbacks for logger.debug | `() => string` callbacks for JSON.stringify and array.join prevent computation when debug disabled | ✓ Good — v3.3 shipped |
| Suppress all 47 parser ambiguities (no grammar refactoring) | BBj's non-reserved keywords create inherent ambiguity that ALL(*) resolves correctly; refactoring would require language redesign | ✓ Good — v3.3 shipped |

| Generic LONGER_ALT order [idWithSuffix, id] | Ensures all keyword-prefixed identifiers with type suffixes tokenize correctly | ✓ Good — v3.4 shipped |
| Remove ? 'HIDE' from BBj scripts | BBj print statement corrupts stdout capture of JWT tokens | ✓ Good — v3.4 shipped |
| Config path as ARGV(9) to web.bbj | Backward-compatible parameter passing; empty = default config | ✓ Good — v3.4 shipped |

| IDE-neutral tagline for docs site | "Language intelligence for BBj development" avoids naming either IDE | ✓ Good — v3.5 shipped |
| Dual-IDE directory structure (/docs/vscode/ + /docs/intellij/) | Separate URL spaces for each IDE guide; autogenerated sidebar | ✓ Good — v3.5 shipped |
| Three equal hero buttons on landing page | Get Started, VS Code Marketplace, JetBrains Marketplace with equal visual weight | ✓ Good — v3.5 shipped |
| onBrokenLinks: 'throw' for strict link validation | Temporarily set to 'warn' during restructuring; restored after cleanup | ✓ Good — v3.5 shipped |
| Docusaurus links use category/page format | Required by autogenerated sidebars; discovered when strict checking enabled | ✓ Good — v3.5 shipped |
| CpuArch API for platform detection | Current IntelliJ API; SystemInfo.is64Bit/isAarch64 scheduled for removal | ✓ Good — v3.6 shipped |
| TextBrowseFolderListener constructor pattern | Replaces deprecated 4-parameter addBrowseFolderListener with title/description | ✓ Good — v3.6 shipped |
| ProcessListener interface over ProcessAdapter | ProcessAdapter is deprecated abstract class; ProcessListener has all default methods | ✓ Good — v3.6 shipped |
| customizeDefaults() over getDefaultCommonSettings() | Mutates existing object instead of creating new one; current IntelliJ API | ✓ Good — v3.6 shipped |
| FileChooserDescriptor constructor over factory methods | Factory methods deprecated; direct constructor with explicit parameters | ✓ Good — v3.6 shipped |

| DiagnosticTier enum with hierarchy rules | Extensible classification (Parse=1, Semantic=2, BBjCPL=3); rules filter by tier, not severity | ✓ Good — v3.7 shipped |
| Match linking errors by data.code not severity | toDiagnostic() downgrades non-cyclic linking errors to Warning; severity check misses them | ✓ Good — v3.7 shipped |
| Per-file suppression only | File B linking errors survive when File A has parse errors — users fix File A first | ✓ Good — v3.7 shipped |
| BBjDocumentSymbolProvider deep-walk fallback | AstUtils.streamAllContents recovers post-error symbols; 200k char threshold for large files | ✓ Good — v3.7 shipped |
| Cancel flag + proc.kill() over AbortController | AbortController sends SIGTERM to process group 0 on ENOENT — crashes vitest worker | ✓ Good — v3.7 shipped |
| CompileHandle with settle() wrapper | Prevents double-resolve when both error and close events fire on ENOENT | ✓ Good — v3.7 shipped |
| setCompilerTrigger in bbj-document-validator.ts | Avoids circular import — main.ts creates services that bbj-ws-manager.ts is part of | ✓ Good — v3.7 shipped |
| bbj-notifications.ts isolation module | Importing main.ts from bbj-document-builder.ts crashes tests (createConnection at module load) | ✓ Good — v3.7 shipped |
| BBjCPL inside buildDocuments() not onBuildPhase | onBuildPhase triggers CPU rebuild loop; buildDocuments() integrates naturally | ✓ Good — v3.7 shipped |
| 500ms trailing-edge debounce for BBjCPL | Prevents CPU spike on rapid saves; 10 saves → 1 compile after 500ms quiet | ✓ Good — v3.7 shipped |
| Lazy BBjCPL availability via fs.accessSync | Direct binary check on first trigger; compile() returns [] for both clean file and ENOENT | ✓ Good — v3.7 shipped |
| Status bar over notification balloons for BBjCPL | Non-intrusive "BBjCPL: unavailable" in status bar; no popup dialogs | ✓ Good — v3.7 shipped |

| stripSentinel helper for EM Config "--" | Silently convert sentinel to empty string in all classpath paths | ✓ Good — v3.9 shipped |
| VS Code configurationDefaults for file exclusion | Filename-level language association override without modifying extension array | ✓ Good — v3.9 shipped |
| EXIT_NO_NL restrictive lookahead [0-9(+\-] | Avoids matching flow-control keywords (else, return) in inline-if contexts | ✓ Good — v3.9 shipped |
| SerialStatement optional pair (records, recsize) | Both must appear together per BBj syntax; Mode? and Err? independent | ✓ Good — v3.9 shipped |
| Two-phase resolveClass for isStatic/deprecated | Synchronously set metadata before registering in resolvedClasses; eliminates race | ✓ Good — v3.9 shipped |
| isClassRef via SymbolRef.symbol.ref → isJavaClass | Detects USE class references for static-only completion filtering | ✓ Good — v3.9 shipped |
| StreamScopeWithPredicate for .class injection | createScopeForNodes only accepts AstNode; wrapper pattern for AstNodeDescription | ✓ Good — v3.9 shipped |
| CompletionItemTag.Deprecated only (no sort change) | Strikethrough indicator without demoting deprecated items in completion order | ✓ Good — v3.9 shipped |
| ( trigger returns empty CompletionList | Prevents slow fallthrough to default completion when constructor completion unavailable | ✓ Good — v3.9 shipped |
| DTO isDeprecated → Langium deprecated field mapping | Java naming convention differs from Langium property name; explicit mapping in java-interop.ts | ✓ Good — v3.9 shipped |

| No CVE for any remaining v4.1 advisory (standing) | User decision, 2026-08-21, taken once for all remaining advisories rather than per-advisory. Supersedes D-17 ("the CVE question is decided per advisory") for phases 72-77. **This is a deliberate departure from PROC-03's "assigned a CVE where severity warrants" clause, not a finding of compliance:** unlike phase 71 — where `no-cve` rested on a recorded severity reassessment (`high` → `medium`) — this decision carries no severity basis, and the remaining advisories' severities are unchanged and NOT reassessed by it. Phases 72-77 must not re-ask the CVE question; they record this decision and proceed. | Applied — phase 71 already executed `no-cve`; phases 72-77 pending |
| Whole-suite regression gate: project-wide `numFailedTests: 0` plus deterministic targeted-file runs, in place of a failing-suite identity delta (standing) | User decision, 2026-08-21, at the phase 71 UAT checkpoint. The whole-suite failure *count* is unstable in this environment — observed at 4, 10 and 15 for the same command — because `shouldRunBBjTests()` gates on a bare TCP connect to port 5008 and BBjServices squats on that port without speaking the interop protocol (DEBT.md item 5). Four separate phase-71 plans each propagated a request for human sign-off without it ever being answered; it is now answered once. Acceptance extends to phases 72-77. | Accepted as equivalent-in-rigor — phases 72-77 must not re-ask |
| Residual-risk wording for GHSA-5f22-gqrx-xr22 accepted as written | User decision, 2026-08-21, at the phase 71 UAT checkpoint. A code-review finding showed one paragraph of the phase's residual-risk note overstated a platform-specific claim. The behaviour in question fails closed and is not attacker-reachable, so the wording was accepted rather than patched. The finding's detail is held in the embargoed phase directory, not on `main`. | Accepted as-is — no patch applied |
| Three post-hoc code-review findings on GHSA-9gv3-gr6g-c4rj accepted as residual | User decision, 2026-08-21, at the phase 74 UAT checkpoint. The phase's code review ran *after* its residual-risk register and publication-readiness plan had already closed, so its three findings were never triaged — an ordering artifact, not a judgement that they were acceptable. All three were reviewed and consciously carried rather than fixed before publication: none contradicts the guarantee the phase established (verifier confirmed 7/7 must-haves on the shipped code), and the merged tree stays identical to what CI already observed green. One of the three narrows what the phase's PROC-02 non-vacuity evidence proves; the narrowed basis was judged sufficient and that honest scope is now recorded. The findings and their dispositions are held in the embargoed phase directory, not on `main`. | Accepted as residual — recorded in the phase's residual-risk register; a window to act remains open through the release that triggers publication |
| Phase 75 scope widened to absorb GHSA-xxp5-vv2w-42q8 (SEC-07), closing Phase 76 | Decided during Phase 75. The two advisories share one remediation surface, so a single set of commits fixes both; splitting them across phases would have produced a Phase 76 with no work of its own. Phase 76 keeps its roadmap entry annotated per-criterion, satisfied by Phase 75's evidence, and has no plans. | Applied — SEC-06 and SEC-07 both satisfied by Phase 75 (PR #643, released 0.12.24); Phase 76 closed by Phase 75 |
| EDT-threading restructuring (CR-02) shipped in 0.12.24 without live-IDE automated coverage | User decision, 2026-08-22, at the phase 75 UAT checkpoint. CR-02 is not one of SEC-06/SEC-07/PROC-01/02/03's must-haves — it was authorized separately and landed after this phase's only live IntelliJ manual QA (8/8 checks against 0.12.23). This repository has no live IntelliJ UI test coverage in CI, the same structural gap already recorded for the CLIENTENV macOS regression, so the JUnit suite and `./gradlew buildPlugin` (both green) cannot exercise the EDT/pooled-thread handoff. The restructuring was instead confirmed by hand in a running IDE at the UAT checkpoint. | Verified manually — UAT test 1 passed 2026-08-22; the underlying secret-channel security property (SEC-06/SEC-07) rests on the earlier 0.12.23 QA pass, which the gap closure left unchanged |
| Phase 77 human-attestation items closed at UAT rather than deferred | User decision, 2026-09-03, at the phase 77 UAT checkpoint. The verifier's report asked for two items to be closed by a human rather than carried: a manual-QA transcription gap (verbatim log lines and the test machine's identity, carried from 77-05 as a deferred item) and a dependency-provenance cross-check the verifier's sandbox could not re-run because of the same egress limit the phase record documents. Both were attested by the maintainer; the phase closes with 4/4 must-haves and 3 recorded overrides (PROC-01 fork waiver, public-PR landing, standing no-CVE). Detail is held in the embargoed phase directory, not on `main`. | Verified manually — UAT tests 1 and 2 passed 2026-09-03; v4.1 phases 70-77 all complete, milestone close pending a tagged release and the advisory publication decisions |
| v4.1 closed as an override closeout without a milestone-level audit | Maintainer decision, 2026-09-03. Phase 76 has no artifacts of its own (closed by Phase 75) and PROC-01/02/03 span all eight phases and cannot be satisfied before a tagged release and publication; the close rests on the eight per-phase verification reports and UAT records instead of `/gsd-audit-milestone`. PROC gaps are recorded under Known Gaps in MILESTONES.md. | Applied — v4.1 archived 2026-09-03; PROC-01/02/03 carried forward |
| v4.1 phase artifacts archived off `main` with extended embargo controls | Decided at the v4.1 close. `milestones/v4.1-phases/` added to `.git/info/exclude` and the `pre-push` hook pattern widened to `milestones/v4\.[01]`, mirroring v4.0. The per-phase decision detail earlier sessions had written into STATE.md was removed at the same time. | Applied — archived tree ignored and push-blocked until publication |
| Daemon JVM criteria file, not just a toolchain block, for the JDK pin | Gradle 8.x cannot run its daemon on Java 25 and the #570 failure is the Kotlin DSL compiler inside the daemon JVM, before build.gradle.kts is read; a committed `gradle/gradle-daemon-jvm.properties` (toolchainVersion=17, foojay download URLs, no vendor pin) steers the daemon while the toolchain block pins compile/test | ✓ Good — v4.2 Phase 78; self-heal proven by a real JDK download |
| Wrapper regenerated by `./gradlew wrapper` to 8.14.5, never hand-edited, checksums verified live against services.gradle.org | Gradle 9.x is out of scope (platform-plugin bump); the wrapper is executable code fetched before any review gate, so both the JAR and distribution hashes are compared to the publisher at execution time and `check-gradle-wrapper.mjs` keeps the CI guard | ✓ Good — v4.2 Phase 78 |
| Bundle guard scoped by task graph to packaging tasks (`buildPlugin`, `prepareSandbox`, `runIde`, `assemble`, `build`) | A plain dependency edge made `test` fail without the bundle through processResources and the platform plugin's sandbox wiring; the task-graph scope keeps `test`/`tasks`/`dependencies`/`wrapper` working while every packaging path fails fast. The `build` path was missed by the executor and closed by the phase's code review (CR-01) | ✓ Good — v4.2 Phase 78; locked by a 6-test source-guard class |
| Plain-Java `Scheduler` seam with an `AlarmScheduler` adapter, shared by the restart gate and the settings debouncer | This repo has no IntelliJ platform test harness, so Alarm-based coalescing logic is made unit-testable through a plain interface plus a deterministic `ManualScheduler` test double; one seam serves both 79-01 and 79-02 rather than two scheduling abstractions | ✓ Good — v4.2 Phase 79; `RestartGateTest` and `KeystrokeDebouncerTest` run on plain JUnit |
| Source-guard tests (whole-file text assertions) as the regression fence for wiring that only a live IDE could exercise | Off-EDT dispatch, the single restart entry point, and the download-guard ordering are properties of call-site wiring, not of any unit-testable object; text guards fail the build if a raw restart, an EDT sleep, or the persisted download flag reappears. Known limit: defeatable by a no-op refactor (79-REVIEW.md IN-01) | ✓ Good — v4.2 Phase 79; complemented by three human UAT checks in a running IDE |
| Flush the pending BBj-home lookup synchronously on Apply/OK instead of disabling Apply while a debounce is in flight | Review fix WR-03: a user clicking Apply within the ~300 ms debounce window would otherwise persist a classpath from the previous home. The flush reintroduces a small amount of EDT filesystem I/O, but only on that narrow, low-frequency path, and needs no platform plumbing | ✓ Accepted — v4.2 Phase 79; verified by hand at UAT (test 3, 2026-09-04) |
| Cross-process Node download races left unguarded | An in-JVM `DownloadGuard` cannot span two IDE processes sharing one plugins directory; a file lock is the only fix and is out of scope for v4.2 (research Pitfall 3) | Accepted residual — recorded in 79-SECURITY.md (T-79-23) |
| One three-valued `JwtValidity.check` classification replaces four independent fail-open `return false` sites | A single decode means a partial fix cannot miss a branch; classifying before `storeToken` keeps an unusable EM login result out of PasswordSafe. A decimal `exp` regex bug was caught in the red-then-green cycle | ✓ Good — v4.2 Phase 80 (#535) |
| `createOwnerOnlyFile` has exactly three outcomes: POSIX attribute, `acl:acl` attribute supplied at creation, or a fail-closed `IOException` | The default-permission fallback was deleted rather than demoted; a temp file that is not owner-only must never be created. The Windows branch cannot run in CI (ubuntu-latest only), so it is fenced by a pure ACL builder test, a strategy-selection test over synthetic view sets, and source guards, plus a human `icacls` check | ✓ Good — v4.2 Phase 80 (#536); Windows UAT first failed, then passed after the ACE widening below |
| Windows owner ACE widened by exactly `READ_NAMED_ATTRS` and `WRITE_NAMED_ATTRS` (ten permissions), not full control | UAT on Windows showed BBj denied `open(...,"O_CREATE,O_TRUNC")` with `!ERROR=18` against the plugin-created file: Windows folds `FILE_READ_EA`/`FILE_WRITE_EA` into `GENERIC_READ`/`GENERIC_WRITE` and denies the whole open when any requested bit is ungranted. Ten bits is the surgical fix; fourteen was the escalation reserved for a still-failing recheck | ✓ Good — v4.2 Phase 80 gap closure 80-05; recheck passed by hand 2026-09-05 with the rebuilt plugin |
| `resolveBackend()` is the sole PasswordSafe `ProviderType` touch point; `BackendNoticePolicy` warns once per distinct non-keychain backend and resets on keychain | Keeps the platform-coupled call in one place a source guard can fence, and prevents balloon spam while still re-warning on a downgrade after a return to the keychain | ✓ Good — v4.2 Phase 80 (#552); balloon behaviour verified by hand in a sandbox IDE |
| `TokenValidationCache` is a static `AtomicReference` memo keyed on the SHA-256 of the token bytes with a five-minute window checked on read, no timer | Two quick Runs validate at most once; the window is a UX optimisation only, since `web.bbj` still presents the token to EM on every launch, and `storeToken`/`deleteToken` invalidate unconditionally so logout clears trust | ✓ Good — v4.2 Phase 80 (#542); verified by hand (two Runs, one subprocess; logout re-validates) |
| `bbj/compile` lives on the shared language server behind a vscode-free `compiler-options.ts` table; IntelliJ passes `compilerOutputDirectory` as a flat `initializationOptions` key | No bbjcpl invocation logic may be duplicated on the IntelliJ side (#571); LSP4IJ 0.19.0 resolves `createSettings()` to null for this plugin's flat settings object, so the flat key is the only channel that reaches the server | ✓ Good — v4.2 Phase 81; compile round trip verified by hand |
| Plain-Java seams (`BbjStringCommentScanner`, `RemToggleSeam`, `CompilerInitOptions`, `CompileResultPresenter`) with explicit ASCII case comparison, never `toLowerCase`/`equalsIgnoreCase` | The module has no IntelliJ platform test harness; seams keep the logic on plain JUnit, and per-character ASCII comparison is proven locale-independent under a Turkish default locale | ✓ Good — v4.2 Phase 81; bracket inertness and REM round trip verified by hand |
| `END_OF_LINE_CHARACTER = 2147483647` shared sentinel replaces `Number.MAX_SAFE_INTEGER` at both whole-line-range sites | bbjcpl reports no column, and `Number.MAX_SAFE_INTEGER` overflowed LSP4IJ's `int` `Position.character`, so any compile response carrying a diagnostic failed to parse (`MessageIssueException`) — gap G-81-4 | ✓ Good — v4.2 Phase 81 gap closure 81-06; pinned by an LSP4J JSON boundary test |
| Diagnostic message read reflectively by name in `CompileResultPresenter`; LSP4IJ Gradle pin raised 0.19.0 → 0.21.0 | `plugin.xml` cannot pin the runtime LSP4IJ, whose bundled lsp4j 1.0.0 changed `Diagnostic.getMessage()` to return `Either`, so the 0.19.0-compiled call site hit `NoSuchMethodError` in the live IDE — gap G-81-5; one binary must render on either client-library generation | ✓ Good — v4.2 Phase 81 gap closure 81-07; live re-check 2026-09-05 rendered `16:1 Syntax error: xdd` |
| One composed `CompletableFuture` chain per composer request with a single terminal `handle()`, behind plain-Java `ComposerFlow`/`ComposerNotices` seams; the modal info dialog is deleted | Nested `thenAccept` pyramids left failures unobserved (#538); a reason-keyed notice table (never message-prose matching, mirroring Phase 81's `CompileResultPresenter`) and a `once()` wrapper give exactly one balloon per failure and per dialog session. Review fix WR-01 made the launch deadline one per chain instead of per stage | ✓ Good — v4.2 Phase 82; balloons, OK gating and rate limiting verified by hand (UAT 8/8) |
| Stale composer edits abort and notify rather than re-apply: re-decode the captured line via the same `decodeCall`, compare the whole decode field-wise, re-check the document modification stamp as the write command's first statement | Captured offsets can point at text that changed while the modal dialog was open (#567); a partial comparison or a stamp check outside the write command leaves a window. Review fix WR-03 anchored the stamp guard on the real `WriteCommandAction` call site | ✓ Good — v4.2 Phase 82; split-editor abort and "Reopen composer" verified by hand |
| Composer intentions ship `intentionDescriptions/<Class>/` resources *and* return `IntentionPreviewInfo.Html`, kept deliberately redundant; the resource test enumerates `plugin.xml` registrations | The lightbulb preview threw `PluginException: Intention Description Dir URL is null` on every computation (UAT gap G-82-6, #433/#426/#430/#473); either half alone silences it, but a future intention reverting to `EMPTY` would re-enter the fallback path, and a descriptor-driven test covers a fourth intention the moment it is registered | ✓ Good — v4.2 Phase 82 gap closure 82-04; popup and Settings › Intentions page verified by hand |
| Node install pipeline extracted into a plain-Java `NodeInstallPipeline` seam with injected `Target`/`Fetcher`/`Progress`/`CancelProbe`, driven against four committed fixture archives; fixture digests are literal pins transcribed from a provenance README, never computed at test time | The old adapter wired fetch/verify/extract/install/cleanup straight to platform statics, so no step ran under any test; a test-computed digest hashes the same bytes the verifier reads and makes verification vacuous. The seam also let the symlink-following recursive delete be fixed with a no-follow `walkFileTree` | ✓ Good — v4.2 Phase 83 (#569); Windows-branch cases pass on Linux, so the Windows auto-install failure from Phase 80 UAT is not reproducible from branch logic alone (todo filed for a live Windows check) |
| Settings-lookup failure is caught at the lookup layer (`BbjSettingsLookups` returns a failure-marked result) rather than in the debouncer, and the missing-Node banner decision moves into a plain-Java `NodeAvailability` seam | A throwing lookup previously left "Checking Node.js version…" and the disabled classpath combo stuck until the next keystroke; catching at the layer that owns the result keeps `KeystrokeDebouncer` generic and lets both banner branches execute under plain JUnit | ✓ Good — v4.2 Phase 83 (#569); a configured-but-unusable Node path deliberately never falls back to the cached download (pinned as-is, todo filed) |
| LSP4IJ coupling asserted as an inventory: constant-pool class-file reader proves `ApiStatus.Experimental` is class-file-retention-only, an eleven-file symbol-level import allowlist fences `src/main/java`, and measured facts win over the plan's wording (`ServerStatus` has 9 constants in 0.21.0; the interop icon heuristic leaves `Interface` unchanged) | A runtime `isAnnotationPresent` check on a class-file-retained annotation is provably vacuous, so the canaries read class files directly; hand-written allowlists fail on drift in either direction, and tests must pin what the jar and code actually do | ✓ Good — v4.2 Phase 83 (#544, closes #554); 504-test suite green, no production change |
| v4.2 closed as an override closeout without a milestone-level audit, with eight open artifacts acknowledged as deferred | Close taken 2026-09-06 with all six phases `passed`, 20/20 requirements checked, six hand UAT rounds and four in-phase gap closures on record; the five open debug sessions were all `diagnosed` with their fixes shipped in-phase and the three todos are follow-ups, so an audit pass was judged unlikely to change the outcome. Same shape as the v4.1 close | Applied — v4.2 archived 2026-09-06; gaps listed in MILESTONES.md |
| v4.2 phase artifacts archived on-tree (`milestones/v4.2-phases/`), not embargoed; no `v4.2` git tag | Phases 78-83 close public IntelliJ issues and contain no advisory mechanism, so the v4.0/v4.1 exclude-and-hook arrangement does not apply; repository tags are release versions (`v0.12.x`) and neither v4.0 nor v4.1 was tagged | Applied — archive tracked; tag skipped by precedent |
| v4.2 code stays on local `main` until a filtered pull request lands it | Local `main` carries the push-blocked v4.0 archive commit, so the branch cannot be pushed as-is; the v4.2 commits (256, all after `2072844`) must be cherry-picked onto a branch from `origin/main` and register-checked for advisory detail first. Landing is a human-gated, outward-facing action and was not performed at close | ✓ Done — PR #651 merged 2026-09-06; local and origin `main` in sync |
| One `resolveConfigPath()` in the language server owns config-path resolution and the home-default fallback; both hosts consume it through a `bbj/resolvedConfigPath` request plus an identically shaped push, and before the first answer act only on the explicit setting | The home default was re-derived per host and per consumer (#485), so a custom-named or custom-located config file was honored by some consumers and not others; a single resolver with sentinel neutralization, leading-tilde-only expansion, relative-path rejection and symlink/NFC canonicalization makes every `-c` argument, PREFIX read and file-type decision agree | ✓ Good — v4.3 Phase 84; both IDEs verified by hand (UAT 8/8, `ps` showed the resolved `-c` on both hosts) |
| Config-file editor treatment is decided by path identity, not filename: VS Code re-applies the `bbx-config` language on open, server push and setting change (the per-keystroke trigger was removed by review fix WR-01); IntelliJ gets its own `BBx Config` language and file type with a `FileTypeOverrider` that delegates to one cached predicate and re-parses only the two affected files | Extension-based association cannot follow a setting, and IntelliJ must never send the config file to the server as BBj source; a runtime override over a volatile cache keeps the decision off the filesystem on indexing threads, and reopen/revert survival rests on the open-document trigger | ✓ Good — v4.3 Phase 84; close/reopen, Revert File and the live file-type flip verified by hand |
| The EM Config sentinel `--` is neutralized in the resolver and refused again at every argv seam (`buildRunArgv`, `buildWebRunArgv`, `ConfigPaths.configPathArg`); BUI/DWC abort with a named notification on a blank path rather than registering an empty value with EM | Defense in depth mirroring the existing classpath guard: the resolver is the primary layer, the argv builders the second, so no run path can ever emit `-c--` or an empty registration | ✓ Good — v4.3 Phase 84; 25/25 threats closed in 84-SECURITY.md |
| Config hot-reload is decided server-side by consumed-content relevance, not by file events: a directory-scoped `fs.watch` on the resolved path, a 1000 ms trailing debounce, and a gate that fires `bbj/configReloadRequired` only when the PREFIX snapshot read through the same `extractConsumedConfigContent` as `initializeWorkspace` actually changed | A SETOPTS-only write (the composer's own output, or any editor) must never restart the server, and an atomic write-temp-then-rename must count once; comparing consumed content makes self-write suppression structural instead of a timing window, and one shared extraction function keeps the gate and the real read from drifting (#486, research Pitfalls 1-3) | ✓ Good — v4.3 Phase 85; atomic-save single reload and the SETOPTS no-restart regression both verified by hand in VS Code (UAT 7/7) |
| The reload notification is pushed only after build quiescence: a `BBjDocumentBuilder.hasPendingWork()` predicate (Langium `currentState`, the BBjCPL debounce timer and the post-`buildDocuments` tail) polled at 100 ms, bounded at 5000 ms, with one outstanding wait that a newer verdict replaces | A `.bbj` save and a config save in the same burst must never land a restart mid-validation (research Pitfall 4); a testable predicate on the builder beats a sleep inside the watcher and lets the interleaved-burst guarantee be pinned under fake timers | ✓ Good — v4.3 Phase 85; IntelliJ save-burst UAT showed one restart after diagnostics settled |
| Both hosts consume the reload through their existing coalescing restart choke point and signal it without a prompt: VS Code got a `createRestartGate` port of IntelliJ's `RestartGate` (stop/start on the existing `LanguageClient`, 500 ms window, cancellable in flight) plus a dedicated auto-hiding status-bar item; IntelliJ funnels into `BbjServerService.requestRestart(RESTART_DEBOUNCE_MS)` and surfaces the reason in the existing widget tooltip and one console line, no balloon | Two reload sources inside one window must produce one restart, `deactivate()` must never race a scheduled restart, and the signal must be glanceable, not modal; source guards fence each host so no second restart path can appear | ✓ Good — v4.3 Phase 85; 85-SECURITY.md threats_open 0, 85-VALIDATION.md nyquist-compliant |
| Refresh Java Classes issues one bounded targeted request (`bbj/refreshJavaClasses`) over the existing composer-server proxy instead of restarting the language server; a per-project single-flight guard drops concurrent invocations and success/failure/decline/timeout are each classified distinctly, never widened to a shared boolean | The prior implementation restarted the whole server for a classpath refresh, taking every language feature offline; the new request reuses the composer boundary pattern from Phase 82 and pins outcome classification with a dedicated flow test | ✓ Good — v4.3 Phase 86; QA row 16 verified by hand (UAT 8/8) |
| `BBj.properties`' `com.basis.languageServer.addr` is auto-detected via a stat-keyed cache (at most one read per observed stat change) and validated 1-65535; the explicit-port checkbox (not the numeric value) records user intent, so an explicit 5008 survives even when the properties file names a different port | Every reader of interop settings needs the same port, not only the Settings dialog, and a silent auto-detect overwrite of a user's explicit choice would be a regression; recording intent as a flag rather than inferring it from value equality makes the explicit case representable at all | ✓ Good — v4.3 Phase 86; QA row 17 verified by hand |
| A deliberate LSP4IJ restart is classified separately from a crash via a one-shot, 30s-time-boxed `ExpectedStopGuard` armed only when the server was observed live; `RestartGate` drops (never queues) a restart request landing mid-restart; `doRestart` polls a bounded 5s status barrier (not a `Future` — LSP4IJ 0.21.0's `stop(String)` returns `void`, confirmed by `javap`) before starting again | UAT gap G-86-1: rows 16+17 run together surfaced a `JsonRpcException`/`IOException: Stream closed` trace traced to two pre-existing defects — `updateStatus()` misclassifying every deliberate restart as a crash, and `doRestart()` never awaiting its own stop before starting — that together guaranteed overlapping stop/start cycles hitting an upstream LSP4IJ writer race. Queueing the dropped restart was considered and rejected: a queued follow-up could turn a future classification regression into an unbounded restart loop | ✓ Good — v4.3 Phase 86 gap closure 86-05; G-86-1 live recheck (rows 16+17 rerun together) verified clean by hand; two residual review risks (WR-01 stale-by-one-generation status field, WR-02 unguarded bounded-wait exception) accepted as-is rather than fixed |
| SETOPTS vector crosses the LSP4IJ boundary as a hex String end-to-end, never a numeric bitmask | Sidesteps the int/long 32-bit-sign-bit overflow class entirely; `bbj/composer/setopts/decodeCall`/`preview` are thin re-exposures of `setopts-catalog.ts` on the shared language server, and IntelliJ's `ComposerModels.java` DTOs carry the hex string straight through | ✓ Good — v4.3 Phase 87; contract/JSON-boundary tests pin the wire shape |
| `SetoptsComposerDialog`'s own input validation (raw-hex-tail regex, mask-char check) is its entire OK gate, routed through the existing `previewUnavailable(reason)` rather than a second disable site | `SetoptsPreview` carries no server-side validity flag, unlike `MsgboxPreview.valid`, so the dialog must own that check; reuses the same balloon/OK-gating seam Phase 82's `ComposerFlow` already established | ✓ Good — v4.3 Phase 87; CR-01 regression (rapid toggle-then-Apply) verified by hand |
| SETOPTS compose-new inserts a whole line at the caret's line start (`insertAt(..., atLineStart=true)`) while edit-in-place stays confined to the decoded hex token or bare-keyword insert point behind `StaleEditGuard` + `DecodeEquality.sameSetopts` | A composed line must never split a PREFIX or other directive line the user right-clicked; the three pre-existing composer call sites (MSGBOX/addWindow/addChildWindow) pass `atLineStart=false` and stay behaviorally unchanged | ✓ Good — v4.3 Phase 87; QA row 18 verified by hand (UAT 2/2), no server restart/reconnect observed |
| SETOPTS hovers and the tri-state composer (DISC-05/DISC-06, #475) shipped across 15 plans and 5 gap-closure rounds; every mask/hex literal the composer generates now routes through one shared `bbjHexLiteral` formatter per host, `textDocument/codeAction` is gated at `DocumentState.Linked` (hover's gate) with a 5000ms budget instead of the unbounded `DocumentState.Validated`, and VS Code gained the same `StaleEditGuard`/`DecodeEquality` contract IntelliJ already had | Live UAT retesting surfaced three real defects unit tests missed: a false-safe hover verdict on byte-range-indexed OPTS mutations (G-88-1), an IntelliJ Alt+Enter hang caused by an unrelated, unbounded LSP4IJ intention-search step (G-88-2), and a composer-generated hex literal that was valid in neither BBj program syntax (missing `$...$`) nor decodable by AND/IOR (extra quotes) (G-88-3) | ✓ Good — v4.3 Phase 88; all 3 gaps resolved, final live retest (IntelliJ reachability, live BBjServices mask-width, VS Code stale-edit-guard observation) passed 2026-09-12; filed #666 as a follow-up — the fix flow works but discovering how to create/upgrade a SETOPTS block isn't obvious in either IDE, deferred to a dedicated UX review (dovetails with Phase 89's Composer Discoverability scope) |
| Composer cues come from the shared language server as one bounded `textDocument/codeLens` (5000 ms budget, gated at `DocumentState.Parsed`, no reparse per keystroke) for all five composer kinds, rendered in IntelliJ through LSP4IJ Code Vision after a same-phase go/no-go spike; `config.bbx` is routed to the server as a text-only `bbx-config` document, superseding Phase 84's never-send invariant | One cue source keeps both IDEs identical (#650); the spike confirmed Code Vision renders and clicks through on IntelliJ 2026.2.2 with LSP4IJ 0.21.0, and routing config files to the server let the SETOPTS cue replace the VS Code client-only lens. Proving the config routing live surfaced and closed a >6 s hover hang on config documents (89-13) | ✓ Good — v4.3 Phase 89; UAT round 1 passed 3/4, round 2 passed 2/2 |
| An unfinished `CVS(` call decodes to a distinct `incomplete` outcome (still `editable: false`, so no cue appears) that both IDEs open as a "complete the call" composer through the existing single guarded CVS write, never a nested `CVS(CVS(` | UAT gap G-89-3: Alt+Enter on a half-typed call showed the not-editable notice in IntelliJ and nested a second call in VS Code; a span-exact stale check refuses a call that grew while the composer was open. The same nesting in MSGBOX compose-new was scoped out to a Phase 90 todo because it needs its own replace/banner semantics | ✓ Good — v4.3 Phase 89 gap closure 89-14..16; verified by hand in both IDEs 2026-09-12 |
| VS Code composer writes never trust the webview or a non-modal wizard: every `insert` recomputes the preview and breaks on `!valid` (addWindow/addChildWindow now carry per-field errors like MSGBOX), every MSGBOX write re-resolves its target span-exact immediately before `editor.edit`, and every panel's message subscription is tied to `panel.onDidDispose` through one `registerPanelMessageHandler` helper | #623/#532/#530: a disabled button is not an authority, a QuickPick wizard lets the user edit the document underneath it, and subscriptions registered on the extension context outlived their panels; a source-discovered lifecycle test finds panel modules by scanning for `createWebviewPanel(`, so a future composer is covered automatically | ✓ Good — v4.3 Phase 90; VS Code UAT passed by hand 2026-09-12; 24/24 threats closed in 90-SECURITY.md |
| IntelliJ composer dialogs share one debounce seam — `scheduleRefresh()` disables OK, advances the `seq` staleness counter, then triggers the 300 ms `PreviewDebouncer` — and one per-project `ComposerHandleCache` for the server proxy and catalogs, cleared by identity on any `BbjServerStatusListener` status change and on any launch failure; an unfinished `MSGBOX(` completes through the single existing guarded write, with `sameMsgbox` comparing `incomplete` | #611/#612: one preview request per keystroke and a fresh server/catalog resolution on every open; code review CR-01 found OK could re-enable from a stale pre-edit preview until `scheduleRefresh()` advanced `seq`, and identity-checked clears keep a resolution started before a restart from being served after it | ✓ Good — v4.3 Phase 90; IntelliJ UAT (debounce, field errors, reopen across Restart Language Server) passed by hand 2026-09-12; 846/846 JUnit |
| java-interop reachability is guarded by a three-state, request-driven circuit breaker in front of the one shared `connect()`: only connect-level failures trip it (never a post-connect request timeout), the closed→open transition is the only popup, a failed half-open probe backs off silently to a cap, success fires recovery listeners scheduled (never awaited) outside the resolution lock, and a `clearCache()` generation counter voids in-flight attempts; transport and cancellation stubs are never cached | #504: every unresolved class paid its own 10 s connect timeout and cached a permanent "not found". A background reconnect timer was rejected — recovery rides the next lookup, and candidate lookups answered from the local index start the probe themselves, so a caret move is enough. A reconnected peer is a fresh backend, so recovery reloads the classpath and implicit imports before one document re-check, deferred until the first workspace build | ✓ Good — v4.3 Phase 91; live stop/start of BBjServices showed one popup and self-clearing diagnostics (UAT 1/1); 21/21 threats closed in 91-SECURITY.md |
| An in-flight Phase-2 registry (plain `Map`) sits beside the bounded resolved-class LRU instead of pinning entries inside it; all three resolution fast paths consult it, and an identity-guarded `finally` drains it on every exit path | #497: eviction during a class's own cyclic resolution fell through to a refetch that stalled 30 s or degraded to a stub; a separate registry keeps the LRU's bound intact and lets `clearCache()` empty both without a late Phase 2 resurrecting a class from the old classpath | ✓ Good — v4.3 Phase 91; forced-eviction, chain-timeout, cancellation and clearCache drain tests green |
| Completion cancellation travels through `node:async_hooks` `AsyncLocalStorage` per request instead of an instance field on the singleton provider, and the shared per-prefix class lookup is created with no caller's token; `::file::Class` lookups read a path-keyed index maintained in `updateContent`/`removeContent` | #498: two concurrent requests on the singleton overwrote each other's token, and the request that created the shared memo could reject it for every waiter. #505: every `::file::Class` lookup scanned the whole index, so cost grew with the workspace; PREFIX symbol collection now prunes member bodies exactly as the linker does for external documents | ✓ Good — v4.3 Phase 91; work-counter and two-document cancellation tests green |
| Host-side commands and lifecycle decide from state they can prove: run/compile/decompile/denumber resolve argument-first through a vscode-free `target-resolution.ts` (active-editor fallback only for a runnable BBj document, one shared warning, resolved before any EM credential prompt); decompile deletes the leftover `<input>.lst` before bbjlst instead of comparing mtimes; format requests share an in-flight run only for identical text; every `activate()` registration is pushed onto `context.subscriptions`; IntelliJ's status-bar widgets decide visibility from the resolved file-type name on `FILE_EDITOR_MANAGER` selection changes | #512/#500/#499/#531/#610: `Commands.cjs` is CommonJS and cannot load under Vitest, so each decision moved into a pure module fenced by source guards; delete-then-wait makes freshness provable on coarse-mtime filesystems with no timestamp; a content-blind in-flight memo applied a stale run's output over interim edits; undisposed commands threw `already exists` on re-activation; file-type names rather than extensions keep `config.bbx` and custom-named config files hidden | ✓ Good — v4.3 Phase 92; IntelliJ tab-switch UAT passed 1/1 by hand 2026-09-13; 17/17 threats closed in 92-SECURITY.md; 92-VALIDATION.md nyquist-compliant (8 rows, 0 gaps) |
| v4.3 closed as an override closeout after a milestone-level audit, with 21 open artifacts acknowledged | Close taken 2026-09-13. Unlike v4.1 and v4.2, `/gsd-audit-milestone` ran: status `tech_debt` with 25/25 requirements, 9/9 phases, 9/9 integration points, 7/7 flows and no gaps. The only open items were six debug sessions left at `diagnosed` after their gaps closed in phases 86/88/89 and 15 quick tasks from earlier milestones, so they were acknowledged rather than resolved | Applied — v4.3 archived 2026-09-13; tech debt listed in MILESTONES.md |
| v4.3 phase artifacts archived on-tree (`milestones/v4.3-phases/`); no `v4.3` git tag; quick tasks not archived | Phases 84-92 close public issues and carry no advisory detail, so they are tracked like v4.2; repository tags stay release versions (`v0.12.x`), following the v4.2 precedent; the 16 `.planning/quick/` directories all predate v4.3 and would be misfiled under it | Applied — archive tracked; tag and quick-task archival skipped |
| The six IntelliJ composer dialogs, their intentions, their launch actions and their Swing helpers collapse to one shared shape each (`ComposerSwingHelpers`, `ComposerIntentionBase`, `BbjComposeActionBase`, `AddWindowFamilyComposerDialogBase`); every write path bounds language-server-supplied ranges and line numbers before entering a write command, and OK is gated on the server's own `valid` verdict with the duplicated client-side hex rule deleted rather than kept in sync | #619/#623/#607/#611: the duplicated shapes had already silently diverged — the Java hex rule no longer matched the server's, which carried no length bound — and unguarded `int[]`/`int` payloads threw `ArrayIndexOutOfBoundsException`/`IndexOutOfBoundsException` on the EDT; a hardcoded `new Color(0xC0392B)` was unreadable in Darcula. A second launcher-side validation gate was deliberately rejected: it would need a server round trip on or near the EDT inside a write command, or the very Java duplication this phase deletes | ✓ Good — v4.4 Phase 93; 9 plans, 983 JUnit green; UAT 4/4 passed by hand 2026-09-18 (six composer kinds × three entry points, theme-aware error colour in Light and Darcula, raw-hex validation, addWindow-family parity); 31/31 threats closed in 93-SECURITY.md with 3 documented accepted risks |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-18 after Phase 93*
