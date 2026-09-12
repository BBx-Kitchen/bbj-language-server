---
status: testing
phase: 90-composer-robustness-intellij-composer-performance
source: [90-VERIFICATION.md]
started: 2026-09-12T22:20:00Z
updated: 2026-09-12T22:20:00Z
---

## Current Test

number: 1
name: IntelliJ composer dialogs — debounce, field validation, handle cache across restart
expected: |
  The preview updates once after typing stops (not once per keystroke), with OK re-enabled only then;
  the malformed field shows a red label under it and OK stays disabled until fixed; the second open is
  noticeably faster than the first; the composer still opens normally (no error balloon) after a
  language-server restart.
awaiting: user response

## Tests

### 1. IntelliJ composer dialogs — debounce, field validation, handle cache across restart
setup: Plugin zip rebuilt from the final tree (includes the post-review `seq` fix, de49f489 or later) and installed.
steps: Type a burst in the MSGBOX, addWindow and addChildWindow dialogs and watch OK and the generated statement; type `"10"` into a numeric field; open a composer twice in the same session, then Restart Language Server and open it a third time. (QA rows IntelliJ 28-30)
expected: The preview updates once after typing stops (not once per keystroke), with OK re-enabled only then; the malformed field shows a red label under it and OK stays disabled until fixed; the second open is noticeably faster than the first; the composer still opens normally (no error balloon) after a language-server restart.
result: [pending]

### 2. VS Code — unfinished MSGBOX completion, stale-edit refusal, window composer validation
setup: VSIX rebuilt from the final tree and reinstalled.
steps: Click the cue / use the context menu / palette on `x = MSGBOX(`; edit the line while the panel is open; try to Insert malformed addWindow/addChildWindow field text. (QA rows VS Code 22-23)
expected: The cue and context menu open `Complete MSGBOX call` and Insert yields one complete call; an edit made while the panel is open causes Insert to refuse with 'The MSGBOX() call changed since the composer opened; nothing was applied.'; a malformed addWindow/addChildWindow field shows its message under the field with a red border and disables Insert.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
