---
phase: 90-composer-robustness-intellij-composer-performance
reviewed: 2026-09-12T21:43:34Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerHandleCache.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposeMode.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjComposerServiceSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerHandleCacheTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/MsgboxComposeModeTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/PreviewDebouncerTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-vscode/src/addchildwindow-composer.ts
  - bbj-vscode/src/addchildwindow-composer-webview.ts
  - bbj-vscode/src/addwindow-composer.ts
  - bbj-vscode/src/addwindow-composer-webview.ts
  - bbj-vscode/src/cvs-composer-webview.ts
  - bbj-vscode/src/msgbox-composer.ts
  - bbj-vscode/src/msgbox-composer-ui.ts
  - bbj-vscode/src/msgbox-composer-webview.ts
  - bbj-vscode/src/setopts-composer-webview.ts
  - bbj-vscode/src/setopts-tristate-webview.ts
  - bbj-vscode/src/webview-panel-lifecycle.ts
  - bbj-vscode/test/addchildwindow-composer.test.ts
  - bbj-vscode/test/addwindow-composer.test.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/composer-lens-command.test.ts
  - bbj-vscode/test/cvs-composer-ui.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/msgbox-composer.test.ts
  - bbj-vscode/test/msgbox-composer-ui.test.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
  - bbj-vscode/test/setopts-stale-edit-guard.test.ts
  - bbj-vscode/test/webview-panel-lifecycle.test.ts
  - bbj-vscode/test/window-composer-validation-ui.test.ts
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 0
  info: 1
  total: 2
status: issues_found
---

# Phase 90: Code Review Report

**Reviewed:** 2026-09-12T21:43:34Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Phase 90 adds: (1) a per-project `ComposerHandleCache` in the IntelliJ plugin that memoizes the
resolved language-server proxy and its catalogs (#612), invalidated on any server-status change or
launch failure; (2) MSGBOX "complete an unfinished call" support (`MsgboxComposeMode`, `incomplete`
decode flag) mirrored between the shared VS Code TS module and the IntelliJ Java model/dialog;
(3) field-level validation with inline error text for the addWindow/addChildWindow composers in
both clients (#623); (4) a shared `registerPanelMessageHandler` helper (#530) that ties every VS
Code webview panel's message subscription to the panel's own disposal instead of the extension
context, closing a listener leak across all six composer panels; and (5) a `PreviewDebouncer` seam
newly wired into the IntelliJ MSGBOX/addWindow/addChildWindow dialogs (#611) so a burst of typing
sends one preview request per settle point.

Most of this is well-executed and heavily guarded by new "source guard" tests that pin the exact
wiring (single cache instance, single invalidate call inside the single terminal handler, no
unconditional `setOKActionEnabled(true)`, etc.), and the new logic (`ComposerHandleCache`,
`MsgboxComposeMode`, `decodeMsgboxCall`'s incomplete-detection) tracks its own doc comments closely.

One correctness defect was found in the newly-debounced IntelliJ dialogs: the OK button's
staleness guard can be defeated by a stale in-flight preview response landing during the debounce
window, letting the dialog silently re-arm OK (and redraw the statement/preview) from
already-superseded field values before the corrected, debounced preview arrives — see CR-01. A
planning identifier was also found leaking into shipped code/test comments (IN-01), which this
project's conventions forbid.

## Critical Issues

### CR-01: Debounced preview dialogs can re-enable OK from a stale, pre-edit preview

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:253-292` (also `AddWindowComposerDialog.java:259-311` and `AddChildWindowComposerDialog.java:269-324`)

**Issue:** All three dialogs newly wired to `PreviewDebouncer` in this phase gate every field
listener through `scheduleRefresh()`:

```java
private void scheduleRefresh() {
    setOKActionEnabled(false);
    previewDebouncer.trigger();
}
```

`scheduleRefresh()` disables OK synchronously but does **not** touch the `seq` counter — `seq` is
only bumped inside `refresh()` itself, and `refresh()` only actually runs once, ~300ms after the
last keystroke (the debounce's trailing edge). The staleness guard that decides whether an
in-flight response may still be applied is exactly `mySeq == seq.get()` (`refresh()`'s own
closure), and `ComposerFlow.observe`'s Javadoc explicitly documents that this seam performs *no*
staleness check of its own — "its own staleness is handled downstream by the caller's sequence
number".

Concretely: if a `refresh()` call is in flight (its request already sent, `seq` at some value `N`)
and the user types again before that request resolves, `scheduleRefresh()` disables OK and
reschedules the debounce timer — but `seq` stays at `N`. When the in-flight response for the
*earlier* state now arrives (still matching `seq == N`, since the corrected, debounced `refresh()`
hasn't fired yet), `apply()` runs: it repaints the statement/summary/schematic from the *stale*
preview and calls `setOKActionEnabled(p.valid)`, re-enabling OK. From that moment until the
debounce's corrected `refresh()` eventually fires (up to ~300ms later), OK is enabled and the
dialog displays a statement that does not reflect the user's latest edit. Accepting the dialog in
that window (a fast typist, or a keyboard Enter right after typing) writes the **stale** statement
into the file — silently, with no indication anything is wrong. This is precisely the failure mode
`ComposerDialogRefreshSourceGuardTest` documents guarding against elsewhere ("a silently-accepted
stale statement"), but the guard here only counts *that* two-path (success/failure) observation is
wired, not that the sequence number is actually advanced early enough to close this specific race.

This requires the local LS round trip to take longer than the gap between two keystrokes — plausible
under real IDE conditions (JVM/GC pauses, java-interop calls, first request after cold start) which
is exactly when a user is also most likely to keep typing while waiting.

**Fix:** Advance (or snapshot) the sequence number synchronously in `scheduleRefresh()` so any
still-in-flight response from *before* this keystroke can never match `seq` again, e.g.:

```java
private void scheduleRefresh() {
    setOKActionEnabled(false);
    seq.incrementAndGet(); // invalidate any response already in flight
    previewDebouncer.trigger();
}
```

`refresh()`'s own `seq.incrementAndGet()` when it actually fires is unaffected — it still produces
the value that its own request is checked against. Apply the same fix to `AddWindowComposerDialog`
and `AddChildWindowComposerDialog` (and, since it is the same pattern, to `SetoptsComposerDialog`,
`SetoptsTriStateComposerDialog` and `CvsComposerDialog`, which predate this phase but share the
identical `scheduleRefresh()`/`seq` shape).

## Info

### IN-01: Decision identifier `DISC-08` checked into shipped source and test comments

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:287`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java:241`

**Issue:** Both lines were added by this phase and embed the planning discussion id `DISC-08` in a
Javadoc/comment:

```java
* Opens the MSGBOX composer (#426/#433, #648, DISC-08), routed through
```
```java
/** An unfinished call (DISC-08): {@code MSGBOX(} with no message typed yet. */
```

Project convention (enforced elsewhere in this codebase, e.g. the "register-check the source diff"
practice) keeps planning/decision identifiers out of source and test comments; GitHub issue numbers
(`#426`, `#648`) are fine and already used correctly alongside it.

**Fix:** Drop `DISC-08` from both comments, keeping the GitHub issue references:

```java
* Opens the MSGBOX composer (#426/#433, #648), routed through
```
```java
/** An unfinished call: {@code MSGBOX(} with no message typed yet. */
```

---

_Reviewed: 2026-09-12T21:43:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
