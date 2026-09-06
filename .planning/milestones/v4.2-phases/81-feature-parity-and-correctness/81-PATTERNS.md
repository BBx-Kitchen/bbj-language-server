# Phase 81: Feature Parity and Correctness - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 21 (new + modified)
**Analogs found:** 20 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-cpl-service.ts` (new method, `-N` path unchanged) | service | request-response (process spawn) | itself, `compile(filePath)` method | exact (same file, sibling method) |
| `bbj-vscode/src/language/bbj-cpl-parser.ts` (possible 2nd parse helper) | utility/transform | transform (stderr→Diagnostic[]) | itself, `parseBbjcplOutput` | exact |
| `bbj-vscode/src/language/compiler-options.ts` (NEW, vscode-free re-home) | utility/config | transform | `bbj-vscode/src/Commands/CompilerOptions.ts` + `process-args.ts` | role-match (source to port, not copy-as-is since it imports `vscode`) |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (+ `compilerOutputDirectory` field/getter) | service/config | event-driven (onInitialize) | itself, `compilerTrigger` block | exact |
| `bbj-vscode/src/language/main.ts` (+ `bbj/compile` request) | route/controller | request-response | `bbj/refreshJavaClasses` handler + `registerComposerRequests` wiring | exact |
| `bbj-vscode/src/language/composer-commands.ts`-style module for `bbj/compile` (or inline in main.ts) | route/controller | request-response | `composer-commands.ts` (`composerHandlers`, `registerComposerRequests`) | exact |
| `bbj-intellij/.../composer/BbjComposerServer.java` (+ `bbj/compile` method, or new interface extending it) | provider (server interface) | request-response | itself | exact |
| `bbj-intellij/.../composer/ComposerModels.java`-style DTOs for `CompileParams`/`CompileResult` | model (DTO) | request-response | `ComposerModels.java` (`DecodeCallParams`, `MsgboxPreview` etc.) | exact |
| `bbj-intellij/.../composer/BbjComposerService.java`-style resolver (or reuse it) for compile | service | request-response | `BbjComposerService.server(project)` | exact |
| `bbj-intellij/.../actions/BbjCompileAction.java` | controller (IDE action) | request-response | itself (currently a stub) + `BbjEMLoginAction`/`BbjRunActionBase` for off-EDT dispatch | exact (self) + role-match (off-EDT) |
| `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (+ `compilerOutputDirectory` initializationOptions key) | provider/config | event-driven (init) | itself, `home`/`classpath`/`configPath` addProperty block | exact |
| `bbj-intellij/.../lsp/BbjLanguageClient.java` (+ nested `compiler.output.directory`, non-load-bearing) | provider/config | request-response (pull, dead per Pitfall 2) | itself, `createSettings()` | exact |
| `bbj-intellij/.../BbjSettings.java` (+ `compilerOutputDirectory` field) | model/config | CRUD (persisted state) | itself, `State` class fields | exact |
| `bbj-intellij/.../BbjSettingsComponent.java` (+ output-directory field/browse button) | component (Swing UI) | request-response (form binding) | itself, `bbjHomeField`/`configPathField` (`TextFieldWithBrowseButton`) | exact |
| `bbj-intellij/.../BbjSettingsConfigurable.java` (+ wiring for new field) | controller (settings) | CRUD | itself (not read this session, but same pattern as Component/Settings) | role-match |
| `bbj-intellij/.../BbjWordLexer.java` (+ STRING/COMMENT emission) | component (lexer) | streaming (char scan) | itself | exact |
| `bbj-intellij/.../BbjTokenTypes.java` (+ STRING, COMMENT) | model (token constants) | — | itself | exact |
| `bbj-intellij/.../BbjParserDefinition.java` (`getStringLiteralElements`/`getCommentTokens`) | provider | — | itself | exact |
| `bbj-intellij/.../BbjPairedBraceMatcher.java` (`isPairedBracesAllowedBeforeType`) | component | — | itself | exact |
| `bbj-intellij/.../BbjCommenter.java` (+ `SelfManagingCommenter`) | component (commenter) | event-driven (toggle) | itself | exact |
| plain-Java seams: `StringCommentScanner` (D-14), `RemCommenter`/similar (D-15) — new files | utility (seam) | transform | `bbj-intellij/.../concurrency/*` seams (e.g. `KeystrokeDebouncer`), `process-args.ts` (pure-function, no-framework-import convention) | role-match |
| test files (JUnit seam tests + `*SourceGuardTest`) | test | — | `OffEdtDispatchSourceGuardTest.java`, `bbj-vscode/test/cpl-service.test.ts` | exact |

## Pattern Assignments

### `bbj-vscode/src/language/bbj-cpl-service.ts` — new options-aware entry point

**Analog:** itself, existing `compile(filePath)` (lines 86-204)

**Imports pattern** (lines 1-7):
```typescript
import { spawn } from 'child_process';
import { resolveBbjBinary } from '../bbj-home-layout.js';
import { Diagnostic } from 'vscode-languageserver';
import { parseBbjcplOutput } from './bbj-cpl-parser.js';
import { notifyBbjcplAvailability } from './bbj-notifications.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { logger } from './logger.js';
```

**Core spawn/timeout/ENOENT pattern to replicate for the new method** (lines 111-203): identical `new Promise<...>((resolve) => {...})` shape, `spawn(bbjcplBin, argv)`, `proc.stderr`/`stdout` accumulation, `proc.on('close', ...)`, `proc.on('error', ...)` with ENOENT graceful degradation. **Differences for the new entry point (per D-01/D-05/D-06):**
- argv comes from the re-homed options module (never hardcoded `['-N', filePath]`)
- success classification must be `stderr.trim() === ''` (Pitfall #3), not `parseBbjcplOutput(stderr).length === 0`
- must NOT publish to `textDocument/publishDiagnostics` — return `{success, diagnostics, reason}` (D-08)
- guard (D-05) runs BEFORE spawn: if no `-d`/output.directory and no `-N` in the resolved argv, resolve immediately with a structured refusal, never call `spawn`

**Error handling pattern** (lines 143-159, 186-202): try/catch around the synchronous `spawn()` call for ENOENT, plus the async `'error'` event handler — both log via `logger` and always resolve (never reject) with an empty/failure result.

**Private helper to reuse as-is** (lines 238-256): `getBbjcplPath()` — resolves `bbjcplBin` via `resolveBbjBinary`; unchanged for the new entry point.

---

### `bbj-vscode/src/language/bbj-cpl-parser.ts` — success/failure classification pitfall

**Analog:** itself, `parseBbjcplOutput` (lines 1-65)

**Existing regex** (line 18):
```typescript
const ERROR_LINE_RE = /^.+:\s+error at line \d+ \((\d+)\):\s*(.*)/;
```
**Pitfall #3 (RESEARCH.md):** this regex does not match bbjcpl's fatal/setup-error lines (`"<path>: error: bbjcpl will not overwrite source file without -F"`, `"Directory <path> does not exist.  Exiting..."`, `"stdin: error: Invalid output directory"`). The new options-aware caller in `bbj-cpl-service.ts` must classify success as `stderr.trim() === ''`, and when `stderr` is non-empty but `parseBbjcplOutput` returns `[]`, treat as failure and surface the raw stderr text (D-07's "or the raw stderr when nothing parses"). Do not modify the existing regex or its behavior for the background `-N` path — add a second, separate classification step in the caller instead.

---

### `bbj-vscode/src/language/compiler-options.ts` (NEW) — vscode-free re-homed option table

**Source to port from:** `bbj-vscode/src/Commands/CompilerOptions.ts` (lines 1-80+, `COMPILER_OPTIONS`, `validateOptions`, `buildCompileOptions`) and `bbj-vscode/src/Commands/process-args.ts` (`buildCompileArgv`, lines 191-194, already `vscode`-free).

**What must change:** `CompilerOptions.ts` imports `vscode` (line 7, `import * as vscode from 'vscode';`) and its functions take `config: vscode.WorkspaceConfiguration` (lines 384, 438). The new module must take a plain object shape (the `bbj.compiler.*` config the LS already receives via `onDidChangeConfiguration`/`initializationOptions`) instead of `vscode.WorkspaceConfiguration`. Preserve the `CompilerOption`/`CompilerOptionGroup`/`ValidationResult` interfaces and the full `COMPILER_OPTIONS` table verbatim (lines ~61+) — only the config-accessor plumbing changes.

**Argv-array convention to reuse exactly** (`process-args.ts` line 193, GHSA-p5f3-9456-9pcx rationale at top of file):
```typescript
export function buildCompileArgv(opts: BuildCompileArgvOptions): Argv {
    const { home, platform = process.platform, compilerOptions, fileName } = opts;
    return { file: bbjcplBin(home, platform), args: [...compilerOptions, fileName] };
}
```
Never build a shell string; always an argv array. This is a hard security constraint (V5 Input Validation, per RESEARCH.md's Security Domain section) — the new options-aware `BBjCPLService` entry point must call `spawn(file, args)` the same array-based way, never string-interpolate.

---

### `bbj-vscode/src/language/bbj-ws-manager.ts` — `compilerOutputDirectory` flat initializationOptions field

**Analog:** itself, the `compilerTrigger` block (lines 89-95, verbatim per RESEARCH.md Code Examples):
```typescript
const compilerTrigger = params.initializationOptions.compilerTrigger;
if (compilerTrigger === 'debounced' || compilerTrigger === 'on-save' || compilerTrigger === 'off') {
    setCompilerTrigger(compilerTrigger);
    logger.info(`Compiler trigger mode: ${compilerTrigger}`);
} else {
    setCompilerTrigger('debounced');
}
```
**Copy this exact shape** for `compilerOutputDirectory`: read `params.initializationOptions.compilerOutputDirectory`, store it on `BBjWorkspaceManager` alongside `bbjdir`/`classpathFromSettings`/`configPath` (see lines 44-58 for the sibling `bbjdir`/`classpathFromSettings`/`configPath` assignments), add a new getter (mirroring `getBBjDir()`, used by `BBjCPLService`). **This is the RESEARCH-corrected, load-bearing path — do NOT route this value through `config.compiler` / `onDidChangeConfiguration` for IntelliJ (Pitfall #2); that channel is dead for IntelliJ's flat `createSettings()` shape.**

---

### `bbj-vscode/src/language/main.ts` — registering `bbj/compile`

**Analog:** `bbj/refreshJavaClasses` handler (line 32) + `registerComposerRequests(connection)` (line 27), and `onDidChangeConfiguration`'s `config.compiler?.trigger` read (lines 133-134) — the latter shows the *pull*-model pattern already used for VS Code (still valid there; only IntelliJ needs the `initializationOptions` route per Pitfall #2).

```typescript
import { registerComposerRequests } from './composer-commands.js';
...
registerComposerRequests(connection);

connection.onRequest('bbj/refreshJavaClasses', async () => {
    // ... existing shared reload sequence ...
});
```
Register `bbj/compile` the same way — either inline `connection.onRequest('bbj/compile', handler)` next to `bbj/refreshJavaClasses`, or (mirroring `composer-commands.ts`'s style more closely, given DTO complexity) a small sibling module exporting a handler + a `registerCompileRequest(connection)` function, called from `main.ts` the same way `registerComposerRequests` is.

---

### `bbj-vscode/src/language/composer-commands.ts` — request/registration pattern to mirror for `bbj/compile`

**Analog:** itself (full file read, lines 1-209)

**Imports/module-doc pattern** (lines 1-13): editor-agnostic domain logic imported from a `vscode`-free sibling module; this file is a thin pass-through of request handlers, no new logic. Same discipline applies to the new `bbj/compile` module: the compile/argv/guard logic lives in `bbj-cpl-service.ts`/`compiler-options.ts`; the request module is a thin dispatcher.

**Handler map + registration pattern** (lines 51-58, 203-208):
```typescript
export const composerHandlers = {
    'bbj/composer/catalogs': () => ({ /* ... */ }),
    // ...
} as const;

export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
`bbj/compile`'s handler signature: `(params: CompileParams) => Promise<CompileResult>` — async, unlike the synchronous composer handlers, since it awaits `BBjCPLService`'s new method.

---

### `bbj-intellij/.../composer/BbjComposerServer.java` — server interface extension for `bbj/compile`

**Analog:** itself (lines 1-55)

```java
public interface BbjComposerServer extends LanguageServer {
    @JsonRequest("bbj/composer/catalogs")
    CompletableFuture<ComposerCatalogs> composerCatalogs();
    // ... existing methods ...
}
```
Add (per RESEARCH.md Pitfall #5 and D-10): either directly on this interface —
```java
@JsonRequest("bbj/compile")
CompletableFuture<CompileResult> compile(CompileParams params);
```
— or on a new interface extending `BbjComposerServer`, **and** update `BbjLanguageServerFactory.getServerInterface()` (currently returns `BbjComposerServer.class`, lines 34-37) to point at whichever interface ends up carrying the method. `getServerInterface()` returns exactly one `Class<? extends LanguageServer>` — this is the single wiring site that must change if a new interface is introduced.

---

### `bbj-intellij/.../composer/ComposerModels.java` — DTO conventions for `CompileParams`/`CompileResult`

**Analog:** itself (full file read, lines 1-251)

**Conventions to copy exactly:**
- Public fields, no getters/setters, field names matching JSON keys exactly (module doc, lines 6-18)
- Params wrapper pattern for multi-field params (lines 66-70, `MsgboxPreviewParams`):
```java
public static final class MsgboxPreviewParams {
    public MsgboxPreviewInput input;
    public MsgboxPreviewParams(MsgboxPreviewInput input) { this.input = input; }
}
```
- `found`/discriminated-result pattern (lines 219-225, `MsgboxDecodeResult`) — for `CompileResult`, mirror this shape: `success: boolean`, `diagnostics: List<Diagnostic>` (Gson DTO for LSP `Diagnostic` — reuse/mirror whatever shape `bbj-cpl-parser.ts` already emits), and a machine-readable `reason` field (nullable string or enum-like string) for refusals/unavailability (D-10).
- File URI param: a `CompileParams` class with a single `String uri` (or `fileUri`) field, following the `DecodeCallParams` two-arg-constructor style (lines 207-210) if a constructor is useful.

---

### `bbj-intellij/.../composer/BbjComposerService.java` — resolver pattern to reuse or mirror

**Analog:** itself (full file, lines 1-31)

```java
public static @NotNull CompletableFuture<BbjComposerServer> server(@NotNull Project project) {
    LanguageServerManager.getInstance(project).start(SERVER_ID);
    return LanguageServerManager.getInstance(project)
            .getLanguageServer(SERVER_ID)
            .thenApply(item -> item == null ? null : (BbjComposerServer) item.getServer());
}
```
If `bbj/compile` is added directly to `BbjComposerServer`, `BbjCompileAction` can call `BbjComposerService.server(project)` unchanged and then `.thenCompose(server -> server == null ? CompletableFuture.completedFuture(null) : server.compile(params))`. The `null` case is the existing "server not running" signal `BbjCompileAction` must handle for its error balloon (D-09).

---

### `bbj-intellij/.../actions/BbjCompileAction.java` — full rewrite target

**Analog:** itself (current stub, lines 1-74) — the `update()` gating logic (lines 44-67) is CORRECT and unchanged; only `actionPerformed()` (lines 26-41) needs a real implementation.

**Keep as-is** (lines 44-67): the BBj-file-extension gate (`.bbj`/`.bbx`/`.src`, excludes `.bbl`) and the `ServerStatus.started` gate — both already match D-09's "existing gating stays."

**Replace `actionPerformed()`** (currently lines 26-41, just logs) with, per D-04/D-09:
1. Save the current document unconditionally (independent of `autoSaveBeforeRun` — note `BbjSettings.State.autoSaveBeforeRun`, seen in `BbjSettings.java` line ~29, exists for a *different* run-action setting; do not reuse/gate on it here)
2. Dispatch via `Task.Backgroundable` with a progress indicator "Compiling `<file>`…" (off-EDT; mirror the off-EDT dispatch convention pinned by `OffEdtDispatchSourceGuardTest.java` — pooled-thread dispatch + `assertIsNonDispatchThread()` inside the async body)
3. Call `BbjComposerService.server(project)` (or an equivalent compile-specific resolver) then the `bbj/compile` request
4. On completion: success → info balloon via `BbjServerService`'s notification group (see below); failure → error balloon + `BbjServerService.logToConsole(...)`

**Off-EDT dispatch pattern to copy** (from `OffEdtDispatchSourceGuardTest.java`'s pinned targets in `BbjRunActionBase.java`/`BbjEMLoginAction.java`, not shown in full here but referenced by the guard test): `executeOnPooledThread(() -> { assertIsNonDispatchThread(); ... })`, assertion as the first statement inside the pooled lambda, occurring exactly once.

---

### `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` — `compilerOutputDirectory` initializationOptions key (the load-bearing channel, Pitfall #2)

**Analog:** itself, `initializeParams` override (lines 40-56)

```java
@Override
public void initializeParams(@NotNull InitializeParams params) {
    super.initializeParams(params);
    BbjSettings.State state = BbjSettings.getInstance().getState();
    JsonObject options = new JsonObject();
    options.addProperty("home", state.bbjHomePath);
    options.addProperty("classpath", state.classpathEntry);
    options.addProperty("javaInteropHost", ...);
    options.addProperty("javaInteropPort", state.javaInteropPort);
    options.addProperty("configPath", state.configPath != null ? state.configPath : "");
    params.setInitializationOptions(options);
}
```
Add one more line: `options.addProperty("compilerOutputDirectory", state.compilerOutputDirectory != null ? state.compilerOutputDirectory : "");` — same flat-key style as every existing entry. This is the **primary recommendation** from RESEARCH.md; do not route this setting through `createSettings()` alone.

**`getServerInterface()` note** (lines 33-37): if `bbj/compile` needs a new interface (Pitfall #5), this method's return value is the one wiring site to update.

---

### `bbj-intellij/.../lsp/BbjLanguageClient.java` — optional, non-load-bearing `createSettings()` addition

**Analog:** itself, `createSettings()` (lines 24-32)

```java
@Override
public @Nullable Object createSettings() {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    JsonObject settings = new JsonObject();
    settings.addProperty("home", state.bbjHomePath);
    settings.addProperty("classpath", state.classpathEntry);
    settings.addProperty("logLevel", state.logLevel);
    return settings;
}
```
Per RESEARCH.md Pitfall #2 and Assumption A1: adding a nested `compiler.output.directory` here is harmless dead code (the pull path resolves to `null` for `section: "bbj"` against this flat object, per the traced `SettingsHelper.findSettings` behavior) — do this only if the planner wants future pull-model readiness; it must NOT be relied on for this phase's correctness. The **load-bearing** value comes from `BbjLanguageServerFactory` above.

---

### `bbj-intellij/.../BbjSettings.java` / `BbjSettingsComponent.java` / `BbjSettingsConfigurable.java` — new setting field

**Analog:** `BbjSettings.State` (lines 22-31) — add `public String compilerOutputDirectory = "";` alongside `configPath`/`emUrl`.

**Analog:** `BbjSettingsComponent.java` (lines 1-60+) — `TextFieldWithBrowseButton bbjHomeField` / similar fields use `FileChooserDescriptorFactory` for directory pickers; follow the same construction pattern for a new `compilerOutputDirectoryField` (directory chooser, per CONTEXT.md discretion note "whether it gets a directory chooser" — a `TextFieldWithBrowseButton` with a directory-only `FileChooserDescriptor` is the established idiom here, matching `bbjHomeField`/`nodeJsField`).

**Debounce note** (module doc, lines 33-38): per-keystroke fields in this component only schedule debounced background lookups via `BbjSettingsLookups`; a plain output-directory text field needs no such lookup (it's just a string, no filesystem validation this phase per RESEARCH.md Open Question #2) — a simple bound `JBTextField`/`TextFieldWithBrowseButton` is sufficient, no `Scheduler`/`KeystrokeDebouncer` needed for this field.

**`BbjSettingsConfigurable.java`** — not read this session; wire the new field the same way `configPath` is already wired (get/set on `BbjSettings.State`, plus the existing "Trigger debounced language server restart" comment at line 86 per RESEARCH.md — this restart is what re-delivers fresh `initializationOptions`, so no additional wiring is needed for the new setting to take effect).

---

### `bbj-intellij/.../BbjWordLexer.java` — STRING/COMMENT token emission

**Analog:** itself (full file, lines 1-105)

**Existing per-char scan loop to extend** (`advance()`, lines 56-93): currently WHITESPACE / WORD / single-char SYMBOL+bracket dispatch via `switch`. Add two new branches BEFORE the bracket-dispatch `else`:
```java
} else if (c == '"') {
    // delegate to the plain-Java string-scan seam (D-14)
    // consumes to closing '"' or run-to-EOL (D-12); "" = escaped quote
    tokenEnd = StringCommentScanner.scanString(buffer, tokenStart, bufferEnd);
    tokenType = BbjTokenTypes.STRING;
} else if (looksLikeRemStart(buffer, tokenStart, bufferEnd)) {
    tokenEnd = StringCommentScanner.scanComment(buffer, tokenStart, bufferEnd);
    tokenType = BbjTokenTypes.COMMENT;
} else {
    // existing punctuation/bracket switch, unchanged
}
```
Existing WORD/SYMBOL/bracket behavior for everything else must stay byte-identical (D-14's explicit constraint) — the new branches must only intercept `"` and word-bounded `rem` (any case), never change how `(`/`)`/`[`/`]`/`{`/`}` are classified outside those two contexts.

**Grammar terminals to mirror exactly** (`bbj.langium` ~923-951, quoted in CONTEXT.md):
```
COMMENT: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/
STRING_LITERAL: /"([^"]|"{2})*"/
```

---

### `bbj-intellij/.../BbjTokenTypes.java` — add STRING, COMMENT constants

**Analog:** itself (lines 1-23)

```java
public static final IElementType WORD = new IElementType("BBJ_WORD", BbjLanguage.INSTANCE);
public static final IElementType SYMBOL = new IElementType("BBJ_SYMBOL", BbjLanguage.INSTANCE);
// Bracket token types for PairedBraceMatcher
public static final IElementType LPAREN = new IElementType("BBJ_LPAREN", BbjLanguage.INSTANCE);
```
Add, same style: `public static final IElementType STRING = new IElementType("BBJ_STRING", BbjLanguage.INSTANCE);` and `public static final IElementType COMMENT = new IElementType("BBJ_COMMENT", BbjLanguage.INSTANCE);`.

---

### `bbj-intellij/.../BbjParserDefinition.java` — wire the new token sets

**Analog:** itself, lines 55-63 (currently both return `TokenSet.EMPTY`):
```java
@Override
public @NotNull TokenSet getCommentTokens() {
    return TokenSet.EMPTY;
}

@Override
public @NotNull TokenSet getStringLiteralElements() {
    return TokenSet.EMPTY;
}
```
Change to `TokenSet.create(BbjTokenTypes.COMMENT)` and `TokenSet.create(BbjTokenTypes.STRING)` respectively (D-13).

---

### `bbj-intellij/.../BbjPairedBraceMatcher.java` — inert brackets inside STRING/COMMENT

**Analog:** itself, `isPairedBracesAllowedBeforeType` (lines 27-32, currently unconditional `true`):
```java
@Override
public boolean isPairedBracesAllowedBeforeType(@NotNull IElementType lbraceType,
                                               @Nullable IElementType contextType) {
    // Safe default: allow auto-closing brackets
    return true;
}
```
Change per D-13: `return contextType != BbjTokenTypes.STRING && contextType != BbjTokenTypes.COMMENT;` — everything else stays `true`. `PAIRS` array (lines 16-20) is unchanged.

---

### `bbj-intellij/.../BbjCommenter.java` — `SelfManagingCommenter` + plain-Java seam

**Analog:** itself, current plain `Commenter` (lines 1-36, `getLineCommentPrefix()` returns literal `"REM "`)

**javap-verified interface contract to implement** (RESEARCH.md Pattern 2, `SelfManagingCommenter<CommenterDataHolder>`, 11 abstract methods): `createLineCommentingState`, `createBlockCommentingState`, `commentLine`, `uncommentLine`, `isLineCommented`, `getCommentPrefix`, `getBlockCommentRange`, `getBlockCommentPrefix`, `getBlockCommentSuffix`, `uncommentBlockComment`, `insertBlockComment`. `SelfManagingCommenter` does NOT extend `Commenter` at the bytecode level — `BbjCommenter` must implement BOTH interfaces (D-15's exact wording: "implements... `SelfManagingCommenter`", not "replaces `Commenter`"), keeping `getLineCommentPrefix()` etc. for other framework call sites.

**Delegate to a plain-Java seam** (D-15/D-18): e.g. `RemToggleSeam.isCommented(line)` / `.comment(line)` / `.uncomment(line)`, unit-tested with JUnit, no IntelliJ imports. `commentLine` inserts `"REM "` at **column 0** regardless of indentation (Pitfall #4 — `SelfManagingCommenter` bypasses `LINE_COMMENT_AT_FIRST_COLUMN`, so this must be hardcoded in the seam/wiring, matching `BbjLanguageCodeStyleSettingsProvider`'s existing `LINE_COMMENT_AT_FIRST_COLUMN = true` intent). `isLineCommented`/`uncommentLine` tolerate optional leading whitespace before `rem` (D-17) when *recognizing*, but new inserts stay at column 0 — these are different rules for read vs. write.

---

## Shared Patterns

### Plain-Java seam convention (no IntelliJ imports, JUnit-tested)
**Source:** `bbj-intellij/.../concurrency/*` (`KeystrokeDebouncer`, `Scheduler`) and the TypeScript-side precedent `bbj-vscode/src/Commands/process-args.ts` (explicitly "No `vscode` import here, intentionally... unit-testable with zero mocks")
**Apply to:** `StringCommentScanner` (D-14), the REM-toggle seam (D-15), and the re-homed `compiler-options.ts` module (D-02) — every seam takes plain primitives (`CharSequence`, `String`, plain config objects) and is tested with zero platform mocks.

### Custom LSP request registration (`bbj/*` namespace, plain JSON)
**Source:** `bbj-vscode/src/language/composer-commands.ts` (`composerHandlers` map + `registerComposerRequests`) and `bbj-intellij/.../composer/BbjComposerServer.java` (`@JsonRequest` + `LanguageServer` extension)
**Apply to:** `bbj/compile` on both sides — plain JSON params/results, Gson DTOs on the IntelliJ side with field names matching JSON keys exactly, one server-interface method exposed via `getServerInterface()`.

### Off-EDT dispatch for LS round-trips and process work
**Source:** `OffEdtDispatchSourceGuardTest.java`'s pinned pattern (`executeOnPooledThread(() -> { assertIsNonDispatchThread(); ... })`, assertion first statement, exactly once)
**Apply to:** `BbjCompileAction.actionPerformed()`'s `Task.Backgroundable` body (D-09/C-03).

### Source-guard test style (wiring assertions via string search on source text)
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` (full file read) — `readSource(Path)`, `countOccurrences`, `indexOf`-based ordering assertions (`assertTrue(pooledIndex < assertIndex, ...)`)
**Apply to:** guards for D-13 (STRING/COMMENT wiring in `BbjParserDefinition`/`BbjPairedBraceMatcher`), D-15/D-18 (`BbjCommenter implements SelfManagingCommenter`), and the `getServerInterface()` single-wiring-site guard (Pitfall #5) if the planner wants one.

### Argv-array-only process invocation (never shell-string interpolation)
**Source:** `bbj-vscode/src/Commands/process-args.ts` (module doc citing GHSA-p5f3-9456-9pcx; `{file, args}` `Argv` interface, `spawn`/`execFile` convention)
**Apply to:** the new options-aware `BBjCPLService` entry point — build argv as an array via the re-homed `compiler-options.ts`/`buildCompileArgv`-equivalent, never string-concatenate options into a shell command.

### bbjcpl exit-code-is-always-0 anti-pattern
**Source:** `bbj-vscode/src/language/bbj-cpl-parser.ts` (existing comment, line ~20-24) + RESEARCH.md Anti-Patterns
**Apply to:** any new success/failure classification logic — never branch on `proc.exitCode`; always classify via `stderr.trim() === ''` plus `parseBbjcplOutput`, with raw-stderr fallback for unmatched non-empty stderr (Pitfall #3).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `bbj-intellij/.../BbjSettingsConfigurable.java` (exact new-field wiring) | controller (settings) | CRUD | Not read this session (RESEARCH.md only greps a single line, line 86); the planner should read the file directly before writing this plan's action section — the `configPath`/`emUrl` wiring pattern in `BbjSettingsComponent.java`/`BbjSettings.State` is the best available proxy and should transfer directly. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/Commands/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (root, `actions/`, `composer/`, `lsp/`), `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/` and `actions/`
**Files scanned:** 18 read in full or targeted ranges (bbj-cpl-service.ts, bbj-cpl-parser.ts, composer-commands.ts, BbjComposerServer.java, BbjComposerService.java, ComposerModels.java, BbjWordLexer.java, BbjTokenTypes.java, BbjParserDefinition.java, BbjPairedBraceMatcher.java, BbjCommenter.java, BbjCompileAction.java, BbjLanguageServerFactory.java, BbjLanguageClient.java, OffEdtDispatchSourceGuardTest.java, BbjSettingsComponent.java (partial), BbjSettings.java (partial), CompilerOptions.ts (partial), process-args.ts (partial)) plus grep passes over bbj-ws-manager.ts / main.ts
**Pattern extraction date:** 2026-09-05
