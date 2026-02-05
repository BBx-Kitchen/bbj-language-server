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

### Active

**v2.2 IntelliJ Build & Release Automation:**
- [ ] Research JetBrains Marketplace versioning scheme compatibility
- [ ] IntelliJ plugin version sourced from bbj-vscode/package.json
- [ ] GitHub Actions workflow for preview releases (both extensions)
- [ ] GitHub Actions workflow for manual production releases (both extensions)
- [ ] IntelliJ .zip artifact attached to GitHub Releases
- [ ] Gradle build integrated into CI pipeline

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone

## Context

**Current state:** v2.2 milestone started 2026-02-05. Building CI/CD automation for unified IntelliJ + VS Code releases. Both extensions will share version from `bbj-vscode/package.json`. IntelliJ plugin distributed via GitHub Releases until JetBrains Marketplace access obtained.

**Tech stack:** Java 17, Gradle (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.19.0, TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded), Langium 4.1.3, Chevrotain 11.0.3, Vitest 1.6.1 with V8 coverage.

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary.

**java-interop:** Runs as a separate Java process on localhost:5008 via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. The IntelliJ plugin monitors connection health via independent TCP probes and shows status in the status bar.

**Target users:** BBj developers using IntelliJ, primarily Community Edition.

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`. Development on `langium_upgrade` branch.

**Known tech debt:**
- Structure View symbol kind differentiation (language server issue in bbj-node-kind.ts)
- EM credentials stored as plaintext in settings
- BbjCompletionFeature depends on LSPCompletionFeature API that may change across LSP4IJ versions

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

| Langium 3 → 4 upgrade (no new features) | Stay current; enable future AI/BNF features; avoid falling behind | ✓ Good — v2.0 shipped |
| Type constants .$type pattern | Langium 4 changed type constants from strings to objects | ✓ Good — all 77 errors migrated |
| LocalSymbols over PrecomputedScopes | Langium 4 API rename | ✓ Good — clean migration |
| V8 coverage over Istanbul | Native Node.js profiler, faster, better TypeScript source maps | ✓ Good — 88% baseline |
| Conservative coverage thresholds | 50% lines (actual 88%) allows flexibility while preventing regression | ✓ Good — CI quality gates |
| Research-only milestone precedent | v2.1 established that analysis milestones (no code) can ship as proper versions | ✓ Good — clean history |

---
*Last updated: 2026-02-05 after v2.2 milestone started*
