---
phase: 87-shared-setopts-composer-layer-intellij-dialog
fixed_at: 2026-09-07T18:54:00Z
review_path: .planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 87: Code Review Fix Report

**Fixed at:** 2026-09-07T18:54:00Z
**Source review:** .planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (critical_warning scope — CR-01, WR-01; IN-01 excluded by scope)
- Fixed: 2
- Skipped: 0

Verification was run in the isolated review-fix worktree
(`.claude/worktrees/rf-87-2742150-1788806972`, since removed by cleanup) via
`./gradlew test --tests "com.basis.bbj.intellij.composer.*" --tests "com.basis.bbj.intellij.concurrency.*"`
after each fix — full package test run, not just the touched classes, since the fix's own
source-guard test (`ComposerDialogRefreshSourceGuardTest`) asserts across all four composer
dialogs. Both runs exited 0. `PreviewDebouncerTest` (6/6) and `ComposerDialogRefreshSourceGuardTest`
(12/12, including one new test added by this fix) passed in full.

## Fixed Issues

### CR-01: SETOPTS composer can silently apply a stale selection, dropping the user's last edit

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java`
**Commit:** dd95ffd4
**Applied fix:** Added a `scheduleRefresh()` helper that calls `setOKActionEnabled(false)` before
`previewDebouncer.trigger()`, and routed every checkbox `ActionListener` and every mask/raw-tail
field `DocumentListener` through it instead of calling `previewDebouncer.trigger()`/
`previewDebouncer::trigger` directly. This closes the gap the reviewer identified: OK/Apply is now
disabled the instant a new preview is *scheduled* (synchronously, on the event that triggers the
300ms debounce), not only when a preview later completes (success via `apply()`, or failure via
`previewUnavailable()`). A fast Apply/Insert click inside the debounce window can no longer commit
`hexDigits`/`line` values that predate the user's most recent edit.

Went with the "disable at every call site via a single shared helper" option from the review's Fix
section (rather than adding an `onScheduled` callback parameter to `PreviewDebouncer` itself) because
`PreviewDebouncerTest.java` pins the existing 4-argument constructor across five behavioural tests
that construct it directly — changing that constructor's shape would have required rewriting all five
tests for a change orthogonal to the debouncer's own coalescing behaviour, whereas routing every
dialog listener through one dialog-local helper is a strictly smaller, dialog-scoped change that
still makes it structurally impossible for a future listener to bypass the disable (a new source-guard
test now pins that: no listener may call `previewDebouncer.trigger()`/`::trigger` directly).

Updated `ComposerDialogRefreshSourceGuardTest`'s
`eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure` test: it previously pinned
"exactly 2" `setOKActionEnabled(false)` occurrences uniformly across all four composer dialogs. SETOPTS
now legitimately has 3 (up-front, on-schedule, on-failure), so the test was changed to expect 3 for
SETOPTS specifically and 2 for the other three (unmodified) dialogs, with an explanatory doc-comment.
Added a new test,
`setoptsRoutesEveryListenerThroughTheOkDisablingScheduleHelperRatherThanTriggeringTheDebouncerDirectly`,
pinning that `previewDebouncer.trigger()` appears exactly once in the file (inside the helper) and
never as a direct listener call or method reference.

### WR-01: `rawTailError` label is wired into the layout but never shows a message

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java`
**Commit:** aace196c
**Applied fix:** `refresh()` now clears `rawTailError` at the top of every call (so a since-fixed
raw-tail value never leaves a stale message next to the field once a different validation, e.g. the
mask fields, fails instead) and, when the raw-tail regex check fails, sets the specific reason
("must be 0-9 or A-F, up to 14 digits") directly on `rawTailError` — the label the constructor already
places directly under the raw-hex field for exactly this purpose — while `previewUnavailable("raw hex
is invalid")` still writes a short pointer to the dialog-wide `summary` line so OK still becomes
disabled and the overall dialog status still reads as invalid. Chose this option (route the message to
the existing label) over removing the label, since a per-field label positioned directly under its
field is more discoverable than a single line at the top of the dialog, and the label was already
built, styled, and laid out for this exact purpose — only the message routing was missing. Left the
mask-character validation message on `summary` unchanged (no equivalent per-field label exists for
the mask fields, and adding one was out of scope for a warning-level dead-UI fix; the review offered
"a similar per-field label" as an option, not a requirement).

## Skipped Issues

None — both in-scope findings were fixed. IN-01 (raw-tail odd-digit-count input validation gap) was
excluded from this run by `fix_scope: critical_warning` and was not attempted.

---

_Fixed: 2026-09-07T18:54:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
