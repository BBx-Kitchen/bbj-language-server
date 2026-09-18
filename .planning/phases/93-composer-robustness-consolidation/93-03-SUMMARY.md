---
phase: 93-composer-robustness-consolidation
plan: 03
subsystem: ui
tags: [intellij, composer, java, source-guard, junit5]

# Dependency graph
requires:
  - phase: 93-composer-robustness-consolidation
    provides: "93-01 (ComposerSwingHelpers extraction) and 93-02 (SETOPTS raw-tail verdict on the wire); neither touched ComposerLauncher.java's range indexing or ComposerNotices.java's Reason enum"
provides:
  - "ComposerEditRanges.isUsable(int[]) — a plain-Java, no-com.intellij-import predicate for exactly-two-element range arrays"
  - "ComposerNotices.Reason.MALFORMED_EDIT and the malformedEdit(String) factory, sharing Severity.WARNING with STALE_DOCUMENT"
  - "All four language-server-supplied range arrays in ComposerLauncher (flagsRange, eventMaskRange, SETOPTS hexRange, SETOPTS-in-code absolute hexRange) length-checked before their write command is entered"
affects: [93-05, 93-07]

actuals:
  tokens: 5800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Plain-Java predicate seam with no com.intellij import (ComposerEditRanges), following BbjHexLiteral/ComposerNotices/ComposerFlow's existing convention"
    - "Abort-before-write-command: a malformed-input check sits before the StaleEditGuard is constructed, never inside the guarded WriteCommandAction body"
    - "Per-reason severity table replacing an EnumSet-size distinctness assertion once a fourth Reason forced two reasons to legitimately share a severity"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java

key-decisions:
  - "MALFORMED_EDIT notice body is exactly: title \"<kindLabel> not updated\", body \"The language server sent an unusable edit range. Nothing was changed.\", Severity.WARNING, remedyActionId null — chosen to echo STALE_DOCUMENT's wording pattern since both are the same user-facing shape (nothing changed, try again) with a different named cause."
  - "MALFORMED_EDIT deliberately reuses Severity.WARNING rather than adding a fifth Severity constant (all three existing values were already taken by the prior three reasons); ComposerNoticesTest's severity assertion is now an explicit per-reason EnumMap table asserted key-set-complete against EnumSet.allOf(Reason.class), not a distinctness count, since a distinctness count cannot express two reasons legitimately sharing one severity."
  - "The SETOPTS-in-code absolute-literal write (openSetoptsInCodeAbsolute) had neither a null check nor a length check on its hexRange and no insert-offset fallback; its guard is `!ComposerEditRanges.isUsable(ed.hexRange)` (covers null and wrong-length in one check), unlike the other three sites which guard only a non-null-but-wrong-length array so a genuinely null range still falls through to its existing insertOffset branch unchanged."

patterns-established:
  - "A range-array guard check is placed immediately after the existing empty-value guard and strictly before its method's `new StaleEditGuard(` construction — future range-array or other language-server-payload checks in ComposerLauncher should follow this same placement rule."

requirements-completed: [COMP-05]

coverage:
  - id: D1
    description: "ComposerEditRanges.isUsable(int[]) rejects null, length 0, length 1 and length 3+ arrays, accepts only exactly-two-element arrays (ordering not checked)"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "ComposerNotices gains a fourth Reason, MALFORMED_EDIT, with its own factory, Severity.WARNING shared deliberately with STALE_DOCUMENT, and no remedy action"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java#theMalformedEditNoticeIsAWarningThatSaysNothingWasChangedAndOffersNoRemedy, #everyReasonHasItsOwnPinnedSeverityAndOnlyTheStaleOneHasARemedy"
        status: pass
    human_judgment: false
  - id: D3
    description: "All four language-server-supplied range arrays (flagsRange, eventMaskRange, SETOPTS hexRange, SETOPTS-in-code absolute hexRange) are checked before their write command is entered; no call site re-derives the length rule inline"
    requirement: "COMP-05"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 03: Composer Edit-Range Length Guard Summary

**A plain-Java `ComposerEditRanges.isUsable(int[])` predicate and a fourth `ComposerNotices.Reason` (`MALFORMED_EDIT`, sharing `WARNING` with `STALE_DOCUMENT`) now guard all four language-server-supplied range arrays in `ComposerLauncher` before any write command is entered, closing the `ArrayIndexOutOfBoundsException` crash path in #591.**

## Performance

- **Started:** 2026-09-18T09:12:40Z
- **Completed:** 2026-09-18T09:18:36Z
- **Tasks:** 3/3
- **Files modified:** 6 (2 created main, 1 created test, 2 modified main, 1 modified test — plus this SUMMARY)

## Accomplishments

- Created `ComposerEditRanges.java`, a plain-Java (no `com.intellij` import) predicate: `isUsable(int[] range)` returns `true` only when `range != null && range.length == 2`. Covered by `ComposerEditRangesTest` (null, length 0, 1, 2, 3, and a deliberately-passing descending `{9, 4}` case proving element ordering is out of scope for this predicate).
- Added `ComposerNotices.Reason.MALFORMED_EDIT` and the `malformedEdit(String kindLabel)` factory: title `"<kindLabel> not updated"`, body `"The language server sent an unusable edit range. Nothing was changed."`, `Severity.WARNING`, no remedy action id.
- Guarded all four unchecked range indexings in `ComposerLauncher.java`, each check placed after the method's existing empty-value guard and strictly before its `new StaleEditGuard(` construction, so an abort never happens inside the guarded `WriteCommandAction` body:
  - `applyHexEdit`'s `flagsRange` site (`ed.flagsRange != null && !isUsable(...)` — null still falls through to `flagsInsertOffset`)
  - `applyHexEdit`'s `eventMaskRange` site (same null-tolerant shape, falls through to `eventMaskInsertOffset`)
  - `openSetopts`'s `hexRange` site (null still falls through to `insertOffset`)
  - `openSetoptsInCodeAbsolute`'s `hexRange` site — the one path with **no** null check and **no** insert-offset fallback at all, so the guard is `!isUsable(ed.hexRange)` (covers null and wrong-length together), aborting before the previously-unconditional write.
- Re-pointed `ComposerNoticesTest.everyReasonHasADistinctSeverityAndOnlyTheStaleOneHasARemedy()` (renamed to `everyReasonHasItsOwnPinnedSeverityAndOnlyTheStaleOneHasARemedy`) from an `EnumSet.of(...).size() == 3` distinctness check to an explicit `EnumMap<Reason, Severity>` table, asserted complete against `EnumSet.allOf(Reason.class)` so a future fifth reason fails loudly instead of going uncovered.
- Created `ComposerLauncherRangeGuardSourceGuardTest` with its own private helper copies (`countOccurrences`, `extractMethodBody`, `withoutCommentLines`, `readSource`, `UncheckedIOExceptionForTest`): pins the four `ComposerEditRanges.isUsable(` and four `ComposerNotices.malformedEdit(` call sites at whole-file breadth, scopes into each guarded method body to prove the right field is named at the right site, asserts ordering (range check before `new StaleEditGuard(`) in all three guarded methods, and asserts zero inline re-derivations of the length rule (`.flagsRange.length`, `.eventMaskRange.length`, `.hexRange.length`) anywhere outside `ComposerEditRanges`.
- Whole IntelliJ JUnit suite: 904 tests, 0 failures (up from the 889 baseline after 93-02) — 6 new `ComposerEditRangesTest` cases, 8 new `ComposerLauncherRangeGuardSourceGuardTest` cases, 1 new `ComposerNoticesTest` case.

## Task Commits

Each task was committed atomically:

1. **Task 1: Plain-Java range predicate and MALFORMED_EDIT notice, wired through one write path** - `aa16c396` (feat)
2. **Task 2: The remaining three range sites and the re-pointed notice contract** - `e409a847` (feat)
3. **Task 3: Source guard pinning every range site to the shared predicate** - `789c1cb6` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java` - the plain-Java `isUsable(int[])` predicate (#591)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` - fourth `Reason.MALFORMED_EDIT` and `malformedEdit(String)` factory
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - four range checks in `applyHexEdit`, `openSetopts`, `openSetoptsInCodeAbsolute`, each before its `StaleEditGuard` construction
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java` - behavioural coverage of the predicate
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java` - re-pointed severity table assertion, new `malformedEdit` behavioural case
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java` - structural guard pinning all four call sites to the shared predicate and their ordering relative to the write command

## Decisions Made

See `key-decisions` in frontmatter. In short: the notice body wording mirrors `STALE_DOCUMENT`'s pattern; `MALFORMED_EDIT` deliberately shares `Severity.WARNING` rather than adding a fifth `Severity` constant; `openSetoptsInCodeAbsolute`'s guard folds the null check and the length check into one `!isUsable(...)` call since that path has no separate null check or insert-offset fallback to preserve.

## Deviations from Plan

None - plan executed exactly as written. All four call sites, the fourth `Reason`, the re-pointed severity assertion, and the source guard were implemented per the plan's `<action>` blocks and pass every `<verify>` command listed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`ComposerEditRanges.isUsable(int[])` and `ComposerNotices.Reason.MALFORMED_EDIT` are the new seams plan 93-05 (catalogs-shape guarding) and plan 93-07 (compose-action base) build on:

- **For 93-05:** the guard placement convention this plan establishes — a range/shape check sits after the existing empty-value guard and strictly before its method's `new StaleEditGuard(` construction, never inside the guarded `WriteCommandAction` body — is the pattern to extend when 93-05 also edits `ComposerLauncher.java` for catalogs-shape guarding. `ComposerLauncherRangeGuardSourceGuardTest`'s whole-file counts (`ComposerEditRanges.isUsable(` == 4, `ComposerNotices.malformedEdit(` == 4) will need updating if 93-05 adds new call sites to either literal, but 93-05's own shape guard (`ComposerCatalogsCheck.java`, per the phase's `<artifacts_this_phase_produces>` inventory) is a separate seam and should not reuse `ComposerEditRanges` or `MALFORMED_EDIT` — a malformed *catalogs* payload is a different failure class than a malformed *edit range*.
- **For 93-07:** no direct dependency — `ComposerNotices.malformedEdit(String kindLabel)` is available if a future compose-action base ever needs to render the same notice class, but nothing in 93-07's scope (a `BbjComposeActionBase` for the six launch actions) currently touches range arrays.
- No blockers.

## Self-Check: PASSED

All created files verified present on disk; all four task/summary commit hashes verified present in `git log --oneline --all`.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*
