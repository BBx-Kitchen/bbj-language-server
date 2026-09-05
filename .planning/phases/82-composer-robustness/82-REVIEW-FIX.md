---
phase: 82-composer-robustness
fixed_at: 2026-09-05T20:15:00Z
review_path: .planning/phases/82-composer-robustness/82-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 82: Code Review Fix Report

**Fixed at:** 2026-09-05
**Source review:** .planning/phases/82-composer-robustness/82-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 4
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false` in `.planning/config.json`, so no isolated worktree was created for this run):
- `./gradlew test --tests 'com.basis.bbj.intellij.composer.*'` — green both immediately after applying the fixes and again after the final commit.
- `./gradlew test` (whole `bbj-intellij` module) — green: 398 tests, 0 failures, 0 errors (was 395 before this run; +3 new regression tests added while pinning the fixes).

## Fixed Issues

### CR-01: OK is never disabled before a dialog's first preview resolves, letting a premature accept write an empty flags/event-mask token into the document

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java`
**Commit:** `0acf1748`
**Applied fix:** Each of the three dialog constructors now calls `setOKActionEnabled(false)` immediately after `init()` and before the constructor's own first `refresh()` call, so OK is unclickable for the entire async window between the dialog becoming visible and its first preview round-trip resolving; `apply()` (already existing) re-enables it on a successful preview, mirroring the existing `previewUnavailable()`/`apply()` symmetry for the failure case. As defense in depth, `ComposerLauncher.applyHexEdit` now returns immediately without building any write ops when `flagsHex` is `null`/empty, the same way `openMsgbox` already guards against an empty statement. Extended `ComposerDialogRefreshSourceGuardTest` with a new test (`eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure`) asserting `setOKActionEnabled(false)` appears twice per dialog (up front and on a later failure) and that the up-front occurrence textually precedes the constructor's own first `refresh();` call; the pre-existing "exactly once" assertion was split off into its own renamed test (`eachDialogLabelsAFailureOnAFailedPreviewExactlyOnce`) since it no longer holds once the up-front disable exists.

### WR-01: The launch chain's three stages each get their own full timeout, so a slow (not hung) server can take ~3x the intended bound before surfacing anything

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java`
**Commit:** `cd9f306b`
**Applied fix:** `ComposerFlow.launch()` no longer wraps each of the three sequential stages (`serverFuture`, `composerCatalogs()`, `decodeCall.apply(...)`) in its own `bounded(...)` call. Instead the three stages are composed into one `chain` via `thenCompose`, and a single `orTimeout(waitMillis, ...)` is applied to the whole composed chain before the terminal `handle(...)`. Removed the now-dead single-argument `bounded(CompletableFuture<T>)` overload (only the two-argument `bounded(future, timeoutMillis)` remains, still used by `observe()`). Since each `thenCompose` produces a brand-new future owned by the chain itself (never the LSP4IJ proxy's own future), the single outer `orTimeout` needs no defensive `.copy()` — timing out the chain can never force-complete a receiver the proxy still owns. Added a new regression test (`threeMerelySlowStagesShareOneDeadlineRatherThanEachGettingTheFullWait`) with two lazily-invoked delay hooks on the fake server (`catalogsDelayMillis`, `msgboxDecodeDelayMillis`) plus a delayed server future, each contributing 40ms, summed against a 60ms bound: asserts exactly one `REQUEST_FAILED` notice and that the chain fails in well under 100ms (not the ~120ms it would take for all three stages to actually resolve) — before this fix each 40ms stage was individually under its own 60ms timeout and the chain would have succeeded at ~120ms instead of timing out.

### WR-02: `@Nullable Project` is passed into `ComposerNoticeRenderer.render`'s `@NotNull Project` parameter from all three dialogs

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java`
**Commit:** `0acf1748` (landed together with CR-01 — see note below)
**Applied fix:** Tightened all three dialog constructors' `project` parameter from `@Nullable Project` to `@NotNull Project`, matching what `ComposerNoticeRenderer.render`'s `@NotNull Project` parameter (fed via each dialog's `balloonOnce` lambda) already assumed; every current call site (`ComposerLauncher.launch(@NotNull Project project, ...)`) already passes a non-null project, so this is a contract-only tightening with no behavioural change today. Added a new source-guard test (`eachDialogConstructorRequiresANonNullProjectMatchingTheRendererContract`) asserting zero occurrences of `@Nullable Project project` and at least one occurrence of `@NotNull Project project` per dialog file.

**Note on commit grouping:** this fix was intended to land in its own commit. It touches the same four files as CR-01 (the three dialog constructors' signature line, and a second, independent hunk in `ComposerDialogRefreshSourceGuardTest.java`). The fixer staged the two findings' hunks separately via `git apply --cached` against distinct line ranges and verified with `git diff --cached --stat` that only the CR-01 hunks were staged — but `git commit <pathspec>` does not commit only the index content restricted to those paths; for tracked files it implicitly re-stages the *entire* current working-tree diff for every named path before committing (equivalent to `git commit -a -- <pathspec>`), which pulled the already-written-but-not-yet-staged WR-02 hunks into the same commit as CR-01. This was only discovered after the commit (via `git show --stat` showing more lines changed than had been staged), by which point the working tree was already clean for those files. All four findings' code and tests are present, correct, and covered by the full green test suite; the only deviation is that CR-01 and WR-02 share one commit instead of two. WR-01 and WR-03 (which don't share any files with CR-01/WR-02) each committed cleanly on their own.

### WR-03: The "stamp re-check is inside the write command" source guard is close to vacuous and would not reliably catch the regression it names

**Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java`
**Commit:** `d9f44ece`
**Applied fix:** `theModificationStampReCheckHappensInsideTheWriteCommand` previously anchored on `text.indexOf("runWriteCommand(")` — the *first* occurrence, which is the `WriteGate` interface's own method declaration near the top of `StaleEditGuard.java`, not the actual call site (`write.runWriteCommand(...)`) further down. Changed the anchor to `text.lastIndexOf("runWriteCommand(")` (the real call site) and added a second assertion that the last `modificationStamp()` occurrence precedes `applyEdit.run()` (the guarded body's terminal call) — together proving the stamp re-check is genuinely inside the guarded write body, not merely textually below the interface declaration.

## Skipped Issues

None — all four in-scope findings (CR-01, WR-01, WR-02, WR-03) were fixed. Info-level findings (IN-01, IN-02, IN-03) were intentionally left untouched: `fix_scope` for this run is `critical_warning`, which excludes Info-tier findings.
