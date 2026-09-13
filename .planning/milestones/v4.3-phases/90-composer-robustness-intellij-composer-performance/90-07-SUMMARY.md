---
phase: 90-composer-robustness-intellij-composer-performance
plan: 07
subsystem: composer
tags: [msgbox, intellij, staleness-guard, decode-outcome, mode-seam]

# Dependency graph
requires:
  - phase: 90-01
    provides: "MsgboxDecodeCallResult.incomplete wire outcome for an unfinished MSGBOX( / MSGBOX() / MSGBOX(\"Hi\", call"
provides:
  - "MsgboxComposeMode: plain-Java routing seam (COMPOSE_NEW/EDIT_IN_PLACE/REPLACE_OPTIONS/COMPLETE_CALL) for a MSGBOX decode"
  - "MsgboxComposerDialog COMPLETE_CALL mode: title Complete MSGBOX call, OK Apply, no banner, no assign-to row"
  - "ComposerLauncher.openMsgbox routed through MsgboxComposeMode.of, one guarded MSGBOX write for every replace mode"
  - "DecodeEquality.sameMsgbox compares incomplete"
affects: [90-08]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 7624
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MsgboxComposeMode mirrors CvsComposeMode's routing-seam shape but with no NOT_EDITABLE outcome, since MSGBOX decodes carry none"
    - "One dialog constructor takes the mode enum directly (not a boolean editMode) and derives editMode/completing flags from it, same shape as CvsComposerDialog"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposeMode.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/MsgboxComposeModeTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java

key-decisions:
  - "MsgboxComposeMode.of tests incomplete before replace, so a decode the server never sends (both true) still routes to COMPLETE_CALL rather than the compose-and-replace banner -- mirrors CvsComposeMode's incomplete-before-editable ordering"
  - "MsgboxComposerDialog's editMode flag is now derived (EDIT_IN_PLACE or REPLACE_OPTIONS), not a raw constructor boolean; completing (COMPLETE_CALL) is a second derived flag, same split CvsComposerDialog already uses"
  - "openMsgbox keeps its single applyIfUnchanged/replaceString call site for all three replace modes, differing only in the WriteCommandAction name (Complete MSGBOX call vs Configure MSGBOX)"

patterns-established:
  - "A dialog constructor accepting a compose-mode enum (not a boolean) is now the shape for both CVS() and MSGBOX; a not-yet-ported composer that adopts a completion mode should follow the same shape"

requirements-completed: []  # DISC-08 stays Pending -- shared with plan 90-08, only the final declaring plan may flip it

coverage:
  - id: D1
    description: "MsgboxComposeMode.of routes null/not-found to COMPOSE_NEW, incomplete to COMPLETE_CALL ahead of every other check, a present replace to REPLACE_OPTIONS, and everything else to EDIT_IN_PLACE"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/MsgboxComposeModeTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "MsgboxComposerDialog opens Complete MSGBOX call with no banner and no assign-to row in COMPLETE_CALL mode, and Apply replaces the unfinished call through the one existing guarded MSGBOX write"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java#theMsgboxCompletionReusesTheSingleGuardedMsgboxReplacement"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerReplaceBannerSourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D3
    description: "DecodeEquality.sameMsgbox compares incomplete, so a completion whose unfinished call grew or changed while the dialog was open aborts the write"
    requirement: "DISC-08"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java#twoIncompleteMsgboxDecodesOfTheSameUnfinishedCallMatch"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java#anIncompleteMsgboxDecodeWhoseCallGrewDoesNotMatch"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java#anIncompleteMsgboxDecodeCallResponseParsesThroughTheLsp4jGson"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Alt+Enter preview and Settings > Editor > Intentions description explain that an unfinished call is completed in place"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java"
        status: pass
    human_judgment: true
    rationale: "Wording quality and the live Alt+Enter popup rendering are staged as an end-of-phase human check by plan 90-08 against a rebuilt plugin, per this plan's own verification step 5"

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 07: IntelliJ MSGBOX Composer Completes an Unfinished Call Summary

**Alt+Enter, the context menu or the composer cue on an unfinished `MSGBOX(` call in IntelliJ now opens `Complete MSGBOX call` and writes one complete call in place through the existing guarded MSGBOX replacement, instead of nesting a second call inside it.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-12T21:10:00Z
- **Completed:** 2026-09-12T21:35:00Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- `MsgboxComposeMode` is a new plain-Java `enum` (`COMPOSE_NEW`, `EDIT_IN_PLACE`, `REPLACE_OPTIONS`, `COMPLETE_CALL`) with `of(MsgboxDecodeResult)` routing null/not-found to `COMPOSE_NEW`, `incomplete` to `COMPLETE_CALL` ahead of every other check, a present `replace` to `REPLACE_OPTIONS`, and everything else to `EDIT_IN_PLACE`.
- `ComposerModels.MsgboxDecodeResult` gains `public boolean incomplete;`, mirroring the wire field plan 90-01 added on the VS Code side.
- `MsgboxComposerDialog`'s constructor now takes `@NotNull MsgboxComposeMode mode` instead of a raw `boolean editMode`, deriving `editMode` (`EDIT_IN_PLACE`/`REPLACE_OPTIONS`) and `completing` (`COMPLETE_CALL`) internally; throws `IllegalArgumentException` for `COMPOSE_NEW` combined with a non-null `initial`.
  - **Dialog title / OK text per mode:** `Configure MSGBOX` / `Apply` when editing; `Complete MSGBOX call` / `Apply` when completing; `Compose MSGBOX` / `Insert` otherwise.
  - The compose-and-replace banner is suppressed while completing (`this.replace = completing ? null : replace`), even though the server never sends `replace` alongside `incomplete`.
  - `assignToRow` is visible only when composing new (neither editing nor completing); `refresh()` passes `input.assignTo = null` in both replace modes and `input.editMode = editMode` (false while completing, so the server validates the message as required).
- `ComposerLauncher.openMsgbox` computes `MsgboxComposeMode mode = MsgboxComposeMode.of(decoded)` and routes every replace mode (edit-in-place, compose-and-replace, completing) through the **same** existing `applyIfUnchanged`/`replaceString` call, naming the `WriteCommandAction` `Complete MSGBOX call` only for `COMPLETE_CALL` and `Configure MSGBOX` otherwise; `COMPOSE_NEW` is unchanged (`insertAtCaret(..., "Compose MSGBOX")`).
- `DecodeEquality.sameMsgbox` now also compares `a.incomplete == b.incomplete`, so a completion whose unfinished call grew or changed while the dialog was open fails the stale-edit guard.
- The Alt+Enter preview and `intentionDescriptions/ConfigureMsgboxIntention/description.html` now describe the completion behavior; `getText()` (`Configure MSGBOX options…`) and `isAvailable` are unchanged.

## Final guard counts (verified)

- **Whole-file** (`ComposerApplyGuardSourceGuardTest`): 6 `applyIfUnchanged(`, 6 `replaceString(`, 1 `insertString(`, 1 `DecodeEquality::sameMsgbox` reference, 2 `msgboxDecodeCall(` references (launch + re-decode) — all unchanged from before this plan.
- **`openMsgbox`-scoped** (new `theMsgboxCompletionReusesTheSingleGuardedMsgboxReplacement`): exactly 1 `applyIfUnchanged(`, 1 `replaceString(`, 1 `insertAtCaret(`, 1 `MsgboxComposeMode.of(`, and at least 1 `COMPLETE_CALL`.

## Dialog title / OK text per mode

| Mode | Title | OK text | Banner | Assign-to row |
|------|-------|---------|--------|----------------|
| `COMPOSE_NEW` | Compose MSGBOX | Insert | never | visible |
| `EDIT_IN_PLACE` | Configure MSGBOX | Apply | hidden | hidden |
| `REPLACE_OPTIONS` | Configure MSGBOX | Apply | shown (`replace.banner`) | hidden |
| `COMPLETE_CALL` | Complete MSGBOX call | Apply | never | hidden |

## Intention preview sentence

> "Opens the BBj visual composer for the `MSGBOX(...)` call under the caret, prefilled from its current arguments. On a call still being typed, it completes that call in place instead."

## IntelliJ test count

Whole-suite `./gradlew test --offline` (all 511+ tests, IntelliJ module): **BUILD SUCCESSFUL**, no failures. Targeted runs (`MsgboxComposeModeTest`, `ComposerReplaceBannerSourceGuardTest`, `ComposerApplyGuardSourceGuardTest`, `ComposerDialogRefreshSourceGuardTest`, `DecodeEqualityTest`, `ComposerModelsJsonBoundaryTest`, `StaleEditGuardTest`, `IntentionDescriptionResourcesTest`, `ComposerIntentionPreviewSourceGuardTest`) all green, per task.

## Task Commits

Each task was committed atomically:

1. **Task 1: Alt+Enter on an unfinished `MSGBOX(` opens `Complete MSGBOX call` and replaces the call through the existing MSGBOX guard** - `35ff8b78` (feat)
2. **Task 2: Pin the incomplete verdict across the Gson boundary, the stale-edit comparison and the single guarded MSGBOX write** - `1a842807` (test)
3. **Task 3: The MSGBOX intention preview and description tell the user an unfinished call is completed in place** - `21ba97e0` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposeMode.java` - new plain-Java routing seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/MsgboxComposeModeTest.java` - its behavioral coverage
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` - `MsgboxDecodeResult.incomplete`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` - mode-based constructor, title/OK text, banner suppression, assign-to visibility
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - `openMsgbox` routed through `MsgboxComposeMode.of`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` - `sameMsgbox` compares `incomplete`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java` - reworded preview
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html` - completion paragraph
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` - incomplete mutator + matching/growing-call tests
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` - incomplete decodeCall Gson round trip
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java` - openMsgbox-scoped guard count test, reworded comparator message

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `MsgboxComposeMode`, the dialog's mode-based constructor, `openMsgbox`'s single guarded write, and `sameMsgbox`'s `incomplete` comparison are all in the tree exactly as this plan's `<interfaces>` block specified, so plan 90-08 can rebuild both distributables and stage the live human check (Alt+Enter on `x = MSGBOX(` in a real IDE) without waiting on further code changes here.
- DISC-08 stays Pending in REQUIREMENTS.md as instructed — it is shared with plan 90-08, and only the final declaring plan may flip it.
- No blockers. `git diff` over `bbj-vscode` for this plan's commits is empty, confirming the VS Code side (already delivered by plan 90-01) needed no further change.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED
