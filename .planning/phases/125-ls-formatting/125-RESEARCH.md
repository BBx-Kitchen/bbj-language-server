# Phase 125: LS Formatting - Research

**Researched:** 2026-10-01
**Domain:** Langium language-server formatting service over the Phase 124 interop client; VS Code provider cut-over; LSP4IJ client-feature switch
**Confidence:** HIGH (every in-repo claim was read this session; the wire contract and edge cases were probed against the live :5008 peer; two VS Code behaviours are cited from upstream source, three remain `[ASSUMED]`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Carried forward (not re-asked)**
- Phase 124 D-01..D-17 stand: dedicated program lane, typed `ProgramOutcome`s, per-method availability latches (`-32601` → unavailable, once per connection), client deadlines 15 s / 25 s with cancel-always, validated `data` payloads for `-33007` (`problems[{setting,message}]`) and `-33008` (`line`), contract-exact response shape + echoed-version check.
- Hard cut-over, no jar fallback. `indentWidth` defaults to 2. Formatting never DENUMs (`allowDenum` is not sent from the format path in this phase).
- Research (`.planning/research/ARCHITECTURE.md` §1, §3, §4, §7): implement `Formatter` directly (not `AbstractFormatter`); bounded handler reads `TextDocuments` and never awaits `WorkspaceManager.ready`; whole-document `text` is turned into a minimal line edit (`[]` when equal, end clamped to the real last line); a version change during the await returns `[]`; `-32800`/caller cancellation returns `[]` silently; LSP `FormattingOptions` are ignored.

**Message channel & noise**
- **D-01:** Failure kinds (timeout, too large, protected program, engine failure, service unavailable, invalid settings, mixed numbering, DENUM-needed, requires-26.03) show a `window/showMessage`-style **toast the first time, then log only** (output channel), the `BBjParserService` warn-then-debug cadence. The server cannot tell Format Document from format-on-save (same LSP request), so quietness comes from dedup, not from the trigger.
- **D-02:** **Dedup re-arms by kind:**
  - content-bound kinds — too large, protected program, mixed numbering, DENUM-needed — re-arm per **document + version** (an edit re-arms; saving an unchanged file never repeats);
  - invalid settings re-arms per **settings revision** (a settings change re-arms);
  - environment kinds — timeout, engine failure, service unavailable, requires-26.03 — re-arm per **connection generation**.
- **D-03:** Severity is **Warning for every kind** (nothing broke; the buffer is untouched).
- **D-04:** Interop simply not connected (transport error, breaker open, `ConnectionError`) gets **no popup from formatting**, only a log line; the breaker already raised its one "not reachable" message. This keeps it distinct from "requires BBj 26.03" (FMT-11).

**Actionable messages**
- **D-05:** Invalid settings (`-33007`): the server sends one `window/showMessageRequest` naming every bad key as `bbj.formatter.<key>` (with bbj-ls's per-key message) and an **"Open Settings"** action. On click the server sends a **host-neutral notification** (e.g. `bbj/openFormatterSettings`, payload carrying the keys); the VS Code client handles it by opening the Settings UI **filtered to `bbj.formatter`**. IntelliJ does not handle it in this phase (formatting is off there until 129) — the planner must confirm LSP4IJ tolerates an unhandled server notification without noise.
- **D-06:** Mixed numbering (`-33008`): Warning "mixed line numbering at line N" with a **"Go to Line"** button → `window/showDocument` with the selection on that (1-based → 0-based) line. No automatic jump, no diagnostic.
- **D-07:** Prompts are **fire-and-forget**: the formatting response returns `[]` immediately and never waits for a click. A late click on a since-edited document still opens/jumps harmlessly.

**Interim gaps until Phases 126/127 (previews publish on every push)**
- **D-08:** DENUM-needed (`-33006`) in this phase: buffer untouched, Warning "This file has line numbers. Run **Denumber BBj Program** first, then format." (the existing `bbj.denumber` command, Alt+N, still works until 127). Dedup per document (D-02). Phase 126 replaces this with the "Denumber" / "Denumber and Format" offer.
- **D-09:** The LS normalizer **maps the old `splitSingleLineIF` key to `splitSingleLineIf` now**, so preview users who set it see no change. Phase 127 adds the new `package.json` key with the old one as a deprecated alias.
- **D-10:** All 15 keys always reach bbj-ls with explicit values: bbj-ls defaults from the bbj-ls formatter README settings table, except `indentWidth` = 2. If the user already set any of the 15 keys under `bbj.formatter.*` (declared in `package.json` or not), that value is forwarded. Never sent: `javaPath`, nulls, unknown keys. bbj-ls validates values (`-33007` → D-05).
- **D-11:** Older-BBj wording (Warning, once per connection): "BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it." Must stay distinct from any not-connected text.

**Range & on-save scope**
- **D-12:** Format Selection **accepts bbj-ls's snapped edit as returned**, even when it extends past the selection (whole logical statements); Phase 124 already validates it overlaps the request. No clipping.
- **D-13:** Cold start vs VS Code's ~750 ms format-on-save budget: **measure first, then decide.** Research/live check measures first-format latency (lane open + probe + format). If it misses the budget, open/warm the program lane when the first BBj document opens; otherwise stay lazy. Record the numbers and the choice in the phase.
- **D-14:** A format-on-save that VS Code abandons (cancellation) is **silent**; debug log only. The next save formats normally.
- **D-15:** `editor.formatOnSaveMode: modifications` range requests are **treated as normal range formats** — no special case.

### Claude's Discretion
- Module split and names within the roadmap's file list (`bbj-format-service.ts`, `bbj-formatter.ts`, `bbj-formatting-handler.ts`, `bbj-format-settings.ts`), the notification method name, and where the dedup state lives.
- Exact message texts other than D-08/D-11 (short, plain, each naming what to do), and how bbj-ls's per-key messages are joined in the invalid-settings message.
- The form of the IntelliJ single switch in `BbjLanguageServerFactory.createClientFeatures()` (IJF-01) and how the LSP4IJ fence tests pin it.
- How FMT-12 excludes config `.bbx` and non-BBj documents (language id / URI checks in the handler), and moving `wholeDocumentChangeAsRange` to a neutral module if reused.

### Deferred Ideas (OUT OF SCOPE)
- Phase 130 user guide could mention that `formatOnSaveMode: modifications` formats snapped statements (D-15) — documentation only, if useful.
- Reviewed todos not folded: IntelliJ `javaInteropHost/Port` vs `interopHost/Port` initOptions mismatch; signature-help / snippet peer-name escaping; Windows IntelliJ Node download progress re-check; lsp4j.jsonrpc 1.0, vitest 5, vscode-jsonrpc 9 upgrades.
- Not in this phase: the DENUM offer and `bbj/denum` (126), declaring the remaining keys in `package.json` / removing `javaPath` / deleting `document-formatter.ts` and the jar (127), IntelliJ formatting itself (129).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FMT-01 | Format Document returns bbj-ls's output | `BBjFormatService.format` -> `JavaInteropService.formatProgram`; document `text` -> minimal line edit (Code Examples 1, 3) |
| FMT-02 | Format Selection snapped to whole logical statements | range request passes `params.range`; peer `edits[0]` accepted as returned (D-12); live-probed edge cases (Architecture "Live-verified wire facts") |
| FMT-03 | Format-on-save never delays the save; `-32800`/cancel silent | bounded handler never awaits `WorkspaceManager.ready`; lane latch answers `unavailable` without a socket; cancel -> `[]` (Pattern 2, Pitfalls 1, 6) |
| FMT-04 | Already-formatted file returns no edits | `minimalLineEdit` returns `[]` on equal text; live-verified idempotency (Live facts L3) |
| FMT-05 | Minimal line edits; never apply an older version | single-hunk line trim, positions from `TextDocument.positionAt`; version captured before and re-read after the await (Pattern 3) |
| FMT-08 | Invalid settings named per key with a way to open settings | `-33007` `problems[]` -> one `showMessageRequest` + `bbj/openFormatterSettings` (Pattern 5) |
| FMT-09 | Mixed numbering with offending line + jump | `-33008` `line` -> Warning + "Go to Line" via `window/showDocument`; NOT live-reachable in this phase (Pitfall 3) |
| FMT-10 | Timeout / too large / protected / engine / service-unavailable each one deduplicated message | outcome -> notice-kind table + dedup ledger (Pattern 4) |
| FMT-11 | "requires BBj 26.03" once per connection, distinct from not-connected, save never blocked | `unavailable/method-not-found` vs `unavailable/not-reachable`; lane latch makes repeats instant (Pattern 4) |
| FMT-12 | Config `.bbx` and non-BBj documents never sent | handler allow-list `languageId === 'bbj'` before any interop call (Pattern 2) |
| SET-02 | Only the 15 known keys reach bbj-ls, explicit values, `indentWidth` 2 | `normalizeFormatterSettings` whitelist + defaults table; fed by `initializationOptions` and `didChangeConfiguration` (Pattern 6, Code Example 2) |
| CUT-01 | Exactly one BBj formatter in VS Code | delete `registerDocumentFormatter` + import in `extension.ts`; update 2 activation tests (Pitfall 5) |
| IJF-01 | IntelliJ offers no LSP formatting; one switch | `setFormattingFeature(...)` overriding `isEnabled` (NOT only `isSupported`) behind one constant (Pattern 7, Pitfall 2) |
</phase_requirements>

## Summary

The phase is almost entirely glue over the finished Phase 124 client. `JavaInteropService.formatProgram(params, token)` already returns a typed, validated `ProgramOutcome<FormatProgramResult>`, never rejects, honours the caller's `CancellationToken`, owns the per-method `-32601` latch and the 15 s deadline. What is new is (a) a Langium `Formatter` registration that flips both `documentFormattingProvider` and `documentRangeFormattingProvider` on, (b) a bounded request handler that bypasses Langium's default (`WorkspaceManager.ready` wait plus a disk-loading `getOrCreateDocument`), (c) a service that turns outcomes into minimal edits or one deduplicated user message, (d) a 15-key settings normalizer, (e) deletion of the VS Code client provider, and (f) an LSP4IJ `LSPFormattingFeature` kill switch for IntelliJ.

Three findings change how the plan must be written. **First**, the IntelliJ switch cannot copy the existing `LSPDocumentLinkFeature` pattern (override `isSupported`): in the pinned LSP4IJ 0.21.0 the formatting services gate on `isEnabled(file)` and then call `isFormattingSupported` / `isRangeFormattingSupported` directly; `isSupported` is not consulted. Overriding only `isSupported` would leave Reformat Code live in IntelliJ. **Second**, against the live peer mixed numbering without `allowDenum` is answered `-33006`, never `-33008`, so FMT-09 can be built and unit-tested but cannot be reproduced live until Phase 126 sends `allowDenum`. **Third**, the cold-start question (D-13) has a clear answer: first format on a fresh connection measured 2-8 ms for files up to 1,000 lines and 29-70 ms for a 160 KB file, so the lazy lane stays; no warm-up is needed.

**Primary recommendation:** Build four small TypeScript modules (settings normalizer, minimal-edit helper, format service with a notice ledger, bounded handler) plus a thin `BBjFormatter`, register the handler after `startLanguageServer`, delete the client provider in the same commit that adds the `lsp.Formatter` slot, and gate IntelliJ by overriding `isEnabled` plus the two `is*FormattingSupported` methods behind a single constant. Use a suffixed `canonicalName` for range requests.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Format Document / Selection request handling | Language server (shared Node process) | — | One implementation serves both IDEs; VS Code and LSP4IJ only send standard LSP requests |
| Capability advertisement | Language server (`lsp.Formatter` DI slot) | VS Code `LanguageClient` auto-registers the provider | Langium derives both provider flags from the slot |
| Minimal-edit computation, stale-version guard | Language server | — | Needs the buffer text and version only; client has no version in the request |
| Settings whitelist/defaults | Language server | VS Code forwards raw `bbj.formatter` values | Server owns the 15 keys, so unknown keys never reach bbj-ls |
| User messages (toast, actions) | Language server (`window/showMessage*`, `window/showDocument`) | VS Code client handles `bbj/openFormatterSettings` | Host-neutral; the only client-specific act is opening the Settings UI |
| Removing the legacy provider | VS Code extension host (`extension.ts`) | — | The only place that registers it |
| IntelliJ formatting off-switch | IntelliJ plugin (`BbjLanguageServerFactory` client features) | — | LSP4IJ keys formatting off the client-feature object, not the server |
| Peer transport, deadlines, availability latch | Interop client (Phase 124, unchanged) | — | Already built and verified |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| langium | 4.3.1 (pinned `~4.3.1`, do not upgrade) | `Formatter` interface, DI slot, `buildInitializeResult` capability flip | [VERIFIED: bbj-vscode/node_modules/langium/package.json] installed version; project memory says 4.4 is held back |
| vscode-languageserver | 10.0.1 | `Connection.onDocumentFormatting/onDocumentRangeFormatting`, `window.showWarningMessage(msg, ...actions)`, `window.showDocument` | [VERIFIED: node_modules/vscode-languageserver/package.json] |
| vscode-languageserver-textdocument | 1.0.15 | `TextDocument.positionAt/offsetAt` for in-range edit positions | [VERIFIED: node_modules package.json]; already imported directly by `bbj-kept-check.ts:22` |
| vscode-jsonrpc | ^8.2.1 | `CancellationToken` passed straight into `formatProgram` | [VERIFIED: bbj-vscode/package.json dependencies] |
| vscode-languageclient | 10.1.2 | Registers the formatting provider from the server capability; implements `window/showDocument` with `selection` + `takeFocus` | [VERIFIED: node_modules/vscode-languageclient/lib/common/client.js:1007-1039] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.10 | TS tests | all VS Code side tests [VERIFIED: node_modules] |
| JUnit | 6.1.3 (BOM) | IntelliJ source-guard / canary tests | LSP4IJ fence tests [VERIFIED: bbj-intellij/build.gradle.kts] |
| LSP4IJ | 0.21.0 (pinned) | `LSPFormattingFeature`, `setFormattingFeature` | IntelliJ switch [VERIFIED: bbj-intellij/build.gradle.kts `plugin("com.redhat.devtools.lsp4ij:0.21.0")`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single-hunk line trim | multi-hunk LCS diff, `diff` npm package | New dependency or O(n^2); VS Code already re-minimises edits (`computeMoreMinimalEdits`, see Sources), so only a future IntelliJ evaluation would benefit |
| Implement `Formatter` directly | extend `AbstractFormatter` | AbstractFormatter is CST-driven; we never parse |
| Module-level settings singleton (like `setCompilerTrigger`) | settings held on `BBjFormatService` | Service-held state keeps hermetic tests isolated; project direction is "no static singleton" (CLAUDE.md, JavadocProvider note) |

**Installation:** none. No new packages. All imports are already in `bbj-vscode/package.json` or are transitive dependencies already imported directly elsewhere in `src/`.

## Package Legitimacy Audit

No external package is added or changed by this phase, so there is nothing to run through the legitimacy gate.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 VS Code                                        IntelliJ (LSP4IJ 0.21.0)
 LanguageClient registers formatting            LSPFormattingFeature.isEnabled() == false
 provider from server capability                -> canFormat()/findFormattingServer() refuse
 (extension.ts no longer registers one)         -> no formatting request is ever sent
        |  textDocument/formatting | rangeFormatting
        v
 ┌──────────────────────── language server (one Node process) ────────────────────────┐
 │ bbj-formatting-handler.ts  (registered AFTER startLanguageServer, overrides Langium) │
 │   1. TextDocuments.get(uri)  (open buffer only; never getOrCreateDocument, never      │
 │      WorkspaceManager.ready)   -> missing doc / languageId != 'bbj'  => []            │
 │   2. capture version, build params                                                   │
 │        │                                                                              │
 │        v                                                                              │
 │ BBjFormatService (compiler group)                                                     │
 │   settings snapshot (FormatterSettingsHolder: 15 keys + revision)                     │
 │   JavaInteropService.formatProgram(params, token) ───────────────┐                    │
 │   <- ProgramOutcome                                              │ dedicated lane     │
 │   ok(document) -> minimalLineEdit(old, text)  [] if equal        │ (Phase 124)        │
 │   ok(range)    -> trim peer edit, [] if equal                    v                    │
 │   cancelled    -> [] silently                              bbj-ls :5008 formatProgram │
 │   other        -> notice ledger -> toast once / log        (own format worker)        │
 │   3. re-read version; changed => []                                                   │
 │                                                                                       │
 │ bbj-notifications.ts: showWarningMessage / showMessageRequest / showDocument /        │
 │   sendNotification('bbj/openFormatterSettings', {keys})                               │
 └───────────────────────────────────────────────────────────────────────────────────────┘
        |  window/showMessageRequest [Open Settings] / [Go to Line]
        v
 VS Code toast -> click -> (server) notification -> client opens Settings UI "bbj.formatter"
                         -> (server) window/showDocument {uri, selection: line N-1, takeFocus}

 Settings: VS Code bbj.formatter.* -> initializationOptions.formatter  (startup)
                                   -> didChangeConfiguration bbj.formatter (live)
           -> normalizeFormatterSettings -> snapshot (+revision) -> next formatProgram
```

### Recommended Project Structure
```
bbj-vscode/src/language/
├── bbj-format-settings.ts      # 15 keys, defaults, normalizeFormatterSettings, holder with revision
├── bbj-format-edit.ts          # minimalLineEdit(TextDocument, start, end, newText) -> TextEdit[]
├── bbj-format-service.ts       # BBjFormatService: params, outcome handling, notice ledger, messenger
├── bbj-formatter.ts            # BBjFormatter implements Formatter (thin adapter over the service)
├── bbj-formatting-handler.ts   # createBoundedFormattingHandler(deps) + registerBoundedFormattingHandler
├── format-settings-notification.ts  # OPEN_FORMATTER_SETTINGS_METHOD + payload type (no imports)
└── bbj-notifications.ts        # + sender helpers (existing module, connection-free)
bbj-vscode/src/extension.ts     # - registerDocumentFormatter; + client.onNotification handler
bbj-intellij/.../lsp/BbjLanguageServerFactory.java  # + setFormattingFeature(off switch)
```
Extra modules beyond the roadmap's four are within Claude's discretion; `bbj-format-edit.ts` and the notification constants module keep the service free of editor and Langium imports (the `config-reload-notification.ts` shape).

### Live-verified wire facts (probed 2026-10-01 against :5008, raw JSON-RPC)

| # | Fact | Evidence |
|---|------|----------|
| L1 | All 15 keys with explicit native values (`indentWidth: 2`, enums as upper-case strings, booleans) are accepted; result `{text, diagnostics:[], denumbered:false, version}` | probe `all15 doc` |
| L2 | The old spelling `splitSingleLineIF` alone gives `-33007` with `data:[{setting:'splitSingleLineIF', message:'unknown setting; allowed: ...'}]` | probe `old key only` |
| L3 | Formatting already-formatted text returns identical text (idempotent) | probe `idempotent` -> `true` |
| L4 | Numbered source without `allowDenum` -> `-33006`; **mixed source without `allowDenum` -> `-33006` as well**; mixed with `allowDenum:true` -> `-33008` `data:{line:2}` | probes `numbered`, `mixed no allowDenum`, `mixed allowDenum` |
| L5 | `indentWidth: 99` -> `-33007`, `data` lists one `{setting,message}` per problem; the top-level message ends "(and N more)", so build the user text from `data`, not from `message` | probe `bad indentWidth` |
| L6 | Array value `[2]` and JSON `null` for `indentWidth` both -> `-33007`; string `"4"` is accepted | probes `array value`, `null value`, `five digit string` |
| L7 | Range edits: an empty range at column 0 gives `edits: []`; a range inside a line is snapped to whole lines; a range past the document end gives `edits: []`; the returned edit may be wider than the selection | probes `empty range...`, `range beyond doc` |
| L8 | CRLF and lone-CR input round-trip with their own terminators under `eolCharacter: KEEP` | probes `crlf doc keep`, `lone-cr doc keep` |
| L9 | Tokenized text (`<<bbj>>...`) -> `-33009` "input is a tokenized BBj program, not source text" (a generic engine-failure code) | probe `tokenized` |
| L10 | A whole-document and a range request with the **same** `canonicalName` sent back to back: the whole-document one is answered `-32800` in 2 of 3 runs. With the range suffixed (`path#range:1-2`) both succeed | probes `fmt-probe3/4/5` |
| L11 | First format on a **fresh** connection (TCP_NODELAY on, like the lane): 1.8-5.5 ms for a 539-byte file, 3.9-4.3 ms for 14.8 KB / 1,000 lines, 29-70 ms for 161 KB / 10,000 lines; TCP connect 0.2-2.1 ms. The peer shows a ~42 ms floor on a second small request on the same connection | `fmt-latency2.cjs` |

Scratch probes: `/tmp/claude-1000/-home-coder-repos-bbj-language-server/14b87a55-754e-4192-927c-e0a00bf176f7/scratchpad/fmt-*.cjs`.

### Verified in-repo contract values

Verbatim from `bbj-vscode/src/language/java-interop-program-types.ts:135-143`:
```ts
export type ProgramOutcome<R> =
    | { kind: 'ok'; result: R }
    | { kind: 'cancelled' }
    | { kind: 'timeout'; origin: 'client' | 'peer' }
    | { kind: 'unavailable'; reason: 'method-not-found' | 'not-reachable' }
    | { kind: 'invalid-settings'; problems: ProgramSettingProblem[] }
    | { kind: 'mixed-numbering'; line: number | undefined }
    | { kind: 'failed'; failure: ProgramFailureKind; code: number | undefined; message: string }
    | { kind: 'malformed-result'; reason: string };
```
`ProgramFailureKind` (`java-interop-program-types.ts:116-118`):
```ts
    | 'parser-exception' | 'size-cap' | 'service-unavailable' | 'protected-program'
    | 'denum-needed' | 'format-failed' | 'invalid-params' | 'transport';
```
`FormatProgramParams` (`java-interop-program-types.ts:55-68`) fields: `text`, `version`, `canonicalName?`, `settings?: Record<string, FormatSettingValue>`, `allowDenum?`, `range?`. A document answer is `{scope:'document', text, diagnostics, denumbered, version}`; a range answer is `{scope:'range', edits, diagnostics, denumbered, version}` (`java-interop-program-types.ts:70-88`).

Client deadlines (`java-interop-program-lane.ts:37,45`): `PROGRAM_REQUEST_TIMEOUT_MS = 15_000`, `PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS = 25_000`. The format path in this phase never sets `allowDenum`, so 15 s applies.

The 15 settings and defaults, verbatim from `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md:127-143` (use these as the defaults table, overriding only `indentWidth` to `2`):

| Key | Type | Allowed values | Default |
|-----|------|-----------------|---------|
| `indentWidth` | int | `0` to `16` | `4` (**client default 2**) |
| `indentCharacter` | enum | `SPACE`, `TAB` | `SPACE` |
| `keywordsToUppercase` | boolean | `true`, `false` | `false` |
| `removeLineContinuation` | boolean | `true`, `false` | `false` |
| `splitSingleLineIf` | boolean | `true`, `false` | `false` |
| `splitInlineComments` | boolean | `true`, `false` | `false` |
| `splitInlineLabelComment` | boolean | `true`, `false` | `false` |
| `collapseMultiLine` | boolean | `true`, `false` | `false` |
| `eolCharacter` | enum | `KEEP`, `LF`, `CRLF` | `KEEP` |
| `ifClosingKeyword` | enum | `KEEP`, `FI`, `ENDIF` | `KEEP` |
| `ifKeywordCase` | enum | `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `KEEP` |
| `parameterLayout` | enum | `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `KEEP_INITIAL_LAYOUT` |
| `operatorSpacing` | enum | `KEEP`, `SPACED` | `KEEP` |
| `indentLabelBlocks` | boolean | `true`, `false` | `false` |
| `blankLineAfterReturn` | boolean | `true`, `false` | `false` |

Language ids: `export const CONFIG_DOCUMENT_LANGUAGE_ID = 'bbx-config';` (`src/composer-lens-contract.ts:44`); the BBj language id is `languageId: 'bbj'` (`src/language/generated/module.ts:11`); IntelliJ maps `languageId="bbj"` and `languageId="bbx-config"` (`bbj-intellij/src/main/resources/META-INF/plugin.xml:313,316`).

Capability flip (`node_modules/langium/lib/lsp/language-server.js:49,99-101`): `const hasFormattingService = this.hasService(e => e.lsp?.Formatter);` ... `documentFormattingProvider: hasFormattingService,` `documentRangeFormattingProvider: hasFormattingService,` `documentOnTypeFormattingProvider: formattingOnTypeOptions,`. Return `undefined` from `formatOnTypeOptions` to keep on-type off.

### Pattern 1: `Formatter` DI slot + bounded handler override
**What:** Register `lsp.Formatter: (services) => new BBjFormatter(services)` in `bbj-module.ts` (the ninth `lsp` provider) so the capability is advertised; register `registerBoundedFormattingHandler(connection, shared, BBj)` in `main.ts` immediately after `startLanguageServer(shared)`, beside the three existing overrides. Re-registering after start is the established way to replace Langium's default (`main.ts:100-126`).
**When to use:** always; Langium's default `createRequestHandler` awaits `workspaceManager.ready`, then `getOrCreateDocument(uri)` (`language-server.js:500-521`).
**Constraints:** `BBjFormatter.formatDocumentOnType` returns `[]`; `formatOnTypeOptions` returns `undefined`. Resolve `services.compiler.BBjFormatService` lazily inside the methods (DI cycle safety). `BBjFormatter` is a thin adapter calling the same service with `document.textDocument`; it is live code only if the override were ever skipped, and it carries the capability.

### Pattern 2: Handler gate order (FMT-03, FMT-12)
`createBoundedFormattingHandler(deps)` with structural deps (`getTextDocument(uri)`, `format`), shaped like `createBoundedComposerCodeLensHandler` (`composer-codelens-handler.ts:71-113`). Order: parse uri -> `TextDocuments.get` -> missing => `[]` -> `languageId !== 'bbj'` => `[]` with **no interop call** -> call service -> `[]` on any throw. Use a positive allow-list (`=== 'bbj'`), not "not bbx-config", so any future language id is also excluded. No state wait, no `getOrCreateDocument`, no `WorkspaceManager` reference at all. The VS Code `documentSelector` includes `{ scheme: 'file', language: CONFIG_DOCUMENT_LANGUAGE_ID }` (`extension.ts:735-738`), so config documents do reach this handler.

### Pattern 3: Edit shape and stale guard (FMT-04, FMT-05)
- Capture `const version = textDocument.version` and `const sent = textDocument.getText()` before the call. Send `version: String(version)`.
- After the await, re-read `TextDocuments.get(uri)?.version`; if it differs (or the document is gone) return `[]`. The Phase 124 guard already rejects an echo that differs from the sent version.
- Whole-document answer: diff `sent` against `result.text` at **line granularity**, splitting on `\r\n|\r|\n`, keeping terminators in the comparison (so `eolCharacter` changes are real edits, per the carried-forward decision). Trim identical leading and trailing lines; convert both boundary **offsets** to positions with `TextDocument.positionAt`. `[]` when equal.
- Range answer: take the peer's single edit, read the old text of its range from the buffer, run the same helper on (old segment, `newText`) and rebase to the segment's start offset. `[]` when equal. This keeps "minimal" true for selections and is not clipping to the selection (D-12).
- Do **not** reuse `wholeDocumentChangeAsRange` for the LSP edit as is: it emits `end: { line: oldEnd, character: 0 }` where `oldEnd` can equal the number of split lines, which is past the last line for a file that does not end with a newline (`bbj-kept-check.ts:160-184`), and it splits on `\n` only, so a lone-CR file (live fact L8) becomes one giant "line". It is correct for its current consumer (internal line mapping) and should stay untouched.

### Pattern 4: Outcome -> action table and dedup ledger (D-01..D-04, D-08, D-11)

| Outcome from `formatProgram` | Result | Notice kind (D-02 scope) | Text |
|---|---|---|---|
| `ok` document / range | edits or `[]` | — | — |
| `cancelled` | `[]` | none, debug log only (D-14) | — |
| `timeout` (client or peer) | `[]` | `timeout` (connection generation) | "BBj formatting timed out. The file was not changed." |
| `unavailable` / `method-not-found` | `[]` | `requires-26.03` (connection generation) | D-11 verbatim |
| `unavailable` / `not-reachable` | `[]` | none, log only (D-04) | — |
| `failed` / `transport` | `[]` | none, log only (D-04) | — |
| `failed` / `size-cap` | `[]` | `too-large` (document+version) | "This file is too large for BBj formatting. The file was not changed." |
| `failed` / `protected-program` | `[]` | `protected` (document+version) | "This BBj program is protected and cannot be formatted." |
| `failed` / `format-failed`, `parser-exception`, and `malformed-result` | `[]` | `engine-failed` (connection generation) | "The BBj formatter could not process this file. The file was not changed. See the BBj output for details." |
| `failed` / `service-unavailable` | `[]` | `service-unavailable` (connection generation) | "The BBj formatting service is not available right now. The file was not changed." |
| `failed` / `denum-needed` | `[]` | `denum-needed` (document+version) | D-08 verbatim |
| `failed` / `invalid-params` | `[]` | none, `logger.warn` with the range, no toast | — |
| `invalid-settings` | `[]` | `invalid-settings` (settings revision) | `showMessageRequest`, Pattern 5 |
| `mixed-numbering` | `[]` | `mixed-numbering` (document+version) | Pattern 5 |

Ledger: a bounded insertion-ordered `Set<string>` of `${kind}|${scopeKey}` (cap ~256, drop oldest), where `scopeKey` is `${uri}@${version}`, `String(settingsRevision)` or `String(connectionGeneration)` per D-02. `connectionGeneration` is `JavaInteropService.connectionGeneration` (`java-interop.ts:132`), the same counter `BBjParserService` re-arms on; `JavaInteropTestService.simulateReconnect()` bumps it in tests. The first occurrence toasts and logs at warn, repeats log at debug: reuse `FailureLogCadence` (`java-interop-errors.ts:190-217`, `report(kind, line)` and `syncGeneration`). Do not rely on `TextDocuments.onDidClose` to prune (hand-built `{ get }`-only providers lack it, `bbj-document-builder.ts:65-72`); the cap does the job.

### Pattern 5: Actionable messages (D-05, D-06, D-07)
- Invalid settings: `connection.window.showWarningMessage(text, { title: 'Open Settings' })` returns `Promise<MessageActionItem | undefined>`; **do not await it in the format response** (fire-and-forget). On the action, `connection.sendNotification(OPEN_FORMATTER_SETTINGS_METHOD, { keys })`. Build `text` from the sanitized `problems[]` (`bbj.formatter.<setting>: <message>`, joined with `; `, cap the number of keys listed), never from the top-level `message` (it truncates with "and N more", live fact L5). The key strings are peer-supplied but already stripped and bounded by Phase 124 (`outcomeForClassifiedError`, `java-interop-program-lane.ts:93-103`).
- VS Code handler: `client.onNotification(OPEN_FORMATTER_SETTINGS_METHOD, ...)` -> `vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.formatter')`. Ignore the payload content (never feed peer text into a command argument). Push the disposable into `context.subscriptions` (the activation test asserts every notification disposable is there, `extension-activation.test.ts:209-231`).
- Mixed numbering: Warning "Mixed line numbering at line N" with a "Go to Line" action; on click `connection.window.showDocument({ uri, takeFocus: true, selection })` with `uri` the document's **own** request URI and `selection` at `line - 1` (0-based), clamped to the buffer's current line count at click time. VS Code's client maps `selection` and `takeFocus` to `showTextDocument` (`client.js:1007-1039`). When `line` is `undefined`, omit the line from the text and the action.
- Wording must be plain text (IntelliJ shows it unformatted) and contain no planning ids.

### Pattern 6: Settings flow (SET-02)
- Holder on the service: `set(raw: unknown)` runs `normalizeFormatterSettings`, compares the serialized snapshot with the previous one, bumps `revision` only on change.
- Feed from two places: `extension.ts` `initializationOptions.formatter` (startup; `bbj-ws-manager.ts` `onInitialize` reads it, same block as `compilerTrigger`, `bbj-ws-manager.ts:109-116`) and `configuration-change-handler.ts` (`BbjSettings.formatter?: Record<string, unknown>`, dep `setFormatterSettings`, applied before the `isWorkspaceInitialized` gate at line 127 so it needs no workspace). `gatedBbjSettings()` already copies the whole `bbj` section including `formatter` (`config-path-trust.ts:102-107`), so no change there.
- Normalizer rules (all from D-09/D-10 plus L2/L5/L6): output exactly the 15 keys, each always present; start from the defaults table with `indentWidth: 2`; for each key take the raw value when it is a string, finite number or boolean; `undefined` and `null` -> default (never sent as null); an object or array for a known key -> forward `JSON.stringify(value)` so bbj-ls answers `-33007` naming the key instead of the client silently using a default (a misconfiguration must be visible); `splitSingleLineIF` is read only when `splitSingleLineIf` is absent; `javaPath` and every other key are dropped. Ignore LSP `FormattingOptions` completely.
- The declared `package.json` defaults (`indentWidth` 2, `removeLineContinuation`, `keywordsToUppercase`, `splitSingleLineIF` false, `package.json:410-433`) always appear in VS Code's `bbj.formatter` object, so the old key is present with `false` even for users who never set it; because the new key wins when present and both default to `false`, this is harmless.

### Pattern 7: IntelliJ single switch (IJF-01)
LSP4IJ 0.21.0 (git tag `0.21.0`, same source as the pinned jar):
- `LSPFormattingFeature.isEnabled(file)` is the gate the services use first; `AbstractLSPDocumentFeature.isEnabled` documents "called before starting the language server". `AbstractLSPFormattingService.canSupportFormatting` returns `false` when `!formattingFeature.isEnabled(file)` (`AbstractLSPFormattingService.java:125-129`), and `LSPFormattingSupport.findFormattingServer` only considers a server `if (formattingFeature.isEnabled(file))`, then calls `isFormattingSupported(file)` / `isRangeFormattingSupported(file)` directly (`LSPFormattingSupport.java:140-150`). **`isSupported(file)` is not consulted by either**, only by the client-side on-type handler. So the existing `LSPDocumentLinkFeature { isSupported -> false }` pattern would not switch formatting off.
- Implementation: one constant, e.g. `private static final boolean LSP_FORMATTING_ENABLED = false;` in `BbjLanguageServerFactory`, and `.setFormattingFeature(new LSPFormattingFeature() { ... })` overriding `isEnabled`, `isSupported`, `isFormattingSupported` and `isRangeFormattingSupported`, each returning `LSP_FORMATTING_ENABLED && super.<method>(file)` (the `&&` short-circuit keeps `super` from touching the capability registry while off). `setFormattingFeature` is `public final LSPClientFeatures setFormattingFeature(@NotNull LSPFormattingFeature)` (`LSPClientFeatures.java:907` at the tag) and returns the builder.
- Fence tests that must change in the same commit: `Lsp4ijOverrideSiteSourceGuardTest.createClientFeaturesBuildsExactlyOneDocumentLinkFeatureThenOneCompletionFeatureWithOneInitializeParamsOverride` (asserts `setDocumentLinkFeature(` once, `setCompletionFeature(` once and their order, lines 106-119; add `setFormattingFeature(` once and pin the constant to `false`); `Lsp4ijImportAllowlistTest` (factory entry at lines 55-57 gains `"LSPFormattingFeature"`; keeping the anonymous subclass inline in the factory avoids a thirteenth allowlist file and leaves `assertEquals(12, ALLOWLIST.size())` at line 251 intact); `Lsp4ijCouplingCanaryTest` (add `LSPFormattingFeature` to the experimental-marker test at lines 69-80 because the class is `@ApiStatus.Experimental`, and add `setFormattingFeature`, `isEnabled`, `isFormattingSupported`, `isRangeFormattingSupported` reflective signature pins beside lines 135-154).
- Server notification question (D-05): `BbjLanguageClient.java` states that its no-op `@JsonNotification("bbj/bbjcplAvailability")` handler "exists only so the vendor stops logging an unsupported-notification warning on every server start", so an unhandled server notification produces a log warning in LSP4J, not a dialog. In this phase it is also unreachable on IntelliJ: the notification is sent only after a click on a prompt that only a format request creates, and IntelliJ sends none. Recommendation: do not add an IntelliJ handler now (keeps the `BbjLanguageClient` guards untouched).

### Anti-Patterns to Avoid
- **Awaiting the click inside the format handler:** blocks the save on a human (D-07).
- **Overriding only `isSupported` for IntelliJ:** leaves Reformat Code enabled (Pattern 7).
- **Forwarding the raw `bbj.formatter` object:** the stray `javaPath` and the old `splitSingleLineIF` key give `-33007` on every format (L2).
- **Reading settings per request via `workspace/configuration`:** returns null under LSP4IJ for this plugin; use the two push channels (`.planning/research/ARCHITECTURE.md` §4).
- **`getOrCreateDocument` or any document-state wait in the handler:** disk load of a client-supplied URI, and a cold-workspace stall.
- **Planning ids in source/test comments** (`D-05`, `FMT-09`, plan numbers): the project's register rule; describe behaviour in plain words.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Peer transport, deadline, cancel-always, availability latch | A second socket or `Promise.race` timeout in the service | `JavaInteropService.formatProgram(params, token)` | Phase 124 verified it never rejects, never trips the breaker, and latches per method |
| Error classification | A new code switch | `ProgramOutcome` kinds (already produced by `classifyInteropError`) | One classifier shared with the parser service |
| Response validation | Re-checking `text`/`edits`/ranges | The Phase 124 guard output | An `ok` outcome only carries a freshly built validated value |
| Warn-then-debug log cadence | A new counter | `FailureLogCadence` | Same behaviour the parser service uses |
| Offset to position conversion | Hand-written line/column math | `TextDocument.positionAt/offsetAt` | Handles `\r\n`, lone `\r`, clamps, UTF-16 columns |
| Line diff | `diff` package, Myers/LCS | single-hunk prefix/suffix trim over lines | No dependency, O(n), never splits a surrogate pair; VS Code re-minimises (Sources) |
| Opening Settings UI | Custom webview | `workbench.action.openSettings` with query `bbj.formatter` | Existing pattern at `extension.ts:572` uses the same command |
| Jumping to a line | Server tracking of the editor | `window/showDocument` with `selection` | Implemented by both clients (`client.js:1007-1039`; LSP4IJ per research) |

**Key insight:** every hard part (wire, validation, cancellation, latching) is already done and tested; the new code is policy (which message, when, for how long) and a small amount of pure text math. Keep policy in the service so the handler and the `Formatter` adapter stay thin.

## Runtime State Inventory

CUT-01 is a hard cut-over of a registered provider and a settings key, not a rename, but stale state can survive it.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None - the legacy formatter kept only an in-memory map of unsaved content (`document-formatter.ts`), nothing persisted | none |
| Live service config | None - no external service references the provider | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts / installed packages | `bbj-vscode/tools/formatter/**` jars and `document-formatter.ts` still ship in the VSIX until Phase 127 deletes them; they are dead code after this phase because nothing imports `document-formatter.ts` | none now; record that the VSIX does not shrink until 127. Installed `~/.ext-test` bundle predates the change, so `installed-extension-e2e` keeps failing for the known environment reason |
| User settings | `bbj.formatter.javaPath` and `bbj.formatter.splitSingleLineIF` remain declared in `package.json` this phase. `javaPath` is silently dropped by the normalizer; `splitSingleLineIF` is mapped (D-09) | normalizer test for both; Phase 127 owns the declaration changes |

## Common Pitfalls

### Pitfall 1: Langium's default handler is still wired if the override is forgotten
**What goes wrong:** `addFormattingHandler` is installed by `startLanguageServer`; without the post-start override the first Format on a cold server waits for the whole workspace (tens of seconds measured in earlier phases).
**How to avoid:** register `registerBoundedFormattingHandler` after `startLanguageServer(shared)` in `main.ts`; unit-test that the registered handler resolves while `WorkspaceManager.ready` is a never-settling promise; add a capability test via `buildInitializeResult` (pattern at `test/on-save-trigger.test.ts:62-72`) asserting both providers `true` and `documentOnTypeFormattingProvider` undefined.
**Warning signs:** first format after window open is slow or cancelled; a handler test that needs a built `LangiumDocument`.

### Pitfall 2: IntelliJ switch that does not switch (see Pattern 7)
**How to avoid:** override `isEnabled` (the first gate) and both `is*FormattingSupported` methods; pin the constant and the overrides in the source-guard test; verify on the built zip that Reformat Code is not offered (UAT).

### Pitfall 3: FMT-09 cannot be exercised live in this phase
**What goes wrong:** the plan or UAT assumes a mixed-numbering file produces the "mixed line numbering at line N" message. Live fact L4: without `allowDenum` a mixed file gets `-33006`, so the user sees the DENUM-needed text.
**How to avoid:** build and unit-test the `-33008` path through `JavaInteropTestService` (`{ error: { code: -33008, message, data: { line } } }`) and the real-wire loopback suite; in UAT expect the DENUM-needed message for a mixed file and record that the live `-33008` check moves to Phase 126 when `allowDenum` is sent.

### Pitfall 4: A range request cancels a pending whole-document request
**What goes wrong:** supersession is keyed per method by `canonicalName`; live fact L10 shows a range request cancels the save-time whole-document format (`-32800`, silent `[]`), so the file saves unformatted.
**How to avoid:** whole document `canonicalName = URI.parse(uri).fsPath` (same as `requestLiveParse`, `bbj-parser-service.ts:221-227`); range requests `canonicalName = fsPath + '#range:' + startLine + '-' + endLine`. `canonicalName` "keys supersession only" for `formatProgram` (`/home/coder/repos/bbj-ls/README.md:215`), verified live with the suffix (L10).

### Pitfall 5: CUT-01 breaks two activation tests and the subscription count
**What goes wrong:** removing `registerDocumentFormatter` makes `extension-activation.test.ts` ("the formatting provider and every notification handler are disposed...", asserts `formatterMock` called once, lines 209-231) and `activation-command-coverage.test.ts` fail; the latter lists `'formatter'` in its expected trace (line 264) and pins `const EXPECTED_SUBSCRIPTIONS_LENGTH = 32;` (line 278). The new `bbj/openFormatterSettings` handler adds one subscription and one `notification:` trace entry, so the count net-stays at 32 only if both edits are made.
**How to avoid:** update both tests deliberately: assert `registerDocumentFormattingEditProvider` is **not** called (the "exactly one formatter" proof), add the new notification to the expected trace, recompute the length. Other tests still mock `registerDocumentFormattingEditProvider` / `formatter: {}`; leave those mocks (harmless) - they are removed with the file in Phase 127. `document-formatter.ts`, its tests and `no-shell-command-construction.test.ts`'s importer list stay valid because the file still exists.

### Pitfall 6: A format-on-save can still wait on a wedged peer
**What goes wrong:** SC2 says the save is never delayed, but a peer that stops answering holds the request for the 15 s client deadline, and an unreachable-host lane open can take up to the connect timeout once, then a 5 s cool-down answers `not-reachable` instantly (`java-interop-program-lane.ts:29,37`).
**How to avoid:** the handler cannot tell save from manual format, so it cannot use a tighter save-only budget; honour the token (VS Code cancels the save participant), keep the latch fast path, and document the residual worst case. See Open Question 1.

### Pitfall 7: Dedup keyed on something that never repeats or always repeats
**What goes wrong:** keying content kinds on `uri` alone suppresses the message after an edit that is still too large; keying env kinds on version re-toasts every keystroke-save.
**How to avoid:** key exactly per D-02 (Pattern 4) and unit-test each re-arm rule: same doc+version twice -> one toast; edit -> toast again; settings change after `-33007` -> toast again; `simulateReconnect()` -> env kinds toast again, content kinds do not.

### Pitfall 8: `bbj.formatter` values for undeclared keys may not reach the server
**What goes wrong:** D-10 requires forwarding user-set values for keys not yet declared in `package.json` (only 4 of the 15 are declared until 127). Whether `getConfiguration('bbj').get('formatter')` and the `didChangeConfiguration` push include undeclared user keys is VS Code behaviour not verified here.
**How to avoid:** mark `[ASSUMED]` (A1); UAT step: set `"bbj.formatter.indentCharacter": "TAB"` in `settings.json` and confirm a tab-indented result; if absent, the fallback is reading the raw section through `workspace.getConfiguration().inspect()` in `extension.ts`.

### Pitfall 9: Invalid-settings "Open Settings" cannot show undeclared keys
**What goes wrong:** the Settings UI filtered to `bbj.formatter` lists only declared settings. Until 127 that is 4 keys, so a bad value for an undeclared key (for example `indentCharacter`) is not visible in the UI, only in `settings.json`.
**How to avoid:** the message already names the full `bbj.formatter.<key>`; optionally have the client open `workbench.action.openSettingsJson` when none of the named keys is declared (client can check `context.extension.packageJSON.contributes.configuration`). Raise as Open Question 2; D-05 as written is satisfiable without it.

### Pitfall 10: Hand-built test doubles lack events and recording
**What goes wrong:** `JavaInteropTestService.formatProgram` (`test/bbj-test-module.ts:208-213`) does not record the params it received and cannot delay an answer, so SET-02 ("only 15 keys reach bbj-ls"), the stale-version race and cancel tests cannot be written against it as is.
**How to avoid:** Wave 0: add `formatProgramCalls: FormatProgramParams[]` and a script form that returns a controllable deferred (and still routes through the production guard/classifier). The double also does not emulate availability latches (comment at `bbj-test-module.ts:203-207`), so FMT-11 repeat behaviour is covered by the service's own ledger test and the lane suites.

### Pitfall 11: Tokenized programs surface as "engine failure"
**What goes wrong:** live fact L9: a `<<bbj>>` text is `-33009`, so the user sees the engine-failure message for a binary program. FMT-12 does not require handling it.
**How to avoid:** optional one-line pre-check in the service (`text.startsWith('<<bbj>>')` -> `[]` with a debug log, no peer call), recommended because it is free; otherwise accept the engine-failure toast.

### Pitfall 12: Messages from the peer as user text
**What goes wrong:** bbj-ls strings reach a toast. They are already control-character-stripped and bounded by Phase 124 (`sanitizePeerText`, bounded to `MAX_PEER_ERROR_LENGTH`), but a long list of keys can still produce a very long toast.
**How to avoid:** cap listed keys (for example first 5, then "and N more"), never include document text, never log the request.

## Code Examples

### 1. Minimal single-hunk line edit (FMT-04, FMT-05)
```typescript
// Pure; positions come from the document, so they are always in range and UTF-16 correct.
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { TextEdit } from 'vscode-languageserver';

const LINE_BREAK = /\r\n|\r|\n/g;

/** Splits keeping each terminator, so two lines compare equal only if their endings match too. */
function splitKeepingBreaks(text: string): string[] {
    const lines: string[] = [];
    let start = 0;
    for (const match of text.matchAll(LINE_BREAK)) {
        const end = match.index! + match[0].length;
        lines.push(text.slice(start, end));
        start = end;
    }
    lines.push(text.slice(start));
    return lines;
}

/**
 * The smallest whole-line replacement turning `document.getText().slice(start, end)` into `newText`,
 * or `[]` when they are equal. `start`/`end` are offsets into the document (0 and length for a
 * whole-document format).
 */
export function minimalLineEdit(document: TextDocument, start: number, end: number, newText: string): TextEdit[] {
    const oldText = document.getText().slice(start, end);
    if (oldText === newText) {
        return [];
    }
    const oldLines = splitKeepingBreaks(oldText);
    const newLines = splitKeepingBreaks(newText);
    let prefix = 0;
    const max = Math.min(oldLines.length, newLines.length);
    while (prefix < max && oldLines[prefix] === newLines[prefix]) { prefix++; }
    let oldEnd = oldLines.length;
    let newEnd = newLines.length;
    while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd - 1] === newLines[newEnd - 1]) { oldEnd--; newEnd--; }
    const startOffset = start + oldLines.slice(0, prefix).join('').length;
    const endOffset = start + oldLines.slice(0, oldEnd).join('').length;
    return [{
        range: { start: document.positionAt(startOffset), end: document.positionAt(endOffset) },
        newText: newLines.slice(prefix, newEnd).join('')
    }];
}
```
Property test: applying the returned edit with `TextDocument.applyEdits` reproduces `newText` for random line-structured inputs, including inputs without a trailing newline, CRLF, lone CR and astral characters.

### 2. Settings normalizer (SET-02, D-09, D-10)
```typescript
export const FORMATTER_DEFAULTS = {
    indentWidth: 2,                       // client default; bbj-ls default is 4
    indentCharacter: 'SPACE', keywordsToUppercase: false, removeLineContinuation: false,
    splitSingleLineIf: false, splitInlineComments: false, splitInlineLabelComment: false,
    collapseMultiLine: false, eolCharacter: 'KEEP', ifClosingKeyword: 'KEEP', ifKeywordCase: 'KEEP',
    parameterLayout: 'KEEP_INITIAL_LAYOUT', operatorSpacing: 'KEEP',
    indentLabelBlocks: false, blankLineAfterReturn: false,
} as const;

export function normalizeFormatterSettings(raw: unknown): Record<string, string | number | boolean> {
    const source = (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
    const out: Record<string, string | number | boolean> = { ...FORMATTER_DEFAULTS };
    for (const key of Object.keys(FORMATTER_DEFAULTS)) {
        let value = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
        if (value === undefined && key === 'splitSingleLineIf') {
            value = source['splitSingleLineIF'];        // legacy spelling, used only when the new key is absent
        }
        if (value === undefined || value === null) { continue; }               // keep the default, never send null
        if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
            out[key] = value;
        } else {
            out[key] = JSON.stringify(value);                                   // make bbj-ls reject it by name
        }
    }
    return out;                                                                 // javaPath and unknown keys never copied
}
```

### 3. Service core (outline)
```typescript
async format(textDocument: TextDocument, range: Range | undefined, token: CancellationToken): Promise<TextEdit[]> {
    const version = textDocument.version;
    const sent = textDocument.getText();
    const fsPath = URI.parse(textDocument.uri).fsPath;
    const params: FormatProgramParams = {
        text: sent, version: String(version), settings: this.settings.snapshot(),
        canonicalName: range ? `${fsPath}#range:${range.start.line}-${range.end.line}` : fsPath,
        ...(range ? { range } : {}),                       // allowDenum is deliberately never set here
    };
    const outcome = await this.javaInterop.formatProgram(params, token);
    if (this.currentVersion(textDocument.uri) !== version) { return []; }   // edited while formatting
    switch (outcome.kind) {
        case 'ok': return outcome.result.scope === 'document'
            ? minimalLineEdit(textDocument, 0, sent.length, outcome.result.text)
            : this.rangeEdits(textDocument, outcome.result.edits);
        case 'cancelled': logger.debug('format cancelled'); return [];
        default: this.report(outcome, textDocument); return [];            // table in Pattern 4
    }
}
```
`this.currentVersion` reads `TextDocuments.get(uri)?.version`. `outcome.result` is a freshly built validated object, so no further shape checks are needed.

### 4. IntelliJ switch (Pattern 7)
```java
// BbjLanguageServerFactory: the single place that decides whether IntelliJ offers LSP formatting.
private static final boolean LSP_FORMATTING_ENABLED = false;
...
.setFormattingFeature(new LSPFormattingFeature() {
    @Override public boolean isEnabled(@NotNull PsiFile file) { return LSP_FORMATTING_ENABLED && super.isEnabled(file); }
    @Override public boolean isSupported(@NotNull PsiFile file) { return LSP_FORMATTING_ENABLED && super.isSupported(file); }
    @Override public boolean isFormattingSupported(@NotNull PsiFile file) { return LSP_FORMATTING_ENABLED && super.isFormattingSupported(file); }
    @Override public boolean isRangeFormattingSupported(@NotNull PsiFile file) { return LSP_FORMATTING_ENABLED && super.isRangeFormattingSupported(file); }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side jar formatter (`BBjCFCli.jar`, Java process, 750 ms warning) | bbj-ls `formatProgram` in BBjServices via the shared language server | v4.9 (this phase) | One implementation for both IDEs; no Java launch; the 750 ms warning logic is not ported |
| Provider registered for every scheme of language `bbj` | Server capability registered for `{scheme:'file'}` documents only | this phase | Untitled and virtual-scheme BBj documents lose formatting (deferred FMT-13); note in the changelog |
| Single whole-file replace with `Range(0,0,lineCount,0)` | Minimal line edit with document-derived positions | this phase | Cursor, folding and undo survive; no out-of-range positions for JVM clients |

**Deprecated/outdated:**
- `registerDocumentFormatter` / `DocumentFormatter` registration: removed here; the file is deleted in Phase 127.
- The old "multiple formatters" prompt risk: gone once only the server-advertised provider exists.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `workspace.getConfiguration('bbj').get('formatter')` and the `didChangeConfiguration` push include user-set keys that are not declared in `package.json` | Pitfall 8, Pattern 6 | D-10's "declared or not" forwarding fails for 11 of 15 keys until Phase 127; fix is to read the raw section via `inspect()` |
| A2 | VS Code formats `editor.formatOnSaveMode: modifications` multi-range requests one range at a time through `provideDocumentRangeFormattingEdits` (the fallback path), and a pending `window/showMessageRequest` toast that is never clicked stays harmlessly pending | Pattern 4, Pitfall 4 | Concurrent range requests would still be safe because ranges get distinct `canonicalName` suffixes; a leaked promise holds only a closure |
| A3 | VS Code's save participant gives up on a slow provider after its own timeout (about 60 s default) and cancels the token | Pitfall 6 | If the participant waits unbounded, a wedged peer delays a save up to the 15 s deadline only (Phase 124 backstop), not longer |
| A4 | Message wordings in Pattern 4 (except the two verbatim texts) | Pattern 4 | Cosmetic; planner may reword |
| A5 | The notification method name `bbj/openFormatterSettings` and payload `{ keys: string[] }` | Pattern 5 | Cosmetic; discretion item. Needs one shared constant file so server and extension cannot drift |
| A6 | A single-hunk edit is "minimal" enough for VS Code's folding/cursor preservation because the editor re-minimises provider edits | Pattern 3 | If UAT shows lost folding, upgrade to a multi-hunk diff (also needed before an IntelliJ "supported" verdict, which applies edits as-is per `.planning/research/PITFALLS.md` Pitfall 4) |
| A7 | LSP4J logs, rather than errors on, an unsupported server notification (taken from the plugin's own comment, not from LSP4J source) | Pattern 7 | If it surfaced to users, add a no-op `@JsonNotification` to `BbjLanguageClient`; unreachable in this phase anyway |

## Open Questions

1. **Worst-case save delay with a wedged peer**
   - What we know: the lane answers instantly for an unavailable method and for a cooled-down unreachable peer; a wedged peer holds a request for the 15 s deadline; a cancelled token returns immediately.
   - What's unclear: whether the "never delays" success criterion should also bound a wedged peer more tightly than 15 s.
   - Recommendation: leave the Phase 124 deadline (it is a locked decision); document the residual worst case in UAT notes. A save-only budget is impossible because the server cannot distinguish a save from a manual format.

2. **"Open Settings" for undeclared keys (until Phase 127)**
   - What we know: the Settings UI filter `bbj.formatter` shows only declared keys.
   - What's unclear: whether to special-case `settings.json`.
   - Recommendation: implement D-05 as written; optionally open `workbench.action.openSettingsJson` when none of the named keys is declared. Cheap, client-only.

3. **`eolCharacter` of `LF`/`CRLF` is not idempotent in an editor with the opposite EOL**
   - What we know: the carried-forward decision compares terminators, so a forced EOL yields a real edit; VS Code normalises inserted text to the model EOL (assumed), so the next format yields the same edit again and the buffer is dirtied each time. Default `KEEP` is idempotent (L3, L8). The setting is undeclared until 127.
   - What's unclear: whether Phase 127 should document that `LF`/`CRLF` cannot change a file's endings in either IDE (`.planning/research/PITFALLS.md` Pitfall 5 recommends normalising the returned text to the sent EOL before diffing).
   - Recommendation: keep the locked behaviour here, add a KEEP idempotency test for LF, CRLF and lone-CR documents, and carry the question to Phase 127/130.

4. **Mixed-numbering live coverage**
   - What we know: not reachable live without `allowDenum` (L4).
   - Recommendation: accept; cover by double and loopback wire tests now, live in Phase 126.

5. **Tokenized pre-check (Pitfall 11)**
   - Recommendation: include the one-line local check; it avoids a misleading "engine failure" toast.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, vitest, scratch probes | ✓ | v24.20.0 (langium generate needs Node 22 per project memory; no grammar change here) | — |
| BBjServices interop peer on :5008 serving `formatProgram` | live checks, latency | ✓ (probed) | answers `formatProgram` and `-33006/7/8/9` | live tests probe first and skip |
| `bbj-vscode/out/language/main.cjs` | `bbj-intellij` Gradle build/test, E2E spawn | ✓ | built | `npm run build` |
| JDK / Gradle wrapper | IntelliJ fence tests | ✓ | openjdk 25.0.4.1 on host; wrapper provisions JDK 17 for the build | — |
| `~/.ext-test` VS Code | desktop UAT | ✓ (directory present) | not probed | hand UAT from a built VSIX |
| BBj older than 26.03 | FMT-11 live check | ✗ | — | point `bbj.interop.port` at the in-repo `java-interop/` mirror (`./gradlew run`), which serves none of the program methods and answers `-32601` (`.planning/research/PITFALLS.md` Pitfall 10) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** an older BBj (use the `java-interop/` mirror).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 (VS Code side); JUnit Jupiter via BOM 6.1.3 (IntelliJ) |
| Config file | `bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']`); `bbj-intellij/build.gradle.kts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/bbj-format-settings.test.ts test/bbj-format-edit.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (judge on `numFailedTests`; only `installed-extension-e2e` is a known environment failure) |
| IntelliJ | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` (needs `npm run build` first) |
| Gates | `npm run lint`, `npm run typecheck:test` from `bbj-vscode/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FMT-01 | Document `text` becomes a line edit; range edits pass through; params carry text, version string, settings, `fsPath` canonicalName, no `allowDenum` | unit (scripted double) | `npx vitest run test/bbj-format-service.test.ts` | ❌ Wave 0 |
| FMT-02 | Range request sends `range` and suffixed `canonicalName`; peer edit wider than selection accepted | unit | same file | ❌ Wave 0 |
| FMT-03 | Handler resolves with `WorkspaceManager.ready` never settling; `cancelled` -> `[]` with no toast; latched unavailable returns without delay | unit | `npx vitest run test/bbj-formatting-handler.test.ts test/bbj-format-service.test.ts` | ❌ Wave 0 |
| FMT-03 | Capability: both providers `true`, on-type `undefined` | unit (`buildInitializeResult`) | `npx vitest run test/bbj-formatter-capability.test.ts` | ❌ Wave 0 |
| FMT-04 | Equal text -> `[]`; KEEP idempotent for LF, CRLF, lone-CR; live formatted-twice | unit + live | `npx vitest run test/bbj-format-edit.test.ts`; `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | ❌ Wave 0 |
| FMT-05 | Edit applied with `TextDocument.applyEdits` reproduces new text; positions in range for no-trailing-newline, CRLF, CR, astral; version changed during the await -> `[]` | unit (property + race with deferred double) | `npx vitest run test/bbj-format-edit.test.ts test/bbj-format-service.test.ts` | ❌ Wave 0 |
| FMT-08 | `-33007` -> one `showMessageRequest` naming `bbj.formatter.<key>` each; action sends the notification; re-arms on settings revision only | unit with fake messenger | `npx vitest run test/bbj-format-service.test.ts` | ❌ Wave 0 |
| FMT-09 | `-33008` -> message with line N and "Go to Line" -> `showDocument` selection line N-1 (clamped); `line: undefined` variant | unit + loopback wire | same file; existing `java-interop-program-wire.test.ts` covers framing | ❌ Wave 0 |
| FMT-10 | Each kind in Pattern 4: one toast per scope, log-only repeats; re-arm per D-02; transport/not-reachable -> no toast | unit table test | `npx vitest run test/bbj-format-service.test.ts` | ❌ Wave 0 |
| FMT-11 | `unavailable/method-not-found` -> D-11 text once per generation (`simulateReconnect()` re-arms); `not-reachable` text differs; live via `java-interop/` mirror | unit + manual | same file | ❌ Wave 0 |
| FMT-12 | `bbx-config`, other language ids, missing document -> `[]` and zero interop calls | unit | `npx vitest run test/bbj-formatting-handler.test.ts` | ❌ Wave 0 |
| SET-02 | Exactly 15 keys out, all present, `indentWidth` 2, `javaPath`/null/unknown dropped, `splitSingleLineIF` mapped, object value stringified; revision bumps only on change; `didChangeConfiguration` and `initializationOptions` both feed it | unit | `npx vitest run test/bbj-format-settings.test.ts test/configuration-change-handler.test.ts` | ❌ Wave 0 (second file ✅ edit) |
| SET-02 | Defaults accepted by the real peer (no `-33007`) | live | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` (extend) | ✅ extend |
| CUT-01 | `registerDocumentFormattingEditProvider` not called on activation; new notification handler registered and disposed | unit | `npx vitest run test/extension-activation.test.ts test/activation-command-coverage.test.ts` | ✅ edit |
| IJF-01 | Factory sets a formatting feature once; constant is `false`; four overrides gated; canary and allowlist updated | JUnit source guard + reflection | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` | ✅ edit (3 existing tests) |

### Sampling Rate
- **Per task commit:** the quick run command for the touched module plus the two activation tests when `extension.ts` changes.
- **Per wave merge:** `npx vitest run --maxWorkers=2`, `npm run lint`, `npm run typecheck:test`.
- **Phase gate:** full vitest green (`numFailedTests: 0`), `npm run build`, then `bbj-intellij ./gradlew test` (the vitest gates do not cover the LSP4IJ fence tests), then the UAT below from VSIX and IntelliJ zip built from the final tree after code-review fixes.

### Wave 0 Gaps
- [ ] `test/bbj-format-settings.test.ts`, `test/bbj-format-edit.test.ts`, `test/bbj-format-service.test.ts`, `test/bbj-formatting-handler.test.ts`, `test/bbj-formatter-capability.test.ts` - the new coverage above
- [ ] Extend `JavaInteropTestService` (`test/bbj-test-module.ts`): record `formatProgram` params; add a deferred/controllable answer script; keep the production guard and classifier in the path
- [ ] A recording fake messenger (toast, request with action, showDocument, notification) injected into `BBjFormatService`
- [ ] Update `test/configuration-change-handler.test.ts` deps helper (line 49 area) with `setFormatterSettings: vi.fn()` and a dispatch test
- [ ] Update `test/extension-activation.test.ts` and `test/activation-command-coverage.test.ts` (Pitfall 5)
- [ ] Extend `test/functional/program-live.test.ts` (probe-first, skip when unavailable): full 15-key default set accepted; first-format latency on a cold lane through the production client, printed with the existing `program-live:` prefix to record the D-13 numbers
- [ ] IntelliJ: edit `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijImportAllowlistTest`, `Lsp4ijCouplingCanaryTest`

### Manual-only checks (justification: needs a real editor)
- VS Code from the built VSIX against live 26.03 BBjServices: "Format Document With..." lists one BBj formatter; Format Document, Format Selection, format-on-save; cursor, folding and undo after a format; formatting twice leaves the file unmodified; type while a large file formats (edit wins); invalid `indentWidth` shows the named-key message and "Open Settings"; `.bbx` config document is untouched by Format Document; the `java-interop/` mirror shows the "requires BBj 26.03" message once. Set `bbj.formatter.indentCharacter` to `TAB` to settle A1.
- IntelliJ zip: Reformat Code and Actions on Save do nothing for BBj files; no LSP formatting item enabled.
- D-13 record: the raw-socket numbers in L11 plus the production-client number from the live test, and the decision "stay lazy".

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | loopback peer, no new trust boundary |
| V5 Input Validation | yes | 15-key whitelist with typed values (settings); Phase 124 guard for the peer's answer; handler language-id allow-list; client ignores the notification payload |
| V6 Cryptography | no | — |
| V7 Error handling and logging | yes | never log document text; log lines carry kind and bounded message only; reuse `FailureLogCadence` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Peer-supplied key/message text shown in a toast (injection, flooding) | Tampering | already stripped and bounded by Phase 124; cap listed keys; plain text only |
| Peer-supplied or request-supplied URI used by `showDocument` | Spoofing / Tampering | use the document's own request URI; clamp the line; never a URI from peer data |
| Notification payload turned into a client command argument | Tampering | client opens a fixed query (`bbj.formatter`); payload is not interpolated |
| Stale edit overwriting newer typing | Tampering | version captured before and compared after the await; `[]` on mismatch |
| Oversized or malformed peer answer reaching the editor | DoS / Tampering | Phase 124 guard (size cap, overlapping in-document range); outcome `ok` carries a fresh validated object only |
| Client-supplied URI loaded from disk | Information disclosure | handler reads `TextDocuments` only; no `getOrCreateDocument` |
| Format request storm blocking the UI | DoS | per-request deadline and cancel-always (Phase 124); latch makes unavailable repeats instant; dedup ledger bounded |

## Project Constraints (from CLAUDE.md)

- Work in `bbj-vscode/`; run vitest as `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` (cwd matters for fixtures); use `--maxWorkers=2` for the whole suite.
- Never edit generated Langium files; this phase has no grammar change, so `langium:generate` is not needed.
- Tests: use `createBBjTestServices` (hermetic, `JavaInteropTestService`); never `DocumentBuilder.build` in tests (reaches CPL and :5008); use `parseHelper`/`TextDocuments` fixtures.
- CI gates: `npm run lint`, `npm run typecheck:test`, `npm test`; workflow checkers only if a workflow changes (none here).
- IntelliJ: run `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` after `npm run build`; LSP4IJ fence tests change with the switch.
- Shell rules: absolute paths only, no `cd ... && grep`, no blind recursive scans, never read `.env*`/`*.pem`/`*.key`, `git add <exact path>` only, no `git stash`, prefer `git -C`.
- Source/test comments must not contain plan, decision or requirement ids; issue numbers are fine. Describe behaviour in plain words.
- `lsp` service group documentation in CLAUDE.md lists eight providers beside `CompletionProvider`; adding `Formatter` makes it nine, `compiler` gains `BBjFormatService`. The documentation update belongs to Phase 130; do not let it block this phase.
- UAT: build both the VSIX and the IntelliJ zip before the first manual test and again at phase end from the final tree.
- Commits: add the attribution trailers with plain git (the gsd commit helper omits them); a pushed `main` publishes previews, so the provider removal, the server capability and the IntelliJ switch ship in one change.

## Sources

### Primary (HIGH confidence)
- `/home/coder/repos/bbj-ls/README.md` ("JSON-RPC methods", `formatProgram`, error table) and `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` lines 125-175 (settings reference, message forms) - read this session
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/`: `java-interop-program-types.ts`, `java-interop-errors.ts`, `java-interop-program-lane.ts`, `java-interop.ts`, `bbj-kept-check.ts`, `bbj-parser-service.ts`, `bbj-notifications.ts`, `composer-codelens-handler.ts`, `bbj-hover-handler.ts`, `configuration-change-handler.ts`, `bbj-ws-manager.ts`, `main.ts`, `bbj-module.ts` - read this session
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/extension.ts` (lines 470-612, 680-792), `package.json` (formatter keys), `config-path-trust.ts`, `composer-lens-contract.ts` - read this session
- `bbj-vscode/node_modules/langium/lib/lsp/language-server.js` and `lib/lsp/formatter.d.ts`; `node_modules/vscode-languageclient/lib/common/client.js:1007-1039` - read this session
- LSP4IJ git tag `0.21.0` at `/home/coder/repos/lsp4ij`: `LSPFormattingFeature.java`, `AbstractLSPDocumentFeature.java`, `AbstractLSPFormattingService.java`, `LSPFormattingSupport.java`, `LSPOnTypeFormattingFeature.java`, `LSPClientSideOnTypeFormattingTypedHandler.java` (via `git show 0.21.0:...`); bbj-intellij tests `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijImportAllowlistTest`, `Lsp4ijCouplingCanaryTest`, `BbjLanguageServerFactory.java`, `BbjLanguageClient.java`
- Live probes against :5008 on 2026-10-01 (scratch scripts listed above)
- `.planning/phases/124-interop-client/124-VERIFICATION.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`

### Secondary (MEDIUM confidence)
- [CITED: github.com/microsoft/vscode `src/vs/editor/contrib/format/browser/format.ts` (main)] `formatDocumentWithProvider` and `formatDocumentRangesWithProvider` both run provider edits through `workerService.computeMoreMinimalEdits(model.uri, rawEdits)`; multi-range falls back to per-range `provideDocumentRangeFormattingEdits` when `provideDocumentRangesFormattingEdits` is absent

### Tertiary (LOW confidence)
- Assumptions A1-A3, A6, A7 above

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; versions read from installed packages
- Architecture: HIGH - follows three existing bounded-handler precedents; wire facts probed live
- Pitfalls: HIGH for the LSP4IJ `isEnabled` finding, the mixed-numbering finding and the `canonicalName` supersession (all verified from source or live); MEDIUM for undeclared-key forwarding (A1)

**Research date:** 2026-10-01
**Valid until:** 2026-10-31 for repo facts (the code is mid-milestone and moves per phase); the bbj-ls contract is stable for the milestone (bbj-ls is not changed in v4.9)
