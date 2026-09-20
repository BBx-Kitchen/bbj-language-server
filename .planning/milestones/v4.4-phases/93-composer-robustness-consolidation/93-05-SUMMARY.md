---
phase: 93-composer-robustness-consolidation
plan: 05
subsystem: ui
tags: [intellij, composer, java, source-guard, junit5]

# Dependency graph
requires:
  - phase: 93-composer-robustness-consolidation
    provides: "93-03's ComposerEditRanges + ComposerNotices.Reason.MALFORMED_EDIT (the plain-Java-predicate-plus-guard-extension shape this plan follows, without reusing either symbol -- a malformed catalogs payload is a different failure class than a malformed edit range)"
provides:
  - "ComposerCatalogsCheck.isUsable(...) -- four overloaded plain-Java predicates (MsgboxCatalogs, AddWindowCatalogs, SetoptsCatalogs, CvsCatalogs), no com.intellij import"
  - "All six ComposerLauncher open* entry points (openMsgbox, openAddWindow, openAddChildWindow, openSetopts, openSetoptsInCode, openCvs) gated against a malformed catalogs sub-list, reusing each method's existing notReady notice"
affects: [93-07]

actuals:
  tokens: 6900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Plain-Java predicate seam with no com.intellij import (ComposerCatalogsCheck), following ComposerEditRanges/ComposerFlow/ComposerNotices's existing convention"
    - "One shared shape check gates six construction sites by extending each site's existing null guard (catalogs == null || !isUsable(catalogs)) rather than adding a second branch or a second notice type"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheck.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheckTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsShapeSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java

key-decisions:
  - "ComposerCatalogsCheck reuses ComposerNotices.notReady, never MALFORMED_EDIT -- a malformed catalogs payload and a malformed edit range are different failure classes (payload-shape-before-construction vs range-shape-before-write) and the plan's own prohibitions forbid introducing a second notice type for the catalogs case."
  - "CvsCatalogs.isUsable(...) deliberately does not require charsTooltip non-null: it is a String passed to setToolTipText, which tolerates null, so requiring it would turn a harmless field into a false refusal. Stated in the overload's javadoc and covered by a dedicated test case."
  - "openSetoptsInCode is the single gate for both SETOPTS-in-code dialogs; the check is not duplicated into openSetoptsInCodeComposeNew, openSetoptsInCodeAbsolute or openSetoptsInCodeChain, all of which read the same already-checked catalogs reference."

patterns-established:
  - "A catalogs-shape guard extends the existing catalogs == null condition in place (catalogs == null || !ComposerCatalogsCheck.isUsable(catalogs)) rather than adding a second if-branch -- one condition, one notice, matching the placement convention 93-03 established for range checks."

requirements-completed: [COMP-03]

coverage:
  - id: D1
    description: "ComposerCatalogsCheck.isUsable(...) returns true only when the per-kind catalogs object is non-null and every sub-list its dialog iterates is non-null; an empty-but-non-null sub-list is usable"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheckTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six ComposerLauncher open* entry points (openMsgbox, openAddWindow, openAddChildWindow, openSetopts, openSetoptsInCode, openCvs) reject a malformed catalogs payload before constructing their dialog, reusing the existing notReady notice -- covers the whole present-day family of six dialogs, not only the three #609-named ones"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsShapeSourceGuardTest.java"
        status: pass
    human_judgment: false
  - id: D3
    description: "No regression to the pre-existing chain/write-path/range-guard invariants already pinned over ComposerLauncher.java"
    requirement: "COMP-03"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java, ComposerApplyGuardSourceGuardTest.java, SetoptsInCodeSourceGuardTest.java, ComposerLauncherRangeGuardSourceGuardTest.java"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 05: Composer Catalogs Shape Guard Summary

**A plain-Java `ComposerCatalogsCheck` with one `isUsable(...)` overload per catalog kind now guards all six `ComposerLauncher.open*` entry points against a malformed or partial `bbj/composer/catalogs` sub-list, degrading to the same graceful "not ready" message a fully-null response already produced instead of an EDT `NullPointerException` inside a dialog constructor.**

## Performance

- **Started:** 2026-09-18T09:31:00Z (approximate)
- **Completed:** 2026-09-18T09:42:22Z
- **Tasks:** 3/3
- **Files modified:** 4 (2 created main+test, 1 created test, 1 modified main — plus this SUMMARY)

## Accomplishments

- Created `ComposerCatalogsCheck.java`, a plain-Java (no `com.intellij` import) class with four `public static boolean isUsable(...)` overloads:
  - `MsgboxCatalogs`: requires `icons`, `buttonSets`, `defaultButtons` and `flags` all non-null — all four are iterated during `MsgboxComposerDialog` construction (three through `fillCombo`, one directly).
  - `AddWindowCatalogs`: requires `flags` and `eventBits` non-null — serves both `addWindow` and `addChildWindow`, which share this DTO.
  - `SetoptsCatalogs`: requires `bits` and `byteGroups` non-null — serves both SETOPTS and SETOPTS-in-code.
  - `CvsCatalogs`: requires `bits` non-null; `charsTooltip` is deliberately NOT required (it is a nullable `String` passed to `setToolTipText`), documented in the overload's javadoc so the omission reads as a decision, not a gap.
  - An empty-but-non-null list is usable in every overload — a catalog that legitimately ships zero entries renders an empty section, not a refusal.
- Extended the existing `catalogs == null` guard in all six `ComposerLauncher` entry points — `openMsgbox`, `openAddWindow`, `openAddChildWindow`, `openSetopts`, `openSetoptsInCode`, `openCvs` — to `catalogs == null || !ComposerCatalogsCheck.isUsable(catalogs)`, one condition per method, reusing each method's existing `ComposerNotices.notReady(...)` render call. `openSetoptsInCode` is the single gate covering both SETOPTS-in-code dialogs; its three downstream dispatch methods (`openSetoptsInCodeComposeNew`, `openSetoptsInCodeAbsolute`, `openSetoptsInCodeChain`) gained no redundant check.
- Created `ComposerCatalogsCheckTest`: per-DTO coverage of null-instance, fully-populated, one case per sub-list null (so a later edit that drops a field from the check fails loudly), all-lists-present-but-empty (asserting usable), and — for `CvsCatalogs` — a case with `bits` populated and `charsTooltip` null asserting usable, proving the tooltip's nullity is tolerated by design.
- Created `ComposerCatalogsShapeSourceGuardTest` with its own private helper copies (`countOccurrences`, `extractMethodBody`, `withoutCommentLines`, `readSource`, `UncheckedIOExceptionForTest`): pins the whole-file count of `ComposerCatalogsCheck.isUsable(catalogs)` at exactly six; pins, per gated method, exactly one check and exactly one `notReady(` render, with the check ordered strictly before dialog construction (or, for the `openSetoptsInCode` dispatcher, before any of its three downstream dispatch calls); asserts the three SETOPTS-in-code downstream methods carry zero redundant checks; and asserts `ComposerCatalogsCheck.java` carries no `com.intellij` import and the Gradle build declares no platform test framework.
- Whole IntelliJ JUnit suite: **944 tests, 0 failures, 0 errors** (up from the 912 baseline noted at plan start) — 17 new `ComposerCatalogsCheckTest` cases and 10 new `ComposerCatalogsShapeSourceGuardTest` cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Plain-Java catalogs shape check, gating one composer end-to-end** - `1e4d2a7b` (feat)
2. **Task 2: Gate the remaining five composer kinds** - `67effd9c` (feat)
3. **Task 3: Source guard pinning every construction site to the shared check** - `e4bc1042` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheck.java` - the plain-Java `isUsable(...)` predicate family, one overload per catalog kind (#609)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - six extended guards, one per `open*` entry point, each reusing its existing `notReady` notice
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheckTest.java` - behavioural coverage of all four overloads
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsShapeSourceGuardTest.java` - structural guard pinning all six construction sites to the shared check and their ordering relative to dialog construction

## Decisions Made

See `key-decisions` in frontmatter. In short: the check reuses `ComposerNotices.notReady` rather than introducing a second notice type or reusing 93-03's `MALFORMED_EDIT` (a different failure class); `CvsCatalogs.isUsable` deliberately excludes `charsTooltip`; `openSetoptsInCode` is the single gate for the whole SETOPTS-in-code family.

## Deviations from Plan

### Auto-fixed / Documented Discrepancies

**1. Whole-file `ComposerNotices.notReady(` count is 7, not the 6 the plan's acceptance criteria stated**
- **Found during:** Task 2/3 verification (counting literal occurrences before writing the source guard)
- **Issue:** The plan's Task 2/3 acceptance criteria assert `ComposerNotices.notReady(` appears exactly six times in `ComposerLauncher.java`. The actual pre-existing baseline (confirmed via `git show HEAD~1:...ComposerLauncher.java` before any 93-05 edit) was already **seven**: the six `open*` methods this plan gates, plus one unrelated, pre-existing `notReady(` call in the `SETOPTS_IN_CODE` cue-launch branch that fires when no virtual file is available for the caret's document (a different failure class than a malformed catalogs payload, and outside every gated method's body).
- **Fix:** No code change — this plan's edits reuse each gated method's own existing `notReady(` call and add zero new occurrences, so the count is unchanged before and after (7 → 7), satisfying the *substance* of the acceptance criterion ("the count did not grow") even though the literal number named in the plan text does not match reality. `ComposerCatalogsShapeSourceGuardTest` asserts the true whole-file count (7) with an explanatory comment, rather than asserting the plan's stated (incorrect) literal of 6, so the guard reflects the actual invariant being protected.
- **Files modified:** None beyond the planned files; this is a test-assertion-value correction, not a scope change.
- **Verification:** `ComposerCatalogsShapeSourceGuardTest.everyGatedMethodChecksTheSharedPredicateExactlyOnceAndTheGuardDidNotAddASeventhNoticeSite` passes; every per-method body still pins exactly one `notReady(` each.
- **Committed in:** `e4bc1042` (Task 3 commit)

---

**Total deviations:** 1 documented discrepancy (plan literal count vs. actual pre-existing baseline). No scope creep, no architectural change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The catalogs-guard seam this plan established for plan 93-07 (which consolidates the six composer-launch actions and depends on this launcher hardening):

- **`ComposerCatalogsCheck`** lives in `composer/ComposerCatalogsCheck.java`, package-visible, plain-Java (no `com.intellij` import), with one `isUsable(...)` overload per catalog DTO (`MsgboxCatalogs`, `AddWindowCatalogs`, `SetoptsCatalogs`, `CvsCatalogs`). A future compose-action base has no reason to call this directly — the guard already lives at `ComposerLauncher`'s six construction sites, upstream of any action — but the predicate is available if a new call site into `ComposerLauncher` is ever added.
- **The guard-extension convention** (`catalogs == null || !ComposerCatalogsCheck.isUsable(catalogs)`, one condition, one notice, no second branch) is the pattern to follow if 93-07 or any later plan adds a seventh construction site.
- **`ComposerCatalogsShapeSourceGuardTest`'s whole-file counts** (`ComposerCatalogsCheck.isUsable(catalogs)` == 6, `ComposerNotices.notReady(` == 7) will need updating if a future plan adds or removes a gated construction site or a `notReady(` call anywhere in the file.
- No blockers.

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes verified present in `git log --oneline --all`.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*
