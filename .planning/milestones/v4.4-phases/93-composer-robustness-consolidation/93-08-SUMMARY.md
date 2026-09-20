---
phase: 93-composer-robustness-consolidation
plan: 08
subsystem: composer-setopts-validation
tags: [setopts, validation, intellij, swing, source-guard]

# Dependency graph
requires:
  - phase: 93-composer-robustness-consolidation (plan 02)
    provides: "SetOptsPreview.valid/rawTailError and SetoptsComposeTriStateResult.valid on the wire, plus their Java DTO mirrors in ComposerModels.java"
  - phase: 93-composer-robustness-consolidation (plan 06)
    provides: "The base+thin-subclass precedent this plan's dialogs did not need to follow (SETOPTS dialogs are not part of the addWindow family), and the current shape of ComposerFieldValidationSourceGuardTest this plan widens"
provides:
  - "SetoptsComposerDialog gates OK on the server's own valid verdict; its client-side raw-tail hex rule (regex + message) is deleted entirely"
  - "SetoptsTriStateComposerDialog gates OK on the composeTriState response's own valid (fail-closed response-integrity) verdict"
  - "ComposerFieldValidationSourceGuardTest widened from two dialogs to four, plus a combined negative sweep against a client-side character-class regex reappearing in any of the four"
  - "SetoptsComposerDialogSourceGuardTest's two tests describing the deleted raw-tail rule replaced with tests describing the new server-rendered behavior"
affects: []

actuals:
  tokens: 4300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Server owns validation; dialogs render its verdict -- now true of all six composer dialogs, not four"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java

key-decisions:
  - "D-09 rejection reasoning implemented as written: no second validation gate at ComposerLauncher's write path. ComposerLauncher.java was not touched by this plan -- #607 closes on the dialog-side server verdict across all six dialogs plus the launcher's existing empty-value guards in openMsgbox/applyHexEdit/openSetopts, not on a new write-path check."
  - "The mask-replacement-character rule (isValidMaskChar) deliberately stays client-side, per D-08's flagged scope -- only the raw-tail regex moved server-side. Left untouched and re-verified as present after the edit."
  - "SetoptsTriStateComposerDialog.apply(...) reads result.valid directly (not a locally-named field or helper) since the dialog has no per-field errors of its own to render alongside it -- the verdict is the only thing plan 93-02 added to that response."

requirements-completed: [COMP-04]

coverage:
  - id: D1
    description: "SetoptsComposerDialog gates OK on the server's valid verdict and holds no validation rule or message of its own -- the client-side raw-tail regex and its message are deleted"
    requirement: "COMP-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java#theSetoptsDialogGatesOkOnTheServerVerdictAndHoldsNoValidationRuleOfItsOwn"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java#theDeletedRawTailRuleCannotReturnUnnoticed"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java#applyRendersTheServersRawTailErrorAndTheLabelIsNeverAssignedAMessageLiteral"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew test (992 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false
  - id: D2
    description: "SetoptsTriStateComposerDialog gates OK on the composeTriState response's own fail-closed valid verdict instead of enabling unconditionally"
    requirement: "COMP-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java#theSetoptsTriStateDialogGatesOkOnTheServerVerdictAndHoldsNoValidationRuleOfItsOwn"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew test (992 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No second validation gate exists on ComposerLauncher's write path; #607 closes on the dialog-side verdict across all six dialogs plus the launcher's existing empty-value guards (D-09)"
    verification:
      - kind: other
        ref: "git diff --stat across all three task commits shows zero changes to ComposerLauncher.java"
        status: pass
    human_judgment: false
  - id: D4
    description: "The raw-tail message a user sees for an invalid hex tail is byte-identical to what the deleted Java copy produced -- no observable text change"
    verification: []
    human_judgment: true
    rationale: "The server's rawTailError wording was confirmed byte-identical to the deleted Java message by reading both sources (plan 93-02's SUMMARY documents the exact string), but no headless JUnit test in this build exercises the live LSP round trip end-to-end with a real language server response -- this requires opening SetoptsComposerDialog in the IDE, typing a non-hex character into the raw-hex field, and confirming the same message text and Apply-disabled behavior as before this phase, per this plan's own <verification> section."

duration: ~20min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 08: SETOPTS Dialog-Side Server Validation Summary

**Both SETOPTS composer dialogs now gate OK/Apply on the language server's own verdict instead of enabling unconditionally, and the last client-side validation rule in the composer surface (`SetoptsComposerDialog`'s Java hex regex) is deleted -- closing COMP-04/#607.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-18T10:17:03Z
- **Tasks:** 3
- **Files modified:** 4 (2 dialogs, 2 source-guard test files)

## Accomplishments

- `SetoptsComposerDialog.refresh()` no longer validates the raw hex tail at all: it reads `rawTailField.getText()` and passes it straight through on every request. `apply(SetoptsPreview p)` now gates OK on `p.valid` (was `setOKActionEnabled(true)` unconditionally) and renders `p.rawTailError` next to the field, using the same null-to-single-space convention the other dialogs use for per-field errors. The digit-bound constant (`MAX_RAW_TAIL_DIGITS`) and the `.matches(...)` pattern test are deleted entirely -- no message text was re-authored, the server emits the same wording the deleted Java copy held.
- `SetoptsTriStateComposerDialog.apply(...)` now gates OK on `result.valid` instead of enabling unconditionally. The dialog has no selection-level rejection rule of its own; the verdict is fail-closed response integrity -- a malformed or partial `composeTriState` response now leaves Apply disabled rather than writing a composition that never arrived.
- Across all six composer dialog files combined, `setOKActionEnabled(true)` now appears zero times -- confirmed by a direct grep sweep, not just the widened guard.
- `ComposerFieldValidationSourceGuardTest` widened from two dialogs (the addWindow family) to four, adding `SetoptsComposerDialog` and `SetoptsTriStateComposerDialog`, plus a new combined negative sweep across all four asserting neither a hand-written character-class regex literal nor a bare `.matches(` call ever reappears in any of them.
- `SetoptsComposerDialogSourceGuardTest`'s two tests describing the deleted rule were replaced rather than patched: the combined validate-before-request test now covers only the remaining mask check (renamed to say so explicitly); a new test asserts the deleted digit-bound constant and `.matches(` call cannot silently return; and the ordering test for a branch that no longer exists is replaced by a test asserting `apply(SetoptsPreview)` renders the server's `rawTailError` exactly once and that the raw-tail label is never assigned an author-written message literal.
- `ComposerLauncher.java` (the write path) was not touched by this plan -- confirmed via `git diff --stat` across all three commits -- upholding D-09's "no second validation gate at the write path" decision exactly as the plan required.
- Full `bbj-intellij` suite: 992 tests, 0 failures, 0 errors (forced re-run with `--rerun`, not a cached result).
- `COMP-04` marked `Complete` in REQUIREMENTS.md -- the seventh and final requirement for Phase 93.

## Task Commits

1. **Task 1: Gate the SETOPTS dialog on the server verdict and delete its Java rule** - `8c6d8a94` (feat)
2. **Task 2: Gate the tri-state SETOPTS dialog on its own server verdict** - `372c7a1a` (feat)
3. **Task 3: Widen the validation guard to four dialogs and replace the guards describing the deleted rule** - `4b1f7dd7` (test)

_No separate plan-metadata commit; this SUMMARY, STATE.md, ROADMAP.md and REQUIREMENTS.md updates are committed together per the final_commit step._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java` - deleted `MAX_RAW_TAIL_DIGITS` and the raw-tail regex/message branch; `refresh()` now passes the raw tail through unconditionally; `apply(SetoptsPreview)` gates OK on `p.valid` and renders `p.rawTailError`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java` - `apply(...)` gates OK on `result.valid` instead of enabling unconditionally
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java` - widened from two to four dialogs, plus a combined negative sweep for a reappearing client-side character-class rule
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java` - replaced the two tests describing the deleted raw-tail rule; kept the mask/layout/catalog tests unchanged

## Decisions Made

- Kept `isValidMaskChar` and its early-return branch exactly as they were -- D-08 scopes the server-side move to the raw-tail regex only, and this plan did not widen that scope.
- Did not touch `ComposerLauncher.java` or add any second validation call near the write path, per D-09's explicit rejection reasoning (re-running a server round trip inside a `WriteCommandAction` is forbidden by the Phase 79 EDT-01 convention, and re-implementing the rule in Java is the exact duplication this plan deletes). The capability already exists on the wire (`bbj/composer/msgbox/validateString`); the decision was never to add a second call site for it.
- Wrote the new source-guard tests to check for the structural literal `.matches(` and a generic `"[0-9` character-class opener rather than restating any user-facing message text, per the plan's instruction to describe forbidden literals in prose rather than duplicating them as string constants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Self-introduced `D-08` planning-identifier citations removed before commit**
- **Found during:** Task 3 (register-check pass before final commit)
- **Issue:** While writing rationale comments citing `#607`, several of my own comments (in `SetoptsComposerDialog.java`'s `refresh()` and in the two rewritten test files) also cited `D-08` alongside it. The plan's `prohibitions` explicitly forbid any planning identifier (`COMP-04`, `D-08`, `D-09`, `D-11`, plan numbers, `C-xx`, `CR-xx`) appearing in source or test files -- this applied to my own new comments, not just pre-existing ones.
- **Fix:** Removed the `D-08` token from every comment I authored, keeping the `#607` GitHub issue citation. Pre-existing `D-07`/`D-08`/`D-09`/`CR-01` references already in the files before this plan (the class javadoc, the `scheduleRefresh()`/`refresh()` method javadocs) were left untouched per the plan's instruction to preserve, not strip, existing tokens. Also removed a lingering reference to the deleted test's exact method name (`rawTailErrorLabelIsClearedThenSetBeforePreviewUnavailable`) from a replacement test's javadoc, which violated Task 3's own acceptance criterion that the file contain zero occurrences of that name.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java`
- **Verification:** `git diff` across all three task commits' added lines, grepped for `D-0[0-9]|COMP-0[0-9]|CR-0[0-9]|plan 93|93-08` -- zero hits after the fix. Full suite re-run green after the fix (992 tests, 0 failures, 0 errors).
- **Committed in:** `4b1f7dd7` (Task 3 commit; the `SetoptsComposerDialog.java` fix, though textually in that file's Task-1-authored comment, was made and committed alongside Task 3 since the violation was only caught during Task 3's own register-check pass)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Self-correcting -- caught before the plan's own final commit, no functional code affected, no user-visible change. All acceptance criteria and the full suite were re-verified green after the fix.

## Issues Encountered

- `SetoptsComposerDialogSourceGuardTest.java`'s `<interface_context>`-cited line numbers in the plan (`:213-218`, `:291`) were close to but not exactly the disk positions after 93-01's earlier edits to this file (`:211-222`, `:293`) -- read the actual file directly rather than trusting the cited numbers, consistent with the plan's own `sibling_plan_context` warning.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**This is the last plan of Phase 93.** All seven requirements (COMP-03 through COMP-09) are now `Complete` in REQUIREMENTS.md.

- Coverage item D4 (the raw-tail message stays byte-identical to what the deleted Java copy produced, and Apply is still refused) is flagged `human_judgment: true` -- **requires UAT**: open `SetoptsComposerDialog` (create or edit flow), type a non-hex character into the raw-hex field, and confirm the field-scoped message still appears next to the field and Apply/OK is refused, with the exact same wording as before this phase.
- The broader Phase 93 UAT round (per `93-CONTEXT.md`'s `<specifics>`) must still cover all six composer kinds reached three ways each (lightbulb intentions, editor context menu actions, composer cue click-through) -- this plan's own scope is the two SETOPTS dialogs' OK-gating behavior specifically, not a re-verification of the other four dialogs or the five consolidated intentions/six consolidated actions landed in earlier plans of this phase.
- Full IntelliJ JUnit suite green: 992 tests, 0 failures, 0 errors (forced `--rerun`, confirmed not a cached UP-TO-DATE result).

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java`
- FOUND: commit `8c6d8a94` (Task 1) in `git log --oneline --all`
- FOUND: commit `372c7a1a` (Task 2) in `git log --oneline --all`
- FOUND: commit `4b1f7dd7` (Task 3) in `git log --oneline --all`
- Re-ran all task-level `<acceptance_criteria>`: all pass (see task-by-task grep verification above).
- Re-ran plan-level `<verification>`: `cd bbj-intellij && ./gradlew test --rerun` -- BUILD SUCCESSFUL, 992 tests, 0 failures, 0 errors.
- Register-check: `git diff` across all three commits' added lines for `COMP-0[0-9]|D-0[0-9]|CR-0[0-9]|plan 93|93-08` -- zero hits.
- `COMP-04` confirmed `Complete` in `.planning/REQUIREMENTS.md` (both the checkbox and traceability-table surfaces).
