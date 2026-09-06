---
phase: 82-composer-robustness
plan: 01
subsystem: intellij-composer
tags: [completablefuture, notification-balloon, lsp4ij, junit5, source-guard]

requires:
  - phase: 81-feature-parity-and-correctness
    provides: CompileResultPresenter's plain-Java, reason-keyed presenter pattern and the balloon + console-mirror rendering shape this plan copies for the composer notice seam
provides:
  - A single terminal handler on the composer launch chain, so a server/catalogs/decodeCall failure always produces exactly one notification instead of nothing (#538, COMP-01)
  - ComposerNotices: the one plain-Java seam that decides title/body/severity/remedy for NOT_READY, REQUEST_FAILED and STALE_DOCUMENT from a machine-readable reason
  - ComposerFlow: the reusable composed-chain-plus-bounded-wait seam 82-02 extends for the dialog refresh() chains
  - ComposerNoticeRenderer: the balloon/console rendering call site in the existing "BBj Language Server" notification group
affects: [82-02-composer-robustness, 82-03-composer-robustness]

actuals:
  tokens: 13600
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Plain-Java flow seam composing CompletableFuture stages with thenCompose and exactly one terminal handle(), never nested thenAccept"
    - "copy().orTimeout(...) per stage so a bounded wait never force-completes a future owned by the LSP4IJ proxy"
    - "Reason-keyed notice presenter (never message-prose matching), mirroring Phase 81's CompileResultPresenter"
    - "Whole-file text source guards (with a withoutCommentLines filter ahead of every zero-count assertion) as the regression fence for wiring no unit test can otherwise pin"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java

key-decisions:
  - "ComposerFlow's terminal handle() unwraps CompletionException/ExecutionException down to the real cause before classifying it, so a NotReadySignal thrown at any nesting depth is recognized regardless of how many wrapper layers CompletableFuture's own machinery adds"
  - "The null-catalogs guards inside openMsgbox/openAddWindow/openAddChildWindow stay as a defensive second check (now rendering via ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(kind)), null) instead of the deleted modal), even though ComposerFlow already rejects a null top-level ComposerCatalogs before decodeCall runs"
  - "Task 2's nine ComposerNoticesTest cases all passed against Task 1's implementation with no production change needed -- the seam was already correct end to end, so Task 2 shipped as a test-only commit"

patterns-established:
  - "ComposerFlow.launch(kindLabel, serverFuture, decodeCall, onDecoded) is the shape 82-02 reuses for each dialog's refresh() chain"
  - "ComposerNotices.Reason/Severity/Notice is the shared vocabulary 82-02 and 82-03 route STALE_DOCUMENT and refresh-failure notices through, so the package keeps one notice vocabulary rather than growing a second"

requirements-completed: [COMP-01]

coverage:
  - id: D1
    description: "Every stage of the composer launch chain (server resolution, catalogs, decodeCall, and a hung request bounded by a 30s wait) surfaces its failure as exactly one notice instead of leaving an unobserved future"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerFlowTest#aFailedCatalogsRequestForcesOneChainToCompleteExceptionallyAndAssertsANotification"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aFailedDecodeRequestIsAlsoOneRequestFailedNotice"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aNullServerProxyIsNotReadyRatherThanRequestFailed"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#nullCatalogsAreAlsoNotReady"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aRequestThatNeverCompletesIsReportedAsRequestFailedWithinTheBoundedWait"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#theHappyPathHandsTheDecodedResultToTheSuccessContinuationAndRaisesNoNotice"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#exactlyOneNoticeIsRaisedEvenWhenTheFailureIsWrappedByTheFutureMachinery"
        status: pass
    human_judgment: false
  - id: D2
    description: "One notice seam (ComposerNotices) decides wording, severity and remedy for NOT_READY, REQUEST_FAILED and STALE_DOCUMENT purely from the reason and the throwable's type, never from message prose"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerNoticesTest (9 cases: wording, severity table, remedy, detailOf unwrap/timeout/no-message, shortReason, no-prose-matching)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Notices render as balloons in the existing 'BBj Language Server' notification group with the correct severity mapping, a 'Reopen composer' action where offered, and an error mirrored to the language-server console"
    human_judgment: true
    rationale: "C-01 keeps the platform off the test classpath, so the actual balloon and console rendering can only be confirmed in a running IDE (D-12); the call-site wiring itself is pinned by ComposerLauncherChainSourceGuardTest, not by a rendering test."
  - id: D4
    description: "ComposerLauncher.launch() is a thin adapter over ComposerFlow with no unobserved continuation left from the old nested-thenAccept pyramid, and the modal Messages.showInfoMessage path is gone"
    requirement: COMP-01
    verification:
      - kind: unit
        ref: "ComposerLauncherChainSourceGuardTest (10 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole IntelliJ JUnit module stays green after the rewrite"
    verification:
      - kind: other
        ref: "./gradlew test (352 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-05
status: complete
---

# Phase 82 Plan 01: Composer Launch Chain Notification Summary

**Flattened `ComposerLauncher.launch()`'s three-level unobserved-future pyramid into one `ComposerFlow`-composed chain with a single terminal handler, so every server/catalogs/decodeCall failure (including a 30s-bounded hang) now renders exactly one balloon through a new reason-keyed `ComposerNotices` seam instead of failing silently (#538).**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-05T18:49:37Z
- **Completed:** 2026-09-05T19:03:58Z
- **Tasks:** 3 completed
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- `ComposerFlow` composes `serverFuture -> composerCatalogs() -> decodeCall` into one chain, each stage bounded by `copy().orTimeout(30_000ms, ...)`, terminated by exactly one `handle()` that maps a null stage to `NOT_READY` and any throwable to `REQUEST_FAILED`
- `ComposerNotices` is the sole presenter for `NOT_READY`/`REQUEST_FAILED`/`STALE_DOCUMENT`: fixed wording per reason, a distinct severity per reason, and a `detailOf`/`shortReason` throwable-to-text pair that never renders an empty balloon body and never reads message prose to classify
- `ComposerNoticeRenderer` renders a `Notice` as a balloon in the existing "BBj Language Server" group (information/warning/error) with an optional "Reopen composer" action and an error-only console mirror via `BbjServerService.logToConsole`
- `ComposerLauncher.launch()` rewritten as a thin adapter: the EDT capture block is untouched, `notifyNotReady` and its modal `Messages.showInfoMessage` call are deleted, and each of the three composer kinds makes exactly one `flow.launch(...)` call
- 26 new tests across three classes (`ComposerFlowTest` 7, `ComposerNoticesTest` 9, `ComposerLauncherChainSourceGuardTest` 10) all green; whole IntelliJ module reports 352 tests, 0 failures

## Task Commits

Each task followed the RED-then-GREEN cycle (C-02):

1. **Task 1 RED: add failing test for composer launch chain notification** - `4c5a2a93` (test) — fails to compile without the seams (confirmed by temporarily removing them and re-running `compileTestJava`)
2. **Task 1 GREEN: flatten composer launch chain behind one notice seam** - `fddb095e` (feat)
3. **Task 2: pin the notice table's wording, severity, remedy and detail** - `a1dabd8c` (test) — all 9 cases passed against Task 1's implementation with no production change needed
4. **Task 3: pin the flattened chain and the single surfacing path** - `f850c798` (test) — includes a one-line javadoc wording fix in `ComposerNoticeRenderer` (see Deviations)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` — the notice presenter seam (created)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` — the composed-chain orchestration seam (created)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java` — the balloon/console rendering call site (created)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — `launch()` flattened, `notifyNotReady` deleted, `labelOf(Kind)` added (modified)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` — behavioural coverage of the launch chain (created)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java` — behavioural coverage of the notice table (created)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java` — source guard for the chain-flattening and single-surfacing-path invariants (created)

## Decisions Made

- `ComposerFlow`'s terminal `handle()` unwraps `CompletionException`/`ExecutionException` layers before checking `instanceof NotReadySignal`, so the null-server and null-catalogs signals are recognized correctly regardless of how many wrapper layers `CompletableFuture`'s internal machinery adds at each nesting level.
- The null-catalogs guards inside `openMsgbox`/`openAddWindow`/`openAddChildWindow` were kept as a defensive second check (per the plan's action text) even though `ComposerFlow` already rejects a null top-level `ComposerCatalogs` before any decodeCall runs — they now render through `ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(kind)), null)` instead of the deleted modal.
- Task 2's nine `ComposerNoticesTest` cases (including the three the plan flagged as likely to catch defects — a wrapped-cause detail, an empty body for a message-less throwable, and a multi-line `shortReason`) all passed against Task 1's implementation without any production change, because Task 1 was already built to the full notice-table spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ComposerNoticeRenderer`'s class javadoc doubled the "BBj Language Server" literal count**
- **Found during:** Task 3 (writing `theRendererUsesTheExistingNotificationGroupWithAllThreeSeverities`)
- **Issue:** The class javadoc quoted `"BBj Language Server"` (with quote marks) in its opening sentence, so the source guard's "exactly once" assertion against the raw file text counted two occurrences (the javadoc plus the real `getNotificationGroup(...)` call) instead of one.
- **Fix:** Removed the quote marks from the javadoc's mention of the group name — the sentence still names the group, just without literally repeating the quoted string.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java`
- **Verification:** `ComposerLauncherChainSourceGuardTest#theRendererUsesTheExistingNotificationGroupWithAllThreeSeverities` passes
- **Committed in:** `f850c798` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 doc-only wording fix). **Impact:** No behavior change; a comment-only correction so a source guard's literal count matches intent.

## Issues Encountered

None. TDD's fail-fast RED check ran as intended: temporarily removing the three new seam files reproduced a compile failure in `ComposerFlowTest.java` (36 errors, all "package ComposerNotices does not exist" / similar), confirming the test genuinely drives the seams rather than passing vacuously; restoring the seams turned the suite green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMP-01's launcher-chain half is green: `ComposerFlow`, `ComposerNotices` and `ComposerNoticeRenderer` are the shared seams 82-02 (dialog `refresh()` chains) and 82-03 (stale-edit guard's `STALE_DOCUMENT` notices) now build on, per D-11's ordering.
- COMP-01 itself is **not yet marked complete** in REQUIREMENTS.md — it is a shared requirement ID with 82-02, and `requirements.ready-ids` correctly withheld it pending 82-02's own SUMMARY.
- Outstanding manual verification for this plan (D-12, deferred to `/gsd-verify-work` UAT against a live IDE, since C-01 keeps the platform off the test classpath):
  1. With the language server stopped, invoking a composer from the editor popup or the lightbulb intention shows exactly one information balloon in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." — a balloon, not a modal dialog.
  2. Killing the language server process mid-invocation shows exactly one error balloon naming the composer and carrying the failure detail, and the same text appears in the language-server console tool window.
  3. A normal invocation with the server running still opens the correct composer dialog prefilled from the decoded call, and raises no balloon.

---
*Phase: 82-composer-robustness*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 4 task commits (`4c5a2a93`, `fddb095e`, `a1dabd8c`, `f850c798`) verified in git history; all task-level `<acceptance_criteria>` re-run and passing; plan-level `<verification>` commands re-run (`compileJava` succeeds, `ComposerFlowTest` 7/7, `ComposerNoticesTest` 9/9, `ComposerLauncherChainSourceGuardTest` 10/10, whole-module `./gradlew test` 352/352 with 0 failures).
