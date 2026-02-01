# BBj Language Server - IntelliJ Integration

## What This Is

An IntelliJ plugin that brings BBj language support to JetBrains IDEs (Community and Ultimate) by connecting to the existing Langium-based language server via LSP4IJ. Provides syntax highlighting, diagnostics, code completion, go-to-definition, hover, signature help, and Java class/method completions — reusing 100% of the existing language server without reimplementing any language features.

## Core Value

BBj developers using IntelliJ get the same language intelligence they have in VS Code — syntax highlighting, error diagnostics, code completion, and Java class/method completions — through a single shared language server.

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

### Active

#### v1.1 — Polish, Icons, Run Commands & Fixes

- [ ] Harvest VSCode brand icons (file, config, run) and adapt for IntelliJ light/dark conventions
- [ ] Run BBj program as GUI (spawn bbj executable with current file)
- [ ] Run BBj program as BUI (web runner with bundled web.bbj)
- [ ] Run BBj program as DWC (web runner with bundled web.bbj)
- [ ] Run command toolbar buttons, menu actions, and keyboard shortcuts
- [ ] Document outline / Structure view via LSP DocumentSymbol
- [ ] Comment toggling with REM keyword
- [ ] Bracket/keyword matching
- [ ] Fix "LSP Symbol ..." popup text cosmetic issue
- [ ] Fix LS shutdown delay on last file close
- [ ] Wire BbjCompletionFeature custom icons into completion pipeline
- [ ] Clean up stale bbj-intellij/META-INF/plugin.xml
- [ ] Linux code path review

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Refactoring support (rename across files) — future milestone
- Run configurations for BBj programs — moved to v1.1 (run actions, not full run configs)

## Context

**Current state:** v1.0 internal alpha shipped 2026-02-01. v1.1 in progress — adding run commands, brand icons, structure view, and fixing carried-forward issues. Plugin is a 671KB ZIP containing a JAR with 35 Java source classes, bundled language server (main.cjs, 1.8MB), and TextMate grammars. Tested on macOS ARM (Ultimate 2025.3.2) and Windows x64 (Community Edition). Linux code-complete but not runtime-tested.

**Tech stack:** Java 17, Gradle (Kotlin DSL), IntelliJ Platform SDK 2024.2+, LSP4IJ 0.19.0, TextMate grammar, Node.js v20.18.1 LTS (auto-downloaded).

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The IntelliJ plugin consumes the exact same language server binary.

**java-interop:** Runs as a separate Java process on localhost:5008 via JSON-RPC, hosted by BBjServices. The language server connects to it for Java class metadata. The IntelliJ plugin monitors connection health via independent TCP probes and shows status in the status bar.

**Target users:** BBj developers using IntelliJ, primarily Community Edition.

**Repo structure:** `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`. Development on `feat_intellij` branch.

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

## Current Milestone: v1.1 Polish & Run Commands

**Goal:** Bring IntelliJ plugin to feature parity with VSCode for icons and run commands, fix all known v1.0 issues, and restore structure view.

**Target features:**
- Brand icons harvested from VSCode extension (file types, run buttons, plugin icon)
- Run GUI / BUI / DWC commands with toolbar buttons and keyboard shortcuts
- Document outline / Structure view working via LSP DocumentSymbol
- All 7 carried-forward issues resolved

---
*Last updated: 2026-02-01 after v1.1 milestone start*
