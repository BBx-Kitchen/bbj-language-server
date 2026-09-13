---
phase: 87-shared-setopts-composer-layer-intellij-dialog
reviewed: 2026-09-07T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/PreviewDebouncer.java
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/PreviewDebouncerTest.java
  - bbj-vscode/src/language/composer-commands.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/config-hot-reload.test.ts
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 87: Code Review Report

**Reviewed:** 2026-09-07T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20 (README/checklist not counted separately)
**Status:** issues_found

## Summary

Reviewed the shared SETOPTS composer layer (`bbj-vscode/src/language/composer-commands.ts`, the
`setopts` DTO/equality additions in `ComposerModels`/`DecodeEquality`), the new
`BbjComposeSetoptsAction`/`ComposerLauncher` SETOPTS wiring, the new `SetoptsComposerDialog` Swing
UI, and the new `PreviewDebouncer` trailing-edge coalescer, plus their extensive source-guard and
behavioural test suites.

The TypeScript request layer (`composer-commands.ts`) is a clean, well-tested pass-through onto the
existing catalog/vector primitives, and its round-trip/relevance-gate coverage (including the
composer-vs-PREFIX interaction test in `config-hot-reload.test.ts`) is solid. The stale-edit guard
wiring on the Java side (`DecodeEquality.sameSetopts`, the `applyIfUnchanged` call in
`ComposerLauncher.openSetopts`) is correctly field-complete and array-safe.

However, the new `SetoptsComposerDialog` + `PreviewDebouncer` pairing has a genuine correctness gap:
the dialog's OK/Apply button is not re-disabled when a live-preview refresh is triggered, only when a
refresh eventually *fails*. Combined with the phase's new fixed 300ms trailing-edge debounce, this
opens an easily reproducible window in which clicking Apply/Insert commits a stale (pre-edit)
selection to `config.bbx` while silently discarding the user's most recent checkbox/field change —
see CR-01. A secondary UI defect (an error label that is wired into the layout but never actually
receives a message) and a minor input-validation gap are also reported below.

## Critical Issues

### CR-01: SETOPTS composer can silently apply a stale selection, dropping the user's last edit

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java:147` (also 167-169, 261-271)
**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/PreviewDebouncer.java:44-53`

**Issue:** Every checkbox and text-field listener only calls `previewDebouncer.trigger()`, which
schedules `refresh()` to run **300ms later** (`PREVIEW_DEBOUNCE_MS`). OK/Apply is disabled exactly
twice in the whole dialog lifecycle — once up front before the constructor's first `refresh()`, and
again only if a later preview request *fails* (`previewUnavailable()`, called from inside `refresh()`
itself). Nothing disables OK the moment a *new* trigger is scheduled, so OK stays enabled — and
`hexDigits`/`line` stay at their previous, already-applied values — for the entire 300ms window after
any checkbox toggle or field edit.

If the user toggles a checkbox (or edits a mask/raw-tail field) and clicks Apply/Insert within that
300ms window — very plausible with a fast click, a double-click, or a keyboard-driven Enter right
after a Space toggle — `dialog.showAndGet()` returns `true` immediately, and
`ComposerLauncher.openSetopts` (`ComposerLauncher.java:289-320`) reads `dialog.getHexDigits()` /
`dialog.getLine()`, which still reflect the *previous* completed preview, not the pending one. The
edit is written to `config.bbx` as if the user's last change never happened, with no error, no
warning, and no indication anything was dropped. This is a silent, hard-to-notice data-loss/
correctness bug on a production configuration file.

Note this widens (rather than merely repeats) a pre-existing narrow async race shared by the other
three composer dialogs: those call `refresh()` directly per event (bounded only by real network
latency), whereas this phase's `PreviewDebouncer` adds a deliberate, fixed 300ms delay specifically
for SETOPTS, making the window trivially reachable by a normal user instead of requiring
pathological timing.

**Fix:** Disable OK synchronously the moment a refresh is scheduled (or flushed), not only on
eventual failure — e.g. disable it inside `trigger()`'s call sites before scheduling, or have
`PreviewDebouncer.trigger()` itself invoke a "will-refresh" callback:

```java
// SetoptsComposerDialog.java
cb.addActionListener(e -> {
    setOKActionEnabled(false); // stale until the next preview resolves
    previewDebouncer.trigger();
});
// ...and the same one-line addition ahead of each
// maskCommaField/maskDotField/rawTailField SimpleDocumentListener trigger.
```

Alternatively (and more robustly against future listeners being added without the same discipline),
have `PreviewDebouncer` itself disable-on-schedule via an injected `Runnable onScheduled` invoked
synchronously at the top of `trigger()`, so no call site can forget it.

## Warnings

### WR-01: `rawTailError` label is wired into the layout but never shows a message

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java:74, 164, 256-259, 269`

**Issue:** `rawTailError` is created via `errorLabel()` (red, small-style) and placed directly under
the raw-hex field specifically to report a field-level validation problem. But the only two places
that touch it are the constructor (initial `" "` blank text) and `apply()` (`rawTailError.setText("
");`, also blank). The actual validation message for an invalid raw-tail value
(`"raw hex must be 0-9 or A-F, up to 14 digits"`) is sent only to the dialog-wide `summary` label via
`previewUnavailable(reason)` (lines 196-200, 256-259) — the same path used for an invalid mask
character. `rawTailError` therefore never displays real content in any code path; it is dead UI that
occupies vertical space and misleads a reader of the source into thinking field-scoped errors are
rendered next to the field.

**Fix:** Either route the raw-tail-specific message to `rawTailError` (and the mask message to a
similar per-field label) instead of overloading `summary` for all three concerns, or remove the
unused label and its layout slot if a single dialog-wide status line is the intended design.

## Info

### IN-01: Raw-tail hex input accepts an odd digit count with no client-side signal

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java:196-200`

**Issue:** `refresh()` validates the raw-tail field with
`rawTail.matches("[0-9A-Fa-f]{0," + MAX_RAW_TAIL_DIGITS + "}")`, which accepts any count from 0 to 14
hex characters, including odd counts (e.g. a single `"1"`) that cannot represent a whole number of
bytes 10-16. The value is then handed straight to `bbj/composer/setopts/preview` as
`selection.rawTail` with no client-side indication that the entry is incomplete/ambiguous. Whether
the server pads, truncates, or otherwise resolves an odd-length tail is not visible from this file.

**Fix:** Either require an even digit count in the client-side regex (surfacing the same
"unavailable" messaging pattern already used for other invalid input), or, if the server intentionally
tolerates and pads odd input, add a one-line comment here noting that contract so a future reader
does not have to cross-reference `setopts-catalog.ts` to confirm it is intentional.

---

_Reviewed: 2026-09-07T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
