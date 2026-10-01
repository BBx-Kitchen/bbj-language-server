# Phase 125: LS Formatting - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 16 (9 new, 7 modified)
**Analogs found:** 15 / 16 (all analog paths are git-tracked; `main.ts` lives at `bbj-vscode/src/language/main.ts`)

All paths below are under `/home/coder/repos/bbj-language-server/` unless noted. Source comments must not carry planning ids (D-xx, FMT-xx, plan numbers); describe behaviour in plain words.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/bbj-formatting-handler.ts` (new) | handler/middleware | request-response | `bbj-vscode/src/language/composer-codelens-handler.ts` | exact |
| `bbj-vscode/src/language/bbj-format-service.ts` (new) | service | request-response + dedup state | `bbj-vscode/src/language/bbj-parser-service.ts` | role-match (same interop + generation + `FailureLogCadence`) |
| `bbj-vscode/src/language/bbj-formatter.ts` (new) | provider (`lsp.Formatter`) | request-response | `bbj-vscode/src/language/bbj-code-action-provider.ts` (thin lsp provider, DI-resolved lazily) | role-match |
| `bbj-vscode/src/language/bbj-format-settings.ts` (new) | utility/config | transform | `bbj-vscode/src/language/configuration-change-handler.ts` (settings intake); normalizer code is in RESEARCH Code Example 2 | partial |
| `bbj-vscode/src/language/bbj-format-edit.ts` (new) | utility | transform | `wholeDocumentChangeAsRange` in `bbj-vscode/src/language/bbj-kept-check.ts` (lines ~160-184) - do not reuse; RESEARCH Code Example 1 | partial |
| `bbj-vscode/src/language/format-settings-notification.ts` (new) | contract constants | pub-sub | `bbj-vscode/src/language/config-reload-notification.ts` | exact |
| `bbj-vscode/src/language/bbj-notifications.ts` (mod) | utility | event-driven | itself (`notifyConfigReloadRequired`, `notifyJavaConnectionError`) | exact |
| `bbj-vscode/src/language/bbj-module.ts` (mod) | config/DI | n/a | itself (`lsp:` group lines ~108-118, `compiler:` lines ~66 and ~101) | exact |
| `bbj-vscode/src/language/main.ts` (mod) | config | n/a | itself (registrations after `startLanguageServer`, lines ~100-126) | exact |
| `bbj-vscode/src/language/configuration-change-handler.ts` (mod) | controller | event-driven | itself (compiler trigger block, lines ~95-112) | exact |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (mod) | service | request-response | itself (`compilerTrigger` init block, lines ~109-116) | exact |
| `bbj-vscode/src/extension.ts` (mod) | extension entry | event-driven | itself (`registerConfigReloadStatus` ~line 617, `registerDocumentFormatter` ~605 to delete) | exact |
| `bbj-vscode/test/bbj-test-module.ts` (mod) | test double | request-response | itself (`formatProgram` at ~208-213) | exact |
| `bbj-vscode/test/bbj-formatting-handler.test.ts`, `bbj-format-service.test.ts`, `bbj-format-edit.test.ts`, `bbj-format-settings.test.ts`, `bbj-formatter-capability.test.ts` (new) | test | request-response | `test/composer-codelens-handler.test.ts`, `test/bbj-parser-service.test.ts`, `test/on-save-trigger.test.ts` (capability test) | role-match |
| `bbj-vscode/test/extension-activation.test.ts`, `activation-command-coverage.test.ts` (mod) | test | n/a | themselves (lines 209-231; 264, 278) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (mod) + `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijImportAllowlistTest`, `Lsp4ijCouplingCanaryTest` (mod) | client feature + fence tests | n/a | itself (`setDocumentLinkFeature` anonymous override, lines 88-94) | role-match (must override `isEnabled`, not only `isSupported`) |

## Pattern Assignments

### `bbj-formatting-handler.ts` (handler, request-response)

**Analog:** `bbj-vscode/src/language/composer-codelens-handler.ts`

Shape to copy: named structural `Deps` interface, `createBoundedX(deps)` factory, `registerX(connection: Pick<Connection,...>, shared, bbj)` wiring. Imports (lines 19-25):
```typescript
import type { CancellationToken, CodeLens, CodeLensParams, Connection } from 'vscode-languageserver';
import type { LangiumSharedServices } from 'langium/lsp';
import { URI } from 'vscode-uri';
import type { BBjServices } from './bbj-module.js';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from '../composer-lens-contract.js';
```
Language-id gate and in-memory-only lookups (lines 74-80, 142-145):
```typescript
return async (params, cancelToken) => {
    const uri = URI.parse(params.textDocument.uri);
    if (deps.getLanguageId(uri) === CONFIG_DOCUMENT_LANGUAGE_ID) { ... }
...
getLanguageId: (uri) => shared.workspace.TextDocuments?.get(uri)?.languageId,
getText: (uri) => shared.workspace.TextDocuments?.get(uri)?.getText(),
...
connection.onCodeLens(createBoundedComposerCodeLensHandler(deps));
```
Differences for formatting: use a positive allow-list (`languageId === 'bbj'`, else `[]` with no interop call); no `waitUntil`, no `WorkspaceManager`, no `LangiumDocuments`/`getOrCreateDocument`; `connection.onDocumentFormatting` and `connection.onDocumentRangeFormatting`; try/catch returning `[]` (codelens lines 107-112 return `null` on throw). Get the `TextDocument` from `shared.workspace.TextDocuments.get(uri)`. Register in `main.ts` after `startLanguageServer(shared)`.

### `bbj-format-service.ts` (service, request-response + dedup)

**Analog:** `bbj-vscode/src/language/bbj-parser-service.ts`

Constructor DI via services context, generation tracking and cadence (lines 164-176, 199-206, 220):
```typescript
private readonly failureLogCadence = new FailureLogCadence();
constructor(services: BBjParserServiceContext) {
    this.javaInteropService = services.java.JavaInteropService;
    ...
}
const generation = this.javaInteropService.connectionGeneration;
this.failureLogCadence.syncGeneration(generation);
const params: ParseProgramParams = {
    text: document.textDocument.getText(),
    canonicalName: document.uri.fsPath,
    version: String(document.textDocument.version), ...
```
Imports: `import { classifyInteropError, FailureLogCadence } from './java-interop-errors.js'; import { logger } from './logger.js';`. `FailureLogCadence` (`java-interop-errors.ts:185-217`): `syncGeneration(gen)`, `report(kind, line)` (warn first, debug after). Use it for the log line; the toast ledger is a separate bounded insertion-ordered `Set<string>` of `${kind}|${scopeKey}` (RESEARCH Pattern 4 table and RESEARCH Code Example 3 outline give the outcome switch). Call `this.javaInterop.formatProgram(params, token)` (returns `ProgramOutcome`, types in `java-interop-program-types.ts:135-143`). Register as `compiler.BBjFormatService` in `bbj-module.ts` (interface at ~line 66, factory at ~line 101). Hold settings (and revision) on the service, not a module singleton. Whole-document `canonicalName` = `URI.parse(uri).fsPath`; range = `fsPath + '#range:' + startLine + '-' + endLine`. Never set `allowDenum`.

### `bbj-formatter.ts` (provider, request-response)

**Analog:** `bbj-vscode/src/language/bbj-module.ts` `lsp:` group (lines ~108-118) for registration; implement Langium `Formatter` directly (`formatDocument`, `formatDocumentRange`, `formatDocumentOnType` returns `[]`, `formatOnTypeOptions` returns `undefined`). Resolve `services.compiler.BBjFormatService` lazily inside methods. Registration line to add:
```typescript
Formatter: (services) => new BBjFormatter(services),
```
Capability proof: copy the `buildInitializeResult` cast pattern from `test/on-save-trigger.test.ts:62-72`.

### `format-settings-notification.ts` (contract constants)

**Analog:** `bbj-vscode/src/language/config-reload-notification.ts` (imported at `bbj-notifications.ts:15`). Export the method constant (e.g. `OPEN_FORMATTER_SETTINGS_METHOD = 'bbj/openFormatterSettings'`) and payload type `{ keys: string[] }`, no imports, so server and extension share one constant.

### `bbj-notifications.ts` (utility, event-driven)

**Analog:** itself. Connection-free module with `_connection` set by `initNotifications`; sender helpers use optional chaining (lines 61-80):
```typescript
export function notifyConfigReloadRequired(params: ConfigReloadNotification): void {
    _connection?.sendNotification(CONFIG_RELOAD_METHOD, params);
}
_connection?.window.showErrorMessage(...)
```
Add helpers for `showWarningMessage(text, ...actions)` (fire-and-forget, never awaited in the format path), `window.showDocument`, and `sendNotification(OPEN_FORMATTER_SETTINGS_METHOD, { keys })`. Must not import `main.ts`. Inject these through a small messenger interface on the service so tests use a fake.

### `bbj-format-settings.ts` and `bbj-format-edit.ts` (utilities, transform)

No close source analog. Copy the code verbatim from RESEARCH Code Example 2 (`normalizeFormatterSettings`, 15 defaults, `indentWidth` 2, `splitSingleLineIF` legacy map, `javaPath`/unknown keys dropped) and Code Example 1 (`minimalLineEdit` with `TextDocument.positionAt`). `vscode-languageserver-textdocument` is already imported directly at `bbj-kept-check.ts:22`. Leave `wholeDocumentChangeAsRange` untouched (it splits on `\n` only and can emit an end line past the last line).

### Settings intake: `configuration-change-handler.ts`, `bbj-ws-manager.ts`

**Analog:** same files. `configuration-change-handler.ts` apply-immediately block (before the `isWorkspaceInitialized` gate at ~line 127):
```typescript
if (config.compiler?.trigger !== undefined) {
    const trigger = config.compiler.trigger;
    if (trigger === 'debounced' || ...) { deps.setCompilerTrigger(trigger); }
}
```
Add `formatter?: Record<string, unknown>` to `BbjSettings` and a dep `setFormatterSettings`, called before the gate. `bbj-ws-manager.ts` `onInitialize` (lines ~109-116) reads `params.initializationOptions.compilerTrigger`; add the sibling read of `initializationOptions.formatter`. VS Code side: add `formatter` to the `initializationOptions` list in `extension.ts`. `gatedBbjSettings()` (`config-path-trust.ts:102-107`) already forwards the whole `bbj` section.

### `extension.ts` (extension entry)

**Analog:** itself. Delete `registerDocumentFormatter(context)` call (line 493), the function (lines 605-613) and the `DocumentFormatter` import. Add a notification handler following the existing push-to-subscriptions pattern (lines 627-633, 642):
```typescript
context.subscriptions.push(
    client.onNotification(CONFIG_RELOAD_METHOD, (params: ConfigReloadNotification) => { ... })
);
```
New handler: `client.onNotification(OPEN_FORMATTER_SETTINGS_METHOD, () => vscode.commands.executeCommand('workbench.action.openSettings', 'bbj.formatter'))`; ignore the payload content. Test impact: `extension-activation.test.ts:209-231` (assert `registerDocumentFormattingEditProvider` not called) and `activation-command-coverage.test.ts` (remove `'formatter'` from trace at ~264, add the new `notification:` entry, recompute `EXPECTED_SUBSCRIPTIONS_LENGTH` = 32 at ~278).

### `main.ts` (wiring)

**Analog:** itself, lines ~100-126 (comment block + registration per override):
```typescript
startLanguageServer(shared);
registerBoundedCodeActionHandler(connection, shared, BBj);
registerComposerCodeLensHandler(connection, shared, BBj);
registerConfigAwareHoverHandler(connection, shared);
```
Add `registerBoundedFormattingHandler(connection, shared, BBj);` here with a matching "why" comment (default Langium handler waits on `WorkspaceManager.ready` and calls `getOrCreateDocument`).

### Test double and tests

**Analog:** `bbj-vscode/test/bbj-test-module.ts` lines ~195-225: `scriptFormatProgram`-style script field plus `scriptedProgramOutcome('formatProgram', script, echo, validate)` and `simulateReconnect()` (bumps `_connectionGeneration`). Add `formatProgramCalls: FormatProgramParams[]` recording and a deferred form so the stale-version race and "only 15 keys" assertions are possible. Handler tests: copy the stub-deps style of `test/composer-codelens-handler.test.ts` (never-settling state promise proves the handler never waits). Service tests: follow `test/bbj-parser-service.test.ts` for generation re-arm. Use `parseHelper`, not `DocumentBuilder.build`.

### IntelliJ: `BbjLanguageServerFactory.java` (client features)

**Analog:** itself, lines 88-94:
```java
.setDocumentLinkFeature(new LSPDocumentLinkFeature() {
    @Override
    public boolean isSupported(@NotNull PsiFile file) { return false; }
})
.setCompletionFeature(new BbjCompletionFeature());
```
Imports at lines 10-18 (`com.redhat.devtools.lsp4ij.client.features.LSPDocumentLinkFeature`); add `LSPFormattingFeature` import. Insert `.setFormattingFeature(new LSPFormattingFeature(){...})` (inline anonymous class) overriding `isEnabled`, `isSupported`, `isFormattingSupported`, `isRangeFormattingSupported` as `LSP_FORMATTING_ENABLED && super.x(file)` behind `private static final boolean LSP_FORMATTING_ENABLED = false;` (RESEARCH Code Example 4). Copying the `isSupported`-only pattern would leave Reformat Code live.
Fence tests (same commit): `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` lines ~106-119 (`countOccurrences(body, "setDocumentLinkFeature(")` style; add `setFormattingFeature(` once, order, and constant pinned `false`); `Lsp4ijImportAllowlistTest` (factory entry lines ~55-57 gains `LSPFormattingFeature`; size stays 12); `Lsp4ijCouplingCanaryTest` (experimental-marker test ~69-80, reflective pins ~135-154). Run `cd bbj-intellij && ./gradlew test` after `npm run build`.

## Shared Patterns

### Never-throw, silent cancel
`formatProgram` never rejects and returns `{kind:'cancelled'}` for caller cancellation; the handler/service returns `[]` silently (debug log only). Handler wraps everything in try/catch returning `[]` (codelens-handler lines 107-112).

### Warn-then-debug log cadence
**Source:** `bbj-vscode/src/language/java-interop-errors.ts:185-217` (`FailureLogCadence`). Apply to the service log lines; `syncGeneration(javaInteropService.connectionGeneration)` before reporting.

### Stale-version guard
Capture `textDocument.version` and `getText()` before the await; re-read `TextDocuments.get(uri)?.version` after; mismatch returns `[]` (RESEARCH Pattern 3).

### Logging
`import { logger } from './logger.js';` (as in `bbj-parser-service.ts:8`). Never log document text or the request.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `bbj-format-edit.ts` | utility | transform | No existing LSP line-diff helper; `wholeDocumentChangeAsRange` is unsuitable. Use RESEARCH Code Example 1. |
| Toast dedup ledger (inside `bbj-format-service.ts`) | state | n/a | No existing keyed-per-scope toast ledger; build the bounded `Set` per RESEARCH Pattern 4. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language`, `bbj-vscode/src`, `bbj-vscode/test`, `bbj-intellij/src/main/java/.../lsp`, `bbj-intellij/src/test/java/.../lsp`
**Pattern extraction date:** 2026-10-01
