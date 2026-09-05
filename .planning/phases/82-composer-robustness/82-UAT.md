---
status: diagnosed
phase: 82-composer-robustness
source: [82-VERIFICATION.md]
started: 2026-09-05T20:35:00Z
updated: 2026-09-05T20:54:41Z
---

## Current Test

[testing complete]

## Tests

### 1. Server-stopped composer invocation shows one information balloon (COMP-01, #538)
steps: With the rebuilt plugin installed (bbj-vscode `npm run build`, then bbj-intellij `./gradlew buildPlugin`; confirm the installed BBj build is the local one, not a Marketplace auto-update), stop the language server, then invoke a composer (MSGBOX, addWindow or addChildWindow) from the editor popup or the lightbulb intention.
expected: Exactly one information balloon in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." — a balloon, not a modal dialog.
why_human: Balloon rendering through the notification platform needs a running IDE; the plain-JUnit test module deliberately excludes it. The notice text and severity are pinned by ComposerNoticesTest.
coverage_id: 82-01 D-12
result: skipped
reason: "Not testable in a live IDE: the composer's server lookup (BbjComposerService.server) calls LanguageServerManager.start before resolving the proxy, so a stopped server auto-restarts and the dialog still opens; a tampered Node.js path made the server throw but LSP4IJ still resolved a proxy. Verified from code instead: ComposerFlow.launch throws NotReadySignal on a null server proxy or null catalogs and routes it through the single terminal handler to ComposerNotices.notReady, whose text is exactly \"The BBj language server is not ready yet. Open a BBj file and try again.\" at Severity.INFORMATION; ComposerNoticeRenderer.render creates a Notification in the \"BBj Language Server\" group (plugin.xml displayType STICKY_BALLOON), never a modal. Pinned by ComposerFlowTest#aNullServerProxyIsNotReadyRatherThanRequestFailed, #nullCatalogsAreAlsoNotReady and ComposerNoticesTest#theNotReadyNoticeKeepsTheExistingWordingAsAnInformationBalloon; ComposerLauncherChainSourceGuardTest pins Messages.showInfoMessage is gone. User decision: check off as not testable."

### 2. Server killed mid-invocation shows one error balloon and a console line (COMP-01, #538)
steps: With the server running, invoke a composer and kill the language-server process while the request is in flight (or immediately after invoking).
expected: One error balloon naming the composer and the failure detail, and the same text mirrored in the BBj language-server console tool window. Nothing happens silently.
why_human: Requires a live LSP4IJ server process and the notification platform. The failure-to-notice mapping is pinned by ComposerFlowTest.
coverage_id: 82-01 D-12
result: pass

### 3. Refresh failure disables OK and rate-limits the balloon (COMP-01, #538)
steps: Open a composer dialog with the server running, then stop the language server and type in a field. Keep typing for a while. Then restart the server and type again.
expected: The dialog shows "Preview unavailable — <reason>", the OK button is disabled, and exactly one balloon appears however long typing continues. After the server restarts, the next keystroke restores the preview and re-enables OK.
why_human: DialogWrapper.setOKActionEnabled and the notification platform need the IDE. The observe/once seam and OK gating are pinned by ComposerFlowTest and ComposerDialogRefreshSourceGuardTest.
coverage_id: 82-02 D-12
result: pass

### 4. All three composers name themselves correctly and rate-limit per dialog session (COMP-01, #538)
steps: Repeat test 3 for each of MSGBOX, addWindow and addChildWindow. After a failure, close the dialog and reopen it, then provoke a second failure.
expected: Each balloon names the right composer. A reopened dialog is a new session and is allowed a second balloon.
why_human: Same as test 3; per-session rate limiting is a dialog-lifecycle property only observable in the IDE.
coverage_id: 82-02 D-12
result: pass

### 5. Rapid typing never flickers to a stale preview (COMP-01, #538)
steps: With the server running, type rapidly in a composer dialog's fields and watch the statement, summaries and schematic.
expected: The preview always tracks the newest keystroke; no older preview overwrites a newer one, and OK reflects the newest state.
why_human: Real Swing timing under a live language server; the sequence-number discard logic is unit-tested but the visible behaviour needs the IDE.
coverage_id: 82-02 D-12
result: pass

### 6. Stale-edit abort in a live split-editor scenario (COMP-02, #567)
steps: Open a composer on an existing `MSGBOX(...)` call (edit-in-place). While the dialog is open, edit that same line in another split editor. Press OK. Repeat for addWindow and addChildWindow calls, and once more after inserting a new line above the call instead of editing it.
expected: A warning balloon says the composer did not update because the line changed while it was open and that nothing was changed; the document is byte-for-byte untouched; the balloon's "Reopen composer" action opens the composer again on the current document.
why_human: WriteCommandAction's real document integration and the balloon action need the IDE. The abort logic is pinned by StaleEditGuardTest and DecodeEqualityTest.
coverage_id: 82-03 D-12
result: issue
reported: "While the dialog is open I see \"Start BBjServices to...\" warning banner; closing the dialog (MSGBOX configurator e.g.) the banner disappeared. During testing also produced: Unhandled exception ... com.intellij.openapi.diagnostic.UnhandledException: Intention Description Dir URL is null: BBj visual composer; ConfigureMsgboxIntention; while looking for description.html [Plugin: com.basis.bbj] (Caused by com.intellij.diagnostic.PluginException at IntentionActionMetaData.getResourceLocation, raised from IntentionPreviewComputable.tryCreateFallbackDescriptionContent via IntentionPreviewPopupUpdateProcessor)"
severity: major
note: Stale-edit abort behaviour itself not yet confirmed or denied by the user; the report concerns a lightbulb intention-preview exception (missing intentionDescriptions/<Intention>/description.html for the three composer intentions registered in plugin.xml since #433/#435, pre-dating phase 82) and the pre-existing java-interop editor banner from BbjJavaInteropNotificationProvider.

### 7. Unchanged-document and stopped-server apply paths (COMP-02, #567)
steps: Open a composer on an existing call, change nothing in the document, press OK. Then open a composer on a call, stop the language server, and press OK.
expected: In the first case the edit applies exactly as before this phase and a single Undo reverts it. In the second case an error balloon appears and the document is untouched.
why_human: Same as test 6; the happy path and the re-decode-failure path both need the live editor.
coverage_id: 82-03 D-12
result: pass

## Summary

total: 7
passed: 5
issues: 1
pending: 0
skipped: 1
blocked: 0

## Gaps

- gap_id: G-82-6
  truth: "Stale-edit abort: a warning balloon says the composer did not update because the line changed while it was open; the document is byte-for-byte untouched; the balloon's Reopen composer action reopens the composer on the current document."
  status: failed
  reason: "User reported: While the dialog is open I see \"Start BBjServices to...\" warning banner; closing the dialog (MSGBOX configurator e.g.) the banner disappeared. During testing also produced: Unhandled exception ... com.intellij.openapi.diagnostic.UnhandledException: Intention Description Dir URL is null: BBj visual composer; ConfigureMsgboxIntention; while looking for description.html [Plugin: com.basis.bbj] (Caused by com.intellij.diagnostic.PluginException at IntentionActionMetaData.getResourceLocation, raised from IntentionPreviewComputable.tryCreateFallbackDescriptionContent via IntentionPreviewPopupUpdateProcessor)"
  severity: major
  test: 6
  root_cause: "The three composer intentions (ConfigureMsgboxIntention, ConfigureAddWindowIntention, ConfigureAddChildWindowIntention) return IntentionPreviewInfo.EMPTY, so the lightbulb popup falls back to the per-intention description resource intentionDescriptions/<SimpleClassName>/description.html, which the plugin never ships (no intentionDescriptions/ directory under bbj-intellij/src/main/resources). IntentionActionMetaData.getResourceLocation throws PluginException on every preview computation. Pre-dates phase 82 (registered in cdbd1699, #433/#435). The 'Start BBjServices for Java completions' banner is the unrelated BbjJavaInteropNotificationProvider panel, not a gap."
  artifacts:
    - path: "bbj-intellij/src/main/resources/"
      issue: "no intentionDescriptions/ tree for the three registered composer intentions"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java"
      issue: "generatePreview returns EMPTY, triggering the description.html fallback lookup"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java"
      issue: "same as above"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java"
      issue: "same as above"
    - path: "bbj-intellij/src/main/resources/META-INF/plugin.xml"
      issue: "three <intentionAction> registrations (lines 112-126) without matching description resources"
  missing:
    - "Add src/main/resources/intentionDescriptions/{ConfigureMsgboxIntention,ConfigureAddWindowIntention,ConfigureAddChildWindowIntention}/description.html (plus before.bbj.template / after.bbj.template)"
    - "Add a plain-JUnit test that reads plugin.xml's <intentionAction> classNames and asserts each intentionDescriptions/<SimpleName>/description.html exists on the classpath"
    - "Optionally return IntentionPreviewInfo.Html from generatePreview so the fallback path is never taken"
  debug_session: ".planning/debug/composer-intention-description-missing.md"

