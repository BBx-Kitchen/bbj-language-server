# Phase 128: IntelliJ DENUM - Research

**Researched:** 2026-10-03
**Domain:** IntelliJ Platform plugin wiring (Java 17, platform 2024.2 / since-build 242, LSP4IJ 0.21.0) over the existing `bbj/denum` language-server contract
**Confidence:** HIGH (all in-repo facts read this session; platform API facts checked by `javap` against the pinned 2024.2 jar; three items remain `[ASSUMED]`, see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carried forward (not re-asked)
- Phase 126 D-10/D-14: **the server presents every DENUM outcome** (nothing to do, success,
  tokenized, protected, mixed numbering, too large, timeout, unavailable, not connected) via
  `window/showMessage[Request]`, and **applies the edit itself** via `workspace/applyEdit` (one undo
  step, buffer left dirty). LSP4IJ renders both natively. The IntelliJ action only sends
  `bbj/denum` with the document URI and words nothing about outcomes.
- Phase 126 D-01 / 126-07: DENUM diagnostics arrive as `bbj/denumDiagnostics` (`{uri, diagnostics:
  [{line, originalLineNumber, severity, message}]}`) and the reveal request as
  `bbj/showDenumDiagnostics` (payload ignored). Contract: no payload field ever becomes a command,
  link or path; the uri only selects an open document.
- Phase 127 D-02: after DENUM the file is left dirty, never saved automatically.
- Phase 127 D-06: line-numbered detection is a client-side regex; a mismatch is harmless because
  `bbj/denum` answers with its own message.
- Phase 125 IJF-01: IntelliJ formatting stays switched off, so the format-path "Denumber" offer
  (126 D-05..D-09) does not appear in IntelliJ in this phase.

#### Banner (IJF-06)
- **D-01:** The line-numbered-file banner offers **[Denumber] only**: no Dismiss, no "Don't show
  again", no read-only option, and no new setting. It stays until the buffer is no longer
  line-numbered.
- **D-02:** Detection is a **Java port of `isLineNumberedSource`** (`bbj-vscode/src/line-numbering.ts`):
  the same rule (first 20 non-blank lines, every one `^\s*\d+[ \t]+\S`, at least 3), run on the
  document text. A Java unit test pins it to the cases in `bbj-vscode/test/line-numbering.test.ts`.
  No server round trip.
- **D-03:** The banner is evaluated **on open and after each document change**
  (`EditorNotifications.updateNotifications` on a document change for BBj files, debounced as the
  planner sees fit). The banner disappears once the DENUM edit lands, and comes back if the user
  undoes it.
- **D-04:** **No special cases**: the banner is built on `BbjNotificationProviderBase` (its
  BBj-program-file-type guard already excludes `config.bbx` and non-program types). Read-only
  buffers and tokenized programs are not filtered; the server's messages cover them.
- Clicking [Denumber] runs the same path as the action (sends `bbj/denum` for that file).

#### Diagnostics display (DEN-04 in IntelliJ)
- **D-05:** `bbj/denumDiagnostics` is written **to the BBj console only**: one block per run (a
  header naming the file, then one line per entry with line, original line number, severity and
  message) into the existing "BBj Language Server" tool-window console via
  `BbjServerService.logToConsole`, with ERROR entries in `ERROR_OUTPUT`. No editor highlights, no
  markup model.
- **D-06:** `bbj/showDenumDiagnostics` **activates the "BBj Language Server" tool window** (scrolled to
  the latest block). The payload is ignored.
- **D-07:** Console entries are **plain text, with no go-to-line hyperlinks**, keeping the 126 notification
  contract ("no payload field ever becomes a link") unchanged.
- Both notifications get `@JsonNotification` handlers on `BbjLanguageClient`, so LSP4IJ no longer
  sees them as unhandled.

#### Action (IJF-05)
- **D-08:** "Denumber BBj Program" appears **only in the Tools menu and the editor context menu**
  (no Project View entry, so no open-then-wait logic).
- **D-09:** **No default keyboard shortcut.**
- **D-10:** Placement **next to Compile**: editor popup after `bbj.compile`, Tools menu after
  "Compile BBj File".
- **D-11:** The action is **enabled only when the active editor holds a BBj program file whose text
  looks line-numbered** (the D-02 check). Unnumbered files show the action greyed out, so the
  server's "nothing to do" message is reachable only through a race. The update should run off the
  EDT (`ActionUpdateThread.BGT`); the check reads at most 20 non-blank lines.
- `BbjComposerServer` declares `@JsonRequest("bbj/denum")` with DTOs that mirror
  `bbj-vscode/src/language/denum-command.ts` (`DenumResult`: status, reason, message, edit), and
  `ComposerRequestContractTest` lists `bbj/denum`; `bbj-intellij ./gradlew test` passes.

### Claude's Discretion
- Banner text and `EditorNotificationPanel.Status` (Info vs Warning).
- Console block layout and header wording (short, plain; mirror VS Code's
  `formatDenumDiagnosticsBlock` shape where sensible).
- How the action/banner obtain the LSP4IJ server and URI (follow `BbjCompileAction`'s pattern),
  and where the shared "send bbj/denum for this file" helper lives.
- Change-listener mechanism and debounce for D-03.
- Whether the client logs the returned `DenumResult` (status/reason) to the console at debug level.

### Deferred Ideas (OUT OF SCOPE)
- Editor highlights for DENUM diagnostics in IntelliJ (parity with VS Code's Problems placement): not chosen; console only.
- Project View entry with open-then-denumber: not chosen.
- Reviewed todos not folded: IntelliJ javaInteropHost/Port vs interopHost/Port mismatch; Node.js download progress bar on Windows; peer-name escaping / vitest 5 / vscode-jsonrpc 9 / lsp4j 1.0 keyword matches.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IJF-05 | IntelliJ has a "Denumber BBj Program" action (Tools and editor menus) backed by `bbj/denum`, applied as one undoable edit, with `ComposerRequestContractTest` updated | `BbjComposerServer` request + `DenumModels` DTOs; `BbjDenumberAction` (BGT update, `Task.Backgroundable`, `BbjComposerService.server`); plugin.xml `relative-to-action="bbj.compile"` in both groups; LSP4IJ `applyEdit` is a single `WriteCommandAction` (one undo step, no save); the two `@JsonNotification` handlers + presenter for D-05..D-07; contract-test edits (Standard Stack, Pitfalls 1-3) |
| IJF-06 | IntelliJ shows an editor banner on line-numbered programs offering Denumber | `LineNumbering` port (char loop, pinned to the 9 TS cases); `BbjLineNumberedNotificationProvider` on `BbjNotificationProviderBase`; project-level `Disposable` refresher with a document listener and a debounced dirty-file coalescer calling `EditorNotifications.updateNotifications(VirtualFile)` |
</phase_requirements>

## Summary

Phase 128 is wiring, not new technology. Every capability it needs already exists in the plugin: a request proxy (`BbjComposerServer` + `BbjComposerService.server(project)`), a request-from-action precedent (`BbjCompileAction`), banner infrastructure (`BbjNotificationProviderBase`), client notification handlers (`BbjLanguageClient`), a console sink (`BbjServerService.logToConsole`) and a debounce seam (`Scheduler` / `AlarmScheduler` / `PreviewDebouncer` with the test double `ManualScheduler`). No new dependencies. The server does all presentation and applies the edit itself, so the IntelliJ side is: send `{uri}` from a background task, render two push notifications as console text, and show a banner when a pure-Java detector says the buffer is line-numbered.

The behaviours the CONTEXT relies on hold up against the vendor code. LSP4IJ 0.21.0 `LanguageClientImpl.applyEdit` wraps the whole edit in a single `WriteCommandAction.runWriteCommandAction` and never saves, so "one undo step, buffer left dirty" holds with no client work. `window/showMessage` renders as a plain balloon and `window/showMessageRequest` as a `STICKY_BALLOON` notification with the server's action buttons, so the server's "Show" button stays clickable. The server's `NormalizedTextDocuments` normalises URIs on lookup, so the URI form the client sends need not byte-match the one LSP4IJ sent in `didOpen`.

Three traps need explicit plan steps. (1) `BbjServerService.logToConsole` silently drops text while the tool window has never been opened (`consoleView == null`), so the D-05 block would vanish unless the handler first forces the tool-window content to exist; `ToolWindowImpl.getContentManager()` does that. (2) `Lsp4ijImportAllowlistTest` fails on any new main-source file that references `com.redhat.devtools.lsp4ij`, so the new action and banner must not import `ServerStatus`. (3) `ComposerRequestContractTest` only scans a hard-coded list of TS files, and `denum-command.ts` is not in it, so adding `bbj/denum` to `DECLARED_REQUESTS` alone fails until that file is added to the combined text.

**Primary recommendation:** Add a new `com.basis.bbj.intellij.denum` package of plain-Java seams (`LineNumbering`, `DenumModels`, `DenumDiagnosticsPresenter`) plus thin IDE wiring (`BbjDenumberAction`, `DenumberRunner`, `BbjLineNumberedNotificationProvider`, a project-service refresher), declare `bbj/denum` on `BbjComposerServer`, add the two handlers to `BbjLanguageClient`, edit `plugin.xml` and `ComposerRequestContractTest`, and cover each seam with plain JUnit plus source guards, since the module has no IntelliJ light-fixture test framework.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DENUM execution, edit computation, outcome messages | Language server (bbj-vscode, unchanged) | bbj-ls peer | Phase 126 contract: server runs DENUM, applies the edit, shows every outcome |
| Applying the edit as one undo step | LSP4IJ vendor client (`LanguageClientImpl.applyEdit`) | IntelliJ document/undo system | Already vendor behaviour; IntelliJ plugin does not apply edits |
| Sending `bbj/denum {uri}` | IntelliJ plugin background task | `BbjComposerService` proxy cache | Same shape as `bbj/compile`; must be off the EDT |
| "Is this buffer line-numbered" | IntelliJ plugin (pure Java `LineNumbering`) | - | Locked D-02: client-side port, no round trip |
| Action enablement | IntelliJ action `update()` on BGT | `LineNumbering` | D-11; reads at most 20 non-blank lines |
| Banner | IntelliJ `EditorNotificationProvider` on the shared base | document-change refresher | D-01..D-04 |
| Banner refresh on edit/undo | IntelliJ project service (document listener + debounce) | `EditorNotifications` | D-03 |
| DENUM diagnostics list | IntelliJ tool-window console (`BbjServerService`) | `BbjLanguageClient` handlers | D-05..D-07 |
| Outcome messages (success, errors, "Show" button) | LSP4IJ native notifications | - | Server-presented; client words nothing |

## Standard Stack

### Core (all already in the build; no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform (IC) | 2024.2, `sinceBuild = "242"` | Actions, `EditorNotificationProvider`, `EditorNotifications`, tool windows | `intellijIdeaCommunity("2024.2")` [VERIFIED: bbj-intellij/build.gradle.kts, `intellijIdeaCommunity("2024.2")`, `sinceBuild = "242"`] |
| LSP4IJ | 0.21.0 | LSP client; `LanguageClientImpl` base of `BbjLanguageClient` | `plugin("com.redhat.devtools.lsp4ij:0.21.0")` [VERIFIED: bbj-intellij/build.gradle.kts] |
| LSP4J | bundled with LSP4IJ | `@JsonRequest`, `@JsonNotification`, `ServiceEndpoints`, `MessageJsonHandler` | already used by every request/notification in the plugin |
| JUnit Jupiter | BOM 6.1.3 | Tests (`useJUnitPlatform()`, junit-jupiter incl. params) | [VERIFIED: build.gradle.kts `junit-bom:6.1.3`] |

### Supporting (existing in-repo seams to reuse)
| Seam | Path | Use |
|------|------|-----|
| `BbjComposerService.server(project)` | `composer/BbjComposerService.java` | Resolves (and starts if needed) the proxy; no LSP4IJ import needed by callers |
| `BbjNotificationProviderBase` | `BbjNotificationProviderBase.java` | `collectNotificationData` is `final`; implement `buildPanel`, call `newPanel(fileEditor, status, text)` |
| `BbjFileVisibility.isBbjProgramFileTypeName` | `ui/BbjFileVisibility.java` | The single "is BBj program file" predicate (type name `"BBj"`) |
| `Scheduler`, `AlarmScheduler(Disposable)`, `PreviewDebouncer` | `concurrency/` | Debounce for the banner refresh; `ManualScheduler` is the deterministic test double (package-private, in the `concurrency` test package) |
| `CompileModels` | `compile/CompileModels.java` | Template for `DenumModels` (public fields, Gson) |
| `CompileResultPresenter` | `compile/` | Template for a plain-Java presenter with a "no `import com.intellij`" guard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Project service + lazily created listener | `postStartupActivity` registering the listener | One more plugin.xml registration (`StartupActivity` is already used by `BbjWelcomeNotification`), but the lazy service is registered once and the provider is the only trigger needed. Use the service. |
| Hand-written char-loop detector | `Pattern` with `UNICODE_CHARACTER_CLASS` | `(?U)` also makes `\d` match non-ASCII digits, which JS `\d` does not. A char loop pins the JS semantics exactly and allocates nothing. |
| `ConsoleView` hyperlinks | - | Rejected by D-07. |

**Installation:** none (no new packages).

## Package Legitimacy Audit

No external packages are installed or added by this phase; the audit is not applicable. All imports are IntelliJ Platform, LSP4J/LSP4IJ and JDK classes already on the compile classpath. **Packages removed due to SLOP: none. Packages flagged SUS: none.**

## Architecture Patterns

### System Architecture Diagram

```
 BBj editor (BBj file type)
   |  open / edit / undo
   v
 DocumentListener (project service, Disposable) --dirty file--> DirtyFileCoalescer --(debounce ~300ms, Alarm)--> invokeLater
                                                                                            |
                                                                    EditorNotifications.updateNotifications(VirtualFile)
                                                                                            v
 EditorNotificationProvider (BbjLineNumberedNotificationProvider extends BbjNotificationProviderBase)
   buildPanel: LineNumbering.isLineNumbered(document text)  -> null (no banner) | panel with [Denumber]
                                                                         |
 Tools menu / editor popup: BbjDenumberAction.update (BGT) -------------+|  click
   enabled = BBj program file && LineNumbering(text)                    ||
                                                                         v v
                              DenumberRunner.run(project, file)  (EDT click -> Task.Backgroundable)
                                 assertIsNonDispatchThread
                                 BbjComposerService.server(project).get(60s)
                                 server.denum(new DenumParams(uri)).get(60s)
                                 (transport failure only -> console line; no outcome wording)
                                                   |
                                      JSON-RPC bbj/denum {uri}
                                                   v
                         Language server (unchanged): DENUM via bbj-ls
                           |-- workspace/applyEdit --> LSP4IJ LanguageClientImpl.applyEdit
                           |                           one WriteCommandAction, no save  => 1 undo step, buffer dirty
                           |                           => documentChanged => back to the listener above => banner gone
                           |-- window/showMessage[Request] --> LSP4IJ balloon (STICKY_BALLOON with [Show])
                           |-- bbj/denumDiagnostics --> BbjLanguageClient.denumDiagnostics(DenumDiagnosticsParams)
                           |        -> DenumDiagnosticsPresenter -> BbjServerService.logToConsole (ERROR -> ERROR_OUTPUT)
                           '-- bbj/showDenumDiagnostics --> BbjLanguageClient.showDenumDiagnostics(Object)
                                    -> invokeLater: tool window "BBj Language Server" .getContentManager() + .show()
```

### Recommended Project Structure
```
bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── denum/
│   ├── LineNumbering.java                 # plain Java port of isLineNumberedSource(CharSequence)
│   ├── DenumModels.java                   # DenumParams, DenumResult, DenumDiagnosticsParams, DenumDiagnostic
│   ├── DenumDiagnosticsPresenter.java     # plain Java: payload -> ordered (text, isError) lines; no com.intellij import
│   ├── DenumberRunner.java                # IDE: Task.Backgroundable + request; shared by action and banner
│   └── BbjLineNumberedBannerRefresher.java# project service: document listener + coalescer, Disposable
├── actions/BbjDenumberAction.java         # update() BGT; actionPerformed -> DenumberRunner
├── BbjLineNumberedNotificationProvider.java # sibling of the 3 root-package providers
├── concurrency/DirtyFileCoalescer.java    # plain Java: set of dirty keys + PreviewDebouncer-style drain (testable with ManualScheduler)
├── composer/BbjComposerServer.java        # + @JsonRequest("bbj/denum")
└── lsp/BbjLanguageClient.java             # + two @JsonNotification handlers
```
Names are recommendations (discretion); the structural rules in "Anti-Patterns" and "Common Pitfalls" are not.

### Verbatim server contract (quotes the plan may rely on)

From `bbj-vscode/src/language/denum-command.ts` (read this session):
- line 27: `export const DENUM_REQUEST_METHOD = 'bbj/denum';`
- lines 30-32: `export interface DenumParams {` / `    uri: string;`
- line 38: `export type DenumStatus = 'denumbered' | 'not-line-numbered' | 'failed';`
- lines 71-87 `DenumResult` fields: `status: DenumStatus;`, `reason?: DenumFailureReason;`, `message?: string;`, `line?: number;`, `version?: number;`, `edits?: TextEdit[];`, `diagnostics?: DenumDiagnosticDto[];`, `applied?: boolean;`
- lines 45-62 reasons: `'invalid-params'`, `'not-open'`, `'tokenized'`, `'protected-program'`, `'mixed-numbering'`, `'too-large'`, `'timeout'`, `'denum-failed'`, `'service-unavailable'`, `'requires-bbj-26-03'`, `'not-reachable'`, `'stale'`, `'not-applied'`, `'in-progress'`, `'cancelled'`, `'invalid-settings'`

From `bbj-vscode/src/language/denum-notifications.ts` (read this session):
- line 25: `export const DENUM_DIAGNOSTICS_METHOD = 'bbj/denumDiagnostics';`
- line 31: `export const SHOW_DENUM_DIAGNOSTICS_METHOD = 'bbj/showDenumDiagnostics';`
- lines 34-44: `line: number;` (one-based, `0` means no location), `originalLineNumber: string;` (`''` when unknown), `severity: 'ERROR' | 'WARNING' | 'INFO';`, `message: string;`
- lines 47-51: `uri: string;`, `diagnostics: DenumDiagnosticDto[];`

From `bbj-vscode/src/language/bbj-notifications.ts:265-267`: `notifyShowDenumDiagnostics` calls `_connection?.sendNotification(SHOW_DENUM_DIAGNOSTICS_METHOD)`, i.e. **no params at all**.

From `plugin.xml` (read this session): action `bbj.compile` is added to `EditorPopupMenu` as `anchor="after" relative-to-action="bbj.runDwc"` and to `ToolsMenu` as `anchor="last"`; tool window `id="BBj Language Server"`; notification group `id="BBj Language Server"`.

### Pattern 1: Request declaration (mirror `bbj/compile`)
```java
// BbjComposerServer: one more @JsonRequest on the single proxy interface
// (getServerInterface() returns exactly one interface; see the existing compile/refresh Javadoc)
@JsonRequest("bbj/denum")
CompletableFuture<DenumResult> denum(DenumParams params);
```
`DenumModels.DenumResult` should declare only `status`, `reason`, `message`, `applied` (Boolean) and leave `edits`/`diagnostics`/`version`/`line` out: Gson ignores unknown JSON members, the edit payload is a whole-line replacement whose text can be the entire program, and `Position.character`/`line` are primitive `int` in LSP4J (the compile boundary test documents that an oversized number is rejected during message parsing, before any handler runs). The server already applied the edit; the client has no use for it. A `DenumModelsJsonBoundaryTest` modelled on `CompileResultJsonBoundaryTest` should parse a full envelope **containing** `edits` and `diagnostics` to prove they are ignored.

### Pattern 2: Action update on BGT (precedent: `BbjComposeActionBase`)
`BbjComposeActionBase.update` reads `e.getData(CommonDataKeys.EDITOR)` and `editor.getDocument()` under `ActionUpdateThread.BGT` [VERIFIED: actions/BbjComposeActionBase.java]. Do the same and read `document.getImmutableCharSequence()` (no copy). Use the resolved file type, not the extension: `BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())` (the compile action's extension check would admit `.bbx` config files; `BbjFileVisibility`'s Javadoc explains why that is wrong).

Presentation rule that satisfies D-11 ("greyed out" for unnumbered files): BBj program file in an editor -> `setVisible(true)` and `setEnabled(lineNumbered)`; anything else (no editor, other file type) -> `setEnabledAndVisible(false)`. Do **not** use `setEnabledAndVisible(lineNumbered)` for the BBj case, which would hide instead of grey out.

### Pattern 3: The request from a background task (precedent: `BbjCompileAction`)
Copy the compile action's shape, minus everything compile-specific:
- `new Task.Backgroundable(project, "Denumbering " + fileName + "…", false)`; first statement `ApplicationManager.getApplication().assertIsNonDispatchThread()`.
- URI: `file.toNioPath().toUri().toString()` with fallback `file.getUrl()` on `UnsupportedOperationException` (as in `BbjCompileAction`).
- `BbjComposerService.server(project).get(N, SECONDS)` then `server.denum(new DenumParams(uri)).get(N, SECONDS)`.
- **No `saveDocument`**: the server reads the open buffer, and 127 D-02 requires the file to stay dirty. Pin with a source guard (`saveDocument(` count 0).
- Timeout N: server peer deadline is 15 s (`PROGRAM_REQUEST_TIMEOUT_MS = 15_000`) and the server waits up to 30 s for `applyEdit` (`APPLY_EDIT_TIMEOUT_MS = 30_000`) [VERIFIED: java-interop-program-lane.ts:37, bbj-notifications.ts:101]; the request result comes back after the edit, so use 60 s (compile uses 45 against a 30 s server timeout).

### Pattern 4: Notification handlers (precedent: `bbjcplAvailability`, `configReloadRequired`)
```java
@JsonNotification("bbj/denumDiagnostics")
public void denumDiagnostics(DenumDiagnosticsParams params) { /* null/disposed guard, present, logToConsole per line */ }

@JsonNotification("bbj/showDenumDiagnostics")
public void showDenumDiagnostics(Object ignored) { /* invokeLater -> show tool window */ }
```
Use a single `Object` parameter for the payload-less reveal notification, as the existing `bbjcplAvailability(Object)` does and `Lsp4ijOverrideSiteSourceGuardTest` pins via `ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class)` (registered as a notification with `new Type[] {Object.class}`). The server sends no `params` member, so the argument arrives as `null` `[ASSUMED: A5]`; the handler must not dereference it.

Both handlers run on the LSP4J listener thread, not the EDT. `configReloadRequired` already calls `logToConsole` directly from that thread, so printing the block from the handler is the established pattern; tool-window access needs `ApplicationManager.getApplication().invokeLater` with a `project.isDisposed()` guard (same shape as `handleServerStatusChanged`).

### Pattern 5: Console block (mirror `formatDenumDiagnosticsBlock`)
VS Code's block, read this session, is: header `Denumber diagnostics for <path or "an unknown file">:` then per valid entry `  line <n>|no location[ (original <orig>)] <SEVERITY>: <message>`, with control characters and U+2028/U+2029 replaced by a space (regex class: `\p{Cc}` plus the two separator code points written as backslash-u-2028 and backslash-u-2029) and invalid entries skipped. Port that as `DenumDiagnosticsPresenter` returning a list of `(text, isError)` so the handler maps ERROR entries to `ConsoleViewContentType.ERROR_OUTPUT` and the rest to `SYSTEM_OUTPUT`/`NORMAL_OUTPUT`. The header path: `Paths.get(URI.create(uri))` for `file:` URIs inside try/catch, otherwise the raw string. The presenter must never throw on `null` params, null list, null entries, null fields or negative `line`; it must never emit a hyperlink or path to open (D-07). Keep the class free of `com.intellij` imports (the existing `theResultPresenterCarriesNoIntelliJImport` test is the pattern to copy).

### Pattern 6: Banner provider
```java
public final class BbjLineNumberedNotificationProvider extends BbjNotificationProviderBase {
    @Override
    protected @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            buildPanel(@NotNull Project project, @NotNull VirtualFile file) {
        // ensure the refresher service exists, read the document, run LineNumbering; null => no banner
        return fileEditor -> {
            EditorNotificationPanel panel = newPanel(fileEditor, EditorNotificationPanel.Status.Info, "<short text>");
            panel.createActionLabel("Denumber", () -> DenumberRunner.run(project, file));
            return panel;
        };
    }
}
```
`createActionLabel(String, Runnable)` is the existing call in `BbjJavaInteropNotificationProvider`. Do not add a second action label (D-01) and do not read `BbjSettings`. Obtain the document with `FileDocumentManager.getInstance().getDocument(file)`; `collectNotificationData` runs off the EDT under a read action `[ASSUMED: A1]` (the existing providers read services, not documents, so this is new ground). Per D-04 do not special-case read-only or tokenized.

`Status.Info` vs `Warning` is discretion. The existing guard test `crashSubclassUsesErrorStatusAndTheOtherThreeUseWarning` enumerates exactly four providers, so a fifth with `Info` fails nothing; if `Warning` is chosen the guard is still unaffected. Either way add the new class to the two parameterised lists in `BbjNotificationProviderBaseSourceGuardTest` (delegation pin; no `getExtension(`, no `"bbl"`).

### Pattern 7: Refresh on edit (D-03)
- Listener: `EditorFactory.getInstance().getEventMulticaster().addDocumentListener(DocumentListener, Disposable)` exists in 2024.2 [VERIFIED: `javap` of `EditorEventMulticaster` in the pinned `ideaIC-2024.2` `app-client.jar`: `addDocumentListener(DocumentListener)` and `addDocumentListener(DocumentListener, Disposable)`]. `DocumentListener` has default methods `documentChanged(DocumentEvent)`, `bulkUpdateFinished(Document)`; a `BulkAwareDocumentListener` also exists in `util-8.jar`. Overriding `documentChanged` and `bulkUpdateFinished` is enough.
- The listener fires for every document in the IDE: first filter with `FileDocumentManager.getInstance().getFile(document)` and `BbjFileVisibility.isBbjProgramFileTypeName(file.getFileType().getName())`, then record the file and return. No scanning in the listener.
- Debounce: record dirty files in a concurrent set, and a single `PreviewDebouncer(scheduler, ~300 ms, uiThread, drainAction)` over `new AlarmScheduler(this)` drains the set and calls `EditorNotifications.getInstance(project).updateNotifications(file)` per file [VERIFIED: `javap` of `EditorNotifications`: `public abstract void updateNotifications(com.intellij.openapi.vfs.VirtualFile);`]. `PreviewDebouncer` takes a fixed `Runnable`, hence the drain-the-set design; put the set logic in a small plain class so a `ManualScheduler` test can prove "N edits in the window = one update per distinct file".
- `uiThread` = `ApplicationManager.getApplication()::invokeLater`; guard `project.isDisposed()` and `file.isValid()` inside the drained action.
- Lifetime: the service implements `Disposable`, passes `this` to `addDocumentListener` and to `AlarmScheduler`; register it in `plugin.xml` as `<projectService serviceImplementation="..."/>` (same form as the three existing project services). Instantiate lazily by calling `getInstance(project)` from `buildPanel`, so no startup activity is needed.
- Both the DENUM edit (a `document.replaceString`/`deleteString` inside `LSPIJUtils.doApplyEdits`) and an undo fire `documentChanged`, so the banner disappears after the edit and returns on undo with no extra code (D-03).

### Pattern 8: plugin.xml
```xml
<action id="bbj.denumber"
        class="com.basis.bbj.intellij.actions.BbjDenumberAction"
        text="Denumber BBj Program"
        description="Remove the line numbers from the current BBj program">
    <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.compile"/>
    <add-to-group group-id="ToolsMenu" anchor="after" relative-to-action="bbj.compile"/>
</action>
```
Declare it **after** the `bbj.compile` element (a `relative-to-action` target must already be registered in that group). No `keyboard-shortcut` child (D-09). Add `<editorNotificationProvider implementation="com.basis.bbj.intellij.BbjLineNumberedNotificationProvider"/>` next to the four existing ones and the `<projectService>` for the refresher. The id `bbj.denumber` matches VS Code's command id `bbj.denumber` [VERIFIED: bbj-vscode/src/extension.ts:570]. Add a plugin.xml element-slice guard in the style of `BbjComposeCvsActionSourceGuardTest.pluginXmlRegistersTheActionWithMatchingIdAndNoDefaultKeystroke` (slice from `<action` to `</action>`, count `keyboard-shortcut` = 0, both group ids present, `relative-to-action="bbj.compile"` twice).

### Anti-Patterns to Avoid
- **Importing `com.redhat.devtools.lsp4ij.*` in any new main file** (including `ServerStatus` for a "server ready" check). `Lsp4ijImportAllowlistTest` pins an exact 12-file map and fails on any extra file. D-11 gates on file content only; `BbjComposerService.server` already starts the server. If a vendor import is ever truly needed, edit `ALLOWLIST`, the "TwelveFiles" test name and `assertEquals(12, ALLOWLIST.size())` together.
- **Saving the document** before or after the request (violates 127 D-02).
- **Declaring the two notifications on `BbjComposerServer`.** `ComposerRequestContractTest.theDeclaredRequestNamesAreDerivedFromTheInterface...` compares the interface's `@JsonRequest` set with `DECLARED_REQUESTS` for equality; `ConfigReloadNotificationContractTest` already asserts a client notification is absent from that interface.
- **Wording outcomes on the client.** The only client-originated text is a transport failure (server never reached, future failed, timeout), which the server cannot report; see Open Question 1.
- **Hyperlinks, `HyperlinkInfo`, `addMessageFilter`, `printHyperlink`** in the console path (D-07). No existing code uses them [VERIFIED: grep of `bbj-intellij/src` found none].
- **Scanning the whole document in the listener or in `update()`.** Scan at most 20 non-blank lines, from a `CharSequence`, without `toString()`/`split`.
- **Planning identifiers in source or test comments** (`D-05`, `IJF-06`, `Phase 128`, plan numbers): grep the diff before closing. Issue numbers are fine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Applying the DENUM edit / undo grouping | A client-side `WriteCommandAction` or `Document.replaceString` | The server's `workspace/applyEdit` handled by LSP4IJ | LSP4IJ applies it in one `runWriteCommandAction`, no save [VERIFIED: LanguageClientImpl.java:131-138, tag 0.21.0 identical] |
| Outcome messages and the "Show" button | Balloons/dialogs for success, tokenized, timeout, mixed numbering... | LSP4IJ `window/showMessage[Request]` rendering | Server presents every outcome; `showMessageRequest` is a `STICKY_BALLOON` so the button stays [VERIFIED: ServerMessageHandler.java:111-159; lsp4ij plugin.xml:935-937 at tag 0.21.0] |
| Server proxy resolution/start | Another `LanguageServerManager` lookup | `BbjComposerService.server(project)` | Starts a non-running server without restarting a healthy one |
| Banner chrome | A custom editor component | `BbjNotificationProviderBase.newPanel` + `createActionLabel` | The base owns the file-type guard and panel construction |
| Debounce | A `javax.swing.Timer` or ad-hoc thread | `AlarmScheduler` + `PreviewDebouncer` | Deterministic test double exists |
| Console text safety | Raw payload printing | Presenter that flattens `\p{Cc}`, U+2028/U+2029 | Payload is a trust boundary; a stray `\n` in a message would forge console lines |

**Key insight:** the plugin's established pattern is "thin IDE class, pure-Java seam, source guard", because the module has no IntelliJ test fixtures. Everything testable (`LineNumbering`, `DenumModels` parsing, `DenumDiagnosticsPresenter`, the coalescer) must be plain Java; everything IDE-bound (action, provider, listener, runner, handlers) is covered by source guards plus hand UAT.

## Detection rule to port (D-02)

Read this session: `bbj-vscode/src/line-numbering.ts` lines 26-49.

```ts
const numberedLine = /^\s*\d+[ \t]+\S/;
const maxLinesToInspect = 20;
const minLinesToDecide = 3;
// for each of text.split(/\r?\n/): skip if line.trim().length === 0;
// if (!numberedLine.test(line)) return false; if (++inspected >= maxLinesToInspect) break;
// return inspected >= minLinesToDecide;
```

Rules: blank lines (whitespace-only) are skipped and not counted; the first non-blank line that does not match rejects the whole text; after the 20th matching line scanning stops (later lines are not looked at); at least 3 matching non-blank lines are required; a numeric label `0010:` fails because `[ \t]+` must follow the digits.

Test cases in `bbj-vscode/test/line-numbering.test.ts` (read this session; pin all nine verbatim in the Java test):
1. `'0010 LET A=5\n0020 PRINT A\n0030 END\n'` -> true
2. `'\n0010 LET A=5\n\n0020 PRINT A\n0030 GOTO 0010\n'` -> true
3. `'00010 REM my program\n00020 PRINT "hi"\n00030 STOP\n'` -> true
4. modern source `class public MyApp ...` (5 lines, unnumbered) -> false
5. `'0010 LET A=5\nPRINT A\n0030 END\n'` -> false (one unnumbered statement disqualifies)
6. `'0010:\n    print "hi"\n    goto 0010\n'` -> false (numeric label)
7. `'0010 PRINT "hi"\n'` -> false (fewer than 3)
8. `'0010 LET A=5\r\n0020 PRINT A\r\n0030 END\r\n'` -> true (CRLF)
9. `''` -> false

Extra Java cases worth adding (they pin the rule's edges, not just the TS cases): exactly 3 numbered lines -> true, 2 -> false; 20 numbered lines followed by an unnumbered 21st -> true; 19 numbered then an unnumbered 20th -> false; tab separator `0010\tLET A=5`; indented `  10 PRINT`; a whitespace-only line (spaces/tab) between numbered lines is skipped; a `CharSequence` that is not a `String` (e.g. `StringBuilder`).

Implementation notes:
- Write it as a char loop over a `CharSequence` (`isLineNumberedSource(CharSequence)`), not a regex. JS `\s` and `trim()` treat NBSP, U+FEFF and Unicode space separators as whitespace; Java `\s` and `String.isBlank()` do not (`Character.isWhitespace` excludes NBSP), and `(?U)` would also widen `\d`. Use one `isJsWhitespace(char)` predicate for both the blank test and the leading-`\s*` skip, `c >= '0' && c <= '9'` for `\d`, and literal `' '`/`'\t'` for `[ \t]`. The JS set is TAB, VT, FF, SP, NBSP, U+FEFF, Unicode `Zs`, plus LF/CR/U+2028/U+2029 `[ASSUMED: A4]`.
- IntelliJ `Document` text is always LF-normalised, so CRLF only matters for the unit test; treat `\r` as whitespace and split on `\n` only (matching `split(/\r?\n/)`; a lone `\r` is not a separator in either implementation).
- Divergence from the TS version on exotic whitespace is harmless by 127 D-06 (the server answers with its own message); the char loop keeps it deliberate rather than accidental.
- Add a drift guard in the style of `ConfigReloadNotificationContractTest`: read `bbj-vscode/src/line-numbering.ts` as plain text and assert it still contains `/^\s*\d+[ \t]+\S/`, `maxLinesToInspect = 20` and `minLinesToDecide = 3`, so a one-sided rule change fails the IntelliJ suite.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted. (No stored data, live-service config, OS registrations, secrets or build artifacts carry a renamed string.)

## Common Pitfalls

### Pitfall 1: `ComposerRequestContractTest` fails even after adding `bbj/denum` to the set
**What goes wrong:** `everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources` concatenates only six named TS files; `'bbj/denum'` lives in `denum-command.ts`, which is not among them.
**Why it happens:** the test is a hard-coded file list, not a directory scan [VERIFIED: ComposerRequestContractTest.java:29-45, 97-104].
**How to avoid:** add `DENUM_COMMAND_TS = Paths.get("..","bbj-vscode","src","language","denum-command.ts")`, read it, append it to `combined`, add it to the failure message, and add `"bbj/denum"` to `DECLARED_REQUESTS`. Update the "sixteen names" comments to seventeen. The camel-case test needs no change (`bbj/denum` is all lower case). Also extend `theLanguageServerSourcesAreReadOnlyAsTextAndNeverParsed` only if the author wants symmetry (optional).
**Warning signs:** the failing assertion message `request name 'bbj/denum' not found as a quoted literal`.

### Pitfall 2: Console block silently lost when the tool window was never opened
**What goes wrong:** `BbjServerService.logToConsole` does `if (consoleView != null) consoleView.print(...)`; `consoleView` is set only inside `BbjServerLogToolWindowFactory.createToolWindowContent`, which runs lazily [VERIFIED: ui/BbjServerService.java:116-123, ui/BbjServerLogToolWindowFactory.java]. A user who has never opened the "BBj Language Server" window loses the D-05 block, and the later [Show] opens an empty window. (The existing run actions have the same latent gap: they log, then `show()`.)
**Why it happens:** content creation is lazy.
**How to avoid:** in the handler, before printing, on the EDT: `ToolWindow tw = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server"); if (tw != null) tw.getContentManager();`. `ToolWindowImpl.getContentManager()` calls `createContentIfNeeded()` first [VERIFIED: `javap -c` of `ToolWindowImpl` in the pinned 2024.2 `app-client.jar`: `getContentManager()` -> `invokespecial createContentIfNeeded:()V` then `contentManager.getValue()`]. That means the block write must happen after that call, i.e. inside the same `invokeLater` (print from the EDT there), or the printing must be deferred behind it. Do not call `show()` for the diagnostics notification; only the reveal notification shows the window (D-06). Alternative if the planner prefers not to touch the EDT: add a small bounded pending-line buffer inside `BbjServerService.logToConsole` that `setConsoleView` flushes; that fixes the gap for every existing log line too but widens the change.
**Warning signs:** UAT on a fresh IDE session (tool window never opened) shows an empty window after [Show]. Make this an explicit UAT step.

### Pitfall 3: Lsp4ij allowlist fence
**What goes wrong:** `Lsp4ijImportAllowlistTest.theCouplingSurfaceIsExactlyTheTwelveFilesInTheAllowlist` fails when a new main-source file imports or names `com.redhat.devtools.lsp4ij.*`.
**How to avoid:** see Anti-Patterns. Neither the action, runner, provider, refresher nor presenter needs a vendor symbol. `BbjLanguageClient` already has `ServerStatus` and `LanguageClientImpl` in its allowlist entry; adding handlers adds no vendor symbol. [VERIFIED: Lsp4ijImportAllowlistTest.java:44-64]

### Pitfall 4: Banner refresh storm
**What goes wrong:** calling `updateNotifications(file)` on every keystroke re-runs all five providers per keystroke.
**How to avoid:** the debounce in Pattern 7; filter by BBj file type in the listener before touching the coalescer; drain on the EDT with disposed/invalid guards.

### Pitfall 5: Banner never disappears or never returns
**What goes wrong:** the listener is registered without a parent `Disposable` (leak/duplicate), or registered per provider call, or the provider caches the verdict.
**How to avoid:** one service per project registers the listener exactly once in its constructor with `this` as parent; the provider decides afresh from the document on every `collectNotificationData`; no cached boolean.

### Pitfall 6: Action greyed out vs hidden
**What goes wrong:** `setEnabledAndVisible(lineNumbered)` hides the item on unnumbered files; D-11 wants it greyed out there. Whether the editor popup shows disabled items greyed is a platform presentation matter `[ASSUMED: A6]`.
**How to avoid:** Pattern 2's explicit `setVisible`/`setEnabled` split; UAT item: unnumbered BBj file shows the item greyed in both menus; a Java file shows no item.

### Pitfall 7: `showMessageRequest` future cancelled when the balloon closes
**What goes wrong (vendor, informational):** LSP4IJ cancels the pending response future if the balloon is closed without a click; the later [Show] cannot reach the server. Because the group is `STICKY_BALLOON`, the balloon stays until the user closes it, so this is the normal "dismissed it" case and needs no client handling. [VERIFIED: ServerMessageHandler.java:142-155]

### Pitfall 8: Read-only file
**What goes wrong:** LSP4IJ's `applyEdit` runs the edit in `WriteCommandAction`; on a read-only document the platform may refuse or prompt, and the server then reports `not-applied`. D-04 says do not filter read-only buffers; expected outcome is the server's own message. Include in UAT; no client code.

### Pitfall 9: Source guards that count tokens in comments
Existing guards use `countOccurrences` on raw text (some strip comment lines first). New code and Javadoc must not contain tokens a guard counts at zero: `getExtension(` and `"bbl"` in providers, `saveDocument(` in the denumber action if a guard pins zero. Write the new guards with the comment-stripping helper (`withoutCommentLines`, or `stripComments` from `Lsp4ijImportAllowlistTest`).

## Code Examples

### Boundary test skeleton (template: `CompileResultJsonBoundaryTest`)
```java
// Source: bbj-intellij/src/test/.../compile/CompileResultJsonBoundaryTest.java (read this session)
MessageJsonHandler handler = new MessageJsonHandler(Map.of("bbj/denum",
    JsonRpcMethod.request("bbj/denum", DenumModels.DenumResult.class, DenumModels.DenumParams.class)));
handler.setMethodProvider(id -> "bbj/denum");
ResponseMessage response = (ResponseMessage) handler.parseMessage(envelope);
DenumModels.DenumResult result = (DenumModels.DenumResult) response.getResult();
```
Envelope for the success case should include `"edits":[{"range":{"start":{"line":0,"character":0},"end":{"line":3,"character":0}},"newText":"..."}],"diagnostics":[...]` and assert `status`/`applied` parse and the extras are ignored.

### Notification registration test (template: `Lsp4ijOverrideSiteSourceGuardTest`)
```java
// Source: Lsp4ijOverrideSiteSourceGuardTest.java:182-188 (read this session)
Map<String, JsonRpcMethod> supported = ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
JsonRpcMethod registered = supported.get("bbj/denumDiagnostics");
assertTrue(registered.isNotification());
assertArrayEquals(new Type[] {DenumModels.DenumDiagnosticsParams.class}, registered.getParameterTypes());
// and "bbj/showDenumDiagnostics" -> new Type[] {Object.class}
```
This proves the annotation wiring without a live IDE and also parses a literal `{"jsonrpc":"2.0","method":"bbj/denumDiagnostics","params":{...}}` through `MessageJsonHandler` built from `getSupportedMethods`.

### Cross-language contract test (template: `ConfigReloadNotificationContractTest`)
Read `denum-notifications.ts` as text; assert both method names appear as quoted literals in it and as `@JsonNotification` values in `BbjLanguageClient.java`; assert the field names `uri`, `diagnostics`, `line`, `originalLineNumber`, `severity`, `message` appear in the TS (`containsWord`) and as `public` fields in `DenumModels.java`; assert the three severity literals `'ERROR'`, `'WARNING'`, `'INFO'` appear in the TS and are handled in the presenter; assert neither name appears in `BbjComposerServer.java`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IntelliJ/VS Code each carry denumber logic and the VS Code jar provider | One host-neutral `bbj/denum` request; server applies edit and presents outcomes | Phase 126/127 (v4.9) | IntelliJ sends `{uri}` and renders two notifications; nothing else |
| `StartupActivity` (`BbjWelcomeNotification`) | `ProjectActivity` is the newer API | platform 2023.x | Not needed here; the refresher is a lazily created service |

**Deprecated/outdated:** none that affect this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `EditorNotificationProvider.collectNotificationData` runs off the EDT inside a read action in 2024.2, so reading the `Document` there is allowed | Pattern 6 | If it ran on the EDT or without read access, `getDocument`/text reads need wrapping; the banner could throw. UAT on open catches it; fix is `ReadAction.compute` |
| A2 | `EditorNotificationPanel.Status.Info` exists in 2024.2 (existing code uses only `Warning`/`Error`) | Pattern 6 | Compile error; fall back to `Warning` (also allowed by discretion) |
| A3 | `ConsoleView` auto-scrolls to the end on `print`, so "scrolled to the latest block" needs no extra call | Pattern 4 / D-06 | Window may open scrolled to the top after a long session; fix is `requestScrollingToEnd()` if the concrete view exposes it. UAT checks it |
| A4 | The JS whitespace set listed in "Detection rule" | Detection rule | Only affects exotic Unicode whitespace; harmless per 127 D-06 |
| A5 | A payload-less notification (`sendNotification(method)`, no `params`) is delivered to a one-`Object`-parameter handler as `null` | Pattern 4 | The reveal notification could be dropped with an "unsupported"/arity warning in `idea.log`; UAT [Show] click and an `idea.log` check decide. Fallback: declare the handler with no parameter and re-run the registration test |
| A6 | The editor popup greys out (rather than hides) an enabled-false action | Pitfall 6 | D-11 "greyed out" wording would not literally hold; cosmetic, UAT-checked |
| A7 | The URI string from `Path.toUri()` selects the same open document LSP4IJ opened (server normalises both) | Pattern 3 | Server answers `not-open` for every click. Mitigated by the verified `NormalizedTextDocuments.get` normalisation; UAT with a path containing a space and a non-ASCII character is cheap insurance |

## Open Questions

1. **Client feedback for a transport failure**
   - What we know: the server presents every outcome it can reach; CONTEXT says the action "words nothing about outcomes". When `BbjComposerService.server(project)` yields `null`, the future fails or times out, the server never gets to speak, so a click would show nothing.
   - What's unclear: whether a single console line (or a balloon) for that one case is within the "words nothing" rule.
   - Recommendation: write one `ERROR_OUTPUT` console line for transport failure only (e.g. via a tiny plain-Java presenter, `Denumber request failed: <message>`), and do not show a balloon; do not map `DenumResult.status/reason` to any user text. Optionally log `status`/`reason` at `SYSTEM_OUTPUT` (discretion item 4).
2. **Debounce interval** — recommend 300 ms (matches the order of magnitude used for preview debounce); not a contract.
3. **Where "Show" focus lands** — recommend `ToolWindow.show()` (as `BbjRunActionBase` and the status-bar widget do) rather than `activate(...)`, so focus stays in the editor; D-06's word "activates" is satisfied by "shown and not hidden".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Gradle wrapper (bbj-intellij) | `./gradlew test` | yes | Gradle 9.8.0 per output | - |
| JDK 17 toolchain | compile/test | yes (auto-provisioned) | 17 | - |
| Gradle caches (offline) | test run without network | yes | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` ran `BUILD SUCCESSFUL in 2s` this session | - |
| `bbj-vscode/out/language/main.cjs` | `buildPlugin`/`prepareSandbox` only | not needed for `test` | - | Build `bbj-vscode` first for the UAT plugin zip |
| Live BBjServices 26.03 + IntelliJ | hand UAT | out of scope for research | - | Manual UAT step, per standing rules |

**Missing dependencies with no fallback:** none for planning/execution of the automated work. Last full-suite results on disk (`build/test-results/test`, 131 result files, dated today) total 1165 tests, 0 failures, 0 errors, 0 skipped [VERIFIED: summed from the XML headers]; use as the baseline.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` [VERIFIED: file read this session].

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit Jupiter via `org.junit:junit-bom:6.1.3` (`useJUnitPlatform()`); parameterised tests available |
| IntelliJ test fixtures | none (no `testFramework(...)` dependency): no light fixtures, no `Project`/`Application` in tests; IDE-bound code is covered by source guards + hand UAT |
| Config file | `bbj-intellij/build.gradle.kts` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.denum.*'` |
| Single class | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` (verified working, ~2 s) |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| Baseline | 1165 tests, 0 failures (see Environment Availability) |

`test` does not require the language-server bundle; `buildPlugin`/`prepareSandbox` do (`verifyLanguageServerBundle`). Per project CLAUDE.md, build `bbj-vscode` first before packaging the zip for UAT. `buildPlugin` depends on `test`.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IJF-05 | `bbj/denum` declared on `BbjComposerServer` and present in the TS sources; set equality with the interface | contract | `./gradlew test --offline --tests '*ComposerRequestContractTest'` | edit existing (add `denum-command.ts`, `bbj/denum`) |
| IJF-05 | `DenumResult` parses a real envelope incl. ignored `edits`/`diagnostics` through LSP4J's `MessageJsonHandler` | unit | `--tests '*DenumModelsJsonBoundaryTest'` | Wave 0 |
| IJF-05 / IJF-06 | `LineNumbering` matches the 9 TS cases + edge cases (3-line minimum, 20-line cap, tabs, blank lines, NBSP, `CharSequence`) | unit | `--tests '*LineNumberingTest'` | Wave 0 |
| IJF-06 | TS rule constants/regex have not drifted | contract | `--tests '*LineNumberingContractTest'` | Wave 0 |
| IJF-05 | Action: BGT, `BbjFileVisibility` file-type guard (no extension check), `setVisible`/`setEnabled` split, no `saveDocument(`, `Task.Backgroundable` then `assertIsNonDispatchThread()` once before `BbjComposerService.server(`, no `lsp4ij` import | source guard | `--tests '*BbjDenumberActionSourceGuardTest'` | Wave 0 |
| IJF-05 | plugin.xml: `id="bbj.denumber"`, `text="Denumber BBj Program"`, groups `EditorPopupMenu` and `ToolsMenu` each `relative-to-action="bbj.compile"`, zero `keyboard-shortcut` in its element, declared after `bbj.compile` | source guard | same class | Wave 0 |
| IJF-05 | No new vendor coupling (allowlist unchanged) | existing guard | `--tests '*Lsp4ijImportAllowlistTest'` | exists; must stay green unchanged |
| IJF-05 (D-05..D-07) | Presenter: header + one line per entry, ERROR flagged, flattening of control chars, null/garbage tolerance, no hyperlink/path, no `import com.intellij` | unit | `--tests '*DenumDiagnosticsPresenterTest'` | Wave 0 |
| IJF-05 (D-05..D-07) | `BbjLanguageClient` registers `bbj/denumDiagnostics` (param `DenumDiagnosticsParams`) and `bbj/showDenumDiagnostics` (param `Object`) as notifications | unit/guard | `--tests '*BbjLanguageClientDenumNotificationTest'` | Wave 0 |
| IJF-05 (D-05..D-07) | TS <-> Java names, fields, severities; notifications absent from `BbjComposerServer` | contract | `--tests '*DenumNotificationContractTest'` | Wave 0 |
| IJF-05 (D-05) | Handler forces tool-window content before printing; reveal handler uses `invokeLater` + `isDisposed` guard + `show()`; no `Filter`/hyperlink APIs | source guard | `--tests '*BbjLanguageClientDenumSourceGuardTest'` | Wave 0 |
| IJF-06 | Provider extends the shared base once, declares no `collectNotificationData`, no `getExtension(`/`"bbl"`, exactly one `createActionLabel("Denumber"`, no Dismiss/BbjSettings; registered in plugin.xml | source guard | extend `BbjNotificationProviderBaseSourceGuardTest` + new `BbjLineNumberedNotificationProviderSourceGuardTest` | edit existing + Wave 0 |
| IJF-06 | Coalescer: N changes in the window -> one refresh per distinct file; cancels only its own pending task; never `cancelAll` | unit (deterministic) | `--tests '*DirtyFileCoalescerTest'` (in package `...concurrency`, uses `ManualScheduler`) | Wave 0 |
| IJF-06 | Refresher: one listener with `this` as parent `Disposable`, filters by BBj file type before scheduling, drain guarded by `isDisposed`/`isValid`, registered once in plugin.xml | source guard | `--tests '*BbjLineNumberedBannerRefresherSourceGuardTest'` | Wave 0 |
| IJF-05 / IJF-06 | Whole IntelliJ suite green | full | `./gradlew test` | - |

Manual-only (justified: no IDE fixtures exist; matches the project's "hand UAT per phase" rule). Build the language server and plugin zip first and again from the final tree after code-review fixes; use a live BBj 26.03 BBjServices:
1. Action enabled on a line-numbered `.bbj`, greyed on an unnumbered one, absent for a non-BBj file; present in Tools and editor popup directly after Compile; no shortcut.
2. One Edit > Undo restores the numbered text; the buffer is dirty after DENUM and the file on disk is untouched until the user saves.
3. Banner: appears on open of a numbered file, absent on unnumbered and on `config.bbx`; [Denumber] works; banner disappears after the edit; returns after Undo; unaffected by Dismiss (none exists).
4. Server outcome balloons appear for: success, nothing to do (race), tokenized, mixed numbering, server down; a sticky balloon with [Show] after a run that reported diagnostics.
5. **Fresh IDE session, tool window never opened:** run Denumber on a program that yields diagnostics; the console block is present when the window is first opened; [Show] reveals it; ERROR lines render in the error colour; no hyperlinks.
6. Path with a space and a non-ASCII character; read-only file (expect the server's message).
7. `idea.log` shows no "unsupported notification" line for `bbj/denumDiagnostics` / `bbj/showDenumDiagnostics`.

### Sampling Rate
- **Per task commit:** the targeted `--tests` command for the files the task touched (each ~2-10 s).
- **Per wave merge:** `./gradlew test` (full suite; baseline 1165 green).
- **Phase gate:** full suite green, then hand UAT, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `denum/LineNumberingTest.java` and `denum/LineNumberingContractTest.java` - IJF-05/06
- [ ] `denum/DenumModelsJsonBoundaryTest.java` - IJF-05
- [ ] `denum/DenumDiagnosticsPresenterTest.java` - IJF-05
- [ ] `lsp/BbjLanguageClientDenumNotificationTest.java` and `lsp/BbjLanguageClientDenumSourceGuardTest.java` - IJF-05
- [ ] `denum/DenumNotificationContractTest.java` - IJF-05
- [ ] `actions/BbjDenumberActionSourceGuardTest.java` (incl. plugin.xml element slice) - IJF-05
- [ ] `BbjLineNumberedNotificationProviderSourceGuardTest.java` and updates to `BbjNotificationProviderBaseSourceGuardTest.java` - IJF-06
- [ ] `concurrency/DirtyFileCoalescerTest.java` (must sit in the `concurrency` test package to see package-private `ManualScheduler`) and `denum/BbjLineNumberedBannerRefresherSourceGuardTest.java` - IJF-06
- [ ] Edit `composer/ComposerRequestContractTest.java` (add `denum-command.ts`, `bbj/denum`, comments "sixteen" -> "seventeen")
- Framework install: none.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | - |
| V3 Session Management | no | - |
| V4 Access Control | no | The action sends only the URI of the file the user has open |
| V5 Input Validation | yes | Treat both notification payloads as untrusted (they cross a process boundary): null-tolerant presenter, flatten `\p{Cc}` + U+2028/U+2029, skip malformed entries, severity matched against the three literals, plain text only |
| V6 Cryptography | no | - |
| V7 Error Handling and Logging | yes | Log lines carry fixed tokens or the server's own message only; no document text, no stack trace to the user |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged console lines via embedded newlines/control characters in a diagnostic message | Spoofing/Tampering | Flatten control characters per entry so one entry is one console line (VS Code's `flatten`) |
| Payload field turned into a link, command or path to open | Elevation of privilege | Plain `print` only; no `HyperlinkInfo`, no `Filter`, no `FileEditorManager.openFile` from payload data; `uri` used only as a display string (D-07, 126 contract) |
| Oversized or hostile `diagnostics` list | Denial of service | Server already bounds the list; keep the presenter linear and non-throwing; an optional entry cap with a trailing "N more" line is acceptable (VS Code does not cut the log copy) |
| Number overflow rejecting a whole message in LSP4J's `int`-typed model | Denial of service | Do not model `edits`/positions; model `line` as `long` or leave unmodelled |
| Auto-save side effect exposing a half-edited file | Tampering | No `saveDocument` anywhere on this path (127 D-02) |

## Project Constraints (from CLAUDE.md)

- All IntelliJ commands: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew ...` (a build tool that needs its project directory is the one permitted `cd`). `bbj-vscode` must be built first only for `buildPlugin`/`prepareSandbox`, not for `test`.
- Shell/file-access rules: use absolute paths; never chain `cd` with `grep`/`find`/`cat`/`sed`/`head`/`tail`; no blind recursive scans; prefer the built-in Read/Glob/Grep tools (the Grep tool may be unregistered, then scoped `grep` on absolute paths); never read `.env*`/`*.pem`/`*.key`; stage with exact `git add <path>`, never `-A`/`.`.
- Do not edit generated language-server files; this phase changes `bbj-intellij/` only (no language-server edits).
- Process notes from the project memory that bear on planning/execution: put the shell rules (no `cd` chains, `git -C`, absolute paths) in every subagent prompt; forbid `git stash` in executor prompts; keep planning IDs (`D-xx`, `IJF-xx`, plan numbers) out of source and test comments and grep the diff before closing the phase; run tests in the foreground and check `pgrep -af` for leftovers; the whole-suite gate is judged on `numFailedTests`; commit trailers are added with plain `git commit` (the GSD commit helper omits them); do not request a CVE; UAT builds both distributables first and again from the final tree.

## Sources

### Primary (HIGH confidence; read or executed this session)
- `/home/coder/repos/bbj-language-server/.planning/phases/128-intellij-denum/128-CONTEXT.md`, `.planning/REQUIREMENTS.md` (IJF-05/06), `.planning/ROADMAP.md` (Phase 128 block), `.planning/config.json`
- bbj-intellij: `BbjCompileAction.java`, `BbjComposerServer.java`, `BbjComposerService.java`, `CompileModels.java`, `BbjLanguageClient.java`, `BbjNotificationProviderBase.java`, `BbjJavaInteropNotificationProvider.java`, `BbjFileVisibility.java`, `BbjServerService.java`, `BbjServerLogToolWindowFactory.java`, `BbjComposeActionBase.java`, `BbjRefreshJavaClassesAction.java`, `BbjRunActionBase.java` (log + show precedent), `concurrency/{Scheduler,AlarmScheduler,KeystrokeDebouncer,PreviewDebouncer}.java`, `plugin.xml`, `build.gradle.kts`
- bbj-intellij tests: `ComposerRequestContractTest`, `Lsp4ijImportAllowlistTest`, `BbjNotificationProviderBaseSourceGuardTest`, `BbjCompileActionSourceGuardTest`, `CompileResultJsonBoundaryTest`, `ConfigReloadNotificationContractTest`, `Lsp4ijOverrideSiteSourceGuardTest`, `BbjLanguageClientResolvedConfigPathSourceGuardTest`, `PreviewDebouncerTest`, `ManualScheduler`, `OffEdtDispatchSourceGuardTest`, `BbjComposeCvsActionSourceGuardTest` (plugin.xml slice)
- bbj-vscode: `src/language/denum-command.ts`, `denum-notifications.ts`, `bbj-denum-service.ts`, `bbj-notifications.ts`, `bbj-format-edit.ts` (`minimalLineEdit`), `java-interop-program-lane.ts` (timeouts), `main.ts` (`registerDenumRequest`), `bbj-module.ts:210` (`NormalizedTextDocuments`), `src/denum-diagnostics-output.ts`, `src/extension.ts` (`registerDenumDiagnosticsOutput`, `bbj.denumber`), `src/line-numbering.ts`, `test/line-numbering.test.ts`; `node_modules/langium/lib/lsp/normalized-text-documents.js`
- LSP4IJ source at `/home/coder/repos/lsp4ij` (tag `0.21.0` is an ancestor; `LanguageClientImpl.java`, `ServerMessageHandler.java`, `META-INF/plugin.xml` notification groups verified identical to 0.21.0; `LSPIJUtils.applyWorkspaceEdit/applyEdits/doApplyEdits`)
- Pinned platform jar `ideaIC-2024.2` (Gradle transforms cache): `javap` of `ToolWindowImpl.getContentManager`, `EditorNotifications`, `EditorEventMulticaster`, `DocumentListener`, `BulkAwareDocumentListener`
- Executed: `./gradlew test --offline --tests ...ComposerRequestContractTest` -> BUILD SUCCESSFUL in 2 s; summed `build/test-results/test/*.xml` -> 1165 tests / 0 failures

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- Training knowledge for A1, A2, A3, A4, A6 (flagged in the Assumptions Log)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; versions read from `build.gradle.kts`
- Architecture: HIGH - every pattern has an in-repo precedent read this session; platform API presence checked with `javap`
- Pitfalls: HIGH for 1-5 and 7 (verified in code), MEDIUM for 6 and 8 (platform presentation, runtime behaviour confirmed only by UAT)

**Research date:** 2026-10-03
**Valid until:** 2026-11-02 (stable; re-check if the LSP4IJ pin moves off 0.21.0, since `Lsp4ijCouplingCanaryTest` and the vendor behaviours above are measured against it)
