# BBj Language Server

## What This Is

A Langium-based language server for BBj that powers both the VS Code extension and the IntelliJ plugin (via LSP4IJ). Provides syntax highlighting, diagnostics, code completion, go-to-definition, signature help, Structure view, run commands (GUI/BUI/DWC), and Java class/method completions across both IDEs through a single shared language server. The IntelliJ plugin is published as `com.basis.bbj` on JetBrains Marketplace.

## Core Value

BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

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

### Active

#### Current Milestone: v3.2 Bug Fix Release

**Goal:** Fix regressions and parser bugs that produce false errors on valid BBj code.

- [ ] BBjAPI() not recognized — linker regression, kills completion
- [ ] Can't follow class from USE statement — navigation regression (#357)
- [ ] `void` falsely flagged in method signature (#356)
- [ ] `mode$` variable flagged as error in DEF FN inside class methods (#355)
- [ ] `select` statement produces false line-break errors (#295)
- [ ] `cast(BBjString[],...)` — array type in CAST not parsed (#296)
- [ ] "Bbj" → "BBj" case fix in VS Code settings labels (#315)
- [ ] Flag unresolvable file path in USE statement (#172)

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone

## Context

**Current state:** v3.2 in progress. Fixing BBjAPI() regression, parser bugs on valid BBj patterns, and navigation regression. v3.1 shipped 2026-02-07 with all PRIO 1+2 issues closed.

**Tech stack:** Java 17, Gradle (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.19.0, TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded), Langium 4.1.3, Chevrotain 11.0.3, Vitest 1.6.1 with V8 coverage.

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary.

**java-interop:** Runs as a configurable Java process (default localhost:5008, now user-configurable) via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. Both IDEs support Refresh Java Classes command. The IntelliJ plugin monitors connection health via independent TCP probes.

**Target users:** BBj developers using VS Code or IntelliJ (Community Edition supported).

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`.

**Known tech debt:**
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)
- CPU stability mitigations documented but not yet implemented (#232)
- Single-line DEF FN inside class methods not parsed correctly by validate test helper (parser/lexer issue)

## Constraints

- **Community Edition**: Plugin must work with IntelliJ Community Edition (rules out JetBrains native LSP API)
- **Node.js dependency**: Language server requires Node.js runtime — auto-downloaded if not available
- **Existing LS unchanged**: No modifications to the language server for IntelliJ support — IntelliJ adapts to what the LS provides
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

---
*Last updated: 2026-02-07 after v3.2 milestone started*
