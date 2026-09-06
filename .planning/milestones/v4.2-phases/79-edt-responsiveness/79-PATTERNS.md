# Phase 79: EDT Responsiveness - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 15 (production) + 3 new seams + regression tests
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `ui/BbjServerService.java` (restart funnel, crash delay) | service | event-driven | `ui/BbjJavaInteropService.java` (`checkAlarm`) | exact (same class family, same `Alarm` idiom) |
| `ui/BbjRestartServerAction.java`, `ui/BbjServerCrashNotificationProvider.java`, `ui/BbjStatusBarWidget.java`, `ui/BbjJavaInteropStatusBarWidget.java`, `actions/BbjRefreshJavaClassesAction.java`, `BbjNodeDownloader.java:318` (restart call-site redirects) | controller/action | request-response | `ui/BbjServerService.scheduleRestart()` call site in `BbjSettingsConfigurable.apply()` | exact (already calls the debounced path) |
| `BbjNodeVersionCache.java` (new) | utility/service | CRUD (memoized read-through cache) | `BbjNodeDetector.java` (the method it wraps) + `lsp/NodeInstallIntegrity.SESSION` (injectable singleton-with-clear pattern) | role-match |
| `BbjSettingsComponent.java` (debounced `DocumentAdapter`s) | component | event-driven (UI, debounced background lookup) | `ui/BbjJavaInteropService.java` (`Alarm` debounce) + `BbjSettingsComponent.java` itself (existing `ComponentValidator` async pattern) | exact (alarm idiom) / self (existing validators show the "installOn" wiring style) |
| `BbjSettingsConfigurable.java` (`Disposable` passthrough) | provider | request-response | unchanged wiring, `createComponent()` already passes `this` | exact |
| `BbjMissingNodeNotificationProvider.java` (cache use) | provider | request-response | itself, delegating to `BbjNodeVersionCache` instead of `BbjNodeDetector.getNodeVersion` directly | exact |
| `BbjNodeDownloader.java` (`DownloadGuard`) | service | event-driven (background task + guard) | `ui/BbjServerService.java` (`Alarm`/guard idiom) — no existing atomic-guard analog, closest is the alarm-based coalescing shape | role-match |
| `actions/BbjRunActionBase.java` (`assertIsNonDispatchThread`) | controller/action | request-response | itself — `executeOnPooledThread` wrapper already present (60-70) | exact (verify-and-close) |
| `actions/BbjEMLoginAction.java` (`assertIsNonDispatchThread`) | controller/action | request-response | itself — `executeOnPooledThread` wrapper already present (36-43) | exact (verify-and-close) |
| `Scheduler.java` (new seam) | utility | event-driven | `ui/BbjServerService.restartAlarm` / `ui/BbjJavaInteropService.checkAlarm` (both `Alarm(POOLED_THREAD, this)` + `cancelAllRequests()`/`addRequest()`) | exact |
| Restart-gate seam (inside/near `BbjServerService`) | utility | event-driven | `restartAlarm` + `scheduleRestart()` (220-223) — extend the existing coalescing shape | exact |
| Keystroke debouncer seam (inside/near `BbjSettingsComponent`) | utility | event-driven | `Alarm` debounce shape from `BbjJavaInteropService`/`BbjServerService`, applied per-field | role-match |
| `DownloadGuard.java` (new seam) | utility | event-driven | `NodeInstallIntegrity.SESSION` (injectable static singleton w/ record/match) as the shape for a small stateful seam beside `BbjNodeDownloader` | role-match |
| Behavioural tests for the above seams | test | request-response | `lsp/NodeExecutableResolverTest.java` (`PathProbe` injectable-seam style) | exact |
| Source-guard tests for the above seams | test | request-response | `lsp/BbjNodeDownloaderSourceGuardTest.java`, `BbjLanguageServerSourceGuardTest.java`, `BbjLanguageServerBundleSourceGuardTest.java` | exact |

## Pattern Assignments

### `ui/BbjServerService.java` — restart funnel + crash delay (service, event-driven)

**Analog:** `ui/BbjJavaInteropService.java` (Alarm debounce idiom) and `BbjServerService.java` itself (existing `restartAlarm`/`scheduleRestart()`)

**Existing Alarm field + construction** (`BbjServerService.java` lines 37, 45-51):
```java
private final Alarm restartAlarm;
...
public BbjServerService(@NotNull Project project) {
    this.project = project;
    this.restartAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
    Disposer.register(project, this);
}
```

**Existing debounce shape to extend into the guarded entry point** (lines 220-223):
```java
public void scheduleRestart() {
    restartAlarm.cancelAllRequests();
    restartAlarm.addRequest(this::restart, RESTART_DEBOUNCE_MS);
}
```
D-05's `requestRestart(long delayMs)` is this same `cancelAllRequests()` + `addRequest(this::doRestart, delayMs)` shape, parameterized on delay. Manual callers pass ~0ms, settings-apply keeps `RESTART_DEBOUNCE_MS` (500), first-crash auto-restart passes 1000ms.

**Sibling Alarm idiom confirming the pattern is established twice** (`ui/BbjJavaInteropService.java` lines 54, 64, 94-110, 204):
```java
private final Alarm checkAlarm;
...
this.checkAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
...
checkAlarm.cancelAllRequests();
...
checkAlarm.addRequest(this::checkConnection, CHECK_INTERVAL_MS);
```

**Crash-delay code to delete** (lines 118-131, the `Thread.sleep` inside `invokeLater` to replace with `restartAlarm.addRequest(this::doRestart, 1000)`):
```java
if (crashCount == 1) {
    logToConsole("Auto-restarting language server (attempt 1)...", ConsoleViewContentType.SYSTEM_OUTPUT);
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) { return; }
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        restart();
    });
}
```

**Raw restart to make private / redirect** (lines 209-214):
```java
public void restart() {
    clearCrashState();
    LanguageServerManager manager = LanguageServerManager.getInstance(project);
    manager.stop("bbjLanguageServer");
    manager.start("bbjLanguageServer");
}
```

**`clearCrashState()` stays as-is (D-08)** (lines 83-89) — its `invokeLater` wrapping `EditorNotifications.updateAllNotifications()` is correct EDT use, do not touch:
```java
public void clearCrashState() {
    serverCrashed = false;
    crashCount = 0;
    ApplicationManager.getApplication().invokeLater(() -> {
        EditorNotifications.getInstance(project).updateAllNotifications();
    });
}
```

---

### Seven `restart()` call sites — redirect to the guard (controller/action, request-response)

**Analog:** the one caller that already does it right, `BbjSettingsConfigurable.apply()` calling `scheduleRestart()` (verified in CONTEXT.md D-06/verified-state, not re-read here — it is the pattern target, no source excerpt needed beyond "call the guard instead of `restart()` directly").

**Sites to redirect** (raw `BbjServerService.getInstance(project).restart()` calls found by grep):
```
ui/BbjRestartServerAction.java:27:        BbjServerService.getInstance(project).restart();
ui/BbjServerCrashNotificationProvider.java:49:                service.restart();
ui/BbjStatusBarWidget.java:122:            BbjServerService.getInstance(project).restart();
ui/BbjJavaInteropStatusBarWidget.java:116:            BbjServerService.getInstance(project).restart();
actions/BbjRefreshJavaClassesAction.java:30:        BbjServerService.getInstance(project).restart();
```
Plus `BbjNodeDownloader.java:318` (inside the download-success `NotificationAction`):
```java
.addAction(new NotificationAction("Restart Language Server") {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
        n.expire();
        BbjServerService.getInstance(project).restart();
    }
})
```
Each becomes `BbjServerService.getInstance(project).requestRestart(0)` (or whatever the guard method is named) per D-05/D-07. `restart()` itself becomes private/package-private (D-06).

---

### `BbjNodeVersionCache.java` (new utility, CRUD/memoized read-through)

**Analog for the stateless method being wrapped:** `BbjNodeDetector.java` lines 40-50:
```java
public static @Nullable String getNodeVersion(@NotNull String nodePath) {
    try {
        GeneralCommandLine cmd = new GeneralCommandLine(nodePath, "--version");
        cmd.withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE);
        cmd.setCharset(StandardCharsets.UTF_8);
        String output = ExecUtil.execAndReadLine(cmd);
        return output != null ? output.trim() : null;
    } catch (Exception e) {
        return null;
    }
}
```

**Analog for the injectable-singleton-with-clear shape** (`lsp/NodeInstallIntegrity.SESSION` — read only its call sites here, not the full class, since `BbjNodeDownloader.java` already shows the consumption contract at lines 58 and 217):
```java
NodeInstallIntegrity.SESSION.matchesRecordedDigest(nodePath, NodeArchiveVerifier.REAL_FILES)
...
NodeInstallIntegrity.SESSION.record(targetPath, NodeArchiveVerifier.REAL_FILES);
```
`BbjNodeVersionCache` should follow this shape: a static instance (or static methods over a `ConcurrentHashMap`), an injectable spawner parameter for tests (mirroring `NodeExecutableResolver.PathProbe`'s injectable-probe style below), and a package-private `clear()` for test isolation — same idea as `NodeInstallIntegrity`'s test-facing reset, though that exact method wasn't re-read; follow `PathProbe`'s DI shape instead since it is fully in context.

**Cache key inputs (D-10):** configured path + `File.lastModified()`/`length()` stat, no subprocess for the stat itself — see `BbjSettingsComponent.updateNodeVersionLabel()` lines 226-227 for the existing `File file = new File(nodePath); file.exists()` idiom to reuse for the stat.

---

### `BbjMissingNodeNotificationProvider.java` — cache use (provider, request-response)

**Analog:** itself; both branches currently call `BbjNodeDetector.getNodeVersion` directly, lines 36-59:
```java
String nodeJsPath = BbjSettings.getInstance().getState().nodeJsPath;

if (!nodeJsPath.isEmpty()) {
    if (new File(nodeJsPath).exists()
            && BbjNodeDetector.meetsMinimumVersion(
                    BbjNodeDetector.getNodeVersion(nodeJsPath))) {
        return null;
    }
} else {
    String detected = BbjNodeDetector.detectNodePath();
    if (detected != null
            && BbjNodeDetector.meetsMinimumVersion(
                    BbjNodeDetector.getNodeVersion(detected))) {
        return null;
    }
    Path cachedNode = BbjNodeDownloader.getCachedNodePath();
    if (cachedNode != null) {
        return null;
    }
}
```
Replace both `BbjNodeDetector.getNodeVersion(...)` calls with `BbjNodeVersionCache.getVersion(...)` (name at planner's discretion); `detectNodePath()` stays untouched per D-11 (PATH scan, no subprocess).

---

### `BbjSettingsComponent.java` — debounced keystroke lookups (component, event-driven)

**Analog for the Alarm-owned-by-a-Disposable shape:** the constructor already receives `Disposable parentDisposable` and installs `ComponentValidator` against it (lines 43, 51, 76, 121):
```java
public BbjSettingsComponent(@NotNull Disposable parentDisposable) {
    ...
    new ComponentValidator(parentDisposable)
        .withValidator(() -> { ... })
        .installOn(bbjHomeField.getTextField());
```
A debounce `Alarm(Alarm.ThreadToUse.POOLED_THREAD, parentDisposable)` field follows the same ownership idiom, constructed once in the constructor.

**Current synchronous-on-EDT listeners to replace** (lines 148-164):
```java
bbjHomeField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
    @Override
    protected void textChanged(@NotNull DocumentEvent e) {
        ComponentValidator.getInstance(bbjHomeField.getTextField())
            .ifPresent(ComponentValidator::revalidate);
        updateClasspathDropdown(bbjHomeField.getText().trim());
    }
});

nodeJsField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
    @Override
    protected void textChanged(@NotNull DocumentEvent e) {
        ComponentValidator.getInstance(nodeJsField.getTextField())
            .ifPresent(ComponentValidator::revalidate);
        updateNodeVersionLabel(nodeJsField.getText().trim());
    }
});
```

**Methods whose file I/O moves off the EDT into the debounced background task** (lines 200-239):
```java
private void updateClasspathDropdown(@NotNull String bbjHomePath) {
    if (bbjHomePath.isEmpty() || !BbjHomeDetector.isValidBbjHome(bbjHomePath)) {
        classpathCombo.setEnabled(false);
        classpathCombo.setModel(new CollectionComboBoxModel<>(List.of("(set BBj home first)")));
        return;
    }
    List<String> entries = BbjSettings.getBBjClasspathEntries(bbjHomePath);
    ...
}

private void updateNodeVersionLabel(@NotNull String nodePath) {
    if (nodePath.isEmpty()) { nodeVersionLabel.setText(" "); return; }
    File file = new File(nodePath);
    if (!file.exists()) { nodeVersionLabel.setText(" "); return; }
    String version = BbjNodeDetector.getNodeVersion(nodePath);
    ...
}
```
Per D-12/D-13: listener schedules the debouncer, background task does the file/BBjHome/node-version work (via `BbjNodeVersionCache`), then `ApplicationManager.getApplication().invokeLater(...)` applies results only if the field text is unchanged — mirror the `invokeLater` + `project.isDisposed()`-style guard used elsewhere (see `BbjServerService.updateStatus()` lines 152-157 for the "check still valid before applying" idiom, substituting a text-equality check for `project.isDisposed()`).

---

### `actions/BbjRunActionBase.java` / `actions/BbjEMLoginAction.java` — `assertIsNonDispatchThread` (controller, request-response, verify-and-close)

**Analog:** itself — both already wrap the blocking call in `executeOnPooledThread`.

`BbjRunActionBase.java` lines 60-70:
```java
// Build the command line and launch it off EDT to avoid UI freezing.
ApplicationManager.getApplication().executeOnPooledThread(() -> {
    GeneralCommandLine cmd = buildCommandLine(file, project);
    ...
});
```
Abstract call site is `buildCommandLine` at line 417:
```java
protected abstract GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project);
```

`BbjEMLoginAction.java` lines 42-43 and 58:
```java
ApplicationManager.getApplication().executeOnPooledThread(() -> performLogin(project));
...
public static boolean performLogin(@Nullable Project project) {
```
Add `ApplicationManager.getApplication().assertIsNonDispatchThread();` as the first statement reached by both paths (single shared site preferred per Claude's Discretion in CONTEXT.md — e.g. inside `performLogin` and at the `buildCommandLine` invocation/abstract-method single call site inside the lambda at line 66).

---

### `BbjNodeDownloader.java` — `DownloadGuard` (utility/service, event-driven)

**Analog for the field/flag being replaced** (lines 38, 76-77, 85, 94):
```java
private static final String DOWNLOAD_IN_PROGRESS_KEY = "bbj.node.download.inProgress";
...
PropertiesComponent props = PropertiesComponent.getInstance();
if (props.getBoolean(DOWNLOAD_IN_PROGRESS_KEY, false)) {
    showNotification(project, "Node.js download already in progress", NotificationType.INFORMATION);
    return;
}

new Task.Backgroundable(project, "Downloading Node.js " + NODE_VERSION + "...", true) {
    @Override
    public void run(@NotNull ProgressIndicator indicator) {
        props.setValue(DOWNLOAD_IN_PROGRESS_KEY, true);
        try {
            downloadAndExtractNode(indicator, project);
            showDownloadSuccessNotification(project);
        } catch (Exception e) {
            showNotification(project, "Failed to download Node.js: " + e.getMessage(), NotificationType.ERROR);
        } finally {
            props.setValue(DOWNLOAD_IN_PROGRESS_KEY, false);
            if (onComplete != null) {
                ApplicationManager.getApplication().invokeLater(onComplete);
            }
        }
    }
}.queue();
```
Replace with an `AtomicBoolean.compareAndSet(false, true)` inside `DownloadGuard.tryAcquire()`, `release()` called in the `finally` (same position as `props.setValue(..., false)` above). D-15's pending-completions list also lives in `DownloadGuard`, drained in the same `finally` via `invokeLater` — same `invokeLater(onComplete)` call shape shown above, generalized to a list.

**Injectable-singleton shape to model `DownloadGuard` on:** `lsp/NodeInstallIntegrity.SESSION` usage sites already shown above (`SESSION.matchesRecordedDigest(...)`, `SESSION.record(...)`) — a static singleton exposing narrow behavioral methods, consumed without DI/service registration.

---

## Shared Patterns

### Alarm-based debounce/coalescing (D-02 Scheduler seam target)
**Source:** `ui/BbjServerService.java` lines 37, 45-51, 220-223 and `ui/BbjJavaInteropService.java` lines 54, 64, 94-110, 204
**Apply to:** `BbjServerService`'s restart-gate, `BbjSettingsComponent`'s keystroke debouncer, and the `Scheduler` production adapter itself.
```java
private final Alarm someAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this /* or parentDisposable */);
...
someAlarm.cancelAllRequests();
someAlarm.addRequest(this::doWork, delayMs);
```

### Off-EDT dispatch + EDT playback (D-03 thread-probe seam target)
**Source:** `actions/BbjRunActionBase.java` lines 65-110, `actions/BbjEMLoginAction.java` lines 42-43 + `invokeAndWait` at 170-201, `ui/BbjServerService.java` `invokeLater` usages (86-88, 121-131, 136-141, 152-157, 163-170)
**Apply to:** any new background task in `BbjSettingsComponent`, `BbjNodeVersionCache`, `DownloadGuard`.
```java
ApplicationManager.getApplication().executeOnPooledThread(() -> { /* blocking work */ });
...
ApplicationManager.getApplication().invokeLater(() -> { /* apply result, guarded by a staleness/disposed check */ });
```

### Injectable seam + static production instance (for tests without the platform on the classpath)
**Source:** `lsp/NodeExecutableResolver.PathProbe` (consumed throughout `NodeExecutableResolverTest.java`), `lsp/NodeInstallIntegrity.SESSION`
**Apply to:** `BbjNodeVersionCache`'s spawner, `DownloadGuard`'s guard, `Scheduler`'s test double.
```java
private static final class RecordingProbe implements NodeExecutableResolver.PathProbe {
    private final AtomicInteger invocationCount = new AtomicInteger();
    @Override public boolean exists(String path) { invocationCount.incrementAndGet(); return existing.contains(path); }
}
```

### Source-guard test structure
**Source:** `lsp/BbjNodeDownloaderSourceGuardTest.java` (full file read; lines 14-30, 96-138 shown here)
**Apply to:** every new source-guard test (D-01, D-04, D-06, D-14).
```java
private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "<FileName>.java")
        .toAbsolutePath();

private static String readGuardedSource() {
    if (!Files.exists(GUARDED_SOURCE)) { fail("Guarded source file not found at " + GUARDED_SOURCE); }
    try { return Files.readString(GUARDED_SOURCE); } catch (IOException e) { throw new UncheckedIOExceptionForTest(...); }
}

private static int countOccurrences(String text, String literal) {
    int count = 0; int index = 0;
    while ((index = text.indexOf(literal, index)) != -1) { count++; index += literal.length(); }
    return count;
}
```
Assertions use `text.indexOf(...)` ordering checks (e.g. `verifyIndex < extractIndex`) and `countOccurrences` for "appears exactly once" / "call site is gone" assertions — this is exactly the shape needed for D-06's "zero `.restart()` call sites outside `ui/BbjServerService.java`" and D-04/D-07's "`Thread.sleep` no longer appears" assertions.

## No Analog Found

None — every file in scope has at least a role-match analog within `bbj-intellij/`.

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (recursively) and `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/`
**Files scanned:** `ui/BbjServerService.java`, `ui/BbjJavaInteropService.java`, `BbjSettingsComponent.java`, `BbjNodeDownloader.java`, `actions/BbjRunActionBase.java`, `actions/BbjEMLoginAction.java`, `BbjMissingNodeNotificationProvider.java`, `BbjNodeDetector.java`, `test/.../lsp/NodeExecutableResolverTest.java`, `test/.../lsp/BbjNodeDownloaderSourceGuardTest.java`, plus grep sweeps over the five other `restart()` call sites
**Pattern extraction date:** 2026-09-04
