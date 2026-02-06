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

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone

## Context

**Current state:** v3.0 shipped and audited 2026-02-06. 7 milestones shipped (v1.0-v3.0), 27 phases, 54+ plans executed. Fixed false errors on common BBj patterns, resolved crashes, improved type resolution for completion, investigated CPU stability, and polished IDE features. Both extensions share version from `bbj-vscode/package.json`. Next milestone TBD.

**Tech stack:** Java 17, Gradle (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.19.0, TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded), Langium 4.1.3, Chevrotain 11.0.3, Vitest 1.6.1 with V8 coverage.

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary.

**java-interop:** Runs as a separate Java process on localhost:5008 via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. The IntelliJ plugin monitors connection health via independent TCP probes and shows status in the status bar.

**Target users:** BBj developers using IntelliJ, primarily Community Edition.

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`. Development on `langium_upgrade` branch.

**Known tech debt:**
- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions
- BBjAPI case-insensitive test requires test module indexing fix (workaround: skipped)

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

---
*Last updated: 2026-02-06 after v3.0 milestone archived*
