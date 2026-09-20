---
phase: 96-platform-integration-node-js-diagnosis
reviewed: 2026-09-20T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/NodeActions.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 96: Code Review Report (Delta — gap-closure plan 96-08)

**Reviewed:** 2026-09-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This is a delta review of gap-closure plan 96-08 against `96-REVIEW.md`'s baseline (`2f553a75..dbdb6528`). The change routes the language server's start-failure notification through the same `NodePresentation`/`NodeActions` seam the editor banner already used, adds `NodePresentation.actionLabel`/`NodeActions.perform` as the single label/behaviour mapping, and adds a recovery sentence to the Settings "Version too old" label plus an empty-text hint on the Node.js field.

Traced the specific risk areas called out for this delta:

- **Threading/lifecycle:** `notifyUnresolvedNodePath` is unchanged in *when* it runs (still inside `BbjLanguageServer`'s constructor via `resolveNodePath`); the diff only changes what it builds. `Notifications.Bus.notify` remains documented-safe off-EDT, and each `NotificationAction`/`EditorNotificationPanel` action-label callback is dispatched on the EDT by the platform when the user clicks it, so `ShowSettingsUtil.showSettingsDialog`, `BrowserUtil.browse`, and `EditorNotifications.updateAllNotifications` all execute on the right thread regardless of which thread posted the notification. Verified the Download action from the popup *does* lead to the same restart offer as the banner path: `BbjNodeDownloader.downloadNodeAsync` posts its own `"Restart Language Server"` notification (`BbjNodeDownloader.java:171-186`) independently of the `onComplete` callback wired through `NodeActions.perform`, so both surfaces get the restart offer identically. No bug found here.
- **The `(JBTextField) nodeJsField.getTextField()` cast:** safe and consistent — `compilerOutputDirectoryField` (an unrelated, pre-existing field two field-blocks above) already casts `getTextField()` to `JBTextField` the same way to reach `getEmptyText()`. No new risk.
- **Test coverage of the refactor:** see WR-01 below — the popup path gained a comprehensive new source guard (`BbjLanguageServerSourceGuardTest`), but the banner path's existing guard was not extended to match, leaving a real regression gap.
- **Naming convention:** `NodeActions` is not, in fact, the only class in `com.basis.bbj.intellij` without the `Bbj` prefix — see IN-01.
- **Message/action mismatch:** see WR-02 — the notification body text still tells the user to configure a path in Settings even when a `Download Node.js` button is offered right next to it.

## Warnings

### WR-01: Editor-banner action loop has no source guard against regressing to hardcoded literals

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java:52-55`
**Issue:** This plan added `BbjLanguageServerSourceGuardTest` (298 new lines) to fence the popup path against reverting to a literal-labelled, inline-behaviour action — it asserts `NodePresentation.actionLabel(` and `NodeActions.perform(` each appear exactly once inside `notifyUnresolvedNodePath`'s body, and that no quoted action label literal survives comment-stripping anywhere in the file.

The banner path's pre-existing guard, `BbjMissingNodeNotificationSourceGuardTest.java` (not touched by this diff), was not extended the same way. Its `theBannerTextAndActionSetBothComeFromTheSharedPresentationSeam` test only checks that `NodePresentation.bannerText(` and `NodePresentation.bannerActions(` are each called once inside `buildPanel`'s *outer* body — both calls sit outside the `for` loop and are unaffected by what happens inside it. Nothing in that test file asserts `NodePresentation.actionLabel(` or `NodeActions.perform(` are used inside the loop, and nothing scans for a reintroduced literal label (the `noActionLabelLiteralSurvivesInTheCommentStrippedWholeFile`-style check that exists for the popup has no counterpart here).

Concretely: if the loop body in `BbjMissingNodeNotificationProvider.buildPanel` were reverted to the exact pre-refactor code this diff removed (`if (actionId.equals(ACTION_DOWNLOAD)) { panel.createActionLabel("Download Node.js", () -> BbjNodeDownloader.downloadNodeAsync(...)); } else if ...`), every assertion in `BbjMissingNodeNotificationSourceGuardTest` would still pass, because `bannerText(` and `bannerActions(` are still called once each outside the loop. The two surfaces the plan's own documentation ("the two surfaces can never disagree") depends on staying in sync are therefore asymmetrically guarded: the popup is pinned, the banner is not.
**Fix:** Extend `BbjMissingNodeNotificationSourceGuardTest` with the same two structural checks `BbjLanguageServerSourceGuardTest` uses for the popup:
```java
@Test
void bannerLoopDerivesLabelsAndBehaviourFromTheSharedSeamExactlyOnceEach() {
    String text = readGuardedSource();
    String body = buildPanelBody(text);
    assertEquals(1, countOccurrences(body, "NodePresentation.actionLabel("));
    assertEquals(1, countOccurrences(body, "NodeActions.perform("));
}

@Test
void noActionLabelLiteralSurvivesInTheCommentStrippedWholeFile() {
    String stripped = stripComments(readGuardedSource());
    for (String actionId : List.of(NodePresentation.ACTION_DOWNLOAD,
            NodePresentation.ACTION_CONFIGURE_PATH, NodePresentation.ACTION_INSTALL_MANUALLY)) {
        assertEquals(0, countOccurrences(stripped, "\"" + NodePresentation.actionLabel(actionId) + "\""));
    }
}
```
(borrowing `stripComments`/`countOccurrences` verbatim from `BbjLanguageServerSourceGuardTest`, per this project's per-guard-private-helper convention).

### WR-02: Start-failure notification body text contradicts the offered Download/Install buttons

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:106-124` (message from `NodeExecutableResolver.java:149-160`)
**Issue:** `notifyUnresolvedNodePath` sets the notification's body to `resolution.failureMessage()`, whose closing sentence is always `"Configure a Node.js executable at Settings | Languages & Frameworks | BBj."` regardless of which actions get offered. Before this plan, that sentence matched the notification's one and only action (`"Configure Node.js Path"`). After this plan, in every case except the inaccessible-cache one, the same notification also offers `"Download Node.js"` and `"Install Node.js Manually"` buttons — two remedies that do not involve Settings at all. A user reading "Configure a Node.js executable at Settings…" right above a `Download Node.js` button is told to do one thing while being offered two others; the body text was not updated to reflect the widened action set introduced by this delta.
**Fix:** Either make the trailing sentence in `NodeExecutableResolver.Resolution.failureMessage()` reason-aware (e.g., drop the Settings-specific sentence when `NodePresentation.bannerActions(resolution)` includes `ACTION_DOWNLOAD`, mirroring the phrasing already done for `bannerText`), or phrase it action-set-agnostically (e.g., "Resolve this using one of the actions below."). Note `NodeExecutableResolverTest` pins the current wording, so either fix requires updating that test alongside the change — flagged as a warning rather than a blocker since this is a wording/UX inconsistency, not a functional defect.

## Info

### IN-01: `NodeActions` naming is consistent with an already-inconsistent package, not a new outlier

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/NodeActions.java`
**Issue:** `NodeActions` is not, as might be assumed, the only class in `com.basis.bbj.intellij` without the `Bbj` prefix. `DownloadGuard.java`, `InteropPortPresentation.java`, `InteropPortSettings.java`, and `TextMateBundleCache.java` already live in the same package without the prefix. Adding `NodeActions` follows an existing (if itself inconsistent) precedent rather than introducing a new deviation.
**Fix:** None needed for this delta; if the project wants to tighten the convention, that is a separate, pre-existing cleanup outside this plan's scope.

### IN-02: Pre-existing `D-12` javadoc references remain in `BbjSettingsComponent.java`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:34, 225`
**Issue:** The class javadoc and a code comment still cite `D-12` (a planning decision id) in lines untouched by this diff. Per the review brief this is known and out of scope for gap-closure plan 96-08; noted here only for completeness, not as a new defect.
**Fix:** None required by this plan.

### IN-03: `NodePresentation.actionLabel`/`bannerActions` lack the `@NotNull`/`@Nullable` annotations their sibling methods carry

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java:72, 91`
**Issue:** `NodeActions.perform(@NotNull Project project, @NotNull String actionId)` annotates both parameters, but the new `actionLabel(String actionId)` and the pre-existing `bannerActions(...)` in the same file carry no `@NotNull`/`@Nullable` annotations on parameters or return types, unlike the rest of the codebase's IDE-hint convention (e.g., `BbjMissingNodeNotificationProvider.buildPanel`'s fully-annotated signature). Purely a static-analysis/IDE-hint completeness gap; every actual call site passes non-null values.
**Fix:** Add `@NotNull String actionId` / `@NotNull` return type to `actionLabel`, and `@NotNull` to `bannerActions`'s parameter and return type, for consistency with the rest of the file.

---

_Reviewed: 2026-09-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
