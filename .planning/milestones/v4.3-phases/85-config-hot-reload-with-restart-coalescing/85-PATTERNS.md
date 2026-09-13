# Phase 85: Config Hot-Reload With Restart Coalescing - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 12
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/language/config-watcher.ts` (new) | service (watcher) | event-driven | `bbj-vscode/src/language/config-path-resolver.ts` (probes) + `bbj-document-builder.ts` (debounce) | role-match (composite) |
| `bbj-vscode/src/language/config-path-resolver.ts` (extend: consumed-content fn) | utility | transform | itself (extend existing pure-function module) | exact |
| `bbj-vscode/src/language/bbj-ws-manager.ts` (modify: use shared consumed-content fn) | service | CRUD | itself | exact |
| `bbj-vscode/src/language/bbj-notifications.ts` (modify: add reload notification) | utility | pub-sub | itself (`notifyResolvedConfigPath`) | exact |
| `bbj-vscode/src/language/main.ts` (modify: wire watcher, quiescence, notification) | config/wiring | event-driven | itself | exact |
| `bbj-vscode/src/language/bbj-document-builder.ts` (modify: expose quiescence predicate) | service | event-driven | itself (`cplDebounceTimers`, `SAVE_DEBOUNCE_MS`) | exact |
| `bbj-vscode/src/restart-gate.ts` (new) | utility (choke point) | event-driven | `bbj-intellij/.../concurrency/RestartGate.java` + `Scheduler.java` | role-match (cross-language port) |
| `bbj-vscode/src/extension.ts` (modify: onNotification handler, status bar, restart choke point wiring) | controller/UI wiring | request-response | itself (`bbjcplStatusBar` block, `RESOLVED_CONFIG_PATH_METHOD` listener) | exact |
| `bbj-intellij/.../lsp/BbjLanguageClient.java` (modify: new `@JsonNotification` handler) | controller (LSP client) | event-driven | itself (`resolvedConfigPath` handler) | exact |
| `bbj-intellij/.../config/ConfigModels.java` (modify: new DTO) | model | transform | itself (`ResolvedConfigPathResult`) | exact |
| `bbj-intellij/.../config/ConfigModelsJsonBoundaryTest.java` (modify: new DTO round-trip) | test | transform | itself | exact |
| `bbj-intellij/.../ui/BbjStatusBarWidget.java` (modify: reason text/tooltip) | component (UI) | event-driven | itself (`updateStatus`) | exact |
| Source-guard tests for D-10/D-11 (new, VS Code + IntelliJ) | test | transform | `bbj-intellij/.../config/BbjConfigPathServiceSourceGuardTest.java` | exact |
| `bbj-vscode/test/config-hot-reload.test.ts` (new) | test | event-driven | `bbj-vscode/test/config-path-resolution.test.ts`, `bbj-vscode/test/notifications.test.ts` | exact |

## Pattern Assignments

### `bbj-vscode/src/language/config-path-resolver.ts` — extend with consumed-content extraction (utility, transform)

**Analog:** itself, plus the PREFIX read in `bbj-ws-manager.ts`

**Why this file:** D-04 requires the gate and `initializeWorkspace` to call the *same* function. This module is already the single-owner pattern for config-path logic (pure functions + injectable probes), so the extraction belongs here, not in a new file.

**Existing injectable-probe pattern to copy** (lines 47-68):
```typescript
export interface ConfigPathProbeDeps {
    fileExists?: (path: string) => boolean;
    realPath?: (path: string) => string;
    homeDir?: () => string;
}

function defaultFileExists(candidate: string): boolean {
    try {
        fs.accessSync(candidate, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}
```
Add a matching `ConsumedConfigContentDeps` (a `readFile?: (path: string) => string` probe) so the new function is hermetically testable without touching disk, exactly like `canonicalizeConfigPath`/`resolveConfigPath` already are.

**The read to extract verbatim** (from `bbj-vscode/src/language/bbj-ws-manager.ts`, lines 138-141):
```typescript
const configContents = await this.fileSystemProvider.readFile(safeUri(resolvedConfig.path));
prefixfromconfig = configContents.split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
```
Pull this line-scan into a new exported function (e.g. `extractConsumedConfigContent(contents: string): string`) in `config-path-resolver.ts`. `initializeWorkspace` and the gate both call it — no second parser.

**Normalization for the hash** (D-15 discretion item): follow `samePath`'s existing case-fold-by-platform / NFC-normalize style (lines 130-137) as the template for "normalize before comparing" — but the consumed-content hash only needs trailing-whitespace/line-ending/keyword-case normalization, not platform-specific case folding.

---

### `bbj-vscode/src/language/config-watcher.ts` (new) — directory watcher + debounce + gate (service, event-driven)

**Analogs:**
1. `bbj-vscode/src/language/config-path-resolver.ts` for the `path.dirname`/`basename` + `samePath` filtering shape (D-01) — reuse `samePath` directly, don't reimplement.
2. `bbj-vscode/src/language/bbj-document-builder.ts` lines 25, 28, 155-198 for the debounce-timer shape:
```typescript
private readonly cplDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
private static readonly SAVE_DEBOUNCE_MS = 500;

private debouncedCompile(document: LangiumDocument): void {
    const key = document.uri.fsPath;
    const existing = this.cplDebounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
        this.cplDebounceTimers.delete(key);
        try {
            /* ... */
        } catch (e) {
            logger.error(`BBjCPL debounced compile failed for ${key}: ${e}`);
        }
    }, BBjDocumentBuilder.SAVE_DEBOUNCE_MS);

    this.cplDebounceTimers.set(key, timer);
}
```
Copy the cancel-then-reschedule (`clearTimeout` before `setTimeout`) shape verbatim for the ≥1000ms trailing-edge debounce (D-08); a `Map<string, Timer>` is unnecessary here since there's only one watched file, but the clear-then-set idiom is the load-bearing part to copy.

**Error-handling pattern to copy** (same block, lines 188-194): swallow inside the detached `setTimeout` callback and `logger.error`, never let an uncaught throw become an unhandled rejection at process level — the same P61-D2-017 concern applies to a `fs.watch` callback.

**fs.watch arm/re-arm shape:** no existing analog in this codebase (first server-side `fs.watch` usage) — this is a "no analog" item; build from Node's `fs.watch(dirname, listener)` directly, filtering with `samePath(path.join(dirname, filename), canonicalPath)`, and log-once-per-path on `ENOENT` mirroring the `logger.warn` calls already used in `bbj-ws-manager.ts` line 146.

**Quiescence predicate (D-09):** add a small exposed method on `BBjDocumentBuilder` (e.g. `hasPendingWork(): boolean`) that checks `this.cplDebounceTimers.size > 0` and whatever in-flight-build state Langium's `DocumentBuilder` already exposes (check `DocumentBuilder`'s own build-phase state before adding a new flag). The bounded-wait-then-push-anyway loop has no direct precedent in this codebase; model it as a `setInterval`/`setTimeout` poll capped at ~5s, following the same "never sleep the whole watcher, expose a testable predicate" instruction in D-09.

---

### `bbj-vscode/src/language/bbj-notifications.ts` — add reload notification (utility, pub-sub)

**Analog:** itself, `notifyResolvedConfigPath` (lines 45-58)

**Pattern to copy verbatim, adapted:**
```typescript
export function notifyConfigReloaded(result: ConfigReloadNotification): void {
    _connection?.sendNotification(CONFIG_RELOAD_METHOD, result);
}
```
Note: unlike `notifyResolvedConfigPath`, this one should likely NOT dedupe by serialized-payload equality (D-02: hosts execute a restart on receipt, no host-side judgment) — every call is a real reload event, not an idempotent state push. Import the new method-name constant from a new `config-reload-request.ts` sibling module (mirroring how `RESOLVED_CONFIG_PATH_METHOD` lives in `resolved-config-path-request.ts`, imported into `bbj-notifications.ts` at line 14) rather than inlining the string here.

---

### `bbj-vscode/src/language/main.ts` — wire the watcher and quiescence gate (event-driven)

**Analog:** itself — the `workspaceInitialized` gate block (lines 106-115) and the two `setConfigPath` + `notifyResolvedConfigPath` call sites (lines 173-177, 188-192).

**Pattern to copy** (arm-after-first-validated-build, lines 107-115):
```typescript
let workspaceInitialized = false;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!workspaceInitialized) {
        workspaceInitialized = true;
        refreshInlayHints();
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
    }
});
```
Arm the new directory watcher inside this same `if (!workspaceInitialized)` block, right after the existing `notifyResolvedConfigPath` call. Re-arm at both existing `setConfigPath` sites (lines 174, 191) — same two call sites D-12 names.

---

### `bbj-vscode/src/restart-gate.ts` (new) — VS Code restart choke point (utility, event-driven)

**Analog (cross-language port):** `bbj-intellij/.../concurrency/RestartGate.java` (whole file, 34 lines) + `Scheduler`/`AlarmScheduler` for the cancel-then-schedule timer abstraction.

**Pattern to port directly:**
```java
public final class RestartGate {
    private final Scheduler scheduler;
    private final Runnable restartAction;

    public RestartGate(Scheduler scheduler, Runnable restartAction) {
        this.scheduler = scheduler;
        this.restartAction = restartAction;
    }

    public synchronized void request(long delayMs) {
        scheduler.cancelAll();
        scheduler.schedule(restartAction, delayMs);
    }
}
```
TypeScript port: a `requestRestart(delayMs: number)` function/class holding one `ReturnType<typeof setTimeout> | undefined`, `clearTimeout` before `setTimeout` (same cancel-then-schedule shape as `debouncedCompile` above — no `synchronized` needed, Node is single-threaded). Source-guard test (D-10) fences that `extension.ts`'s `client.stop()`/`client.start()`/`client.restart()` calls only happen inside this module, mirroring `BbjConfigPathServiceSourceGuardTest`'s whole-file string-assertion style (see below).

**IntelliJ caller precedent to mirror for D-11** (`BbjServerService.java` lines 205-226):
```java
public void requestRestart(long delayMs) {
    restartGate.request(delayMs);
}

public void scheduleRestart() {
    requestRestart(RESTART_DEBOUNCE_MS);  // RESTART_DEBOUNCE_MS = 500
}
```
The new `@JsonNotification` handler in `BbjLanguageClient.java` should call `BbjServerService.getInstance(project).requestRestart(RESTART_DEBOUNCE_MS)` exactly like this — never touch `LanguageServerManager` directly (that's `doRestart()`'s job, private, called only through the gate).

---

### `bbj-vscode/src/extension.ts` — onNotification handler, restart wiring, status bar (controller/UI wiring, request-response)

**Analog:** itself — the BBjCPL status bar block (lines 863-902) and `deactivate()` (929-934).

**StatusBarItem creation + show/hide pattern to copy** (lines 865-870, 872-879):
```typescript
const bbjcplStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 99
);
bbjcplStatusBar.text = '$(warning) BBjCPL: unavailable';
bbjcplStatusBar.tooltip = 'BBjCPL compiler not found. Check that BBj is installed and bbj.home is configured.';
context.subscriptions.push(bbjcplStatusBar);

client.onNotification('bbj/bbjcplAvailability', (params: { available: boolean }) => {
    if (params.available) {
        bbjcplStatusBar.hide();
    } else {
        bbjcplStatusBar.show();
    }
});
```
New config-reload status item: same `createStatusBarItem(Left, <priority adjacent to 99>)` call, spinning-icon text (`$(sync~spin) Reloading config...`) while restart runs, then a brief "config reloaded" confirmation, `setTimeout(() => item.hide(), 5000)` for the auto-hide (no existing auto-hide timer precedent in this file — build from the debounce-timer idiom above).

**onNotification registration pattern to copy** (line 883, `RESOLVED_CONFIG_PATH_METHOD` listener):
```typescript
client.onNotification(RESOLVED_CONFIG_PATH_METHOD, (params: ResolvedConfigPathResult) => {
    ...
});
```
New handler: `client.onNotification(CONFIG_RELOAD_METHOD, (params: ConfigReloadNotification) => { statusBar-to-"reloading"; restartGate.request(delayMs); })`.

**`deactivate()` precedent** (lines 929-934):
```typescript
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}
```
D-10 requires `deactivate()` to also route through (or cancel) the choke point — extend this function to call the restart gate's cancel before/instead of a raw `client.stop()`, or ensure the gate's pending timer is cleared here.

---

### `bbj-vscode/src/config-path-cache.ts` — no change expected, but the tooltip source (D-14)

**Analog:** itself — `getActiveConfigPath()` (lines 49-54). Use this directly for the status-bar tooltip's full path; do not re-derive.

---

### `bbj-intellij/.../lsp/BbjLanguageClient.java` — new `@JsonNotification` handler (controller, event-driven)

**Analog:** itself — `resolvedConfigPath` handler (lines 56-93).

**Pattern to copy, adapted:**
```java
@JsonNotification("bbj/resolvedConfigPath")
public void resolvedConfigPath(ResolvedConfigPathResult result) {
    BbjConfigPathService.getInstance().update(result);
    if (result == null || result.path == null || result.exists) {
        return;
    }
    if (!BbjConfigPathService.getInstance().shouldWarnOnce(result.path)) {
        return;
    }
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    ApplicationManager.getApplication().invokeLater(() -> { ... });
}
```
New handler (e.g. `@JsonNotification("bbj/configReloaded")`):
```java
@JsonNotification("bbj/configReloaded")
public void configReloaded(ConfigReloadedNotification result) {
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    BbjServerService service = BbjServerService.getInstance(project);
    service.logToConsole("Config changed, restarting: " + result.path, ConsoleViewContentType.SYSTEM_OUTPUT);
    service.requestRestart(BbjServerService.RESTART_DEBOUNCE_MS);
}
```
Per D-11, this must call `requestRestart(RESTART_DEBOUNCE_MS)` (500ms, same constant as the settings-apply flow), never `LanguageServerManager` directly — mirrors the constraint the settings listener's `scheduleRestart()` (line 224-226) already honors. No `invokeLater` needed around the restart call itself (LSP4IJ's stop/start is already off the LSP dispatch thread per existing `doRestart()` usage), only around any UI-facing balloon, same disposed-guard idiom.

---

### `bbj-intellij/.../config/ConfigModels.java` — new DTO (model, transform)

**Analog:** itself — `ResolvedConfigPathResult` (lines 14-24).

**Pattern to copy verbatim:**
```java
public static final class ResolvedConfigPathResult {
    public String path;
    public String source;
    public boolean exists;
    public String problem;
}
```
New nested class (e.g. `ConfigReloadedNotification`) with `public String path;` and `public String reason;` (or whatever field names D-02 settles on) — plain public fields, no getters/setters, Gson-serializable, field names matching the TS payload exactly, doc comment pointing back at the TS source file per the existing header comment convention (lines 4-8).

---

### `bbj-intellij/.../test/config/ConfigModelsJsonBoundaryTest.java` — round-trip test (test, transform)

**Analog:** itself (need not re-read in full; same file, extend with a new nested-class round-trip case following its existing per-DTO test method shape).

---

### `bbj-intellij/.../ui/BbjStatusBarWidget.java` — reason in text/tooltip (component, event-driven)

**Analog:** itself — `updateStatus(ServerStatus)` (line 67 onward).

No full re-read needed beyond the header grep; the widget already renders starting/started transitions from `ServerStatus`. D-14 requires the reload reason to attach to this same `updateStatus` flow (extend `ServerStatus` handling or add an overload) — Claude's discretion whether text or only tooltip carries it, per D-14/discretion notes.

---

### Source-guard tests for D-10/D-11 (new, both hosts)

**Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigPathServiceSourceGuardTest.java` (whole file, 93 lines) — the whole-file-text-assertion pattern to copy:
```java
private static final Path GUARDED_SOURCE = Paths.get(
    "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "BbjConfigPathService.java")
    .toAbsolutePath();

private static String readGuardedSource() { ... Files.readString(GUARDED_SOURCE) ... }

@Test
void activeConfigPathDelegatesToTheStaticHelperRatherThanDerivingTheHomeDefaultItself() {
    String text = readGuardedSource();
    assertEquals(1, countOccurrences(text, "return resolveActivePath("), "...");
}
```
Port this exact shape for:
- IntelliJ: fence that `BbjLanguageClient.configReloaded` (and any other future restart trigger) contains `requestRestart(` and never `LanguageServerManager.getInstance(` directly.
- VS Code: an equivalent vitest test reading `extension.ts` (or the new `restart-gate.ts` caller) as raw text and asserting `client.stop()`/`client.start()` calls occur only inside the gate module — same whole-file-string-assertion idiom, ported to TS/vitest (`fs.readFileSync` + `.includes(...)`/regex count).

---

### `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java` — notification name registry (test, transform)

**Analog:** itself, lines 39-47 (the `EXPECTED_METHODS` array) and lines 108-115 (the `bbj/` namespace assertion).

```java
private static final List<String> EXPECTED_METHODS = List.of(
    "bbj/composer/catalogs",
    ...
    "bbj/compile",
    "bbj/resolvedConfigPath"
);
```
Per the Integration Points note, the new notification should NOT be added here since it's declared on `BbjLanguageClient` (a client-side `@JsonNotification`), not on `BbjComposerServer`'s request-proxy interface this test scans — confirm during planning that this file's scope is server-proxy requests only and the new notification is correctly excluded, matching `bbj/resolvedConfigPath`'s own precedent of also being excluded from request-proxy scanning (it's listed here only because it doubles as a request; a pure notification would not appear at all — verify this nuance against the full test body before assuming inclusion).

---

### `bbj-vscode/test/config-hot-reload.test.ts` (new) — vitest for watcher/gate/quiescence (test, event-driven)

**Analogs:** `bbj-vscode/test/config-path-resolution.test.ts` (injectable-probe unit-test style for `config-path-resolver.ts`) and `bbj-vscode/test/notifications.test.ts` (connection-stub style for `bbj-notifications.ts`). Both follow the plain-stub-no-real-fs/no-real-timers pattern established by Phase 84; the new test file should inject fake timers (`vi.useFakeTimers()`) for the debounce/coalescing assertions (D-08's "two requests inside window → one restart" and D-09's "notification emitted only after build completes / after the 5s bound").

---

## Shared Patterns

### Injectable probes for hermetic unit tests
**Source:** `bbj-vscode/src/language/config-path-resolver.ts` lines 47-68 (`ConfigPathProbeDeps`, `defaultFileExists`, `defaultRealPath`)
**Apply to:** the new consumed-content extraction function, the watcher module, the VS Code restart gate — every pure function gets an optional `deps` parameter defaulting to the real implementation.

### Debounce: cancel-then-reschedule with a single timer handle
**Source:** `bbj-vscode/src/language/bbj-document-builder.ts` lines 155-198 (`debouncedCompile`, `cplDebounceTimers`, `SAVE_DEBOUNCE_MS`)
**Apply to:** the config-watcher's trailing-edge debounce (D-08) and the VS Code restart gate (D-10) — same `clearTimeout` guard before `setTimeout`.

### Coalescing restart choke point
**Source:** `bbj-intellij/.../concurrency/RestartGate.java` (whole file) + `BbjServerService.requestRestart(long)`/`scheduleRestart()` (lines 205-226)
**Apply to:** the new VS Code `restart-gate.ts` (ported) and its sole caller in `extension.ts`; and the IntelliJ `BbjLanguageClient.configReloaded` handler (reused, not ported — same JVM).

### Pushed-notification method-name constant shared across languages
**Source:** `bbj-vscode/src/language/resolved-config-path-request.ts` lines 20-24 (`RESOLVED_CONFIG_PATH_METHOD` constant, doc comment naming the mirrored Gson DTO) and `bbj-intellij/.../config/ConfigModels.java` lines 1-9 (doc comment naming the TS source of truth)
**Apply to:** the new `bbj/…` reload notification — one constant on the TS side, one Gson DTO on the Java side, cross-referencing doc comments both ways, covered by `ConfigModelsJsonBoundaryTest` and (if applicable) `ComposerRequestContractTest`.

### Status bar over balloons; auto-hide transient state
**Source:** `bbj-vscode/src/extension.ts` lines 863-879 (`bbjcplStatusBar`)
**Apply to:** the new VS Code config-reload `StatusBarItem` (D-14); IntelliJ side reuses the existing `BbjStatusBarWidget.updateStatus` rather than adding a new widget.

### Whole-file source-guard tests as a wiring fence
**Source:** `bbj-intellij/.../config/BbjConfigPathServiceSourceGuardTest.java` (whole file)
**Apply to:** D-10 (VS Code restart choke point) and D-11 (IntelliJ handler never touches `LanguageServerManager` directly) — one guard test per host.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `fs.watch`-based directory watcher arm/re-arm logic | service | event-driven | First server-side filesystem watcher in this codebase; no prior `fs.watch`/`fs.watchFile` usage to copy. Build from Node's documented API directly, reusing `samePath`/`path.dirname`/`path.basename` from `config-path-resolver.ts` for the filtering half. |
| Bounded quiescence wait (poll-with-timeout before "push anyway") | utility | event-driven | No existing bounded-wait-then-proceed pattern; nearest conceptual precedent is the debounce timer's `setTimeout`, but the poll/bound combination is new. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/`, `bbj-vscode/test/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/{concurrency,ui,lsp,config}/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/{config,composer}/`
**Files scanned:** 15 (all git-tracked source; none from a `.gsd/capabilities` mirror)
**Pattern extraction date:** 2026-09-06
