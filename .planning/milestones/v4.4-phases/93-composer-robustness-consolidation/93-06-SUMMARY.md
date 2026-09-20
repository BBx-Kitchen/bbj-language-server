---
phase: 93-composer-robustness-consolidation
plan: 06
subsystem: ui
tags: [intellij, swing, composer, java, source-guard]

# Dependency graph
requires:
  - phase: 93-composer-robustness-consolidation (plan 01)
    provides: "ComposerSwingHelpers — the shared Swing rendering helpers (labeledWithError, setEnabledRecursive, previewUnavailable, errorLabel) the new base calls into rather than re-duplicating"
provides:
  - "AddWindowFamilyComposerDialogBase — the one shared base carrying the preview seam, the debounce wiring, the sequence-counter discipline, grouped-checkbox rendering and the OK-gating discipline for the addWindow-family dialogs, so a fix to that shared flow is written once instead of twice"
  - "AddWindowComposerDialog and AddChildWindowComposerDialog converted to thin subclasses over the base, each keeping only its own field set, schematic panel type, preview request and apply(...)"
  - "AddWindowFamilyComposerDialogBaseSourceGuardTest — pins the base's seam construction, its scheduleRefresh()/previewUnavailable() bodies and a delegation pin per subclass"
affects: [93-08 (SETOPTS dialog gating lands into a base+subclass shape already established by this plan for the addWindow family, and this plan lands before 93-08 per the roadmap ordering so any dialog-side validation work 93-08 adds is written once)]

actuals:
  tokens: 19900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Second base+thin-subclass extraction in this codebase (after BbjRunActionBase): an abstract DialogWrapper subclass owns the constructor-built seam (ComposerFlow/PreviewDebouncer/AlarmScheduler), the shared checkbox/display fields, and every genuinely identical method; a single abstract hook (refresh()) is the only thing subclasses must implement, and createCenterPanel()/apply(...) stay on the subclass because they differ by field set and DTO"
    - "A coincidentally-identical-looking shared method (prefill) that references a subclass-owned field (title) is NOT force-extracted wholesale; the shared checkbox/event-mask logic moves to the base and the one subclass-specific statement (title.setText(...)) stays in the subclass constructor, called immediately after the inherited prefill(...) — preserving byte-identical behavior without adding a second abstract hook"
    - "Source-guard re-pointing for a partial (two-of-six) extraction: literals that moved to the shared base are asserted once on the base file plus zero times per migrated subclass, while the four still-unmigrated sibling dialogs keep their original per-file assertions at full breadth in the same test class"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBase.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBaseSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java

key-decisions:
  - "The addGroupedChecks tooltip branch (it.detail != null) is carried unconditionally on the shared base rather than behind a showsCatalogTooltips() hook. Verified directly against bbj-vscode/src/addwindow-composer.ts: WINDOW_FLAGS and EVENT_MASK_BITS (the addWindow catalog) never set detail on any item, while addchildwindow-composer.ts's catalog does. The branch is therefore reachable-but-dead for AddWindowComposerDialog and reproduces AddChildWindowComposerDialog's existing per-checkbox tooltips unchanged — no user-visible tooltip was added or removed."
  - "prefill(AddWindowInitial) moves to the base for its checkbox/event-mask logic only; the title.setText(in.title) statement stays out of the shared method and is called from each subclass's own constructor immediately after prefill(initial), because title is part of the differing per-subclass field set (a base method cannot reference a field the base does not declare). This keeps the plan's single-abstract-hook constraint (refresh() only) while producing byte-identical prefill behavior."
  - "scheduleRefresh(), previewUnavailable(String), preselect(long...), addGroupedChecks(...), selected(Map), errorText(String) and prefill(...) are declared protected on the base (not the original private) so both subclasses can call them by inheritance; setSelected(Map, List) stays private static on the base since only the base's own prefill() calls it."

patterns-established:
  - "Base+thin-subclass extraction for DialogWrapper composers, mirroring BbjRunActionBase: one abstract hook, shared seam construction in the base constructor, subclass owns only its own field set and DTOs."

requirements-completed: [COMP-06]

coverage:
  - id: D1
    description: "AddWindowComposerDialog and AddChildWindowComposerDialog share one base (AddWindowFamilyComposerDialogBase) carrying the preview seam, debounce wiring, sequence-counter discipline, grouped-checkbox rendering and OK-gating discipline exactly once"
    requirement: "COMP-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBaseSourceGuardTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java"
        status: pass
      - kind: unit
        ref: "cd bbj-intellij && ./gradlew test (952 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both dialogs still gate OK on the server's own valid verdict and still render every one of the server's per-field error strings exactly once; the OK-gating discipline (three disables, two sequence checks) is preserved exactly across the base/subclass split"
    requirement: "COMP-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java#eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both dialogs open, preview, and write exactly as they do today, with no change to any label, default value or generated statement (backstop truth)"
    verification: []
    human_judgment: true
    rationale: "This is a no-observable-delta claim about live IDE behavior (dialog rendering, live preview, statement insertion/edit) that a headless JUnit source guard cannot verify — requires opening both dialogs in create and edit mode in a real IDE, per the standing v4.4 verification pattern for this project."

duration: ~40min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 06: AddWindow-Family Dialog Base Consolidation Summary

**Extracted `AddWindowFamilyComposerDialogBase` (preview seam, debounce wiring, sequence-counter discipline, grouped-checkbox rendering, OK-gating) from the duplicated `AddWindowComposerDialog`/`AddChildWindowComposerDialog`, converting both to thin subclasses over one abstract `refresh()` hook.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-18T10:05:00Z
- **Tasks:** 3
- **Files modified:** 6 (1 base created, 1 guard created, 2 dialogs converted, 3 guards re-pointed)

## Accomplishments

- Created `AddWindowFamilyComposerDialogBase`, an abstract `DialogWrapper` subclass carrying: the `PreviewDebouncer`/`AlarmScheduler`/`ComposerFlow` seam construction, the shared checkbox/display fields (`flagChecks`, `eventChecks`, `eventEnabled`, `eventPanel`, `statementField`, `flagsSummary`, `eventSummary`, `geometryPanel`), `preselect`, `updateEventEnabled`, `addGroupedChecks`, `selected`, `scheduleRefresh`, `previewUnavailable`, `errorText`, the checkbox/event-mask half of `prefill`, all four public getters, and the `SimpleDocumentListener` record — one abstract hook, `protected abstract void refresh();`.
- Converted both `AddWindowComposerDialog` and `AddChildWindowComposerDialog` to thin `final` subclasses: each keeps only its own field set (7 vs 9 text fields), its own error labels, its own schematic panel type (`WindowSchematicPanel`/`ChildWindowSchematicPanel`), `createCenterPanel()`, `refresh()` (observing its own preview DTO through the inherited `flow`), and `apply(...)` (gating OK on the server's `valid` verdict and rendering every per-field error).
- Verified the `addGroupedChecks` tooltip reconciliation directly against the language-server catalog source rather than assuming: `addwindow-composer.ts`'s `WINDOW_FLAGS`/`EVENT_MASK_BITS` never set `detail` on any item, so the tooltip branch (byte-identical to `addchildwindow-composer.ts`'s copy) is dead code for `AddWindowComposerDialog` and reproduces `AddChildWindowComposerDialog`'s existing tooltips unchanged — no hook needed, no visible change either way.
- Added `AddWindowFamilyComposerDialogBaseSourceGuardTest` with its own private helper copies, pinning the base's exactly-once seam construction, the brace-balanced bodies of `scheduleRefresh()` and `previewUnavailable(String)`, the abstract `refresh()` declaration's no-body contract, and a delegation pin per subclass (`extends AddWindowFamilyComposerDialogBase` once, `flow.observe(` once, `mySeq == seq.get()` twice).
- Re-pointed `ComposerDialogRefreshSourceGuardTest`, `ComposerFieldValidationSourceGuardTest`, and (as an out-of-plan-scope but necessary fix) `ComposerSwingHelpersSourceGuardTest` so every literal that moved onto the shared base is asserted there instead of per addWindow-family subclass file, while `MsgboxComposerDialog`, `SetoptsComposerDialog`, `SetoptsTriStateComposerDialog` and `CvsComposerDialog` keep their original per-file assertions at full breadth.
- Full `bbj-intellij` suite: 952 tests, 0 failures, 0 errors (baseline was 944; this plan added 8 new assertions net).

## Task Commits

1. **Task 1: Shared base carrying the addWindow dialog end-to-end** - `af6af3ff` (feat)
2. **Task 2: Convert the addChildWindow dialog to the same base** - `624f7cca` (feat)
3. **Task 3: New base guard and re-pointed refresh guard** - `ef7a3879` (test)

_No separate plan-metadata commit; this SUMMARY and STATE.md updates are committed together per the final_commit step._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBase.java` - new abstract base; seam construction, shared checkbox/display fields, `preselect`/`updateEventEnabled`/`addGroupedChecks`/`selected`/`scheduleRefresh`/`previewUnavailable`/`errorText`/`prefill`, four public getters, `SimpleDocumentListener`, one abstract `refresh()` hook
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` - thin subclass; own 7-field set, error labels, `WindowSchematicPanel`, `createCenterPanel()`, `refresh()`, `apply(AddWindowPreview)`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` - thin subclass; own 9-field set, error labels, `ChildWindowSchematicPanel`, `createCenterPanel()`, `refresh()`, `apply(AddChildWindowPreview)`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBaseSourceGuardTest.java` - new guard; own private `extractMethodBody`/`countOccurrences`/`withoutCommentLines`/`readSource` copies; pins the base's seam, method bodies, abstract-declaration shape and per-subclass delegation
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` - re-pointed every addWindow-family assertion (debounce-seam literals, OK-disable count split, `scheduleRefresh()`/`previewDebouncer.trigger()`/`this::refresh`/`ComposerFlow.once(`/`ModalityState.any()` location, sequence-increment split) to the base while keeping the other four dialogs at full per-file breadth
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java` - added a sweep of the base for the four forbidden validation-message fragments; `setOKActionEnabled(p.valid)` and per-field error assertions stay pointed at the two subclasses
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java` - re-pointed the addWindow-family `setEnabledRecursive(` delegation pin to the base (owned by 93-01, adjusted here since this plan's extraction moved that call site)

## Decisions Made

- Carried the `addGroupedChecks` tooltip branch unconditionally on the base rather than behind a `showsCatalogTooltips()` hook, after confirming against the actual catalog source that it is unreachable for addWindow — documented in the shared method's javadoc.
- Kept `prefill(...)`'s title-setting statement out of the shared method (it stays in each subclass constructor, called right after the inherited `prefill(initial)`), since `title` is a subclass-owned field the base cannot reference — this avoids adding a second abstract hook while producing byte-identical behavior to the pre-refactor code.
- Used `protected` (not the original `private`) for every method that moved to the base and is called by a subclass, and kept `setSelected` `private static` on the base since it is only ever called from the base's own `prefill()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `ComposerSwingHelpersSourceGuardTest` required re-pointing outside this plan's declared file list**
- **Found during:** Task 1 verification (`./gradlew test --tests "*.ComposerSwingHelpersSourceGuardTest"`)
- **Issue:** `bothAddWindowFamilyDialogsCallTheSharedLabeledWithErrorAndSetEnabledRecursiveHelpers` (owned by plan 93-01, not declared in this plan's `files_modified`) asserted `ComposerSwingHelpers.setEnabledRecursive(` appears exactly once per addWindow-family subclass file. Moving `updateEventEnabled()` (which makes that call) onto the shared base — as directed by this plan's Task 1 action — necessarily moves that call site out of both subclass files, failing the test without a fix.
- **Fix:** Added a base-file path constant and re-pointed the test to assert the call exactly once on the base and zero times in each subclass, leaving every other assertion in the file untouched.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java`
- **Verification:** `./gradlew test --tests "*.ComposerSwingHelpersSourceGuardTest"` passes; committed alongside Task 2 (the point at which both subclasses are converted and the guard's split assertion becomes fully satisfiable).
- **Committed in:** `624f7cca` (Task 2 commit)

**2. [Rule 3 - Blocking] `prefill(...)` could not move to the base as a wholly identical method**
- **Found during:** Task 1 design, before writing any code
- **Issue:** The plan's interface context describes `prefill(AddWindowInitial)` as byte-identical between the two dialogs and lists it among the methods that move onto the base. It is byte-identical as text, but its last statement (`title.setText(in.title)`) references a `title` field that is part of each subclass's own (differing) field set — a base method cannot reference a field the base does not declare, and the plan's acceptance criteria constrain the base to exactly one abstract hook (`refresh()`), ruling out a second `prefillTitle(...)` hook.
- **Fix:** Moved the checkbox/event-mask portion of `prefill(...)` (the part that references only base-owned fields) onto the base unchanged; left the one `title.setText(...)` statement in each subclass's own constructor, called immediately after `prefill(initial)`. Net behavior and statement order are identical to the pre-refactor code; only the code's file/method boundary changed.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBase.java`, `AddWindowComposerDialog.java`, `AddChildWindowComposerDialog.java`
- **Verification:** `ComposerFieldValidationSourceGuardTest` and the full suite (952 tests) pass; the constructor's `if (initial != null) { prefill(initial); if (initial.title != null) { title.setText(...); } }` shape matches the original `if (initial != null) { prefill(initial); }` where `prefill` itself did the title-setting — same net effect, same order.
- **Committed in:** `af6af3ff` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were necessary to keep the guarded invariants correct and the build green; neither changes any user-visible behavior, label, default value, or generated statement. No scope creep beyond the one sibling guard file the extraction structurally required.

## Issues Encountered

- The plan's line-number references in `<interface_context>` (e.g. `AddWindowComposerDialog.java:115-124`) were stale against the 93-01-modified tree (397/411 lines in the plan text vs. 368/382 lines on disk after 93-01's `ComposerSwingHelpers` extraction). Read the actual current files before writing any code rather than trusting the cited line numbers; all guard literals and acceptance criteria were verified against the real content, not the stale numbers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `AddWindowFamilyComposerDialogBase` is in place as the second base+thin-subclass precedent in this codebase (after `BbjRunActionBase`), ready for plan 93-08's SETOPTS dialog-side validation work to follow the same shape if it chooses to.
- Backstop truth D3 (dialogs behave identically) is flagged `human_judgment: true` in this SUMMARY's coverage block — requires opening both the addWindow and addChildWindow composers in create and edit mode at UAT to confirm identical dialogs, default selections and generated statements, per this plan's `<verification>` section.
- Full IntelliJ JUnit suite green: 952 tests, 0 failures, 0 errors.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

- FOUND: `.planning/phases/93-composer-robustness-consolidation/93-06-SUMMARY.md`
- FOUND: commit `af6af3ff` (Task 1)
- FOUND: commit `624f7cca` (Task 2)
- FOUND: commit `ef7a3879` (Task 3)
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBase.java`
