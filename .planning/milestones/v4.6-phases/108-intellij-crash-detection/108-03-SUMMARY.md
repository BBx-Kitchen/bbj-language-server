---
phase: 108-intellij-crash-detection
plan: 03
subsystem: ide-lifecycle
tags: [intellij, ui, status-bar, notification, lsp4ij, crash-detection]

requires:
  - phase: 108-intellij-crash-detection (plan 02)
    provides: "isServerCrashed() (set on every detected crash) and isAutoRestartAbandoned()
      (set only when auto-restart gives up), both republished on BbjServerStatusListener.TOPIC
      by applyCrashPolicy"
provides:
  - "the status-bar widget's distinct crashed rendering (BBj: Crashed, error icon, a tooltip
    that names whether the server is restarting or gave up), driven by isServerCrashed()/
    isAutoRestartAbandoned() read beside the closed ServerStatus enum, not as a new enum value"
  - "the editor banner gated on isAutoRestartAbandoned() only, so a quiet first crash never
    raises it"
  - "the IntelliJ feature docs naming the Crashed widget state and the banner's give-up trigger"
affects: [108-04-final-uat]

actuals:
  tokens: 3992
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a vendor-closed status enum's missing state is rendered as a separate boolean read at
      the top of each render hook, ahead of the enum switch, rather than smuggled into the
      switch itself"
    - "two facts from the same service (isServerCrashed, isAutoRestartAbandoned) feed two
      different UI components, each reading only the fact it needs -- the widget reads both,
      the banner reads only the give-up flag"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProviderSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
    - documentation/docs/intellij/features.md

key-decisions:
  - "A private service() accessor (BbjServerService.getInstance(project)) was added to
    BbjStatusBarWidget so all three render hooks read the crashed/give-up flags through one
    call site, matching the plan's own suggested shape rather than three separate
    getInstance() calls"
  - "Task 1 (type=tracer) ran its own RED/GREEN sequence inline -- guard test written and
    confirmed failing, then the widget change made it pass -- as one feat commit, since the
    task carries no tdd=true attribute; the tracer feedback gate (auto mode active,
    workflow.auto_advance=true) re-ran the task's <verify> after the commit and it passed, so
    execution proceeded straight to Task 2 with no checkpoint"

patterns-established: []

requirements-completed: []  # LIFE-01 stays open per this plan's own instruction -- plan 04's final UAT closes it

coverage:
  - id: D1
    description: "The status-bar widget shows BBj: Crashed with the error icon for every detected crash, including the first auto-restarted one, until the server starts again; the tooltip names whether it is restarting or gave up"
    verification:
      - kind: unit
        ref: "BbjStatusBarWidgetSourceGuardTest#crashedStateIsReadBeforeTheStatusSwitchInEachRenderHookAndRendersOnlyOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The editor banner appears only after auto-restart has given up, never for a quiet first crash, and keeps its Restart Server (requestRestart(0)) and Show Log actions"
    verification:
      - kind: unit
        ref: "BbjServerCrashNotificationProviderSourceGuardTest#panelGatesOnlyOnTheGiveUpFlagAndKeepsBothActionsAndTheRestartCall"
        status: pass
      - kind: unit
        ref: "BbjServerCrashNotificationProviderSourceGuardTest#classJavadocSaysTheBannerAppearsOnlyAfterAutoRestartHasGivenUp"
        status: pass
    human_judgment: false
  - id: D3
    description: "The IntelliJ feature docs list the Crashed widget state and say the Server Crash banner appears when the server crashed twice within 30 seconds and was not restarted"
    verification:
      - kind: other
        ref: "grep -c '**Crashed**' and grep -c 'crashed twice within 30 seconds' documentation/docs/intellij/features.md both return 1"
        status: pass
    human_judgment: false
  - id: D4
    description: "The widget and banner guards, BbjServerServiceRestartSourceGuardTest and the whole IntelliJ suite are green with --rerun-tasks"
    verification:
      - kind: other
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks --console=plain (BUILD SUCCESSFUL)"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-09-25
status: complete
---

# Phase 108 Plan 03: Crashed State in the Status Bar, Give-Up-Only Banner Summary

**BbjStatusBarWidget renders BBj: Crashed for every detected crash and BbjServerCrashNotificationProvider's banner now gates on isAutoRestartAbandoned() instead of the plain crashed flag, so a quiet, auto-restarted first crash raises no banner.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-25T13:45:00Z (approx.)
- **Completed:** 2026-09-25T13:55:34Z
- **Tasks:** 2 (1 tracer, 1 auto/tdd)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `BbjStatusBarWidget.iconFor`/`textFor`/`tooltipFor` each read `isServerCrashed()` before their
  `ServerStatus` switch (that vendor enum has no tenth "crashed" value to add), rendering
  `BBj: Crashed` with `BbjIcons.STATUS_ERROR`; the tooltip additionally reads
  `isAutoRestartAbandoned()` to say whether the server is restarting or gave up
- `BbjServerCrashNotificationProvider.buildPanel` now gates on `isAutoRestartAbandoned()`
  instead of `isServerCrashed()`, so the editor banner appears only when auto-restart has given
  up, never for the first, quietly auto-restarted crash; its `Restart Server` and `Show Log`
  actions, and the `requestRestart(0)` call, are unchanged
- New comment-aware source guards pin both invariants:
  `BbjStatusBarWidgetSourceGuardTest#crashedStateIsReadBeforeTheStatusSwitchInEachRenderHookAndRendersOnlyOnce`
  and the new `BbjServerCrashNotificationProviderSourceGuardTest`
- `documentation/docs/intellij/features.md` lists the **Crashed** widget state and rewords the
  **Server Crash** banner bullet to say it appears after a second crash within 30 seconds
- Whole IntelliJ suite green with `--rerun-tasks`

## Task Commits

Each task was committed atomically:

1. **Task 1: A detected crash shows "BBj: Crashed" in the status bar until the server is started
   again, end to end (tracer)** - `59a2c8dc` (feat) -- guard test added and confirmed failing,
   then `BbjStatusBarWidget`'s three render hooks changed to read the crashed/give-up flags
2. **Task 2: The editor banner appears only when auto-restart gives up; the feature docs
   describe both states (tdd)**
   - RED: `da31c112` (test) -- `BbjServerCrashNotificationProviderSourceGuardTest`, confirmed
     failing against the crashed-flag gate
   - GREEN: `99d6efb3` (feat) -- the banner regated on `isAutoRestartAbandoned()`, panel text
     reworded, and the two `features.md` doc lines updated

No separate plan-metadata commit is needed beyond this SUMMARY/STATE/ROADMAP commit below.

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` - crashed
  rendering in `iconFor`/`textFor`/`tooltipFor`, new private `service()` accessor
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` -
  new comment-aware guard pinning the crashed-state render order and text
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` -
  gate switched to `isAutoRestartAbandoned()`, panel text and class javadoc reworded
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProviderSourceGuardTest.java` -
  new file pinning the give-up-only gate, the two action labels, `requestRestart(0)`, and the
  class javadoc wording
- `documentation/docs/intellij/features.md` - new **Crashed** bullet in the Language Server
  Status list; reworded **Server Crash** banner bullet

## Decisions Made

See `key-decisions` in the frontmatter: the `service()` accessor added to
`BbjStatusBarWidget`, and Task 1's inline guard-first RED/GREEN sequence (no `tdd="true"`
attribute, so a single `feat` commit) followed by the tracer feedback gate re-running the
task's `<verify>` in auto mode (`workflow.auto_advance=true`) before Task 2 began.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

Task 2 (`tdd="true"`) followed the RED/GREEN cycle: `da31c112` is a `test(108-03):` commit
adding `BbjServerCrashNotificationProviderSourceGuardTest`, confirmed failing against the
pre-existing crashed-flag gate before any production change; `99d6efb3` is the following
`feat(108-03):` commit that makes it pass. No REFACTOR commit was needed. Gate sequence present
and correctly ordered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 04 (final UAT) can build directly on this plan's widget and banner behavior: the crashed
state is visible in the status bar from the moment a crash is detected, and the banner appears
only on the second `kill -9` within 30 seconds, matching the phase's D-14 hand-UAT scenarios.
LIFE-01 remains open in REQUIREMENTS.md, to be closed by the phase verifier once plan 04's
final hand-UAT evidence lands.

## Self-Check: PASSED

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java` -- FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` -- FOUND
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java` -- FOUND
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProviderSourceGuardTest.java` -- FOUND
- `documentation/docs/intellij/features.md` -- FOUND
- Commit `59a2c8dc` -- FOUND in `git log --oneline --all`
- Commit `da31c112` -- FOUND in `git log --oneline --all`
- Commit `99d6efb3` -- FOUND in `git log --oneline --all`
- Whole IntelliJ suite: `./gradlew test --rerun-tasks` -- BUILD SUCCESSFUL

---
*Phase: 108-intellij-crash-detection*
*Completed: 2026-09-25*
