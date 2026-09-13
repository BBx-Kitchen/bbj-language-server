# Phase 86: IntelliJ Interop Settings & Targeted Refresh - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 12
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-intellij/.../actions/BbjRefreshJavaClassesAction.java` (rewrite) | controller (IDE action) | request-response (bounded RPC) | `bbj-intellij/.../actions/BbjCompileAction.java` | exact |
| `bbj-intellij/.../composer/BbjComposerServer.java` (add method) | service interface (RPC proxy) | request-response | same file, `compile()`/`resolvedConfigPath()` methods | exact |
| `bbj-vscode/src/language/main.ts` (read-only) | route/handler | request-response | already implements `bbj/refreshJavaClasses` | n/a (unchanged) |
| `bbj-intellij/.../BbjSettings.java` (accessor + detector + migration) | model / config-provider | CRUD (persisted state) | same file, `detectJavaInteropPort`/`getBBjClasspathEntries` (to replace) | exact |
| `BbjNodeVersionCache`-style stat cache (new, e.g. `BbjInteropPortCache`) | utility (memoized file read) | CRUD / file-I/O | `bbj-intellij/.../BbjNodeVersionCache.java` | exact |
| Detector result records (e.g. in `BbjSettingsLookups`-style class) | utility (pure parser + result object) | transform | `bbj-intellij/.../BbjSettingsLookups.java` (`NodeLookup`/`HomeLookup`/`ConfigLookup`) | exact |
| `bbj-intellij/.../BbjSettingsConfigurable.java` (reset/apply/isModified) | controller (settings glue) | CRUD | same file (existing `reset()`/`apply()`/`isModified()`) | exact |
| `bbj-intellij/.../BbjSettingsComponent.java` (checkbox + hint + prefill) | component (Swing UI) | request-response (EDT form) | same file, port field + `ComponentValidator` block (~184-203), `FormBuilder` rows (~296-298) | exact |
| `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (`initializeParams`) | provider (init options) | request-response | same file, existing `options.addProperty("javaInteropPort", …)` (~52) | exact |
| `bbj-intellij/.../ui/BbjJavaInteropService.java` (`checkConnection`) | service (poller) | event-driven (Alarm tick) | same file, existing `checkConnection()` (~117-124) | exact |
| `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java` (add name) | test | request-response | same file, `DECLARED_REQUESTS` set + TS source scan | exact |
| `bbj-intellij/src/test/.../composer/ComposerFlowTest.java` `FakeComposerServer` (extend) | test fixture | request-response | same file's `FakeComposerServer` inner class | exact |
| New `BbjRefreshJavaClassesActionTest` | test | request-response | `BbjCompileAction` + a `FakeComposerServer`-driving flow test (pattern from `ComposerFlowTest`) | role-match |
| New source-guard test (no `requestRestart`/`scheduleRestart`/`LanguageServerManager` outside fallback) | test | transform (whole-file string assertions) | `BbjLanguageClientRestartSourceGuardTest.java` | exact |
| `BbjSettingsComponentSourceGuardTest.java` (extend for raw-field fence) | test | transform | same file, existing `countOccurrences` guard pattern | exact |
| `documentation/docs/intellij/configuration.md` §"Java Interop" | doc | n/a | existing section (rewrite) | exact |
| `QA/FULL-TEST-CHECKLIST.md` | doc/QA checklist | n/a | existing rows (add) | exact |

## Pattern Assignments

### `bbj-intellij/.../actions/BbjRefreshJavaClassesAction.java` (controller, request-response)

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java`

**Imports pattern** (lines 1-34): Task.Backgroundable, `ApplicationManager`, `ExecutionException`/`TimeoutException`, `BbjComposerServer`/`BbjComposerService`, `BbjServerService` for console logging.

**Timeout constant pattern** (lines 46-50):
```java
/**
 * Comfortably above the server's own 30s compile timeout, so a lost response cannot leave
 * the progress indicator up forever.
 */
private static final long COMPILE_TIMEOUT_SECONDS = 45;
```
D-15 asks for 60s for refresh (`REFRESH_TIMEOUT_SECONDS = 60`), same comment shape.

**Background task + bounded server lookup pattern** (lines 75-113):
```java
new Task.Backgroundable(project, "Compiling " + fileName + "…", false) {
    @Override
    public void run(@NotNull ProgressIndicator indicator) {
        ApplicationManager.getApplication().assertIsNonDispatchThread();

        BbjComposerServer server;
        try {
            server = BbjComposerService.server(project).get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException | ExecutionException | TimeoutException ex) {
            render(project, fileName, CompileResultPresenter.requestFailed(fileName, messageOf(ex)));
            return;
        }

        if (server == null) {
            render(project, fileName, CompileResultPresenter.serverUnavailable(fileName));
            return;
        }

        CompileResult result;
        try {
            result = server.compile(new CompileParams(uri)).get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException | ExecutionException | TimeoutException ex) {
            render(project, fileName, CompileResultPresenter.requestFailed(fileName, messageOf(ex)));
            return;
        }

        render(project, fileName, CompileResultPresenter.present(...));
    }
}.queue();
```
D-12: title becomes `"Refreshing Java classes…"`, non-cancellable second constructor arg stays `false`, call becomes `server.refreshJavaClasses().get(REFRESH_TIMEOUT_SECONDS, TimeUnit.SECONDS)` returning `Boolean`. D-13/D-14 replace `CompileResultPresenter`/balloon rendering: success -> one `logToConsole` line only (no notification), failure/timeout/null-server -> reason-keyed balloon with a "Restart language server" `NotificationAction` that calls `BbjServerService.getInstance(project).requestRestart(0)` (this is the one allowed `requestRestart` reference the source guard permits).

**In-flight guard (D-15):** no direct analog exists yet in `BbjCompileAction`; add a `ConcurrentHashMap<Project, Boolean>`-style static guard (mirrors `BbjNodeVersionCache`'s `ConcurrentHashMap` field shape) or a project-service boolean, checked in `actionPerformed` before `.queue()`, with a console note "refresh already running" (`BbjServerService.logToConsole`) when dropped, and the action left enabled (D-15).

**update()/getActionUpdateThread() pattern** (lines 156-186 of `BbjCompileAction`, and the current `BbjRefreshJavaClassesAction.java` lines 33-47) — keep unchanged: `ServerStatus.started` gate, `ActionUpdateThread.BGT`.

**Current file being replaced** (`bbj-intellij/.../actions/BbjRefreshJavaClassesAction.java`, full 49 lines) — today's `actionPerformed` is a single line, `BbjServerService.getInstance(project).requestRestart(0);` — this line is deleted from the main path and survives only inside the D-14 fallback action's click handler.

---

### `bbj-intellij/.../composer/BbjComposerServer.java` (service interface, request-response)

**Analog:** same file, `compile()` (lines 60-67) and `resolvedConfigPath()` (lines 69-76)

**@JsonRequest convention:**
```java
/**
 * Runs bbjcpl through the server's own compiler service and returns the result rather than
 * publishing diagnostics (#571). Declared here rather than on a new interface
 * because {@code BbjLanguageServerFactory#getServerInterface()} returns exactly one
 * interface, so every custom request family has to live on it.
 */
@JsonRequest("bbj/compile")
CompletableFuture<CompileResult> compile(CompileParams params);
```
New method: `@JsonRequest("bbj/refreshJavaClasses") CompletableFuture<Boolean> refreshJavaClasses();` — no params, returns `Boolean` per D-16 (unchanged server contract), same "declared here because getServerInterface() returns exactly one interface" javadoc justification.

---

### `bbj-intellij/.../BbjSettings.java` (model, CRUD)

**Analog:** same file — `State` class (lines 24-35), `getState()` auto-detect-on-read shape (lines 43-60), `detectJavaInteropPort` (lines 103-152, **to be replaced**), `getBBjClasspathEntries` (lines 75-101, a sibling `BBj.properties` line reader to share the file-read helper with).

**State field pattern** (lines 24-35):
```java
public static class State {
    public String bbjHomePath = "";
    ...
    public String javaInteropHost = "localhost";
    public int javaInteropPort = 5008;
    ...
}
```
D-01 adds one boolean, e.g. `public boolean javaInteropPortAutoDetect = true;`.

**Detector to delete** (lines 103-152): `detectJavaInteropPort(bbjHomePath)` — its `java.interop.port=` / `bridge.port=` substring match never matches a real `BBj.properties`; replace with a parser reading `com.basis.languageServer.addr=host\:port\:enabled` (D-07), unescaping `\:`, splitting on `:`, second segment parsed 1-65535.

**Effective-port accessor (D-02):** new method on `BbjSettings`, e.g. `public int getEffectiveJavaInteropPort()`, mirroring the `getState()` auto-detect-on-read idiom (lines 46-58) but delegating to the stat-cached detector instead of doing file I/O inline — auto ⇒ `detectedPort().orElse(5008)`, explicit ⇒ `state.javaInteropPort`.

---

### New detector/cache (Claude's discretion on class name, e.g. `BbjInteropPortDetector` + a stat-keyed cache)

**Cache analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java` (full file, 97 lines)

**Stat-keyed memoization pattern** (lines 17-45, 76-86):
```java
private static @Nullable String defaultStamp(String nodePath) {
    File file = new File(nodePath);
    if (!file.isFile()) {
        return null;
    }
    return file.lastModified() + ":" + file.length();
}

private record Entry(String stamp, @Nullable String version) {}

public @Nullable String getVersion(@NotNull String nodePath) {
    String currentStamp = stat.stampOf(nodePath);
    if (currentStamp == null) {
        return null;
    }
    return cache.compute(nodePath, (path, existing) ->
            existing != null && existing.stamp().equals(currentStamp)
                    ? existing
                    : new Entry(currentStamp, spawner.versionOf(path))
    ).version();
}
```
D-09: same shape, keyed on the `BBj.properties` path's mtime+length stamp instead of the node binary's; injectable spawner/stat functions (package-private constructor, lines 56-59) for plain-JUnit testing, `compute()` for the same race-safety reason documented at lines 69-75.

**Result-object analog:** `bbj-intellij/.../BbjSettingsLookups.java` — `record NodeLookup(...)`, `record HomeLookup(...)`, `record ConfigLookup(...)` (lines 27-38, 111-112) — the "detected / not found / disabled" result carries the same `failed` boolean idiom; e.g. `record PortLookup(int port, boolean detected, boolean serviceDisabled)`.

**Injectable-collaborator parser pattern** (lines 61-73, 91-102, 131-145 of `BbjSettingsLookups`):
```java
static ConfigLookup lookupConfig(String path, Predicate<String> fileIsFile) {
    try {
        if (path.isEmpty()) {
            return new ConfigLookup(path, false, false, false);
        }
        ...
    } catch (RuntimeException e) {
        return new ConfigLookup(path, false, false, true);
    }
}
```
New parser follows the same two-method shape: a public production entry point with no params beyond the path, plus a package-visible overload taking an injected file-reader/line-supplier for tests (D-07's parser test fixture is the literal escaped line `com.basis.languageServer.addr=localhost\:5008\:true`, from `/opt/bbx/cfg/BBj.properties` line 67 — copy verbatim into the test).

---

### `bbj-intellij/.../BbjSettingsConfigurable.java` (controller, CRUD)

**Analog:** same file

**isModified() pattern** (lines 44-59) — add a comparison for the new checkbox field: `|| state.javaInteropPortAutoDetect != myComponent.isJavaInteropPortAutoDetect()`.

**apply() pattern** (lines 61-92) — add `state.javaInteropPortAutoDetect = myComponent.isJavaInteropPortAutoDetect();`; `scheduleRestart()` call at line 90 stays (D-17: Apply keeps its coalesced restart).

**reset() port block to delete/replace** (lines 136-148):
```java
int javaInteropPort = state.javaInteropPort;
if (javaInteropPort == 5008) {
    if (!bbjHome.isEmpty()) {
        int detected = BbjSettings.detectJavaInteropPort(bbjHome);
        if (detected != 5008) {
            javaInteropPort = detected;
        }
    }
}
myComponent.setJavaInteropPort(javaInteropPort);
```
D-02/D-06: replace the `== 5008` gate with the effective-port accessor: `myComponent.setJavaInteropPortAutoDetect(state.javaInteropPortAutoDetect); myComponent.setJavaInteropPort(BbjSettings.getInstance().getEffectiveJavaInteropPort());` — the field is always shown editable-or-greyed by the checkbox state, never gated on the numeric value.

---

### `bbj-intellij/.../BbjSettingsComponent.java` (Swing component, request-response/EDT)

**Analog:** same file, lines 179-299 (Java Interop Host/Port fields, `ComponentValidator`, `FormBuilder` rows)

**Existing port field + validator** (lines 183-203):
```java
javaInteropPortField = new JBTextField();
javaInteropPortField.setText("5008");

new ComponentValidator(parentDisposable)
    .withValidator(() -> {
        String text = javaInteropPortField.getText().trim();
        if (text.isEmpty()) {
            return null; // Empty is valid, will use default 5008
        }
        try {
            int port = Integer.parseInt(text);
            if (port < 1 || port > 65535) {
                return new ValidationInfo("Port must be between 1 and 65535", javaInteropPortField);
            }
        } catch (NumberFormatException e) {
            return new ValidationInfo("Port must be a valid number", javaInteropPortField);
        }
        return null;
    })
    .installOn(javaInteropPortField);
```
D-01/D-05: add a `JCheckBox` ("Auto-detect") next to the field, mirroring `autoSaveCheckbox` construction (line 210-211: `autoSaveCheckbox = new JCheckBox("Auto-save before run"); autoSaveCheckbox.setSelected(true);`); wire an `ItemListener` that disables/enables `javaInteropPortField` and repopulates it from the effective-port accessor on check/uncheck (D-05).

**FormBuilder row placement pattern** (lines 296-298):
```java
.addComponent(new TitledSeparator("Java Interop"))
.addLabeledComponent(new JBLabel("Host:"), javaInteropHostField, 1, false)
.addLabeledComponent(new JBLabel("Port:"), javaInteropPortField, 1, false)
```
Add the checkbox row and an inline hint row (D-03) here — Claude's discretion whether the hint is a `JBLabel` comment row (mirrors `nodeVersionLabel` pattern at lines 288, 261: `nodeVersionLabel.setText(path.isEmpty() ? " " : "Checking Node.js version…");`) or the field's empty text (mirrors `emUrlField.getEmptyText().setText(...)` at line 207).

**Note for D-02's source guard:** per the existing `BbjSettingsComponentSourceGuardTest.java` convention (whole-file `countOccurrences` assertions, e.g. lines 56-65), the new guard extension should assert `BbjSettings.detectJavaInteropPort` / raw `state.javaInteropPort` reads for the *effective* value are absent from `BbjSettingsComponent.java`, following the exact `assertEquals(0, countOccurrences(text, "..."))` idiom already used there.

---

### `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (`initializeParams`)

**Analog:** same file, lines 43-62

```java
BbjSettings.State state = BbjSettings.getInstance().getState();
JsonObject options = new JsonObject();
...
options.addProperty("javaInteropPort", state.javaInteropPort);
```
D-02: replace `state.javaInteropPort` with `BbjSettings.getInstance().getEffectiveJavaInteropPort()`.

---

### `bbj-intellij/.../ui/BbjJavaInteropService.java` (`checkConnection`)

**Analog:** same file, ~lines 110-124

```java
checkAlarm.addRequest(this::checkConnection, CHECK_INTERVAL_MS);
...
private void checkConnection() {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    int port = state.javaInteropPort;
    String host = state.javaInteropHost;
```
D-02/D-10: replace `int port = state.javaInteropPort;` with `int port = BbjSettings.getInstance().getEffectiveJavaInteropPort();` so each periodic tick re-reads the accessor (picks up a live `BBj.properties` change without a watcher).

---

### `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java` (test)

**Analog:** same file

**Name-set + reflective derivation pattern** (lines 37-48, 67-101):
```java
private static final Set<String> DECLARED_REQUESTS = Set.of(
    "bbj/composer/catalogs",
    ...
    "bbj/compile",
    "bbj/resolvedConfigPath"
);
```
Add `"bbj/refreshJavaClasses"` to this set; the reflective `declaredRequestNamesFromInterface()` test (lines 93-101) and the "namespaced and lower-case" test (103-126) both auto-cover the new entry once the interface method exists. No source-file scan target changes needed since the request already exists verbatim in `bbj-vscode/src/language/main.ts` (`'bbj/refreshJavaClasses'`, line 36) — but note `main.ts` is **not** one of the three TS files this contract test scans (`composer-commands.ts`, `compile-command.ts`, `resolved-config-path-request.ts`); a fourth `Path` constant pointing at `bbj-vscode/src/language/main.ts` must be added to the contract test alongside the other three, or the D-16 "one more name in the cross-language request-contract test" acceptance criterion cannot pass.

---

### `bbj-intellij/src/test/.../composer/ComposerFlowTest.java` `FakeComposerServer` (test fixture)

**Analog:** same file, `FakeComposerServer` inner class (lines 80-164)

```java
@Override
public CompletableFuture<CompileResult> compile(CompileParams params) {
    return compileResult;
}
```
Add a `CompletableFuture<Boolean> refreshJavaClasses = CompletableFuture.completedFuture(true);` field plus `@Override public CompletableFuture<Boolean> refreshJavaClasses() { return refreshJavaClasses; }`, following the exact same one-field-per-method convention as `catalogs`/`msgboxDecode`/`compileResult`. The `delayed(...)`/`delayedCopy(...)` helpers (lines 165-204) and `CompletableFuture.failedFuture(...)` idiom (used at lines 219, 245, 400) are the direct analogs for D-18's success/failure/timeout/null-proxy/duplicate-while-running test cases in the new `BbjRefreshJavaClassesActionTest`.

---

### New source-guard test for `BbjRefreshJavaClassesAction` (D-18)

**Analog:** `bbj-intellij/src/test/.../lsp/BbjLanguageClientRestartSourceGuardTest.java` (full 138 lines)

**Whole-file string-assertion pattern** (lines 40-75, 96-119):
```java
private static String readGuardedSource() { ... Files.readString(GUARDED_SOURCE) ... }

private static int countOccurrences(String text, String literal) { ... }

@Test
void theHandlerNeverTouchesTheLsp4ijServerManagerDirectly() {
    String text = stripComments(readGuardedSource());
    assertEquals(0, countOccurrences(text, LSP4IJ_SERVER_MANAGER_TYPE), ...);
}
```
New guard on `BbjRefreshJavaClassesAction.java`: assert `requestRestart(` / `scheduleRestart(` / `LanguageServerManager` occur exactly once each (the D-14 fallback action's click handler) rather than zero times — the specifics note explicitly allows exactly one such reference, unlike the strict-zero pattern above. Reuse `stripComments`/`countOccurrences` verbatim (same static helpers, same javadoc-stripping regex at lines 62-65).

---

## Shared Patterns

### Background task + bounded RPC lookup
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` lines 75-113
**Apply to:** `BbjRefreshJavaClassesAction` — non-cancellable `Task.Backgroundable`, off-EDT assertion, `BbjComposerService.server(project).get(timeout, TimeUnit.SECONDS)`, then the actual request also bounded by `.get(timeout, TimeUnit.SECONDS)`.

### Status bar / console over balloons
**Source:** `bbj-intellij/.../lsp/BbjLanguageClientRestartSourceGuardTest.java` line 122-136 (asserts zero `createNotification(` and exactly one `logToConsole(` on success); `bbj-intellij/.../actions/BbjCompileAction.java` lines 125-153 (`render()` — balloon on every result today, console line added only when `presentation.error`).
**Apply to:** the rewritten refresh action — success: `logToConsole` only, no balloon (D-13, tighter than `BbjCompileAction`'s render, which balloons on success too); failure/timeout/null-proxy: balloon with a "Restart language server" `NotificationAction`, mirroring `BbjCompileAction`'s `NotificationAction("Open Settings")` pattern at lines 137-144 but invoking `BbjServerService.getInstance(project).requestRestart(0)` instead of `ShowSettingsUtil`.

### `@JsonRequest` convention on the single composer-server proxy
**Source:** `bbj-intellij/.../composer/BbjComposerServer.java` lines 60-77
**Apply to:** the new `refreshJavaClasses()` method — always on this one interface (`getServerInterface()` returns exactly one type), javadoc citing the same "declared here" rationale, and the contract test (`ComposerRequestContractTest`) as the enforcement mechanism.

### Stat-keyed, injectable-collaborator caching
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java` (whole file) and `bbj-intellij/.../BbjSettingsLookups.java` (whole file)
**Apply to:** the new interop-port detector/cache — same `ConcurrentHashMap<String, Entry>.compute(...)` race-safety idiom, same package-private constructor for test injection, same `failed`-boolean result-record convention.

### Restart funnels through `requestRestart(long)`
**Source:** `bbj-intellij/.../ui/BbjServerService.java` lines 33-43, 235-255 (`RESTART_DEBOUNCE_MS`, `requestRestart(long)`, `scheduleRestart()`)
**Apply to:** `BbjSettingsConfigurable.apply()` (unchanged — D-17), and the D-14 fallback action inside the rewritten refresh action (the one permitted `requestRestart` reference outside the settings/restart files).

## No Analog Found

None — every file listed in CONTEXT.md's Integration Points has a direct or role-matching analog in the current codebase.

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (actions, composer, lsp, ui, root package) and `bbj-intellij/src/test/java/com/basis/bbj/intellij/` (composer, lsp); `bbj-vscode/src/language/main.ts`.
**Files scanned:** 12 read directly (BbjCompileAction, BbjComposerServer, BbjSettings, BbjSettingsConfigurable, BbjSettingsComponent (partial), BbjNodeVersionCache, BbjSettingsLookups, ComposerRequestContractTest, BbjLanguageServerFactory, BbjJavaInteropService (grep), BbjSettingsComponentSourceGuardTest, BbjLanguageClientRestartSourceGuardTest, ComposerFlowTest (grep), BbjRefreshJavaClassesAction, BbjServerService (grep), main.ts (grep)).
**Pattern extraction date:** 2026-09-07
