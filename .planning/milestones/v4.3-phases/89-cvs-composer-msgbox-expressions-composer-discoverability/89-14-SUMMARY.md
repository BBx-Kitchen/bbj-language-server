---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 14
subsystem: composer
tags: [cvs, composer, vscode, lightbulb, codelens, gap-closure]

# Dependency graph
requires:
  - phase: 89-03
    provides: cvs-composer.ts catalog, mask helpers and the original decodeCvsCall/cvsPreview foundation
  - phase: 89-05
    provides: the VS Code CVS() lightbulb (cvsPanelArgAt, cvsCallStillMatches, the edit-in-place panel)
provides:
  - "CvsDecodeCallResult.incomplete: the unfinished/mask-less CVS() call decode outcome, replacing the retired missing-mask reason"
  - "a complete-the-call panel mode in cvs-composer-webview.ts, sharing the guarded replace/staleness path edit mode already used"
  - "cvsPanelArgAt support for incomplete calls, labeled 'Complete CVS() call...'"
  - "a position-aware runComposeCvsCommand backing bbj.composeCvs, so the Command Palette/editor context menu decode the cursor instead of always compose-new"
affects: ["89-15 (IntelliJ half of the same wire contract)", "89-16 (both-IDE verification and human re-run)"]

# Actuals (#2632)
actuals:
  tokens: 10093
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Completing mode (an unfinished CVS() call) reuses the editable panel's own guarded-replace/cvsCallStillMatches path rather than a separate write path — only the panel title, editMode/completing flags and assignTo omission differ."
    - "decodeCvsCall's editable and incomplete branches share one splitCharsAndTrailingArgs(args.slice(2)) helper so the ERR= vs chars split exists exactly once."

key-files:
  created: []
  modified:
    - bbj-vscode/src/cvs-composer.ts
    - bbj-vscode/src/cvs-composer-ui.ts
    - bbj-vscode/src/cvs-composer-webview.ts
    - bbj-vscode/test/cvs-composer.test.ts
    - bbj-vscode/test/cvs-composer-ui.test.ts
    - bbj-vscode/test/composer-codelens.test.ts
    - bbj-vscode/test/composer-lens-command.test.ts

key-decisions:
  - "incomplete stays editable:false (fail closed) so any consumer that doesn't read the new flag keeps refusing to rewrite the call — the codelens cue's existing found && editable gate needed no change to stay cue-free on half-typed lines."
  - "cvsCallStillMatches now also re-locates the call via findCvsCalls and requires callStart/callEnd to match exactly, not just the slice comparison — an unterminated call that grew (same text as a prefix) is refused as stale instead of silently leaving new characters dangling after a composed call."
  - "runComposeCvsCommand decodes the caret position before falling through to compose-new, so bbj.composeCvs from the Command Palette or editor context menu can no longer nest a whole new call inside a partial or existing one."

patterns-established:
  - "Position-aware command dispatch: an unknown command argument is checked for the panel-arg shape first (target/initial keys); anything else re-decodes the active editor's cursor before falling back to the argument-less default behavior."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "decodeCvsCall reports every unfinished or mask-less CVS() call (CVS(, CVS(), CVS(a$, CVS(a$,, and the closed CVS(a$)) as its own incomplete outcome, retiring the missing-mask reason; non-literal-mask and unknown-bits stay hard stops"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer.test.ts#decodeCvsCall reports an unfinished or mask-less call as incomplete, never missing-mask"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer.test.ts#decodeCvsCall preserves chars/ERR text after an empty mask position (incomplete outcome)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer.test.ts#CVS_NOT_EDITABLE_REASON_TEXT keeps exactly the two hard-stop reasons"
        status: pass
    human_judgment: false
  - id: D2
    description: "The VS Code lightbulb and panel compose into an unfinished call's span (complete-the-call mode), through the same span-exact cvsCallStillMatches guard edit mode uses, never nesting a second CVS("
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#an incomplete call returns a \"Complete CVS() call…\" target/initial the lightbulb uses"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#completing mode: insert replaces the captured span with a single call and no assign prefix, and disposes the panel"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#completing mode: refuses the write and shows the stale warning when the call grew"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#a same-prefix but grown unterminated call is refused even though the slice still matches"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer.test.ts#composing into an incomplete call span never nests a second CVS("
        status: pass
    human_judgment: false
  - id: D3
    description: "bbj.composeCvs (Command Palette, editor context menu) is position-aware: decodes the cursor and routes to edit/complete/reason-message/compose-new, and a CvsPanelArg argument (the lightbulb's) bypasses that decode entirely"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/cvs-composer-ui.test.ts#runComposeCvsCommand — position-aware bbj.composeCvs (#649)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Half-typed CVS() lines (CVS(, CVS(), CVS(a$, CVS(a$,) show no composer cue, while the editable 1+4 call keeps its cue; a mask-less cue click routes correctly with incomplete: true"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-codelens.test.ts#a CVS() call with a variable mask, no mask, an unfinished call, or a longer builtin name yields no cue"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/composer-lens-command.test.ts#cvs: a mask-less (incomplete) call opens the composer with cvsPanelArgAt(...).arg carrying incomplete: true, and shows no gone message"
        status: pass
    human_judgment: true
    rationale: "Live VS Code lightbulb/cue behavior in a real editor session is not exercised here — plan 89-16 stages the human re-run against the rebuilt extension."

duration: 16min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 14: CVS() Composer — Complete-the-Call for Unfinished Calls (VS Code half) Summary

**VS Code's CVS() lightbulb, panel and `bbj.composeCvs` command now compose into an unfinished or mask-less `CVS(` call instead of silently offering nothing or nesting a second call inside it, via a new `incomplete` decode outcome shared with IntelliJ over the wire.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-12T14:06:40Z (STATE.md handoff)
- **Completed:** 2026-09-12T14:22:08Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `decodeCvsCall` in `cvs-composer.ts` reports `a$ = CVS(`, `CVS()`, `CVS(a$`, `CVS(a$,` and the closed `CVS(a$)` as `{ found: true, editable: false, incomplete: true, edit, initial, trailingArgs }`, with no `reason` — retiring the `missing-mask` reason entirely (`CvsNotEditableReason` is now exactly `'non-literal-mask' | 'unknown-bits'`). A shared `splitCharsAndTrailingArgs` helper preserves any `chars`/`ERR=` text typed after the mask position for both the editable and incomplete branches.
- `cvs-composer-webview.ts` gains a "Complete CVS() call" panel mode: the string field stays editable/required (unlike edit mode's read-only string), the assign-to row is hidden, and Insert replaces the call's captured span through the exact same guarded write path (and `STALE_CALL_TEXT` warning) edit mode uses.
- `cvsCallStillMatches` is now span-exact: besides the existing text-slice comparison, it re-locates the call via `findCvsCalls` and requires the call to still start and end at the captured span — so an unterminated call the user kept typing (`CVS(a` → `CVS(a$`) is refused as stale instead of leaving new characters dangling after a composed call.
- `cvs-composer-ui.ts`'s `cvsPanelArgAt` now also builds a `"Complete CVS() call…"` lightbulb action for an incomplete call (the editable branch is behaviorally unchanged). `bbj.composeCvs` is rewired to a new exported `runComposeCvsCommand`: a `CvsPanelArg` argument opens unchanged; any other argument shape (no argument, or a document URI the editor context menu may pass) decodes the caret position and routes to edit mode, complete-the-call mode, a hard-stop reason message, or — only when no CVS call is under the cursor — the existing compose-new-at-cursor behavior.
- `composer-codelens.ts` needed no code change: the incomplete outcome keeps `editable: false`, so its existing `found && editable` cue gate already leaves half-typed CVS() lines cue-free; test coverage was extended to pin this directly.

## Task Commits

Each task followed its own RED (`test`) → GREEN (`feat`) TDD cycle:

1. **Task 1: Lightbulb on an unfinished `a$ = CVS(` composes into that call**
   - `6a7a6695` `test(89-14): add failing tests for the CVS() incomplete decode outcome`
   - `6eacb860` `feat(89-14): compose into an unfinished CVS() call instead of erroring (#649)`
2. **Task 2: Position-aware `bbj.composeCvs`, and cue behaviour pinned**
   - `48119ccc` `test(89-14): add failing tests for position-aware bbj.composeCvs and cue gating`
   - `858a52ce` `feat(89-14): make bbj.composeCvs position-aware, never nesting a call (#649)`

**Plan metadata:** committed alongside this SUMMARY (see final commit hash in the executor's completion report).

## Files Created/Modified

- `bbj-vscode/src/cvs-composer.ts` — the `incomplete` decode outcome; `CvsNotEditableReason` reduced to two members; shared chars/ERR= split helper
- `bbj-vscode/src/cvs-composer-ui.ts` — `cvsPanelArgAt` incomplete branch; new exported `runComposeCvsCommand`; module header rewritten for position-aware dispatch
- `bbj-vscode/src/cvs-composer-webview.ts` — `CvsEditTarget.incomplete`; span-exact `cvsCallStillMatches`; completing panel mode (title, init payload, hint text, hidden assign-to row)
- `bbj-vscode/test/cvs-composer.test.ts` — incomplete-decode, reason-key, ERR=/chars-preservation and splice-into-span tests
- `bbj-vscode/test/cvs-composer-ui.test.ts` — lightbulb, stale-check, completing-panel and `runComposeCvsCommand` tests
- `bbj-vscode/test/composer-codelens.test.ts` — half-typed CVS() lines stay cue-free
- `bbj-vscode/test/composer-lens-command.test.ts` — a mask-less cue click carries `incomplete: true`

## Decisions Made

- Kept `incomplete` outcome's `editable: false` (fail closed) rather than introducing a third boolean state on `editable` itself — a consumer that only checks `editable` (like the codelens cue) automatically stays correct with zero code change.
- Made `cvsCallStillMatches` span-exact via `findCvsCalls` rather than lengthening the captured `callText` comparison — the span-exact check is the only way to distinguish "unchanged" from "grew with the same prefix" for an unterminated call, whose span always runs to the line end.
- `runComposeCvsCommand` checks for the `CvsPanelArg` shape (`target`/`initial` own properties) before touching the active editor at all, so the lightbulb/cue-click path never triggers an unnecessary cursor decode.

## Deviations from Plan

None - plan executed exactly as written. (During authoring, the plan's own comment-discipline self-check caught two register-id tokens — `T-89-45` and `D-06` — introduced by an intermediate draft of two doc/test comments; both were reworded before any commit was made, so no committed text ever carried them. Not logged as a Rule 1-4 deviation since it was compliance with the plan's own required check, not unplanned work.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `incomplete` wire field (`CvsDecodeCallResult.incomplete`, `CvsEditTarget.incomplete`) is stable per the plan's `<interfaces>` contract — plan 89-15 can build the IntelliJ half against it unchanged.
- No file under `bbj-vscode/src/language` or `bbj-intellij/` was touched (verified by `git status --porcelain` and diff-stat checks), so plan 89-15 starts from a clean, unrelated-conflict-free tree.
- Whole-suite vitest: 1701 passed, 29 skipped, 0 failed (`RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`), matching the pre-existing baseline with no new failures.
- Live-IDE verification of the lightbulb/cue behavior in a real VS Code session is deferred to plan 89-16's human re-run, alongside the IntelliJ half.

## Self-Check: PASSED

- All 7 created/modified source and test files verified present on disk.
- All 4 task commits (`6a7a6695`, `6eacb860`, `48119ccc`, `858a52ce`) verified present in git log.
- All task-level `<acceptance_criteria>` re-run and passing (both tasks).
- Plan-level `<verification>` re-run: targeted test files (112/112 pass), `npm run build` (0 errors), `npm run lint` (0 errors), whole-suite vitest (1701 passed, 29 skipped, 0 failed), register-id scan over `3d910b6f..HEAD` (0 hits), `bbj-vscode/src/language` diff-stat (empty).

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*
