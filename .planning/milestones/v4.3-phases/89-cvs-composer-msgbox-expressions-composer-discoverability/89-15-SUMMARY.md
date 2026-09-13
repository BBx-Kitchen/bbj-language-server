---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 15
subsystem: composer
tags: [cvs, composer, intellij, gap-closure]

# Dependency graph
requires:
  - phase: 89-14
    provides: "the incomplete decode outcome on CvsDecodeCallResult (the shared wire contract)"
  - phase: 89-10
    provides: "the IntelliJ CVS() composer (ConfigureCvsIntention, ComposerLauncher.Kind.CVS, CvsComposerDialog)"
provides:
  - "ComposerModels.CvsDecodeResult.incomplete, mirroring the server's field"
  - "CvsComposeMode, a plain-Java routing seam from a CVS decode to COMPOSE_NEW/EDIT_IN_PLACE/COMPLETE_CALL/NOT_EDITABLE"
  - "CvsComposerDialog's COMPLETE_CALL mode (title Complete CVS() call, editable required string, hidden assign-to row)"
  - "ComposerLauncher.openCvs routed through CvsComposeMode.of, with one guarded CVS write shared by edit-in-place and completion"
affects: ["89-16 (both-IDE verification and human re-run)"]

# Actuals (#2632)
actuals:
  tokens: 7961
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "CvsComposeMode.of tests incomplete before editable, so a decode the server never sends (both true) still routes to COMPLETE_CALL rather than a read-only string field."
    - "Both replace-in-place modes (EDIT_IN_PLACE, COMPLETE_CALL) share the exact same StaleEditGuard.applyIfUnchanged/sameCvs/replaceString call site in openCvs, differing only in the write-command name passed to WriteCommandAction -- no second guarded write site was added."

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposeMode.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/CvsComposeModeTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html

key-decisions:
  - "CvsComposerDialog's constructor takes a CvsComposeMode parameter instead of a boolean editMode, and throws IllegalArgumentException for NOT_EDITABLE -- the dialog itself now enforces that it is never opened for a not-editable decode, rather than relying on the caller alone."
  - "The dialog's internal editMode/completing flags are both derived from the passed mode; input.editMode (the server-facing preview flag) is set to editMode only (false while completing), so the server validates the completing string as required exactly like compose-new."
  - "The assign-to row is hidden in both EDIT_IN_PLACE and COMPLETE_CALL (not just EDIT_IN_PLACE as before), because in both replace modes any assignment sits outside the replaced call span."

patterns-established:
  - "A new openCvs-scoped source-guard test (theCvsCompletionReusesTheSingleGuardedCvsReplacement) isolates one method's own text via a start/end marker string pair, rather than counting over the whole file -- lets a plan add a routing branch to an existing guarded method while still proving no second write site was introduced, without touching the existing whole-file counts."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "Alt+Enter or the editor context menu on a$ = CVS(, a$ = CVS(), a$ = CVS(a$ or a$ = CVS(a$) opens Complete CVS() call instead of the missing-mask error notice"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "CvsComposeModeTest#foundIncompleteAndNotEditableIsCompleteCall"
        status: pass
      - kind: unit
        ref: "CvsComposeModeTest#incompleteWinsOverEditableSoAnIncompleteCallIsNeverOpenedReadOnly"
        status: pass
    human_judgment: true
    rationale: "Live Alt+Enter/context-menu reachability in a real IntelliJ session is not exercised here -- plan 89-16 stages the human re-run against the rebuilt plugin."
  - id: D2
    description: "The complete-the-call dialog is prefilled and editable on the string field, hides the assign-to row, keeps the flat checkbox list and greyed-not-hidden chars field, and disables OK until a valid preview arrives"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerApplyGuardSourceGuardTest (whole-file counts unchanged, 806/806 pass)"
        status: pass
    human_judgment: true
    rationale: "Dialog layout/greying/OK-gating is Swing UI state exercised only by inspection and existing behavioural coverage of the shared checkbox/preview plumbing, not a headless assertion of pixel state; plan 89-16 stages the visual re-check."
  - id: D3
    description: "Apply replaces exactly the decoded call span through the single guarded CVS write (StaleEditGuard.applyIfUnchanged + a re-issued cvsDecodeCall + DecodeEquality.sameCvs), never nesting a second CVS(...) call"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "ComposerApplyGuardSourceGuardTest#theCvsCompletionReusesTheSingleGuardedCvsReplacement"
        status: pass
      - kind: unit
        ref: "ComposerApplyGuardSourceGuardTest#everyWriteInTheLauncherLiesInsideAGuardedApplyBody"
        status: pass
      - kind: unit
        ref: "ComposerApplyGuardSourceGuardTest#everyEditFlowReachesTheGuardWithItsOwnComparator"
        status: pass
    human_judgment: false
  - id: D4
    description: "sameCvs now compares incomplete, so a stale unfinished-call completion (span or string grew while the dialog was open) fails the guard and the write aborts with the stale-document notice"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "DecodeEqualityTest#twoIncompleteCvsDecodesOfTheSameUnfinishedCallMatch"
        status: pass
      - kind: unit
        ref: "DecodeEqualityTest#anIncompleteCvsDecodeWhoseCallGrewDoesNotMatch"
        status: pass
      - kind: unit
        ref: "DecodeEqualityTest#changingAnySingleComparedCvsFieldBreaksTheMatch"
        status: pass
    human_judgment: false
  - id: D5
    description: "A non-literal or undocumented-bit mask still opens no dialog and shows the server's reason; the incomplete envelope and the existing not-editable envelope both round-trip through the LSP4J Gson boundary correctly"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#anIncompleteCvsDecodeCallResponseParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "ComposerModelsJsonBoundaryTest#aNotEditableCvsDecodeCallResponseWithEveryOptionalFieldOmittedParsesWithoutFailing"
        status: pass
    human_judgment: false
  - id: D6
    description: "The intention preview and description.html describe completing an unfinished call, and the not-editable paragraph matches what actually happens"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "IntentionDescriptionResourcesTest (all four checks pass for ConfigureCvsIntention)"
        status: pass
      - kind: unit
        ref: "ComposerIntentionPreviewSourceGuardTest (all checks pass for ConfigureCvsIntention)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 15: CVS() Composer — Complete-the-Call for Unfinished Calls (IntelliJ half) Summary

**IntelliJ's Alt+Enter/context-menu CVS() composer now opens `Complete CVS() call` on an unfinished `CVS(` call instead of the "nothing to compose from" error notice, routed by a new plain-Java `CvsComposeMode` seam and written through the single existing guarded CVS replacement.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-12T14:20:00Z (approximate — context loading preceded the first commit)
- **Completed:** 2026-09-12T14:34:25Z
- **Tasks:** 3
- **Files modified:** 11 (9 modified, 2 created)

## Accomplishments

- `ComposerModels.CvsDecodeResult` gains `incomplete`, mirroring the server's field from plan 89-14; the class Javadoc was reworded so it no longer implies every not-editable result carries a reason.
- New `CvsComposeMode` enum (`COMPOSE_NEW`, `EDIT_IN_PLACE`, `COMPLETE_CALL`, `NOT_EDITABLE`) with `of(CvsDecodeResult)`, a plain-Java routing seam with no IntelliJ platform import: null/not-found → `COMPOSE_NEW`; `incomplete` → `COMPLETE_CALL` (checked before `editable`, so a decode with both flags true — never sent by the server — still opens the completion dialog rather than a read-only one); `editable` → `EDIT_IN_PLACE`; otherwise `NOT_EDITABLE`.
- `CvsComposerDialog` takes a `CvsComposeMode` instead of a boolean `editMode`, throwing `IllegalArgumentException` for `NOT_EDITABLE`. Title is `Configure CVS()` / `Complete CVS() call` / `Compose CVS()` per mode; OK text is `Apply` for both replace modes and `Insert` for compose-new. The assign-to row is now hidden in **both** replace modes (previously only edit-in-place), and `refresh()` sends `input.editMode = false` while completing so the server validates the string as required, exactly like compose-new.
- `ComposerLauncher.openCvs` routes through `CvsComposeMode.of(decoded)`. `NOT_EDITABLE` keeps the existing `requestFailed` notice unchanged. `EDIT_IN_PLACE` and `COMPLETE_CALL` both run through the **one** existing `StaleEditGuard.applyIfUnchanged` / re-issued `cvsDecodeCall` / `DecodeEquality::sameCvs` / `replaceString` block — no second guarded write site was added, only the write-command name varies (`Configure CVS()` vs `Complete CVS() call`).
- `DecodeEquality.sameCvs` now compares `incomplete`, so a stale unfinished-call completion (the call's span or string grew while the dialog was open) fails the re-decode comparison and the write aborts with the stale-document notice.
- The CVS() lightbulb preview and `description.html` now describe the complete-the-call mode (prefilled, editable, required string; no assignment field; replaces the unfinished call) and correct the not-editable paragraph to name undocumented bits alongside a variable/expression mask.
- A new `openCvs`-scoped source-guard test (`theCvsCompletionReusesTheSingleGuardedCvsReplacement`) isolates just that method's body and proves it still contains exactly one `applyIfUnchanged(`, one `replaceString(`, one `insertAtCaret(`, one `CvsComposeMode.of(`, and at least one `COMPLETE_CALL` — pinning that the completion branch reused the existing guard rather than adding a parallel write path.

## Task Commits

Each task followed its own RED (`test`) → GREEN (`feat`) TDD cycle, per its `tdd="true"` flag; Task 3 was a plain `type="auto"` docs task with a single commit:

1. **Task 1: Alt+Enter on an unfinished `CVS(` opens `Complete CVS() call` and replaces the call through the existing CVS guard** (`type="tracer"`)
   - `9fa410aa` `test(89-15): add failing test for CvsComposeMode routing (#649)`
   - `7314a149` `feat(89-15): open Complete CVS() call on an unfinished CVS( call (#649)`
   - Tracer feedback gate: re-ran the task's own `<verify>` end-to-end (compile + `com.basis.bbj.intellij.composer.*` tests) — passed, logged `⚡ Tracer verified end-to-end — expanding`, proceeded to Task 2 (auto mode, `workflow.auto_advance: true`, task carries no `gate="blocking-human"`).
2. **Task 2: Pin the incomplete verdict across the wire, the stale-edit comparison and the launcher's single guarded CVS write**
   - `cd32e51d` `test(89-15): add failing tests for the incomplete field in equality, wire and guard (#649)`
   - `18c01402` `feat(89-15): pin incomplete in the CVS() stale-edit comparison (#649)`
   - RED verified by temporarily reverting `DecodeEquality.java` to its pre-Task-2 content and confirming `changingAnySingleComparedCvsFieldBreaksTheMatch` failed on the new `incomplete` mutator, before restoring the production change.
3. **Task 3: Intention preview and description tell the user an unfinished CVS() call is completed in place**
   - `d7101ea5` `docs(89-15): describe completing an unfinished CVS() call in the lightbulb preview (#649)`

**Plan metadata:** committed alongside this SUMMARY (see final commit hash in the executor's completion report).

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposeMode.java` — new plain-Java routing enum
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/CvsComposeModeTest.java` — new behavioural coverage (7 tests)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` — `CvsDecodeResult.incomplete`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java` — `CvsComposeMode` constructor param, title/OK per mode, hidden assign-to row in both replace modes, `input.editMode`/`input.assignTo` wiring
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — `openCvs` routed through `CvsComposeMode.of`, one guarded write shared by edit and completion
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` — `sameCvs` compares `incomplete`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` — `incomplete` mutator + two new fixture-comparison tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` — incomplete envelope round trip + not-editable-envelope assertion
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java` — reworded messages + new `openCvs`-scoped guard test
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java` — reworded preview
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html` — new completing-mode paragraph, corrected not-editable paragraph

## Decisions Made

- `CvsComposerDialog`'s constructor now takes `CvsComposeMode` directly and rejects `NOT_EDITABLE` with `IllegalArgumentException`, rather than trusting the caller alone never to construct it for a not-editable decode — the dialog and the launcher now agree on the contract structurally.
- The assign-to row's visibility rule was widened from "hidden when editing" to "hidden in both replace modes", since a completing call's assignment (if any) also sits outside the replaced span, exactly like edit-in-place.
- `input.editMode` (the server-facing preview flag) stays `false` while completing, distinct from the dialog's own private `editMode` boolean (true only for `EDIT_IN_PLACE`) — the two flags now serve different purposes with the same name, one gating dialog chrome and one gating server-side string validation.

## Deviations from Plan

None — plan executed exactly as written. All artifacts, guard counts, dialog title/OK-text mapping, and comment-discipline rules matched the plan's `<interfaces>` contract, which itself matched the actual shape plan 89-14 shipped (`incomplete?: boolean` on `CvsDecodeCallResult`, verified directly against `bbj-vscode/src/cvs-composer.ts` before writing any IntelliJ code).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both halves of the CVS() incomplete-call gap closure (G-89-3, DISC-03, #649) are now code-complete: plan 89-14 shipped the VS Code half, this plan (89-15) ships the IntelliJ half.
- No file under `bbj-vscode/` was touched (verified by `git diff --stat -- bbj-vscode` over the plan's full commit range, empty output).
- Whole-module IntelliJ JUnit suite: 806 tests, 0 failures, 0 errors, 0 skipped (`./gradlew test --offline`).
- Register-id scan over the plan's full diff (`git diff a2126abb..HEAD -- bbj-intellij/src`): 0 hits.
- Live-IDE verification (Alt+Enter/context-menu reachability, dialog layout, and the stale-edit guard's live behaviour) is deferred to plan 89-16's human re-run against a rebuilt plugin distributable, alongside the VS Code half.

## Self-Check: PASSED

- All 11 created/modified source, test and resource files verified present on disk.
- All 5 task commits (`9fa410aa`, `7314a149`, `cd32e51d`, `18c01402`, `d7101ea5`) verified present in git log.
- All task-level `<acceptance_criteria>` re-run and passing (all three tasks).
- Plan-level `<verification>` re-run: `com.basis.bbj.intellij.composer.*` + `com.basis.bbj.intellij.concurrency.*` targeted tests pass; whole-module `./gradlew test --offline` passes (806/806); register-id scan over `a2126abb..HEAD` (bbj-intellij/src) — 0 hits; `bbj-vscode` diff-stat over the same range — empty.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*
