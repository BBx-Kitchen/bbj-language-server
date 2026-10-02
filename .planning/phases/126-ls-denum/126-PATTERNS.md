# Phase 126: LS DENUM - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 14 (7 new, 7 modified)
**Analogs found:** 14 / 14
**All analog paths are git-tracked** (checked with `git ls-files`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `bbj-vscode/src/language/denum-command.ts` (new) | route (custom request) | request-response | `bbj-vscode/src/language/compile-command.ts` | exact |
| `bbj-vscode/src/language/denum-notifications.ts` (new) | config (contract constants + DTOs) | pub-sub (notification) | `bbj-vscode/src/language/format-settings-notification.ts` | exact |
| `bbj-vscode/src/language/bbj-denum-service.ts` (new) | service | request-response + event-driven (offer click) | `bbj-vscode/src/language/bbj-format-service.ts` | role-match |
| `bbj-vscode/src/language/bbj-notifications.ts` (edit) | utility (connection-free senders) | pub-sub / request-response | same file, `showFormatterWarningWithAction`, `showFormatterDocument`, `notifyOpenFormatterSettings` | exact |
| `bbj-vscode/src/language/bbj-format-service.ts` (edit) | service | request-response | itself (`reportFailure` seam, `notice()` ledger) | exact |
| `bbj-vscode/src/language/bbj-module.ts` (edit) | config (DI) | n/a | same file, `BBjFormatService` entries | exact |
| `bbj-vscode/src/language/main.ts` (edit) | config (registration) | n/a | same file, `registerCompileRequest` | exact |
| `bbj-vscode/src/denum-diagnostics-output.ts` (new) | utility (pure formatter) | transform | `appendOutputLine` neighbourhood in `extension.ts`; no pure-formatter twin | partial |
| `bbj-vscode/src/extension.ts` (edit) | component (client handler) | event-driven | same file, `registerFormatterSettingsLink` (610-617) | exact |
| `bbj-vscode/test/denum-command.test.ts` (new) | test | request-response | `bbj-vscode/test/compile-request.test.ts` | role-match |
| `bbj-vscode/test/bbj-denum-service.test.ts` (new) | test | request-response | `bbj-vscode/test/bbj-format-notices.test.ts` | exact |
| `bbj-vscode/test/fake-server-connection.ts` (new) | test helper | n/a | `createFakeConnection()` in `bbj-format-notices.test.ts` (37-47) | exact (extract) |
| `bbj-vscode/test/bbj-test-module.ts` (edit) | test helper | n/a | same file, `formatProgramCalls` (197-234) | exact |
| `bbj-vscode/test/bbj-format-notices.test.ts`, `activation-command-coverage.test.ts` (edit) | test | n/a | themselves | exact |

## Pattern Assignments

### `bbj-vscode/src/language/denum-command.ts` (route, request-response)

**Analog:** `bbj-vscode/src/language/compile-command.ts`

**Header and imports** (lines 1-32). Same MIT/TypeFox banner, then a doc block that states what the module is and is not. Imports are `import type { Connection, ... } from 'vscode-languageserver'` plus `.js`-suffixed local imports.

**Method constant + params** (lines 34-40):
```typescript
export const COMPILE_REQUEST_METHOD = 'bbj/compile';
export interface CompileParams { uri: string; }
```
Copy as `DENUM_REQUEST_METHOD = 'bbj/denum'`, `DenumParams { uri: string }`.

**Closed reason vocabulary with a "never rename" doc** (lines 42-57): a string-literal union plus the comment "Adding a value later is safe; renaming one is not." Copy this comment. Vocabulary is in RESEARCH Pattern 1.

**Result DTO** (lines 59-66): plain JSON, optional `reason`/`message`. Use RESEARCH's `DenumResult`.

**Structural deps** (lines 68-81): the handler takes an interface-typed `deps` (not concrete services) so tests use plain stubs and there is no circular import to `bbj-module.ts`.
```typescript
export interface CompileRequestDeps {
    cplService: { compileWithOptions(filePath: string, compilerArgs: string[]): Promise<CompileRun>; };
    ...
}
```
For denum: `deps = { documents: { get(uri): TextDocument | undefined }, denum: { run(...) } }`.

**Handler factory + register** (lines 92-93, 147-150):
```typescript
export function createCompileHandler(deps: CompileRequestDeps): (params: CompileParams) => Promise<CompileResult> {
    return async (params: CompileParams): Promise<CompileResult> => { ... };
}
export function registerCompileRequest(connection: Pick<Connection, 'onRequest'>, deps: CompileRequestDeps): void {
    connection.onRequest(COMPILE_REQUEST_METHOD, createCompileHandler(deps));
}
```

**Deviation from the analog:** compile validates then returns `{success:false, reason}`; it never throws on bad input (lines 94-102, `invalid-file-uri`). Keep that style: return `reason: 'invalid-params'` for a non-string `params?.uri`, never throw (RESEARCH anti-pattern). Resolve the document from `TextDocuments` only, never from disk.

---

### `bbj-vscode/src/language/denum-notifications.ts` (config, pub-sub)

**Analog:** `bbj-vscode/src/language/format-settings-notification.ts` (whole file, 33 lines)

Copy the structure: banner, doc block saying "method-name constant, plain-JSON payload type, no Langium or editor imports", the "single owner of this method string" comment, and a trust note that a host must not turn the payload into a command, path or document location.
```typescript
export const OPEN_FORMATTER_SETTINGS_METHOD = 'bbj/openFormatterSettings';
export interface OpenFormatterSettingsParams { keys: string[]; }
```
New content: `DENUM_DIAGNOSTICS_METHOD = 'bbj/denumDiagnostics'`, `SHOW_DENUM_DIAGNOSTICS_METHOD = 'bbj/showDenumDiagnostics'`, `DenumDiagnosticDto`, `DenumDiagnosticsParams` (RESEARCH Pattern 4). `DenumDiagnosticDto` reuses the `ProgramDiagnostic` shape from `java-interop-program-types.ts:38-49` (`line` 1-based, `0` = no location; `originalLineNumber: string`; `severity: ProgramSeverity`; `message`).

---

### `bbj-vscode/src/language/bbj-denum-service.ts` (service, request-response + event-driven)

**Analog:** `bbj-vscode/src/language/bbj-format-service.ts`

**Imports** (lines 11-24): type-only imports for `CancellationToken`, `TextDocument`, program types; value imports for `minimalLineEdit`, the notification senders and `logger`:
```typescript
import type { CancellationToken, Range, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { JavaInteropService } from './java-interop.js';
import { minimalLineEdit } from './bbj-format-edit.js';
import { logger } from './logger.js';
```
Reuse by import, do not copy: `TOKENIZED_PROGRAM_PREFIX` (27), `GO_TO_LINE_ACTION` (64), `OPEN_SETTINGS_ACTION` (61), `invalidSettingsMessage` (72), `mixedNumberingMessage` (86), `FORMAT_TOO_LARGE_MESSAGE`-style constants for wording.

**Structural context + lazy cross-service lookup** (lines 138-158):
```typescript
export interface BBjFormatServiceContext { java: { JavaInteropService: JavaInteropService; }; }
constructor(services: BBjFormatServiceContext) { this.javaInterop = services.java.JavaInteropService; }
```
`BBjDenumService` takes a context with `java` plus a late-bound `compiler.BBjFormatService` (for `settingsSnapshot()` and the settings revision/key lookup), resolved inside methods, not the constructor.

**Own messenger interface with a default built from the connection-free senders** (lines 95-126). This is the template for `DenumMessenger` (do NOT grow `FormatMessenger`, see Pitfall 7):
```typescript
export interface FormatMessenger { warn(text: string): void; warnWithAction(text, actionTitle, onAction): void; ... }
const DEFAULT_MESSENGER: FormatMessenger = {
    warn: showFormatterWarning,
    warnWithAction(text, actionTitle, onAction) {
        void showFormatterWarningWithAction(text, actionTitle).then(picked => {
            if (picked === actionTitle) { try { onAction(); } catch { /* late click must not reject */ } }
        });
    },
    ...
};
private messenger: FormatMessenger = DEFAULT_MESSENGER;
public setMessenger(messenger: FormatMessenger): void { this.messenger = messenger; }
```

**Request type with a live re-read** (lines 128-136): `BBjFormatRequest { document; range?; current(): TextDocument | undefined }`. Model `DenumRequest` on this; the offer click reads `request.current()` at click time.

**Capture-then-recheck core** (lines 191-220; this is the shape `run()` must follow):
```typescript
const version = request.document.version;
const sent = request.document.getText();
if (sent.startsWith(TOKENIZED_PROGRAM_PREFIX)) { ...return; }
const outcome = await this.javaInterop.formatProgram(params, token);
if (token.isCancellationRequested) { ... }
const live = request.current();
if (live === undefined || live.version !== version) { /* drop, never apply */ }
```
Differences: use `request.current()` for the first read too (D-07: act on the buffer at click time); omit `canonicalName`; send `{ text, version: String(version) }` to `denumProgram`, or `{..., settings: this.format.settingsSnapshot(), allowDenum: true}` to `formatProgram`; wrap in a `try/catch` that produces ONE Warning (`format()` swallows silently at 213-219, which is wrong here).

**Edit build** (line 248-253): `minimalLineEdit(request.document, 0, sent.length, outcome.result.text)`. Narrow `formatProgram` results on `outcome.result.scope === 'document'`. Compute the edit only after the version re-check, with the captured `sent.length`.

**Outcome switch to mirror** (lines 273-301 `report`, 341-369 `reportFailure`): same `outcome.kind` / `failure` switch, but map to RESEARCH's Outcome Mapping table and send every message directly (never through `notice()`).

**Mixed numbering with Go to Line** (lines 326-339):
```typescript
this.messenger.warnWithAction(text, GO_TO_LINE_ACTION, () => {
    const lineCount = (request.current() ?? request.document).lineCount;
    const clamped = Math.max(0, Math.min(line - 1, lineCount - 1));
    this.messenger.showDocument(request.document.uri, clamped);
});
```
**Invalid settings with Open Settings** (lines 308-320): key list built with `FORMATTER_KEY_PREFIX` plus `settings.userKeyFor`, action calls `openFormatterSettings({ keys })`. For `denum-and-format` only; this needs `userKeyFor` access via the format service (expose a small public method or reuse `invalidSettingsMessage` through the holder).

**Offer shape:** `offer(request)` shows the prompt without awaiting it (`void ...then(picked => ...)` as in `DEFAULT_MESSENGER.warnWithAction`) and on a pick calls `run(...)` with `'denum'` or `'denum-and-format'`. Needs a multi-action variant of `showFormatterWarningWithAction` (see `bbj-notifications.ts` below).

---

### `bbj-vscode/src/language/bbj-notifications.ts` (edit; utility, pub-sub)

**Analog:** the same file. New senders are siblings of the 125 ones.

**Never-rejecting prompt returning the picked title** (lines 91-105):
```typescript
export function showFormatterWarningWithAction(text: string, actionTitle: string): Promise<string | undefined> {
    const connection = _connection;
    if (!connection) { return Promise.resolve(undefined); }
    const prompt = async (): Promise<string | undefined> => {
        try {
            const picked = await connection.window.showWarningMessage(text, { title: actionTitle });
            return picked?.title;
        } catch { return undefined; }
    };
    return prompt();
}
```
Add: a multi-action Warning (`...titles.map(title => ({ title }))`, `showWarningMessage` at `server.d.ts:141`) and an Information equivalent (`showInformationMessage`, `server.d.ts:151`) for the offer, success and "nothing to do" messages. Keep the same shape.

**Fire-and-forget notification sender** (lines 130-137):
```typescript
export function notifyOpenFormatterSettings(params: OpenFormatterSettingsParams): void {
    try {
        const pending = _connection?.sendNotification(OPEN_FORMATTER_SETTINGS_METHOD, params);
        void Promise.resolve(pending).catch(() => { /* the client may not handle it */ });
    } catch { /* must never break anything */ }
}
```
Copy for `notifyDenumDiagnostics(params)` and `notifyShowDenumDiagnostics()`. Add the import beside line 16 for the new constants.

**applyEdit sender:** no existing analog (no `workspace.applyEdit` in the repo). Use `_connection.workspace.applyEdit(...)` with the same `_connection` null guard and `try/catch` returning `{applied:false}` on failure; the response shape is `ApplyWorkspaceEditResponse` (`server.d.ts:283`). See RESEARCH Pattern 3.

---

### `bbj-vscode/src/language/bbj-format-service.ts` (edit; the `denum-needed` seam)

**Analog:** itself.

Replace lines 354-356:
```typescript
case 'denum-needed':
    this.contentNotice('denum-needed', documentScope, described, FORMAT_DENUM_NEEDED_MESSAGE);
    return;
```
with a `this.notice(kind, documentScope, 'Format notice: ...', () => denumOffer(...))` call. `reportFailure(failure, code, generation, documentScope)` (341) lacks the request: widen it (the call site is line 299, `report()` already has `request`). Use two kinds (`denum-needed` for a document, `denum-needed-selection` when `request.range !== undefined`) so one does not suppress the other. Reuse the `notice()` ledger (384-403); do not add a second one. Remove `FORMAT_DENUM_NEEDED_MESSAGE` (lines 50-52); its importers are `bbj-format-notices.test.ts` lines 15, 237, 258, 304. Reach the denum service through a structural optional context slice or a `setDenumOffer(fn)` seam mirroring `setMessenger` (173-175).

---

### `bbj-vscode/src/language/bbj-module.ts` and `main.ts` (edit)

**bbj-module.ts** type slot (lines 68-72) and factory (lines 104-108):
```typescript
compiler: { BBjCPLService: BBjCPLService, BBjParserService: BBjParserService, BBjFormatService: BBjFormatService }
...
BBjFormatService: (services) => new BBjFormatService(services),
```
Add `BBjDenumService` to both, plus the import near line 47.

**main.ts** (import line 18, registration lines 73-76):
```typescript
import { registerCompileRequest } from './compile-command.js';
registerCompileRequest(connection, {
    cplService: BBj.compiler.BBjCPLService,
    wsManager: shared.workspace.WorkspaceManager as BBjWorkspaceManager,
});
```
Add `registerDenumRequest(connection, { documents: shared.workspace.TextDocuments, denum: BBj.compiler.BBjDenumService })` directly after it, before `startLanguageServer(shared)` (line 101). Keep the leading doc comment style (a sentence on what it exposes for both IDEs).

---

### `bbj-vscode/src/extension.ts` (edit; client handler) and `denum-diagnostics-output.ts` (new)

**Analog:** `registerFormatterSettingsLink`, lines 610-617 (called at 493), with `appendOutputLine` at lines 58-64 and the channel created at line 477 (`createOutputChannel('BBj', { log: true })`).
```typescript
function registerFormatterSettingsLink(context: vscode.ExtensionContext, deps: { client: LanguageClient }): void {
    const { client } = deps;
    context.subscriptions.push(
        client.onNotification(OPEN_FORMATTER_SETTINGS_METHOD, () => {
            void vscode.commands.executeCommand('workbench.action.openSettings', FORMATTER_SETTINGS_QUERY);
        })
    );
}
```
Add `registerDenumDiagnosticsOutput(context, { client, outputChannel })` beside it with two `client.onNotification` pushes (RESEARCH "VS Code handlers"). The doc comment states the handler "never reads the payload" for command-like use; for the list handler the payload is rendered as text only. Write lines with `appendOutputLine` (raw `appendLine`), not `outputChannel.info/warn`. The "Show" handler calls `outputChannel.show(true)`.

The pure formatter in `src/denum-diagnostics-output.ts` has no direct twin; keep it free of `vscode` imports so it unit-tests without mocks, and make it tolerate a malformed payload (non-array `diagnostics`, missing fields) without throwing. Print `line 0` as "no location".

---

### Tests

**`test/denum-command.test.ts`**, analog `test/compile-request.test.ts`: construct the handler via `createXHandler(deps)` with stub deps (see `withCompilerConfig` stub at 38-43 as the stubbing style), call `handler({ uri })`, assert on the result. Use `createBBjTestServices` (not `createBBjServices`; the compile test uses the production one only because it needs a real service).

**`test/bbj-denum-service.test.ts`**, analog `test/bbj-format-notices.test.ts`:
- Harness wiring (lines 49-62): `createBBjTestServices(EmptyFileSystem)`, cast `BBj.java.JavaInteropService as JavaInteropTestService`, `listenOnFakeConnection(textDocuments)` from `test/fake-text-document-connection.ts` to open/change documents, `initNotifications(fake.connection)`.
- Recording messenger (lines 65-74) uses `satisfies FormatMessenger`; make a twin `satisfies DenumMessenger` installed with `setMessenger`.
- Logger spy and helpers (lines 78-101): `spyOnLogger`, `loggedLines`, `deferred`, `warnedTexts`.
- Teardown (lines 103-106): `vi.restoreAllMocks(); initNotifications(null as unknown as Connection);`.
- Script wire answers with `double.scriptDenumProgram(...)` and `wireError(code)` (line 224 of the notices test).

**`test/fake-server-connection.ts`** (new shared helper): extract `createFakeConnection()` from `bbj-format-notices.test.ts` lines 36-47 and add `workspace.applyEdit: vi.fn()` (defaults to `async () => ({ applied: true })`) next to `window.showWarningMessage/showInformationMessage/showDocument` and `sendNotification`:
```typescript
function createFakeConnection() {
    const window = { showWarningMessage: vi.fn(), showErrorMessage: vi.fn(), showInformationMessage: vi.fn(), showDocument: vi.fn() };
    const sendNotification = vi.fn();
    const connection = { window, sendNotification } as unknown as Connection;
    return { connection, window, sendNotification };
}
```
Switch the notices test to import it (the file's own copy then disappears).

**`test/bbj-test-module.ts`** `denumProgram` recording: mirror lines 200-201 and 220-221. Add `public readonly denumProgramCalls: DenumProgramParams[] = [];` and `this.denumProgramCalls.push(structuredClone(params));` as the first line of `denumProgram` (230). `scriptDenumProgram` (210) already exists. The `formatProgramCalls` entries carry `allowDenum`, so "Denumber and Format" is asserted on them.

**`test/activation-command-coverage.test.ts`**: pins `EXPECTED_SEQUENCE` and `EXPECTED_SUBSCRIPTIONS_LENGTH` (32 -> 34 for two new `onNotification` registrations). The `createOutputChannel` mocks lack `show`; the Show test needs its own channel mock.

## Shared Patterns

### Connection-free senders, never throw
**Source:** `bbj-vscode/src/language/bbj-notifications.ts:130-137`. **Apply to:** every new sender (notifications, applyEdit, prompts): null-guard `_connection`, `try/catch`, `void Promise.resolve(pending).catch(() => {})`.

### Capture primitives, re-read the live document, drop stale answers
**Source:** `bbj-format-service.ts:193-212`. **Apply to:** `BBjDenumService.run`. `TextDocuments` mutates documents in place, so never hold a `TextDocument` as a snapshot across an await.

### Closed string vocabulary with a rename warning
**Source:** `compile-command.ts:42-57`. **Apply to:** `DenumFailureReason`, `DenumStatus`.

### Structural-interface dependencies instead of concrete service types
**Source:** `compile-command.ts:68-81`, `bbj-format-service.ts:138-146`. **Apply to:** `denum-command.ts` deps, `BBjDenumService` context.

### Logging without document or peer text
**Source:** `bbj-format-service.ts:384-403` (`logger.warn(logLine)` first, `logger.debug` after) and `:263-272` doc. Log lines carry fixed tokens only.

### Source comment hygiene
Project memory: no phase, plan, `D-xx`, `CR-xx` or requirement ids in source or test comments. Grep the diff before closing the phase.

## No Analog Found

| File / behaviour | Role | Data Flow | Reason |
|------------------|------|-----------|--------|
| server-initiated `workspace/applyEdit` sender | utility | request-response | No `applyEdit` use anywhere in the repo; use RESEARCH Pattern 3 (`OptionalVersionedTextDocumentIdentifier` + `TextDocumentEdit`, `documentChanges`) |
| `denum-diagnostics-output.ts` pure formatter | utility | transform | No existing pure output formatter in `src/`; follow the pure-and-mock-free guideline above |
| multi-action `showMessageRequest` prompt | utility | request-response | Only a single-action helper exists (`bbj-notifications.ts:91-105`); extend it |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/extension.ts`, `bbj-vscode/test/`
**Files read:** compile-command.ts, bbj-notifications.ts, format-settings-notification.ts, bbj-format-service.ts, bbj-format-edit.ts (part), java-interop-program-types.ts (part), bbj-module.ts (part), main.ts (part), extension.ts (parts), bbj-format-notices.test.ts (part), bbj-test-module.ts (part), compile-request.test.ts (part), fake-text-document-connection.ts
**Pattern extraction date:** 2026-10-02
