# Phase 90: Composer Robustness & IntelliJ Composer Performance - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The existing composers become safe to use repeatedly in both IDEs. Five requirements, one folded todo:

- **DISC-07 (#623):** malformed free text in the addWindow / addChildWindow composer fields is
  rejected before the insert is applied. Validity travels in the shared preview payload, so VS Code
  and IntelliJ gate the same way.
- **DISC-08 (#532):** the MSGBOX QuickPick picker (`bbj.composeMsgbox`) re-resolves its target
  call right before writing and aborts on a mismatch.
- **DISC-09 (#530):** opening and closing VS Code composer panels no longer leaks message-handler
  listeners.
- **DISC-10 (#611):** the IntelliJ MSGBOX / addWindow / addChildWindow dialogs send one preview
  round trip per settle point, not one per keystroke.
- **DISC-11 (#612):** reopening a composer in the same IntelliJ session pays no server-resolution
  or catalog round trip; the cache is invalidated when the language server's status changes.
- **Folded todo:** opening the MSGBOX composer on an unfinished `MSGBOX(` call completes that call
  instead of nesting a second call inside it (both IDEs).

No new composer, no new UI surface beyond per-field validation errors. The issue texts predate
the CVS and SETOPTS tri-state composers (Phase 88/89) and the IntelliJ JUnit harness (Phases
79-83); the decisions below correct for both.

</domain>

<decisions>
## Implementation Decisions

### MSGBOX picker and target safety (DISC-08, folded todo)
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

### addWindow / addChildWindow input validation (DISC-07)
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

### Fix scope versus the issue texts (DISC-09, DISC-10)
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

### IntelliJ server and catalog cache (DISC-11)
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

### Folded Todos
- **MSGBOX compose-new nests a second call inside an unfinished `MSGBOX(` call**
  (`.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md`).
  `x = MSGBOX(` and `x = MSGBOX()` decode as `found: false`, so both IDEs take the compose-new path
  and insert a whole statement inside the unfinished call. Filed by 89-16 specifically for this
  phase, next to DISC-08's re-resolve criterion. Resolved by D-03, D-04 and D-05.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 90: Composer Robustness & IntelliJ Composer Performance" — goal
  and the five success criteria.
- `.planning/REQUIREMENTS.md` — DISC-07..DISC-11 wording; the "Input-validation hardening" row in
  Out of Scope (#523, #524, … is a different issue set and stays out).
- GitHub issues #623, #532, #530, #611, #612 (`gh issue view <n> --repo BBx-Kitchen/bbj-language-server`)
  — each issue's Evidence, Failure scenario and Acceptance criteria. Line numbers in them are stale,
  and their "no `src/test/` exists for bbj-intellij" remarks are obsolete (see Pitfall 12).
- `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md`
  — folded todo (D-04).

### Research
- `.planning/research/PITFALLS.md` §"Pitfall 12" — reuse the `Scheduler`/`AlarmScheduler` seam, and
  write plain-JUnit regression tests with `ManualScheduler`, never "recorded manual verification".
- `.planning/research/PITFALLS.md` §"Pitfall 13" — any DTO field added to a composer payload
  (`valid`, per-field errors, the unfinished-call outcome) must cross the LSP4IJ boundary safely;
  extend `ComposerModelsJsonBoundaryTest`.

### Prior phase decisions this phase builds on
- `.planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-CONTEXT.md` —
  D-08/D-09 (the compose-and-replace banner that D-05 deliberately does not reuse), D-11
  (composer plumbing reuse).
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-CONTEXT.md` — D-06 (debounced
  tri-state dialog).
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-CONTEXT.md` — D-09 (the
  debounce seam this phase extends to the remaining three dialogs).
- `.planning/STATE.md` Decisions — 82-03 (`StaleEditGuard` / `DecodeEquality`), 88-15 (VS Code
  `applyIfUnchanged`), 89-14 / 89-15 (CVS `incomplete` outcome, span-exact
  `cvsCallStillMatches`, `CvsComposeMode`), 87-02 (`PreviewDebouncer`), 86-01
  (Refresh Java Classes single-flight and restart fallback, a cache consumer per D-14).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/msgbox-composer.ts`: `validateBbjExpression`, `validateStringField`,
  `resolvesToString`; `msgboxPreview` is the per-field-error + `valid` template for D-06..D-08;
  `MsgboxDecodeCallResult` (`found`/`edit`/`initial`/`replace`/`hasOptions`) is where D-04's outcome
  lands.
- `bbj-vscode/src/cvs-composer.ts` (`incomplete` decode outcome, edit-mode validation skip) and
  `bbj-vscode/src/cvs-composer-webview.ts` (`cvsCallStillMatches`, completing mode): the precedent
  for D-03/D-04/D-09.
- `bbj-vscode/src/msgbox-composer-webview.ts`: `msgboxCallStillMatches` (slice-only today, D-03),
  `STALE_CALL_TEXT`, the inline error markup (`message-error`, `input.invalid`).
- `bbj-vscode/src/msgbox-composer-ui.ts`: `runComposer` / `runWizard` — the `arg.edit` / `arg.insert`
  branches that D-01 guards.
- `bbj-intellij/.../concurrency/PreviewDebouncer.java`, `AlarmScheduler.java`, `Scheduler.java`, and
  test double `src/test/.../concurrency/ManualScheduler.java` + `PreviewDebouncerTest.java`: D-12.
- `bbj-intellij/.../composer/SetoptsComposerDialog.java` / `CvsComposerDialog.java`:
  `scheduleRefresh()` + `previewDebouncer.trigger()` shape to copy into the three dialogs.
- `bbj-intellij/.../composer/StaleEditGuard.java`, `DecodeEquality.java` (`sameMsgbox`),
  `CvsComposeMode.java`: guarded replace and mode for D-04.
- `bbj-intellij/.../ui/BbjServerService.java` `BbjServerStatusListener.TOPIC`: D-15's invalidation
  signal.

### Established Patterns
- Fail closed on any doubt about an edit target; never relocate.
- Source-guard tests pin dialog wiring: `ComposerDialogRefreshSourceGuardTest` already asserts, for
  debounced dialogs, exactly one `previewDebouncer.trigger()`, a `private void scheduleRefresh()`,
  and OK disabled before the first refresh — extend its subject set to the three dialogs.
- Cross-host DTO changes are pinned by `ComposerRequestContractTest`,
  `ComposerModelsJsonBoundaryTest` and `DecodeEqualityTest`.
- Plain-Java seams with no live IntelliJ Application for anything that needs unit tests (79-02,
  84-04, 86-02).
- VS Code tests: vitest from `bbj-vscode/` (`npx vitest run <file>`).

### Integration Points
- `bbj-vscode/src/language/composer-commands.ts`: `bbj/composer/addwindow/preview`,
  `bbj/composer/addchildwindow/preview` and `bbj/composer/msgbox/decodeCall` are thin pass-throughs;
  payload changes flow to IntelliJ `ComposerModels.java` automatically via the same handlers.
- `bbj-vscode/src/language/composer-codelens.ts`: MSGBOX cues carry no decode veto (89-09). The
  researcher should confirm what an unfinished `MSGBOX(` line's cue does today and after D-04. In
  IntelliJ a cue click on a `found: false` decode renders `staleDocument` (`ComposerLauncher.launchAt`,
  `fromCue`).
- `bbj-intellij/.../composer/ComposerFlow.java` `launch()` chains `serverFuture -> composerCatalogs()
  -> decodeCall` under one deadline; D-14/D-17 short-circuit its first two stages.
- `BbjCompileAction` (45 s wait) and `BbjRefreshJavaClassesAction` (single-flight plus restart
  fallback) also call `BbjComposerService.server`; both must keep working through a restart with the
  cache in place.

</code_context>

<specifics>
## Specific Ideas

- The regression tests named by the issues are required, adapted to today's harness: #532 simulates
  a document edit during the wizard; #530 checks `context.subscriptions` across an open/dispose
  cycle (all six panels); #623 checks a malformed field is rejected before `applyEdit`; #611 and
  #612 are plain JUnit over `ManualScheduler` / a cache seam, not manual timing checks.
- Rebuild both distributables (VSIX and IntelliJ zip) before UAT and again from the final tree after
  any code-review fixes.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **A configured-but-unusable Node.js path suppresses the cached-download fallback**
  (`.planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md`)
  — a product decision about IntelliJ Node.js detection (`NodeAvailability`), unrelated to
  composers. Matched only on the keywords "cached" and "intellij".
- **Live Windows check for the Node.js auto-install failure**
  (`.planning/todos/pending/2026-09-06-live-windows-check-for-node-auto-install-failure.md`) — listed
  in REQUIREMENTS.md Out of Scope as maintainer-owned and not a GSD phase; needs a real Windows
  machine.

</deferred>

---

*Phase: 90-composer-robustness-intellij-composer-performance*
*Context gathered: 2026-09-12*
