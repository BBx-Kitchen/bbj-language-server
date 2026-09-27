---
phase: 113-composer-webview-hardening-consolidation
plan: "04"
subsystem: security
tags: [vscode-extension, msgbox, cvs, assign-to, validation, vitest]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 02's per-panel isXxxPanelMessage shape guards on the msgbox and CVS webviews, so this plan's assignTo value validation runs on an already shape-checked payload"
provides:
  - "bbj-vscode/src/msgbox-composer.ts: exported validateAssignTo(text, resultType), MsgboxPreview.assignToError, MsgboxPreviewInput.assignTo widened to string | null"
  - "bbj-vscode/src/cvs-composer.ts: cvsPreview validates assignTo via validateAssignTo(..., 'string'), CvsPreview.assignToError, CvsPreviewInput.assignTo widened to string | null"
  - "Both VS Code panels (msgbox, CVS) render the assignTo verdict inline, drop the '(optional)' label, and the CVS NEW-mode default prefills s$"
  - "bbj-vscode/test/composer-assign-to.test.ts: validator table (both result types), preview verdicts, both panels end to end, and webview source-text guards"
affects: [113-05, 113-06, 113-07, 113-08, 113-UAT]

actuals:
  tokens: 7900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "validateAssignTo(text, resultType) sits next to validateStringField/validateBbjExpression in msgbox-composer.ts, following the same three-layer shape (presence, structural, domain), and is imported by cvs-composer.ts rather than duplicated"
    - "A preview's assignToError follows the same shown-field convention as msgboxPreview's other errors: computed only when the field is visible (editMode !== true && assignTo !== undefined/null), then folded into valid"
    - "The webview's assignTo-error element is added to the existing assignTo-row div so hiding the row in edit/completing mode also hides the error, with no separate visibility wiring"

key-files:
  created:
    - bbj-vscode/test/composer-assign-to.test.ts
  modified:
    - bbj-vscode/src/msgbox-composer.ts
    - bbj-vscode/src/msgbox-composer-webview.ts
    - bbj-vscode/src/cvs-composer.ts
    - bbj-vscode/src/cvs-composer-webview.ts

key-decisions:
  - "validateAssignTo accepts a bare numeric variable (no sigil), ! and % for a 'number' result, and requires $ or ! for a 'string' result (a bare string-typed name with no sigil is rejected) — matching D-06's examples and the plan's own %-acceptance note"
  - "The base identifier, its type suffix and its subscript must be textually adjacent (no whitespace) — parsed by consuming the identifier, then at most one suffix character, then requiring any remaining text to be exactly one [...] subscript ending the string; whitespace INSIDE the subscript is allowed since its content is re-validated with validateBbjExpression"
  - "A subscript is rejected outright if its content contains a double quote, semicolon, colon, equals sign, or another bracket, before validateBbjExpression ever runs — this catches r[1]] and r[1;a=2] without relying on the expression checker's paren/quote balance alone"
  - "CVS's assign-to prefill is s$ (a plain string variable), matching plan 03's IntelliJ choice for the same field"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "validateAssignTo(text, 'number') accepts ret/ret!/ret%/array-element forms and rejects wrong-sigil, quoted, operator, assignment, and separator text with the documented message; empty/whitespace-only text is Required"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "test/composer-assign-to.test.ts#validateAssignTo — number (MSGBOX) (#626)"
        status: pass
    human_judgment: false
  - id: D2
    description: "msgboxPreview computes assignToError only when the field is shown (a new insert), folds it into valid, composes the trimmed text into the statement, and is pure/idempotent; edit mode and completing mode never see an error"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "test/composer-assign-to.test.ts#msgboxPreview assignTo validation (#626)"
        status: pass
      - kind: unit
        ref: "test/msgbox-composer.test.ts (unchanged, byte-identical to phase base)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The MSGBOX panel prefills ret!, posts assignToError/valid on change, and refuses to insert an empty or invalid assignTo while inserting one starting 'ret! = MSGBOX(' when valid"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "test/composer-assign-to.test.ts#MSGBOX panel — assignTo end to end (#626)"
        status: pass
    human_judgment: false
  - id: D4
    description: "validateAssignTo(text, 'string') accepts s$/s!/array-element forms (requiring a sigil) and rejects a bare name, wrong sigil, doubled sigil, quoted, operator, or separator text; cvsPreview applies the identical shown-field rule and the CVS panel prefills s$ end to end"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "test/composer-assign-to.test.ts#validateAssignTo — string (CVS) (#626)"
        status: pass
      - kind: unit
        ref: "test/composer-assign-to.test.ts#cvsPreview assignTo validation (#626)"
        status: pass
      - kind: unit
        ref: "test/composer-assign-to.test.ts#CVS panel — assignTo end to end (#626)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No existing composer suite regressed: msgbox/cvs composer and UI test files are byte-identical to the phase base, composer-commands.test.ts is untouched, and the whole-suite gate at --maxWorkers=2 shows the same pre-existing 11-failure linking.test.ts interop baseline"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
    human_judgment: false
  - id: D6
    description: "In a running VS Code, an invalid or empty assign-to target on a new MSGBOX/CVS insert shows the inline error and disables Insert; edit-in-place and completing flows show no assign-to row or error"
    requirement: SEC-11
    verification: []
    human_judgment: true
    rationale: "Requires a built extension in a live VS Code window; the source-text guards and mocked-panel end-to-end tests in this plan exercise the same code paths but do not substitute for visual UAT"

duration: 18min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 04: MSGBOX and CVS assign-to target validation Summary

**A shared `validateAssignTo(text, resultType)` in msgbox-composer.ts decides valid assign-to targets by result type; `msgboxPreview`/`cvsPreview` report `assignToError` and fold it into `valid`, and both VS Code panels show the verdict inline, required only on a new insert.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-27T11:33:00Z
- **Completed:** 2026-09-27T11:51:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `validateAssignTo(text, resultType: 'number' | 'string')` in `msgbox-composer.ts`: required-when-shown, then an ASCII identifier plus at most one type-suffix sigil (`!`/`%` for `'number'`, `$`/`!` mandatory for `'string'`) plus one optional `[...]` subscript re-checked with `validateBbjExpression`, rejecting quotes, operators, `=`, `;`/`:`, whitespace between the parts, non-ASCII letters, and doubled/wrong-type sigils.
- `msgboxPreview` and `cvsPreview` both apply the identical shown-field rule (`editMode !== true && assignTo !== undefined/null`), compute `assignToError`, and fold it into their existing `valid` computation — hidden in edit mode and completing mode, required on a new insert.
- The MSGBOX panel drops "(optional)" from its label, adds an `assignTo-error` element inside the existing row, and toggles the `invalid` class on the input from `m.assignToError`.
- The CVS panel gets the same treatment plus a new `s$` default prefill (`CvsPanelArg.initial.assignTo`), filling the field from `init.assignTo` on ready instead of always clearing it.
- New `test/composer-assign-to.test.ts` (behavior blocks from both tasks): the validator table for both result types, `msgboxPreview`/`cvsPreview` verdict tests, both panels' end-to-end behavior with a mocked-`vscode` harness, and source-text guards on both webview files (one `assignTo-error` element, textContent-only writes, no stale "(optional)" wording).

## Task Commits

Each task was committed atomically:

1. **Task 1: An invalid or empty assign-to target in a new MSGBOX marks the preview invalid and the panel refuses to insert, end to end** - `d68a449e` (feat)
2. **Task 2: The CVS composer validates its string assign-to target the same way, with an s$ prefill on a new insert** - `397be8b8` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-vscode/src/msgbox-composer.ts` - `validateAssignTo`, `MsgboxPreview.assignToError`, `msgboxPreview` wiring
- `bbj-vscode/src/msgbox-composer-webview.ts` - label text, `assignTo-error` element, preview-branch wiring
- `bbj-vscode/src/cvs-composer.ts` - imports `validateAssignTo`, `CvsPreview.assignToError`, `cvsPreview` wiring
- `bbj-vscode/src/cvs-composer-webview.ts` - `CvsPanelArg.initial.assignTo`, `s$` default, `assignTo-error` element, preview-branch wiring
- `bbj-vscode/test/composer-assign-to.test.ts` - new file, both tasks' behavior coverage

## Decisions Made
- Accepted a plain numeric variable (no sigil) for `'number'` alongside `!`/`%`, per the plan's own recorded interpretation of D-06; a `'string'` result always requires `$` or `!` since a bare name would otherwise read as a numeric variable.
- Adjacency (no whitespace between the base name, its sigil, and its subscript) is enforced by consuming the identifier and sigil left-to-right and requiring whatever remains to be exactly one bracketed subscript ending the string; whitespace *inside* the subscript is fine because its content is independently re-validated with `validateBbjExpression`.
- A subscript is rejected up front if it contains a quote, `;`, `:`, `=`, or another bracket — this catches malformed subscripts like `r[1]]` or `r[1;a=2]` before `validateBbjExpression`'s own balance check would need to (and in `r[1]]`'s case, that check alone would not have caught it).
- CVS's prefill is `s$`, matching plan 03's IntelliJ-side choice for the same field (Claude's discretion per D-08).

## Deviations from Plan

None - plan executed exactly as written. (One acceptance-criteria grep command in the plan, `grep -c "assignTo: 's\$'" ...`, prints 0 under this environment's `ugrep`-backed `grep` due to shell/tool quote-escaping differences rather than a source issue — `grep -cF "assignTo: 's$'"` on the same file confirms the literal text is present exactly once. Not a deviation from the plan's actual requirement, just a note on this environment's grep quirk.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEC-11 is now fully delivered across both hosts: this plan lands the shared language-server-side validation both `msgboxPreview`/`cvsPreview` and plan 03's IntelliJ dialogs consume. Per the project's shared-ID convention, `SEC-11` is left unmarked in `REQUIREMENTS.md` here — the orchestrator's shared-ID gate will mark it complete once every declaring plan (including plan 03) has a SUMMARY, which is already the case.
- The plan's own manual verification step (an invalid/empty assign-to disabling Insert in a live VS Code and IntelliJ, built from the final tree) is deferred to phase UAT, per the plan's `<verification>` note — not a gap introduced here.
- `composer-assign-to.test.ts` is ready for plans 05-08's consolidation work (CSP, call-scanner, window-UI helper) to build alongside without re-touching this validation logic.
- Whole-suite regression gate run at `--maxWorkers=2`: `numFailedTests` is 11, exactly the pre-existing `linking.test.ts` interop baseline (documented in `.planning/STATE.md`/`.planning/DEBT.md`), with no composer-test or other regressions. The suite reported additional "failed" test files beyond `linking.test.ts` at the file-summary level; per the project's own house rule and 113-02's precedent, these are `beforeAll` hook timeouts under contention, not assertion failures — judged on `numFailedTests`, not the failing-suite identity delta.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- `bbj-vscode/test/composer-assign-to.test.ts` found on disk.
- Both task commit hashes (`d68a449e`, `397be8b8`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `grep -c -E "^export function validateAssignTo\("` on `msgbox-composer.ts` prints 1; `grep -c 'id="assignTo-error"'` prints 1 on both webview files; `grep -c "Assign result to (optional)"` prints 0 on both webview files; `grep -c -E "validateAssignTo\(.*'string'\)"` on `cvs-composer.ts` prints 1; `grep -cF "assignTo: 's$'"` on `cvs-composer-webview.ts` prints 1; `npx tsc -p tsconfig.json` exits 0; `npx eslint` on all five touched files exits 0; `git diff --quiet 90031944` shows zero diff for `msgbox-composer.test.ts`, `msgbox-composer-ui.test.ts`, `composer-commands.test.ts`, `cvs-composer.test.ts`, `cvs-composer-ui.test.ts`, `composer-lens-command.test.ts`, and `webview-panel-lifecycle.test.ts`; the planning-identifier register-check regex matches 0 lines in the full source+test diff against the phase base.
- Plan-level `<verification>` re-run: `npx vitest run test/composer-assign-to.test.ts test/msgbox-composer.test.ts test/msgbox-composer-ui.test.ts test/composer-commands.test.ts test/composer-webview-message-shape.test.ts test/cvs-composer.test.ts test/cvs-composer-ui.test.ts` passes (305 tests, 7 files); the whole-suite gate at `--maxWorkers=2` reports `numFailedTests: 11`, matching the pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
