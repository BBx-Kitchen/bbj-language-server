# Phase 90: Composer Robustness & IntelliJ Composer Performance - Research

**Researched:** 2026-09-12
**Domain:** VS Code webview lifecycle, LSP4IJ Swing dialog debounce/caching, cross-host DTO validation for six existing composers (BBj language server monorepo)
**Confidence:** HIGH — every claim below is grounded in this session's direct reads of the current tree (file:line cited), not training-data guesses about Langium/LSP4IJ/VS Code APIs in general.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### MSGBOX picker and target safety (DISC-08, folded todo)
- **D-01:** The `bbj.composeMsgbox` QuickPick picker stays, including its `edit` and `insert`
  argument branches. Both branches re-resolve the target call from the document's current text
  immediately before `editor.edit(...)` and abort when it no longer matches. No UI caller passes
  those arguments today (the lightbulb and Phase 89 cue open `bbj.composeMsgboxVisual`), but the
  command stays callable with arguments, so the guard and #532's regression test (a document edit
  during the wizard) are required.
- **D-02:** When the call is no longer at its captured position (lines added/removed above, or the
  call text changed), the edit **aborts with a warning** that nothing was applied. It never
  searches for or follows a moved call — the same fail-closed rule as IntelliJ `StaleEditGuard`,
  VS Code `setopts-stale-edit-guard.ts` and `cvsCallStillMatches`.
- **D-03:** One **span-exact** staleness check is shared by the picker and the MSGBOX visual panel:
  the captured call text still matches at `[callStart, callEnd)` **and** a MSGBOX call still starts
  and ends at exactly that span (re-located via the MSGBOX call finder). This replaces
  `msgboxCallStillMatches`'s current slice-only comparison, mirroring 89-14's `cvsCallStillMatches`
  fix, which catches an unterminated call the user kept typing into.
- **D-04:** An unfinished `MSGBOX(` / `MSGBOX()` call gets its own composable decode outcome
  (mirroring CVS's `incomplete` outcome from 89-14) and the composer **completes the call in place**:
  whatever is already typed (e.g. the message) is prefilled, and Apply replaces the partial call's
  span through the same guarded write used for edit-in-place. Applies to both IDEs — VS Code panel
  and IntelliJ `ComposerLauncher.openMsgbox` (today `insertAtCaret`). Design it together with
  MSGBOX's existing `replace` payload, `hasOptions`, and IntelliJ `DecodeEquality.sameMsgbox` (which
  must compare the new outcome so a stale completion cannot pass the guard), not as a copy of CVS.
- **D-05:** Completing an unfinished MSGBOX call shows **no banner** (nothing hand-written is being
  discarded, unlike Phase 89's compose-and-replace mode) and hides the assign-to row, since the
  assignment already lives in the source — matching CVS completion (89-15).

#### addWindow / addChildWindow input validation (DISC-07)
- **D-06:** Field checks follow each field's type, and stay conservative:
  - every free-text field: structural well-formedness (balanced `"` literals with `""` escapes,
    balanced parentheses), i.e. `validateBbjExpression`;
  - `title`: must resolve to a String, i.e. `validateStringField` — the MSGBOX title rule;
  - `x`, `y`, `width`, `height` and addChildWindow's `id`: additionally reject a bare string
    literal such as `"10"`;
  - `receiver`, `sysgui`, `window`, `context`: structural only — no `!`-suffix or numeric-shape
    rules, which could reject valid expressions such as a method call returning an object.
- **D-07:** A blank field keeps today's default (`0` geometry, `""` title, `sysgui!`, `window!`,
  `101` id, `sysgui!.getAvailableContext()` context). Validation rejects only text that was actually
  typed; no field becomes required.
- **D-08:** Errors surface exactly like MSGBOX: `addwindowPreview` / `addchildwindowPreview` return
  per-field error strings plus a `valid` flag. The VS Code webview shows the message under the
  field, marks the input invalid (red border) and disables Insert; the IntelliJ dialogs show a red
  error label under the field and call `setOKActionEnabled(p.valid)`. The webview's `insert`
  message handler keeps a server-side `if (!r.valid) break;` guard, so a forced Insert is refused.
- **D-09:** In edit mode (only the flags / event-mask hex tokens are rewritten; the text fields come
  from the source and are never written) the field checks are skipped — as `cvs-composer.ts`
  already skips its string check in edit mode.

#### Fix scope versus the issue texts (DISC-09, DISC-10)
- **D-10:** The listener-leak fix covers **all six** VS Code composer panels, not only the four #530
  names: `msgbox-composer-webview.ts`, `addwindow-composer-webview.ts`,
  `addchildwindow-composer-webview.ts`, `setopts-composer-webview.ts`, `cvs-composer-webview.ts`,
  `setopts-tristate-webview.ts`. Each currently registers
  `panel.webview.onDidReceiveMessage(..., undefined, context.subscriptions)` with no per-panel
  disposal.
- **D-11:** The fix is **one shared helper** that ties the message handler's disposable to the
  panel's own lifetime (released on `panel.onDidDispose`), used by all six panels. The regression
  test discovers composer panel files itself (not a hard-coded list), so a seventh composer is
  covered automatically — the same idea as `IntentionDescriptionResourcesTest` deriving its subjects
  from `plugin.xml`. It asserts `context.subscriptions` does not grow across an open-then-dispose
  cycle.
- **D-12:** `MsgboxComposerDialog`, `AddWindowComposerDialog` and `AddChildWindowComposerDialog`
  route **every** input — text typing, checkboxes, combo boxes, the event-mask toggle — through a
  `scheduleRefresh()` helper over `PreviewDebouncer` + `AlarmScheduler(getDisposable())`, disabling
  OK until the debounced preview resolves, exactly like `SetoptsComposerDialog` /
  `CvsComposerDialog` / `SetoptsTriStateComposerDialog`. No new `Alarm` per dialog (research
  Pitfall 12). The initial `refresh()` in the constructor stays immediate.
- **D-13:** The three already-debounced dialogs (SETOPTS, CVS, SETOPTS tri-state) are not touched.

#### IntelliJ server and catalog cache (DISC-11)
- **D-14:** One **per-project cache in `BbjComposerService`** holds both the resolved
  `BbjComposerServer` proxy and the `ComposerCatalogs`. Every current caller of
  `BbjComposerService.server(project)` goes through it: `ComposerLauncher` (via `ComposerFlow.launch`),
  `BbjCompileAction`, and `BbjRefreshJavaClassesAction`. Server lookup and invalidation live in one
  place.
- **D-15:** The cache is cleared on **any** language-server status change, subscribed through the
  existing `BbjServerService.BbjServerStatusListener.TOPIC` (already consumed by
  `BbjStatusBarWidget` and `BbjJavaInteropService`). That covers starting, stopping, a crash, a
  manual restart, and the Phase 85 config-reload restart; the cache can never outlive the server
  instance it came from.
- **D-16:** When a cached proxy turns out to be dead (a request fails between status broadcasts),
  the cache is cleared and the existing `ComposerNotices.notReady` / `requestFailed` balloon is
  shown; its Retry re-resolves from scratch. No silent retry inside the single
  `LAUNCH_TIMEOUT_MILLIS` deadline.
- **D-17:** Catalogs are fetched **lazily** on the first composer open after each server start, then
  reused. Nothing is prefetched on server start. Each open still performs its own decode round trip
  (that result depends on the caret line).

### Claude's Discretion
- Exact warning text when the picker aborts (follow the panels' existing
  `"The MSGBOX() call changed since the composer opened; nothing was applied."` wording).
- Name and location of the shared panel-listener helper, and of the shared MSGBOX span-exact
  check.
- The exact bare-string-literal rule for numeric fields and every validation message's wording.
  Suggest a fix the way `validateStringField` does.
- Name of the new MSGBOX unfinished-call decode flag (e.g. `incomplete`, matching CVS) and how the
  IntelliJ dialog is told it is completing rather than composing new (e.g. a mode value, as
  `CvsComposeMode` does).
- The debounce interval: reuse the constant the debounced dialogs already use.
- The cache's internal shape (e.g. a plain-Java, `Scheduler`-free seam that is testable under plain
  JUnit, mirroring `BbjInteropPortCache` / `TokenValidationCache`), and whether a failed request
  clears the cache from inside `ComposerFlow`'s terminal handler or from `BbjComposerService`.
- Whether the picker's compose-new branch (inserts at `editor.selection.active` after the wizard)
  needs any additional guard — not required by DISC-08.

### Deferred Ideas (OUT OF SCOPE)

#### Reviewed Todos (not folded)
- **A configured-but-unusable Node.js path suppresses the cached-download fallback**
  (`.planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md`)
  — a product decision about IntelliJ Node.js detection (`NodeAvailability`), unrelated to
  composers. Matched only on the keywords "cached" and "intellij".
- **Live Windows check for the Node.js auto-install failure**
  (`.planning/todos/pending/2026-09-06-live-windows-check-for-node-auto-install-failure.md`) — listed
  in REQUIREMENTS.md Out of Scope as maintainer-owned and not a GSD phase; needs a real Windows
  machine.

#### Folded Todos (IN SCOPE, addressed by D-03/D-04/D-05)
- **MSGBOX compose-new nests a second call inside an unfinished `MSGBOX(` call**
  (`.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md`).
  `x = MSGBOX(` and `x = MSGBOX()` decode as `found: false`, so both IDEs take the compose-new path
  and insert a whole statement inside the unfinished call. Filed by 89-16 specifically for this
  phase, next to DISC-08's re-resolve criterion. Resolved by D-03, D-04 and D-05.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-07 (#623) | Malformed free-text in addWindow/addChildWindow fields rejected before insert, validity in shared preview payload | Pattern/Pitfall sections on D-06..D-09; `addwindow-composer.ts`/`addchildwindow-composer.ts` confirmed to carry NO validation today (`AddWindowPreviewInput`/`AddChildWindowPreviewInput`, full files read) — `msgbox-composer.ts`'s `validateBbjExpression`/`validateStringField` are the reusable helpers |
| DISC-08 (#532) | MSGBOX QuickPick picker re-resolves target call before edit, aborts on mismatch | Pitfall E, Code Examples "MSGBOX picker's current unguarded write"; `msgbox-composer-ui.ts:87-108` confirmed to have zero staleness check today |
| DISC-09 (#530) | No leaked message-handler listeners across VS Code composer panel open/close | Pattern 5; confirmed via grep that all six panels use `context.subscriptions` with zero `onDidDispose` calls anywhere in `src/*.ts` |
| DISC-10 (#611) | IntelliJ composer dialogs debounce input via the existing Scheduler/Alarm seam | Architecture Diagram "IntelliJ debounce"; confirmed via grep that `MsgboxComposerDialog`/`AddWindowComposerDialog`/`AddChildWindowComposerDialog` call `refresh()` directly with zero debounce, while `SetoptsComposerDialog`/`CvsComposerDialog` already use `PreviewDebouncer` (full files read) |
| DISC-11 (#612) | IntelliJ composer reopen pays no repeated server-resolution/catalog round trip, cache invalidated on LS restart | Architecture Diagram "IntelliJ server/catalog cache", Pitfalls A/B/C; `BbjComposerService.java` confirmed to have zero caching (full file read), `ComposerFlow.launch()` confirmed to call `composerCatalogs()` unconditionally every launch |
| Folded todo | MSGBOX compose-new no longer nests inside an unfinished `MSGBOX(` call | Pattern 1/2/4, Architecture Diagram "MSGBOX unfinished-call flow"; `decodeMsgboxCall`'s `found:false` fallthrough for `args.length < 2` confirmed at `msgbox-composer.ts:711,725`, mirrored against CVS's already-shipped `incomplete` outcome |
</phase_requirements>

## Summary

Phase 90 touches no new UI surface — it hardens six existing composers (MSGBOX, addWindow,
addChildWindow, CVS, SETOPTS, SETOPTS tri-state) that Phases 87-89 already built. All the seams
this phase needs already exist in the codebase and were purpose-built by prior phases for exactly
this kind of "extend, don't invent" work: CVS's `incomplete` decode outcome (89-14) is the direct
template for MSGBOX's unfinished-call fix (D-04); `StaleEditGuard`/`DecodeEquality` (82-03) is the
guard MSGBOX's edit-in-place write already uses for its *existing* call and needs to gain a
same-span check for D-03; `PreviewDebouncer`/`Scheduler`/`AlarmScheduler` (87-02, extended by 88 and
89) is fully built and already used by three of six IntelliJ dialogs — the other three
(`MsgboxComposerDialog`, `AddWindowComposerDialog`, `AddChildWindowComposerDialog`) call `refresh()`
directly from every listener with **no debounce of any kind today** (confirmed by direct grep, not
just "an ad hoc Alarm" — there isn't even that). `BbjComposerService.server(project)` is a two-line
static method with **zero caching** — every dialog open re-runs `LanguageServerManager.start()` +
`getLanguageServer()`, and `ComposerFlow.launch()` calls `server.composerCatalogs()` unconditionally
on every single launch, which is the literal D-17 problem.

The listener leak (D-10/D-11) is real and uniform: all six VS Code composer webview panels
register `panel.webview.onDidReceiveMessage(handler, undefined, context.subscriptions)` and **none**
call `panel.onDidDispose`, so every open leaves the handler disposable parked on
`context.subscriptions` for the life of the extension host.

**Primary recommendation:** Every D-decision in this phase has a same-file-family precedent already
in the tree. Do not design new mechanisms — port the CVS/SETOPTS/StaleEditGuard/PreviewDebouncer
shapes to the three files (MSGBOX VS Code+IntelliJ, addWindow, addChildWindow) that never got them.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Field validation (`valid` + per-field errors) | API/Backend (shared LS module `*-composer.ts`) | Frontend (VS Code webview gates Insert; IntelliJ dialog gates OK) | Single source of truth crossed by both hosts via `bbj/composer/*/preview`, per existing MSGBOX/CVS/SETOPTS pattern — `composer-commands.ts` is a thin pass-through, never re-implements arithmetic |
| MSGBOX unfinished-call decode (`incomplete` outcome) | API/Backend (`msgbox-composer.ts`) | — | Mirrors `cvs-composer.ts`'s `decodeCvsCall`; the decode outcome is the single fact both hosts branch on |
| Span-exact staleness re-check | Frontend (client re-decodes/re-locates before writing) | — | VS Code webview + picker re-read the live document; IntelliJ `StaleEditGuard` re-runs the LS decode — both are host-local, neither touches the LS's own state |
| VS Code webview listener disposal | Browser/Client (webview panel lifecycle) | — | Pure `vscode.WebviewPanel` API concern; no LS involvement |
| IntelliJ dialog debounce | Frontend Server equivalent — client-side Swing UI thread | — | `PreviewDebouncer`/`Scheduler` live entirely in `bbj-intellij`, no LS change |
| IntelliJ server/catalog cache | Frontend Server equivalent — `BbjComposerService` (client-side proxy resolution) | — | Caches a client-held `BbjComposerServer` proxy + `ComposerCatalogs`, invalidated on a client-side `BbjServerStatusListener.TOPIC` event; the LS itself is unaware of any caching |

## Standard Stack

No new external dependency for either host. This phase extends existing in-repo modules only:

| Module | Host | Role |
|--------|------|------|
| `bbj-vscode/src/*-composer.ts`, `*-composer-webview.ts`, `*-composer-ui.ts` | VS Code / shared LS logic | Domain logic + webview panels |
| `bbj-vscode/src/language/composer-commands.ts`, `composer-codelens.ts` | Language server | Thin `bbj/composer/*` pass-throughs, cue detection |
| `bbj-intellij/.../composer/*.java` | IntelliJ | Swing dialogs, `ComposerLauncher`, `StaleEditGuard`, `DecodeEquality` |
| `bbj-intellij/.../concurrency/{Scheduler,AlarmScheduler,PreviewDebouncer}.java` | IntelliJ | Existing debounce seam (87-02), to be reused, not re-invented |

**Version verification:** N/A — no package.json/build.gradle.kts dependency changes are needed for
this phase's D-01..D-17 scope. `[VERIFIED: bbj-vscode/package.json, bbj-intellij/build.gradle.kts not modified in this research pass]`

## Package Legitimacy Audit

Not applicable — this phase installs no new external packages in either host. All work is internal
refactoring of existing TypeScript/Java modules and their existing test suites.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram — MSGBOX unfinished-call flow (D-03/D-04/D-05), both hosts

```
VS Code:
  keystroke in editor (typing "x = MSGBOX(")
        │
        ▼
  composer-codelens.ts: findMsgboxCalls() [VERIFIED: composer-codelens.ts:80-85]
        │  (no decode veto for msgbox kind — cue always renders when a call is found)
        ▼
  CodeLens "Compose MSGBOX" rendered
        │  user clicks
        ▼
  composer-lens-command.ts: openComposerAt() case 'msgbox'
        │  decodeMsgboxCall(lineText, character)  [msgbox-composer.ts:686-726]
        │
        ├─ TODAY: info.args.length < 2 → { found: false } (msgbox-composer.ts:725)
        │         → msgboxPanelArgFromDecode() returns undefined (msgbox-composer-ui.ts:60-62)
        │         → composer-lens-command.ts shows LENS_TARGET_GONE_TEXT, OR
        │           (from lightbulb/compose-new path) falls through to compose-new,
        │           nesting a second MSGBOX(...) inside the unfinished one — the folded todo bug
        │
        └─ AFTER D-04: decodeMsgboxCall returns a new `incomplete: true` outcome
                  (mirrors CvsDecodeCallResult.incomplete, cvs-composer.ts:193-207/243-253)
                  → panel opens in "completing" mode: message prefilled from what's typed,
                    no banner (D-05), no assign-to row, Apply replaces [callStart, callEnd)
                    through the SAME guarded write edit-in-place already uses

IntelliJ:
  ComposerLauncher.launchAt(..., Kind.MSGBOX, ...) [ComposerLauncher.java:180-188]
        │  server.msgboxDecodeCall(...)
        ▼
  openMsgbox(): `edit = decoded != null && decoded.found` [ComposerLauncher.java:292]
        │
        ├─ TODAY: found=false → insertAtCaret() (compose-new) — same nesting bug
        │
        └─ AFTER D-04: a new CvsComposeMode-style routing enum/mode value
                  (precedent: CvsComposeMode.java, full file) picks COMPLETE_CALL,
                  MsgboxComposerDialog opens pre-filled, write goes through
                  StaleEditGuard.applyIfUnchanged (StaleEditGuard.java:76-108) same as
                  edit-in-place, with DecodeEquality.sameMsgbox extended to compare
                  the new outcome field (DecodeEquality.java:55-65)
```

### System Architecture Diagram — IntelliJ debounce (D-12), target shape

```
Keystroke / checkbox click in MsgboxComposerDialog / AddWindowComposerDialog / AddChildWindowComposerDialog
        │
        │  TODAY: cb.addActionListener(e -> refresh())  [confirmed: MsgboxComposerDialog.java:175,182-188;
        │          AddWindowComposerDialog.java:171,182,218; AddChildWindowComposerDialog.java:175,186,225]
        │          — refresh() runs synchronously on EVERY keystroke/click, no coalescing at all
        ▼
  refresh() → server.<kind>Preview(...) round trip PER KEYSTROKE  (the #611 bug, Pitfall 12)

AFTER D-12 (port SetoptsComposerDialog's exact shape, SetoptsComposerDialog.java:190-257):
Keystroke / checkbox click
        │
        ▼
  scheduleRefresh() { setOKActionEnabled(false); previewDebouncer.trigger(); }
        │
        ▼
  PreviewDebouncer.trigger() [PreviewDebouncer.java:44-53]
     cancels this instance's own pending task, schedules action after PREVIEW_DEBOUNCE_MS (300L)
        │  (delay fires; no further keystrokes in the window)
        ▼
  refresh() runs ONCE per settle point → server.<kind>Preview(...)
```

### System Architecture Diagram — IntelliJ server/catalog cache (D-14..D-17)

```
TODAY (BbjComposerService.java, full file — no cache):
  Every ComposerLauncher.launchAt / BbjCompileAction / BbjRefreshJavaClassesAction call:
    BbjComposerService.server(project)
        → LanguageServerManager.getInstance(project).start(SERVER_ID)   [re-run every time]
        → .getLanguageServer(SERVER_ID).thenApply(...)                   [re-resolved every time]
  Every ComposerFlow.launch() call (ComposerFlow.java:73-86):
        serverFuture.thenCompose(server -> server.composerCatalogs()...)  [re-fetched every time]

AFTER D-14/D-17:
  BbjComposerService becomes a per-project cache (candidate: convert to a projectService,
  matching BbjJavaInteropService's exact shape — see below) holding:
    - the resolved BbjComposerServer proxy (cached CompletableFuture, reused across calls)
    - the ComposerCatalogs (fetched lazily on first composer open per server generation, reused)
  D-15: subscribes to BbjServerService.BbjServerStatusListener.TOPIC (BbjServerService.java:317-324)
        on ANY status change → clear both cached values
  D-16: a request against a cached-but-dead proxy fails → clear cache, show existing
        ComposerNotices.notReady/requestFailed balloon, Retry re-resolves from scratch
  ComposerFlow.launch()'s stage 2 (server.composerCatalogs()) must be replaced by a call to the
  cache's own catalogs accessor so the "lazy fetch once, reuse" contract is enforced in ONE place,
  not re-implemented per launch site.
```

### Recommended Project Structure

No new files are structurally required (existing files are extended), but the CONTEXT.md
"Claude's Discretion" section explicitly leaves the *names* of two new shared pieces open:

- A shared VS Code panel-disposal helper (D-11). Suggested location: a new
  `bbj-vscode/src/webview-panel-lifecycle.ts` sibling to the existing `webview-nonce.ts`
  (`bbj-vscode/src/webview-nonce.ts` is the precedent for a small shared webview utility with no
  `vscode`-mock-breaking side effects).
- A shared MSGBOX span-exact check (D-03). Suggested location: add to `msgbox-composer-webview.ts`
  next to the existing `msgboxCallStillMatches` (line 68-70) — mirrors where `cvsCallStillMatches`
  lives relative to `cvs-composer-webview.ts` (cvs-composer-webview.ts:58-63) — OR promote it into
  `msgbox-composer.ts` itself (next to `findMsgboxCallAt`) if `msgbox-composer-ui.ts`'s picker needs
  to import it without pulling in the webview module's `vscode` dependency. **The picker
  (`msgbox-composer-ui.ts`) has no `vscode`-free import path to `msgboxCallStillMatches` today** —
  it lives in `msgbox-composer-webview.ts`, which imports `vscode` at module scope (webview HTML
  string, `vscode.window.createWebviewPanel`, etc). Since `msgbox-composer-ui.ts` already imports
  `vscode` itself (it registers commands/CodeActionProvider), importing the check from
  `msgbox-composer-webview.ts` is not a `vscode`-purity violation — but placing the pure span logic
  in `msgbox-composer.ts` (no `vscode` import at all) keeps it testable identically to
  `findMsgboxCallAt`/`findMsgboxCalls`, which is the CVS precedent (`findCvsCalls` lives in
  `cvs-composer.ts`, not `cvs-composer-webview.ts`, even though `cvsCallStillMatches` — the
  slice+span-exact wrapper — lives in the webview file). Recommend mirroring that split exactly:
  keep `msgboxCallStillMatches` (or its D-03 replacement) in `msgbox-composer-webview.ts`, reuse
  `findMsgboxCallAt` (already in `msgbox-composer.ts`, no `vscode` import) from the picker directly.

### Pattern 1: Composer decode "incomplete" outcome (D-04 template)

**What:** A found call with no options/mask argument yet gets its own tri-state outcome
(`found && !editable && incomplete`) instead of collapsing into `found: false`.
**When to use:** MSGBOX's unfinished-call fix.
**Example (the exact CVS precedent to port):**
```typescript
// Source: bbj-vscode/src/cvs-composer.ts:243-253 [VERIFIED: read this session]
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
```typescript
// Source: bbj-vscode/src/cvs-composer.ts:193-207 [VERIFIED: read this session]
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
MSGBOX's `decodeMsgboxCall` (`msgbox-composer.ts:686-726`) currently has exactly two branches:
one for `hasExpr || canAddOptions` (line 693) and one for `info.args.length >= 2` (line 711,
compose-and-replace). A third, unfinished-call branch needs to sit ahead of both — triggered when
`info.args.length < 2` and there is no message-only add-options case either (i.e. `MSGBOX(` with
zero or a still-being-typed first argument), returning `{ found: true, edit, incomplete: true, initial: {...} }`.

### Pattern 2: IntelliJ compose-mode routing enum (D-04 template)

**What:** A plain-Java enum with a static `of(decodeResult)` factory picks among
COMPOSE_NEW / EDIT_IN_PLACE / COMPLETE_CALL / NOT_EDITABLE, tested ahead of `editable` so
`incomplete` always wins.
**Example (verbatim precedent to mirror for MSGBOX):**
```java
// Source: bbj-intellij/.../composer/CvsComposeMode.java (full file) [VERIFIED: read this session]
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
CONTEXT.md's Claude's Discretion section leaves the MSGBOX equivalent's name open. MSGBOX has no
`NOT_EDITABLE` case today (any found call is either editable or compose-and-replace) — so the
MSGBOX mode enum likely needs only `COMPOSE_NEW / EDIT_IN_PLACE / REPLACE / COMPLETE_CALL` (four
values, REPLACE being the existing compose-and-replace outcome). Design this against MSGBOX's own
`replace`/`hasOptions` fields (`msgbox-composer.ts:663-673`), not as a literal CVS copy — CONTEXT.md
D-04 explicitly warns against a "copy of CVS."

### Pattern 3: Span-exact staleness check (D-03 template)

**Example (the exact CVS precedent, which is stricter than MSGBOX's current check):**
```typescript
// Source: bbj-vscode/src/cvs-composer-webview.ts:58-63 [VERIFIED: read this session]
export function cvsCallStillMatches(currentLineText: string, target: CvsEditTarget): boolean {
    if (currentLineText.slice(target.callStart, target.callEnd) !== target.callText) {
        return false;
    }
    return findCvsCalls(currentLineText).some(c => c.callStart === target.callStart && c.callEnd === target.callEnd);
}
```
```typescript
// Source: bbj-vscode/src/msgbox-composer-webview.ts:67-70 [VERIFIED: read this session — TODAY, slice-only]
export function msgboxCallStillMatches(currentLineText: string, target: MsgboxEditTarget): boolean {
    return currentLineText.slice(target.callStart, target.callEnd) === target.callText;
}
```
D-03 requires adding the second check (`findMsgboxCalls(currentLineText).some(c => c.callStart === target.callStart && c.callEnd === target.callEnd)`) to catch an unterminated call the user kept typing into — a growing unterminated call keeps the old text as a *prefix*, which the slice-only check alone would miss.

### Pattern 4: StaleEditGuard reuse for a guarded write (D-04 IntelliJ write path)

```java
// Source: bbj-intellij/.../composer/ComposerLauncher.java:303-317 (openMsgbox, TODAY's edit branch)
// [VERIFIED: read this session]
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
D-04's "complete-the-call" write is a THIRD case (alongside `edit`/`insertAtCaret`) that must route
through this exact same guard shape — `DecodeEquality.sameMsgbox` (`DecodeEquality.java:55-96`)
must be extended to compare the new `incomplete` field so a stale completion cannot pass.

### Pattern 5: Every VS Code composer webview leaks its message-handler disposable (D-10/D-11)

**Confirmed via direct grep across all six files** — every one of the following registers
identically and disposes never:
```typescript
// e.g. bbj-vscode/src/msgbox-composer-webview.ts:152 [VERIFIED: read this session]
}, undefined, context.subscriptions);
```
Files confirmed with this exact pattern, zero `onDidDispose` calls anywhere in `src/*.ts`:
`msgbox-composer-webview.ts`, `cvs-composer-webview.ts`, `addwindow-composer-webview.ts`,
`addchildwindow-composer-webview.ts`, `setopts-composer-webview.ts`, `setopts-tristate-webview.ts`.
`[VERIFIED: grep -n onDidDispose bbj-vscode/src/*.ts — zero matches, this session]`

D-11's shared helper needs the panel object at registration time (to call `panel.onDidDispose`), not
just `context.subscriptions` — e.g.:
```typescript
// Illustrative shape only, not verbatim source — name/shape left to planner (D-11 discretion)
export function registerPanelScopedListener(
    panel: vscode.WebviewPanel,
    handler: (msg: unknown) => unknown,
): void {
    const sub = panel.webview.onDidReceiveMessage(handler);
    panel.onDidDispose(() => sub.dispose());
}
```
This changes every one of the six call sites from
`panel.webview.onDidReceiveMessage(async (msg) => {...}, undefined, context.subscriptions)` to the
new helper — a mechanical, six-file edit once the helper exists.

### Anti-Patterns to Avoid

- **A bespoke `Alarm` per dialog (D-12):** PITFALLS.md Pitfall 12 documents this exact anti-pattern
  by name for `#611`. `Scheduler`/`AlarmScheduler`/`PreviewDebouncer` already exist — a third `Alarm`
  instance directly inside `MsgboxComposerDialog` would repeat the "identical pattern duplicated
  across N files" defect class `#530`/`#623` already fix elsewhere in this phase.
- **Treating "no `src/test/` exists" as current:** Both PITFALLS.md Pitfall 12 and this session's own
  read of `bbj-intellij/src/test/java/.../concurrency/PreviewDebouncerTest.java` (exists) confirm
  the issue text's premise is stale — a plain-JUnit `ManualScheduler`-backed test is required, not a
  "recorded manual verification" step.
- **Re-inventing the MSGBOX compose-mode enum as a literal CVS copy:** CONTEXT.md D-04 explicitly
  warns against this — MSGBOX's `replace`/`hasOptions` shape differs from CVS's `editable`/`reason`
  shape and the routing enum must reflect MSGBOX's actual outcomes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced Swing preview refresh | A new `Alarm`/timer per dialog | `Scheduler` + `AlarmScheduler` + `PreviewDebouncer` (`bbj-intellij/.../concurrency/`) | Already built (87-02), already tested (`ManualScheduler`, `PreviewDebouncerTest`), already proven correct in three dialogs |
| Stale-edit protection on a guarded write | A bespoke re-check per dialog | `StaleEditGuard` + `DecodeEquality` (`bbj-intellij/.../composer/`) | Already handles the modification-stamp-race class of bug (82-03, COMP-02/#567); every edit-in-place write in both `openMsgbox`/`openAddWindow`/etc. already routes through it |
| Composer request/response DTO version-skew safety | A new hand-rolled JSON parser test | `ComposerModelsJsonBoundaryTest`'s generalized harness (already covers all seven composer DTOs per Phase 83 Plan 03) | Pitfall 13 — LSP4IJ's runtime lsp4j version is unpinned; only the boundary-test family catches a G-81-4/G-81-5-class skew before it ships |
| Project-scoped server-status-change notification | Direct polling of `LanguageServerManager.getServerStatus` | `BbjServerService.BbjServerStatusListener.TOPIC` (already consumed by `BbjStatusBarWidget`, `BbjJavaInteropService`) | Already the single project-scoped signal for "server restarted"; a second polling mechanism would be a second, divergent source of truth |

**Key insight:** Every mechanism this phase needs (debounce seam, stale-edit guard, boundary-test
harness, status-change topic) was already built by a prior phase specifically so a *later* composer
would not need to reinvent it. The work here is almost entirely "extend an existing list of
consumers by one/three," not "design something new."

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No stored data, live service
config, OS-registered state, secrets, or build artifacts carry the D-01..D-17 changes; every touch
point is source code (TypeScript/Java) and its own test suite.

## Common Pitfalls

### Pitfall A: ComposerFlow.launch()'s catalog fetch is baked into the chain, not a caller-supplied input

**What goes wrong:** `ComposerFlow.launch()` (`ComposerFlow.java:73-86`) calls
`server.composerCatalogs()` unconditionally as stage 2 of its composed chain. Simply adding a cache
inside `BbjComposerService` does NOT make `ComposerFlow.launch()` stop re-fetching catalogs — the
call site is inside `ComposerFlow`, not `ComposerLauncher`. A naive D-14/D-17 implementation that
only touches `BbjComposerService.server(project)` (the proxy) will still perform one
`composerCatalogs()` round trip per composer open, missing half of D-17's requirement.
**Why it happens:** `ComposerFlow.launch`'s three-stage chain (`serverFuture -> composerCatalogs() ->
decodeCall`) was designed (#538, Phase 82) around always fetching fresh catalogs; nothing in its
current signature accepts a pre-resolved or cached catalogs future.
**How to avoid:** Either (a) widen `ComposerFlow.launch`'s signature to accept a
`CompletableFuture<ComposerCatalogs>` supplied by the caller (backed by `BbjComposerService`'s new
cache) instead of calling `server.composerCatalogs()` itself, or (b) have `BbjComposerService`
expose a `catalogs(project)` accessor that itself memoizes `server.composerCatalogs()` and have
`ComposerLauncher`/each dialog call that instead of relying on `ComposerFlow` to fetch fresh every
time. Whichever shape is chosen, `ComposerLauncherChainSourceGuardTest.java` (already in the test
tree, asserts "exactly one `handle()`" in `launch()`'s own body per the 82-02 SUMMARY) must be
re-read before editing `ComposerFlow.launch()`'s chain shape — a structural change to the chain is
exactly what that test pins.
**Warning signs:** A per-project cache lands and `server(project)`'s own resolution is proven fast on
a second call, but the composer dialog's *catalogs* still take a visible round trip on reopen.

### Pitfall B: Converting `BbjComposerService` from a static utility to a stateful cache needs a lifecycle owner

**What goes wrong:** `BbjComposerService` today (`BbjComposerService.java`, full file) is a
`private BbjComposerService() {}` static-only class with no `plugin.xml` registration, no
`Disposable`, and no per-project instance. A per-project cache needs per-project state (so it can
be cleared when *that* project's server restarts) and a `Disposable` parent to unsubscribe from
`BbjServerStatusListener.TOPIC` cleanly. Simply adding `static Map<Project, Entry> CACHE` without
also subscribing per-project (and disposing that subscription on project close) risks leaking a
`MessageBusConnection` per project across the plugin's lifetime.
**Why it happens:** `BbjComposerService.server(...)` was written as a stateless resolver; nothing in
its current shape anticipated caching.
**How to avoid:** Follow `BbjJavaInteropService`'s exact established pattern
(`BbjJavaInteropService.java:29-87`, `[VERIFIED: read this session]`) — a `projectService` registered
in `plugin.xml` (mirror the two existing entries at `plugin.xml:268,271`), implementing
`Disposable`, subscribing via `project.getMessageBus().connect(this).subscribe(BbjServerService.BbjServerStatusListener.TOPIC, status -> clearCache())`
in its constructor. This is also the shape CONTEXT.md's Claude's Discretion section explicitly
flags as an open question ("whether `plugin.xml` service registration or a static holder keyed by
Project is the established pattern") — the established pattern in THIS repo for exactly this
project+TOPIC combination is the `projectService` shape, not a static `Map`.
**Warning signs:** Two different projects open in the same IDE session share one cache entry, or a
project's cache survives after that project's server is stopped/the project is closed.

### Pitfall C: `Lsp4ijImportAllowlistTest` currently allowlists exactly one symbol for `BbjComposerService.java`

**What goes wrong:** `Lsp4ijImportAllowlistTest.java:62` pins
`Map.entry("com/basis/bbj/intellij/composer/BbjComposerService.java", Set.of("LanguageServerManager"))`
— an eleven-file, symbol-level allowlist (Phase 83) that fails the build on ANY new LSP4IJ-namespace
import in this file that isn't already on the list. If the D-14 cache implementation reads
`ServerStatus` or any other `com.redhat.devtools.lsp4ij.*` symbol directly inside
`BbjComposerService.java` (e.g. to double-check the proxy is alive before returning a cached value),
the allowlist test will fail until that symbol is added to the `Set.of(...)`.
**Why it happens:** The allowlist is a hand-maintained safety net (Phase 83, closes a real LSP4IJ
version-skew risk class) — it does not auto-grow.
**How to avoid:** Prefer keeping the D-16 "cached proxy turns out dead" detection at the request
call-site (the composer flow's existing failure-handling, which already renders
`ComposerNotices.requestFailed`), not inside `BbjComposerService` reading LSP4IJ status types
directly — this avoids growing the allowlist at all. If a new LSP4IJ symbol genuinely is needed
inside `BbjComposerService.java`, add it to `Lsp4ijImportAllowlistTest.java`'s entry for that file
in the SAME plan/commit, and expect the reviewer/CI to catch a miss immediately (it is a hard
assertion, not a warning).
**Warning signs:** `./gradlew test --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest'`
fails after the cache lands.

### Pitfall D: `ComposerDialogRefreshSourceGuardTest`'s subject lists must grow, or the guard silently stops covering the new dialogs

**What goes wrong:** `ComposerDialogRefreshSourceGuardTest.java:61-62` (`DIALOG_SOURCES`) and
`:72` (`DEBOUNCED_DIALOG_SOURCES`) are hand-maintained `List.of(...)` literals, not a
directory scan. `DIALOG_SOURCES` already includes all six dialog files (MSGBOX, addWindow,
addChildWindow, SETOPTS, tri-state, CVS) — so the "no bare `thenAccept`", "flow.observe exactly
once", "sequence check both paths" assertions already cover the three D-12 target dialogs and will
continue to pass unmodified. BUT `DEBOUNCED_DIALOG_SOURCES` currently lists only
`{SETOPTS_SOURCE, TRISTATE_SOURCE, CVS_SOURCE}` — after D-12 lands, MSGBOX/addWindow/addChildWindow
must be ADDED to this list, or `eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure`
(which expects exactly 2 `setOKActionEnabled(false)` occurrences for non-debounced dialogs) will
fail on the newly-debounced dialogs, which will now have 3 (per `SetoptsComposerDialog`'s own
established CR-01 pattern, `SetoptsComposerDialog.java:198-201`). The
`debouncedDialogsRouteEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly`
test will also then apply to the three newly-debounced dialogs and requires each to declare a
`private void scheduleRefresh()` helper (not call `previewDebouncer.trigger()` inline).
**Why it happens:** This is a source-guard test by design (fails the build on structural drift), and
the two lists intentionally distinguish already-debounced dialogs from not-yet-debounced ones —
D-12's own work is precisely what needs to move three entries between those lists.
**How to avoid:** As part of the D-12 plan, edit `ComposerDialogRefreshSourceGuardTest.java` to move
`MSGBOX_SOURCE`, `ADD_WINDOW_SOURCE`, `ADD_CHILD_WINDOW_SOURCE` into `DEBOUNCED_DIALOG_SOURCES`
in the same commit as the dialog changes — otherwise the guard test fails immediately (a
fail-loud signal, not a silent gap, but still a planning dependency the plan must name explicitly).
**Warning signs:** `./gradlew test --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest'`
fails after D-12's dialog edits land but before the test file is updated.

### Pitfall E: The MSGBOX picker (`bbj.composeMsgbox` QuickPick, D-01) has no captured call span to re-check against

**What goes wrong:** `runComposer`'s `ComposeArg` interface (`msgbox-composer-ui.ts:18-23`) carries
only `{ line, exprRange, current }` for `edit` or `{ line, character }` for `insert` — a numeric
token range or an insert offset, NOT a captured call span (`callStart`/`callEnd`/`callText`) the way
`MsgboxEditTarget` (the webview panel's target shape) does. `msgboxCallStillMatches` and its D-03
span-exact successor operate on `MsgboxEditTarget`, not on `ComposeArg`. A staleness re-check for
the picker cannot simply call the existing `msgboxCallStillMatches` function — it needs either (a) a
new, narrower check comparing the captured `exprRange`'s slice against the live document at write
time plus re-locating the call at that line to confirm a MSGBOX call still spans consistently, or
(b) widening `ComposeArg` to also capture the call's own span at wizard-open time and reusing the
existing/D-03 check directly.
**Why it happens:** The picker (`bbj.composeMsgbox`) predates the webview panel's target-capture
design (msgbox-composer-webview.ts's `MsgboxEditTarget` came later, for #648's Code Action flow) —
the two code paths never shared a staleness-check shape because until D-01, the picker's `edit`/
`insert` branches had no staleness check at all.
**How to avoid:** The plan should decide explicitly which of (a)/(b) above to build — CONTEXT.md
leaves this open (it is not in the Locked Decisions or Claude's Discretion sections explicitly, but
D-01/D-02/D-03's combination requires SOME shape here). Recommend (b): widen `ComposeArg.edit` and
`.insert` to also carry the call's `[callStart, callEnd)` and `callText` captured at wizard-open
time (`runComposer` already has `editor` and can call `decodeMsgboxCall`/`findMsgboxCallAt` before
showing the QuickPick), then reuse the exact same D-03 span-exact check the webview panel uses.
**Warning signs:** A plan that adds a staleness check only to `msgbox-composer-webview.ts`'s `insert`
handler and not to `msgbox-composer-ui.ts`'s `runComposer` — the picker's `arg.edit`/`arg.insert`
branches (`msgbox-composer-ui.ts:100-108`) still write unconditionally in that case, failing D-01's
own regression-test requirement (#532's "a document edit during the wizard" scenario).

## Code Examples

### MSGBOX picker's current unguarded write (what D-01 must change)

```typescript
// Source: bbj-vscode/src/msgbox-composer-ui.ts:87-108 [VERIFIED: read this session]
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
        // Add options to a bare MSGBOX("..."): insert `, <expr>` after the message.
        const pos = new vscode.Position(arg.insert.line, arg.insert.character);
        await editor.edit(b => b.insert(pos, `, ${expr}`));       // <-- same: no re-resolve today
    } else { /* compose-new, out of D-01's scope per CONTEXT.md Claude's Discretion */ }
}
```

### Mocked-`vscode` test harness precedent for a "document edited during the wizard" test (D-01/D-02 regression test)

```typescript
// Source: bbj-vscode/test/msgbox-composer-ui.test.ts:44-104, 208-298 (structure, not full text)
// [VERIFIED: read this session]
vi.mock('vscode', () => ({
    window: { createWebviewPanel: createWebviewPanelMock, activeTextEditor: undefined, ... },
    workspace: { get textDocuments() { return textDocuments; }, applyEdit: applyEditMock },
    // ...
}));
// fakeContext = { subscriptions: [] } — the exact shape the shared listener-disposal test (D-11)
// should also reuse for asserting context.subscriptions doesn't grow.
const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openMsgboxComposerPanel>[0];
```
This file already demonstrates the "EDIT mode refuses to write when the call text changed since the
composer opened" pattern for the WEBVIEW panel (`msgbox-composer-webview.test` cases at lines
274-297) — the picker's own equivalent test (D-01's #532 regression test) does not exist yet and
must be added, following the same mocked-`editor.edit`/`textDocuments` shape but driving
`runComposer` instead of `openMsgboxComposerPanel`.

### `composer-cue-single-source.test.ts`'s file-discovery pattern — the precedent for D-11's "discovers panels itself" test

```typescript
// Source: bbj-vscode/test/composer-cue-single-source.test.ts:31-46 [VERIFIED: read this session]
function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (path.relative(SRC_DIR, fullPath) === path.join('language', 'generated')) {
                continue;
            }
            results.push(...collectTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            results.push(fullPath);
        }
    }
    return results;
}
```
D-11's regression test should filter this same `collectTsFiles(SRC_DIR)` result (or a narrower
`fs.readdirSync(SRC_DIR)` non-recursive scan) by filename pattern (e.g. files ending in
`-composer-webview.ts` or `-webview.ts`), dynamically import each, and assert
`context.subscriptions` does not grow across an open→dispose cycle for every discovered panel —
"so a seventh composer is covered automatically" per CONTEXT.md D-11, matching
`IntentionDescriptionResourcesTest`'s (IntelliJ side) precedent of deriving subjects from a live
source (there: `plugin.xml`) rather than a hard-coded list.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The MSGBOX compose-mode enum should have four values (`COMPOSE_NEW/EDIT_IN_PLACE/REPLACE/COMPLETE_CALL`) rather than reusing `CvsComposeMode`'s four-value shape verbatim | Pattern 2 | If wrong, the planner may design a mismatched enum that doesn't cover MSGBOX's actual `replace` outcome, requiring rework mid-implementation — low risk since CONTEXT.md already flags this as discretion, not a locked shape |
| A2 | `ComposerFlow.launch()`'s signature must change (or `BbjComposerService` must expose a catalogs accessor bypassing it) to satisfy D-17's "no repeated catalog round trip" | Pitfall A | If wrong (e.g. if the LS-side catalog response is cheap enough that D-17 is satisfied by only caching the proxy, not the catalogs), the plan may over-engineer the catalogs cache — recommend planner verify against D-17's literal wording ("Each open still performs its own decode round trip... but catalogs are fetched lazily... then reused") before committing to option (a) or (b) |
| A3 | The recommended fix for the MSGBOX picker's staleness gap (D-01/D-02/D-03) is to widen `ComposeArg` to capture a call span, rather than building a narrower exprRange-only check | Pitfall E | If wrong, a narrower fix might pass the #532 regression test's literal scenario but miss an edge case (e.g. the call growing past the captured exprRange) — low risk since either shape satisfies "fail closed on any doubt" |

**If this table is empty:** N/A — three assumptions recorded above, all low-risk design-shape
choices explicitly left to the planner/Claude's Discretion by CONTEXT.md, not fact claims about
external systems.

## Open Questions

1. **Where exactly does the MSGBOX span-exact check live — `msgbox-composer.ts` or
   `msgbox-composer-webview.ts`?**
   - What we know: CVS's `findCvsCalls` (pure, no `vscode`) lives in `cvs-composer.ts`;
     `cvsCallStillMatches` (the webview-facing wrapper) lives in `cvs-composer-webview.ts`. MSGBOX's
     `findMsgboxCallAt`/`findMsgboxCalls` already live in `msgbox-composer.ts` (no `vscode` import).
   - What's unclear: whether the picker (`msgbox-composer-ui.ts`, D-01) should import the check
     directly from `msgbox-composer.ts` (pure) or from `msgbox-composer-webview.ts` (which the
     picker does not currently import at all — it currently only imports `openMsgboxComposerPanel`
     and `MsgboxPanelArg` from it).
   - Recommendation: Per the Recommended Project Structure section above, keep the CVS split exactly
     — call-finding stays pure (`msgbox-composer.ts`), the slice+span-exact wrapper stays in
     `msgbox-composer-webview.ts`, and the picker imports `findMsgboxCallAt` directly (already does,
     for `decodeMsgboxCall`'s dependencies) rather than importing the webview module's wrapper.

2. **Does `BbjComposerService` becoming a `projectService` affect any other call site's assumption
   that `server(project)` is a static method?**
   - What we know: `BbjCompileAction.java:89` and `BbjRefreshJavaClassesAction.java:60` both call
     `BbjComposerService.server(project)` as a static method today.
   - What's unclear: whether converting to an instance method (`BbjComposerService.getInstance(project).server()`)
     breaks these two call sites' existing structure, or whether a static `server(project)` facade
     can be kept that internally delegates to the project-service instance (matching how
     `BbjJavaInteropService.getInstance(project)` is the accessor pattern, but `BbjComposerService`'s
     current callers use a bare static call).
   - Recommendation: Keep `BbjComposerService.server(Project)` as a static facade method that
     internally does `project.getService(BbjComposerService.class).resolve()` (or similar) so
     `BbjCompileAction`/`BbjRefreshJavaClassesAction` need zero changes — this is a low-risk,
     backward-compatible conversion path the planner should verify is buildable before committing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm (vitest) | VS Code-side plans | ✓ (repo's own dev container) | — | — |
| Java / Gradle (offline) | IntelliJ-side plans | ✓ (repo's own dev container, per CLAUDE.md build commands) | JDK 17 toolchain (Phase 78) | — |
| Live BBjServices / java-interop :5008 | NOT required — this phase touches no `bbj-test-module.ts`/interop-backed tests | — | — | N/A, per CLAUDE.md's `npm test` (BBj/Java-dependent tests skip unless reachable) |
| IntelliJ sandbox / live IDE | Manual UAT only (per prior phases' pattern — "no IntelliJ sandbox exists in this devcontainer") | ✗ | — | Human UAT checkpoint after rebuild, matching Phase 88/89's precedent |

**Missing dependencies with no fallback:** none blocking automated verification.
**Missing dependencies with fallback:** IntelliJ live-IDE checks require a human UAT pass on a
rebuilt plugin zip, exactly as Phases 88/89 did (`88-13`, `89-16`/UAT rounds 1-2 in STATE.md).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (VS Code) | Vitest (`bbj-vscode/vitest.config.ts`, existing) |
| Framework (IntelliJ) | Plain JUnit 5 (`bbj-intellij/build.gradle.kts`, existing; **no** platform `BasePlatformTestCase` — pinned by `ComposerDialogRefreshSourceGuardTest.noPlatformTestFrameworkCreptIn`) |
| Config file | `bbj-vscode/vitest.config.ts`; `bbj-intellij/build.gradle.kts` `test {}` block |
| Quick run command (VS Code, one file) | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/msgbox-composer.test.ts` |
| Quick run command (IntelliJ, one class) | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.DecodeEqualityTest'` |
| Full suite command (VS Code) | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` |
| Full suite command (IntelliJ) | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-07 (D-06..D-09) | addWindow/addChildWindow field validation rejects malformed text before insert | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts` | ✅ files exist, ❌ validation assertions — Wave 0 |
| DISC-07 (D-08 IntelliJ gate) | `setOKActionEnabled(p.valid)` on addWindow/addChildWindow dialogs | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest'` | ✅ file exists, needs new field-error assertions |
| DISC-08 (D-01/D-02) | Picker re-resolves target call before write, aborts on mismatch | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/msgbox-composer-ui.test.ts` | ✅ file exists, ❌ picker-specific regression test — Wave 0 |
| DISC-08 (D-03) | Span-exact MSGBOX staleness check (shared picker+panel) | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/msgbox-composer-ui.test.ts` | ❌ new check + test — Wave 0 |
| Folded todo (D-04/D-05) | Unfinished MSGBOX( completes in place, no banner, no assign-to row | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/msgbox-composer.test.ts test/msgbox-composer-ui.test.ts` | ✅ files exist, ❌ `incomplete` outcome tests — Wave 0 (mirror `cvs-composer.test.ts`'s `incomplete` coverage) |
| Folded todo (D-04, IntelliJ) | `ComposerLauncher.openMsgbox` completes rather than nests | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.DecodeEqualityTest'` | ✅ file exists, ❌ new outcome comparison — Wave 0 |
| DISC-09 (D-10/D-11) | No leaked listeners across open/dispose for all six panels | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/composer-cue-single-source.test.ts` (or new file) | ❌ new discovery-based test — Wave 0 |
| DISC-10 (D-12/D-13) | One preview round trip per settle point, all six dialogs | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest'` | ✅ file exists, needs `DEBOUNCED_DIALOG_SOURCES` list extended (Pitfall D) |
| DISC-10 (D-12, debounce timing) | Coalescing itself, plain-JUnit `ManualScheduler` | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.concurrency.PreviewDebouncerTest'` | ✅ file exists — reused unchanged, no new test needed (the seam itself isn't touched, only its callers) |
| DISC-11 (D-14..D-17) | Cache hit/invalidate-on-status-change/clear-on-failure | JUnit | new test class, e.g. `com.basis.bbj.intellij.composer.BbjComposerServiceCacheTest` | ❌ new file — Wave 0 |
| DISC-11 (allowlist regression) | `BbjComposerService.java` import set unchanged (Pitfall C) | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.lsp.Lsp4ijImportAllowlistTest'` | ✅ file exists — run as a regression gate, update only if a new LSP4IJ symbol is genuinely needed |
| Cross-host DTO safety (Pitfall 13) | New `valid`/error fields round-trip through LSP4IJ's Gson | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerModelsJsonBoundaryTest'` | ✅ file exists, extend with new envelope cases |
| Cross-host method-name pin | No accidental request-name drift on addWindow/addChildWindow preview | JUnit | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` | ✅ file exists — no method NAMES change in this phase (only payload shape), run as regression gate |

### Sampling Rate
- **Per task commit:** the relevant single-file vitest/gradle command from the table above.
- **Per wave merge:** `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` AND
  `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline`.
- **Phase gate:** both full suites green before `/gsd-verify-work`; rebuild both distributables
  (VSIX + IntelliJ zip) per CONTEXT.md's Specific Ideas note before UAT and again after any
  code-review fixes.

### Wave 0 Gaps
- [ ] MSGBOX `incomplete` decode-outcome unit tests in `msgbox-composer.test.ts` — mirror
  `cvs-composer.test.ts`'s existing `incomplete` coverage (89-14 precedent).
- [ ] Picker (`msgbox-composer-ui.ts`) "document edited during the wizard" regression test in
  `msgbox-composer-ui.test.ts` — new `describe` block alongside the existing panel-EDIT-mode tests.
- [ ] addWindow/addChildWindow per-field validation unit tests in `addwindow-composer.test.ts` /
  `addchildwindow-composer.test.ts` (currently pure-logic tests with no validation assertions since
  `addwindowPreview`/`addchildwindowPreview` return no error fields today).
- [ ] A new webview-listener-leak discovery test (D-11) — new file, e.g.
  `webview-panel-lifecycle.test.ts`, using the `collectTsFiles`-style discovery from
  `composer-cue-single-source.test.ts` filtered to webview panel files.
- [ ] `BbjComposerServiceCacheTest.java` (D-14..D-17) — plain JUnit over an injectable clock/status
  source, mirroring `BbjInteropPortCache`'s package-private-constructor-for-testing shape
  (`BbjInteropPortCache.java:55`).
- [ ] `ComposerDialogRefreshSourceGuardTest.java` updated: move MSGBOX/addWindow/addChildWindow into
  `DEBOUNCED_DIALOG_SOURCES` (D-12) — an edit to an EXISTING file, not a new one, but load-bearing
  for the phase gate (Pitfall D).

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth surface touched |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A — single-user local IDE extension |
| V5 Input Validation | **yes** | D-06/D-07's per-field structural validation (`validateBbjExpression`/`validateStringField`, `msgbox-composer.ts:197-326`) reused for addWindow/addChildWindow fields; server-side `if (!r.valid) break;` guard (D-08) as the authoritative gate, never client-only |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed free-text composer field written verbatim into the user's own BBj source (self-inflicted corruption — the exact defect class MSGBOX's `validateStringField` already fixed for its own fields, per PITFALLS.md's Security Mistakes table) | Tampering (of the user's own file, not attacker-controlled) | D-06's structural + string-typing checks on every addWindow/addChildWindow free-text field, gated server-side (`if (!r.valid) break;`) so a compromised/buggy webview client cannot bypass validation by sending a crafted `insert` message directly |
| Stale-edit race: a composer write lands on a document range that moved/changed since the dialog captured it, corrupting unrelated text | Tampering | D-01/D-02/D-03 (VS Code picker+panel) and the existing `StaleEditGuard`/`DecodeEquality` (IntelliJ, extended for D-04's new outcome) — fail closed, never search for a moved call |
| VS Code webview message-handler listener accumulation across repeated open/dispose (a resource-exhaustion-shaped defect, not attacker-triggered, but a real DoS-adjacent bug over a long session) | Denial of Service (self-inflicted) | D-10/D-11's per-panel-scoped disposal (`panel.onDidDispose`) |

## Sources

### Primary (HIGH confidence — direct reads this session)
- `bbj-vscode/src/msgbox-composer.ts`, `cvs-composer.ts`, `addwindow-composer.ts`,
  `addchildwindow-composer.ts` — full files read
- `bbj-vscode/src/msgbox-composer-webview.ts`, `cvs-composer-webview.ts`,
  `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts` — full files read
- `bbj-vscode/src/setopts-composer-webview.ts`, `setopts-tristate-webview.ts` — headers + listener
  registration lines read/grepped
- `bbj-vscode/src/msgbox-composer-ui.ts`, `composer-lens-command.ts`, `composer-lens-contract.ts`,
  `language/composer-codelens.ts`, `language/composer-commands.ts` — full files read
- `bbj-vscode/test/msgbox-composer-ui.test.ts`, `test/composer-cue-single-source.test.ts` — full
  files read
- `bbj-intellij/.../composer/ComposerLauncher.java`, `ComposerModels.java`, `DecodeEquality.java`,
  `CvsComposeMode.java`, `StaleEditGuard.java`, `SetoptsComposerDialog.java`, `CvsComposerDialog.java`,
  `MsgboxComposerDialog.java`, `BbjComposerService.java`, `ComposerFlow.java`,
  `BbjComposerServer.java` — full files read
- `bbj-intellij/.../composer/AddWindowComposerDialog.java`,
  `AddChildWindowComposerDialog.java` — targeted grep + header read confirming no-debounce pattern
- `bbj-intellij/.../concurrency/PreviewDebouncer.java`, `AlarmScheduler.java`, `Scheduler.java`,
  `test/.../concurrency/ManualScheduler.java` — full files read
- `bbj-intellij/.../ui/BbjServerService.java` (lines 180-326), `BbjJavaInteropService.java` (lines
  1-100) — read for the TOPIC/subscription precedent
- `bbj-intellij/BbjInteropPortCache.java` — full file read, cache-pattern precedent
- `bbj-intellij/src/test/.../ComposerDialogRefreshSourceGuardTest.java` — full file read
- `bbj-intellij/src/test/.../ComposerRequestContractTest.java`,
  `ComposerModelsJsonBoundaryTest.java`, `Lsp4ijImportAllowlistTest.java` — targeted grep/read
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (lines 225-280) — service registration
  precedent
- `.planning/phases/90-composer-robustness-intellij-composer-performance/90-CONTEXT.md`,
  `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/research/PITFALLS.md` §12/§13 — full
  reads

### Secondary (MEDIUM confidence)
- None — no external documentation lookups were performed; the phase's search-provider flags
  (`brave_search: false`, `exa_search: false`, `firecrawl: false` per `gsd_run query init.phase-op`)
  and the fully in-repo nature of the work made external search unnecessary.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, confirmed by direct source reads
- Architecture: HIGH — every pattern cited is read from the current tree this session, with
  file:line citations
- Pitfalls: HIGH — five of the pitfalls above are derived from direct contradiction-checking against
  the actual test files (`ComposerDialogRefreshSourceGuardTest`, `Lsp4ijImportAllowlistTest`,
  `ComposerFlow.java`) that will gate this phase's plans, not generic advice

**Research date:** 2026-09-12
**Valid until:** 30 days (stable, in-repo-only domain; re-verify if Phases 91/92 land first and
touch any of `ComposerFlow.java`, `BbjComposerService.java`, or the six webview files)
