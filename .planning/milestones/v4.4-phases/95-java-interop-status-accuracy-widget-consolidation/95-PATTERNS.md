# Phase 95: java-interop Status Accuracy & Widget Consolidation - Pattern Map

**Mapped:** 2026-09-19
**Files analyzed:** 13 (5 modified existing, ~5 new classes, 3 test files new/re-pointed)
**Analogs found:** 13 / 13 (all files have at least a role-match analog; new-class names are Claude's Discretion per CONTEXT.md, classified by role below)

All analog paths below were verified with `git ls-files` — every one is tracked source under
`bbj-intellij/src/{main,test}/java/...`, not a generated/mirrored path.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `ui/BbjJavaInteropService.java` (edit: D-01..D-03,D-06..D-09,D-17) | service (project-level, `Disposable`) | event-driven + polling | itself (current version below) | exact (editing in place) |
| New probe client (e.g. `interop/InteropProbeClient.java`) | service / client (LSP4J JSON-RPC) | request-response (network) | `bbj-ls/.../LanguageService.java:87-92` (server-side `Launcher.Builder` — the API to mirror client-side); `composer/BbjComposerServer.java` (existing LSP4J usage in this plugin) | role-match (no client-role `Launcher` precedent in-tree; server-role precedent in sibling repo) |
| New poll-gate / status-classification seam (e.g. `ui/InteropPollGate.java` and/or `ui/InteropStatusClassification.java`) | utility / plain-Java decision seam | transform (pure decision) | `lsp/NodeAvailability.java` (whole file) | exact |
| New presentation seam (e.g. `ui/InteropStatusPresentation.java`) | utility / presentation seam | transform (pure) | `config/ConfigReloadPresentation.java` (whole file) | exact |
| `ui/BbjStatusBarWidgetBase.java` (NEW, D-13) | component (generic abstract base, `CustomStatusBarWidget`) | event-driven (message bus + UI) | `ui/BbjStatusBarWidget.java` + `ui/BbjJavaInteropStatusBarWidget.java` (the pair being merged) | exact (extraction of shared body from both) |
| `ui/BbjStatusBarWidget.java` (thinned, D-13/14/15) | component (thin subclass) | event-driven | itself (current version, below) | exact |
| `ui/BbjJavaInteropStatusBarWidget.java` (thinned, D-13/14/15) | component (thin subclass) | event-driven | itself (current version, below) | exact |
| New `ui/BbjStatusBarWidgetFactoryBase.java` (D-13) | provider / factory base | request-response (IDE extension point) | `ui/BbjStatusBarWidgetFactory.java` + `ui/BbjJavaInteropStatusBarWidgetFactory.java` (the pair) | exact |
| `ui/BbjStatusBarWidgetFactory.java` (thinned) | provider (thin subclass) | request-response | itself (current version, below) | exact |
| `ui/BbjJavaInteropStatusBarWidgetFactory.java` (thinned) | provider (thin subclass) | request-response | itself (current version, below) | exact |
| `BbjJavaInteropNotificationProvider.java` (edit, D-05) | component (`EditorNotificationProvider`) | event-driven (reads service state) | itself (current version, below) | exact (editing in place) |
| `BbjInteropPortDetector.java` / `InteropPortSettings.java` / `BbjSettings.java` / `BbjSettingsComponent.java` (edit, D-11/D-12) | config | CRUD (settings) | `EffectiveInteropPortSourceGuardTest.java`'s `stripComments()` convention; no source-pattern change beyond re-pointing literals | exact (mechanical re-point, no new pattern) |
| New disposal-guard source guard test (IOP-01) | test (source guard) | transform (structural assertion over file text) | `BbjStatusBarWidgetSourceGuardTest.java` (whole file — literal-count-over-source-text convention) | exact |
| New poll-gate / probe plain-JUnit tests (IOP-02/IOP-03) | test (unit) | transform | `lsp/NodeAvailability.java`'s test sibling pattern (seam takes injected fakes, no `com.intellij`) — same convention as `RestartGate`/`ExpectedStopGuard` tests | exact |
| `EffectiveInteropPortSourceGuardTest.java` (extend, D-12) | test (source guard) | transform | itself (whole file, below) | exact |
| `BbjStatusBarWidgetSourceGuardTest.java` (re-point, D-16) | test (source guard) | transform | itself (whole file, below) | exact |
| `Lsp4ijImportAllowlistTest.java` (edit map, D-16 conditional) | test (source guard, hand-written map) | transform | itself (whole file, below) | exact |

## Pattern Assignments

### `ui/BbjJavaInteropService.java` (service, event-driven+polling) — IOP-01/02/03/04/09/17

**Analog:** itself, current source (whole file read in full — 208 lines)

**Imports** (lines 1-15):
```java
package com.basis.bbj.intellij.ui;

import com.basis.bbj.intellij.BbjSettings;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.ui.EditorNotifications;
import com.intellij.util.Alarm;
import com.intellij.util.messages.Topic;
import com.redhat.devtools.lsp4ij.ServerStatus;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
```
Any new probe/gate class this file calls into should be imported the same way (plain
`com.basis.bbj.intellij.*` import, no wildcard).

**Current `checkConnection()` — the method D-01/D-02/D-03/D-17 rewrite** (lines 117-162):
```java
private void checkConnection() {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    int port = BbjSettings.getInstance().getEffectiveJavaInteropPort();
    String host = state.javaInteropHost;
    if (host == null || host.isEmpty()) {
        host = "localhost";
    }

    InteropStatus newStatus;
    try {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS);
            newStatus = InteropStatus.CONNECTED;
            disconnectedSince = 0;
        }
    } catch (IOException e) {
        long now = System.currentTimeMillis();
        if (disconnectedSince == 0) {
            disconnectedSince = now;
            newStatus = currentStatus;
        } else if (now - disconnectedSince > GRACE_PERIOD_MS) {
            newStatus = InteropStatus.DISCONNECTED;
        } else {
            newStatus = currentStatus;
        }
    }

    firstCheckCompleted = true;
    updateStatus(newStatus);
    scheduleNextCheck();
}
```
D-17 requires `if (project.isDisposed()) return;` at the top of this method (see the
`BbjServerService` disposal-guard pattern below). D-01/D-02/D-03 replace the inner `try (Socket
socket = new Socket())` block's success path with the LSP4J probe call, keeping the outer
`GRACE_PERIOD_MS`/`disconnectedSince` logic **unchanged** (D-03 says so explicitly) — the TCP
`connect()` timeout stays as the "port refused" signal; only what counts as "confirmed" changes.
`EffectiveInteropPortSourceGuardTest.theJavaInteropServiceReadsTheAccessorAndStillReadsTheHostManually`
pins `getEffectiveJavaInteropPort()` to exactly 1 occurrence and `state.javaInteropHost` to exactly
1 — **the rewrite must not add a second call to either**.

**`broadcastStatus()` — the other D-17 site** (lines 177-186):
```java
private void broadcastStatus(@NotNull InteropStatus status) {
    ApplicationManager.getApplication().invokeLater(() -> {
        project.getMessageBus()
            .syncPublisher(BbjJavaInteropStatusListener.TOPIC)
            .statusChanged(status);
        EditorNotifications.getInstance(project).updateAllNotifications();
    });
}
```
D-17 adds the guard **inside** the `invokeLater` lambda (see `BbjServerService` below for the
exact placement — guard first line inside the lambda, not outside it, since `isDisposed()` can
flip between scheduling and running).

**`scheduleNextCheck()`/`startChecking()` — D-06/D-08's poll-gate insertion point** (lines 93-111):
```java
public void startChecking() {
    checkAlarm.cancelAllRequests();
    scheduleNextCheck();
}

public void stopChecking() {
    checkAlarm.cancelAllRequests();
}

private void scheduleNextCheck() {
    checkAlarm.addRequest(this::checkConnection, CHECK_INTERVAL_MS);
}
```
D-08's "closes the blind window" observation applies here directly: `startChecking()` →
`scheduleNextCheck()` schedules the **first** check 5s out today. The gate-open path (D-08) should
call `checkConnection()` (or an equivalent immediate-check entry point) directly, then resume the
`CHECK_INTERVAL_MS` cadence — mirroring `RestartGate.request()`'s cancel-then-schedule coalescing
shape (see below), not a second competing `Alarm`.

**Constructor's existing server-status subscription** (lines 62-83) is the existing template for
adding a `FileEditorManagerListener.FILE_EDITOR_MANAGER` subscription (D-06) or a volatile
gate-flag write from the EDT selection event (Pitfall 2 in RESEARCH.md):
```java
public BbjJavaInteropService(@NotNull Project project) {
    this.project = project;
    this.checkAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
    project.getMessageBus().connect(this).subscribe(
        BbjServerService.BbjServerStatusListener.TOPIC,
        status -> {
            if (status == ServerStatus.started) {
                startChecking();
            } else if (status == ServerStatus.stopped || status == ServerStatus.stopping) {
                stopChecking();
                updateStatus(InteropStatus.DISCONNECTED);
            }
        }
    );
    ...
}
```

---

### New probe client (D-01/D-02/D-03) — service/client, request-response

**Analog:** `bbj-ls/src/main/java/bbj/interop/LanguageService.java:87-92` (production backend's
own `Launcher.Builder` construction — the exact API the client-side probe mirrors) and
`composer/BbjComposerServer.java:28-29` (existing in-plugin precedent for importing
`org.eclipse.lsp4j.*` without a new Gradle dependency).

**Server-side reference to mirror** (verified in RESEARCH.md from `bbj-ls`):
```java
var interopService = new InteropService();
var launcher = new Launcher.Builder<>().setLocalService(interopService)
    .setRemoteInterface(LanguageServer.class)
    .setInput(Channels.newInputStream(connection))
    .setOutput(Channels.newOutputStream(connection)).setExecutorService(EXECUTOR).create();
launcher.startListening();
```
Client-side mirror (from RESEARCH.md's Pattern 1 — spike this construction first per Assumption
A1 before building the rest of the probe on it):
```java
Socket socket = new Socket();
socket.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS); // reuse TCP_TIMEOUT_MS, D-03
Launcher<InteropProbeServer> launcher = new Launcher.Builder<InteropProbeServer>()
    .setLocalService(new Object())
    .setRemoteInterface(InteropProbeServer.class)
    .setInput(socket.getInputStream())
    .setOutput(socket.getOutputStream())
    .create();
Future<?> listening = launcher.startListening();
InteropProbeServer remote = launcher.getRemoteProxy();
try {
    remote.getTopLevelPackages().get(RESPONSE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
} catch (TimeoutException | ExecutionException e) {
    // wrong-peer / disconnected per D-04
} finally {
    listening.cancel(true);
    socket.close();
}
```
This class must have **no `com.intellij` import** (D-10) so plain JUnit drives it — the same
constraint `NodeAvailability`/`RestartGate` already satisfy. `Lsp4ijImportAllowlistTest`'s
hand-written 12-file `ALLOWLIST` guards only `com.redhat.devtools.lsp4ij.*`; `org.eclipse.lsp4j.*`
is unguarded there, so this new file adds no entry to that map.

**Backend method signature being called** (`getTopLevelPackages`, verified identical shape in both
backends — `java-interop/src/main/java/bbj/interop/InteropService.java:64-75`):
```java
@JsonRequest
public CompletableFuture<List<PackageInfoParams>> getTopLevelPackages() {
    var topLevelPackages = new HashSet<String>();
    Arrays.stream(Package.getPackages()).forEach((info) -> topLevelPackages.add(info.getName()));
    return CompletableFuture.completedFuture(topLevelPackages.stream().map(packageName -> {
        var packInfo = new PackageInfoParams();
        packInfo.packageName = packageName;
        return packInfo;
    }).toList());
}
```

---

### New poll-gate / status-classification seam (D-10) — utility, transform

**Analog:** `lsp/NodeAvailability.java` (whole file, 81 lines)

**Shape to copy exactly** — private constructor, exhaustive enum, static pure functions taking
every dependency as a parameter, exhaustive `switch` with no `default`:
```java
public final class NodeAvailability {
    private NodeAvailability() {}
    public enum Decision { CONFIGURED_PATH_USABLE, CONFIGURED_PATH_UNUSABLE,
        DETECTED_PATH_USABLE, CACHED_DOWNLOAD_USABLE, NO_RUNTIME_FOUND }
    public interface FileProbe { boolean exists(String path); }
    public static final FileProbe REAL_FILES = path -> new java.io.File(path).exists();
    public static Decision decide(String configuredPath, FileProbe files,
            Function<String, String> versionOf, Predicate<String> meetsMinimum,
            Supplier<String> detectedPath, Supplier<Path> cachedNodePath) { /* ... */ }
    public static boolean bannerNeeded(Decision decision) {
        return switch (decision) {
            case CONFIGURED_PATH_UNUSABLE, NO_RUNTIME_FOUND -> true;
            case CONFIGURED_PATH_USABLE, DETECTED_PATH_USABLE, CACHED_DOWNLOAD_USABLE -> false;
        };
    }
}
```
The gate decision ("should the poll re-arm?") and the probe-outcome classification ("which status
does this outcome mean?") should each follow this shape — whether as one class or two is Claude's
Discretion (CONTEXT.md). D-07/D-09's exhaustive enum requirement (freeze-on-pause vs. the new
`WRONG_PEER`-equivalent classification) maps directly onto `bannerNeeded`'s exhaustive-switch
convention: add the new outcome as an enum constant and let the compiler force every call site to
handle it.

**Test-double convention this seam should ship with** — `RestartGate`'s companion `Scheduler`
abstraction (`concurrency/Scheduler.java`, `concurrency/AlarmScheduler.java`) and coalescing
`request()` shape:
```java
// Source: concurrency/RestartGate.java:58-65
public synchronized boolean request(long delayMs) {
    if (restartInFlight) {
        return false;
    }
    scheduler.cancelAll();
    scheduler.schedule(guardedRestartAction, delayMs);
    return true;
}
```
RESEARCH.md's Open Question 2 recommends reusing this exact coalescing pattern for D-08's
gate-open immediate-check trigger, to avoid a burst of immediate checks on rapid tab-switching.

---

### New presentation seam (D-04/D-05) — utility, transform

**Analog:** `config/ConfigReloadPresentation.java` (whole file, 71 lines)

**Shape to copy exactly** — plain statics, plain `String`/primitive arguments, no `com.intellij`
import, `null`/blank-safe joins:
```java
public final class ConfigReloadPresentation {
    private ConfigReloadPresentation() {}
    public static String reasonLabel(String reason) {
        if (reason == null) return null;
        switch (reason) {
            case REASON_PREFIX_CHANGED: return "config file changed";
            case REASON_CONFIG_MISSING: return "config file missing";
            case REASON_CONFIG_PATH_CHANGED: return "config path changed";
            default: return null;
        }
    }
    public static String widgetTooltip(String statusText, String reasonLabel) {
        if (reasonLabel == null || reasonLabel.isBlank()) {
            return statusText;
        }
        return statusText + " — " + reasonLabel;
    }
    public static boolean clearsReason(String statusName, boolean autoRestartAbandoned) {
        if (STATUS_STARTED.equals(statusName)) return true;
        return autoRestartAbandoned;
    }
}
```
D-04's new seam needs the equivalent of `reasonLabel`/`widgetTooltip` for the wrong-peer state
(status text + tooltip), and D-05 needs the equivalent of a reason→banner-sentence map replacing
`BbjJavaInteropNotificationProvider`'s current single fixed string. D-14 reuses `widgetTooltip`
itself as `BbjStatusBarWidget`'s hook implementation (its existing call at line 108-110, shown
below), so the new seam's tooltip method should follow the same two-argument
`(statusText, reasonLabel)` shape for consistency, even though it lives in a different class.

---

### `ui/BbjStatusBarWidget.java` / `ui/BbjJavaInteropStatusBarWidget.java` → `BbjStatusBarWidgetBase<S>` (D-13/D-14/D-15/D-16)

**Analog:** each other — the two widgets are near-identical (whole files read above, 172 and 153
lines).

**Members that move into the base verbatim** (present in both, identical or near-identical):
```java
// Fields (BbjStatusBarWidget.java:33-37, BbjJavaInteropStatusBarWidget.java:30-34)
private final Project project;
private final JPanel panel;
private final JBLabel iconLabel;
private final JBLabel textLabel;
private MessageBusConnection messageBusConnection;

// Panel construction + mouse listener (BbjStatusBarWidget.java:44-56)
this.panel = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 0));
this.panel.setOpaque(false);
this.panel.add(iconLabel);
this.panel.add(textLabel);
this.panel.addMouseListener(new MouseAdapter() {
    @Override
    public void mouseClicked(MouseEvent e) {
        showPopupMenu(e);
    }
});

// FILE_EDITOR_MANAGER subscription (BbjStatusBarWidget.java:67-72)
messageBusConnection.subscribe(FileEditorManagerListener.FILE_EDITOR_MANAGER, new FileEditorManagerListener() {
    @Override
    public void selectionChanged(@NotNull FileEditorManagerEvent event) {
        updateVisibility();
    }
});

// updateVisibility() (BbjStatusBarWidget.java:117-119)
private void updateVisibility() {
    panel.setVisible(BbjFileVisibility.showsForSelection(FileEditorManager.getInstance(project).getSelectedFiles()));
}

// CustomStatusBarWidget boilerplate (BbjStatusBarWidget.java:151-171)
@Override
public @NonNls @NotNull String ID() { return ID; }
@Override
public @NotNull JComponent getComponent() { return panel; }
@Override
public void install(@NotNull StatusBar statusBar) { }
@Override
public void dispose() {
    if (messageBusConnection != null) {
        messageBusConnection.disconnect();
    }
}
```
`BbjStatusBarWidgetSourceGuardTest` (see below) pins the exact literal counts these members
produce — the base extraction must preserve every count, just relocated into the base's method
bodies (D-16).

**Abstract hooks the subclasses must supply — differences confirmed line-by-line:**
```java
// 1. Status→icon/text mapping (BbjStatusBarWidget.java:83-104 vs
//    BbjJavaInteropStatusBarWidget.java:80-97) — different enum, different switch body

// 2. Tooltip (D-14) — only BbjStatusBarWidget sets one today:
panel.setToolTipText(ConfigReloadPresentation.widgetTooltip(
    text, ConfigReloadPresentation.reasonLabel(
        BbjServerService.getInstance(project).getRestartReason())));
// BbjJavaInteropStatusBarWidget has no equivalent call — D-14 makes this an abstract hook every
// subclass must implement; the Java widget's hook implementation should call the new D-04
// presentation seam's tooltip method the same way.

// 3. Popup items — BbjStatusBarWidget.java:121-149 has 3 items (Restart/Settings/Show Log);
//    BbjJavaInteropStatusBarWidget.java:111-129 has 2 (Reconnect/Settings). "Open Settings" unifies
//    on the class form per D-15:
ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class); // KEEP
// BbjStatusBarWidget.java:134 currently uses the string form — must change to match:
ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj"); // REPLACE with class form
```

**Topic type per subclass** — each subscribes its own topic on the shared
`messageBusConnection`:
```java
// BbjStatusBarWidget.java:59-63
messageBusConnection.subscribe(BbjServerService.BbjServerStatusListener.TOPIC, this::updateStatus);
// BbjJavaInteropStatusBarWidget.java:56-60
messageBusConnection.subscribe(BbjJavaInteropService.BbjJavaInteropStatusListener.TOPIC, this::updateStatus);
```
`BbjStatusBarWidgetSourceGuardTest.widgetSubscribesFileEditorManagerExactlyOnceOnMessageBusConnection`
pins exactly **2** `messageBusConnection.subscribe(` calls per file (status topic + FILE_EDITOR_MANAGER)
— this count must be preserved per subclass after extraction (one subscribe stays in the subclass
constructor for its own topic, one moves to the base for FILE_EDITOR_MANAGER — D-16's "delegation
pin per subclass" note).

---

### `ui/BbjStatusBarWidgetFactory.java` / `ui/BbjJavaInteropStatusBarWidgetFactory.java` → factory base (D-13)

**Analog:** each other (whole files, 43 lines each, differing in 5 places).

```java
public final class BbjStatusBarWidgetFactory implements StatusBarWidgetFactory {
    @Override
    public @NotNull String getId() { return "BbjLanguageServerStatus"; }
    @Override
    public @Nls @NotNull String getDisplayName() { return "BBj Language Server"; }
    @Override
    public boolean isAvailable(@NotNull Project project) { return true; }
    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new BbjStatusBarWidget(project);
    }
    @Override
    public void disposeWidget(@NotNull StatusBarWidget widget) { }
    @Override
    public boolean canBeEnabledOn(@NotNull com.intellij.openapi.wm.StatusBar statusBar) { return true; }
}
```
The two differences are `getId()`/`getDisplayName()` string literals and the concrete type
constructed in `createWidget()`. The other four methods (`isAvailable`, `disposeWidget`,
`canBeEnabledOn`, and the `implements StatusBarWidgetFactory` boilerplate) are byte-identical and
belong in a factory base with the id/displayName/widget-construction as abstract hooks or
constructor parameters. `plugin.xml:277-284` registers both concrete factory classes by
`implementation=` — **unchanged**, so both concrete classes must still exist and be
instantiable with no-arg constructors (or constructors `plugin.xml` already invokes reflectively).

---

### `BbjJavaInteropNotificationProvider.java` (edit, D-05) — component, event-driven

**Analog:** itself, current source (whole file, 57 lines)

**Current fixed-string banner — the exact block D-05 replaces:**
```java
// Lines 41-50 (current)
if (currentStatus == BbjJavaInteropService.InteropStatus.CONNECTED ||
    currentStatus == BbjJavaInteropService.InteropStatus.CHECKING) {
    return null;
}

return fileEditor -> {
    EditorNotificationPanel panel = new EditorNotificationPanel(
            fileEditor, EditorNotificationPanel.Status.Warning);
    panel.setText("Start BBjServices for Java completions");
    panel.createActionLabel("Open Settings", () ->
            ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, BbjSettingsConfigurable.class));
    return panel;
};
```
D-05 varies `panel.setText(...)`'s argument by the service's current status/reason through the new
D-04/D-05 presentation seam, replacing the single literal `"Start BBjServices for Java
completions"` with a call like `InteropStatusPresentation.bannerText(currentStatus)` (naming is
Claude's Discretion). The `createActionLabel("Open Settings", ...)` call and the
`showSettingsDialog(project, BbjSettingsConfigurable.class)` class-form call are unchanged — this
file already uses the D-15-preferred class form, so no change is needed there.
Note also the pre-existing `isFirstCheckCompleted()` guard at lines 36-39 — D-09's live `CHECKING`
state must continue to suppress the banner exactly as today (Pitfall 4 in RESEARCH.md: do not also
suppress it for "paused", which D-07 forbids by never broadcasting a status change while paused).

---

### `ui/BbjServerService.java` — disposal-guard pattern (D-17) — the model to mirror verbatim

**Analog:** `ui/BbjServerService.java` (whole file, 326 lines) — `updateStatus()`'s guard.

**Entry-point guard** (lines 131-134):
```java
public void updateStatus(@NotNull ServerStatus status) {
    if (project.isDisposed()) {
        return;
    }
    ...
```

**Guard inside an `invokeLater` lambda** (lines 165-170, one of three such lambdas in this file):
```java
ApplicationManager.getApplication().invokeLater(() -> {
    if (project.isDisposed()) {
        return;
    }
    EditorNotifications.getInstance(project).updateAllNotifications();
});
```
And the final broadcast lambda (lines 198-205):
```java
ApplicationManager.getApplication().invokeLater(() -> {
    if (project.isDisposed()) {
        return;
    }
    project.getMessageBus()
        .syncPublisher(BbjServerStatusListener.TOPIC)
        .statusChanged(status);
});
```
D-17 adds the identical two-line guard (`if (project.isDisposed()) { return; }`) as the first
statement of `BbjJavaInteropService.checkConnection()` and as the first statement inside
`broadcastStatus()`'s `invokeLater` lambda — same wording, same placement pattern (guard first,
inside the lambda not outside it, since disposal can happen between scheduling and running).

---

## Shared Patterns

### Disposal guard (D-17)
**Source:** `ui/BbjServerService.java:132-134, 166-168, 184-186, 199-201`
**Apply to:** `ui/BbjJavaInteropService.java`'s `checkConnection()` (method entry) and
`broadcastStatus()`'s `invokeLater` lambda (lambda entry)
```java
if (project.isDisposed()) {
    return;
}
```

### Plain-Java decision seam (D-10)
**Source:** `lsp/NodeAvailability.java` (whole file); companion pattern `concurrency/RestartGate.java`,
`concurrency/ExpectedStopGuard.java`
**Apply to:** the new poll-gate class, the new probe-outcome classification, and the new probe
client itself — all must carry zero `com.intellij` imports, private constructors if
all-static, and exhaustive switches with no `default` branch over any new enum.

### Presentation seam (D-04/D-05/D-14)
**Source:** `config/ConfigReloadPresentation.java` (whole file, especially `widgetTooltip(String,
String)` and the `null`/blank-safe join convention)
**Apply to:** the new wrong-peer status text/tooltip, the reason-varying banner sentence in
`BbjJavaInteropNotificationProvider`, and D-14's tooltip hook on `BbjStatusBarWidgetBase`

### Source guard convention (D-12/D-16, IOP-01's new guard)
**Source:** `test/.../ui/BbjStatusBarWidgetSourceGuardTest.java` (whole file — `readSource` +
`countOccurrences` + `stripComments`-when-needed convention);
`test/.../lsp/EffectiveInteropPortSourceGuardTest.java`'s `stripComments()` (lines 69-72, private
per-guard copy per Phase 93 D-12)
**Apply to:** the new disposal-guard source guard (IOP-01), the re-pointed
`BbjStatusBarWidgetSourceGuardTest` (D-16 — per-file counts become per-extracted-method-in-base
counts, plus one delegation pin per subclass), and the extended `5008` single-occurrence guard
(D-12, likely a new method on `EffectiveInteropPortSourceGuardTest` given its `stripComments()` is
already the copy target)
```java
// Pattern: private constructor-free, one static readSource/countOccurrences pair per test,
// comment-stripping REQUIRED whenever a literal (not a call/identifier) is being counted:
private static String stripComments(String text) {
    String noBlockComments = text.replaceAll("(?s)/\\*.*?\\*/", "");
    return noBlockComments.replaceAll("//[^\n]*", "");
}
```

### Settings-dialog call (D-15)
**Source:** `ui/BbjJavaInteropStatusBarWidget.java:124`
```java
ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
```
**Apply to:** `ui/BbjStatusBarWidget.java`'s popup item (currently the `"BBj"` string form at line
134, must change to the class form) and the shared base's "Open Settings" hook if D-13 centralises
the popup item construction.

## No Analog Found

None — every file in scope has at least a role-matched analog in-tree (or, for the probe client,
a byte-identical API precedent in the sibling `bbj-ls` repo plus an in-tree LSP4J import
precedent). The one file with only a **cross-repo** analog is the new probe client
(`bbj-ls/src/main/java/bbj/interop/LanguageService.java:87-92`, not `git ls-files`-tracked in
*this* repo — it is source in the sibling repo `/home/coder/repos/bbj-ls`, read for its API shape
only, not copied verbatim). No `bbj-intellij` file constructs a raw LSP4J `Launcher` today.

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/{ui,config,concurrency,lsp,composer}/`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/{ui,lsp}/`, plus the two backend repos
(`java-interop/src/main/java/bbj/interop/`, `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/`)
for the wire-protocol pattern only.
**Files scanned:** 15 read in full this pass (see file list above) + RESEARCH.md's own prior
verified reads (`BbjInteropPortDetector.java`, `InteropPortSettings.java`, `BbjSettings.java`,
`BbjSettingsComponent.java`, `SocketServiceApp.java`, `InteropService.java` both backends,
`plugin.xml`, `build.gradle.kts`) — not re-read here per the no-re-read rule; their line numbers as
cited in CONTEXT.md/RESEARCH.md are treated as current (RESEARCH.md's own research pass already
re-verified every CONTEXT.md line-number claim on 2026-09-19 and found only the one drift already
documented there — the 4th `5008` site).
**Pattern extraction date:** 2026-09-19
