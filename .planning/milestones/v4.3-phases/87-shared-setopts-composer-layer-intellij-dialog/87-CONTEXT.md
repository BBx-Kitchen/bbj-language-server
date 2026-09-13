# Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

IntelliJ gets a visual SETOPTS composer for `config.bbx`/`config.min`, equivalent to VS Code's
existing one, driven by a new shared `bbj/composer/setopts/*` request layer on the language
server (DISC-04, #633). A user can both edit an existing `SETOPTS <hex>` line and compose a
brand-new one at the cursor, previewed live before applying, with the edit routed through the
existing `ComposerFlow`/`StaleEditGuard`/`ComposerNotices` seams so a hung or failed request
surfaces exactly one reason-keyed balloon and a stale edit never corrupts the file.

Not this phase: VS Code changes — VS Code's existing composer (`setopts-composer-ui.ts`,
`setopts-composer-webview.ts`) already imports `setopts-catalog.ts` directly and needs zero
code changes; the new server-side layer is a thin re-exposure of that same module purely for
IntelliJ to reach over LSP4IJ, mirroring how `composer-commands.ts` already exposes MSGBOX/
addWindow/addChildWindow (#433) without VS Code calling those requests either. Also not this
phase: SETOPTS-in-code hovers/tri-state composer (Phase 88, #475 — this phase's catalog and
request shape is what Phase 88 extends); the composer discoverability cue (DISC-01, Phase 89);
self-write suppression logic (already delivered structurally by Phase 85 D-06 — a SETOPTS-only
write never produces a reload notification, so this phase needs no dialog-aware restart
deferral and no timestamp/hash suppression window of its own); resolving whether LSP4IJ can
issue a custom request without a restart (already resolved **go** by Phase 86 D-11 — the
`BbjComposerServer` dynamic proxy already carries `bbj/compile`, `bbj/resolvedConfigPath` and
`bbj/refreshJavaClasses` this way).

</domain>

<decisions>
## Implementation Decisions

### IntelliJ launch trigger (no PSI parser for config.bbx)
- **D-01:** The composer opens via a PSI-free Editor context-menu action, not an IntentionAction/lightbulb. `BbxConfigLanguage`/`BbjConfigFileType` (Phase 84 Plan 05) has no parser and is unmapped to the server, so the action's `update()`/availability check scans the current line's raw text the same way VS Code's `parseSetOptsLine` does — no PSI structure to match against. — **Reversibility:** reversible — an intention or additional trigger can be layered on later without changing the underlying dialog/request flow.
- **D-02:** The action is scoped to `config.bbx`/`config.min` files only (mirrors VS Code's `BBX_CONFIG` language filter in `setopts-composer-ui.ts`) — absent entirely in `.bbj` files and everywhere else, not merely disabled.
- **D-03:** Within a config file, the action is available on every line (not just lines that already carry `SETOPTS`): if the current line parses as an existing `SETOPTS <hex>` line, the action edits it; otherwise it composes a new line at the cursor. This mirrors VS Code's `argForActiveEditor` fallback (prefer an existing line in the file, else compose-new) — see D-06/D-07 for exactly which line VS Code prefers vs. what IntelliJ's per-line trigger implies.
- **D-04:** No keyboard shortcut bound in this phase — context-menu entry only, consistent with the MSGBOX/addWindow/addChildWindow baseline (their default keybindings, if any, came later).

### Compose-new vs edit-existing scope
- **D-05:** Both modes ship in this phase — editing an existing `SETOPTS` line and composing a brand-new one when none exists — matching VS Code parity and the roadmap's own success criterion 1 wording ("previews, composes, and applies edits").
- **D-06:** One single context-menu action handles both modes (not two separate actions): on a recognized `SETOPTS` line it opens in edit mode for that line; anywhere else in a config file it opens in compose-new mode targeting the cursor position. Planner note: VS Code's `argForActiveEditor` actually prefers the file's *first* existing `SETOPTS` line over the line under the cursor (a config.bbx is evaluated once — a second line would silently override, not add) and only falls back to compose-new-at-cursor when the file has no `SETOPTS` line at all. Confirm with the researcher whether IntelliJ's per-line action should mirror that same "first existing line wins, else compose-new" rule for consistency, or intentionally diverge to "the line under the caret, else compose-new" since the trigger itself is now line-scoped rather than file/command-scoped — this was not settled explicitly and is close enough to Claude's Discretion, but flagging the VS Code precedent so planning doesn't diverge by accident.

### Dialog layout for the option catalog
- **D-07:** Single scrollable panel (`JBScrollPane`), not tabs. Section headers per byte-group in catalog order (`BYTE_GROUPS` from `setopts-catalog.ts`: "Errors, console & listing", "Printing & numeric behavior", "Program loading & file locking", "File access & number formatting", "Large files, licensing & GUI", "Compatibility", "Input & parsing restrictions") — matches the existing MSGBOX/addWindow dialog shape (`MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`), just longer. — **Reversibility:** reversible — a later redesign to tabs would touch only the dialog's layout code, not the request/DTO surface.
- **D-08:** Catalog bits annotated `bbj: 'ignored'` or `'bbj-specific'` in `SETOPTS_BITS` are visually de-emphasized: the checkbox label is greyed out and the bit's `bbjDetail` (or `detail`) note renders as a tooltip. This follows the catalog module's own stated intent ("the `bbj` annotates the delta... so the UI can de-emphasize no-ops") even though VS Code's current webview has no reference implementation of this to copy — IntelliJ is the first UI to actually do it.
- **D-09:** Live preview, debounced. As checkboxes/fields change, a preview area recomputes via the existing `setoptsPreview` function (through the new `bbj/composer/setopts/preview` request) and shows the resulting hex string plus the human-readable summary (`describeVector`) — matching VS Code's WYSIWYG feel and success criterion 1. The debounce goes through the same `Scheduler`/`Alarm` seam already used by other IntelliJ composer dialogs (DISC-10's per-settle-point round-trip goal, even though DISC-10 itself is scoped to Phase 90) rather than firing a server round trip per keystroke/click.

### Claude's Discretion
- Exact context-menu action label/wording, its position in the Editor Popup Menu, and the action ID/class name.
- Whether "the line under the caret" or "the file's first existing SETOPTS line" wins when both exist somewhere in the file but the caret sits elsewhere in the file (see D-06's open note) — researcher/planner may confirm against VS Code's exact fallback order rather than treat this as a fresh design choice.
- Exact request/method names under `bbj/composer/setopts/*` (e.g. `catalogs`, `preview`, `compose`, `parseLine`/`decodeCall` for edit-in-place) — follow the `bbj/composer/msgbox/*` and `bbj/composer/addwindow/*` naming convention in `composer-commands.ts` exactly.
- Dialog field widget choices for the byte 5/6 mask-replacement characters (single-char text field vs. a small combo) and the raw-hex tail field (bytes 10–16) — VS Code's webview implementation is the reference; match its behavior, not necessarily its exact widget.
- Whether "unknown bits" (`unknownByBytes` in `SetOptsPreview`) get their own visual callout or are folded into the summary text only.
- Debounce interval constant and exact wiring point (mirrors Phase 82/86 precedents already in the codebase).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/ROADMAP.md` §"Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog" — the four success criteria and the two "Depends on" phases (85, 86).
- `.planning/REQUIREMENTS.md` — DISC-04 (#633), this phase; notes DISC-05/DISC-06 (Phase 88) extend the same catalog and request shape.
- GitHub issue #633 — the shared `bbj/composer/setopts/*` command-layer requirement.

### Research (milestone-level)
- `.planning/research/PITFALLS.md` §"Pitfall 3" — the self-inflicted restart loop risk from a composer write reacting with the Phase 85 watcher; already closed structurally by Phase 85 D-06 (SETOPTS-only writes never change consumed content, so they never produce a reload notification) — this phase needs no suppression code of its own, only the regression-test awareness that its writes must, in fact, stay SETOPTS-only.
- `.planning/research/PITFALLS.md` §"Pitfall 13" — new composer DTOs crossing the LSP4IJ boundary must join `ComposerModelsJsonBoundaryTest`'s generalized harness and keep numeric sentinels in lsp4j's actual runtime `int` range (the G-81-4/G-81-5 version-skew class of bug); success criterion 3 names this explicitly.
- `.planning/research/PITFALLS.md` §"Pitfall 14" — LSP4IJ's custom-request capability; **already resolved go by Phase 86 D-11**, record that closure here rather than re-spiking it.
- `.planning/research/ARCHITECTURE.md` §"Config Path Data Flow (#485, #486, #632, #608)" — background on the config-file resolution this composer writes into.

### Prior-phase precedents (direct dependencies)
- `.planning/phases/85-config-hot-reload-with-restart-coalescing/85-CONTEXT.md` — D-06 (the self-write suppression guarantee this phase depends on and needs zero API calls to inherit), D-07 (a restart mid-dialog-session surfaces through `ComposerFlow`/`ComposerNotices`, never silently).
- `.planning/phases/86-intellij-interop-settings-targeted-refresh/86-CONTEXT.md` — D-11 (LSP4IJ custom-request capability resolved go via `BbjComposerServer`), D-18 (verification bar: plain-JUnit tests against a fake server, source guards, contract test, **plus** one recorded live-IDE UAT check — no manual-only verification, per Pitfall 12).
- `.planning/PROJECT.md` §"Key Decisions" — COMP-01/COMP-02 (`ComposerFlow` terminal-handler pattern, `StaleEditGuard` re-decode-and-recheck-stamp-at-write-time), the intentionDescriptions/`IntentionPreviewInfo.Html` fix from Phase 82 Plan 04 (a new SETOPTS intention-equivalent trigger must not repeat G-82-6 if an Intention path is ever added later).

### Existing SETOPTS domain module (read before writing any new code)
- `bbj-vscode/src/setopts-catalog.ts` — the complete, already-reusable domain module: `SETOPTS_BITS` (58 bits), `BYTE_GROUPS` (7 named groups), `parseVector`/`encodeVector`, `parseSetOptsLine`/`composeSetOptsLine`, `setoptsPreview` (the single preview entry point every UI should use), `describeVector`. Explicitly designed with "NO `vscode` dependency, so it is... reusable by the IntelliJ client... later" — this phase is that "later."
- `bbj-vscode/src/setopts-composer-ui.ts` — VS Code's thin client layer (CodeLens/CodeAction/command registration, `argForActiveEditor`'s existing-line-first fallback) — the direct behavioral reference for D-03/D-06.
- `bbj-vscode/src/setopts-composer-webview.ts` — VS Code's webview rendering; reference for what fields/preview the IntelliJ dialog needs to reach parity with, not a UI to copy pixel-for-pixel.

### Established shared composer-layer precedent
- `bbj-vscode/src/language/composer-commands.ts` — the `bbj/composer/*` namespace convention, and the exact "thin pass-through over an editor-agnostic domain module" shape to replicate for SETOPTS (`registerComposerRequests`, `composerHandlers` keyed by LSP method).
- `bbj-vscode/src/language/main.ts` (~line 29-31) — `registerComposerRequests(connection)` wiring; the new SETOPTS handlers join the same call.
- `bbj-intellij/.../composer/BbjComposerServer.java`, `ComposerFlow.java`, `ComposerNotices.java`, `ComposerLauncher.java` — the single server-proxy interface and terminal-handler/balloon seams every composer dialog composes through (success criterion 4).
- `bbj-intellij/.../composer/MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java` — direct dialog-shape templates for D-07/D-08/D-09.
- `bbj-intellij/.../composer/ConfigureMsgboxIntention.java`, `ConfigureAddWindowIntention.java`, `ConfigureAddChildWindowIntention.java`, and `BbjCompose*Action.java` — the existing edit-vs-compose-new action/intention split for BBj-code composers; D-01 deliberately diverges from the Intention half of this pattern because config.bbx has no PSI, but the Action half (compose-new entry point) is the direct precedent for D-06.
- `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java` — asserts every `bbj/composer/*` (and other custom) request name against the language-server sources; the new SETOPTS names join this list.
- `bbj-intellij/src/test/java/.../composer/ComposerModelsJsonBoundaryTest.java` — the generalized DTO boundary-test family (Pitfall 13) the new SETOPTS DTOs must join.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setopts-catalog.ts`'s pure functions (`setoptsPreview`, `parseSetOptsLine`, `composeSetOptsLine`, `describeVector`) — zero new domain logic needed; the LS layer is a thin wrapper exactly like `composer-commands.ts` already does for msgbox/addwindow/addchildwindow.
- `ComposerFlow`, `StaleEditGuard`, `ComposerNotices`, `ComposerLauncher` on the IntelliJ side — reused as-is per success criterion 4.
- `BbjComposerServer`'s single dynamic-proxy interface — the new `bbj/composer/setopts/*` methods join it exactly as `bbj/refreshJavaClasses` and `bbj/compile` did.

### Established Patterns
- Editor-agnostic TypeScript domain module + thin `bbj/composer/*` LSP re-exposure, consumed only by IntelliJ (VS Code uses the module directly, in-process) — `composer-commands.ts`'s own doc comment states this explicitly for msgbox/addwindow.
- IntelliJ composer dialogs are native Swing (`DialogWrapper`), not embedded webviews.
- Every custom request name is asserted against the language-server source by `ComposerRequestContractTest`; every new composer DTO joins `ComposerModelsJsonBoundaryTest`'s generalized harness (Pitfall 13).
- Plain-JUnit fake-server tests + source guards + one recorded live-IDE UAT check is the verification bar (Phase 86 D-18) — no manual-only verification accepted.

### Integration Points
- `bbj-vscode/src/language/composer-commands.ts` — add `setopts` handlers alongside `msgbox`/`addwindow`/`addchildwindow`.
- `bbj-vscode/src/language/main.ts` — no new wiring needed beyond what `registerComposerRequests` already covers.
- New IntelliJ files mirroring the existing composer trio: a `SetoptsComposerDialog.java` (D-07/D-08/D-09), a `BbjComposeSetoptsAction.java`-equivalent Editor Popup action implementing D-01–D-06 (no Intention counterpart per D-01), and a DTO set joining `ComposerModels.java`.
- `ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java`, `ComposerFlowTest.java`'s `FakeComposerServer` — all extend for the new request family.
- `QA/FULL-TEST-CHECKLIST.md` — gains a hand-check row per Phase 86 D-18's verification bar (open a config.bbx, edit an existing SETOPTS line, compose a new one, confirm no restart).

</code_context>

<specifics>
## Specific Ideas

- The composer's edit-in-place must stay lossless the way `setoptsPreview` already guarantees: unknown bits and the original digit count survive untouched unless the user explicitly changes their byte — this is inherited for free by reusing the function, but the IntelliJ dialog's round-trip tests should assert it explicitly (mirrors `StaleEditGuard`'s re-decode-at-write-time discipline).
- The regression pair inherited from Phase 85 D-06 that this phase's own tests should reconfirm rather than re-derive: a SETOPTS-only composer write produces zero reload notifications; a PREFIX-line write elsewhere in the same file still produces exactly one.

</specifics>

<deferred>
## Deferred Ideas

- **A true IntentionAction/lightbulb trigger for the SETOPTS composer** — D-01 chose a PSI-free context-menu action instead; revisit if `BbxConfigLanguage` ever gains a lightweight parser/PSI for other reasons.
- **A default keyboard shortcut for the composer action** — D-04 deferred; add later without changing the action itself.
- **Composer discoverability cue (persistent clickable marker on every SETOPTS line)** — DISC-01, explicitly Phase 89; this phase's context-menu trigger is the interim entry point.
- **SETOPTS-in-code hovers and the tri-state Set/Clear/Leave composer** — DISC-05/DISC-06, Phase 88, which extends this phase's catalog and `bbj/composer/setopts/*` request shape to BBj code (`IOR`/`AND` expressions), not just `config.bbx`.

### Reviewed Todos (not folded)
- Update live-interop tests for the getAllClassNames backend — interop test drift, unrelated to a SETOPTS composer.
- gradle-wrapper-hygiene fixture stale Gradle version — already fixed 2026-09-06 per project memory; unrelated regardless.
- Configured-but-unusable Node.js path suppresses the cached-download fallback — IntelliJ Node bootstrap, unrelated.
- Live Windows check for the Node.js auto-install failure — maintainer-owned manual check, unrelated.

</deferred>

---

*Phase: 87-shared-setopts-composer-layer-intellij-dialog*
*Context gathered: 2026-09-07*
