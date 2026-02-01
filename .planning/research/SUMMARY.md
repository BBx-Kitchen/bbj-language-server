# Project Research Summary

**Project:** BBj Language Server - IntelliJ Integration
**Domain:** Language tooling - IntelliJ LSP plugin development
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

This project adds IntelliJ IDEA support to the existing BBj Language Server by building a thin integration layer using LSP4IJ, an IntelliJ Community Edition-compatible LSP client library. The approach reuses 100% of the existing Langium-based language server (TypeScript/Node.js) and java-interop service (Java) without modification, focusing purely on IntelliJ integration.

The recommended architecture is straightforward: a Gradle-based IntelliJ plugin that manages two external processes (language server + java-interop), bundles the compiled language server artifacts, and leverages LSP4IJ for all LSP protocol translation. The plugin uses TextMate grammars for syntax highlighting and relies on LSP4IJ to map LSP capabilities (diagnostics, completion, hover, etc.) to native IntelliJ UI components. The critical technical challenge is robust process lifecycle management—ensuring java-interop starts before the language server, handling crashes gracefully, and cleaning up zombie processes on shutdown.

Key risks center on process management complexity and LSP4IJ compatibility. The most likely failure modes are: silent process crashes leaving users with broken features, zombie processes consuming ports and preventing restarts, and race conditions during initialization. These are entirely preventable with proper health monitoring, shutdown hooks, and startup sequencing. The technology stack is proven (LSP4IJ is production-ready, used by Red Hat's Quarkus and Liberty plugins), and the feature scope is well-defined—alpha needs only syntax highlighting, diagnostics, completion, and Java interop. This is achievable within 2-3 weeks for a competent IntelliJ plugin developer.

## Key Findings

### Recommended Stack

The IntelliJ plugin uses modern IntelliJ development tooling with LSP4IJ as the integration layer, completely sidestepping the need for custom parsers or lexers by delegating language understanding to the existing language server.

**Core technologies:**
- **Gradle 8.5+ with gradle-intellij-plugin 2.0.0**: Industry-standard build system for IntelliJ plugins, handles IDE sandbox, packaging, and plugin verification automatically
- **LSP4IJ 0.8.0+**: Red Hat's Community Edition-compatible LSP client library that maps LSP protocol to IntelliJ APIs, production-proven in multiple JetBrains Marketplace plugins
- **Java 17+ (Java 21 LTS recommended)**: IntelliJ Platform 2024.x runtime requirement, also needed for spawning java-interop service
- **TextMate grammar support**: Reuse existing `bbj.tmLanguage.json` from VS Code extension via IntelliJ Platform's built-in TextMate bundle support for fast syntax highlighting
- **Node.js 18+ runtime management**: Required for language server, either bundled with plugin (zero-config UX, larger download) or detected from system PATH (lighter plugin, user dependency)

**Critical dependency note**: Plugin must bundle language server artifacts (`out/language/main.cjs`) and java-interop JAR, making this a multi-project build with orchestration requirements.

### Expected Features

IntelliJ users expect feature parity with VS Code while the plugin maintains a clear minimum viable feature set for alpha focused on core editing capabilities.

**Must have (table stakes):**
- **Syntax highlighting** (TextMate grammar) — uncolored code feels broken, users abandon immediately
- **Error diagnostics** (red squiggles) — real-time feedback is fundamental to IDE experience
- **Code completion** (keywords, functions, variables) — productivity baseline, must work or adoption fails
- **Go to definition** (Ctrl+Click navigation) — core navigation, expected in any modern IDE
- **File type registration** (.bbj, .bbl, .bbjt, .src) — without this IntelliJ treats files as plaintext

**Should have (competitive differentiators):**
- **Java interop completion** — the killer feature unique to BBj, autocomplete for Java classes/methods via java-interop service
- **Signature help** (parameter hints) — not essential but significantly improves UX for complex function calls
- **Hover information** (quick documentation) — inline docs improve learning curve for BBj APIs and Java classes
- **Semantic tokens** (accurate highlighting) — more precise than TextMate regex patterns, differentiates symbols by semantic role
- **Document symbols** (structure view) — helpful for navigating large files, low effort to enable

**Defer (v2+):**
- **Workspace symbols** (project-wide search) — requires indexing, performance concerns for large projects
- **Rename refactoring** — works via LSP but IntelliJ UX not as polished as native refactorings
- **Code formatting** — valuable for teams but individuals can work without it
- **Code actions/quick fixes** — requires server-side implementation work, not critical for alpha
- **Debugging** and **run configurations** — explicitly marked as future milestones, out of scope for alpha

### Architecture Approach

The architecture follows a clean three-layer design: IntelliJ plugin layer (file types, settings, process management), LSP4IJ adapter layer (protocol translation), and external processes (language server + java-interop). This separation of concerns allows complete reuse of existing language server logic.

**Major components:**
1. **Plugin Layer (Java/Kotlin)** — IntelliJ-specific integration including file type registration, TextMate grammar provider, settings UI for BBj home path/classpath, and most critically the `LanguageServerDefinition` that spawns and monitors both external processes
2. **LSP4IJ Adapter (framework dependency)** — Handles all LSP protocol concerns: JSON-RPC over stdio, document synchronization, capability negotiation, request/response routing, and mapping LSP primitives (completion items, diagnostics, hovers) to IntelliJ UI components
3. **Language Server Process (Node.js)** — Existing `bbj-vscode/out/language/main.cjs` bundled with plugin, spawned via stdio transport, provides all LSP capabilities (diagnostics, completion, hover, semantic tokens) unchanged from VS Code
4. **java-interop Process (Java)** — Existing service listening on localhost:5008, provides Java reflection metadata for BBj's Java interop feature, must start before language server to avoid connection failures

**Critical architectural constraint**: Startup sequencing is mandatory—java-interop must be running and accepting connections before the language server launches, or Java completions fail silently. The plugin owns both process lifecycles and must implement graceful shutdown to prevent zombie processes.

### Critical Pitfalls

Process management dominates the risk profile. Most issues stem from inadequate lifecycle handling, not LSP protocol concerns.

1. **Language server crashes silently** — Users see features stop working mid-session with no error messages. **Prevention**: Implement process health monitoring with auto-restart (max 3 attempts with exponential backoff), surface crash notifications via IntelliJ balloon UI, add "Restart Language Server" action to Tools menu.

2. **Zombie processes on shutdown** — Language server and java-interop outlive IntelliJ, leaving port 5008 occupied and preventing subsequent starts. **Prevention**: Register shutdown hooks in plugin's `dispose()` method, destroy process trees including descendants, enforce 5-second graceful shutdown timeout then force kill, test extensively.

3. **java-interop connection failures** — Language server expects java-interop on localhost:5008 but it's not ready yet or failed to start. **Prevention**: Start java-interop FIRST, poll port 5008 until accepting connections (max 10s), then start language server with confidence dependency is satisfied, monitor both processes independently.

4. **Race conditions on startup** — IntelliJ opens BBj files before language server finishes LSP initialization handshake, causing "server not initialized" errors. **Prevention**: Queue LSP requests until language server sends `initialized` notification, show progress indicator during startup, add 30-second timeout with user-facing error.

5. **Configuration not reaching language server** — User sets BBj home path in IntelliJ settings but language server never receives it, breaking java-interop classpath. **Prevention**: Send `workspace/didChangeConfiguration` notification on settings change, include settings in initialization params, trigger language server restart on configuration changes.

## Implications for Roadmap

Based on research, the roadmap should follow an incremental path from static file support to full dynamic language server integration, with java-interop as the final integration challenge.

### Phase 0: Project Setup & Validation
**Rationale:** Must validate critical assumptions before building features—especially LSP4IJ compatibility and stdio transport
**Delivers:** Gradle project skeleton, LSP4IJ dependency configured, stdio transport validated
**Addresses:** Validates against pitfall #1 (IPC vs stdio mismatch), confirms Community Edition compatibility
**Research needed:** NO — straightforward setup, LSP4IJ documentation sufficient

### Phase 1: File Type & Syntax Highlighting
**Rationale:** Establish IntelliJ's recognition of BBj files with basic visual feedback before introducing process complexity
**Delivers:** `.bbj`/`.bbl`/`.bbjt`/`.src` files recognized, TextMate grammar syntax highlighting works, file icons appear
**Addresses:** Table stakes features (file registration, syntax highlighting), lowest-risk starting point
**Avoids:** Jumping straight to process management, allows testing IntelliJ infrastructure first
**Research needed:** NO — standard IntelliJ file type API, TextMate support well-documented

### Phase 2: Settings UI
**Rationale:** Users need to configure BBj home path before java-interop can function; settings infrastructure needed for later phases
**Delivers:** IntelliJ Settings panel with BBj home path field, classpath entries, settings persistence
**Addresses:** Prerequisite for java-interop, prevents configuration pitfalls
**Uses:** IntelliJ `PersistentStateComponent` and `Configurable` APIs
**Research needed:** NO — standard settings pattern, examples abundant

### Phase 3: Language Server Integration (No java-interop)
**Rationale:** Prove LSP communication works before adding java-interop complexity; delivers immediate value with diagnostics and completion
**Delivers:** Language server process management, LSP features work (diagnostics, hover, completion for BBj symbols), Node.js detection
**Addresses:** Most table stakes features except Java interop
**Avoids:** Pitfalls #1, #2, #4 (process crashes, zombie processes, startup races)
**Implements:** Plugin layer `LanguageServerDefinition`, process lifecycle, health monitoring
**Research needed:** MAYBE — Process management on Windows may need platform-specific research if issues arise

### Phase 4: java-interop Integration
**Rationale:** Unlocks the killer feature (Java completions); builds on stable LS foundation from Phase 3
**Delivers:** java-interop process startup, full Java class/method completions, type checking with Java interop
**Addresses:** Competitive differentiator (Java interop completion)
**Avoids:** Pitfall #3 (java-interop connection failures), Pitfall #5 (configuration not propagating)
**Implements:** Two-process startup sequencing, port readiness checks, BBj classpath configuration
**Research needed:** NO — Architecture well-defined, existing java-interop service unchanged

### Phase 5: Robustness & Error Handling
**Rationale:** Alpha release quality requires graceful degradation and actionable error messages
**Delivers:** Process restart mechanisms, user-facing error notifications, settings validation, diagnostic logging
**Addresses:** All critical pitfalls with production-ready recovery strategies
**Avoids:** Silent failures (pitfall #6), cascading failures from java-interop crashes
**Research needed:** NO — Standard error handling patterns

### Phase 6: Enhanced Features (Optional for Alpha)
**Rationale:** Nice-to-have features that improve UX but aren't blockers; consider based on schedule
**Delivers:** Semantic tokens (enhanced highlighting), signature help, document symbols, find references
**Addresses:** Competitive features from FEATURES.md P2 priority
**Uses:** Existing LSP server capabilities, LSP4IJ mapping
**Research needed:** NO — LSP4IJ handles these, just enabling server capabilities

### Phase Ordering Rationale

- **Incremental risk**: Start with static file types (zero risk), add process management (moderate risk), then multi-process coordination (highest risk)
- **Dependency-driven**: Settings must exist before java-interop, java-interop must work before Java completions
- **Fast feedback**: TextMate syntax highlighting in Phase 1 provides immediate visible progress
- **Value delivery**: Phase 3 delivers 80% of user value (all LSP features except Java interop), making java-interop integration (Phase 4) additive rather than blocking
- **Pitfall mitigation**: Phases 0-2 are low-complexity foundations that derisk Phases 3-5 where most pitfalls lurk

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Language Server Integration):** Process management on Windows may differ from macOS/Linux (path separators, executable permissions, process lifecycle APIs)—test early or research if Windows-specific issues surface

Phases with standard patterns (skip research-phase):
- **Phase 0:** Gradle IntelliJ plugin setup is well-documented
- **Phase 1:** File type registration and TextMate grammars are standard IntelliJ Platform APIs
- **Phase 2:** Settings UI follows established IntelliJ patterns
- **Phase 4:** java-interop architecture already proven in VS Code extension
- **Phase 5:** Error handling patterns apply universally
- **Phase 6:** LSP4IJ documentation covers enhanced features

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | LSP4IJ is production-proven (Quarkus, Liberty), Gradle+IntelliJ plugin is industry standard, all technologies verified against official docs |
| Features | HIGH | Feature set derived from LSP protocol spec + existing language server capabilities, alpha scope clearly defined with table stakes vs nice-to-have distinction |
| Architecture | HIGH | Three-layer pattern is established practice for LSP plugins, reuses 100% of existing language server with zero changes, critical dependency (java-interop before LS) understood |
| Pitfalls | HIGH | Process lifecycle pitfalls are well-known in Java/IntelliJ plugin development, prevention strategies validated against LSP4IJ examples and IntelliJ Platform docs |

**Overall confidence:** HIGH

### Gaps to Address

While research confidence is high, these areas need validation during implementation:

- **TextMate grammar compatibility**: IntelliJ's TextMate support differs subtly from VS Code's—test `bbj.tmLanguage.json` in IntelliJ early (Phase 1 spike) to confirm compatibility or plan fallback to LSP semantic tokens
- **Node.js bundling decision**: Deferred to implementation—start with system Node.js detection for alpha simplicity, evaluate bundling for beta based on user feedback and plugin size constraints
- **Cross-platform process management**: While Java's `ProcessBuilder` is platform-agnostic, test on Windows early to catch path separator or executable permission issues before they block progress
- **LSP4IJ version compatibility**: LSP4IJ 0.8.0 is latest as of research date, but verify no breaking changes if newer versions release during development—monitor LSP4IJ GitHub releases

## Sources

### Primary (HIGH confidence)
- **LSP4IJ GitHub repository** (https://github.com/redhat-developer/lsp4ij) — API documentation, extension points, process management examples
- **IntelliJ Platform SDK** (https://plugins.jetbrains.com/docs/intellij/) — File type registration, settings API, plugin lifecycle, TextMate support
- **Gradle IntelliJ Plugin documentation** (https://plugins.gradle.org/plugin/org.jetbrains.intellij) — Build configuration, plugin packaging, sandbox testing
- **Language Server Protocol Specification** (https://microsoft.github.io/language-server-protocol/) — LSP capabilities, protocol semantics
- **Existing BBj codebase** (`bbj-vscode/src/language/main.ts`, `java-interop` source) — Verified capabilities, transport mechanisms, process contracts

### Secondary (MEDIUM confidence)
- **LSP4IJ example plugins** (Quarkus Tools, Liberty Tools, COBOL Language Support on JetBrains Marketplace) — Production patterns for process management, settings UI, LSP feature mapping
- **IntelliJ plugin development forums** (JetBrains Platform Slack, Stack Overflow) — Community practices for process lifecycle, zombie process prevention, cross-platform compatibility

### Tertiary (LOW confidence)
- **Node.js bundling approaches** — Gradle Node plugin exists but bundling strategy needs validation against plugin size constraints and code signing requirements (macOS Gatekeeper, Windows SmartScreen)

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
