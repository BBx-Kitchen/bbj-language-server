---
phase: 90-composer-robustness-intellij-composer-performance
plan: 02
subsystem: composer
tags: [addwindow, addchildwindow, vscode, webview, validation, msgbox-composer]

# Dependency graph
requires:
  - phase: 90-composer-robustness-intellij-composer-performance
    provides: "validateBbjExpression / validateStringField / expressionDisplayText from the MSGBOX composer scaffolding (#426), reused unchanged"
provides:
  - "validateNumericField(text) in addwindow-composer.ts: rejects a bare quoted number/text in a numeric field, accepts everything else"
  - "AddWindowPreview / AddChildWindowPreview per-field error strings plus a valid: boolean, computed by addwindowPreview / addchildwindowPreview and skipped entirely in edit mode"
  - "addwindow-composer-webview.ts / addchildwindow-composer-webview.ts: inline field errors, invalid input styling, Insert disabled from valid, and an extension-side `if (!r.valid) break;` guard on the insert handler"
affects: [90-06]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 11048
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-field error strings plus a single valid boolean on a composer preview payload (the MSGBOX msgboxPreview template), now shared by all three window/message composers"
    - "Extension-side `if (!r.valid) break;` guard recomputes the preview from the submitted payload at insert time, independent of the webview's own disabled-button state"

key-files:
  created:
    - bbj-vscode/test/window-composer-validation-ui.test.ts
  modified:
    - bbj-vscode/src/addwindow-composer.ts
    - bbj-vscode/src/addwindow-composer-webview.ts
    - bbj-vscode/src/addchildwindow-composer.ts
    - bbj-vscode/src/addchildwindow-composer-webview.ts
    - bbj-vscode/test/addwindow-composer.test.ts
    - bbj-vscode/test/addchildwindow-composer.test.ts
    - bbj-vscode/test/composer-commands.test.ts

key-decisions:
  - "validateNumericField lives in addwindow-composer.ts and is imported (not duplicated) into addchildwindow-composer.ts for its id field, matching the plan's key_links contract"
  - "receiver/sysgui/window/context stay structural-only (validateBbjExpression); only title gets the String-typing check (validateStringField) and only x/y/width/height/id get the numeric check — no field became required and no valid expression (e.g. `BBjAPI().openSysGui(\"X0\")`, `sysgui!.getAvailableContext()`, `win!.getParent()`) is rejected"
  - "edit mode sets valid: true and defines no error keys unconditionally — the free-text fields are never written in that mode, so there is nothing to validate"

patterns-established:
  - "A composer preview function validates each free-text field with the field's own rule (structural / string-typed / numeric), sets an error key only on failure, and derives `valid` as the AND of all error keys being absent — the same shape msgboxPreview already established, now reused verbatim rather than re-invented"

requirements-completed: []

coverage:
  - id: D1
    description: "A malformed addWindow field (a quoted number, an unterminated literal, a bare numeric title) shows its error under the field, disables Insert, and a forced insert message applies no edit"
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/addwindow-composer.test.ts#addwindowPreview field validation (#623)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/window-composer-validation-ui.test.ts#addWindow panel refuses malformed fields (#623)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The same per-field validation and insert guard for addChildWindow, including its own id field's numeric check"
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/addchildwindow-composer.test.ts#addchildwindowPreview field validation (#623)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/window-composer-validation-ui.test.ts#addChildWindow panel refuses malformed fields (#623)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The valid flag and per-field errors travel unchanged through the thin bbj/composer/addwindow/preview and bbj/composer/addchildwindow/preview LS handlers, so the IntelliJ dialogs (plan 90-06) can gate on the same payload"
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "bbj-vscode/test/composer-commands.test.ts#addwindow/preview and addchildwindow/preview malformed-field pass-through"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 02: addWindow / addChildWindow Field Validation Summary

**A quoted number or an unquoted title typed into an addWindow/addChildWindow composer field is now rejected with an inline message before Insert can write it, on both the panel and the extension-side guard.**

## Performance

- **Duration:** 40 min
- **Tasks:** 2
- **Files modified:** 7 (plus 1 new test file)

## Accomplishments

- `validateNumericField` in `addwindow-composer.ts`: accepts blank text and any ordinary expression, but rejects a bare `"..."` string literal standing in for a number — `"10"` suggests `Not a number — remove the quotes: 10`, `"wide"` gives `Not a number — use a number or a numeric variable`, and any unbalanced/unterminated literal reports the same structural message `validateBbjExpression` already gives MSGBOX.
- `AddWindowPreview` gains `receiverError`/`sysguiError`/`titleError`/`xError`/`yError`/`widthError`/`heightError` (optional strings) plus `valid: boolean`; `AddChildWindowPreview` gains the same shape with `windowError`/`idError`/`contextError` in place of `sysguiError`. Both are computed once inside `addwindowPreview`/`addchildwindowPreview` and are always absent (with `valid: true`) in edit mode, since edit mode never writes the free-text fields.
- Both webview panels render each error under its field, toggle an `invalid` CSS class on the input, disable the Insert button from `valid`, and keep an `if (!r.valid) break;` guard in the `insert` message handler — so a forced `insert` postMessage (bypassing the disabled button) still writes nothing.
- `bbj/composer/addwindow/preview` and `bbj/composer/addchildwindow/preview` are unmodified thin pass-throughs; `composer-commands.test.ts` now pins that the new fields survive that layer unchanged, which is the exact wire contract plan 90-06 (IntelliJ) will read.

## Task Commits

Each task was committed atomically:

1. **Task 1: A malformed addWindow field shows its error under the field, disables Insert, and a forced Insert writes nothing** - `c66ca745` (feat)
2. **Task 2: The addChildWindow composer gets the same field validation, and both previews carry `valid` through the thin handlers** - `7366b0f4` (feat)

## Files Created/Modified

- `bbj-vscode/src/addwindow-composer.ts` - `validateNumericField` plus the seven `AddWindowPreview` error fields and `valid`
- `bbj-vscode/src/addwindow-composer-webview.ts` - inline error markup/CSS, disabled-Insert script, insert-handler guard
- `bbj-vscode/src/addchildwindow-composer.ts` - the nine `AddChildWindowPreview` error fields and `valid`, reusing `validateNumericField`
- `bbj-vscode/src/addchildwindow-composer-webview.ts` - same markup/CSS/script/guard shape as the addWindow panel
- `bbj-vscode/test/addwindow-composer.test.ts` - `addwindowPreview field validation (#623)` describe
- `bbj-vscode/test/addchildwindow-composer.test.ts` - `addchildwindowPreview field validation (#623)` describe
- `bbj-vscode/test/composer-commands.test.ts` - `valid`/`xError`/`idError` pass-through assertions
- `bbj-vscode/test/window-composer-validation-ui.test.ts` (new) - mocked-`vscode` panel harness covering both panels' insert-refusal behavior and source-level markup/guard assertions

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Comment discipline] Two source comments leaked a planning decision id**

- **Found during:** Task 2's plan-level register scan (`git diff | grep -E '\bD-[0-9]{2}\b'`)
- **Issue:** The edit-mode doc comments added in Task 1 and Task 2 read `...they are never validated (D-09).` and `...only flagged with a suggested fix (D-06).` — both cite a planning decision id directly in source comments, which the phase's comment-discipline rule and the plan's own register scan forbid.
- **Fix:** Reworded both comments to drop the parenthetical id, keeping the substantive explanation (`bbj-vscode/src/addwindow-composer.ts`, `bbj-vscode/src/addchildwindow-composer.ts`).
- **Verification:** Re-ran the plan's register scan (`git diff 63f69d65..HEAD -- bbj-vscode | grep '^+' | grep -nE ...`) — zero matches.
- **Committed in:** `7366b0f4` (folded into the Task 2 commit, since the fix predates that commit and both affected files are otherwise part of it)

---

**Total deviations:** 1 auto-fixed (comment discipline).
**Impact on plan:** No behavior change; source-only wording fix required by the plan's own verification gate.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `AddWindowPreview`/`AddChildWindowPreview` wire contract (error keys + `valid`) is stable and unchanged from what plan 90-06 (IntelliJ dialogs) expects per the plan's `<interfaces>` block.
- DISC-07 stays `Pending` in REQUIREMENTS.md — it is also declared by plans 90-06 and 90-08, per the shared-ID gate (`requirements.ready-ids` reported 0/1 ready); it will flip to Complete once the last declaring plan lands its SUMMARY.
- No blockers for the remaining 90-03..90-08 plans.

## Self-Check: PASSED

All key files (`addwindow-composer.ts`, `addwindow-composer-webview.ts`, `addchildwindow-composer.ts`, `addchildwindow-composer-webview.ts`, and their four test files) confirmed present on disk; commits `c66ca745` and `7366b0f4` confirmed present in `git log`.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*
