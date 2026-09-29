---
phase: 113-composer-webview-hardening-consolidation
plan: "03"
subsystem: security
tags: [intellij, swing, composer, json-boundary, docs]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 04's shared LS assignTo validation lands the assignToError field on msgboxPreview/cvsPreview that this plan's IntelliJ models and dialogs consume"
provides:
  - "ComposerModels.MsgboxPreview.assignToError and ComposerModels.CvsPreview.assignToError (String), pinned across the LSP4IJ JSON boundary"
  - "MsgboxComposerDialog and CvsComposerDialog render the server's assign-to verdict via ComposerSwingHelpers.labeledWithError, gate OK only on p.valid, and hold no client-side assign-to rule"
  - "AddWindowComposerDialog and ComposerLauncher class docs describe the edit-in-place flow and all six composer kinds"
affects: [113-UAT]

actuals:
  tokens: 4770
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "ComposerSwingHelpers.labeledWithError(label, field, errorLabel) reused for a field whose visibility (and therefore its error label's visibility) is toggled as one row, rather than adding the error label as a sibling component"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerAssignToSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java

key-decisions:
  - "The assign-to error label is passed into the existing labeledWithError(label, field, error) helper rather than added as a separate always-visible component, so hiding assignToRow in edit-in-place/completing mode also hides its error label with no extra visibility wiring"
  - "CVS prefill is s$ (a plain string variable), matching the VS Code panel's own choice for the same field (D-08's planner discretion)"
  - "ComposerLauncher's class doc names the dialog each Kind opens by reading the six open*() methods directly, rather than paraphrasing, so the doc cannot silently drift from the switch it describes"

patterns-established: []

requirements-completed: [SEC-11, DOC-01]

coverage:
  - id: D1
    description: "ComposerModels.MsgboxPreview and CvsPreview each carry an assignToError String field that deserializes from the language server's preview JSON, for both a set value and a missing/null key"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aMsgboxPreviewCarryingAnAssignToErrorParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aCvsPreviewCarryingAnAssignToErrorParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aCvsPreviewWithNoAssignToErrorKeyParsesToNull"
        status: pass
    human_judgment: false
  - id: D2
    description: "MsgboxComposerDialog and CvsComposerDialog render the assign-to error under the field via labeledWithError, drop the \"(optional)\" label text, keep OK gated only on the server's valid verdict, and hold no assign-to rule of their own; CVS prefills s$"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "ComposerAssignToSourceGuardTest#theMsgboxDialogRendersTheServersAssignToVerdictAndHoldsNoRuleOfItsOwn"
        status: pass
      - kind: unit
        ref: "ComposerAssignToSourceGuardTest#theCvsDialogRendersTheServersAssignToVerdictPrefillsAndHoldsNoRuleOfItsOwn"
        status: pass
    human_judgment: false
  - id: D3
    description: "AddWindowComposerDialog's and ComposerLauncher's class docs describe the edit-in-place flow and all six composer kinds, with no accompanying code change and no stale create-only or two-composer wording remaining"
    requirement: DOC-01
    verification:
      - kind: unit
        ref: "grep-based acceptance criteria (task 3): zero stale-wording hits, at least one edit-in-place mention, all six Kind names present in the class doc, diff touches only comment lines"
        status: pass
    human_judgment: false
  - id: D4
    description: "The full IntelliJ composer test package passes after all three tasks, with no assertion changes to any pre-existing composer test"
    requirement: SEC-11
    verification:
      - kind: unit
        ref: "./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*' (BUILD SUCCESSFUL)"
        status: pass
    human_judgment: false
  - id: D5
    description: "In a running IntelliJ, an invalid or empty assign-to target on a new MSGBOX/CVS insert shows the server's error under the field and disables Insert; the edit-in-place flow shows no assign-to row"
    requirement: SEC-11
    verification: []
    human_judgment: true
    rationale: "Requires plan 04's language-server-side assignTo validation to be live and both distributables built from the final tree, per the plan's own manual verification note; not exercisable from this IntelliJ-only plan in isolation"

duration: 22min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 03: IntelliJ assign-to verdict and class-doc consolidation Summary

**ComposerModels.MsgboxPreview/CvsPreview gain an assignToError field pinned across the LSP4IJ JSON boundary; MsgboxComposerDialog and CvsComposerDialog render it via labeledWithError with the "(optional)" marker removed and CVS prefilled s$; AddWindowComposerDialog and ComposerLauncher's class docs now describe edit-in-place and all six composer kinds.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-27T11:10:00Z
- **Completed:** 2026-09-27T11:32:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `ComposerModels.MsgboxPreview` and `ComposerModels.CvsPreview` each gained a `String assignToError` field, pinned across LSP4IJ's own `MessageJsonHandler` deserializer for a set value, a missing key, and (msgbox) a `valid: false` verdict alongside it.
- `MsgboxComposerDialog` renders `p.assignToError` under the assign-to field via `ComposerSwingHelpers.labeledWithError`, drops the "(optional)" marker from the label, and keeps its `ret!` prefill and its single `setOKActionEnabled(p.valid)` gate untouched.
- `CvsComposerDialog` gets the same treatment plus a new `s$` prefill for the assign-to field (the CVS result is a string, matching the VS Code panel's own choice); its assign-to row and error label stay hidden in edit-in-place and completing modes exactly as before.
- New `ComposerAssignToSourceGuardTest` (2 tests) pins both dialogs: exactly one `assignToError.setText(p.assignToError` read, one `labeledWithError("Assign result to", ...)` row build, zero copies of the language server's assign-to message text, and the unchanged `setOKActionEnabled(p.valid)` gate.
- `AddWindowComposerDialog`'s class doc now describes both the create flow (title "Compose addWindow", OK "Insert") and the edit-in-place flow (title "Configure window flags", OK "Apply", geometry hidden, only the flags/event-mask hex tokens rewritten) its two public constructors already implement — replacing the stale "Create flow only for now" sentence.
- `ComposerLauncher`'s class doc now names all six `Kind` values in their declaration order (MSGBOX, ADDWINDOW, ADDCHILDWINDOW, SETOPTS, SETOPTS_IN_CODE, CVS), which dialog each opens, and the edit-in-place/completing/create/stale-cue paths — replacing the stale "both composer UIs" sentence. No behavior changed; the diff touches only comment lines.

## Task Commits

Each task was committed atomically:

1. **Task 1: A msgbox preview's assignToError travels from the LS JSON through the model into the MSGBOX dialog** - `2b86040c` (feat)
2. **Task 2: The CVS dialog shows assignToError, drops the optional marker and prefills s$** - `9e84c859` (feat)
3. **Task 3: The AddWindowComposerDialog and ComposerLauncher class docs describe edit-in-place and all six composer kinds** - `ad501d87` (docs)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - `assignToError` added to `MsgboxPreview` and `CvsPreview`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` - assign-to row rebuilt with `labeledWithError`, error label wired in `apply()`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java` - same, plus the `s$` prefill
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - three new `@Test` methods pinning `assignToError` (additions only)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerAssignToSourceGuardTest.java` - new source guard for both dialogs
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` - class doc rewritten (comment-only)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - class doc rewritten (comment-only)

## Decisions Made
- The assign-to error label is threaded into the existing `labeledWithError(label, field, error)` helper instead of being added as a separate component, so the row's own `setVisible(!editMode && !completing)` call hides the error label along with the field — no new visibility wiring needed.
- CVS's assign-to prefill is `s$`, mirroring the VS Code panel's own choice for the same field (planner's discretion per the phase decisions).
- `ComposerLauncher`'s rewritten class doc names each `Kind`'s destination dialog by reading the six `open*()` methods directly rather than paraphrasing from memory, so the doc cannot silently drift from the `switch` it documents.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The IntelliJ half of SEC-11 is complete; SEC-11 itself stays open in REQUIREMENTS.md until plan 04 (the shared language-server-side `assignTo` validation both `msgboxPreview`/`cvsPreview` and this plan's dialogs depend on) also lands — REQUIREMENTS.md is not marked complete for SEC-11 by this plan.
- DOC-01 is fully delivered by this plan alone (no sibling plan in Phase 113 also declares it).
- The plan's own manual verification step (an invalid/empty assign-to target disabling Insert in a running IntelliJ) is deferred to phase UAT, after plan 04 lands and both distributables are rebuilt from the final tree, per this plan's own `<verification>` note — not a gap introduced by this plan.
- `ComposerAssignToSourceGuardTest` and the extended `ComposerModelsJsonBoundaryTest` are ready to catch any future regression to the assign-to verdict wiring or JSON shape.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerAssignToSourceGuardTest.java` found on disk.
- All 3 task commit hashes (`2b86040c`, `9e84c859`, `ad501d87`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `grep -c "public String assignToError;"` on `ComposerModels.java` prints 2; the `ComposerModelsJsonBoundaryTest.java` diff against the phase base is additions-only; `"Assign result to (optional)"` and the two language-server message-text fragments are absent from both `MsgboxComposerDialog.java` and `CvsComposerDialog.java`; `new JBTextField("s$")` and `assignToError.setText(p.assignToError` each appear exactly once in `CvsComposerDialog.java`; `"Create flow only"` and `"both composer UIs"` are absent from the two doc-updated files; `edit-in-place` appears at least once in `AddWindowComposerDialog.java`; all six `Kind` names appear in `ComposerLauncher`'s class doc; the doc-only diff touches no non-comment line; no planning-identifier token appears anywhere in the `bbj-intellij/src` diff against the phase base (`90031944`).
- Plan-level `<verification>` re-run: `cd bbj-intellij && ./gradlew cleanTest test --tests 'com.basis.bbj.intellij.composer.*'` reports `BUILD SUCCESSFUL`, run twice (once after task 2, once after task 3), with no assertion changes to any pre-existing composer test file. The plan's manual UAT step is deferred per its own note (plan 04 not yet landed) and recorded above under Next Phase Readiness, not silently skipped.
