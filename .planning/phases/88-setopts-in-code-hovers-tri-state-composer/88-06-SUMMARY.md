---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 06
subsystem: ui
tags: [vscode, webview, setopts, composer, code-action]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-03's bbj/composer/setopts/decodeInCode and .../composeTriState requests, and setopts-catalog.ts's SetOptsTriState/SetOptsTriStateSelection model, that this plan's VS Code UI calls directly (VS Code consumes them in-process, not over LSP4IJ)"
provides:
  - "setopts-tristate-webview.ts's openSetOptsTriStateComposerPanel — a Set/Clear/Leave webview that renders the shared catalog, previews exclusively through composeTriState, and applies the chain-replace, equal-line-insert, compose-new-insert and all-Leave-empty-region edit shapes"
  - "setopts-in-code-ui.ts's registerSetOptsInCodeComposer, setoptsInCodeCandidateLine and the bbj.composeSetoptsInCode command — a RefactorRewrite Code Action plus command routing decodeInCode's mode/editable verdict to the right panel or a reason message"
  - "extension.ts wiring (registerSetOptsInCodeComposer called with a client.sendRequest-forwarding closure) and package.json's command/menu/activationEvents contributions"
affects: [89 (composer discoverability CodeLens cue), 88-05 (sibling IntelliJ tri-state dialog — no code dependency, same DISC-06 requirement)]

# Actuals (#2632)
actuals:
  tokens: 12430
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sender-closure injection (SetOptsInCodeRequestSender = (method, params) => Promise<unknown>) keeps both new UI modules free of a vscode-languageclient import — extension.ts is the only place that references the module-level LanguageClient, matching the existing registerSetOptsComposer/registerMsgboxComposer convention of thin per-feature registration functions"
    - "Every preview and apply round-trips through the server's composeTriState — the panel never computes a mask or a line client-side, mirrored by the T-88-02 acceptance grep (setoptsPreview count 0 in the new webview)"

key-files:
  created:
    - bbj-vscode/src/setopts-tristate-webview.ts
    - bbj-vscode/src/setopts-in-code-ui.ts
    - bbj-vscode/test/setopts-in-code-ui.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/package.json

key-decisions:
  - "SetOptsInCodeRequestSender is declared in setopts-tristate-webview.ts (not setopts-in-code-ui.ts) and imported from there into setopts-in-code-ui.ts — an arbitrary but plan-authorized either-way choice; recorded per the plan's own instruction to note which module owns it."
  - "The tri-state panel's preview/apply scope is derived the same way in both places: scope: 'reassignments' whenever a chain target is present (edit-in-place touches only the reassignment region), scope: 'block' with no target (compose-new needs the full var$=OPTS/…/SETOPTS var$ block). This one branch point is the only place scope is decided client-side; the actual composed text always comes from composeSetOptsBlock on the server."
  - "The insert/replace text helper (blockInsertText) appends a trailing newline only when the composed result has at least one line, and emits the empty string for a zero-line composition — so an all-Leave edit-in-place selection deletes the existing reassignment lines outright rather than leaving a blank line between the origin and SETOPTS lines."
  - "setoptsInCodeCandidateLine is a pure, vscode-free three-keyword substring gate (SETOPTS, IOR(, AND( at or before the caret) — the authoritative safe/unsafe/editable decision always comes from decodeInCode's server response, never from this client-side heuristic, matching D-03's split between a cheap trigger gate and a server-authoritative decode."
  - "No CodeLens provider is registered by setopts-in-code-ui.ts, and setopts-composer-ui.ts's own config.bbx CodeLens was left untouched (grep-pinned at its pre-plan count of 1) — DISC-01's persistent per-line marker stays deferred to Phase 89, per this plan's own flagged-decision resolution recorded in 88-06-PLAN.md."
  - "Per Phase 87/88 precedent and this plan's own note, DISC-06 was NOT marked complete — its full user-facing wording spans both IDEs, and plan 88-05 (the IntelliJ tri-state dialog) has not yet landed. requirements-completed is empty; requirements mark-complete was not invoked."

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "D-03 (VS Code half): a RefactorRewrite Code Action on a .bbj line containing SETOPTS, IOR( or AND(, plus the bbj.composeSetoptsInCode command, open the in-code SETOPTS composer from the Command Palette and the editor context menu — the same trigger family as the MSGBOX/addWindow/addChildWindow composers"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-ui.test.ts#setoptsInCodeCandidateLine (Task 2, pure helper) (all 9 cases) and #registerSetOptsInCodeComposer / command routing (Task 2)#registers exactly one command and one Code Action provider scoped to the bbj language, no CodeLens"
        status: pass
      - kind: other
        ref: "grep -c \"language: 'bbj'\" bbj-vscode/src/setopts-in-code-ui.ts == 1; contributes.commands/menus/activationEvents entries in package.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-05/D-06: the tri-state Set/Clear/Leave webview renders the shared catalog and byte groups, and every preview/apply value comes from bbj/composer/setopts/composeTriState — never client-side arithmetic"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-ui.test.ts#setopts-tristate-webview.ts (Task 1)#change forwards the form selection through the sender and posts the preview back"
        status: pass
      - kind: other
        ref: "grep -c setoptsPreview bbj-vscode/src/setopts-tristate-webview.ts == 0; grep -c composeTriState == 1; grep -c nonce == 4 (>=2 required)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-04: an editable: false decode result shows the server's reason as a non-blocking message and applies no edit; an absolute-mode decode reuses the existing two-state openSetOptsComposerPanel rather than a second absolute-vector UI"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-ui.test.ts#registerSetOptsInCodeComposer / command routing (Task 2)#editable: false with found: true opens no panel and shows a message containing the server reason; #mode: absolute, editable: true opens the existing absolute SETOPTS panel"
        status: pass
    human_judgment: false
  - id: D4
    description: "EDGE/DISC-06/empty: invoking the command with no active .bbj editor (or a non-bbj active editor) shows a non-blocking hint and opens nothing; an all-Leave selection still applies a well-formed two-line block for compose-new and an empty reassignment region for an existing chain"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "test/setopts-in-code-ui.test.ts#no active editor (command palette, no arg) shows a non-blocking hint and opens nothing; #active editor with a non-bbj languageId (no arg) shows a non-blocking hint and opens nothing; test/setopts-in-code-ui.test.ts#setopts-tristate-webview.ts (Task 1)#all-Leave case: a chain target with an empty composed region replaces the range with the empty string (no line inserted); #all-Leave case: compose-new still inserts the two-line canonical block"
        status: pass
    human_judgment: false
  - id: D5
    description: "EDGE/DISC-06/ordering: the webview posts one entry per catalog bit in SETOPTS_BITS order (the client renders and reads back the same catalog-ordered DOM rows), so the block that reaches the document is the server's own deterministic composeSetOptsBlock ordering"
    requirement: "DISC-06"
    verification: []
    human_judgment: true
    rationale: "The row-order guarantee lives in the webview's own client-side <script> string (rendered inside a real VS Code webview iframe), which vitest's mocked-vscode harness cannot execute — the message-handler tests here only prove the extension-host side (compose/apply on whatever selection is posted). The ordering claim is structurally true by construction (renderCatalog iterates SETOPTS_BITS, readForm iterates the same rendered .tri-row elements in DOM order, which equals insertion order) but is not exercised by an automated test in this repo; a manual UAT check of the applied block's byte-then-bit ordering is the appropriate verification."
  - id: D6
    description: "No CodeLens is registered for .bbj files by this plan; the config.bbx CodeLens (setopts-composer-ui.ts) is untouched"
    requirement: "DISC-06"
    verification:
      - kind: other
        ref: "grep -c registerCodeLensProvider bbj-vscode/src/setopts-in-code-ui.ts == 0; grep -c registerCodeLensProvider bbj-vscode/src/setopts-composer-ui.ts == 1 (unchanged)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 06: SETOPTS-in-Code VS Code UI (Tri-State Webview, Code Action, Command) Summary

**VS Code half of D-03/D-05/D-06 ships: a RefactorRewrite Code Action + `bbj.composeSetoptsInCode` command on `.bbj` files open a Set/Clear/Leave tri-state webview that previews and applies exclusively through the server's `composeTriState`, routing `decodeInCode`'s absolute/chain/none verdict to the right panel or a non-blocking reason message.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `setopts-tristate-webview.ts` adapts `setopts-composer-webview.ts`'s panel-creation options, four-message protocol (`ready`/`change`/`apply`/`cancel`), and CSP/nonce discipline into a Set/Clear/Leave radio-group form over the shared `BYTE_GROUPS`/`SETOPTS_BITS` catalog — dropping the config.bbx-only mask-character and raw-hex-tail regions in favor of a read-only generated-block preview, with every preview and apply call forwarded through an injected `SetOptsInCodeRequestSender` to `bbj/composer/setopts/composeTriState`
- Four apply shapes are handled from one `blockInsertText` helper: a non-empty chain replaces `[startLine, endLine)` with the composed text plus a trailing newline; an equal-line chain (`startLine === endLine`) inserts at that position instead of replacing; a compose-new target (no chain) inserts the full canonical block at the active editor's cursor line; an all-Leave chain selection replaces the range with the empty string so the origin and `SETOPTS` lines end up adjacent with nothing between them
- `setopts-in-code-ui.ts` exposes `setoptsInCodeCandidateLine` (a pure, `vscode`-free gate matching `SETOPTS`/`IOR(`/`AND(` case-insensitively at or before the caret), a `RefactorRewrite` Code Action provider scoped to `{ language: 'bbj' }`, and the `bbj.composeSetoptsInCode` command handler, which sends `decodeInCode` and routes strictly on the response: `mode: 'absolute'` reuses the existing `openSetOptsComposerPanel` unchanged; `mode: 'chain'` with `editable: true` opens the new tri-state panel with the chain edit-in-place target and prefill; `found: false` opens the tri-state panel with no target (compose-new); `editable: false` with `found: true` shows the server's `reason` and opens nothing; a rejected request is caught and surfaced as a message rather than thrown
- No CodeLens provider is registered anywhere in this plan — a source-guard test and grep both pin `setopts-composer-ui.ts`'s existing config.bbx CodeLens at its pre-plan count of 1, leaving DISC-01's persistent per-line marker cleanly deferred to Phase 89
- `extension.ts`'s `activate()` calls `registerSetOptsInCodeComposer(context, (method, params) => client.sendRequest(method, params))` immediately after the existing `registerSetOptsComposer(context)` call — the sender closure is the only reference to `client`, so neither new UI module imports `vscode-languageclient` and both stay unit-testable under a mocked `vscode`
- `package.json` gained the `bbj.composeSetoptsInCode` command (category "BBj"), its `editor/context` menu entry (`when: "editorLangId == bbj"`, `group: "1_modification"`, matching the sibling composer entries), and its `onCommand:bbj.composeSetoptsInCode` activation event
- 33 new tests in `test/setopts-in-code-ui.test.ts` cover the webview's four apply shapes plus `change`/`cancel`, the candidate-line gate's positive/negative cases, all six command-routing outcomes (absolute, chain, not-found, not-editable, no-editor, non-bbj-editor, rejected request), and text/JSON wiring guards over `extension.ts`/`package.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Tri-state SETOPTS webview panel** - `442d7ee8` (feat)
2. **Task 2: Code Action and command entry points for `.bbj` files** - `cfe9bed0` (feat)
3. **Task 3: Activation wiring and package.json contributions** - `adcfad1c` (feat)

## Files Created/Modified
- `bbj-vscode/src/setopts-tristate-webview.ts` - New: `openSetOptsTriStateComposerPanel`, `SetOptsTriStateTarget`, `SetOptsTriStatePanelArg`, `SetOptsInCodeRequestSender`, the tri-state HTML/CSP/nonce panel and its message handler
- `bbj-vscode/src/setopts-in-code-ui.ts` - New: `registerSetOptsInCodeComposer`, `setoptsInCodeCandidateLine`, the `SetOptsInCodeActionProvider` and the `bbj.composeSetoptsInCode` command handler
- `bbj-vscode/test/setopts-in-code-ui.test.ts` - New: 33 tests across four `describe` blocks (webview message handling, the pure candidate-line helper, command routing, activation wiring guards)
- `bbj-vscode/src/extension.ts` - Import + one `activate()` call wiring `registerSetOptsInCodeComposer` with a `client.sendRequest`-forwarding closure
- `bbj-vscode/package.json` - `bbj.composeSetoptsInCode` command, `editor/context` menu entry, `onCommand:bbj.composeSetoptsInCode` activation event

## Decisions Made
- `SetOptsInCodeRequestSender` lives in `setopts-tristate-webview.ts` (Task 1 authored it first) and is imported into `setopts-in-code-ui.ts` (Task 2) — an either-way choice the plan explicitly authorized; recorded here as required.
- `scope` (`'reassignments'` vs `'block'`) is decided client-side from whether a chain target is present, since that decision is about *which region* the composed text replaces, not about *what* the composed text is — the actual bytes always come from the server's `composeSetOptsBlock`.
- The empty-string (not `'\n'`) replacement text for an all-Leave chain selection was chosen specifically so an existing chain's reassignment lines are deleted outright rather than leaving a stray blank line between the origin and `SETOPTS` lines, matching the plan's own "the origin and SETOPTS lines survive unchanged" wording.
- Per Phase 87/88 precedent and this plan's own explicit note, **DISC-06 was NOT marked complete** — its full user-facing wording spans both IDEs and plan 88-05 (IntelliJ tri-state dialog) has not yet landed. `requirements-completed` is empty; `requirements mark-complete` was not invoked.

## Deviations from Plan

None — plan executed exactly as written, including the plan's own explicitly pre-resolved "Code Action plus command only, no CodeLens" decision.

## Issues Encountered
One iteration on the test harness: `vi.mock('vscode', ...)`'s factory cannot reference top-level `const`/`class` declarations below it (they are in the temporal dead zone when the hoisted factory runs) — fixed by moving every mock class and mock function into a single `vi.hoisted(() => {...})` block, matching the constraint `vi.mock`'s own hoisting documentation describes. Caught immediately by the first test run; never reached a committed state.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 88-05 (IntelliJ tri-state dialog) is independent of this plan's files (`bbj-vscode/` only touched here, confirmed via `git diff --stat` showing no `bbj-intellij/` changes) and can land in either order relative to this plan
- Once 88-05 lands, DISC-06 can be marked complete via `requirements mark-complete DISC-06` — this plan intentionally left it pending
- Phase 89 (composer discoverability, DISC-01's persistent per-line marker) can build directly on this plan's Code Action/command entry point without any CodeLens code to remove first
- `cd bbj-vscode && npx vitest run test/setopts-in-code-ui.test.ts test/extension-activation.test.ts` exits 0 (33 + 2 tests, all pass)
- `cd bbj-vscode && npm run build` (tsc -b + esbuild) exits 0
- Whole-suite vitest run after this plan: 1422 passed, 28 skipped, 0 failed (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`) — no regressions introduced
- No other blockers

## Self-Check: PASSED

All 5 created/modified files verified present on disk; all 3 task commit hashes
(`442d7ee8`, `cfe9bed0`, `adcfad1c`) verified present in `git log --oneline --all`.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
