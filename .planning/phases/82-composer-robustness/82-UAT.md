---
status: complete
phase: 82-composer-robustness
source: [82-VERIFICATION.md]
started: 2026-09-05T21:40:00Z
updated: 2026-09-05T22:09:39Z
round: 2
previous_round: "2026-09-05T20:54:41Z — 5 passed, 1 skipped (not testable), 1 issue (G-82-6, closed by plan 82-04 in commits 75f75002..caaec116)"
---

## Current Test

[testing complete]

## Tests

### 1. Lightbulb popup no longer throws and the Intentions settings page renders the shipped resources (COMP-02, #433 / #426 / #430 / #473)
steps: Install the rebuilt plugin. For each of a `MSGBOX(...)`, an `addWindow(...)` and an `addChildWindow(...)` call, place the caret inside the call, press Alt+Enter, and arrow onto the composer entry so the preview pane is computed. Then open Settings › Editor › Intentions and expand the BBj category.
expected: No error report and no `PluginException: Intention Description Dir URL is null` in the IDE log while the preview computes for any of the three entries. In Settings, each of the three intentions shows its description text and a before/after example.
why_human: The preview computation, the fallback description lookup and the Settings page all run inside the IDE platform. Packaging is proven by the jar inspection (the composed jar carries the three `intentionDescriptions/` directory entries plus nine files) and the source wiring by IntentionDescriptionResourcesTest and ComposerIntentionPreviewSourceGuardTest, but the popup itself has not been re-exercised since the fix.
coverage_id: 82-04 D-1, 82-04 D-2
new_this_round: true
result: pass

### 2. Stale-edit abort in a live split-editor scenario (COMP-02, #567)
steps: Open a composer on an existing `MSGBOX(...)` call (edit-in-place). While the dialog is open, edit that same line in another split editor. Press OK. Repeat for addWindow and addChildWindow calls, and once more after inserting a new line above the call instead of editing it.
expected: A warning balloon says the composer did not update because the line changed while it was open and that nothing was changed; the document is byte-for-byte untouched; the balloon's "Reopen composer" action opens the composer again on the current document.
why_human: WriteCommandAction's real document integration and the balloon action need the IDE. The abort logic is pinned by StaleEditGuardTest (11 cases) and DecodeEqualityTest, and the wiring by ComposerApplyGuardSourceGuardTest. This is the direct human confirmation of the phase's second success criterion and has never completed cleanly: the previous round was interrupted by the exception test 1 now covers. The "Start BBjServices for Java completions" editor banner seen last time is the unrelated BbjJavaInteropNotificationProvider panel, not part of this test.
coverage_id: 82-03 D-12
previous_round: issue (interrupted by G-82-6; behaviour itself never judged)
result: pass

### 3. Server-stopped composer invocation shows one information balloon (COMP-01, #538)
steps: Stop the language server, then invoke a composer (MSGBOX, addWindow or addChildWindow) from the editor popup or the lightbulb intention.
expected: Exactly one information balloon in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." — a balloon, not a modal dialog.
why_human: Balloon rendering through the notification platform needs a running IDE; the plain-JUnit test module deliberately excludes it. The notice text and severity are pinned by ComposerNoticesTest.
coverage_id: 82-01 D-12
previous_round: skipped — not reproducible (BbjComposerService.server calls LanguageServerManager.start before resolving the proxy, so a stopped server auto-restarts); verified from code and accepted as not testable. Skip again unless a way to hold the server down is available.
result: pass

### 4. Server killed mid-invocation shows one error balloon and a console line (COMP-01, #538)
steps: With the server running, invoke a composer and kill the language-server process while the request is in flight (or immediately after invoking).
expected: One error balloon naming the composer and the failure detail, and the same text mirrored in the BBj language-server console tool window. Nothing happens silently.
why_human: Requires a live LSP4IJ server process and the notification platform. The failure-to-notice mapping is pinned by ComposerFlowTest.
coverage_id: 82-01 D-12
previous_round: pass (same code paths; plan 82-04 did not touch them)
result: pass

### 5. Refresh failure disables OK and rate-limits the balloon (COMP-01, #538)
steps: Open a composer dialog with the server running, then stop the language server and type in a field. Keep typing for a while. Then restart the server and type again.
expected: The dialog shows "Preview unavailable — <reason>", the OK button is disabled (already on dialog open, before the first preview resolves), and exactly one balloon appears however long typing continues. After the server restarts, the next keystroke restores the preview and re-enables OK.
why_human: DialogWrapper.setOKActionEnabled and the notification platform need the IDE. The observe/once seam and OK gating are pinned by ComposerFlowTest and ComposerDialogRefreshSourceGuardTest.
coverage_id: 82-02 D-12
previous_round: pass (same code paths; plan 82-04 did not touch them)
result: pass

### 6. All three composers name themselves correctly and rate-limit per dialog session (COMP-01, #538)
steps: Repeat test 5 for each of MSGBOX, addWindow and addChildWindow. After a failure, close the dialog and reopen it, then provoke a second failure.
expected: Each balloon names the right composer. A reopened dialog is a new session and is allowed a second balloon.
why_human: Same as test 5; per-session rate limiting is a dialog-lifecycle property only observable in the IDE.
coverage_id: 82-02 D-12
previous_round: pass (same code paths; plan 82-04 did not touch them)
result: pass

### 7. Rapid typing never flickers to a stale preview (COMP-01, #538)
steps: With the server running, type rapidly in a composer dialog's fields and watch the statement, summaries and schematic.
expected: The preview always tracks the newest keystroke; no older preview overwrites a newer one, and OK reflects the newest state.
why_human: Real Swing timing under a live language server; the sequence-number discard logic is unit-tested but the visible behaviour needs the IDE.
coverage_id: 82-02 D-12
previous_round: pass (same code paths; plan 82-04 did not touch them)
result: pass

### 8. Unchanged-document and stopped-server apply paths (COMP-02, #567)
steps: Open a composer on an existing call, change nothing in the document, press OK. Then open a composer on a call, stop the language server, and press OK.
expected: In the first case the edit applies exactly as before this phase and a single Undo reverts it. In the second case an error balloon appears and the document is untouched.
why_human: Same as test 2; the happy path and the re-decode-failure path both need the live editor.
coverage_id: 82-03 D-12
previous_round: pass (same code paths; plan 82-04 did not touch them)
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — G-82-6 from the previous round was closed by plan 82-04; see 82-VERIFICATION.md `re_verification.gaps_closed`]
