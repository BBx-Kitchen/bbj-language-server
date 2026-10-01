# Stack Research

**Domain:** Language-server formatting (`textDocument/formatting`, `textDocument/rangeFormatting`) and a DENUM command, delegated to bbj-ls's `formatProgram` / `denumProgram` JSON-RPC methods, in a Langium 4.3 server shared by VS Code and IntelliJ (LSP4IJ)
**Milestone:** v4.9 bbj-ls DENUM & Format Migration (subsequent milestone; existing validated stack is not re-researched)
**Researched:** 2026-10-01
**Confidence:** HIGH for the VS Code / Langium / protocol side (read from the installed `node_modules` sources and the bbj-ls READMEs). MEDIUM-HIGH for LSP4IJ (read from the 0.21.0 jar in the Gradle cache with `javap`; live IntelliJ behaviour is exactly what the milestone's evaluation phase must still prove).

## Bottom Line

**No new runtime dependency is needed on any side.** The npm tree, the Gradle tree and the Java tree stay as they are. v4.9 is a wiring and removal milestone:

- Add: a `Formatter` implementation in the `lsp.Formatter` DI slot, two request methods on the existing interop connection, an `ExecuteCommandHandler` for DENUM, 15 `package.json` settings, 15 IntelliJ settings, and one small LSP4IJ feature subclass.
- Remove: the vendored jar tree, the Java resolver and verifier, `bbj.formatter.javaPath`, and the bbjlst denumber path.

The one real stack consequence to flag early: formatting used to need only a `java` on the machine. After the cut-over it needs a reachable bbj-ls on :5008 (BBjServices 26.03 or later). That is the milestone's deliberate trade, and it needs a clear message, not a silent no-op.

## Recommended Stack

### Core Technologies (all already present, pinned as they are)

| Technology | Version (verified) | Purpose in v4.9 | Why Recommended |
|------------|--------------------|-----------------|-----------------|
| Langium | `~4.3.1` (installed 4.3.1; latest is 4.4.0, held back by upstream eclipse-langium/langium#2236 — keep the hold) | `lsp.Formatter` DI slot; `shared.lsp.ExecuteCommandHandler` slot | `LangiumServices.lsp.Formatter` is optional and has **no default** in `default-lsp-module`. `DefaultLanguageServer.buildInitializeResult` sets `documentFormattingProvider` and `documentRangeFormattingProvider` to true as soon as any language registers a `Formatter`, and `startLanguageServer` already wires `connection.onDocumentFormatting` / `onDocumentRangeFormatting` to it. Registering the service is the whole capability story. |
| `vscode-languageserver` | 10.0.1 (via Langium `~10.0.1`) | `TextEdit`, `FormattingOptions`, `ResponseError`, `connection.window.showMessageRequest`, `connection.workspace.applyEdit` | Already imported directly across `src/language`. Nothing to add. |
| `vscode-languageclient` | `^10.1.2` (latest 10.1.2) | VS Code client: **auto-registers** a `DocumentFormattingEditProvider` and a `DocumentRangeFormattingEditProvider` for the `documentSelector` once the server advertises the capabilities | This is why the manual `registerDocumentFormattingEditProvider("bbj", DocumentFormatter)` in `extension.ts` must be deleted (two providers for one language make VS Code show a "pick a formatter" prompt). |
| `vscode-jsonrpc` | `^8.2.1` (direct dependency, used by `java-interop-connection.ts`) | Two new `RequestType`s beside `parseProgramRequest` | Upgrade to 9.x stays out of scope (an acknowledged todo; the server's own protocol stack already runs 9.0.1 and the two coexist today). Plain object params serialize as one JSON object, which is what lsp4j's `@JsonRequest` expects, exactly as `parseProgram` already does. |
| bbj-ls (`bbj-ls.jar` inside BBj 26.03+) | `formatProgram`, `denumProgram`, error codes `-33001`…`-33009` | The formatter and DENUM engines | The shaded jar already contains `bbj-ls-formatter`; nothing is shipped by this repo. |
| LSP4IJ (IntelliJ) | **0.21.0** (Gradle pin in `bbj-intellij/build.gradle.kts`; GitHub latest release is 0.21.0, 2026-08-31; plugin.xml `since-build` 242 matches our `sinceBuild = "242"`) | `textDocument/formatting` + `rangeFormatting` through IntelliJ's own formatting-service EP | No version bump is needed. Formatting has shipped through the platform `formattingService` EP since long before 0.21.0. See "IntelliJ / LSP4IJ" below. |
| IntelliJ Platform Gradle Plugin / Gradle | 2.19.0 / 9.7.1 (unchanged) | Build | No change. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vscode-languageserver-textdocument` | transitive (`~1.0.13`) | `positionAt(text.length)` for a whole-document replace edit | Always — build the real end `Position`. **Never** use `Number.MAX_SAFE_INTEGER` or `Integer.MAX_VALUE`-style sentinels: lsp4j's `Position.character` is an `int`, and v4.2 already hit that overflow (gap G-81-4, `END_OF_LINE_CHARACTER`). |
| `org.eclipse.lsp4j.FormattingOptions` | bundled by LSP4IJ 0.21.0 (lsp4j 1.0.0 in that plugin) | IntelliJ only: carry the 15 formatter settings as extra flat keys on the `options` object of every format request | It is a `LinkedHashMap<String, Either3<String,Number,Boolean>>` with `putString` / `putNumber` / `putBoolean`, so extras serialize as flat JSON keys next to `tabSize` / `insertSpaces`. Compatible with both lsp4j generations the plugin has to run on. |
| `com.intellij.ui.JBIntSpinner`, `ComboBox`, `JBCheckBox`, `FormBuilder` | IntelliJ Platform 2024.2+ | The 15 settings in `BbjSettingsComponent.java` | Same widgets the page already uses (`FormBuilder`, `ComboBox`, `CollectionComboBoxModel`). Stay in Java Swing; do not introduce the Kotlin UI DSL for one page. |

### Development / Test Tools (existing)

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest `^4.1.10` + `test/fake-interop-peer.ts` | Contract tests for the two new interop methods | Extend the scriptable fake peer (and `interop-harness-fake-peer.ts`) with `formatProgram` / `denumProgram`, including each error code, `data` payloads and `-32601` for an old BBj. The v4.7 loopback-peer work already runs the real connection code against such a peer. Use `parseHelper`, never `DocumentBuilder.build`, in unit tests (it reaches :5008). |
| `JavaInteropTestService` (`test/bbj-test-module.ts`) | Hermetic Langium tests | Needs fake `formatProgram` / `denumProgram` so `createBBjTestServices` stays hermetic. |
| `tools/interop-test-harness` (`tsx 4.23.15`) | Live check of a real bbj-ls | Optional: add a format + denum probe so the harness reports them against the real peer. |
| JUnit 6.1.3 (`bbj-intellij`) | IntelliJ unit tests | New LSP4IJ coupling needs the three existing fences updated (see "IntelliJ / LSP4IJ"). |

## Integration Design (the decisions this research settles)

### 1. Langium hook: implement `Formatter` directly; do NOT extend `AbstractFormatter`

`AbstractFormatter` is a CST-rule engine: `format(node)` + `getNodeFormatter(...)` + `Formatting.oneSpace()` rules, with `isFormatRangeErrorFree` that bails on lexer or parser errors. The real work is done by bbj-ls on the text, so none of that applies, and the error-free gate would wrongly refuse to format a file that merely has a syntax error elsewhere. Implement the plain interface instead:

```typescript
// langium/lsp — Formatter (4.3.1)
interface Formatter {
  formatDocument(document, params: DocumentFormattingParams, cancelToken?): MaybePromise<TextEdit[]>;
  formatDocumentRange(document, params: DocumentRangeFormattingParams, cancelToken?): MaybePromise<TextEdit[]>;
  formatDocumentOnType(document, params: DocumentOnTypeFormattingParams, cancelToken?): MaybePromise<TextEdit[]>;
  readonly formatOnTypeOptions: DocumentOnTypeFormattingOptions | undefined;
}
```

- Register in `bbj-module.ts`'s existing `lsp:` group: `Formatter: (services) => new BBjFormatter(services)` (it needs `services.java.JavaInteropService`, `services.shared.workspace.ConfigurationProvider`, `services.shared.workspace.TextDocuments`, and the connection for messages).
- `formatDocumentOnType` returns `[]` and `formatOnTypeOptions` is `undefined`: on-type formatting is not advertised, so neither IDE sends it.
- Whole-document request: send `{ text, settings, allowDenum: false, canonicalName: <document uri>, version: String(textDocument.version) }`. `formatProgram` returns the full `text`; turn it into one `TextEdit` over `Range(0,0 → positionAt(oldText.length))`. If the formatted text equals the input, return `[]` so format-on-save never dirties a clean buffer.
- Range request: send `range` (0-based, UTF-16 `character`, the same convention as LSP, so no conversion). The server returns `edits` (zero or one `TextEdit`); pass them through unchanged.
- Read the text from the live synced `TextDocument` at request time and carry its `version`; drop the result if the version changed while the request was in flight. Edits computed against stale text corrupt the buffer.
- Return `[]` for any document whose open `languageId` is `bbx-config` (reuse `isBuildableDocumentUri` from `bbj-document-builder.ts`): the client `documentSelector` includes `bbx-config`, so VS Code will route Format Document there too.
- `startLanguageServer(shared)` in `main.ts` passes no `serviceRequirements`, so the Formatter handler waits for **no** document phase. That is right: formatting needs text, not an AST. Do not add a `DocumentState.Parsed` requirement.
- Error handling inside the formatter (do not let typed errors escape as `ResponseError`, because VS Code then pops "Request textDocument/formatting failed" on every format-on-save):
  - `-32800` (superseded) → return `[]`, silently.
  - `-33006` (DENUM needed) → return `[]`, fire a non-blocking `window/showMessageRequest` with a "DENUM" action; on click run the DENUM command. **Never await the user inside the format handler** (LSP4IJ and VS Code both time the request out).
  - `-33007` (invalid settings) → one `window/showMessage` listing each `{setting, message}` from `data`, return `[]`.
  - `-33008` (mixed numbering) → message naming `data.line`.
  - `-33002` / `-33003` / `-33004` / `-33005` / `-33009` → one message each, deduplicated per connection generation (format-on-save fires constantly).
  - `-32601` MethodNotFound → "Formatting requires BBj 26.03 or later". Treat the first call as the probe, as `bbj-parser-service.ts` does for `parseProgram`; do not read a version string.

### 2. Capability registration: nothing to register by hand

Langium's `buildInitializeResult` already emits `documentFormattingProvider: true` and `documentRangeFormattingProvider: true` when `lsp.Formatter` exists. LSP4IJ reads them through its `DocumentFormattingCapabilityRegistry` and `DocumentRangeFormattingCapabilityRegistry`; `vscode-languageclient` reads them in `DocumentFormattingFeature.initialize`. Do not use dynamic registration: the milestone's requirement is a static capability plus a clear "requires BBj 26.03" message. Note that `vscode-languageclient` 10.1.2 declares `rangeFormatting.rangesSupport = true`; Langium does not advertise `rangesSupport`, so only plain `rangeFormatting` is used. Nothing to do.

### 3. Delivering the 15 per-document settings

| Host | Channel | Why |
|------|---------|-----|
| **VS Code** | **Nothing new.** The existing `synchronize.configurationSection: 'bbj'` plus the trust middleware already push the whole `bbj` section (`gatedBbjSettings` copies `getConfiguration().get('bbj')`), and Langium's `DefaultConfigurationProvider` already pulls `bbj` on `initialized` and caches pushes. Read it in the formatter with `await services.shared.workspace.ConfigurationProvider.getConfiguration('bbj', 'formatter')`. | Zero client code, hot-reloads with no restart, honours Workspace Trust gating already in place. Keep the settings `scope: "window"` like all current `bbj.formatter.*` keys. Moving to `resource` scope would force a per-request `workspace/configuration` pull with `scopeUri` for a multi-root feature nobody asked for. |
| **IntelliJ** | **Extra keys on `FormattingOptions`.** Subclass `LSPFormattingFeature`, override `getFormattingOptions(PsiFile, Editor)`, call `super`, then `putString/putNumber/putBoolean` the 15 values from `BbjSettings.State`; register it with `.setFormattingFeature(...)` in `BbjLanguageServerFactory.createClientFeatures()` next to the existing `.setCompletionFeature(new BbjCompletionFeature())`. | Live on every request, so no language-server restart when a setting changes (the other IntelliJ settings restart the server). It does not touch `createSettings()` or the `didChangeConfiguration` path. |

Server-side resolution order: **extras on the request's `options` (if any of the 15 known keys is present) > `ConfigurationProvider` `bbj.formatter` > nothing (omit `settings`; bbj-ls then uses every default).**

Why not the alternatives for IntelliJ:

- **`initializationOptions`** (how every other IntelliJ setting travels): read once at start, so each formatter change means a restart. It works, but a 30 s shutdown grace cycle to change an indent width is poor.
- **Nested `LanguageClientImpl.createSettings()` returning `{bbj:{formatter:{…}}}`** (LSP4IJ's `workspace/configuration` mechanism; it ignores `scopeUri` and resolves dotted sections against the returned `JsonObject`): it would work for pulls, but LSP4IJ also pushes `createSettings()` through `workspace/didChangeConfiguration` on server start. `configuration-change-handler.ts` then reads `change.settings.bbj` as a **partial** `bbj` and calls `setConfigPath(config.configPath || '')`, **clobbering the IntelliJ config path**. Today the flat object resolves to null and the handler returns early. Taking this route requires hardening that handler first, which is more risk than the extras route.

Server-side rules for building `settings`:

1. **Whitelist the 15 keys** (`indentWidth`, `indentCharacter`, `keywordsToUppercase`, `removeLineContinuation`, `splitSingleLineIf`, `splitInlineComments`, `splitInlineLabelComment`, `collapseMultiLine`, `eolCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`, `indentLabelBlocks`, `blankLineAfterReturn`). `formatProgram` rejects any unknown key with `-33007` and VS Code's `bbj.formatter` section will also contain leftovers (`javaPath`, `splitSingleLineIF`).
2. **Legacy key:** read `splitSingleLineIF` as a fallback for `splitSingleLineIf` for one release, and mark the old `package.json` entry `deprecationMessage`. VS Code has no key aliasing, so otherwise a user's saved `splitSingleLineIF: true` silently stops working.
3. **JSON typing:** bbj-ls reads each value as its literal text. Send integers as integers (`4`, never `4.0`), booleans as booleans, enums as their upper-case constants. `null` is rejected. At most 64 entries.
4. **Ignore `tabSize` / `insertSpaces`** from the format request. The old formatter used only `bbj.formatter.indentWidth`; keep that so the editor's own tab settings do not silently change output.

### 4. DENUM command: LSP `workspace/executeCommand` + `workspace/applyEdit`

- Register a shared `ExecuteCommandHandler` (extend Langium's `AbstractExecuteCommandHandler`, `registerCommands(acceptor)`; the slot is `shared.lsp.ExecuteCommandHandler` and today is **unset**, so Langium advertises no commands). One command, e.g. `bbj.denum`, taking a document URI.
- Flow: read the live text → `denumProgram { text, canonicalName: uri, version }` → if `denumbered`, send `workspace/applyEdit` with a **versioned** `TextDocumentEdit` (whole-document replace using the real end position) → surface `diagnostics` (DENUM's own; `severity` `ERROR|WARNING|INFO`, 1-based `line`) as one message or Output lines.
- Why this rather than a new custom `bbj/denum` request: it is standard LSP, so the DENUM-needed prompt from formatting (`showMessageRequest` → run the same command) works in **both** IDEs with no new Java interface. LSP4IJ implements `showMessageRequest` and `applyEdit` on `LanguageClientImpl`. A custom request would also have to be mirrored into the IntelliJ server interface and the `bbj/*` contract test.
- VS Code: `bbj.denumber` and the open-file prompt (`open-file-prompts.ts`) call `client.sendRequest(ExecuteCommandRequest.type, { command: 'bbj.denum', arguments: [uri] })`. The old flow rewrote the file on disk; the new flow edits the buffer, so decide (and test) whether "Denumber & Replace" also saves. An explorer-menu denumber of a closed file must open the document first.
- Optional, cheap for IntelliJ: a code action on a numbered program that points at the same command gives IntelliJ an Alt+Enter DENUM through LSP4IJ with no plugin code.

### 5. Interop connection: shared connection, not the parse lane

Add `formatProgramRequest` and `denumProgramRequest` beside `parseProgramRequest` in `java-interop-connection.ts`, with `JavaInteropService` delegates in the same shape as `parseProgram(params, token)`. Route them over the **shared** connection (through the hooks' `connect`, so the breaker still applies), **not** `parseLaneConnection()`.

- bbj-ls runs `denumProgram` and `formatProgram`'s DENUM step on the connection's *parser worker*, the same one `parseProgram` uses. The parse lane exists to isolate live-parse bursts; sending DENUM down it would queue behind live parses (10 s timeout each). A pure format step uses its own *format worker* and is never delayed by a parse.
- Pass the `CancellationToken` through. vscode-jsonrpc then emits `$/cancelRequest`; lsp4j cancels the returned `CompletableFuture`, but whether the worker stops mid-run is unverified (see Gaps). VS Code's format-on-save budget is 750 ms (`editor.formatOnSaveTimeout`), so the token will fire.
- `canonicalName` = document URI gives per-document supersession (a newer format of the same file cancels the older with `-32800`). `denumProgram` and the DENUM step of `formatProgram` have separate supersession keys and do not cancel each other.
- Limits to surface, not re-implement: `text` ≤ `bbj.interop.parse.maxBytes` (4 MiB UTF-8, `-33003`), DENUM step ≤ 10 s, format step ≤ 10 s (`-33002`).

### 6. IntelliJ / LSP4IJ formatting facts (read from the 0.21.0 jar)

- Formatting is registered through IntelliJ's `formattingService` EP: `LSPFormattingOnlyService` and `LSPFormattingAndRangeBothService` (feature `FORMAT_FRAGMENTS`), both extending `AsyncDocumentFormattingService`. It is **Reformat Code** (whole file → `textDocument/formatting`; selection → `textDocument/rangeFormatting`). It takes the **first** formatting range only, so "reformat changed lines" with several fragments sends a single range. **Format on save** is the platform's *Actions on Save → Reformat code*, which dispatches to the same service. This one is MEDIUM until proven live, as the evaluation phase is meant to do.
- `LSPFormattingFeature.isEnabled(file)` is false when `LanguageFormatting.forContext(file)` finds a `FormattingModelBuilder` and `isExistingFormatterOverrideable` is false (the default). The plugin registers `langCodeStyleSettingsProvider` only, with **no** `lang.formatter` / `FormattingModelBuilder`, so LSP4IJ formatting is enabled for BBj. Do not add a `FormattingModelBuilder`: it would switch LSP formatting off silently.
- The "official or disabled" decision has a clean switch: a `BbjFormattingFeature` whose `isEnabled` returns false turns IntelliJ off client-side and leaves VS Code and the server unchanged.
- LSP4IJ reports a format failure through `AsyncFormattingRequest.onError` as a balloon. A server `ResponseError` message therefore shows as an IntelliJ notification; the server's "return `[]` and message separately" design above is what gives a usable DENUM prompt.
- **Coupling fences:** `LSPFormattingFeature`, `AbstractLSPDocumentFeature` and `LSPClientFeatures` are `@ApiStatus.Experimental` (class-file retained; `LSPClientFeatures` also carries `@Internal` members). Adding `BbjFormattingFeature` means updating `Lsp4ijImportAllowlistTest` (the symbol-level import allowlist), `Lsp4ijCouplingCanaryTest` (signature canary for `getFormattingOptions`, `isEnabled`), and `Lsp4ijOverrideSiteSourceGuardTest`, in the same plan. `Lsp4ijVersionPinTest` still passes as 0.21.0 does not change.
- `plugin.xml` `<depends>com.redhat.devtools.lsp4ij</depends>` cannot pin a runtime version. `LSPFormattingFeature` has existed since the 0.7.0 client-features API, and `getFormattingOptions` since about 0.18.0 (an override on an older runtime is simply never called), so an older LSP4IJ degrades to "settings not delivered", not a crash. Treat the exact first-version claim as LOW and check it in the evaluation phase.

### 7. The 15 settings in both IDEs

| Key | Type | VS Code `package.json` | IntelliJ widget |
|-----|------|------------------------|-----------------|
| `indentWidth` | int 0–16 | `integer`, `minimum 0`, `maximum 16` | `JBIntSpinner(…, 0, 16)` |
| `indentCharacter` | enum `SPACE`, `TAB` | `enum` + `enumDescriptions` | `ComboBox` |
| `eolCharacter` | enum `KEEP`, `LF`, `CRLF` | `enum` | `ComboBox` |
| `ifClosingKeyword` | enum `KEEP`, `FI`, `ENDIF` | `enum` | `ComboBox` |
| `ifKeywordCase` | enum `KEEP`, `MATCH_IF`, `LOWER_CASE`, `UPPER_CASE` | `enum` | `ComboBox` |
| `parameterLayout` | enum `KEEP_INITIAL_LAYOUT`, `NO_BLANK`, `BEFORE_COMMA`, `AFTER_COMMA`, `BEFORE_AND_AFTER_COMMA` | `enum` | `ComboBox` |
| `operatorSpacing` | enum `KEEP`, `SPACED` | `enum` | `ComboBox` |
| `keywordsToUppercase`, `removeLineContinuation`, `splitSingleLineIf`, `splitInlineComments`, `splitInlineLabelComment`, `collapseMultiLine`, `indentLabelBlocks`, `blankLineAfterReturn` | boolean | `boolean` | `JBCheckBox` |

Defaults decision for the roadmap: the current VS Code default for `indentWidth` is **2**, while the formatter's own default is **4**. Because `package.json` always supplies a value, VS Code would send `2` forever. Keep 2 (no surprise for existing users) or move to 4 (matches the engine and IntelliJ's `FormatOptions.defaults()`); either way choose it once and use it in both IDEs, with the docs saying which. Enum wire values are upper-case; bbj-ls matches them ASCII case-insensitively.

## What can be removed

| Item | Where | Note |
|------|-------|------|
| `BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`, `lib/jcommander-1.71.jar`, `lib/bom.json`, `lib/README.md` (whole `tools/formatter/`) | `bbj-vscode/tools/formatter/` | The jcommander jar is a vendored Java library, not an npm package; no `package.json` or lockfile change. Remove the matching `.vscodeignore` lines (`tools/formatter/lib/bom.json`, `lib/README.md`). The formatter-jar SBOM/provenance work from v4.7 (DEP-02/#507) is retired with it. |
| `src/formatter-verifier.ts`, `src/formatter-java-resolver.ts`, `src/document-formatter.ts` | `bbj-vscode/src/` | And their tests: `document-formatter.test.ts`, `formatter-verifier-tamper.test.ts`, `formatter-pins-drift.test.ts`, `formatter-java-resolver.test.ts`. |
| `registerDocumentFormatter` + the `DocumentFormatter` import | `extension.ts` (line 14 and ~493, 604–611) | Required, not cosmetic: a leftover provider duplicates the auto-registered LSP one. |
| `bbj.formatter.javaPath` | `package.json` | Machine-scoped setting; the Workspace-Trust and `javaPath` hardening from v4.7 Phase 110 goes with it. |
| `bbj.formatter.splitSingleLineIF` | `package.json` | Replaced by `splitSingleLineIf` (deprecation message plus one-release fallback read, see above). |
| bbjlst **denumber** path | `Commands/Commands.cjs` (`denumber`, `decompileInPlace` with `options.denumber`), `Commands/process-args.ts` (the `denumber` flags of `buildDecompileArgv`: `['-l']`, `['-l','-xlst']`), `decompile-io.ts` (`.lst` handling used only by denumber), `open-file-prompts.ts` (rewire to the LS command) | **Keep** `bbjlst`, `bbjlstBin`, `BbjBinaryName` and the tokenized-program decompile (`bbj.decompile`, decompile-on-open): the requirements say decompile stays. Re-check `command-argv-injection.test.ts`, `commands-cjs-execution.test.ts`, `no-shell-command-construction.test.ts`, `decompile-io.test.ts` and `bbj-home-layout.test.ts` for denumber cases. |
| Docs and QA references | `documentation/docs/vscode/commands.md`, `documentation/docs/vscode/configuration.md`, `QA/FULL-TEST-CHECKLIST.md` | These are the only three non-source files that mention the removed pieces. |

Nothing to remove on the IntelliJ side: no formatter, no denumber, and no `FormattingModelBuilder` exist there today.

## Installation

```bash
# bbj-vscode — nothing to install. No new packages in package.json or package-lock.json.
# Verify the tree is unchanged after the milestone:
npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode ls langium vscode-languageclient vscode-jsonrpc

# bbj-intellij — no Gradle dependency change. LSP4IJ stays on:
#   plugin("com.redhat.devtools.lsp4ij:0.21.0")
# bbj-ls (Maven, sibling repo) — no change; formatProgram/denumProgram ship in BBj 26.03's bbj-ls.jar.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Implement `Formatter` directly in `lsp.Formatter` | Extend `AbstractFormatter` | Only for a CST-rule formatter written in TypeScript. Not here: it adds an error-free gate and a rule engine we do not use. |
| `formatProgram` over the existing :5008 connection | Shell out to the standalone `bbj-ls-formatter.jar` CLI (JRE-only, accepts the old `BBjCFCli` flags, exit 3 = needs DENUM) | If BBjServices cannot be assumed running. It keeps `java` discovery, the resolver/verifier and `javaPath`, and cannot DENUM. The milestone explicitly cuts that over; record it only as the offline fallback that was rejected. |
| VS Code settings via the existing pushed `bbj` section | A per-request `workspace/configuration` pull with `scopeUri`, `resource`-scoped settings | If per-folder formatter settings in multi-root workspaces become a requirement. |
| IntelliJ settings as extra `FormattingOptions` keys | `initializationOptions` + restart; nested `createSettings()` | `initializationOptions` is the existing house pattern and is acceptable if live updates are judged not worth the new LSP4IJ subclass. `createSettings()` only after hardening `configuration-change-handler.ts` against partial `bbj` payloads. |
| DENUM as `workspace/executeCommand` + `workspace/applyEdit` | Custom `bbj/denum` request (as `bbj/compile` does) | If a host needs the denumbered text returned, for example to write to disk with no open editor. Costs an IntelliJ server-interface method and a `ComposerRequestContractTest`-style entry. |
| Static capability + "requires BBj 26.03" message | Dynamic registration after probing the peer | Only if showing a dead "Format Document" on BBj < 26.03 is judged unacceptable. Adds a probe, a registration lifecycle and a race with the connection breaker. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `AbstractFormatter` / `Formatting.*` node rules | See above; wrong abstraction for an external engine | A plain `Formatter` |
| The parse lane for DENUM / `allowDenum` | Queues behind live parses on bbj-ls's single parser worker | The shared connection |
| `allowDenum: true` on every format | DENUM rewrites a whole file; a silent line-number-to-label conversion on format-on-save is a surprise edit. A `range` request never DENUMs anyway (`-33006` whatever `allowDenum` says) | Send `allowDenum: false`; offer DENUM explicitly on `-33006` |
| Awaiting a `showMessageRequest` inside the format handler | Both clients time the request out; format-on-save has a 750 ms budget | Fire-and-forget the prompt, return `[]` |
| Throwing `ResponseError` for typed errors out of `formatDocument` | VS Code shows "Request textDocument/formatting failed" on every save | Catch, message once, return `[]` |
| A `FormattingModelBuilder` / `lang.formatter` in the IntelliJ plugin | Silently disables LSP4IJ formatting (`isEnabled` is false when one exists) | Leave unregistered |
| `Number.MAX_SAFE_INTEGER` / `Integer.MAX_VALUE` as an end position | lsp4j `Position.character` is an `int`; this already broke compile diagnostics once | `textDocument.positionAt(text.length)` |
| Passing the whole `bbj.formatter` object through as `settings` | Unknown keys (`javaPath`, `splitSingleLineIF`) turn into `-33007` for every format | Whitelist the 15 keys |
| New `vscode-jsonrpc` 9.x / Langium 4.4 bumps in this milestone | Out of scope; Langium 4.4 has a measured 2.5–3.3 s/parse regression (#2236) | Stay on `~4.3.1` / `^8.2.1` |
| A custom LSP4IJ `LanguageClientImpl.createSettings()` rewrite | Pushes a partial `bbj` object that resets `configPath` | `FormattingOptions` extras |

## Stack Patterns by Variant

**If the interop peer answers `-32601` (BBj < 26.03 or an old bbj-ls):**
- Show one "Formatting and DENUM require BBj 26.03 or later" message per connection generation; do not latch the endpoint off permanently (a restarted BBj can be upgraded). Reuse the probe-and-latch wording style of `bbj-parser-service.ts` but with message dedupe rather than a hard off switch.

**If the interop peer is unreachable (breaker open, BBjServices not running):**
- The connection raises `InteropTransportError`; map it to "BBj language services are not reachable on host:port" and return `[]`. This is the case that did not exist with the jar-based formatter, so it needs its own wording and QA row.

**If the user evaluates IntelliJ formatting and decides "disabled":**
- Ship `BbjFormattingFeature.isEnabled → false` (client-side only); keep the 15 settings page only if VS Code parity is wanted there. Either decision leaves the server untouched.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `langium@4.3.1` | `vscode-languageserver@10.0.1`, `vscode-languageserver-protocol@3.18.2` | The same `Formatter` / `ExecuteCommandHandler` interfaces exist in 4.4.0, so the hold costs nothing here. |
| `vscode-languageclient@10.1.2` | server protocol 3.18.x | Auto-registers formatting providers; declares `rangesSupport`, which Langium ignores. |
| `vscode-jsonrpc@8.2.1` (interop) | lsp4j `jsonrpc` 0.20.1 (bbj-ls) | `Content-Length` framing, object params; unchanged from `parseProgram`. |
| LSP4IJ 0.21.0 | IntelliJ 2024.2 (build 242) and newer; ships lsp4j 1.0.0 | `AsyncDocumentFormattingService` and `FormattingService.Feature.FORMAT_FRAGMENTS` exist across that range. `FormattingOptions` is a `Map` subclass in both lsp4j generations. |
| bbj-ls `formatProgram` / `denumProgram` | BBj 26.03 or later | `formatProgram` ships in the same shaded jar as `parseProgram`; DENUM needs the running BBj's `ParserServiceIF`, so `-33004` can mean "DENUM unavailable on this BBj". |

## Gaps (verify in phase research)

- **Peer-side cancel:** whether bbj-ls actually stops a running `formatProgram` / `denumProgram` on `$/cancelRequest` (the methods return `CompletableFuture`s, so lsp4j cancels the future, but a worker blocked inside BBj may run on). Matters for format-on-save and rapid retyping. MEDIUM.
- **IntelliJ live behaviour** of Reformat Code, selection range, Actions on Save, multi-fragment "changed lines", and the error balloon: read from bytecode, not yet exercised. This is the milestone's evaluation phase by design.
- **DENUM edit vs. file on disk:** buffer edit via `applyEdit` versus the old in-place file rewrite, the closed-file explorer case, and whether the open-file prompt saves afterwards.
- **First LSP4IJ release** that has `getFormattingOptions` (believed 0.18.x). Only matters if the runtime LSP4IJ can be older than 0.21.0.

## Sources

- `/home/coder/repos/bbj-ls/README.md` ("JSON-RPC methods", "Conventions", "Error codes", threading and supersession notes) and `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` ("Settings reference", error message forms, API, CLI) — HIGH (primary spec, both read in full).
- `/home/coder/repos/bbj-language-server/bbj-vscode/node_modules/langium/lib/lsp/{formatter.d.ts,language-server.js,execute-command-handler.d.ts}` and `lib/workspace/configuration.js` (4.3.1) — HIGH (installed code, read directly).
- `/home/coder/repos/bbj-language-server/bbj-vscode/node_modules/vscode-languageclient/lib/common/formatting.js` (10.1.2) — HIGH.
- `bbj-vscode/src/extension.ts`, `document-formatter.ts`, `language/{bbj-module,main,configuration-change-handler,config-path-trust,java-interop-connection,java-interop,bbj-parser-service,bbj-document-builder,bbj-ws-manager}.ts`, `Commands/{Commands.cjs,process-args.ts}`, `open-file-prompts.ts`, `package.json`, `.vscodeignore` — HIGH (the code being changed).
- `bbj-intellij/build.gradle.kts`, `plugin.xml`, `BbjLanguageServerFactory.java`, `BbjLanguageClient.java`, `BbjSettings.java`, `BbjSettingsComponent.java`, `BbjLanguageCodeStyleSettingsProvider.java`, `Lsp4ij*Test.java` — HIGH.
- LSP4IJ 0.21.0 jar (`javap -c/-v` on `LSPFormattingFeature`, `AbstractLSPFormattingService`, `LSPFormattingSupport`, `LanguageClientImpl`, `ServerMessageHandler`, plugin.xml change notes; `lsp4j-1.0.0` `FormattingOptions`) — HIGH for what the bytecode does, MEDIUM for how IntelliJ's platform drives it.
- GitHub API `redhat-developer/lsp4ij` releases (0.21.0 published 2026-08-31 is the newest; 0.20.2 same day) — HIGH. (A WebFetch summary of the release page gave a wrong year for 0.21.0 and was discarded.)
- LSP4IJ `docs/LSPSupport.md` (formatting EP names, `workspace/configuration` supported) — MEDIUM (summarised by a fetch tool; consistent with the jar).
- `npm view` for `langium` (4.4.0), `vscode-languageserver` (10.1.2), `vscode-languageclient` (10.1.2), `vscode-jsonrpc` (9.0.3) — HIGH.

---
*Stack research for: bbj-ls DENUM & format migration (v4.9)*
*Researched: 2026-10-01*
