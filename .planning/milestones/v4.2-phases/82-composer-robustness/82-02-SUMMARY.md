---
phase: 82-composer-robustness
plan: 02
subsystem: intellij-composer
tags: [completablefuture, notification-balloon, lsp4ij, junit5, source-guard, rate-limiting]

requires:
  - phase: 82-composer-robustness
    provides: "82-01's ComposerNotices, ComposerFlow (launch/handle/bounded), and ComposerNoticeRenderer -- the shared notice vocabulary and rendering call site this plan's observe()/once() extend"
provides:
  - "ComposerFlow.observe(request, timeoutMillis, onSuccess, onFailure): a single-request bounded observation with one terminal handle() where a throwable or a null result both reach onFailure, never a silent no-op (#538, COMP-01)"
  - "ComposerFlow.once(delegate) and ComposerFlow.REFRESH_TIMEOUT_MILLIS (10s): the one-shot balloon rate limiter and the dialog-refresh timeout, reused identically by all three dialogs"
  - "All three composer dialogs (MSGBOX, addWindow, addChildWindow) route refresh() through flow.observe(); a failed or empty preview whose sequence is current shows \"Preview unavailable -- <reason>\" and disables OK; the next successful preview clears both"
  - "ComposerDialogRefreshSourceGuardTest: a data-driven source guard over all three dialogs pinning the observe/sequence-check/OK-gating/rate-limit wiring so a regression fails the build instead of shipping a silently-accepted stale statement"
affects: [82-03-composer-robustness]

actuals:
  tokens: 10177
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Caller-owned sequence discard: observe() does not notify itself -- the caller (each dialog) checks its own AtomicInteger seq against the current value on both the success and failure callback before doing anything, so a superseded outcome of either kind is discarded identically and never consumes the balloon allowance"
    - "Per-instance one-shot notifier (ComposerFlow.once) using AtomicBoolean.compareAndSet(false, true), mirroring BackendNoticePolicy's check-then-set atomicity discipline, built fresh per dialog instance so each dialog session gets its own allowance"
    - "Data-driven source guard: one List<Path> of dialog sources iterated in a single @Test method per assertion, so a fourth composer dialog is a one-line addition to the list rather than a duplicated test class"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java

key-decisions:
  - "observe() deliberately does not notify -- only the caller's sequence number can say whether a superseded failure should be allowed to consume the session's single balloon, so the notify decision stays in each dialog's refresh() rather than moving into the seam"
  - "ComposerLauncherChainSourceGuardTest's whole-file 'exactly one handle()' assertion was rescoped to launch()'s own method body, because observe() legitimately adds a second, independent handle() for its own chain -- a Rule 1 fix to a pre-existing 82-01 test whose whole-file count assumption became stale once this plan's intended second chain existed"
  - "AddWindow/AddChildWindow's apply() gained setOKActionEnabled(true) -- the one genuinely new call relative to MSGBOX, since neither dialog gated OK before; it exists solely to undo the failure state, not as a general validity gate (flagged assumption #3 in the plan)"

patterns-established:
  - "ComposerFlow.observe/once is the shape any future composer dialog's refresh() chain reuses, exactly mirroring MsgboxComposerDialog's wiring"

requirements-completed: [COMP-01]

coverage:
  - id: D1
    description: "A failed, timed-out, or null preview reaching a dialog's refresh() callback shows \"Preview unavailable -- <reason>\" and disables OK, never silently leaving the last-good state in place"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerFlowTest#aFailedPreviewRequestReachesTheFailureCallbackWithTheCauseAndNeverTheSuccessCallback"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aPreviewThatCompletesWithNullReachesTheFailureSideRatherThanBeingIgnored"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aPreviewThatNeverCompletesIsBoundedByTheRefreshWait"
        status: pass
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogLabelsAFailureAndDisablesOkExactlyOnce (all 3 dialogs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A superseded preview outcome (success or failure) is discarded identically and never consumes the dialog session's single balloon allowance"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerFlowTest#aSupersededSequenceDiscardsAFailureExactlyAsItDiscardsASuccess"
        status: pass
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogChecksItsSequenceOnBothTheSuccessAndTheFailurePath (all 3 dialogs)"
        status: pass
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogTakesItsSequenceNumberBeforeObservingTheRequest (all 3 dialogs)"
        status: pass
    human_judgment: false
  - id: D3
    description: "At most one refresh balloon is raised per dialog session, rendered through the same ComposerNotices/ComposerNoticeRenderer seam and \"BBj Language Server\" group the launcher uses, however many keystrokes fail"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerFlowTest#theOneShotNotifierForwardsExactlyOneNoticeHoweverManyArrive"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#theOneShotNotifierIsPerInstanceSoASecondDialogSessionCanStillWarn"
        status: pass
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogRateLimitsItsBalloonToOnePerDialogSession (all 3 dialogs)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No composer dialog retains a continuation whose result nobody observes any more -- all three route through flow.observe() with no bare thenAccept()/thenCompose()"
    requirement: COMP-01
    verification:
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#noDialogObservesOnlyTheSuccessSideOfItsPreviewRequestAnyMore (all 3 dialogs)"
        status: pass
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogObservesThroughTheFlowSeamWithTheRefreshTimeout (all 3 dialogs)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Successful previews behave exactly as before -- no dialog constructor signature changed, UI updates still go through ModalityState.any(), and no platform test framework or new IntelliJ import crept into the seam"
    requirement: COMP-01
    verification:
      - kind: other
        ref: "ComposerDialogRefreshSourceGuardTest#eachDialogUpdatesItsUiThroughTheDialogsExistingModality, #theFlowSeamStillCarriesNoIntelliJImportAndTheRateLimiterIsAtomic, #noPlatformTestFrameworkCreptIn"
        status: pass
      - kind: other
        ref: "git diff shows no change to any `public AddWindowComposerDialog(`/`public AddChildWindowComposerDialog(`/`public MsgboxComposerDialog(` line"
        status: pass
    human_judgment: false
  - id: D6
    description: "The whole IntelliJ JUnit module stays green after the rewrite"
    verification:
      - kind: other
        ref: "./gradlew test (367 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Live-IDE behaviour: stopping the language server while a composer dialog is open and typing shows \"Preview unavailable\", disables OK, and raises exactly one balloon per dialog session; restarting the server and typing again restores both; all three composers name their own composer in the balloon; reopening a dialog after a failure allows a second balloon; rapid typing with the server running never flickers back to an older preview"
    human_judgment: true
    rationale: "C-01 keeps DialogWrapper and the notification platform off the test classpath, so this behaviour can only be confirmed in a running IDE (D-12). The seam behind it (observe/once/sequence-discard) is fully proven behaviourally above; only the live Swing/notification wiring needs a human."

duration: 13min
completed: 2026-09-05
status: complete
---

# Phase 82 Plan 02: Composer Dialog Refresh Failure Handling Summary

**All three composer dialogs (MSGBOX, addWindow, addChildWindow) now route their per-keystroke `refresh()` preview request through a new `ComposerFlow.observe()`/`once()` seam, so a failed, timed-out, or null preview shows "Preview unavailable — `<reason>`" and disables OK instead of silently leaving the last-good state acceptable, with the balloon rate-limited to one per dialog session (#538).**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-05T19:06:04Z (immediately after 82-01)
- **Completed:** 2026-09-05T19:17:27Z
- **Tasks:** 3 completed
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `ComposerFlow.observe(request, timeoutMillis, onSuccess, onFailure)`: bounds a single request the same way `launch()` bounds each of its stages (`copy().orTimeout(...)`), terminates with one `handle()`, and routes a throwable *or* a normal completion with `null` both to `onFailure` through the injected EDT executor — a null preview reaching the failure side is exactly the silent no-op #538 is about. Deliberately does not notify itself; the caller's sequence number decides whether a superseded outcome may touch the balloon allowance.
- `ComposerFlow.once(delegate)`: a per-instance one-shot notice consumer using `AtomicBoolean.compareAndSet(false, true)`, proven both sequentially (5 notices → 1 forwarded) and under 8-thread concurrency (8 near-simultaneous notices → 1 forwarded), and proven per-instance (two `once()` wrappers over the same delegate each get their own allowance).
- `ComposerFlow.REFRESH_TIMEOUT_MILLIS = 10_000L`, an order of magnitude below `LAUNCH_TIMEOUT_MILLIS` since a preview is a pure local server computation.
- All three dialogs store the constructor's `project`, build one `ComposerFlow` + one `ComposerFlow.once(...)`-wrapped balloon notifier per instance, and rewrite `refresh()` to hand the preview request to `flow.observe(...)`. Each callback checks `mySeq == seq.get()` before doing anything; on a still-current failure, a new `previewUnavailable(String)` sets the dialog's existing summary label to `"Preview unavailable — <reason>"` and calls `setOKActionEnabled(false)`, then notifies once. `apply(preview)` already restores both halves on the next success for MSGBOX (existing code); the two window dialogs gained one new `setOKActionEnabled(true)` line in `apply()` to undo the failure state, since they never gated OK before.
- `ComposerDialogRefreshSourceGuardTest` (9 tests): a data-driven guard iterating all three dialog sources from one list, pinning no-bare-`thenAccept`/`thenCompose`, exactly one `flow.observe(`, exactly one `Preview unavailable — ` and one `setOKActionEnabled(false)`, exactly one `ComposerFlow.once(`, exactly two `mySeq == seq.get()` occurrences (success and failure paths), sequence-taken-before-observe ordering, `ModalityState.any()` presence, `ComposerFlow`'s no-IntelliJ-import and atomic `compareAndSet`, and no platform test framework in `build.gradle.kts`.
- Whole IntelliJ module: 367 tests, 0 failures, 0 errors (up from 82-01's 352).

## Task Commits

Each task followed the RED-then-GREEN cycle (C-02):

1. **Task 1 RED: add failing tests for dialog refresh observe/once seam** — `c0643b41` (test) — 13 compile errors confirmed (`observe`/`once`/`REFRESH_TIMEOUT_MILLIS` don't exist) before the production change
2. **Task 1 GREEN: observe/once flow seam + MSGBOX refresh failure handling** — `b75b077f` (feat) — includes the Rule 1 fix to `ComposerLauncherChainSourceGuardTest` (see Deviations)
3. **Task 2: same refresh failure handling for addWindow and addChildWindow** — `0a4ee07c` (feat)
4. **Task 3: pin all three dialogs' refresh wiring, whole module green** — `28fdf0cc` (test)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` — `observe()`, `once()`, `REFRESH_TIMEOUT_MILLIS`, `bounded()` refactored to take an explicit timeout (modified)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` — `project`/`flow`/`balloonOnce` fields, `refresh()` rewritten, `previewUnavailable(String)` added (modified)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java` — same wiring; `apply()` gained `setOKActionEnabled(true)` (modified)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java` — same wiring; `apply()` gained `setOKActionEnabled(true)` (modified)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` — 6 new behavioural tests (Tests 8-13) for `observe`/`once` (modified)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java` — the "exactly one `handle(`" assertion rescoped to `launch()`'s own body (modified, Rule 1)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` — new data-driven source guard over all three dialogs (created)

## Decisions Made

- `observe()` deliberately does not notify — only the caller's sequence number can say whether a superseded failure should be allowed to consume the session's single balloon, so notification stays in each dialog's `refresh()` rather than moving into the shared seam.
- `ComposerLauncherChainSourceGuardTest`'s whole-file "exactly one `handle(`" assertion was rescoped to `launch()`'s own method body substring (see Deviations) — `observe()` legitimately owns a second, independent terminal handler for a different chain.
- `AddWindowComposerDialog`/`AddChildWindowComposerDialog`'s `apply()` each gained `setOKActionEnabled(true)`, the one genuinely new call relative to MSGBOX, existing solely to undo the failure state — not a general validity gate, since neither dialog has a `preview.valid` field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ComposerLauncherChainSourceGuardTest`'s whole-file `handle(` count assumption broke on the new `observe()` method**
- **Found during:** Task 1 GREEN (running `./gradlew test --tests 'com.basis.bbj.intellij.composer.*'` after wiring MSGBOX)
- **Issue:** 82-01's `theFlowSeamsSingleTerminalHandlerReallyTerminatesTheChain()` asserted `countOccurrences(wholeFileText, "handle(") == 1`, correct when `ComposerFlow.java` had only `launch()`'s terminal handler. This plan's `observe()` intentionally adds its own independent `handle()` for its own chain (D-06: `observe` does not notify, so it needs its own terminal handler), which made the whole-file count 2 and failed the test — not a defect in the production code, but a test assumption invalidated by legitimate new code this plan was designed to add.
- **Fix:** Rescoped the count and the thenCompose/handle ordering check to `launch()`'s own method body (substring between the method signature and the next declaration), leaving the `orTimeout(` presence check whole-file since `bounded()` is shared by both methods.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java`
- **Verification:** `ComposerLauncherChainSourceGuardTest` all tests pass; whole module 367/367 green
- **Committed in:** `b75b077f` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 test-assumption fix, no production behavior change). **Impact:** No scope creep — the fix only re-scopes an existing regression guard to remain accurate now that `ComposerFlow` legitimately hosts two independent chains' terminal handlers.

## Issues Encountered

None beyond the deviation above. TDD's fail-fast RED check ran as intended: the appended Task 1 tests produced 13 compile errors referencing the not-yet-existing `observe`/`once`/`REFRESH_TIMEOUT_MILLIS` symbols, confirming the tests genuinely drive the new seam rather than passing vacuously.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- COMP-01 is now fully closed: both halves (82-01's launcher chain, 82-02's dialog refresh chains) share one failure-surfacing convention (`ComposerNotices`/`ComposerNoticeRenderer`/"BBj Language Server" group) and one flow seam (`ComposerFlow`).
- 82-03 (COMP-02, the stale-edit guard) can now build on this plan's `ComposerFlow`/`ComposerNotices` seams per D-11's build order, without inheriting a second failure-surfacing convention.
- Outstanding manual verification for this plan (D-12, deferred to `/gsd-verify-work` UAT against a live IDE, since C-01 keeps the platform off the test classpath):
  1. Open a composer dialog, stop the language server, then type in one of its fields: the summary/flags-summary label reads "Preview unavailable — `<reason>`", the OK button becomes disabled, and exactly one balloon appears in the "BBj Language Server" group however long the typing continues.
  2. Restart the language server and type again: the label returns to its normal content and OK becomes usable again.
  3. Repeat for all three composers — MSGBOX, addWindow and addChildWindow — and confirm each balloon names its own composer.
  4. Close and reopen the dialog after a failure and confirm a second balloon is allowed, since the rate limit is per dialog session.
  5. Type rapidly with the server running and confirm the statement, summaries and schematic still track the newest keystroke, with no flicker back to an older preview.

---
*Phase: 82-composer-robustness*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 4 task commits (`c0643b41`, `b75b077f`, `0a4ee07c`, `28fdf0cc`) verified in git history; all task-level `<acceptance_criteria>` re-run and passing (grep checks for `flow.observe(`, `Preview unavailable — `, `setOKActionEnabled(false/true/p.valid)`, `ModalityState.any()`, `compareAndSet(false, true)`, `mySeq == seq.get()` counts and orderings, constructor-signature diffs, plugin.xml/build.gradle.kts/composer-commands.ts unchanged); plan-level `<verification>` commands re-run: `compileJava` succeeds, `ComposerFlowTest` 13/13, `ComposerDialogRefreshSourceGuardTest` 9/9, composer package 4 classes all green, whole-module `./gradlew test` 367/367 with 0 failures and 0 errors.
