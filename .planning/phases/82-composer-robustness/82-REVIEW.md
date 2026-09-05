---
phase: 82-composer-robustness
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/StaleEditGuardTest.java
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 82: Code Review Report

**Reviewed:** 2026-09-05
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

The COMP-01 (#538) failure-surfacing seam (`ComposerFlow`, `ComposerNotices`, `ComposerNoticeRenderer`) and the COMP-02 (#567) stale-edit guard (`StaleEditGuard`, `DecodeEquality`) are well designed and match the locked decisions in `82-CONTEXT.md`: the launcher's nested `thenAccept` pyramid is genuinely flattened behind one terminal handler, every dialog's `refresh()` chain now observes both its success and failure sides with a per-session balloon rate limit, the three edit-in-place apply paths all funnel through `StaleEditGuard`, and the field-wise `DecodeEquality` comparators cover every field the context's D-08 lists. The source-guard tests are thorough and mostly pin the intended wiring correctly.

However, one gap undermines the phase's own stated goal ("stale statement text cannot be accepted"): none of the three dialogs disable OK before their *first* preview round-trip resolves, so an OK click that lands in that initial async window can commit a default/empty `flagsHex`/`eventHex` into the two window composers' edit-in-place paths — a document corruption `StaleEditGuard` does not and cannot catch, because the guard only validates that the underlying document didn't change, not that the dialog produced a validated result. Three further robustness/quality issues are noted below (timeout stacking across the launch chain, a `@Nullable`/`@NotNull` contract mismatch newly introduced in all three dialogs, and a source-guard assertion that is nearly vacuous), plus a few minor code-quality items.

## Critical Issues

### CR-01: OK is never disabled before a dialog's first preview resolves, letting a premature accept write an empty flags/event-mask token into the document

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:101-115` (constructor), `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:107-117` (constructor), `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:218-251` (`applyHexEdit`)

**Issue:** `previewUnavailable()` (added by this phase) calls `setOKActionEnabled(false)` only from the `refresh()` failure callback (i.e., after at least one round trip has already started and failed). No dialog ever calls `setOKActionEnabled(false)` up front, before the constructor's own `refresh()` call resolves for the first time. `DialogWrapper`'s OK action is enabled by default, so from the moment `showAndGet()` makes the dialog visible until the *first* `addWindowPreview`/`addChildWindowPreview` response arrives, OK is clickable while `getFlagsHex()`/`getEventHex()` still hold their field defaults (`private volatile String flagsHex = "";` / `private volatile String eventHex;` → `null`).

If the user accepts the dialog inside that window (a double-Enter, a fast keyboard-only flow, or simply a slow/busy language server), `ComposerLauncher.applyAddWindowEdit`/`applyHexEdit` build the write operations directly from those defaults:

```java
if (ed.flagsRange != null) {
    ops.add(new Op(ls + ed.flagsRange[0], ls + ed.flagsRange[1], flagsHex)); // flagsHex == ""
}
```

`StaleEditGuard.applyIfUnchanged` does not protect against this: it only compares the *document's* current decode against the decode captured at launch time. Since nothing about the document changed while the dialog was open, `sameDecode` matches trivially and the guard proceeds to write — replacing the real `$xxxxxxxx$` flags literal with an empty string, corrupting the statement's syntax. The same applies to the event-mask token when `eventEnabled` is checked but `eventHex` is still its stale/`null` default.

MSGBOX is incidentally safe only because `ComposerLauncher.openMsgbox` separately guards the *whole* statement string (`if (text == null || text.isEmpty()) return;`) before ever reaching the guard — a guard the two window dialogs' hex-token paths do not have an equivalent of, since they write partial tokens rather than a whole statement.

**Fix:** Disable OK before the first `refresh()` call in each dialog's constructor, and only re-enable it from a successful `apply()` (which already happens today) — mirroring the `previewUnavailable`/`apply` symmetry the phase already built for the *failure* case:

```java
// AddWindowComposerDialog / AddChildWindowComposerDialog constructors, before refresh():
setOKActionEnabled(false);
refresh();
```

As defense in depth, also reject an empty `flagsHex` inside `applyHexEdit`/`applyAddWindowEdit` before building `ops`, the same way `openMsgbox` rejects an empty statement.

## Warnings

### WR-01: The launch chain's three stages each get their own full timeout, so a slow (not hung) server can take ~3x the intended bound before surfacing anything

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java:28-29, 60-89`

**Issue:** `LAUNCH_TIMEOUT_MILLIS` is documented as "comfortably under a minute, bounding a request that would otherwise hang forever," and `82-CONTEXT.md` D-04 describes "`orTimeout(...)` **on the launcher chain**" (singular). The implementation instead calls `bounded(...)` independently on each of the three sequential stages (`serverFuture`, `server.composerCatalogs()`, `decodeCall.apply(...)`), each bounded by the full 30s (`bounded(future)` uses the constructor's `waitMillis` for every stage). Because the stages are chained with `thenCompose` rather than raced, a server that is merely slow — e.g. 25s to resolve, then 25s to answer `composerCatalogs()` — can take up to ~90s (all three stages near their individual limits) before the user sees any feedback at all, well past "comfortably under a minute." Nothing in the test suite exercises the compounding case (`ComposerFlowTest`'s hang tests only make a single stage hang, with the others pre-resolved).

**Fix:** Either wrap the whole composed chain in one outer `orTimeout(LAUNCH_TIMEOUT_MILLIS, ...)` after the final `thenCompose`, or reduce the per-stage timeouts so their sum stays within the documented bound (e.g. `LAUNCH_TIMEOUT_MILLIS / 3` per stage), and add a test that makes each stage individually resolve just under its own timeout to confirm the total is still bounded.

### WR-02: `@Nullable Project` is passed into `ComposerNoticeRenderer.render`'s `@NotNull Project` parameter from all three dialogs

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:80-89`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:89-100`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:91-102`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java:33-37`

**Issue:** Each dialog constructor still declares `@Nullable Project project` (a pre-existing `DialogWrapper` contract — a dialog is allowed to be created without a project), but this phase newly wires `this.balloonOnce = ComposerFlow.once(notice -> ComposerNoticeRenderer.render(project, notice, null));`, and `ComposerNoticeRenderer.render` requires `@NotNull Project project` and immediately dereferences it (`project.isDisposed()`). Every current call site happens to pass a non-null project (traced back to `ComposerLauncher.launch(@NotNull Project project, ...)`), so this is not exploitable today, but the annotation contract is now inconsistent: the dialog's own public constructor signature explicitly allows `null`, while a refresh failure occurring under a null-project construction (e.g. a future caller, or IntelliJ's own `@NotNull` bytecode instrumentation) would throw immediately inside the notifier.

**Fix:** Either tighten the three dialog constructors' `project` parameter to `@NotNull` (matching what the new failure-notification code now assumes), or make `ComposerNoticeRenderer.render` accept `@Nullable Project` and no-op when null.

### WR-03: The "stamp re-check is inside the write command" source guard is close to vacuous and would not reliably catch the regression it names

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java:176-188`

**Issue:** `theModificationStampReCheckHappensInsideTheWriteCommand` computes `runWriteCommandIndex = text.indexOf("runWriteCommand(")` — the **first** textual occurrence of that literal in `StaleEditGuard.java`, which is the `WriteGate` interface's own method declaration near the top of the file (`void runWriteCommand(Runnable body);`), not the actual call site (`write.runWriteCommand(() -> {...})`) further down. It then asserts only that the **last** occurrence of `"modificationStamp()"` appears after that interface declaration. Since the interface declaration sits near the top of a fairly short file, almost any placement of the stamp re-check later in the file — including one moved outside the write-command body entirely, as long as it's still textually below line ~38 — would still satisfy this assertion. This is exactly the kind of regression (D-07's "closing the async window between the re-decode completing and the write starting") the test's own javadoc says it exists to catch, so the guard currently provides materially less protection than advertised for a correctness-critical property.

**Fix:** Use `text.lastIndexOf("runWriteCommand(")` (the actual call site) as the reference point, and additionally assert the stamp check appears before `applyEdit.run()` (or whatever the guarded body's terminal call is) — proving the check is *inside* the write body, not merely *after* the interface declaration.

## Info

### IN-01: New `project` field is written but never read in all three composer dialogs

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:48,93`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:48,95`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:49,83`

**Issue:** This phase adds `private final Project project;` and `this.project = project;` to all three dialogs, but every use of `project` inside each class (the `balloonOnce` lambda) actually closes over the constructor's local parameter, not the field — the field itself is never read afterward. It's dead state that adds noise and a false impression that `project` is needed elsewhere in the class.

**Fix:** Remove the unused field (or, if it's being kept intentionally for a near-future use, note that in a comment) and let the lambda continue capturing the constructor parameter directly.

### IN-02: `unwrap(Throwable)` is duplicated verbatim between `ComposerFlow` and `ComposerNotices`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java:162-169`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java:89-96`

**Issue:** Both classes implement an identical private `unwrap` that peels `CompletionException`/`ExecutionException` layers off a throwable. `ComposerFlow` needs it only to distinguish a `NotReadySignal` from other causes; `ComposerNotices.detailOf` needs the same unwrapping to find a `TimeoutException` or a message. A future change to the unwrap semantics (e.g. adding `InvocationTargetException` support) would have to be made in two places, silently, since nothing pins the duplication.

**Fix:** Move `unwrap` to one shared location (e.g. a package-private static method on `ComposerNotices`, or a tiny shared utility) and have `ComposerFlow` call it.

### IN-03: `previewUnavailable` only overwrites one summary label, leaving the other stale during a failure

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:262-270`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:271-279`

**Issue:** On a failed/empty preview, `previewUnavailable` sets `flagsSummary` to "Preview unavailable — ..." but leaves `eventSummary` showing the summary text from the last successful preview. Since OK is disabled in this state the stale text can't be accepted, but a user reading the dialog sees one label saying the preview failed and another showing what looks like a still-current event-mask summary, which is mildly misleading.

**Fix:** Clear or also mark `eventSummary` as stale inside `previewUnavailable`, e.g. `eventSummary.setText(" ")`.

---

_Reviewed: 2026-09-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
