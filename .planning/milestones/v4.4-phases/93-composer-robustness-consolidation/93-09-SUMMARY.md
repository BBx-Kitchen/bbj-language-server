---
phase: 93-composer-robustness-consolidation
plan: 09
subsystem: ui
tags: [intellij, composer, edt-safety, source-guard, tdd]

# Dependency graph
requires:
  - phase: 93-composer-robustness-consolidation
    provides: "ComposerEditRanges.isUsable(int[]), ComposerNotices.MALFORMED_EDIT, the hexRange/flagsRange/eventMaskRange guards plans 93-03/93-05 already wired"
provides:
  - "ComposerEditRanges.isUsableLine(int, int) and isUsableLineRegion(int, int, int) -- the line-number counterpart to the existing range-array predicate"
  - "Bound checks on ed.line (openSetoptsInCodeAbsolute) and chain.startLine/chain.endLine (openSetoptsInCodeChain) before Document.getLineStartOffset(int) is ever called"
  - "The failed truth from 93-VERIFICATION.md (CR-01) closed: no language-server-supplied field on a composer write path reaches Document.getLineStartOffset(int) unchecked"
affects: [94-em-platform-consolidation, 95, 96, 97]

# Actuals (#2632)
actuals:
  tokens: 4037
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Line-number bound checks reuse the existing ComposerEditRanges plain-Java seam and ComposerNotices.malformedEdit notice rather than inventing a new Reason or Severity"
    - "Source-guard ordering helper generalized to take the predicate literal as a parameter, so one helper pins both array-length and line-bound guards ahead of their StaleEditGuard construction"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java

key-decisions:
  - "The accepted band for every one of the three fields (ed.line, chain.startLine, chain.endLine) is strictly [0, lineCount), not the review sketch's chain.endLine > lineCount -- the sketch's form still permits endLine == lineCount, which Document.getLineStartOffset(int) throws on."
  - "An equal-line chain region (startLine == endLine) stays accepted -- it is the documented insertion case replaceString(x, x, text) already relies on; a descending region (endLine < startLine) is rejected even though both endpoints are individually in range."
  - "No new ComposerNotices.Reason or Severity: both new abort branches reuse ComposerNotices.malformedEdit(...), the same notice the neighbouring hexRange guard already renders."

requirements-completed: [COMP-05]

coverage:
  - id: D1
    description: "openSetoptsInCodeAbsolute aborts with the malformed-edit warning instead of throwing IndexOutOfBoundsException when the language server names a line outside the live document"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "ComposerEditRangesTest#aLineWithinTheDocumentIsUsable / aLineOutsideTheDocumentIsNotUsable / aZeroLineDocumentAcceptsNoLineAtAll"
        status: pass
      - kind: unit
        ref: "ComposerLauncherRangeGuardSourceGuardTest#theOpenSetoptsInCodeAbsoluteBodyChecksTheLineBoundExactlyOnce"
        status: pass
    human_judgment: false
  - id: D2
    description: "openSetoptsInCodeChain aborts with the malformed-edit warning instead of throwing IndexOutOfBoundsException when the language server names a startLine/endLine region outside the live document, is descending, or ends exactly at lineCount"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "ComposerEditRangesTest#anAscendingLineRegionIsUsable / anEqualLineRegionIsUsableBecauseItIsTheDocumentedInsertionCase / aDescendingLineRegionIsNotUsableEvenWhenBothLinesAreIndividuallyInRange / aLineRegionEndingExactlyAtTheLineCountIsNotUsable / aLineRegionStartingBeforeTheFirstLineIsNotUsable"
        status: pass
      - kind: unit
        ref: "ComposerLauncherRangeGuardSourceGuardTest#theOpenSetoptsInCodeChainBodyChecksTheLineRegionBoundExactlyOnce"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bound rule has exactly one definition (ComposerEditRanges), both guards run before the write command is entered, and no neighbouring write-path guard regressed"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "ComposerLauncherRangeGuardSourceGuardTest#theRangeCheckPrecedesTheWriteCommandInEveryGuardedMethod / theLineBoundAbortsRenderTheMalformedEditNoticeInBothGuardedMethods"
        status: pass
      - kind: integration
        ref: "./gradlew test --rerun (whole IntelliJ suite)"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 09: SETOPTS-in-code line-bound guards Summary

**`ComposerEditRanges.isUsableLine`/`isUsableLineRegion` close the one gap 93-VERIFICATION.md found: `ed.line`, `chain.startLine` and `chain.endLine` now abort with the existing malformed-edit warning instead of throwing `IndexOutOfBoundsException` on the EDT.**

## Performance

- **Duration:** ~9 min
- **Completed:** 2026-09-18T11:28:02Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `ComposerEditRanges.isUsableLine(int, int)` and `isUsableLineRegion(int, int, int)` — plain-Java predicates (no `com.intellij` import) covering the accepted band `[0, lineCount)`, with the chain region additionally accepting an equal-line insertion case and rejecting a descending region.
- Wired both predicates into `ComposerLauncher.openSetoptsInCodeAbsolute` (`ed.line`) and `openSetoptsInCodeChain` (`chain.startLine`/`chain.endLine`), each aborting with `ComposerNotices.malformedEdit(...)` before `new StaleEditGuard(` is constructed — mirroring the `hexRange` guard two lines above.
- Re-pointed `ComposerLauncherRangeGuardSourceGuardTest`'s whole-file `malformedEdit(` count from 4 to 6 and extended it with per-method pins (predicate called exactly once, `getLineCount()` read exactly once, ordering ahead of the write command) for both new sites.
- Ran the whole IntelliJ suite with a forced `--rerun` and settled the 972-vs-992 discrepancy `93-VERIFICATION.md` flagged: the observed, authoritative current count is **983 tests, 0 failures, 0 errors**.

## Task Commits

Executed as a TDD tracer task (Task 1) plus one follow-up source-guard task (Task 2); Task 3 was a verification-only task with no code changes.

1. **Task 1 (RED): add failing predicate tests for line-bound guards** - `3a3e3dd3` (test)
2. **Task 1 (GREEN): bound-check SETOPTS-in-code line numbers before write** - `4821d0f6` (feat)
3. **Task 2: pin the two line-bound guard sites to the shared predicate** - `469c3dc1` (test)

_Task 1 was `type="tracer" tdd="true"`: RED confirmed by a compile failure (`cannot find symbol: isUsableLine`/`isUsableLineRegion`) before the predicates existed; GREEN confirmed by `./gradlew test` returning `BUILD SUCCESSFUL` for the full Task 1 verification filter. The tracer feedback gate re-ran that same verify end-to-end (auto mode active via `workflow.auto_advance: true`) and passed, so execution proceeded straight to Task 2 without a checkpoint._

**Plan metadata:** committed alongside this SUMMARY (see below).

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java` — added `isUsableLine`/`isUsableLineRegion`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — two new guard branches, one in each of the two affected methods
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java` — 8 new behavioural cases
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java` — re-pointed whole-file count, 3 new per-method pin tests, generalized ordering helper

## Decisions Made

- **Strict upper bound, not the review sketch's form.** `93-REVIEW.md`'s CR-01 fix sketch proposed `chain.endLine > lineCount`, which still permits `endLine == lineCount` — exactly the value `getLineStartOffset(int)` throws on. Implemented `< lineCount` for all three fields instead (verified by `isUsableLineRegion(0, 10, 10)` being `false` in `ComposerEditRangesTest`).
- **Equal-line region stays accepted; descending region stays rejected.** `chain.endLine == chain.startLine` is the documented insertion case (`replaceString(x, x, text)`), so `isUsableLineRegion` accepts it; `chain.endLine < chain.startLine` throws from `replaceString` even when both endpoints are individually in range, so it is rejected.
- **No new `Reason`/`Severity`.** Both new abort branches reuse `ComposerNotices.malformedEdit(...)` — the same notice class `flagsRange`/`eventMaskRange`/`hexRange` already render on abort (D-10, unchanged by this plan).
- **Generalized the ordering helper rather than duplicating it.** `assertOrderedBeforeWriteCommand` now takes the predicate literal as a parameter, so the same helper pins the array-length guards (`ComposerEditRanges.isUsable(`) and both new line-bound guards (`isUsableLine(`, `isUsableLineRegion(`) ahead of their respective `new StaleEditGuard(` construction.
- **972-vs-992 discrepancy resolved by observation, not reconciliation.** The forced `./gradlew test --rerun` in Task 3 produced **983 tests, 0 failures, 0 errors** (confirmed independently via both the aggregated JUnit XML `testsuite` attributes across all 110 result files and Gradle's own HTML report counters). This is the authoritative current figure — it is not identical to either prior number because it includes the new tests this plan itself added, and is reported as observed rather than forced to match either prior count.

## Deviations from Plan

None — plan executed exactly as written. The one nuance worth recording: the plan's Task 2 action prose suggested "each of the two method bodies contains exactly one `ComposerNotices.malformedEdit(`" as a single shared invariant. In the actual code, `openSetoptsInCodeAbsolute`'s body contains **two** occurrences (the pre-existing `hexRange` guard plus the new line guard), while `openSetoptsInCodeChain`'s body contains **one** (only the new line-region guard, since chain has no `hexRange` field). The plan's own `<acceptance_criteria>` for Task 2 did not mandate a literal "exactly one" count, so the test added (`theLineBoundAbortsRenderTheMalformedEditNoticeInBothGuardedMethods`) asserts the accurate per-method counts (2 for absolute, 1 for chain) with a rationale explaining why the counts differ, rather than a false "exactly one" invariant. This is not a Rule 1-4 deviation — it is following the acceptance criteria (the authoritative gate) over an imprecise sentence in the action prose, and results in a stronger, accurate pin rather than a weaker or broken one.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None — the one prose/reality mismatch above was resolved in favor of accuracy and the plan's own acceptance criteria, with no scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Register Check

`git diff` over this plan's added source/test lines (from `724919d9` before Task 1's RED commit through `469c3dc1`, Task 2's commit) was searched for `COMP-0`, `D-0`, `D-1`, `CR-0`, `GAP-`, `93-09`, and `plan 09`: **zero matches**. Six legitimate `#591` citations are present (the correct, permitted form). No re-run of the targeted suite was needed since nothing was found or removed.

## Next Phase Readiness

- The failed truth from `93-VERIFICATION.md` is now true: no language-server-supplied field on a composer write path reaches `Document.getLineStartOffset(int)` unchecked.
- `ComposerApplyGuardSourceGuardTest`, `SetoptsInCodeSourceGuardTest`, `ComposerCatalogsShapeSourceGuardTest`, and `ComposerLauncherChainSourceGuardTest` all passed unmodified in both Task 1's and Task 2's targeted runs, confirming the new guards disturbed no pinned write-path invariant.
- `ComposerNoticesTest` passed unmodified, confirming no new `Reason` or `Severity` was introduced.
- Phase 93 has no further open gaps from `93-VERIFICATION.md`; the phase-level `gaps_found` status this plan exists to close is now resolved pending re-verification.
- WR-01 (`decoded.edit` null-check), WR-02 (`composeTriState` param validation), and IN-01 (webview silent no-op) remain deliberately deferred per this plan's own `## Deferred` section — none are part of COMP-05's scope.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 4 key-files (2 main, 2 test) confirmed present on disk; all 3 task commits (`3a3e3dd3`, `4821d0f6`, `469c3dc1`) confirmed in `git log`.
