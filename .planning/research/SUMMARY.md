# Project Research Summary

**Project:** BBj Language Server — BBjCPL Integration, Diagnostic Quality, Outline Resilience (v3.7 milestone)
**Domain:** Langium-based Language Server — external compiler integration, diagnostic hierarchy, outline resilience
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

This milestone adds three capabilities to the existing BBj language server: invoking BBjCPL as an external compiler and surfacing its diagnostics in-editor, reducing diagnostic noise through cascading suppression (suppress linking/semantic errors when parse errors exist), and making the document outline resilient to partial ASTs produced by Chevrotain error recovery. All three are established patterns with direct precedent in gopls, rust-analyzer, and the TypeScript language server. No new runtime npm dependencies are required — everything is implemented with Node.js 20.18.1 built-ins and Langium 4.1.3 extension points already present in the codebase.

The recommended approach is a hybrid model identical to how major language servers operate: Langium's incremental parser provides keystroke-level feedback, while BBjCPL runs asynchronously on save and provides authoritative compiler diagnostics. The two streams are distinguished by `source` tag (`"bbj"` for Langium, `"BBjCPL"` for the compiler) and merged into a single `publishDiagnostics` notification to avoid diagnostic flicker. The integration point is inside the existing `BBjDocumentBuilder.buildDocuments()` override — the same pattern already established by `addImportedBBjDocuments()` and `revalidateUseFilePathDiagnostics()`.

The highest-risk piece is the BBjCPL error output parser, because the exact stderr format is documented in BASIS docs but not confirmed with a live test run. This must be validated empirically before shipping. The second major risk is the Langium rebuild loop: if BBjCPL diagnostics are published via a mechanism that triggers Langium to rebuild, CPU hits 100%. This is prevented by merging BBjCPL output inside `buildDocuments()` before `notifyDocumentPhase()` fires, rather than publishing diagnostics from an external callback.

## Key Findings

### Recommended Stack

No new runtime dependencies are needed. The entire milestone uses `node:child_process` (built-in) for subprocess invocation, Langium 4.1.3 extension points (`DefaultDocumentValidator`, `DefaultDocumentSymbolProvider`, `ValidationOptions`), and `vscode-uri` plus `vscode-languageserver-types` already present in the project. The only technique worth adopting is using BBjCPL's `-e<errorlog>` flag to write errors to a temp file, which avoids stdout/stderr interleaving ambiguity during output capture.

**Core technologies:**
- `node:child_process` spawn — invoke BBjCPL asynchronously, built-in, streaming, AbortSignal-cancellable, no bundle cost
- Langium `DefaultDocumentValidator` (existing, subclassed as `BBjDocumentValidator`) — override `validateDocument()` to add hierarchy filtering and merge compiler diagnostics
- Langium `DefaultDocumentSymbolProvider` — override `getSymbol()` / `getChildSymbols()` with null guards for `$cstNode`; protected methods designed for override
- Langium `ValidationCategory` `'slow'` — register compiler-triggered checks under `'slow'` so they are excluded from keystroke builds
- `vscode-uri` (existing) — convert LSP URIs to platform-native `fsPath` for spawn arguments

**What NOT to use:**
- `exec()` or `execSync()`: buffers all output (overflow risk on large error lists), blocks the Node.js event loop
- `execa`: no benefit over `spawn()` + Promise wrapper for a once-per-save operation
- External debounce libraries: native `setTimeout`/`clearTimeout` is sufficient

### Expected Features

The full feature landscape is in `.planning/research/FEATURES.md`. Summary below.

**Must have (table stakes — P1):**
- BBjCPL on-save invocation — spawn `bbjcpl -N` after `textDocument/didSave`, capture output, publish as `source: "BBjCPL"` diagnostics
- BBjCPL output parser — parse line numbers from stderr, map to LSP `Diagnostic` with correct 0-based range
- Parse error noise reduction — when `document.parseResult.parserErrors.length > 0`, suppress Langium linking/semantic errors via `stopAfterParsingErrors` flag
- Outline resilience — `DocumentSymbol` computation walks partial AST without throwing when `$cstNode` is null/undefined
- Source label convention — `"BBjCPL"` vs `"bbj"` to distinguish compiler from parser diagnostics
- Configurable trigger — `bbj.compiler.trigger: "onSave" | "off"` (default `"onSave"`)
- Timeout protection — BBjCPL killed after configurable timeout (default 10s); warning diagnostic if exceeded

**Should have (competitive — P2, ship as v1.x):**
- Diagnostic hierarchy — BBjCPL errors suppress Langium parse errors for the same location; HIGH value but HIGH implementation cost
- Diagnostic deduplication — range-overlap comparison to avoid showing the same error from two sources

**Defer (v2+):**
- BBjCPL quickfix integration (error codes as code actions)
- Project-wide compilation command (`bbj/compileProject`)
- Watch mode (persistent BBjCPL process avoiding JVM startup cost)
- Debounced trigger as a third option alongside `"onSave"` and `"off"`

### Architecture Approach

The architecture follows the post-validate extension pattern already established in `BBjDocumentBuilder`: new async operations are appended after `super.buildDocuments()` completes inside the existing `buildDocuments()` override, sharing the CancellationToken and running inside Langium's `WorkspaceLock`. BBjCPL invocation is added as the final step in this chain. Diagnostic merging mutates `document.diagnostics` in place before calling `notifyDocumentPhase()`, ensuring one atomic `sendDiagnostics` carries all diagnostics and avoids flicker.

**Major components:**

1. `BBjCPLCompilerService` (new) — subprocess invocation via `spawn()`, stderr collection, output parsing, LSP Diagnostic mapping. Registered in `BBjModule.compiler.CPLCompilerService`. Independently testable.
2. `BBjDocumentValidator` (extend existing) — add `applyHierarchyFilter()` private method to suppress linking/semantic noise when parse errors exist; called from `validateDocument()` override.
3. `BBjDocumentSymbolProvider` (new, extends `DefaultDocumentSymbolProvider`) — null-safe `getSymbol()` / `getChildSymbols()` for partial AST traversal. Registered in `BBjModule.lsp.DocumentSymbolProvider`.
4. `BBjDocumentBuilder` (extend existing) — add `invokeBBjCPLAndMerge()` and `shouldRunCPL()` guard methods; wire into `buildDocuments()` as the final step after other post-validate operations.
5. `BBjDocumentUpdateHandler` (new, optional) — on-save tracking via `wasRecentlySaved(uri)` consumed-flag pattern; only needed if the `"onSave"` trigger must filter out `onChange` builds.

**Recommended build order** (from architecture research):
1. `BBjDocumentValidator` hierarchy filter — independent of CPL, ships immediately for noise-reduction benefit
2. `BBjDocumentSymbolProvider` — independent of CPL, can ship concurrently with item 1
3. `BBjCPLCompilerService` — self-contained, tested against real BBjCPL output before wiring in
4. `BBjDocumentBuilder` CPL integration — wire service after it is verified with test fixtures
5. `BBjDocumentUpdateHandler` — optional; only if on-save trigger filtering is required

### Critical Pitfalls

Full list of 10 pitfalls is in `.planning/research/PITFALLS.md`. Top 5 with prevention:

1. **Langium rebuild loop triggered by BBjCPL** — if BBjCPL diagnostics are published from an `onBuildPhase(Validated)` callback, Langium re-runs the build, which triggers BBjCPL again (CPU 100%). Prevention: merge inside `buildDocuments()` before `notifyDocumentPhase()`, never from an external callback.

2. **Orphaned BBjCPL processes on LS restart** — fire-and-forget subprocess invocations accumulate as zombies (file locks on Windows). Prevention: keep a `Map<string, AbortController>` per document URI; abort the previous controller before spawning; register `process.on('SIGTERM')` / shutdown handler cleanup.

3. **BBjCPL output format brittleness** — BBjCPL error format documented but not empirically verified; a wrong regex produces zero diagnostics silently. Prevention: test the parser against real BBjCPL stderr output before wiring in; commit output samples as test fixtures; fail gracefully (log + return `[]`) when regex does not match.

4. **Stale BBjCPL diagnostics after document edit** — BBjCPL diagnostics persist in Problems panel after the user edits (but before saving), pointing to shifted line numbers. Prevention: merge BBjCPL results into the single Langium publication cycle (mutate `document.diagnostics` + `notifyDocumentPhase`) rather than publishing via a separate `publishDiagnostics` call with a distinct source.

5. **Outline crash on null `$cstNode`** — `DefaultDocumentSymbolProvider.getSymbol()` accesses `node.$cstNode.range`; Chevrotain error recovery produces nodes with undefined `$cstNode`, causing `TypeError` and a blank Structure view. Prevention: override with null guards and wrap in try/catch. Confirmed in vscode-languageserver-node issue #1257.

## Implications for Roadmap

Research converges on a clear 4-phase implementation sequence driven by three constraints: (a) process safety must be established before diagnostic surfacing, (b) noise reduction is independent of CPL and can ship earlier, and (c) outline resilience is required before user-facing testing because BBjCPL errors guarantee partial ASTs.

### Phase 1: BBjCPL Process Foundation

**Rationale:** Subprocess safety (AbortController, URI serialization, on-save gating, Windows path handling) must be established before any diagnostic surfacing. The BBjCPL output parser must also be independently tested with real output fixtures before it is wired into the document lifecycle. Building this first means all subsequent phases inherit correct subprocess lifecycle, cancellation, and cross-platform behavior.
**Delivers:** `BBjCPLCompilerService` with spawn/abort/cleanup lifecycle; BBjCPL output parser with test fixtures from real compiler output; `shouldRunCPL()` guard method; `bbj.compiler.trigger` setting (`"onSave"` | `"off"`); timeout kill with warning diagnostic.
**Addresses:** On-save trigger, timeout protection, configurable trigger (all P1 features from FEATURES.md).
**Avoids:** Orphaned processes (Pitfall 1), concurrent invocation race (Pitfall 2), rebuild loop (Pitfall 6), Windows path failures (Pitfall 9), IntelliJ event loop blocking (Pitfall 10).

### Phase 2: Diagnostic Noise Reduction

**Rationale:** Parse error cascading suppression is an independent change to `BBjDocumentValidator` with no dependency on BBjCPL being wired in. It can ship immediately for noise-reduction benefit. Implementing it before Phase 4 establishes a clean diagnostic baseline so that adding BBjCPL results does not introduce ambiguity about what is "new noise."
**Delivers:** `applyHierarchyFilter()` in `BBjDocumentValidator`; `stopAfterParsingErrors` enforcement; clean baseline where a single parse error produces 1-3 diagnostics instead of 40+.
**Addresses:** Parse error noise reduction (P1), source label convention groundwork (P1).
**Avoids:** Cascading diagnostic noise (Pitfall 7), stale diagnostic confusion (Pitfall 3 groundwork).

### Phase 3: Outline Resilience

**Rationale:** `BBjDocumentSymbolProvider` is independent of both CPL integration and diagnostic suppression. It must ship before any user-facing testing of Phase 4 because BBjCPL errors guarantee partial ASTs — without the null guards in place, the first BBjCPL error will blank the Structure view. Shipping it as a standalone phase gives it isolated test coverage and makes the failure mode explicit before integration.
**Delivers:** `BBjDocumentSymbolProvider` with null-safe `getSymbol()` / `getChildSymbols()` traversal; registered in `BBjModule.lsp.DocumentSymbolProvider`; test asserting no exception thrown and partial symbols returned for a file with parse errors.
**Addresses:** Outline resilience (P1 table stakes from FEATURES.md).
**Avoids:** Symbol provider crash on partial AST (Pitfall 8).

### Phase 4: BBjCPL Diagnostic Integration

**Rationale:** The culminating phase, wiring the verified `BBjCPLCompilerService` (Phase 1) into `BBjDocumentBuilder.buildDocuments()` after hierarchy filter (Phase 2) and outline resilience (Phase 3) are in place. The merge pattern — mutate `document.diagnostics` + `notifyDocumentPhase()` — is already established by `revalidateUseFilePathDiagnostics()`. CPU stability must be verified with a 10-rapid-save load test before sign-off.
**Delivers:** BBjCPL diagnostics in Problems panel (`source: "BBjCPL"`); single atomic `publishDiagnostics` with merged Langium + BBjCPL results; no rebuild loop under rapid saves; IntelliJ health probe verified unaffected.
**Addresses:** BBjCPL on-save invocation (P1), BBjCPL output parsing (P1), compiler diagnostics cleared on edit.
**Avoids:** Diagnostic flicker (separate publish paths), duplicate diagnostics (Pitfall 4), rebuild loop (Pitfall 6 — verify under 10 rapid saves).

### Phase Ordering Rationale

- Phase 1 before Phase 4: subprocess safety is a prerequisite for subprocess integration.
- Phase 2 before Phase 4: clean diagnostic baseline prevents ambiguity when adding compiler output to the mix.
- Phase 3 before Phase 4: the symbol provider crash would be immediately triggered by the first BBjCPL error if not addressed first.
- Phases 2 and 3 are independent of each other and can be developed in parallel if team size allows.
- `BBjDocumentUpdateHandler` (on-save URI tracking) can be deferred to Phase 4 or treated as optional if `onChange` mode is acceptable as the initial trigger.

### Research Flags

Phases likely needing additional empirical validation during planning or implementation:

- **Phase 1 (BBjCPL output parser):** The exact BBjCPL stderr format is documented but unconfirmed empirically. Requires running `bbjcpl -N` against known-broken `.bbj` files and capturing real stderr before writing the regex. This is the single highest-risk item in the milestone. Block Phase 4 on parser having fixture-backed unit tests.
- **Phase 4 (IntelliJ timing):** LSP4IJ sends `didSave` differently from VS Code. The health probe interaction under BBjCPL load needs manual verification in IntelliJ. No code change expected, but the test must happen before calling Phase 4 complete.

Phases with standard patterns (skip additional research-phase work):

- **Phase 2 (diagnostic hierarchy filtering):** `stopAfterParsingErrors` and `DocumentValidator.ParsingError` confirmed in Langium 4.1.3 source. Override pattern mirrors existing `processLinkingErrors` override. Standard, confirmed.
- **Phase 3 (outline resilience):** `getSymbol()` and `getChildSymbols()` confirmed `protected` in Langium source. Null guard pattern confirmed in Chevrotain fault tolerance docs. Single-component change with no external dependencies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs confirmed by direct source inspection of local `node_modules/langium` (4.1.3) and Node.js 20.18.1 docs. No new dependencies introduce uncertainty. |
| Features | HIGH | Feature set validated against gopls, rust-analyzer, TypeScript LS, and LSP 3.17 spec. MVP scope is tight and well-justified against industry precedent. |
| Architecture | HIGH | Integration patterns confirmed from existing `BBjDocumentBuilder` code (`revalidateUseFilePathDiagnostics`, `notifyDocumentPhase`). DI registration confirmed from existing `bbj-module.ts`. `addDiagnosticsHandler` ordering confirmed in Langium source at `language-server.js` line 278. |
| Pitfalls | HIGH | 10 pitfalls identified. 6 confirmed by codebase analysis. 4 confirmed by community issue trackers and official docs. All have concrete prevention strategies and phase assignments. |

**Overall confidence:** HIGH

### Gaps to Address

- **BBjCPL stderr format (MEDIUM risk):** BASIS documentation confirms "all error messages contain both the BBj line number and the ASCII file line number" but exact delimiters are unspecified. The error regex must be validated empirically before Phase 4 integration. Treat parser unit tests with real BBjCPL output as a Phase 1 exit criterion — do not proceed to Phase 4 without them.

- **BBjCPL `-N` flag behavior (LOW risk):** Architecture research recommends `-N` (validate-only, no tokenized output as side effect) confirmed from `Commands.cjs` existing usage pattern. Verify the flag suppresses output file generation completely on the developer's installed BBj version before assuming it as the standard invocation.

- **Diagnostic hierarchy precedence (deferred, P2):** Full BBjCPL-over-Langium precedence (suppress Langium parse errors when BBjCPL has spoken) is explicitly deferred to v1.x. The P1 implementation shows both sources simultaneously. Deduplication and precedence logic can be designed once real BBjCPL output format is observed in Phase 1.

- **IntelliJ health probe timing (LOW risk):** The 30-second grace period in `BbjServerHealthChecker` provides buffer. Likely fine since BBjCPL runs async, but must be verified manually with BBjCPL running under IntelliJ before Phase 4 sign-off.

## Sources

### Primary (HIGH confidence — direct source inspection)

- Local: `bbj-vscode/node_modules/langium/src/lsp/document-symbol-provider.ts` — `getSymbol`, `getChildSymbols`, `createSymbol` confirmed `protected`; `$cstNode` null risk identified
- Local: `bbj-vscode/node_modules/langium/src/validation/document-validator.ts` — `ValidationOptions.stopAfterParsingErrors` at line 33; `DocumentValidator.ParsingError` constant at line 353
- Local: `bbj-vscode/node_modules/langium/src/workspace/document-builder.ts` — `updateBuildOptions` defaults to `['built-in', 'fast']` at line 145; `addDiagnosticsHandler` fires on `onDocumentPhase(Validated)`
- Local: `bbj-vscode/node_modules/langium/src/validation/validation-registry.ts` — `register()` accepts category param; `'slow'` is pre-defined
- Local: `bbj-vscode/src/language/bbj-module.ts` — DI registration patterns for `lsp.DocumentSymbolProvider` and existing providers
- Local: `bbj-vscode/src/language/bbj-document-builder.ts` — `revalidateUseFilePathDiagnostics`, `notifyDocumentPhase`, `isImportingBBjDocuments` guard patterns
- Local: `bbj-vscode/src/language/bbj-document-validator.ts` — `processLinkingErrors`, `toDiagnostic` severity override pattern
- Local: `bbj-vscode/src/Commands/CompilerOptions.ts` — BBjCPL flag definitions, `-N` validate-only flag

### Secondary (MEDIUM confidence — official documentation)

- [Node.js v20.18.1 child_process docs](https://nodejs.org/api/child_process.html) — `spawn()` API, `shell` option for Windows `.bat`, AbortSignal integration
- [BASIS BBjCPL documentation](https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm) — error format, `-e` flag, `-N` flag, both line number types in output
- [LSP 3.17 Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — `source` field definition, `publishDiagnostics` version semantics
- [Chevrotain Fault Tolerance guide](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html) — `recoveredNode` flag, re-sync recovery, how partial ASTs are produced
- [Langium Document Lifecycle docs](https://langium.org/docs/reference/document-lifecycle/) — `onBuildPhase(DocumentState.Validated)` pattern
- [gopls Diagnostics](https://go.dev/gopls/features/diagnostics) — `"compiler"` vs `"go list"` source labels, phase-gated validation pattern
- [rust-analyzer Diagnostics](https://rust-analyzer.github.io/book/diagnostics.html) — `"rust-analyzer"` vs `"rustc"` separation, on-save trigger default

### Tertiary (LOW confidence — community reports)

- [vscode-languageserver-node issue #1257](https://github.com/microsoft/vscode-languageserver-node/issues/1257) — `TypeError: Cannot read properties of undefined (reading 'range')` in `textDocument/documentSymbol` (confirms Pitfall 8)
- [vscode-languageserver-node issue #900](https://github.com/microsoft/vscode-languageserver-node/issues/900) — orphaned subprocess after client disconnect (confirms Pitfall 1)
- [Node.js issue #7367](https://github.com/nodejs/node/issues/7367) — spawn fails on Windows with spaces in command string (confirms Pitfall 9)
- [Node.js issue #46569](https://github.com/nodejs/node/issues/46569) — zombie process generation with unref'd child processes

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
