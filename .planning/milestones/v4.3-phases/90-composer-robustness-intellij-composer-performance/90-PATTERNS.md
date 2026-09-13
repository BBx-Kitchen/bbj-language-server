# Phase 90: Composer Robustness & IntelliJ Composer Performance - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 20 (new/modified) across bbj-vscode and bbj-intellij
**Analogs found:** 20 / 20 (all files have a same-repo precedent; no "no analog" files)

All analogs below are git-tracked source (verified via `git ls-files`), not gitignored mirrors.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/msgbox-composer.ts` (add `incomplete` outcome) | service (decode logic) | transform | `bbj-vscode/src/cvs-composer.ts` (`decodeCvsCall`'s `incomplete` branch) | exact |
| `bbj-vscode/src/msgbox-composer-webview.ts` (D-03 span-exact check, D-11 disposal) | component (webview panel) | request-response | `bbj-vscode/src/cvs-composer-webview.ts` (`cvsCallStillMatches`, completing mode) | exact |
| `bbj-vscode/src/msgbox-composer-ui.ts` (D-01/D-02 picker guard) | controller (command handler) | request-response | same file's own `runComposer`/`runWizard` shape; guard shape from `cvs-composer-webview.ts` | role-match |
| `bbj-vscode/src/addwindow-composer.ts` (D-06..D-09 validation) | service (preview/validation) | transform | `bbj-vscode/src/msgbox-composer.ts` (`validateBbjExpression`, `validateStringField`, `msgboxPreview`) | exact |
| `bbj-vscode/src/addchildwindow-composer.ts` (D-06..D-09 validation) | service (preview/validation) | transform | `bbj-vscode/src/msgbox-composer.ts` (same as above) + `addwindow-composer.ts` for id-field shape | exact |
| `bbj-vscode/src/addwindow-composer-webview.ts` (D-08 error rendering, D-11 disposal) | component (webview panel) | request-response | `bbj-vscode/src/msgbox-composer-webview.ts` (`message-error`, `input.invalid`, insert guard) | exact |
| `bbj-vscode/src/addchildwindow-composer-webview.ts` (D-08 error rendering, D-11 disposal) | component (webview panel) | request-response | `bbj-vscode/src/msgbox-composer-webview.ts` (same) | exact |
| `bbj-vscode/src/cvs-composer-webview.ts` (D-11 disposal only) | component (webview panel) | request-response | itself; disposal helper pattern shared with all six panels | role-match |
| `bbj-vscode/src/setopts-composer-webview.ts` (D-11 disposal only) | component (webview panel) | request-response | same shared disposal helper | role-match |
| `bbj-vscode/src/setopts-tristate-webview.ts` (D-11 disposal only) | component (webview panel) | request-response | same shared disposal helper | role-match |
| `bbj-vscode/src/webview-panel-lifecycle.ts` (NEW, D-11 shared helper) | utility | event-driven | `bbj-vscode/src/webview-nonce.ts` (small shared webview utility, no `vscode`-mock-breaking side effects) | role-match |
| `bbj-vscode/language/composer-commands.ts` (payload pass-through, no logic change expected) | route (LSP command handler) | request-response | itself — thin pass-through, confirm no change needed beyond DTO shape flowing through | exact |
| `bbj-vscode/test/msgbox-composer.test.ts` (new `incomplete` cases) | test | transform | `bbj-vscode/test/cvs-composer.test.ts` (existing `incomplete` coverage, 89-14 precedent) | exact |
| `bbj-vscode/test/msgbox-composer-ui.test.ts` (D-01/D-02 regression + D-03 span-exact) | test | request-response | itself — existing EDIT-mode staleness tests (lines ~274-297) as the shape to extend | exact |
| `bbj-vscode/test/webview-panel-lifecycle.test.ts` (NEW, D-11 discovery test) | test | event-driven | `bbj-vscode/test/composer-cue-single-source.test.ts` (`collectTsFiles` file-discovery pattern) | exact |
| `bbj-intellij/.../composer/MsgboxComposerDialog.java` (D-12 debounce, D-04 mode) | provider (Swing dialog) | streaming (UI-event driven) | `bbj-intellij/.../composer/SetoptsComposerDialog.java` (`scheduleRefresh()` + `PreviewDebouncer`) | exact |
| `bbj-intellij/.../composer/AddWindowComposerDialog.java` (D-06..D-09 validation, D-12 debounce) | provider (Swing dialog) | streaming | `bbj-intellij/.../composer/SetoptsComposerDialog.java` (debounce) + `MsgboxComposerDialog.java` (error-label rendering, once ported) | role-match |
| `bbj-intellij/.../composer/AddChildWindowComposerDialog.java` (D-06..D-09 validation, D-12 debounce) | provider (Swing dialog) | streaming | same as `AddWindowComposerDialog.java` | role-match |
| `bbj-intellij/.../composer/CvsComposeMode.java`-style new file/enum for MSGBOX (D-04) | model (enum) | transform | `bbj-intellij/.../composer/CvsComposeMode.java` (full file) | exact |
| `bbj-intellij/.../composer/DecodeEquality.java` (`sameMsgbox` extended) | utility (comparator) | transform | itself — existing `sameCvs`/`sameMsgbox` shape | exact |
| `bbj-intellij/.../composer/StaleEditGuard.java` usage in `ComposerLauncher.openMsgbox` (D-04 write path) | service (guarded write) | transform | itself — existing `edit` branch (lines 303-317) | exact |
| `bbj-intellij/.../composer/BbjComposerService.java` (D-14..D-17 cache, projectService conversion) | provider (per-project service) | CRUD (cache) | `bbj-intellij/.../ui/BbjJavaInteropService.java` (projectService + `Disposable` + TOPIC subscription shape) | exact |
| `bbj-intellij/.../composer/ComposerFlow.java` (D-17 catalogs-cache integration) | service (chained async flow) | streaming (CompletableFuture chain) | itself — existing three-stage `launch()` chain | role-match |
| `bbj-intellij/src/test/.../composer/BbjComposerServiceCacheTest.java` (NEW) | test | CRUD (cache) | `bbj-intellij/src/main/.../BbjInteropPortCache.java` (package-private-constructor-for-testing cache shape) | role-match |
| `bbj-intellij/src/test/.../composer/ComposerDialogRefreshSourceGuardTest.java` (edit: move 3 dialogs into `DEBOUNCED_DIALOG_SOURCES`) | test (source guard) | transform | itself — existing `DIALOG_SOURCES`/`DEBOUNCED_DIALOG_SOURCES` lists | exact |
| `bbj-intellij/src/test/.../lsp/Lsp4ijImportAllowlistTest.java` (edit only if new LSP4IJ symbol needed in `BbjComposerService.java`) | test (source guard) | transform | itself | exact |
| `bbj-intellij/src/test/.../composer/DecodeEqualityTest.java` (new `sameMsgbox`/`incomplete` cases) | test | transform | itself | exact |
| `bbj-intellij/src/test/.../composer/ComposerModelsJsonBoundaryTest.java` (extend with `valid`/error fields) | test | transform | itself | exact |

## Pattern Assignments

### `bbj-vscode/src/msgbox-composer.ts` (service, transform) — D-04 `incomplete` outcome

**Analog:** `bbj-vscode/src/cvs-composer.ts`

**Result-interface pattern** (`cvs-composer.ts:193-207`):
```typescript
export interface CvsDecodeCallResult {
    found: boolean;
    editable?: boolean;
    incomplete?: boolean;
    reason?: string;
    edit?: { callStart: number; callEnd: number };
    initial?: { str: string; bits: number[]; chars: string };
    trailingArgs?: string[];
}
```

**Incomplete-branch pattern** (`cvs-composer.ts:243-253`):
```typescript
    if (args.length < 2 || args[1].trim() === '') {
        const { chars, trailingArgs } = splitCharsAndTrailingArgs(args.slice(2));
        return {
            found: true,
            editable: false,
            incomplete: true,
            edit,
            initial: { str: args[0] ?? '', bits: [], chars },
            trailingArgs,
        };
    }
```

**Apply to `msgbox-composer.ts`:** Add a third branch to `decodeMsgboxCall` (currently two branches at
line ~693 `hasExpr || canAddOptions` and line ~711 `args.length >= 2`) ahead of both, triggered when
`info.args.length < 2` — return `{ found: true, edit, incomplete: true, initial: {...} }` using
MSGBOX's own `replace`/`hasOptions` field shape (`msgbox-composer.ts:663-673`), not a literal copy of
CVS's `editable`/`reason` shape (CONTEXT.md D-04 explicit warning).

---

### `bbj-vscode/src/msgbox-composer-webview.ts` (component, request-response) — D-03 span-exact check + D-11 disposal

**Analog:** `bbj-vscode/src/cvs-composer-webview.ts`

**Span-exact staleness check** (`cvs-composer-webview.ts:58-63`):
```typescript
export function cvsCallStillMatches(currentLineText: string, target: CvsEditTarget): boolean {
    if (currentLineText.slice(target.callStart, target.callEnd) !== target.callText) {
        return false;
    }
    return findCvsCalls(currentLineText).some(c => c.callStart === target.callStart && c.callEnd === target.callEnd);
}
```

**Current (to-be-replaced) slice-only check** (`msgbox-composer-webview.ts:67-70`):
```typescript
export function msgboxCallStillMatches(currentLineText: string, target: MsgboxEditTarget): boolean {
    return currentLineText.slice(target.callStart, target.callEnd) === target.callText;
}
```
Add the second condition (`findMsgboxCalls(currentLineText).some(c => c.callStart === target.callStart
&& c.callEnd === target.callEnd)`), reusing `findMsgboxCallAt`/`findMsgboxCalls` which already live in
`msgbox-composer.ts` with no `vscode` import — keep the CVS split exactly: pure call-finding stays in
`msgbox-composer.ts`, the slice+span-exact wrapper stays in `msgbox-composer-webview.ts`.

**Listener leak (all six panels, D-10/D-11)** — current unguarded registration
(`msgbox-composer-webview.ts:152`, identical in the other five panel files):
```typescript
}, undefined, context.subscriptions);
```
Confirmed via grep: zero `onDidDispose` calls anywhere in `bbj-vscode/src/*.ts`. Replace with the new
shared helper (see `webview-panel-lifecycle.ts` below) at all six call sites.

---

### `bbj-vscode/src/webview-panel-lifecycle.ts` (NEW utility, event-driven) — D-11 shared helper

**Analog:** `bbj-vscode/src/webview-nonce.ts` (small shared webview utility with no side effects; sibling file precedent for where to put a new cross-panel helper)

**Illustrative target shape** (name/shape left to planner per CONTEXT.md discretion):
```typescript
export function registerPanelScopedListener(
    panel: vscode.WebviewPanel,
    handler: (msg: unknown) => unknown,
): void {
    const sub = panel.webview.onDidReceiveMessage(handler);
    panel.onDidDispose(() => sub.dispose());
}
```
Applies to all six panels: `msgbox-composer-webview.ts`, `cvs-composer-webview.ts`,
`addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`,
`setopts-composer-webview.ts`, `setopts-tristate-webview.ts` — mechanical six-file edit.

---

### `bbj-vscode/src/msgbox-composer-ui.ts` (controller, request-response) — D-01/D-02 picker guard

**Analog:** itself (current unguarded write) + `cvs-composer-webview.ts`'s guard shape

**Current unguarded write** (`msgbox-composer-ui.ts:87-108`):
```typescript
async function runComposer(arg?: ComposeArg): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const initial = arg?.edit ? decode(arg.edit.current) : DEFAULT_STATE;

    const state = await runWizard(initial);
    if (!state) {
        return; // cancelled
    }
    const expr = encode(state);

    if (arg?.edit) {
        // Reconfigure: replace just the numeric expr token.
        const { line, exprRange } = arg.edit;
        const range = new vscode.Range(line, exprRange[0], line, exprRange[1]);
        await editor.edit(b => b.replace(range, String(expr)));   // <-- NO re-resolve/staleness check today
    } else if (arg?.insert) {
        const pos = new vscode.Position(arg.insert.line, arg.insert.character);
        await editor.edit(b => b.insert(pos, `, ${expr}`));       // <-- same: no re-resolve today
    } else { /* compose-new, out of scope */ }
}
```
**Fix shape (Pitfall E, recommendation b):** widen `ComposeArg.edit`/`.insert` to also capture the
call's `[callStart, callEnd)` and `callText` at wizard-open time (call `decodeMsgboxCall`/
`findMsgboxCallAt` before showing the QuickPick), then reuse the D-03 span-exact check before each
`editor.edit(...)` call, aborting with a warning matching the panels' existing wording:
`"The MSGBOX() call changed since the composer opened; nothing was applied."`

**Test shape for the #532 regression** (`test/msgbox-composer-ui.test.ts:44-104, 208-298`):
```typescript
vi.mock('vscode', () => ({
    window: { createWebviewPanel: createWebviewPanelMock, activeTextEditor: undefined, ... },
    workspace: { get textDocuments() { return textDocuments; }, applyEdit: applyEditMock },
}));
const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openMsgboxComposerPanel>[0];
```
Same file already demonstrates "EDIT mode refuses to write when the call text changed" for the webview
panel (lines 274-297) — mirror that for `runComposer`.

---

### `bbj-vscode/src/addwindow-composer.ts` / `addchildwindow-composer.ts` (service, transform) — D-06..D-09 validation

**Analog:** `bbj-vscode/src/msgbox-composer.ts`

Reuse `validateBbjExpression`, `validateStringField`, `resolvesToString` (`msgbox-composer.ts:197-326`)
and the `msgboxPreview` per-field-error + `valid` template. `addwindowPreview`/`addchildwindowPreview`
currently return no error fields (`AddWindowPreviewInput`/`AddChildWindowPreviewInput` confirmed to
carry NO validation today). Apply:
- free-text fields → `validateBbjExpression`
- `title` → `validateStringField`
- `x`/`y`/`width`/`height`/addChildWindow's `id` → `validateBbjExpression` plus an additional bare-
  string-literal rejection (new rule, follow `validateStringField`'s style for the message)
- `receiver`/`sysgui`/`window`/`context` → structural only, no additional rule
- blank field → keep today's default, validation only fires on typed text (D-07)
- edit mode → skip field checks entirely, mirroring `cvs-composer.ts`'s existing skip of its string
  check in edit mode (D-09)

---

### `bbj-vscode/src/addwindow-composer-webview.ts` / `addchildwindow-composer-webview.ts` (component, request-response) — D-08 error rendering + D-11 disposal

**Analog:** `bbj-vscode/src/msgbox-composer-webview.ts`

Reuse the inline error markup (`message-error`, `input.invalid` classes) and the `insert` message
handler's server-side guard:
```typescript
if (!r.valid) break;
```
Apply the same `webview-panel-lifecycle.ts` disposal helper as all other panels (D-11).

---

### `bbj-intellij/.../composer/MsgboxComposerDialog.java` / `AddWindowComposerDialog.java` / `AddChildWindowComposerDialog.java` (provider, streaming) — D-12 debounce

**Analog:** `bbj-intellij/.../composer/SetoptsComposerDialog.java` (already-debounced shape)

**Current unguarded refresh (confirmed via grep):**
```java
// MsgboxComposerDialog.java:175,182-188; AddWindowComposerDialog.java:171,182,218;
// AddChildWindowComposerDialog.java:175,186,225
cb.addActionListener(e -> refresh());   // fires synchronously per keystroke/click, no coalescing
```

**Target shape to port verbatim** (`SetoptsComposerDialog.java:190-257`):
```java
scheduleRefresh() { setOKActionEnabled(false); previewDebouncer.trigger(); }
```
using `PreviewDebouncer.trigger()` (`PreviewDebouncer.java:44-53`) which cancels the instance's own
pending task and schedules `refresh()` once after the shared debounce constant (reuse it, do not
redefine). The initial `refresh()` in each dialog's constructor stays immediate (unchanged). No new
`Alarm` per dialog — reuse `AlarmScheduler(getDisposable())`.

**Gate to edit in the same commit:** `ComposerDialogRefreshSourceGuardTest.java:61-62,72` —
`DIALOG_SOURCES` already lists all six dialogs; move `MSGBOX_SOURCE`, `ADD_WINDOW_SOURCE`,
`ADD_CHILD_WINDOW_SOURCE` from wherever they sit today into `DEBOUNCED_DIALOG_SOURCES`, and ensure each
of the three dialogs declares a `private void scheduleRefresh()` helper (not an inline
`previewDebouncer.trigger()` call), matching `SetoptsComposerDialog`'s CR-01 pattern
(`SetoptsComposerDialog.java:198-201`).

---

### `bbj-intellij/.../composer/CvsComposeMode.java`-analog new MSGBOX mode (D-04, IntelliJ)

**Analog:** `bbj-intellij/.../composer/CvsComposeMode.java` (full file)

```java
public enum CvsComposeMode {
    COMPOSE_NEW,
    EDIT_IN_PLACE,
    COMPLETE_CALL,
    NOT_EDITABLE;

    public static CvsComposeMode of(CvsDecodeResult decoded) {
        if (decoded == null || !decoded.found) {
            return COMPOSE_NEW;
        }
        if (decoded.incomplete) {
            return COMPLETE_CALL;
        }
        if (decoded.editable) {
            return EDIT_IN_PLACE;
        }
        return NOT_EDITABLE;
    }
}
```
MSGBOX has no `NOT_EDITABLE` case today; the new enum likely needs
`COMPOSE_NEW / EDIT_IN_PLACE / REPLACE / COMPLETE_CALL` (REPLACE = existing compose-and-replace
outcome) — design against MSGBOX's own `replace`/`hasOptions` fields (`msgbox-composer.ts:663-673`),
not a literal CVS copy (CONTEXT.md D-04 explicit warning).

---

### `bbj-intellij/.../composer/ComposerLauncher.java` `openMsgbox` (D-04 write path, IntelliJ)

**Analog:** itself — existing `edit` branch

**Guarded-write shape to extend with a third case** (`ComposerLauncher.java:303-317`):
```java
if (edit) {
    MsgboxEdit ed = decoded.edit;
    StaleEditGuard guard = new StaleEditGuard(
            documentViewOf(editor),
            body -> WriteCommandAction.runWriteCommandAction(project, "Configure MSGBOX", null, body),
            ComposerLauncher::onEdt,
            notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.MSGBOX)),
            StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
    guard.applyIfUnchanged(labelOf(Kind.MSGBOX), line, col, decoded,
            (currentLineText, currentCol) -> server.msgboxDecodeCall(new DecodeCallParams(currentLineText, currentCol)),
            DecodeEquality::sameMsgbox,
            () -> {
                int ls = editor.getDocument().getLineStartOffset(line);
                editor.getDocument().replaceString(ls + ed.callStart, ls + ed.callEnd, text);
            });
}
```
D-04's complete-the-call write is a third case (alongside `edit`/`insertAtCaret`) that must route
through this same `StaleEditGuard` shape. `DecodeEquality.sameMsgbox` (`DecodeEquality.java:55-96`)
must be extended to compare the new `incomplete` field so a stale completion cannot pass the guard.

---

### `bbj-intellij/.../composer/BbjComposerService.java` (provider, CRUD cache) — D-14..D-17

**Analog:** `bbj-intellij/.../ui/BbjJavaInteropService.java` (established projectService + `Disposable` + TOPIC shape, lines 29-87)

Convert `BbjComposerService` from a `private BbjComposerService() {}` static-only class (today: two-line
`server(project)` re-running `LanguageServerManager.start()` + `.getLanguageServer()` on every call, no
cache) into a `projectService` (register in `plugin.xml`, mirroring the two existing entries at
`plugin.xml:268,271`), implementing `Disposable`, subscribing in its constructor:
```java
project.getMessageBus().connect(this)
    .subscribe(BbjServerService.BbjServerStatusListener.TOPIC, status -> clearCache());
```
**Keep `BbjComposerService.server(Project)` as a static facade** delegating to
`project.getService(BbjComposerService.class).resolve()` so `BbjCompileAction.java:89` and
`BbjRefreshJavaClassesAction.java:60` need zero changes (Open Question 2's recommendation).

**Cache-shape precedent:** `bbj-intellij/.../BbjInteropPortCache.java` (full file) — package-private
constructor for testing, mirrors the shape `BbjComposerServiceCacheTest.java` should use.

**Pitfall A (must also fix):** `ComposerFlow.launch()` (`ComposerFlow.java:73-86`) calls
`server.composerCatalogs()` unconditionally as stage 2 — caching only the proxy in
`BbjComposerService` does not satisfy D-17. Either widen `ComposerFlow.launch`'s signature to accept a
caller-supplied `CompletableFuture<ComposerCatalogs>`, or have `BbjComposerService` expose a
`catalogs(project)` accessor that itself memoizes `server.composerCatalogs()` and have callers use that
instead of `ComposerFlow` fetching fresh every time. Re-read
`ComposerLauncherChainSourceGuardTest.java` (asserts exactly one `handle()` in `launch()`'s own body,
82-02) before changing the chain shape.

**Pitfall C (import allowlist):** `Lsp4ijImportAllowlistTest.java:62` pins
`Map.entry("com/basis/bbj/intellij/composer/BbjComposerService.java", Set.of("LanguageServerManager"))`.
Prefer keeping D-16's "cached proxy turns out dead" detection at the request call-site (existing
`ComposerNotices.requestFailed` handling) rather than reading LSP4IJ status types inside
`BbjComposerService.java`, to avoid growing this allowlist; if a new symbol is genuinely needed, add it
to this test in the same commit.

---

## Shared Patterns

### Fail-closed stale-edit guarding
**Source (VS Code):** `bbj-vscode/src/cvs-composer-webview.ts:58-63` (`cvsCallStillMatches`)
**Source (IntelliJ):** `bbj-intellij/.../composer/StaleEditGuard.java` (`applyIfUnchanged`, lines 76-108)
**Apply to:** `msgbox-composer-webview.ts` (D-03), `msgbox-composer-ui.ts` (D-01/D-02), IntelliJ
`ComposerLauncher.openMsgbox`'s new COMPLETE_CALL branch (D-04). Never search for or follow a moved
call — abort with a warning instead.

### Composer decode "incomplete" outcome
**Source:** `bbj-vscode/src/cvs-composer.ts:193-253` (`CvsDecodeCallResult`, incomplete branch), 89-14
**Apply to:** `msgbox-composer.ts`'s `decodeMsgboxCall` (D-04) — port the pattern, not the literal
field shape (MSGBOX's own `replace`/`hasOptions` fields differ from CVS's `editable`/`reason`).

### Per-field validation + `valid` flag preview payload
**Source:** `bbj-vscode/src/msgbox-composer.ts` (`msgboxPreview`, `validateBbjExpression`,
`validateStringField`, lines 197-326)
**Apply to:** `addwindow-composer.ts`, `addchildwindow-composer.ts` (D-06..D-09); VS Code webviews gate
Insert client-side but the server-side `if (!r.valid) break;` guard is authoritative; IntelliJ dialogs
call `setOKActionEnabled(p.valid)`.

### Swing dialog debounce
**Source:** `bbj-intellij/.../composer/SetoptsComposerDialog.java:190-257`,
`bbj-intellij/.../concurrency/PreviewDebouncer.java:44-53`, `AlarmScheduler.java`, `Scheduler.java`
**Apply to:** `MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`,
`AddChildWindowComposerDialog.java` (D-12). Test with `ManualScheduler` (`test/.../concurrency/ManualScheduler.java`) — no new `Alarm` instances (Pitfall 12 anti-pattern).

### VS Code webview panel-scoped listener disposal
**Source (utility precedent):** `bbj-vscode/src/webview-nonce.ts`
**Apply to:** all six panels (D-10/D-11) via the new `webview-panel-lifecycle.ts` helper — tie
`panel.webview.onDidReceiveMessage` to `panel.onDidDispose`, replacing the current
`context.subscriptions`-only registration at each of the six call sites.

### Per-project cache subscribed to server-status TOPIC
**Source:** `bbj-intellij/.../ui/BbjJavaInteropService.java:29-87` (projectService + `Disposable` +
`BbjServerService.BbjServerStatusListener.TOPIC` subscription — already consumed by
`BbjStatusBarWidget` and `BbjJavaInteropService`)
**Apply to:** `BbjComposerService.java` (D-14/D-15) — clear cache on any status change (start, stop,
crash, manual restart, Phase 85 config-reload restart).

### File-discovery-based regression tests (no hard-coded subject lists)
**Source:** `bbj-vscode/test/composer-cue-single-source.test.ts:31-46` (`collectTsFiles`)
**Apply to:** the new `webview-panel-lifecycle.test.ts` (D-11) — discover panel files dynamically
(filter by filename pattern, e.g. `-composer-webview.ts`/`-webview.ts`) so a seventh composer is
covered automatically, mirroring IntelliJ's `IntentionDescriptionResourcesTest` deriving subjects from
`plugin.xml` rather than a hard-coded list.

## No Analog Found

None — every file in scope has a same-repo, same-family precedent (this phase is explicitly
"extend existing composer/dialog/cache patterns," not new mechanism design, per RESEARCH.md's primary
recommendation).

## Gate Files Requiring Edits (not new analogs, but load-bearing)

| File | Required Edit | Why |
|------|----------------|-----|
| `bbj-intellij/src/test/.../composer/ComposerDialogRefreshSourceGuardTest.java` | Move `MSGBOX_SOURCE`, `ADD_WINDOW_SOURCE`, `ADD_CHILD_WINDOW_SOURCE` into `DEBOUNCED_DIALOG_SOURCES` (lines 61-62, 72) | Pitfall D — the guard test fails the build immediately after D-12's dialog edits land if the lists aren't updated in the same commit |
| `bbj-intellij/src/test/.../lsp/Lsp4ijImportAllowlistTest.java` | Add a symbol to the `BbjComposerService.java` entry (line 62) ONLY if a new LSP4IJ import is genuinely needed | Pitfall C — hand-maintained allowlist, does not auto-grow |
| `bbj-intellij/src/test/.../composer/DecodeEqualityTest.java` | Add cases for `sameMsgbox`'s new `incomplete` comparison | Folded todo / D-04 |
| `bbj-intellij/src/test/.../composer/ComposerModelsJsonBoundaryTest.java` | Extend with new `valid`/per-field-error envelope cases | Pitfall 13 — cross-host DTO version-skew safety |
| `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java` | Run unmodified as a regression gate (no method-name drift expected — only payload shape changes) | Cross-host method-name pin |

## Metadata

**Analog search scope:** `bbj-vscode/src/*.ts`, `bbj-vscode/test/*.ts`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/{composer,concurrency,ui}/`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/{composer,concurrency,lsp}/`
**Files scanned:** 20 target files + 24 analog/gate files, all confirmed git-tracked via `git ls-files`
**Pattern extraction date:** 2026-09-12
**Primary source:** 90-RESEARCH.md's direct, file:line-cited reads (this session's research pass already
performed full-file reads of every analog named above; excerpts here are drawn from those verified
citations, not re-derived).
