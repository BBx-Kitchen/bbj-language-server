---
phase: 90-composer-robustness-intellij-composer-performance
plan: 04
subsystem: intellij-composer
tags: [debounce, preview-debouncer, alarm-scheduler, msgbox, addwindow, addchildwindow, junit5]

requires:
  - phase: 90-composer-robustness-intellij-composer-performance
    provides: "plan 90-03's ComposerHandleCache and the pre-existing SetoptsComposerDialog/PreviewDebouncer/AlarmScheduler seam"
provides:
  - "MsgboxComposerDialog, AddWindowComposerDialog and AddChildWindowComposerDialog debounce every input through one shared PreviewDebouncer seam"
  - "ComposerDialogRefreshSourceGuardTest pins all six composer dialogs to the one debounce seam and forbids a direct refresh() call from any debounced dialog listener"
  - "PreviewDebouncerTest's millisecond-boundary test at the 300ms dialog delay under ManualScheduler"
affects: [90-05, 90-06, 90-07, 90-08]

actuals:
  tokens: 42000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "scheduleRefresh() helper: setOKActionEnabled(false) then previewDebouncer.trigger(), routing every listener instead of calling refresh() inline"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/PreviewDebouncerTest.java

key-decisions:
  - "Task 1 added only MSGBOX to DEBOUNCED_DIALOG_SOURCES (not all three dialogs at once), matching the plan's per-task scope; Task 2 added the remaining two after wiring their dialogs, keeping the guard red-then-green at each task boundary rather than red across both tasks"
  - "PreviewDebouncerTest's boundary test uses a second PreviewDebouncer instance for the mid-window-reschedule half, matching the plan's 'a fresh debouncer' wording, while sharing one ManualScheduler across both halves so runCount()/pendingCount()/cancelInvocations() assertions cover the whole test"

requirements-completed: []

coverage:
  - id: D1
    description: "MsgboxComposerDialog routes every input (custom-button fields, flag checkboxes, buttonSet/icon/defaultButton combos, useConstants, message/title/assignTo fields) through scheduleRefresh() over the shared PreviewDebouncer, with OK disabled until the debounced preview resolves"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "ComposerDialogRefreshSourceGuardTest#everyDebouncedDialogSharesTheOneDebounceSeamWithTheSameDelay"
        status: pass
      - kind: unit
        ref: "ComposerDialogRefreshSourceGuardTest#noDebouncedDialogListenerRefreshesDirectly"
        status: pass
      - kind: unit
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure"
        status: pass
    human_judgment: false
  - id: D2
    description: "AddWindowComposerDialog and AddChildWindowComposerDialog route the eventEnabled listener, every text-field document listener, and every addGroupedChecks checkbox through the identical scheduleRefresh() shape"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "ComposerDialogRefreshSourceGuardTest#debouncedDialogsRouteEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly"
        status: pass
    human_judgment: false
  - id: D3
    description: "SetoptsComposerDialog, CvsComposerDialog and SetoptsTriStateComposerDialog are unmodified (D-13)"
    verification:
      - kind: unit
        ref: "git diff --stat proves zero changes to the three files, checked at both task boundaries"
        status: pass
    human_judgment: false
  - id: D4
    description: "The millisecond boundary at the dialog delay (299ms early nothing runs, at 300ms exactly one run fires) and a mid-window input cancels and reschedules to yield one dispatch"
    verification:
      - kind: unit
        ref: "PreviewDebouncerTest#oneMillisecondEarlyNothingRunsAtTheDelayExactlyOneRunsAndAMidWindowInputReschedules"
        status: pass
    human_judgment: false
  - id: D5
    description: "The live 'type a burst and the preview updates once after typing stops' behavior in a real IntelliJ sandbox"
    verification: []
    human_judgment: true
    rationale: "Staged as an end-of-phase human check by plan 90-08 per this plan's own <verification> step 5; no IntelliJ sandbox runs in this devcontainer"

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 04: MSGBOX/addWindow/addChildWindow Composer Debounce Summary

**All three remaining IntelliJ composer dialogs now coalesce keystroke bursts into one preview request per settle point via the shared `PreviewDebouncer`/`AlarmScheduler` seam, matching `SetoptsComposerDialog`'s existing shape.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-12
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `MsgboxComposerDialog` gained `PREVIEW_DEBOUNCE_MS`, a `previewDebouncer` field, and a `scheduleRefresh()` helper; every listener (three custom-button fields, flag checkboxes, buttonSet/icon/defaultButton combos, `useConstants`, message/title/assignTo fields) now calls `scheduleRefresh()` instead of `refresh()` directly. `refresh()` itself is called only by the constructor (immediate) and by the debouncer's own action reference.
- `AddWindowComposerDialog` and `AddChildWindowComposerDialog` got the identical wiring: the `eventEnabled` listener runs `updateEventEnabled()` immediately then `scheduleRefresh()`; every text-field document listener and every `addGroupedChecks` checkbox route through `scheduleRefresh()`.
- `ComposerDialogRefreshSourceGuardTest`'s `DEBOUNCED_DIALOG_SOURCES` now lists all six composer dialogs (previously three), and two new tests pin the shared seam (`everyDebouncedDialogSharesTheOneDebounceSeamWithTheSameDelay`) and forbid any direct `refresh()` call from a debounced dialog's listener (`noDebouncedDialogListenerRefreshesDirectly`).
- `PreviewDebouncerTest` gained `oneMillisecondEarlyNothingRunsAtTheDelayExactlyOneRunsAndAMidWindowInputReschedules`, proving the exact millisecond boundary at the 300ms dialog delay and the burst-reschedule behavior under `ManualScheduler`.

## Listener routing per dialog (all through `scheduleRefresh()`)

| Dialog | Listener count routed |
|---|---|
| `MsgboxComposerDialog` | 3 custom-button fields, 1 flag-checkbox loop, buttonSet, icon, defaultButton, useConstants, message, title, assignTo — 1 `this::refresh` (debouncer action only), 0 direct `-> refresh()` |
| `AddWindowComposerDialog` | eventEnabled, 7 text fields (receiver/sysgui/title/x/y/width/height), all flag+event checkboxes via `addGroupedChecks` — 1 `this::refresh`, 0 direct `-> refresh()` |
| `AddChildWindowComposerDialog` | eventEnabled, 9 text fields (receiver/window/id/context/title/x/y/width/height), all flag+event checkboxes via `addGroupedChecks` — 1 `this::refresh`, 0 direct `-> refresh()` |

## Final `DEBOUNCED_DIALOG_SOURCES` list

`MSGBOX_SOURCE, ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE, SETOPTS_SOURCE, TRISTATE_SOURCE, CVS_SOURCE` — all six composer dialogs, each carrying three `setOKActionEnabled(false)` calls (constructor pre-refresh, `scheduleRefresh()`'s synchronous disable, and the failure-path disable) and exactly one `previewDebouncer.trigger()` call, reached only through `scheduleRefresh()`.

## Task Commits

1. **Task 1: Typing a burst in the MSGBOX dialog sends one debounced preview, with OK disabled until it resolves** - `b9a0134e` (feat)
2. **Task 2: The addWindow and addChildWindow dialogs debounce every input the same way, and the boundary at the dialog delay is pinned** - `590db515` (feat)

_Note: both tasks were TDD (`tdd="true"`) — each commit bundles the guard-test/behavior-test change together with the production wiring it proves, per the plan's "write the test changes first" action text; no separate RED-only commit was produced since the guard test already existed and only needed extension._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` - debounce wiring (Task 1)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` - debounce wiring (Task 2)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` - debounce wiring (Task 2)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` - `DEBOUNCED_DIALOG_SOURCES` extended in two steps (MSGBOX in Task 1, addWindow/addChildWindow in Task 2), two new shared-seam/no-direct-refresh tests, rewritten class/list Javadoc
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/PreviewDebouncerTest.java` - new millisecond-boundary/burst-reschedule test (Task 2)

## IntelliJ Test Counts

Filtered run (`com.basis.bbj.intellij.composer.*` + `com.basis.bbj.intellij.concurrency.*`): **236 tests, 0 failures** across 25 test classes. Whole-module `./gradlew test --offline` also green.

## Decisions Made

- Task 1 added only `MSGBOX_SOURCE` to `DEBOUNCED_DIALOG_SOURCES` rather than all three new dialogs at once, matching the plan's literal per-task scope ("Add `MSGBOX_SOURCE`..." in Task 1's action text). This was caught immediately: an initial attempt to add all three sources in Task 1 made `./gradlew test` fail against `AddWindowComposerDialog`/`AddChildWindowComposerDialog`, which were correctly still unwired at that point. Reverted to MSGBOX-only before Task 1's commit, then Task 2 added the remaining two after wiring their dialogs.
- The `PreviewDebouncerTest` boundary test's second half uses a fresh `PreviewDebouncer` instance sharing the same `ManualScheduler`, per the plan's "a fresh debouncer triggered at t=0" wording — this exercises a second object rather than reusing the first instance's already-fired state, while still allowing the whole-test `runCount()`/`pendingCount()`/`cancelInvocations()` assertions to cover both halves.
- Per the plan's tracer feedback gate: after Task 1's commit, the tracer's own `<verify>` (the two guard-test classes) was re-run end-to-end before starting Task 2's expansion — passed, so expansion proceeded without a checkpoint (auto mode active, `workflow._auto_chain_active: true`).

## Deviations from Plan

None - plan executed exactly as written. (The Task 1 DEBOUNCED_DIALOG_SOURCES over-scoping described above was caught and corrected before that task's commit, so no deviation was actually committed — it is documented here as a self-check note, not a Rule 1-4 deviation.)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six IntelliJ composer dialogs now share the one `PreviewDebouncer`/`AlarmScheduler` debounce seam with the same 300ms delay; `SetoptsComposerDialog`, `CvsComposerDialog` and `SetoptsTriStateComposerDialog` were verified unmodified at both task boundaries (D-13).
- DISC-10 is shared with plan 90-08 and stays Pending per this plan's instructions — only 90-08 (the final plan declaring it) may flip it to Complete.
- The live "type a burst and the preview updates once after typing stops" human check is staged for plan 90-08's end-of-phase verification, per this plan's `<verification>` step 5.
- Ready for 90-05.

---
*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*

## Self-Check: PASSED

All five modified/created source files confirmed present on disk; both task commits (`b9a0134e`, `590db515`) confirmed in `git log`; all plan-level `<acceptance_criteria>` re-verified passing; filtered composer+concurrency test run green (236/236); whole-module `./gradlew test --offline` green; register scan (`git diff $BASE..HEAD -- bbj-intellij`) clean; `bbj-vscode` diff empty.
