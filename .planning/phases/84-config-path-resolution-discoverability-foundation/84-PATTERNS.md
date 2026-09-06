# Phase 84: Config Path Resolution & Discoverability Foundation - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 15 (new/modified, from CONTEXT.md D-01..D-16 and Integration Points)
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/config-path-resolver.ts` (new) | service/utility | transform | `bbj-vscode/src/language/bbj-ws-manager.ts` (`initializeWorkspace`'s configPath/bbjdir branch, lines 132-154) | exact — extracted from existing branch |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (modified) | service | CRUD (read setting, resolve) | itself — `configPath`/`bbjdir` fields, `setConfigPath` (lines 281-283) | exact |
| `bbj-vscode/src/language/resolved-config-path-request.ts` (new, name at Claude's discretion) | route/controller | request-response | `bbj-vscode/src/language/compile-command.ts` (`bbj/compile` dispatcher) | exact |
| `bbj-vscode/src/language/bbj-notifications.ts` (modified) | service | pub-sub | itself — `notifyBbjcplAvailability` (lines 29-39) | exact |
| `bbj-vscode/src/language/main.ts` (modified) | controller/route | request-response + pub-sub | itself — `registerCompileRequest` wiring (lines 44-49) + `onDidChangeConfiguration` configPath branch (lines 162-186) | exact |
| `bbj-vscode/src/extension.ts` (modified) | provider | event-driven | itself — `client.onNotification('bbj/bbjcplAvailability', ...)` (lines 827-834) + `onDidOpenTextDocument`/tab-change listeners (lines 762-781) | exact |
| `bbj-vscode/src/Commands/Commands.cjs` (modified: `openConfigFile`, run/web-run configPath fallback) | utility | file I/O | itself — `openConfigFile` (lines 211-219), `stripSentinel` (line 19), web-run fallback (line 97) | exact |
| `bbj-vscode/src/Commands/process-args.ts` (modified: `buildRunArgv`) | utility | transform | itself — `buildRunArgv` (lines 106-117) | exact |
| `bbj-vscode/package.json` (modified: setting description, command title) | config | — | itself — `bbj.configPath` (lines 590-598), `bbj.config` command (lines 82-85) | exact |
| `bbj-intellij/.../composer/BbjComposerServer.java` (modified: add request method) | route/controller | request-response | itself — `bbj/compile` `@JsonRequest` method (lines 65-66) | exact |
| `bbj-intellij/.../lsp/BbjLanguageClient.java` (modified: add `@JsonNotification` handler) | provider | pub-sub | **no analog** — no `@JsonNotification` method exists anywhere in the plugin today; nearest structural precedent is `handleServerStatusChanged` (lines 34-49), an LSP4IJ-framework callback, not a custom notification | partial |
| `bbj-intellij/.../actions/BbjRunActionBase.java` (modified: `getConfigPath`/`getConfigPathArg` read cache instead of raw setting) | service | CRUD | itself — `getConfigPathArg()` (lines 349-360), `getConfigPath()` (lines 374-378) | exact |
| `bbj-intellij/.../BbjFileType.java` + new `BbjConfigFileType.java` (new file-type class) | model/config | — | `BbjFileType.java` (whole file, 37 lines) | exact — direct template |
| `bbj-intellij/src/main/resources/META-INF/plugin.xml` (modified: new `fileType`, no LSP4IJ `languageMapping` for it) | config | — | itself — existing `<fileType>` entry for BBj (lines 128-133) | exact |
| `bbj-intellij/.../BbjSettingsComponent.java` (modified: add `ComponentValidator` for `configPathField`) | component | request-response (UI validation) | itself — `nodeJsField`/`javaInteropPortField` `ComponentValidator` blocks (lines 115-136, 162-175) | exact |

## Pattern Assignments

### `bbj-vscode/src/language/config-path-resolver.ts` (new — shared resolver, D-01/D-04/D-11/D-12)

**Analog:** `bbj-vscode/src/language/bbj-ws-manager.ts`, the `configPath`/`bbjdir` fallback branch inside `initializeWorkspace` (lines 132-154), plus `safeUri`/`resolveTilde` helpers (lines 322-337).

**Fallback + read pattern to extract into the standalone resolver** (lines 132-154):
```typescript
if (this.configPath) {
    try {
        const configUri = safeUri(this.configPath);
        const configContents = await this.fileSystemProvider.readFile(configUri);
        prefixfromconfig = configContents.split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
        logger.info(`Loaded config.bbx from custom path: ${this.configPath}`);
    } catch (e) {
        logger.warn(`Failed to load config.bbx from custom path ${this.configPath}: ${e}`);
    }
} else if (this.bbjdir) {
    try {
        const bbjcfgdir = await this.fileSystemProvider.readDirectory(joinPath(safeUri(this.bbjdir), 'cfg'));
        const configbbx = bbjcfgdir.find(file => file.isFile && file.uri.path.endsWith("config.bbx"));
        ...
    } catch (e) {
        logger.warn("No cfg/config.bbx found in bbjdir. No prefixes loaded.")
    }
} else {
    logger.warn("No bbjdir set. No classpath and prefixes loaded.")
}
```

**Tilde expansion to reuse for D-11** (lines 335-337):
```typescript
export function resolveTilde(input: string): string {
    return input.replaceAll('~', os.homedir())
}
```
D-11 additionally requires: relative-path rejection with a clear message, and OS-normalized/symlink-resolved absolute output (D-04) — neither exists yet; build them as new pure functions in this file, unit-testable like `parseSettings`/`collectPrefixes` at the bottom of `bbj-ws-manager.ts` (lines 304-337), which is the file's own convention for small exported pure helpers below the class.

**D-12 sentinel guard to centralize here too:**
```javascript
// bbj-vscode/src/Commands/Commands.cjs line 19
const stripSentinel = (v) => v === '--' ? '' : (v || '');
```
Mirror this exact one-line guard inside the resolver (treat `--`/blank as unset) so both hosts' existing `stripSentinel`/`getConfigPathArg` calls become a defensive second layer per D-12, not the only layer.

---

### `bbj-vscode/src/language/resolved-config-path-request.ts` (new — `bbj/resolvedConfigPath` request, D-01)

**Analog:** `bbj-vscode/src/language/compile-command.ts` (full file) — the established shape for a `bbj/…` custom request: constant method name, typed params/result interfaces, a `Deps` interface for testability, a `createXHandler(deps)` factory, and a `registerXRequest(connection, deps)` wiring function.

**Structure to copy (lines 33-39, 90-147):**
```typescript
export const COMPILE_REQUEST_METHOD = 'bbj/compile';
export interface CompileParams { uri: string; }
export interface CompileResult { success: boolean; diagnostics: Diagnostic[]; reason?: CompileFailureReason; message?: string; file?: string; }
export interface CompileRequestDeps { cplService: {...}; wsManager: {...}; }
export function createCompileHandler(deps: CompileRequestDeps): (params: CompileParams) => Promise<CompileResult> { ... }
export function registerCompileRequest(connection: Pick<Connection, 'onRequest'>, deps: CompileRequestDeps): void {
    connection.onRequest(COMPILE_REQUEST_METHOD, createCompileHandler(deps));
}
```
For `bbj/resolvedConfigPath`, `deps.wsManager` should expose a method like `getResolvedConfigPath(): string | undefined`, delegating to the resolver above — keep the handler a thin dispatcher exactly as `compile-command.ts` does (no resolution logic in the handler itself).

---

### `bbj-vscode/src/language/bbj-notifications.ts` (modified — push notification on initialize + setting change, D-01/D-14)

**Analog:** itself, `notifyBbjcplAvailability` (lines 29-39) — the exact shape for a dedup'd server->client push:
```typescript
let bbjcplAvailableState: boolean | undefined = undefined;
export function notifyBbjcplAvailability(available: boolean): void {
    if (bbjcplAvailableState !== available) {
        bbjcplAvailableState = available;
        _connection?.sendNotification('bbj/bbjcplAvailability', { available });
    }
}
```
Add `notifyResolvedConfigPath(path: string | undefined): void` following the identical dedup-by-value pattern, sent under a new method name (e.g. `bbj/resolvedConfigPath` — same name as the request per D-01's "same message" requirement so Phase 85 can reuse it, see CONTEXT.md Specific Ideas). `initNotifications(connection)` (lines 25-27) is already the wiring entry point called once from `main.ts`; no new wiring mechanism needed.

---

### `bbj-vscode/src/language/main.ts` (modified — register request, push notification after initialize and on setting change)

**Analog:** itself — request registration (lines 44-49):
```typescript
registerCompileRequest(connection, {
    cplService: BBj.compiler.BBjCPLService,
    wsManager: shared.workspace.WorkspaceManager as BBjWorkspaceManager,
});
```
**Analog:** itself — the exact hook point for re-resolving + pushing on setting change, inside `connection.onDidChangeConfiguration` (lines 162-186):
```typescript
if (!workspaceInitialized) {
    const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    wsManager.setConfigPath(config.configPath || '');
    return;
}
...
wsManager.setConfigPath(config.configPath || '');
```
Add the `notifyResolvedConfigPath(...)` call immediately after each `wsManager.setConfigPath(...)` call (both branches — before AND after `workspaceInitialized`, since D-02 says hosts may query even before the "ready" gate) and once more after `initializeWorkspace` completes at startup (near where `workspaceInitialized = true` is set, lines 100-106).

---

### `bbj-vscode/src/extension.ts` (modified — cache the pushed value, D-02/D-03; drive `bbx-config` association, D-05)

**Analog:** itself — notification listener that toggles host state (lines 827-834):
```typescript
client.onNotification('bbj/bbjcplAvailability', (params: { available: boolean }) => {
    if (params.available) { bbjcplStatusBar.hide(); } else { bbjcplStatusBar.show(); }
});
```
Add `client.onNotification('bbj/resolvedConfigPath', (params: { path?: string }) => { cachedResolvedConfigPath = params.path; applyBbxConfigAssociation(); })` right beside it, holding the "warm cache" D-01/D-03 require in a module-level variable exactly like `bbjcplStatusBar`'s implicit state.

**Analog for D-05's classification trigger set:** the existing tab-open/active-editor listener wiring (lines 762-781):
```typescript
context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
        for (const tab of event.opened) { void maybePromptTokenized(uriFromTab(tab)); }
    })
);
for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) { void maybePromptTokenized(uriFromTab(tab)); }
}
```
D-05 needs the same three-trigger shape (already-open docs at activation, `onDidOpenTextDocument`, `onDidChangeConfiguration`) — `vscode.languages.setTextDocumentLanguage(doc, 'bbx-config')` is the API to call from each trigger; there is no existing call to it in the codebase (new usage), but the trigger wiring above is the direct structural template.

---

### `bbj-vscode/src/Commands/Commands.cjs` (modified — `openConfigFile` uses resolved path, D-10; run/web-run fallback replaced by cache, D-03)

**Analog:** itself — `openConfigFile` (lines 211-219):
```javascript
openConfigFile: function () {
    const home = getBBjHome();
    if (home) {
        return vscode.workspace.openTextDocument(`${home}/cfg/config.bbx`).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    }
},
```
Replace the `${home}/cfg/config.bbx` hardcode with the cached resolved path from `extension.ts`; on missing/absent cache, `vscode.window.showErrorMessage` naming the attempted path (D-10), not a silent fallback.

**Analog:** itself — the sentinel guard already applied to classpath but not configPath (lines 19, 97):
```javascript
const stripSentinel = (v) => v === '--' ? '' : (v || '');
...
const configPath = vscode.workspace.getConfiguration('bbj').configPath || `${home}/cfg/config.bbx`;
```
D-12's folded todo: wrap this `configPath` read (both occurrences, lines 97 and 258) in `stripSentinel(...)` too, mirroring the `sscp` classpath call one line above each.

---

### `bbj-vscode/src/Commands/process-args.ts` (modified — `buildRunArgv`, D-03/D-12)

**Analog:** itself — `buildRunArgv` (lines 106-117):
```typescript
export function buildRunArgv(opts: BuildRunArgvOptions): Argv {
    const { home, platform = process.platform, classpathEntry, configPath, workingDir, fileName } = opts;
    const args: string[] = ['-q'];
    if (classpathEntry) { args.push(`-CP${classpathEntry}`); }
    if (configPath) { args.push(`-c${configPath}`); }
    args.push(`-WD${workingDir}`, fileName);
    return { file: bbjBin(home, platform), args };
}
```
Add the same `configPath === '--' ? undefined : configPath` guard used for classpath elsewhere, as the second defensive layer (D-12) — the caller (`Commands.cjs` `run`) should now pass the cached resolved path instead of the raw setting.

---

### `bbj-vscode/package.json` (modified — setting description D-11, command title D-10)

**Analog:** itself — `bbj.configPath` (lines 590-598) and `bbj.config` command (lines 82-85):
```json
"bbj.configPath": {
  "type": ["string", "null"],
  "default": null,
  "description": "Path to config.bbx file. When not set, defaults to {bbj.home}/cfg/config.bbx. Set this to use a custom config.bbx location for PREFIX resolution.",
  "scope": "window"
},
```
```json
{ "category": "BBj", "command": "bbj.config", "title": "Show the config.bbx file" }
```
Update `description` to state `~`-expansion and absolute-only (D-11); rename `title` away from "config.bbx" per D-10 (e.g. "Show the Active Config File").

---

### `bbj-intellij/.../composer/BbjComposerServer.java` (modified — add `bbj/resolvedConfigPath`, D-01)

**Analog:** itself — the `bbj/compile` method (lines 59-66):
```java
/**
 * ...
 */
@JsonRequest("bbj/compile")
CompletableFuture<CompileResult> compile(CompileParams params);
```
Add `@JsonRequest("bbj/resolvedConfigPath") CompletableFuture<ResolvedConfigPathResult> resolvedConfigPath();` (no params needed) on this same interface — it is the single server-proxy interface (doc comment lines 21-27 explicitly states every custom request family lives here). Add a matching DTO record next to `CompileModels`/`ComposerModels`, boundary-tested the same way (see `ComposerModelsJsonBoundaryTest.java`).

---

### `bbj-intellij/.../lsp/BbjLanguageClient.java` (modified — receive the pushed notification, D-01/D-02/D-03)

**No close analog** — this file only overrides LSP4IJ framework callbacks (`createSettings`, `handleServerStatusChanged`), not a custom `@JsonNotification` handler; none exists anywhere in the plugin. The closest structural precedent for "server push -> cached host state -> UI action" is `handleServerStatusChanged` (lines 34-49):
```java
@Override
public void handleServerStatusChanged(ServerStatus serverStatus) {
    super.handleServerStatusChanged(serverStatus);
    Project project = getProject();
    if (project.isDisposed()) return;
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) return;
        BbjServerService service = BbjServerService.getInstance(project);
        service.updateStatus(serverStatus);
    });
}
```
Add a new method annotated `@JsonNotification("bbj/resolvedConfigPath")` (LSP4J supports declaring notification methods directly on the `LanguageClient` subclass — check LSP4J's `@JsonNotification` import already available transitively via `org.eclipse.lsp4j.services.LanguageServer`/`LanguageClient`), following the same `invokeLater` + project-disposed guard shown above to update a cached value + trigger the file-type override refresh (D-06) and BbjRunActionBase's cache.

---

### `bbj-intellij/.../actions/BbjRunActionBase.java` (modified — read from cache, D-03/D-12)

**Analog:** itself — `getConfigPathArg()` and `getConfigPath()` (lines 349-378):
```java
protected String getConfigPathArg() {
    BbjSettings.State state = ...;
    String configPath = state.configPath;
    if (configPath == null || configPath.isEmpty()) { ... }
    return "-c" + configPath;
}
protected String getConfigPath() {
    BbjSettings.State state = ...;
    String configPath = state.configPath;
    if (configPath != null && !configPath.isEmpty()) { return configPath; }
    ...
}
```
Change both to read the LSP-pushed cached value instead of `state.configPath` directly (D-03); add the `"--".equals(configPath)` sentinel guard mirroring `stripSentinel` (D-12); if the cache is absent, surface a clear error via the run action's existing error-notification path rather than falling back to a guess (D-03).

---

### `bbj-intellij/.../BbjFileType.java` -> new `BbjConfigFileType.java` (new plugin-owned config file type, D-06/D-07)

**Analog:** `BbjFileType.java` (full file, 37 lines) — direct template for a `LanguageFileType`:
```java
public final class BbjFileType extends LanguageFileType {
    public static final BbjFileType INSTANCE = new BbjFileType();
    private BbjFileType() { super(BbjLanguage.INSTANCE); }
    @NotNull @Override public String getName() { return "BBj"; }
    @NotNull @Override public String getDescription() { return "BBj source file"; }
    @NotNull @Override public String getDefaultExtension() { return "bbj"; }
    @Override public Icon getIcon() { return BbjIcons.FILE; }
}
```
New file type needs its own `Language` subclass too (see `BbjLanguage.java`) unless it can share `PlainTextLanguage`/a lightweight custom language with no PSI parser (config files are not parsed as BBj — D-07). Icon: add a new entry to `BbjIcons.java` alongside `BbjIcons.FILE` (config icon already exists as `./images/bbj-config-*.svg` on the VS Code side — reuse the same artwork, converted, for consistency).

**No existing FileTypeOverrider/LanguageSubstitutor usage found anywhere in the plugin** — confirmed via search of `bbj-intellij/src/main/java` and `plugin.xml`. D-06's "file-type override" extension point (`com.intellij.fileTypeOverrider` / `FileTypeOverrider` or `com.intellij.filetype.overrider` XML element) has zero precedent in this codebase; the researcher's verification note in D-06 is not yet resolved by any existing pattern — treat this as new platform-API surface, not a copy from an analog.

TextMate highlighting for BBj today is bound via the fixed pairing of `editorHighlighterProvider`/`lang.syntaxHighlighterFactory` declared per-filetype in `plugin.xml` (lines 140-146) plus `BbjTextMateBundleProvider` registering the bundle (line 148-150) — the new config file type needs the same `editorHighlighterProvider`/`syntaxHighlighterFactory` pair pointed at its own filetype name, sharing the existing `bbx` scope from the bundle (`bbj-vscode`'s `bbx.tmLanguage.json`, already copied byte-identically per CLAUDE.md).

---

### `bbj-intellij/src/main/resources/META-INF/plugin.xml` (modified — new fileType entry, D-06/D-07)

**Analog:** itself — the existing BBj `<fileType>` entry (lines 128-133):
```xml
<fileType
    name="BBj"
    implementationClass="com.basis.bbj.intellij.BbjFileType"
    fieldName="INSTANCE"
    language="BBj"
    extensions="bbj;bbjt;src;bbx"/>
```
Add a parallel `<fileType>` entry for the new config file type with NO `extensions` attribute claiming `.bbx` outright (that would conflict with the existing BBj entry, which currently owns `bbx` per D-07's "today the `.bbx` extension maps to the BBj file type" note) — resolve this conflict explicitly in planning (likely: drop `bbx` from the BBj entry's `extensions` list and let the new file-type override handle `.bbx` dynamically, OR give the new type static `filenames="config.bbx;Config.bbx;config.min;Config.min"` the same way VS Code's `package.json` does it (lines 49-54) plus the override for custom names). Leave the new fileType unmapped in LSP4IJ's `languageMapping` (D-07) — confirm no `<lsp4ij.languageMapping>` entry is added for it (contrast with BBj's own mapping, which is presumably elsewhere in this same file — grep for `languageMapping` when planning this file's diff).

---

### `bbj-intellij/.../BbjSettingsComponent.java` (modified — inline validation for `configPathField`, D-15)

**Analog:** itself — the `nodeJsField` and `javaInteropPortField` `ComponentValidator` blocks (lines 115-136, 162-175):
```java
new ComponentValidator(parentDisposable)
    .withValidator(() -> {
        String path = nodeJsField.getText().trim();
        ...
        if (!lookup.exists()) {
            return new ValidationInfo("File not found: " + path, nodeJsField);
        }
        ...
        return null;
    })
    .installOn(nodeJsField.getTextField());
```
For `configPathField` (currently just a bare `JBTextField`, lines 150-152, with no validator installed): add a `ComponentValidator` returning a warning `ValidationInfo` when the path is not absolute after `~`-expansion or the file does not exist (D-15) — but unlike the Node.js validator (which the Configurable's `isModified` doesn't gate on), Apply must still be allowed, matching the existing "warning only, non-blocking" convention already used for `bbjHomeField` (same file, referenced at lines 209-219 for its `DocumentAdapter`-triggered revalidation) rather than the hard-blocking style. Wire a `DocumentAdapter` on `configPathField` calling `ComponentValidator.getInstance(...).ifPresent(ComponentValidator::revalidate)` exactly as done for `bbjHomeField`/`nodeJsField` (lines 209-230).

## Shared Patterns

### Custom LSP request/notification naming and dispatch (D-01)
**Source:** `bbj-vscode/src/language/compile-command.ts` (request shape), `bbj-vscode/src/language/bbj-notifications.ts` (notification shape), `bbj-intellij/.../composer/BbjComposerServer.java` (single server-proxy interface).
**Apply to:** `resolved-config-path-request.ts`, `bbj-notifications.ts`, `main.ts`, `BbjComposerServer.java`, `BbjLanguageClient.java`.
All new custom LSP surface must follow: constant method-name string, plain-JSON params/result, one dispatcher/one interface — no new server-proxy interfaces, no ad hoc client-side sockets.

### Warm-cache-on-host pattern (D-01/D-02/D-03)
**Source:** `bbj-vscode/src/extension.ts` `client.onNotification('bbj/bbjcplAvailability', ...)` + module-level state; `bbj-intellij/.../actions/BbjRunActionBase.java` reading `state.configPath` directly today (to be redirected to the cache).
**Apply to:** `extension.ts`, `BbjLanguageClient.java`, `BbjRunActionBase.java` and its three subclasses.

### Sentinel guard ("--" means unset) (D-12)
**Source:** `bbj-vscode/src/Commands/Commands.cjs` `stripSentinel` (line 19).
**Apply to:** the shared resolver (primary layer), `Commands.cjs` `openConfigFile`/`run`, `process-args.ts` `buildRunArgv`, `BbjRunActionBase.java` `getConfigPathArg`/`getConfigPath` (defensive second layer per D-12).

### Non-modal, once-per-path warning (D-13)
**Source:** no direct existing analog for a "once per session" warning keyed by path; nearest precedent is `extension.ts`'s `promptedTokenizedFiles`/`promptedLineNumberedDocs` `Set<string>` dedup-by-key pattern (lines 484-486, 545-547):
```typescript
const promptedTokenizedFiles = new Set<string>();
...
if (promptedTokenizedFiles.has(key)) return;
promptedTokenizedFiles.add(key);
```
**Apply to:** the VS Code side of D-13's warning (keyed by the failed path string); IntelliJ side needs an equivalent session-scoped `Set<String>` (or similar) on `BbjServerService`/the project component, no existing analog found there.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `bbj-intellij/.../lsp/BbjLanguageClient.java` `@JsonNotification` handler | provider | pub-sub | Zero existing `@JsonNotification` usage in the plugin; must be built from LSP4J framework docs, using `handleServerStatusChanged` only as a loose structural precedent (see Pattern Assignments above). |
| IntelliJ `FileTypeOverrider`/`LanguageSubstitutor` for D-06 | model/config | — | Confirmed absent via repo-wide search; this is genuinely new platform-API surface for this plugin — plan from IntelliJ Platform SDK docs, not from an in-repo analog. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/`, `bbj-vscode/src/Commands/`, `bbj-vscode/package.json`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (composer, lsp, actions, settings, file-type packages), `bbj-intellij/src/main/resources/META-INF/plugin.xml`
**Files scanned:** ~15 read/grepped directly (bbj-ws-manager.ts, compile-command.ts, composer-commands.ts, bbj-notifications.ts, main.ts, extension.ts, setopts-composer-ui.ts, Commands.cjs, process-args.ts, package.json, BbjComposerServer.java, BbjLanguageClient.java, BbjFileType.java, BbjRunActionBase.java, BbjSettingsComponent.java, plugin.xml)
**Pattern extraction date:** 2026-09-06
