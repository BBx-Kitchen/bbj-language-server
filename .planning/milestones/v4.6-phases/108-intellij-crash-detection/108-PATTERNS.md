# Phase 108: IntelliJ Crash Detection - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 8 (all existing files to be modified; no wholly new files are implied by CONTEXT.md/RESEARCH.md)
**Analogs found:** 8 / 8 (every file to change is itself the strongest analog for its own next change — this phase is a targeted rework of an existing subsystem, not new-file creation)

All work is inside `bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/{lsp,ui,concurrency}`.
Every file below already exists; "analog" here means the closest sibling pattern to copy for the
part of the file that must change, since most of these files are themselves the pattern for their
own next edit.

## File Classification

| File to Modify | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` | provider (LSP4IJ `OSProcessStreamConnectionProvider` subclass) | event-driven (process-exit hook) | itself (existing class; hook override is new) — closest sibling pattern: `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`'s `handleServerStatusChanged` override shape | role-match |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` | service (plain-Java lifecycle/policy service, not a component) | event-driven + CRUD-like state (crash counter, status field) | itself | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` | utility (plain-Java logic class, `String` status names) | transform (classify) | itself; sibling pattern also seen in `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java` (same plain-Java-with-String-status-names convention, cited in this class's own javadoc) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` | provider/factory (`LSPClientFeatures` anonymous subclass) | request-response (status-changed callback) | itself (`createClientFeatures()`'s existing `initializeParams` override is the pattern for adding `handleServerStatusChanged` beside it) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` | provider (`LanguageClientImpl` subclass) | event-driven | itself (existing `handleServerStatusChanged`, to be trimmed) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` | component (status-bar widget) | request-response (render from state) | itself (existing `iconFor`/`textFor`/`tooltipFor` switch pattern) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` | component (editor notification provider) | request-response (gate on a boolean) | itself (existing `isServerCrashed()` gate) | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` | test (reflective canary) | transform (bytecode/reflection assertions) | itself — existing methods `theCommandDispatchMembersTheCueActionReliesOnStillExist` (reflective `getDeclaredMethod`/`Modifier` pattern) and `theOtherCoupledVendorClassesCarryNoExperimentalMarker` (per-member pinned assertion list) are the template for new canaries pinning `addUnexpectedServerStopHandler`, `getPid()`, `getProcessHandler()`, `ProcessHandler.getExitCode()` | exact |

## Pattern Assignments

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` (provider, event-driven)

**Analog:** itself + `BbjLanguageClient.java`'s existing `handleServerStatusChanged` override for the "run on background thread, guard, delegate to `BbjServerService`" shape.

**Imports pattern** (BbjLanguageServer.java lines 1-30): already imports
`com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider` and extends it. New code adds
no new imports beyond what D-01's skeleton needs (`getPid()`/`getProcessHandler()` are inherited,
no import required); if a reference to `BbjServerService` is added directly here rather than via a
constructor-supplied callback, follow `BbjLanguageClient.java`'s import of
`com.basis.bbj.intellij.ui.BbjServerService` (line 8).

**Core pattern — existing constructor + LOG usage** (BbjLanguageServer.java lines 37-63):
```java
public final class BbjLanguageServer extends OSProcessStreamConnectionProvider {
    private static final Logger LOG = Logger.getInstance(BbjLanguageServer.class);
    public BbjLanguageServer(@NotNull Project project) {
        ...
        LOG.info("Launching the BBj language server: " + cmd.getCommandLineString()
                + " (working directory: " + cmd.getWorkDirectory() + ")");
        super.setCommandLine(cmd);
    }
```
Follow this exact `LOG.info`/`LOG.warn` style (full sentence, includes concrete values) for the new
D-12 WARN log line (`pid`, `exit code`).

**Hook override skeleton** (from RESEARCH.md's Code Examples section, grounded in Findings 1-4):
```java
@Override
public void addUnexpectedServerStopHandler(Runnable handler) {
    super.addUnexpectedServerStopHandler(handler);           // LSP4IJ's own handler, unchanged
    super.addUnexpectedServerStopHandler(() -> {
        Long pid = getPid();                                  // public, inherited
        Integer exitCode = null;
        var processHandler = getProcessHandler();             // protected, inherited
        if (processHandler != null) {
            exitCode = processHandler.getExitCode();           // public IntelliJ Platform API
        }
        // report to BbjServerService; runs off the EDT (Finding 5) -- wrap any UI-touching
        // work in ApplicationManager.getApplication().invokeLater(...), matching
        // BbjServerService.updateStatus's existing invokeLater calls (lines 194, 209, 209-216).
    });
}
```

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` (service, event-driven + state)

**Analog:** itself.

**Imports pattern** (lines 1-28): plain `com.intellij.*` platform imports plus this package's own
`concurrency`/`config` helpers — no new import categories expected; a new crash-report entry point
reuses `com.intellij.openapi.application.ApplicationManager` (already imported, line 11) and
`com.intellij.execution.ui.ConsoleViewContentType` (line 4).

**Existing crash/restart core pattern** (lines 139-217, `updateStatus`):
```java
public void updateStatus(@NotNull ServerStatus status) {
    if (project.isDisposed()) { return; }
    ExpectedStopGuard.StopKind stopKind =
        expectedStop.classify(status.name(), previousStatus.name(), System.currentTimeMillis());
    LOG.info("BBj language server status: " + previousStatus + " -> " + status
        + " (classified as " + stopKind + ")");
    if (stopKind == ExpectedStopGuard.StopKind.CRASH) {
        serverCrashed = true;
        ...
        crashCount++;
        lastCrashTime = now;
        if (crashCount == 1) {
            requestRestart(CRASH_RESTART_DELAY_MS);
        } else if (crashCount >= 2) {
            autoRestartAbandoned = true;
            notifyCrash();
            ApplicationManager.getApplication().invokeLater(() -> {
                if (project.isDisposed()) { return; }
                EditorNotifications.getInstance(project).updateAllNotifications();
            });
        }
    }
    ...
    previousStatus = currentStatus;      // <-- D-05: LIFE-02 removes this stale field/assignment
    this.currentStatus = status;
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) { return; }
        project.getMessageBus().syncPublisher(BbjServerStatusListener.TOPIC).statusChanged(status);
    });
}
```
Per D-03/D-05/D-07/D-10, this is the method to rework: (1) drive `crashCount`/`serverCrashed` from
a new crash-report entry point fed by the D-01 hook, not from `stopKind == CRASH`; (2) fix the
`LOG.info` line to read `currentStatus` (the value still held before the `this.currentStatus =
status;` assignment on the next line), not `previousStatus`; (3) remove the reset-on-`started` of
`crashCount` (lines 191-193 currently zero it inside the `status == ServerStatus.started` branch).

**`doRestart` / `clearCrashState` pattern to preserve, and the D-07 problem it creates** (lines
113-119, 294-324): `doRestart()` calls `clearCrashState()` first (line 295), which zeroes
`crashCount`; per D-07 the crash-triggered restart must not go through this reset. Follow the
existing `RestartGate`-mediated single-entry-point discipline (`requestRestart(long)`, lines
255-264) for whatever new internal entry point is added — every restart, including the crash
auto-restart, must still call `restartGate.request(...)`.

**Existing balloon pattern to reuse for D-11's give-up-only balloon** (lines 222-248, `notifyCrash`):
```java
private void notifyCrash() {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("BBj Language Server")
        .createNotification("BBj Language Server crashed unexpectedly", ..., NotificationType.ERROR)
        .addAction(new NotificationAction("Show Log") { ... })
        .addAction(new NotificationAction("Restart") { ... requestRestart(0); ... })
        .notify(project);
}
```
Already gated correctly for D-11 (only called from the `crashCount >= 2` branch) — keep this call
site, just make sure the new crash counter still reaches it only on give-up.

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java` (utility, transform)

**Analog:** itself; sibling plain-Java pattern `ConfigReloadPresentation` (cited in this class's own
javadoc line 8) for "no `com.intellij` import, `String` status names, plain JUnit coverage."

**Current classify contract to reshape per D-03** (lines 63-81):
```java
public synchronized StopKind classify(String statusName, String previousStatusName, long nowMs) {
    boolean isLiveToStoppedTransition = STATUS_STOPPED.equals(statusName)
        && (STATUS_STARTED.equals(previousStatusName) || STATUS_STARTING.equals(previousStatusName));
    if (!isLiveToStoppedTransition) { return StopKind.NOT_A_STOP; }
    if (armedAtMs != null) {
        long elapsed = nowMs - armedAtMs;
        boolean withinWindow = elapsed <= windowMs;
        armedAtMs = null;
        if (withinWindow) { return StopKind.EXPECTED_RESTART_STOP; }
    }
    return StopKind.CRASH;
}
```
Per D-03/Claude's Discretion: reshape this API so it answers only "was this stop armed" (the
`arm(long)`/`disarm()` one-shot-token mechanism at lines 46-53 is correct and must be kept exactly
as-is — see RESEARCH.md's Don't-Hand-Roll table), not a status-transition shape. Keep the class
plain Java (no `com.intellij`/LSP4IJ imports — enforced today by having none at all).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` (provider/factory, request-response)

**Analog:** itself — the existing `initializeParams` override in `createClientFeatures()`'s
anonymous `LSPClientFeatures` body is the exact insertion point and style for the new
`handleServerStatusChanged` override (D-04, merged per Finding 6 since the raw `bb0a49f0` patch no
longer applies cleanly).

**Insertion point** (lines 40-65):
```java
return new LSPClientFeatures() {
    @Override
    public void initializeParams(@NotNull InitializeParams params) {
        super.initializeParams(params);
        ...
        options.addProperty(CompilerInitOptions.COMPILER_TRIGGER_KEY,
            CompilerInitOptions.normalizeTrigger(state.compilerTrigger));
        params.setInitializationOptions(options);
    }
    // <-- new handleServerStatusChanged override goes here, inside the same anonymous class body
}
.setDocumentLinkFeature(...)
.setCompletionFeature(...);
```

**New override, from RESEARCH.md's Code Examples (grounded pattern, matches
`BbjLanguageClient.handleServerStatusChanged`'s own EDT-dispatch/disposed-guard shape)**:
```java
@Override
public void handleServerStatusChanged(@NotNull ServerStatus status) {
    super.handleServerStatusChanged(status);
    Project project = getProject();
    if (project.isDisposed()) { return; }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) { return; }
        BbjServerService.getInstance(project).updateStatus(status);
    });
}
```
Needs new imports: `com.redhat.devtools.lsp4ij.ServerStatus`, `com.intellij.openapi.application.ApplicationManager`,
`com.basis.bbj.intellij.ui.BbjServerService` — update `Lsp4ijImportAllowlistTest.ALLOWLIST`'s entry
for this file accordingly (see Shared Patterns below).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` (provider, event-driven)

**Analog:** itself — trim, don't rewrite.

**Existing method to trim per D-04** (lines 41-56):
```java
@Override
public void handleServerStatusChanged(ServerStatus serverStatus) {
    super.handleServerStatusChanged(serverStatus);
    Project project = getProject();
    if (project.isDisposed()) { return; }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) { return; }
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole("Server status: " + serverStatus, ConsoleViewContentType.SYSTEM_OUTPUT);
        service.updateStatus(serverStatus);   // <-- D-04: remove this call; console line stays
    });
}
```
This exact "keep console line, drop `updateStatus` call" edit matches `bb0a49f0`'s
`BbjLanguageClient.java` diff, confirmed by RESEARCH.md Finding 6 to still `git apply --check`
cleanly.

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` (component, request-response)

**Analog:** itself — existing three-method switch pattern is the template for adding the D-10
crashed-state rendering.

**Existing switch pattern** (lines 40-77):
```java
@Override
protected Icon iconFor(ServerStatus status) {
    switch (status) {
        case started: return BbjIcons.STATUS_READY;
        ...
        default: return BbjIcons.STATUS_ERROR;
    }
}
@Override
protected String textFor(ServerStatus status) { switch (status) { ... } }
@Override
protected String tooltipFor(ServerStatus status, String text) {
    return ConfigReloadPresentation.widgetTooltip(text, ...);
}
```
Per Pitfall 3 (`ServerStatus` is a closed nine-value vendor enum — no tenth "crashed" value can be
added), the crashed state must be read as a **separate boolean** alongside `status` inside these
same three methods (e.g. `BbjServerService.getInstance(project).isServerCrashed()`, already
public), not by adding a `switch` case. `BbjIcons` (imported line 3) already supplies
`STATUS_ERROR`/`STATUS_STARTING`/`STATUS_READY`; check whether a distinct crashed icon constant
needs adding there, or reuse `STATUS_ERROR` (Claude's Discretion per CONTEXT.md).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` (component, request-response)

**Analog:** itself — the existing gate is correct in shape, only the boolean it reads changes
meaning per D-11 (today gated on the same `isServerCrashed()` that fires on crash #1; must gate on
give-up only).

**Existing gate pattern** (lines 22-53):
```java
protected @Nullable Function<...> buildPanel(@NotNull Project project, @NotNull VirtualFile file) {
    BbjServerService service = BbjServerService.getInstance(project);
    if (!service.isServerCrashed()) { return null; }
    return fileEditor -> {
        EditorNotificationPanel panel = newPanel(fileEditor, EditorNotificationPanel.Status.Error, ...);
        panel.createActionLabel("Restart Server", () -> { service.requestRestart(0); });
        panel.createActionLabel("Show Log", () -> { ... });
        return panel;
    };
}
```
Per D-11, this must gate on a new "auto-restart gave up" fact distinct from "any crash detected"
(D-10's widget flag). Keep the `newPanel`/`createActionLabel` structure exactly as-is; only the
gating predicate and the `BbjServerService` accessor it calls change.

---

## Shared Patterns

### Vendor coupling fencing
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` (whole file)
**Apply to:** `BbjLanguageServer.java` (new `getPid()`/`getProcessHandler()` use — still
`OSProcessStreamConnectionProvider`-only, likely no allowlist change needed since both are inherited,
not new imports) and `BbjLanguageServerFactory.java` (new `ServerStatus` import in the
`createClientFeatures()` body — **must** add `"ServerStatus"` to that file's `ALLOWLIST` entry, set
`Map.entry("com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java", Set.of("LanguageServerFactory",
"LanguageClientImpl", "LSPClientFeatures", "LSPDocumentLinkFeature", "StreamConnectionProvider",
"ServerStatus"))`, mirroring `cb3ce7f8`'s intent per D-04/Finding 6). Update
`thisTestDoesNotDeriveTheAllowlistFromTheScan`'s literal count only if a file is added or removed
from the twelve-entry map (it is not, by this phase's scope).

### Reflective coupling canaries
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java`,
method `theCommandDispatchMembersTheCueActionReliesOnStillExist` (lines 115-120+, reflective
`getDeclaredMethod`/`Modifier` assertions) and `theOtherCoupledVendorClassesCarryNoExperimentalMarker`
(lines 82-107, per-member assertion list)
**Apply to:** a new canary method pinning `OSProcessStreamConnectionProvider.addUnexpectedServerStopHandler(Runnable)`,
`getPid()`, protected `getProcessHandler()`, and IntelliJ Platform's
`com.intellij.execution.process.ProcessHandler.getExitCode()` (per D-01's own text: "Pin every
vendor member this depends on with the coupling canary"). Follow this class's existing style:
`assertEquals`/`assertTrue` per member, a comment naming the issue/decision and the exact javap
evidence, one `@Test` method per logically-grouped set of members (not one assertion per test).

### Source guards (comment-aware, no planning IDs)
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java`
(whole file; note its `EXTERNAL_RESTART_SITES` array already lists
`BbjServerCrashNotificationProvider.java` and `BbjStatusBarWidget.java` as files that must never
call `.restart()` directly) and `Lsp4ijImportAllowlistTest.stripComments`/`extractSymbols` (lines
71-138, the comment-and-string-literal-aware scanning pattern)
**Apply to:** any new guard test pinning D-03's reshaped `classify()` call shape or D-07's
crash-counter bypass of `clearCrashState()`. Per the existing `Nyquist auditor lesson` embedded in
this repo's conventions (see MEMORY.md), new guard literals and test names must **not** contain
planning IDs (`D-07`, `LIFE-01`, etc.) in source or test comments — describe the invariant in plain
English instead, as `BbjServerServiceRestartSourceGuardTest`'s own class javadoc does ("EDT-05,
#539" — even that references only a public issue number, not an internal planning token).

### EDT dispatch + disposed guards
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java`, every
`ApplicationManager.getApplication().invokeLater(() -> { if (project.isDisposed()) { return; } ...
})` block (lines 116-118, 176-181, 194-199, 209-216); also
`bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` (source
guard already fencing this exact discipline for LSP dispatch threads)
**Apply to:** the new D-01 hook handler in `BbjLanguageServer.java` (Finding 5: the hook runs on a
background process-wait thread, not the EDT) and the new `handleServerStatusChanged` override in
`BbjLanguageServerFactory.java`. Any UI-state mutation (widget repaint trigger, balloon, banner)
reached from the hook must go through this exact `invokeLater` + `isDisposed()` double-guard
pattern, never touch Swing/platform UI state directly from the background thread.

### Plain-Java logic classes with `String` status names
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ExpectedStopGuard.java`
(whole file) and `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/ConfigReloadPresentation.java`
(sibling, referenced in `ExpectedStopGuard`'s own javadoc)
**Apply to:** any reshaped or new logic extracted from `BbjServerService.updateStatus`'s crash
policy (crash counting, window arithmetic) that can be pulled out testable without a platform
dependency — keep such extractions free of `com.intellij`/LSP4IJ imports so plain JUnit drives every
branch, matching this repo's established discretion note.

## No Analog Found

None. Every file this phase touches already exists with an established pattern in the same file or
an explicitly cited sibling; RESEARCH.md's own Code Examples section (grounded in bytecode/source
verification, not guessed) supersedes the need for an external analog for the two genuinely new call
shapes (`addUnexpectedServerStopHandler` override, `handleServerStatusChanged` override).

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/{lsp,ui,concurrency}`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/{lsp,concurrency}`
**Files scanned:** 8 main-source files read in full (all ≤ 366 lines; single `Read` call each, no
re-reads); 4 test files partially read (canary/allowlist/source-guard/`ExpectedStopGuardTest`, first
60-120 lines each — enough to confirm structure and style, no need for full re-read since each
class's pattern is established within its first test methods)
**Pattern extraction date:** 2026-09-25
