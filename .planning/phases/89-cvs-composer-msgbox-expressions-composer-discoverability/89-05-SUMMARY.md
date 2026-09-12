---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 05
subsystem: composer-discoverability
tags: [cvs, composer, webview, vscode, lightbulb]

# Dependency graph
requires:
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-03's vscode-free cvs-composer.ts (CVS_BITS, CVS_CHARS_TOOLTIP, decodeCvsCall, cvsPreview, describeCvsMask, encodeCvsMask) — the single source of truth for every mask/statement/validity value this panel renders"
provides:
  - cvs-composer-webview.ts — openCvsComposerPanel, CvsPanelArg, CvsEditTarget, cvsCallStillMatches
  - cvs-composer-ui.ts — registerCvsComposer, cvsPanelArgAt, the bbj.composeCvs command and CVS lightbulb
  - bbj.composeCvs VS Code command, editor/context menu entry and onCommand:bbj.composeCvs activation event
affects: [89-07-intellij-cvs-composer-command-layer, 89-09-additional-composer-kinds, 89-12-cvs-kind-wiring]

# Actuals (#2632)
actuals:
  tokens: 8970
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A flat (ungrouped) bit-list webview layout — one `#bits` container instead of per-group fieldsets — used when a catalog's own operations have no natural grouping, unlike addWindow's flag-groups or SETOPTS's byte-groups"
    - "A composer field that is disabled rather than hidden when the current selection makes it irrelevant, keeping the field's presence and tooltip visible at all times"

key-files:
  created:
    - bbj-vscode/src/cvs-composer-webview.ts
    - bbj-vscode/src/cvs-composer-ui.ts
    - bbj-vscode/test/cvs-composer-ui.test.ts
  modified:
    - bbj-vscode/src/extension.ts
    - bbj-vscode/package.json
    - bbj-vscode/test/extension-activation.test.ts

key-decisions:
  - "cvsCallStillMatches compares the live document's current text at the captured [callStart, callEnd) span against the panel's own captured callText — a plain string equality, no re-decode through the server (unlike SETOPTS-in-code's StaleEditGuard, which the plan explicitly did not ask for here); a mismatch or missing document shows a warning and writes nothing."
  - "The panel never disposes on a stale-call or invalid-preview refusal — only after a successful write — so the user can adjust the form and retry without reopening the composer."
  - "cvsPanelArgAt returns undefined for any not-editable verdict (missing mask, non-literal mask, or undocumented bits), so the lightbulb offers no action at all rather than a degraded compose-and-replace mode; CVS() has no expression-valued mask precedent to fall back to."

patterns-established:
  - "cvsPanelArgAt/CvsCodeActionProvider mirror addWindowPanelArgAt/AddWindowCodeActionProvider's exact shape (decode -> build target+initial -> label), so a future composer-cue dispatcher for the cvs kind can reuse cvsPanelArgAt exactly the way composer-lens-command.ts reuses addWindowPanelArgAt today."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "A VS Code user can run Compose CVS() (visual)… from the Command Palette or the editor context menu in a .bbj file, check operations in one flat list of the eight documented bits with no group headers or nested scroll container, watch the generated call update, and insert it at the cursor"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#openCvsComposerPanel (#649) — NEW mode insert/change tests"
        status: pass
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#cvs-composer-webview.ts source assertions (#649) — flat #bits container, no group-title/overflow-y"
        status: pass
    human_judgment: false
  - id: D2
    description: "The single chars field is disabled and visibly de-emphasized, never hidden, while none of bits 1/2/16/32/128 is checked; its tooltip names the BBj 19.0/19.10 version gates; the field accepts any text with no version check"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#cvs-composer-webview.ts source assertions (#649) — chars.disabled toggling from charsEnabled, CVS_CHARS_TOOLTIP wired to chars.title"
        status: pass
    human_judgment: false
  - id: D3
    description: "Insert is disabled whenever the preview reports valid: false, and the extension refuses to write an invalid preview even if a message arrives anyway"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#openCvsComposerPanel (#649) — 'an invalid preview is never inserted, even on insert'"
        status: pass
    human_judgment: false
  - id: D4
    description: "On an existing CVS(...) call whose mask is a literal sum, the lightbulb offers Configure CVS() options (<summary>) pre-filled with the string argument read-only and preserved verbatim; Apply replaces only that call span; a call with any other mask gets no lightbulb action"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#cvsPanelArgAt and CVS lightbulb (#649)"
        status: pass
    human_judgment: false
  - id: D5
    description: "If the call text at the captured span changed between opening the panel and Apply, nothing is written and a message says the call changed"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer-ui.test.ts#openCvsComposerPanel (#649) — missing-document and changed-call-text refusal tests"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visible panel rendering, checkbox interaction and lightbulb popup in a running VS Code editor actually work end to end"
    verification: []
    human_judgment: true
    rationale: "This plan proves the panel's message protocol, decode/compose routing and manifest wiring entirely from source/unit tests under a mocked vscode module. No real VS Code extension host or webview render was exercised here — a live check belongs to the phase's end-of-phase UAT."

duration: 14min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 05: VS Code CVS() Composer Panel Summary

**A webview panel (`bbj.composeCvs`) that composes a new `CVS(...)` call or edits an existing literal-mask call in place through one flat checkbox list of the eight documented bits, with a disabled-not-hidden `chars` field and a valid-gated, stale-checked write.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-12T08:30:19Z (first task commit)
- **Completed:** 2026-09-12T08:34:54Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `cvs-composer-webview.ts`: `openCvsComposerPanel` renders the CVS() composer panel in both NEW mode (compose a fresh call at the cursor) and EDIT mode (from the lightbulb, string argument read-only, only bits/chars editable). Every mask, statement and validity value is computed by calling `cvsPreview` from plan 89-03's `cvs-composer.ts` — the webview module performs no mask arithmetic of its own.
- The panel's flat HTML/script layout renders all eight `CVS_BITS` into a single `#bits` container (no per-group fieldsets, no nested scroll region), keeps the `chars` input's `disabled` property and dimmed opacity synced to each `preview` message's `charsEnabled`, carries `CVS_CHARS_TOOLTIP` as the field's `title`, and assigns every user-derived value through `textContent` inside the same nonce-CSP shape the MSGBOX and addWindow panels use.
- `cvsCallStillMatches(currentLineText, target)` — a pure string-slice comparison against the call's captured text — gates every EDIT-mode write: a missing open document or a changed call span shows "The CVS() call changed since the composer opened; nothing was applied." and writes nothing, without disposing the panel so the user can retry.
- `cvs-composer-ui.ts`: `registerCvsComposer` registers the `bbj.composeCvs` command and one `RefactorRewrite` Code Action provider for `{ language: 'bbj' }`. `cvsPanelArgAt(uri, line, lineText, character)` decodes the call via `decodeCvsCall`, returning `undefined` for any not-editable verdict (missing mask, non-literal mask, undocumented bits) or no call at all, and otherwise builds the `CvsEditTarget`/initial selection plus a `Configure CVS() options (<summary>)` label from `describeCvsMask`/`encodeCvsMask` — the same shape `addWindowPanelArgAt` established for addWindow.
- `package.json` gained the `bbj.composeCvs` command (`Compose CVS() (visual)…`), its `editor/context` menu entry (`editorLangId == bbj`, group `1_modification`) and the `onCommand:bbj.composeCvs` activation event; `extension.ts` calls `registerCvsComposer(context)` at activation.

## Task Commits

Each task followed its own RED/GREEN cycle (`tdd="true"`):

1. **Task 1 (`type="tracer"`): Compose and edit a CVS() call in a VS Code panel — flat bit list, disabled chars field, valid-gated write**
   - `e1bd04c5` test(89-05): add failing test for VS Code CVS() composer panel
   - `3e2507ef` feat(89-05): VS Code CVS() composer panel — flat bit list, disabled chars, valid-gated write
2. **Task 2: Contribute the CVS composer to the VS Code manifest and keep activation tests isolated**
   - `99a0ec90` test(89-05): add failing test for CVS composer package.json manifest entries
   - `cfabd546` feat(89-05): contribute the CVS composer to the VS Code manifest

_Task 1 is `type="tracer"`; its own `<verify>` (targeted tests + build) was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-vscode/src/cvs-composer-webview.ts` - Panel lifecycle, message protocol (`ready`/`change`/`insert`/`cancel`), stale-call guard, flat bit-list HTML/script
- `bbj-vscode/src/cvs-composer-ui.ts` - `registerCvsComposer`, `cvsPanelArgAt`, `CvsCodeActionProvider`
- `bbj-vscode/src/extension.ts` - Registers `registerCvsComposer(context)` at activation
- `bbj-vscode/package.json` - `bbj.composeCvs` command, editor/context entry, activation event
- `bbj-vscode/test/cvs-composer-ui.test.ts` - New file: full behaviour + manifest + source-text coverage
- `bbj-vscode/test/extension-activation.test.ts` - Adds the `cvs-composer-ui.js` mock beside the other composer mocks

## Decisions Made
- `cvsCallStillMatches` is a plain string-slice comparison against the captured `callText`, not a re-decode through the server — the plan specified this simpler check (unlike SETOPTS-in-code's `StaleEditGuard`), matching the scope of a single-call, single-argument edit.
- The panel disposes only on a successful write; a stale-call or invalid-preview refusal leaves the panel open so the user can adjust and retry.
- `cvsPanelArgAt` returns `undefined` (no lightbulb action at all) for every not-editable verdict rather than a degraded compose-and-replace mode — CVS() has no MSGBOX-style expression-valued-options precedent to fall back to.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a bare decision-id token from a `cvs-composer-ui.ts` comment**
- **Found during:** Post-implementation register check (project rule: no plan/decision/threat ids in source or test comments)
- **Issue:** A doc comment on `cvsPanelArgAt` cited `D-14` directly.
- **Fix:** Reworded the comment to describe the behavior ("gets no lightbulb action") instead of naming the decision id.
- **Files modified:** `bbj-vscode/src/cvs-composer-ui.ts`
- **Verification:** `git diff` over the full plan range for `bbj-vscode/src`/`bbj-vscode/test` shows zero matches for `89-[0-9]{2}|D-[0-9]{2}|T-89-[0-9]+|Pitfall [0-9]|C-[0-9]{2}|CR-[0-9]{2}`; targeted tests and lint still pass after the edit.
- **Committed in:** `cfabd546` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (comment-discipline cleanup, no behavior change).
**Impact on plan:** No scope creep.

## Issues Encountered
One test-authoring mistake was caught and self-corrected during Task 1's RED/GREEN cycle (not a deviation from the plan): the first draft of the "sets user-derived values via textContent, never innerHTML" source assertion used a regex (`/\.innerHTML\s*=\s*[^'"]/`) that could backtrack its own `\s*` into matching the space before an empty-string literal, producing a false failure against the legitimate `bitsHost.innerHTML = '';` container-clear. Corrected to `/\.innerHTML\s*=\s*[^'"\s]/` before the GREEN commit, which still fails on any innerHTML assignment of a real (non-empty, non-whitespace) value.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `cvs-composer-webview.ts`/`cvs-composer-ui.ts` deliver the complete VS Code half of DISC-03: `openCvsComposerPanel`, `CvsPanelArg`, `cvsCallStillMatches`, `registerCvsComposer` and `cvsPanelArgAt`, all built on plan 89-03's `cvs-composer.ts` with zero duplicated mask arithmetic.
- `cvsPanelArgAt` is exported in the same shape `addWindowPanelArgAt` established, ready for:
  - Plan 89-07 to expose the same `cvs-composer.ts` module through a `bbj/composer/cvs/*` shared command layer for IntelliJ.
  - Plan 89-09 to add a CVS() cue to the shared composer CodeLens using `cvsPanelArgAt` as the click-through argument builder.
  - Plan 89-12 to wire the `cvs` kind into IntelliJ's `ComposerLensKinds` once the IntelliJ composer exists.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 3 created files verified present on disk (`cvs-composer-webview.ts`, `cvs-composer-ui.ts`,
`cvs-composer-ui.test.ts`). All 4 commit hashes (`e1bd04c5`, `3e2507ef`, `99a0ec90`, `cfabd546`)
verified present in `git log`. Plan-level `<verification>` steps re-run and passing: targeted
tests (45/45 across `cvs-composer-ui.test.ts`, `cvs-composer.test.ts`, `extension-activation.test.ts`),
`npm run build` (exit 0), `npm run lint` (exit 0), whole-suite gate at `numFailedTests: 0`
(1628 passed, 29 skipped under `RUN_BBJ_TESTS=0`, `--maxWorkers=2`), and the register check
across the full plan diff range (`e1bd04c5~1..HEAD`) with zero matches after the one auto-fix
above.
