# Project Research Summary: v4.9 bbj-ls DENUM & Format Migration

**Project:** Langium-based language server formatting and DENUM command migration from vendored jar to bbj-ls (BBj 26.03+)
**Domain:** Dual-IDE (VS Code / IntelliJ LSP4IJ) LSP-based code formatting and command integration
**Researched:** 2026-10-01
**Confidence:** HIGH for stack and architecture (code-verified); MEDIUM-HIGH for IntelliJ LSP4IJ runtime behaviour (to be evaluated)

## Executive Summary

v4.9 migrates code formatting and DENUM (line-number removal) from a vendored 2021 jar (`BBjCFCli.jar`) and the `bbjlst` denumber path to bbj-ls's `formatProgram` and `denumProgram` JSON-RPC methods, available in BBj 26.03+. The migration is a **hard cut-over with no fallback**, simplifying the stack (no Java spawn, no resolver/verifier, no `javaPath` setting) while requiring a running BBjServices on the interop port (:5008).

The recommended approach wires formatting through Langium's `lsp.Formatter` DI slot and implements DENUM as an LS-side request, both delegating to bbj-ls over the interop connection. Settings transport differs: VS Code uses `didChangeConfiguration` (no restart); IntelliJ uses `initializationOptions` (restart on change) unless the live `FormattingOptions` route is chosen. All 15 formatter settings are whitelisted on the server before reaching bbj-ls.

The milestone's main risk is IntelliJ integration: LSP4IJ's formatting support exists but runtime behaviour must be evaluated hands-on before a support decision. A secondary risk is the removal blast radius: deleting the formatter jar, resolver/verifier, and related test files and docs.

## Key Findings

### Recommended Stack

No new runtime dependencies are required; all technologies are already in use. Langium 4.3.1 remains held back (upstream issue #2236: 4.4.0 has a measured 2.5–3.3 s/parse regression). The stack supports both formatProgram and denumProgram through the existing :5008 interop connection with per-method capability probes (a `-32601` latch per method).

**Core technologies:**
- **Langium `~4.3.1`** — `lsp.Formatter` DI slot, implemented directly (not `AbstractFormatter`). Bounded handler registered **after** `startLanguageServer` to avoid the workspace-ready wait (Pitfall 1).
- **`vscode-languageserver` 10.0.1** — `TextEdit`, `FormattingOptions`, `ResponseError`, connection methods. Already imported.
- **`vscode-languageclient` 10.1.2** — Auto-registers formatting providers once the server advertises the capability. Legacy client-side `registerDocumentFormattingEditProvider` **must be deleted** atomically (Pitfall 2).
- **`vscode-jsonrpc` 8.2.1** — Two new `RequestType`s beside `parseProgramRequest`. Upgrade to 9.x stays out of scope.
- **LSP4IJ 0.21.0** — Formats through IntelliJ's `formattingService` EP; **capability gating via `LSPFormattingFeature.isEnabled()` required until evaluation is complete** (Pitfall 2). `LSPFormattingFeature` is `@ApiStatus.Experimental` — the three LSP4IJ fence tests change in the same plan.
- **BBj 26.03+ with bbj-ls** — Supplies `formatProgram`, `denumProgram`; error codes `-33001`..`-33009`, `-32800` (supersession). Hard requirement; BBj < 26.03 gets one "requires BBj 26.03" message per connection generation.

### Expected Features

**Must have (table stakes):**
- **Format Document, Selection, on-save** — the core value; VS Code cancels after 750 ms, IntelliJ has no documented timeout (to be measured in evaluation)
- **Typed error messages** for `-33006` (DENUM needed), `-33007` (invalid settings), `-33008` (mixed numbering), `-33002/3/9` (timeout/oversized/engine failed) — deduped once per kind; `-32800` silent
- **Old BBj and interop-down messages** — clear, distinct, never blocking a save
- **15 formatter settings** in both IDEs (whitelisted, explicit defaults)
- **DENUM command** backing the explicit action and the `-33006` prompt; operates on the live buffer (versioned, undoable, dirty)
- **Numbered-file handling** — range requests refused with `-33006`; no auto-denumbering on format-on-save (Pitfall 12); prompt deduped
- **Settings migration** — `splitSingleLineIF` → `splitSingleLineIf` with one-release fallback; `javaPath` removed

**Should have (competitive):**
- **"Denumber and Format"** (D1) — single action (`allowDenum`), one undo step
- **Minimal edits** (D2) — line-granular diff to preserve cursor/folding
- **DENUM diagnostics** (D4) — result message or output list
- **IntelliJ DENUM action** (D5)

### Architecture Approach

The LS sends two new interop methods (`formatProgram`, `denumProgram`) and exposes DENUM to clients through an LS request/command. Errors are classified into typed outcomes, each with specific user-facing messaging. Settings are held in one snapshot fed from two channels: `initializationOptions` (IntelliJ, startup) and `didChangeConfiguration` (VS Code, hot-reload).

**Major components:**
1. **`BBjFormatter` (lsp.Formatter)** — LSP adapter, stale-version guard, no-op detection, config-document skip
2. **`BBjFormatService`** — parameters builder, error classification, per-generation `-32601` latch, message deduping
3. **Bounded formatting handler** — reads live text from `TextDocuments`, no workspace-ready wait, respects `CancellationToken`
4. **`BBjFormatSettings` normalizer** — whitelists 15 keys, coerces types, carries legacy `splitSingleLineIF` alias
5. **DENUM handler** — `bbj/denum` request or `workspace/executeCommand` (see Conflict 2)
6. **Interop routing** — format/denum lane decision in `java-interop-connection.ts` (see Conflict 1)

### Critical Pitfalls

1. **Langium's default formatting handler waits for workspace initialization** (Pitfall 1) — bounded handler registered **after** `startLanguageServer`, reading from `TextDocuments` with no document-state wait.
2. **Two formatters at once; IntelliJ silently gains formatting** (Pitfall 2) — delete the legacy provider in the same commit the server advertises formatting; gate IntelliJ with `isEnabled() → false` until the evaluation verdict. Previews publish on every push to `main`.
3. **Stale TextEdit corrupting a newer buffer** (Pitfall 3) — capture `textDocument.version` before sending, verify on result, drop if changed.
4. **Whole-document format as one giant `TextEdit`** (Pitfall 4) — line-granular minimal diff, `[]` if equal, never edit past document end.
5. **Supersession loses format-on-save** — live probe: a range `formatProgram` cancels a pending whole-document request with the same `canonicalName`; use distinct keys and serialize per document.
6. **Lane coupling** (Pitfall 9) — DENUM runs on bbj-ls's parser worker; a lane loss bumps `generation` and clears parse verdicts.
7. **Removal fallout** — keep the `denumber` flag used by tokenized decompile; `ComposerRequestContractTest` runs only under `./gradlew test`.

## Conflicts to Resolve

### 1. Interop Routing: Shared Connection vs Parse Lane vs Dedicated Lane

- **Position A (STACK):** route over the **shared connection** — DENUM on the parse lane would queue behind live parses on bbj-ls's parser worker.
- **Position B (ARCHITECTURE):** use the **parse lane** (renamed "program lane") with fallback to shared — class-info methods run inline on bbj-ls's reader thread (#692), and the format worker is separate per connection.
- **Position C (PITFALLS, Pitfall 9):** **dedicated third lane** with per-method `-32601` latches — lane loss bumps `generation` and clears every document's parse verdict; `parseProgram` and `formatProgram` shipped a week apart, so one shared latch is wrong.

**Recommendation:** C if acceptable, else A; never B. Phase 124 measures DENUM latency with a pending parse.

### 2. DENUM Invocation: Custom Request vs `workspace/executeCommand`

- **Position A (STACK):** `workspace/executeCommand` + `workspace/applyEdit` (standard LSP; no new Java interface; the `-33006` prompt uses the same path).
- **Position B (ARCHITECTURE & PITFALLS):** custom request `bbj/denum` mirroring `bbj/compile` (repo precedent, contract-test protection; needs IntelliJ `@JsonRequest` + `ComposerRequestContractTest` update).

**Recommendation:** B for consistency with `bbj/compile`; the server-driven `-33006` prompt still uses `showMessageRequest` + `applyEdit`.

### 3. IntelliJ Settings Delivery: Live via FormattingOptions vs Restart via `initializationOptions`

- **Position A (STACK):** extra keys on `FormattingOptions` via an `LSPFormattingFeature` subclass (live, no restart; avoids a nested `createSettings()` that would clobber `configPath`).
- **Position B (ARCHITECTURE, PITFALLS, FEATURES):** flat `initializationOptions.formatter` (proven channel, restart on change).

**Recommendation:** B (proven pattern); defer A unless hot-apply is wanted.

## Open User Decisions

| Decision | Options | Recommendation |
|----------|---------|-----------------|
| Q1: DENUM edits buffer or writes file | Buffer edit or file rewrite | Buffer edit: handles unsaved changes, undoable. Prompt button "Denumber & Replace" → "Denumber". |
| Q2: `indentWidth` default | 2 (current) or 4 (engine) | Keep 2 for continuity; mirror in IntelliJ; always send all 15 values. |
| Q3: "Denumber and Format" as primary `-33006` action | Combined or plain only | Plain "Denumber" is the floor; add combined if cheap. |
| Q4: IntelliJ settings UI timing | Before or after evaluation verdict | After: avoid dead UI if verdict is "disabled". |
| Q5: `eolCharacter` semantics | Normalize EOL or preserve | Compare lines ignoring terminators; document that the editor owns line endings under LSP. |
| Q6: Untitled/non-file docs | Enabled or disabled | Defer; selector stays `scheme: 'file'`. |
| Q7: IntelliJ formatting gate | Off or on by default | Off until verdict; never ship unevaluated. |

## Implications for Roadmap

Suggested phase structure (continues from phase 123):

### Phase 124: Interop Protocol Layer
**Delivers:** wire types, request plumbing, error constants, shared classifier, per-method latch, response validation, fake-peer tests.
**Research flag:** lane architecture (Conflict 1).

### Phase 125: LS Formatting (Formatter, Handler, Settings)
**Delivers:** `BBjFormatter`, bounded handler, `BBjFormatService`, minimal-edit diff, stale-version guard, typed outcomes, 15-key normalizer, IntelliJ gate.
**Research flag:** cold-start performance against the ~750 ms format-on-save budget.

### Phase 126: LS DENUM (Command, Prompt, Diagnostics)
**Delivers:** DENUM request, `showMessageRequest` + `applyEdit` prompt, diagnostics output.
**Research flag:** diagnostics surfacing (one-shot vs stored-and-merged).

### Phase 127: VS Code Cut-Over (Settings, Removal, Parity)
**Delivers:** 15 settings, `package.json` rename/drop, deletion of old files, E2E against live BBj.

### Phase 128: IntelliJ Build-Out (Settings, DENUM, Plumbing)
**Delivers:** formatter init options, settings UI, DENUM action, `ComposerRequestContractTest` update.

### Phase 129: IntelliJ Evaluation & Decision
**Delivers:** executed checklist on the final-tree plugin zip, real `idea.log` traces, verdict (supported/disabled) as a user checkpoint.

### Phase 130: Docs, QA, Migration Notes
**Delivers:** both user guides, QA checklists, migration note (large first-format diff), changelog.

### Phase Ordering Rationale

- **124 first:** both LS features depend on the wire contract and lane decision.
- **125 before 126:** DENUM prompt builds on the format outcome union.
- **127 and 128 after 125/126:** both consume the LS contract.
- **129 after 128:** evaluation gates the capability gate and docs.
- **130 last:** describes final behaviour and the verdict.

### Research Flags

- **Phase 124:** lane architecture.
- **Phase 125:** cold-start latency.
- **Phase 126:** diagnostics surfacing.
- **Phase 129:** LSP4IJ runtime behaviour — real logs, not hand-derived sequences.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Installed Langium 4.3.1, bbj-ls README, LSP4IJ 0.21.0 javap, Gradle config. No new dependencies. |
| Features | HIGH | bbj-ls contract, error codes, live probe 2026-10-01. |
| Architecture | HIGH | Integration points verified in bbj-vscode/src/language and bbj-intellij/src. |
| Pitfalls | HIGH | Code patterns and live-probe findings. |
| IntelliJ LSP4IJ runtime | MEDIUM-HIGH | Capability confirmed via bytecode; runtime behaviour is phase 129 scope. |

**Overall confidence:** HIGH.

### Gaps to Address

| Gap | Handling |
|-----|----------|
| Conflict 1: lane architecture | Phase 124 measurement and decision |
| Conflicts 2 & 3 | User decision at requirements time |
| Q5 `eolCharacter` | Phase 125, CRLF/LF tests |
| Q7 IntelliJ gate | Gate in 125, flip in 129 |
| DENUM diagnostics | Default one-shot in 126; revisit after UAT |
| bbj-ls `$/cancelRequest` behaviour | Verify in 124/125 |

## Sources

### Primary (HIGH confidence)
- `/home/coder/repos/bbj-ls/README.md`, `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md`, `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md`
- Live probe of `:5008` on 2026-10-01 against the shipped `bbj-ls.jar`
- `bbj-vscode/src/language/` and `bbj-intellij/src/main/java/com/basis/bbj/intellij/`
- Langium 4.3.1 `node_modules/langium/lib/lsp/`
- LSP4IJ 0.21.0 binary via javap

### Secondary (MEDIUM confidence)
- LSP4IJ GitHub issues (#381, #739, #747, #1323, #1404, #1647), LSPSupport.md, LSPApi.md
- VS Code release notes (format-on-save history)

### Tertiary (LOW confidence, verify during execution)
- LSP4IJ 0.21.0 Actions on Save, range formatting, `showMessageRequest` handling
- VS Code stale-response handling

---
*Research completed: 2026-10-01*
*Ready for roadmap: yes*
