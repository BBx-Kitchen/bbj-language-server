# Architecture Research — v4.3 Polish & Quality

**Domain:** Integration of 23 polish issues into an existing dual-IDE Langium language server
**Researched:** 2026-09-06
**Confidence:** HIGH (every claim below is grounded in a file read during this research; line numbers cited are current as of `origin/main` @ `c0b113c7`)

This is not new-system research — it is an integration map. No new subsystem is introduced;
every issue attaches to one of four existing seams: the shared editor-agnostic composer modules
(`bbj-vscode/src/*-composer.ts`), the `bbj/composer/*` / `bbj/*` custom-request layer
(`composer-commands.ts` + `BbjComposerServer.java`), the Phase 79 `Scheduler`/`RestartGate`
concurrency seam (`bbj-intellij/.../concurrency/`), and the Phase 82 `ComposerFlow`/
`StaleEditGuard`/`ComposerNotices` composer-robustness seam.

## System Overview (unchanged — where the 23 issues attach)

```
┌───────────────────────────────── VS Code host ─────────────────────────────────┐
│ extension.ts (activate: 16 undisposed regs #531, refreshJavaClasses :700-709)  │
│  msgbox/addwindow/addchildwindow/setopts -composer-{ui,webview}.ts (#530 #623) │
│  Commands/Commands.cjs (#512)   document-formatter.ts (#499)   decompile-io.ts │
│  (#500)   package.json contributes.languages (#485 — static filenames array)  │
└───────────────────────┬─────────────────────────────────────────┬─────────────┘
                         │ LSP stdio                                 │ vscode.workspace
                         ▼                                           ▼ FileSystemWatcher (NEW, #486)
┌────────────────────────────────── Language Server (main.cjs) ──────────────────┐
│ bbj-ws-manager.ts: onInitialize reads configPath from initializationOptions,   │
│   initializeWorkspace() reads it ONCE at startup, no watcher (#485 #486)      │
│ composer-commands.ts: bbj/composer/{msgbox,addwindow,addchildwindow}/* — NOT  │
│   setopts (#633 gap) — thin pass-throughs to editor-agnostic *-composer.ts    │
│ msgbox-composer.ts buildCallInfo(): literal-int-only regex (#648)             │
│ bbj-scope.ts getBBjClassesFromFile() full index scan (#505)                   │
│ bbj-scope-local.ts collectLocalSymbols() unpruned streamAllContents (#505)    │
│ bbj-linker.ts link(): isExternalDocument + treeIter.prune() — the pattern to  │
│   mirror for #505                                                             │
│ java-interop.ts: acquireLock/lockQueue (#504), _resolvedClasses LruMap (#497) │
│ bbj-completion-provider.ts: activeCancelToken singleton field (#498)          │
│ main.ts: connection.onRequest('bbj/refreshJavaClasses', ...) — already exists │
└───────────────────────┬──────────────────────────────────────────┬────────────┘
                         │ LSP stdio                                 │ workspace/didChangeWatchedFiles
                         ▼ (LS-agnostic to host)                     │ (candidate mechanism, see #486)
┌───────────────────────────────── IntelliJ host (LSP4IJ) ───────────────────────┐
│ BbjLanguageServerFactory.getServerInterface() -> BbjComposerServer.class       │
│ BbjComposerServer.java: bbj/composer/* + bbj/compile (Phase 81 pattern) —      │
│   #632 adds bbj/refreshJavaClasses here                                       │
│ ComposerLauncher.java -> BbjComposerService.server() [no cache, #612] ->       │
│   ComposerFlow (Phase 82) -> {Msgbox,AddWindow,AddChildWindow}ComposerDialog   │
│   -> StaleEditGuard (Phase 82, pattern for #532)                              │
│ Msgbox/AddWindow/AddChildWindowComposerDialog: SimpleDocumentListener calls    │
│   refresh() synchronously, no Scheduler (#611)                                │
│ ConfigureMsgbox/AddWindow/AddChildWindowIntention: Alt+Enter only, no gutter  │
│   cue (#650)                                                                  │
│ BbjServerService.java: RestartGate + requestRestart(long) (Phase 79 seam) —   │
│   BbjRefreshJavaClassesAction calls requestRestart(0) today (#632)            │
│ BbjSettings.java getState(): auto-detects bbjHomePath/nodeJsPath, NOT         │
│   javaInteropPort (#608, only in BbjSettingsConfigurable.reset())             │
│ BbjStatusBarWidget / BbjJavaInteropStatusBarWidget: messageBusConnection on   │
│   status events only, no FileEditorManagerListener (#610)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## New vs. Modified Components

| Component | Status | Issues | Notes |
|---|---|---|---|
| `bbj-vscode/src/cvs-composer.ts` + `cvs-composer-ui.ts` + `cvs-composer-webview.ts` | **NEW** | #649 | Clone of `msgbox-composer.ts`/`-ui.ts`/`-webview.ts`'s three-file shape |
| `bbj/composer/cvs/*` handlers in `composer-commands.ts` | **NEW** | #649 | Same thin-pass-through shape as the msgbox/addwindow/addchildwindow sections |
| `bbj/composer/setopts/*` handlers in `composer-commands.ts` | **NEW** | #633 | Today SETOPTS is the only composer NOT in this file — `grep -c setopts composer-commands.ts` = 0, confirmed |
| `SetoptsComposerDialog.java`, `CvsComposerDialog.java` | **NEW** | #633, #649 | Follow `MsgboxComposerDialog.java`'s constructor/`ComposerFlow`/`StaleEditGuard` shape |
| `ComposerModels.SetOpts*`, `ComposerModels.Cvs*` DTOs | **NEW** | #633, #649 | Added to the existing `ComposerModels.java` (24 existing nested classes) |
| `BbjComposerServer.setopts*()`, `.cvs*()`, `.refreshJavaClasses()` methods | **NEW methods on existing interface** | #633, #649, #632 | `getServerInterface()` returns exactly one interface (comment at `BbjComposerServer.java:62-63`) — every new request family is added here, not a new interface |
| `ConfigureCvsIntention.java`, `ConfigureSetoptsIntention.java` (or gutter LineMarkerProvider) | **NEW** | #649, #633, #650 | Mirrors `ConfigureMsgboxIntention.java` |
| A VS Code "additive expression" evaluator inside `msgbox-composer.ts` | **NEW logic in existing file** | #648 | No numeric-expression parser or `BBjMsgBox.*` reverse-constant-lookup exists today |
| An IntelliJ persistent visual cue (`LineMarkerProvider` or inlay hint) | **NEW mechanism** | #650 | IntelliJ has zero always-visible composer cue today — only `IntentionAction`s reachable via Alt+Enter |
| VS Code `CodeLensProvider` for msgbox/addwindow/addchildwindow | **NEW** | #650 | Today only `setopts-composer-ui.ts` has a `CodeLensProvider` (`:82-96`); msgbox/addwindow/addchildwindow have only a `CodeActionProvider` (lightbulb) |
| VS Code dynamic language-association listener | **NEW** | #485 | No `vscode.languages.setTextDocumentLanguage` call exists anywhere in `extension.ts` today |
| Config-file watcher (VS Code `FileSystemWatcher`, IntelliJ VFS/`BulkFileListener`) | **NEW** | #486 | Neither host watches the config file today; `bbj-ws-manager.ts` reads it once in `initializeWorkspace()` |
| A resolved-config-path query (new tiny LSP request, or duplicated fallback logic per host) | **NEW (design choice)** | #485, #486 | See "Config Path Data Flow" below |
| `KeystrokeDebouncer`-style wrapper (or direct `Scheduler.schedule`) for composer `refresh()` | **NEW usage of existing seam** | #611 | Reuses Phase 79's `Scheduler`/`AlarmScheduler`, not `KeystrokeDebouncer<T>` verbatim (see caveat below) |
| Server/catalogs cache in `ComposerLauncher`/`BbjComposerService` | **NEW cache, existing classes** | #612 | Invalidated by the same restart path `RestartGate.doRestart` already drives |
| `addwindowPreview`/`addchildwindowPreview`'s `valid` field | **MODIFIED** | #623 | `msgboxPreview()` already returns `valid`; the other two previews don't yet |
| `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts` insert handlers | **MODIFIED** | #623, #530 | Add `r.valid` gate + `panel.onDidDispose` |
| `msgbox-composer-webview.ts`, `setopts-composer-webview.ts` | **MODIFIED** | #530 | Add `panel.onDidDispose` only (already gate on `r.valid`) |
| `msgbox-composer-ui.ts` `runComposer()` | **MODIFIED** | #532 | Add a re-decode/re-validate step before `editor.edit()`, mirroring `StaleEditGuard.java` |
| `bbj-scope.ts`, `bbj-scope-local.ts` | **MODIFIED** | #505 | Add per-file cache + external-document pruning |
| `java-interop.ts` | **MODIFIED** | #504, #497 | Add circuit breaker + LRU pinning; no new files |
| `bbj-completion-provider.ts` | **MODIFIED** | #498 | Thread cancel token through `completionForCrossReference`'s own extension point instead of the shared field |
| `decompile-io.ts`, `document-formatter.ts`, `Commands.cjs`, `extension.ts` | **MODIFIED** | #500, #499, #512, #531 | Single-file, localized fixes |
| `BbjSettings.java`, `BbjSettingsConfigurable.java` | **MODIFIED** | #608 | Move port auto-detect into `getState()`; replace `== 5008` equality check with a real sentinel |
| `BbjRefreshJavaClassesAction.java`, `BbjComposerServer.java` | **MODIFIED** | #632 | Swap `requestRestart(0)` for the `BbjCompileAction.java` pattern (background task + targeted request) |
| `BbjStatusBarWidget.java`, `BbjJavaInteropStatusBarWidget.java` | **MODIFIED** | #610 | Add `FileEditorManagerListener` subscription |

## Config Path Data Flow (#485, #486, #632, #608)

**Today:** the resolved config path is computed in exactly one place —
`bbj-ws-manager.ts` (`BBjWorkspaceManager`), and it is read exactly once:

- `onInitialize` (`bbj-ws-manager.ts:46-121`) stores `this.configPath` from
  `params.initializationOptions.configPath` (`:68`) — the VS Code `bbj.configPath` setting or
  IntelliJ's `BbjSettings.State.configPath`, sent flat in `initializationOptions` by both hosts
  (VS Code's `startLanguageClient`; IntelliJ's `BbjLanguageServerFactory.initializeParams`,
  `:53-54`).
- `initializeWorkspace()` (`bbj-ws-manager.ts:127-154`) resolves the PREFIX either from
  `this.configPath` directly (custom path branch, `:133-141`) or by falling back to
  `{bbjdir}/cfg/config.bbx` (`:142-154`) — **this fallback derivation logic exists only inside
  the language server.** Neither host currently knows or computes the effective resolved path;
  each only knows its own two raw settings (`configPath` and `bbjHome`/`bbjHomePath`).
- This happens once, at `initializeWorkspace` time. There is no watcher, no re-read, no
  `workspace/didChangeWatchedFiles` registration anywhere in `bbj-ws-manager.ts` or `main.ts`.

**#485 requires:** every consumer of the config path (PREFIX resolution, project-wide USE
from #83/#484 — same `initializeWorkspace` code path — plus each host's own run commands, the
VS Code SETOPTS CodeLens, and the language/file-type association) to honor a **custom name**,
not just a custom location. The LS side already does (it reads whatever file is at
`this.configPath` regardless of name). The gaps are host-side:
- **VS Code:** `package.json`'s `contributes.languages` (`:44-60`) is a *static filename array*
  (`config.bbx`, `Config.bbx`, `config.min`, `Config.min`). A file at a custom path with any
  other name never gets the `bbx-config` language, so `setopts-composer-ui.ts`'s
  `argForActiveEditor()` (`:57-60`) — gated on `editor.document.languageId !== 'bbx-config'` —
  and the TextMate grammar never activate on it. Fix: a new `onDidOpenTextDocument` listener in
  `extension.ts` that calls `vscode.languages.setTextDocumentLanguage(doc, 'bbx-config')` when
  the opened file's path matches the resolved config path — no such dynamic call exists in
  `extension.ts` today.
- **IntelliJ:** same problem, but the TextMate-bundle association mechanism
  (`bbj-intellij/src/main/resources/textmate/bbj-bundle/package.json`) is filename-list-based
  with no documented per-file runtime override — PROJECT.md's own tech-debt list already
  records "IntelliJ TextMate bundle cannot exclude config.bbx by filename" as a platform
  limitation. This needs the same kind of platform-capability check #632 already had to do for
  its own custom-request question before a single edit can be named as buildable.

**#486 requires** watching the *resolved* file and debounce-restarting. This needs the
resolved path to exist on the host side first — which is exactly what #485 has to establish
(both the custom-location and custom-name cases). Two designs surfaced by reading the code:

1. **Duplicate the fallback logic per host** (simplest): both hosts already hold `bbj.home`/
   `bbjHomePath` and `configPath`, so each can locally compute
   `configPath || join(bbjHome, 'cfg', 'config.bbx')` and watch that. Risk: two independent
   reimplementations of `bbj-ws-manager.ts:132-154`'s branch can drift (e.g. if the LS's
   fallback logic changes, e.g. to also try `config.min`).
2. **A new tiny read-only LSP query** (e.g. `bbj/resolvedConfigPath`), following the exact
   precedent set by `composer-commands.ts`'s `bbj/composer/*` layer and `bbj/compile`: a small,
   named custom request added to the existing custom-request surface, single source of truth.
   Given this milestone already treats "duplicate logic across two hosts" as a defect class
   (#623's whole justification, #648's shared-module fix), option 2 is the architecturally
   consistent choice — it costs one new one-line LS handler and one new interface method on
   `BbjComposerServer.java`/one new VS Code custom request, and removes drift risk entirely.

Once each host knows the resolved absolute path: VS Code watches it via
`vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(dirname, basename))` (the
file typically lives outside the workspace root, so a workspace-relative watcher pattern is
insufficient — `RelativePattern` with an explicit base URI is required, exactly as #486's own
issue text specifies). IntelliJ registers a `BulkFileListener`/`AsyncFileListener` on the VFS
for that path. Both then call the **existing** Phase 79 restart machinery — IntelliJ already
has it (`BbjServerService.requestRestart(long)` / `RestartGate`); VS Code has no equivalent
today and would call `client.stop()`/`startLanguageClient()` again, optionally gated behind a
"config.bbx changed — reload?" prompt as the issue itself suggests.

**#608** (java-interop port auto-detection) and **#632** (targeted `bbj/refreshJavaClasses` on
IntelliJ) sit in the same PROJECT.md theme bucket but have **no data-flow dependency** on #485/
#486 — #608 is a pure `BbjSettings.java`/`BbjSettingsConfigurable.java` change, and #632 reuses
the language server's *existing* `bbj/refreshJavaClasses` handler
(`main.ts:33`, confirmed registered) which VS Code already calls today
(`extension.ts:700-709`, `client.sendRequest('bbj/refreshJavaClasses')`). #632's own IntelliJ
code has already moved past the issue's stale evidence: `BbjRefreshJavaClassesAction.java:30`
now calls `BbjServerService.requestRestart(0)` (the Phase 79 `RestartGate` coalescing entry
point), not a raw `restart()` — but it is still a full server restart under the hood
(`requestRestart` → `RestartGate` → `doRestart` → `LanguageServerManager` stop/start), so the
issue's complaint (every language feature goes offline) still holds. The fix is a direct port
of the **Phase 81 `bbj/compile` pattern**: `BbjComposerServer.java` already demonstrates the
exact shape needed — add
`@JsonRequest("bbj/refreshJavaClasses") CompletableFuture<Void> refreshJavaClasses();`
to that one interface (the same interface `bbj/compile` lives on, for the same reason: LSP4IJ's
`getServerInterface()` returns exactly one class), then rewrite the action to mirror
`BbjCompileAction.java`'s `Task.Backgroundable` + `BbjComposerService.server(project)` +
bounded `.get(timeout, unit)` shape instead of calling `requestRestart`.

## Composer Command-Layer Data Flow (composer commands → both hosts)

`composer-commands.ts` is the single source of truth for msgbox/addwindow/addchildwindow flag
arithmetic, reached by both hosts over LSP custom requests (`bbj/composer/*`, doc comment at
`composer-commands.ts:1-13` states this explicitly: "the language server and the VS Code UI stay
a single source of truth"). VS Code's own webviews (`msgbox-composer-webview.ts` etc.) call the
same pure functions **in-process** (they import `../msgbox-composer.js` directly, not over LSP —
VS Code doesn't need the network hop since it's the same Node process), while IntelliJ reaches
the identical logic through `BbjComposerServer`'s `@JsonRequest` methods. **This means a fix to
the shared module benefits both hosts automatically, without touching either host's UI code** —
this is the load-bearing fact behind several of this milestone's build-order decisions:

- **#648** (MSGBOX composer not offered for expression-valued options): the bug is entirely in
  `msgbox-composer.ts`'s `buildCallInfo()` (`:507-515`) — its options-argument regex is
  `/^(\s*)(\d+)\s*$/`, matching only a bare integer literal. `BBjMsgBox.X+BBjMsgBox.Y` and
  `1+256` both fail this regex, so `exprRange`/`exprValue` stay `undefined`, and since
  `argRanges.length > 1` the `optionInsertOffset` branch (`:516-519`) is also skipped — the
  Code Action provider (`msgbox-composer-ui.ts:49,66`) then returns `[]`, exactly reproducing
  the reported symptom. **Fixing this in `msgbox-composer.ts` alone (a numeric additive-sum
  parser plus a reverse lookup from `BBjMsgBox.*` constant names back to the catalog values —
  no such reverse map exists today, only the forward `msgboxConstantsExpr()` at `:170-179`)
  ships to both VS Code (via `msgbox-composer-ui.ts`'s direct import) and IntelliJ (via
  `composer-commands.ts`'s `bbj/composer/msgbox/decodeCall` handler, `:82-104`, which
  `BbjComposerServer.msgboxDecodeCall` calls over LSP) with zero IDE-specific code.**
- **#623** (VS Code addwindow/addchildwindow insert applied unconditionally): the missing
  `valid` gate could be patched purely in the VS Code webviews, but `addwindowPreview()`/
  `addchildwindowPreview()` in `composer-commands.ts` already compute a full preview payload the
  same way `msgboxPreview()` does — `msgboxPreview()` already returns `valid` (`msgbox-composer.ts:415,420`);
  the addwindow/addchildwindow preview functions do not yet. Adding a `valid` field to those two
  preview functions (in the shared `addwindow-composer.ts`/`addchildwindow-composer.ts` modules)
  and gating both the VS Code webview's insert handler AND `AddWindowComposerDialog.java`/
  `AddChildWindowComposerDialog.java`'s OK button on the same field is the shape consistent with
  how `MsgboxComposerDialog.java` already disables its OK button on `!p.valid` (`apply()`,
  `:255`). The issue is scoped to VS Code only, but the architecturally consistent fix touches
  the shared module and closes a latent IntelliJ gap for free.
- **#633 / #649** (new SETOPTS / CVS composer layers): both are net-new additions to
  `composer-commands.ts`, following the exact same three-part shape already established by the
  msgbox/addwindow/addchildwindow sections (catalogs export, preview/compose/decodeCall
  handlers, `registerComposerRequests` auto-registration via `Object.entries(composerHandlers)`
  at `:204-208` — new handlers need no change to that registration loop, only new entries in the
  `composerHandlers` object).

## IntelliJ Composer Seams to Reuse (Phase 79 / 81 / 82)

| Seam | Defined in | Reused by (this milestone) |
|---|---|---|
| `Scheduler` interface + `AlarmScheduler` (Alarm-backed) | `concurrency/Scheduler.java`, `concurrency/AlarmScheduler.java` | #611 (composer debounce) — same underlying mechanism as `RestartGate`/`KeystrokeDebouncer` |
| `RestartGate` (coalescing restart entry point `requestRestart(long)`) | `concurrency/RestartGate.java` | #486 (IntelliJ config-watch restart), #612 (cache-invalidation hook), #632 (contrast case — what NOT to keep using) |
| `KeystrokeDebouncer<T>` (per-field debounce + staleness discard) | `concurrency/KeystrokeDebouncer.java` | #611 — **caveat:** its `lookup: Function<String,T>` is a *synchronous* off-EDT call (used for filesystem lookups in `BbjSettingsConfigurable`); composer `refresh()` is inherently async (`CompletableFuture` via `ComposerFlow.observe`), so #611 needs a thinner wrapper built directly on `Scheduler.schedule`/`cancel` — reusing the *scheduling primitive*, not the generic class as-is |
| `BbjComposerServer` as the single `getServerInterface()` proxy, extended per-feature with `@JsonRequest` methods (the `bbj/compile` precedent) | `composer/BbjComposerServer.java` | #632 (`bbj/refreshJavaClasses`), #633 (`bbj/composer/setopts/*`), #649 (`bbj/composer/cvs/*`) |
| `BbjCompileAction`'s background-task + bounded-future request shape | `actions/BbjCompileAction.java` | #632 — direct template for the rewritten `BbjRefreshJavaClassesAction` |
| `ComposerFlow` (single terminal `handle()`, one balloon per chain, `launch`/`observe`/`once`) | `composer/ComposerFlow.java` | #633, #649 (new dialogs must compose through this, not a raw `thenAccept` chain) |
| `StaleEditGuard` (re-decode + field-wise compare + modification-stamp check inside the write command) | `composer/StaleEditGuard.java` | **#532** — this is the exact IntelliJ-side fix for the VS Code-side problem #532 describes; the port is conceptual (TypeScript has no `WriteCommandAction`, but the "re-fetch document text, re-run the same decode/parse function, compare before applying, abort on mismatch" three-step shape ports directly to `msgbox-composer-ui.ts`'s `runComposer`) |
| `ComposerNotices` / `ComposerNoticeRenderer` (reason-keyed balloon, one per session) | `composer/ComposerNotices.java` | #633, #649 (new dialogs need the same failure surfacing, not silent) |

## Build Order

```
#485 (custom config name/location honored everywhere)
   │  must resolve/expose the effective path before it can be watched correctly
   ▼
#486 (watch + debounced restart)
   │  (independent of #608, #632 below)

#648 (msgbox-composer.ts: accept expression-valued options)
   │  the discoverability cue can only fire on lines the parser recognizes
   ▼
#650 (visible composer cue, both IDEs) ── also needs a NEW CodeLens (VS Code)
   │                                        and a NEW LineMarkerProvider/inlay
   │                                        (IntelliJ) — neither exists today
   ▼
#649 (CVS() composer) — built as a #650-style-cue-from-day-one composer,
                         so it doesn't need a discoverability follow-up

#633 (shared bbj/composer/setopts/* LS layer)
   │  the Java dialog is a pure consumer of these LS methods
   ▼
SetoptsComposerDialog.java + ComposerLauncher wiring
   │
   ▼
#475 (SETOPTS-in-BBj-code hovers + tri-state composer)
   — issue's own text: "narrower...a natural prerequisite subset of #475's
     fuller scope" — #633 supplies the reusable byte/bit catalog and the
     bbj/composer/setopts/* request pattern; #475 adds NEW decode-hover and
     tri-state/IOR-AND-aware logic the config.bbx composer never needed

#623, #532, #530 — independent of every other cluster; VS Code-only;
   sensible to batch together (near-identical touch points across the
   same four webview files)

#611, #612 — independent of every other cluster; IntelliJ-only;
   sensible to batch together (same three dialog-launch call sites)

#505, #504, #497, #498 — independent of each other and of every other
   cluster (different files/mechanisms in java-interop.ts /
   bbj-scope*.ts / bbj-completion-provider.ts); safe to parallelize

#500, #499, #512, #531, #610, #608, #632 — each fully independent,
   single-component fixes; no ordering constraints
```

**Why #485 before #486:** watching the wrong file (stale default, or a
custom-named file the watcher doesn't know to target) is worse than not
watching at all — a debounced restart triggered by changes to a file the
user *isn't* editing, while the file they *are* editing is silently ignored,
actively erodes trust in the feature. #486 needs #485's "what is the
resolved path, by name and location" answer as an input.

**Why #648 before #650:** #650's own issue text is about making the
*existing* composer affordance more visible — but for MSGBOX specifically,
the affordance doesn't exist yet on expression-valued lines (that's exactly
what #648 reports). Shipping a visible cue mechanism first and then fixing
the underlying detection second would mean the new cue silently fails to
appear on the very lines the issue calls out, reproducing the confusion in
a new UI element instead of removing it.

**Why the shared `bbj/composer/setopts/*` layer before `SetoptsComposerDialog.java`:**
this is the same "shared layer first, per-IDE dialog second" ordering
`composer-commands.ts`'s existing history already establishes for msgbox/
addwindow/addchildwindow (the LS-side catalog and handlers shipped, then
each IDE UI followed) — `SetoptsComposerDialog.java` has nothing to call
until the LS methods exist, and `BbjComposerServer.java`'s single-interface
constraint means the interface method signatures need to be fixed before
Java code can compile against them.

**Why #633 before #475:** #475's own issue body states the dependency
directly ("depends on `setopts-catalog.ts` from #474") and #633's issue
body characterizes itself as "a natural prerequisite subset of #475's fuller
scope" — #633 ports the already-shipped absolute-vector composer to
IntelliJ over a new shared layer; #475 extends that same catalog with the
IOR/AND-aware, tri-state, BBj-code-scoped logic. Building #633's LS layer
first gives #475 a proven `bbj/composer/setopts/*` request shape and an
IntelliJ dialog skeleton to extend, rather than inventing both the shared
layer and the tri-state logic in one larger, riskier phase.

## Anti-Patterns Already Fixed Once (don't reintroduce them here)

### Anti-Pattern: nested `thenAccept` pyramids in new composer code (IntelliJ)

**What happened before:** pre-Phase-82 `ComposerLauncher.launch()` ran a nested `thenAccept`
chain where an inner future's exception was stored on a future nobody held a reference to —
silently swallowed, no balloon, no log line (`ComposerFlow.java:17-23`'s own doc comment
describes this exact failure mode).
**Why it matters here:** #633's `SetoptsComposerDialog.java` and #649's `CvsComposerDialog.java`
must compose their launch chains through `ComposerFlow.launch`/`.observe`, not a fresh ad hoc
`CompletableFuture` chain — the seam exists precisely so every new composer inherits the fix for
free.

### Anti-Pattern: validating in the webview instead of the shared preview payload

**What happened before:** `msgbox-composer-webview.ts` gates `insert` on `r.valid` computed by
the shared `msgboxPreview()`; `addwindow`/`addchildwindow` never got the same field added to
their own preview functions, so their webviews had nothing to gate on (#623). A per-webview
patch (adding a validity check only inside `addwindow-composer-webview.ts`) would repeat this
mistake in the opposite direction — VS Code fixed, IntelliJ's dialogs still ungated.
**Do instead:** add the `valid` field to the shared preview function's return type first (as
`msgboxPreview` already does), then gate both hosts on it.

### Anti-Pattern: per-host duplicated path-resolution logic

**What happened before:** IntelliJ's port auto-detection duplicated `bbjHomePath`/`nodeJsPath`'s
pattern inconsistently — implemented only in `BbjSettingsConfigurable.reset()`, not
`BbjSettings.getState()` (#608), guarded by an equality check standing in for a real
"configured" sentinel.
**Why it matters here:** the config-path resolution needed for #486's watcher (see "Config Path
Data Flow" above) is exactly this shape of problem one level up — a fallback computation
(`configPath || {bbjHome}/cfg/config.bbx`) that both hosts would otherwise reimplement
independently. Prefer exposing it once from the LS (a small custom request) over reimplementing
`bbj-ws-manager.ts:132-154`'s branch twice.

## Integration Points (file:line, verified by reading the code)

| Issue | File(s) | Lines | What's there today |
|---|---|---|---|
| #485 | `bbj-vscode/src/language/bbj-ws-manager.ts` | 32, 68, 132-154 | Sole owner of resolved config path; no exposure to host |
| #485 | `bbj-vscode/package.json` | 44-60 | Static `filenames` array for `bbx-config` language |
| #485 | `bbj-vscode/src/extension.ts` | (absent) | No dynamic `setTextDocumentLanguage` call exists |
| #486 | `bbj-vscode/src/language/bbj-ws-manager.ts` | 127-154 | `initializeWorkspace()` reads config once, no watcher |
| #486 | `bbj-intellij/.../ui/BbjServerService.java` | 32-33, 41, 53, 205, 224-225 | `RestartGate`/`requestRestart(long)`/`scheduleRestart()` already exist for settings changes |
| #608 | `bbj-intellij/.../BbjSettings.java` | 44-60, 110-152 | `getState()` auto-detects home/node, not port; `detectJavaInteropPort()` exists but is only called from Configurable |
| #608 | `bbj-intellij/.../BbjSettingsConfigurable.java` | 130-148 | Port auto-detect gated on `== 5008` literal equality |
| #632 | `bbj-intellij/.../actions/BbjRefreshJavaClassesAction.java` | 22-32 | Calls `requestRestart(0)` (full LS restart via RestartGate) |
| #632 | `bbj-intellij/.../composer/BbjComposerServer.java` | 29-67 | Single server-interface class; `bbj/compile` is the precedent to follow |
| #632 | `bbj-intellij/.../actions/BbjCompileAction.java` | 56-113 | Background-task + bounded-future request pattern to port |
| #632 | `bbj-vscode/src/language/main.ts` | 33 | `bbj/refreshJavaClasses` handler already registered LS-side |
| #632 | `bbj-vscode/src/extension.ts` | 700-709 | VS Code's existing targeted-request call, the behavior to match |
| #648 | `bbj-vscode/src/msgbox-composer.ts` | 500-522 (`buildCallInfo`), 170-179 (`msgboxConstantsExpr`, forward-only) | Options regex accepts only a bare integer literal |
| #648 | `bbj-vscode/src/msgbox-composer-ui.ts` | 37-79 | `MsgboxCodeActionProvider` returns `[]` when neither `exprRange` nor `optionInsertOffset` is set |
| #649 | `bbj-vscode/src/language/composer-commands.ts` | 1-208 (whole file) | Three-section shape to clone for `cvs` |
| #650 | `bbj-vscode/src/setopts-composer-ui.ts` | 82-96 | Only existing `CodeLensProvider` in this codebase |
| #650 | `bbj-vscode/src/msgbox-composer-ui.ts` | 25-35 | Only a `CodeActionProvider` (lightbulb), no CodeLens |
| #650 | `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` (+ AddWindow/AddChildWindow variants) | whole files | `IntentionAction` only, Alt+Enter/right-click, no persistent gutter cue |
| #633 | `bbj-vscode/src/language/composer-commands.ts` | (absent) | Zero `setopts` matches — confirmed via grep |
| #633 | `bbj-vscode/src/setopts-catalog.ts`, `setopts-composer-ui.ts`, `setopts-composer-webview.ts` | whole files | Existing VS Code-only implementation to expose through the LS layer |
| #475 | `bbj-vscode/src/setopts-catalog.ts` | 1-52 | Byte/bit catalog `#475` explicitly depends on |
| #623 | `bbj-vscode/src/addwindow-composer-webview.ts` | 108-135 (per issue; insert arm at ~121-131) | Unconditional `applyEdit`, no `r.valid` gate |
| #623 | `bbj-vscode/src/addchildwindow-composer-webview.ts` | 113-140 (per issue; insert arm at ~126-137) | Same gap |
| #623 | `bbj-vscode/src/msgbox-composer-webview.ts` | 97-101, 415, 420 | The `r.valid` pattern to mirror; `msgboxPreview`'s existing `valid` field |
| #532 | `bbj-vscode/src/msgbox-composer-ui.ts` | 87-133 (`runComposer`), 136-160 (`runWizard`) | Applies captured coordinates with no re-validation after the QuickPick wizard |
| #532 | `bbj-intellij/.../composer/StaleEditGuard.java` | 1-60+ | The re-decode/compare/write-guarded pattern to port conceptually |
| #530 | `bbj-vscode/src/msgbox-composer-webview.ts` | 82, 112, 116, 119 | `onDidReceiveMessage(..., context.subscriptions)`, no `onDidDispose` |
| #530 | `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`, `setopts-composer-webview.ts` | (identical pattern per issue) | Same gap, 4 files total |
| #611 | `bbj-intellij/.../composer/MsgboxComposerDialog.java` | 145, 166-168, 298-302 | `SimpleDocumentListener` calls `refresh()` synchronously on every keystroke |
| #611 | `bbj-intellij/.../concurrency/Scheduler.java`, `KeystrokeDebouncer.java` | whole files | The seam to reuse (with the sync-vs-async caveat noted above) |
| #612 | `bbj-intellij/.../composer/ComposerLauncher.java` | 59-72 | `flow.launch` fetches `serverFuture` + calls `composerCatalogs()` on every invocation |
| #612 | `bbj-intellij/.../composer/BbjComposerService.java` | 23-29 | `server(project)` re-resolves `LanguageServerManager` every call, no cache |
| #505 | `bbj-vscode/src/language/bbj-scope.ts` | 308-331 | `getBBjClassesFromFile()` — full `indexManager.allElements(...)` scan, no cache |
| #505 | `bbj-vscode/src/language/bbj-scope-local.ts` | 106-126 | `collectLocalSymbols()` — unpruned `AstUtils.streamAllContents` |
| #505 | `bbj-vscode/src/language/bbj-linker.ts` | 41-62 | `isExternalDocument` + `treeIter.prune()` — the pattern to mirror (note: uses `streamAst(...).iterator()`, not `streamAllContents`) |
| #504 | `bbj-vscode/src/language/java-interop.ts` | 42-46, 106-107, 545-611, 875, 914-943 | `acquireLock`/`lockQueue`, `_pendingResolutions`, `resolveClassByName`/`doResolveClassByName`, `clearCache()` |
| #497 | `bbj-vscode/src/language/java-interop.ts` | 103, 550-559, 704-708 | `_resolvedClasses` `LruMap`; registration-before-recursion ordering that can be evicted mid-recursion |
| #498 | `bbj-vscode/src/language/bbj-completion-provider.ts` | 59, 94-102, 242-291 | `activeCancelToken` shared singleton field |
| #500 | `bbj-vscode/src/decompile-io.ts` | 74-96 | `mtimeMs >= callStartMs` with no coarse-filesystem slack |
| #499 | `bbj-vscode/src/document-formatter.ts` | 54-67 | `inFlightFormats` shares the earlier request's captured `documentContent` |
| #512 | `bbj-vscode/src/Commands/Commands.cjs` | 84, 137-142, 149, 254, 303, 356, 367 | `resolveTargetFileName()`'s guard exists but isn't applied to `run`/`runWeb`/`decompile`/`compile` |
| #531 | `bbj-vscode/src/extension.ts` | 582-709 (activate), esp. 592-707 | 16 registrations not pushed to `context.subscriptions`; the correct pattern is already used at 584-587 for the composer commands |
| #610 | `bbj-intellij/.../ui/BbjStatusBarWidget.java` | 35, 57-64, 67-101, 103, 163-164 | `messageBusConnection` subscribes to server-status only; no `FileEditorManagerListener` |

## Sources

All findings above are grounded in direct reads of the following files (this session,
2026-09-06), plus the 23 GitHub issue bodies supplied as required reading:

- `bbj-vscode/src/language/{bbj-ws-manager,bbj-scope,bbj-scope-local,bbj-linker,java-interop,
  bbj-completion-provider,composer-commands,main}.ts`
- `bbj-vscode/src/{msgbox,addwindow,addchildwindow,setopts}-composer{,-ui,-webview}.ts`,
  `setopts-catalog.ts`
- `bbj-vscode/src/{extension,decompile-io,document-formatter}.ts`,
  `bbj-vscode/src/Commands/Commands.cjs`, `bbj-vscode/package.json`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/{BbjSettings,BbjSettingsConfigurable}.java`
- `bbj-intellij/.../actions/{BbjRefreshJavaClassesAction,BbjCompileAction}.java`
- `bbj-intellij/.../composer/{ComposerLauncher,BbjComposerService,BbjComposerServer,ComposerFlow,
  StaleEditGuard,ComposerModels,MsgboxComposerDialog,Configure{Msgbox,AddWindow,AddChildWindow}
  Intention}.java`
- `bbj-intellij/.../concurrency/{Scheduler,AlarmScheduler,RestartGate,KeystrokeDebouncer}.java`
- `bbj-intellij/.../ui/{BbjServerService,BbjStatusBarWidget}.java`
- `bbj-intellij/.../lsp/BbjLanguageServerFactory.java`
- `.planning/PROJECT.md` (Current Milestone, Context, Key Decisions)
- `.planning/milestones/v4.2-phases/` directory listing (78-83; confirmed Phase 79/81/82 map to
  EDT-responsiveness/feature-parity/composer-robustness as named in PROJECT.md's Validated list)

---
*Architecture research for: BBj Language Server v4.3 Polish & Quality milestone*
*Researched: 2026-09-06*
