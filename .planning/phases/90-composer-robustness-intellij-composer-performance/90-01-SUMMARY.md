---
phase: 90-composer-robustness-intellij-composer-performance
plan: 01
subsystem: composer
tags: [msgbox, vscode, webview, quickpick, staleness-guard, decode-outcome]

# Dependency graph
requires: []
provides:
  - "MsgboxDecodeCallResult.incomplete outcome for an unfinished MSGBOX( / MSGBOX() / MSGBOX(\"Hi\", call"
  - "span-exact msgboxCallStillMatches (exported MSGBOX_STALE_CALL_TEXT) shared by the picker and the panel"
  - "openMsgboxComposerPanel completing mode (\"Complete MSGBOX call\" title, no banner, no assign-to row)"
  - "captureComposeArgTarget: bbj.composeMsgbox picker re-resolves edit/insert against the live document before and after the wizard"
  - "position-aware bbj.composeMsgbox / bbj.composeMsgboxVisual: any found call under the cursor hands off to the visual panel instead of nesting"
affects: [90-07]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 12654
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composer decode incomplete outcome (mirrors CVS's 89-14 precedent), ported to MSGBOX's own replace/hasOptions field shape rather than copied verbatim"
    - "Span-exact staleness check (slice comparison plus a call-finder re-locate) shared between a QuickPick picker and a webview panel"
    - "Position-aware command entry point: decode the cursor before falling through to compose-new, so palette/context-menu invocations never nest inside an existing or unfinished call"

key-files:
  created: []
  modified:
    - bbj-vscode/src/msgbox-composer.ts
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/src/msgbox-composer-ui.ts
    - bbj-vscode/test/msgbox-composer.test.ts
    - bbj-vscode/test/msgbox-composer-ui.test.ts
    - bbj-vscode/test/composer-lens-command.test.ts

key-decisions:
  - "decodeMsgboxCall's new incomplete branch is inserted directly after the not-found return and before the existing hasExpr/canAddOptions branches, exactly where the plan specified — no reordering of the two pre-existing decode branches"
  - "msgboxCallStillMatches stays in msgbox-composer-webview.ts (not promoted to msgbox-composer.ts); the picker imports it directly from the webview module since msgbox-composer-ui.ts already imports vscode itself, matching the research's recommended split"
  - "captureComposeArgTarget only ever inspects the argument's own line (D-02 in the plan's language) — it re-locates the call with findMsgboxCallAt but never searches other lines or follows a moved call"
  - "runComposer's cursor-decode hand-off (Task 3) routes through the exact same msgboxPanelArgFromDecode/openMsgboxComposerPanel path the lightbulb and the composer cue use, so the QuickPick command, the visual command, the lightbulb and the cue all agree on what a given cursor position means"

patterns-established:
  - "A composer command with no structured argument decodes the cursor position before falling through to its own new-statement wizard, so no MSGBOX entry point (lightbulb, cue, palette, or context menu) can nest a statement inside an existing or unfinished call"

requirements-completed: []

coverage:
  - id: D1
    description: "An unfinished MSGBOX( / MSGBOX() / MSGBOX(\"Hi\", call decodes with its own incomplete outcome; every existing decode outcome is unchanged"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer.test.ts#decodeMsgboxCall on an unfinished call"
        status: pass
    human_judgment: false
  - id: D2
    description: "The lightbulb, cue, palette and context menu all open \"Complete MSGBOX call\" for an unfinished call, with no banner and no assign-to row, and Insert replaces only the call span"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer-ui.test.ts#openMsgboxComposerPanel completing an unfinished call"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer-ui.test.ts#position-aware MSGBOX commands"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/composer-lens-command.test.ts#msgbox: an unfinished call passes an argument whose target.incomplete is true"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bbj.composeMsgbox picker and the MSGBOX visual panel share one span-exact staleness check; the picker aborts on any document change that moves or alters its target"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer-ui.test.ts#bbj.composeMsgbox picker re-resolves its target before writing (#532)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/msgbox-composer-ui.test.ts#msgboxCallStillMatches is span-exact"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 01: MSGBOX Composer Robustness (VS Code) Summary

**An unfinished `MSGBOX(` call now completes in place instead of nesting a second call, and every MSGBOX entry point (lightbulb, cue, palette, context menu) re-checks its target against the live document before writing.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-09-12T19:47:00Z
- **Completed:** 2026-09-12T20:32:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- `decodeMsgboxCall` gains an `incomplete` outcome for `MSGBOX(`, `MSGBOX()` and a call whose options slot is open but empty (e.g. `MSGBOX("Hi",`), prefilling whatever message/title is already typed while every previously-decodable/add-options/compose-and-replace outcome is byte-for-byte unchanged.
- `msgboxCallStillMatches` becomes span-exact (slice match plus a `findMsgboxCalls` re-locate), exported as `MSGBOX_STALE_CALL_TEXT`, and is the one staleness check both the QuickPick picker and the visual panel call.
- `openMsgboxComposerPanel` grows a third "completing" mode: panel title `Complete MSGBOX call`, no compose-and-replace banner, no assign-to row, and Apply replaces the unfinished call's captured span through the same guarded write edit-in-place already used.
- `bbj.composeMsgbox`'s QuickPick `edit`/`insert` arguments are re-resolved against the live document twice — once before the wizard opens (`captureComposeArgTarget`) and once immediately before `editor.edit(...)` — aborting with a warning on any mismatch (#532 regression: inserted lines, changed text, a grown unterminated call, a vanished line, or a token that already differs before the wizard opens).
- `bbj.composeMsgbox` (no argument) and `bbj.composeMsgboxVisual` (no argument, or a non-panel argument such as a bare URI) both decode the cursor position first via the new `msgboxPanelArgAtCursor`, so the palette and the editor context menu can no longer nest a statement inside an existing or unfinished call; only a cursor with no MSGBOX call falls through to compose-new.

## Decode payloads for the four contract lines (verified via test)

- `{ line: 'x = MSGBOX(', character: 11 }` → `{"found":true,"incomplete":true,"edit":{"callStart":4,"callEnd":11},"trailingArgs":[],"initial":{"message":"","title":"","buttonSet":0,"icon":0,"defaultButton":0,"flags":[],"customButtons":[]},"hasOptions":false}`
- `{ line: 'x = MSGBOX()', character: 11 }` → the same, with `callEnd` 12
- `{ line: 'x = MSGBOX("Hi",', character: 16 }` → the same shape, `callEnd` 16, `message` `"Hi"`
- `{ line: 'x = MSGBOX("Hi", , "T")' }` → incomplete, `message` `"Hi"`, `title` `"T"`

## Panel title / lightbulb label per mode

| Mode | Panel title | Lightbulb / cue label |
|------|-------------|------------------------|
| Compose new | `MSGBOX Composer` | — (no call under cursor) |
| Edit (decodable expr / add-options / compose-and-replace) | `Edit MSGBOX` | `Configure MSGBOX options (…)` / `Add MSGBOX options…` / `Compose MSGBOX options (replaces expression)…` |
| Completing (unfinished call) | `Complete MSGBOX call` | `Complete MSGBOX call…` |

## #532 regression test names

In `bbj-vscode/test/msgbox-composer-ui.test.ts`, describe `bbj.composeMsgbox picker re-resolves its target before writing (#532)`:
- `an unchanged edit-arg call replaces exactly the captured token span`
- `a line inserted above during the wizard aborts with the stale warning and no edit`
- `the message text changing during the wizard aborts with the stale warning and no edit`
- `an unterminated call that grows during the wizard is refused by the span-exact check`
- `the edit-arg token already differing before the wizard opens aborts before showQuickPick is called`
- `the document losing its lines during the wizard aborts with the stale warning and no edit`
- `no argument on a plain statement composes new at the cursor, unchanged`

## Vitest pass counts for the touched test files

- `test/msgbox-composer.test.ts`: 42 passed
- `test/msgbox-composer-ui.test.ts`: 36 passed
- `test/composer-lens-command.test.ts`: 19 passed
- Combined run (`msgbox-composer.test.ts` + `msgbox-composer-ui.test.ts` + `composer-lens-command.test.ts` + `composer-commands.test.ts`): 115 passed

Whole-suite `npx vitest run` (no filter): 1741/1761 passed, 12 failed — all 12 are the documented pre-existing local environment drift (11 `linking.test.ts` interop tests + 1 `issue447-real-interop.test.ts` capability test, both caused by BBj being reachable on `:5008` in this devcontainer), unrelated to this plan's files. `npm run lint` and `npm run build` both pass clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lightbulb or cue on an unfinished `MSGBOX(` opens `Complete MSGBOX call` and replaces the call through the span-exact check** - `f7069c0d` (feat)
2. **Task 2: The `bbj.composeMsgbox` picker re-resolves its `edit`/`insert` target before writing and aborts on a mismatch (#532)** - `be741212` (feat)
3. **Task 3: Palette and context-menu MSGBOX commands open the call under the cursor instead of nesting a new statement inside it** - `fd0cdb71` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-vscode/src/msgbox-composer.ts` - `MsgboxDecodeCallResult.incomplete` and the new unfinished-call branch in `decodeMsgboxCall`
- `bbj-vscode/src/msgbox-composer-webview.ts` - `MsgboxEditTarget.incomplete`, span-exact `msgboxCallStillMatches`, exported `MSGBOX_STALE_CALL_TEXT`, and the completing mode of `openMsgboxComposerPanel`
- `bbj-vscode/src/msgbox-composer-ui.ts` - `captureComposeArgTarget`, the guarded picker, `msgboxPanelArgAtCursor`, `runComposeMsgboxVisualCommand`, and the cursor-decode hand-off in `runComposer`
- `bbj-vscode/test/msgbox-composer.test.ts` - unfinished-call decode test cases
- `bbj-vscode/test/msgbox-composer-ui.test.ts` - completing-mode panel tests, #532 picker regression tests, position-aware command tests
- `bbj-vscode/test/composer-lens-command.test.ts` - one msgbox cue test for the unfinished-call target

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed planning-register ids that leaked into source/test comments and test names**
- **Found during:** Task 3's own register-id verify step (`git diff HEAD` scan), then re-verified against the whole plan's diff (`git diff $BASE..HEAD`)
- **Issue:** Task 1 and Task 2 commits (already landed) contained decision-id references (`D-01` through `D-05`) inside doc comments, inline comments, and test/describe names in `msgbox-composer.ts`, `msgbox-composer-webview.ts`, `msgbox-composer-ui.ts`, `msgbox-composer.test.ts`, `msgbox-composer-ui.test.ts` and `composer-lens-command.test.ts` — a comment-discipline violation per this plan's `<interfaces>` block and the project's register-check rule
- **Fix:** Reworded every comment to describe the behavior in plain prose (no register ids) and stripped `(D-0x)`/`(D-0x/D-0y)` suffixes from test/describe names; GitHub issue numbers (`#532`, `#648`) were left untouched since those are explicitly allowed
- **Files modified:** all six files listed above (fixes folded into Task 3's commit since Task 1/2 were already committed)
- **Verification:** `git diff $BASE..HEAD -- bbj-vscode | grep '^+' | grep -nE '...'` (the plan's own register scan) now exits 1 (no matches); all touched test suites still pass (115/115 for the four target files, no change to test behavior)
- **Committed in:** `fd0cdb71` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — comment discipline).
**Impact on plan:** No functional change; a pure documentation/naming cleanup required by this plan's own comment-discipline rule. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `incomplete` wire field on `MsgboxDecodeCallResult`, the `Complete MSGBOX call` label/title, and the `MSGBOX_STALE_CALL_TEXT` wording are now in the tree exactly as specified in this plan's `<interfaces>` block, ready for plan 90-07 (IntelliJ) to consume without waiting on this plan.
- `composer-lens-command.ts` and `language/composer-codelens.ts` needed no code change — confirmed via the diff-stat guard (empty diff over `bbj-intellij`, `composer-lens-command.ts` and `language/`) and the new composer-cue test.
- No blockers for the remaining phase 90 plans (validation, addWindow/addChildWindow, listener disposal, IntelliJ debounce/cache) — this plan's files are isolated to the three MSGBOX modules and their tests.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED

All key files found on disk; all three task commits (`f7069c0d`, `be741212`, `fd0cdb71`) found in git log.
