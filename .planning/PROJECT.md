# BBj Language Server - IntelliJ Integration

## What This Is

An IntelliJ plugin that brings BBj language support to JetBrains IDEs (Community and Ultimate) by connecting to the existing Langium-based language server via LSP4IJ. Provides syntax highlighting, diagnostics, code completion, go-to-definition, signature help, Structure view, run commands (GUI/BUI/DWC), and Java class/method completions — reusing 100% of the existing language server without reimplementing any language features.

## Core Value

BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — through a single shared language server.

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

### Active

(No active milestone — planning next)

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone

## Context

**Current state:** v1.1 shipped 2026-02-02. Plugin provides full BBj language support including run commands, Structure view, and brand icons. 35 Java source classes, bundled language server (main.cjs, 1.8MB), TextMate grammars, and web.bbj runner. Tested on macOS ARM (Ultimate 2025.3.2) and Windows x64 (Community Edition). Linux code-complete but not runtime-tested.

**Tech stack:** Java 17, Gradle (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.19.0, TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded).

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary.

**java-interop:** Runs as a separate Java process on localhost:5008 via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. The IntelliJ plugin monitors connection health via independent TCP probes and shows status in the status bar.

**Target users:** BBj developers using IntelliJ, primarily Community Edition.

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`. Development on `feat_intellij` branch.

**Known tech debt:**
- Structure View symbol kind differentiation (language server issue in bbj-node-kind.ts)
- Run command output not captured in IntelliJ console tool window
- EM credentials stored as plaintext in settings

## Constraints

- **Community Edition**: Plugin must work with IntelliJ Community Edition (rules out JetBrains native LSP API)
- **Node.js dependency**: Language server requires Node.js runtime — auto-downloaded if not available
- **Existing LS unchanged**: No modifications to the language server for IntelliJ support — IntelliJ adapts to what the LS provides

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
| `untilBuild = ""` (no cap) | Forward compatibility with future IntelliJ versions | ✓ Good — fixed after 2025.3 incompatibility |
| IntelliJ _dark.svg suffix convention | Auto-selected by IntelliJ theme system | ✓ Good — zero code for theme switching |
| Project root as run working directory | Consistent across GUI/BUI/DWC modes | ✓ Good — differs from VSCode but simpler |
| Abstract BbjRunActionBase pattern | Shared auto-save, settings, error handling across 3 run modes | ✓ Good — DRY, extensible |
| web.bbj path via PluginManagerCore | Robust plugin path discovery for bundled runner | ✓ Good — works in sandbox and production |
| Single XML for Structure View | LSP4IJ handles DocumentSymbol → tree mapping | ✓ Good — 5 lines, no custom Java |
| 30-second LS grace period | Prevents disruptive restarts when switching files | ✓ Good — smooth UX |
| Platform AllIcons.Nodes for completion | Native look; Java-interop distinction via detail heuristic | ✓ Good — consistent with IntelliJ |

---
*Last updated: 2026-02-02 after v1.1 milestone completion*
