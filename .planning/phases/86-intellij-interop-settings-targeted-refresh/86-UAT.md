---
status: testing
phase: 86-intellij-interop-settings-targeted-refresh
source: [86-VERIFICATION.md]
started: 2026-09-07T16:40:00Z
updated: 2026-09-07T16:40:00Z
---

## Current Test

number: 1
name: Refresh Java Classes keeps language features online (QA/FULL-TEST-CHECKLIST.md row 16)
expected: |
  Open a project with a large Java classpath and wait for the status-bar widget to reach `started`. Run Refresh Java Classes. While the "Refreshing Java classes…" progress task is visible, invoke code completion, hover a variable and open Structure View. Completion, hover and Structure View all answer during the refresh; the status-bar widget never leaves `started`; no "connection to the server got closed" message appears; exactly one console line reports completion and no balloon is raised.
awaiting: user response

## Tests

### 1. Refresh Java Classes keeps language features online (QA/FULL-TEST-CHECKLIST.md row 16)
expected: Completion, hover and Structure View all answer while the refresh progress task is visible; the status-bar widget stays `started`; exactly one console success line; no balloon.
result: [pending]

### 2. Java-interop port auto-detects, and an explicitly confirmed 5008 is kept (QA/FULL-TEST-CHECKLIST.md row 17)
expected: Against a real BBjServices install, open Settings → BBj. With Auto-detect on, the greyed Port field and the hint line track a live `BBj.properties` edit of `com.basis.languageServer.addr` across a dialog reopen. Uncheck Auto-detect, enter 5008, Apply, reopen: 5008 survives with the checkbox still off even though the properties file names a different port. Re-check Auto-detect: the detected value returns. No dialog, validator warning or balloon at any point.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
