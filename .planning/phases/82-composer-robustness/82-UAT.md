---
status: testing
phase: 82-composer-robustness
source: [82-VERIFICATION.md]
started: 2026-09-05T20:35:00Z
updated: 2026-09-05T20:35:00Z
---

## Current Test

number: 1
name: Server-stopped composer invocation shows one information balloon (COMP-01, #538)
expected: |
  With the rebuilt plugin installed (bbj-vscode `npm run build`, then bbj-intellij `./gradlew buildPlugin`; confirm the installed BBj build is the local one, not a Marketplace auto-update), stop the language server, then invoke a composer (MSGBOX, addWindow or addChildWindow) from the editor popup or the lightbulb intention. Exactly one information balloon appears in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." It is a balloon, not a modal dialog.
awaiting: user response

## Tests

### 1. Server-stopped composer invocation shows one information balloon (COMP-01, #538)
steps: With the rebuilt plugin installed (bbj-vscode `npm run build`, then bbj-intellij `./gradlew buildPlugin`; confirm the installed BBj build is the local one, not a Marketplace auto-update), stop the language server, then invoke a composer (MSGBOX, addWindow or addChildWindow) from the editor popup or the lightbulb intention.
expected: Exactly one information balloon in the "BBj Language Server" group reading "The BBj language server is not ready yet. Open a BBj file and try again." — a balloon, not a modal dialog.
why_human: Balloon rendering through the notification platform needs a running IDE; the plain-JUnit test module deliberately excludes it. The notice text and severity are pinned by ComposerNoticesTest.
coverage_id: 82-01 D-12
result: [pending]

### 2. Server killed mid-invocation shows one error balloon and a console line (COMP-01, #538)
steps: With the server running, invoke a composer and kill the language-server process while the request is in flight (or immediately after invoking).
expected: One error balloon naming the composer and the failure detail, and the same text mirrored in the BBj language-server console tool window. Nothing happens silently.
why_human: Requires a live LSP4IJ server process and the notification platform. The failure-to-notice mapping is pinned by ComposerFlowTest.
coverage_id: 82-01 D-12
result: [pending]

### 3. Refresh failure disables OK and rate-limits the balloon (COMP-01, #538)
steps: Open a composer dialog with the server running, then stop the language server and type in a field. Keep typing for a while. Then restart the server and type again.
expected: The dialog shows "Preview unavailable — <reason>", the OK button is disabled, and exactly one balloon appears however long typing continues. After the server restarts, the next keystroke restores the preview and re-enables OK.
why_human: DialogWrapper.setOKActionEnabled and the notification platform need the IDE. The observe/once seam and OK gating are pinned by ComposerFlowTest and ComposerDialogRefreshSourceGuardTest.
coverage_id: 82-02 D-12
result: [pending]

### 4. All three composers name themselves correctly and rate-limit per dialog session (COMP-01, #538)
steps: Repeat test 3 for each of MSGBOX, addWindow and addChildWindow. After a failure, close the dialog and reopen it, then provoke a second failure.
expected: Each balloon names the right composer. A reopened dialog is a new session and is allowed a second balloon.
why_human: Same as test 3; per-session rate limiting is a dialog-lifecycle property only observable in the IDE.
coverage_id: 82-02 D-12
result: [pending]

### 5. Rapid typing never flickers to a stale preview (COMP-01, #538)
steps: With the server running, type rapidly in a composer dialog's fields and watch the statement, summaries and schematic.
expected: The preview always tracks the newest keystroke; no older preview overwrites a newer one, and OK reflects the newest state.
why_human: Real Swing timing under a live language server; the sequence-number discard logic is unit-tested but the visible behaviour needs the IDE.
coverage_id: 82-02 D-12
result: [pending]

### 6. Stale-edit abort in a live split-editor scenario (COMP-02, #567)
steps: Open a composer on an existing `MSGBOX(...)` call (edit-in-place). While the dialog is open, edit that same line in another split editor. Press OK. Repeat for addWindow and addChildWindow calls, and once more after inserting a new line above the call instead of editing it.
expected: A warning balloon says the composer did not update because the line changed while it was open and that nothing was changed; the document is byte-for-byte untouched; the balloon's "Reopen composer" action opens the composer again on the current document.
why_human: WriteCommandAction's real document integration and the balloon action need the IDE. The abort logic is pinned by StaleEditGuardTest and DecodeEqualityTest.
coverage_id: 82-03 D-12
result: [pending]

### 7. Unchanged-document and stopped-server apply paths (COMP-02, #567)
steps: Open a composer on an existing call, change nothing in the document, press OK. Then open a composer on a call, stop the language server, and press OK.
expected: In the first case the edit applies exactly as before this phase and a single Undo reverts it. In the second case an error balloon appears and the document is untouched.
why_human: Same as test 6; the happy path and the re-decode-failure path both need the live editor.
coverage_id: 82-03 D-12
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
