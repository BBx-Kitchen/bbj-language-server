---
phase: 82-composer-robustness
reviewed: 2026-09-05T21:45:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNoticeRenderer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddChildWindowIntention/description.html
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureAddWindowIntention/description.html
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureMsgboxIntention/description.html
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/StaleEditGuardTest.java
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase 82: Code Review Report

**Reviewed:** 2026-09-05
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

This re-review covers the full composer-robustness scope after the 82-REVIEW-FIX pass (82-01/02/03) and the gap-closure plan 82-04 (intention description resources). All four previously-reported Critical/Warning findings were verified fixed against the current source, not just trusted from the fix report:

- **CR-01** (OK clickable before the first preview round-trip): all three dialog constructors (`AddWindowComposerDialog`, `AddChildWindowComposerDialog`, `MsgboxComposerDialog`) now call `setOKActionEnabled(false)` immediately after `init()` and before the constructor's own first `refresh()`; `ComposerLauncher.applyHexEdit` also guards against an empty `flagsHex`. Confirmed present and correctly ordered in all three files.
- **WR-01** (per-stage timeout stacking): `ComposerFlow.launch()` now composes all three stages into one `chain` via `thenCompose` and applies a single `orTimeout(waitMillis, ...)` to the whole chain, with no per-stage `bounded(...)` calls left. Confirmed, and `ComposerFlowTest.threeMerelySlowStagesShareOneDeadlineRatherThanEachGettingTheFullWait` exercises the compounding case.
- **WR-02** (`@Nullable`/`@NotNull` Project mismatch): all three dialog constructors now declare `@NotNull Project project`, matching `ComposerNoticeRenderer.render`'s contract. Confirmed.
- **WR-03** (near-vacuous stamp-recheck source guard): `ComposerApplyGuardSourceGuardTest.theModificationStampReCheckHappensInsideTheWriteCommand` now anchors on `text.lastIndexOf("runWriteCommand(")` (the real call site) and additionally asserts the stamp check precedes `applyEdit.run()`. Confirmed, the assertion is materially stronger than before.

The freshest work (82-04: the nine `intentionDescriptions/` resources, `IntentionDescriptionResourcesTest`, `ComposerIntentionPreviewSourceGuardTest`, and the `generatePreview` change from `IntentionPreviewInfo.EMPTY` to a compile-time `IntentionPreviewInfo.Html` literal in the three `Configure*Intention` classes) is sound: the XML parser hardening in `IntentionDescriptionResourcesTest` disables DOCTYPE declarations outright (the OWASP-recommended primary XXE defense, which also forecloses external-entity and billion-laughs attacks), the description/template resources' directory names correctly match the classes registered in `plugin.xml` (verified independently against `plugin.xml`, not just via the test's own logic), and the description HTML is static, non-interpolated, and free of injected script content. No Critical or Warning findings emerged from this focused pass. Four small quality items remain (three carried over from the prior review as explicitly-deferred Info-tier findings that are still present in source, plus one new unused-import finding in the newest test file).

## Warnings

None.

## Info

### IN-01: New `project` field is written but never read in all three composer dialogs

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:48,93`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:48,95`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:49,83`

**Issue:** Each dialog still declares `private final Project project;` and assigns it in the constructor (`this.project = project;`), but every actual use of `project` inside the class (the `balloonOnce` lambda: `ComposerFlow.once(notice -> ComposerNoticeRenderer.render(project, notice, null))`) closes over the constructor's local parameter, not the field. The field itself is dead state — verified by grepping each file for every occurrence of `project` and confirming none reference `this.project` or an unqualified `project` outside the constructor. Carried over from the prior review (IN-01); it was explicitly out of scope for the fix pass (`fix_scope: critical_warning`) and remains present today.

**Fix:** Remove the unused field and let the lambda continue capturing the constructor parameter directly, e.g.:
```java
public AddWindowComposerDialog(@NotNull Project project, ...) {
    super(project);
    this.server = server;
    // no `this.project = project;` — project is only needed transiently, by the lambda below
    this.balloonOnce = ComposerFlow.once(notice -> ComposerNoticeRenderer.render(project, notice, null));
    ...
}
```

### IN-02: `unwrap(Throwable)` is duplicated verbatim between `ComposerFlow` and `ComposerNotices`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java:168-175`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java:89-96`

**Issue:** Both classes implement an identical private `unwrap` method that peels `CompletionException`/`ExecutionException` layers off a throwable. `ComposerFlow` needs it only to distinguish a `NotReadySignal` from other causes; `ComposerNotices.detailOf` needs the same unwrapping to find a `TimeoutException` or a message. A future change to the unwrap semantics (e.g. adding `InvocationTargetException` support) would have to be made in two places, silently, since nothing pins the duplication. Carried over from the prior review (IN-02); still present verbatim in both files today.

**Fix:** Move `unwrap` to one shared location (e.g. a package-private static method on `ComposerNotices`) and have `ComposerFlow` call it instead of maintaining its own copy.

### IN-03: `previewUnavailable` only overwrites one summary label, leaving the other stale during a failure

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java:271-274`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java:280-283`

**Issue:** On a failed/empty preview, `previewUnavailable` sets `flagsSummary` to "Preview unavailable — ..." but leaves `eventSummary` showing the summary text from the last successful preview (or blank, if no preview has ever succeeded). Since OK is disabled in this state the stale text can't be accepted, but a user reading the dialog sees one label saying the preview failed and another showing what looks like a still-current event-mask summary, which is mildly misleading. Carried over from the prior review (IN-03); still present today (verified against the current `previewUnavailable` bodies in both files, which still touch only `flagsSummary`).

**Fix:** Clear or also mark `eventSummary` as stale inside `previewUnavailable`, e.g. `eventSummary.setText(" ")`.

### IN-04: Unused `assertEquals` static import in the new `IntentionDescriptionResourcesTest`

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java:19`

**Issue:** `import static org.junit.jupiter.api.Assertions.assertEquals;` is declared but the class only ever calls `assertTrue`/`assertFalse`/`fail` — a grep for `assertEquals(` across the file returns no matches. Harmless (a compiler/linter warning at worst) but it's noise introduced by this phase's newest file, and every other test class in this package (`ComposerFlowTest`, `DecodeEqualityTest`, etc.) keeps its import list to only the assertions it actually uses.

**Fix:** Remove the unused import:
```java
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
```

---

_Reviewed: 2026-09-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
