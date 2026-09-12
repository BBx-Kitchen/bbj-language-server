---
phase: 90-composer-robustness-intellij-composer-performance
plan: 06
subsystem: intellij-composer
tags: [validation, addwindow, addchildwindow, gson-boundary, junit5]

requires:
  - phase: 90-composer-robustness-intellij-composer-performance
    provides: "plan 90-02's addwindowPreview/addchildwindowPreview per-field error strings and valid flag"
  - phase: 90-composer-robustness-intellij-composer-performance
    provides: "plan 90-04's scheduleRefresh()/PreviewDebouncer wiring on both window dialogs (unchanged by this plan)"
provides:
  - "AddWindowComposerDialog and AddChildWindowComposerDialog gate OK on the server's valid verdict instead of an unconditional enable"
  - "AddWindowPreview and AddChildWindowPreview carry per-field error strings and valid across the LSP4IJ Gson boundary"
  - "ComposerFieldValidationSourceGuardTest pins the gate and forbids a client-side validation rule in either dialog"
affects: [90-08]

actuals:
  tokens: 38000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "labeledWithError(label, field, error): a BorderLayout cell (label NORTH, field CENTER, error label SOUTH), mirroring MsgboxComposerDialog's errorLabel()/error-row precedent"
    - "errorText(String): a one-line null-to-\" \" helper so each p.<field>Error is read exactly once, keeping the source guard's per-field occurrence count literal"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java

key-decisions:
  - "errorText(String) helper reads p.<field>Error exactly once per field (rather than the natural `p.xError == null ? \" \" : p.xError` ternary, which references the field twice) so the source guard's 'each field read exactly once' assertion holds without weakening the assertion itself"
  - "Task 1 created ComposerFieldValidationSourceGuardTest scoped to only AddWindowComposerDialog; Task 2 added the addChildWindow test method to the same file, matching the plan's per-task scope and keeping RED-then-GREEN at each task boundary"

requirements-completed: []

coverage:
  - id: D1
    description: "AddWindowComposerDialog shows the server's per-field error under each statement field and gates OK on setOKActionEnabled(p.valid) instead of an unconditional enable"
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "ComposerFieldValidationSourceGuardTest#theAddWindowDialogGatesOkOnTheServerVerdictAndRendersEveryFieldError"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#anAddWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aValidAddWindowPreviewWithEveryErrorOmittedParsesThroughTheLsp4jGson"
        status: pass
    human_judgment: false
  - id: D2
    description: "AddChildWindowComposerDialog shows the server's per-field error under each statement field and gates OK on setOKActionEnabled(p.valid) instead of an unconditional enable"
    requirement: DISC-07
    verification:
      - kind: unit
        ref: "ComposerFieldValidationSourceGuardTest#theAddChildWindowDialogGatesOkOnTheServerVerdictAndRendersEveryFieldError"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#anAddChildWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aValidAddChildWindowPreviewWithEveryErrorOmittedParsesThroughTheLsp4jGson"
        status: pass
    human_judgment: false
  - id: D3
    description: "Neither dialog holds a client-side validation rule or message of its own; edit mode is never blocked since the server always reports valid: true in edit mode"
    verification:
      - kind: unit
        ref: "ComposerFieldValidationSourceGuardTest -- zero occurrences of 'Not a number', 'Not a string', 'Unterminated', 'Unbalanced' in both dialog sources"
        status: pass
    human_judgment: false
  - id: D4
    description: "The live 'typing \"10\" into x shows the server's message and disables OK' behavior in a real IntelliJ sandbox"
    verification: []
    human_judgment: true
    rationale: "Staged as an end-of-phase human check by plan 90-08 per this plan's own <verification> step 5; no IntelliJ sandbox runs in this devcontainer"

duration: 30min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 06: IntelliJ addWindow/addChildWindow Field-Error Gate Summary

**Both IntelliJ window composer dialogs now render the language server's per-field validation errors under each statement field and gate OK on the server's `valid` verdict, replacing an unconditional enable that let IntelliJ insert text VS Code would have refused.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-12
- **Completed:** 2026-09-12
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `ComposerModels.AddWindowPreview` gained `receiverError`, `sysguiError`, `titleError`, `xError`, `yError`, `widthError`, `heightError` (all `String`, null when the field is fine) and `boolean valid`.
- `ComposerModels.AddChildWindowPreview` gained the same shape with nine error fields (`receiverError`, `windowError`, `idError`, `contextError`, `titleError`, `xError`, `yError`, `widthError`, `heightError`) and `boolean valid`.
- Both `AddWindowComposerDialog` and `AddChildWindowComposerDialog` gained an `errorLabel()`/`labeledWithError(...)` pair mirroring `MsgboxComposerDialog`'s existing precedent, one red error label under every statement field, and `apply(...)` now calls `setOKActionEnabled(p.valid)` in place of the previous unconditional `setOKActionEnabled(true)`.
- New `ComposerFieldValidationSourceGuardTest` pins both dialogs: exactly one `setOKActionEnabled(p.valid)` and zero `setOKActionEnabled(true)`, every `p.<field>Error` read exactly once, and zero occurrences of any client-side validation message fragment (`Not a number`, `Not a string`, `Unterminated`, `Unbalanced`).
- `ComposerModelsJsonBoundaryTest` gained four new envelope tests (`anAddWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson`, `aValidAddWindowPreviewWithEveryErrorOmittedParsesThroughTheLsp4jGson`, and the addChildWindow equivalents) plus null/false assertions added to both pre-existing preview tests, proving the fail-closed default (`valid: false`) when a server omits the field.

## Task Commits

1. **Task 1: A malformed field in the IntelliJ addWindow dialog shows the server's error under it and keeps OK disabled** - `cee44f55` (feat)
2. **Task 2: The IntelliJ addChildWindow dialog gets the same per-field errors and `valid` gate** - `547b07fa` (feat)

_Note: both tasks were TDD (`tdd="true"`) — each commit bundles the boundary-test/source-guard-test change together with the production wiring it proves, since RED (the test file addition/extension) and GREEN (the dialog wiring) landed together per the plan's "write the tests first" action text, mirroring plan 90-04's precedent of one commit per task rather than a separate RED-only commit._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - added the per-field error strings and `valid` to `AddWindowPreview` (Task 1) and `AddChildWindowPreview` (Task 2)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` - seven error labels, `errorLabel()`/`labeledWithError(...)`, `apply()` gated on `p.valid` (Task 1)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` - nine error labels, the same helpers, `apply()` gated on `p.valid` (Task 2)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - four new envelope tests plus assertions on the two pre-existing preview tests (both tasks)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java` - new file; addWindow test in Task 1, addChildWindow test added in Task 2

## IntelliJ Test Counts

Filtered run (`com.basis.bbj.intellij.composer.*`): green, 0 failures. Whole-module `./gradlew test --offline`: green, 833 tests across 98 test classes, 0 failures.

## Decisions Made

- `errorText(String)` helper reads each `p.<field>Error` exactly once (rather than the natural `p.xError == null ? " " : p.xError` ternary, which references the field twice) — this was needed to satisfy the source guard's "each field read exactly once" assertion without weakening the assertion. Caught during Task 1's first GREEN attempt: the naive ternary made the guard fail with "expected 1 but was 2" for every field.
- Task 1 scoped `ComposerFieldValidationSourceGuardTest` to only the addWindow test method, matching the plan's literal per-task action text; Task 2 added the addChildWindow test method to the same file rather than creating a second file.
- Per the plan's tracer feedback gate: after Task 1's commit, the tracer's own `<verify>` (the three named test classes) was re-run end-to-end before starting Task 2's expansion — passed (auto mode active, `workflow._auto_chain_active: true`), so expansion proceeded without a checkpoint.

## Deviations from Plan

### Accepted discrepancy (not a Rule 1-4 fix)

**1. Task 2's acceptance criterion literal count is stale by one**
- **Found during:** Task 2's acceptance-criteria verification
- **Issue:** The plan's acceptance criteria state `grep -c "public boolean valid;" ComposerModels.java` should print `3` ("MSGBOX, addWindow, addChildWindow previews"). The actual count is `4`, because `CvsPreview` (added in Phase 89, plan 89-07, unrelated to this plan) already carries its own `public boolean valid;` field. Confirmed via `git show <commit-before-this-plan>:ComposerModels.java | grep -c` = 2 (Msgbox + Cvs) before this plan started; this plan added exactly 2 more (addWindow, addChildWindow) = 4 total, not 3.
- **Resolution:** No code change — the plan's literal count did not account for a field that already existed for an unrelated reason. This is out of scope for this plan's `<files_modified>` (`CvsComposerDialog.java`/`CvsPreview` are untouched) and not a bug: the actual acceptance intent (MSGBOX, addWindow and addChildWindow previews all carry `valid`) is fully satisfied.
- **Files modified:** None (informational only)
- **Verification:** `grep -n "public boolean valid;" ComposerModels.java` shows all four occurrences, one per preview DTO (Msgbox, AddWindow, AddChildWindow, Cvs)
- **Committed in:** N/A (no code change)

---

**Total deviations:** 1 accepted discrepancy (stale acceptance-criteria literal, no code impact)
**Impact on plan:** None — the underlying intent of the acceptance criterion (all three named preview DTOs carry `valid`) holds; the literal count in the plan text simply predates `CvsPreview.valid`.

## Issues Encountered

None beyond the `errorText(String)` helper decision documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both IntelliJ window composer dialogs (`AddWindowComposerDialog`, `AddChildWindowComposerDialog`) now gate OK on the language server's `valid` verdict and render every per-field error, matching `MsgboxComposerDialog`'s existing pattern; neither dialog holds a validation rule of its own.
- DISC-07 is shared with plan 90-08 and stays Pending per this plan's instructions — only 90-08 (the final plan declaring it) may flip it to Complete.
- The live "type `\"10\"` into x, see the server's message, OK stays disabled" human check is staged for plan 90-08's end-of-phase verification, per this plan's `<verification>` step 5.
- Ready for 90-07/90-08.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED

All four modified/created source files confirmed present on disk; both task commits (`cee44f55`, `547b07fa`) confirmed in `git log`; all plan-level `<acceptance_criteria>` re-verified (addWindow and addChildWindow `setOKActionEnabled(p.valid)` greps each print exactly one line; the `anAddWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson` grep prints one line); filtered composer test run green; whole-module `./gradlew test --offline` green (833 tests, 0 failures); plan-level register scan (`git diff $BASE..HEAD -- bbj-intellij`) clean; `bbj-vscode`/`MsgboxComposerDialog.java` diff empty.
