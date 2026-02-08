# Project Research Summary

**Project:** BBj Language Server Output Cleanup and Debug Logging (v3.3)
**Domain:** Language Server Development — Langium 4.1.3 LSP Enhancement
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

The BBj Language Server v3.3 milestone adds debug logging controls and diagnostic filtering to an existing Langium 4.1.3 language server. Research reveals that **no new dependencies are required** — the existing `vscode-languageserver` 9.0.1 provides built-in logging via `connection.console` with standard log levels, and diagnostic filtering leverages Langium's existing `DocumentValidator` and `DocumentBuilder` extension points. The recommended approach uses a lightweight logger singleton (60 lines) wrapping `console.*` calls with level-based filtering, controlled via LSP `initializationOptions` settings, avoiding heavyweight frameworks (Pino, Winston) that add unnecessary bundle size and complexity for diagnostic output.

Key risks center on **suppression scope creep** — developers adding blanket filtering that hides real errors, particularly parser failures in synthetic files and Chevrotain grammar ambiguity warnings. The mitigation is strict separation: (1) never suppress `console.error()` or parser diagnostics regardless of debug flag state, (2) filter diagnostics by severity/code not file type, and (3) use existing `shouldValidate()` checks which already skip validation for synthetic documents. The existing codebase already prevents validation of `JavaSyntheticDocUri` and external documents, so the synthetic file filtering requirement is **already satisfied** — verification needed, not implementation.

The architecture leverages Langium's dependency injection for service configuration but uses a singleton logger to avoid threading log state through 10+ services before settings arrive asynchronously via `onInitialize`. This is an acceptable trade-off because logging is diagnostic infrastructure, not business logic, and the singleton allows immediate logging from `main.ts` and `bbj-module.ts` before the DI container is fully configured. Settings flow through existing `BBjWorkspaceManager.onInitialize()` patterns already used for classpath, PREFIX, and type resolution warnings.

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing stack provides all necessary capabilities:

**Core technologies:**
- **vscode-languageserver 9.0.1** (existing) — Provides `connection.console.{log,info,warn,error}` for LSP logging via `window/logMessage` protocol notifications, with client-side log level filtering via `[langId].trace.server` setting
- **Langium DocumentValidator 4.1.3** (existing) — Already extended in `bbj-document-validator.ts` with custom `processLinkingErrors` and `toDiagnostic` methods; validation filtering can be added via `validateDocument` override
- **Node.js console methods** (built-in) — For development/fallback logging before LSP connection established
- **Lightweight logger wrapper** (new, 60 lines) — Simple module-level singleton with `LogLevel` enum and level-based filtering, zero runtime overhead when disabled

**What NOT to add:**
- **Pino/Winston/Bunyan** — Adds 200KB-1MB+ bundle size for features LSP already provides; justified only for high-volume production services with structured log requirements
- **Custom log level enums** — LSP already defines MessageType (Error=1, Warning=2, Info=3, Log=4)
- **Environment variable log control** — Language servers receive settings via LSP protocol, not env vars

**Configuration mechanism:** Extend existing `workspace/configuration` pattern used for Java interop settings and compiler options with `bbj.diagnostics.showSyntheticFiles`, `bbj.debug.enabled`, `bbj.debug.verboseStartup` (all boolean).

### Expected Features

**Must have (table stakes) — P1 for v3.3:**
- **Quiet startup by default** — Professional LSP implementations don't spam console with internal details; gate verbose logs behind debug flag (standard practice across rust-analyzer, typescript-server)
- **User-facing diagnostics only** — Show errors/warnings users can act on, not internal synthetic file issues
- **Log level control** — DEBUG/INFO/WARN/ERROR hierarchy with user override via settings
- **Smart javadoc error reporting** — Aggregate errors (report "N javadoc paths failed" only if ALL fail), not per-item spam

**Should have (competitive) — P2 for v3.4+:**
- **Conditional logging performance** — `if (debugEnabled)` guards prevent string formatting overhead when disabled
- **Structured logging** — JSON output for machine parsing (Pino would enable this, but not critical for v3.3)
- **LSP trace integration** — Use LSP's `$/logTrace` notification (respects client-controlled trace level)

**Defer (v2+):**
- **Per-module log levels** — Fine-grained control seems powerful but creates overwhelming config surface and maintenance burden; single debug flag with category prefixes sufficient
- **Multiple output channels** — Separate channels for java-interop, parser, etc. splits user attention and makes event correlation harder
- **Log rotation in LS** — Language server is short-lived process; client (VS Code/IntelliJ) handles persistence

**Anti-features (avoid):**
- **Log rotation in language server** — LSP servers are short-lived; client handles persistence
- **Real-time log streaming UI** — IDEs already provide this in output channels
- **Per-module granular log levels** — Config complexity outweighs benefit

### Architecture Approach

The architecture **extends existing Langium components** without new layers. Integration points:

**Major components:**

1. **Logger Singleton** (`bbj-logging.ts`, new) — Module-level wrapper with `LogLevel` enum and `setLogLevel()` function; checks current log level before calling `console.*`; rationale for singleton vs DI: Langium services created before settings arrive, logging needs to work immediately in `main.ts` and `bbj-module.ts`

2. **Settings Handler** (`bbj-ws-manager.ts`, extend) — Existing `onInitialize()` reads `initializationOptions` and configures services; add calls to `setLogLevel()` based on new settings fields; quiet startup implemented by temporarily overriding log level to ERROR until `DocumentBuilder.onBuildPhase(Validated)` fires

3. **Diagnostic Pipeline** (`bbj-document-builder.ts`, verify) — **Existing** `shouldValidate()` method already skips `JavaSyntheticDocUri` (classpath:/bbj.bbl) and external documents via `isExternalDocument()` check; add `bbjlib:/` scheme check to cover synthetic library docs; **no changes needed to validator** — filtering happens before validation runs

4. **Console Migration** (10 files, ~56 call sites) — Replace `console.log/warn/error/debug` with `logger.info/warn/error/debug`; systematic file-by-file migration starting with highest-impact files (`java-interop.ts`, `bbj-ws-manager.ts`)

**Data flow changes:**
- Settings: VS Code package.json → extension.ts initializationOptions → BBjWorkspaceManager.onInitialize → setLogLevel() → logger singleton
- Quiet startup: Start with logLevel=ERROR, restore original level after workspace validation completes
- Diagnostics: **Unchanged** — existing `shouldValidate()` already filters synthetic files

**Key architectural insight:** Synthetic file diagnostic suppression is **already implemented** via `BBjDocumentBuilder.shouldValidate()`. The milestone requirement is verification that coverage includes all synthetic URI schemes (classpath:/, bbjlib:/), not new implementation.

### Critical Pitfalls

Research identified 5 critical pitfalls with HIGH confidence based on existing codebase patterns and LSP/Langium documentation:

1. **Global Debug Flag Hiding Real Errors** — Adding debug flag to suppress `console.log` output works in production but hides real errors in development when developers "set and forget"; **avoid by**: never suppress `console.error()`, only `console.debug/log`; add environment detection (development mode ignores flag); document flag clearly

2. **Filtering Synthetic File Diagnostics Masks Parser Bugs** — Suppressing diagnostics from synthetic/library files to reduce noise hides parser crashes and grammar bugs; **avoid by**: filter by diagnostic severity/code not file type; never suppress parser/lexer errors (only semantic warnings); log suppressed diagnostics in debug mode; keep `shouldValidate()` logic (prevents validation) separate from diagnostic filtering (hides results)

3. **Configuration Hot-Reload State Desynchronization** — User changes debug flag, `onDidChangeConfiguration` fires, but cached diagnostics/settings aren't cleared causing inconsistent behavior; **avoid by**: store settings in BBjWorkspaceManager (single source of truth), invalidate ALL cached state on change, apply settings in BOTH `onInitialize` and `onDidChangeConfiguration` paths; existing pattern in main.ts lines 72-131 shows document state reset and re-validation

4. **Debug Flag Doesn't Work in IntelliJ (LSP4IJ)** — Feature works in VS Code but IntelliJ LSP4IJ uses different configuration mechanism or console output routing; **avoid by**: use LSP-standard `workspace/configuration` requests (works across all clients), test with minimal IntelliJ integration early, document IDE-specific limitations

5. **Chevrotain Ambiguity Warnings Suppressed by Blanket Filter** — Parser ambiguity warnings (emitted during grammar construction, not document validation) get suppressed by overly broad diagnostic filtering; **avoid by**: never suppress Chevrotain warnings (framework-level errors), distinguish initialization logs (before documents open) from runtime logs, preserve Chevrotain's `IGNORE_AMBIGUITIES` mechanism for intentional suppressions

**Additional technical debt to avoid:**
- Global mutable flags for debug mode (use configuration service)
- Checking debug flag on every console call in hot paths (cache flag value)
- Filtering ALL diagnostics for external files (filter by severity, not file type)
- Hard-coding quiet startup during LSP `initialize` request (violates spec)

## Implications for Roadmap

Based on research, the implementation naturally decomposes into 5 sequential phases with clear dependencies:

### Phase 1: Logger Infrastructure
**Rationale:** Foundation must exist before migrating console calls or applying settings
**Delivers:** `bbj-logging.ts` with `LogLevel` enum, `setLogLevel()`, `logger` singleton; unit tests
**Validates:** `npm run build` succeeds, logger imports correctly
**Standard pattern:** Simple wrapper (well-documented), skip research

### Phase 2: Settings Plumbing
**Rationale:** Settings must flow from VS Code to language server before logger can be configured
**Delivers:** `package.json` configuration schema, `extension.ts` initializationOptions, `bbj-ws-manager.ts` settings application, quiet startup restore in `main.ts`
**Addresses:** Table stakes feature "log level control"
**Avoids:** Pitfall #3 (hot-reload desync) by implementing BOTH init and change handlers
**Standard pattern:** LSP initializationOptions (established), skip research

### Phase 3: Console Migration
**Rationale:** Logger and settings work; now systematically replace console.* calls
**Delivers:** 56 call sites migrated across 10 files (java-interop.ts, bbj-ws-manager.ts, bbj-scope-local.ts, main.ts, etc.)
**Addresses:** Table stakes feature "quiet startup"
**Avoids:** Pitfall #1 (hiding errors) by never replacing `console.error()`, only log/debug/warn
**Migration order:** High-impact files first (java-interop, bbj-ws-manager), verify each file compiles
**Standard pattern:** Systematic refactoring, skip research

### Phase 4: Synthetic File Verification
**Rationale:** Diagnostic filtering already exists, just verify coverage
**Delivers:** Confirmation that `shouldValidate()` checks cover all synthetic URI schemes (classpath:/, bbjlib:/), test case for synthetic file diagnostics
**Addresses:** Table stakes feature "user-facing diagnostics only"
**Avoids:** Pitfall #2 (masking parser bugs) by verifying only `shouldValidate()` is used (prevents validation), not diagnostic filtering (which would hide parser errors)
**Expected outcome:** **No code changes needed** — existing filtering sufficient
**Standard pattern:** Verification task, skip research

### Phase 5: Ambiguous Alternatives Investigation
**Rationale:** Separate from general debug logging; addresses parser-level warnings
**Delivers:** Investigation of Chevrotain ambiguity warnings, decision to suppress via `IGNORE_AMBIGUITIES` or fix grammar, optional setting `bbj.parser.showAmbiguities`
**Addresses:** Current console message "Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details."
**Avoids:** Pitfall #5 (suppressing Chevrotain warnings) by collecting and summarizing ambiguities, showing details on demand
**Needs research:** MAYBE — if grammar changes required, research Langium 4.x grammar patterns and Chevrotain lookahead strategies
**Complexity:** MEDIUM — requires grammar analysis and potentially grammar refactoring

### Phase Ordering Rationale

**Sequential dependencies:**
- Phase 1 → Phase 2 → Phase 3: Logger must exist before settings can configure it, settings must work before migration starts
- Phase 3 → Phase 4: Console migration should complete before verifying diagnostic behavior (cleaner test output)
- Phase 5 independent but after Phase 1: Uses same logger infrastructure but addresses separate concern (parser ambiguities vs runtime logging)

**Grouping rationale:**
- Phases 1-3 form "debug logging feature" — tightly coupled, deliver quiet startup
- Phase 4 is "diagnostic filtering verification" — already implemented, just needs confirmation
- Phase 5 is "parser diagnostics enhancement" — separable, can defer if needed

**Pitfall avoidance:**
- Phasing prevents "looks done but isn't" — each phase has clear success criteria
- Settings plumbing (Phase 2) explicitly addresses hot-reload desync (Pitfall #3)
- Console migration (Phase 3) enforces "never suppress errors" rule (Pitfall #1)
- Verification (Phase 4) prevents masking parser bugs (Pitfall #2)
- Parser investigation (Phase 5) preserves Chevrotain warnings (Pitfall #5)

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Logger):** Simple wrapper pattern, well-documented in existing LSP implementations
- **Phase 2 (Settings):** LSP initializationOptions and workspace/configuration are established patterns
- **Phase 3 (Migration):** Systematic refactoring, no new concepts
- **Phase 4 (Verification):** Code inspection and testing, not research

**Phases potentially needing deeper research:**
- **Phase 5 (Ambiguous Alternatives):** MAYBE — if grammar changes required, research Langium 4.x infix operators (new in 4.0), Chevrotain ALL(*) algorithm improvements, and grammar refactoring patterns; if suppression sufficient, no research needed

**IntelliJ integration note:** Research flagged Pitfall #4 (LSP4IJ compatibility) but this is **testing concern, not research concern**. IntelliJ uses same LSP protocol; verification happens during Phase 2 implementation, not separate research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on existing dependencies already in package.json, official vscode-languageserver-node documentation, and Langium 4.1.3 API inspection |
| Features | HIGH | Table stakes features (quiet startup, log levels) verified across rust-analyzer, typescript-server, and LSP specification |
| Architecture | HIGH | Integration points based on direct codebase analysis (main.ts, bbj-ws-manager.ts, bbj-document-builder.ts) and existing patterns |
| Pitfalls | HIGH | Five critical pitfalls identified from existing anti-patterns in codebase (global flags in bbj-validator.ts, blanket filtering in bbj-document-builder.ts) and LSP/Langium best practices |

**Overall confidence:** HIGH

### Gaps to Address

**During Phase 2 (Settings):**
- **IntelliJ LSP4IJ initializationOptions handling:** Research shows LSP4IJ uses same protocol, but exact configuration UI and settings persistence needs hands-on verification; likely in Kotlin LSP client configuration (file structure not visible in provided context)
- **Resolution:** Test with minimal IntelliJ integration during Phase 2 implementation, document any platform-specific limitations

**During Phase 5 (Ambiguous Alternatives):**
- **Chevrotain ambiguity root cause:** Current warning shows "Ambiguous Alternatives Detected" but suppresses details; need to enable full ambiguity logging, identify which grammar rules trigger it, and determine if it's solvable via grammar refactoring or requires `IGNORE_AMBIGUITIES` suppression
- **Resolution:** Defer to Phase 5 planning; may require research if grammar changes needed

**Performance profiling gap:**
- Current recommendations for debug flag checking overhead ("cache flag value per-document") based on typical language server patterns, not measured profiling
- **Resolution:** Not critical for v3.3 — logger overhead is negligible (one enum comparison); defer profiling to performance milestone if needed

**User preference validation:**
- UX recommendations assume users prefer quiet startup by default (based on rust-analyzer, typescript-server precedent), not validated with BBj LS users
- **Resolution:** Ship with quiet default, gather feedback, add setting to control if users prefer verbose startup

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `bbj-vscode/src/language/main.ts` (lines 72-131) — Existing onDidChangeConfiguration pattern with document re-validation
- `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 33-62) — Existing initializationOptions handling
- `bbj-vscode/src/language/bbj-document-builder.ts` (lines 26-40) — Existing shouldValidate() logic for synthetic files
- `bbj-vscode/src/language/bbj-validator.ts` (line 22-26) — Existing global flag anti-pattern
- `bbj-vscode/src/extension.ts` (line 544) — VS Code configuration synchronization
- `bbj-vscode/package.json` (lines 477-482) — Existing settings schema pattern

**Official documentation:**
- [LSP Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — window/logMessage, MessageType enum, workspace/configuration
- [vscode-languageserver-node GitHub](https://github.com/microsoft/vscode-languageserver-node) — RemoteConsole API, connection.console methods
- [Langium Validation Documentation](https://langium.org/docs/learn/workflow/create_validations/) — DocumentValidator extensibility
- [Langium 4.0 Release Blog](https://www.typefox.io/blog/langium-release-4.0/) — New features, breaking changes
- [Chevrotain Resolving Grammar Errors](https://chevrotain.io/docs/guide/resolving_grammar_errors.html) — Ambiguous alternatives, IGNORE_AMBIGUITIES

### Secondary (MEDIUM confidence)

**Community sources:**
- [Logging in Node.js: Top 8 Libraries](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/) — Pino/Winston comparison, use case recommendations
- [Pino Complete Guide](https://signoz.io/guides/pino-logger/) — Performance benchmarks (5-10x faster than Winston)
- [LSP4IJ GitHub Documentation](https://github.com/redhat-developer/lsp4ij) — IntelliJ LSP integration, trace level settings
- [Langium Discussion #781](https://github.com/eclipse-langium/langium/discussions/781) — Parser ambiguity resolution patterns

### Tertiary (LOW confidence)

**Inferred patterns (not explicitly documented):**
- Langium 4.1.3 specific diagnostic filtering examples — Inferred from TypeScript definitions and DefaultDocumentValidator source code
- IntelliJ plugin settings UI implementation — Kotlin files not visible in provided context, inferred from LSP4IJ documentation

---
*Research completed: 2026-02-08*
*Ready for roadmap: yes*
