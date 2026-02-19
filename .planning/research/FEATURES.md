# Feature Research

**Domain:** Compiler-integrated language server — diagnostic quality, external compiler integration, outline resilience
**Researched:** 2026-02-19
**Confidence:** HIGH (sourced from gopls official docs, LSP 3.17 spec, langium internals, rust-analyzer docs, BBjCPL official docs)

---

## Milestone Scope

This file covers only **new features** for v3.7: BBjCPL compiler integration, diagnostic hierarchy/noise reduction, and outline resilience. Existing features (Langium parser validation, document symbols, logger, cascading suppression for synthetic files, Chevrotain ambiguity handling) are already shipped and not re-scoped here.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of compiler-integrated language servers (TypeScript, rust-analyzer, gopls) take for granted. Missing them makes the tool feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Authoritative compiler errors surfaced in-editor** | TypeScript/gopls users never leave the editor to check compiler output. Diagnostics from the real compiler carry the most trust. | MEDIUM | BBjCPL invoked as child process; stdout/stderr captured and parsed. BBjCPL error messages contain both BBj line number and ASCII line number — need to map to the latter for LSP ranges. |
| **Compiler errors clear when parser errors resolve** | Users expect the editor to not show stale compiler results once source is clean. gopls clears prior diagnostics on each new analysis pass. | LOW | Tracked per-document; clear BBjCPL diagnostics from prior invocation before publishing new ones. |
| **Diagnostic source label distinguishes compiler from parser** | gopls uses `"compiler"` vs `"go list"`; rust-analyzer uses `"rust-analyzer"` vs `"rustc"`. Users need to know who is reporting what. LSP 3.17 spec explicitly cites `source` as "e.g. 'typescript' or 'super lint'". | LOW | Langium's `DefaultDocumentValidator.getSource()` returns `this.metadata.languageId` = `"bbj"`. BBjCPL diagnostics should use source `"BBjCPL"`. Langium parser/linking diagnostics keep `"bbj"`. |
| **On-save trigger for external compilation** | All major LS implementations trigger expensive external operations on-save, not on every keystroke. `textDocument/didSave` is the standard hook. | LOW | Register `connection.onDidSaveTextDocument` handler. Default behavior users expect: compile on save, see results immediately. |
| **Cascading diagnostics suppressed when parser has errors** | When a missing `(` produces 15 downstream errors, users expect the LS to show only the root cause. This is the stated pain point. Rust-analyzer and TypeScript both suppress semantic/linking errors when parser errors exist. | MEDIUM | Already have `BBjDocumentValidator` with per-phase stop flags (`stopAfterParsingErrors`, `stopAfterLinkingErrors`). The `ValidationOptions` interface already declares these; they need to be wired and enforced in the validation pipeline. |
| **Outline/Structure View survives syntax errors in individual methods** | TypeScript outline persists with syntax errors — the tree shows what the parser could recover. Users report frustration when the entire outline vanishes for a single typo. | MEDIUM | Langium's Chevrotain parser does error recovery and produces a partial AST. The fix is ensuring DocumentSymbol computation does not bail on AST nodes with `$cstNode` gaps — walk what is present. |
| **Configurable compilation trigger** | Power users expect to disable on-save compilation or switch to debounced. gopls has `build.onSave`, rust-analyzer has `check.onChange`. | LOW | `package.json` setting: `bbj.compiler.trigger` with values `"onSave"` (default) and `"off"`. Debounced is a v2 concern — adds complexity for modest gain. |

### Differentiators (Competitive Advantage)

Features that go beyond the minimum and establish the BBj LS as a first-class tool for BBj developers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Diagnostic hierarchy — BBjCPL first, then parser, then hints** | When BBjCPL reports an error, its verdict is authoritative. The LS should either suppress or downgrade Langium parser errors for the same location when BBjCPL has spoken. This is unusual; most LS tools show both independently. | HIGH | Requires correlating BBjCPL error ranges with Langium diagnostic ranges. Approach: if BBjCPL reports errors for a document, clear Langium parse/linking errors for that document and publish only BBjCPL + Langium warnings/hints. |
| **BBjCPL integration with BBj home auto-detection** | Uses existing `bbj.home` setting (already wired for run commands) to locate `bbjcpl` binary. No extra user config for basic case. | LOW | `{bbj.home}/bin/bbjcpl` on the same path pattern as the run commands. |
| **Timeout + cancellation for compiler invocation** | BBjCPL on a large file could block. Users don't expect their editor to hang. | MEDIUM | Node.js `child_process.spawn` with `AbortController` / `setTimeout` kill. Emit a warning diagnostic if BBjCPL times out instead of hanging the UI. |
| **Outline error indicator without losing structure** | Rust-analyzer and gopls both preserve the outline tree but do not add visual error indicators within the DocumentSymbol response — that's a client concern. The differentiating UX is that the outline stays populated even when there are errors, so users can still navigate. | LOW | The structural fix (walk partial AST) is the key. Error indicators (e.g., a `⚠` prefix on symbol names) are client-side behavior; the LS should not embed them in symbol names. |
| **Parse error noise-reduction scope: suppress linking+validation, not syntax** | The existing `cascading diagnostic suppression` in `BBjDocumentBuilder` suppresses synthetic file diagnostics. The new suppression should suppress *downstream Langium linking/semantic errors* when the document has parser errors, while keeping the parser error itself visible. | MEDIUM | In `BBjDocumentValidator`, check `document.parseResult.parserErrors.length > 0`. If true, skip linking error processing and custom validations — only surface parser errors. Implement via `stopAfterParsingErrors` flag. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Debounced compilation on every keystroke** | Faster feedback loop | BBjCPL is a batch compiler — spawning it on every change would create process churn, block the workspace, and produce noisy intermediate-state errors. Langium's incremental parser already provides fast syntactic feedback. | On-save trigger (default) with `"off"` escape hatch. |
| **Embedding error count/indicator in DocumentSymbol name** | "Show me that method 3 has errors" | LSP `DocumentSymbol.name` is a string — modifying it breaks search, refactoring, and breadcrumb navigation. Clients (VS Code Outline, IntelliJ Structure View) manage their own error decorators from the diagnostics stream, not from symbol names. | Trust the client to render error indicators via the standard diagnostics stream. |
| **Replacing Langium parser entirely with BBjCPL as the only validator** | "Just trust the compiler" | BBjCPL is a batch compiler with no incremental mode. It is too slow for keystroke-level feedback, does not provide CST nodes for hover/completion, and produces tokenized output (not source AST). The hybrid approach (Langium for IDE features, BBjCPL for authoritative errors) is the correct pattern — identical to how gopls and rust-analyzer work. | Maintain Langium as the IDE AST provider; BBjCPL as the authoritative error source on save. |
| **Blocking the LS thread waiting for BBjCPL** | Simplicity of implementation | Blocks all LSP responses (hover, completion, go-to-definition) during compilation. Creates a frozen editor. | `child_process.spawn` (async, non-blocking) with CancellationToken support. |
| **Global error suppression setting ("disable BBjCPL diagnostics")** | "I want to disable all this noise" | Coarse-grained switches lead to users turning off diagnostics entirely and missing real errors. | Configurable trigger (`"off"` disables BBjCPL invocation). Fine-grained suppression via existing `bbj.typeResolution.warnings` pattern. |

---

## Feature Dependencies

```
[BBjCPL child process invocation]
    └──requires──> [bbj.home setting resolution] (already exists)
    └──requires──> [textDocument/didSave handler] (new)
    └──requires──> [BBjCPL output parser] (new — parse line/col from compiler stdout)
    └──requires──> [per-document diagnostic store] (new — track BBjCPL diagnostics separately from Langium)
    └──requires──> [connection.sendDiagnostics / publishDiagnostics] (exists in Langium infrastructure)

[Diagnostic hierarchy (BBjCPL first)]
    └──requires──> [BBjCPL child process invocation]
    └──requires──> [parse error detection] (exists via document.parseResult.parserErrors)
    └──enhances──> [cascading suppression] (existing mechanism, extended)

[Parse error noise reduction (suppress linking when parser errors exist)]
    └──requires──> [ValidationOptions.stopAfterParsingErrors wired] (interface exists, enforcement may not)
    └──enhances──> [Diagnostic hierarchy] (complementary — reduces Langium noise independently of BBjCPL)

[Outline resilience (partial AST walk)]
    └──requires──> [DocumentSymbol provider handles null/undefined $cstNode gracefully]
    └──conflicts──> [strict AST completeness checks in symbol walkers]

[On-save trigger config (bbj.compiler.trigger)]
    └──requires──> [textDocument/didSave handler]
    └──requires──> [package.json setting declaration]

[BBjCPL timeout + cancellation]
    └──requires──> [BBjCPL child process invocation]
```

### Dependency Notes

- **BBjCPL invocation requires bbj.home**: The `bbjcpl` binary path is `{bbj.home}/bin/bbjcpl`. Already wired for run commands. The BBjCPL service can read from the same workspace settings object.
- **Diagnostic hierarchy enhances cascading suppression**: Both reduce noise, but from different sources. Cascading suppression reduces Langium noise; diagnostic hierarchy establishes BBjCPL as authoritative over Langium.
- **Outline resilience is independent**: Can be implemented without BBjCPL integration. The Langium parser already does error recovery — the fix is in the symbol walker, not the parser.
- **Parse error noise reduction conflicts with strict validation**: Suppressing linking errors when parse errors exist means some real semantic errors will not appear until the parse error is fixed. This is the correct trade-off — identical to how TypeScript and gopls behave.

---

## MVP Definition

### Launch With (v1 = this milestone)

- [x] **BBjCPL on-save invocation** — spawn `bbjcpl` after `textDocument/didSave`, capture output, parse errors, publish as diagnostics with source `"BBjCPL"`. Gated by `bbj.home` being set and `bbj.compiler.trigger !== "off"`.
- [x] **BBjCPL output parser** — parse error lines (format: `{file}({line}): {message}` based on BASIS docs pattern), map to LSP `Diagnostic` with correct range.
- [x] **Source label convention** — BBjCPL diagnostics: `source: "BBjCPL"`. Langium parser/linking/validation diagnostics: `source: "bbj"` (existing, unchanged).
- [x] **Parse error noise reduction** — when `document.parseResult.parserErrors.length > 0`, suppress Langium linking errors and custom validations for that document. Parser errors remain visible.
- [x] **Outline resilience** — ensure `DocumentSymbol` computation walks the partial AST without throwing when `$cstNode` is null/undefined on error-recovered nodes.
- [x] **Configurable trigger** — `bbj.compiler.trigger`: `"onSave"` (default) | `"off"`. Declared in `package.json` settings contribution.
- [x] **Timeout protection** — BBjCPL invocation killed after configurable timeout (default 10s). Warning diagnostic published if timeout exceeded.

### Add After Validation (v1.x)

- [ ] **Diagnostic deduplication** — if BBjCPL reports an error on a line and Langium also reports a parse error on the same line, show only BBjCPL's. Requires range-overlap comparison.
- [ ] **Debounced trigger** — `bbj.compiler.trigger: "debounced"` with configurable delay. Low value relative to complexity; defer until users request it.
- [ ] **IntelliJ-specific timeout tuning** — IntelliJ's LSP4IJ may have different latency characteristics for didSave. Monitor and tune if needed.

### Future Consideration (v2+)

- [ ] **BBjCPL quickfix integration** — surface BBjCPL error codes as `code` field in Diagnostic; register code actions for known fixable errors.
- [ ] **Project-wide compilation** — compile the full project (not just the saved file) when requested via command. `bbj/compileProject` custom request.
- [ ] **Watch mode** — persistent BBjCPL process watching for file changes. Requires BBjCPL to support a watch API (unknown if it does).

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Parse error noise reduction (suppress linking) | HIGH | LOW | P1 |
| Outline resilience (partial AST walk) | HIGH | LOW | P1 |
| BBjCPL on-save invocation + output parsing | HIGH | MEDIUM | P1 |
| Source label convention (BBjCPL vs bbj) | MEDIUM | LOW | P1 |
| Configurable trigger (onSave / off) | MEDIUM | LOW | P1 |
| Timeout protection for BBjCPL | MEDIUM | LOW | P1 |
| Diagnostic hierarchy (BBjCPL clears Langium) | HIGH | HIGH | P2 |
| Diagnostic deduplication (range overlap) | MEDIUM | MEDIUM | P2 |
| Debounced trigger | LOW | MEDIUM | P3 |
| Project-wide compilation command | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone — directly addresses stated pain points
- P2: Should have — completes the feature story but can ship in a follow-up
- P3: Nice to have — defer

---

## Competitor Feature Analysis

How established language servers handle the same problems:

| Feature | gopls (Go) | rust-analyzer (Rust) | TypeScript LS | Our BBj Approach |
|---------|------------|---------------------|---------------|-----------------|
| External compiler invocation | Runs `go list` (not full `go build`) on-demand; async, non-blocking | Runs `cargo check` async on save; separate target dir | tsserver is the compiler — in-process, no external invocation | Spawn `bbjcpl` async on `didSave`; kill after timeout |
| Compiler vs LS diagnostic source | `"go list"` / `"compiler"` (separate sources) | `"rustc"` (cargo check) / `"rust-analyzer"` (RA-native) | Single source: `"typescript"` | `"BBjCPL"` vs `"bbj"` |
| Parse error → downstream suppression | Yes — type errors not shown when parse errors exist | Yes — type errors suppressed for files with parse errors | Yes — cascading errors managed by tsserver internally | Implement via `stopAfterParsingErrors` in `ValidationOptions` |
| Outline with syntax errors | Outline persists via error-recovering parser (tree-sitter) | Outline persists via RA's own parser with recovery | Outline persists — tsserver recovers from most syntax errors | Fix: walk Langium's partial AST without crashing on null `$cstNode` |
| On-save trigger | `build.onSave` config (default: true) | `check.onChange: "save"` (default) | Always-on, in-process (no separate trigger needed) | `bbj.compiler.trigger: "onSave"` (default) |
| Compilation timeout | N/A (go list is fast) | `check.invocationStrategy` controls parallelism; inherits cargo timeouts | N/A (in-process) | `bbj.compiler.timeout` (default 10000ms) |

---

## Research Findings by Question

### Q1: What do users expect from compiler-integrated diagnostics?

**Finding (HIGH confidence — gopls, rust-analyzer, TypeScript LS docs):**

Users expect compiler diagnostics to be authoritative and fast. The pattern across all major language servers:
1. In-process analysis (Langium parser equivalent) provides immediate keystroke-level feedback.
2. External compiler/check runs on save and provides authoritative results.
3. The two streams are distinguished by `source` label and do not conflict — the LS shows both, with compiler errors taking precedence in user mental models.
4. Parse errors block semantic errors — users do not want 20 "could not resolve" errors when one `(` is missing.

### Q2: How do language servers handle diagnostic cascading/hierarchy?

**Finding (HIGH confidence — gopls docs, rust-analyzer docs, Langium source):**

Standard approach: **phase-gate validation**. gopls and rust-analyzer do not run type-checking if parse/syntax errors exist in a file. TypeScript's tsserver is in-process and manages this internally. Langium already declares `ValidationOptions` with `stopAfterParsingErrors` and `stopAfterLinkingErrors` flags — these need to be wired and respected.

The existing `BBjDocumentValidator.processLinkingErrors` is only called if the base class decides to process linking errors. The `DefaultDocumentValidator` checks parse error counts before proceeding. The BBj LS inherits this behavior but may need explicit enforcement.

### Q3: What's the expected UX for outline with syntax errors?

**Finding (MEDIUM confidence — LSP spec, rust-analyzer, TypeScript LS behavior):**

- Outline **should persist** with whatever the parser recovered — never become empty due to a single syntax error.
- Error indicators in the outline (⚠ decorators, red icons) are **client-side concerns** — VS Code and IntelliJ manage these from the diagnostics stream, not from DocumentSymbol data.
- The LS's job: return all DocumentSymbols the AST can provide, even if some AST nodes have null CST nodes.
- "Stale outline" (showing prior valid state) is acceptable but not preferred. Best UX: show partial current outline.

**For BBj specifically:** Langium's Chevrotain parser has built-in error recovery. When `myEditBox!.setText"00-00-0000_0000")` is parsed, the parser recovers and produces a partial AST. The issue is that DocumentSymbol computation may traverse AST nodes that have null `$cstNode` and throw or skip the entire method body. The fix is defensive null checks in the symbol walker.

### Q4: Common trigger patterns for external compilation

**Finding (HIGH confidence — gopls, rust-analyzer config docs, LSP spec):**

- **on-save** (`textDocument/didSave`) — universal default across gopls, rust-analyzer.
- **on-change (debounced)** — rust-analyzer supports `"check.onChange: true"` but defaults to save. Creates process churn if the compiler is slow.
- **manual** — always available via command, but not a replacement for automatic triggers.
- **off** — escape hatch for users who want zero external compilation.

**BBj recommendation:** `onSave` default. `off` as the only alternative for v1. Debounced is P3.

### Q5: Diagnostic severity/source labeling conventions

**Finding (HIGH confidence — LSP 3.17 spec, gopls source, rust-analyzer source, Langium source):**

LSP 3.17 spec: `source` is "a human-readable string describing the source of this diagnostic, e.g. 'typescript' or 'super lint'".

Real-world conventions:
- **gopls**: `"compiler"` (parsing/type-check phase) and `"go list"` (build metadata phase)
- **rust-analyzer**: `"rust-analyzer"` (RA-native diagnostics) and `"rustc"` (cargo check)
- **TypeScript LS**: `"typescript"` for all diagnostics (single source)
- **ESLint LSP**: `"eslint"` for all ESLint diagnostics

**BBj recommendation:**
- Langium parser/linking/validation: `"bbj"` (existing — from `this.metadata.languageId` in `DefaultDocumentValidator.getSource()`)
- BBjCPL compiler: `"BBjCPL"` (capitalized — matches the tool name as known to BBj developers, consistent with gopls using the tool name)

---

## BBjCPL Output Format (Research Finding)

**Source:** [BASIS documentation for bbjcpl](https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm) — HIGH confidence.

Key facts:
- `bbjcpl` is a standalone CLI program that compiles ASCII BBj source files to tokenized format.
- **Error messages contain both BBj line number and ASCII file line number.** The ASCII file line number is what maps to LSP diagnostics (source positions).
- Supports `-e<errorlog>` flag to write errors to a file rather than stdout — useful for reliable capture.
- Errors are for syntax errors, duplicate labels, and duplicate DEF FN names.
- Error format: needs empirical verification of exact string format during implementation (LOW confidence on exact format — test with a known-bad file during the implementation phase).

**Implementation implication:** Use `-e<errorlogfile>` to redirect error output to a temp file. Read and parse the temp file after the process exits. Avoids stdout/stderr interleaving issues.

---

## Sources

- [Language Server Protocol Specification 3.17 — Diagnostic](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) — `source` field definition, severity levels
- [Gopls: Diagnostics](https://go.dev/gopls/features/diagnostics) — `"compiler"` vs `"go list"` source labels, diagnostic phases
- [rust-analyzer: Diagnostics](https://rust-analyzer.github.io/book/diagnostics.html) — `"rust-analyzer"` vs `"rustc"` separation
- [BBjCPL Documentation](https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm) — error output format, `-e` flag, line number format
- [BASIS IDE Compiler Overview](https://documentation.basis.com/BASISHelp/WebHelp/ide/basis_ide_complier.htm) — compiler error linking behavior
- Langium source: `node_modules/langium/lib/validation/document-validator.js` — `getSource()` returns `this.metadata.languageId` = `"bbj"`
- Langium source: `ValidationOptions` interface — `stopAfterParsingErrors`, `stopAfterLinkingErrors` flags exist and are designed for this use case
- [Langium Document Lifecycle](https://langium.org/docs/reference/document-lifecycle/) — `onBuildPhase(DocumentState.Validated)` pattern for injecting external tool diagnostics
- [DeepWiki: rust-analyzer LSP Integration](https://deepwiki.com/rust-lang/rust-analyzer/3-language-server-protocol-integration)
- [VSCode Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) — `textDocument/didSave` trigger pattern

---

*Feature research for: BBj Language Server v3.7 — BBjCPL Integration & Diagnostic Quality*
*Researched: 2026-02-19*
