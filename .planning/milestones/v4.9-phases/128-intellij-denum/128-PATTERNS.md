# Phase 128: IntelliJ DENUM - Pattern Map

**Mapped:** 2026-10-03
**Files analyzed:** 19 (11 new main, 3 modified main, 1 modified resource, 4+ test)
**Analogs found:** 18 / 19 (all analog paths verified git-tracked via `git ls-files`)

Base for all paths: `bbj-intellij/src/main/java/com/basis/bbj/intellij/` (`M/`), tests `bbj-intellij/src/test/java/com/basis/bbj/intellij/` (`T/`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `M/denum/LineNumbering.java` | utility | transform | port of `bbj-vscode/src/line-numbering.ts` (no Java analog; style: `M/ui/BbjFileVisibility.java`) | role-match |
| `M/denum/DenumModels.java` | model | request-response | `M/compile/CompileModels.java` | exact |
| `M/denum/DenumDiagnosticsPresenter.java` | utility | transform | `M/compile/CompileResultPresenter.java` + `bbj-vscode/src/denum-diagnostics-output.ts` | exact |
| `M/denum/DenumberRunner.java` | service | request-response | `M/actions/BbjCompileAction.java` (the `Task.Backgroundable` body) | exact |
| `M/denum/BbjLineNumberedBannerRefresher.java` | service (project, Disposable) | event-driven | `M/concurrency/PreviewDebouncer.java` + `AlarmScheduler.java`; `M/ui/BbjServerService.java` (project service) | role-match |
| `M/concurrency/DirtyFileCoalescer.java` | utility | event-driven | `M/concurrency/PreviewDebouncer.java` | role-match |
| `M/actions/BbjDenumberAction.java` | action | request-response | `M/actions/BbjComposeActionBase.java` (update) + `BbjCompileAction.java` | exact |
| `M/BbjLineNumberedNotificationProvider.java` | provider | request-response | `M/BbjJavaInteropNotificationProvider.java` | exact |
| `M/composer/BbjComposerServer.java` (mod) | interface | request-response | its own `bbj/compile` declaration | exact |
| `M/lsp/BbjLanguageClient.java` (mod) | client | pub-sub | `configReloadRequired` / `bbjcplAvailability` handlers | exact |
| `src/main/resources/META-INF/plugin.xml` (mod) | config | - | `bbj.compile` action + 4 `editorNotificationProvider` + 3 `projectService` | exact |
| `T/composer/ComposerRequestContractTest.java` (mod) | test | - | itself | exact |
| `T/denum/LineNumberingTest.java` (+ TS drift guard) | test | transform | `T/config/ConfigReloadNotificationContractTest.java` | role-match |
| `T/denum/DenumModelsJsonBoundaryTest.java` | test | request-response | `T/compile/CompileResultJsonBoundaryTest.java` | exact |
| `T/denum/DenumDiagnosticsPresenterTest.java` | test | transform | `T/compile/CompileResultPresenterTest.java` | exact |
| `T/denum/*SourceGuardTest.java` (action, plugin.xml slice) | test | - | `T/actions/BbjComposeCvsActionSourceGuardTest.java`, `T/compile/BbjCompileActionSourceGuardTest.java` | exact |
| `T/BbjNotificationProviderBaseSourceGuardTest.java` (mod) | test | - | itself (add 5th provider to the two `@ValueSource` lists + path const + switch) | exact |
| `T/concurrency/DirtyFileCoalescerTest.java` | test | event-driven | `T/concurrency/PreviewDebouncerTest.java` with `ManualScheduler` (package-private; keep test in `concurrency` pkg) | exact |
| `T/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` (add handler registration cases) | test | - | itself lines ~182-188 | exact |

## Pattern Assignments

### `M/denum/DenumModels.java` (model)
**Analog:** `M/compile/CompileModels.java` lines 18-38: final class, private ctor, nested `public static final class` with public fields, Javadoc naming the TS source of truth.
```java
public final class CompileModels {
    private CompileModels() {}
    public static final class CompileParams {
        public String uri;
        public CompileParams(String uri) { this.uri = uri; }
    }
    public static final class CompileResult {
        public boolean success; public String reason; public String message; ...
    }
}
```
Apply: `DenumParams{uri}`, `DenumResult{status, reason, message, Boolean applied}` only (omit edits/diagnostics: Gson ignores unknown members; avoids primitive-int `Position` rejection), `DenumDiagnosticsParams{uri, List<DenumDiagnostic>}`, `DenumDiagnostic{int line; String originalLineNumber; String severity; String message}`. Source of truth: `bbj-vscode/src/language/denum-command.ts`, `denum-notifications.ts`.

### `M/denum/DenumberRunner.java` (service, request-response)
**Analog:** `M/actions/BbjCompileAction.java` lines 75-112.
```java
new Task.Backgroundable(project, "Compiling " + fileName + "…", false) {
    @Override public void run(@NotNull ProgressIndicator indicator) {
        ApplicationManager.getApplication().assertIsNonDispatchThread();
        String uri;
        try { uri = file.toNioPath().toUri().toString(); }
        catch (UnsupportedOperationException ex) { uri = file.getUrl(); }
        BbjComposerServer server;
        try { server = BbjComposerService.server(project).get(T, TimeUnit.SECONDS); }
        catch (InterruptedException | ExecutionException | TimeoutException ex) { render(...); return; }
        if (server == null) { render(...); return; }
        result = server.compile(new CompileParams(uri)).get(T, TimeUnit.SECONDS);
```
Differences: do NOT copy lines 65-71 (`saveDocument`; file must stay dirty); timeout 60 s; on transport failure/null server write one `ERROR_OUTPUT` console line via `BbjServerService.getInstance(project).logToConsole(...)` (copy line 151 call shape inside `invokeLater` with `project.isDisposed()` guard, lines 126-128); no balloon, no outcome wording from `status`/`reason`. Imports: no `com.redhat.devtools.lsp4ij` (Lsp4ijImportAllowlistTest) - so do not copy lines 174-175 server-ready check.

### `M/actions/BbjDenumberAction.java` (action)
**Analog:** `M/actions/BbjComposeActionBase.java` lines 48-54, 65-68 (editor/doc via `CommonDataKeys.EDITOR`, BGT), plus `BbjCompileAction.getActionUpdateThread` (lines 182-185).
```java
Editor editor = e.getData(CommonDataKeys.EDITOR);
VirtualFile file = editor != null ? FileDocumentManager.getInstance().getFile(editor.getDocument()) : null;
...
@Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
```
Differences: use `BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())` (not `getExtension`, see compile lines 161-168 as the anti-example). Presentation: BBj file -> `setVisible(true); setEnabled(LineNumbering.isLineNumberedSource(doc.getImmutableCharSequence()))`; else `setEnabledAndVisible(false)`. `actionPerformed` -> `DenumberRunner.run(project, file)`. No `FileDocumentManager.saveDocument`, no keyboard-shortcut.

### `M/BbjLineNumberedNotificationProvider.java` (provider)
**Analog:** `M/BbjJavaInteropNotificationProvider.java` lines 21-54 (file lives in root package like three siblings; `BbjServerCrashNotificationProvider` is in `ui/`).
```java
public final class BbjJavaInteropNotificationProvider extends BbjNotificationProviderBase {
    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {
        ... return null;   // no banner
        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(fileEditor, EditorNotificationPanel.Status.Warning, bannerText);
            panel.createActionLabel("Open Settings", () -> ...);
            return panel;
        };
    }
}
```
Apply: ensure refresher service exists (`getInstance(project)`), `FileDocumentManager.getInstance().getDocument(file)`, `LineNumbering` on `getImmutableCharSequence()`; one action label "Denumber" -> `DenumberRunner.run(project, file)`. Never override `collectNotificationData` (final in `BbjNotificationProviderBase.java:93`); no `getExtension(`/`"bbl"` tokens even in comments. Register next to lines 251-261 of plugin.xml.

### `M/lsp/BbjLanguageClient.java` (mod)
**Analog:** lines 108-123 and 134-136.
```java
@JsonNotification("bbj/configReloadRequired")
public void configReloadRequired(ConfigReloadNotification result) {
    if (result == null) { return; }
    Project project = getProject();
    if (project.isDisposed()) { return; }
    BbjServerService service = BbjServerService.getInstance(project);
    service.logToConsole(..., com.intellij.execution.ui.ConsoleViewContentType.SYSTEM_OUTPUT);
}
@JsonNotification("bbj/bbjcplAvailability")
public void bbjcplAvailability(Object result) { }
```
Apply: `denumDiagnostics(DenumDiagnosticsParams)` (null guard, presenter, per-line `logToConsole`, ERROR -> `ERROR_OUTPUT`); `showDenumDiagnostics(Object ignored)` (do not dereference). Both need `invokeLater` + `project.isDisposed()` and touching `ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server").getContentManager()` BEFORE printing, because `BbjServerService.logToConsole` (lines 119-123, `if (consoleView != null)`) silently drops text until `BbjServerLogToolWindowFactory.createToolWindowContent` has run. Reveal handler calls `show()`. No new lsp4ij symbols (class already allowlisted).

### `M/composer/BbjComposerServer.java` (mod)
**Analog:** any tail declaration, lines 141-149:
```java
/** Javadoc with TS source reference. */
@JsonRequest("bbj/cvs/...")
CompletableFuture<CvsPreview> cvsPreview(CvsPreviewParams params);
```
Add `@JsonRequest("bbj/denum") CompletableFuture<DenumResult> denum(DenumParams params);` Do not declare the two notifications here.

### `M/denum/DenumDiagnosticsPresenter.java`
**Analog:** `M/compile/CompileResultPresenter.java` (plain Java, no `com.intellij` import; guard test pattern in `CompileResultPresenterTest`) and TS reference `bbj-vscode/src/denum-diagnostics-output.ts` (header `Denumber diagnostics for <path or "an unknown file">:`, one line per valid entry, control chars and U+2028/2029 flattened to a space, invalid entries skipped, never throws). Return ordered (text, isError) pairs; no hyperlinks.

### `M/denum/BbjLineNumberedBannerRefresher.java` and `M/concurrency/DirtyFileCoalescer.java`
**Analog:** `M/concurrency/PreviewDebouncer.java` lines 27-53 (ctor `(Scheduler, long delayMs, KeystrokeDebouncer.UiThread, Runnable)`, `trigger()` cancels pending and reschedules) and `AlarmScheduler(Disposable parent)` lines 71-73.
Wiring: service implements `Disposable`; ctor registers `EditorFactory.getInstance().getEventMulticaster().addDocumentListener(listener, this)`; listener filters via `FileDocumentManager.getFile(doc)` + `isBbjProgramFileTypeName`, adds to a concurrent set, calls `debouncer.trigger()`; the drain action (on EDT via `ApplicationManager.getApplication()::invokeLater`) guards `project.isDisposed()` / `file.isValid()` then `EditorNotifications.getInstance(project).updateNotifications(file)`. Register `<projectService serviceImplementation="..."/>` beside plugin.xml line 265-271 entries. Keep the set/drain logic in the plain `DirtyFileCoalescer` so `ManualScheduler` tests can prove one update per distinct file.

### `plugin.xml` (mod)
**Analog:** lines 115-124 (`bbj.compile`). Declare after it:
```xml
<action id="bbj.denumber" class="com.basis.bbj.intellij.actions.BbjDenumberAction"
        text="Denumber BBj Program" description="...">
    <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.compile"/>
    <add-to-group group-id="ToolsMenu" anchor="after" relative-to-action="bbj.compile"/>
</action>
```
No `<keyboard-shortcut>` (bbj.compile has one at line 123; do not copy it). Add `<editorNotificationProvider implementation="com.basis.bbj.intellij.BbjLineNumberedNotificationProvider"/>` near lines 251-261.

### Tests
- `ComposerRequestContractTest.java` lines 29-67 and ~92-104: add `DENUM_COMMAND_TS = Paths.get("..","bbj-vscode","src","language","denum-command.ts").toAbsolutePath().normalize()`, append to `combined` and the failure message, add `"bbj/denum"` to `DECLARED_REQUESTS` (17), fix "sixteen" comments. Reflective equality test then passes.
- `DenumModelsJsonBoundaryTest`: copy `CompileResultJsonBoundaryTest.java` lines 36-47 (`MessageJsonHandler` + `JsonRpcMethod.request` + `setMethodProvider(id -> ...)` + cast `ResponseMessage`); envelope must include `edits` and `diagnostics` to prove ignored.
- `BbjNotificationProviderBaseSourceGuardTest.java`: add the new provider to the lists at lines 114-118 and 129-134 plus a path constant and the switch at ~88-96.
- Plugin.xml slice guard: copy `BbjComposeCvsActionSourceGuardTest.pluginXmlRegistersTheActionWithMatchingIdAndNoDefaultKeystroke` (lines 152-174): slice `<action`..`</action>`, 0 `keyboard-shortcut`, both group ids, `relative-to-action="bbj.compile"` twice.
- Notification registration: `ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class)`, assert `isNotification()` and parameter types (`DenumDiagnosticsParams`, `Object`), per `Lsp4ijOverrideSiteSourceGuardTest`. Cross-language contract: copy `ConfigReloadNotificationContractTest` approach (read TS as text; also use it for the `line-numbering.ts` drift guard: regex literal, `maxLinesToInspect = 20`, `minLinesToDecide = 3`).
- `LineNumberingTest`: pin the nine cases from `bbj-vscode/test/line-numbering.test.ts` plus edge cases listed in RESEARCH "Detection rule".

## Shared Patterns

### Lsp4ij fence
**Source:** `T/lsp/Lsp4ijImportAllowlistTest.java` (exact 12-file allowlist). **Apply to:** every new main file: no `com.redhat.devtools.lsp4ij` reference.

### Server access
**Source:** `BbjComposerService.server(project)` (returns `CompletableFuture<BbjComposerServer>`, may be null). **Apply to:** `DenumberRunner` only; action and banner both go through the runner.

### Console writing
**Source:** `M/ui/BbjServerService.java:119-123` `logToConsole(String, ConsoleViewContentType)` (appends newline; drops if console not created). **Apply to:** runner failure line and both client handlers.

### BBj-file guard
**Source:** `M/ui/BbjFileVisibility.java:30` `isBbjProgramFileTypeName(file.getFileType().getName())`. **Apply to:** action, document listener (banner base already applies it).

### Source hygiene
No planning ids (D-nn, IJF-nn, Phase 128, plan numbers) in source or test comments; issue numbers fine. Guards count raw tokens, so keep `saveDocument(`, `getExtension(`, `"bbl"` out of new files' comments.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `M/denum/LineNumbering.java` | utility | transform | No Java line scanner; port logic from `bbj-vscode/src/line-numbering.ts` lines 26-49 as a char loop over `CharSequence` (JS whitespace set, ASCII digits, literal space/tab, split on `\n` only) |

## Metadata

**Analog search scope:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/{,actions,compile,composer,concurrency,lsp,ui}`, `src/test/java/.../{compile,composer,concurrency,config,lsp,actions}`, `plugin.xml`, `bbj-vscode/src` TS references
**Pattern extraction date:** 2026-10-03
