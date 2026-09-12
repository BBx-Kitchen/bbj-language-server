---
phase: 90-composer-robustness-intellij-composer-performance
fixed_at: 2026-09-12T21:58:00Z
review_path: .planning/phases/90-composer-robustness-intellij-composer-performance/90-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 90: Code Review Fix Report

**Fixed at:** 2026-09-12T21:58:00Z
**Source review:** .planning/phases/90-composer-robustness-intellij-composer-performance/90-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### CR-01: Debounced preview dialogs can re-enable OK from a stale, pre-edit preview

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java`

**Commit:** d4a4666a

**Applied fix:** Added `seq.incrementAndGet();` to `scheduleRefresh()` in each of the six
debounced composer dialogs, immediately after the synchronous `setOKActionEnabled(false)` and
before `previewDebouncer.trigger()`. This closes the race the reviewer identified: any preview
response already in flight before the latest keystroke now carries a `seq` value that can never
match `seq.get()` again once `scheduleRefresh()` has run, so it is discarded by the existing
`mySeq == seq.get()` guard in both the success and failure branches of `refresh()`, instead of
being applied and re-enabling OK with stale field values.

Extended beyond the three dialogs newly wired to `PreviewDebouncer` in this phase (Msgbox,
AddWindow, AddChildWindow) to the three pre-existing debounced dialogs that share the identical
`scheduleRefresh()`/`seq` shape (Setopts, SetoptsTriState, Cvs) — confirmed by reading each dialog's
source and by the fact that the existing shared `ComposerDialogRefreshSourceGuardTest`'s
`DEBOUNCED_DIALOG_SOURCES` list already treats all six uniformly, so leaving three fixed and three
not would have left the shared guard test (and the real bug) inconsistent across the six.

Updated `ComposerDialogRefreshSourceGuardTest`:
- `eachDialogChecksItsSequenceOnBothTheSuccessAndTheFailurePath` now expects two
  `seq.incrementAndGet()` occurrences (once in `scheduleRefresh()`, once in `refresh()`) for every
  entry in `DEBOUNCED_DIALOG_SOURCES` (all six dialogs currently), one occurrence otherwise.
- Added a new test, `eachDebouncedDialogsScheduleRefreshAdvancesTheSequenceNumberBeforeTriggeringTheDebouncer`,
  that extracts each debounced dialog's `scheduleRefresh()` method body and asserts it contains
  `seq.incrementAndGet()`. Verified red-then-green by reasoning over the pre-fix method body (which
  was exactly `setOKActionEnabled(false); previewDebouncer.trigger();` — no `seq` reference, so the
  new assertion would have failed) and confirming the post-fix suite passes (0 failures,
  `ComposerDialogRefreshSourceGuardTest` at 15/15).

**Verification:** `./gradlew compileTestJava` clean; `./gradlew test --tests
"com.basis.bbj.intellij.composer.ComposerDialogRefreshSourceGuardTest"` 15/15 passing; full
`./gradlew test` suite 846/846 passing (845 baseline + 1 new assertion), 0 failures, 0 errors. Gates
ran inside the isolated review-fix worktree; after the cleanup fast-forward the same commits and
tests are reproducible from the main checkout.

**Note (verified deviation from orchestrator's initial framing):** the orchestrator's verified
context described this as "all four debounced dialogs" (Msgbox, AddWindow, AddChildWindow,
Setopts). Reading the source confirmed the identical bug and the identical `scheduleRefresh()`
shape also exist in `SetoptsTriStateComposerDialog` and `CvsComposerDialog`, and the shared source
guard test's own `DEBOUNCED_DIALOG_SOURCES` list already spans all six — matching the REVIEW.md
finding's own Fix section, which explicitly names all six. Fixed all six for consistency and
correctness.

### IN-01: Decision identifier `DISC-08` checked into shipped source and test comments

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`,
`bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java`

**Commit:** de49f489

**Applied fix:** Removed the planning discussion id `DISC-08` from both comments, keeping the
GitHub issue references that were already correctly alongside it (`#426/#433, #648` in
`ComposerLauncher.java`; the test comment in `ComposerModelsJsonBoundaryTest.java` had no adjacent
issue reference, so it was reworded to `An unfinished call: {@code MSGBOX(} with no message typed
yet.` with nothing added in place of the removed id — a grep for `#532` across the IntelliJ and
VS Code composer sources found it tracks an unrelated QuickPick-document-edit guard, not this
incomplete-call feature, so it was not appropriate to add here).

**Verification:** `./gradlew compileTestJava` clean; confirmed no remaining `DISC-08` occurrences
in either file; full `./gradlew test` suite passing (see CR-01 verification above, run after both
commits).

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-09-12T21:58:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
