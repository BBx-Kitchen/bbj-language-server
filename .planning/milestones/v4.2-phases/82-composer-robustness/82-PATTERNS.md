# Phase 82: Composer Robustness - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 9 (2 modified production, 2 new production seams, source-guard target files, 3 modified dialogs, plus new tests)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (modified: flattened chain, timeouts, guarded apply) | controller/adapter | event-driven (CompletableFuture chain → EDT write) | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` | exact (async LSP round-trip → render on EDT) |
| New: `ComposerNotices.java` (or `ComposerFailurePresenter.java`) — D-01 notice seam | service (pure presenter) | transform (reason → Presentation) | `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java` | exact |
| New: `ComposerNoticeRenderer`/render call site — balloon + console rendering | service (IntelliJ-coupled renderer) | event-driven | `BbjCompileAction.render(...)` (lines 120-154) | exact |
| New: composer flow seam (D-06, e.g. `ComposerFlow.java`) — flattened `thenCompose` chain, terminal handler, timeouts, EDT executor injection | service (async orchestration) | event-driven / request-response | `BbjCompileAction.actionPerformed` body (lines 56-113, esp. sequential `.get(TIMEOUT, TimeUnit.SECONDS)` + try/catch → `render`) | exact |
| New: stale-edit guard (D-07, e.g. `StaleEditGuard.java`) | service (validation + gated write) | request-response + CRUD (re-decode + compare + conditional write) | No direct analog exists; closest shape is `BackendNoticePolicy.java` (injected collaborators, pure decision logic, synchronized state) + `ComposerLauncher.applyHexEdit`'s `WriteCommandAction` shell | role-match (decision policy) + role-match (write shell) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` (modified: `refresh()` terminal handler, OK gating, rate-limited balloon) | component/dialog | event-driven | Its own current `refresh()` (lines 190-215) — same file, extend in place; failure-state handling analog is `BackendNoticePolicy`'s once-per-state notify pattern (D-05 rate limiting) | exact (self) / role-match (rate limiting) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` (modified: `refresh()` ~213-244) | component/dialog | event-driven | Same shape as `MsgboxComposerDialog.refresh()` | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` (modified: `refresh()` ~222-253) | component/dialog | event-driven | Same shape as `MsgboxComposerDialog.refresh()` | exact |
| New test: `ComposerNoticesTest.java` / flow-seam behavioural test (COMP-01) | test | event-driven (async double asserts notice) | `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java` | exact |
| New test: stale-edit guard behavioural test (COMP-02) | test | CRUD/transform | `BackendNoticePolicyTest.java` (injected-double style) + needs a new fake-document double (no direct precedent; build per D-10) | role-match |
| New test: `ComposerXxxSourceGuardTest.java` (chain-flattening + guarded-apply-site assertions) | test | static-analysis / transform | `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java` and `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` | exact |

## Pattern Assignments

### `ComposerLauncher.java` (controller/adapter, event-driven) — flattened chain + guarded apply

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java`

**Imports pattern** (lines 1-34 of BbjCompileAction.java):
```java
import com.basis.bbj.intellij.compile.CompileResultPresenter;
import com.basis.bbj.intellij.compile.CompileResultPresenter.Presentation;
import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.composer.BbjComposerService;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.application.ApplicationManager;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
```
Composer's own new files should import the new notice seam the same way `BbjCompileAction` imports `CompileResultPresenter`.

**Timeout constant + bounded wait pattern** (BbjCompileAction.java lines 46-50, 87-93):
```java
private static final long COMPILE_TIMEOUT_SECONDS = 45;
...
BbjComposerServer server;
try {
    server = BbjComposerService.server(project).get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
} catch (InterruptedException | ExecutionException | TimeoutException ex) {
    render(project, fileName, CompileResultPresenter.requestFailed(fileName, messageOf(ex)));
    return;
}
```
D-04's `orTimeout(...)` on the launcher's `CompletableFuture` chain is the async-friendly equivalent of this blocking-with-timeout pattern; keep the same three-exception catch shape (`InterruptedException | ExecutionException | TimeoutException`, or in the async form a single `Throwable` in `.exceptionally`/`.whenComplete`).

**Render/balloon pattern** (BbjCompileAction.java lines 120-154) — copy directly for the D-01 notice seam's renderer:
```java
private static void render(@NotNull Project project, String fileName, Presentation presentation) {
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) {
            return;
        }
        Notification notification = NotificationGroupManager.getInstance()
            .getNotificationGroup("BBj Language Server")
            .createNotification(
                presentation.title,
                presentation.body,
                presentation.error ? NotificationType.ERROR : NotificationType.INFORMATION);
        if (presentation.offerSettings) {
            notification.addAction(new NotificationAction("Open Settings") {
                @Override
                public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification n) {
                    ShowSettingsUtil.getInstance().showSettingsDialog(project, BbjSettingsConfigurable.class);
                    n.expire();
                }
            });
        }
        notification.notify(project);
        if (presentation.error) {
            String consoleLine = presentation.body.isEmpty()
                ? presentation.title
                : presentation.title + ": " + presentation.body;
            BbjServerService.getInstance(project).logToConsole(consoleLine, ConsoleViewContentType.ERROR_OUTPUT);
        }
    });
}
```
For composer, drop the `offerSettings`/"Open Settings" branch (D-01 has no settings remedy) and add the D-09 "Reopen composer" `NotificationAction` in its place for `STALE_DOCUMENT`.

**Existing chain to flatten** (`ComposerLauncher.java` lines 57-88 and per-kind `open*` methods 90-159) — current unflattened nested `thenAccept` pyramid with unobserved inner futures; this is the "before" shape the D-03 flattening replaces. Existing capture pattern to preserve (lines 58-64):
```java
Document doc = editor.getDocument();
int caret = editor.getCaretModel().getOffset();
int line = doc.getLineNumber(caret);
int lineStart = doc.getLineStartOffset(line);
String lineText = doc.getText(new TextRange(lineStart, doc.getLineEndOffset(line)));
int col = caret - lineStart;
```

**Existing apply-site pattern to route through the guard** (lines 107-112, 172-196):
```java
WriteCommandAction.runWriteCommandAction(project, "Configure MSGBOX", null, () -> {
    int ls = editor.getDocument().getLineStartOffset(line);
    editor.getDocument().replaceString(ls + ed.callStart, ls + ed.callEnd, text);
});
```
D-07's guard wraps this exact call shape; the `WriteCommandAction`'s first statement must re-check `doc.getModificationStamp()` before calling `replaceString`.

**Existing `notifyNotReady` / `onEdt` to fold into the seam** (lines 209-221):
```java
private static void notifyNotReady(Project project, Kind kind) {
    String title = switch (kind) { ... };
    onEdt(() -> Messages.showInfoMessage(project,
            "The BBj language server is not ready yet. Open a BBj file and try again.", title));
}
private static void onEdt(Runnable runnable) {
    ApplicationManager.getApplication().invokeLater(runnable, ModalityState.defaultModalityState());
}
```
D-02 routes this wording through the new notice seam's `NOT_READY` case and renders it as an information balloon via the same `render`-style method, replacing the modal `Messages.showInfoMessage`.

---

### New notice seam (D-01, e.g. `ComposerNotices.java`) — presenter

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java`

**Class shape** (lines 15-32): a `final` utility class, private constructor, immutable inner `Presentation`-style result record with `title`/`body`/`error` fields (composer needs `title`, `body`, `severity` (or `error` boolean, or WARNING vs ERROR vs INFO enum for `STALE_DOCUMENT` which the compile presenter doesn't need), and an optional remedy-action id in place of `offerSettings`):
```java
public final class CompileResultPresenter {
    private CompileResultPresenter() {}
    public static final class Presentation {
        public final String title;
        public final String body;
        public final boolean error;
        public final boolean offerSettings;
        private Presentation(String title, String body, boolean error, boolean offerSettings) { ... }
    }
    public static Presentation present(String fileName, boolean success, String reason, String message, List<Diagnostic> diagnostics) { ... }
    public static Presentation serverUnavailable(String fileName) { ... }
    public static Presentation requestFailed(String fileName, String detail) { ... }
}
```
Copy this shape for `ComposerNotices` with three factory methods matching the three D-01 failure classes: `requestFailed(kind, detail)`, `staleDocument(kind)` (with a remedy action id for "Reopen composer"), `notReady(kind)`. **No IntelliJ import** in this file — same constraint the compile presenter documents in its class javadoc line 10-13, and the same constraint a source-guard test enforces (see `BbjCompileActionSourceGuardTest.theResultPresenterCarriesNoIntelliJImport`, lines 158-163).

**Reason-keyed switch, never message-prose matching** (lines 45-115): copy the `switch (reason)` structure — composer's three reasons (`REQUEST_FAILED`, `STALE_DOCUMENT`, `NOT_READY`) replace compile's eight, but the "classify by machine-readable enum/string, default case still produces a visible result" discipline carries over directly.

---

### New flow seam (D-06, e.g. `ComposerFlow.java`) — orchestration + terminal handler

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` `actionPerformed` (lines 56-113), and `BackendNoticePolicy.java` for the injected-collaborator constructor shape.

**Constructor injection pattern** (`BackendNoticePolicy.java` lines 21-33):
```java
public final class BackendNoticePolicy {
    private final Supplier<String> lastWarnedGet;
    private final Consumer<String> lastWarnedSet;
    private final Consumer<TokenBackend> notifier;

    public BackendNoticePolicy(Supplier<String> lastWarnedGet,
                               Consumer<String> lastWarnedSet,
                               Consumer<TokenBackend> notifier) {
        this.lastWarnedGet = lastWarnedGet;
        this.lastWarnedSet = lastWarnedSet;
        this.notifier = notifier;
    }
}
```
D-06 needs the same shape: constructor takes `BbjComposerServer` (or a supplier of it), a `Consumer<Runnable>` "run on EDT" executor, and the D-01 notifier — each replaceable by a test double with no IntelliJ platform import required to compile the seam itself.

**Sequential get-with-timeout error handling to translate into async form** (`BbjCompileAction.java` lines 87-106):
```java
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
```
The composer flow seam does the equivalent asynchronously (`thenCompose` chain with `orTimeout(...)` per D-04) rather than blocking, but the "each stage's null/exception maps to exactly one Presentation-equivalent, rendered exactly once" discipline is identical.

**`messageOf` exception-to-string helper** (line 115-118):
```java
private static String messageOf(Exception ex) {
    String message = ex.getMessage();
    return message != null ? message : ex.getClass().getSimpleName();
}
```
Reuse verbatim (or move to a shared spot) for `REQUEST_FAILED`'s throwable-to-detail text.

---

### Stale-edit guard (D-07, e.g. `StaleEditGuard.java`)

**No exact analog exists in the codebase** — this is a novel decision-and-conditional-write shape. Two partial analogs to combine:

1. **Decision/policy shape** — `BackendNoticePolicy.java` (full file, 57 lines): pure Java class, `synchronized` method guarding a read-compare-notify-write sequence against races, injected collaborators. Copy the `synchronized` discipline for the guard's compare-then-write sequence (D-07 step 4 explicitly requires re-checking the modification stamp to "close the async window between the re-decode and the write").
2. **Write shell** — `ComposerLauncher.applyHexEdit` (lines 172-196): the `WriteCommandAction.runWriteCommandAction(project, commandName, null, () -> { ... })` wrapper the guard's approved writes still go through; the guard sits as a precondition check immediately inside that lambda (or immediately before it, re-verified inside it per D-07 step 4).

**Test double style to reuse** — `BackendNoticePolicyTest.java`'s `Store`/`Notifier` inner classes (lines 27-51): build an equivalent mutable fake-document double (a mutable line list + a modification-stamp counter) and a counting notice-double the same way, for the COMP-02 test's "mutate the document while the dialog is open" scenario (D-10).

---

### Dialog `refresh()` methods (MsgboxComposerDialog / AddWindowComposerDialog / AddChildWindowComposerDialog)

**Analog:** each dialog's own current `refresh()` — `MsgboxComposerDialog.java` lines 190-226 (read in full):
```java
private void refresh() {
    MsgboxPreviewInput input = new MsgboxPreviewInput();
    ...
    int mySeq = seq.incrementAndGet();
    server.msgboxPreview(new MsgboxPreviewParams(input)).thenAccept(preview ->
            ApplicationManager.getApplication().invokeLater(() -> {
                if (mySeq == seq.get() && preview != null) {
                    apply(preview);
                }
            }, ModalityState.any()));
}

private void apply(MsgboxPreview p) {
    statement = p.statement;
    statementField.setText(p.statement);
    ...
    setOKActionEnabled(p.valid);
}
```
D-05 adds a terminal failure handler alongside the existing `.thenAccept`: on failure with `mySeq == seq.get()`, set the error/summary label to "Preview unavailable — <short reason>", call `setOKActionEnabled(false)`, and route one rate-limited balloon through the D-01 notice seam (reuse `BackendNoticePolicy`'s once-per-state suppression idea — an `AtomicBoolean`/last-notified-seq field scoped to the dialog instance, since D-05 requires "once per dialog session" not once-per-app). `apply(preview)` (lines 217-226) is exactly where the "clear the message on next success" half of D-05 hooks in — add a `errorLabel.setText(" ")` / `setOKActionEnabled(true)` reset at its top before the existing field assignments, mirroring how `messageError`/`titleError`/`customError` are already reset from validation each call.

`AddWindowComposerDialog.refresh()` (~213-244) and `AddChildWindowComposerDialog.refresh()` (~222-253) share this exact shape (`AtomicInteger seq`, `thenAccept` + `invokeLater(..., ModalityState.any())`, `apply(preview)` setting fields + `setOKActionEnabled`) — same pattern applies to all three, no additional read needed.

---

### Tests

**COMP-01 behavioural test — Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BackendNoticePolicyTest.java` (full file). Copy the structure: a nested `Notifier`/counting double records calls (lines 44-51), a `policyOver(...)`-style factory builds the seam under test with doubles, one `@Test` per behaviour with a long assertion-message sentence explaining the "why" (the whole-file style, e.g. lines 57-68). For COMP-01, the double under test is a `BbjComposerServer` implementation (interface, per CONTEXT.md D-06/verified-state note) whose `composerCatalogs()` (or a preview method) returns `CompletableFuture.failedFuture(new RuntimeException(...))`; assert exactly one `REQUEST_FAILED` notice recorded by the counting notifier double, matching `BackendNoticePolicyTest.aKeepassBackendNotifiesOnce` (lines 57-68) in shape.

**COMP-02 behavioural test — Analog:** same file's double-construction style (`Store`, `Notifier` inner classes) plus a new fake-document double built the same way (mutable line array + modification-stamp counter) since no existing composer test or document-double exists yet.

**Source-guard tests — Analogs:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java` and `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` (both full files). Copy verbatim: the `Paths.get("src", "main", "java", ...)` path-construction idiom (`BbjCompileActionSourceGuardTest.java` lines 24-38), the `readSource`/`UncheckedIOExceptionForTest`/`countOccurrences` trio (lines 40-65), and `withoutCommentLines` (lines 68-78) when a rationale comment could false-trip a "zero occurrences" assertion. Use `OffEdtDispatchSourceGuardTest`'s index-ordering idiom (lines 58-74: `indexOf` two markers, assert both `>= 0`, assert count `== 1`, assert `first < second`) for D-03's "every `.thenAccept(`/`.thenCompose(` is followed by a terminal handler in the same chain" guard, and for D-10's "`replaceString(` appears only inside the guarded apply, all three sites call the guard" guard.

## Shared Patterns

### Notification group + console mirroring
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` lines 120-154 (`render` method)
**Apply to:** the new D-01 notice-rendering call site invoked from `ComposerLauncher` and all three dialogs' `refresh()` failure paths.
```java
NotificationGroupManager.getInstance()
    .getNotificationGroup("BBj Language Server")
    .createNotification(presentation.title, presentation.body,
        presentation.error ? NotificationType.ERROR : NotificationType.INFORMATION)
    .notify(project);
// on error only:
BbjServerService.getInstance(project).logToConsole(consoleLine, ConsoleViewContentType.ERROR_OUTPUT);
```
Composer's `STALE_DOCUMENT` case is WARNING severity (D-09) — `BbjCompileAction`'s binary error/information split needs a third `NotificationType.WARNING` branch when porting.

### Injected-notifier / plain-Java seam with no IntelliJ import
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BackendNoticePolicy.java` (whole file) and `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java` (whole file)
**Apply to:** `ComposerNotices` (presenter), the flow seam, and the stale-edit guard — all three must stay free of `com.intellij.*` imports so they run on the plain-JUnit-5 classpath (C-01), verified by a `theXxxCarriesNoIntelliJImport` source-guard test copied from `BbjCompileActionSourceGuardTest` line 158-163.

### Source-guard test skeleton
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java` lines 1-65 (imports, path constants, `readSource`, `UncheckedIOExceptionForTest`, `countOccurrences`, `withoutCommentLines`)
**Apply to:** every new `*SourceGuardTest.java` this phase adds (chain-flattening guard, guarded-replaceString guard, no-IntelliJ-import guard on the three new seams).

### EDT dispatch with explicit modality
**Source:** `MsgboxComposerDialog.java` line 210-214 (`invokeLater(..., ModalityState.any())` inside a dialog) and `ComposerLauncher.onEdt` line 219-221 (`invokeLater(..., ModalityState.defaultModalityState())` from the launcher)
**Apply to:** C-03's rule that UI updates go back through `invokeLater` with the modality the call site already uses — the flow seam's injected `Consumer<Runnable>` executor must be constructed with the correct modality per call site (dialog vs launcher), not a single shared constant.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Stale-edit guard (`StaleEditGuard`/`EditTargetValidator`) | service | CRUD + validation-gated write | No existing seam re-validates state immediately before a write in this codebase; closest are `BackendNoticePolicy` (decision logic shape) and `ComposerLauncher.applyHexEdit` (write shell) — combine per Pattern Assignments above, per CONTEXT.md D-07/D-08. |
| Fake mutable-document test double (line list + modification stamp) for COMP-02 | test fixture | in-memory CRUD simulation | No existing test in the repo doubles an IntelliJ `Document`; build fresh, following `BackendNoticePolicyTest`'s `Store`/`Notifier` inner-class-double style for structure only. |

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/{compile,actions,lsp}/`
**Files scanned:** ComposerLauncher.java, MsgboxComposerDialog.java (partial), BbjComposerServer.java, ComposerModels.java, CompileResultPresenter.java, BbjCompileAction.java, BackendNoticePolicy.java, BackendNoticePolicyTest.java, BbjCompileActionSourceGuardTest.java, OffEdtDispatchSourceGuardTest.java (10 files read)
**Pattern extraction date:** 2026-09-05
**Tracked-source gate:** all named analog paths verified as ordinary tracked files under `bbj-intellij/src/{main,test}/java/...` — no `.gsd/capabilities/` mirrors or other gitignored paths were used as analogs.
