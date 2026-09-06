---
phase: 82-composer-robustness
plan: 03
subsystem: intellij-composer
tags: [completablefuture, decode-equality, write-command, junit5, source-guard]

requires:
  - phase: 82-composer-robustness
    provides: "82-01's ComposerNotices/ComposerFlow/ComposerNoticeRenderer notice seam and 82-02's ComposerFlow.observe/once bounded-request idiom -- this plan's StaleEditGuard reuses the same notice vocabulary and the same copy().orTimeout() bounded-wait pattern for its re-decode request"
provides:
  - "DecodeEquality: field-wise equality over the three decodeCall results (sameMsgbox/sameAddWindow/sameAddChildWindow) covering found, the edit payload, initial and trailingArgs, with int[] ranges compared element-wise and nulls handled on either side (#567, COMP-02)"
  - "StaleEditGuard.applyIfUnchanged(kindLabel, capturedLine, capturedCol, capturedDecode, reDecode, sameDecode, applyEdit): re-reads the captured line's current text and modification stamp, re-runs the same decodeCall the launch used, and writes only on a full-decode match, with the stamp re-checked as the first statement inside the write command"
  - "All three composer edit-in-place apply paths (MSGBOX replace, addWindow hex edit, addChildWindow hex edit) route their only writes through the guard; the create flow (insertAtCaret) stays outside it"
  - "ComposerApplyGuardSourceGuardTest: pins that no replaceString( escapes a guarded applyIfUnchanged( body, that all three edit flows carry their own comparator, that the re-decode reuses each launch's own decodeCall request, and that the create path never acquires a guard"
affects: []

actuals:
  tokens: 17150
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Stale-capture guard: re-read live state (line text + modification stamp) at apply time, re-run the exact same idempotent request the original capture used, compare the whole result by value, and write only on a match -- generalizes BackendNoticePolicy's read-compare-write discipline to an async re-decode-then-write sequence"
    - "Modification-stamp re-check as the write command's first statement, closing the gap between an async re-decode completing and the synchronous write starting -- a second staleness check layered on top of the first, at a different point in time"
    - "Field-wise DTO equality via java.util.Objects.equals/Arrays.equals rather than canonical-JSON, so the comparator's own field list is the equality contract and a rationale sentence documents that a new DTO field must be added there too"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/StaleEditGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java

key-decisions:
  - "applyHexEdit became generic over the decode type (<D>), taking the kind label, captured line/column, captured decode, re-decode function and equality predicate as explicit parameters rather than a context object, per the plan's own instruction -- each of the two window call sites reads as the exact contract it fulfills"
  - "Notifier calls inside StaleEditGuard's async handler (throwable, mismatch, and the write-command's own stamp re-check) are all dispatched through the injected onEdt executor, matching ComposerFlow.observe's discipline that anything reaching a UI-facing notifier runs on the dispatch thread -- only the synchronous pre-flight check (null decode / out-of-range line) notifies directly, since it already runs on the calling dispatch thread"
  - "Rule 1: removed two \"(C-01)\" references that slipped into StaleEditGuard.java's and StaleEditGuardTest.java's class javadoc during Tasks 1-2, discovered by Task 3's own diff-for-planning-identifiers check -- no other composer file in this phase writes a planning identifier into a comment; assertion-message occurrences of \"(C-01)\" in the three *SourceGuardTest classes are pre-existing 82-01/82-02 precedent (string literals, not comment lines) and were left as-is"

patterns-established:
  - "StaleEditGuard is the single choke point for every edit-in-place write in composer/; a future fourth composer apply path routes through the same guard rather than adding a fourth ad hoc re-check"

requirements-completed: [COMP-02]

coverage:
  - id: D1
    description: "The MSGBOX apply path re-decodes the captured line's current text at the captured column and writes only when the fresh decode fully matches the pre-dialog one; a mutated line, a line inserted above the call, or a captured line beyond the document's current line count all abort with exactly one STALE_DOCUMENT notice and no write"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "StaleEditGuardTest#mutatesTheDocumentWhileTheDialogIsOpenAndAssertsNoEditIsApplied"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#aLineInsertedAboveTheCallShiftsTheIndexAndAbortsTheEdit"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#anUnchangedDocumentAppliesExactlyTheExpectedOperations"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#aCapturedLineBeyondTheCurrentLineCountAbortsWithoutThrowing"
        status: pass
    human_judgment: false
  - id: D2
    description: "A re-decode request that fails exceptionally, never completes within the bounded wait, or completes with a null result is treated as a mismatch (never a vacuous match) and reported through the same REQUEST_FAILED/STALE_DOCUMENT notice convention as every other composer failure"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "StaleEditGuardTest#aReDecodeThatFailsExceptionallyIsAReqestFailedNoticeAndStillNoEdit"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#aReDecodeThatNeverCompletesIsBoundedAndStillAppliesNothing"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#aNullFreshDecodeIsTreatedAsAMismatchRatherThanAsAMatch"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#theReDecodeIsIssuedAgainstTheCurrentLineTextAtTheCapturedColumn"
        status: pass
    human_judgment: false
  - id: D3
    description: "The document's modification stamp is snapshotted alongside the captured line text and re-checked as the first statement inside the write command, so a document change landing in the window between the re-decode completing and the write starting still aborts the edit"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "StaleEditGuardTest#aStampChangedBetweenTheReDecodeAndTheWriteAbortsInsideTheWriteCommand"
        status: pass
    human_judgment: false
  - id: D4
    description: "Decode equality is field-wise across found, the edit payload, initial and trailingArgs (not just the edit ranges), with int[] ranges compared element-wise via Arrays.equals rather than by reference identity, and nulls handled on either side without throwing, for all three decode shapes (msgbox/addWindow/addChildWindow)"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "DecodeEqualityTest (7 cases: identical-match, ranges-identical-but-initial-differs, per-field mutation table for msgbox and addWindow, null handling, element-wise array comparison, addChildWindow parity)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both window apply paths (addWindow, addChildWindow) are routed through the same guard as MSGBOX, sharing one applyHexEdit implementation; the flags/event-mask operations are still emitted from the highest start offset down when the decode matches, and emit nothing when it does not"
    requirement: COMP-02
    verification:
      - kind: unit
        ref: "StaleEditGuardTest#theWindowApplyPathEmitsItsOperationsFromHighestOffsetDownWhenTheDecodeMatches"
        status: pass
      - kind: unit
        ref: "StaleEditGuardTest#theWindowApplyPathEmitsNothingWhenTheDecodeDoesNotMatch"
        status: pass
    human_judgment: false
  - id: D6
    description: "No composer write escapes the guard, all three edit flows carry their own comparator, the re-decode reuses each launch's own decodeCall request rather than a new one, the create path (insertAtCaret) never acquires a guard, the window operation order is unchanged, both new seams carry no IntelliJ import, and no platform test framework crept into the build"
    requirement: COMP-02
    verification:
      - kind: other
        ref: "ComposerApplyGuardSourceGuardTest (10 cases)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The whole IntelliJ JUnit module stays green after the rewrite; bbj-vscode/, plugin.xml and build.gradle.kts are untouched by this phase"
    verification:
      - kind: other
        ref: "./gradlew test (395 tests, 0 failures, 0 errors); git diff --stat against plugin.xml/build.gradle.kts/bbj-vscode/ all empty"
        status: pass
    human_judgment: false
  - id: D8
    description: "Live-IDE behaviour: a composer dialog opened on a MSGBOX/addWindow/addChildWindow call, edited on the same line in another split editor while the dialog is open, then confirmed with OK shows a warning balloon naming nothing was changed, leaves the document byte-for-byte untouched, and offers a working 'Reopen composer' action; a line inserted above the call produces the same abort; an unchanged document still applies exactly as before with a single Undo; a re-decode against a stopped language server reports an error balloon and no write; the create flow is unaffected by the guard"
    human_judgment: true
    rationale: "C-01 keeps DialogWrapper, WriteCommandAction's real editor integration and the notification platform off the test classpath, so the modal dialog, the write command and the balloon action can only be confirmed in a running IDE (D-12). The guard's decision logic (re-decode, compare, stamp re-check) is fully proven behaviourally above; only the live Swing/document/notification wiring needs a human."

duration: 12min
completed: 2026-09-05
status: complete
---

# Phase 82 Plan 03: Stale-Edit Guard for Composer Apply Paths Summary

**All three composer edit-in-place apply paths (MSGBOX replace, addWindow and addChildWindow hex edits) now re-decode the captured line's current text through a new `StaleEditGuard`/`DecodeEquality` seam before writing, aborting with a warning notice on any mismatch instead of silently rewriting whatever text now occupies the captured range (#567).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-05T19:24:37Z
- **Completed:** 2026-09-05T19:36:15Z
- **Tasks:** 3 completed
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- `StaleEditGuard.applyIfUnchanged(kindLabel, capturedLine, capturedCol, capturedDecode, reDecode, sameDecode, applyEdit)`: on the calling (dispatch) thread, a null capture or an out-of-range captured line is an immediate `STALE_DOCUMENT` abort with no request issued; otherwise it snapshots the current line text and modification stamp, re-runs the caller-supplied `<kind>DecodeCall` bounded the same way `ComposerFlow` bounds its own stages (`copy().orTimeout(...)`), and terminates with one handler: a throwable becomes `REQUEST_FAILED`, a null or mismatched fresh decode becomes `STALE_DOCUMENT`, and a match dispatches the write through the injected EDT executor — whose write command re-checks the modification stamp as its *first* statement before running the caller's apply body, closing the async window between the re-decode completing and the write starting.
- `DecodeEquality.sameMsgbox/sameAddWindow/sameAddChildWindow`: field-wise, null-safe comparison of the three decode shapes — `found`, the edit payload (`callStart`/`callEnd` for msgbox; `flagsRange`/`eventMaskRange` compared with `Arrays.equals`, both insert offsets and both preserved-bit longs for the window shapes), the whole `initial` payload, and the top-level `trailingArgs` — so a decode whose ranges line up but whose arguments changed underneath it is still a mismatch.
- `ComposerLauncher.openMsgbox` threads the captured column through and routes its `replaceString` through a guard built exactly like the other two; `applyHexEdit` became generic over the decode type and is now the single guarded write body shared by `applyAddWindowEdit` and `openAddChildWindow`, each supplying its own comparator and re-decode request. `insertAtCaret` and all three create branches are untouched.
- 27 new tests across three classes (`StaleEditGuardTest` 11, `DecodeEqualityTest` 7, `ComposerApplyGuardSourceGuardTest` 10), all green; composer package now has 7 test classes (all green); whole IntelliJ module: 395 tests, 0 failures, 0 errors (up from 82-02's 367).

## Task Commits

Each task followed the RED-then-GREEN cycle (C-02):

1. **Task 1 RED: add failing test for the stale-edit guard's MSGBOX path** — `f7dbc40a` (test) — fails to compile without `StaleEditGuard`/`DecodeEquality` (confirmed: 25 compiler errors)
2. **Task 1 GREEN: guard the MSGBOX apply path against a stale captured line** — `2ff03955` (feat)
3. **Task 2 RED: add failing tests for the two window apply paths and full field-wise comparison** — `d10f2d6c` (test) — fails to compile without `sameAddWindow`/`sameAddChildWindow` (confirmed: 8 compiler errors)
4. **Task 2 GREEN: guard the two window apply paths and finish the field-wise comparator** — `08898e28` (feat)
5. **Task 3: pin that no composer write escapes the stale-edit guard** — `4ce00365` (test) — includes the Rule 1 javadoc fix (see Deviations)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` — field-wise decode comparator (created)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java` — the stale-edit guard (created)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — all three edit-in-place apply paths rewired through the guard (modified)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/StaleEditGuardTest.java` — 11 behavioural cases (created)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` — 7 field-wise cases (created)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java` — 10-case source guard (created)

## Decisions Made

- `applyHexEdit` became generic over the decode type (`<D>`), taking the kind label, captured line/column, captured decode, re-decode function and equality predicate as explicit parameters rather than a context object, exactly as the plan directed — each of `applyAddWindowEdit` and `openAddChildWindow` reads as the exact contract it fulfills.
- Every notifier call reached from `StaleEditGuard`'s async handler (the throwable branch, the mismatch branch, and the write command's own stamp re-check) is dispatched through the injected `onEdt` executor, mirroring `ComposerFlow.observe`'s discipline of never letting a UI-facing notifier run off the dispatch thread. Only the synchronous pre-flight check (null capture / out-of-range line) notifies directly, since that code path already runs on the calling dispatch thread by construction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Process violation] Removed two "(C-01)" references from Task 1/2's own class javadoc**
- **Found during:** Task 3's own "check the diff for planning identifiers" step (the plan's `<action>` explicitly requires this before handing off)
- **Issue:** `StaleEditGuard.java`'s and `StaleEditGuardTest.java`'s class javadoc each closed with a sentence ending "(C-01)". The plan's `MUST NOT` prohibition list bars writing a `D-xx`/`C-xx` reference into any source or test comment, and no other composer file this phase touches does this — `ComposerFlow.java`, `ComposerNotices.java`, `ComposerNoticeRenderer.java` and their tests all describe the same C-01 constraint (no IntelliJ import, plain-JUnit-5-runnable) in prose, without the parenthetical citation.
- **Fix:** Reworded both sentences to drop the `(C-01)` citation while keeping the substantive claim (no IntelliJ import; runs on the plain JUnit 5 classpath).
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/StaleEditGuardTest.java`
- **Verification:** `git diff f7dbc40a^ HEAD -- bbj-intellij/src` re-run with the planning-identifier grep (`D-0|C-0|SEC-|phase/plan number`) returns no matches; `grep -nE '^\s*(\*|//|/\*)'` over every new/modified composer file confirms no comment line carries a planning identifier. (Pre-existing `(C-01)` occurrences inside three `*SourceGuardTest` classes' assertion-message string literals — 82-01's `ComposerLauncherChainSourceGuardTest` and 82-02's `ComposerDialogRefreshSourceGuardTest`, plus this plan's own `ComposerApplyGuardSourceGuardTest` — are not comment lines and match established precedent; left unchanged.)
- **Committed in:** `4ce00365` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 process-hygiene comment fix, no behavior change). **Impact:** None on functionality; keeps the phase's public-PR planning-identifier discipline (C-04) consistent across all three plans.

## Issues Encountered

None beyond the deviation above. TDD's fail-fast RED check ran as intended for both tasks: Task 1's test file produced 25 compiler errors referencing the not-yet-existing `StaleEditGuard`/`DecodeEquality` symbols before any production code existed; Task 2's appended tests produced 8 compiler errors referencing the not-yet-existing `sameAddWindow`/`sameAddChildWindow` methods before the comparator was extended. Both confirmed the tests genuinely drive the implementation rather than passing vacuously.

The plan's own Task 3 text says to "confirm the composer package's six test classes all executed" — the actual count is seven (`ComposerFlowTest`, `ComposerNoticesTest`, `ComposerLauncherChainSourceGuardTest`, `ComposerDialogRefreshSourceGuardTest` from 82-01/82-02, plus this plan's `StaleEditGuardTest`, `DecodeEqualityTest` and `ComposerApplyGuardSourceGuardTest`). This does not fail the plan's own `<verify>` gate, whose `<fails_when>` condition is "fewer than 6 test classes reported" — seven satisfies that. Noted here as a minor planning-text miscount, not a gap.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- COMP-02 is fully implemented and test-covered; combined with 82-01/82-02's COMP-01 closure, both of Phase 82's requirements (`#538`/COMP-01, `#567`/COMP-02) have their production code and automated regression coverage complete. `REQUIREMENTS.md` marks COMP-02 pending until this SUMMARY is processed by the plan-completion state update below.
- The composer package now has one consistent choke point (`StaleEditGuard`) for every edit-in-place write, one consistent decode-equality contract (`DecodeEquality`), and one consistent failure-surfacing seam (`ComposerNotices`/`ComposerFlow`/`ComposerNoticeRenderer` from 82-01/82-02) — a future fourth composer would extend all three rather than inventing new ones.
- Outstanding manual verification for this plan (D-12, deferred to `/gsd-verify-work` UAT against a live IDE, since C-01 keeps the platform off the test classpath):
  1. Open a composer on a `MSGBOX` call, edit that same line in another split editor while the dialog is open, then press OK: a warning balloon appears in the "BBj Language Server" group saying nothing was changed, the document is byte-for-byte untouched, and the "Reopen composer" action opens the composer again against the current text.
  2. Repeat with an `addWindow` call and an `addChildWindow` call, editing the line's flags argument mid-dialog: same abort, same balloon, no write.
  3. Repeat with a line inserted *above* the call rather than a change to the call itself: the edit aborts and the balloon appears, the accepted consequence of not relocating a moved call.
  4. Open a composer, change nothing anywhere, press OK: the edit applies exactly as it does today, and a single Undo reverts it as one operation.
  5. Open a composer, stop the language server, then press OK: an error balloon reports the failed request and the document is untouched.
  6. Use a create flow (caret not on an existing call) and confirm the statement is still inserted at the caret, unaffected by the guard.
- Phase 82 (Composer Robustness) is now feature-complete pending this human UAT pass and the phase-level closeout.

---
*Phase: 82-composer-robustness*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 6 created/modified files verified present on disk; all 5 task commits (`f7dbc40a`, `2ff03955`, `d10f2d6c`, `08898e28`, `4ce00365`) verified in git history; all task-level `<acceptance_criteria>` re-run and passing (grep checks for `applyIfUnchanged(`/`replaceString(`/`insertString(` counts and index ordering, `DecodeEquality::same*` counts, `msgboxDecodeCall(`/`addWindowDecodeCall(`/`addChildWindowDecodeCall(` counts, `modificationStamp()`/`runWriteCommand(` ordering, `Arrays.equals(` counts, zero IntelliJ imports in both new seams, `Comparator.comparingInt((Op o) -> o.start).reversed()` presence, plugin.xml/build.gradle.kts/bbj-vscode/ diffs empty); plan-level `<verification>` commands re-run: `compileJava` succeeds, `StaleEditGuardTest` 11/11, `DecodeEqualityTest` 7/7, `ComposerApplyGuardSourceGuardTest` 10/10, composer package 7 test classes all green, whole-module `./gradlew test` 395/395 with 0 failures and 0 errors.
