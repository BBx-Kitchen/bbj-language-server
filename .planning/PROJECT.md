# BBj Language Server - IntelliJ Integration

## What This Is

An IntelliJ plugin that brings BBj language support to JetBrains IDEs by connecting to the existing Langium-based language server via LSP4IJ. This reuses 100% of the existing language server — syntax highlighting, diagnostics, code completion, and Java interop — without reimplementing any language features.

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

### Active

- [ ] IntelliJ plugin project with Gradle build and LSP4IJ dependency
- [ ] Language server process management (start/stop/restart from IntelliJ)
- [ ] java-interop process management from IntelliJ context
- [ ] Syntax highlighting in IntelliJ via TextMate grammar or LSP semantic tokens
- [ ] Diagnostics/error display in IntelliJ editor
- [ ] Code completion for BBj constructs in IntelliJ
- [ ] Java interop completion working end-to-end in IntelliJ
- [ ] BBj file type registration (.bbj, .bbl, .bbjt, .src)
- [ ] Settings UI for BBj home path and classpath configuration
- [ ] Bundled language server (compiled JS) in plugin distribution
- [ ] Node.js runtime bundling or detection strategy

### Out of Scope

- Native IntelliJ parser/lexer rewrite — LSP4IJ approach reuses existing LS
- JetBrains Marketplace publishing — this milestone targets internal alpha
- Debugging support — future milestone
- BBj project wizard/templates — future milestone
- Formatter integration — future milestone (LS already supports it, but not priority for alpha)
- Refactoring support — future milestone
- Run configurations for BBj programs — future milestone

## Context

**Existing architecture:** The language server (`bbj-vscode/src/language/main.ts`) is cleanly decoupled from VS Code. It produces a standalone bundle (`out/language/main.cjs`) with zero VS Code imports. The only VS Code-specific code is in `extension.ts` and `fs-provider.ts`, both on the extension side. This means the IntelliJ plugin can consume the exact same language server binary.

**java-interop:** Runs as a separate Java process on localhost:5008 via JSON-RPC. The language server connects to it for Java class metadata. The IntelliJ plugin needs to manage this process lifecycle — the exact strategy (plugin manages both, or LS spawns it) is TBD.

**Target users:** BBj developers using IntelliJ, primarily Community Edition. Most clients use Community, so LSP4IJ (which works with all editions) is the right approach over JetBrains' native LSP API (Ultimate-only).

**LSP4IJ:** Red Hat's library for LSP support in IntelliJ. Used by major projects (Quarkus, Liberty Tools). Supports Community Edition. Active development.

**Repo structure:** New `bbj-intellij/` directory alongside existing `bbj-vscode/` and `java-interop/`. Work happens in a feature branch to avoid polluting main. Future consideration: splitting the language server into its own package so both editors consume it as a dependency.

## Constraints

- **Community Edition**: Plugin must work with IntelliJ Community Edition (rules out JetBrains native LSP API)
- **Node.js dependency**: Language server requires Node.js runtime — must bundle or detect
- **Feature branch**: All work in a dedicated branch, not polluting main until ready
- **Existing LS unchanged**: No modifications to the language server for IntelliJ support — IntelliJ adapts to what the LS provides
- **Internal alpha**: Target is internal testing with a few BBj developers, not public release

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LSP4IJ over native JetBrains LSP | Community Edition support needed; reuses existing LS | — Pending |
| LSP4IJ over native IntelliJ plugin | Ship fast; avoid multi-month rewrite; single source of truth | — Pending |
| Same repo, new subdirectory | Keep related code together during active development; split later | — Pending |
| Feature branch workflow | Avoid polluting main while IntelliJ support matures | — Pending |
| Bundle Node.js or detect | Users shouldn't need to install Node.js separately | — Pending |

---
*Last updated: 2026-02-01 after initialization*
