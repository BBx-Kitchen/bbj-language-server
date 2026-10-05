# Architecture Research — v4.9 bbj-ls DENUM & Format Migration

**Domain:** Integrating `formatProgram` / `denumProgram` (bbj-ls, BBj 26.03) into an existing dual-IDE Langium language server
**Researched:** 2026-10-01
**Confidence:** HIGH for integration points (every claim is from a file read this session: bbj-vscode/src, bbj-intellij/src, bbj-ls README + `InteropService.java`, Langium 4.3.1 and LSP4IJ 0.21.0 sources). MEDIUM for the two items marked "verify" (LSP4IJ runtime behaviour; DENUM diagnostics surfacing).

Scope: only what the NEW features need. Wire contract is `/home/coder/repos/bbj-ls/README.md` "JSON-RPC methods"; it is not restated here beyond what drives a decision.

## Headline Decisions

| Question | Decision | Why (one line) |
|----------|----------|----------------|
| Where does the formatter plug into Langium DI? | `lsp.Formatter` slot in `BBjModule` (class `BBjFormatter implements Formatter`, NOT `AbstractFormatter`) plus a post-`startLanguageServer` bounded handler override in `main.ts` | The DI slot alone makes Langium advertise `documentFormattingProvider` + `documentRangeFormattingProvider`; Langium's default handler awaits `WorkspaceManager.ready`, which would starve VS Code's 750 ms format-on-save and IntelliJ on a cold server |
| Which connection do `formatProgram`/`denumProgram` ride? | The dedicated parse lane (rename concept to "program lane"), falling back to the shared connection exactly as `parseProgram` does | `getClassInfo` & co. return `completedFuture` and run on the lsp4j reader thread; the lane exists to keep class traffic off program requests (#692). Format worker and parser worker are per TCP connection, so format on the lane never waits behind a parse |
| Capability probing | Reuse the "first real call is the probe" latch from `BBjParserService`, keyed on `connectionGeneration`; `-32601` => "requires BBj 26.03" (once per generation), never touches the breaker | Breaker is connect-level only; an application/`MethodNotFound` answer proves the peer is alive |
| Settings transport | One normalised `formatter` settings object fed from TWO channels: `initializationOptions.formatter` (IntelliJ's only reliable channel, VS Code initial) and `didChangeConfiguration` `bbj.formatter` (VS Code hot-reload). No per-request pull | LSP4IJ `workspace/configuration` pull returns null for this plugin (documented in `CompilerInitOptions.java`); VS Code already pushes the whole `bbj` section via `gatedBbjSettings()` |
| DENUM as command vs request | Custom request `bbj/denum` (params `{uri}`, typed result incl. a single `TextEdit`), mirroring `bbj/compile`. The DENUM-needed prompt from formatting is server-driven (`window/showMessageRequest` then `workspace/applyEdit`) and calls the same `denumDocument()` core | Precedent + `ComposerRequestContractTest` protection + typed outcome for both IDEs; `workspace/executeCommand` has zero precedent in this repo and LSP4IJ has no menu-invokable path for it |
| `canonicalName` / `version` | `canonicalName = document.uri.fsPath`, `version = String(textDocument.version)` — identical to `requestLiveParse` | Supersession is per method per connection, so format/denum/parse never cancel each other; a newer format of the same file cancels the older (-32800) |

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ IDE clients                                                                  │
│  VS Code (extension.ts)                    IntelliJ (LSP4IJ, BbjComposerServer)│
│   package.json bbj.formatter.* (15)         BbjSettings.State + Configurable  │
│   bbj.denumber -> client.sendRequest        BbjDenumAction -> @JsonRequest    │
│   LanguageClient auto-registers formatting  LSPFormattingFeature (built in)   │
├───────────────────┬───────────────────────────────────┬──────────────────────┤
│        textDocument/formatting|rangeFormatting   bbj/denum   initializationOptions.formatter
│                   │                                   │      didChangeConfiguration(bbj.formatter)
├───────────────────┴───────────────────────────────────┴──────────────────────┤
│ Language server (bbj-vscode/src/language, one process, stdio/IPC)            │
│                                                                              │
│  main.ts  ──registers──>  bounded formatting handler   denum-command.ts      │
│                           (bbj-formatting-handler.ts)  (bbj/denum)           │
│                                   │                         │                │
│  bbj-module.ts lsp.Formatter ─> BBjFormatter  ──────┐       │                │
│                                 (LSP adapter)       v       v                │
│                                         BBjFormatService (compiler group)    │
│                                         - params builder, settings snapshot  │
│                                         - typed error classify + latch       │
│                                         - format / denum outcome types       │
│                                                   │                          │
│  JavaInteropService (thin front) ── formatProgram / denumProgram / parseProgram
│                                                   │                          │
│  JavaInteropConnection  (generalised "program lane")                         │
│     lane socket (per generation)  ──fallback──>  shared socket + breaker     │
├──────────────────────────────────────────────────────────────────────────────┤
│ bbj-ls inside BBjServices :5008  (one InteropService per TCP connection)     │
│   parser worker: parseProgram, denumProgram, formatProgram's DENUM step      │
│   format worker: formatProgram's format step                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### NEW components (language server, `bbj-vscode/src/language/`)

| File | Responsibility | Pattern it copies |
|------|----------------|-------------------|
| `bbj-format-service.ts` — `BBjFormatService` | Builds `FormatProgramParams`/`DenumProgramParams` from a `LangiumDocument` + the current settings snapshot; calls `JavaInteropService.formatProgram/denumProgram`; classifies every outcome into a typed union (`edits`, `text`, `denum-needed`, `invalid-settings`, `mixed-numbering`, `unavailable`, `superseded`, `failed`); owns the per-generation `-32601` latch and the warn-once-per-kind cadence | `bbj-parser-service.ts` (latch, `classifyFailureKind`, `reportedFailureKinds`) |
| `bbj-formatter.ts` — `BBjFormatter implements Formatter` | LSP adapter only: whole-document `text` -> minimal `TextEdit[]`; range `edits` pass-through; stale-version guard; maps outcomes to `[]` + user message; `formatOnTypeOptions` returns `undefined` | `bbj-code-action-provider.ts` style provider; no `AbstractFormatter` (that class is CST-driven, we never parse) |
| `bbj-formatting-handler.ts` | `registerBoundedFormattingHandler(connection, shared)` — overrides `onDocumentFormatting`/`onDocumentRangeFormatting` AFTER `startLanguageServer`; resolves text from `shared.workspace.TextDocuments` (no AST, no `WorkspaceManager.ready` wait); refuses non-`bbj` language ids | `bbj-hover-handler.ts`, `bbj-code-action-handler.ts`, `composer-codelens-handler.ts` |
| `bbj-format-settings.ts` | `normalizeFormatterSettings(raw)`: whitelist exactly the 15 `FormatOptions.fromMap` keys, drop `javaPath` and anything unknown (the server rejects unknown keys with -33007 naming all keys), accept legacy `splitSingleLineIF` as an alias for `splitSingleLineIf`; a module/service-held snapshot with `setFormatterSettings()` | `setMaxErrors`/`setCompilerTrigger` setters wired through `ConfigurationChangeDeps` |
| `denum-command.ts` | `DENUM_REQUEST_METHOD = 'bbj/denum'`; `createDenumHandler(deps)` + `registerDenumRequest(connection, deps)`; result carries a closed `reason` vocabulary (client contract, like `CompileFailureReason`) | `compile-command.ts` (verbatim shape) |
| Program wire types | `FormatProgramParams/Result`, `DenumProgramParams/Result`, `ProgramDiagnostic`, error-code constants (-33001..-33009, -32602, -32800, -32601). Put next to `ParseProgramParams` in `java-interop-connection.ts` or in a sibling `java-interop-program-types.ts` (preferred: that file is already 579 lines) | `ParseProgramParams` block in `java-interop-connection.ts` |

### MODIFIED components

| File | Change |
|------|--------|
| `java-interop-connection.ts` | Generalise `parseProgram()` into `sendProgramRequest(type, params, token, opts)` over the existing lane (`parseLaneConnection`, generation-scoped, silent fallback to `hooks.connect()`). Keep `parseProgram()` as a thin caller. **Retire-on-MethodNotFound must stay parse-only** (`opts.retireLaneOnMethodNotFound`), otherwise a missing `formatProgram` would kill the lane `parseProgram` depends on. Error text in `openParseLane`'s warn ("Live compiler diagnostics: ...") needs a neutral wording |
| `java-interop.ts` | Add `formatProgram()` / `denumProgram()` delegates beside `parseProgram()`; re-export the new types (same `export type {...}` block) |
| `bbj-module.ts` | `BBjAddedServices.compiler.BBjFormatService`; `lsp.Formatter: (s) => new BBjFormatter(s)` (the 10th provider in the `lsp` group) |
| `main.ts` | `registerDenumRequest(connection, {...})` next to `registerCompileRequest`; `registerBoundedFormattingHandler(connection, shared)` after `startLanguageServer(shared)` beside the three existing overrides; add `setFormatterSettings` to `registerConfigurationChangeHandler` deps |
| `bbj-ws-manager.ts` (`onInitialize`) | Read `params.initializationOptions.formatter` -> `normalizeFormatterSettings` -> store (same block as `compilerTrigger`/`inlayHintsParameterNames`) |
| `configuration-change-handler.ts` | `BbjSettings.formatter?: Record<string, unknown>` + dep `setFormatterSettings`; applied with no startup gate and no reload (like `diagnostics.*`) |
| `bbj-parser-service.ts` | Optional: import the shared `-33001..-33005` kind table instead of its private `APPLICATION_ERROR_KINDS` so the three services classify identically |
| `test/bbj-test-module.ts` (`JavaInteropTestService`), `test/fake-interop-peer.ts`, `tools/interop-test-harness/cases.ts` | Script `formatProgram`/`denumProgram` answers (default = `MethodNotFound`, like `parseProgramScript`); add live harness cases |

### MODIFIED components (VS Code client)

| File | Change |
|------|--------|
| `extension.ts` | Delete `import { DocumentFormatter }`, `registerDocumentFormatter()` and its call in `activate()`. Re-point `bbj.denumber` (currently `Commands.denumber`, line ~540) at a new function that `client.sendRequest('bbj/denum', {uri})` and applies the result. Add `formatter: <normalised object>` to `initializationOptions` (line ~751). Nothing to do for pushes: `gatedBbjSettings()` already copies the whole `bbj` section, so `bbj.formatter.*` already reaches `didChangeConfiguration` |
| `open-file-prompts.ts` | `maybePromptLineNumbered` already calls `vscode.commands.executeCommand('bbj.denumber', doc.uri)`; only the doc comment ("runs bbjlst") and the "Replace" semantics change (see Pitfall 3) |
| `Commands/Commands.cjs` | Remove `denumber` (line ~429) and the `decompile()` wrapper (line ~186). **Keep** `decompileInPlace`, `decompileReplace`, `decompileReadonly`, `buildDecompileArgv({denumber:true})`, `bbjlstBin`, `decompile-io.ts`, `tokenized-bbj.ts`, `BbjBinaryName 'bbjlst'` — tokenized-program decompile stays by milestone decision and still uses `bbjlst -l` |
| `package.json` | Remove `bbj.formatter.javaPath`; rename `splitSingleLineIF` -> `splitSingleLineIf` (add `deprecationMessage` on the old key if kept for migration); add the 11 missing keys (`indentCharacter`, `splitInlineComments`, `splitInlineLabelComment`, `collapseMultiLine`, `eolCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`, `indentLabelBlocks`, `blankLineAfterReturn`) with `enum`/`minimum`/`maximum` mirroring `FormatOptions`. **Keep** the `bbj.denumber` command, icons, `alt+n`, 4 menu entries and `bbj.denumber.promptOnOpen`; the command id is public surface |

### MODIFIED components (IntelliJ, `bbj-intellij/src/main/java/com/basis/bbj/intellij`)

| File | Change |
|------|--------|
| `composer/BbjComposerServer.java` | Add `@JsonRequest("bbj/denum") CompletableFuture<DenumResult> denum(DenumParams)` (all custom requests must live on this one interface — `getServerInterface()` returns exactly one) |
| `test/.../composer/ComposerRequestContractTest.java` | **Breaks otherwise.** Add `"bbj/denum"` to `DECLARED_REQUESTS` (sixteen -> seventeen), a `Path` constant for `bbj-vscode/src/language/denum-command.ts`, and the quoted-literal assertion. Do not move or rename any existing TS handler file |
| `lsp/BbjLanguageServerFactory.java` (`initializeParams`) | Add a nested `formatter` `JsonObject` built by a new plain-Java seam `lsp/FormatterInitOptions.java` (key constants, defaults, enum allow-lists, normalisers — copy of `CompilerInitOptions`), with its own JUnit test. Flat/nested `initializationOptions` is the ONLY reliable channel: `BbjLanguageClient.createSettings()` never reaches the server |
| `BbjSettings.java`, `BbjSettingsComponent.java`, `BbjSettingsConfigurable.java` | Persist + edit 15 formatter values. Recommend a separate child `Configurable` ("BBj > Formatter", registered in `plugin.xml`) rather than growing `BbjSettingsComponent` (already ~550 lines). `apply()` already calls `scheduleRestart()`, so a changed formatter setting restarts the LS — acceptable, consistent with every other IntelliJ setting |
| `actions/BbjDenumAction.java` + `plugin.xml` | Pattern: `BbjCompileAction` / `BbjRefreshJavaClassesAction` (background task, `BbjComposerService.server(project)`, presenter for outcomes). Applies the returned `TextEdit` under a write command (verify the LSP4IJ 0.21.0 edit-apply helper during the phase) |
| `lsp/BbjLanguageServerFactory.createClientFeatures()` | Only if the evaluation decision is "disabled": `.setFormattingFeature(new LSPFormattingFeature(){ isSupported(file) -> false })`, same pattern as the existing `setDocumentLinkFeature` override. Nothing to add for "supported": LSP4IJ turns on Reformat Code from the server capability |
| `bbj-intellij/build.gradle.kts` | **No change.** `copyWebRunner`/`prepareSandbox` copy only `web.bbj`, `em-login.bbj`, `em-validate-token.bbj` from `bbj-vscode/tools/`; `tools/formatter` was never bundled |

### DELETED

| Path | Referenced by (must be edited in the same change) |
|------|---------------------------------------------------|
| `bbj-vscode/src/document-formatter.ts` | `extension.ts`; `test/document-formatter.test.ts`; `test/no-shell-command-construction.test.ts` (importers list `['Commands/process-runner.ts','document-formatter.ts','language/bbj-cpl-service.ts']` + 7 formatter-specific assertions, lines ~94-155); `test/extension-activation.test.ts` (`registerDocumentFormattingEditProvider` assertions, ~224); `test/activation-command-coverage.test.ts` (`'formatter'` trace entry + `command:bbj.denumber` list, ~79/258/264) |
| `bbj-vscode/src/formatter-java-resolver.ts`, `formatter-verifier.ts` | `test/formatter-java-resolver.test.ts`, `test/formatter-verifier-tamper.test.ts`, `test/formatter-pins-drift.test.ts` (all deleted) |
| `bbj-vscode/tools/formatter/**` (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`, `jcommander-1.71.jar`, `bom.json`, `README.md`) | Only the pins test and verifier. Not in `.vscodeignore` (it shipped in the VSIX) so nothing to edit there; the VSIX simply shrinks. `.github/workflows/pr-validation.yml` path filter `bbj-vscode/tools/**` stays valid. Closes the formatter-jar provenance/DEP work |
| `Commands.denumber` mock entries | `denumber: vi.fn()` appears in ~10 test mocks (`extension-activation`, `activation-command-coverage`, `activation-prompts-and-status-bars`, `commands-cjs-harness`, ...). The prompt test (`activation-prompts-and-status-bars.test.ts` ~298-315) still expects `executeCommand('bbj.denumber', doc.uri)`, which stays valid |
| Docs / QA | `documentation/docs/vscode/commands.md` (Denumber section ~69-92, "Formatting runs Java" step ~255), `configuration.md` (Formatter Settings ~270-330, defaults block ~359-363, machine-scope note ~381), `features.md` (~131), `README.md` (~92), `QA/FULL-TEST-CHECKLIST.md` row 25 ("Formatter Java path" -> replace with settings/-33007 row), plus a new IntelliJ formatter page |

## Question-by-Question Findings

### 1. Where the formatter plugs into Langium DI

- Langium 4.3.1 (`node_modules/langium/lib/lsp/language-server.js`): `buildInitializeResult` sets `documentFormattingProvider` / `documentRangeFormattingProvider` to `hasService(e => e.lsp?.Formatter)` and `documentOnTypeFormattingProvider` from `Formatter.formatOnTypeOptions`. So registering `lsp.Formatter` in `BBjModule` is the only thing needed to advertise both capabilities; VS Code's `LanguageClient` then registers the providers itself (documentSelector is already `file`+`bbj`), and LSP4IJ enables LSP formatting.
- The `Formatter` interface is `formatDocument/formatDocumentRange/formatDocumentOnType(document: LangiumDocument, params, token)` + `formatOnTypeOptions`. Implement it directly; return `undefined` for on-type (bbj-ls has no on-type endpoint) and an empty array from `formatDocumentOnType`.
- Default handler gating is the trap: `addFormattingHandler` -> `createRequestHandler` -> `waitUntilPhase` first awaits `WorkspaceManager.ready` (the whole cold workspace build), then `getOrCreateDocument`. The repo has already paid for this three times (code action, code lens, hover overrides in `main.ts`, each with a comment about IntelliJ EDT freezes / DoS-shaped hangs). VS Code format-on-save aborts after ~750 ms (the deleted `document-formatter.ts` even warned at 750 ms). `formatProgram` never parses, so the handler needs only text: register the bounded override after `startLanguageServer(shared)` exactly like `registerConfigAwareHoverHandler`, reading `shared.workspace.TextDocuments.get(uri)`. Keep the DI `Formatter` so capability advertisement and unit tests stay on the Langium path.

### 2. Which connection/lane

Evidence: `bbj-ls/.../InteropService.java` — `getClassInfo`, `getClassInfos`, `getAllClassNames`, `getTopLevelPackages` return `CompletableFuture.completedFuture(...)` computed inline (reader-thread work). `parseProgram` -> `parserWorker().submit`; `denumProgram` -> `denumWorker().submitDenum` (parser worker); `formatProgram` -> `formatWorker().submit` for the format step and `denumWorker()` for the `allowDenum` DENUM step. Workers are lazy and per `InteropService` = per TCP connection.

- Put format/denum on the existing parse lane. Pure format runs on that connection's FORMAT worker, so a blocked/slow live parse (parser worker) never delays it, and class-lookup storms on the shared socket never delay it either. This is the same isolation rationale as #692.
- `allowDenum` is NOT used by the LSP path (DENUM-needed must be offered, not silently performed), so `formatProgram` never touches the parser worker from this client. `denumProgram` does queue behind an in-flight parse on the lane; worst case the 10 s parse timeout, normally milliseconds.
- Fallback stays identical: lane cannot open -> `hooks.connect()` (shared, breaker-guarded). Lane open never touches the breaker, never notifies, never bumps `generation`; loss of an opened lane bumps `generation` once (existing `onParseLaneLost`).
- Client-side deadline: server step timeouts are 10 s each; give the LS call an overall budget (suggest 15 s for format, 25 s for denum) via the same `Promise.race` idiom as `requestClassInfo`, so a wedged peer cannot hold an IDE request forever.

### 3. Capability probing, `-32601`, and the circuit breaker

- Precedent (`bbj-parser-service.ts`): no version string is ever read; the first real request is the probe; `MethodNotFound` latches `'off'` for the current `javaInteropService.connectionGeneration`; any other answer latches `'on'`; the latch resets when the generation moves (reconnect, `clearCache()`, lane loss).
- Reuse that exact shape in `BBjFormatService`, with one latch per method (format, denum) because a build could carry `parseProgram` but not the later methods.
- `-32601` is an answer, not a transport failure. It must not reach `isInteropTransportFailure`, must not open the breaker (`onConnectAttemptSettled` only ever runs from `connect()`), and must not trigger `notifyJavaConnectionError`. It maps to a single message per generation: "Formatting/DENUM requires BBj 26.03 or later" (subsequent hits log at debug). Capabilities are advertised statically at `initialize` (before any interop connection exists), so do not try to gate advertisement on the probe; answer gracefully instead.
- Distinguish in messaging: `InteropTransportError`/circuit-open/`ConnectionError` => "Java interop (BBjServices) is not reachable" (no extra popup; the breaker already raised its one popup); `-33004` => "BBj parser/DENUM service unavailable"; `-33004` on `denumProgram` also covers "DENUM not available on this BBj".
- Error table the service must classify (all application answers, none count against the breaker):

| Code | Outcome | User-visible behaviour |
|------|---------|------------------------|
| `-32601` | `unavailable` (latch) | "requires BBj 26.03", once per generation |
| `-33006` | `denum-needed` | `window/showMessageRequest` offering "DENUM" (see 5); returns no edits |
| `-33007` | `invalid-settings` (`data:[{setting,message}]`) | one error naming each key as `bbj.formatter.<key>`; once per settings revision |
| `-33008` | `mixed-numbering` (`data.line`) | message with the 1-based offending line (optionally `window/showDocument` to reveal it) |
| `-33001/-33005` | `failed` / `protected-program` | warn-once-per-kind-per-generation |
| `-33002/-33003/-33009` | `timeout` / `too-large` / `engine-failed` | warn-once-per-kind-per-generation; format-on-save must not toast every save |
| `-32602` | client bug | `logger.error`, no toast |
| `-32800` | `superseded` | silent; LSP handler returns `[]` |

### 4. How settings reach the LS today, and what to add

Existing flow (verified):
- **VS Code**: `initializationOptions` is an explicit list in `extension.ts` (~751); runtime changes go through `synchronize.configurationSection: 'bbj'` -> `createConfigPathTrustMiddleware` -> `gatedBbjSettings()` (full `bbj` section copy, `configPath` substituted) -> `workspace/didChangeConfiguration` -> `configuration-change-handler.ts` (`BbjSettings` shape, per-setting `deps.setX`). So `config.formatter` is already in every push; only the handler and `initializationOptions.formatter` are missing.
- **IntelliJ**: `BbjLanguageServerFactory.initializeParams` is the sole reliable channel (comment in `CompilerInitOptions.java`: LSP4IJ 0.21.0's pull `workspace/configuration` for section `bbj` resolves against `createSettings()`'s flat JSON and returns null; `triggerChangeConfiguration` is never wired). A settings change restarts the LS (`BbjSettingsConfigurable.apply()` -> `scheduleRestart()`), which re-sends fresh options.
- **LS**: `bbj-ws-manager.ts` `onInitialize` reads `initializationOptions.*`; `didChangeConfiguration` applies hot settings.

Design: both paths call the same `normalizeFormatterSettings` and `setFormatterSettings`. `BBjFormatService` snapshots the settings on each request (so VS Code edits apply to the next format with no restart, and no cache invalidation exists). LSP `FormattingOptions` (`tabSize`, `insertSpaces`) are deliberately ignored: `indentWidth`/`indentCharacter` are the formatter's own settings. Document this (and the IntelliJ Code Style indent options in `BbjLanguageCodeStyleSettingsProvider` will not drive LS formatting).

Defaults: the formatter's own default `indentWidth` is `4`, the current extension default is `2`. Keep the VS Code and IntelliJ defaults at `2` so existing users see no behaviour change; the LS forwards only what the client holds. Defaults therefore live in two client copies (package.json, `FormatterInitOptions.java`) — pin both with a test that compares them to the bbj-ls README key table to catch drift.

Key mapping: `splitSingleLineIF` -> `splitSingleLineIf`. `settings` values may be string, number or boolean (README: read as literal text); send native JSON types, never `4.0` for ints. Never send `javaPath`, null values, or unknown keys.

### 5. DENUM: command vs custom request, and how each IDE invokes it

Recommendation: custom request `bbj/denum`, params `{ uri: string }`, result:

```ts
interface DenumResult {
  status: 'denumbered' | 'not-line-numbered' | 'failed';
  edits?: TextEdit[];            // exactly one whole-document replace when status==='denumbered'
  diagnostics?: ProgramDiagnosticDto[];   // see 6
  reason?: DenumFailureReason;   // closed vocabulary: 'requires-bbj-26-03' | 'denum-unavailable' | 'mixed-numbering'
                                 //  | 'protected-program' | 'too-large' | 'timeout' | 'interop-unavailable' | 'failed' | 'superseded'
  message?: string;
  line?: number;                 // 0-based, for mixed-numbering
  version?: number;              // text-document version the edit was computed against
}
```

Why not `workspace/executeCommand`: zero use in the repo (`grep` finds none); Langium's `ExecuteCommandHandler` would add a capability and command-name registry; VS Code's `LanguageClient` auto-registers advertised command ids (id collision with the existing `bbj.denumber` registration); LSP4IJ has no menu-invokable entry for arbitrary server commands, so IntelliJ would need a bespoke call anyway. `bbj/denum` follows `bbj/compile` and `bbj/refreshJavaClasses`: constant method name, plain-JSON DTOs, `createXHandler(deps)`/`registerXRequest`, read by name in `ComposerRequestContractTest`.

Invocation:
- VS Code: `bbj.denumber` handler -> resolve target (`resolveRunTarget` already does argument-first/active-editor) -> `client.sendRequest('bbj/denum', {uri})` -> apply `edits` with `vscode.workspace.applyEdit` (via `client.protocol2CodeConverter.asTextEdits`). Not a `Commands.cjs` function any more (that file has no client handle; `registerSetOptsInCodeComposer(context, (m,p)=>client.sendRequest(m,p))` is the existing injection pattern to copy).
- IntelliJ: `BbjDenumAction` -> `BbjComposerServer.denum` (background task + `CompileResultPresenter`-style presenter), apply the single `TextEdit` to the editor document.
- DENUM-needed from formatting (server-driven, one implementation for both IDEs): on `-33006` the formatter handler returns `[]` and fires `window/showMessageRequest` "This is a line-numbered program. DENUM it first?" with actions `[DENUM]`; on selection the LS runs `BBjFormatService.denumDocument()` and applies the result with `workspace/applyEdit`. LSP4IJ 0.21.0 `LanguageClientImpl` implements `showMessageRequest`, `applyEdit` and `showDocument`, so no IntelliJ-only UI is needed. Throttle: at most one prompt per document per text version (format-on-save would otherwise re-prompt each save). Range requests are always refused by bbj-ls with `-33006`, so the same prompt covers them.

### 6. Mapping DENUM diagnostics

`ProgramDiagnostic { line (1-based, in the RESPONSE text, 0 = none), originalLineNumber (string, "" if unknown), severity "ERROR"|"WARNING"|"INFO", message }`.
- Map `severity` -> LSP `1/2/3`; `line` -> `line-1` clamped to the denumbered text's line count, range = whole line using `END_OF_LINE_CHARACTER` (`lsp-position.ts`, the same JVM-client-safe sentinel `parseErrorToRange` uses); `line 0` -> line 0. Message prefix: `Line <originalLineNumber>: ` when present. Source `'BBj DENUM'`, distinct from `BBJ_PARSER_SOURCE` ('BBj Parser') and the bbjcpl source so Rule 0 reconciliation keys never match it.
- They describe the text AFTER the DENUM edit, not the current buffer, and LSP `publishDiagnostics` replaces per URI, so a side-channel `sendDiagnostics` would be wiped by the next build the instant the edit lands (the edit triggers a `didChange`). Surfacing options, in order of cost:
  1. (Recommended default, lean) One-shot: the result's `diagnostics` plus a `window/showMessage` summary ("DENUM finished with 2 errors; first at original line 0030") and an output-channel log. After the edit applies, the v4.5 live `parseProgram` path re-detects the same syntax errors on the denumbered text on BBj 26.03+, so the squiggles reappear through the normal pipeline.
  2. Stored-and-merged: a per-URI `DenumDiagnosticsStore` composed in `BBjDocumentBuilder`'s publish step like `bbj-kept-check.ts` (line mapping through recorded change batches). Only worth it if UAT shows the live pipeline does not reproduce them. **Flag for the DENUM phase's own research.**

### 7. Stale-result and edit-shape rules for the LSP adapter

- Whole-document response is `text`, not edits. Convert with `wholeDocumentChangeAsRange(oldText, newText)` (exists in `bbj-kept-check.ts`; consider moving it to a neutral `text-diff.ts`): it trims common leading/trailing lines, so the IDE keeps cursor, folding state and undo granularity instead of a whole-file replace. Return `[]` when texts are equal. Clamp the end position to the document's real last line: the old client used `Range(0,0,lineCount,0)`, which is out of range and a JVM client's deserializer may reject.
- Capture `document.textDocument.version` before sending; after the await, if it changed (or `result.version` echo mismatches), return `[]` (or `ResponseError(LSPErrorCodes.ContentModified)`), never apply stale edits.
- Range response `edits` is already LSP-shaped (0-based, UTF-16): pass through. Empty list = unchanged range.
- `eolCharacter: LF|CRLF` changes line endings; the diff helper compares lines including terminators, so this naturally yields a whole-file edit. Expected.

## Data Flow

### Format (whole document or range)

```
IDE Format Document / format-on-save / Reformat Code
  -> textDocument/formatting | rangeFormatting
  -> bbj-formatting-handler.ts (TextDocuments lookup, language id check, no workspace wait)
  -> BBjFormatter.formatDocument/formatDocumentRange
  -> BBjFormatService.format(textDocument, range?, token)
       params = { text, settings: snapshot, allowDenum:false, canonicalName: uri.fsPath,
                  version: String(version), range? }
  -> JavaInteropService.formatProgram -> JavaInteropConnection.sendProgramRequest
       lane (per generation)  | fallback: shared connection (breaker)
  -> bbj-ls format worker -> FormatProgramResult { text | edits }
  -> typed outcome -> edits (minimal) | [] + one user message / prompt
```

### DENUM

```
bbj.denumber (VS Code) / BbjDenumAction (IntelliJ)  ──> bbj/denum {uri}
format -33006 ──> showMessageRequest [DENUM] ──────────┐
                                                        v
                         BBjFormatService.denumDocument(document, token)
                         -> denumProgram on the lane (parser worker)
                         -> DenumProgramResult { text, diagnostics, denumbered }
bbj/denum path: result { status, edits, diagnostics } returned; client applies edit
prompt path:    LS applies via workspace/applyEdit, then summarises diagnostics
```

### Settings

```
VS Code settings.json bbj.formatter.*  ──(start)──> initializationOptions.formatter ─┐
                                       ──(change)─> didChangeConfiguration.bbj.formatter ─┤
IntelliJ BbjSettings.State (15)        ──(start/restart)─> initializationOptions.formatter ─┤
                                                           normalizeFormatterSettings ─> snapshot ─> next formatProgram
```

## Patterns to Follow

1. **Request module trio** (`compile-command.ts`): constant method name, `createXHandler(deps)` with structural deps, `registerXRequest(connection, deps)`; plain JSON in and out; a closed `reason` vocabulary documented as a client contract.
2. **Post-start bounded override** (`bbj-hover-handler.ts`): register after `startLanguageServer(shared)` with the same comment style; delegate to Langium helpers where possible.
3. **Probe-and-latch per connection generation** (`BBjParserService`): `isEnabled()`/`resetIfGenerationChanged()`; first real call is the probe; log the mode line once per generation.
4. **Hooked connection, thin front** (`java-interop.ts` over `java-interop-connection.ts`): new wire methods are delegates on the front; transport rules live only in the connection module so test doubles overriding `createSocket/wrapSocket/connect` keep working.
5. **Plain-Java init-options seam** (`CompilerInitOptions`): zero IntelliJ-platform imports so plain JUnit 5 covers normalisation.
6. **Cross-language request contract test**: every new `@JsonRequest` name must appear as a quoted literal in its TS handler file.

## Anti-Patterns to Avoid

| Anti-pattern | Why wrong here | Do instead |
|--------------|----------------|------------|
| Using Langium's default formatting handler | Awaits `WorkspaceManager.ready`; blows VS Code's ~750 ms format-on-save budget on a cold server and risks IntelliJ UI stalls | Bounded override reading `TextDocuments` |
| Extending `AbstractFormatter` | CST/AST rule engine; we delegate to bbj-ls and never parse | Implement `Formatter` directly |
| Sending format/denum on the shared connection only | Class-info traffic runs inline on the shared reader thread; it delays program requests (the #692 problem) | Program lane with the existing fallback |
| Retiring the lane on any `-32601` | A missing `formatProgram` would kill `parseProgram`'s dedicated lane | Retire-on-MethodNotFound only for `parseProgram` |
| Letting `-32601`/`-33xxx` count as breaker failures | Breaker is connect-level; an answer proves liveness | Classify as outcomes; breaker untouched |
| `allowDenum: true` from format | Silently rewrites line numbers into labels on every format-on-save | `allowDenum:false`, offer DENUM explicitly |
| Reading settings via `workspace/configuration` per request | Returns null under LSP4IJ for this plugin | `initializationOptions` + `didChangeConfiguration` into one snapshot |
| Publishing DENUM diagnostics with a bare `sendDiagnostics` | Replaced by the next Langium publish, which the edit itself triggers | One-shot message, or store-and-merge in the builder |
| `workspace/executeCommand` for DENUM | No precedent, no IntelliJ invocation path, command-id collision on VS Code | `bbj/denum` custom request |
| Whole-file replace edit with `Range(0,0,lineCount,0)` | Loses cursor/folds; out-of-range for strict clients | `wholeDocumentChangeAsRange`, clamped |

## Pitfalls Specific to This Integration

1. **`ComposerRequestContractTest` fails** the moment `bbj/denum` is added to `BbjComposerServer` (or to the TS side alone). Both sides in the same change.
2. **Two providers for one language.** If the extension's `registerDocumentFormattingEditProvider` is not removed in the same change that makes the LS advertise formatting, VS Code offers a chooser / picks nondeterministically. Cut over atomically (the milestone lands as one PR, but within the branch keep the old registration removed in the commit that enables the server one).
3. **DENUM semantics change.** Old `bbj.denumber` rewrote the FILE on disk via `bbjlst` (`.lst` + rename). The new path edits the buffer (dirty, unsaved). The open-file prompt is labelled "Denumber & Replace": decide whether the prompt path saves after applying (preserving "replace"), and say so in docs/QA.
4. **Prompt before BBj 26.03.** `open-file-prompts.ts` detects numbered source client-side (`line-numbering.ts`, no LS needed) and will offer DENUM on BBj < 26.03, where `bbj/denum` can only answer `requires-bbj-26-03`. Acceptable but surface a clear message; do not silently fall back to `bbjlst` (hard cut-over).
5. **Setting migration.** `bbj.formatter.splitSingleLineIF` users lose the value silently on rename; carry it over via the alias in `normalizeFormatterSettings` (read old key when the new one is unset) and a `deprecationMessage`. IntelliJ never had formatter settings, so nothing to migrate there.
6. **Default drift.** Formatter default indent is 4, extension default is 2 (see 4). A client that sends no `indentWidth` gets 4. Always send all keys the client owns.
7. **Server-side strictness.** An unknown settings key (e.g. a stray `javaPath`, or a future key) fails the whole request with `-33007`; whitelist in the LS. `settings` with more than 64 entries gives `-33003`.
8. **Test doubles default to `MethodNotFound`.** Existing hermetic tests (`createBBjTestServices`) must keep passing with no format script; default the new test-service methods exactly like `parseProgramScript`.
9. **Local-only verification.** `npm test` skips BBj-dependent tests; format/denum E2E needs the live :5008 peer (BBj 26.03 build with the new endpoints; the devcontainer's fresh BBj ships its own bbj-ls.jar, root-owned) — plan a harness case run, not just vitest.
10. **IntelliJ Reformat semantics (verify).** LSP4IJ 0.21.0 `LSPFormattingFeature` has `isSupported`, `isExistingFormatterOverrideable`, range and on-type hooks; BBj has no PSI formatting model, so LSP formatting should take over Reformat Code, but format-on-save, range, and the `-33006` prompt flow are exactly what the evaluation phase must exercise on a real IDE (the user decides "officially supported" or "disabled").

## Suggested Build Order (phase numbers continue from 123)

| # | Phase | Contents | Depends on | Why this position |
|---|-------|----------|-----------|-------------------|
| 124 | **Interop protocol layer** | Wire types + error-code constants; generalise lane into `sendProgramRequest` (parse-only retire rule); `formatProgram`/`denumProgram` on `JavaInteropService`; shared error classifier; `JavaInteropTestService` scripts, `fake-interop-peer` cases, harness cases | none | Pure foundation, hermetically testable, no user-visible change; both features need it; regression-guard `java-interop-parse-lane.test.ts` / `java-interop-connection.test.ts` |
| 125 | **LS formatting** | `bbj-format-settings.ts`, `BBjFormatService.format`, `BBjFormatter` in `lsp.Formatter`, bounded handler in `main.ts`, `onInitialize` + `didChangeConfiguration` plumbing, minimal-edit + stale-version rules, typed-error messages (`-32601`, `-33007`, `-33008`, timeouts; `-33006` as a plain message for now), unit tests | 124 | The core value; fully testable with the scripted peer; settings transport established here is reused by IntelliJ |
| 126 | **LS DENUM** | `denumDocument()`, `bbj/denum` (`denum-command.ts`), `showMessageRequest` + `applyEdit` DENUM-needed prompt wired into the formatter, diagnostics mapping + chosen surfacing, throttling | 124, 125 | Needs the format outcome union to hook the prompt; **research flag** (diagnostics surfacing) |
| 127 | **VS Code cut-over** | `package.json` (15 keys, rename, drop `javaPath`), `extension.ts` (`initializationOptions.formatter`, `bbj.denumber` -> `bbj/denum`, remove `registerDocumentFormatter`), `Commands.cjs` trim, `open-file-prompts` wording/save decision, delete `document-formatter.ts`, resolver, verifier, `tools/formatter/**` and all dependent tests, "requires BBj 26.03" UX, E2E on live BBj | 125, 126 | Atomic switch; avoids two formatters; deletion list above is the checklist |
| 128 | **IntelliJ build-out** | `FormatterInitOptions` + tests, `BbjSettings` state, settings UI (child Configurable), `initializeParams` `formatter` object, `BbjComposerServer.denum` + models + `BbjDenumAction` + presenter, **`ComposerRequestContractTest` update**, `./gradlew test` | 125, 126 | Independent of 127 once the LS side exists; can run in parallel with 127 on a second branch only if conflicts in `build.gradle.kts`/`plugin.xml` are managed |
| 129 | **IntelliJ evaluation + decision** | Hands-on runs of LSP4IJ formatting: whole document, range, format-on-save, DENUM-needed prompt, settings round-trip (restart), cold start; write findings; user chooses supported vs disabled; if disabled apply the `LSPFormattingFeature` override | 128 | The milestone explicitly requires evaluation before a support decision; must precede docs so docs state the outcome. **Research flag** |
| 130 | **Docs and QA** | `commands.md`, `configuration.md` (Formatter Settings, drop `javaPath`, defaults block), `features.md`, `README.md` line, new IntelliJ formatter page, `QA/FULL-TEST-CHECKLIST.md` row 25 -> settings / `-33007`, add rows for DENUM-needed, mixed numbering, requires-26.03; CLAUDE.md architecture bullets (new files) | 127-129 | Describes final behaviour, including the IntelliJ decision |

**Ordering rationale:** 124 is the shared dependency of everything. 125 before 126 because the DENUM-needed prompt is an outcome of formatting. 127 and 128 both consume the LS contract and can proceed independently; 127 carries the deletions, so it should land before the final doc sweep. 129 gates 130.

**Research flags:**
- 126: how DENUM diagnostics should surface in both IDEs (one-shot vs stored-and-merged); confirm `showMessageRequest` action selection and `applyEdit` behave in LSP4IJ.
- 129: LSP4IJ 0.21.0 formatting behaviour on a real IDE (format-on-save action, range, edit application, interaction with BBj code-style indent options); IntelliJ settings restart cost.
- 125: measure cold-start and format round-trip against the ~750 ms VS Code format-on-save budget on a large file (decides whether the bounded handler alone suffices).
- 124, 127, 128 (mechanics), 130: standard patterns, no further research expected.

## Scaling Considerations

| Concern | Typical | Large file (bbj-ls `maxBytes` 4 MiB) |
|---------|---------|--------------------------------------|
| Format latency | one lane round trip + engine | bbj-ls format timeout 10 s; set a client budget (15 s) and surface `-33002/-33003` once per kind |
| Burst of format-on-save across "Save All" | each file its own `canonicalName`, no mutual cancel | per-file supersession only cancels older still-pending requests of the same file |
| DENUM + live parse on the same lane | DENUM queues behind current parse | bounded by the 10 s parse timeout |

## Sources

- `/home/coder/repos/bbj-ls/README.md` (JSON-RPC methods, error codes, supersession, limits) and `/home/coder/repos/bbj-ls/bbj-ls/src/main/java/bbj/interop/InteropService.java` (per-connection workers, inline `completedFuture` class methods) — HIGH
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/` : `java-interop-connection.ts`, `java-interop.ts`, `bbj-parser-service.ts`, `bbj-module.ts`, `main.ts`, `compile-command.ts`, `configuration-change-handler.ts`, `bbj-ws-manager.ts`, `bbj-hover-handler.ts`, `bbj-kept-check.ts`, `lsp-position.ts` — HIGH
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/` : `extension.ts`, `config-path-trust.ts`, `document-formatter.ts`, `open-file-prompts.ts`, `line-numbering.ts`, `Commands/Commands.cjs`, `package.json`, `.vscodeignore` — HIGH
- `/home/coder/repos/bbj-language-server/bbj-intellij/` : `BbjLanguageServerFactory.java`, `BbjLanguageClient.java`, `CompilerInitOptions.java`, `BbjComposerServer.java`, `ComposerRequestContractTest.java`, `BbjSettingsConfigurable.java`, `build.gradle.kts` — HIGH
- Langium 4.3.1 `lib/lsp/language-server.js`, `lib/lsp/formatter.d.ts` (installed in `bbj-vscode/node_modules`) — HIGH
- LSP4IJ 0.21.0 sources at `/home/coder/repos/lsp4ij` (`LSPFormattingFeature`, `LanguageClientImpl` showMessageRequest/applyEdit/showDocument) — HIGH for API existence, MEDIUM for runtime behaviour (to be verified in phase 129)

---
*Architecture research for: v4.9 bbj-ls DENUM & Format Migration*
*Researched: 2026-10-01*
