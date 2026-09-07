---
status: testing
phase: 87-shared-setopts-composer-layer-intellij-dialog
source: [87-VERIFICATION.md]
started: 2026-09-07T19:15:00Z
updated: 2026-09-07T19:15:00Z
---

## Current Test

number: 1
name: Live-IDE hand check — SETOPTS composer end-to-end in a real IntelliJ session
expected: |
  Follow QA/FULL-TEST-CHECKLIST.md IntelliJ row 18 exactly: open the resolved config file,
  confirm "Compose SETOPTS…" is offered on both an existing-SETOPTS line and a non-SETOPTS
  line, toggle an option and confirm live preview updates plus BBj-ignored options grey out
  with a tooltip, apply and confirm only the hex token of the target line changes, compose a
  new line and confirm whole-line insertion, confirm the action is absent (not disabled) in a
  `.bbj` file, and watch the status bar / LS tool window for any restart or reconnect — none
  should occur at any point.
awaiting: user response

## Tests

### 1. Live-IDE hand check — SETOPTS composer end-to-end in a real IntelliJ session
expected: Every step in QA/FULL-TEST-CHECKLIST.md row 18 passes; the server never restarts or reconnects.
result: [pending]

### 2. CR-01 regression — rapid toggle-then-Apply never applies a stale selection
expected: |
  Open the SETOPTS composer on an existing line. Toggle a checkbox, then immediately click
  Apply/Insert (or press Enter right after a Space toggle) before the preview visibly
  updates — repeat a few times to catch the ~300ms debounce window. OK/Apply must be disabled
  during that window (the click has no effect), or if the click lands after re-enable, the
  applied hex must reflect the toggled state, never the pre-toggle one.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

None — VERIFICATION.md reports no blocking gaps. Both items above are honest-verifier
routes (presence + wiring confirmed by direct code reading and passing automated tests;
runtime/live-IDE behavior needs a human because this codebase has no headless-Swing or
live-LSP4IJ test harness).
